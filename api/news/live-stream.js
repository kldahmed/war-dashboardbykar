import { applyApiHeaders, handlePreflight, rejectUnsupportedMethod } from "../_api-utils.js";
import { getPublicLivePayload } from "../_live-news-ai-core.js";

export default async function handler(req, res) {
  applyApiHeaders(req, res, "GET, OPTIONS");
  if (handlePreflight(req, res)) return;
  if (rejectUnsupportedMethod(req, res, "GET")) return;

  res.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });

  const sendSnapshot = async () => {
    try {
      const payload = await getPublicLivePayload(req);
      res.write(`event: snapshot\ndata: ${JSON.stringify(payload)}\n\n`);
    } catch (error) {
      res.write(`event: health\ndata: ${JSON.stringify({ ok: false, error: error?.message || "snapshot_failed" })}\n\n`);
    }
  };

  await sendSnapshot();
  const intervalId = setInterval(sendSnapshot, 12000);

  req.on("close", () => {
    clearInterval(intervalId);
    res.end();
  });
}
