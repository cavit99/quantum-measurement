import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import * as math from 'mathjs';

const StatePanel = ({ scene, camera, quantumData }) => {
  const vectorRef = useRef(null);
  const fontLoaded = useRef(false);
  const groupRef = useRef(new THREE.Group());

  useEffect(() => {
    if (!scene || !camera) return;
    scene.add(groupRef.current);
    const currentGroup = groupRef.current;

    const sphereGeom = new THREE.SphereGeometry(1, 32, 32);
    const sphereMat = new THREE.MeshBasicMaterial({ color: 0x333333, wireframe: true });
    const blochSphere = new THREE.Mesh(sphereGeom, sphereMat);
    currentGroup.add(blochSphere);

    vectorRef.current = new THREE.ArrowHelper(
      new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 0), 1, 0x00ff00, 0.1, 0.05
    );
    currentGroup.add(vectorRef.current);

    if (!fontLoaded.current) {
      const loader = new THREE.FontLoader();
      loader.load('/helvetiker_regular.typeface.json', (font) => {
        fontLoaded.current = true;
        const textMat = new THREE.MeshBasicMaterial({ color: 0xeeeeee });
        const addText = (text, x, y, z) => {
          const textGeom = new THREE.TextGeometry(text, { font, size: 0.1, height: 0.01 });
          const mesh = new THREE.Mesh(textGeom, textMat);
          mesh.position.set(x, y, z);
          currentGroup.add(mesh);
        };
        addText('|0⟩', 0, 1.2, 0);
        addText('|1⟩', 0, -1.2, 0);
      });
    }

    return () => {
      scene.remove(currentGroup);
      currentGroup.traverse(child => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) child.material.dispose();
      });
    };
  }, [scene, camera]);

  useEffect(() => {
    if (!vectorRef.current || !quantumData.rho) return;
    const rho = quantumData.rho;
    const x = 2 * math.re(rho.get([0, 1]));
    const y = 2 * math.im(rho.get([0, 1]));
    const z = math.re(rho.get([0, 0])) - math.re(rho.get([1, 1]));
    const dir = new THREE.Vector3(x, z, y);
    const len = dir.length();
    dir.normalize();
    const purity = len > 1e-9 ? len : math.re(math.trace(math.multiply(rho, rho)));
    vectorRef.current.setDirection(dir);
    vectorRef.current.setLength(purity, 0.1 * purity, 0.05 * purity);
  }, [quantumData]);

  return (
    <div className="bg-gray-700 text-white p-4 rounded-md shadow-md h-[250px]">
      <h2 className="text-sm font-semibold mb-2">System State (Bloch Sphere)</h2>
    </div>
  );
};

export default StatePanel;