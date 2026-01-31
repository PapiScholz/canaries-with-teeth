// Deterministic UDI and event/session IDs
import { safe } from "./safe";

function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
  }
  return Math.abs(hash);
}

export function getSessionId(): string {
  let id = sessionStorage.getItem("canaries-session-id");
  if (!id) {
    id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    safe(() => sessionStorage.setItem("canaries-session-id", id));
  }
  return id;
}

export function getEventId(payload: object): string {
  return hashString(JSON.stringify(payload)).toString(36);
}
