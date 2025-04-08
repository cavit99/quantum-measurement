import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { Box, Heading } from '@chakra-ui/react';

const EntanglementPanel = ({ scene, camera, quantumData }) => {
  const circlesRef = useRef([null, null]);
  const overlapRef = useRef(null);
  const fontLoaded = useRef(false);
  const groupRef = useRef(new THREE.Group());
  const animationRef = useRef({ time: 0 });

  useEffect(() => {
    if (!scene || !camera) return;

    // Add our group to the scene
    scene.add(groupRef.current);
    const currentGroup = groupRef.current;

    // Create circles representing system and environment
    const circleGeom = new THREE.CircleGeometry(0.6, 32);
    
    // System circle (blue)
    circlesRef.current[0] = new THREE.Line(
      new THREE.EdgesGeometry(circleGeom),
      new THREE.LineBasicMaterial({ color: 0x0000ff })
    );
    circlesRef.current[0].position.x = -0.5;
    
    // Environment circle (red)
    circlesRef.current[1] = new THREE.Line(
      new THREE.EdgesGeometry(circleGeom),
      new THREE.LineBasicMaterial({ color: 0xff0000 })
    );
    circlesRef.current[1].position.x = 0.5;
    
    // Overlap circle (purple) representing entanglement
    overlapRef.current = new THREE.Mesh(
      circleGeom,
      new THREE.MeshBasicMaterial({ 
        color: 0x800080, 
        transparent: true, 
        opacity: 0.6 
      })
    );
    overlapRef.current.position.z = -0.1;
    
    currentGroup.add(circlesRef.current[0], circlesRef.current[1], overlapRef.current);

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
        
        addText('System', -0.5, 0.8, 0);
        addText('Env', 0.5, 0.8, 0);
      });
    }

    // Setup animation frame callback
    const intervalId = setInterval(() => {
      if (overlapRef.current) {
        animationRef.current.time += 0.05;
        overlapRef.current.material.opacity = 0.6 + 0.3 * Math.sin(animationRef.current.time);
      }
    }, 50);

    return () => {
      // Remove our group from the scene
      scene.remove(currentGroup);
      clearInterval(intervalId);
      
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
    if (!overlapRef.current || quantumData.entanglement === undefined) return;

    // Scale the overlap circle based on entanglement amount
    const entanglement = quantumData.entanglement;
    const scale = Math.min(entanglement, 1) * 0.6 / 0.3;
    
    overlapRef.current.scale.set(scale, scale, 1);
    overlapRef.current.visible = entanglement > 0.01;
  }, [quantumData]);

  return (
    <Box bg="gray.700" color="white" p={4} borderRadius="md" boxShadow="md" h="250px">
      <Heading size="sm" mb={2}>System-Environment Entanglement</Heading>
      {/* The actual Three.js content is now rendered via the central animation loop */}
    </Box>
  );
};

export default EntanglementPanel; 