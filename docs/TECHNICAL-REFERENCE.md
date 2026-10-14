# Technical Reference

This document provides a comprehensive technical reference for `@luicciandev/drillhole-cli`, describing its architectural layers, internal module contracts, data structures, algorithms, and exported schemas. It follows the **Diátaxis Reference** quadrant: information-oriented, precise, and authoritative.

---

## 1. System Architecture

```
                  ┌───────────────────────────────┐
                  │       CLI Entrypoint          │
                  │   (bin/drill.js / index.ts)   │
                  └──────────────┬────────────────┘
                                 │
                 ┌───────────────┴───────────────┐
                 │                               │
        [No operation flags]            [Operation flags]
                 │                               │
                 ▼                               ▼
      ┌──────────────────────┐        ┌──────────────────────┐
      │   Interactive UI     │        │   Headless Runner    │
      │   (src/cli/index.ts) │        │   (src/runner.ts)    │
      └──────────┬───────────┘        └──────────┬───────────┘
                 │                               │
                 └───────────────┬───────────────┘
                                 │
                                 ▼
             ┌───────────────────────────────────────┐
             │            Commands Layer             │
             │  ┌─────────┬─────────┬──────────────┐ │
             │  │  audit  │ collar  │    assay     │ │
             │  ├─────────┼─────────┼──────────────┤ │
             │  │  litho  │ schema  │    export    │ │
             │  └─────────┴─────────┴──────────────┘ │
             └───────────────────┬───────────────────┘
                                 │
                                 ▼
             ┌───────────────────────────────────────┐
             │          Core & Utility Layer         │
             │   parser.ts  •  math.ts  •  mining.ts │
             └───────────────────────────────────────┘
```

---

## 2. Module Index

| Module                    | Layer      | Responsibility                                                         |
| ------------------------- | ---------- | ---------------------------------------------------------------------- |
| `bin/drill.js`            | Entrypoint | Executable shebang wrapper dispatching to `dist/index.js`              |
| `src/index.ts`            | Router     | Command-line argument parsing, flag extraction, router to UI or runner |
| `src/runner.ts`           | Runner     | Headless orchestrator for script and agent automation                  |
| `src/cli/index.ts`        | UI         | Terminal wizard powered by `@clack/prompts`                            |
| `src/cli/banner.ts`       | UI         | ASCII visual banner generated via `figlet`                             |
| `src/commands/audit.ts`   | Command    | Geological QA/QC database audit and anomaly detection                  |
| `src/commands/collar.ts`  | Command    | Spatial coordinate boundaries & Vulcan Block Model framework           |
| `src/commands/assay.ts`   | Command    | Descriptive grade statistics and percentile-based ranges               |
| `src/commands/litho.ts`   | Command    | Lithological code extraction with frequency and percentage analysis    |
| `src/commands/schema.ts`  | Command    | Maptek Vulcan database field type and date inference                   |
| `src/commands/export.ts`  | Command    | Universal file writer for timestamped CSV and TXT reports              |
| `src/core/parser.ts`      | Core       | Streaming file reader, quote-tolerant CSV parser, BOM stripper         |
| `src/utils/math.ts`       | Utility    | Directional rounding, statistical calculations, percentiles            |
| `src/constants/mining.ts` | Constants  | Domain-specific alias maps, sentinel codes, and skip lists             |
| `src/types/`              | Types      | Centralized TypeScript type definitions and interfaces                 |

---

## 3. Core Engine: `src/core/parser.ts`

The parser handles file discovery and ingestion using Node.js streaming (`readline`) to ensure constant $O(1)$ memory overhead regardless of file size.

### Functions

#### `validateSafePath(filepath: string, baseDir?: string): string`

- **Purpose**: Enforces directory jail constraints and file extension validation.
- **Constraints**:
  - Only allows extensions `.csv` and `.txt` (case-insensitive).
  - Resolves path against `baseDir` (or `process.cwd()`). Throws an error if path traverses outside the base directory.

#### `parseDelimitedLine(line: string, delim: Delimiter): string[]`

- **Purpose**: Splits a line by the delimiter while respecting double-quoted fields containing internal delimiters (e.g., `"Breccia, silicified"`).
- **Algorithm**: State machine tracking `inQuotes` flag. Escaped double quotes (`""`) are unescaped to `"`. Surrounding quotes are stripped from final tokens.

#### `isMiningSentinel(val: string | number | undefined | null): boolean`

- **Purpose**: Determines whether a value represents a mining database sentinel (un-sampled or below detection limit).
- **Recognized Codes**: `'-999'`, `'-99'`, `'-9999'`, `'-9'`, `'-99.0'`, `'-999.0'`, `'-9999.0'`, `'NA'`, `'NULL'`, `'NAN'`, `'.'`.

#### `parseFile<T>(filepath: string, baseDir?: string): Promise<ParseResult<T>>`

- **Returns**: `{ headers: string[], rows: T[], delim: Delimiter }`
- **Features**: Automatically detects delimiter (`,` or `\t`), strips UTF-8 BOM (`\uFEFF`) from headers, and streams lines into typed row objects.

