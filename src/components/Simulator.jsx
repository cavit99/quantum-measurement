import { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import * as math from 'mathjs';
import { 
  Box, 
  Slider,
  SliderTrack,
  SliderThumb,
  Button, 
  HStack, 
  Text 
} from '@chakra-ui/react';
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
  
  // Refs for panel scenes and cameras
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
  
  // Initialize quantum state values
  const initialSystemState = useRef(math.matrix([[Math.sqrt(0.3)], [Math.sqrt(0.7)]], 'dense'));
  const initialEnvState = useRef(math.matrix([[1], [0]], 'dense'));
  const initialTotalState = useRef(math.kron(initialSystemState.current, initialEnvState.current));
  const initialDensity = useRef(quantum.outerProduct(initialTotalState.current));
  const measureOperator = useRef(math.matrix([[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 0, 1], [0, 0, 1, 0]], 'dense'));
  const identityOperator = useRef(math.identity(4, 4));

  useEffect(() => {
    // Initialize camera positions
    stateCameraRef.current.position.set(0, 0, 2.5);
    densityCameraRef.current.position.z = 5;
    outcomesCameraRef.current.position.z = 5;
    entanglementCameraRef.current.position.z = 5;
    
    // Initialize renderer
    rendererRef.current = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    rendererRef.current.setSize(window.innerWidth, window.innerHeight);
    rendererRef.current.setScissorTest(true); // Enable scissor for multiple viewports
    mountRef.current.appendChild(rendererRef.current.domElement);

    // Update quantum data for initial state
    updateQuantumData(strength);

    // Setup animation loop
    let animationFrameId;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const renderer = rendererRef.current;
      if (!renderer) return;
      
      // Render each panel's scene/camera in its viewport
      renderPanel(
        statePanelRef.current, 
        stateSceneRef.current, 
        stateCameraRef.current
      );
      
      renderPanel(
        densityPanelRef.current, 
        densitySceneRef.current, 
        densityCameraRef.current
      );
      
      renderPanel(
        outcomesPanelRef.current, 
        outcomesSceneRef.current, 
        outcomesCameraRef.current
      );
      
      renderPanel(
        entanglementPanelRef.current, 
        entanglementSceneRef.current, 
        entanglementCameraRef.current
      );
    };
    
    const renderPanel = (panelElement, scene, camera) => {
      if (!panelElement || !scene || !camera || !renderer) return;
      
      const rect = panelElement.getBoundingClientRect();
      const { left, top, width, height } = rect;
      
      // Skip rendering if panel is not visible
      if (width === 0 || height === 0) return;
      
      // Convert coordinates to renderer's coordinate system
      const canvas = renderer.domElement;
      const pixelRatio = window.devicePixelRatio;
      const canvasRect = canvas.getBoundingClientRect();
      
      const x = (left - canvasRect.left) * pixelRatio;
      const y = (canvasRect.bottom - rect.bottom) * pixelRatio;
      const w = width * pixelRatio;
      const h = height * pixelRatio;
      
      // Update camera aspect ratio if needed
      if (camera.isPerspectiveCamera && width > 0 && height > 0) {
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
      }
      
      // Set renderer viewport and scissor
      renderer.setViewport(x, y, w, h);
      renderer.setScissor(x, y, w, h);
      renderer.render(scene, camera);
    };
    
    animate();

    const handleResize = () => {
      if (rendererRef.current) {
        rendererRef.current.setSize(window.innerWidth, window.innerHeight);
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      if (mountRef.current && rendererRef.current) {
        mountRef.current.removeChild(rendererRef.current.domElement);
      }
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
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
    
    setQuantumData({
      rho: rho_system_after,
      probs,
      entanglement,
      totalState: rho_after
    });
  };

  const handleSliderChange = (val) => {
    const strengthValue = val / 100;
    setStrength(strengthValue);
    updateQuantumData(strengthValue);
  };

  const reset = () => {
    handleSliderChange(50);
  };

  return (
    <Box w="full" maxW="1200px" mx="auto">
      <HStack spacing={4} mb={6} justify="center">
        <Text>Interaction Strength:</Text>
        <Slider 
          w="300px" 
          defaultValue={50} 
          min={0} 
          max={100} 
          step={1} 
          onChange={handleSliderChange}
          value={strength * 100}
        >
          <SliderTrack bg="teal.500" />
          <SliderThumb />
        </Slider>
        <Text>{strength.toFixed(2)}</Text>
        <Button colorScheme="teal" onClick={reset}>Reset</Button>
      </HStack>
      
      <Box 
        display="grid" 
        gridTemplateColumns={{ base: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }} 
        gap={4}
      >
        <Box ref={statePanelRef}>
          <StatePanel 
            scene={stateSceneRef.current} 
            camera={stateCameraRef.current} 
            quantumData={quantumData} 
          />
        </Box>
        
        <Box ref={densityPanelRef}>
          <DensityPanel 
            scene={densitySceneRef.current} 
            camera={densityCameraRef.current} 
            quantumData={quantumData} 
          />
        </Box>
        
        <Box ref={outcomesPanelRef}>
          <OutcomesPanel 
            scene={outcomesSceneRef.current} 
            camera={outcomesCameraRef.current} 
            quantumData={quantumData} 
          />
        </Box>
        
        <Box ref={entanglementPanelRef}>
          <EntanglementPanel 
            scene={entanglementSceneRef.current} 
            camera={entanglementCameraRef.current} 
            quantumData={quantumData} 
          />
        </Box>
        
        <InfoPanel 
          strength={strength} 
          quantumData={quantumData} 
          gridColumn={{ base: '1 / -1', lg: 'span 2' }} 
        />
      </Box>
      
      <div ref={mountRef} style={{ 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        width: '100%', 
        height: '100%', 
        pointerEvents: 'none', 
        zIndex: 10 // Higher than UI elements that shouldn't be interactive, lower than interactive UI
      }} />
    </Box>
  );
};

export default Simulator; 