"use client";

import { ADMIN_AUTH_BASE_PATH } from "@/lib/admin-routes";
import { createAuthClient } from "better-auth/react";

export const adminAuth = createAuthClient({
  basePath: ADMIN_AUTH_BASE_PATH,
});
