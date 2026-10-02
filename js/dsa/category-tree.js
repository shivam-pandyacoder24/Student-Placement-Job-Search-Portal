/*
 * General tree (each node can have any number of children).
 * Used for: the job-category hierarchy, for example
 *   All jobs > Data and AI > Machine learning > Computer vision
 *
 * Choosing a category shows every job in that node and everything below
 * it, which is a depth-first walk of the subtree.
 */
(function (global) {
  'use strict';
  const DSA = (global.DSA = global.DSA || {});

  class CategoryNode {
    constructor(name, parent) {
      this.name = name;
      this.parent = parent;
      this.children = [];
      this.items = []; // job IDs filed directly under this category
    }
  }

  class CategoryTree {
    constructor(rootName) {
      this.root = new CategoryNode(rootName, null);
      this._size = 1;
    }

    get size() {
      return this._size;
    }

    /*
     * Depth-first search (pre-order) for a category by name.
     * Returns the node and how many nodes were visited to reach it.
     */
    search(name) {
      let visited = 0;
      function walk(node) {
        visited++;
        if (node.name === name) return node;
        for (let i = 0; i < node.children.length; i++) {
          const found = walk(node.children[i]);
          if (found !== null) return found;
        }
        return null;
      }
      const node = walk(this.root);
      return { node: node, visited: visited };
    }

    find(name) {
      return this.search(name).node;
    }

    /* Add a child category under an existing one. */
    add(parentName, name) {
      const parent = this.find(parentName);
      if (parent === null) throw new Error('No category named "' + parentName + '"');
      if (this.find(name) !== null) throw new Error('Category "' + name + '" already exists');
      const node = new CategoryNode(name, parent);
      parent.children.push(node);
      this._size++;
      return node;
    }

    /* File an item (a job ID) under a category. */
    attach(name, item) {
      const node = this.find(name);
      if (node === null) throw new Error('No category named "' + name + '"');
      node.items.push(item);
    }

    /* Names from the root down to the category, by following parent links. */
    pathTo(name) {
      const path = [];
      let node = this.find(name);
      while (node !== null) {
        path.push(node.name);
        node = node.parent;
      }
      // Built from the node up, so turn it around.
      for (let i = 0, j = path.length - 1; i < j; i++, j--) {
        const held = path[i];
        path[i] = path[j];
        path[j] = held;
      }
      return path;
    }

    /*
     * Every item in the category and all categories below it.
     * Pre-order: the node's own items first, then each child's subtree.
     */
    collect(name) {
      const start = this.find(name);
      const items = [];
      let visited = 0;
      function walk(node) {
        visited++;
        for (let i = 0; i < node.items.length; i++) items.push(node.items[i]);
        for (let i = 0; i < node.children.length; i++) walk(node.children[i]);
      }
      if (start !== null) walk(start);
      return { items: items, visited: visited };
    }

    /* Post-order count: a node's total is its own items plus its children's totals. */
    countItems(node) {
      let total = node.items.length;
      for (let i = 0; i < node.children.length; i++) total += this.countItems(node.children[i]);
      return total;
    }

    /* Number of levels. A tree with only a root has height 1. */
    height(node) {
      const from = node === undefined ? this.root : node;
      let tallest = 0;
      for (let i = 0; i < from.children.length; i++) {
        const h = this.height(from.children[i]);
        if (h > tallest) tallest = h;
      }
      return tallest + 1;
    }

    /* Pre-order list with depth, for drawing the tree as an indented outline. */
    preorder() {
      const rows = [];
      function walk(node, depth) {
        rows.push({ node: node, depth: depth });
        for (let i = 0; i < node.children.length; i++) walk(node.children[i], depth + 1);
      }
      walk(this.root, 0);
      return rows;
    }

    /* Breadth-first list of names, level by level, using a queue. */
    levelOrder() {
      const names = [];
      const queue = new DSA.Queue();
      queue.enqueue(this.root);
      while (!queue.isEmpty()) {
        const node = queue.dequeue();
        names.push(node.name);
        for (let i = 0; i < node.children.length; i++) queue.enqueue(node.children[i]);
      }
      return names;
    }
  }

  DSA.CategoryTree = CategoryTree;
})(typeof window !== 'undefined' ? window : globalThis);
