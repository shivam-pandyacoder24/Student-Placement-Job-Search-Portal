'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { DSA } = require('./load.js');

/* A small repeatable random number generator, so failures can be re-run. */
function randomSource(seed) {
  let state = seed >>> 0;
  return function () {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

test('DynamicArray grows, inserts and removes with shifting', function () {
  const array = new DSA.DynamicArray(2);
  for (let i = 0; i < 10; i++) array.push(i * 10);
  assert.equal(array.length, 10);
  assert.ok(array.capacity >= 10);
  assert.equal(array.get(7), 70);

  array.insertAt(0, -1);
  array.insertAt(5, 999);
  assert.deepEqual(array.toArray(), [-1, 0, 10, 20, 30, 999, 40, 50, 60, 70, 80, 90]);

  assert.equal(array.removeAt(5), 999);
  assert.equal(array.removeAt(0), -1);
  assert.deepEqual(array.toArray(), [0, 10, 20, 30, 40, 50, 60, 70, 80, 90]);

  array.set(9, 91);
  assert.equal(array.get(9), 91);
  assert.throws(function () { array.get(10); }, RangeError);
  assert.throws(function () { array.get(-1); }, RangeError);
  assert.throws(function () { array.insertAt(99, 1); }, RangeError);
});

test('linearSearch finds every match and checks every item', function () {
  const words = ['data', 'web', 'database', 'cloud', 'metadata'];
  const result = DSA.search.linearSearch(words, function (word) { return word.includes('data'); });
  assert.deepEqual(result.indexes, [0, 2, 4]);
  assert.equal(result.comparisons, 5);
});

test('binarySearch finds exact keys in a sorted list', function () {
  const keys = ['ant', 'bee', 'cat', 'dog', 'eel', 'fox', 'gnu'];
  const identity = function (key) { return key; };
  for (let i = 0; i < keys.length; i++) {
    const result = DSA.search.binarySearch(keys, identity, keys[i]);
    assert.equal(result.index, i);
    assert.ok(result.comparisons <= 3, 'at most log2(7) rounded up comparisons');
  }
  assert.equal(DSA.search.binarySearch(keys, identity, 'cow').index, -1);
  assert.equal(DSA.search.binarySearch([], identity, 'cow').index, -1);
});

test('binarySearchPrefix returns the whole block of matching keys', function () {
  const keys = ['alpha', 'beta', 'data analyst', 'data engineer', 'data scientist', 'devops', 'zeta'];
  const identity = function (key) { return key; };
  assert.deepEqual(DSA.search.binarySearchPrefix(keys, identity, 'data').indexes, [2, 3, 4]);
  assert.deepEqual(DSA.search.binarySearchPrefix(keys, identity, 'd').indexes, [2, 3, 4, 5]);
  assert.deepEqual(DSA.search.binarySearchPrefix(keys, identity, 'a').indexes, [0]);
  assert.deepEqual(DSA.search.binarySearchPrefix(keys, identity, 'zeta').indexes, [6]);
  assert.deepEqual(DSA.search.binarySearchPrefix(keys, identity, 'zz').indexes, []);
  assert.deepEqual(DSA.search.binarySearchPrefix(keys, identity, 'c').indexes, []);
  assert.deepEqual(DSA.search.binarySearchPrefix([], identity, 'a').indexes, []);
});

test('binarySearchPrefix agrees with a plain scan on random data', function () {
  const random = randomSource(7);
  const letters = 'abc';
  for (let round = 0; round < 200; round++) {
    const keys = [];
    const count = Math.floor(random() * 30);
    for (let i = 0; i < count; i++) {
      let key = '';
      const length = 1 + Math.floor(random() * 4);
      for (let j = 0; j < length; j++) key += letters[Math.floor(random() * letters.length)];
      keys.push(key);
    }
    keys.sort();
    let prefix = '';
    const prefixLength = 1 + Math.floor(random() * 3);
    for (let j = 0; j < prefixLength; j++) prefix += letters[Math.floor(random() * letters.length)];

    const expected = [];
    keys.forEach(function (key, index) { if (key.startsWith(prefix)) expected.push(index); });
    const actual = DSA.search.binarySearchPrefix(keys, function (key) { return key; }, prefix).indexes;
    assert.deepEqual(actual, expected, 'prefix "' + prefix + '" in ' + JSON.stringify(keys));
  }
});

test('all four sorts agree with the built-in sort and leave the input alone', function () {
  const random = randomSource(42);
  const compare = function (a, b) { return a.key - b.key || a.tag - b.tag; };
  const names = ['bubbleSort', 'insertionSort', 'mergeSort', 'quickSort'];

  for (let round = 0; round < 150; round++) {
    const items = [];
    const count = Math.floor(random() * 40);
    for (let i = 0; i < count; i++) items.push({ key: Math.floor(random() * 12), tag: i });
    const before = items.slice();
    const expected = items.slice().sort(compare);

    names.forEach(function (name) {
      const result = DSA.sort[name](items, compare);
      assert.deepEqual(result.sorted, expected, name + ' on round ' + round);
      assert.deepEqual(items, before, name + ' must not change its input');
      assert.ok(result.comparisons >= 0 && result.moves >= 0);
    });
  }
});

test('mergeSort is stable', function () {
  const items = [
    { key: 2, tag: 'a' }, { key: 1, tag: 'b' }, { key: 2, tag: 'c' },
    { key: 1, tag: 'd' }, { key: 2, tag: 'e' },
  ];
  const sorted = DSA.sort.mergeSort(items, function (a, b) { return a.key - b.key; }).sorted;
  assert.deepEqual(sorted.map(function (item) { return item.tag; }), ['b', 'd', 'a', 'c', 'e']);
});

test('sorted input costs bubble and insertion sort only n - 1 comparisons', function () {
  const items = [];
  for (let i = 0; i < 20; i++) items.push(i);
  const compare = function (a, b) { return a - b; };
  assert.equal(DSA.sort.bubbleSort(items, compare).comparisons, 19);
  assert.equal(DSA.sort.insertionSort(items, compare).comparisons, 19);
  assert.equal(DSA.sort.insertionSort(items, compare).moves, 0);
});

test('LinkedList prepend, append, find, remove and insertSorted', function () {
  const list = new DSA.LinkedList();
  assert.equal(list.isEmpty(), true);
  list.append(2);
  list.append(3);
  list.prepend(1);
  assert.deepEqual(list.toArray(), [1, 2, 3]);
  assert.equal(list.size, 3);
  assert.equal(list.head.value, 1);
  assert.equal(list.tail.value, 3);

  assert.equal(list.find(function (value) { return value > 1; }), 2);
  assert.equal(list.find(function (value) { return value > 9; }), null);

  assert.equal(list.removeWhere(function (value) { return value === 3; }), 3); // tail
  assert.equal(list.tail.value, 2);
  list.append(4);
  assert.deepEqual(list.toArray(), [1, 2, 4]);
  assert.equal(list.removeWhere(function (value) { return value === 1; }), 1); // head
  assert.equal(list.head.value, 2);
  assert.equal(list.removeWhere(function (value) { return value === 99; }), null);
  assert.equal(list.size, 2);

  assert.equal(list.removeWhere(function () { return true; }), 2);
  assert.equal(list.removeWhere(function () { return true; }), 4);
  assert.equal(list.head, null);
  assert.equal(list.tail, null);
  assert.equal(list.size, 0);

  const descending = function (a, b) { return b - a; };
  [5, 9, 1, 7, 3, 9].forEach(function (value) { list.insertSorted(value, descending); });
  assert.deepEqual(list.toArray(), [9, 9, 7, 5, 3, 1]);
  assert.equal(list.tail.value, 1);
  list.append(0);
  assert.deepEqual(list.toArray(), [9, 9, 7, 5, 3, 1, 0]);
});

test('Stack is last in, first out and grows past its first capacity', function () {
  const stack = new DSA.Stack(2);
  assert.equal(stack.pop(), null);
  assert.equal(stack.peek(), null);
  for (let i = 1; i <= 20; i++) stack.push(i);
  assert.equal(stack.size, 20);
  assert.equal(stack.peek(), 20);
  assert.deepEqual(stack.toArray().slice(0, 3), [20, 19, 18]);
  for (let i = 20; i >= 1; i--) assert.equal(stack.pop(), i);
  assert.equal(stack.isEmpty(), true);
  assert.equal(stack.pop(), null);
});

test('Queue is first in, first out and survives wrap-around and growth', function () {
  const queue = new DSA.Queue(4);
  assert.equal(queue.dequeue(), null);
  const expected = [];
  const random = randomSource(3);
  let next = 0;
  for (let step = 0; step < 2000; step++) {
    if (random() < 0.55) {
      queue.enqueue(next);
      expected.push(next);
      next++;
    } else {
      const want = expected.length === 0 ? null : expected.shift();
      assert.equal(queue.dequeue(), want);
    }
    assert.equal(queue.size, expected.length);
    assert.equal(queue.peek(), expected.length === 0 ? null : expected[0]);
  }
  assert.deepEqual(queue.toArray(), expected);
});

test('Queue.removeWhere takes one item out and keeps the order of the rest', function () {
  const queue = new DSA.Queue(2);
  ['a', 'b', 'c', 'd', 'e'].forEach(function (value) { queue.enqueue(value); });
  assert.equal(queue.removeWhere(function (value) { return value === 'c'; }), 'c');
  assert.deepEqual(queue.toArray(), ['a', 'b', 'd', 'e']);
  assert.equal(queue.removeWhere(function (value) { return value === 'a'; }), 'a');
  assert.equal(queue.removeWhere(function (value) { return value === 'e'; }), 'e');
  assert.equal(queue.removeWhere(function (value) { return value === 'zzz'; }), null);
  assert.deepEqual(queue.toArray(), ['b', 'd']);
  assert.equal(queue.dequeue(), 'b');
});

test('HashTable set, get, replace, delete and resize', function () {
  const table = new DSA.HashTable(4, 0.75);
  for (let i = 0; i < 200; i++) table.set('key' + i, i);
  assert.equal(table.size, 200);
  assert.ok(table.bucketCount > 4, 'table grew');
  assert.ok(table.loadFactor <= 0.75);
  for (let i = 0; i < 200; i++) assert.equal(table.get('key' + i), i);

  assert.equal(table.get('missing'), undefined);
  assert.equal(table.has('missing'), false);
  assert.equal(table.set('key5', 'five').replaced, true);
  assert.equal(table.get('key5'), 'five');
  assert.equal(table.size, 200);

  assert.equal(table.delete('key5'), true);
  assert.equal(table.delete('key5'), false);
  assert.equal(table.has('key5'), false);
  assert.equal(table.size, 199);
  assert.equal(table.keys().length, 199);

  // Number and text forms of the same key are one key.
  table.set(1512, 'job');
  assert.equal(table.get('1512'), 'job');
});

test('HashTable chains keys that collide and reports the work of a lookup', function () {
  const table = new DSA.HashTable(1, 100); // one bucket: everything collides
  table.set('a', 1);
  assert.equal(table.set('b', 2).collided, true);
  table.set('c', 3);
  assert.deepEqual(table.bucketKeys(), [['c', 'b', 'a']]);
  const lookup = table.lookup('a');
  assert.deepEqual(
    { found: lookup.found, value: lookup.value, bucket: lookup.bucket, comparisons: lookup.comparisons, chain: lookup.chainLength },
    { found: true, value: 1, bucket: 0, comparisons: 3, chain: 3 }
  );
  assert.equal(table.lookup('zzz').found, false);
  assert.equal(table.delete('b'), true);
  assert.deepEqual(table.bucketKeys(), [['c', 'a']]);
});

test('CategoryTree search, path, collect, count and height', function () {
  const tree = new DSA.CategoryTree('All');
  tree.add('All', 'Software');
  tree.add('All', 'Data');
  tree.add('Software', 'Frontend');
  tree.add('Software', 'Backend');
  tree.add('Data', 'ML');
  tree.add('ML', 'Vision');
  tree.attach('Frontend', 1);
  tree.attach('Backend', 2);
  tree.attach('ML', 3);
  tree.attach('Vision', 4);
  tree.attach('Data', 5);

  assert.equal(tree.size, 7);
  assert.equal(tree.height(), 4);
  assert.deepEqual(tree.pathTo('Vision'), ['All', 'Data', 'ML', 'Vision']);
  assert.deepEqual(tree.pathTo('Nowhere'), []);
  assert.equal(tree.search('All').visited, 1);
  assert.equal(tree.search('Vision').visited, 7); // last node in pre-order
  assert.equal(tree.find('Nowhere'), null);

  assert.deepEqual(tree.collect('Data').items, [5, 3, 4]);
  assert.deepEqual(tree.collect('All').items, [1, 2, 5, 3, 4]);
  assert.equal(tree.collect('Software').visited, 3);
  assert.equal(tree.countItems(tree.root), 5);
  assert.equal(tree.countItems(tree.find('Software')), 2);

  assert.deepEqual(
    tree.preorder().map(function (row) { return row.depth + ':' + row.node.name; }),
    ['0:All', '1:Software', '2:Frontend', '2:Backend', '1:Data', '2:ML', '3:Vision']
  );
  assert.deepEqual(tree.levelOrder(), ['All', 'Software', 'Data', 'Frontend', 'Backend', 'ML', 'Vision']);
  assert.throws(function () { tree.add('Nowhere', 'X'); });
  assert.throws(function () { tree.add('All', 'ML'); });
});

test('BinarySearchTree insert, search path, order, range and height', function () {
  const tree = new DSA.BinarySearchTree();
  assert.equal(tree.height(), 0);
  assert.equal(tree.min(), null);
  [50, 30, 70, 20, 40, 60, 80, 35].forEach(function (key) { tree.insert(key, 'v' + key); });
  assert.equal(tree.size, 8);
  assert.equal(tree.height(), 4);
  assert.equal(tree.min(), 20);
  assert.equal(tree.max(), 80);

  const hit = tree.search(35);
  assert.equal(hit.found, true);
  assert.equal(hit.value, 'v35');
  assert.deepEqual(hit.path, [50, 30, 40, 35]);
  assert.deepEqual(hit.turns, ['left', 'right', 'left']);
  assert.equal(hit.comparisons, 4);

  const miss = tree.search(65);
  assert.equal(miss.found, false);
  assert.deepEqual(miss.path, [50, 70, 60]);

  assert.deepEqual(tree.inorder().map(function (entry) { return entry.key; }), [20, 30, 35, 40, 50, 60, 70, 80]);
  assert.deepEqual(tree.range(30, 60).entries.map(function (entry) { return entry.key; }), [30, 35, 40, 50, 60]);
  assert.deepEqual(tree.range(81, 99).entries, []);
  assert.ok(tree.range(75, 99).visited < tree.size, 'range skips subtrees');

  tree.insert(35, 'replaced');
  assert.equal(tree.size, 8);
  assert.equal(tree.search(35).value, 'replaced');

  const layout = tree.layout();
  assert.deepEqual(layout.map(function (node) { return node.key; }), [20, 30, 35, 40, 50, 60, 70, 80]);
  assert.equal(layout.find(function (node) { return node.key === 50; }).depth, 0);
  assert.equal(layout.find(function (node) { return node.key === 35; }).parentKey, 40);
});

test('BinarySearchTree remove handles leaf, one child, two children and root', function () {
  const random = randomSource(11);
  for (let round = 0; round < 100; round++) {
    const tree = new DSA.BinarySearchTree();
    const keys = [];
    for (let i = 0; i < 25; i++) {
      const key = Math.floor(random() * 60);
      if (keys.indexOf(key) === -1) keys.push(key);
      tree.insert(key, key);
    }
    while (keys.length > 0) {
      const index = Math.floor(random() * keys.length);
      const key = keys.splice(index, 1)[0];
      assert.equal(tree.remove(key), true);
      assert.equal(tree.remove(key), false);
      assert.equal(tree.size, keys.length);
      assert.deepEqual(
        tree.inorder().map(function (entry) { return entry.key; }),
        keys.slice().sort(function (a, b) { return a - b; })
      );
    }
    assert.equal(tree.root, null);
  }
});

test('Graph bfs, shortest path, dfs and reachability', function () {
  const graph = new DSA.Graph();
  [['A', 'B'], ['A', 'C'], ['B', 'D'], ['C', 'D'], ['D', 'E'], ['A', 'E2'], ['X', 'A']].forEach(function (edge) {
    graph.addEdge(edge[0], edge[1]);
  });
  graph.addNode('Lonely', { note: 'no links' });
  assert.equal(graph.addEdge('A', 'B'), false, 'repeat edges are ignored');
  assert.equal(graph.nodeCount, 8);
  assert.equal(graph.edgeCount, 7);
  assert.deepEqual(graph.neighbors('A'), ['B', 'C', 'E2']);
  assert.deepEqual(graph.data('Lonely'), { note: 'no links' });

  assert.deepEqual(graph.bfs('A').order, ['A', 'B', 'C', 'E2', 'D', 'E']);
  assert.equal(graph.bfs('A').distance.get('E'), 3);
  assert.deepEqual(graph.dfs('A'), ['A', 'B', 'D', 'E', 'C', 'E2']);

  assert.deepEqual(graph.shortestPath('A', 'E').path, ['A', 'B', 'D', 'E']);
  assert.deepEqual(graph.shortestPath('A', 'A').path, ['A']);
  assert.equal(graph.shortestPath('E', 'A').path, null, 'links are one-way');
  assert.equal(graph.shortestPath('A', 'Lonely').path, null);
  assert.equal(graph.shortestPath('A', 'Nowhere').path, null);

  assert.deepEqual(graph.reachable('D'), [{ id: 'E', steps: 1 }]);
  assert.deepEqual(graph.reachable('Lonely'), []);
  assert.deepEqual(graph.dfs('Nowhere'), []);
});

test('Graph.shortestPath is never longer than any other route (random graphs)', function () {
  const random = randomSource(99);
  for (let round = 0; round < 60; round++) {
    const graph = new DSA.Graph();
    const count = 3 + Math.floor(random() * 8);
    const matrix = [];
    for (let i = 0; i < count; i++) {
      graph.addNode('n' + i);
      matrix.push(new Array(count).fill(Infinity));
      matrix[i][i] = 0;
    }
    const edges = Math.floor(random() * count * 2);
    for (let e = 0; e < edges; e++) {
      const from = Math.floor(random() * count);
      const to = Math.floor(random() * count);
      if (from === to) continue;
      graph.addEdge('n' + from, 'n' + to);
      matrix[from][to] = 1;
    }
    // Floyd-Warshall as an independent check.
    for (let k = 0; k < count; k++) {
      for (let i = 0; i < count; i++) {
        for (let j = 0; j < count; j++) {
          if (matrix[i][k] + matrix[k][j] < matrix[i][j]) matrix[i][j] = matrix[i][k] + matrix[k][j];
        }
      }
    }
    for (let i = 0; i < count; i++) {
      for (let j = 0; j < count; j++) {
        const path = graph.shortestPath('n' + i, 'n' + j).path;
        if (matrix[i][j] === Infinity) assert.equal(path, null);
        else assert.equal(path.length - 1, matrix[i][j]);
      }
    }
  }
});
