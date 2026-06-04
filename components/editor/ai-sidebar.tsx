"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Bot, X, FileText, Download, Send, Loader2, MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import ReactMarkdown from "react-markdown"
import {
  useUpdateMyPresence,
  useOthers,
  useSelf,
  useCreateFeed,
  useCreateFeedMessage,
  useFeedMessages,
  useStorage,
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

interface ProjectSpec {
  id: string
  createdAt: string
  filePath: string
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
  const [specs, setSpecs] = useState<ProjectSpec[]>([])
  const [specsLoading, setSpecsLoading] = useState(false)
  const [previewSpec, setPreviewSpec] = useState<ProjectSpec | null>(null)
  const [previewContent, setPreviewContent] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [isGeneratingSpec, setIsGeneratingSpec] = useState(false)
  const [specRunId, setSpecRunId] = useState<string | undefined>(undefined)
  const [specToken, setSpecToken] = useState<string | undefined>(undefined)
  const [specError, setSpecError] = useState<string | null>(null)
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

  // Read canvas state from Liveblocks storage for spec generation.
  // Storage stores nodes/edges as LiveMap (keyed by id), so we use Object.values to get arrays.
  type FlowStorage = { flow?: { nodes?: Record<string, unknown>; edges?: Record<string, unknown> } }
  const flowNodes = useStorage((root) => {
    const flow = ((root as unknown) as FlowStorage).flow
    return flow?.nodes ? Object.values(flow.nodes) : []
  }) ?? []
  const flowEdges = useStorage((root) => {
    const flow = ((root as unknown) as FlowStorage).flow
    return flow?.edges ? Object.values(flow.edges) : []
  }) ?? []

  // Stable ref so onComplete never causes the hook to resubscribe
  const onCompleteRef = useRef<((run: RealtimeRun<AnyTask>, err?: Error) => void) | undefined>(undefined)

  const { run: realtimeRun } = useRealtimeRun(runId, {
    accessToken: publicToken,
    enabled: !!runId && !!publicToken,
    onComplete: useCallback((run: RealtimeRun<AnyTask>, err?: Error) => {
      onCompleteRef.current?.(run, err)
    }, []),
  })

  const { run: specRealtimeRun } = useRealtimeRun(specRunId, {
    accessToken: specToken,
    enabled: !!specRunId && !!specToken,
  })

  useEffect(() => {
    if (!specRealtimeRun) return
    const { status } = specRealtimeRun
    const terminal = ["COMPLETED", "FAILED", "CRASHED", "CANCELED", "TIMED_OUT", "SYSTEM_FAILURE", "EXPIRED"]
    if (!terminal.includes(status)) return
    if (status === "COMPLETED") {
      void fetchSpecs()
      setSpecError(null)
    } else {
      setSpecError("Spec generation failed. Please try again.")
    }
    setIsGeneratingSpec(false)
    setSpecRunId(undefined)
    setSpecToken(undefined)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [specRealtimeRun?.status])

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

  const fetchSpecs = useCallback(async () => {
    setSpecsLoading(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/specs`)
      if (res.ok) {
        const data = await res.json() as ProjectSpec[]
        setSpecs(data)
      }
    } finally {
      setSpecsLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    if (isOpen) void fetchSpecs()
  }, [isOpen, fetchSpecs])

  const handleGenerateSpec = useCallback(async () => {
    if (isGeneratingSpec) return
    setIsGeneratingSpec(true)
    setSpecError(null)

    const chatHistory = messages
      .filter((m) => !m.isStatus && !m.isError)
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }))

    const res = await fetch("/api/ai/spec", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId: projectId, chatHistory, nodes: flowNodes, edges: flowEdges }),
    })
    const data = await res.json() as Record<string, unknown>

    if (!res.ok) {
      setSpecError(`Failed to start: ${String(data.error ?? "Request failed")}`)
      setIsGeneratingSpec(false)
      return
    }

    const { runId: newRunId } = data as { runId: string }

    const tokenRes = await fetch("/api/ai/spec/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ runId: newRunId }),
    })
    const tokenData = await tokenRes.json() as Record<string, unknown>

    if (!tokenRes.ok) {
      setSpecError("Failed to authenticate spec run.")
      setIsGeneratingSpec(false)
      return
    }

    setSpecRunId(newRunId)
    setSpecToken((tokenData as { token: string }).token)
  }, [isGeneratingSpec, projectId, messages, flowNodes, flowEdges])

  const openPreview = useCallback(async (spec: ProjectSpec) => {
    setPreviewSpec(spec)
    setPreviewContent(null)
    setPreviewLoading(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/specs/${spec.id}/download`)
      if (res.ok) setPreviewContent(await res.text())
    } finally {
      setPreviewLoading(false)
    }
  }, [projectId])

  const handleDownload = useCallback(async (spec: ProjectSpec) => {
    const res = await fetch(`/api/projects/${projectId}/specs/${spec.id}/download`)
    if (!res.ok) return
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    const filename = spec.filePath.split("/").pop() ?? `spec-${spec.id}.md`
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }, [projectId])

  function formatDate(iso: string) {
    return new Date(iso).toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  function filenameFromPath(filePath: string) {
    return filePath.split("/").pop() ?? "spec.md"
  }

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
          <div className="shrink-0 px-4 pt-3 pb-2 flex flex-col gap-2">
            <Button
              onClick={() => void handleGenerateSpec()}
              disabled={isGeneratingSpec}
              className="w-full bg-ai text-white hover:bg-ai/90 disabled:opacity-50 gap-2"
            >
              {isGeneratingSpec ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating…
                </>
              ) : (
                "Generate Spec"
              )}
            </Button>
            {specError && (
              <p className="text-xs text-red-400">{specError}</p>
            )}
          </div>
          <ScrollArea className="flex-1 px-4 py-2">
            {specsLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-copy-muted" />
              </div>
            ) : specs.length === 0 ? (
              <div className="flex flex-col items-center gap-3 pt-8 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-subtle">
                  <FileText className="h-6 w-6 text-copy-muted" />
                </div>
                <div>
                  <p className="text-sm font-medium text-copy-primary">No specs yet</p>
                  <p className="mt-1 text-xs text-copy-muted">
                    Generate a spec from the Architect tab.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {specs.map((spec) => (
                  <div
                    key={spec.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => void openPreview(spec)}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); void openPreview(spec) } }}
                    className="w-full rounded-xl bg-elevated border border-surface-border p-3 text-left hover:border-brand/40 transition-colors group cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-subtle">
                        <FileText className="h-3.5 w-3.5 text-copy-muted" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-copy-primary truncate">
                          {filenameFromPath(spec.filePath)}
                        </p>
                        <p className="text-[10px] text-copy-muted mt-0.5">
                          {formatDate(spec.createdAt)}
                        </p>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); void handleDownload(spec) }}
                        className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-subtle"
                        aria-label="Download spec"
                      >
                        <Download className="h-3.5 w-3.5 text-copy-muted" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {/* Spec preview modal */}
      <Dialog open={!!previewSpec} onOpenChange={(open) => { if (!open) { setPreviewSpec(null); setPreviewContent(null) } }}>
        <DialogContent className="max-w-2xl h-[80vh] flex flex-col gap-0 p-0 bg-elevated border-surface-border rounded-3xl overflow-hidden">
          <DialogHeader className="flex flex-row items-center justify-between px-5 py-4 border-b border-surface-border shrink-0">
            <DialogTitle className="text-sm font-semibold text-copy-primary truncate">
              {previewSpec ? filenameFromPath(previewSpec.filePath) : ""}
            </DialogTitle>
            {previewSpec && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => void handleDownload(previewSpec)}
                className="shrink-0 gap-1.5 text-copy-muted hover:text-copy-primary"
              >
                <Download className="h-3.5 w-3.5" />
                Download
              </Button>
            )}
          </DialogHeader>
          <ScrollArea className="min-h-0 flex-1">
            <div className="px-5 py-4">
              {previewLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-5 w-5 animate-spin text-copy-muted" />
                </div>
              ) : previewContent ? (
                <ReactMarkdown
                  components={{
                    h1: ({ children }) => <h1 className="text-lg font-bold text-copy-primary mb-3 mt-5 first:mt-0 pb-2 border-b border-surface-border">{children}</h1>,
                    h2: ({ children }) => <h2 className="text-base font-semibold text-copy-primary mb-2 mt-4 first:mt-0">{children}</h2>,
                    h3: ({ children }) => <h3 className="text-sm font-semibold text-copy-primary mb-1.5 mt-3 first:mt-0">{children}</h3>,
                    p: ({ children }) => <p className="text-sm text-copy-secondary leading-relaxed mb-3">{children}</p>,
                    ul: ({ children }) => <ul className="list-disc list-inside mb-3 space-y-1">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal list-inside mb-3 space-y-1">{children}</ol>,
                    li: ({ children }) => <li className="text-sm text-copy-secondary leading-relaxed">{children}</li>,
                    strong: ({ children }) => <strong className="font-semibold text-copy-primary">{children}</strong>,
                    em: ({ children }) => <em className="italic text-copy-muted">{children}</em>,
                    code: ({ children, className }) => {
                      const isBlock = !!className
                      return isBlock
                        ? <code className="block font-mono text-xs text-copy-primary">{children}</code>
                        : <code className="font-mono text-xs bg-subtle border border-surface-border text-brand px-1 py-0.5 rounded">{children}</code>
                    },
                    pre: ({ children }) => <pre className="bg-subtle border border-surface-border rounded-xl p-4 mb-3 overflow-x-auto text-xs font-mono text-copy-primary">{children}</pre>,
                    blockquote: ({ children }) => <blockquote className="border-l-2 border-brand/40 pl-4 mb-3 italic text-copy-muted">{children}</blockquote>,
                    hr: () => <hr className="border-surface-border my-4" />,
                    a: ({ href, children }) => <a href={href} className="text-brand underline hover:opacity-80" target="_blank" rel="noreferrer">{children}</a>,
                  }}
                >
                  {previewContent}
                </ReactMarkdown>
              ) : (
                <p className="text-sm text-copy-muted">Failed to load spec content.</p>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </aside>
  )
}
