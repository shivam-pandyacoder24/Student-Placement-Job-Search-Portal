/*
 * Sorting.
 * Used for: ordering jobs by salary, company, deadline or role.
 *
 * Four algorithms with the same interface: give an array and a compare
 * function, get back a new sorted array plus the work done.
 *   comparisons - how many times two records were compared
 *   moves       - how many times a record was written to a new position
 * The input array is never changed.
 */
(function (global) {
  'use strict';
  const DSA = (global.DSA = global.DSA || {});

  function copyOf(items) {
    const copy = new Array(items.length);
    for (let i = 0; i < items.length; i++) copy[i] = items[i];
    return copy;
  }

  /* O(n^2). Stops early when a full pass makes no swap. */
  function bubbleSort(items, compare) {
    const a = copyOf(items);
    let comparisons = 0;
    let moves = 0;
    for (let end = a.length - 1; end > 0; end--) {
      let swapped = false;
      for (let i = 0; i < end; i++) {
        comparisons++;
        if (compare(a[i], a[i + 1]) > 0) {
          const held = a[i];
          a[i] = a[i + 1];
          a[i + 1] = held;
          moves += 2;
          swapped = true;
        }
      }
      if (!swapped) break;
    }
    return { sorted: a, comparisons: comparisons, moves: moves };
  }

  /* O(n^2) worst case, O(n) when the list is already nearly sorted. */
  function insertionSort(items, compare) {
    const a = copyOf(items);
    let comparisons = 0;
    let moves = 0;
    for (let i = 1; i < a.length; i++) {
      const held = a[i];
      let j = i - 1;
      while (j >= 0) {
        comparisons++;
        if (compare(a[j], held) <= 0) break;
        a[j + 1] = a[j];
        moves++;
        j--;
      }
      if (j + 1 !== i) {
        a[j + 1] = held;
        moves++;
      }
    }
    return { sorted: a, comparisons: comparisons, moves: moves };
  }

  /* O(n log n) always. Stable: equal records keep their original order. */
  function mergeSort(items, compare) {
    const a = copyOf(items);
    const buffer = new Array(a.length);
    const work = { comparisons: 0, moves: 0 };

    function merge(low, mid, high) {
      let left = low;
      let right = mid;
      let out = low;
      while (left < mid && right < high) {
        work.comparisons++;
        if (compare(a[left], a[right]) <= 0) buffer[out++] = a[left++];
        else buffer[out++] = a[right++];
      }
      while (left < mid) buffer[out++] = a[left++];
      while (right < high) buffer[out++] = a[right++];
      for (let i = low; i < high; i++) {
        a[i] = buffer[i];
        work.moves++;
      }
    }

    function sortRange(low, high) {
      if (high - low < 2) return;
      const mid = low + Math.floor((high - low) / 2);
      sortRange(low, mid);
      sortRange(mid, high);
      merge(low, mid, high);
    }

    sortRange(0, a.length);
    return { sorted: a, comparisons: work.comparisons, moves: work.moves };
  }

  /* O(n log n) on average. Pivot is the middle item, moved to the end. */
  function quickSort(items, compare) {
    const a = copyOf(items);
    const work = { comparisons: 0, moves: 0 };

    function swap(i, j) {
      if (i === j) return;
      const held = a[i];
      a[i] = a[j];
      a[j] = held;
      work.moves += 2;
    }

    function partition(low, high) {
      swap(low + Math.floor((high - low) / 2), high);
      const pivot = a[high];
      let boundary = low;
      for (let i = low; i < high; i++) {
        work.comparisons++;
        if (compare(a[i], pivot) < 0) {
          swap(i, boundary);
          boundary++;
        }
      }
      swap(boundary, high);
      return boundary;
    }

    function sortRange(low, high) {
      if (low >= high) return;
      const pivotIndex = partition(low, high);
      sortRange(low, pivotIndex - 1);
      sortRange(pivotIndex + 1, high);
    }

    sortRange(0, a.length - 1);
    return { sorted: a, comparisons: work.comparisons, moves: work.moves };
  }

  DSA.sort = {
    bubbleSort: bubbleSort,
    insertionSort: insertionSort,
    mergeSort: mergeSort,
    quickSort: quickSort,
  };
})(typeof window !== 'undefined' ? window : globalThis);
