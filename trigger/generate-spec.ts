import { task } from "@trigger.dev/sdk";

export type GenerateSpecPayload = {
  projectId: string;
  userId: string;
};

export const generateSpec = task({
  id: "generate-spec",
  retry: {
    maxAttempts: 3,
    factor: 2,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 30_000,
  },
  run: async (payload: GenerateSpecPayload) => {
    const { projectId, userId } = payload;

    // TODO: Load canvas graph from Vercel Blob at canvas/{projectId}.json
    // TODO: Call AI to generate a Markdown spec from the graph
    // TODO: Save spec to Vercel Blob at specs/{projectId}/{specId}.md
    // TODO: Create Spec record in the database linked to projectId

    return { projectId, status: "completed" };
  },
});
