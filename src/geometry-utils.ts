import type { Point, RoadSegment, ClosestRoadPoint, Footprint } from './types';

const EPSILON = 1e-10;

/**
 * Calculates the Euclidean distance between two points.
 *
 * Math: Pythagorean theorem - d = sqrt((x2-x1)² + (y2-y1)²)
 */
export function distanceBetweenPoints(p1: Point, p2: Point): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Finds the closest point on a line segment to a given point.
 *
 * Math: Orthogonal projection using the dot product.
 * Projects point P onto line AB by computing t = ((P-A)·(B-A)) / |B-A|²
 * where t is clamped to [0,1] to stay within the segment.
 * The result is A + t*(B-A).
 */
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

/**
 * Finds the closest road point to a building center by linear search.
 *
 * Math: Greedy minimum search - iterates all segments and tracks
 * the one with minimum Euclidean distance.
 */
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

/**
 * Determines if two line segments intersect.
 *
 * Math: Cross product orientation test (CCW algorithm).
 * Two segments intersect if and only if:
 * 1. The endpoints of each segment lie on opposite sides of the other segment's line
 * 2. Or a special case where an endpoint lies exactly on the other segment
 *
 * Uses the sign of the cross product to determine orientation (left/right turn).
 */
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

/**
 * Computes the cross product of vectors (p1->p2) and (p1->p3).
 *
 * Math: 2D cross product - (p3-p1) × (p2-p1) = (p3.x-p1.x)(p2.y-p1.y) - (p2.x-p1.x)(p3.y-p1.y)
 * Returns: positive if p3 is left of line p1->p2 (counter-clockwise),
 *          negative if right (clockwise), zero if collinear.
 */
function direction(p1: Point, p2: Point, p3: Point): number {
  return (p3.x - p1.x) * (p2.y - p1.y) - (p2.x - p1.x) * (p3.y - p1.y);
}

/**
 * Checks if point p lies within the bounding box of segment p1-p2.
 *
 * Math: Axis-aligned bounding box (AABB) containment test.
 */
function onSegment(p1: Point, p2: Point, p: Point): boolean {
  return (
    Math.min(p1.x, p2.x) <= p.x &&
    p.x <= Math.max(p1.x, p2.x) &&
    Math.min(p1.y, p2.y) <= p.y &&
    p.y <= Math.max(p1.y, p2.y)
  );
}

/**
 * Calculates the intersection point of two line segments, if it exists.
 *
 * Math: Parametric line intersection using Cramer's rule.
 * Line 1: P = p1 + t*(p2-p1), Line 2: P = p3 + u*(p4-p3)
 * Solves for t and u using the cross product (determinant).
 * If cross product is zero, lines are parallel.
 * Returns intersection only if 0 ≤ t,u ≤ 1 (within both segments).
 */
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

/**
 * Calculates the centroid (center of mass) of a polygon.
 *
 * Math: Arithmetic mean of vertices - centroid = (Σxi/n, Σyi/n)
 * This is a simplification that works well for convex polygons.
 * For precise centroid of arbitrary polygons, use the shoelace formula.
 */
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

/**
 * Extracts consecutive line segments from a polygon's coordinate array.
 * No mathematical transformation - purely data restructuring.
 */
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

/**
 * Compares two points for equality within a tolerance.
 *
 * Math: Epsilon comparison for floating-point numbers.
 * Two floats are "equal" if |a - b| < ε (tolerance).
 */
export function pointsAreEqual(p1: Point, p2: Point, tolerance = 0.001): boolean {
  return (
    Math.abs(p1.x - p2.x) < tolerance && Math.abs(p1.y - p2.y) < tolerance
  );
}

/**
 * Converts a point to a unique string identifier.
 * No mathematical principle - string serialization for hash map keys.
 */
export function pointToId(point: Point): string {
  return `${point.x.toFixed(6)},${point.y.toFixed(6)}`;
}
