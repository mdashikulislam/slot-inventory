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
  email: text("email").default(""),
  remark: text("remark").default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Create insert schema: phoneNumber required, email & remark optional (DB defaults)
export const insertPhoneSchema = createInsertSchema(phones)
  .omit({ id: true, createdAt: true })
  .extend({
    phoneNumber: z.string().min(1, "Phone number is required"),
  });

export type InsertPhone = z.infer<typeof insertPhoneSchema>;
export type Phone = typeof phones.$inferSelect;

export const ips = pgTable("ips", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ipAddress: text("ip_address").notNull().unique(),
  port: text("port").default(""),
  username: text("username").default(""),
  password: text("password").default(""),
  provider: text("provider").default(""),
  remark: text("remark").default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertIpSchema = createInsertSchema(ips)
  .omit({ id: true, createdAt: true })
  .extend({
    ipAddress: z.string().min(1, "IP address is required"),
    port: z.string().min(1, "Port is required"),
  });

export type InsertIp = z.infer<typeof insertIpSchema>;
export type Ip = typeof ips.$inferSelect;

export const slots = pgTable("slots", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  // phoneId and ipId are nullable now because allocations are independent (either can be used)
  phoneId: varchar("phone_id").references(() => phones.id, { onDelete: "cascade" }),
  ipId: varchar("ip_id").references(() => ips.id, { onDelete: "cascade" }),
  count: integer("count").notNull().default(1),
  usedAt: timestamp("used_at").notNull(),
});

export const insertSlotSchema = createInsertSchema(slots)
  .omit({ id: true })
  .extend({
    // allow either phoneId or ipId to be provided
    phoneId: z.string().optional(),
    ipId: z.string().optional(),
    count: z.number().optional(),
    usedAt: z.coerce.date(),
  })
  .superRefine((val, ctx) => {
    if (!val.phoneId && !val.ipId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Either phoneId or ipId is required" });
    }
  });

export type InsertSlot = z.infer<typeof insertSlotSchema>;
export type Slot = typeof slots.$inferSelect;
