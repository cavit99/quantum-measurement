const InfoPanel = ({ strength, quantumData, className }) => {
  const getExplanationText = () => {
    if (strength < 0.3) {
      return `Weak Interaction: The particle is barely entangled with its environment. It stays in superposition because the interaction isn't strong enough to "record" its state. Everyday bumps (air, radiation) are like this—they don't force a definite state.`;
    } else if (strength < 0.7) {
      return `Moderate Interaction: Entanglement grows, and the superposition starts to fade. The environment is "noticing" the particle, but not fully. This is partial decoherence—not a sudden change.`;
    } else {
      return `Strong Interaction: The particle and environment are highly entangled. Superposition is lost, and it acts like a classical object with definite outcomes. This is what we call "measurement"—no human needed!`;
    }
  };

  const prob0 = quantumData.probs ? quantumData.probs[0].toFixed(3) : '0.000';
  const prob1 = quantumData.probs ? quantumData.probs[1].toFixed(3) : '0.000';
  const entanglement = quantumData.entanglement ? quantumData.entanglement.toFixed(3) : '0.000';

  return (
    <div className={`bg-teal-50 p-4 rounded-md shadow-md ${className}`}>
      <h2 className="text-sm font-semibold mb-2">Why Does Measurement Happen?</h2>
      <pre className="whitespace-pre-wrap text-sm">
        {`${getExplanationText()}\n\nStrength: ${strength.toFixed(2)}\nEntanglement: ${entanglement} bits\nProbabilities: |0⟩: ${prob0}, |1⟩: ${prob1}\n\nWhy Does This Happen?\n- Measurement isn't about humans looking—it's about entanglement with the environment creating a stable record.\n- Particles can stay in superposition despite constant small interactions (e.g., air molecules) if they don't entangle strongly.\n- A "measurement" is just a strong interaction that decoheres the system, making outcomes definite without any mysterious "collapse."`}
      </pre>
    </div>
  );
};

export default InfoPanel;