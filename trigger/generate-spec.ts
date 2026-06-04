import { schemaTask, metadata, logger } from "@trigger.dev/sdk"
import { generateText } from "ai"
import { createOpenAI } from "@ai-sdk/openai"
import { put } from "@vercel/blob"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const ChatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
})

const GenerateSpecSchema = z.object({
  projectId: z.string(),
  roomId: z.string(),
  chatHistory: z.array(ChatMessageSchema),
  nodes: z.array(z.record(z.string(), z.unknown())),
  edges: z.array(z.record(z.string(), z.unknown())),
})

export const generateSpec = schemaTask({
  id: "generate-spec",
  schema: GenerateSpecSchema,
  retry: {
    maxAttempts: 3,
    factor: 2,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 30_000,
  },
  run: async (payload, { ctx }) => {
    const { projectId, roomId, chatHistory, nodes, edges } = payload

    logger.info("Generating spec", {
      projectId,
      roomId,
      nodeCount: nodes.length,
      edgeCount: edges.length,
    })

    metadata.set("status", "starting")
    metadata.set("projectId", projectId)

    const model = createOpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: process.env.OPENROUTER_API_KEY,
      headers: {
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "ghost-ai",
      },
    }).chat("openai/gpt-4o-mini")

    const systemPrompt = `You are Ghost AI, an expert software architect. Generate a detailed Markdown technical specification from the provided system architecture canvas and conversation context.

Structure the spec with these sections:
# Technical Specification

## Executive Summary
## System Overview
## Component Descriptions
## Data Flows and Connections
## Technology Stack Recommendations
## Implementation Notes

Be specific, technical, and actionable. Format as clean, well-structured Markdown.`

    const nodesText = nodes.length > 0 ? JSON.stringify(nodes, null, 2) : "(empty canvas)"
    const edgesText = edges.length > 0 ? JSON.stringify(edges, null, 2) : "(no connections)"
    const chatText =
      chatHistory.length > 0
        ? chatHistory.map((m) => `[${m.role}]: ${m.content}`).join("\n\n")
        : "(no prior conversation)"

    const prompt = `## Canvas Architecture

### Nodes (components)
${nodesText}

### Edges (connections)
${edgesText}

## Conversation Context
${chatText}

Generate a comprehensive technical specification for this system architecture.`

    metadata.set("status", "generating")

    const { text } = await generateText({
      model,
      system: systemPrompt,
      prompt,
      maxRetries: 0,
    })

    const blob = await put(`specs/${projectId}/${ctx.run.id}.md`, text, {
      access: 'private',
      contentType: 'text/markdown',
      addRandomSuffix: false,
      allowOverwrite: true,
    })

    await prisma.projectSpec.create({
      data: {
        projectId,
        filePath: blob.url,
      },
    })

    metadata.set("status", "completed")

    logger.info("Spec generation complete", { projectId, specLength: text.length })

    return { spec: text }
  },
})
