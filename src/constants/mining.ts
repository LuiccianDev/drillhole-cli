export const ASSAY_SKIP_COLUMNS = ['HOLE_ID', 'FROM', 'TO', 'SAMPLE_#', 'SAMPLE'];

export const COLLAR_COLUMN_MAP = {
  EASTING: ['EASTING', 'EAST', 'X', 'XCOLLAR'],
  NORTHING: ['NORTHING', 'NORTH', 'Y', 'YCOLLAR'],
  ELEVATION: ['ELEVATION', 'ELEV', 'Z', 'ZCOLLAR'],
  LENGTH: ['LENGTH', 'DEPTH', 'MAX_DEPTH', 'TD'],
} as const;

export const LITHO_KEYWORDS = ['LITHO', 'ROCK'];
