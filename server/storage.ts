import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { eq, and, gte, desc, sql, lt } from "drizzle-orm";
import { subDays, startOfDay } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { SLOT_LIMIT, SLOT_WINDOW_DAYS, DEFAULT_TIMEZONE } from "@shared/utils";
import { 
  type User, 
  type InsertUser,
  type Phone,
  type InsertPhone,
  type Ip,
  type InsertIp,
  type Slot,
  type InsertSlot,
  users,
  phones,
  ips,
  slots
} from "@shared/schema";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserPassword(id: string, hashedPassword: string): Promise<void>;

  // Phone operations
  getPhones(): Promise<Phone[]>;
  getPhone(id: string): Promise<Phone | undefined>;
  createPhone(phone: InsertPhone): Promise<Phone>;
  updatePhone(id: string, phone: Partial<InsertPhone>): Promise<Phone | undefined>;
  deletePhone(id: string): Promise<void>;

  // IP operations
  getIps(): Promise<Ip[]>;
  getIp(id: string): Promise<Ip | undefined>;
  createIp(ip: InsertIp): Promise<Ip>;
  updateIp(id: string, ip: Partial<InsertIp>): Promise<Ip | undefined>;
  deleteIp(id: string): Promise<void>;

  // Slot operations
  getSlots(): Promise<Slot[]>;
  getSlot(id: string): Promise<Slot | undefined>;
  createSlot(slot: InsertSlot): Promise<Slot>;
  deleteSlot(id: string): Promise<void>;
  getPhoneSlotUsage(phoneId: string, referenceDate?: Date): Promise<number>;
  getIpSlotUsage(ipId: string, referenceDate?: Date): Promise<number>;
  validateSlotAllocation(phoneId: string | undefined, ipId: string | undefined, count: number, referenceDate?: Date): Promise<{ valid: boolean; message?: string; currentUsage?: number }>;
}

export class DbStorage implements IStorage {
  private db;

  constructor(connectionString: string) {
    const pool = new pg.Pool({
      connectionString,
    });
    this.db = drizzle(pool);
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await this.db.insert(users).values(insertUser).returning();
    return result[0];
  }

  async updateUserPassword(id: string, hashedPassword: string): Promise<void> {
    await this.db.update(users).set({ password: hashedPassword }).where(eq(users.id, id));
  }

  // Phone operations
  async getPhones(): Promise<Phone[]> {
    return await this.db.select().from(phones).orderBy(desc(phones.createdAt));
  }

  async getPhone(id: string): Promise<Phone | undefined> {
    const result = await this.db.select().from(phones).where(eq(phones.id, id)).limit(1);
    return result[0];
  }

  async createPhone(phone: InsertPhone): Promise<Phone> {
    const result = await this.db.insert(phones).values(phone).returning();
    return result[0];
  }

  async updatePhone(id: string, phone: Partial<InsertPhone>): Promise<Phone | undefined> {
    const result = await this.db.update(phones).set(phone).where(eq(phones.id, id)).returning();
    return result[0];
  }

  async deletePhone(id: string): Promise<void> {
    await this.db.delete(phones).where(eq(phones.id, id));
  }

  // IP operations
  async getIps(): Promise<Ip[]> {
    return await this.db.select().from(ips).orderBy(desc(ips.createdAt));
  }

  async getIp(id: string): Promise<Ip | undefined> {
    const result = await this.db.select().from(ips).where(eq(ips.id, id)).limit(1);
    return result[0];
  }

  async createIp(ip: InsertIp): Promise<Ip> {
    const result = await this.db.insert(ips).values(ip).returning();
    return result[0];
  }

  async updateIp(id: string, ip: Partial<InsertIp>): Promise<Ip | undefined> {
    const result = await this.db.update(ips).set(ip).where(eq(ips.id, id)).returning();
    return result[0];
  }

  async deleteIp(id: string): Promise<void> {
    await this.db.delete(ips).where(eq(ips.id, id));
  }

  // Slot operations
  async getSlots(): Promise<Slot[]> {
    return await this.db.select().from(slots).orderBy(desc(slots.usedAt));
  }

