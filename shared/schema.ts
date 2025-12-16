import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const phones = pgTable("phones", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  phoneNumber: text("phone_number").notNull().unique(),
  email: text("email").notNull(),
  provider: text("provider"),
  remark: text("remark"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertPhoneSchema = createInsertSchema(phones).omit({
  id: true,
  createdAt: true,
});

export type InsertPhone = z.infer<typeof insertPhoneSchema>;
export type Phone = typeof phones.$inferSelect;

export const ips = pgTable("ips", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ipAddress: text("ip_address").notNull().unique(),
  port: text("port"),
  username: text("username"),
  password: text("password"),
  provider: text("provider"),
  remark: text("remark"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertIpSchema = createInsertSchema(ips).omit({
  id: true,
  createdAt: true,
});

export type InsertIp = z.infer<typeof insertIpSchema>;
export type Ip = typeof ips.$inferSelect;

export const slots = pgTable("slots", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  phoneId: varchar("phone_id").notNull().references(() => phones.id, { onDelete: "cascade" }),
  ipId: varchar("ip_id").notNull().references(() => ips.id, { onDelete: "cascade" }),
  count: integer("count").notNull().default(1),
  usedAt: timestamp("used_at").notNull(),
});

export const insertSlotSchema = createInsertSchema(slots).omit({
  id: true,
});

export type InsertSlot = z.infer<typeof insertSlotSchema>;
export type Slot = typeof slots.$inferSelect;
