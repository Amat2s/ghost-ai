"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Bot, X, FileText, Download, Send, Loader2, MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  useUpdateMyPresence,
  useOthers,
  useSelf,
  useCreateFeed,
  useCreateFeedMessage,
  useFeedMessages,
} from "@liveblocks/react"
import { useRealtimeRun } from "@trigger.dev/react-hooks"
import type { RealtimeRun, AnyTask } from "@trigger.dev/core/v3"
import {
  aiStatusFeedMessageSchema,
  aiChatFeedMessageSchema,
  type AiChatFeedMessage,
} from "@/types/tasks"

const AI_STATUS_FEED = "ai-status-feed"
const AI_CHAT_FEED = "ai-chat"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  isError?: boolean
  isStatus?: boolean
}

type ChatMessage = AiChatFeedMessage & { id: string }

interface AiSidebarProps {
  isOpen: boolean
  onClose: () => void
  projectId: string
}

const STARTER_CHIPS = [
  "Design an e-commerce backend",
  "Create a chat app architecture",
  "Build a CI/CD pipeline",
]

const TERMINAL_ERROR_STATUSES = ["FAILED", "CRASHED", "CANCELED", "TIMED_OUT", "SYSTEM_FAILURE", "EXPIRED"]

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

export function AiSidebar({ isOpen, onClose, projectId }: AiSidebarProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [runId, setRunId] = useState<string | undefined>(undefined)
  const [publicToken, setPublicToken] = useState<string | undefined>(undefined)
  const [chatInput, setChatInput] = useState("")
  const [chatSendError, setChatSendError] = useState<string | null>(null)
  const [isSendingChat, setIsSendingChat] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const chatTextareaRef = useRef<HTMLTextAreaElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const chatScrollRef = useRef<HTMLDivElement>(null)

  const updateMyPresence = useUpdateMyPresence()
  const others = useOthers()
  const self = useSelf()
  const createFeed = useCreateFeed()
  const createFeedMessage = useCreateFeedMessage()
  const { messages: feedMessages } = useFeedMessages(AI_STATUS_FEED)
  const { messages: chatFeedMessages } = useFeedMessages(AI_CHAT_FEED)

  // Stable ref so onComplete never causes the hook to resubscribe
  const onCompleteRef = useRef<((run: RealtimeRun<AnyTask>, err?: Error) => void) | undefined>(undefined)

  const { run: realtimeRun } = useRealtimeRun(runId, {
    accessToken: publicToken,
    enabled: !!runId && !!publicToken,
    onComplete: useCallback((run: RealtimeRun<AnyTask>, err?: Error) => {
      onCompleteRef.current?.(run, err)
    }, []),
  })

  // Latest validated status feed message
  const latestFeedMsg = feedMessages?.[feedMessages.length - 1]
  const feedStatusText = latestFeedMsg
    ? aiStatusFeedMessageSchema.safeParse(latestFeedMsg.data).data?.text
    : undefined

  // Validated chat messages in order
  const chatMessages: ChatMessage[] = (chatFeedMessages ?? []).reduce<ChatMessage[]>((acc, m) => {
    const parsed = aiChatFeedMessageSchema.safeParse(m.data)
    if (parsed.success) acc.push({ ...parsed.data, id: m.id })
    return acc
  }, [])

  // True when this user or any collaborator has thinking:true in presence
  const anyoneThinking = isGenerating || others.some((o) => o.presence.thinking)

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages])

  useEffect(() => {
    const el = chatScrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [chatMessages.length])

  const addMessage = useCallback((msg: Omit<Message, "id">) => {
    setMessages((prev) => [...prev, { ...msg, id: `${Date.now()}-${Math.random()}` }])
  }, [])

  const updateLastAssistantMessage = useCallback((content: string, isError = false, isStatus = false) => {
    setMessages((prev) => {
      const idx = [...prev].reverse().findIndex((m) => m.role === "assistant")
      if (idx === -1) return prev
      const realIdx = prev.length - 1 - idx
      const updated = [...prev]
      updated[realIdx] = { ...updated[realIdx], content, isError, isStatus }
      return updated
    })
  }, [])

  const postFeedStatus = useCallback(async (text: string) => {
    try { await createFeed(AI_STATUS_FEED) } catch { /* exists */ }
    try { await createFeedMessage(AI_STATUS_FEED, { text }) } catch { /* best-effort */ }
  }, [createFeed, createFeedMessage])

  const postToAiChatFeed = useCallback(async (role: "user" | "system", content: string) => {
    const sender = role === "user" ? (self?.info?.name ?? "User") : "Ghost AI"
    try { await createFeed(AI_CHAT_FEED) } catch { /* exists */ }
    try {
      await createFeedMessage(AI_CHAT_FEED, { sender, role, content, timestamp: Date.now() })
    } catch { /* best-effort */ }
  }, [createFeed, createFeedMessage, self?.info?.name])

  // Keep onCompleteRef current so the stable onComplete callback always has fresh handlers
  onCompleteRef.current = useCallback((run: RealtimeRun<AnyTask>, err?: Error) => {
    const isError = !!err || TERMINAL_ERROR_STATUSES.includes(run?.status ?? "")
    if (isError) {
      const msg = "Design generation failed. Please try again."
      updateLastAssistantMessage(msg, true, false)
      void postToAiChatFeed("system", msg)
      void postFeedStatus("Generation failed.")
    } else {
      const msg = "Design complete! Your architecture has been added to the canvas."
      updateLastAssistantMessage(msg, false, false)
      void postToAiChatFeed("system", msg)
      void postFeedStatus("Design complete.")
    }
    setIsGenerating(false)
    updateMyPresence({ thinking: false })
    setRunId(undefined)
    setPublicToken(undefined)
  }, [updateLastAssistantMessage, postFeedStatus, postToAiChatFeed, updateMyPresence])

  // Track intermediate run status changes
  useEffect(() => {
    if (!realtimeRun) return
    const { status } = realtimeRun

    if (status === "QUEUED" || status === "DEQUEUED" || status === "PENDING_VERSION" || status === "DELAYED") {
      const msg = "Design queued, starting soon…"
      updateLastAssistantMessage(msg, false, true)
      void postFeedStatus(msg)
    } else if (status === "EXECUTING" || status === "WAITING") {
      const msg = "Ghost AI is designing your architecture…"
      updateLastAssistantMessage(msg, false, true)
      void postFeedStatus(msg)
    }
  }, [realtimeRun?.status, updateLastAssistantMessage, postFeedStatus])

  const handleSend = useCallback(async () => {
    const trimmed = input.trim()
    if (!trimmed || isGenerating) return

    setInput("")
    setIsGenerating(true)
    updateMyPresence({ thinking: true })

    addMessage({ role: "user", content: trimmed })
    addMessage({ role: "assistant", content: "Starting design generation…", isStatus: true })

    // Push user prompt to ai-chat feed for all collaborators
    void postToAiChatFeed("user", trimmed)
    void postFeedStatus("Starting design generation…")

    const res = await fetch("/api/ai/design", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: trimmed, roomId: projectId, projectId }),
    })
    const data = await res.json() as Record<string, unknown>

    if (!res.ok) {
      const errorMsg = `Failed to start: ${String(data.error ?? "Request failed")}`
      updateLastAssistantMessage(errorMsg, true, false)
      void postToAiChatFeed("system", errorMsg)
      void postFeedStatus("Generation failed.")
      setIsGenerating(false)
      updateMyPresence({ thinking: false })
      return
    }

    const { runId: newRunId, publicToken: newToken } = data as { runId: string; publicToken: string }
    setRunId(newRunId)
    setPublicToken(newToken)
    updateLastAssistantMessage("Ghost AI is working on your design…", false, true)
    void postFeedStatus("Ghost AI is working on your design…")
  }, [input, isGenerating, projectId, addMessage, updateLastAssistantMessage, updateMyPresence, postFeedStatus, postToAiChatFeed])

  const handleChatSend = useCallback(async () => {
    const trimmed = chatInput.trim()
    if (!trimmed || isSendingChat) return

    setIsSendingChat(true)
    setChatSendError(null)

    try {
      await createFeed(AI_CHAT_FEED)
    } catch {
      // feed already exists
    }

    try {
      await createFeedMessage(AI_CHAT_FEED, {
        sender: self?.info?.name ?? "User",
        role: "user" as const,
        content: trimmed,
        timestamp: Date.now(),
      })
      setChatInput("")
    } catch {
      setChatSendError("Failed to send. Please try again.")
    } finally {
      setIsSendingChat(false)
    }
  }, [chatInput, isSendingChat, createFeed, createFeedMessage, self])

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      void handleSend()
    }
  }

  function handleChatKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      void handleChatSend()
    }
  }

  function handleChip(chip: string) {
    if (isGenerating) return
    setInput(chip)
    setTimeout(() => textareaRef.current?.focus(), 0)
  }

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = "72px"
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
  }, [input])

  useEffect(() => {
    const el = chatTextareaRef.current
    if (!el) return
    el.style.height = "72px"
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
  }, [chatInput])

  const myName = self?.info?.name ?? "User"

  return (
    <aside
      inert={!isOpen}
      aria-hidden={!isOpen}
      className={`fixed top-12 right-0 z-30 flex h-[calc(100vh-3rem)] w-80 flex-col bg-base/95 border-l border-surface-border shadow-2xl transition-transform duration-200 ease-in-out ${
        isOpen ? "translate-x-0" : "translate-x-full"
      }`}
    >
      {/* Header */}
      <div className="flex h-14 shrink-0 items-center gap-3 px-4 border-b border-surface-border">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-ai/20">
          <Bot className="h-4 w-4 text-ai-text" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-semibold text-copy-primary leading-tight">AI Workspace</p>
            {anyoneThinking && (
              <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-ai" />
            )}
          </div>
          <p className="text-xs text-copy-muted leading-tight">Collaborate with Ghost AI</p>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onClose}
          aria-label="Close AI sidebar"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <Tabs defaultValue="architect" className="flex flex-1 flex-col overflow-hidden">
        <TabsList className="mx-4 mt-3 shrink-0 grid grid-cols-3">
          <TabsTrigger value="architect">Architect</TabsTrigger>
          <TabsTrigger value="chat">Chat</TabsTrigger>
          <TabsTrigger value="specs">Specs</TabsTrigger>
        </TabsList>

        {/* AI Architect tab */}
        <TabsContent value="architect" className="flex flex-1 flex-col overflow-hidden mt-0">
          <ScrollArea className="flex-1 px-4 py-3" ref={scrollRef}>
            {messages.length === 0 ? (
              <div className="flex flex-col items-center gap-4 pt-8 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ai/20">
                  <Bot className="h-6 w-6 text-ai-text" />
                </div>
                <div>
                  <p className="text-sm font-medium text-copy-primary">Ghost AI Architect</p>
                  <p className="mt-1 text-xs text-copy-muted">
                    Describe your system and I&apos;ll design the architecture.
                  </p>
                </div>
                <div className="flex flex-col gap-2 w-full">
                  {STARTER_CHIPS.map((chip) => (
                    <button
                      key={chip}
                      onClick={() => handleChip(chip)}
                      className="rounded-full bg-subtle px-3 py-2 text-xs text-ai-text hover:opacity-80 transition-opacity text-left"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3 py-1">
                {messages.map((msg) =>
                  msg.role === "user" ? (
                    <div key={msg.id} className="flex justify-end">
                      <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-success px-3 py-2 text-sm text-base">
                        {msg.content}
                      </div>
                    </div>
                  ) : (
                    <div key={msg.id} className="flex justify-start items-start gap-2">
                      {msg.isStatus && (
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-ai" />
                      )}
                      <div
                        className={`max-w-[85%] rounded-2xl rounded-tl-sm px-3 py-2 text-sm ${
                          msg.isError
                            ? "bg-elevated border border-red-500/30 text-red-400"
                            : msg.isStatus
                              ? "bg-elevated border border-ai/20 text-ai-text"
                              : "bg-elevated border border-surface-border text-ai-text"
                        }`}
                      >
                        {msg.content}
                      </div>
                    </div>
                  )
                )}
              </div>
            )}
          </ScrollArea>

          {/* Status strip — above input, only when a run is active */}
          {isGenerating && feedStatusText && (
            <div className="shrink-0 flex items-center gap-2 px-3 py-1.5 bg-elevated border-t border-ai/20">
              <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-ai" />
              <p className="text-xs text-ai-text truncate">{feedStatusText}</p>
            </div>
          )}

          <div className="shrink-0 border-t border-surface-border p-3">
            <div className="flex items-end gap-2">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isGenerating ? "Ghost AI is working…" : "Ask Ghost AI…"}
                disabled={isGenerating}
                className="flex-1 resize-none overflow-hidden bg-subtle border-surface-border text-sm disabled:opacity-50"
                style={{ minHeight: "72px", maxHeight: "160px" }}
              />
              <Button
                onClick={() => void handleSend()}
                disabled={!input.trim() || isGenerating}
                size="icon"
                className="shrink-0 bg-success text-base hover:bg-success/90 disabled:opacity-40"
                aria-label="Send message"
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Room Chat tab */}
        <TabsContent value="chat" className="flex flex-1 flex-col overflow-hidden mt-0">
          <ScrollArea className="flex-1 px-4 py-3" ref={chatScrollRef}>
            {chatMessages.length === 0 ? (
              <div className="flex flex-col items-center gap-3 pt-8 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-subtle">
                  <MessageSquare className="h-6 w-6 text-copy-muted" />
                </div>
                <div>
                  <p className="text-sm font-medium text-copy-primary">Room Chat</p>
                  <p className="mt-1 text-xs text-copy-muted">
                    Send messages to everyone in this room.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3 py-1">
                {chatMessages.map((msg) => {
                  const isMe = msg.sender === myName
                  return (
                    <div key={msg.id} className={`flex flex-col gap-0.5 ${isMe ? "items-end" : "items-start"}`}>
                      <div className="flex items-center gap-1.5 px-1">
                        <span className="text-xs font-medium text-copy-muted">
                          {isMe ? "You" : msg.sender}
                        </span>
                        <span className="text-[10px] text-copy-muted/60">
                          {formatTime(msg.timestamp)}
                        </span>
                      </div>
                      <div
                        className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                          isMe
                            ? "rounded-tr-sm bg-success text-base"
                            : "rounded-tl-sm bg-elevated border border-surface-border text-copy-primary"
                        }`}
                      >
                        {msg.content}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </ScrollArea>

          <div className="shrink-0 border-t border-surface-border p-3">
            {chatSendError && (
              <p className="mb-2 text-xs text-red-400">{chatSendError}</p>
            )}
            <div className="flex items-end gap-2">
              <Textarea
                ref={chatTextareaRef}
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={handleChatKeyDown}
                placeholder="Message everyone…"
                disabled={isSendingChat}
                className="flex-1 resize-none overflow-hidden bg-subtle border-surface-border text-sm disabled:opacity-50"
                style={{ minHeight: "72px", maxHeight: "160px" }}
              />
              <Button
                onClick={() => void handleChatSend()}
                disabled={!chatInput.trim() || isSendingChat}
                size="icon"
                className="shrink-0 bg-success text-base hover:bg-success/90 disabled:opacity-40"
                aria-label="Send chat message"
              >
                {isSendingChat ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Specs tab */}
        <TabsContent value="specs" className="flex flex-1 flex-col overflow-hidden mt-0">
          <div className="flex flex-col gap-4 px-4 pt-3">
            <Button className="w-full bg-ai text-white hover:bg-ai/90">
              Generate Spec
            </Button>
            <div className="rounded-xl bg-elevated border border-surface-border p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-subtle">
                  <FileText className="h-4 w-4 text-copy-muted" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-copy-primary truncate">
                    API Architecture Spec
                  </p>
                  <p className="mt-0.5 text-xs text-copy-muted line-clamp-2">
                    Defines the RESTful API surface, authentication flow, and service
                    boundaries for the e-commerce backend system.
                  </p>
                </div>
              </div>
              <div className="mt-3 flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled
                  className="gap-1.5 text-copy-muted opacity-50"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </aside>
  )
}
