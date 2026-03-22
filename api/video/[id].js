import { getRequestItemId, getVideoPayload, handleApiPrelude } from "../_live-news-ai.js";

export default async function handler(req, res) {
  if (handleApiPrelude(req, res)) return;
  const payload = await getVideoPayload(req, getRequestItemId(req));
  if (!payload) return res.status(404).json({ error: "Video asset not found" });
  return res.status(200).json(payload);
}
