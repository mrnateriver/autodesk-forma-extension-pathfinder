import type { Point, RoadSegment, ClosestRoadPoint, Footprint } from './types';

const EPSILON = 1e-10;

export function distanceBetweenPoints(p1: Point, p2: Point): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function closestPointOnSegment(
  point: Point,
  segmentStart: Point,
  segmentEnd: Point
): Point {
  const dx = segmentEnd.x - segmentStart.x;
  const dy = segmentEnd.y - segmentStart.y;
  const lengthSquared = dx * dx + dy * dy;

  if (lengthSquared < EPSILON) {
    return { ...segmentStart };
  }

  let t =
    ((point.x - segmentStart.x) * dx + (point.y - segmentStart.y) * dy) /
    lengthSquared;
  t = Math.max(0, Math.min(1, t));

  return {
    x: segmentStart.x + t * dx,
    y: segmentStart.y + t * dy,
  };
}

export function findClosestRoadPoint(
  buildingCenter: Point,
  roadSegments: RoadSegment[]
): ClosestRoadPoint | null {
  let closest: ClosestRoadPoint | null = null;
  let minDistance = Infinity;

  for (let i = 0; i < roadSegments.length; i++) {
    const segment = roadSegments[i];
    const pointOnSegment = closestPointOnSegment(
      buildingCenter,
      segment.start,
      segment.end
    );
    const distance = distanceBetweenPoints(buildingCenter, pointOnSegment);

    if (distance < minDistance) {
      minDistance = distance;
      closest = {
        point: pointOnSegment,
        roadPath: segment.roadPath,
        distance,
        segmentIndex: i,
      };
    }
  }

  return closest;
}

export function segmentsIntersect(
  p1: Point,
  p2: Point,
  p3: Point,
  p4: Point
): boolean {
  const d1 = direction(p3, p4, p1);
  const d2 = direction(p3, p4, p2);
  const d3 = direction(p1, p2, p3);
  const d4 = direction(p1, p2, p4);

  if (
    ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
    ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))
  ) {
    return true;
  }

  if (Math.abs(d1) < EPSILON && onSegment(p3, p4, p1)) return true;
  if (Math.abs(d2) < EPSILON && onSegment(p3, p4, p2)) return true;
  if (Math.abs(d3) < EPSILON && onSegment(p1, p2, p3)) return true;
  if (Math.abs(d4) < EPSILON && onSegment(p1, p2, p4)) return true;

  return false;
}

function direction(p1: Point, p2: Point, p3: Point): number {
  return (p3.x - p1.x) * (p2.y - p1.y) - (p2.x - p1.x) * (p3.y - p1.y);
}

function onSegment(p1: Point, p2: Point, p: Point): boolean {
  return (
    Math.min(p1.x, p2.x) <= p.x &&
    p.x <= Math.max(p1.x, p2.x) &&
    Math.min(p1.y, p2.y) <= p.y &&
    p.y <= Math.max(p1.y, p2.y)
  );
}

export function getIntersectionPoint(
  p1: Point,
  p2: Point,
  p3: Point,
  p4: Point
): Point | null {
  const d1x = p2.x - p1.x;
  const d1y = p2.y - p1.y;
  const d2x = p4.x - p3.x;
  const d2y = p4.y - p3.y;

  const cross = d1x * d2y - d1y * d2x;

  if (Math.abs(cross) < EPSILON) {
    return null;
  }

  const dx = p3.x - p1.x;
  const dy = p3.y - p1.y;

  const t = (dx * d2y - dy * d2x) / cross;
  const u = (dx * d1y - dy * d1x) / cross;

  if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
    return {
      x: p1.x + t * d1x,
      y: p1.y + t * d1y,
    };
  }

  return null;
}

export function getBuildingCenter(footprint: Footprint): Point {
  const coords = footprint.coordinates;
  if (!coords || coords.length === 0) {
    return { x: 0, y: 0 };
  }

  let sumX = 0;
  let sumY = 0;
  const n = coords.length - 1; // Exclude closing point

  for (let i = 0; i < n; i++) {
    sumX += coords[i][0];
    sumY += coords[i][1];
  }

  return {
    x: sumX / n,
    y: sumY / n,
  };
}

export function extractRoadSegments(
  footprint: Footprint,
  roadPath: string
): RoadSegment[] {
  const segments: RoadSegment[] = [];
  const coords = footprint.coordinates;

  if (!coords || coords.length < 2) {
    return segments;
  }

  for (let i = 0; i < coords.length - 1; i++) {
    segments.push({
      start: { x: coords[i][0], y: coords[i][1] },
      end: { x: coords[i + 1][0], y: coords[i + 1][1] },
      roadPath,
    });
  }

  return segments;
}

export function pointsAreEqual(p1: Point, p2: Point, tolerance = 0.001): boolean {
  return (
    Math.abs(p1.x - p2.x) < tolerance && Math.abs(p1.y - p2.y) < tolerance
  );
}

export function pointToId(point: Point): string {
  return `${point.x.toFixed(6)},${point.y.toFixed(6)}`;
}
