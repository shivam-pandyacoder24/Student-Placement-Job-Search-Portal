/*
 * Sample job records.
 *
 * Every company and opening here is made up for this project. Nothing in
 * this file is a real job offer.
 *
 * id        - job ID, shown as J1512
 * category  - a node in the category tree (js/data/categories.js)
 * track     - a role node in the skill graph (js/data/skill-graph.js)
 * pay       - LPA (lakhs per year) for full-time jobs, rupees per month for
 *             internships
 * closesIn  - days from today until applications close. Dates are worked
 *             out when the page loads so the sample data never goes stale.
 *
 * The order of this list is the order jobs are added to the binary search
 * tree, so it is deliberately not sorted by ID. Sorted input would turn
 * the tree into a long chain.
 */
(function (global) {
  'use strict';
  const DATA = (global.PORTAL_DATA = global.PORTAL_DATA || {});

  function job(id, role, company, category, track, type, location, amount, closesIn, minCgpa, skills) {
    return {
      id: id,
      role: role,
      company: company,
      category: category,
      track: track,
      type: type,
      location: location,
      pay: { amount: amount, unit: type === 'Internship' ? 'month' : 'LPA' },
      closesIn: closesIn,
      minCgpa: minCgpa,
      skills: skills,
    };
  }

  const FULL = 'Full-time';
  const INTERN = 'Internship';

  DATA.jobs = [
    job(1512, 'Data Analyst Intern', 'Nimbus Analytics', 'Data analysis', 'Data Analyst', INTERN, 'Bengaluru', 25000, 9, 7.0, ['SQL', 'Excel', 'Python']),
    job(1260, 'Frontend Developer', 'Pixelkart', 'Frontend', 'Frontend Developer', FULL, 'Chennai', 6.5, 14, 6.5, ['JavaScript', 'HTML and CSS', 'Git']),
    job(1771, 'Machine Learning Engineer', 'Vidya AI', 'Machine learning', 'ML Engineer', FULL, 'Hyderabad', 14, 21, 8.0, ['Python', 'Statistics', 'SQL']),
    job(1134, 'Backend Developer Intern', 'Paisa Stack', 'Backend', 'Backend Developer', INTERN, 'Remote', 30000, 6, 7.0, ['Java', 'SQL', 'Git']),
    job(1388, 'Quantitative Analyst', 'Quantara Capital', 'Quantitative analysis', 'Quant Analyst', FULL, 'Mumbai', 22, 30, 8.5, ['Python', 'Statistics', 'C and C++']),
    job(1640, 'DevOps Engineer', 'Saffron Cloud', 'DevOps and cloud', 'DevOps Engineer', FULL, 'Pune', 9, 18, 7.0, ['Linux', 'Git', 'Networking']),
    job(1893, 'AI Engineer', 'Vidya AI', 'AI engineering', 'AI Engineer', FULL, 'Bengaluru', 18, 25, 8.0, ['Python', 'Statistics', 'Git']),
    job(1071, 'Embedded Systems Intern', 'Marigold Robotics', 'Embedded systems', 'Embedded Engineer', INTERN, 'Coimbatore', 20000, 12, 6.5, ['C and C++', 'Linux']),
    job(1197, 'Full Stack Developer', 'Routewise', 'Full stack', 'Full Stack Developer', FULL, 'Chennai', 8, 16, 7.0, ['JavaScript', 'HTML and CSS', 'SQL', 'Git']),
    job(1325, 'Data Scientist', 'Nimbus Analytics', 'Data science', 'Data Scientist', FULL, 'Bengaluru', 12.5, 28, 7.5, ['Python', 'Statistics', 'SQL']),
    job(1450, 'Fraud Analytics Intern', 'Kaveri Fintech', 'Risk and fraud analytics', 'Data Scientist', INTERN, 'Chennai', 35000, 10, 7.5, ['Python', 'SQL', 'Statistics']),
    job(1577, 'Security Analyst', 'Sentinel Grid', 'Cybersecurity', 'Security Analyst', FULL, 'Hyderabad', 7.5, 20, 7.0, ['Linux', 'Networking']),
    job(1705, 'Computer Vision Intern', 'Marigold Robotics', 'Computer vision', 'ML Engineer', INTERN, 'Bengaluru', 40000, 15, 8.0, ['Python', 'Statistics', 'C and C++']),
    job(1832, 'Backend Developer', 'Ledgerline', 'Backend', 'Backend Developer', FULL, 'Pune', 10, 23, 7.0, ['Java', 'SQL', 'Linux', 'Git']),
    job(1955, 'NLP Engineer', 'Tarang Labs', 'Natural language processing', 'ML Engineer', FULL, 'Remote', 15, 35, 8.0, ['Python', 'Statistics', 'Git']),
    job(1038, 'Frontend Developer Intern', 'Routewise', 'Frontend', 'Frontend Developer', INTERN, 'Remote', 15000, 5, 6.0, ['JavaScript', 'HTML and CSS']),
    job(1103, 'Data Analyst', 'Mintleaf Health', 'Data analysis', 'Data Analyst', FULL, 'Chennai', 5.5, 11, 6.5, ['SQL', 'Excel', 'Statistics']),
    job(1166, 'Cloud Support Intern', 'Saffron Cloud', 'DevOps and cloud', 'DevOps Engineer', INTERN, 'Pune', 22000, 8, 6.5, ['Linux', 'Networking', 'Git']),
    job(1229, 'Risk Analyst', 'Ledgerline', 'Risk and fraud analytics', 'Data Analyst', FULL, 'Mumbai', 9.5, 19, 7.5, ['SQL', 'Excel', 'Statistics', 'Python']),
    job(1293, 'VLSI Design Intern', 'Sahyadri Semiconductors', 'VLSI and electronics', 'Embedded Engineer', INTERN, 'Bengaluru', 28000, 13, 7.5, ['C and C++', 'Linux']),
    job(1357, 'AI Engineer Intern', 'Tarang Labs', 'AI engineering', 'AI Engineer', INTERN, 'Remote', 45000, 17, 8.0, ['Python', 'Statistics', 'Git']),
    job(1419, 'Full Stack Developer Intern', 'Pixelkart', 'Full stack', 'Full Stack Developer', INTERN, 'Chennai', 25000, 7, 6.5, ['JavaScript', 'HTML and CSS', 'SQL']),
    job(1481, 'Quant Research Intern', 'Quantara Capital', 'Quantitative analysis', 'Quant Analyst', INTERN, 'Mumbai', 80000, 22, 9.0, ['Python', 'Statistics', 'C and C++']),
    job(1544, 'Machine Learning Intern', 'Kaveri Fintech', 'Machine learning', 'ML Engineer', INTERN, 'Chennai', 38000, 12, 7.5, ['Python', 'Statistics', 'SQL']),
    job(1609, 'Embedded Software Engineer', 'Marigold Robotics', 'Embedded systems', 'Embedded Engineer', FULL, 'Coimbatore', 7, 26, 7.0, ['C and C++', 'Linux', 'Git']),
    job(1672, 'Site Reliability Engineer', 'Paisa Stack', 'DevOps and cloud', 'DevOps Engineer', FULL, 'Bengaluru', 13, 27, 7.5, ['Linux', 'Networking', 'Python', 'Git']),
    job(1738, 'Data Science Intern', 'Mintleaf Health', 'Data science', 'Data Scientist', INTERN, 'Hyderabad', 30000, 9, 7.0, ['Python', 'Statistics']),
    job(1801, 'Frontend Engineer', 'Bluepeak Systems', 'Frontend', 'Frontend Developer', FULL, 'Hyderabad', 9, 24, 7.0, ['JavaScript', 'HTML and CSS', 'Git']),
    job(1864, 'Backend Engineer', 'Kaveri Fintech', 'Backend', 'Backend Developer', FULL, 'Chennai', 11, 29, 7.5, ['Python', 'SQL', 'Linux', 'Git']),
    job(1924, 'Security Operations Intern', 'Sentinel Grid', 'Cybersecurity', 'Security Analyst', INTERN, 'Hyderabad', 18000, 6, 6.5, ['Linux', 'Networking']),
    job(1987, 'Business Data Analyst', 'Bluepeak Systems', 'Data analysis', 'Data Analyst', FULL, 'Pune', 6, 15, 6.5, ['SQL', 'Excel']),
    job(1017, 'Full Stack Engineer', 'Bluepeak Systems', 'Full stack', 'Full Stack Developer', FULL, 'Bengaluru', 12, 31, 7.5, ['JavaScript', 'HTML and CSS', 'Java', 'SQL', 'Git']),
    job(1058, 'Computer Vision Engineer', 'Vidya AI', 'Computer vision', 'ML Engineer', FULL, 'Bengaluru', 16, 33, 8.0, ['Python', 'Statistics', 'C and C++']),
    job(1089, 'Data Scientist', 'Paisa Stack', 'Data science', 'Data Scientist', FULL, 'Bengaluru', 13.5, 20, 8.0, ['Python', 'Statistics', 'SQL']),
    job(1120, 'VLSI Verification Engineer', 'Sahyadri Semiconductors', 'VLSI and electronics', 'Embedded Engineer', FULL, 'Bengaluru', 10.5, 32, 7.5, ['C and C++', 'Linux']),
    job(1150, 'Generative AI Engineer', 'Tarang Labs', 'AI engineering', 'AI Engineer', FULL, 'Remote', 24, 34, 8.5, ['Python', 'Statistics', 'Git']),
  ];
})(typeof window !== 'undefined' ? window : globalThis);
