import { FrequencyRanges } from "../types"
import { normalize, clamp, roundFloat } from "../../utils/mathUtils"

export { roundFloat }

export const safeFrequencyData = (frequencyData: Float32Array | null): Float32Array => {
  if (!frequencyData) return new Float32Array()
  return frequencyData.filter(value => value !== null && value !== undefined && !isNaN(value))
}

export const getFrequencyRanges = (_fftBins: number[], fftSize: number): FrequencyRanges => {
  // Define frequency ranges in terms of bin indices
  const lowStartIndex = 0 // 20 Hz corresponds to bin 0
  const lowEndIndex = Math.floor(fftSize * 250 / 44100)
  const midStartIndex = lowEndIndex
  const midEndIndex = Math.floor(fftSize * 4000 / 44100)
  const highStartIndex = midEndIndex
  const highEndIndex = _fftBins.length // Up to 20 kHz

  const low = calculateNormalizedRange(_fftBins, lowStartIndex, lowEndIndex)
  const mid = calculateNormalizedRange(_fftBins, midStartIndex, midEndIndex)
  const high = calculateNormalizedRange(_fftBins, highStartIndex, highEndIndex)

  return { low, mid, high }
}

export const calculateNormalizedRange = (
  fftBins: number[],
  startIndex: number,
  endIndex: number,
  minDb: number = -120,
  maxDb: number = 0
): number => {
  const range = fftBins.slice(startIndex, endIndex)
  const normalizedValues = range.map(value => normalizeDecibelValue(value, minDb, maxDb))

  // Return the average of the normalized values
  return normalizedValues.reduce((sum, value) => sum + value, 0) / normalizedValues.length
}

/**
 * Normalize a dB value to a range of 0 to 1
 */
export const normalizeDecibelValue = (dbValue: number, minDb: number = -120, maxDb: number = 0): number => {
  return normalize(dbValue, minDb, maxDb, 0, 1)
}

export const applyAndAdjustGain = (value: number, gain: number): { value: number, gain: number } => {
  if (value > 1) {
    gain = gain * (1 / value) // Adjust gain to bring the value closer to 1
  }
  return {
    value: value * gain, // Apply the (possibly adjusted) gain
    gain, // Return the gain value
  }
}
