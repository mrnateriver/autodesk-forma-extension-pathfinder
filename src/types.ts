export interface Point {
  x: number;
  y: number;
}

export interface GraphNode {
  id: string;
  point: Point;
}

export interface GraphEdge {
  from: string;
  to: string;
  distance: number;
}

export interface RoadSegment {
  start: Point;
  end: Point;
  roadPath: string;
}

export interface Graph {
  nodes: Map<string, GraphNode>;
  edges: GraphEdge[];
  adjacency: Map<string, { nodeId: string; distance: number }[]>;
}

export interface PathResult {
  success: boolean;
  path: Point[];
  distance: number;
  error?: string;
}

export interface ClosestRoadPoint {
  point: Point;
  roadPath: string;
  distance: number;
  segmentIndex: number;
}

export interface Footprint {
  coordinates: [x: number, y: number][];
}
