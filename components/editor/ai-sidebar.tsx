"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Bot, X, FileText, Download, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  isError?: boolean
  isStatus?: boolean
}

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

async function triggerDesign(
  projectId: string,
  prompt: string
): Promise<{ runId: string } | { error: string }> {
  const res = await fetch("/api/ai/design", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, roomId: projectId, projectId }),
  })
  const data = await res.json()
  if (!res.ok) return { error: data.error ?? "Request failed" }
  return data as { runId: string }
}

export function AiSidebar({ isOpen, onClose, projectId }: AiSidebarProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom when messages change
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages])

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

  const handleSend = useCallback(async () => {
    const trimmed = input.trim()
    if (!trimmed || isGenerating) return

    setInput("")
    setIsGenerating(true)

    addMessage({ role: "user", content: trimmed })
    addMessage({ role: "assistant", content: "Starting design generation…", isStatus: true })

    const result = await triggerDesign(projectId, trimmed)

    if ("error" in result) {
      updateLastAssistantMessage(`Failed to start: ${result.error}`, true, false)
      setIsGenerating(false)
      return
    }

    updateLastAssistantMessage("Ghost AI is working on your design…", false, true)

    // Poll the run until it reaches a terminal state
    const { runId } = result
    let attempts = 0
    const maxAttempts = 120 // 2 min at 1s intervals

    const poll = async () => {
      attempts++
      if (attempts > maxAttempts) {
        updateLastAssistantMessage("Generation is taking longer than expected. Check the canvas for updates.", false, false)
        setIsGenerating(false)
        return
      }

      try {
        const tokenRes = await fetch("/api/ai/design/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ runId }),
        })

        if (!tokenRes.ok) {
          // Token endpoint fails = run done or inaccessible
          updateLastAssistantMessage("Design complete! Check the canvas for your architecture.", false, false)
          setIsGenerating(false)
          return
        }

        const { token } = await tokenRes.json()

        const runRes = await fetch(`https://api.trigger.dev/api/v3/runs/${runId}`, {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (!runRes.ok) {
          setTimeout(poll, 1000)
          return
        }

        const run = await runRes.json()

        if (run.status === "COMPLETED") {
          updateLastAssistantMessage("Design complete! Your architecture has been added to the canvas.", false, false)
          setIsGenerating(false)
        } else if (["FAILED", "CRASHED", "CANCELED", "TIMED_OUT"].includes(run.status)) {
          updateLastAssistantMessage("Design generation failed. Please try again.", true, false)
          setIsGenerating(false)
        } else {
          // Still running — update status message and poll again
          const statusMsg =
            run.status === "QUEUED"
              ? "Design queued, starting soon…"
              : "Ghost AI is designing your architecture…"
          updateLastAssistantMessage(statusMsg, false, true)
          setTimeout(poll, 1500)
        }
      } catch {
        setTimeout(poll, 2000)
      }
    }

    setTimeout(poll, 1500)
  }, [input, isGenerating, projectId, addMessage, updateLastAssistantMessage])

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
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

  return (
    <aside
      inert={!isOpen}
      aria-hidden={!isOpen}
      className={`fixed top-12 right-0 z-30 flex h-[calc(100vh-3rem)] w-80 flex-col bg-base/95 border-l border-surface-border shadow-2xl transition-transform duration-200 ease-in-out ${
        isOpen ? "translate-x-0" : "translate-x-full"
      }`}
    >
      <div className="flex h-14 shrink-0 items-center gap-3 px-4 border-b border-surface-border">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-ai/20">
          <Bot className="h-4 w-4 text-ai-text" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-copy-primary leading-tight">AI Workspace</p>
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
        <TabsList className="mx-4 mt-3 shrink-0 grid grid-cols-2">
          <TabsTrigger value="architect">AI Architect</TabsTrigger>
          <TabsTrigger value="specs">Specs</TabsTrigger>
        </TabsList>

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
                      <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-accent-dim border-2 border-brand/50 px-3 py-2 text-sm text-copy-primary">
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
                onClick={handleSend}
                disabled={!input.trim() || isGenerating}
                size="icon"
                className="shrink-0 bg-ai text-white hover:bg-ai/90"
                aria-label="Send message"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </TabsContent>

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
