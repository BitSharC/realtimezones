# Agent Workspace Configuration (agents.md)

Before making any changes, always review the following project documents:

- DESIGN.md
- VERSION_1.md

## Core Technologies & Skills
- astro
- tailwind-4-docs
- web-design-guidelines
- better-typography
- design-taste-frontend
- minimalist-ui
- stitch-design-taste
- find-skills

## UI Prototyping with Stitch MCP
- Always use the **Stitch MCP** tools (`create_project`, `generate_screen_from_text`, `edit_screens`, `create_design_system`, `generate_variants`, `upload_design_md`) to generate, prototype, and iterate on UI concepts, screen variants, and design layouts before implementing production code.
- Leverage Stitch design systems and `DESIGN.md` integration to ensure high-fidelity, polished visual prototypes that match the product aesthetic.

## Execution Rules & Tooling
- Always use the `find-skills` command to search for and download any additional auxiliary capabilities needed during development.
- Strictly adhere to the typography, layout constraints, color tokens, and hover states defined in the local `DESIGN.md` (Vercel-design-analysis) file for all UI generation.
- Respect all UI stability rules defined in `VERSION_1.md`.

## Architectural Enforcement
- Enforce a 100% client-side app execution framework.
- Ensure all browser runtime logic (`window`, `localStorage`, `Intl`) is safely contained within client-side Astro `<script>` blocks to preserve static page building.