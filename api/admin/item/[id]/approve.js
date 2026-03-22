import { getRequestItemId, handleApiPrelude, mutateItemApproval } from "../../../_live-news-ai.js";

export default async function handler(req, res) {
  if (handleApiPrelude(req, res, "POST, OPTIONS", "POST")) return;
  const payload = await mutateItemApproval(req, getRequestItemId(req), "approved", { manual_action: "approve", read_now: Boolean(req.body?.read_now) });
  if (!payload) return res.status(404).json({ error: "Item not found" });
  return res.status(200).json(payload);
}
