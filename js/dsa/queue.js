/*
 * Queue (first in, first out).
 * Used for: the placement cell's review queue. Also used by the graph and
 * the category tree for breadth-first traversal.
 *
 * Circular array with `front` and `count`, the way it is usually written
 * in C. enqueue and dequeue are O(1); the array doubles when it is full.
 */
(function (global) {
  'use strict';
  const DSA = (global.DSA = global.DSA || {});

  class Queue {
    constructor(capacity = 8) {
      this._items = new Array(Math.max(1, capacity));
      this._front = 0;
      this._count = 0;
    }

    get size() {
      return this._count;
    }

    isEmpty() {
      return this._count === 0;
    }

    _grow() {
      const capacity = this._items.length;
      const bigger = new Array(capacity * 2);
      for (let i = 0; i < this._count; i++) {
        bigger[i] = this._items[(this._front + i) % capacity];
      }
      this._items = bigger;
      this._front = 0;
    }

    /* Add at the back. */
    enqueue(value) {
      if (this._count === this._items.length) this._grow();
      const rear = (this._front + this._count) % this._items.length;
      this._items[rear] = value;
      this._count++;
    }

    /* Remove and return the front item, or null when the queue is empty. */
    dequeue() {
      if (this._count === 0) return null;
      const value = this._items[this._front];
      this._items[this._front] = undefined;
      this._front = (this._front + 1) % this._items.length;
      this._count--;
      return value;
    }

    peek() {
      return this._count === 0 ? null : this._items[this._front];
    }

    /*
     * Take out the first item that passes the test, keeping everyone else
     * in the same order. Done with queue operations only: every item is
     * dequeued once and put back at the rear unless it is the one leaving.
     */
    removeWhere(test) {
      let removed = null;
      const rounds = this._count;
      for (let i = 0; i < rounds; i++) {
        const value = this.dequeue();
        if (removed === null && test(value)) removed = value;
        else this.enqueue(value);
      }
      return removed;
    }

    /* Front first. */
    toArray() {
      const values = [];
      for (let i = 0; i < this._count; i++) {
        values.push(this._items[(this._front + i) % this._items.length]);
      }
      return values;
    }

    clear() {
      this._items = new Array(this._items.length);
      this._front = 0;
      this._count = 0;
    }
  }

  DSA.Queue = Queue;
})(typeof window !== 'undefined' ? window : globalThis);
