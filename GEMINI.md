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

*   bin/drill.js: The entry point that initializes the CLI.
*   src/cli/: Interaction layer (Clack prompts, banners).
    *   index.js: Orchestrates the interactive user experience.
    *   banner.js: Visual header for the terminal.
*   src/core/: Business logic and utilities.
    *   parser.js: Core logic for reading files, detecting delimiters, and parsing columns.
*   src/commands/: Implementation of individual CLI operations:
    *   audit.js: Validates data integrity.
    *   collar.js: Calculates spatial boundaries.
    *   assay.js: Performs percentile-based range analysis.
    *   litho.js: Extracts unique lithology codes.
    *   schema.js: Infers Vulcan-compatible data types.
    *   export.js: Handles outputting results.
*   tests/: Contains automated tests.
    *   run.js: Custom test runner for validation.

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
*   Command Pattern: New operations should be added as a separate file in src/commands/ and integrated into src/cli/index.js.
*   File Parsing: Always use the utilities in src/core/parser.js (parseFile, parseColumns) to ensure consistent delimiter handling and error reporting.
*   User Interaction: Use @clack/prompts for all terminal interactions to maintain a consistent look and feel.
*   Testing: Every core logic change should be reflected in tests/run.js. The project prefers a simple assertion-based testing style without heavy external frameworks.
*   Formatting: Maintain the current clean, functional style. Use clear variable names and document complex mining-specific logic (like the directional rounding in collar.js).

## Project Restrictions

*   Package Management: Strictly use pnpm. Do not use npm or yarn for installing dependencies or running scripts.
*   Testing: Do not introduce third-party testing frameworks (e.g., Jest, Vitest). Use the existing custom runner in tests/run.js.
*   File Formats: The tool is strictly limited to processing .csv and .txt files. Do not add support for other formats unless explicitly requested.
*   CLI Patterns: Always use @clack/prompts for interactions. Avoid using standard 'readline' or other low-level CLI input methods.
