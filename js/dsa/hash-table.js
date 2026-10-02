/*
 * Hash table with separate chaining.
 * Used for: looking up a job or a candidate by ID in one step. Also used by
 * the graph to store each node's neighbour list.
 *
 * A key is turned into a number by a hash function, and that number picks a
 * bucket. Keys that land in the same bucket are kept in a short linked
 * chain. With a good spread, a lookup touches only one or two entries.
 */
(function (global) {
  'use strict';
  const DSA = (global.DSA = global.DSA || {});

  class ChainNode {
    constructor(key, value, next) {
      this.key = key;
      this.value = value;
      this.next = next;
    }
  }

  class HashTable {
    /*
     * bucketCount   - starting number of buckets
     * maxLoadFactor - average chain length that triggers a resize
     */
    constructor(bucketCount = 16, maxLoadFactor = 0.75) {
      this._buckets = new Array(Math.max(1, bucketCount)).fill(null);
      this._size = 0;
      this._maxLoadFactor = maxLoadFactor;
    }

    get size() {
      return this._size;
    }

    get bucketCount() {
      return this._buckets.length;
    }

    get loadFactor() {
      return this._size / this._buckets.length;
    }

    /* Polynomial hash: h = h * 31 + character code, kept to 32 bits. */
    hash(key) {
      const text = String(key);
      let h = 0;
      for (let i = 0; i < text.length; i++) {
        h = (Math.imul(h, 31) + text.charCodeAt(i)) >>> 0;
      }
      return h;
    }

    bucketOf(key) {
      return this.hash(key) % this._buckets.length;
    }

    _resize() {
      const old = this._buckets;
      this._buckets = new Array(old.length * 2).fill(null);
      this._size = 0;
      for (let i = 0; i < old.length; i++) {
        // Re-insert oldest first so chains keep their newest-first order.
        const chain = [];
        for (let node = old[i]; node !== null; node = node.next) chain.push(node);
        for (let j = chain.length - 1; j >= 0; j--) this.set(chain[j].key, chain[j].value);
      }
    }

    /* Insert or replace. Reports where the key went. */
    set(key, value) {
      const textKey = String(key);
      const bucket = this.bucketOf(textKey);
      for (let node = this._buckets[bucket]; node !== null; node = node.next) {
        if (node.key === textKey) {
          node.value = value;
          return { bucket: bucket, collided: false, replaced: true };
        }
      }
      const collided = this._buckets[bucket] !== null;
      this._buckets[bucket] = new ChainNode(textKey, value, this._buckets[bucket]);
      this._size++;
      if (this.loadFactor > this._maxLoadFactor) {
        this._resize();
        return { bucket: this.bucketOf(textKey), collided: collided, replaced: false };
      }
      return { bucket: bucket, collided: collided, replaced: false };
    }

    /* Full report of a lookup, for showing the work on screen. */
    lookup(key) {
      const textKey = String(key);
      const bucket = this.bucketOf(textKey);
      let comparisons = 0;
      let chainLength = 0;
      let found = false;
      let value;
      for (let node = this._buckets[bucket]; node !== null; node = node.next) {
        chainLength++;
        if (!found) {
          comparisons++;
          if (node.key === textKey) {
            found = true;
            value = node.value;
          }
        }
      }
      return {
        found: found,
        value: value,
        hash: this.hash(textKey),
        bucket: bucket,
        comparisons: comparisons,
        chainLength: chainLength,
      };
    }

    get(key) {
      return this.lookup(key).value;
    }

    has(key) {
      return this.lookup(key).found;
    }

    delete(key) {
      const textKey = String(key);
      const bucket = this.bucketOf(textKey);
      let previous = null;
      for (let node = this._buckets[bucket]; node !== null; node = node.next) {
        if (node.key === textKey) {
          if (previous === null) this._buckets[bucket] = node.next;
          else previous.next = node.next;
          this._size--;
          return true;
        }
        previous = node;
      }
      return false;
    }

    keys() {
      const keys = [];
      for (let i = 0; i < this._buckets.length; i++) {
        for (let node = this._buckets[i]; node !== null; node = node.next) keys.push(node.key);
      }
      return keys;
    }

    /* One array of keys per bucket, in chain order. For drawing the table. */
    bucketKeys() {
      const all = [];
      for (let i = 0; i < this._buckets.length; i++) {
        const chain = [];
        for (let node = this._buckets[i]; node !== null; node = node.next) chain.push(node.key);
        all.push(chain);
      }
      return all;
    }
  }

  DSA.HashTable = HashTable;
})(typeof window !== 'undefined' ? window : globalThis);
