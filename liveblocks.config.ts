declare global {
  interface Liveblocks {
    Presence: {
      cursor: { x: number; y: number } | null;
      thinking: boolean;
    };

    Storage: {};

    UserMeta: {
      id: string;
      info: {
        name: string;
        avatar: string;
        color: string;
      };
    };

    RoomEvent:
      | { type: "AI_STARTED"; message: string }
      | { type: "AI_STATUS"; message: string }
      | { type: "AI_COMPLETED"; message: string }
      | { type: "AI_ERROR"; error: string };

    ThreadMetadata: {};

    RoomInfo: {};
  }
}

export {};
