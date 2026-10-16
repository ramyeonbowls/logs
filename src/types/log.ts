export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';

export interface LogLine {
  id: string;
  lineNumber: number;
  timestamp: string;
  level: LogLevel;
  service: string;
  traceId?: string;
  spanId?: string;
  message: string;
  attributes?: Record<string, string | number | boolean>;
  stackTrace?: string[];
  raw?: string;
}

export interface LogFile {
  id: string;
  path: string;
  filename: string;
  size: string;
  lineCount: number;
  encoding: string;
  lineEnding: string;
  stats: {
    errorCount: number;
    warnCount: number;
    infoCount: number;
    debugCount: number;
    fatalCount: number;
  };
  lines: LogLine[];
}

export type ActiveView = 
  | 'raw_file_viewer' 
  | 'directory' 
  | 'tail_aggregation' 
  | 'grep_filters' 
  | 'ingest_metrics' 
  | 'parser_settings';
