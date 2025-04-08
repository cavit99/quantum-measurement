import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { Box, Heading } from '@chakra-ui/react';

const DensityPanel = ({ renderer, quantumData }) => {
  const mountRef = useRef(null);
  const sceneRef = useRef(new THREE.Scene());
  const cameraRef = useRef(new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100));
  const textureRef = useRef(null);

  useEffect(() => {
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    camera.position.z = 5;

    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    textureRef.current = new THREE.CanvasTexture(canvas);
    const mat = new THREE.MeshBasicMaterial({ map: textureRef.current, side: THREE.DoubleSide });
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
    scene.add(plane);

    const grid = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.PlaneGeometry(2, 2)),
      new THREE.LineBasicMaterial({ color: 0xaaaaaa })
    );
    scene.add(grid);

    const animate = () => {
      requestAnimationFrame(animate);
      renderer.setViewport(250, 400, 200, 200);
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      scene.clear();
      renderer.setViewport(0, 0, 0, 0);
    };
  }, [renderer]);

  useEffect(() => {
    if (quantumData.rho) {
      const rho = quantumData.rho;
      const ctx = textureRef.current.image.getContext('2d');
      const size = 64;
      const rhoData = rho.toArray();
      const maxMag = Math.max(...rhoData.flat().map(c => math.abs(c))) || 1;
      ctx.clearRect(0, 0, size, size);
      for (let i = 0; i < 2; i++)
        for (let j = 0; j < 2; j++) {
          const mag = math.abs(rhoData[i][j]) / maxMag;
          ctx.fillStyle = `rgb(${Math.floor(mag * 255)}, ${Math.floor(mag * 100)}, ${Math.floor(mag * 200)})`;
          ctx.fillRect(j * size / 2, i * size / 2, size / 2, size / 2);
        }
      textureRef.current.needsUpdate = true;
    }
  }, [quantumData]);

  return (
    <Box bg="white" p={4} borderRadius="md" boxShadow="md">
      <Heading size="sm" mb={2}>Density Matrix</Heading>
      <Box ref={mountRef} w="200px" h="200px" />
    </Box>
  );
};

export default DensityPanel;