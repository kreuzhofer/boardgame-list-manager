export type AdminSSEEventType =
  | 'bgg:import-progress'
  | 'bgg:import-complete'
  | 'bgg:enrich-progress'
  | 'bgg:enrich-complete';

export interface BggImportProgressEvent {
  type: 'bgg:import-progress';
  running: boolean;
  processed: number;
  total: number;
  created: number;
  updated: number;
  errors: number;
  etaSeconds: number | null;
}

export interface BggImportCompleteEvent {
  type: 'bgg:import-complete';
  processed: number;
  total: number;
  created: number;
  updated: number;
  errors: number;
  durationSeconds: number;
}

export interface BggEnrichProgressEvent {
  type: 'bgg:enrich-progress';
  running: boolean;
  processed: number;
  total: number;
  skipped: number;
  errors: number;
  bytesTransferred: number;
  etaSeconds: number | null;
}

export interface BggEnrichCompleteEvent {
  type: 'bgg:enrich-complete';
  processed: number;
  total: number;
  skipped: number;
  errors: number;
  bytesTransferred: number;
  durationSeconds: number;
  stopReason?: string;
}

export type AdminSSEEvent =
  | BggImportProgressEvent
  | BggImportCompleteEvent
  | BggEnrichProgressEvent
  | BggEnrichCompleteEvent;
