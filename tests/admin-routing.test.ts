import { afterEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/server/auth/admin", () => ({
  getAdminAuth: async () => ({
    handler: async (request: Request) =>
      Response.json({
        pathname: new URL(request.url).pathname,
        method: request.method,
        body: request.method === "POST" ? await request.text() : null,
      }),
  }),
}));
afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

it("uses a custom final path for links, nested requests, RSC and auth rewrites", async () => {
  vi.stubEnv("NEXT_PUBLIC_ADMIN_BASE_PATH", "/운영-012345abcd");
  vi.resetModules();
  const routes = await import("@/lib/admin-routes");
  const { proxy } = await import("@/proxy");
  expect(routes.adminRoutes.login).toBe("/운영-012345abcd/login");
  expect(routes.adminRoutes.orders).toBe("/운영-012345abcd/orders");
  expect(routes.ADMIN_AUTH_BASE_PATH).toBe("/운영-012345abcd/api/auth");
  for (const suffix of [
    "",
    "/login",
    "/orders",
    "/account",
    "/api/auth/get-session",
  ]) {
    const request = new NextRequest(
      "http://localhost:3000" + routes.ADMIN_BASE_PATH + suffix + "?tab=one",
      { headers: { RSC: "1" } },
    );
    const response = proxy(request);
    const rewritten = new URL(response.headers.get("x-middleware-rewrite")!);
    expect(rewritten.pathname).toBe("/admin" + suffix);
    expect(rewritten.search).toBe("?tab=one");
  }
  for (const path of ["/admin", "/admin/orders", "/admin/api/auth/get-session"])
    expect(proxy(new NextRequest("http://localhost:3000" + path)).status).toBe(
      404,
    );
  expect(
    proxy(
      new NextRequest("http://localhost:3000/운영-012345abcd-other"),
    ).headers.get("x-middleware-rewrite"),
  ).toBeNull();
});

it("normalizes public auth requests to the existing auth handler without losing POST body", async () => {
  vi.stubEnv("NEXT_PUBLIC_ADMIN_BASE_PATH", "/운영실");
  vi.resetModules();
  const { POST } = await import("@/app/(admin)/admin/api/auth/[...all]/route");
  const body = JSON.stringify({ email: "routing-fixture@example.test" });
  const response = await POST(
    new Request("http://localhost:3000/운영실/api/auth/sign-in/email", {
      method: "POST",
      body,
      headers: { "Content-Type": "application/json" },
    }),
  );
  expect(await response.json()).toEqual({
    pathname: "/admin/api/auth/sign-in/email",
    method: "POST",
    body,
  });
});

it("keeps the default prefix when no environment value is set", async () => {
  vi.stubEnv("NEXT_PUBLIC_ADMIN_BASE_PATH", "");
  vi.resetModules();
  expect((await import("@/lib/admin-routes")).ADMIN_BASE_PATH).toBe("/관리자");
});
