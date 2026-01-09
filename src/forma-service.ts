import { Forma } from 'forma-embedded-view-sdk/auto';
import type { Point, RoadSegment, Footprint } from './types';
import { buildRoadGraph, findShortestPath } from './pathfinding';
import {
  extractRoadSegments,
  getBuildingCenter,
  findClosestRoadPoint,
} from './geometry-utils';
import { createPathGeoJSON, createObstacleHighlightGeoJSON } from './geojson-utils';

export interface PathfindingResult {
  success: boolean;
  geojson?: GeoJSON.FeatureCollection<GeoJSON.LineString>;
  distance?: number;
  error?: string;
}

export async function getBuildingPaths(): Promise<string[]> {
  return Forma.geometry.getPathsByCategory({ category: 'building' });
}

export async function subscribeToSelection(
  buildingPaths: string[],
  onSelectionChange: (buildings: string[]) => void
): Promise<() => void> {
  const { unsubscribe } = await Forma.selection.subscribe(
    ({ paths: selectedPaths }) => {
      const buildings = selectedPaths.filter((path) =>
        buildingPaths.includes(path)
      );
      onSelectionChange(buildings);
    }
  );
  return unsubscribe;
}

export async function renderGeoJSON(
  geojson: GeoJSON.FeatureCollection<GeoJSON.LineString>
): Promise<string> {
  const { id } = await Forma.render.geojson.add({ geojson });
  return id;
}

export async function removeGeoJSON(id: string): Promise<void> {
  try {
    await Forma.render.geojson.remove({ id });
  } catch {
    // Ignore error if path doesn't exist
  }
}

async function getRoadSegments(): Promise<RoadSegment[]> {
  const roadPaths = await Forma.geometry.getPathsByCategory({ category: 'road' });
  const roadSegments: RoadSegment[] = [];

  for (const roadPath of roadPaths) {
    const footprint = (await Forma.geometry.getFootprint({
      path: roadPath,
    })) as Footprint | undefined;
    if (footprint?.coordinates) {
      const segments = extractRoadSegments(footprint, roadPath);
      roadSegments.push(...segments);
    }
  }

  return roadSegments;
}

async function getBuildingCenters(buildingPaths: string[]): Promise<Point[]> {
  const centers: Point[] = [];

  for (const buildingPath of buildingPaths) {
    const footprint = (await Forma.geometry.getFootprint({
      path: buildingPath,
    })) as Footprint | undefined;
    if (footprint?.coordinates) {
      centers.push(getBuildingCenter(footprint));
    }
  }

  return centers;
}

export async function calculatePath(
  selectedBuildings: string[]
): Promise<PathfindingResult> {
  const roadSegments = await getRoadSegments();

  if (roadSegments.length === 0) {
    return { success: false, error: 'No roads found in the scene' };
  }

  const buildingCenters = await getBuildingCenters(selectedBuildings);

  if (buildingCenters.length !== 2) {
    return { success: false, error: 'Could not get building geometry' };
  }

  const startRoadPoint = findClosestRoadPoint(buildingCenters[0], roadSegments);
  const endRoadPoint = findClosestRoadPoint(buildingCenters[1], roadSegments);

  if (!startRoadPoint || !endRoadPoint) {
    return {
      success: false,
      error: 'Could not find roads near buildings',
      geojson: createObstacleHighlightGeoJSON(buildingCenters, startRoadPoint, endRoadPoint),
    };
  }

  const graph = buildRoadGraph(roadSegments);
  const result = findShortestPath(
    startRoadPoint.point,
    endRoadPoint.point,
    graph,
    roadSegments
  );

  if (!result.success) {
    return {
      success: false,
      error: result.error || 'No path found',
      geojson: createObstacleHighlightGeoJSON(buildingCenters, startRoadPoint, endRoadPoint),
    };
  }

  const fullPath: Point[] = [
    buildingCenters[0],
    startRoadPoint.point,
    ...result.path,
    endRoadPoint.point,
    buildingCenters[1],
  ];

  return {
    success: true,
    geojson: createPathGeoJSON(fullPath),
    distance: result.distance,
  };
}

export function getSelectionStatus(selectedCount: number): string {
  if (selectedCount === 0) {
    return 'Select two buildings to find the shortest path';
  } else if (selectedCount === 1) {
    return 'Select one more building';
  } else if (selectedCount === 2) {
    return 'Ready to find path';
  } else {
    return `${selectedCount} buildings selected (need exactly 2)`;
  }
}
