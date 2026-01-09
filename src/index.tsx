import { render } from 'preact';
import { useState, useEffect, useRef } from 'preact/hooks';
import {
  getBuildingPaths,
  subscribeToSelection,
  calculatePath,
  renderGeoJSON,
  removeGeoJSON,
  getSelectionStatus,
} from './forma-service';
import './style.css';

function useBuildingSelection() {
  const [buildingPaths, setBuildingPaths] = useState<string[]>([]);
  const [selectedBuildings, setSelectedBuildings] = useState<string[]>([]);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        const paths = await getBuildingPaths();
        setBuildingPaths(paths);
        const unsubscribe = await subscribeToSelection(paths, setSelectedBuildings);
        return () => unsubscribe();
      } catch (err) {
        console.error('Error initializing:', err);
        setInitError('Error initializing extension');
      }
    };
    init();
  }, []);

  return { buildingPaths, selectedBuildings, initError };
}

function usePathfinder(selectedBuildings: string[]) {
  const [status, setStatus] = useState<string>('Loading...');
  const [isCalculating, setIsCalculating] = useState(false);
  const pathIdRef = useRef<string | null>(null);

  useEffect(() => {
    setStatus(getSelectionStatus(selectedBuildings.length));
  }, [selectedBuildings]);

  const clearPath = async () => {
    if (pathIdRef.current) {
      await removeGeoJSON(pathIdRef.current);
      pathIdRef.current = null;
    }
  };

  const findPath = async () => {
    if (selectedBuildings.length !== 2) return;

    setIsCalculating(true);
    setStatus('Calculating path...');

    try {
      await clearPath();
      const result = await calculatePath(selectedBuildings);

      if (result.geojson) {
        pathIdRef.current = await renderGeoJSON(result.geojson);
      }

      if (result.success) {
        setStatus(`Path found: ${result.distance?.toFixed(1)}m via roads`);
      } else {
        setStatus(result.error || 'No path found');
      }
    } catch (err) {
      console.error('Error finding path:', err);
      setStatus(`Error: ${err}`);
    } finally {
      setIsCalculating(false);
    }
  };

  const reset = async () => {
    await clearPath();
    setStatus('Path cleared');
  };

  const canFindPath = selectedBuildings.length === 2 && !isCalculating;

  return { status, isCalculating, canFindPath, findPath, reset };
}

function App() {
  const { buildingPaths, selectedBuildings, initError } = useBuildingSelection();
  const { status, isCalculating, canFindPath, findPath, reset } = usePathfinder(selectedBuildings);

  const displayStatus = initError || status;

  return (
    <>
      <div class="section">
        <h3>Pathfinding Extension</h3>
        <p>Selected Buildings: {selectedBuildings.length}/2</p>
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
        <p class="status">{displayStatus}</p>
      </div>
      <div class="section info">
        <p>Total buildings: {buildingPaths.length}</p>
      </div>
    </>
  );
}

render(<App />, document.getElementById('app'));
