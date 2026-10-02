/*
 * Searching.
 * Used for: finding jobs by company or role.
 *
 * linearSearch  - checks every record; works on any order; O(n).
 * binarySearch  - halves a sorted list each step; O(log n).
 * binarySearchPrefix - binary search for the first key that starts with the
 *                 typed text, then reads forward while keys still match.
 *
 * Every function reports how many comparisons it made, so the site can show
 * the difference between the two methods.
 */
(function (global) {
  'use strict';
  const DSA = (global.DSA = global.DSA || {});

  function compareText(a, b) {
    if (a < b) return -1;
    if (a > b) return 1;
    return 0;
  }

  function linearSearch(items, matches) {
    const indexes = [];
    let comparisons = 0;
    for (let i = 0; i < items.length; i++) {
      comparisons++;
      if (matches(items[i])) indexes.push(i);
    }
    return { indexes: indexes, comparisons: comparisons, probes: [] };
  }

  /* Exact match on a list sorted by keyOf(item). Returns index or -1. */
  function binarySearch(sorted, keyOf, target) {
    let low = 0;
    let high = sorted.length - 1;
    let comparisons = 0;
    const probes = [];
    while (low <= high) {
      const mid = low + Math.floor((high - low) / 2);
      probes.push(mid);
      comparisons++;
      const order = compareText(keyOf(sorted[mid]), target);
      if (order === 0) return { index: mid, comparisons: comparisons, probes: probes };
      if (order < 0) low = mid + 1;
      else high = mid - 1;
    }
    return { index: -1, comparisons: comparisons, probes: probes };
  }

  /* All items whose key starts with `prefix`, on a list sorted by that key. */
  function binarySearchPrefix(sorted, keyOf, prefix) {
    let low = 0;
    let high = sorted.length; // one past the end
    let comparisons = 0;
    const probes = [];

    // Lower bound: the first position whose key is >= prefix.
    while (low < high) {
      const mid = low + Math.floor((high - low) / 2);
      probes.push(mid);
      comparisons++;
      if (compareText(keyOf(sorted[mid]), prefix) < 0) low = mid + 1;
      else high = mid;
    }

    // Keys sharing a prefix sit next to each other in a sorted list.
    const indexes = [];
    let i = low;
    while (i < sorted.length) {
      comparisons++;
      if (!keyOf(sorted[i]).startsWith(prefix)) break;
      indexes.push(i);
      i++;
    }
    return { indexes: indexes, comparisons: comparisons, probes: probes };
  }

  DSA.search = {
    compareText: compareText,
    linearSearch: linearSearch,
    binarySearch: binarySearch,
    binarySearchPrefix: binarySearchPrefix,
  };
})(typeof window !== 'undefined' ? window : globalThis);
