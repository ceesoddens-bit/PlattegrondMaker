import app from "./app.js";
const port = Number(process.env.PORT ?? 8787);
app.listen(port, "127.0.0.1", () => {
    console.log(`Restaurant Floorplan AI server draait op http://127.0.0.1:${port}`);
});
