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
- Extension Pattern: To add a new command, create a module in src/commands/, add options type to src/types/commands.ts, register in src/cli/index.ts and src/runner.ts.
- Testing: Always verify changes by running pnpm test. Add new test cases to tests/run.ts for any new logic.

## Negative Constraints (What NOT to do)
- Do NOT use npm or yarn: pnpm is the mandatory package manager.
- Do NOT add testing frameworks: Avoid Jest, Vitest, or others. Stay within the custom runner.
- Do NOT process other formats: Stick strictly to .csv and .txt files.
- Do NOT use 'require' or 'var': Follow modern ES Module and clean coding standards.

---

## Non-Interactive Mode (for AI Agents)

The CLI supports a non-interactive mode designed for automated/headless use by AI agents. **Always use this mode** when invoking the CLI programmatically.

### Rules for AI Agents

1. **Always specify `--dir`** with the absolute path to the data directory.
2. **Always specify `--file`** with the filename (relative to `--dir`).
3. **Always pass `--no-banner`** (or `-q`) to suppress the interactive animation.
4. Use exactly one operation flag per invocation.

### Usage Examples

```bash
# Audit a file
pnpm drill --dir /home/data/project-x --no-banner --audit --file collar.csv

# Collar limits with buffer, export CSV
pnpm drill --dir /home/data/project-x --no-banner --collar --file collar.csv --buffer 50 --format csv

# Assay with specific columns and 8 classes
pnpm drill --dir /home/data/project-x --no-banner --assay --file assays.txt --cols "CUT%,FE" --classes 8

# Litho unique values
pnpm drill --dir /home/data/project-x --no-banner --litho --file litho.txt --cols ROCK_CODE

# Schema inference
pnpm drill --dir /home/data/project-x --no-banner --schema --file header.txt

# List available files
pnpm drill --dir /home/data/project-x --help

# General commands
pnpm drill --version
```

### Flags Reference

| Flag | Description |
|---|---|
| `--dir <path>` | Data directory (required for non-interactive) |
| `--file <name>` | Target file (relative to --dir) |
| `--no-banner`, `-q` | Suppress animation |
| `--format <csv\|txt>` | Export format |
| `--outdir <path>` | Export output directory |
| `--buffer <num>` | Buffer for collar (default: 0) |
| `--classes <num>` | Classes for assay (default: 6) |
| `--cols <c1,c2,...>` | Columns for assay/litho (comma-separated) |

### Security Constraints

- The `--dir` parameter defines the root. File access is restricted to this root (path traversal is blocked).
- Only `.csv` and `.txt` files are allowed.
- Only one operation flag can be active per invocation.

---
*Reference GEMINI.md for team-specific workflows and docs/TECHNICAL-REFERENCE.md for detailed API documentation.*
