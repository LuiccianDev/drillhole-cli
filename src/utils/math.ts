/**
 * Directional rounding
 */
export function floorTo(val: number, unit: number): number {
  return Math.floor(val / unit) * unit;
}

export function ceilTo(val: number, unit: number): number {
  return Math.ceil(val / unit) * unit;
}

/**
 * Calculates value at a specific percentile in a sorted array.
 */
export function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);

  const valLo = sorted[lo];
  const valHi = sorted[hi];

  if (valLo === undefined) return 0;
  if (lo === hi || valHi === undefined) return valLo;

  return +(valLo + (valHi - valLo) * (idx - lo)).toFixed(6);
}

/**
 * Safely calculates the minimum of an array without call stack limits.
 */
export function getMin(arr: number[]): number {
  if (arr.length === 0) return 0;
  let min = arr[0] ?? 0;
  for (let i = 1; i < arr.length; i++) {
    const val = arr[i];
    if (val !== undefined && val < min) {
      min = val;
    }
  }
  return min;
}

/**
 * Safely calculates the maximum of an array without call stack limits.
 */
export function getMax(arr: number[]): number {
  if (arr.length === 0) return 0;
  let max = arr[0] ?? 0;
  for (let i = 1; i < arr.length; i++) {
    const val = arr[i];
    if (val !== undefined && val > max) {
      max = val;
    }
  }
  return max;
}

/**
 * Calculates arithmetic mean of an array of numbers.
 */
export function getMean(arr: number[]): number {
  if (arr.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < arr.length; i++) {
    sum += arr[i] ?? 0;
  }
  return +(sum / arr.length).toFixed(4);
}

/**
 * Calculates median (P50) from a sorted array.
 */
export function getMedian(sorted: number[]): number {
  return percentile(sorted, 50);
}

/**
 * Calculates sample variance (divided by n-1 if n > 1).
 */
export function getVariance(arr: number[], mean: number): number {
  if (arr.length <= 1) return 0;
  let sumDiffSq = 0;
  for (let i = 0; i < arr.length; i++) {
    const diff = (arr[i] ?? 0) - mean;
    sumDiffSq += diff * diff;
  }
  return +(sumDiffSq / (arr.length - 1)).toFixed(6);
}

/**
 * Calculates sample standard deviation.
 */
export function getStdDev(arr: number[], mean: number): number {
  if (arr.length <= 1) return 0;
  const variance = getVariance(arr, mean);
  return +Math.sqrt(variance).toFixed(4);
}

/**
 * Calculates Coefficient of Variation (CV = stdDev / mean).
 */
export function getCoefficientOfVariation(stdDev: number, mean: number): number {
  if (mean === 0) return 0;
  return +(stdDev / Math.abs(mean)).toFixed(4);
}
