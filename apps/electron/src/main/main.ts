import { join } from "node:path";
import { app, BrowserWindow } from "electron";
import started from "electron-squirrel-startup";
import { APP_ID, APP_NAME } from "../shared/constants";
import { registerIpcHandlers } from "./ipc";

let mainWindow: BrowserWindow | null = null;

if (started) {
	app.quit();
}

app.setName(APP_NAME);
app.setAppUserModelId(APP_ID);
app.setAboutPanelOptions({
	applicationName: APP_NAME,
	applicationVersion: app.getVersion(),
	version: "",
});

function createWindow() {
	mainWindow = new BrowserWindow({
		width: 1200,
		height: 800,
		titleBarStyle: "hiddenInset",
		webPreferences: {
			preload: join(__dirname, "preload.js"),
			contextIsolation: true,
			nodeIntegration: false,
		},
	});

	mainWindow.maximize();

	if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
		mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
		// mainWindow.webContents.openDevTools();
	} else {
		mainWindow.loadFile(
			join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
		);
	}
	// mainWindow.webContents.openDevTools();
}

app.whenReady().then(() => {
	registerIpcHandlers();
	createWindow();

	app.on("activate", () => {
		if (BrowserWindow.getAllWindows().length === 0) createWindow();
	});
});

app.on("window-all-closed", () => {
	if (process.platform !== "darwin") app.quit();
});
