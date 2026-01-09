# Forma Pathfinder Extension

An Autodesk Forma extension that finds and visualizes the shortest path between two selected buildings using available roads in the scene.

## Features

- Select two buildings in the Forma scene
- Calculates the shortest path along the road network using Dijkstra's algorithm
- Draws the path as a red GeoJSON LineString on the map
- Highlights obstacles when no valid path exists

## Tech Stack

- Preact + TypeScript + Vite
- [Forma Embedded View SDK](https://app.autodeskforma.com/forma-embedded-view-sdk/docs/)

## Getting Started

```bash
npm install
npm run dev
```

Then load the extension in Forma at http://localhost:5173/

## Scripts

- `npm run dev` - Start dev server at http://localhost:5173/
- `npm run build` - Build for production to `dist/`
- `npm run preview` - Preview production build at http://localhost:4173/
- `npm run typecheck` - Validate TypeScript types
