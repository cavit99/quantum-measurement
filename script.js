// --- Configuration ---
const STATE_SIZE = 200;
const DENSITY_SIZE = 200;
const OUTCOMES_SIZE = 200;
const ENTANGLEMENT_SIZE = 200;
const TEXT_COLOR = 0xeeeeee; // Light color for text on density matrix

// --- Math.js Setup ---
// Access math.js from the global scope
const math = window.mathjs || window.math;

// --- Quantum Helper Functions ---

function normalizeState(state) {
    const norm = math.norm(state);
    if (norm === 0) return state;
    return math.divide(state, norm);
}

function outerProduct(vec1, vec2 = null) {
    const v1 = math.matrix(vec1);
    const v2_conj_T = vec2 ? math.transpose(math.conj(math.matrix(vec2))) : math.transpose(math.conj(v1));
    return math.multiply(v1, v2_conj_T);
}

// Partial Trace Implementation (for 2-qubit system)
// Traces out the specified subsystem (0 for first qubit, 1 for second qubit)
// Assumes dims = [dimA, dimB]
function partialTrace(rho, subsystemToTraceOut, dims = [2, 2]) {
    const dimA = dims[0];
    const dimB = dims[1];
    const rhoData = rho.toArray(); // Get array data

    if (subsystemToTraceOut === 1) { // Trace out system B (environment)
        const rhoReduced = math.zeros(dimA, dimA);
        for (let i = 0; i < dimA; i++) {
            for (let j = 0; j < dimA; j++) {
                let sum = math.complex(0, 0);
                for (let k = 0; k < dimB; k++) {
                    sum = math.add(sum, rhoData[i * dimB + k][j * dimB + k]);
                }
                rhoReduced.set([i, j], sum);
            }
        }
        return rhoReduced;
    } else { // Trace out system A (system)
         const rhoReduced = math.zeros(dimB, dimB);
        for (let i = 0; i < dimB; i++) {
            for (let j = 0; j < dimB; j++) {
                let sum = math.complex(0, 0);
                for (let k = 0; k < dimA; k++) {
                    sum = math.add(sum, rhoData[k * dimB + i][k * dimB + j]);
                }
                 rhoReduced.set([i, j], sum);
            }
        }
        return rhoReduced;
    }
}


function calculateEntanglement(rho) { // von Neumann entropy
    const rhoReduced = partialTrace(rho, 1, [2, 2]); // Trace out environment
    try {
        const { values: eigenvalues } = math.eigs(rhoReduced); // Get eigenvalues
        let entropy = 0;
        eigenvalues.forEach(val => {
            // Handle potential small negative values due to numerical precision
            const p = Math.max(0, math.re(val)); // Use real part, ensure non-negative
            if (p > 1e-10) { // Avoid log(0)
                entropy -= p * Math.log2(p);
            }
        });
        return entropy;
    } catch (error) {
        console.error("Eigenvalue calculation failed:", error);
        return 0; // Return 0 entropy if calculation fails
    }
}

// --- Three.js Setup Function ---
function setupThreeScene(containerId, width, height) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error("Container not found:", containerId);
        return null;
    }

    const scene = new THREE.Scene();
    // Use OrthographicCamera for 2D-like visualizations
    const aspect = width / height;
    const viewSize = 2.5; // Controls the visible area size
    const camera = new THREE.OrthographicCamera(
        -viewSize * aspect / 2, viewSize * aspect / 2,
        viewSize / 2, -viewSize / 2,
        0.1, 100
    );
    camera.position.z = 5;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setClearColor(0xffffff, 0); // Transparent background
    container.appendChild(renderer.domElement);

    // Handle resize
     const resizeObserver = new ResizeObserver(entries => {
        for (let entry of entries) {
            const { width, height } = entry.contentRect;
            renderer.setSize(width, height);
            const aspect = width / height;
            camera.left = -viewSize * aspect / 2;
            camera.right = viewSize * aspect / 2;
            camera.top = viewSize / 2;
            camera.bottom = -viewSize / 2;
            camera.updateProjectionMatrix();
        }
    });
    resizeObserver.observe(container);


    return { scene, camera, renderer, container };
}


