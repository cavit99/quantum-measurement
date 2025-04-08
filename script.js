const STATE_SIZE = 200;
const DENSITY_SIZE = 200;
const OUTCOMES_SIZE = 200;
const ENTANGLEMENT_SIZE = 200;
const TEXT_COLOR = 0xeeeeee;
const math = window.math;

function normalizeState(state) {
    const norm = math.norm(state);
    return norm === 0 ? state : math.divide(state, norm);
}

function outerProduct(vec1, vec2 = null) {
    const v1 = math.matrix(vec1);
    const v2_conj_T = vec2 ? math.transpose(math.conj(math.matrix(vec2))) : math.transpose(math.conj(v1));
    return math.multiply(v1, v2_conj_T);
}

function partialTrace(rho, subsystemToTraceOut, dims = [2, 2]) {
    const dimA = dims[0], dimB = dims[1];
    const rhoData = rho.toArray();
    if (subsystemToTraceOut === 1) {
        const rhoReduced = math.zeros(dimA, dimA);
        for (let i = 0; i < dimA; i++)
            for (let j = 0; j < dimA; j++) {
                let sum = math.complex(0, 0);
                for (let k = 0; k < dimB; k++)
                    sum = math.add(sum, rhoData[i * dimB + k][j * dimB + k]);
                rhoReduced.set([i, j], sum);
            }
        return rhoReduced;
    } else {
        const rhoReduced = math.zeros(dimB, dimB);
        for (let i = 0; i < dimB; i++)
            for (let j = 0; j < dimB; j++) {
                let sum = math.complex(0, 0);
                for (let k = 0; k < dimA; k++)
                    sum = math.add(sum, rhoData[k * dimB + i][k * dimB + j]);
                rhoReduced.set([i, j], sum);
            }
        return rhoReduced;
    }
}

function calculateEntanglement(rho) {
    const rhoReduced = partialTrace(rho, 1, [2, 2]);
    try {
        const { values } = math.eigs(rhoReduced);
        let entropy = 0;
        values.forEach(val => {
            const p = Math.max(0, math.re(val));
            if (p > 1e-10) entropy -= p * Math.log2(p);
        });
        return entropy;
    } catch (e) {
        console.error("Eigenvalue error:", e);
        return 0;
    }
}

class QuantumMeasurementSimulator {
    constructor() {
        this.slider = document.getElementById('strengthSlider');
        this.strengthValueDisplay = document.getElementById('strengthValue');
        this.resetButton = document.getElementById('resetButton');
        this.infoTextElement = document.getElementById('info-text');

        if (!this.slider || !this.resetButton || !this.infoTextElement || !this.strengthValueDisplay) {
            console.error("UI elements missing!");
            return;
        }

        this.setupRendererAndScenes();
        this.initializeStates();
        this.loadFontAndAddLabels();

        this.slider.addEventListener('input', (e) => {
            const strength = parseFloat(e.target.value);
            this.strengthValueDisplay.textContent = strength.toFixed(2);
            this.update(strength);
        });
        this.resetButton.addEventListener('click', () => this.reset());
        this.update(parseFloat(this.slider.value));
        this.animate();
    }

    setupRendererAndScenes() {
        // Single renderer with viewports
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(this.renderer.domElement);

        // Scenes and Cameras
        this.stateScene = new THREE.Scene();
        this.stateCamera = new THREE.PerspectiveCamera(45, STATE_SIZE / STATE_SIZE, 0.1, 100);
        this.stateCamera.position.set(0, 0, 2.5);

        this.densityScene = new THREE.Scene();
        this.densityCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
        this.densityCamera.position.z = 5;

        this.outcomesScene = new THREE.Scene();
        this.outcomesCamera = new THREE.OrthographicCamera(-1.2, 1.2, 1.2, -1.2, 0.1, 100);
        this.outcomesCamera.position.z = 5;

        this.entanglementScene = new THREE.Scene();
        this.entanglementCamera = new THREE.OrthographicCamera(-1.5, 1.5, 1.5, -1.5, 0.1, 100);
        this.entanglementCamera.position.z = 5;

        // Setup Visualizations
        this.setupStateVisualization();
        this.setupDensityVisualization();
        this.setupOutcomesVisualization();
        this.setupEntanglementVisualization();
    }

