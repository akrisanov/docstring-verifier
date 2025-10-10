/**
 * Simple LRU (Least Recently Used) Cache implementation.
 *
 * When the cache reaches its maximum size, the least recently used
 * item is evicted to make room for new items.
 *
 * @template K Key type
 * @template V Value type
 */
export class LRUCache<K, V> {
	private capacity: number;
	private cache: Map<K, V>;

	/**
	 * Create an LRU cache with the specified capacity.
	 *
	 * @param capacity Maximum number of items to store (default: 1000)
	 */
	constructor(capacity: number = 1000) {
		if (capacity <= 0) {
			throw new Error('Cache capacity must be positive');
		}
		this.capacity = capacity;
		this.cache = new Map();
	}

	/**
	 * Get a value from the cache.
	 * Moves the item to the end (marks as recently used).
	 *
	 * @param key The key to look up
	 * @returns The value if found, undefined otherwise
	 */
	get(key: K): V | undefined {
		// Check if key exists (handles undefined values correctly)
		if (!this.cache.has(key)) {
			return undefined;
		}

		const value = this.cache.get(key)!;
		// Move to end (most recently used)
		this.cache.delete(key);
		this.cache.set(key, value);
		return value;
	}

	/**
	 * Check if a key exists in the cache.
	 *
	 * @param key The key to check
	 * @returns True if the key exists
	 */
	has(key: K): boolean {
		return this.cache.has(key);
	}

	/**
	 * Add or update a value in the cache.
	 * If at capacity, evicts the least recently used item.
	 *
	 * @param key The key to set
	 * @param value The value to store
	 */
	set(key: K, value: V): void {
		// If key exists, remove it first (will re-add at end)
		if (this.cache.has(key)) {
			this.cache.delete(key);
		} else if (this.cache.size >= this.capacity) {
			// Evict least recently used (first item)
			const firstKey = this.cache.keys().next().value;
			if (firstKey !== undefined) {
				this.cache.delete(firstKey);
			}
		}

		// Add to end (most recently used)
		this.cache.set(key, value);
	}

	/**
	 * Remove a value from the cache.
	 *
	 * @param key The key to delete
	 * @returns True if the key was found and deleted
	 */
	delete(key: K): boolean {
		return this.cache.delete(key);
	}

	/**
	 * Clear all items from the cache.
	 */
	clear(): void {
		this.cache.clear();
	}

	/**
	 * Get the current number of items in the cache.
	 *
	 * @returns Number of cached items
	 */
	get size(): number {
		return this.cache.size;
	}

	/**
	 * Get all keys in the cache (in LRU order).
	 *
	 * @returns Array of keys from least to most recently used
	 */
	keys(): K[] {
		return Array.from(this.cache.keys());
	}

	/**
	 * Get all values in the cache (in LRU order).
	 *
	 * @returns Array of values from least to most recently used
	 */
	values(): V[] {
		return Array.from(this.cache.values());
	}

	/**
	 * Get all entries in the cache (in LRU order).
	 *
	 * @returns Array of [key, value] pairs from least to most recently used
	 */
	entries(): [K, V][] {
		return Array.from(this.cache.entries());
	}
}
