"use client";

import { createAuthClient } from "better-auth/react";

export const appAuth = createAuthClient({
  basePath: "/app/api/auth",
});
