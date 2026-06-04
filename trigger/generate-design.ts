import { task } from "@trigger.dev/sdk";

export type GenerateDesignPayload = {
  projectId: string;
  prompt: string;
  userId: string;
};

export const generateDesign = task({
  id: "generate-design",
  retry: {
    maxAttempts: 3,
    factor: 2,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 30_000,
  },
  run: async (payload: GenerateDesignPayload) => {
    const { projectId, prompt, userId } = payload;

    // TODO: Call AI to generate nodes/edges from prompt
    // TODO: Write generated nodes and edges into the Liveblocks room for projectId

    return { projectId, status: "completed" };
  },
});
