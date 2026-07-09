<div align="center">

<img src="docs/img/logo-drillhole-cli.webp" alt="Drillhole CLI Logo" />



**Professional mining data assistant for Vulcan software**

[![npm version](https://img.shields.io/npm/v/@luicciandev/drillhole-cli?style=flat-square)](https://www.npmjs.com/package/@luicciandev/drillhole-cli)
[![Node.js](https://img.shields.io/badge/Node.js-18+-3c873a?style=flat-square)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-blue?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](LICENSE)
[![CLI](https://img.shields.io/badge/CLI-@clack/prompts-blueviolet?style=flat-square)](https://github.com/natemoo-re/clack)
[![ASCII](https://img.shields.io/badge/ASCII-figlet-lightgrey?style=flat-square)](https://github.com/patorjk/figlet.js)
[![ESM](https://img.shields.io/badge/ESM-module-ffd700?style=flat-square)](https://nodejs.org/api/esm.html)
[![Mining](https://img.shields.io/badge/Mining-Vulcan%20Ready-8B4513?style=flat-square)](https://www.maptek.com/products/vulcan/)
[![Built with](https://img.shields.io/badge/Built%20with-pnpm-F69220?style=flat-square&logo=pnpm&logoColor=white)](https://pnpm.io)

[Installation](#installation) • [Usage](#usage) • [Commands](#commands) • [Examples](#examples) • [Output](#output) • [Interactive Mode](#interactive-mode) • [Development](#development)

</div>

A command-line tool for geologists and data technicians to process drillhole data (.csv / .txt) and generate reports, statistics, and spatial limits formatted for [Vulcan](https://www.maptek.com/products/vulcan/), a 3D mining modeling software.

## Installation

```bash
npm install -g @luicciandev/drillhole-cli
```

After installation, the `drill` command is available globally:

```bash
drill --version
drill --help
```

## Usage

```bash
drill [options] [command]
```

### Options

| Option | Description |
|---|---|
| `--dir, -d <path>` | Data directory with .csv / .txt files |
| `--file <name>` | Target file (relative to `--dir`) |
| `--format <csv\|txt>` | Export format (default: depends on command) |
| `--outdir <path>` | Output directory (default: `./exports/`) |
| `--buffer <num>` | Buffer for collar spatial limits (default: 0) |
| `--classes <num>` | Number of percentile classes for assay (default: 6) |
| `--cols <c1,c2,...>` | Columns to analyze for assay or litho (comma-separated) |
| `--no-banner, -q` | Suppress startup animation (for scripting) |

### Commands

| Command | Description |
|---|---|
| `--audit` | Validate data integrity: checks columns, null values, and decimal formatting |
| `--collar` | Calculate spatial coordinate limits with directional rounding and optional buffer |
| `--assay` | Generate percentile-based grade ranges for statistical analysis |
| `--litho` | Extract unique lithological codes from specified columns |
| `--schema` | Infer Vulcan-compatible data types (text, integer, single, double) |

## Examples

### Audit

Validate a collar file for data integrity:

```bash
drill --audit --dir ./project-data --file collar.csv
```

### Collar limits

Calculate spatial boundaries with directional rounding (floor for min, ceil for max):

```bash
# Without buffer
drill --collar --dir ./project-data --file collar.csv

# With 50m buffer and CSV export
drill --collar --dir ./project-data --file collar.csv --buffer 50 --format csv
```

> [!NOTE]
> Directional rounding ensures boundaries align with Vulcan block model grids:
> - Minimum values are floored to the nearest 100 (or 10 for elevation)
> - Maximum values are ceiled to the nearest 100 (or 10 for elevation)
> - Elevation accounts for drillhole `LENGTH` column when calculating the lower boundary

### Assay

Analyze grade distributions using percentile classes:

```bash
# Default 6 classes for all numeric columns
drill --assay --dir ./project-data --file assays.txt

# Custom columns and 8 classes
drill --assay --dir ./project-data --file assays.txt --cols "CUT%,FE" --classes 8
```

### Litho

Extract unique geological codes for legend generation:

```bash
# From a specific column
drill --litho --dir ./project-data --file litho.txt --cols ROCK_CODE

# From multiple columns
drill --litho --dir ./project-data --file litho.txt --cols ROCK_CODE,ALTERATION
```

### Schema

Infer Vulcan data types from a header file:

```bash
drill --schema --dir ./project-data --file header.txt
```

## Output

Results are saved to the `./exports/` directory (or the path specified with `--outdir`), relative to where you run the command:

```text
project/
├── exports/                  ← created automatically
│   ├── collar_limits_2026-07-05T15-30-00.csv
│   ├── assay_limits_CUT%_2026-07-05.csv
│   └── litho_values_2026-07-05.txt
├── collar.csv
├── assays.txt
└── ...
```

Files are named with a **timestamp** to prevent overwrites. When `--format csv` is specified, outputs use Vulcan-compatible formatting with `.` as decimal separator.

### Export formats

| Format | Description |
|---|---|
| `txt` (default) | Pretty-printed JSON, human-readable |
| `csv` | Comma-separated values, ready for Vulcan import |

## Interactive Mode

Run `drill` without any command to start the interactive prompt, which guides you through file selection and operation configuration:

```bash
drill
```

Follow the on-screen prompts to choose a file, select an operation, and configure options.

## Development

```bash
# Clone and install dependencies
git clone https://github.com/LuiccianDev/drillhole-cli.git
cd drillhole-cli
pnpm install

# Run locally (without installing)
pnpm drill

# Build TypeScript
pnpm build

# Run tests
pnpm test
```

> [!TIP]
> For detailed API documentation and architecture information, see the [Technical Reference](docs/TECHNICAL-REFERENCE.md).
