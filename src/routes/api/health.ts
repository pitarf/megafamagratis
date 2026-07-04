import { json } from "@tanstack/start";
import { createAPIFileRoute } from "@tanstack/start/api";

export const APIRoute = createAPIFileRoute("/api/health")({
  GET: () => {
    return json({ status: "ok", timestamp: new Date().toISOString() });
  },
});
