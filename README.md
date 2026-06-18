<div align="center">

# DRILLHOLE CLI
**Professional Mining Data Assistant for Vulcan Software**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green?style=for-the-badge&logo=nodedotjs)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](LICENSE)
[![Architecture](https://img.shields.io/badge/Architecture-Clean-orange?style=for-the-badge)](docs/src-reference.md)
[![UI](https://img.shields.io/badge/UI-Clack--Prompts-blueviolet?style=for-the-badge)](https://github.com/natemoo-re/clack)
[![ASCII](https://img.shields.io/badge/ASCII-Figlet-lightgrey?style=for-the-badge)](https://github.com/patorjk/figlet.js)


<p align="center">
  A high-performance, interactive command-line tool designed for geologists and data technicians to process drillhole data (.csv / .txt) and generate Vulcan-ready reports.
</p>

---
</div>

## Concept and Purpose

drillhole-cli is designed to bridge the gap between raw field data and professional mining software. It automates the extraction of spatial limits, assay distributions, and lithological codes, ensuring that the data imported into Vulcan is accurate, validated, and strictly formatted.

---

## Robust Architecture

This project is built on a Clean Architecture principle, designed for scalability and technical rigor. By decoupling the core logic from terminal interactions, it provides a stable environment for critical mining data processing.

> [!TIP]
> For a deep dive into the internal machinery, generics, and data flow, see the [Technical Reference](docs/src-reference.md).

### Modular Tiers
*   **Strict Type System**: Centralized TypeScript definitions using advanced patterns (Mapped/Literal types) for compile-time safety.
*   **Core Parser**: High-efficiency engine utilizing Node.js Streams to handle large datasets without memory overhead.
*   **Domain Layers**: Dedicated spaces for business rules (constants) and mathematical logic (utils), ensuring a single source of truth for mining calculations.

---

## Mining Capabilities

| Capability | Technical Goal |
| :--- | :--- |
| **Audit** | Validates data integrity and numeric consistency. |
| **Collar** | Calculates spatial boundary limits with directional rounding. |
| **Assay** | Performs statistical grade analysis via percentile classes. |
| **Litho** | Extracts and sorts unique geological codes. |
| **Schema** | Infers Vulcan-compatible single/double/integer data types. |

---

## Quick Start

```bash
# Install
pnpm install

# Run
pnpm drill

# Test
pnpm test
```

<div align="center">
  Developed for Geologists | 2026
</div>
