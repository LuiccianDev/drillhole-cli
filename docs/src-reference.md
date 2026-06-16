# Technical Reference — `src/`

> **Document Type:** Reference  
> **Audience:** Developers maintaining or extending the `drill-cli` codebase.  
> **Goal:** Understand the internal structure of `src/`, how each module works, what functions they export, and how they interact with each other.

---

## Overview

The `src/` directory contains all the core logic of `drill-cli`. It is divided into two layers:

```
src/
├── parser.js          # File reading and parsing utilities
└── commands/
    ├── assay.js       # Assay ranges — statistical percentile analysis
    ├── collar.js      # Collar limits — coordinate boundary calculations
    ├── litho.js       # Litho values — unique code frequency analysis
    ├── schema.js      # Vulcan types — column data type inference
    ├── audit.js       # Audit — column integrity and data quality checks
    └── export.js      # Export — file output formatting (TXT / CSV)
```

All modules use ES Module syntax (`import`/`export`). The entry point for the CLI is `bin/cli.js`, which imports the default export from each command module.

---

## `src/parser.js`

Provides low-level file reading and parsing. All command modules depend on this module.

### `parseFile(filepath)`

Reads a file and parses it row-by-row into an array of objects.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `filepath` | `string` | Absolute or relative path to a `.csv` or `.txt` file. |

**Returns:** `{ headers, rows, delim }`

| Property | Type | Description |
|----------|------|-------------|
| `headers` | `string[]` | Array of column names from the first line. |
| `rows` | `Object[]` | Array of objects where each key is a column name. |
| `delim` | `string` | Detected delimiter: `'\t'` (tab) or `','` (comma). |

**Throws:** `Error` if the file does not exist or has fewer than 2 lines.

**Used by:** `audit.js`, `litho.js` (via CLI for header reading).

---

### `parseColumns(filepath, maxRows?)`

Reads a file and organizes its data into column arrays instead of row objects. More efficient for statistical operations on large files.

**Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `filepath` | `string` | — | Path to the file. |
| `maxRows` | `number` | `0` (all rows) | Maximum number of data rows to read. |

**Returns:** `{ headers, columns, delim }`

| Property | Type | Description |
|----------|------|-------------|
| `headers` | `string[]` | Array of column names. |
| `columns` | `Object` | Object where each key is a column name and its value is an array of raw string values. |
| `delim` | `string` | Detected delimiter. |

**Used by:** `assay.js`, `collar.js`, `litho.js`, `schema.js`.

---

### `getFilesInDir(dir?)`

Lists all `.csv` and `.txt` files in a directory, sorted alphabetically.

**Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `dir` | `string` | `process.cwd()` | Directory to scan. |

**Returns:** `string[]` — Array of filenames (not full paths).

**Used by:** `bin/cli.js` to populate the file selection menu.

---

## `src/commands/assay.js`

Performs statistical percentile-based range analysis on numeric mineral grade columns.

### `runAssay(file, opts?)`

The core computation function.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `file` | `string` | Path to the input file. |
| `opts.classes` | `string \| number` | Number of percentile classes/ranges. Defaults to `6`. |
| `opts.cols` | `string[]` | Array of column names to analyze. If provided, only these columns are processed. If omitted, all non-skipped columns are used. |

**Column filtering logic:** If `opts.cols` is provided and non-empty, only those columns are processed. Otherwise, a built-in `SKIP` list (`HOLE_ID`, `FROM`, `TO`, `SAMPLE_#`, `SAMPLE`) is used to exclude structural columns automatically.

**Returns:** `Object` — A result object keyed by column name.

```js
{
  "CUT%": {
    raw_min:  0,
    raw_max:  2.24,
    count:    487,
    ranges: [
      { clase: 1, from: 0, to: 0.29, percentil_from: 0, percentil_to: 16.6667 },
      // ...
    ]
  }
}
```

---

### `printAssay(result)`

Formats and prints the result of `runAssay` to the console in an aligned column table.

---

### `assayCmd(file, opts)` _(default export)_

Orchestrates a full assay run: calls `runAssay`, calls `printAssay`, and optionally exports to file via `exportData`.

---

## `src/commands/collar.js`

Calculates spatial boundary limits for collar survey data (coordinates and depth).

### `runCollar(file, opts?)`

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `file` | `string` | Path to the input file. Must contain columns `EASTING`, `NORTHING`, `ELEVATION`, `LENGTH`. |
| `opts.buffer` | `string \| number` | Fixed buffer value added/subtracted from boundaries. Defaults to `0`. |

**Rounding rules:**

| Column | Rounding unit | Buffer factor |
|--------|--------------|---------------|
| `EASTING` | 100 (hundreds) | ×1 |
| `NORTHING` | 100 (hundreds) | ×1 |
| `ELEVATION` | 10 (tens) | ÷10 |

**`ELEVATION` special logic:**
- `min_boundary` = `floor(MIN(ELEVATION) - MAX(LENGTH), 10) - buffer/10`
- `max_boundary` = `ceil(MAX(ELEVATION), 10) + buffer/10`

