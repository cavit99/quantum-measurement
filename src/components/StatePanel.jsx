import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry';
import { Box, Heading } from '@chakra-ui/react';

const StatePanel = ({ renderer, quantumData }) => {
  const mountRef = useRef(null);
  const sceneRef = useRef(new THREE.Scene());
  const cameraRef = useRef(new THREE.PerspectiveCamera(45, 1, 0.1, 100));
  const vectorRef = useRef(null);

  useEffect(() => {
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    camera.position.set(0, 0, 2.5);

    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(1, 32, 32),
      new THREE.MeshBasicMaterial({ color: 0x333333, wireframe: true })
    );
    scene.add(sphere);

    vectorRef.current = new THREE.ArrowHelper(
      new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 0), 1, 0x00ff00, 0.1, 0.05
    );
    scene.add(vectorRef.current);

    const loader = new FontLoader();
    loader.load('/helvetiker_regular.typeface.json', (font) => {
      const textMat = new THREE.MeshBasicMaterial({ color: 0xeeeeee });
      const addText = (text, x, y, z) => {
        const geom = new TextGeometry(text, { font, size: 0.1, height: 0.01 });
        const mesh = new THREE.Mesh(geom, textMat);
        mesh.position.set(x, y, z);
        scene.add(mesh);
      };
      addText('|0⟩', 0, 1.2, 0);
      addText('|1⟩', 0, -1.2, 0);
    }, undefined, (error) => {
      console.error('Font loading failed:', error);
    });

    const animate = () => {
      requestAnimationFrame(animate);
      renderer.setViewport(0, 400, 200, 200);
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      scene.clear();
      renderer.setViewport(0, 0, 0, 0); // Clear viewport to avoid overlap
    };
  }, [renderer]);

  useEffect(() => {
    if (quantumData.rho) {
      const rho = quantumData.rho;
      const x = 2 * math.re(rho.get([0, 1]));
      const y = 2 * math.im(rho.get([0, 1]));
      const z = math.re(rho.get([0, 0])) - math.re(rho.get([1, 1]));
      const dir = new THREE.Vector3(x, z, y).normalize();
      const purity = math.re(math.trace(math.multiply(rho, rho)));
      vectorRef.current.setDirection(dir);
      vectorRef.current.setLength(purity, 0.1 * purity, 0.05 * purity);
    }
  }, [quantumData]);

  return (
    <Box bg="white" p={4} borderRadius="md" boxShadow="md">
      <Heading size="sm" mb={2}>System State (Bloch Sphere)</Heading>
      <Box ref={mountRef} w="200px" h="200px" />
    </Box>
  );
};

export default StatePanel;