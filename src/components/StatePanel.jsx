import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import * as math from 'mathjs';
import { Box, Heading } from '@chakra-ui/react';

const StatePanel = ({ scene, camera, quantumData }) => {
  const vectorRef = useRef(null);
  const fontLoaded = useRef(false);
  const groupRef = useRef(new THREE.Group());

  useEffect(() => {
    // Exit if scene or camera aren't available
    if (!scene || !camera) return;
    
    // Add our group to the scene
    scene.add(groupRef.current);
    const currentGroup = groupRef.current;

    // Create Bloch sphere
    const sphereGeom = new THREE.SphereGeometry(1, 32, 32);
    const sphereMat = new THREE.MeshBasicMaterial({ color: 0x333333, wireframe: true });
    const blochSphere = new THREE.Mesh(sphereGeom, sphereMat);
    currentGroup.add(blochSphere);

    // Create state vector arrow
    vectorRef.current = new THREE.ArrowHelper(
      new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 0), 1, 0x00ff00, 0.1, 0.05
    );
    currentGroup.add(vectorRef.current);

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
        
        addText('|0⟩', 0, 1.2, 0);
        addText('|1⟩', 0, -1.2, 0);
      });
    }

    // Clean up
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
    if (!vectorRef.current || !quantumData.rho) return;

    // Update Bloch vector based on density matrix
    const rho = quantumData.rho;
    const x = 2 * math.re(rho.get([0, 1]));
    const y = 2 * math.im(rho.get([0, 1]));
    const z = math.re(rho.get([0, 0])) - math.re(rho.get([1, 1]));
    
    // Create direction vector
    const dir = new THREE.Vector3(x, z, y); // Swap y/z for Bloch convention
    const len = dir.length();
    dir.normalize(); // Always normalize direction
    
    // Calculate purity for vector length
    const purity = len > 1e-9 ? len : math.re(math.trace(math.multiply(rho, rho)));
    
    // Update arrow
    vectorRef.current.setDirection(dir);
    vectorRef.current.setLength(purity, 0.1 * purity, 0.05 * purity);
  }, [quantumData]);

  return (
    <Box bg="gray.700" color="white" p={4} borderRadius="md" boxShadow="md" h="250px">
      <Heading size="sm" mb={2}>System State (Bloch Sphere)</Heading>
      {/* The actual Three.js content is now rendered via the central animation loop */}
    </Box>
  );
};

export default StatePanel; 