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
    project: "spiceroute-manager-65f3b", 
    location: "us-central1" 
  });

  // Security Middleware for AI
  const authenticateAI = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const token = req.headers.authorization?.split(" ")[1] || req.headers["x-ai-secret"];
    const secret = process.env.AI_API_SECRET;

    if (!secret || token === secret) {
      return next();
    }
    
    res.status(401).json({ error: "Unauthorized" });
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
