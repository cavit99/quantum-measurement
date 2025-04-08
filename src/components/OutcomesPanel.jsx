import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { Box, Heading } from '@chakra-ui/react';

const OutcomesPanel = ({ renderer, quantumData }) => {
  const sceneRef = useRef(new THREE.Scene());
  const cameraRef = useRef(new THREE.OrthographicCamera(-1.2, 1.2, 1.2, -1.2, 0.1, 100));
  const barsRef = useRef([null, null]);
  const fontLoaded = useRef(false);

  useEffect(() => {
    if (!renderer) return;

    const scene = sceneRef.current;
    const camera = cameraRef.current;
    camera.position.z = 5;

    // Create bars for outcome probabilities
    const barGeom = new THREE.BoxGeometry(0.6, 1, 0.1);
    barsRef.current[0] = new THREE.Mesh(
      barGeom, 
      new THREE.MeshBasicMaterial({ color: 0x4444ff })
    );
    barsRef.current[1] = new THREE.Mesh(
      barGeom, 
      new THREE.MeshBasicMaterial({ color: 0xff4444 })
    );
    
    // Position bars
    barsRef.current[0].position.x = -0.5;
    barsRef.current[1].position.x = 0.5;
    
    // Add bars to scene
    scene.add(barsRef.current[0], barsRef.current[1]);

    // Add text labels
    if (!fontLoaded.current) {
      const loader = new THREE.FontLoader();
      loader.load('/helvetiker_regular.typeface.json', (font) => {
        fontLoaded.current = true;
        const textMat = new THREE.MeshBasicMaterial({ color: 0xeeeeee });
        
        const addText = (text, x, y, z) => {
          const textGeom = new THREE.TextGeometry(text, {
            font: font,
            size: 0.1,
            height: 0.01
          });
          const mesh = new THREE.Mesh(textGeom, textMat);
          mesh.position.set(x, y, z);
          scene.add(mesh);
        };
        
        addText('|0⟩', -0.5, -1.2, 0);
        addText('|1⟩', 0.5, -1.2, 0);
      });
    }

    // Animation loop
    const animate = () => {
      if (!renderer) return;
      
      // Set viewport and render
      renderer.setViewport(700, 400, 200, 200);
      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    };
    animate();

    return () => {
      // Clean up scene
      scene.clear();
    };
  }, [renderer]);

  useEffect(() => {
    if (!barsRef.current[0] || !barsRef.current[1] || !quantumData.probs) return;

    const maxHeight = 2;
    const prob0 = quantumData.probs[0] || 0;
    const prob1 = quantumData.probs[1] || 0;
    
    // Update bar heights based on probabilities
    barsRef.current[0].scale.y = prob0 * maxHeight;
    barsRef.current[1].scale.y = prob1 * maxHeight;
    
    // Update bar positions
    barsRef.current[0].position.y = (prob0 * maxHeight / 2) - 1;
    barsRef.current[1].position.y = (prob1 * maxHeight / 2) - 1;
  }, [quantumData]);

  return (
    <Box bg="white" p={4} borderRadius="md" boxShadow="md">
      <Heading size="sm" mb={2}>Measurement Outcomes</Heading>
      <Box h="200px" position="relative"></Box>
    </Box>
  );
};

export default OutcomesPanel; 