import "dotenv/config";
import express from "express";
import multer from "multer";
import { createMockFloorPlan } from "./mockFloorPlan.js";

type GeneratedImageResult = {
  imageUrl: string;
  mimeType: string;
  title: string;
  warnings: string[];
};

const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    files: 8,
    fileSize: 12 * 1024 * 1024
  },
  fileFilter: (_req, file, cb) => {
    if (["image/jpeg", "image/png", "image/webp"].includes(file.mimetype)) {
      cb(null, true);
      return;
    }
    cb(new Error("Alleen JPG, PNG en WebP-afbeeldingen zijn toegestaan."));
  }
});

app.use(express.json({ limit: "1mb" }));

const APP_PASSWORD = process.env.APP_PASSWORD || "plattegrond";

app.post("/api/verify-password", (req, res) => {
  const { password } = req.body;
  if (password === APP_PASSWORD) {
    res.json({ ok: true });
  } else {
    res.status(401).json({ ok: false, error: "Ongeldig wachtwoord." });
  }
});

// Middleware om alle overige /api/* endpoints te beveiligen
app.use((req, res, next) => {
  if (req.path === "/api/verify-password") {
    return next();
  }
  if (req.path.startsWith("/api/")) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ error: "Ongeautoriseerd: Wachtwoord is verplicht." });
      return;
    }
    const token = authHeader.substring(7);
    if (token !== APP_PASSWORD) {
      res.status(401).json({ error: "Ongeautoriseerd: Ongeldig wachtwoord." });
      return;
    }
  }
  next();
});

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    provider: "nano-banana",
    apiVersion: geminiApiVersion(),
    model: nanoBananaImageModel(),
    textModel: geminiTextModel(),
    mockEnabled: process.env.MOCK_AI === "true",
    hasApiKey: Boolean(process.env.GEMINI_API_KEY)
  });
});

app.get("/api/gemini-key-test", async (_req, res) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      res.status(400).json({ ok: false, error: "GEMINI_API_KEY ontbreekt." });
      return;
    }

    const data = await callGemini(geminiTextModel(), {
      contents: [
        {
          parts: [{ text: "Explain how AI works in a few words" }]
        }
      ]
    });

    res.json({
      ok: true,
      model: geminiTextModel(),
      apiVersion: geminiApiVersion(),
      text: findTextParts(data).join(" ").trim()
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error instanceof Error ? error.message : "Gemini key-test mislukt." });
  }
});

