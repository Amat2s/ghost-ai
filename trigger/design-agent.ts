import { task } from "@trigger.dev/sdk"
import { generateObject } from "ai"
import { google } from "@ai-sdk/google"
import { z } from "zod"
import { getLiveblocks } from "@/lib/liveblocks"
import { LiveObject, LiveMap } from "@liveblocks/node"

export interface DesignAgentPayload {
  prompt: string
  roomId: string
}

const NODE_SHAPES = ["rectangle", "diamond", "circle", "pill", "cylinder", "hexagon"] as const

const NODE_COLORS = [
  { fill: "#1F1F1F", text: "#EDEDED", name: "neutral/default" },
  { fill: "#10233D", text: "#52A8FF", name: "blue - APIs, services" },
  { fill: "#2E1938", text: "#BF7AF0", name: "purple - auth, identity" },
  { fill: "#331B00", text: "#FF990A", name: "orange - messaging, queues" },
  { fill: "#3C1618", text: "#FF6166", name: "red - critical services" },
  { fill: "#3A1726", text: "#F75F8F", name: "pink - UI, frontend" },
  { fill: "#0F2E18", text: "#62C073", name: "green - databases, storage" },
  { fill: "#062822", text: "#0AC7B4", name: "teal - cache, CDN" },
]

const DEFAULT_DIMS: Record<string, { w: number; h: number }> = {
  rectangle: { w: 160, h: 80 },
  diamond:   { w: 120, h: 120 },
  circle:    { w: 100, h: 100 },
  pill:      { w: 160, h: 60 },
  cylinder:  { w: 120, h: 100 },
  hexagon:   { w: 120, h: 110 },
}

const CanvasOperationSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("add_node"),
    id: z.string().describe("Unique node ID, e.g. node-api-gateway"),
    label: z.string().describe("Short label, 2-4 words"),
    shape: z.enum(NODE_SHAPES),
    color: z.string().describe("Node fill hex color from the allowed palette"),
    x: z.number().describe("X position in canvas coordinates"),
    y: z.number().describe("Y position in canvas coordinates"),
    width: z.number().optional(),
    height: z.number().optional(),
  }),
  z.object({
    action: z.literal("move_node"),
    id: z.string(),
    x: z.number(),
    y: z.number(),
  }),
  z.object({
    action: z.literal("resize_node"),
    id: z.string(),
    width: z.number(),
    height: z.number(),
  }),
  z.object({
    action: z.literal("update_node_data"),
    id: z.string(),
    label: z.string().optional(),
    color: z.string().optional(),
    shape: z.enum(NODE_SHAPES).optional(),
  }),
  z.object({
    action: z.literal("delete_node"),
    id: z.string(),
  }),
  z.object({
    action: z.literal("add_edge"),
    id: z.string().describe("Unique edge ID, e.g. edge-api-to-auth"),
    source: z.string().describe("Source node ID"),
    target: z.string().describe("Target node ID"),
    label: z.string().optional(),
  }),
  z.object({
    action: z.literal("delete_edge"),
    id: z.string(),
  }),
])

