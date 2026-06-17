# AGENTS.md - Context for AI Assistants

This file provides high-level context and technical guidelines for AI agents working on the drill-cli project.

## Project Identity
drill-cli is a specialized Node.js command-line tool designed for geologists and data technicians. It processes drillhole data (.csv, .txt) to generate reports, statistics, and spatial limits specifically formatted for Vulcan (a 3D mining modeling software).

## Tech Stack
- Runtime: Node.js (v18+)
- Format: ES Modules ("type": "module")
- Package Manager: pnpm
- CLI Framework: @clack/prompts (interactive)
- Data Handling: Custom parser for CSV/Tab-delimited files.

## Core Architecture
- bin/cli.js: Entry point. Orchestrates the interactive flow.
- src/parser.js: Centralized logic for file discovery and data parsing.
- src/commands/: Discrete modules for specific operations:
    - audit.js: Data quality validation.
    - collar.js: Spatial coordinate math (Rounding & Buffers).
    - assay.js: Percentile-based grade analysis.
    - litho.js: Unique code extraction.
    - schema.js: Vulcan type mapping.
    - export.js: File writer (TXT/CSV).
- tests/run.js: Lightweight, custom test runner.

## Domain Knowledge for Agents
1. Vulcan Compatibility: The tool is sensitive to formatting. Decimals should use . (not ,), and specific rounding rules apply to spatial boundaries.
2. Spatial Math: In collar.js, "directional rounding" (floor for min, ceil for max) is critical for block model alignment.
3. File Delimiters: Files can be comma-separated or tab-separated. src/parser.js handles auto-detection.

## Guidelines for Assisting
- Preserve Interactive UX: When adding features, always use @clack/prompts to maintain the interactive flow.
- Strict Typing: While using JS, ensure logic handles NaN and null values gracefully, as raw drillhole data is often messy.
- Extension Pattern: To add a new command, create a module in src/commands/ and register it in bin/cli.js.
- Testing: Always verify changes by running pnpm test. Add new test cases to tests/run.js for any new logic.

## Negative Constraints (What NOT to do)
- Do NOT use npm or yarn: pnpm is the mandatory package manager.
- Do NOT add testing frameworks: Avoid Jest, Vitest, or others. Stay within the custom runner.
- Do NOT process other formats: Stick strictly to .csv and .txt files.
- Do NOT bypass @clack/prompts: Maintain the established interactive CLI patterns.
- Do NOT use 'require' or 'var': Follow modern ES Module and clean coding standards.

---
*Reference GEMINI.md for team-specific workflows and docs/src-reference.md for detailed API documentation.*