// --- Simulation Class ---
class QuantumMeasurementSimulator {
    constructor() {
        this.slider = document.getElementById('strengthSlider');
        this.strengthValueDisplay = document.getElementById('strengthValue');
        this.resetButton = document.getElementById('resetButton');
        this.infoTextElement = document.getElementById('info-text');

        if (!this.slider || !this.resetButton || !this.infoTextElement || !this.strengthValueDisplay) {
            console.error("UI elements not found!");
            return;
        }

        this.setupVisualizations();
        this.initializeStates();

        this.slider.addEventListener('input', (e) => {
            const strength = parseFloat(e.target.value);
            this.strengthValueDisplay.textContent = strength.toFixed(2);
            this.update(strength);
        });
        this.resetButton.addEventListener('click', () => this.reset());

        this.update(parseFloat(this.slider.value)); // Initial update
        this.animate(); // Start animation loop
    }

    setupVisualizations() {
        // State Visualization
        const stateVis = setupThreeScene('state-canvas-container', STATE_SIZE, STATE_SIZE);
        this.stateScene = stateVis.scene;
        this.stateCamera = stateVis.camera;
        this.stateRenderer = stateVis.renderer;
        this.stateContainer = stateVis.container;

        const circleGeom = new THREE.CircleGeometry(1, 64);
        const circleEdges = new THREE.EdgesGeometry(circleGeom);
        const circleLine = new THREE.LineSegments(circleEdges, new THREE.LineBasicMaterial({ color: 0xaaaaaa }));
        this.stateScene.add(circleLine);
        this.stateVector = new THREE.ArrowHelper(
            new THREE.Vector3(1, 0, 0), // Initial direction
            new THREE.Vector3(0, 0, 0), // Origin
            1, // Length
            0x0000ff, // Color
            0.1, // Head length
            0.05 // Head width
        );
        this.stateScene.add(this.stateVector);
        // Add basis labels (|0>, |1>) using TextGeometry if FontLoader is included
        // Or use HTML overlays for simplicity


        // Density Matrix Visualization
        this.densityCanvas = document.createElement('canvas');
        this.densityCanvas.width = 64; // Texture size (power of 2 often good)
        this.densityCanvas.height = 64;
        this.densityCtx = this.densityCanvas.getContext('2d');
        const densityVis = setupThreeScene('density-canvas-container', DENSITY_SIZE, DENSITY_SIZE);
        this.densityScene = densityVis.scene;
        this.densityCamera = densityVis.camera;
        this.densityRenderer = densityVis.renderer;
        this.densityContainer = densityVis.container;

        this.densityTexture = new THREE.CanvasTexture(this.densityCanvas);
        const densityMaterial = new THREE.MeshBasicMaterial({ map: this.densityTexture, side: THREE.DoubleSide });
        const densityGeometry = new THREE.PlaneGeometry(2, 2); // Square plane
        this.densityPlane = new THREE.Mesh(densityGeometry, densityMaterial);
        this.densityScene.add(this.densityPlane);
        // Add text labels for matrix elements (can be tricky with Ortho camera, consider HTML overlay)


        // Measurement Outcomes Visualization
        const outcomesVis = setupThreeScene('outcomes-canvas-container', OUTCOMES_SIZE, OUTCOMES_SIZE);
        this.outcomesScene = outcomesVis.scene;
        this.outcomesCamera = outcomesVis.camera;
        this.outcomesRenderer = outcomesVis.renderer;
        this.outcomesContainer = outcomesVis.container;
        // Adjust camera for bars
        this.outcomesCamera.left = -1.2; this.outcomesCamera.right = 1.2;
        this.outcomesCamera.top = 1.2; this.outcomesCamera.bottom = -1.2;
        this.outcomesCamera.updateProjectionMatrix();


        const barWidth = 0.6;
        const barGeom = new THREE.BoxGeometry(barWidth, 1, 0.1); // Height will be scaled
        this.bar0 = new THREE.Mesh(barGeom, new THREE.MeshBasicMaterial({ color: 0x4444ff }));
        this.bar1 = new THREE.Mesh(barGeom, new THREE.MeshBasicMaterial({ color: 0xff4444 }));
        this.bar0.position.x = -0.5;
        this.bar1.position.x = 0.5;
        this.outcomesScene.add(this.bar0);
        this.outcomesScene.add(this.bar1);
        // Add labels |0>, |1> below bars (again, TextGeometry or HTML)


        // Entanglement Visualization
        const entanglementVis = setupThreeScene('entanglement-canvas-container', ENTANGLEMENT_SIZE, ENTANGLEMENT_SIZE);
        this.entanglementScene = entanglementVis.scene;
        this.entanglementCamera = entanglementVis.camera;
        this.entanglementRenderer = entanglementVis.renderer;
        this.entanglementContainer = entanglementVis.container;

        const circleRadius = 0.6;
        const circleMaterial = new THREE.LineBasicMaterial({ color: 0x555555 });
        const circleShape = new THREE.Shape();
        circleShape.absarc(0, 0, circleRadius, 0, Math.PI * 2, false);
        const circlePoints = circleShape.getPoints(50);
        const circleGeomEnt = new THREE.BufferGeometry().setFromPoints(circlePoints);

        this.entCircle1 = new THREE.Line(circleGeomEnt, new THREE.LineBasicMaterial({ color: 0x0000ff }));
        this.entCircle2 = new THREE.Line(circleGeomEnt, new THREE.LineBasicMaterial({ color: 0xff0000 }));
        this.entCircle1.position.x = -0.5;
        this.entCircle2.position.x = 0.5;
        this.entanglementScene.add(this.entCircle1);
        this.entanglementScene.add(this.entCircle2);

        const overlapGeom = new THREE.CircleGeometry(0.3, 32); // Radius will be scaled
        this.overlapCircle = new THREE.Mesh(overlapGeom, new THREE.MeshBasicMaterial({ color: 0x800080, transparent: true, opacity: 0.6 }));
        this.overlapCircle.position.set(0, 0, -0.1); // Slightly behind lines
        this.entanglementScene.add(this.overlapCircle);
        // Add text for entanglement value (TextGeometry or HTML)
    }