**Returns:** `{ EASTING, NORTHING, ELEVATION, LENGTH }` — each with `raw_min`, `raw_max`, `min_boundary`, `max_boundary`.

---

### `collarCmd(file, opts)` _(default export)_

Runs `runCollar`, prints the result, and optionally exports.

---

## `src/commands/litho.js`

Computes the frequency of unique categorical codes in a specified column, for use in building geological legends.

### `runLitho(file, opts?)`

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `file` | `string` | Path to the input file. |
| `opts.col` | `string` | Column name to analyze. Defaults to `'RX_CODE'`. |
| `opts.freq` | `string \| number` | Minimum frequency filter. Values below this count are excluded. Defaults to `0` (all). |

**Special exclusion:** Values equal to `'NS'` (No Sample) or empty strings are always excluded from the result.

**Returns:** `Object` — Keyed by code value, sorted descending by frequency.

```js
{
  "GRDIO": { frequency: 120 },
  "ANST":  { frequency: 45 },
}
```

**Throws:** `Error` if `opts.col` does not exist in the file headers.

---

### `lithoCmd(file, opts)` _(default export)_

Runs `runLitho`, prints unique codes to console, and optionally exports.

---

## `src/commands/schema.js`

Infers the Vulcan-compatible data type for each column in a file.

### `runSchema(file, opts?)`

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `file` | `string` | Path to the input file. |
| `opts.maxRows` | `string \| number` | Maximum rows to sample for inference. Defaults to `1000`. |

**Type inference rules:**

| Condition | Assigned type |
|-----------|--------------|
| Column is entirely empty | `text` |
| Contains any non-numeric value | `text` |
| All integers (no decimals) | `integer` |
| Decimals ≤ 7 places | `single` |
| Decimals > 7 places | `double` |

Supports scientific notation (e.g., `1e-8`).

**Returns:** `Object` — Keyed by column name.

```js
{
  "HOLE_ID":  { type: "text",    reason: "Contiene texto" },
  "FROM":     { type: "integer", reason: "Solo enteros" },
  "CUT%":     { type: "single",  reason: "Máx decimales: 2 (<= 7)" }
}
```

---

### `schemaCmd(file, opts)` _(default export)_

Runs `runSchema`, prints the table, and exports a flattened version (only `type`, no `reason`) to file.

---

## `src/commands/audit.js`

Validates the structural integrity and data quality of a file.

### `auditCmd(filepath, opts)` _(default export)_

This module exposes only a default export. It does not expose a separate `runAudit` function.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `filepath` | `string` | Path to the file to audit. |
| `opts` | `Object` | Unused for now; reserved for future filtering options. |

**Checks performed:**

| Check | Description |
|-------|-------------|
| Row column count | Flags rows where the number of values does not match the header count. |
| Empty / null values | Counts empty or null cells per column and in total. |
| Comma decimals | Detects values like `1,25` where a comma is used instead of a period as decimal separator (invalid for Vulcan). |

**Output:** Prints a structured audit report to the console using `@clack/prompts` log helpers (`log.info`, `log.warn`, `log.error`, `log.success`). No file is exported.

---

## `src/commands/export.js`

Handles the serialization of result objects to disk in TXT or CSV format.

### `exportData(data, name, format)`

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `data` | `Object` | The result object from any command's `run*` function. |
| `name` | `string` | Base name for the output file (e.g., `'assay_limits'`). |
| `format` | `string` | `'txt'` or `'csv'`. |

**Returns:** `string | string[]` — The filename(s) of the generated file(s). Returns a single string if only one file was created, or an array if multiple files were generated (e.g., for the CSV ranges split).

**TXT format behavior:**
- Writes a human-readable block with a header banner, generation timestamp, and values per key.
- Nested arrays (like `ranges`) are rendered as aligned column tables matching console output.

**CSV format behavior:**
- If the data contains nested arrays (like `ranges`), **only** the ranges CSV is generated (named `<name>_ranges_<timestamp>.csv`).
- If there are no nested arrays, a standard flat CSV is generated (named `<name>_<timestamp>.csv`).
- This prevents broken CSV files caused by embedding array data inside cells.

**File naming convention:** `<name>_<ISO_timestamp>.ext`  
Example: `assay_limits_2026-06-16T22-00-00.txt`

---

## Module Interaction Diagram

```
bin/cli.js
    │
    ├── src/parser.js
    │       ├── parseFile()        ← used by audit.js, cli.js (header reading)
    │       ├── parseColumns()     ← used by assay.js, collar.js, litho.js, schema.js
    │       └── getFilesInDir()    ← used by cli.js (file picker)
    │
    ├── src/commands/assay.js      → src/commands/export.js
    ├── src/commands/collar.js     → src/commands/export.js
    ├── src/commands/litho.js      → src/commands/export.js
    ├── src/commands/schema.js     → src/commands/export.js
    └── src/commands/audit.js      (no export, output via @clack/prompts)
```
