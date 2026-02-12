import { IPC_CHANNELS } from "@xiaoa/types";
import { ipcMain } from "electron";

export function registerIpcHandlers() {
	ipcMain.handle(IPC_CHANNELS.PING, () => "pong");
}
