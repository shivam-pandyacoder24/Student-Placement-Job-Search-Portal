/*
 * Singly linked list.
 * Used for: a candidate's application history.
 *
 * Each node holds one application and a pointer to the next node. Adding at
 * the head is O(1), so the newest application is always first. Removing an
 * application means walking the chain and re-linking around the node.
 */
(function (global) {
  'use strict';
  const DSA = (global.DSA = global.DSA || {});

  class ListNode {
    constructor(value) {
      this.value = value;
      this.next = null;
    }
  }

  class LinkedList {
    constructor() {
      this.head = null;
      this.tail = null;
      this._size = 0;
    }

    get size() {
      return this._size;
    }

    isEmpty() {
      return this._size === 0;
    }

    /* Add at the front. O(1). */
    prepend(value) {
      const node = new ListNode(value);
      node.next = this.head;
      this.head = node;
      if (this.tail === null) this.tail = node;
      this._size++;
    }

    /* Add at the end. O(1) because the list keeps a tail pointer. */
    append(value) {
      const node = new ListNode(value);
      if (this.tail === null) {
        this.head = node;
        this.tail = node;
      } else {
        this.tail.next = node;
        this.tail = node;
      }
      this._size++;
    }

    /*
     * Insert so the list stays ordered. `compare(a, b)` is negative when a
     * should come before b. Walks until it finds the first node that the
     * new value should come before.
     */
    insertSorted(value, compare) {
      if (this.head === null || compare(value, this.head.value) <= 0) {
        this.prepend(value);
        return;
      }
      let previous = this.head;
      while (previous.next !== null && compare(value, previous.next.value) > 0) {
        previous = previous.next;
      }
      const node = new ListNode(value);
      node.next = previous.next;
      previous.next = node;
      if (node.next === null) this.tail = node;
      this._size++;
    }

    /* First value that passes the test, or null. O(n). */
    find(test) {
      let node = this.head;
      while (node !== null) {
        if (test(node.value)) return node.value;
        node = node.next;
      }
      return null;
    }

    /* Unlink the first node that passes the test. Returns its value or null. */
    removeWhere(test) {
      let previous = null;
      let node = this.head;
      while (node !== null) {
        if (test(node.value)) {
          if (previous === null) this.head = node.next;
          else previous.next = node.next;
          if (node === this.tail) this.tail = previous;
          this._size--;
          return node.value;
        }
        previous = node;
        node = node.next;
      }
      return null;
    }

    forEach(visit) {
      let node = this.head;
      let index = 0;
      while (node !== null) {
        visit(node.value, index);
        node = node.next;
        index++;
      }
    }

    /* Head first. */
    toArray() {
      const values = [];
      this.forEach(function (value) {
        values.push(value);
      });
      return values;
    }

    clear() {
      this.head = null;
      this.tail = null;
      this._size = 0;
    }
  }

  DSA.LinkedList = LinkedList;
})(typeof window !== 'undefined' ? window : globalThis);
