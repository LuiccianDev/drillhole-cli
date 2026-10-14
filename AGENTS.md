# AGENTS.md - Context & Guidelines for AI Assistants

This document provides high-level architectural context, domain knowledge, and operational guidelines for AI agents working with or developing the `drill-cli` codebase.

---

## Project Identity & Purpose
`drill-cli` (`@luicciandev/drillhole-cli`) is a high-performance command-line tool built for exploration geologists, resource geologists, and mining data technicians. It processes drillhole data (`.csv`, `.txt`) using Node.js streaming I/O to perform data quality validation (QA/QC), spatial boundary calculations, descriptive grade statistics, and Vulcan-compatible database exports.

**Primary Target**: Maptek Vulcan 3D mining software (including Isis, GeologyCore, and Block Definition Files `.bdf`).

---

## Tech Stack
- **Runtime**: Node.js (v18+)
- **Language**: TypeScript v5+ (Strict Mode)
- **Module System**: ES Modules (`"type": "module"`)
- **Package Manager**: `pnpm` (strictly enforced)
- **CLI Framework**: `@clack/prompts` (interactive mode) & `figlet` (banner)
- **Data Engine**: Native Node.js `readline` streams with selective column loading and quote-tolerant parsing.
- **Test Runner**: Custom lightweight runner (`tests/run.ts`) with zero third-party testing dependencies.

---

## Core Architecture & Layout

```text
drillhole-cli/
├── src/
│   ├── index.ts              # Router & CLI entry point (parses argv, selects interactive or runner)
│   ├── runner.ts             # Non-interactive orchestrator for headless / agent execution
│   ├── cli/
│   │   ├── index.ts          # Interactive terminal wizard (@clack/prompts)
│   │   └── banner.ts         # ASCII banner renderer (figlet)
│   ├── commands/
│   │   ├── audit.ts          # Geological QA/QC validation engine (intervals, overlaps, gaps, collars)
│   │   ├── collar.ts         # Directional rounding limits & Vulcan BDF Block Model framework
│   │   ├── assay.ts          # Descriptive grade statistics (μ, P50, σ, CV) & percentile classes
│   │   ├── litho.ts          # Lithological code extraction with frequencies and percentages
│   │   ├── schema.ts         # Vulcan database data type inference (int, single, double, text, date)
│   │   └── export.ts         # Universal file exporter (CSV/TXT with timestamping)
│   ├── core/
│   │   └── parser.ts         # Stream parser, CSV quote parser (parseDelimitedLine), BOM stripping, sentinels
│   ├── utils/
│   │   └── math.ts           # Directional rounding, percentiles, min/max, mean, median, stdDev, CV
│   ├── constants/
│   │   └── mining.ts         # Column aliases, sentinel codes (-999, -99), skip lists
│   └── types/
│       ├── commands.ts       # Interfaces for options, results, findings, and block model bounds
│       ├── parser.ts         # Parser return types and delimiters
│       └── index.ts          # Re-exports
├── tests/
│   └── run.ts                # Test runner with 66 automated unit and integration tests
├── data_tests/               # Sample drillhole datasets (header.txt, assays.txt, litho.txt)
├── docs/                     # Documentation (TECHNICAL-REFERENCE.md, images)
├── README.md                 # User-facing manual
└── AGENTS.md                 # This file
```

---

## Domain Knowledge & Mining Rules

1. **Vulcan Formatting Sensitivity**:
   - Decimals must strictly use periods (`.`), never commas (`,`).
   - Coordinate boundaries must adhere to directional rounding to align with block model parent cell grids.

2. **Spatial Math & Block Model Framework (`collar.ts`)**:
   - **Directional Rounding**: Minimum coordinates are floored (`Math.floor(x / unit) * unit`) and maximum coordinates are ceiled (`Math.ceil(x / unit) * unit`).
   - Easting & Northing round to hundreds ($100\text{m}$). Elevation rounds to tens ($10\text{m}$).
   - **Elevation Lower Bound**: Must account for maximum downhole length ($Z_{min} = \text{floor}(\text{Elev}_{min} - \text{Length}_{max}, 10)$).
   - **Vulcan `.bdf` Specification**: Calculates **Origin** $(X_{min}, Y_{min}, Z_{min})$, **Extents** $(\Delta X, \Delta Y, \Delta Z)$, and **Centroid** $(X_c, Y_c, Z_c)$.

