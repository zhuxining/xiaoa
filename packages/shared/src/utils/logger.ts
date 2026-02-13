/**
 * Logger utilities
 * Provides namespaced logging across the application
 */

/**
 * Log level type
 */
export type LogLevel = "debug" | "info" | "warn" | "error";

/**
 * Logger class for namespaced logging
 */
export class Logger {
	#scope: string;

	constructor(scope: string) {
		this.#scope = scope;
	}

	/**
	 * Log a debug message
	 */
	debug(message: string, ...args: unknown[]): void {
		this.#log("debug", message, args);
	}

	/**
	 * Log an info message
	 */
	info(message: string, ...args: unknown[]): void {
		this.#log("info", message, args);
	}

	/**
	 * Log a warning message
	 */
	warn(message: string, ...args: unknown[]): void {
		this.#log("warn", message, args);
	}

	/**
	 * Log an error message
	 */
	error(message: string, ...args: unknown[]): void {
		this.#log("error", message, args);
	}

	#log(level: LogLevel, message: string, args: unknown[]): void {
		const timestamp = new Date().toISOString();
		const levelStr = level.toUpperCase().padStart(5);
		const scopeStr = this.#scope ? `[${this.#scope}] ` : "";
		const argsStr =
			args.length > 0
				? ` ${args
						.map((a) => (typeof a === "object" ? JSON.stringify(a) : String(a)))
						.join(" ")}`
				: "";

		// Use console.error for warnings and errors, console.log for others
		const output =
			level === "warn" || level === "error" ? console.error : console.log;

		output(`${timestamp} ${levelStr} ${scopeStr}${message}${argsStr}`);
	}
}

/**
 * Create a logger with a specific namespace.
 *
 * @param namespace - The namespace for the logger (e.g., 'agent', 'mcp', 'storage')
 * @returns A Logger instance with the given namespace
 *
 * @example
 * const log = createLogger('agent');
 * log.debug('Starting session');
 * log.info('Connected to MCP');
 * log.error('Failed to connect', error);
 */
export function createLogger(namespace: string): Logger {
	return new Logger(namespace);
}
