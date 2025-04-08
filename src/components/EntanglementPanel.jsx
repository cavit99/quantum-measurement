import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { Box, Heading } from '@chakra-ui/react';

const EntanglementPanel = ({ renderer, quantumData }) => {
  const sceneRef = useRef(new THREE.Scene());
  const cameraRef = useRef(new THREE.OrthographicCamera(-1.5, 1.5, 1.5, -1.5, 0.1, 100));
  const circlesRef = useRef([null, null]);
  const overlapRef = useRef(null);
  const fontLoaded = useRef(false);

  useEffect(() => {
    if (!renderer) return;

    const scene = sceneRef.current;
    const camera = cameraRef.current;
    camera.position.z = 5;

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
    
    scene.add(circlesRef.current[0], circlesRef.current[1], overlapRef.current);

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
        
        addText('System', -0.5, 0.8, 0);
        addText('Env', 0.5, 0.8, 0);
      });
    }

    // Animation loop with pulsing effect
    const animate = () => {
      if (!renderer || !overlapRef.current) return;
      
      // Pulse the overlap circle
      overlapRef.current.material.opacity = 0.6 + 0.3 * Math.sin(Date.now() * 0.001);
      
      // Set viewport and render
      renderer.setViewport(1050, 400, 200, 200);
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
    if (!overlapRef.current || quantumData.entanglement === undefined) return;

    // Scale the overlap circle based on entanglement amount
    const entanglement = quantumData.entanglement;
    const scale = Math.min(entanglement, 1) * 0.6 / 0.3;
    
    overlapRef.current.scale.set(scale, scale, 1);
    overlapRef.current.visible = entanglement > 0.01;
  }, [quantumData]);

  return (
    <Box bg="white" p={4} borderRadius="md" boxShadow="md">
      <Heading size="sm" mb={2}>System-Environment Entanglement</Heading>
      <Box h="200px" position="relative"></Box>
    </Box>
  );
};

export default EntanglementPanel; 