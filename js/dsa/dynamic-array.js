/*
 * Dynamic array.
 * Used for: the list of job records.
 *
 * Works like an array in C that is re-allocated with double the space
 * when it fills up. Reading by index is O(1); inserting or removing in the
 * middle shifts the items after it, which is O(n).
 */
(function (global) {
  'use strict';
  const DSA = (global.DSA = global.DSA || {});

  class DynamicArray {
    constructor(capacity = 8) {
      this._capacity = Math.max(1, capacity);
      this._items = new Array(this._capacity);
      this._length = 0;
    }

    static from(values) {
      const array = new DynamicArray(Math.max(1, values.length));
      for (let i = 0; i < values.length; i++) array.push(values[i]);
      return array;
    }

    get length() {
      return this._length;
    }

    get capacity() {
      return this._capacity;
    }

    _checkIndex(index) {
      if (!Number.isInteger(index) || index < 0 || index >= this._length) {
        throw new RangeError('Index ' + index + ' is outside 0..' + (this._length - 1));
      }
    }

    _grow() {
      const bigger = new Array(this._capacity * 2);
      for (let i = 0; i < this._length; i++) bigger[i] = this._items[i];
      this._items = bigger;
      this._capacity *= 2;
    }

    get(index) {
      this._checkIndex(index);
      return this._items[index];
    }

    set(index, value) {
      this._checkIndex(index);
      this._items[index] = value;
    }

    push(value) {
      if (this._length === this._capacity) this._grow();
      this._items[this._length] = value;
      this._length++;
      return this._length;
    }

    insertAt(index, value) {
      if (!Number.isInteger(index) || index < 0 || index > this._length) {
        throw new RangeError('Cannot insert at index ' + index);
      }
      if (this._length === this._capacity) this._grow();
      for (let i = this._length; i > index; i--) this._items[i] = this._items[i - 1];
      this._items[index] = value;
      this._length++;
    }

    removeAt(index) {
      this._checkIndex(index);
      const removed = this._items[index];
      for (let i = index; i < this._length - 1; i++) this._items[i] = this._items[i + 1];
      this._items[this._length - 1] = undefined;
      this._length--;
      return removed;
    }

    forEach(visit) {
      for (let i = 0; i < this._length; i++) visit(this._items[i], i);
    }

    /* A plain copy, so callers can sort or filter without touching the store. */
    toArray() {
      const copy = new Array(this._length);
      for (let i = 0; i < this._length; i++) copy[i] = this._items[i];
      return copy;
    }
  }

  DSA.DynamicArray = DynamicArray;
})(typeof window !== 'undefined' ? window : globalThis);
