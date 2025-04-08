import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { Box, Heading } from '@chakra-ui/react';

const OutcomesPanel = ({ scene, camera, quantumData }) => {
  const barsRef = useRef([null, null]);
  const fontLoaded = useRef(false);
  const groupRef = useRef(new THREE.Group());

  useEffect(() => {
    if (!scene || !camera) return;

    // Add our group to the scene
    scene.add(groupRef.current);
    const currentGroup = groupRef.current;

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
    currentGroup.add(barsRef.current[0], barsRef.current[1]);

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
          currentGroup.add(mesh);
        };
        
        addText('|0⟩', -0.5, -1.2, 0);
        addText('|1⟩', 0.5, -1.2, 0);
      });
    }

    return () => {
      // Remove our group from the scene
      scene.remove(currentGroup);
      
      // Dispose of geometries and materials
      currentGroup.traverse(child => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(m => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
    };
  }, [scene, camera]);

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
    <Box bg="gray.700" color="white" p={4} borderRadius="md" boxShadow="md" h="250px">
      <Heading size="sm" mb={2}>Measurement Outcomes</Heading>
      {/* The actual Three.js content is now rendered via the central animation loop */}
    </Box>
  );
};

export default OutcomesPanel; 