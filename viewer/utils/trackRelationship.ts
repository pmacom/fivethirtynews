/**
 * Utility to track content relationships based on user behavior.
 * Sends signals to the API to build organic content connections.
 */

export type SignalType = 'navigation' | 'search' | 'explicit'

interface TrackOptions {
  /** Optional weight modifier (0-1, default 1.0) */
  weight?: number
  /** Optional context data (e.g., search query) */
  context?: Record<string, unknown>
}

/**
 * Track a relationship signal between two pieces of content.
 * This is fire-and-forget - errors are logged but don't interrupt the user.
 *
 * @param fromId - Source content ID (what user was viewing)
 * @param toId - Target content ID (what user navigated/selected to)
 * @param signalType - Type of signal: navigation, search, or explicit
 * @param options - Optional weight and context
 */
export async function trackRelationship(
  fromId: string,
  toId: string,
  signalType: SignalType,
  options: TrackOptions = {}
): Promise<void> {
  // Don't track self-references
  if (fromId === toId) return

  // Don't track if either ID is missing
  if (!fromId || !toId) return

  const { weight = 1.0, context = {} } = options

  try {
    const response = await fetch('/api/content/relationships', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contentIdA: fromId,
        contentIdB: toId,
        signalType,
        weight,
        context,
      }),
    })

    if (!response.ok) {
      console.warn('[trackRelationship] Failed to record signal:', response.status)
    }
  } catch (err) {
    // Non-blocking - don't interrupt user experience
    console.warn('[trackRelationship] Error recording signal:', err)
  }
}

/**
 * Track a search-context relationship.
 * Called when user searches while viewing content A and selects content B.
 */
export async function trackSearchRelationship(
  fromId: string,
  toId: string,
  searchQuery?: string
): Promise<void> {
  return trackRelationship(fromId, toId, 'search', {
    context: searchQuery ? { query: searchQuery } : {},
  })
}

/**
 * Track an explicit link between content.
 * Called when user manually creates a connection.
 */
export async function trackExplicitLink(
  fromId: string,
  toId: string
): Promise<void> {
  return trackRelationship(fromId, toId, 'explicit')
}

export default trackRelationship
