import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import * as math from 'mathjs';
import { Box, Heading } from '@chakra-ui/react';

const StatePanel = ({ renderer, quantumData }) => {
  const sceneRef = useRef(new THREE.Scene());
  const cameraRef = useRef(new THREE.PerspectiveCamera(45, 1, 0.1, 100));
  const vectorRef = useRef(null);
  const fontLoaded = useRef(false);

  useEffect(() => {
    if (!renderer) return;

    const scene = sceneRef.current;
    const camera = cameraRef.current;
    camera.position.set(0, 0, 2.5);

    // Create Bloch sphere
    const sphereGeom = new THREE.SphereGeometry(1, 32, 32);
    const sphereMat = new THREE.MeshBasicMaterial({ color: 0x333333, wireframe: true });
    const blochSphere = new THREE.Mesh(sphereGeom, sphereMat);
    scene.add(blochSphere);

    // Create state vector arrow
    vectorRef.current = new THREE.ArrowHelper(
      new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 0), 1, 0x00ff00, 0.1, 0.05
    );
    scene.add(vectorRef.current);

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
        
        addText('|0⟩', 0, 1.2, 0);
        addText('|1⟩', 0, -1.2, 0);
      });
    }

    // Animation loop
    const animate = () => {
      if (!renderer) return;
      
      // Set viewport and render
      renderer.setViewport(0, 400, 200, 200);
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
    if (!vectorRef.current || !quantumData.rho) return;

    // Update Bloch vector based on density matrix
    const rho = quantumData.rho;
    const x = 2 * math.re(rho.get([0, 1]));
    const y = 2 * math.im(rho.get([0, 1]));
    const z = math.re(rho.get([0, 0])) - math.re(rho.get([1, 1]));
    
    // Normalize and update direction (swap y/z for Bloch convention)
    const dir = new THREE.Vector3(x, z, y).normalize();
    
    // Calculate purity for vector length
    const purity = math.re(math.trace(math.multiply(rho, rho)));
    
    // Update arrow
    vectorRef.current.setDirection(dir);
    vectorRef.current.setLength(purity, 0.1 * purity, 0.05 * purity);
  }, [quantumData]);

  return (
    <Box bg="white" p={4} borderRadius="md" boxShadow="md">
      <Heading size="sm" mb={2}>System State (Bloch Sphere)</Heading>
      <Box h="200px" position="relative"></Box>
    </Box>
  );
};

export default StatePanel; 