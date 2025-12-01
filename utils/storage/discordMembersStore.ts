/**
 * IndexedDB storage for Discord server members
 * Provides persistent local caching with count-based invalidation
 */

const DB_NAME = '530_discord_cache';
const DB_VERSION = 1;
const STORE_NAME = 'discord_members';
const META_STORE = 'cache_meta';

export interface DiscordMember {
  id: string;
  username: string;
  displayName: string;
  avatar: string | null;
  roles: string[];
  joinedAt: string | null;
  isBot: boolean;
  // Extensible: add future fields here
  customData?: Record<string, unknown>;
}

export interface CacheMeta {
  key: string;
  count: number;
  fetchedAt: string;
  guildName: string;
}

let dbPromise: Promise<IDBDatabase> | null = null;

/**
 * Open or create the IndexedDB database
 */
function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not available'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Store for members with index by ID
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const memberStore = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        memberStore.createIndex('username', 'username', { unique: false });
        memberStore.createIndex('displayName', 'displayName', { unique: false });
      }

      // Store for cache metadata
      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE, { keyPath: 'key' });
      }
    };
  });

  return dbPromise;
}

/**
 * Get cache metadata (count and fetch time)
 */
export async function getCacheMeta(): Promise<CacheMeta | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(META_STORE, 'readonly');
      const store = tx.objectStore(META_STORE);
      const request = store.get('members');

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || null);
    });
  } catch (err) {
    console.error('Error getting cache meta:', err);
    return null;
  }
}

/**
 * Check if cache needs refresh based on member count
 */
export async function needsCacheRefresh(serverCount: number): Promise<boolean> {
  const meta = await getCacheMeta();
  if (!meta) return true;
  return meta.count !== serverCount;
}

/**
 * Get all cached members
 */
export async function getCachedMembers(): Promise<DiscordMember[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || []);
    });
  } catch (err) {
    console.error('Error getting cached members:', err);
    return [];
  }
}

/**
 * Store members in cache with metadata
 */
export async function cacheMembers(
  members: DiscordMember[],
  guildName: string
): Promise<void> {
  try {
    const db = await openDB();

    // Clear existing and store new members
    const tx = db.transaction([STORE_NAME, META_STORE], 'readwrite');

    // Clear members store
    const memberStore = tx.objectStore(STORE_NAME);
    await new Promise<void>((resolve, reject) => {
      const clearRequest = memberStore.clear();
      clearRequest.onerror = () => reject(clearRequest.error);
      clearRequest.onsuccess = () => resolve();
    });

    // Add all members
    for (const member of members) {
      memberStore.put(member);
    }

    // Update metadata
    const metaStore = tx.objectStore(META_STORE);
    metaStore.put({
      key: 'members',
      count: members.length,
      fetchedAt: new Date().toISOString(),
      guildName,
    });

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });

    console.log(`[DiscordCache] Stored ${members.length} members`);
  } catch (err) {
    console.error('Error caching members:', err);
    throw err;
  }
}

/**
 * Update custom data for a specific member
 */
export async function updateMemberCustomData(
  memberId: string,
  customData: Record<string, unknown>
): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    // Get existing member
    const member = await new Promise<DiscordMember | undefined>((resolve, reject) => {
      const request = store.get(memberId);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });

    if (member) {
      // Update with merged custom data
      member.customData = { ...member.customData, ...customData };
      store.put(member);
    }

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error('Error updating member custom data:', err);
    throw err;
  }
}

/**
 * Search members by name (case-insensitive)
 */
export async function searchCachedMembers(query: string): Promise<DiscordMember[]> {
  const members = await getCachedMembers();
  const lowerQuery = query.toLowerCase();

  return members.filter(
    m =>
      m.displayName.toLowerCase().includes(lowerQuery) ||
      m.username.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Clear all cached data
 */
export async function clearCache(): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction([STORE_NAME, META_STORE], 'readwrite');

    tx.objectStore(STORE_NAME).clear();
    tx.objectStore(META_STORE).clear();

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });

    console.log('[DiscordCache] Cache cleared');
  } catch (err) {
    console.error('Error clearing cache:', err);
    throw err;
  }
}
