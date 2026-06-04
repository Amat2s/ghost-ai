import { z } from "zod"

export const aiStatusFeedMessageSchema = z.object({
  text: z.string().optional(),
})

export type AiStatusFeedMessage = z.infer<typeof aiStatusFeedMessageSchema>

export const aiChatFeedMessageSchema = z.object({
  sender: z.string(),
  role: z.enum(["user", "system"]),
  content: z.string(),
  timestamp: z.number(),
})

export type AiChatFeedMessage = z.infer<typeof aiChatFeedMessageSchema>
