import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import bcrypt from "bcryptjs";
import { users } from "../shared/schema";
import { eq } from "drizzle-orm";

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://localhost:5432/slotmanager";

async function seed() {
  const pool = new pg.Pool({ connectionString: DATABASE_URL });
  const db = drizzle(pool);

  console.log("🌱 Seeding database...");

  try {
    // Check if admin user exists
    const existingAdmin = await db.select().from(users).where(eq(users.username, "admin")).limit(1);

    if (existingAdmin.length > 0) {
      console.log("✅ Admin user already exists");
    } else {
      // Create admin user with password 'admin123'
      const hashedPassword = await bcrypt.hash("admin123", 10);
      
      await db.insert(users).values({
        username: "admin",
        password: hashedPassword,
      });

      console.log("✅ Created admin user");
      console.log("   Username: admin");
      console.log("   Password: admin123");
      console.log("   ⚠️  Please change this password after first login!");
    }

    console.log("✨ Seeding complete!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  }
}

seed();
