// Internal deterministic contracts (v1)

export type TelemetryV1 = {
  v: 1;
  type: "error" | "unhandledrejection" | "longtask" | "navigation" | "paint" | "lcp" | "inp";
  ts: number;
  sessionId: string;
  dedupKey: string;
  udi: number;
  data: Record<string, any>;
};

export type IngestBatchV1 = TelemetryV1[];
