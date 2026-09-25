# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

- `npm run dev` — dev server (http://localhost:3000)
- `npm run build` / `npm start` — production build / serve
- `npm run lint` — ESLint (flat config, `eslint.config.mjs`)
- No test runner is configured.

## Stack

Next.js 16 (App Router) + React 19, Tailwind v4, shadcn/ui (style `base-nova`, built on `@base-ui/react`, lucide icons), react-hook-form + zod, sonner toasts. Path alias `@/*` → project root. UI text and domain names are in Spanish (clientes, usuarios, roles, pagos/cobros, dashboard).

Frontend for a gym-management system; it talks to a separate REST backend at `NEXT_PUBLIC_API_URL` (default `http://localhost:3001/api`, set in `.env.local`).

## Architecture

- **Data layer**: `lib/api.js` `apiClient()` is the single fetch wrapper. It reads the JWT from `localStorage.token`, adds the Bearer header, and on 401 clears storage and hard-redirects to `/login`. Non-OK responses throw an `Error` with `.status` and the backend `message`. Backend responses are wrapped as `{ data }`.
- **`services/*.js`**: one file per resource, thin wrappers over `apiClient`. Some (e.g. `clientes.js`) normalize backend shapes (`id` → `idCliente`, defaults for missing fields) — the normalized shapes are typed in `lib/types.ts`. `lib/` and `services/` are plain JS, not TS.
- **Auth**: `contexts/auth-context.tsx` (`AuthProvider` / `useAuth`) holds `usuario`, `permisos`, and `esAdmin`. Session lives in `localStorage` (`token`, `usuario`); validity is checked client-side by decoding the JWT `exp` (`lib/auth.js`). Permissions come from `getMisPermisos()` in `services/roles`.
- **Access control is client-side only**: `app/dashboard/layout.tsx` redirects unauthenticated users to `/login`; `components/role-guard.tsx` (`<RoleGuard requiredPermission="...">`) gates pages by permission string (admins bypass). Roles are dynamic (`Role` with `permissions[]`), while `Usuario.rol` is the fixed enum `dueno | recepcion | profesor`.
- **Pages vs. modules**: `app/dashboard/*/page.tsx` are thin; the real UI lives in `components/*-module.tsx` (list/table + actions) with companion `*-form-dialog.tsx` / detail dialogs. `components/ui/` is shadcn-generated — add components via the `shadcn` CLI rather than hand-writing.
- `app/page.tsx` is still the create-next-app placeholder.
