import { generateScriptPayload, handleApiPrelude } from "../_live-news-ai.js";

export default async function handler(req, res) {
  if (handleApiPrelude(req, res, "POST, OPTIONS", "POST")) return;
  const payload = await generateScriptPayload(req);
  if (!payload) return res.status(404).json({ error: "Unable to generate script for requested item" });
  return res.status(200).json(payload);
}
