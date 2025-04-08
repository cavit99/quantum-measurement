import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader'; 

const EntanglementPanel = ({ scene, camera, quantumData }) => {
  const circlesRef = useRef([null, null]);
  const overlapRef = useRef(null);
  const fontLoaded = useRef(false);
  const groupRef = useRef(new THREE.Group());
  const animationRef = useRef({ time: 0 });

  useEffect(() => {
    if (!scene || !camera) return;
    scene.add(groupRef.current);
    const currentGroup = groupRef.current;

    const circleGeom = new THREE.CircleGeometry(0.6, 32);
    circlesRef.current[0] = new THREE.Line(
      new THREE.EdgesGeometry(circleGeom),
      new THREE.LineBasicMaterial({ color: 0x0000ff })
    );
    circlesRef.current[1] = new THREE.Line(
      new THREE.EdgesGeometry(circleGeom),
      new THREE.LineBasicMaterial({ color: 0xff0000 })
    );
    circlesRef.current[0].position.x = -0.5;
    circlesRef.current[1].position.x = 0.5;
    overlapRef.current = new THREE.Mesh(
      circleGeom,
      new THREE.MeshBasicMaterial({ color: 0x800080, transparent: true, opacity: 0.6 })
    );
    overlapRef.current.position.z = -0.1;
    currentGroup.add(circlesRef.current[0], circlesRef.current[1], overlapRef.current);

    if (!fontLoaded.current) {
      const loader = new FontLoader(); // Use FontLoader directly
      loader.load('/helvetiker_regular.typeface.json', (font) => {
        fontLoaded.current = true;
        const textMat = new THREE.MeshBasicMaterial({ color: 0xeeeeee });
        const addText = (text, x, y, z) => {
          const textGeom = new THREE.TextGeometry(text, { font, size: 0.1, height: 0.01 });
          const mesh = new THREE.Mesh(textGeom, textMat);
          mesh.position.set(x, y, z);
          currentGroup.add(mesh);
        };
        addText('System', -0.5, 0.8, 0);
        addText('Env', 0.5, 0.8, 0);
      });
    }

    const intervalId = setInterval(() => {
      if (overlapRef.current) {
        animationRef.current.time += 0.05;
        overlapRef.current.material.opacity = 0.6 + 0.3 * Math.sin(animationRef.current.time);
      }
    }, 50);

    return () => {
      scene.remove(currentGroup);
      clearInterval(intervalId);
      currentGroup.traverse(child => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) child.material.dispose();
      });
    };
  }, [scene, camera]);

  useEffect(() => {
    if (!overlapRef.current || quantumData.entanglement === undefined) return;
    const entanglement = quantumData.entanglement;
    const scale = Math.min(entanglement, 1) * 0.6 / 0.3;
    overlapRef.current.scale.set(scale, scale, 1);
    overlapRef.current.visible = entanglement > 0.01;
  }, [quantumData]);

  return (
    <div className="bg-gray-700 text-white p-4 rounded-md shadow-md h-[250px]">
      <h2 className="text-sm font-semibold mb-2">System-Environment Entanglement</h2>
    </div>
  );
};

export default EntanglementPanel;