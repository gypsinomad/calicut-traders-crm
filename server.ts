import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { VertexAI } from "@google-cloud/vertexai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  const vertexAI = new VertexAI({ 
    project: 'spiceroute-manager-65f3b', 
    location: 'us-central1' 
  });

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  app.post("/api/ai/generateContent", async (req, res) => {
    try {
      const { model, contents, config } = req.body;
      
      const generativeModel = vertexAI.preview.getGenerativeModel({
        model: model || 'gemini-3-flash-preview',
        generationConfig: config
      });

      const result = await generativeModel.generateContent({
        contents: contents
      });

      const response = await result.response;
      res.json(response);
    } catch (error: any) {
      console.error("[AI] Error:", error);
      res.status(500).json({ error: error.message || "AI Generation failed" });
    }
  });

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
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
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

startServer();