app.post(
  "/api/generate-floorplan",
  upload.fields([
    { name: "blueprint", maxCount: 1 },
    { name: "styleReference", maxCount: 1 },
    { name: "photos", maxCount: 6 }
  ]),
  async (req, res) => {
    try {
      const uploaded = (req.files ?? {}) as Record<string, Express.Multer.File[]>;
      const blueprint = uploaded.blueprint?.[0];
      const styleReference = uploaded.styleReference?.[0];
      const photos = uploaded.photos ?? [];
      const hints = typeof req.body.hints === "string" ? req.body.hints : "";
      const useMock = req.body.mock === "true" || req.query.mock === "true" || process.env.MOCK_AI === "true";

      if (useMock) {
        res.json({ floorPlan: createMockFloorPlan(hints), source: "mock" });
        return;
      }

      if (!process.env.GEMINI_API_KEY) {
        res.status(400).json({
          error: "GEMINI_API_KEY ontbreekt. Maak een .env-bestand op basis van .env.example, of gebruik de demo zonder API-kosten."
        });
        return;
      }

      if (!blueprint) {
        res.status(400).json({ error: "Upload altijd een tekening van de plattegrond. Die tekening is nodig om precies te kunnen werken." });
        return;
      }

      if (photos.length < 1) {
        res.status(400).json({ error: "Upload minimaal 1 restaurantfoto naast de plattegrondtekening." });
        return;
      }

      const generatedImage = await generateWithNanoBanana(blueprint, styleReference, photos, hints);
      res.json({ generatedImage, source: "nano-banana" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Onbekende fout bij het maken van de plattegrond.";
      res.status(500).json({ error: message });
    }
  }
);

app.use((error: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  res.status(400).json({ error: error.message });
});

async function generateWithNanoBanana(
  blueprint: Express.Multer.File,
  styleReference: Express.Multer.File | undefined,
  photos: Express.Multer.File[],
  hints: string
): Promise<GeneratedImageResult> {
  const model = nanoBananaImageModel();
  const prompt = [
    "Create a polished top-down restaurant base floor plan image.",
    "Input order:",
    "1. The first image is the exact floor plan drawing. Treat it as the authoritative source for geometry, walls, doors, room shapes, and proportions.",
    styleReference
      ? "2. The second image is the desired final-result style reference. Match its visual quality, top-down rendered look, lighting, materials, outdoor/indoor treatment, realistic shadows, camera angle, and overall polish. Do not copy its table overlay labels."
      : "2. No final-result style reference was provided, so create a premium top-down hospitality render style.",
    "3. The remaining restaurant photos are visual references only for materials, atmosphere, fixed counters, bar, kitchen, restrooms, terrace, plants, and permanent fixtures.",
    "Output one clean final image, not JSON.",
    "Do not draw green table overlays, table numbers, reservation labels, seat counts, people icons, or capacity badges.",
    "Do not add movable dining tables unless they are clearly permanent built-in fixtures.",
    "Important style transformation: do not merely clean up or copy the technical blueprint. Redraw it as a high-end restaurant render similar to the style reference: realistic flooring, greenery, walls, terrace surfaces, shadows, counters, service areas, and soft environmental detail.",
    "Style: premium hospitality floor plan, softly realistic top-down render, warm natural materials, crisp wall edges, subtle shadows, readable fixed-area labels only where useful.",
    "Keep the layout precise to the uploaded drawing; do not invent extra rooms.",
    "No marketing copy, no watermark text, no legend.",
    hints.trim() ? `User hints: ${hints.trim()}` : "No extra user hints."
  ].join("\n");

  const parts = [
    { text: prompt },
    toGeminiImagePart(blueprint),
    ...(styleReference ? [toGeminiImagePart(styleReference)] : []),
    ...photos.map(toGeminiImagePart)
  ];

  const data = await callGemini(model, {
    contents: [{ parts }],
    generationConfig: {
      responseModalities: ["TEXT", "IMAGE"]
    }
  });

  const imagePart = findInlineImagePart(data);
  if (!imagePart) {
    const text = findTextParts(data).join(" ").trim();
    throw new Error(
      text ||
        `Gemini gaf geen afbeelding terug met model ${model}. De key kan werken voor tekst, maar dit model moet ook image output ondersteunen.`
    );
  }

  return {
    imageUrl: `data:${imagePart.mimeType};base64,${imagePart.data}`,
    mimeType: imagePart.mimeType,
    title: "Nano Banana restaurantplattegrond",
    warnings: [
      "Gegenereerd met Nano Banana op basis van de plattegrondtekening en referentiefoto's.",
      "Controleer exacte maatvoering, looproutes en nooduitgangen handmatig."
    ]
  };
}

async function callGemini(model: string, body: unknown): Promise<any> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/${geminiApiVersion()}/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: "POST",
      headers: {
        "x-goog-api-key": process.env.GEMINI_API_KEY ?? "",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    }
  );

  const data: any = await response.json();
  if (!response.ok) {
    const message = friendlyGeminiError(data?.error?.message ?? "Gemini-aanroep mislukt.", model);
    throw new Error(message);
  }
  return data;
}

function geminiApiVersion(): string {
  return process.env.GEMINI_API_VERSION || "v1beta";
}

function geminiTextModel(): string {
  return process.env.GEMINI_TEXT_MODEL || process.env.NANO_BANANA_MODEL || "gemini-flash-latest";
}

function nanoBananaImageModel(): string {
  return process.env.NANO_BANANA_IMAGE_MODEL || "gemini-2.5-flash-image";
}

function toGeminiImagePart(file: Express.Multer.File) {
  return {
    inlineData: {
      mimeType: file.mimetype,
      data: file.buffer.toString("base64")
    }
  };
}

function findInlineImagePart(data: any): { mimeType: string; data: string } | null {
  for (const candidate of data?.candidates ?? []) {
    for (const part of candidate?.content?.parts ?? []) {
      const inlineData = part?.inlineData ?? part?.inline_data;
      if (inlineData?.data && inlineData?.mimeType?.startsWith("image/")) {
        return { mimeType: inlineData.mimeType, data: inlineData.data };
      }
      if (inlineData?.data && inlineData?.mime_type?.startsWith("image/")) {
        return { mimeType: inlineData.mime_type, data: inlineData.data };
      }
    }
  }
  return null;
}

function findTextParts(data: any): string[] {
  const texts: string[] = [];
  for (const candidate of data?.candidates ?? []) {
    for (const part of candidate?.content?.parts ?? []) {
      if (typeof part?.text === "string") {
        texts.push(part.text);
      }
    }
  }
  return texts;
}

function friendlyGeminiError(message: string, model: string): string {
  if (message.includes("Quota exceeded")) {
    return [
      `De API-key werkt, maar Google geeft geen image-generation quota voor ${model}.`,
      `De teksttest kan nog steeds werken via ${geminiTextModel()}, maar voor deze knop is een Nano Banana image-model met billing/quota nodig.`
    ].join(" ");
  }
  if (message.includes("API key not valid") || message.includes("API_KEY_INVALID")) {
    return "De Gemini API-key is ongeldig. Maak een nieuwe key aan in Google AI Studio en zet die in .env.";
  }
  return message;
}

export default app;