#### `parseColumns<T>(filepath: string, maxRows = 0, targetColumns?, baseDir?): Promise<ColumnResult<T>>`

- **Returns**: `{ headers: string[], columns: Record<string, string[]>, delim: Delimiter }`
- **Optimization**: If `targetColumns` is specified, non-target columns are discarded on-the-fly during stream consumption, reducing heap usage.

---

## 4. Mathematical & Statistical Utilities: `src/utils/math.ts`

### Directional Rounding

Used for block model grid alignment where boundaries must enclose all drillhole data:
$$\text{floorTo}(v, u) = \left\lfloor \frac{v}{u} \right\rfloor \times u$$
$$\text{ceilTo}(v, u) = \left\lceil \frac{v}{u} \right\rceil \times u$$

### Percentile Calculation

```typescript
percentile(sorted: number[], p: number): number
```

Computes value at percentile $p \in [0, 100]$ using linear interpolation between closest ranks:
$$\text{idx} = \frac{p}{100} \times (N - 1), \quad \text{lo} = \lfloor \text{idx} \rfloor, \quad \text{hi} = \lceil \text{idx} \rceil$$
$$V = V_{\text{lo}} + (V_{\text{hi}} - V_{\text{lo}}) \times (\text{idx} - \text{lo})$$

### Descriptive Statistics

- **Mean ($\mu$)**: $\frac{1}{N} \sum_{i=1}^{N} x_i$
- **Median ($P\_{50}$)**: $\text{percentile}(\text{sorted}, 50)$
- **Sample Variance ($\sigma^2$)**: $\frac{1}{N - 1} \sum_{i=1}^{N} (x_i - \mu)^2$ for $N > 1$
- **Standard Deviation ($\sigma$)**: $\sqrt{\sigma^2}$
- **Coefficient of Variation ($CV$)**: $\frac{\sigma}{|\mu|}$

---

## 5. Commands Specification

### 5.1 Geological Audit (`src/commands/audit.ts`)

#### Contract

```typescript
function runAudit(file: string, opts?: AuditOptions): Promise<AuditResult>;
```

#### Verification Rules

1. **File Type Detection**:
   - `interval`: File contains both `FROM` and `TO` columns.
   - `collar`: File contains `EASTING` and `NORTHING` columns.
   - `litho`: Headers contain lithology keywords without interval markers.
   - `generic`: Any other tabular data file.

2. **Findings Catalog**:

| Finding Type        | Severity   | Condition                       | Description                                                                  |
| ------------------- | ---------- | ------------------------------- | ---------------------------------------------------------------------------- |
| `INVERTED_INTERVAL` | `CRITICAL` | $FROM \ge TO$                   | Downhole interval is inverted or has zero length. Blocks Vulcan compositing. |
| `OVERLAP`           | `WARNING`  | $FROM_i < TO_{i-1}$             | Consecutive intervals for the same `HOLE_ID` overlap in depth.               |
| `GAP`               | `INFO`     | $FROM_i > TO_{i-1}$             | Discontinuity/un-sampled run between consecutive intervals.                  |
| `DUPLICATE_HOLE`    | `CRITICAL` | `HOLE_ID` count $> 1$ in collar | Duplicate hole identifier in collar table.                                   |
| `INVALID_COORD`     | `CRITICAL` | $X=0 \land Y=0$ or `NaN`        | Collar coordinate missing or at origin.                                      |
| `INVALID_LENGTH`    | `CRITICAL` | `LENGTH` $\le 0$ or `NaN`       | Total hole depth missing or invalid.                                         |
| `SENTINEL_VALUE`    | `INFO`     | Value matches sentinel list     | Un-sampled code detected in numeric grade column.                            |
| `PHYSICAL_LIMIT`    | `WARNING`  | Grade $> 100\%$ or $< 0$        | Physically impossible percentage grade or unclassified negative value.       |

---

### 5.2 Collar Limits & Block Model Framework (`src/commands/collar.ts`)

#### Contract

```typescript
function runCollar(file: string, opts?: CollarOptions): Promise<CollarResult>;
```

#### Boundary Computation Rules

- **Easting ($X$)**: Rounded to nearest $100\text{m}$. Buffer added directly:
  $$\text{min}_X = \text{floorTo}(\min(X), 100) - \text{buffer}, \quad \text{max}_X = \text{ceilTo}(\max(X), 100) + \text{buffer}$$
- **Northing ($Y$)**: Rounded to nearest $100\text{m}$. Buffer added directly:
  $$\text{min}_Y = \text{floorTo}(\min(Y), 100) - \text{buffer}, \quad \text{max}_Y = \text{ceilTo}(\max(Y), 100) + \text{buffer}$$
- **Elevation ($Z$)**: Rounded to nearest $10\text{m}$. Buffer divided by 10. Accounts for maximum downhole length:
  $$\text{min}_Z = \text{floorTo}(\min(Z) - \max(\text{Length}), 10) - \frac{\text{buffer}}{10}$$
  $$\text{max}_Z = \text{ceilTo}(\max(Z), 10) + \frac{\text{buffer}}{10}$$

