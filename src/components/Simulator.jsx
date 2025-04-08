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
  
  // Initialize quantum state values
  const initialSystemState = useRef(math.matrix([[Math.sqrt(0.3)], [Math.sqrt(0.7)]], 'dense'));
  const initialEnvState = useRef(math.matrix([[1], [0]], 'dense'));
  const initialTotalState = useRef(math.kron(initialSystemState.current, initialEnvState.current));
  const initialDensity = useRef(quantum.outerProduct(initialTotalState.current));
  const measureOperator = useRef(math.matrix([[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 0, 1], [0, 0, 1, 0]], 'dense'));
  const identityOperator = useRef(math.identity(4, 4));

  useEffect(() => {
    // Initialize renderer
    rendererRef.current = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    rendererRef.current.setSize(window.innerWidth, window.innerHeight);
    mountRef.current.appendChild(rendererRef.current.domElement);

    // Update quantum data for initial state
    updateQuantumData(strength);

    const handleResize = () => {
      rendererRef.current.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (mountRef.current && rendererRef.current) {
        mountRef.current.removeChild(rendererRef.current.domElement);
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
        <StatePanel renderer={rendererRef.current} quantumData={quantumData} />
        <DensityPanel renderer={rendererRef.current} quantumData={quantumData} />
        <OutcomesPanel renderer={rendererRef.current} quantumData={quantumData} />
        <EntanglementPanel renderer={rendererRef.current} quantumData={quantumData} />
        <InfoPanel 
          strength={strength} 
          quantumData={quantumData} 
          gridColumn={{ base: '1 / -1', lg: 'span 2' }} 
        />
      </Box>
      
      <div ref={mountRef} style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }} />
    </Box>
  );
};

export default Simulator; 