# Project Overview

## What is drill-cli?

`drill-cli` is a specialized command-line tool for geologists and data technicians working with drillhole data. It processes `.csv` and `.txt` files containing mineral exploration drilling data and generates reports formatted for **Vulcan** — a 3D mining modeling and scheduling software by Maptek.

The tool automates five common mining-data tasks: data quality auditing, spatial boundary calculation, grade distribution analysis, lithology code extraction, and data type inference.

---

## Use Cases

| Who | When | Why |
|---|---|---|
| Field geologist | After receiving assay results from the lab | Quickly audit data quality before importing to Vulcan |
| Data technician | Preparing block model limits | Calculate rounded collar boundaries with buffer for mine planning |
| Exploration manager | Reviewing grade distribution across a deposit | Generate percentile-based assay ranges for resource estimation |
| Modeler | Building a lithological model | Extract unique rock codes for legend definition |
| AI agent | Automating data processing | Invoke drill-cli non-interactively as part of a pipeline |

---

## Tech Stack

| Component | Choice | Reason |
|---|---|---|
| Runtime | Node.js 18+ | Ubiquitous, fast startup, excellent stream support |
| Language | TypeScript (strict mode) | Type safety for mining calculations (no NaN surprises) |
| Package manager | pnpm | Fast, disk-efficient, strict dependency resolution |
| CLI framework | `@clack/prompts` | Interactive prompts with cancel support and spinner animation |
| Banner | `figlet` | ASCII art for the interactive welcome screen |
| Module format | ES Modules (`"type": "module"`) | Modern JavaScript standard, tree-shakeable |
| Runner | `tsx` | Execute TypeScript directly without a build step |
| Parser | Custom (Node.js Streams + Readline) | Memory-efficient for large drillhole datasets |

---

## Capabilities

### Audit (`--audit`)
Validates data integrity:
- Total rows, columns, and null values
- Detects numeric vs text columns
- Useful as a first step before any other operation

### Collar Limits (`--collar`)
Calculates spatial boundaries with Vulcan-specific rounding:
- **Easting/Northing**: rounded to nearest 100 (block model alignment)
- **Elevation**: rounded to nearest 10, accounting for maximum drillhole length
- **Buffer**: user-defined margin applied outward from rounded boundaries
- Uses directional rounding: `floor` for minimum, `ceil` for maximum

### Assay Ranges (`--assay`)
Percentile-based grade analysis:
- Divides numeric assay values into N equal-width percentile classes
- Reports min, max, and percentile boundaries per class
- Useful for defining grade shells in resource estimation

### Litho Values (`--litho`)
Extracts unique geological codes:
- Sorted, deduplicated list from lithology or rock-code columns
- Output formatted for Vulcan legend definition

### Schema Inference (`--schema`)
Detects Vulcan-compatible data types:
- `integer` — whole numbers
- `single` — short decimals (up to 10 characters)
- `double` — long decimals (over 10 characters)
- `text` — string values
- Samples up to 500 rows for type inference

---

## Execution Modes

### Interactive (human)

```bash
pnpm drill --dir ./data
```

Shows an animated ASCII banner, then guides through operation selection, file selection, and option configuration via `@clack/prompts` menus.

### Non-interactive (AI / automation)

```bash
pnpm drill --dir ./data --no-banner --collar --file collar.csv --buffer 50 --format csv
```

Pass all options via command-line flags. Deterministic, no prompts, no animation. Designed for AI agents and CI pipelines.

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
├── tests/
│   └── run.ts                # Custom test runner (32 tests)
├── data_tests/               # Sample drillhole files
├── docs/
│   ├── ARCHITECTURE.md       # Layer architecture & data flow
│   ├── SECURITY.md           # Security model & defenses
│   ├── PROJECT.md            # This file
│   └── src-reference.md      # Original technical reference
├── .agents/
│   └── skills/               # AI agent skills
├── AGENTS.md                 # AI agent context
├── package.json
└── tsconfig.json
```

---

## Development

```bash
pnpm install    # Install dependencies
pnpm drill      # Run interactively
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
