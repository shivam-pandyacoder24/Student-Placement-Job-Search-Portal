/*
 * Directed graph stored as adjacency lists.
 * Used for: the map of how skills lead to fields, fields lead to roles and
 * roles lead to the companies hiring for them, for example
 *   Python -> Data Science -> Machine Learning -> AI Engineer
 *
 * Breadth-first search (with a queue) finds the route with the fewest
 * steps. Depth-first search (with a stack) follows one branch to its end
 * before trying the next.
 *
 * Needs: hash-table.js, queue.js, stack.js
 */
(function (global) {
  'use strict';
  const DSA = (global.DSA = global.DSA || {});

  class Graph {
    constructor() {
      this._adjacent = new DSA.HashTable(32); // node id -> array of neighbour ids
      this._data = new DSA.HashTable(32); // node id -> details about the node
      this._order = []; // node ids in the order they were added
      this._edgeCount = 0;
    }

    get nodeCount() {
      return this._order.length;
    }

    get edgeCount() {
      return this._edgeCount;
    }

    hasNode(id) {
      return this._adjacent.has(id);
    }

    addNode(id, data) {
      if (this.hasNode(id)) return;
      this._adjacent.set(id, []);
      this._data.set(id, data === undefined ? {} : data);
      this._order.push(id);
    }

    /* One-way link from -> to. Missing nodes are created; repeats are ignored. */
    addEdge(from, to) {
      this.addNode(from);
      this.addNode(to);
      const list = this._adjacent.get(from);
      for (let i = 0; i < list.length; i++) {
        if (list[i] === to) return false;
      }
      list.push(to);
      this._edgeCount++;
      return true;
    }

    neighbors(id) {
      const list = this._adjacent.get(id);
      return list === undefined ? [] : list.slice();
    }

    data(id) {
      return this._data.get(id);
    }

    nodes() {
      return this._order.slice();
    }

    edges() {
      const all = [];
      for (let i = 0; i < this._order.length; i++) {
        const from = this._order[i];
        const list = this._adjacent.get(from);
        for (let j = 0; j < list.length; j++) all.push({ from: from, to: list[j] });
      }
      return all;
    }

    /*
     * Breadth-first search from `start`.
     * Returns every node that can be reached, nearest first, with the number
     * of steps to it and the node it was reached from.
     */
    bfs(start) {
      const result = { order: [], distance: new DSA.HashTable(32), parent: new DSA.HashTable(32) };
      if (!this.hasNode(start)) return result;
      const queue = new DSA.Queue();
      result.distance.set(start, 0);
      queue.enqueue(start);
      while (!queue.isEmpty()) {
        const id = queue.dequeue();
        result.order.push(id);
        const list = this._adjacent.get(id);
        for (let i = 0; i < list.length; i++) {
          const next = list[i];
          if (!result.distance.has(next)) {
            result.distance.set(next, result.distance.get(id) + 1);
            result.parent.set(next, id);
            queue.enqueue(next);
          }
        }
      }
      return result;
    }

    /*
     * Shortest route (fewest links) from one node to another, or null when
     * there is no route. `explored` is how many nodes BFS took off the queue.
     */
    shortestPath(from, to) {
      if (!this.hasNode(from) || !this.hasNode(to)) return { path: null, explored: 0 };
      const parent = new DSA.HashTable(32);
      const seen = new DSA.HashTable(32);
      const queue = new DSA.Queue();
      let explored = 0;
      seen.set(from, true);
      queue.enqueue(from);
      while (!queue.isEmpty()) {
        const id = queue.dequeue();
        explored++;
        if (id === to) {
          const path = [];
          let step = to;
          while (step !== undefined) {
            path.push(step);
            step = parent.get(step);
          }
          for (let i = 0, j = path.length - 1; i < j; i++, j--) {
            const held = path[i];
            path[i] = path[j];
            path[j] = held;
          }
          return { path: path, explored: explored };
        }
        const list = this._adjacent.get(id);
        for (let i = 0; i < list.length; i++) {
          const next = list[i];
          if (!seen.has(next)) {
            seen.set(next, true);
            parent.set(next, id);
            queue.enqueue(next);
          }
        }
      }
      return { path: null, explored: explored };
    }

    /* Depth-first order from `start`, using an explicit stack. */
    dfs(start) {
      const order = [];
      if (!this.hasNode(start)) return order;
      const seen = new DSA.HashTable(32);
      const stack = new DSA.Stack();
      stack.push(start);
      while (!stack.isEmpty()) {
        const id = stack.pop();
        if (seen.has(id)) continue;
        seen.set(id, true);
        order.push(id);
        const list = this._adjacent.get(id);
        // Push in reverse so the first neighbour is explored first.
        for (let i = list.length - 1; i >= 0; i--) {
          if (!seen.has(list[i])) stack.push(list[i]);
        }
      }
      return order;
    }

    /* Everything reachable from `start` (not counting start), nearest first. */
    reachable(start) {
      const search = this.bfs(start);
      const found = [];
      for (let i = 1; i < search.order.length; i++) {
        const id = search.order[i];
        found.push({ id: id, steps: search.distance.get(id) });
      }
      return found;
    }
  }

  DSA.Graph = Graph;
})(typeof window !== 'undefined' ? window : globalThis);