3. **Geological QA/QC & Validation Engine (`audit.ts`)**:
   - **Severity Levels**:
     - `CRITICAL`: Prevents ingestion in Vulcan (`INVERTED_INTERVAL` where $FROM \ge TO$, `DUPLICATE_HOLE` in collar, `INVALID_COORD` at origin $0,0$).
     - `WARNING`: Geological irregularities requiring review (`OVERLAP` where $FROM_i < TO_{i-1}$, `PHYSICAL_LIMIT` where grade $> 100\%$).
     - `INFO`: Normalization/logging notes (`GAP` where $FROM_i > TO_{i-1}$, `SENTINEL_VALUE` detected).

4. **Sentinel Handling in Assays (`assay.ts`)**:
   - Mining databases frequently encode un-sampled, missing, or below-detection-limit intervals with `-999`, `-99`, `-9999`, or `NA`.
   - The CLI filters these out from statistical calculations ($\mu, P_{50}, \sigma, CV$) to prevent skewing the true minimum and grade distribution.

5. **File Delimiters & Quotes**:
   - Auto-detects comma (`,`) or tab (`\t`).
   - Supports quoted fields containing internal delimiters (e.g., `"Breccia, silicified"`).
   - Strips UTF-8 BOM (`\uFEFF`) from headers automatically.

---

## Non-Interactive Mode (Mandatory for AI Agents)

AI agents invoking the CLI programmatically **must always use non-interactive mode**:

### Rules for Automated Invocations:
1. **Pass the file path directly** (positional argument) or use `--dir` + `--file`. The CLI automatically extracts the directory and filename.
2. **Always pass `-q` or `--no-banner`** to suppress ASCII animations.
3. Pass exactly one operation (as a subcommand or flag) per invocation.
4. Use `-f csv` or `-f txt` when you need persisted output files in `./exports/`.

### Modern Dynamic Command Examples (Preferred):

```bash
# 1. Audit drillhole file for errors (QA/QC report)
pnpm drill audit /path/to/data/assays.txt -q

# 2. Audit and export findings directly to CSV
pnpm drill audit /path/to/data/assays.txt -f csv -q

# 3. Collar spatial limits with 50m buffer and CSV export
pnpm drill collar /path/to/data/collar.csv -b 50 -f csv -q

# 4. Assay statistics for specific elements with 8 percentile classes
pnpm drill assay /path/to/data/assays.txt --cols "CUT%,FE" -c 8 -f csv -q

# 5. Lithology legend with frequency counts and percentages
pnpm drill litho /path/to/data/litho.txt --cols RX_CODE -f csv -q

# 6. Infer Vulcan schema types
pnpm drill schema /path/to/data/header.txt -f txt -q

# 7. Help & version
pnpm drill --version
pnpm drill --help
```

> [!NOTE]
> **Legacy Syntax Compatibility**:
> Invocations using `pnpm drill --dir /path/to/data --file assays.txt --no-banner --audit` are also 100% supported.

---

## Negative Constraints (What NOT to do)

- **Do NOT use npm or yarn**: `pnpm` is the strictly mandatory package manager.
- **Do NOT add third-party testing frameworks**: Do not install Jest, Vitest, Mocha, etc. Extend `tests/run.ts`.
- **Do NOT process unsupported formats**: Stick strictly to `.csv` and `.txt`.
- **Do NOT use `require()` or `var`**: Write modern ES Modules with strict TypeScript.
- **Do NOT omit `.js` extensions in imports**: TypeScript ESM compilation requires relative imports to specify `.js` (e.g., `import { ... } from './parser.js'`).
- **Do NOT introduce memory leaks on large files**: Always use streams (`readline`) and selective column loading (`parseColumns`).

---

## Verification & Testing
Before committing any changes:
1. Run `npx tsx tests/run.ts` (all 66+ tests must pass).
2. Run `npx tsc --noEmit` to verify strict TypeScript type checking.