    initializeStates() {
        // System state: superposition |psi> = sqrt(0.3)|0> + sqrt(0.7)|1>
        this.alpha = math.sqrt(0.3);
        this.beta = math.sqrt(0.7);
        this.psi_system = math.matrix([[this.alpha], [this.beta]], 'dense');

        // Environment state: |0>
        this.psi_env = math.matrix([[1], [0]], 'dense');

        // Total state: |Psi> = |psi> ⊗ |env>
        this.psi_total = math.kron(this.psi_system, this.psi_env);

        // Initial density matrix: rho = |Psi><Psi|
        this.rho_initial = outerProduct(this.psi_total);

        // Measurement unitary (CNOT-like)
        this.U_measure = math.matrix([
            [1, 0, 0, 0],
            [0, 1, 0, 0],
            [0, 0, 0, 1],
            [0, 0, 1, 0]
        ], 'dense');

        this.identity4 = math.identity(4, 4);
    }

    applyInteraction(rho, strength) {
        // U(strength) = I + strength * (U_measure - I) --- Simplified non-unitary model for demo
        // For a more correct approach, use matrix exponentiation: U = expm(-i * H * strength)
        // Or interpolate Unitaries: U = slerp(I, U_measure, strength) - more complex

        // Let's use the Python script's approach: interpolate and normalize (approximate)
        const U_diff = math.subtract(this.U_measure, this.identity4);
        const U_int = math.add(this.identity4, math.multiply(U_diff, strength));

        // Simple normalization (not strictly correct for ensuring unitarity, but mimics the Python code)
        // A proper method involves matrix square roots or SVD, which math.js might not have easily.
        // Let's skip normalization for this web demo, understanding it's an approximation.
         const U_final = U_int; // Using the interpolated matrix directly

        // Apply the interaction: rho_final = U * rho * U^dagger
        const U_dagger = math.transpose(math.conj(U_final));
        let rho_temp = math.multiply(rho, U_dagger);
        let rho_after = math.multiply(U_final, rho_temp);

        // Ensure trace is 1 (numerical errors might occur)
        const traceVal = math.trace(rho_after);
         if (Math.abs(math.re(traceVal) - 1.0) > 1e-6 || Math.abs(math.im(traceVal)) > 1e-6) {
             // console.warn("Trace is not 1 after interaction, normalizing:", traceVal);
             rho_after = math.divide(rho_after, traceVal);
         }

        return rho_after;
    }


