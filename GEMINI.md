# Agent Workspace Configuration (agents.md)

## Core Technologies & Documentation
- astro
- tailwind-4-docs
- web-design-guidelines

## Execution Rules & Tooling
- Always use the `find-skills` command to search for and download any additional auxiliary capabilities needed during development.
- Strictly adhere to the typography, layout constraints, color tokens, and hover states defined in the local `DESIGN.md` (Vercel-design-analysis) file for all UI generation.

## Architectural Enforcement
- Enforce a 100% client-side app execution framework.
- Ensure all browser runtime logic (`window`, `localStorage`, `Intl`) is safely contained within client-side Astro `<script>` blocks to preserve static page building.