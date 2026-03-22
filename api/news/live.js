import { apiOk, getPublicLivePayload, handleApiPrelude } from "../_live-news-ai.js";

export default async function handler(req, res) {
  if (handleApiPrelude(req, res)) return;
  return apiOk(res, await getPublicLivePayload(req));
}
