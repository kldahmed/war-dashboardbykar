import { getAdminQueuePayload, handleApiPrelude } from "../_live-news-ai.js";

export default async function handler(req, res) {
  if (handleApiPrelude(req, res)) return;
  return res.status(200).json(await getAdminQueuePayload(req));
}
