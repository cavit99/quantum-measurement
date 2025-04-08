import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import * as math from 'mathjs';
import { Box, Heading } from '@chakra-ui/react';

const DensityPanel = ({ renderer, quantumData }) => {
  const sceneRef = useRef(new THREE.Scene());
  const cameraRef = useRef(new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100));
  const canvasRef = useRef(document.createElement('canvas'));
  const textureRef = useRef(null);
  const fontLoaded = useRef(false);

  useEffect(() => {
    if (!renderer) return;

    const scene = sceneRef.current;
    const camera = cameraRef.current;
    camera.position.z = 5;

    // Setup canvas for texture
    const canvas = canvasRef.current;
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    
    // Create texture
    textureRef.current = new THREE.CanvasTexture(canvas);
    const densityMat = new THREE.MeshBasicMaterial({ 
      map: textureRef.current, 
      side: THREE.DoubleSide 
    });
    
    // Create plane for density matrix visualization
    const densityGeom = new THREE.PlaneGeometry(2, 2);
    const densityPlane = new THREE.Mesh(densityGeom, densityMat);
    scene.add(densityPlane);

    // Add grid lines
    const gridGeom = new THREE.EdgesGeometry(densityGeom);
    const gridLine = new THREE.LineSegments(
      gridGeom, 
      new THREE.LineBasicMaterial({ color: 0xaaaaaa })
    );
    scene.add(gridLine);

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
        
        addText('|0⟩⟐0|', -0.5, 0.8, 0);
        addText('|1⟩⟐1|', 0.5, 0.8, 0);
      });
    }

    // Animation loop
    const animate = () => {
      if (!renderer) return;
      
      // Set viewport and render
      renderer.setViewport(350, 400, 200, 200);
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
    if (!textureRef.current || !quantumData.rho) return;

    const rho = quantumData.rho;
    const ctx = canvasRef.current.getContext('2d');
    const size = canvasRef.current.width;
    
    // Get matrix data and find maximum magnitude for normalization
    const rhoData = rho.toArray();
    const maxMag = Math.max(
      ...rhoData.flat().map(c => math.abs(c))
    ) || 1;
    
    // Clear canvas
    ctx.clearRect(0, 0, size, size);
    
    // Draw matrix elements
    for (let i = 0; i < 2; i++) {
      for (let j = 0; j < 2; j++) {
        const mag = math.abs(rhoData[i][j]) / maxMag;
        ctx.fillStyle = `rgb(${Math.floor(mag * 255)}, ${Math.floor(mag * 100)}, ${Math.floor(mag * 200)})`;
        ctx.fillRect(j * size / 2, i * size / 2, size / 2, size / 2);
      }
    }
    
    // Update texture
    textureRef.current.needsUpdate = true;
  }, [quantumData]);

  return (
    <Box bg="white" p={4} borderRadius="md" boxShadow="md">
      <Heading size="sm" mb={2}>Density Matrix</Heading>
      <Box h="200px" position="relative"></Box>
    </Box>
  );
};

export default DensityPanel; 