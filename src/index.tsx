import { render } from 'preact';
import { useState, useEffect, useRef } from 'preact/hooks';
import { Forma } from 'forma-embedded-view-sdk/auto';
import type { Point, RoadSegment, Footprint } from './types';
import { buildRoadGraph, findShortestPath } from './pathfinding';
import {
  extractRoadSegments,
  getBuildingCenter,
  findClosestRoadPoint,
} from './geometry-utils';
import './style.css';

function App() {
  const [buildingPaths, setBuildingPaths] = useState<string[]>([]);
  const [selectedBuildings, setSelectedBuildings] = useState<string[]>([]);
  const [status, setStatus] = useState<string>('Loading...');
  const [isCalculating, setIsCalculating] = useState(false);
  const pathIdRef = useRef<string | null>(null);

  // Initialize: fetch buildings and subscribe to selection
  useEffect(() => {
    const init = async () => {
      try {
        const paths = await Forma.geometry.getPathsByCategory({
          category: 'building',
        });
        setBuildingPaths(paths);
        setStatus('Select two buildings to find the shortest path');

        // Subscribe to selection changes
        const { unsubscribe } = await Forma.selection.subscribe(
          ({ paths: selectedPaths }) => {
            const buildings = selectedPaths.filter((path) =>
              paths.includes(path)
            );
            setSelectedBuildings(buildings);
          }
        );

        return () => unsubscribe();
      } catch (err) {
        console.error('Error initializing:', err);
        setStatus('Error initializing extension');
      }
    };
    init();
  }, []);

  // Update status based on selection
  useEffect(() => {
    if (selectedBuildings.length === 0) {
      setStatus('Select two buildings to find the shortest path');
    } else if (selectedBuildings.length === 1) {
      setStatus('Select one more building');
    } else if (selectedBuildings.length === 2) {
      setStatus('Ready to find path');
    } else {
      setStatus(`${selectedBuildings.length} buildings selected (need exactly 2)`);
    }
  }, [selectedBuildings]);

  const clearPreviousPath = async () => {
    if (pathIdRef.current) {
      try {
        await Forma.render.geojson.remove({ id: pathIdRef.current });
      } catch {
        // Ignore error if path doesn't exist
      }
      pathIdRef.current = null;
    }
  };

  const findPath = async () => {
    if (selectedBuildings.length !== 2) return;

    setIsCalculating(true);
    setStatus('Calculating path...');

    try {
      // Clear any previous path
      await clearPreviousPath();

      // Get road paths
      const roadPaths = await Forma.geometry.getPathsByCategory({
        category: 'road',
      });

      if (roadPaths.length === 0) {
        setStatus('No roads found in the scene');
        setIsCalculating(false);
        return;
      }

      // Get road footprints and extract segments
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

      if (roadSegments.length === 0) {
        setStatus('No road geometry found');
        setIsCalculating(false);
        return;
      }

      // Get building footprints and calculate centers
      const buildingCenters: Point[] = [];
      for (const buildingPath of selectedBuildings) {
        const footprint = (await Forma.geometry.getFootprint({
          path: buildingPath,
        })) as Footprint | undefined;
        if (footprint?.coordinates) {
          buildingCenters.push(getBuildingCenter(footprint));
        }
      }

      if (buildingCenters.length !== 2) {
        setStatus('Could not get building geometry');
        setIsCalculating(false);
        return;
      }

      // Find closest road points to each building
      const startRoadPoint = findClosestRoadPoint(buildingCenters[0], roadSegments);
      const endRoadPoint = findClosestRoadPoint(buildingCenters[1], roadSegments);

      if (!startRoadPoint || !endRoadPoint) {
        setStatus('Could not find roads near buildings');
        await drawObstacleHighlight(buildingCenters, startRoadPoint, endRoadPoint);
        setIsCalculating(false);
        return;
      }

      // Build road graph and find shortest path
      const graph = buildRoadGraph(roadSegments);
      const result = findShortestPath(
        startRoadPoint.point,
        endRoadPoint.point,
        graph,
        roadSegments
      );

      if (!result.success) {
        setStatus(result.error || 'No path found');
        await drawObstacleHighlight(buildingCenters, startRoadPoint, endRoadPoint);
        setIsCalculating(false);
        return;
      }

      // Create full path including building connections
      const fullPath: Point[] = [
        buildingCenters[0],
        startRoadPoint.point,
        ...result.path,
        endRoadPoint.point,
        buildingCenters[1],
      ];

      // Convert to GeoJSON and render
      const geojson = createPathGeoJSON(fullPath);
      const { id } = await Forma.render.geojson.add({ geojson });
      pathIdRef.current = id;

      setStatus(`Path found: ${result.distance.toFixed(1)}m via roads`);
    } catch (err) {
      console.error('Error finding path:', err);
      setStatus(`Error: ${err}`);
    } finally {
      setIsCalculating(false);
    }
  };

  const drawObstacleHighlight = async (
    buildingCenters: Point[],
    startRoadPoint: { point: Point } | null,
    endRoadPoint: { point: Point } | null
  ) => {
    // Draw lines from buildings to their nearest road points (or indicate isolation)
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

    if (features.length > 0) {
      const geojson: GeoJSON.FeatureCollection<GeoJSON.LineString> = {
        type: 'FeatureCollection',
        features,
      };
      const { id } = await Forma.render.geojson.add({ geojson });
      pathIdRef.current = id;
    }
  };

  const createPathGeoJSON = (
    path: Point[]
  ): GeoJSON.FeatureCollection<GeoJSON.LineString> => {
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
  };

  const reset = async () => {
    await clearPreviousPath();
    setStatus('Path cleared');
  };

  const canFindPath = selectedBuildings.length === 2 && !isCalculating;

  return (
    <>
      <div class="section">
        <h3>Pathfinding Extension</h3>
        <p>
          Selected Buildings: {selectedBuildings.length}/2
        </p>
        {selectedBuildings.length > 0 && (
          <ul class="building-list">
            {selectedBuildings.map((path, i) => (
              <li key={path}>Building {i + 1}: {path.split('/').pop()}</li>
            ))}
          </ul>
        )}
      </div>
      <div class="section">
        <weave-button
          variant="solid"
          onClick={findPath}
          disabled={!canFindPath}
        >
          {isCalculating ? 'Calculating...' : 'Find Shortest Path'}
        </weave-button>
        <weave-button variant="flat" onClick={reset}>
          Clear Path
        </weave-button>
      </div>
      <div class="section">
        <p class="status">{status}</p>
      </div>
      <div class="section info">
        <p>Total buildings: {buildingPaths.length}</p>
      </div>
    </>
  );
}

render(<App />, document.getElementById('app'));
