# Architecture Reference

## 1. System Overview

`drill-cli` is a Node.js command-line tool for processing drillhole data. It supports two execution modes:

| Mode | Trigger | Use case |
|---|---|---|
| **Interactive** | No operation flag | Humans exploring data via `@clack/prompts` menus |
| **Non-interactive** | `--collar`, `--assay`, etc. | AI agents, automation, scripting |

Both modes share the same command implementations (`src/commands/*.ts`) and the same data parsing engine (`src/core/parser.ts`). The only difference is the entry path that configures and invokes them.

---

## 2. Layer Architecture

```
┌─────────────────────────────────────────────────────┐
│                   src/index.ts                       │
│                   (Router)                           │
│                                                      │
│   ┌─ ¿Operation flag? ──SÍ──→ src/runner.ts         │
│   │                          (Non-interactive)       │
│   │                                                 │
│   └─ ¿Operation flag? ──NO──→ src/cli/index.ts      │
│                                (Interactive)         │
└─────────────────────────────────────────────────────┘
                            │
                            ▼
              ┌─────────────────────────────┐
              │      src/commands/*.ts       │
              │  (collar, assay, litho,      │
              │   audit, schema)             │
              └──────────┬──────────────────┘
                         │
                         ▼
              ┌─────────────────────────────┐
              │      src/core/parser.ts     │
              │   (parseFile, parseColumns)  │
              └──────────┬──────────────────┘
                         │
                         ▼
              ┌─────────────────────────────┐
              │     File System (.csv/.txt)  │
              └─────────────────────────────┘
```

### Layer responsibilities

| Layer | Module | Responsibility |
|---|---|---|
| **Router** | `src/index.ts` | Parse argv, detect mode, dispatch |
| **CLI (Interactive)** | `src/cli/index.ts` | `@clack/prompts` menus, banner |
| **Runner (Non-interactive)** | `src/runner.ts` | Parse flags, call commands directly |
| **Commands** | `src/commands/*.ts` | Mining-specific logic (runX + printX) |
| **Core Parser** | `src/core/parser.ts` | Secure file I/O, delimiter detection |
| **Utils** | `src/utils/math.ts` | Pure math functions (floorTo, ceilTo, percentile) |
| **Constants** | `src/constants/mining.ts` | Domain rules (column maps, skip lists) |
| **Types** | `src/types/` | Centralized TypeScript interfaces |

---

## 3. Data Flow

### 3.1 Interactive mode

```
User runs: pnpm drill --dir ./data

src/index.ts
  ├── No operation flag detected → interactive mode
  └── runCli("./data", { noBanner: false })
      ├── printBanner()  ← animated banner
      ├── getFilesInDir("./data")  ← list .csv/.txt
      ├── @clack/prompts: select operation, file, options
      ├── construct filePath = path.join(baseDir, file)
      ├── cmd(filePath, { output, buffer, ..., baseDir })
      │   └── parseColumns(filePath, ..., baseDir)
      │       └── validateSafePath(filePath, baseDir)
      ├── print result to stdout
      └── exportData if output format requested
```

### 3.2 Non-interactive mode

```
User runs: pnpm drill --dir ./data --collar --file collar.csv --buffer 50

src/index.ts
  ├── "--collar" detected → non-interactive mode
  ├── parse --file, --buffer, --format from argv
  ├── build RunnerOptions { dir, operation, file, ... }
  └── runNonInteractive(opts)
      ├── validate dir exists
      ├── construct filePath = path.join(dir, file)
      ├── switch(operation):
      │   case 'collar': runCollar(filePath, { baseDir, buffer })
      │   ...
      ├── print result
      └── exportData if format is set
```

### 3.3 baseDir propagation

The `baseDir` parameter flows from the top-level router through every layer to `validateSafePath`:

```
src/index.ts
  └── runCli(baseDir, ...) / runNonInteractive({ dir, ... })
       └── cmd(filePath, { ..., baseDir })
            └── parseColumns(filePath, ..., baseDir)
                 └── validateSafePath(filePath, baseDir)
                      └── resolved.startsWith(path.resolve(baseDir)) ✓
```

This ensures path validation always checks against the user-provided `--dir`, not `process.cwd()`.

---

## 4. Module Reference

### `src/index.ts` — Router

Responsible for:
- Parsing `process.argv` to detect operation flags (`--collar`, `--assay`, etc.)
- Dispatching to interactive (`runCli`) or non-interactive (`runNonInteractive`) mode
- Handling `--help`, `--version`, `--no-banner`/`-q`

Key logic:
```typescript
const OPERATIONS = ['--audit', '--collar', '--assay', '--litho', '--schema'];
const activeOpFlag = OPERATIONS.find(op => args.includes(op));

if (!activeOpFlag) {
  await runCli(dir, { noBanner });         // interactive
} else {
  await runNonInteractive(runnerOpts);      // non-interactive
}
```

### `src/runner.ts` — Non-interactive orchestrator

Responsible for:
- Validating that `--dir` and `--file` exist
- Building typed options from raw flag values
- Calling the correct `runX()` function based on operation
- Exporting results if `--format` is specified

Does **not** use `@clack/prompts`. Pure deterministic execution.

### `src/cli/index.ts` — Interactive orchestrator

Responsible for:
- Displaying animated banner (unless `noBanner: true`)
- Using `@clack/prompts` for step-by-step user interaction
- Constructing options from user selections
- Calling the same `runX()` functions as the runner

### `src/core/parser.ts` — Data ingestion engine

Key functions:

| Function | Description |
|---|---|
| `validateSafePath(filepath, baseDir?)` | Resolves and validates file access |
| `parseFile(filepath, baseDir?)` | Returns array of row objects |
| `parseColumns(filepath, maxRows?, targetColumns?, baseDir?)` | Returns column-oriented arrays |
| `getFilesInDir(dir?)` | Lists `.csv`/`.txt` files in a directory |

All file operations use Node.js Streams + Readline for memory efficiency. `parseColumns` supports optional `targetColumns` to discard unneeded data at read time.

### `src/commands/*.ts` — Mining operations

Each command exports:
- `runX(file, opts)` — pure logic, returns typed result
- `printX(result)` — formats result to stdout
- Default export — CLI bridge (calls run, print, and optionally export)

| Module | `runX()` | Input | Output |
|---|---|---|---|
| `collar.ts` | `runCollar` | Coordinate columns (X/Y/Z/LENGTH) | Spatial boundary limits with directional rounding |
| `assay.ts` | `runAssay` | Numeric columns | Percentile-based grade ranges |
| `litho.ts` | `runLitho` | Lithology/rock code columns | Unique sorted values |
| `audit.ts` | `runAudit` | Entire file | Row/column/null/numeric stats |
| `schema.ts` | `runSchema` | Entire file (sample 500 rows) | Vulcan data type inference |
