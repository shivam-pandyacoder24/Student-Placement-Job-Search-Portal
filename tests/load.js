/*
 * Loads the browser scripts into Node so the tests can use them.
 * Each script adds itself to a global (DSA, PORTAL_DATA or Portal), so
 * requiring them in the same order as index.html is enough.
 */
'use strict';

const path = require('node:path');
const root = path.join(__dirname, '..', 'js');

[
  'dsa/dynamic-array.js',
  'dsa/search.js',
  'dsa/sort.js',
  'dsa/linked-list.js',
  'dsa/stack.js',
  'dsa/queue.js',
  'dsa/hash-table.js',
  'dsa/category-tree.js',
  'dsa/bst.js',
  'dsa/graph.js',
  'data/jobs.js',
  'data/categories.js',
  'data/skill-graph.js',
  'data/candidates.js',
  'portal.js',
].forEach(function (file) {
  require(path.join(root, file));
});

module.exports = {
  DSA: globalThis.DSA,
  DATA: globalThis.PORTAL_DATA,
  Portal: globalThis.Portal,
};
