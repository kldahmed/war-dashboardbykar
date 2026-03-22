import { handleApiPrelude, renderAvatarPayload } from "../_live-news-ai.js";

export default async function handler(req, res) {
  if (handleApiPrelude(req, res, "POST, OPTIONS", "POST")) return;
  const payload = await renderAvatarPayload(req);
  if (!payload) return res.status(404).json({ error: "Video render payload not available" });
  return res.status(200).json(payload);
}
