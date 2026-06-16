# drill-cli

A fast, interactive command-line tool for processing drillhole data files (.csv / .txt) and generating statistics, limits, and reports ready for use in Vulcan mining software.

## Project Overview

*   Purpose: To provide geologists and data technicians with a quick way to generate summaries of assay grades, collar coordinates, lithology codes, and data schemas directly from the terminal.
*   Target Software: Specifically designed to output results formatted for Vulcan mining software.
*   Technologies:
    *   Node.js: v18+ (ES Modules)
    *   Package Manager: pnpm
    *   CLI Framework: @clack/prompts for an interactive user experience.

## Architecture and Structure

*   bin/cli.js: The interactive entry point. It handles user input via prompts and delegates tasks to command modules.
*   src/parser.js: Core logic for reading files, detecting delimiters (comma/tab), and parsing columns.
*   src/commands/: Contains the implementation of individual CLI operations:
    *   audit.js: Validates data integrity (nulls, decimals).
    *   collar.js: Calculates spatial boundaries (min/max) with rounding and buffers.
    *   assay.js: Performs percentile-based range analysis on mineral columns.
    *   litho.js: Extracts unique lithology codes and frequency counts.
    *   schema.js: Infers Vulcan-compatible data types.
    *   export.js: Handles outputting results to .txt or .csv.
*   tests/: Contains automated tests.
    *   run.js: A custom test runner that validates the logic of the command modules.

## Building and Running

### Prerequisites
*   Node.js v18 or later.
*   pnpm (recommended).

### Installation
```bash
pnpm install
```

### Execution
To start the interactive CLI:
```bash
pnpm drill
```

### Testing
To run the automated test suite:
```bash
pnpm test
```
Or directly:
```bash
node tests/run.js
```

## Development Conventions

*   ES Modules: The project uses native ES Modules. All imports must include the file extension (e.g., import ... from './parser.js').
*   Command Pattern: New operations should be added as a separate file in src/commands/ and integrated into bin/cli.js.
*   File Parsing: Always use the utilities in src/parser.js (parseFile, parseColumns) to ensure consistent delimiter handling and error reporting.
*   User Interaction: Use @clack/prompts for all terminal interactions to maintain a consistent look and feel.
*   Testing: Every core logic change should be reflected in tests/run.js. The project prefers a simple assertion-based testing style without heavy external frameworks.
*   Formatting: Maintain the current clean, functional style. Use clear variable names and document complex mining-specific logic (like the directional rounding in collar.js).
