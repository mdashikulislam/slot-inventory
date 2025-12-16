import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { eq, and, gte, desc, sql } from "drizzle-orm";
import { subDays } from "date-fns";
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
  getPhoneSlotUsage(phoneId: string): Promise<number>;
  getIpSlotUsage(ipId: string): Promise<number>;
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

  async getPhoneSlotUsage(phoneId: string): Promise<number> {
    const cutoffDate = subDays(new Date(), 15);
    
    const result = await this.db
      .select({ total: sql<number>`COALESCE(SUM(${slots.count}), 0)` })
      .from(slots)
      .where(
        and(
          eq(slots.phoneId, phoneId),
          gte(slots.usedAt, cutoffDate)
        )
      );
    
    return Number(result[0]?.total || 0);
  }

  async getIpSlotUsage(ipId: string): Promise<number> {
    const cutoffDate = subDays(new Date(), 15);
    
    const result = await this.db
      .select({ total: sql<number>`COALESCE(SUM(${slots.count}), 0)` })
      .from(slots)
      .where(
        and(
          eq(slots.ipId, ipId),
          gte(slots.usedAt, cutoffDate)
        )
      );
    
    return Number(result[0]?.total || 0);
  }
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is not set");
}

export const storage = new DbStorage(connectionString);
