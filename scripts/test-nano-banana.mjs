import fs from "node:fs";
import path from "node:path";

const [blueprintPath, photoPath, runsArg = "3"] = process.argv.slice(2);
const runs = Number(runsArg);

if (!process.env.GEMINI_API_KEY) {
  console.error("GEMINI_API_KEY ontbreekt. Zet deze in je terminal voordat je test.");
  process.exit(1);
}

if (!blueprintPath || !photoPath) {
  console.error("Gebruik: GEMINI_API_KEY=... node scripts/test-nano-banana.mjs <plattegrond.png> <foto.jpg> [aantal]");
  process.exit(1);
}

const model = process.env.NANO_BANANA_MODEL || "gemini-2.5-flash-image";
const outputDir = path.resolve("outputs", "nano-banana-tests");
fs.mkdirSync(outputDir, { recursive: true });

for (let index = 1; index <= runs; index += 1) {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/${encodeURIComponent(model)}:generateContent`, {
    method: "POST",
    headers: {
      "x-goog-api-key": process.env.GEMINI_API_KEY,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: [
                "Create a polished top-down restaurant base floor plan image.",
                "Use the first image as the exact floor plan drawing and the second as visual reference.",
                "Do not draw green table overlays, table numbers, seat counts, people icons, or reservation labels.",
                "Output one clean premium hospitality floor plan image."
              ].join(" ")
            },
            inlineImagePart(blueprintPath),
            inlineImagePart(photoPath)
          ]
        }
      ]
    })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error?.message || "Nano Banana-test mislukt.");
  }

  const image = findInlineImagePart(data);
  if (!image) {
    throw new Error("Geen afbeelding teruggekregen.");
  }

  const extension = image.mimeType.includes("jpeg") ? "jpg" : "png";
  const outputPath = path.join(outputDir, `test-${String(index).padStart(2, "0")}.${extension}`);
  fs.writeFileSync(outputPath, Buffer.from(image.data, "base64"));
  console.log(outputPath);
}

function inlineImagePart(filePath) {
  return {
    inlineData: {
      mimeType: mimeTypeFor(filePath),
      data: fs.readFileSync(filePath).toString("base64")
    }
  };
}

function mimeTypeFor(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".webp") return "image/webp";
  return "image/png";
}

function findInlineImagePart(data) {
  for (const candidate of data?.candidates ?? []) {
    for (const part of candidate?.content?.parts ?? []) {
      const inlineData = part?.inlineData ?? part?.inline_data;
      const mimeType = inlineData?.mimeType ?? inlineData?.mime_type;
      if (inlineData?.data && mimeType?.startsWith("image/")) {
        return { mimeType, data: inlineData.data };
      }
    }
  }
  return null;
}
