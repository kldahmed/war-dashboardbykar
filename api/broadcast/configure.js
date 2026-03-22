import { handleApiPrelude, updateBroadcastSettings } from "../_live-news-ai-core.js";

export default async function handler(req, res) {
  if (handleApiPrelude(req, res, "POST, OPTIONS", "POST")) return;
  return res.status(200).json(await updateBroadcastSettings(req));
}
