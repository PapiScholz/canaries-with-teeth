// Internal event types (v:1)
export type TelemetryEvent = {
  v: 1;
  type: "error" | "unhandledrejection" | "longtask" | "navigation" | "paint" | "lcp" | "inp";
  ts: number;
  sessionId: string;
  eventId: string;
  udi: number;
  data: Record<string, any>;
};

export type Batch = TelemetryEvent[];
