/*
 * Binary search tree.
 * Used for: an index of job IDs.
 *
 * Smaller keys go left, larger keys go right. Searching follows one branch
 * at each node, so it takes about log2(n) steps when the tree is balanced.
 * An in-order walk visits the keys in sorted order, which also makes
 * "all IDs between A and B" fast.
 */
(function (global) {
  'use strict';
  const DSA = (global.DSA = global.DSA || {});

  class BstNode {
    constructor(key, value) {
      this.key = key;
      this.value = value;
      this.left = null;
      this.right = null;
    }
  }

  class BinarySearchTree {
    constructor() {
      this.root = null;
      this._size = 0;
    }

    get size() {
      return this._size;
    }

    /* Insert a key. If the key already exists its value is replaced. */
    insert(key, value) {
      if (this.root === null) {
        this.root = new BstNode(key, value);
        this._size++;
        return;
      }
      let node = this.root;
      while (true) {
        if (key === node.key) {
          node.value = value;
          return;
        }
        if (key < node.key) {
          if (node.left === null) {
            node.left = new BstNode(key, value);
            this._size++;
            return;
          }
          node = node.left;
        } else {
          if (node.right === null) {
            node.right = new BstNode(key, value);
            this._size++;
            return;
          }
          node = node.right;
        }
      }
    }

    /*
     * Search for a key and record the route taken.
     * path - every key that was compared, in order
     * turns - 'left' or 'right' taken after each comparison that was not a match
     */
    search(key) {
      const path = [];
      const turns = [];
      let node = this.root;
      while (node !== null) {
        path.push(node.key);
        if (key === node.key) {
          return { found: true, value: node.value, path: path, turns: turns, comparisons: path.length };
        }
        if (key < node.key) {
          turns.push('left');
          node = node.left;
        } else {
          turns.push('right');
          node = node.right;
        }
      }
      return { found: false, value: undefined, path: path, turns: turns, comparisons: path.length };
    }

    min() {
      if (this.root === null) return null;
      let node = this.root;
      while (node.left !== null) node = node.left;
      return node.key;
    }

    max() {
      if (this.root === null) return null;
      let node = this.root;
      while (node.right !== null) node = node.right;
      return node.key;
    }

    /* Left subtree, node, right subtree: keys come out sorted. */
    inorder() {
      const entries = [];
      function walk(node) {
        if (node === null) return;
        walk(node.left);
        entries.push({ key: node.key, value: node.value });
        walk(node.right);
      }
      walk(this.root);
      return entries;
    }

    /*
     * All entries with low <= key <= high, in order. Skips whole subtrees
     * that cannot contain a key in the range.
     */
    range(low, high) {
      const entries = [];
      let visited = 0;
      function walk(node) {
        if (node === null) return;
        visited++;
        if (low < node.key) walk(node.left);
        if (low <= node.key && node.key <= high) entries.push({ key: node.key, value: node.value });
        if (node.key < high) walk(node.right);
      }
      walk(this.root);
      return { entries: entries, visited: visited };
    }

    /* Number of levels. An empty tree has height 0. */
    height() {
      function walk(node) {
        if (node === null) return 0;
        const left = walk(node.left);
        const right = walk(node.right);
        return (left > right ? left : right) + 1;
      }
      return walk(this.root);
    }

    /*
     * Delete a key. Three cases:
     *   no children  - remove the node
     *   one child    - the child takes the node's place
     *   two children - copy in the next larger key (the smallest key in the
     *                  right subtree), then delete that key from the right
     */
    remove(key) {
      const tree = this;
      let removed = false;
      function removeFrom(node, target) {
        if (node === null) return null;
        if (target < node.key) {
          node.left = removeFrom(node.left, target);
          return node;
        }
        if (target > node.key) {
          node.right = removeFrom(node.right, target);
          return node;
        }
        removed = true;
        if (node.left === null) return node.right;
        if (node.right === null) return node.left;
        let successor = node.right;
        while (successor.left !== null) successor = successor.left;
        node.key = successor.key;
        node.value = successor.value;
        node.right = removeFrom(node.right, successor.key);
        return node;
      }
      tree.root = removeFrom(tree.root, key);
      if (removed) tree._size--;
      return removed;
    }

    /*
     * Position of every node for drawing: x is the node's place in sorted
     * order, depth is its level (root = 0).
     */
    layout() {
      const nodes = [];
      let column = 0;
      function walk(node, depth, parentKey) {
        if (node === null) return;
        walk(node.left, depth + 1, node.key);
        nodes.push({ key: node.key, x: column, depth: depth, parentKey: parentKey });
        column++;
        walk(node.right, depth + 1, node.key);
      }
      walk(this.root, 0, null);
      return nodes;
    }
  }

  DSA.BinarySearchTree = BinarySearchTree;
})(typeof window !== 'undefined' ? window : globalThis);
