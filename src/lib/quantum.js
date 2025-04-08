import * as math from 'mathjs';

export function normalizeState(state) {
  const norm = math.norm(state);
  return norm === 0 ? state : math.divide(state, norm);
}

export function outerProduct(vec1, vec2 = null) {
  const v1 = math.matrix(vec1);
  const v2_conj_T = vec2 ? math.transpose(math.conj(math.matrix(vec2))) : math.transpose(math.conj(v1));
  return math.multiply(v1, v2_conj_T);
}

export function partialTrace(rho, subsystemToTraceOut, dims = [2, 2]) {
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

export function calculateEntanglement(rho) {
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

export function applyInteraction(rho, strength, U_measure, identity4) {
  const U_diff = math.subtract(U_measure, identity4);
  const U_int = math.add(identity4, math.multiply(U_diff, strength));
  const U_dagger = math.transpose(math.conj(U_int));
  let rho_after = math.multiply(math.multiply(U_int, rho), U_dagger);
  const traceVal = math.trace(rho_after);
  if (Math.abs(math.re(traceVal) - 1) > 1e-6) rho_after = math.divide(rho_after, traceVal);
  return rho_after;
} 