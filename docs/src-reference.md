# Technical Reference: drill-cli internals

This document provides a technical description of the `drill-cli` machinery, organized by its modular architecture. It is intended for developers maintaining or extending the tool.

## Architecture Overview

The project uses a three-tier architecture:
1.  **CLI Layer (`src/cli/`)**: Orchestrates user interaction and terminal visuals.
2.  **Command Layer (`src/commands/`)**: Implements domain-specific mining logic (Collar, Assay, etc.).
3.  **Core Layer (`src/core/`)**: Low-level utilities for file parsing and data extraction.

---

## Core Layer (`src/core/`)

### `parser.js`

The engine for data extraction from `.csv` and `.txt` files.

#### `parseFile(filepath)`
Reads a file and returns an array of row objects.
- **Input**: `string` (absolute or relative path).
- **Output**: `{ headers: string[], rows: object[], delim: string }`.
- **Behavior**: Detects `\t` or `,` automatically based on the first line.

#### `parseColumns(filepath, maxRows?)`
Parses data into a column-oriented structure (preferred for statistical calculations).
- **Input**: `filepath` (string), `maxRows` (number, optional).
- **Output**: `{ headers: string[], columns: object, delim: string }`.
- **Structure**: `columns` is an object where keys are headers and values are arrays of strings.

#### `getFilesInDir(dir?)`
Scans a directory for supported mining data files.
- **Input**: `dir` (string, defaults to `process.cwd()`).
- **Output**: `string[]` (sorted list of `.txt` and `.csv` files).

---

## Command Layer (`src/commands/`)

### `collar.js`

Calculates spatial boundaries for drillhole collars.

#### `runCollar(file, opts)`
Main processing logic for collar limits.
- **Intelligent Mapping**: Searches for coordinates using the following priorities:
    - **East**: `EASTING`, `EAST`, `X`, `XCOLLAR`.
    - **North**: `NORTHING`, `NORTH`, `Y`, `YCOLLAR`.
    - **Elev**: `ELEVATION`, `ELEV`, `Z`, `ZCOLLAR`.
- **Options**:
    - `buffer`: Numerical value to expand limits.
    - `externalMaxLen`: Overrides internal `LENGTH` column if provided.
- **Output**: A result object containing calculated `min_boundary` and `max_boundary` for E, N, and Z.

### `assay.js`

Performs statistical range analysis.

#### `runAssay(file, opts)`
Calculates percentiles and grade ranges.
- **Default Classes**: 6 (configurable via `opts.classes`).
- **Logic**: Uses a linear interpolation algorithm for percentiles to ensure accuracy in small datasets.

---

## CLI Layer (`src/cli/`)

### `index.js`

The interaction orchestrator.
- **`runCli()`**: Asynchronous function that executes the main loop, handles `@clack/prompts` lifecycle, and delegates execution to the Command Layer.

### `banner.js`

- **`printBanner()`**: Handles the animated fade-in of the ASCII art. Includes fallback for non-TTY environments.

---

## Data Structures

### Result Object (Collar)
```json
{
  "EASTING": { "raw_min": 0, "raw_max": 100, "min_boundary": -100, "max_boundary": 200 },
  "NORTHING": { ... },
  "ELEVATION": { "max_length": 50, "len_source": "external source", ... },
  "_headers": { "E": "XCOLLAR", "N": "YCOLLAR", "Z": "ZCOLLAR", "L": null }
}
```

### Result Object (Assay)
```json
{
  "AU": {
    "raw_min": 0.01,
    "raw_max": 15.5,
    "ranges": [
      { "clase": 1, "from": 0.01, "to": 0.5, "percentil_from": 0, "percentil_to": 16.6 }
    ]
  }
}
```
