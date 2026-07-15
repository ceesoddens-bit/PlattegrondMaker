# Restaurant Plattegrond AI

Lokale webapp om restaurantplattegronden te genereren met een plattegrondtekening, een optionele stijlreferentie en restaurantfoto's.

## Installeren

```bash
npm install
cp .env.example .env
```

Vul daarna `GEMINI_API_KEY` in `.env`.

## Starten

```bash
npm run dev
```

De app draait standaard op `http://127.0.0.1:5173/`.

## Belangrijk

Zet nooit `.env` of API-keys op GitHub. Dit project sluit `.env` uit via `.gitignore`.
