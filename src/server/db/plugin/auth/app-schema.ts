import {
  index,
  uniqueIndex,
  sqliteTable,
  text,
  integer,
} from "drizzle-orm/sqlite-core";

export const appAuthUser = sqliteTable(
  "app_auth__user",
  {
    id: text("id").primaryKey(),
    name: text("name"),
    email: text("email").notNull().unique(),
    emailVerified: integer("emailVerified", { mode: "boolean" }).notNull(),
    image: text("image"),
    createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
  },
  (t) => [index("app_auth_user_created_idx").on(t.createdAt)],
);

export const appAuthSession = sqliteTable(
  "app_auth__session",
  {
    id: text("id").primaryKey(),
    expiresAt: integer("expiresAt", { mode: "timestamp" }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
    ipAddress: text("ipAddress"),
    userAgent: text("userAgent"),
    userId: text("userId")
      .notNull()
      .references(() => appAuthUser.id, { onDelete: "cascade" }),
  },
  (t) => [
    index("app_auth_session_user_idx").on(t.userId),
    index("app_auth_session_expiry_idx").on(t.expiresAt),
  ],
);

export const appAuthAccount = sqliteTable(
  "app_auth__account",
  {
    id: text("id").primaryKey(),
    accountId: text("accountId").notNull(),
    providerId: text("providerId").notNull(),
    userId: text("userId")
      .notNull()
      .references(() => appAuthUser.id, { onDelete: "cascade" }),
    accessToken: text("accessToken"),
    refreshToken: text("refreshToken"),
    idToken: text("idToken"),
    accessTokenExpiresAt: integer("accessTokenExpiresAt", {
      mode: "timestamp",
    }),
    refreshTokenExpiresAt: integer("refreshTokenExpiresAt", {
      mode: "timestamp",
    }),
    scope: text("scope"),
    password: text("password"),
    createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
  },
  (t) => [
    index("app_auth_account_user_idx").on(t.userId),
    uniqueIndex("app_auth_account_provider_uq").on(t.providerId, t.accountId),
  ],
);

export const appAuthVerification = sqliteTable(
  "app_auth__verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: integer("expiresAt", { mode: "timestamp" }).notNull(),
    createdAt: integer("createdAt", { mode: "timestamp" }),
    updatedAt: integer("updatedAt", { mode: "timestamp" }),
  },
  (t) => [index("app_auth_verification_identifier_idx").on(t.identifier)],
);
