# Elhadry Agent — Web copy & settings fixes (plan)

Iterative execution: each item is implemented, typechecked, and verified before moving on.

## 1. Custom provider deletion does not work
- Symptom: added custom provider shows "تمت الإضافة" but no delete button in settings.
- Cause: `CustomProviderForm` only creates providers; `Config.update` merges but never removes; `Config.Patch.providers` has no null/delete form; no delete path in the UI.
- Fix: add a delete action in the providers settings for `source === "custom"` that calls `serverSdk.api.config.update({ providers: { [id]: null } })` (or a dedicated `provider.remove`), then invalidates/syncs config+integration+provider+model, and flips the row to `absent`. Also make sure the editor reloads config so the stale entry disappears.
- Files: `packages/app/src/settings/providers/providers.tsx`, `packages/app/src/providers/credentials/dialog.tsx`, `packages/core/src/config.ts`, `packages/schema/src/config.ts`.

## 2. Web workspace settings shows an error
- Symptom: opening Settings → Workspace in the web copy throws.
- Cause: `SettingsWorkspaces` reads `useServer()` / project + session endpoints; on web a missing/unauthorized server or 404 project folder surfaces as `common.requestFailed` or `LocationNotFoundError`.
- Fix: guard the component with the server-connection state, show a friendly empty/connect state instead of crashing; handle 404 with `ProjectFolderMissing`.
- Files: `packages/app/src/settings/workspaces/workspaces.tsx`, `packages/app/src/settings/shell.tsx`, `packages/app/src/settings/workspaces/project-folder-missing.tsx`.

## 3. Tunnel password is fixed / not persisted
- Symptom: the tunnel always uses `hvqYw…` even when another password is typed; login fails.
- Cause: the password field in `settings/servers/tunnel.tsx` is editable but `shareLink` embeds whatever is typed, while the server authenticates against `service-local.json`'s real password. Mismatch.
- Fix: make the field read-only reflecting `props.server.http.password` (the real server password) and always build the link from the server's actual password; if empty, share the address only.
- Files: `packages/app/src/settings/servers/tunnel.tsx`.

## 4. Web login screen redesign
- Symptom: old OpenCode-style branding, multiple fields/buttons.
- Fix: single password field only, Elhadry branding, no pairing link/QR/camera on web; auto-fill address from `location.origin`; premium card styling.
- Status: partially done (password-first + card). Remaining: remove leftover pairing UI on web, final polish.
- Files: `packages/app/src/servers/connect/screen.tsx`, `screen.css`.

## 5. Web file browser: no lazy per-folder loading / no download
- Symptom: opening a project loads everything / hangs; no loading indicator; clicking a folder opens it but large files are not streamed.
- Fix: keep per-folder lazy `listDir` (already in `tree-store.ts`), add a visible loading spinner per node, add a download button per file using `system.save`/anchor; do not auto-read large files; open file viewer only on click.
- Files: `packages/app/src/workspaces/files/model.tsx`, `tree-store.ts`, `packages/gui-extensions/src/file/tree-v2.tsx`, `view.tsx`, `sidebar.tsx`.

## 6. Layout: side panels do not fit the app height
- Symptom: app is too tall/wide; side panels misalign; full-height window looks off.
- Fix: constrain the shell height with `h-dvh` + `min-h-0` flex children, make side panels scroll internally, fix the settings/workspace grid.
- Files: `packages/app/src/shell/*`, `packages/app/src/settings/shell.tsx`, `packages/session-ui` panels.

## Progress (this session)
- ✅ Item 1 (schema + core null support + UI delete button for custom providers) — built, typechecked.
- ✅ Item 3 (tunnel password read-only = real server password).
- ✅ Item 4 (web login: password-only, Arabic, card design).
- ⏳ Item 2 (workspace settings error) — not started.
- ⏳ Item 5 (file browser lazy + download + loading) — not started.
- ⏳ Item 6 (layout/side panels) — not started.

## Restart needed
The dev app must be restarted to pick up the delete button + the regenerated client types. The tunnel is currently live at:
https://9d4b332ef433e582-197-53-89-150.serveousercontent.com