# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Autodesk Forma extension for pathfinding between two points on a 3D map. Traces paths along roads defined as objects in the Forma scene.

## Commands

- `npm run dev` - Start development server at http://localhost:5173/
- `npm run build` - Build for production to `dist/`
- `npm run preview` - Preview production build at http://localhost:4173/

No test framework is currently configured.

## Architecture

This is a Preact + Vite + TypeScript web application.

**Key technical details:**
- Uses Preact (not React) - a lightweight 3KB alternative with the same API
- TypeScript configured with `preact` as jsxImportSource
- Path aliases map `react` and `react-dom` to `preact/compat` for React library compatibility
- ESLint uses `eslint-config-preact` preset (config in package.json)
- CSS supports dark mode via `prefers-color-scheme` media query

**Entry points:**
- `index.html` - HTML shell, mounts to `<div id="app">`
- `src/index.tsx` - Renders root `<App />` component
- `src/style.css` - Global styles

## Documentation References

- **Forma Embedded View SDK API Docs**: https://app.autodeskforma.com/forma-embedded-view-sdk/docs/
  - SDK package: `forma-embedded-view-sdk` ([NPM](https://www.npmjs.com/package/forma-embedded-view-sdk))
  - [Developer's Guide](https://aps.autodesk.com/en/docs/forma/v1/embedded-views/introduction)
  - [Tutorial](https://aps.autodesk.com/en/docs/forma/v1/embedded-views/tutorial)

## Tool Preferences

- **Always use Playwright MCP** when reading or interacting with web resources. Prefer Playwright tools (`mcp__playwright__*`) over WebFetch for fetching and inspecting web content.
