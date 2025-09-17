// GPU-friendly carbon estimator adapted for frontend usage
// Calculates per-prompt energy and carbon using either measured runtime
// or model-based coefficients. Also derives a rough average power when
// runtime throughput or sensible defaults are available.

export type EmissionsFactor = {
  value: number;
  units:
    | 'g_per_kwh'
    | 'kg_per_kwh'
    | 'lb_per_kwh'
    | 'kg_per_mwh'
    | 'g_per_mwh'
    | 'lb_per_mwh';
};

export type RuntimeInputs = {
  powerPrefillW?: number;
  powerDecodeW?: number;
  tpsPrefill?: number; // tokens/sec during prefill
  tpsDecode?: number; // tokens/sec during decode
};

export type CoeffInputs = {
  eInWhPerTok?: number; // Wh/token for prefill
  eOutWhPerTok?: number; // Wh/token for decode
};

export type Multipliers = {
  sku?: number;
  quant?: number;
  batching?: number;
};

export type EstimateInputs = {
  tokensIn: number;
  tokensOut: number;
  ef: EmissionsFactor;
  runtime?: RuntimeInputs; // measured path (preferred)
  coeffs?: CoeffInputs; // coefficients path (fallback)
  multipliers?: Multipliers;
  idleWhPerPrompt?: number;
  PUE?: number;
  // Optional defaults used only to derive avg power when runtime is missing
  defaultsForPower?: {
    tpsPrefill?: number;
    tpsDecode?: number;
  };
};

export type EstimateResult = {
  energy_it_Wh: number; // IT energy only (no PUE)
  energy_total_Wh: number; // IT + idle, then PUE applied
  carbon_g: number; // grams CO2e
  avg_power_W?: number; // rough average power across the prompt
  debug: {
    ef_g_per_kWh: number;
    PUE: number;
    idleWhPerPrompt: number;
    path: 'measured' | 'coeffs';
    total_seconds?: number;
  };
};

export function estimateCarbonGPU({
  tokensIn,
  tokensOut,
  ef,
  runtime,
  coeffs,
  multipliers = {},
  idleWhPerPrompt = 0.02,
  PUE = 1.2,
  defaultsForPower,
}: EstimateInputs): EstimateResult {
  const ef_g_per_kWh = to_g_per_kWh(ef.value, ef.units);
  const inTok = Math.max(0, tokensIn || 0);
  const outTok = Math.max(0, tokensOut || 0);

  let E_it_Wh = 0;
  let totalSeconds: number | undefined;

  if (runtime && hasRuntime(runtime)) {
    const { powerPrefillW, powerDecodeW, tpsPrefill, tpsDecode } = runtime;

    const prefillSeconds = inTok / Math.max(tpsPrefill || 0, 1e-9);
    const decodeSeconds = outTok / Math.max(tpsDecode || 0, 1e-9);

    const E_prefill_Wh = (prefillSeconds * (powerPrefillW || powerDecodeW || 0)) / 3600;
    const E_decode_Wh = (decodeSeconds * (powerDecodeW || powerPrefillW || 0)) / 3600;

    E_it_Wh = E_prefill_Wh + E_decode_Wh;
    totalSeconds = prefillSeconds + decodeSeconds;
  } else {
    const { eInWhPerTok = 0.0003, eOutWhPerTok = 0.0004 } = coeffs || {};
    const m = {
      sku: multipliers.sku ?? 1.0,
      quant: multipliers.quant ?? 1.0,
      batching: multipliers.batching ?? 1.0,
    };
    const k = m.sku * m.quant * m.batching;
    E_it_Wh = k * (eInWhPerTok * inTok + eOutWhPerTok * outTok);

    // If caller provided default throughputs, use them to approximate time for avg power
    const dPrefill = defaultsForPower?.tpsPrefill;
    const dDecode = defaultsForPower?.tpsDecode;
    if (dPrefill || dDecode) {
      const prefillSeconds = inTok / Math.max(dPrefill || 0, 1e-9);
      const decodeSeconds = outTok / Math.max(dDecode || 0, 1e-9);
      totalSeconds = prefillSeconds + decodeSeconds;
    }
  }

  const E_total_Wh = (E_it_Wh + idleWhPerPrompt) * PUE;
  const carbon_g = (E_total_Wh / 1000) * ef_g_per_kWh;

  let avg_power_W: number | undefined;
  if (totalSeconds && totalSeconds > 0) {
    avg_power_W = (E_total_Wh * 3600) / totalSeconds; // Wh -> W using duration
  }

  return {
    energy_it_Wh: E_it_Wh,
    energy_total_Wh: E_total_Wh,
    carbon_g,
    avg_power_W,
    debug: {
      ef_g_per_kWh,
      PUE,
      idleWhPerPrompt,
      path: runtime && hasRuntime(runtime) ? 'measured' : 'coeffs',
      total_seconds: totalSeconds,
    },
  };
}

function hasRuntime(r?: RuntimeInputs) {
  if (!r) return false;
  return (r.tpsPrefill || r.tpsDecode) && (r.powerPrefillW || r.powerDecodeW);
}

function to_g_per_kWh(value: number, units?: EmissionsFactor['units']): number {
  const u = (units || '').toLowerCase();
  if (u === 'g_per_kwh') return value;
  if (u === 'kg_per_kwh') return value * 1000;
  if (u === 'lb_per_kwh') return value * 453.59237;
  if (u === 'kg_per_mwh') return value; // 1 kg/MWh == 1 g/kWh
  if (u === 'g_per_mwh') return value / 1000; // 1000 kWh in 1 MWh
  if (u === 'lb_per_mwh') return (value * 453.59237) / 1000;
  // Default assume already g/kWh if unknown
  return value;
}

