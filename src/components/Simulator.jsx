import { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import * as math from 'mathjs';
import { Slider } from './ui/slider';
import StatePanel from './StatePanel';
import DensityPanel from './DensityPanel';
import OutcomesPanel from './OutcomesPanel';
import EntanglementPanel from './EntanglementPanel';
import InfoPanel from './InfoPanel';
import * as quantum from '../lib/quantum';

const Simulator = () => {
  const [strength, setStrength] = useState(0.5);
  const [quantumData, setQuantumData] = useState({});
  const rendererRef = useRef(null);
  const mountRef = useRef(null);

  // Refs for panel scenes and cameras (unchanged)
  const statePanelRef = useRef(null);
  const stateSceneRef = useRef(new THREE.Scene());
  const stateCameraRef = useRef(new THREE.PerspectiveCamera(45, 1, 0.1, 100));
  const densityPanelRef = useRef(null);
  const densitySceneRef = useRef(new THREE.Scene());
  const densityCameraRef = useRef(new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100));
  const outcomesPanelRef = useRef(null);
  const outcomesSceneRef = useRef(new THREE.Scene());
  const outcomesCameraRef = useRef(new THREE.OrthographicCamera(-1.2, 1.2, 1.2, -1.2, 0.1, 100));
  const entanglementPanelRef = useRef(null);
  const entanglementSceneRef = useRef(new THREE.Scene());
  const entanglementCameraRef = useRef(new THREE.OrthographicCamera(-1.5, 1.5, 1.5, -1.5, 0.1, 100));

  // Initialize quantum state values (unchanged)
  const initialSystemState = useRef(math.matrix([[Math.sqrt(0.3)], [Math.sqrt(0.7)]], 'dense'));
  const initialEnvState = useRef(math.matrix([[1], [0]], 'dense'));
  const initialTotalState = useRef(math.kron(initialSystemState.current, initialEnvState.current));
  const initialDensity = useRef(quantum.outerProduct(initialTotalState.current));
  const measureOperator = useRef(math.matrix([[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 0, 1], [0, 0, 1, 0]], 'dense'));
  const identityOperator = useRef(math.identity(4, 4));

  useEffect(() => {
    // Camera and renderer setup (unchanged)
    stateCameraRef.current.position.set(0, 0, 2.5);
    densityCameraRef.current.position.z = 5;
    outcomesCameraRef.current.position.z = 5;
    entanglementCameraRef.current.position.z = 5;
    rendererRef.current = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    rendererRef.current.setSize(window.innerWidth, window.innerHeight);
    rendererRef.current.setScissorTest(true);
    mountRef.current.appendChild(rendererRef.current.domElement);
    updateQuantumData(strength);

    let animationFrameId;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const renderer = rendererRef.current;
      if (!renderer) return;
      renderPanel(statePanelRef.current, stateSceneRef.current, stateCameraRef.current);
      renderPanel(densityPanelRef.current, densitySceneRef.current, densityCameraRef.current);
      renderPanel(outcomesPanelRef.current, outcomesSceneRef.current, outcomesCameraRef.current);
      renderPanel(entanglementPanelRef.current, entanglementSceneRef.current, entanglementCameraRef.current);
    };

    const renderPanel = (panelElement, scene, camera) => {
      if (!panelElement || !scene || !camera || !rendererRef.current) return;
      const rect = panelElement.getBoundingClientRect();
      const { left, top, width, height } = rect;
      if (width === 0 || height === 0) return;
      const canvas = rendererRef.current.domElement;
      const pixelRatio = window.devicePixelRatio;
      const canvasRect = canvas.getBoundingClientRect();
      const x = (left - canvasRect.left) * pixelRatio;
      const y = (canvasRect.bottom - rect.bottom) * pixelRatio;
      const w = width * pixelRatio;
      const h = height * pixelRatio;
      if (camera.isPerspectiveCamera && width > 0 && height > 0) {
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
      }
      rendererRef.current.setViewport(x, y, w, h);
      rendererRef.current.setScissor(x, y, w, h);
      rendererRef.current.render(scene, camera);
    };

    animate();
    const handleResize = () => rendererRef.current.setSize(window.innerWidth, window.innerHeight);
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      if (mountRef.current && rendererRef.current) {
        mountRef.current.removeChild(rendererRef.current.domElement);
      }
      rendererRef.current.dispose();
    };
  }, []);

  const updateQuantumData = (strengthValue) => {
    const rho_after = quantum.applyInteraction(
      initialDensity.current,
      strengthValue,
      measureOperator.current,
      identityOperator.current
    );
    const rho_system_after = quantum.partialTrace(rho_after, 1, [2, 2]);
    const diag = math.diag(rho_system_after).toArray();
    const probs = diag.map(d => math.re(d));
    const entanglement = quantum.calculateEntanglement(rho_after);
    setQuantumData({ rho: rho_system_after, probs, entanglement, totalState: rho_after });
  };

  const handleSliderChange = (val) => {
    const strengthValue = val[0] / 100; // shadcn/ui Slider returns an array
    setStrength(strengthValue);
    updateQuantumData(strengthValue);
  };

  const reset = () => handleSliderChange([50]);

  return (
    <div className="w-full max-w-5xl mx-auto">
      <div className="flex flex-wrap items-center justify-center gap-4 mb-6">
        <span className="text-gray-700">Interaction Strength:</span>
        <Slider
          className="w-72"
          defaultValue={[50]}
          min={0}
          max={100}
          step={1}
          onValueChange={handleSliderChange}
          value={[strength * 100]}
        />
        <span className="text-gray-700">{strength.toFixed(2)}</span>
        <button
          className="px-4 py-2 bg-brand-500 text-white rounded-md hover:bg-brand-600 transition-colors"
          onClick={reset}
        >
          Reset
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div ref={statePanelRef}>
          <StatePanel scene={stateSceneRef.current} camera={stateCameraRef.current} quantumData={quantumData} />
        </div>
        <div ref={densityPanelRef}>
          <DensityPanel scene={densitySceneRef.current} camera={densityCameraRef.current} quantumData={quantumData} />
        </div>
        <div ref={outcomesPanelRef}>
          <OutcomesPanel scene={outcomesSceneRef.current} camera={outcomesCameraRef.current} quantumData={quantumData} />
        </div>
        <div ref={entanglementPanelRef}>
          <EntanglementPanel scene={entanglementSceneRef.current} camera={entanglementCameraRef.current} quantumData={quantumData} />
        </div>
        <InfoPanel
          strength={strength}
          quantumData={quantumData}
          className="col-span-full lg:col-span-2"
        />
      </div>

      <div
        ref={mountRef}
        className="fixed inset-0 pointer-events-none z-10"
      />
    </div>
  );
};

export default Simulator;