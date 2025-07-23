export type LogLevel = 'info' | 'warn' | 'error' | 'fatal' | 'trace' | 'debug';

export type LogMessage = string | Error | string[];

export interface Position {
  start: { line: number };
  end: { line: number };
}

export interface File {
  path: string;
  position?: Position;
}

interface Metadata {
  file?: File;
}

interface TransportContext {
  level: number;
  message: string;
  timestamp: number;
  metadata?: Metadata;
  module?: string;
}

export type Transport = (context: TransportContext) => void;
