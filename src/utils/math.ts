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
