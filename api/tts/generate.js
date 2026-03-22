import { generateTtsPayload, handleApiPrelude } from "../_live-news-ai.js";

export default async function handler(req, res) {
  if (handleApiPrelude(req, res, "POST, OPTIONS", "POST")) return;
  const payload = await generateTtsPayload(req);
  if (!payload) return res.status(404).json({ error: "Audio asset not available" });
  return res.status(200).json(payload);
}
