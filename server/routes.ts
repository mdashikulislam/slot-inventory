import type { Express } from "express";
import { type Server } from "http";
import { storage } from "./storage";
import { insertPhoneSchema, insertIpSchema, insertSlotSchema } from "@shared/schema";
import { z } from "zod";
import bcrypt from "bcryptjs";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // ===== Phone Routes =====
  
  app.get("/api/phones", async (req, res) => {
    try {
      const phones = await storage.getPhones();
      res.json(phones);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/phones/:id", async (req, res) => {
    try {
      const phone = await storage.getPhone(req.params.id);
      if (!phone) {
        return res.status(404).json({ error: "Phone not found" });
      }
      res.json(phone);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/phones", async (req, res) => {
    try {
      const data = insertPhoneSchema.parse(req.body);
      const phone = await storage.createPhone(data);
      res.status(201).json(phone);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation error", details: error.errors });
      }
      if (error.message?.includes("duplicate") || error.code === "23505") {
        return res.status(409).json({ error: "Phone number already exists" });
      }
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/phones/:id", async (req, res) => {
    try {
      const data = insertPhoneSchema.partial().parse(req.body);
      const phone = await storage.updatePhone(req.params.id, data);
      if (!phone) {
        return res.status(404).json({ error: "Phone not found" });
      }
      res.json(phone);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation error", details: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/phones/:id", async (req, res) => {
    try {
      await storage.deletePhone(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/phones/:id/usage", async (req, res) => {
    try {
      const usage = await storage.getPhoneSlotUsage(req.params.id);
      res.json({ usage });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ===== IP Routes =====
  
  app.get("/api/ips", async (req, res) => {
    try {
      const ips = await storage.getIps();
      res.json(ips);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/ips/:id", async (req, res) => {
    try {
      const ip = await storage.getIp(req.params.id);
      if (!ip) {
        return res.status(404).json({ error: "IP not found" });
      }
      res.json(ip);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/ips", async (req, res) => {
    try {
      // Apply defaults for username/password if missing
      const body = { ...req.body };
      if (!body.username) body.username = "ashik";
      if (!body.password) body.password = "11224411";

      const data = insertIpSchema.parse(body);
      const ip = await storage.createIp(data);
      res.status(201).json(ip);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation error", details: error.errors });
      }
      if (error.message?.includes("duplicate") || error.code === "23505") {
        return res.status(409).json({ error: "IP address already exists" });
      }
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/ips/:id", async (req, res) => {
    try {
      const data = insertIpSchema.partial().parse(req.body);
      const ip = await storage.updateIp(req.params.id, data);
      if (!ip) {
        return res.status(404).json({ error: "IP not found" });
      }
      res.json(ip);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation error", details: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/ips/:id", async (req, res) => {
    try {
      await storage.deleteIp(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/ips/:id/usage", async (req, res) => {
    try {
      const usage = await storage.getIpSlotUsage(req.params.id);
      res.json({ usage });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ===== Slot Routes =====
  
  app.get("/api/slots", async (req, res) => {
    try {
      const slots = await storage.getSlots();
      res.json(slots);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/slots/:id", async (req, res) => {
    try {
      const slot = await storage.getSlot(req.params.id);
      if (!slot) {
        return res.status(404).json({ error: "Slot not found" });
      }
      res.json(slot);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/slots", async (req, res) => {
    try {
      const body = { ...req.body };
      
      // Normalize usedAt to Date object
      if (typeof body.usedAt === "string") {
        body.usedAt = new Date(body.usedAt);
      }
      
      // Normalize ids: treat empty string as undefined
      if (typeof body.phoneId === 'string' && body.phoneId.trim() === '') {
        delete body.phoneId;
      }
      if (typeof body.ipId === 'string' && body.ipId.trim() === '') {
        delete body.ipId;
      }
      
      // Validate schema first
      const data = insertSlotSchema.parse(body);
      const count = data.count ?? 1;
      
      // Use centralized validation logic
      const validation = await storage.validateSlotAllocation(
        data.phoneId, 
        data.ipId, 
        count,
        data.usedAt
      );

      if (!validation.valid) {
        return res.status(400).json({ error: validation.message });
      }

      const slot = await storage.createSlot(data);
      res.status(201).json(slot);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation error", details: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/slots/:id", async (req, res) => {
    try {
      await storage.deleteSlot(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ===== Authentication Routes =====
  
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ error: "Username and password required" });
      }

      const user = await storage.getUserByUsername(username);
      
      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const isValid = await bcrypt.compare(password, user.password);
      
      if (!isValid) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      // Return user without password
      const { password: _, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword, message: "Login successful" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/auth/change-password", async (req, res) => {
    try {
      const { username, currentPassword, newPassword } = req.body;
      
      if (!username || !currentPassword || !newPassword) {
        return res.status(400).json({ error: "All fields are required" });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ error: "New password must be at least 6 characters" });
      }

      const user = await storage.getUserByUsername(username);
      
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }

      const isValid = await bcrypt.compare(currentPassword, user.password);
      
      if (!isValid) {
        return res.status(401).json({ error: "Current password is incorrect" });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await storage.updateUserPassword(user.id, hashedPassword);

      res.json({ message: "Password changed successfully" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  return httpServer;
}