    update(strength) {
        // 1. Apply interaction
        const rho_after = this.applyInteraction(this.rho_initial, strength);

        // 2. Calculate reduced density matrix for the system
        const rho_system_after = partialTrace(rho_after, 1, [2, 2]); // Trace out environment (subsystem 1)

        // 3. Calculate measurement probabilities (diagonal elements)
        const diag = math.diag(rho_system_after).toArray();
        const probs = diag.map(d => math.re(d)); // Probabilities are real parts

        // 4. Calculate entanglement
        const entanglement = calculateEntanglement(rho_after);

        // 5. Update Visualizations
        this.updateStateVisualization(rho_system_after);
        this.updateDensityMatrix(rho_system_after);
        this.updateOutcomes(probs);
        this.updateEntanglementVisualization(entanglement);
        this.updateInformationPanel(strength, entanglement, probs);
    }

    updateStateVisualization(rho) {
        // Simplified visualization: Arrow length based on |<0|rho|0>| + |<1|rho|1>| purity?
        // Angle based on phase of <0|rho|1>?
        const p0 = math.re(rho.get([0, 0]));
        const p1 = math.re(rho.get([1, 1]));
        const coherence = rho.get([0, 1]); // <0|rho|1>
        const coherenceMag = math.abs(coherence);
        const coherencePhase = math.arg(coherence);

        // Represent purity/mixedness by arrow length (1=pure, <1 mixed)
        // Purity = Tr(rho^2)
        const rhoSq = math.multiply(rho, rho);
        const purity = math.re(math.trace(rhoSq));
        const arrowLength = Math.sqrt(purity); // Length related to purity

        // Represent state by angle (mix of basis states and phase)
        // Use atan2(sqrt(p1), sqrt(p0)) for angle relative to |0>, add coherencePhase?
        // This mapping is heuristic for a mixed state projection.
        let angle = 0;
        if (p0 > 1e-6) {
             angle = 2 * Math.atan2(Math.sqrt(p1), Math.sqrt(p0)); // Angle like Bloch sphere theta/2? No, that's for pure state.
             // Let's use the coherence phase directly for the angle?
             angle = coherencePhase;
        }


        const dir = new THREE.Vector3(Math.cos(angle), Math.sin(angle), 0);
        this.stateVector.setDirection(dir);
        this.stateVector.setLength(arrowLength, 0.1 * arrowLength, 0.05 * arrowLength); // Scale head too
    }

    updateDensityMatrix(rho) {
        const size = this.densityCanvas.width;
        const ctx = this.densityCtx;
        const rhoData = rho.toArray();

        // Simple magnitude mapping to color (e.g., Viridis)
        const viridis = (t) => {
            // Simple Viridis approximation - replace with a better colormap if needed
            const r = Math.sqrt(t);
            const g = t * t;
            const b = Math.sin(t * Math.PI);
            return `rgb(${Math.floor(r*255)}, ${Math.floor(g*255)}, ${Math.floor(b*255)})`;
        };

        const maxMag = Math.max(...rhoData.flat().map(c => math.abs(c)));
        const scale = maxMag > 0 ? 1.0 / maxMag : 1.0;

        ctx.clearRect(0, 0, size, size);
        for (let i = 0; i < 2; i++) {
            for (let j = 0; j < 2; j++) {
                const magnitude = math.abs(rhoData[i][j]);
                const normalizedMag = magnitude * scale;
                ctx.fillStyle = viridis(normalizedMag);
                ctx.fillRect(j * size / 2, i * size / 2, size / 2, size / 2);

                // Add text value (optional, can be hard to read)
                // ctx.fillStyle = TEXT_COLOR;
                // ctx.font = "10px Arial";
                // ctx.textAlign = "center";
                // ctx.textBaseline = "middle";
                // const valText = `${rhoData[i][j].re.toFixed(2)}${rhoData[i][j].im >= 0 ? '+' : ''}${rhoData[i][j].im.toFixed(2)}i`;
                // ctx.fillText(valText, (j + 0.5) * size / 2, (i + 0.5) * size / 2);
            }
        }
        this.densityTexture.needsUpdate = true; // IMPORTANT! Tell Three.js texture changed
    }

