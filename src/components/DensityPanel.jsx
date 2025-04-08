import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import * as math from 'mathjs';

const DensityPanel = ({ scene, camera, quantumData }) => {
  const canvasRef = useRef(document.createElement('canvas'));
  const textureRef = useRef(null);
  const fontLoaded = useRef(false);
  const groupRef = useRef(new THREE.Group());

  useEffect(() => {
    if (!scene || !camera) return;
    scene.add(groupRef.current);
    const currentGroup = groupRef.current;

    const canvas = canvasRef.current;
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    textureRef.current = new THREE.CanvasTexture(canvas);
    const densityMat = new THREE.MeshBasicMaterial({ map: textureRef.current, side: THREE.DoubleSide });
    const densityGeom = new THREE.PlaneGeometry(2, 2);
    const densityPlane = new THREE.Mesh(densityGeom, densityMat);
    currentGroup.add(densityPlane);

    const gridGeom = new THREE.EdgesGeometry(densityGeom);
    const gridLine = new THREE.LineSegments(gridGeom, new THREE.LineBasicMaterial({ color: 0xaaaaaa }));
    currentGroup.add(gridLine);

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
        addText('|0⟩⟐0|', -0.5, 0.8, 0);
        addText('|1⟩⟐1|', 0.5, 0.8, 0);
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
    if (!textureRef.current || !quantumData.rho) return;
    const rho = quantumData.rho;
    const ctx = canvasRef.current.getContext('2d');
    const size = canvasRef.current.width;
    const rhoData = rho.toArray();
    const maxMag = Math.max(...rhoData.flat().map(c => math.abs(c))) || 1;
    ctx.clearRect(0, 0, size, size);
    for (let i = 0; i < 2; i++) {
      for (let j = 0; j < 2; j++) {
        const mag = math.abs(rhoData[i][j]) / maxMag;
        ctx.fillStyle = `rgb(${Math.floor(mag * 255)}, ${Math.floor(mag * 100)}, ${Math.floor(mag * 200)})`;
        ctx.fillRect(j * size / 2, i * size / 2, size / 2, size / 2);
      }
    }
    textureRef.current.needsUpdate = true;
  }, [quantumData]);

  return (
    <div className="bg-gray-700 text-white p-4 rounded-md shadow-md h-[250px]">
      <h2 className="text-sm font-semibold mb-2">Density Matrix</h2>
    </div>
  );
};

export default DensityPanel;