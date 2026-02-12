export interface ElectronAPI {
	getVersions: () => {
		name: string;
		version: string;
		node: string;
		chrome: string;
		electron: string;
	};
	ping: () => Promise<string>;
}
