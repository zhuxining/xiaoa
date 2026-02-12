export interface ElectronAPI {
	getVersions: () => {
		node: string;
		chrome: string;
		electron: string;
	};
	ping: () => Promise<string>;
}
