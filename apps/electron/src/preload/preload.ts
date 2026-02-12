import { IPC_CHANNELS } from "@xiaoa/types";
import { app, contextBridge, ipcRenderer } from "electron";
import { APP_NAME } from "../shared/constants";

const api = {
	getVersions: () => ({
		name: APP_NAME,
		version: app.getVersion(),
		node: process.versions.node,
		chrome: process.versions.chrome,
		electron: process.versions.electron,
	}),
	ping: () => ipcRenderer.invoke(IPC_CHANNELS.PING),
};

contextBridge.exposeInMainWorld("electronAPI", api);
