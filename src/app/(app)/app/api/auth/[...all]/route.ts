// ============================================================
// 레퍼런스: API 라우트 핸들러
// 위치: src/app/(app)/app/api/auth/[...all]/route.ts
// ============================================================
// 치환 대상:
//   app → app, admin 등
//   App → App, Admin 등 (PascalCase)
// ============================================================

import { getAppAuth } from "@/server/auth/app";
import { toNextJsHandler } from "better-auth/next-js";

const handler = async (req: Request) => {
  const auth = await getAppAuth();
  const nextHandler = toNextJsHandler(auth.handler);

  if (req.method === "GET") {
    return nextHandler.GET(req);
  } else if (req.method === "POST") {
    return nextHandler.POST(req);
  }

  return new Response("Method not allowed", { status: 405 });
};

export { handler as GET, handler as POST };
