export type Levels = 'log' | 'info' | 'warn' | 'error';

  /**  Represents a log entry with information about the log type, message, and optional details. */
  export interface Log {
	/** The type of log entry (log, info, warn, error). */
	type: Levels;
	/** The log message. */
	message: string;
	/** The file associated with the log entry. */
	file?: string | null;
	/** The line number associated with the log entry. */
	lineNumber?: number | undefined;
	/** The column number associated with the log entry. */
	columnNumber?: number | undefined;
	/** The stack trace associated with the log entry. */
	stack?: string | null;
}

export interface LoggerConfig {
	levels?: Levels[];
	url: string;
}
