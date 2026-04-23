import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "node:fs/promises";
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

// AI Dedicated Service Start
async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware
  app.use("/api", express.json({ limit: "10mb" }));

  // API logs endpoint (for browser error reporting)
  app.post("/api/logs", (req, res) => {
    console.log("[Remote Browser Log]:", req.body);
    res.status(204).end();
  });

  // API health check (unprotected)
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  const vertexAI = new VertexAI({ 
    project: process.env.GCP_PROJECT_ID || process.env.VERTEX_AI_PROJECT_ID || "spiceroute-manager-65f3b", 
    location: process.env.VERTEX_AI_LOCATION || "us-central1" 
  });

  // Security Middleware for AI
  const authenticateAI = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const token = req.headers.authorization?.split(" ")[1] || req.headers["x-ai-secret"];
    const secret = process.env.AI_API_SECRET;

    if (secret && token === secret) {
      return next();
    }
    
    // Fail securely: strictly require secret in production
    if (process.env.NODE_ENV === 'production') {
      if (!secret) {
        console.error("[Security] AI_API_SECRET NOT SET IN PRODUCTION!");
      }
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    // In dev, allow if secret matches, or if secret is unset (with warning)
    if (secret) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    console.warn("[Security] AI_API_SECRET not set. Allowing access in development mode.");
    return next();
  };

  // Dedicated AI Endpoint
  const handleAIRequest = async (req: express.Request, res: express.Response) => {
    try {
      const { model, contents, config } = req.body;
      const generativeModel = vertexAI.preview.getGenerativeModel({
        model: model || "gemini-3-flash-preview",
        generationConfig: config
      });
      const result = await generativeModel.generateContent({ contents });
      const response = await result.response;
      res.json(response);
    } catch (error: any) {
      console.error("[AI] Error:", error);
      res.status(500).json({ error: error.message || "AI Generation failed" });
    }
  };

  app.post("/api/ai/generate", authenticateAI, handleAIRequest);
  app.post("/api/ai/generateContent", authenticateAI, handleAIRequest);

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    console.log("[Server] Initializing Vite middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "custom", // Handle index.html manually
      root: process.cwd()
    });
    app.use(vite.middlewares);
    
    app.get("*", async (req, res, next) => {
      const url = req.originalUrl;
      
      const urlPath = url.split('?')[0];
      
      // If it looks like a file (has . but not .html) or is a system cookie check, let it through
      const hasExtension = urlPath.includes('.') && !urlPath.endsWith('.html');
      const isApi = urlPath.startsWith('/api');
      const isSystem = urlPath.includes('__cookie_check');
      
      if (hasExtension || isApi || isSystem) {
        return next();
      }

      // Only handle HTML requests for navigation
      if (req.method !== 'GET' || (req.headers.accept && !req.headers.accept.includes('text/html'))) {
        return next();
      }

      try {
        let template = await fs.readFile(path.resolve(__dirname, "index.html"), "utf-8");
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
    console.log("[Server] Vite middleware and dev routes ready");
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    // Aggressive catch-all ONLY for valid page requests (no file extension)
    app.get(/^[^.]*$/, (req, res) => {
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
