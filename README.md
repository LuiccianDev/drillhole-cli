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
A fast, interactive command-line tool for processing drillhole data files (.csv / .txt) and generating statistics, limits, and reports ready for use in Vulcan mining software.

> [!IMPORTANT]
> This tool is specifically designed for mining workflows, focusing on spatial boundaries, assay percentiles, and lithology legend extraction.

## Features

- **Audit File**: Validate data integrity, detect missing columns, null values, and incorrect decimal separators.
- **Collar Limits**: Calculate spatial boundaries (min/max) for coordinates with directional rounding and optional buffering.
- **Assay Ranges**: Perform percentile-based range analysis for chemical grades across multiple classes.
- **Litho Values**: Extract unique lithology codes from one or more columns, ready for legend creation.
- **Vulcan Types**: Infer Vulcan-compatible data types (text, integer, single, double) from your data.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or later.
- [pnpm](https://pnpm.io/) (recommended).

### Installation

```bash
pnpm install
```

### Usage

To start the interactive interface:

```bash
pnpm drill
```

The CLI will guide you through:
1. Selecting an operation.
2. Choosing a data file from your current directory.
3. Configuring operation-specific options (e.g., buffer size, number of classes, or columns to analyze).
4. Exporting the results to TXT or CSV.

## Project Structure

- `bin/`: CLI entry point.
- `src/cli/`: Interactive UI layer using Clack prompts.
- `src/core/`: Core parsing and data processing logic.
- `src/commands/`: Implementation of individual data analysis operations.
- `tests/`: Custom assertion-based test suite.

## Testing

Run the automated test suite to ensure data processing accuracy:

```bash
pnpm test
```

## Tech Stack

- **Runtime**: Node.js (ES Modules)
- **UI**: `@clack/prompts`
- **Data Parsing**: Custom high-performance CSV/TXT parser.
- **Package Management**: pnpm
> For a full description of every module, function, and return type, see [docs/src-reference.md](./docs/src-reference.md).