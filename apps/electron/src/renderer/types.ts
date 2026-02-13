import type { ElectronAPI } from "@xiaoa/types";

declare global {
	interface Window {
		electronAPI: ElectronAPI;
	}
}
