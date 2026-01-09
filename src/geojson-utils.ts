import type { Point } from './types';

export function createPathGeoJSON(
  path: Point[]
): GeoJSON.FeatureCollection<GeoJSON.LineString> {
  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {
          stroke: '#ff0000',
          'stroke-width': 8,
          'stroke-opacity': 1,
        },
        geometry: {
          type: 'LineString',
          coordinates: path.map((p) => [p.x, p.y]),
        },
      },
    ],
  };
}

export function createObstacleHighlightGeoJSON(
  buildingCenters: Point[],
  startRoadPoint: { point: Point } | null,
  endRoadPoint: { point: Point } | null
): GeoJSON.FeatureCollection<GeoJSON.LineString> | undefined {
  const features: GeoJSON.Feature<GeoJSON.LineString>[] = [];

  if (startRoadPoint) {
    features.push({
      type: 'Feature',
      properties: {
        stroke: '#ff8c00',
        'stroke-width': 4,
        'stroke-opacity': 0.8,
      },
      geometry: {
        type: 'LineString',
        coordinates: [
          [buildingCenters[0].x, buildingCenters[0].y],
          [startRoadPoint.point.x, startRoadPoint.point.y],
        ],
      },
    });
  }

  if (endRoadPoint) {
    features.push({
      type: 'Feature',
      properties: {
        stroke: '#ff8c00',
        'stroke-width': 4,
        'stroke-opacity': 0.8,
      },
      geometry: {
        type: 'LineString',
        coordinates: [
          [buildingCenters[1].x, buildingCenters[1].y],
          [endRoadPoint.point.x, endRoadPoint.point.y],
        ],
      },
    });
  }

  if (features.length === 0) {
    return undefined;
  }

  return {
    type: 'FeatureCollection',
    features,
  };
}
