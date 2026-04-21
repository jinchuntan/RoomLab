import type { DiagnosticEvent, DiagnosticLevel, DiagnosticScope } from '../types/domain';

export interface RoomLabLogSink {
  push: (entry: DiagnosticEvent) => void;
}

const makeId = (): string => `log_${Math.random().toString(36).slice(2, 10)}`;

export const createRoomLabLogger = (scope: DiagnosticScope, sink?: RoomLabLogSink) => {
  const write = (
    level: DiagnosticLevel,
    message: string,
    context?: Record<string, string | number | boolean | null>,
  ): DiagnosticEvent => {
    const entry: DiagnosticEvent = {
      id: makeId(),
      level,
      scope,
      message,
      timestamp: Date.now(),
      ...(context ? { context } : {}),
    };

    sink?.push(entry);

    const consoleMethod =
      level === 'error' ? console.error : level === 'warn' ? console.warn : level === 'debug' ? console.debug : console.info;
    consoleMethod(`[${scope}] ${message}`, context ?? '');

    return entry;
  };

  return {
    debug: (message: string, context?: Record<string, string | number | boolean | null>) =>
      write('debug', message, context),
    info: (message: string, context?: Record<string, string | number | boolean | null>) => write('info', message, context),
    warn: (message: string, context?: Record<string, string | number | boolean | null>) => write('warn', message, context),
    error: (message: string, context?: Record<string, string | number | boolean | null>) =>
      write('error', message, context),
  };
};
