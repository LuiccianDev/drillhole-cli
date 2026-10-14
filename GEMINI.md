# drill-cli

A fast, interactive command-line tool for processing drillhole data files (.csv / .txt) and generating statistics, limits, and reports ready for use in Vulcan mining software.

## Project Overview

- **Purpose**: To provide geologists and data technicians with a quick way to generate summaries of assay grades, collar coordinates, lithology codes, data schemas, and QA/QC integrity audits directly from the terminal.
- **Target Software**: Specifically designed to output results formatted for Maptek Vulcan mining software (Isis, GeologyCore, and Block Definition Files `.bdf`).
- **Technologies**:
  - Node.js: v18+ (ES Modules)
  - **TypeScript**: v5+ (Strict Mode)
  - **Performance**: High-efficiency file processing using Node.js Streams (handles large multi-million row files without memory exhaustion).
  - Package Manager: pnpm
  - CLI Framework: @clack/prompts for an interactive user experience.

## Architecture and Structure

- **src/index.ts**: The main entry point that initializes the CLI and parses CLI arguments.
- **src/runner.ts**: Headless orchestrator for non-interactive execution and scripting.
- **src/cli/**: Interaction layer (Clack prompts, banners).
  - index.ts: Orchestrates the interactive user experience (Async/Await).
  - banner.ts: Visual header for the terminal.
- **src/core/**: Business logic and utilities.
  - **parser.ts**: Core logic for reading files using **Readline Streams**, quote-tolerant delimited parser, UTF-8 BOM removal, and mining sentinel checks. Supports CSV and Tab-delimited files.
- **src/commands/**: Implementation of individual CLI operations (all async):
  - audit.ts: Validates data integrity, inverted intervals, overlaps, gaps, duplicate collars, invalid coordinates, and sentinel codes.
  - collar.ts: Calculates spatial boundaries with directional rounding and Vulcan BDF block model parameters (origin, extents, centroid).
  - assay.ts: Performs descriptive statistics (mean, median, stdDev, variance, CV) and percentile-based range analysis with sample counts.
  - litho.ts: Extracts unique lithology codes with occurrence counts and percentages.
  - schema.ts: Infers Vulcan-compatible data types (integer, single, double, text, date).
  - export.ts: Handles outputting results to CSV/TXT for all operations with timestamping.
- **src/utils/**:
  - math.ts: Pure math and descriptive statistics calculations.
- **tests/**: Contains automated tests.
  - run.ts: Custom lightweight test runner with 66 comprehensive assertions.

## Building and Running

### Prerequisites

- Node.js v18 or later.
- pnpm (recommended).

### Installation

```bash
pnpm install
```

### Execution (Development)

To start the interactive CLI using `tsx`:

```bash
pnpm drill
```

### Building (Production)

To compile the TypeScript code to the `dist/` folder:

```bash
pnpm build
```

### Testing

To run the automated test suite:

```bash
pnpm test
```

## Development Conventions

- **TypeScript & ESM**: The project uses TypeScript with ES Modules. All imports MUST include the `.js` file extension in the source code (e.g., `import { ... } from './parser.js'`) as per Node.js ESM requirements.
- **Asynchronous Pattern**: All file I/O and command execution must be asynchronous (`async/await`) to maintain CLI responsiveness.
- **Stream Parsing**: Always use the utilities in `src/core/parser.ts` (`parseFile`, `parseColumns`) which are optimized with Node.js Streams.
- **Command Pattern**: New operations should be added as a separate file in `src/commands/` and integrated into `src/cli/index.ts` and `src/runner.ts`.
- **User Interaction**: Use `@clack/prompts` for all terminal interactions.
- **Formatting**: Maintain strict typing and document complex mining-specific logic.

## Project Restrictions

- Package Management: Strictly use pnpm.
- Testing: Do not introduce third-party testing frameworks. Use the existing custom runner in `tests/run.ts`.
- File Formats: Strictly limited to .csv and .txt.
- CLI Patterns: Always use `@clack/prompts` for interactions.
