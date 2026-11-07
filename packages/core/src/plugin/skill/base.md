# Base workspace guide

Use this for any coding task, file or path question, debugging session, or
multi-step project job. It is the default way to work inside a user's project.

## Orient before changing anything

- The session's workspace directory is the base for relative paths. Confirm it
  with `pwd` or the environment instead of assuming.
- Read the project's `README.md` and the nearest `AGENTS.md` first. They define
  the commands, conventions, and boundaries that override general habits.
- Find real files with `glob` and `grep` before guessing a path. Search for the
  symbol, route, or message the user named.
- Read a file before editing it, plus the neighbouring tests and call sites, so
  the change matches how the project already works.

## Paths

- Prefer absolute paths in tool inputs. Relative paths resolve against the
  session's workspace directory, not the directory of a file you just read.
- Quote any path that contains spaces. On Windows, PowerShell accepts both
  separators but commands and tools may expect backslashes; inside JavaScript
  or JSON strings, escape backslashes or use forward slashes.
- Keep writes inside the workspace unless the user asked for a global change.
  Global app configuration (for example `~/.config/elhadry`) is the explicit
  exception.
- Do not move, rename, or delete unfamiliar files. They may be uncommitted user
  work. Inspect them first, and ask before anything destructive.
- Treat symlinks and generated directories (`node_modules`, `dist`, build
  output) as read-only unless the task is specifically about them.

## Make the change

- Match the structure, naming, imports, and error handling of the surrounding
  code. Make the smallest diff that fully solves the problem.
- Reuse existing helpers and dependencies. Do not add a package for something
  the project already does, and do not leave drive-by refactors in the diff.
- Update tests, types, schemas, and docs when behaviour changes. Keep public
  contracts consistent with their consumers.
- Never commit secrets. Use environment variables or secret stores, and never
  print tokens in command output.

## Run commands

- Run package scripts from their package directory when the project is a
  workspace; root scripts may only orchestrate.
- Use a background run for long builds, watchers, and test suites, and read the
  output when it finishes.
- Prefer the project's own typecheck, test, lint, and format commands over ad
  hoc substitutes. Trust the final summary lines and exit codes.

## Verify and report

- Rerun the check that failed, not only a broader suite, and confirm the actual
  pass/fail counts. Never claim a check passed without reading its output.
- If something cannot be verified locally (packaged-only behaviour, missing
  credentials, an external service), say exactly what was not verified and why.
- Report which files changed, what the change does, and the verification result.
  Keep the answer short and concrete.

## Debug systematically

- Reproduce the failure first, then read the full error and stack trace before
  changing code.
- Form one hypothesis at a time and inspect the real value or state instead of
  rewriting whole functions.
- Fix the cause rather than suppressing the symptom. After the fix, rerun the
  failing check and the nearest regression test.