#### Vulcan Block Model Framework (`.bdf`)

Calculates the spatial bounding box parameters required by Maptek Vulcan:

- **Origin**: $(\text{min}_X, \text{min}_Y, \text{min}_Z)$
- **Extents**: $\Delta X = \text{max}_X - \text{min}_X, \quad \Delta Y = \text{max}_Y - \text{min}_Y, \quad \Delta Z = \text{max}_Z - \text{min}_Z$
- **Centroid**: $(X_c, Y_c, Z_c) = \left(\text{min}_X + \frac{\Delta X}{2}, \; \text{min}_Y + \frac{\Delta Y}{2}, \; \text{min}_Z + \frac{\Delta Z}{2}\right)$

---

### 5.3 Assay Analysis (`src/commands/assay.ts`)

#### Contract

```typescript
function runAssay(file: string, opts?: AssayOptions): Promise<AssayResult>;
```

#### Processing Pipeline

1. Filters out non-assay skip columns (`HOLE_ID`, `FROM`, `TO`, `SAMPLE_#`).
2. Separates valid numeric grades from sentinel codes (`-999`, `-99`, `NA`).
3. Computes summary statistics ($\mu, P_{50}, \sigma, \sigma^2, CV$).
4. Partitions the sorted valid array into $N$ equal percentile slices.
5. Counts the exact number of samples within each $[From, To]$ bin and computes the percentage of total valid samples.

---

### 5.4 Lithology Analysis (`src/commands/litho.ts`)

#### Contract

```typescript
function runLitho(file: string, opts?: LithoOptions): Promise<LithoResult>;
```

#### Features

- Scans target columns matching `LITHO_KEYWORDS` (`'LITHO'`, `'ROCK'`, `'LITHOLOGY'`, `'GEO'`, `'RX'`).
- Computes frequency count and percentage distribution for each unique code.
- Populates `_details` sorted by occurrence count descending.

---

### 5.5 Schema Inference (`src/commands/schema.ts`)

#### Vulcan Type Mapping Rules

- **`integer`**: Column contains only integers (no decimal points).
- **`single`**: Decimal numbers with max length $\le 10$ characters (standard 4-byte float).
- **`double`**: High-precision decimal numbers with max length $> 10$ characters (8-byte float).
- **`text`**: Contains non-numeric character strings.
- **`isDate`**: Detected if all values match `YYYY-MM-DD` or `DD/MM/YYYY`.

---

## 6. Export Schema Specifications (`src/commands/export.ts`)

Exports are written to `exports/<name>_<timestamp>.<format>`.

### 6.1 `collar_limits` (CSV)

```csv
Parametro,Raw_Min,Raw_Max,Min_Boundary,Max_Boundary
EASTING,474460.02,474961.58,474400,475000
NORTHING,4479648.12,4480124.94,4479600,4480200
ELEVATION,621.1,656,-400,660

Block_Model_Parameter,X,Y,Z
Origin,474400,4479600,-400
Extents_Delta,600,600,1060
Centroid,474700,4479900,130
```

### 6.2 `assay_limits_<COL>` (CSV)

```csv
# Variable: CUT%
# Min: 0, Max: 26.2
# Media: 0.6203, Mediana: 0.51
# Desv_Est: 0.4448, CV: 0.7171
# Muestras_Validas: 26944, Centinelas: 0
Clase,From,To,Percentil_From,Percentil_To,Muestras,Porcentaje
1,0,0.33,0,16.6667,4579,16.99%
...
```

### 6.3 `litho_values` (CSV)

```csv
Columna,Codigo,Frecuencia_Tramos,Porcentaje_Total
RX_CODE,4,10377,38.51%
RX_CODE,5,8450,31.36%
...
```

### 6.4 `audit_report` (CSV)

```csv
Severidad,Tipo,Fila,Pozo,Columna,Valor,Mensaje
"CRITICAL","INVERTED_INTERVAL","3","DH01","FROM / TO","15 -> 10","Intervalo invertido o nulo: FROM (15) >= TO (10)"
"WARNING","OVERLAP","5","DH02","FROM / TO","FROM 8 < TO 10","Solapamiento de intervalos..."
```

---

## 7. Verification & Automated Test Suite

Automated verification is executed using the custom test runner:

```bash
npx tsx tests/run.ts
```

The suite validates 66 distinct assertions:

- **Collar**: Rounding boundaries, buffer math, elevation depth integration, block model origin and centroids.
- **Assay**: Percentile breaks, mean, median, standard deviation, variance, coefficient of variation, class sample counting.
- **Litho**: Unique code arrays, frequency counts, percentages.
- **Parser**: Quoted delimiter handling, UTF-8 BOM removal, sentinel identification.
- **Audit**: Detection of inverted intervals, overlaps, gaps, duplicate collars, invalid coordinates, invalid depths, sentinel flags, and grade threshold violations.
- **Schema**: Correct type inference for text, integer, single, double, and date fields.
- **Exports**: Proper generation and structure of audit and schema CSV reports.
