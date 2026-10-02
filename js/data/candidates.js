/*
 * Sample candidates. All of them are made up for this project.
 * More candidates can be added on the "Find by ID" page; those are kept in
 * the browser only.
 */
(function (global) {
  'use strict';
  const DATA = (global.PORTAL_DATA = global.PORTAL_DATA || {});

  DATA.candidates = [
    { id: 'C101', name: 'Aarav M.', branch: 'B.Tech AI', cgpa: 8.6, skills: ['Python', 'Statistics', 'SQL', 'Git'] },
    { id: 'C102', name: 'Diya R.', branch: 'B.Tech CSE', cgpa: 7.9, skills: ['JavaScript', 'HTML and CSS', 'SQL', 'Git'] },
    { id: 'C103', name: 'Kabir S.', branch: 'B.Tech ECE', cgpa: 7.2, skills: ['C and C++', 'Linux'] },
    { id: 'C104', name: 'Meera I.', branch: 'B.Tech IT', cgpa: 9.1, skills: ['Python', 'Statistics', 'C and C++', 'SQL'] },
    { id: 'C105', name: 'Rohan D.', branch: 'B.Tech CSE', cgpa: 6.8, skills: ['Java', 'SQL', 'Git'] },
    { id: 'C106', name: 'Sana Q.', branch: 'B.Tech AI', cgpa: 8.2, skills: ['Python', 'SQL', 'Excel', 'Statistics'] },
    { id: 'C107', name: 'Tanvi K.', branch: 'B.Tech CSE', cgpa: 7.5, skills: ['Linux', 'Networking', 'Git', 'Python'] },
    { id: 'C108', name: 'Vikram N.', branch: 'B.Tech ECE', cgpa: 6.4, skills: ['C and C++', 'Excel'] },
    { id: 'C109', name: 'Ananya B.', branch: 'B.Tech IT', cgpa: 8.8, skills: ['JavaScript', 'HTML and CSS', 'Java', 'SQL', 'Git'] },
    { id: 'C110', name: 'Farhan A.', branch: 'B.Tech CSE', cgpa: 7.0, skills: ['Python', 'Excel'] },
  ];
})(typeof window !== 'undefined' ? window : globalThis);
