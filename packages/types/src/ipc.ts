export const IPC_CHANNELS = {
	PING: "ping",
} as const;

export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS];
