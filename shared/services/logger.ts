// ============================================================
// Optimile ERP — Structured Client Logger
// ============================================================
// Centralises all client-side error/warn reporting:
//   1. console output in dev (esbuild.drop removes it in prod)
//   2. Fire-and-forget POST to /api/v1/logs/client in all envs
//
// Usage:
//   logger.error('Something went wrong', { module: 'TMS', error })
//   logger.warn('Unexpected state', { module: 'AMS' })
// ============================================================

const LOG_ENDPOINT = '/api/v1/logs/client';

export type LogLevel = 'error' | 'warn' | 'info';

export interface LogEntry {
    level: LogLevel;
    message: string;
    module?: string;
    error?: Error;
    componentStack?: string;
    timestamp: string;
}

// Serialise an Error to a plain object so JSON.stringify captures it
function serializeError(error: Error): { message: string; name: string; stack?: string } {
    return { message: error.message, name: error.name, stack: error.stack };
}

function send(entry: LogEntry): void {
    // Dev-only console output (dropped by esbuild in production builds)
    if (entry.level === 'error') {
        console.error(
            `[${entry.module ?? 'app'}] ${entry.message}`,
            entry.error,
            entry.componentStack ?? '',
        );
    } else if (entry.level === 'warn') {
        console.warn(`[${entry.module ?? 'app'}] ${entry.message}`);
    } else {
        console.log(`[${entry.module ?? 'app'}] ${entry.message}`);
    }

    // Persist to backend — fire-and-forget; never throws
    fetch(LOG_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            ...entry,
            error: entry.error ? serializeError(entry.error) : undefined,
        }),
    }).catch(() => {});
}

export const logger = {
    error(message: string, opts?: Omit<LogEntry, 'level' | 'message' | 'timestamp'>): void {
        send({ level: 'error', message, timestamp: new Date().toISOString(), ...opts });
    },
    warn(message: string, opts?: Omit<LogEntry, 'level' | 'message' | 'timestamp'>): void {
        send({ level: 'warn', message, timestamp: new Date().toISOString(), ...opts });
    },
    info(message: string, opts?: Omit<LogEntry, 'level' | 'message' | 'timestamp'>): void {
        send({ level: 'info', message, timestamp: new Date().toISOString(), ...opts });
    },
};
