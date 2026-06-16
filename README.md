<h1 align="center">drill-cli</h1>

<p align="center">
  <a href="https://nodejs.org/"><img alt="Node.js" src="https://img.shields.io/badge/Node.js-v18%2B-339933?style=flat-square&logo=node.js&logoColor=white"/></a>
  <a href="https://pnpm.io/"><img alt="pnpm" src="https://img.shields.io/badge/pnpm-package%20manager-F69220?style=flat-square&logo=pnpm&logoColor=white"/></a>
  <a href="https://github.com/natemoo-re/clack"><img alt="@clack/prompts" src="https://img.shields.io/badge/%40clack%2Fprompts-interactive%20CLI-6C47FF?style=flat-square&logo=gnometerminal&logoColor=white"/></a>
  <a href="./LICENSE"><img alt="MIT License" src="https://img.shields.io/badge/license-MIT-blue?style=flat-square"/></a>
</p>

<p align="center">
  A fast, interactive command-line tool for processing drillhole data files (<code>.csv</code> / <code>.txt</code>)<br/>
  and generating statistics, limits, and reports ready for use in <strong>Vulcan</strong> mining software.
</p>

Built for geologists and data technicians who need quick, reliable summaries of assay grades, collar coordinates, lithology codes, and data schemas — directly from the terminal, without opening Excel.

---

## Features

- **Assay Ranges** — Calculates min/max grades and builds percentile-based class ranges for one or more selected mineral columns (e.g., `CUT%`, `Au`, `Ag`, `Pb`).
- **Collar Limits** — Computes spatial boundaries for `EASTING`, `NORTHING`, and `ELEVATION` with configurable buffer and directional rounding for Vulcan block model setup.
- **Litho Values** — Extracts unique lithology codes with frequency counts, filtered by minimum occurrence threshold.
- **Vulcan Schema** — Infers the correct Vulcan data type (`text`, `integer`, `single`, `double`) for each column based on its content.
- **Audit** — Validates column integrity, detects null/empty values, and flags comma-formatted decimals that are incompatible with Vulcan.
- **Export** — Outputs results to `.txt` (notebook-ready) or `.csv` (Excel/Vulcan-ready) with auto-generated timestamps.

---

## Requirements

- [Node.js](https://nodejs.org/) v18 or later
- [pnpm](https://pnpm.io/) (recommended) or npm

---

## Installation

```bash
git clone https://github.com/your-username/drill-cli.git
cd drill-cli
pnpm install
```

---

## Usage

Place your `.csv` or `.txt` drillhole files in the project root (or the directory from which you run the CLI), then launch the interactive menu:

```bash
pnpm drill
```

The CLI will guide you through:

1. **Select operation** — Choose one of: `Audit`, `Collar Limits`, `Assay Ranges`, `Litho Values`, or `Vulcan Types`.
2. **Select file** — Pick from the `.csv` / `.txt` files detected in the current directory.
3. **Select export format** — `TXT` (block-of-notes style) or `CSV` (tabular, Excel-compatible).
4. **Operation-specific options** — For example, assay will let you select which mineral columns to analyze and how many percentile classes to generate.

Output files are written to the current directory with a timestamp in the filename (e.g., `assay_limits_ranges_2026-06-16T22-00-00.csv`).

---

## Assay Ranges — Example Output

```
=== ASSAY LIMITS ===

CUT%:
  raw         : [0, 2.24]
  count       : 487
  ranges (6 clases):
  Clase          From         To   Percentil
  ────────────────────────────────────────────────
  1                 0          0   0% → 16.6667%
  2                 0       0.29   16.6667% → 33.3333%
  3              0.29       0.59   33.3333% → 50%
  4              0.59        0.8   50% → 66.6667%
  5               0.8       1.04   66.6667% → 83.3333%
  6              1.04       2.24   83.3333% → 100%
```

---

## File Format Support

The CLI automatically detects the delimiter of the input file:

| Format | Delimiter |
|--------|-----------|
| CSV | `,` (comma) |
| TXT | `\t` (tab) |

Both formats must have a header row as the first line.

---

## Running Tests

```bash
node tests/run.js
```

The test suite covers collar limits (with and without buffer), assay ranges (structure, continuity, class count), and litho frequency filtering.

---

## Project Structure

```
drill-cli/
├── bin/
│   └── cli.js          # Interactive CLI entry point
├── src/
│   ├── parser.js       # File reading and column parsing
│   └── commands/
│       ├── assay.js    # Assay grade range analysis
│       ├── collar.js   # Collar coordinate limits
│       ├── litho.js    # Lithology code frequency
│       ├── schema.js   # Vulcan data type inference
│       ├── audit.js    # Data quality audit
│       └── export.js   # TXT / CSV file output
├── docs/
│   └── src-reference.md  # Full technical reference for src/
└── tests/
    └── run.js          # Automated test suite
```

> For a full description of every module, function, and return type, see [docs/src-reference.md](./docs/src-reference.md).
