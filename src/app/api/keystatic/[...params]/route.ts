import { makeRouteHandler } from "@keystatic/next/route-handler";
import config from "../../../../../keystatic.config";

// Di produksi CMS hanya aktif setelah env GitHub App diisi di Vercel.
const ready = process.env.NODE_ENV !== "production" || !!process.env.KEYSTATIC_GITHUB_CLIENT_ID;
const handler = ready ? makeRouteHandler({ config }) : null;
const notReady = () => new Response("CMS is not configured.", { status: 404 });

export const GET = handler?.GET ?? notReady;
export const POST = handler?.POST ?? notReady;
