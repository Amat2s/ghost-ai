import type { CanvasNode, CanvasEdge } from "@/types/canvas"
import { NODE_COLORS } from "@/types/canvas"
import { MarkerType } from "@xyflow/react"

export interface CanvasTemplate {
  id: string
  name: string
  description: string
  nodes: CanvasNode[]
  edges: CanvasEdge[]
}

const MARKER_END = {
  type: MarkerType.ArrowClosed,
  color: "rgba(180,180,195,0.35)",
  width: 16,
  height: 16,
}

function rect(id: string, label: string, ci: number, x: number, y: number): CanvasNode {
  return {
    id,
    type: "canvasNode",
    position: { x, y },
    data: { label, shape: "rectangle", color: NODE_COLORS[ci].fill },
    width: 160,
    height: 80,
  }
}

function cyl(id: string, label: string, ci: number, x: number, y: number): CanvasNode {
  return {
    id,
    type: "canvasNode",
    position: { x, y },
    data: { label, shape: "cylinder", color: NODE_COLORS[ci].fill },
    width: 120,
    height: 100,
  }
}

function dmnd(id: string, label: string, ci: number, x: number, y: number): CanvasNode {
  return {
    id,
    type: "canvasNode",
    position: { x, y },
    data: { label, shape: "diamond", color: NODE_COLORS[ci].fill },
    width: 160,
    height: 120,
  }
}

function hex(id: string, label: string, ci: number, x: number, y: number): CanvasNode {
  return {
    id,
    type: "canvasNode",
    position: { x, y },
    data: { label, shape: "hexagon", color: NODE_COLORS[ci].fill },
    width: 120,
    height: 120,
  }
}

function edge(id: string, source: string, target: string): CanvasEdge {
  return {
    id,
    type: "canvasEdge",
    source,
    target,
    data: {},
    markerEnd: MARKER_END,
  }
}

const microservices: CanvasTemplate = {
  id: "microservices",
  name: "Microservices",
  description: "API gateway routing to independent services with separate data stores.",
  nodes: [
    rect("gw", "API Gateway", 1, 220, 0),
    rect("auth", "Auth Service", 2, 0, 160),
    rect("user", "User Service", 1, 220, 160),
    rect("product", "Product Service", 3, 440, 160),
    cyl("cache", "Cache", 7, 20, 320),
    cyl("userdb", "User DB", 1, 250, 320),
    cyl("productdb", "Product DB", 3, 460, 320),
  ],
  edges: [
    edge("e1", "gw", "auth"),
    edge("e2", "gw", "user"),
    edge("e3", "gw", "product"),
    edge("e4", "auth", "cache"),
    edge("e5", "user", "userdb"),
    edge("e6", "product", "productdb"),
  ],
}

const cicd: CanvasTemplate = {
  id: "cicd",
  name: "CI/CD Pipeline",
  description: "Automated build, test, and deploy pipeline with artifact storage.",
  nodes: [
    rect("src", "Source Code", 0, 0, 40),
    rect("build", "Build", 1, 220, 40),
    rect("test", "Test", 3, 440, 40),
    dmnd("gate", "Quality Gate", 6, 640, 0),
    rect("deploy", "Deploy", 7, 880, 40),
    rect("prod", "Production", 2, 1100, 40),
    cyl("artifacts", "Artifacts", 0, 220, 200),
  ],
  edges: [
    edge("e1", "src", "build"),
    edge("e2", "build", "test"),
    edge("e3", "test", "gate"),
    edge("e4", "gate", "deploy"),
    edge("e5", "deploy", "prod"),
    edge("e6", "build", "artifacts"),
  ],
}

const eventDriven: CanvasTemplate = {
  id: "event-driven",
  name: "Event-Driven System",
  description: "Producers emit events to a central bus consumed by multiple services.",
  nodes: [
    rect("pa", "Producer A", 1, 0, 40),
    rect("pb", "Producer B", 2, 0, 200),
    hex("bus", "Event Bus", 7, 220, 110),
    rect("ca", "Consumer A", 3, 480, 0),
    rect("cb", "Consumer B", 6, 480, 120),
    rect("cc", "Consumer C", 5, 480, 240),
    cyl("dlq", "Dead Letter Queue", 4, 220, 310),
  ],
  edges: [
    edge("e1", "pa", "bus"),
    edge("e2", "pb", "bus"),
    edge("e3", "bus", "ca"),
    edge("e4", "bus", "cb"),
    edge("e5", "bus", "cc"),
    edge("e6", "bus", "dlq"),
  ],
}

export const CANVAS_TEMPLATES: CanvasTemplate[] = [microservices, cicd, eventDriven]
