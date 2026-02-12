import { IPC_CHANNELS } from "@xiaoa/types";
import { contextBridge, ipcRenderer } from "electron";

const api = {
	getVersions: () => ({
		node: process.versions.node,
		chrome: process.versions.chrome,
		electron: process.versions.electron,
	}),
	ping: () => ipcRenderer.invoke(IPC_CHANNELS.PING),
};

contextBridge.exposeInMainWorld("electronAPI", api);
