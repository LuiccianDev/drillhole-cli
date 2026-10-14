# Project Overview

## What is drillhole-cli?

`@luicciandev/drillhole-cli` (invoked as `drill`) is a specialized command-line tool for geologists and data technicians working with drillhole data. It processes `.csv` and `.txt` files containing mineral exploration drilling data and generates reports formatted for **Vulcan** — a 3D mining modeling and scheduling software by Maptek.

The tool automates five common mining-data tasks: data quality auditing, spatial boundary calculation, grade distribution analysis, lithology code extraction, and data type inference.

---

## Use Cases

| Who                 | When                                          | Why                                                               |
| ------------------- | --------------------------------------------- | ----------------------------------------------------------------- |
| Field geologist     | After receiving assay results from the lab    | Quickly audit data quality before importing to Vulcan             |
| Data technician     | Preparing block model limits                  | Calculate rounded collar boundaries with buffer for mine planning |
| Exploration manager | Reviewing grade distribution across a deposit | Generate percentile-based assay ranges for resource estimation    |
| Modeler             | Building a lithological model                 | Extract unique rock codes for legend definition                   |
| AI agent            | Automating data processing                    | Invoke `drill` non-interactively as part of a pipeline            |

---

## Tech Stack

| Component       | Choice                              | Reason                                                        |
| --------------- | ----------------------------------- | ------------------------------------------------------------- |
| Runtime         | Node.js 18+                         | Ubiquitous, fast startup, excellent stream support            |
| Language        | TypeScript (strict mode)            | Type safety for mining calculations (no NaN surprises)        |
| Package manager | pnpm                                | Fast, disk-efficient, strict dependency resolution            |
| CLI framework   | `@clack/prompts`                    | Interactive prompts with cancel support and spinner animation |
| Banner          | `figlet`                            | ASCII art for the interactive welcome screen                  |
| Module format   | ES Modules (`"type": "module"`)     | Modern JavaScript standard, tree-shakeable                    |
| Runner          | `tsx`                               | Execute TypeScript directly without a build step              |
| Parser          | Custom (Node.js Streams + Readline) | Memory-efficient for large drillhole datasets                 |

---

## Capabilities

### Audit (`audit` or `--audit`)

Performs rigorous geological database QA/QC:

- Detects inverted downhole intervals ($FROM \ge TO$, `CRITICAL`)
- Detects overlapping intervals ($FROM_i < TO_{i-1}$, `WARNING`)
- Detects un-sampled gaps ($FROM_i > TO_{i-1}$, `INFO`)
- Detects duplicate hole IDs in collar files and origin `(0,0)` coordinates (`CRITICAL`)
- Identifies mining sentinel codes (`-999`, `-99`, `NA`) and grades $> 100\%$ (`WARNING`)
- Reports total rows, columns, nulls, and numeric columns

### Collar Limits & Vulcan Block Model (`collar` or `--collar`)

Calculates spatial boundaries with directional rounding and Vulcan BDF parameters:

- **Easting/Northing**: rounded to nearest 100m for block model alignment
- **Elevation**: rounded to nearest 10m, accounting for maximum drillhole length (`LENGTH`)
- **Buffer**: user-defined margin applied outward (`-b 50`)
- **Vulcan `.bdf` Framework**: Origin $(X, Y, Z)$, Extents $(\Delta X, \Delta Y, \Delta Z)$, and Centroid $(X_c, Y_c, Z_c)$

### Assay Descriptive Statistics (`assay` or `--assay`)

Performs comprehensive grade analysis with sentinel exclusion:

- Excludes `-999`, `-99`, and `NA` to avoid statistical distortion
- Calculates Mean ($\mu$), Median ($P_{50}$), Standard Deviation ($\sigma$), Variance ($\sigma^2$), and $CV$
- Divides grade distributions into $N$ percentile classes with sample counts and percentages
- Essential for defining cutoff grades and grade shells in resource estimation

### Lithology Distribution (`litho` or `--litho`)

