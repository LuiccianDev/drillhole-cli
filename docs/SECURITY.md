# Security Reference

## 1. Threat Model

The primary security concern for `@luicciandev/drillhole-cli` is **unauthorized file access via path traversal**. Since the tool reads files from a user-specified directory and can be invoked by AI agents or scripts, an attacker could craft a `--file` argument containing `../` sequences to read files outside the intended directory.

Secondary concerns:

- **File type confusion**: loading non-CSV/TXT files that may contain sensitive data
- **Argument injection**: malformed flags causing unexpected behavior

---

## 2. Defenses

### 2.1 Base Directory Isolation

Every file access is validated against a `baseDir`. This is the directory passed via `--dir` (or `process.cwd()` if omitted).

**Implementation** (`src/core/parser.ts:36-48`):

```typescript
export function validateSafePath(filepath: string, baseDir?: string): string {
  const root = path.resolve(baseDir ?? process.cwd());
  const resolved = path.resolve(root, filepath);
  // ...
  if (!resolved.startsWith(root)) {
    throw new Error(`Acceso denegado: El archivo debe estar dentro del directorio base (${root}).`);
  }
  return resolved;
}
```

**How it works:**

1. `root` is resolved to an absolute path from `baseDir`
2. `resolved` is the absolute path of the requested file (joined from root + filepath)
3. The check `resolved.startsWith(root)` ensures the file is a descendant of `root`
4. Any `../` sequence that escapes `root` produces a path that does not start with `root`, causing rejection

**Example:**

```bash
drill --dir /data/project-x --no-banner --audit --file ../etc/passwd
# => Error: Acceso denegado
```

### 2.2 File Extension Whitelist

Only `.csv` and `.txt` extensions are permitted.

```typescript
const ext = path.extname(resolved).toLowerCase();
if (ext !== '.csv' && ext !== '.txt') {
  throw new Error('Solo se permiten archivos con extensión .csv o .txt');
}
```

This check runs **after** path resolution, so appending `.csv` to a traversal path does not bypass the directory check.

### 2.3 One-Operation Constraint

Only a single operation flag is allowed per invocation. The router (`src/index.ts`) selects the first match from `['--audit', '--collar', '--assay', '--litho', '--schema']`. If multiple flags are passed, only the first in declaration order is used; the rest are ignored.

This prevents argument confusion and ensures predictable behavior.

### 2.4 Directory Listing Restriction

`getFilesInDir()` also validates that the requested directory is within the base:

```typescript
const base = path.resolve(process.cwd());
if (!resolvedDir.startsWith(base)) {
  throw new Error('Acceso denegado: El directorio debe estar dentro de...');
}
```

This prevents listing files in parent directories even for informational purposes.

---

## 3. Data Flow Security

```
User input (argv)
    │
    ▼
src/index.ts
    ├── parse --dir → baseDir
    ├── parse --file → fileName
    ├── detect operation → only ONE allowed
    │
    ▼
src/runner.ts / src/cli/index.ts
    │
    ├── filePath = path.join(baseDir, fileName)
    │
    ▼
src/core/parser.ts
    │
    ├── validateSafePath(filePath, baseDir)
    │   ├── path.resolve(baseDir) → root
    │   ├── path.resolve(root, filePath) → resolved
    │   ├── check: resolved.startsWith(root)
    │   ├── check: ext is .csv or .txt
    │   └── if both pass → return resolved
    │
    ├── parseFile/parseColumns
    │   └── only reads via Node.js Streams (no eval, no exec)
    │
    ▼
File System
```

No data is written to disk unless the user explicitly requests export via `--format`. Export output goes to `./exports/` (or `--outdir`), which is also resolved relative to `process.cwd()`.

---

## 4. Non-Interactive Mode Security

When invoked by AI agents (non-interactive mode), the following constraints apply:

| Risk                            | Mitigation                                        |
| ------------------------------- | ------------------------------------------------- |
| Path traversal via `--file`     | `validateSafePath` checks against `--dir`         |
| Reading arbitrary file types    | Extension whitelist (`.csv`/`.txt` only)          |
| Multiple conflicting operations | Only first operation flag is processed            |
| Large files causing OOM         | Stream-based parsing with configurable row limits |
| Malformed numeric data          | `parseFloat` + `isNaN` filtering in all commands  |

---

## 5. Secure Development Guidelines

### 5.1 Adding a new command

When extending the CLI with a new operation:

1. Create the module in `src/commands/`
2. Add options type to `src/types/commands.ts` with a `baseDir?: string` field
3. Register the operation flag in `src/index.ts` (`OPERATIONS` array)
4. Add the mapping in `src/index.ts` (`OP_MAP`)
5. Add the case in `src/runner.ts` switch statement
6. The `runX()` function must accept `baseDir` in its options and pass it to `parseFile`/`parseColumns`

### 5.2 Adding a new file source

If you add another way to read file paths (e.g., from a config file):

1. Always resolve the path relative to `baseDir`
2. Always call `validateSafePath()` before reading
3. Never bypass the extension whitelist

### 5.3 Rules

- Never resolve file paths with `path.resolve(userInput)` directly — always join against `baseDir` first
- Never use `child_process.exec` or `eval` with user input
- Never bypass `validateSafePath` for performance reasons
- Never use `process.cwd()` as the sole root — prefer the user-supplied `--dir`

---

## 6. CI/CD & GitHub Actions Security

The repository uses GitHub Actions for continuous integration (`.github/workflows/ci.yml`) and automated package publishing (`.github/workflows/publish.yml`). The following security principles are enforced:

### 6.1 Principle of Least Privilege (Permissions)

- **CI Workflow (`ci.yml`)**: Restricts the default `GITHUB_TOKEN` to `permissions: contents: read`. No write or administration capabilities are granted.
- **Publish Workflow (`publish.yml`)**: Only requests `contents: read` and `id-token: write` specifically required for OpenID Connect (OIDC) token exchange with npm.

### 6.2 OIDC / Trusted Publishing (Zero Static Secret Leaks)

- **No Long-Lived NPM Tokens**: The package publishing workflow uses npm Trusted Publishing via OIDC. No `NPM_TOKEN` is stored in GitHub Repository Secrets. This eliminates the risk of credential leakage via workflow tampering or build log exposure.
- **Provenance Attestation**: Packages are published with `--provenance`, cryptographically linking each published artifact on npm back to the specific GitHub commit and workflow execution.

### 6.3 Shell Injection Prevention

- All untrusted dynamic contexts (such as `github.ref_name` and `github.event_name`) are mapped into environment variables (`env:`) before being evaluated in shell scripts, preventing CWE-78 argument and command injection.

### 6.4 Resource Protection & Concurrency

- Workflows specify explicit execution timeouts (`timeout-minutes: 10` / `15`) to prevent rogue infinite loops or stalled network requests.
- Concurrency controls (`cancel-in-progress: true` on PRs) cancel obsolete runs to minimize redundant runner execution and avoid race conditions.
