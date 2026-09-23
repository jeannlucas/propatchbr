import { pgTable, uuid, text, integer, boolean, timestamp, jsonb, bigint } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").default("user").notNull(), // 'user' | 'admin'
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const profiles = pgTable("profiles", {
  id: uuid("id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  avatarUrl: text("avatar_url"),
  role: text("role").default("user").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const products = pgTable("products", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  imageUrl: text("image_url"),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const productVersions = pgTable("product_versions", {
  id: uuid("id").defaultRandom().primaryKey(),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  version: text("version").notNull(),
  changelog: text("changelog"),
  fileName: text("file_name").notNull(),
  fileSizeBytes: bigint("file_size_bytes", { mode: "number" }),
  storagePath: text("storage_path").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const plans = pgTable("plans", {
  id: uuid("id").defaultRandom().primaryKey(),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  durationDays: integer("duration_days").notNull(),
  priceCents: integer("price_cents").notNull(),
  active: boolean("active").default(true).notNull(),
  badge: text("badge"),
  description: text("description"),
  features: jsonb("features").$type<string[]>().default([]).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const licenses = pgTable("licenses", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  planId: uuid("plan_id").references(() => plans.id, { onDelete: "set null" }),
  licenseKey: text("license_key").notNull().unique(),
  status: text("status").default("active").notNull(), // 'active' | 'expired' | 'revoked'
  startsAt: timestamp("starts_at", { withTimezone: true }).defaultNow().notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const payments = pgTable("payments", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  planId: uuid("plan_id").references(() => plans.id, { onDelete: "set null" }),
  billingId: text("billing_id").notNull().unique(),
  amountCents: integer("amount_cents").notNull(),
  status: text("status").notNull(), // 'PENDING' | 'PAID' | 'EXPIRED' | 'REFUNDED'
  paymentMethod: text("payment_method").default("PIX").notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const downloadLogs = pgTable("download_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  productVersionId: uuid("product_version_id")
    .notNull()
    .references(() => productVersions.id, { onDelete: "cascade" }),
  downloadStatus: text("download_status").default("completed").notNull(),
  ipAddress: text("ip_address"),
  downloadedAt: timestamp("downloaded_at", { withTimezone: true }).defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  profile: one(profiles, { fields: [users.id], references: [profiles.id] }),
  licenses: many(licenses),
  payments: many(payments),
  downloadLogs: many(downloadLogs),
}));

export const profilesRelations = relations(profiles, ({ one }) => ({
  user: one(users, { fields: [profiles.id], references: [users.id] }),
}));

export const productsRelations = relations(products, ({ many }) => ({
  versions: many(productVersions),
  plans: many(plans),
  licenses: many(licenses),
}));

export const productVersionsRelations = relations(productVersions, ({ one, many }) => ({
  product: one(products, { fields: [productVersions.productId], references: [products.id] }),
  downloadLogs: many(downloadLogs),
}));

export const plansRelations = relations(plans, ({ one, many }) => ({
  product: one(products, { fields: [plans.productId], references: [products.id] }),
  licenses: many(licenses),
  payments: many(payments),
}));

export const licensesRelations = relations(licenses, ({ one }) => ({
  user: one(users, { fields: [licenses.userId], references: [users.id] }),
  product: one(products, { fields: [licenses.productId], references: [products.id] }),
  plan: one(plans, { fields: [licenses.planId], references: [plans.id] }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  user: one(users, { fields: [payments.userId], references: [users.id] }),
  plan: one(plans, { fields: [payments.planId], references: [plans.id] }),
}));

export const downloadLogsRelations = relations(downloadLogs, ({ one }) => ({
  user: one(users, { fields: [downloadLogs.userId], references: [users.id] }),
  version: one(productVersions, { fields: [downloadLogs.productVersionId], references: [productVersions.id] }),
}));
