import type { Point, Graph, GraphNode, GraphEdge, RoadSegment, PathResult } from './types';
import {
  distanceBetweenPoints,
  getIntersectionPoint,
  pointsAreEqual,
  pointToId,
} from './geometry-utils';

export function buildRoadGraph(roadSegments: RoadSegment[]): Graph {
  const nodes = new Map<string, GraphNode>();
  const edges: GraphEdge[] = [];
  const adjacency = new Map<string, { nodeId: string; distance: number }[]>();

  // Add endpoints of all segments as nodes
  for (const segment of roadSegments) {
    addNode(nodes, segment.start);
    addNode(nodes, segment.end);
  }

  // Find all intersections between segments
  for (let i = 0; i < roadSegments.length; i++) {
    for (let j = i + 1; j < roadSegments.length; j++) {
      const seg1 = roadSegments[i];
      const seg2 = roadSegments[j];

      const intersection = getIntersectionPoint(
        seg1.start,
        seg1.end,
        seg2.start,
        seg2.end
      );

      if (intersection) {
        addNode(nodes, intersection);
      }
    }
  }

  // Build edges by finding which nodes lie on each segment
  for (const segment of roadSegments) {
    const nodesOnSegment: { node: GraphNode; t: number }[] = [];

    for (const [, node] of nodes) {
      const t = getParameterOnSegment(node.point, segment.start, segment.end);
      if (t !== null && t >= 0 && t <= 1) {
        nodesOnSegment.push({ node, t });
      }
    }

    // Sort by parameter along segment
    nodesOnSegment.sort((a, b) => a.t - b.t);

    // Create edges between consecutive nodes on segment
    for (let i = 0; i < nodesOnSegment.length - 1; i++) {
      const fromNode = nodesOnSegment[i].node;
      const toNode = nodesOnSegment[i + 1].node;
      const distance = distanceBetweenPoints(fromNode.point, toNode.point);

      if (distance > 0.001) {
        edges.push({
          from: fromNode.id,
          to: toNode.id,
          distance,
        });
      }
    }
  }

  // Build adjacency list (bidirectional)
  for (const node of nodes.keys()) {
    adjacency.set(node, []);
  }

  for (const edge of edges) {
    adjacency.get(edge.from)?.push({ nodeId: edge.to, distance: edge.distance });
    adjacency.get(edge.to)?.push({ nodeId: edge.from, distance: edge.distance });
  }

  return { nodes, edges, adjacency };
}

function addNode(nodes: Map<string, GraphNode>, point: Point): string {
  const id = pointToId(point);
  if (!nodes.has(id)) {
    nodes.set(id, { id, point: { ...point } });
  }
  return id;
}

function getParameterOnSegment(
  point: Point,
  start: Point,
  end: Point
): number | null {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSq = dx * dx + dy * dy;

  if (lengthSq < 1e-10) {
    return pointsAreEqual(point, start) ? 0 : null;
  }

  const t = ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSq;

  // Check if point is actually on the segment
  const projX = start.x + t * dx;
  const projY = start.y + t * dy;

  if (
    Math.abs(projX - point.x) < 0.001 &&
    Math.abs(projY - point.y) < 0.001
  ) {
    return t;
  }

  return null;
}

function addPointToGraph(
  graph: Graph,
  point: Point,
  roadSegments: RoadSegment[]
): string | null {
  // Check if point already exists in graph
  const existingId = pointToId(point);
  if (graph.nodes.has(existingId)) {
    return existingId;
  }

  // Find the segment this point lies on
  for (const segment of roadSegments) {
    const t = getParameterOnSegment(point, segment.start, segment.end);
    if (t !== null && t >= 0 && t <= 1) {
      // Add the new node
      const nodeId = addNode(graph.nodes, point);
      graph.adjacency.set(nodeId, []);

      // Find adjacent nodes on this segment
      const startId = pointToId(segment.start);
      const endId = pointToId(segment.end);

      // Connect to segment start
      if (graph.nodes.has(startId)) {
        const distToStart = distanceBetweenPoints(point, segment.start);
        graph.adjacency.get(nodeId)?.push({ nodeId: startId, distance: distToStart });
        graph.adjacency.get(startId)?.push({ nodeId, distance: distToStart });
      }

      // Connect to segment end
      if (graph.nodes.has(endId)) {
        const distToEnd = distanceBetweenPoints(point, segment.end);
        graph.adjacency.get(nodeId)?.push({ nodeId: endId, distance: distToEnd });
        graph.adjacency.get(endId)?.push({ nodeId, distance: distToEnd });
      }

      return nodeId;
    }
  }

  return null;
}

function dijkstra(
  graph: Graph,
  startId: string,
  endId: string
): { path: string[]; distance: number } | null {
  if (!graph.nodes.has(startId) || !graph.nodes.has(endId)) {
    return null;
  }

  const distances = new Map<string, number>();
  const previous = new Map<string, string | null>();
  const visited = new Set<string>();

  // Priority queue (simple array implementation)
  const queue: { nodeId: string; distance: number }[] = [];

  // Initialize
  for (const nodeId of graph.nodes.keys()) {
    distances.set(nodeId, Infinity);
    previous.set(nodeId, null);
  }
  distances.set(startId, 0);
  queue.push({ nodeId: startId, distance: 0 });

  while (queue.length > 0) {
    // Get node with minimum distance
    queue.sort((a, b) => a.distance - b.distance);
    const current = queue.shift()!;

    if (visited.has(current.nodeId)) {
      continue;
    }
    visited.add(current.nodeId);

    if (current.nodeId === endId) {
      break;
    }

    const neighbors = graph.adjacency.get(current.nodeId) || [];
    for (const neighbor of neighbors) {
      if (visited.has(neighbor.nodeId)) {
        continue;
      }

      const newDist = distances.get(current.nodeId)! + neighbor.distance;
      if (newDist < distances.get(neighbor.nodeId)!) {
        distances.set(neighbor.nodeId, newDist);
        previous.set(neighbor.nodeId, current.nodeId);
        queue.push({ nodeId: neighbor.nodeId, distance: newDist });
      }
    }
  }

  // Reconstruct path
  const finalDistance = distances.get(endId);
  if (finalDistance === Infinity) {
    return null;
  }

  const path: string[] = [];
  let current: string | null = endId;
  while (current !== null) {
    path.unshift(current);
    current = previous.get(current) || null;
  }

  return { path, distance: finalDistance };
}

export function findShortestPath(
  startPoint: Point,
  endPoint: Point,
  graph: Graph,
  roadSegments: RoadSegment[]
): PathResult {
  // Add start and end points to graph temporarily
  const startId = addPointToGraph(graph, startPoint, roadSegments);
  const endId = addPointToGraph(graph, endPoint, roadSegments);

  if (!startId) {
    return {
      success: false,
      path: [],
      distance: 0,
      error: 'Start point is not on any road',
    };
  }

  if (!endId) {
    return {
      success: false,
      path: [],
      distance: 0,
      error: 'End point is not on any road',
    };
  }

  const result = dijkstra(graph, startId, endId);

  if (!result) {
    return {
      success: false,
      path: [],
      distance: 0,
      error: 'No path found between the two points',
    };
  }

  // Convert node IDs back to points
  const pathPoints: Point[] = result.path.map((nodeId) => {
    const node = graph.nodes.get(nodeId);
    return node ? { ...node.point } : { x: 0, y: 0 };
  });

  return {
    success: true,
    path: pathPoints,
    distance: result.distance,
  };
}