  async getSlot(id: string): Promise<Slot | undefined> {
    const result = await this.db.select().from(slots).where(eq(slots.id, id)).limit(1);
    return result[0];
  }

  async createSlot(slot: InsertSlot): Promise<Slot> {
    const result = await this.db.insert(slots).values(slot).returning();
    return result[0];
  }

  async deleteSlot(id: string): Promise<void> {
    await this.db.delete(slots).where(eq(slots.id, id));
  }

  async getPhoneSlotUsage(phoneId: string, referenceDate?: Date): Promise<number> {
    // Use provided reference date or current date for consistent calculation
    const now = referenceDate || new Date();
    // Convert to Asia/Dhaka timezone
    const zonedDate = toZonedTime(now, DEFAULT_TIMEZONE);
    // Calculate cutoff date at start of day to avoid timezone issues
    const cutoffDate = startOfDay(subDays(zonedDate, SLOT_WINDOW_DAYS));
    const startOfTomorrow = startOfDay(new Date(zonedDate.getTime() + 24 * 60 * 60 * 1000));
    
    const result = await this.db
      .select({ total: sql<number>`COALESCE(SUM(${slots.count}), 0)` })
      .from(slots)
      .where(
        and(
          eq(slots.phoneId, phoneId),
          gte(slots.usedAt, cutoffDate),
          lt(slots.usedAt, startOfTomorrow)
        )
      );
    
    return Number(result[0]?.total || 0);
  }

  async getIpSlotUsage(ipId: string, referenceDate?: Date): Promise<number> {
    // Use provided reference date or current date for consistent calculation
    const now = referenceDate || new Date();
    // Convert to Asia/Dhaka timezone
    const zonedDate = toZonedTime(now, DEFAULT_TIMEZONE);
    // Calculate cutoff date at start of day to avoid timezone issues
    const cutoffDate = startOfDay(subDays(zonedDate, SLOT_WINDOW_DAYS));
    const startOfTomorrow = startOfDay(new Date(zonedDate.getTime() + 24 * 60 * 60 * 1000));
    
    const result = await this.db
      .select({ total: sql<number>`COALESCE(SUM(${slots.count}), 0)` })
      .from(slots)
      .where(
        and(
          eq(slots.ipId, ipId),
          gte(slots.usedAt, cutoffDate),
          lt(slots.usedAt, startOfTomorrow)
        )
      );
    
    return Number(result[0]?.total || 0);
  }

  async validateSlotAllocation(
    phoneId: string | undefined, 
    ipId: string | undefined, 
    count: number,
    referenceDate?: Date
  ): Promise<{ valid: boolean; message?: string; currentUsage?: number }> {
    // Validate count
    if (count < 1 || count > SLOT_LIMIT) {
      return { valid: false, message: `Count must be between 1 and ${SLOT_LIMIT}` };
    }

    // Validate phone allocation
    if (phoneId) {
      const phoneExists = await this.getPhone(phoneId);
      if (!phoneExists) {
        return { valid: false, message: 'Phone not found' };
      }

      const currentUsage = await this.getPhoneSlotUsage(phoneId, referenceDate);
      if (currentUsage + count > SLOT_LIMIT) {
        return {
          valid: false,
          message: `Allocation blocked. Phone would exceed limit (Current: ${currentUsage}, Adding: ${count}, Limit: ${SLOT_LIMIT})`,
          currentUsage
        };
      }
    }

    // Validate IP allocation
    if (ipId) {
      const ipExists = await this.getIp(ipId);
      if (!ipExists) {
        return { valid: false, message: 'IP not found' };
      }

      const currentUsage = await this.getIpSlotUsage(ipId, referenceDate);
      if (currentUsage + count > SLOT_LIMIT) {
        return {
          valid: false,
          message: `Allocation blocked. IP would exceed limit (Current: ${currentUsage}, Adding: ${count}, Limit: ${SLOT_LIMIT})`,
          currentUsage
        };
      }
    }

    return { valid: true };
  }
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is not set");
}

export const storage = new DbStorage(connectionString);
