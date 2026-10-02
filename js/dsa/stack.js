/*
 * Stack (last in, first out).
 * Used for: recent activity and undo. Also used by the graph for
 * depth-first traversal.
 *
 * Array-based with a `top` index, the way it is usually written in C.
 * push, pop and peek are all O(1).
 */
(function (global) {
  'use strict';
  const DSA = (global.DSA = global.DSA || {});

  class Stack {
    constructor(capacity = 8) {
      this._items = new Array(Math.max(1, capacity));
      this._top = -1;
    }

    get size() {
      return this._top + 1;
    }

    isEmpty() {
      return this._top === -1;
    }

    push(value) {
      if (this._top + 1 === this._items.length) {
        const bigger = new Array(this._items.length * 2);
        for (let i = 0; i <= this._top; i++) bigger[i] = this._items[i];
        this._items = bigger;
      }
      this._top++;
      this._items[this._top] = value;
    }

    /* Remove and return the top item, or null when the stack is empty. */
    pop() {
      if (this._top === -1) return null;
      const value = this._items[this._top];
      this._items[this._top] = undefined;
      this._top--;
      return value;
    }

    peek() {
      return this._top === -1 ? null : this._items[this._top];
    }

    /* Top first. */
    toArray() {
      const values = [];
      for (let i = this._top; i >= 0; i--) values.push(this._items[i]);
      return values;
    }

    clear() {
      for (let i = 0; i <= this._top; i++) this._items[i] = undefined;
      this._top = -1;
    }
  }

  DSA.Stack = Stack;
})(typeof window !== 'undefined' ? window : globalThis);
