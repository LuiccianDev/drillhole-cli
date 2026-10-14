export type VulcanDataType = 'integer' | 'single' | 'double' | 'text' | `text (empty)`;

export type FindingSeverity = 'CRITICAL' | 'WARNING' | 'INFO';

export type FindingType =
  | 'INVERTED_INTERVAL'
  | 'OVERLAP'
  | 'GAP'
  | 'DUPLICATE_HOLE'
  | 'INVALID_COORD'
  | 'INVALID_LENGTH'
  | 'SENTINEL_VALUE'
  | 'PHYSICAL_LIMIT';

export interface FindingItem {
  type: FindingType;
  severity: FindingSeverity;
  rowNumber?: number;
  holeId?: string;
  column?: string;
  value?: string | number;
  message: string;
}

export interface Range {
  clase: number;
  from: number;
  to: number;
  percentil_from: number;
  percentil_to: number;
  sampleCount?: number;
  percentage?: number;
}

/**
 * Statistical summary for an Assay column
 */
export interface AssayColumnStats {
  raw_min: number;
  raw_max: number;
  count: number;
  validCount: number;
  sentinelCount: number;
  mean: number;
  median: number;
  stdDev: number;
  variance: number;
  cv: number;
  ranges: Range[];
}

/**
 * Mapped type for Assay results, ensuring every key maps to a consistent statistical object.
 */
export type AssayResult = Record<string, AssayColumnStats>;

export interface AssayOptions {
  classes?: string | number;
  cols?: string[];
  output?: string;
  baseDir?: string;
  includeSentinels?: boolean;
}

export interface LimitResult {
  raw_min: number;
  raw_max: number;
  min_boundary: number;
  max_boundary: number;
}

export interface ElevationResult extends LimitResult {
  max_length: number;
  len_source: string;
}

export interface BlockModelBounds {
  origin: { x: number; y: number; z: number };
  extents: { dx: number; dy: number; dz: number };
  centroid: { x: number; y: number; z: number };
}

/**
 * Discriminated-like structure for Collar results.
 */
export interface CollarResult {
  EASTING: LimitResult;
  NORTHING: LimitResult;
  ELEVATION: ElevationResult;
  LENGTH: {
    raw_min: number;
    raw_max: number;
    source: string;
  };
  _headers: Record<'E' | 'N' | 'Z' | 'L', string | undefined>;
  blockModel?: BlockModelBounds;
}

export interface CollarOptions {
  buffer?: string | number;
  externalMaxLen?: string | number;
  output?: string;
  baseDir?: string;
}

export interface ColumnAudit {
  header: string;
  nulls: number;
  numeric: boolean;
}

export interface AuditResult {
  stats: {
    total_rows: number;
    columns: number;
    nulls: number;
    numeric_cols: number;
    critical_findings: number;
    warning_findings: number;
    info_findings: number;
  };
  colInfo: ColumnAudit[];
  findings: FindingItem[];
  detectedType: 'collar' | 'interval' | 'litho' | 'generic';
}

export interface LithoOptions {
  cols?: string[];
  output?: string;
  baseDir?: string;
}

export interface AuditOptions {
  output?: string;
  baseDir?: string;
}

export interface SchemaOptions {
  output?: string;
  baseDir?: string;
}

export interface RunnerOptions {
  dir: string;
  file: string;
  operation: 'audit' | 'collar' | 'assay' | 'litho' | 'schema';
  noBanner: boolean;
  format?: 'csv' | 'txt';
  outdir?: string;
  buffer?: string;
  classes?: string;
  cols?: string[];
}

export interface CliGlobalOptions {
  noBanner?: boolean;
}

export interface LithoDetail {
  code: string;
  count: number;
  percentage: number;
}

export type LithoResult = Record<string, string[]> & {
  _details?: Record<string, LithoDetail[]>;
};

export interface SchemaItem {
  column: string;
  type: VulcanDataType;
  maxLength: number;
  isDate?: boolean;
}

export type SchemaResult = SchemaItem[];
