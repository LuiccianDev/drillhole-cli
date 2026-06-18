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
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return +(sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo)).toFixed(6);
}
