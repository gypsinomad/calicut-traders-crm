import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { VertexAI } from "@google-cloud/vertexai";
import cors from "cors";
import crypto from "node:crypto";
import dotenv from "dotenv";

dotenv.config();

console.log("[Server] Starting with PID:", process.pid);
console.log("[Server] NODE_ENV:", process.env.NODE_ENV);
console.log("[Server] AI_API_SECRET presence:", !!process.env.AI_API_SECRET);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// AI Cache & Monitoring
const aiCache = new Map<string, { response: any, timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const sessionCounter = new Map<string, number>();
const pendingRequests = new Map<string, Promise<any>>();

const MAX_AI_CALLS_PER_SESSION = 20;
const MAX_AI_CALLS_PER_REQUEST = 5; // To prevent runaway loops in a single workflow

function getPromptHash(model: string, contents: any, config: any): string {
  const data = JSON.stringify({ model, contents, config });
  return crypto.createHash("sha256").update(data).digest("hex");
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware
  const corsOptions = {
    origin: true,
    credentials: true
  };
  app.use("/api", cors(corsOptions));
  app.use("/api", express.json({ limit: "10mb" }));

  // API health check (unprotected)
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  const vertexAI = new VertexAI({ 
    project: "spiceroute-manager-65f3b", 
    location: "us-central1" 
  });

  // Security Middleware for AI
  const authenticateAI = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.headers.authorization;
    const clientSecret = req.headers["x-ai-secret"];
    const secret = process.env.AI_API_SECRET;

    if (!secret) {
      console.warn("[Security] AI_API_SECRET not set in environment. AI routes are unprotected.");
      return next();
    }

    const token = authHeader?.split(" ")[1] || clientSecret;
    if (token !== secret) {
      console.warn(`[Security] Unauthorized AI request from ${req.ip}`);
      return res.status(401).json({ error: "Unauthorized: Invalid AI credentials" });
    }
    next();
  };

  // Dedicated AI Endpoint
  const handleAIRequest = async (req: express.Request, res: express.Response) => {
    try {
      const { model, contents, config, sessionId = "default" } = req.body;
      
      const currentSessionCount = sessionCounter.get(sessionId) || 0;
      if (currentSessionCount >= MAX_AI_CALLS_PER_SESSION) {
        return res.status(429).json({ error: "Session AI limit reached" });
      }

      const promptHash = getPromptHash(model, contents, config);
      const cached = aiCache.get(promptHash);
      if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
        return res.json(cached.response);
      }

      if (pendingRequests.has(promptHash)) {
        const response = await pendingRequests.get(promptHash);
        return res.json(response);
      }

      sessionCounter.set(sessionId, currentSessionCount + 1);

      const requestPromise = (async () => {
        const generativeModel = vertexAI.preview.getGenerativeModel({
          model: model || "gemini-3-flash-preview",
          generationConfig: config
        });
        const result = await generativeModel.generateContent({ contents });
        const response = await result.response;
        aiCache.set(promptHash, { response, timestamp: Date.now() });
        return response;
      })();

      pendingRequests.set(promptHash, requestPromise);
      try {
        const response = await requestPromise;
        res.json(response);
      } finally {
        pendingRequests.delete(promptHash);
      }
    } catch (error: any) {
      console.error("[AI] Error:", error);
      res.status(500).json({ error: error.message || "AI Generation failed" });
    }
  };

  app.post("/api/ai/generate", authenticateAI, handleAIRequest);
  app.post("/api/ai/generateContent", authenticateAI, handleAIRequest);

  app.post("/api/whatsapp/send", async (req, res) => {
    const { to, templateName, languageCode, components } = req.body;
    const token = process.env.WHATSAPP_API_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

    if (!token || !phoneNumberId) {
      // Fallback for simulation if not configured
      return res.json({ success: true, messageId: `SIM_${Date.now()}`, status: 'simulated' });
    }

    try {
      const response = await fetch(
        `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to,
            type: "template",
            template: {
              name: templateName,
              language: { code: languageCode || "en_US" },
              components,
            },
          }),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        console.error("[WhatsApp] API Error:", data);
        return res.status(response.status).json(data);
      }

      res.json(data);
    } catch (error) {
      console.error("[WhatsApp] Request Failed:", error);
      res.status(500).json({ error: "Failed to send WhatsApp message" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    console.log("[Server] Initializing Vite middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("[Server] Vite middleware ready");
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
