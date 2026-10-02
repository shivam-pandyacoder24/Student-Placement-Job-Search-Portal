/*
 * The skill map: which skills lead to which fields, and which fields lead
 * to which roles. The portal loads this into a directed graph
 * (js/dsa/graph.js) and then adds one more layer from the job records:
 * a link from each role to every company hiring for it.
 *
 * level decides the column a node is drawn in:
 *   0 skill, 1 field, 2 advanced field, 3 role, 4 company
 * Every link goes from a lower level to a higher one.
 */
(function (global) {
  'use strict';
  const DATA = (global.PORTAL_DATA = global.PORTAL_DATA || {});

  DATA.skillGraph = {
    nodes: [
      { id: 'Python', type: 'skill', level: 0 },
      { id: 'Statistics', type: 'skill', level: 0 },
      { id: 'SQL', type: 'skill', level: 0 },
      { id: 'Excel', type: 'skill', level: 0 },
      { id: 'JavaScript', type: 'skill', level: 0 },
      { id: 'HTML and CSS', type: 'skill', level: 0 },
      { id: 'Java', type: 'skill', level: 0 },
      { id: 'Git', type: 'skill', level: 0 },
      { id: 'Networking', type: 'skill', level: 0 },
      { id: 'Linux', type: 'skill', level: 0 },
      { id: 'C and C++', type: 'skill', level: 0 },

      { id: 'Data Science', type: 'field', level: 1 },
      { id: 'Data Analysis', type: 'field', level: 1 },
      { id: 'Web Development', type: 'field', level: 1 },
      { id: 'Backend Development', type: 'field', level: 1 },
      { id: 'Cybersecurity', type: 'field', level: 1 },
      { id: 'Systems Programming', type: 'field', level: 1 },

      { id: 'Machine Learning', type: 'field', level: 2 },
      { id: 'Quantitative Finance', type: 'field', level: 2 },
      { id: 'Cloud and DevOps', type: 'field', level: 2 },
      { id: 'Embedded Systems', type: 'field', level: 2 },

      { id: 'AI Engineer', type: 'role', level: 3 },
      { id: 'ML Engineer', type: 'role', level: 3 },
      { id: 'Data Scientist', type: 'role', level: 3 },
      { id: 'Quant Analyst', type: 'role', level: 3 },
      { id: 'Data Analyst', type: 'role', level: 3 },
      { id: 'Frontend Developer', type: 'role', level: 3 },
      { id: 'Full Stack Developer', type: 'role', level: 3 },
      { id: 'Backend Developer', type: 'role', level: 3 },
      { id: 'DevOps Engineer', type: 'role', level: 3 },
      { id: 'Security Analyst', type: 'role', level: 3 },
      { id: 'Embedded Engineer', type: 'role', level: 3 },
    ],

    edges: [
      ['Python', 'Data Science'],
      ['Python', 'Data Analysis'],
      ['Python', 'Backend Development'],
      ['Statistics', 'Data Science'],
      ['Statistics', 'Data Analysis'],
      ['SQL', 'Data Analysis'],
      ['SQL', 'Backend Development'],
      ['Excel', 'Data Analysis'],
      ['JavaScript', 'Web Development'],
      ['JavaScript', 'Backend Development'],
      ['HTML and CSS', 'Web Development'],
      ['Java', 'Backend Development'],
      ['Git', 'Cloud and DevOps'],
      ['Networking', 'Cybersecurity'],
      ['Networking', 'Cloud and DevOps'],
      ['Linux', 'Cybersecurity'],
      ['Linux', 'Systems Programming'],
      ['Linux', 'Cloud and DevOps'],
      ['C and C++', 'Systems Programming'],

      ['Data Science', 'Machine Learning'],
      ['Data Science', 'Quantitative Finance'],
      ['Data Science', 'Data Scientist'],
      ['Data Analysis', 'Data Analyst'],
      ['Web Development', 'Frontend Developer'],
      ['Web Development', 'Full Stack Developer'],
      ['Backend Development', 'Full Stack Developer'],
      ['Backend Development', 'Backend Developer'],
      ['Backend Development', 'Cloud and DevOps'],
      ['Cybersecurity', 'Security Analyst'],
      ['Systems Programming', 'Embedded Systems'],

      ['Machine Learning', 'AI Engineer'],
      ['Machine Learning', 'ML Engineer'],
      ['Quantitative Finance', 'Quant Analyst'],
      ['Cloud and DevOps', 'DevOps Engineer'],
      ['Embedded Systems', 'Embedded Engineer'],
    ],
  };
})(typeof window !== 'undefined' ? window : globalThis);
