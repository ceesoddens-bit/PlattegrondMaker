const { app, BrowserWindow, shell } = require("electron");
const path = require("node:path");
const { spawn } = require("node:child_process");
const net = require("node:net");

let apiProcess;

const rootDir = path.join(__dirname, "..");
const isDev = !app.isPackaged;
const clientUrl = process.env.ELECTRON_START_URL || "http://127.0.0.1:5173";
const apiUrl = "http://127.0.0.1:8787/api/health";

async function createWindow() {
  await ensureApiServer();

  const window = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 980,
    minHeight: 700,
    title: "Restaurant Plattegrond AI",
    backgroundColor: "#eef1ef",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  window.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  if (isDev) {
    await window.loadURL(clientUrl);
  } else {
    await window.loadFile(path.join(rootDir, "dist", "index.html"));
  }
}

async function ensureApiServer() {
  if (await isReachable(apiUrl)) {
    return;
  }

  const command = isDev ? "npm" : process.execPath;
  const args = isDev
    ? ["run", "dev:server"]
    : [path.join(rootDir, "server-dist", "server", "index.js")];

  apiProcess = spawn(command, args, {
    cwd: rootDir,
    env: {
      ...process.env,
      PORT: process.env.PORT || "8787"
    },
    stdio: isDev ? "inherit" : "ignore"
  });

  await waitForApi();
}

async function waitForApi() {
  const started = Date.now();
  while (Date.now() - started < 15000) {
    if (await isReachable(apiUrl)) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
}

function isReachable(url) {
  return new Promise((resolve) => {
    const parsed = new URL(url);
    const socket = net.connect(Number(parsed.port), parsed.hostname);
    socket.setTimeout(500);
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("timeout", () => {
      socket.destroy();
      resolve(false);
    });
    socket.once("error", () => resolve(false));
  });
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on("before-quit", () => {
  if (apiProcess && !apiProcess.killed) {
    apiProcess.kill();
  }
});