    setupStateVisualization() {
        // Bloch Sphere
        const sphereGeom = new THREE.SphereGeometry(1, 32, 32);
        const sphereMat = new THREE.MeshBasicMaterial({ color: 0x333333, wireframe: true });
        this.blochSphere = new THREE.Mesh(sphereGeom, sphereMat);
        this.stateScene.add(this.blochSphere);

        this.stateVector = new THREE.ArrowHelper(
            new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 0), 1, 0x00ff00, 0.1, 0.05
        );
        this.stateScene.add(this.stateVector);
    }

    setupDensityVisualization() {
        this.densityCanvas = document.createElement('canvas');
        this.densityCanvas.width = 64;
        this.densityCanvas.height = 64;
        this.densityCtx = this.densityCanvas.getContext('2d');
        this.densityTexture = new THREE.CanvasTexture(this.densityCanvas);
        const densityMat = new THREE.MeshBasicMaterial({ map: this.densityTexture, side: THREE.DoubleSide });
        const densityGeom = new THREE.PlaneGeometry(2, 2);
        this.densityPlane = new THREE.Mesh(densityGeom, densityMat);
        this.densityScene.add(this.densityPlane);

        // Grid lines
        const gridGeom = new THREE.EdgesGeometry(densityGeom);
        const gridLine = new THREE.LineSegments(gridGeom, new THREE.LineBasicMaterial({ color: 0xaaaaaa }));
        this.densityScene.add(gridLine);
    }

    setupOutcomesVisualization() {
        const barGeom = new THREE.BoxGeometry(0.6, 1, 0.1);
        this.bar0 = new THREE.Mesh(barGeom, new THREE.MeshBasicMaterial({ color: 0x4444ff }));
        this.bar1 = new THREE.Mesh(barGeom, new THREE.MeshBasicMaterial({ color: 0xff4444 }));
        this.bar0.position.x = -0.5;
        this.bar1.position.x = 0.5;
        this.outcomesScene.add(this.bar0, this.bar1);
    }

    setupEntanglementVisualization() {
        const circleGeom = new THREE.CircleGeometry(0.6, 32);
        this.entCircle1 = new THREE.Line(new THREE.EdgesGeometry(circleGeom), new THREE.LineBasicMaterial({ color: 0x0000ff }));
        this.entCircle2 = new THREE.Line(new THREE.EdgesGeometry(circleGeom), new THREE.LineBasicMaterial({ color: 0xff0000 }));
        this.entCircle1.position.x = -0.5;
        this.entCircle2.position.x = 0.5;
        this.overlapCircle = new THREE.Mesh(circleGeom, new THREE.MeshBasicMaterial({ color: 0x800080, transparent: true, opacity: 0.6 }));
        this.overlapCircle.position.z = -0.1;
        this.entanglementScene.add(this.entCircle1, this.entCircle2, this.overlapCircle);
    }

    loadFontAndAddLabels() {
        const loader = new THREE.FontLoader();
        loader.load('https://threejs.org/examples/fonts/helvetiker_regular.typeface.json', (font) => {
            const textMat = new THREE.MeshBasicMaterial({ color: TEXT_COLOR });
            const addText = (scene, text, x, y, z, size = 0.1) => {
                const geom = new THREE.TextGeometry(text, { font, size, height: 0.01 });
                const mesh = new THREE.Mesh(geom, textMat);
                mesh.position.set(x, y, z);
                scene.add(mesh);
            };
            addText(this.stateScene, '|0⟩', 0, 1.2, 0);
            addText(this.stateScene, '|1⟩', 0, -1.2, 0);
            addText(this.densityScene, '|0⟩⟐0|', -0.5, 0.8, 0);
            addText(this.densityScene, '|1⟩⟐1|', 0.5, 0.8, 0);
            addText(this.outcomesScene, '|0⟩', -0.5, -1.2, 0);
            addText(this.outcomesScene, '|1⟩', 0.5, -1.2, 0);
            addText(this.entanglementScene, 'System', -0.5, 0.8, 0);
            addText(this.entanglementScene, 'Env', 0.5, 0.8, 0);
        });
    }

    initializeStates() {
        this.alpha = math.sqrt(0.3);
        this.beta = math.sqrt(0.7);
        this.psi_system = math.matrix([[this.alpha], [this.beta]], 'dense');
        this.psi_env = math.matrix([[1], [0]], 'dense');
        this.psi_total = math.kron(this.psi_system, this.psi_env);
        this.rho_initial = outerProduct(this.psi_total);
        this.U_measure = math.matrix([[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 0, 1], [0, 0, 1, 0]], 'dense');
        this.identity4 = math.identity(4, 4);
    }

    applyInteraction(rho, strength) {
        const U_diff = math.subtract(this.U_measure, this.identity4);
        const U_int = math.add(this.identity4, math.multiply(U_diff, strength));
        const U_dagger = math.transpose(math.conj(U_int));
        let rho_after = math.multiply(math.multiply(U_int, rho), U_dagger);
        const traceVal = math.trace(rho_after);
        if (Math.abs(math.re(traceVal) - 1) > 1e-6) rho_after = math.divide(rho_after, traceVal);
        return rho_after;
    }

    update(strength) {
        const rho_after = this.applyInteraction(this.rho_initial, strength);
        const rho_system_after = partialTrace(rho_after, 1, [2, 2]);
        const diag = math.diag(rho_system_after).toArray();
        const probs = diag.map(d => math.re(d));
        const entanglement = calculateEntanglement(rho_after);

        this.updateStateVisualization(rho_system_after);
        this.updateDensityMatrix(rho_system_after);
        this.updateOutcomes(probs);
        this.updateEntanglementVisualization(entanglement);
        this.updateInformationPanel(strength, entanglement, probs);
    }

    updateStateVisualization(rho) {
        // Bloch vector for mixed state (simplified)
        const x = 2 * math.re(rho.get([0, 1]));
        const y = 2 * math.im(rho.get([0, 1]));
        const z = math.re(rho.get([0, 0])) - math.re(rho.get([1, 1]));
        const dir = new THREE.Vector3(x, z, y).normalize(); // Swap y/z for Bloch convention
        const purity = math.re(math.trace(math.multiply(rho, rho)));
        this.stateVector.setDirection(dir);
        this.stateVector.setLength(purity, 0.1 * purity, 0.05 * purity);
    }

    updateDensityMatrix(rho) {
        const ctx = this.densityCtx, size = this.densityCanvas.width;
        const rhoData = rho.toArray();
        const maxMag = Math.max(...rhoData.flat().map(c => math.abs(c))) || 1;
        ctx.clearRect(0, 0, size, size);
        for (let i = 0; i < 2; i++)
            for (let j = 0; j < 2; j++) {
                const mag = math.abs(rhoData[i][j]) / maxMag;
                ctx.fillStyle = `rgb(${Math.floor(mag * 255)}, ${Math.floor(mag * 100)}, ${Math.floor(mag * 200)})`;
                ctx.fillRect(j * size / 2, i * size / 2, size / 2, size / 2);
            }
        this.densityTexture.needsUpdate = true;
    }

    updateOutcomes(probs) {
        const maxHeight = 2;
        this.bar0.scale.y = probs[0] * maxHeight;
        this.bar1.scale.y = probs[1] * maxHeight;
        this.bar0.position.y = (probs[0] * maxHeight / 2) - 1;
        this.bar1.position.y = (probs[1] * maxHeight / 2) - 1;
    }

    updateEntanglementVisualization(entanglement) {
        const scale = Math.min(entanglement, 1) * 0.6 / 0.3;
        this.overlapCircle.scale.set(scale, scale, 1);
        this.overlapCircle.visible = entanglement > 0.01;
        this.overlapCircle.material.opacity = 0.6 + 0.3 * Math.sin(Date.now() * 0.001); // Pulse
    }

    updateInformationPanel(strength, entanglement, probs) {
        const info = strength < 0.3 ?
            `Weak Interaction: The particle is barely entangled with its environment. It stays in superposition because the interaction isn’t strong enough to "record" its state. Everyday bumps (air, radiation) are like this—they don’t force a definite state.` :
            strength < 0.7 ?
            `Moderate Interaction: Entanglement grows, and the superposition starts to fade. The environment is "noticing" the particle, but not fully. This is partial decoherence—not a sudden change.` :
            `Strong Interaction: The particle and environment are highly entangled. Superposition is lost, and it acts like a classical object with definite outcomes. This is what we call "measurement"—no human needed!`;

        this.infoTextElement.textContent = `
${info}

Strength: ${strength.toFixed(2)}
Entanglement: ${entanglement.toFixed(3)} bits
Probabilities: |0⟩: ${probs[0].toFixed(3)}, |1⟩: ${probs[1].toFixed(3)}

Why Does This Happen?
- Measurement isn’t about humans looking—it’s about entanglement with the environment creating a stable record.
- Particles can stay in superposition despite constant small interactions (e.g., air molecules) if they don’t entangle strongly.
- A "measurement" is just a strong interaction that decoheres the system, making outcomes definite without any mysterious "collapse."
        `.trim();
    }

    reset() {
        const initialStrength = 0.5;
        this.slider.value = initialStrength;
        this.strengthValueDisplay.textContent = initialStrength.toFixed(2);
        this.initializeStates();
        this.update(initialStrength);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        this.renderer.setViewport(0, 400, STATE_SIZE, STATE_SIZE);
        this.renderer.render(this.stateScene, this.stateCamera);
        this.renderer.setViewport(350, 400, DENSITY_SIZE, DENSITY_SIZE);
        this.renderer.render(this.densityScene, this.densityCamera);
        this.renderer.setViewport(700, 400, OUTCOMES_SIZE, OUTCOMES_SIZE);
        this.renderer.render(this.outcomesScene, this.outcomesCamera);
        this.renderer.setViewport(1050, 400, ENTANGLEMENT_SIZE, ENTANGLEMENT_SIZE);
        this.renderer.render(this.entanglementScene, this.entanglementCamera);
    }
}

window.addEventListener('DOMContentLoaded', () => new QuantumMeasurementSimulator());