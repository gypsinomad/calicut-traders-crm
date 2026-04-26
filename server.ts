import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "node:fs/promises";
import { fileURLToPath } from "url";
import { VertexAI } from "@google-cloud/vertexai";
import cors from "cors";
import crypto from "node:crypto";
import dotenv from "dotenv";
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { trackAICallServer } from "./server/aiUsageTracker.ts";

dotenv.config({ override: true });

// Initialize Firebase Admin
const projectId = process.env.GCP_PROJECT_ID || process.env.VERTEX_AI_PROJECT_ID || "spiceroute-manager-65f3b";
try {
  admin.initializeApp({
    projectId: projectId
  });
  console.log("[Server] Firebase Admin initialized for project:", projectId);
} catch (error) {
  console.error("[Server] Firebase Admin initialization failed:", error);
}

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
    project: projectId, 
    location: process.env.VERTEX_AI_LOCATION || "us-central1" 
  });

  // Security Middleware for AI
  const authenticateAI = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.headers.authorization;
    const aiSecretHeader = req.headers["x-ai-secret"];
    const secret = process.env.AI_API_SECRET;

    // 1. Check for Shared Secret (Legacy/Dev)
    if (secret && (authHeader?.split(" ")[1] === secret || aiSecretHeader === secret)) {
      return next();
    }

    // 2. Check for Firebase ID Token
    if (authHeader?.startsWith("Bearer ")) {
      const idToken = authHeader.split("Bearer ")[1];
      try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        (req as any).user = decodedToken;
        return next();
      } catch (error) {
        console.error("[Security] Token verification failed:", error);
      }
    }
    
    // Fail securely: strictly require valid auth in production
    if (process.env.NODE_ENV === 'production') {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    // In dev, allow if no secret is set (with warning)
    if (!secret) {
      console.warn("[Security] No authentication provided. Allowing access in development mode because AI_API_SECRET is not set.");
      return next();
    }
    
    return res.status(401).json({ error: "Unauthorized" });
  };

// Dedicated AI Endpoint
const handleAIRequest = async (req: express.Request, res: express.Response) => {
  try {
    const { model: requestedModel, contents, config, feature = 'API Request' } = req.body;
    const user = (req as any).user;
    
    if (!user) {
      return res.status(401).json({ error: "User authentication required" });
    }

    // 1. Fetch user profile to get organization
    const userDoc = await admin.firestore().collection("users").doc(user.uid).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: "User profile not found" });
    }
    const orgId = userDoc.data()?.organization || "default";

    // 2. Fetch AI settings for the organization
    const settingsDoc = await admin.firestore().collection("organizations").doc(orgId).collection("settings").doc("ai").get();
    const settings = settingsDoc.exists ? settingsDoc.data() : { provider: 'gemini', enabled: true };
    
    if (settings && settings.enabled === false) {
      return res.status(403).json({ error: "AI features are disabled for this organization" });
    }

    const provider = settings?.provider || 'gemini';
    const providerSettings = settings?.providers?.[provider] || {};
    const model = providerSettings.model || requestedModel || (provider === 'gemini' ? "gemini-3-flash-preview" : "");

    let responseJson: any = null;
    let inputTokens = 0;
    let outputTokens = 0;

    if (provider === 'gemini') {
      const generativeModel = vertexAI.getGenerativeModel({
        model: model,
        generationConfig: config
      });
      const result = await generativeModel.generateContent({ contents });
      const response = await result.response;
      responseJson = response;
      
      inputTokens = response.usageMetadata?.promptTokenCount || 0;
      outputTokens = response.usageMetadata?.candidatesTokenCount || 0;
    } else if (provider === 'openai' || provider === 'deepseek' || provider === 'nemotron' || provider === 'mistral') {
      const openai = new OpenAI({ 
        apiKey: providerSettings.apiKey, 
        baseURL: providerSettings.baseUrl || (provider === 'mistral' ? 'https://api.mistral.ai/v1' : undefined)
      });
      
      const messages: any[] = [];
      // Simple content to message mapping for server-side
      if (Array.isArray(contents)) {
        contents.forEach((c: any) => {
          if (c.parts) {
            messages.push({ role: c.role || 'user', content: c.parts[0].text });
          } else {
            messages.push({ role: 'user', content: typeof c === 'string' ? c : c.text });
          }
        });
      }

      const completion = await openai.chat.completions.create({
        model,
        messages,
        response_format: config?.responseMimeType === 'application/json' ? { type: 'json_object' } : undefined
      });
      
      const responseText = completion.choices[0].message.content || '';
      inputTokens = completion.usage?.prompt_tokens || 0;
      outputTokens = completion.usage?.completion_tokens || 0;

      responseJson = {
        candidates: [{ content: { parts: [{ text: responseText }] } }],
        usageMetadata: {
          promptTokenCount: inputTokens,
          candidatesTokenCount: outputTokens,
          totalTokenCount: inputTokens + outputTokens
        }
      };
    } else if (provider === 'anthropic') {
      const anthropic = new Anthropic({ apiKey: providerSettings.apiKey });
      
      let prompt = '';
      if (Array.isArray(contents)) {
        prompt = contents[0]?.parts?.[0]?.text || contents[0]?.text || '';
      }

      const message = await anthropic.messages.create({
        model,
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      });

      const responseText = (message.content[0] as any).text || '';
      inputTokens = message.usage.input_tokens;
      outputTokens = message.usage.output_tokens;

      responseJson = {
        candidates: [{ content: { parts: [{ text: responseText }] } }],
        usageMetadata: {
          promptTokenCount: inputTokens,
          candidatesTokenCount: outputTokens,
          totalTokenCount: inputTokens + outputTokens
        }
      };
    } else {
      return res.status(400).json({ error: `Unsupported AI provider: ${provider}` });
    }

    // TRACK USAGE
    if (inputTokens > 0 || outputTokens > 0) {
      await trackAICallServer(orgId, user.uid, feature, inputTokens, outputTokens);
    }

    return res.json(responseJson);
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