    updateOutcomes(probs) {
        const maxHeight = 2.0; // Max height in scene units
        this.bar0.scale.y = probs[0] * maxHeight;
        this.bar1.scale.y = probs[1] * maxHeight;
        // Position bars so their base is at y=0 (or slightly above)
        this.bar0.position.y = (probs[0] * maxHeight / 2) - 1.0; // Adjust based on camera view
        this.bar1.position.y = (probs[1] * maxHeight / 2) - 1.0;

         // Add text labels for probabilities (optional, consider HTML)
    }

    updateEntanglementVisualization(entanglement) {
        // Scale overlap visualization based on entanglement (max 1 bit for 2 qubits)
        const maxEntanglement = 1.0;
        const normalizedEntanglement = Math.min(entanglement / maxEntanglement, 1.0);

        const maxOverlapRadius = 0.4;
        const overlapRadius = normalizedEntanglement * maxOverlapRadius;

        this.overlapCircle.scale.set(overlapRadius / 0.3, overlapRadius / 0.3, 1); // Scale relative to base geometry radius
        this.overlapCircle.visible = overlapRadius > 0.01; // Hide if very small

        // Add text for entanglement value (optional, consider HTML)
    }

    updateInformationPanel(strength, entanglement, probs) {
        let interaction_type;
        let explanation;

        if (strength < 0.3) {
            interaction_type = "Weak Interaction (Not a Measurement)";
            explanation = "System & environment slightly entangled. System state mostly coherent. Like minor background interactions.";
        } else if (strength < 0.7) {
            interaction_type = "Moderate Interaction (Partial Measurement)";
            explanation = "More entanglement, system loses some coherence. Environment starts 'recording' info, but incompletely.";
        } else {
            interaction_type = "Strong Interaction (Full Measurement)";
            explanation = "Highly entangled, system state decoheres towards a classical mixture. Environment creates a stable record.";
        }

        const info_text = `
Interaction Type: ${interaction_type}
Strength: ${strength.toFixed(2)}

Explanation:
${explanation}

--------------------
Entanglement (Von Neumann Entropy): ${entanglement.toFixed(3)} bits
Measurement Probabilities:
  |0⟩: ${probs[0].toFixed(3)}
  |1⟩: ${probs[1].toFixed(3)}
--------------------
What is Measurement?
An interaction creating an irreversible correlation (entanglement) between system and environment, leading to decoherence of the system's superposition into observable outcomes. It's about information transfer and record creation, not consciousness.
        `;

        this.infoTextElement.textContent = info_text.trim();
    }

    reset() {
        const initialStrength = 0.5;
        this.slider.value = initialStrength;
        this.strengthValueDisplay.textContent = initialStrength.toFixed(2);
        this.initializeStates(); // Re-init quantum state
        this.update(initialStrength);
    }

    animate() {
        requestAnimationFrame(() => this.animate()); // Loop

        // Render all scenes
        if(this.stateRenderer) this.stateRenderer.render(this.stateScene, this.stateCamera);
        if(this.densityRenderer) this.densityRenderer.render(this.densityScene, this.densityCamera);
        if(this.outcomesRenderer) this.outcomesRenderer.render(this.outcomesScene, this.outcomesCamera);
        if(this.entanglementRenderer) this.entanglementRenderer.render(this.entanglementScene, this.entanglementCamera);
    }
}

// --- Run the Simulator ---
window.addEventListener('DOMContentLoaded', () => {
    new QuantumMeasurementSimulator();
});