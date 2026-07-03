export type VulcanDataType = 'integer' | 'single' | 'double' | 'text' | `text (empty)`;

export interface Range {
  clase: number;
  from: number;
  to: number;
  percentil_from: number;
  percentil_to: number;
}

/**
 * Mapped type for Assay results, ensuring every key maps to a consistent statistical object.
 */
export type AssayResult = Record<string, {
  raw_min: number;
  raw_max: number;
  count: number;
  ranges: Range[];
}>;

export interface AssayOptions {
  classes?: string | number;
  cols?: string[];
  output?: string;
  baseDir?: string;
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
  };
  colInfo: ColumnAudit[];
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

export type LithoResult = Record<string, string[]>;

export interface SchemaItem {
  column: string;
  type: VulcanDataType;
  maxLength: number;
}

export type SchemaResult = SchemaItem[];