Extracts unique rock and alteration codes:

- Calculates frequency count (number of intervals) and dataset percentage for each code
- Formatted directly for Vulcan `.dgd` legend definition tables

### Schema Inference (`schema` or `--schema`)

Infers Maptek Vulcan Isis database data types:

- `integer` — whole numbers (4-byte int)
- `single` — short decimals (4-byte float)
- `double` — high-precision coordinates (8-byte double float)
- `text` — alphanumeric string values
- `date` — detected if formatted as `YYYY-MM-DD` or `DD/MM/YYYY`

---

## Execution Modes

### Interactive (Human-driven)

```bash
drill
```

Shows an animated ASCII banner, then guides through operation selection, file selection, and option configuration via `@clack/prompts` menus.

### Non-interactive (Modern Dynamic CLI / AI automation)

```bash
# Direct positional syntax (no --dir or --file needed):
drill collar ./data/collar.csv -b 50 -f csv -q
drill audit ./data/assays.txt -f csv -q
drill assay ./data/assays.txt -c 8 -q
```

---

## Security Model

- **Base directory isolation**: All file access is restricted to the `--dir` parameter
- **Extension whitelist**: Only `.csv` and `.txt` files
- **One operation per invocation**: Prevents argument confusion
- **Stream-based parsing**: Memory-safe for large files
- **No system commands**: Pure file I/O, no shell execution

See `SECURITY.md` for details.

---

## Project Structure

```
drillhole-cli/
├── bin/                      # Entrypoint for published CLI
│   └── drill.js              # Bin wrapper (shebang + import dist/)
├── src/
│   ├── index.ts              # Router: interactive vs non-interactive
│   ├── runner.ts             # Non-interactive orchestrator
│   ├── cli/
│   │   ├── index.ts          # Interactive menus (@clack/prompts)
│   │   └── banner.ts         # ASCII banner animation (figlet)
│   ├── commands/
│   │   ├── collar.ts         # Spatial boundary limits
│   │   ├── assay.ts          # Percentile grade analysis
│   │   ├── litho.ts          # Unique lithology codes
│   │   ├── audit.ts          # Data quality audit
│   │   ├── schema.ts         # Vulcan type inference
│   │   └── export.ts         # File writer (CSV/TXT)
│   ├── core/
│   │   └── parser.ts         # Secure file I/O engine
│   ├── utils/
│   │   └── math.ts           # Directional rounding, percentile
│   ├── constants/
│   │   └── mining.ts         # Column mappings, skip lists
│   └── types/
│       ├── index.ts          # Re-exports
│       ├── parser.ts         # ParseResult, ColumnResult, Delimiter
│       └── commands.ts       # All command option/result types
├── dist/                     # Compiled JavaScript (from tsc)
├── tests/
│   └── run.ts                # Custom test runner (32 tests)
├── data_tests/               # Sample drillhole files
├── docs/
│   ├── ARCHITECTURE.md       # Layer architecture & data flow
│   ├── PROJECT.md            # This file
│   ├── SECURITY.md           # Security model & defenses
│   └── TECHNICAL-REFERENCE.md # Technical reference
├── .agents/
│   └── skills/               # AI agent skills
├── AGENTS.md                 # AI agent context
├── package.json
├── tsconfig.json
└── pnpm-lock.yaml
```

---

## Development

```bash
pnpm install    # Install dependencies
pnpm drill      # Run interactively (dev mode with tsx)
pnpm build      # Compile TypeScript to dist/
pnpm test       # Run test suite (32 tests)
```

### Adding a new command

1. Create `src/commands/new-op.ts` with `runX()`, `printX()`, and default export
2. Add options type in `src/types/commands.ts`
3. Register in `src/cli/index.ts` (interactive menu)
4. Register in `src/runner.ts` (non-interactive switch)
5. Add flag to `src/index.ts` (`OPERATIONS` + `OP_MAP`)
6. Add test cases in `tests/run.ts`
7. Run `pnpm test` to verify
