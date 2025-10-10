/**
 * Tests for LRU Cache implementation.
 */

import * as assert from 'assert';
import { LRUCache } from '../../../utils/lruCache';

suite('LRUCache Tests', () => {

	suite('Basic Operations', () => {

		test('Should create cache with default capacity', () => {
			const cache = new LRUCache<string, number>();
			assert.strictEqual(cache.size, 0);
		});

		test('Should create cache with custom capacity', () => {
			const cache = new LRUCache<string, number>(10);
			assert.strictEqual(cache.size, 0);
		});

		test('Should throw error for invalid capacity', () => {
			assert.throws(() => new LRUCache<string, number>(0));
			assert.throws(() => new LRUCache<string, number>(-1));
		});

		test('Should set and get values', () => {
			const cache = new LRUCache<string, number>();
			cache.set('key1', 100);
			assert.strictEqual(cache.get('key1'), 100);
		});

		test('Should return undefined for non-existent key', () => {
			const cache = new LRUCache<string, number>();
			assert.strictEqual(cache.get('nonexistent'), undefined);
		});

		test('Should check if key exists', () => {
			const cache = new LRUCache<string, number>();
			cache.set('key1', 100);
			assert.strictEqual(cache.has('key1'), true);
			assert.strictEqual(cache.has('key2'), false);
		});

		test('Should delete key', () => {
			const cache = new LRUCache<string, number>();
			cache.set('key1', 100);
			assert.strictEqual(cache.delete('key1'), true);
			assert.strictEqual(cache.has('key1'), false);
			assert.strictEqual(cache.delete('key1'), false);
		});

		test('Should clear all items', () => {
			const cache = new LRUCache<string, number>(10);
			cache.set('key1', 1);
			cache.set('key2', 2);
			cache.set('key3', 3);
			assert.strictEqual(cache.size, 3);

			cache.clear();
			assert.strictEqual(cache.size, 0);
			assert.strictEqual(cache.has('key1'), false);
		});

		test('Should update existing value', () => {
			const cache = new LRUCache<string, number>();
			cache.set('key1', 100);
			cache.set('key1', 200);
			assert.strictEqual(cache.get('key1'), 200);
			assert.strictEqual(cache.size, 1);
		});

	});

	suite('LRU Eviction', () => {

		test('Should evict least recently used item when at capacity', () => {
			const cache = new LRUCache<string, number>(3);

			cache.set('a', 1);
			cache.set('b', 2);
			cache.set('c', 3);
			assert.strictEqual(cache.size, 3);

			// Adding 4th item should evict 'a'
			cache.set('d', 4);
			assert.strictEqual(cache.size, 3);
			assert.strictEqual(cache.has('a'), false);
			assert.strictEqual(cache.has('b'), true);
			assert.strictEqual(cache.has('c'), true);
			assert.strictEqual(cache.has('d'), true);
		});

		test('Should update LRU order on get', () => {
			const cache = new LRUCache<string, number>(3);

			cache.set('a', 1);
			cache.set('b', 2);
			cache.set('c', 3);

			// Access 'a' to make it recently used
			cache.get('a');

			// Adding 4th item should evict 'b' (not 'a')
			cache.set('d', 4);
			assert.strictEqual(cache.has('a'), true);
			assert.strictEqual(cache.has('b'), false);
			assert.strictEqual(cache.has('c'), true);
			assert.strictEqual(cache.has('d'), true);
		});

		test('Should update LRU order on set of existing key', () => {
			const cache = new LRUCache<string, number>(3);

			cache.set('a', 1);
			cache.set('b', 2);
			cache.set('c', 3);

			// Update 'a' to make it recently used
			cache.set('a', 10);

			// Adding 4th item should evict 'b' (not 'a')
			cache.set('d', 4);
			assert.strictEqual(cache.has('a'), true);
			assert.strictEqual(cache.has('b'), false);
			assert.strictEqual(cache.has('c'), true);
			assert.strictEqual(cache.has('d'), true);
			assert.strictEqual(cache.get('a'), 10);
		});

		test('Should maintain LRU order with multiple operations', () => {
			const cache = new LRUCache<string, number>(3);

			cache.set('a', 1);
			cache.set('b', 2);
			cache.set('c', 3);

			cache.get('a'); // a is now most recent
			cache.get('b'); // b is now most recent

			// Order: c (oldest), a, b (newest)
			// Adding d should evict c
			cache.set('d', 4);

			assert.strictEqual(cache.has('c'), false);
			assert.strictEqual(cache.has('a'), true);
			assert.strictEqual(cache.has('b'), true);
			assert.strictEqual(cache.has('d'), true);
		});

	});

	suite('Enumeration Methods', () => {

		test('Should return all keys in LRU order', () => {
			const cache = new LRUCache<string, number>(10);

			cache.set('a', 1);
			cache.set('b', 2);
			cache.set('c', 3);

			const keys = cache.keys();
			assert.deepStrictEqual(keys, ['a', 'b', 'c']);
		});

		test('Should return all values in LRU order', () => {
			const cache = new LRUCache<string, number>(10);

			cache.set('a', 1);
			cache.set('b', 2);
			cache.set('c', 3);

			const values = cache.values();
			assert.deepStrictEqual(values, [1, 2, 3]);
		});

		test('Should return all entries in LRU order', () => {
			const cache = new LRUCache<string, number>(10);

			cache.set('a', 1);
			cache.set('b', 2);
			cache.set('c', 3);

			const entries = cache.entries();
			assert.deepStrictEqual(entries, [['a', 1], ['b', 2], ['c', 3]]);
		});

		test('Should reflect LRU order after access', () => {
			const cache = new LRUCache<string, number>(10);

			cache.set('a', 1);
			cache.set('b', 2);
			cache.set('c', 3);

			cache.get('a'); // Move 'a' to end

			const keys = cache.keys();
			assert.deepStrictEqual(keys, ['b', 'c', 'a']);
		});

	});

	suite('Edge Cases', () => {

		test('Should handle capacity of 1', () => {
			const cache = new LRUCache<string, number>(1);

			cache.set('a', 1);
			assert.strictEqual(cache.get('a'), 1);

			cache.set('b', 2);
			assert.strictEqual(cache.has('a'), false);
			assert.strictEqual(cache.get('b'), 2);
		});

		test('Should handle capacity of 2 with eviction', () => {
			const cache = new LRUCache<string, number>(2);

			cache.set('a', 1);
			cache.set('b', 2);
			assert.strictEqual(cache.size, 2);

			// Full capacity - adding 3rd should evict 'a'
			cache.set('c', 3);
			assert.strictEqual(cache.size, 2);
			assert.strictEqual(cache.has('a'), false);
			assert.strictEqual(cache.has('b'), true);
			assert.strictEqual(cache.has('c'), true);
		});

		test('Should fill exactly to capacity without eviction', () => {
			const cache = new LRUCache<string, number>(3);

			cache.set('a', 1);
			assert.strictEqual(cache.size, 1);

			cache.set('b', 2);
			assert.strictEqual(cache.size, 2);

			cache.set('c', 3);
			assert.strictEqual(cache.size, 3);

			// All items should still be there
			assert.strictEqual(cache.has('a'), true);
			assert.strictEqual(cache.has('b'), true);
			assert.strictEqual(cache.has('c'), true);
		});

		test('Should handle undefined values correctly', () => {
			const cache = new LRUCache<string, number | undefined>(3);

			// Set undefined as a value
			cache.set('a', undefined);
			cache.set('b', 2);
			cache.set('c', 3);

			// Get should return undefined and update LRU order
			assert.strictEqual(cache.get('a'), undefined);
			assert.strictEqual(cache.has('a'), true);

			// Add 4th item - should evict 'b' (not 'a', since 'a' was just accessed)
			cache.set('d', 4);

			assert.strictEqual(cache.has('a'), true);  // Still there (was accessed)
			assert.strictEqual(cache.has('b'), false); // Evicted (least recently used)
			assert.strictEqual(cache.has('c'), true);
			assert.strictEqual(cache.has('d'), true);
		});

		test('Should distinguish between undefined value and missing key', () => {
			const cache = new LRUCache<string, number | undefined>(3);

			cache.set('exists', undefined);

			// Both return undefined, but different semantics
			assert.strictEqual(cache.get('exists'), undefined);
			assert.strictEqual(cache.get('missing'), undefined);

			// But has() shows the difference
			assert.strictEqual(cache.has('exists'), true);
			assert.strictEqual(cache.has('missing'), false);
		});

		test('Should handle null values correctly', () => {
			const cache = new LRUCache<string, number | null>(3);

			cache.set('a', null);
			cache.set('b', 2);
			cache.set('c', 3);

			// Get should return null and update LRU order
			assert.strictEqual(cache.get('a'), null);
			assert.strictEqual(cache.has('a'), true);

			// Add 4th item - should evict 'b' (not 'a')
			cache.set('d', 4);

			assert.strictEqual(cache.has('a'), true);
			assert.strictEqual(cache.has('b'), false);
			assert.strictEqual(cache.get('a'), null);
		});

		test('Should handle delete from middle of cache', () => {
			const cache = new LRUCache<string, number>(3);

			cache.set('a', 1);
			cache.set('b', 2);
			cache.set('c', 3);

			// Delete from middle
			assert.strictEqual(cache.delete('b'), true);
			assert.strictEqual(cache.size, 2);

			// LRU order should be: a, c
			assert.deepStrictEqual(cache.keys(), ['a', 'c']);

			// Add two new items - first fills to capacity, second should evict 'a'
			cache.set('d', 4);
			assert.strictEqual(cache.size, 3); // Full capacity

			cache.set('e', 5); // Should evict 'a' (oldest)
			assert.strictEqual(cache.has('a'), false);
			assert.strictEqual(cache.has('c'), true);
			assert.strictEqual(cache.has('d'), true);
			assert.strictEqual(cache.has('e'), true);
		});

		test('Should handle set after delete of same key', () => {
			const cache = new LRUCache<string, number>(3);

			cache.set('a', 1);
			cache.set('b', 2);
			cache.set('c', 3);

			// Delete and re-add same key
			cache.delete('a');
			cache.set('a', 100);

			// 'a' should now be most recent
			cache.set('d', 4); // Should evict 'b'

			assert.strictEqual(cache.has('a'), true);
			assert.strictEqual(cache.has('b'), false);
			assert.strictEqual(cache.has('c'), true);
			assert.strictEqual(cache.has('d'), true);
			assert.strictEqual(cache.get('a'), 100);
		});

		test('Should handle empty cache operations', () => {
			const cache = new LRUCache<string, number>(10);

			assert.strictEqual(cache.size, 0);
			assert.strictEqual(cache.get('key'), undefined);
			assert.strictEqual(cache.has('key'), false);
			assert.deepStrictEqual(cache.keys(), []);
			assert.deepStrictEqual(cache.values(), []);
			assert.deepStrictEqual(cache.entries(), []);

			cache.clear(); // Should not throw
			assert.strictEqual(cache.size, 0);
		});

	});

	suite('LRU Semantics', () => {

		test('has() should NOT update LRU order', () => {
			const cache = new LRUCache<string, number>(3);

			cache.set('a', 1);
			cache.set('b', 2);
			cache.set('c', 3);

			// Check 'a' with has() - should NOT update LRU order
			assert.strictEqual(cache.has('a'), true);

			// Add 4th item - should still evict 'a' (oldest)
			cache.set('d', 4);

			assert.strictEqual(cache.has('a'), false); // 'a' was evicted
			assert.strictEqual(cache.has('b'), true);
			assert.strictEqual(cache.has('c'), true);
			assert.strictEqual(cache.has('d'), true);
		});

		test('get() should update LRU order', () => {
			const cache = new LRUCache<string, number>(3);

			cache.set('a', 1);
			cache.set('b', 2);
			cache.set('c', 3);

			// Access 'a' with get() - SHOULD update LRU order
			cache.get('a');

			// Add 4th item - should evict 'b' (not 'a')
			cache.set('d', 4);

			assert.strictEqual(cache.has('a'), true);  // 'a' was accessed
			assert.strictEqual(cache.has('b'), false); // 'b' was evicted
			assert.strictEqual(cache.has('c'), true);
			assert.strictEqual(cache.has('d'), true);
		});

		test('set() of existing key should update LRU order', () => {
			const cache = new LRUCache<string, number>(3);

			cache.set('a', 1);
			cache.set('b', 2);
			cache.set('c', 3);

			// Update 'a' - SHOULD update LRU order
			cache.set('a', 100);

			// Add 4th item - should evict 'b' (not 'a')
			cache.set('d', 4);

			assert.strictEqual(cache.has('a'), true);  // 'a' was updated
			assert.strictEqual(cache.get('a'), 100);
			assert.strictEqual(cache.has('b'), false); // 'b' was evicted
			assert.strictEqual(cache.has('c'), true);
			assert.strictEqual(cache.has('d'), true);
		});

		test('delete() should not affect LRU order of remaining items', () => {
			const cache = new LRUCache<string, number>(4);

			cache.set('a', 1);
			cache.set('b', 2);
			cache.set('c', 3);
			cache.set('d', 4);

			// Delete middle item
			cache.delete('b');

			// LRU order should remain: a, c, d (oldest to newest)
			const keys = cache.keys();
			assert.deepStrictEqual(keys, ['a', 'c', 'd']);

			// Verify eviction order is correct
			cache.set('e', 5); // Fills to capacity (4 items)
			assert.strictEqual(cache.size, 4);

			cache.set('f', 6); // Should evict 'a' (oldest)

			assert.strictEqual(cache.has('a'), false); // Oldest was evicted
			assert.deepStrictEqual(cache.keys(), ['c', 'd', 'e', 'f']);
		});

	});

	suite('Real-world Usage Scenario', () => {

		test('Should work as LLM description cache', () => {
			// Simulate LLM service cache usage
			const cache = new LRUCache<string, string>(5);

			// Cache some descriptions
			cache.set('func1:param1', 'Description for param1');
			cache.set('func1:param2', 'Description for param2');
			cache.set('func2:param1', 'Description for param1 in func2');
			cache.set('func2:param2', 'Description for param2 in func2');
			cache.set('func3:param1', 'Description for param1 in func3');

			assert.strictEqual(cache.size, 5);

			// Access some cached items
			assert.strictEqual(cache.get('func1:param1'), 'Description for param1');
			assert.strictEqual(cache.get('func2:param1'), 'Description for param1 in func2');

			// Add new item - should evict func1:param2 (least recently used)
			cache.set('func4:param1', 'Description for param1 in func4');

			assert.strictEqual(cache.size, 5);
			assert.strictEqual(cache.has('func1:param2'), false);
			assert.strictEqual(cache.has('func1:param1'), true); // Still there (was accessed)
		});

		test('Should handle large number of insertions', () => {
			const cache = new LRUCache<string, number>(100);

			// Insert 200 items
			for (let i = 0; i < 200; i++) {
				cache.set(`key${i}`, i);
			}

			// Should only keep last 100
			assert.strictEqual(cache.size, 100);
			assert.strictEqual(cache.has('key0'), false);
			assert.strictEqual(cache.has('key99'), false);
			assert.strictEqual(cache.has('key100'), true);
			assert.strictEqual(cache.has('key199'), true);
		});

	});

});
