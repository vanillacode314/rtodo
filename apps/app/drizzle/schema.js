import { sqliteTable, text, integer, uniqueIndex } from "drizzle-orm/sqlite-core";
export const messages = sqliteTable("messages", {
    id: text().primaryKey().notNull(),
    resourceId: text().notNull(),
    tableName: text().notNull(),
    columnName: text().notNull(),
    value: text().notNull(),
    createdAt: text().notNull(),
    syncedAt: text().notNull(),
});
export const metadata = sqliteTable("metadata", {
    key: text().primaryKey().notNull(),
    value: text().notNull(),
});
export const account = sqliteTable("account", {
    accessToken: text("access_token"),
    accessTokenExpiresAt: integer("access_token_expires_at"),
    accountId: text("account_id").notNull(),
    createdAt: integer("created_at").notNull(),
    id: text().primaryKey().notNull(),
    idToken: text("id_token"),
    password: text(),
    providerId: text("provider_id").notNull(),
    refreshToken: text("refresh_token"),
    refreshTokenExpiresAt: integer("refresh_token_expires_at"),
    scope: text(),
    updatedAt: integer("updated_at").notNull(),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
});
export const session = sqliteTable("session", {
    createdAt: integer("created_at").notNull(),
    expiresAt: integer("expires_at").notNull(),
    id: text().primaryKey().notNull(),
    ipAddress: text("ip_address"),
    token: text().notNull(),
    updatedAt: integer("updated_at").notNull(),
    userAgent: text("user_agent"),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
}, (table) => [
    uniqueIndex("session_token_unique").on(table.token),
]);
export const user = sqliteTable("user", {
    createdAt: integer("created_at").notNull(),
    displayUsername: text("display_username"),
    email: text().notNull(),
    emailVerified: integer("email_verified").notNull(),
    id: text().primaryKey().notNull(),
    image: text(),
    isAnonymous: integer("is_anonymous"),
    name: text().notNull(),
    updatedAt: integer("updated_at").notNull(),
    username: text(),
}, (table) => [
    uniqueIndex("user_username_unique").on(table.username),
    uniqueIndex("user_email_unique").on(table.email),
]);
export const verification = sqliteTable("verification", {
    createdAt: integer("created_at"),
    expiresAt: integer("expires_at").notNull(),
    id: text().primaryKey().notNull(),
    identifier: text().notNull(),
    updatedAt: integer("updated_at"),
    value: text().notNull(),
});
export const drizzleMigrations = sqliteTable("__drizzle_migrations", {});
