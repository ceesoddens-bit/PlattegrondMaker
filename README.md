# Restaurant Plattegrond AI

Lokale webapp om restaurantplattegronden te genereren met een plattegrondtekening, een optionele stijlreferentie en restaurantfoto's.

## Installeren

```bash
npm install
cp .env.example .env
```

Vul daarna `GEMINI_API_KEY` in `.env`.
Stel ook `APP_PASSWORD` in op een sterk, uniek wachtwoord.

## Starten

```bash
npm run dev
```

De app draait standaard op `http://127.0.0.1:5173/`.

## Publiceren op Vercel

Importeer de GitHub-repository als Vite-project. De build- en API-instellingen staan in `vercel.json`.

Voeg vóór de eerste productiedeployment deze Environment Variables toe voor Production, Preview en Development:

- `APP_PASSWORD`
- `GEMINI_API_KEY`
- `GEMINI_API_VERSION` (standaard `v1beta`)
- `NANO_BANANA_IMAGE_MODEL` (standaard `gemini-2.5-flash-image`)

De browser verkleint grote uploads automatisch zodat het multipart-verzoek onder de requestlimiet van Vercel Functions blijft.

## Belangrijk

Zet nooit `.env` of API-keys op GitHub. Dit project sluit `.env` uit via `.gitignore`.
