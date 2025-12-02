/**
 * Shared Math Utilities
 *
 * Common mathematical functions used across the WTF application
 */

/**
 * Round a floating point number to 4 decimal places
 * @param num - The number to round
 * @returns The rounded number
 */
export const roundFloat = (num: number): number => {
  return Math.round((num + Number.EPSILON) * 10000) / 10000
}

/**
 * Clamp a value between min and max
 * @param value - The value to clamp
 * @param min - Minimum value
 * @param max - Maximum value
 * @returns The clamped value
 */
export const clamp = (value: number, min: number, max: number): number => {
  return Math.max(Math.min(value, max), min)
}

/**
 * Normalize a value from one range to another
 * @param value - The value to normalize
 * @param min - Current range minimum
 * @param max - Current range maximum
 * @param newMin - Target range minimum (default: 0)
 * @param newMax - Target range maximum (default: 1)
 * @returns The normalized value
 */
export const normalize = (
  value: number,
  min: number,
  max: number,
  newMin: number = 0,
  newMax: number = 1
): number => {
  const clamped = clamp(value, min, max)
  return ((clamped - min) / (max - min)) * (newMax - newMin) + newMin
}

/**
 * Linear interpolation between two values
 * @param start - Start value
 * @param end - End value
 * @param t - Interpolation factor (0-1)
 * @returns The interpolated value
 */
export const lerp = (start: number, end: number, t: number): number => {
  return start * (1 - t) + end * t
}
