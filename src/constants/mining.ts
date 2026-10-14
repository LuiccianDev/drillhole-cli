export const ASSAY_SKIP_COLUMNS = ['HOLE_ID', 'HOLEID', 'BHID', 'FROM', 'TO', 'SAMPLE_#', 'SAMPLE'];

export const COLLAR_COLUMN_MAP = {
  HOLE_ID: ['HOLE_ID', 'HOLEID', 'BHID', 'DRILLHOLE', 'SONDAJE', 'ID'],
  EASTING: ['EASTING', 'EAST', 'X', 'XCOLLAR'],
  NORTHING: ['NORTHING', 'NORTH', 'Y', 'YCOLLAR'],
  ELEVATION: ['ELEVATION', 'ELEV', 'Z', 'ZCOLLAR', 'RL'],
  LENGTH: ['LENGTH', 'DEPTH', 'MAX_DEPTH', 'TD', 'TOTAL_DEPTH'],
} as const;

export const INTERVAL_COLUMN_MAP = {
  HOLE_ID: ['HOLE_ID', 'HOLEID', 'BHID', 'DRILLHOLE', 'SONDAJE', 'ID'],
  FROM: ['FROM', 'DE', 'DEPTH_FROM'],
  TO: ['TO', 'HASTA', 'A', 'DEPTH_TO'],
} as const;

export const LITHO_KEYWORDS = ['LITHO', 'ROCK', 'LITHOLOGY', 'GEO', 'RX'];

export const MINING_SENTINELS = [
  '-999',
  '-99',
  '-9999',
  '-9',
  '-99.0',
  '-999.0',
  '-9999.0',
  'NA',
  'NULL',
  'NAN',
  '.',
  '*',
] as const;

