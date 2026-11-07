import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  ADMIN_BASE_PATH,
  INTERNAL_ADMIN_BASE_PATH,
  getPathSuffix,
  isPathWithin,
} from "@/lib/admin-routes";
import {
  SERVER_FN_BASE_PATH,
  SERVER_FN_HEADER,
  isServerFnId,
  serverFnIdToPath,
} from "@/lib/server-action/protocol";

const notFound = () =>
  new NextResponse("Not Found", {
    status: 404,
    headers: { "Cache-Control": "no-store" },
  });

// This request proxy is routing-only. Authentication stays in server layouts.
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Server Function transport: browsers POST to the page URL with the function-ID header.
  // Rewrite to the internal Route Handler so the handler path never appears on the network.
  // Rewrites do not re-enter the proxy, so direct requests to the internal path are blocked below.
  if (isPathWithin(pathname, SERVER_FN_BASE_PATH)) {
    return notFound();
  }
  const serverFnId = request.headers.get(SERVER_FN_HEADER);
  if (serverFnId !== null) {
    if (request.method !== "POST" || !isServerFnId(serverFnId)) {
      return notFound();
    }
    const internalUrl = request.nextUrl.clone();
    internalUrl.pathname = serverFnIdToPath(serverFnId);
    internalUrl.search = "";
    return NextResponse.rewrite(internalUrl);
  }

  if (ADMIN_BASE_PATH === INTERNAL_ADMIN_BASE_PATH) {
    return NextResponse.next();
  }

  // Block direct internal requests before rewriting the public prefix.
  if (isPathWithin(pathname, INTERNAL_ADMIN_BASE_PATH)) {
    // A missing-page rewrite can be swallowed by a parallel-route catch-all.
    return notFound();
  }

  // Route HTML, RSC navigation/prefetch, and auth API requests identically.
  // Avoid afterFiles/wildcard rewrites being bypassed by hosted route matching.
  const suffix = getPathSuffix(pathname, ADMIN_BASE_PATH);
  if (suffix !== null) {
    const internalUrl = request.nextUrl.clone();
    internalUrl.pathname = `${INTERNAL_ADMIN_BASE_PATH}${suffix}`;
    return NextResponse.rewrite(internalUrl);
  }

  return NextResponse.next();
}

// Keep the public admin prefix and /admin/api/auth covered by this matcher.
// Page URLs (Server Function POST targets) already match the first entry; the second
// lets the proxy reject direct requests to the internal Server Function handler.
export const config = {
  matcher: [
    "/((?!api/|api$|_next/static|_next/image|favicon.ico|images/|fonts/).*)",
    "/api/internal/server-fn/:path*",
  ],
};