export const designAgent = task({
  id: "design-agent",
  retry: {
    maxAttempts: 3,
    factor: 2,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 30_000,
  },
  run: async (payload: DesignAgentPayload) => {
    const { prompt, roomId } = payload
    const lb = getLiveblocks()

    await lb.broadcastEvent(roomId, {
      type: "AI_STARTED",
      message: "Ghost AI is analyzing your request…",
    })

    try {
      // Read the current canvas state to give Gemini context
      let existingNodes: unknown[] = []
      let existingEdges: unknown[] = []
      try {
        const doc = await lb.getStorageDocument(roomId, "json")
        const flow = (doc as Record<string, unknown>)["flow"] as
          | { nodes?: Record<string, unknown>; edges?: Record<string, unknown> }
          | undefined
        if (flow) {
          existingNodes = Object.values(flow.nodes ?? {})
          existingEdges = Object.values(flow.edges ?? {})
        }
      } catch {
        // Room storage not yet initialized — canvas is empty
      }

      await lb.broadcastEvent(roomId, {
        type: "AI_STATUS",
        message: "Generating architecture design…",
      })

      const colorList = NODE_COLORS.map(
        (c) => `  "${c.fill}" (${c.name})`
      ).join("\n")

      const systemPrompt = `You are Ghost AI, an expert system architecture designer. Generate canvas operations to create or modify a system design diagram.

CANVAS RULES:
- Shapes: rectangle (general services), diamond (decision/gateway), circle (event/endpoint), pill (process/queue), cylinder (database/storage), hexagon (external system/boundary)
- Allowed fill colors only:
${colorList}
- Layout: 250px horizontal spacing, 150px vertical spacing between nodes
- Position range: x 0–1500, y 0–1000; center the design around x=600, y=400
- Node IDs: descriptive slugs like "node-api-gateway", "node-user-db"
- Edge IDs: descriptive slugs like "edge-api-to-auth"
- Labels: 2–4 words, title-case
- For a new design, generate all nodes first then all edges

EXISTING CANVAS:
${existingNodes.length > 0 ? JSON.stringify(existingNodes) : "(empty)"}
${existingEdges.length > 0 ? "Edges: " + JSON.stringify(existingEdges) : ""}

Generate operations to fulfill the user request. Prefer add_node and add_edge for new designs. Use move/resize/update/delete only when modifying existing nodes.`

      const { object } = await generateObject({
        model: google("gemini-2.0-flash"),
        schema: z.object({
          operations: z.array(CanvasOperationSchema),
        }),
        system: systemPrompt,
        prompt,
      })

      await lb.broadcastEvent(roomId, {
        type: "AI_STATUS",
        message: `Applying ${object.operations.length} changes to canvas…`,
      })

      // Apply all operations to the shared Liveblocks storage
      await lb.mutateStorage(roomId, ({ root }) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const r = root as any

        // Ensure the "flow" key exists (mirrors what useLiveblocksFlow does)
        if (r.get("flow") === undefined) {
          r.set(
            "flow",
            new LiveObject({
              nodes: new LiveMap(),
              edges: new LiveMap(),
            })
          )
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const flow = r.get("flow") as any
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const nodesMap = flow.get("nodes") as LiveMap<string, any>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const edgesMap = flow.get("edges") as LiveMap<string, any>

        for (const op of object.operations) {
          if (op.action === "add_node") {
            const dims = DEFAULT_DIMS[op.shape] ?? DEFAULT_DIMS.rectangle
            nodesMap.set(
              op.id,
              new LiveObject({
                id: op.id,
                type: "canvasNode",
                position: { x: op.x, y: op.y },
                data: new LiveObject({
                  label: op.label,
                  color: op.color,
                  shape: op.shape,
                }),
                width: op.width ?? dims.w,
                height: op.height ?? dims.h,
              })
            )
          } else if (op.action === "move_node") {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const node = nodesMap.get(op.id) as any
            node?.set("position", { x: op.x, y: op.y })
          } else if (op.action === "resize_node") {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const node = nodesMap.get(op.id) as any
            node?.set("width", op.width)
            node?.set("height", op.height)
          } else if (op.action === "update_node_data") {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const node = nodesMap.get(op.id) as any
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const data = node?.get("data") as any
            if (data) {
              if (op.label !== undefined) data.set("label", op.label)
              if (op.color !== undefined) data.set("color", op.color)
              if (op.shape !== undefined) data.set("shape", op.shape)
            }
          } else if (op.action === "delete_node") {
            nodesMap.delete(op.id)
          } else if (op.action === "add_edge") {
            edgesMap.set(
              op.id,
              new LiveObject({
                id: op.id,
                type: "canvasEdge",
                source: op.source,
                target: op.target,
                markerEnd: {
                  type: "arrowclosed",
                  color: "rgba(180,180,195,0.35)",
                  width: 16,
                  height: 16,
                },
                ...(op.label ? { label: op.label } : {}),
              })
            )
          } else if (op.action === "delete_edge") {
            edgesMap.delete(op.id)
          }
        }
      })

      await lb.broadcastEvent(roomId, {
        type: "AI_COMPLETED",
        message: "Design complete! Your architecture is ready.",
      })

      return {
        roomId,
        prompt,
        status: "completed",
        operationsApplied: object.operations.length,
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : "An unexpected error occurred"
      await lb.broadcastEvent(roomId, {
        type: "AI_ERROR",
        error: `Design generation failed: ${msg}`,
      })
      throw error
    }
  },
})
