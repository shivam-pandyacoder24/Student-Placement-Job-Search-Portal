/*
 * Job categories, as a nested outline. The portal turns this into a
 * general tree (js/dsa/category-tree.js) and files each job under the
 * category named in its record.
 */
(function (global) {
  'use strict';
  const DATA = (global.PORTAL_DATA = global.PORTAL_DATA || {});

  DATA.categories = {
    name: 'All jobs',
    children: [
      {
        name: 'Software development',
        children: [{ name: 'Frontend' }, { name: 'Backend' }, { name: 'Full stack' }],
      },
      {
        name: 'Data and AI',
        children: [
          { name: 'Data analysis' },
          { name: 'Data science' },
          {
            name: 'Machine learning',
            children: [{ name: 'Computer vision' }, { name: 'Natural language processing' }],
          },
          { name: 'AI engineering' },
        ],
      },
      {
        name: 'Finance and fintech',
        children: [{ name: 'Quantitative analysis' }, { name: 'Risk and fraud analytics' }],
      },
      {
        name: 'Cloud and security',
        children: [{ name: 'DevOps and cloud' }, { name: 'Cybersecurity' }],
      },
      {
        name: 'Core engineering',
        children: [{ name: 'Embedded systems' }, { name: 'VLSI and electronics' }],
      },
    ],
  };
})(typeof window !== 'undefined' ? window : globalThis);
