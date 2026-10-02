/*
 * The page. Builds each screen from the portal logic in portal.js and
 * draws the data structure that produced what is on screen.
 */
(function () {
  'use strict';

  const DATA = window.PORTAL_DATA;
  const Portal = window.Portal;
  const DSA = window.DSA;
  const STORAGE_KEY = 'placement-portal:v1';

  const portal = new Portal(DATA);
  const main = document.getElementById('main');
  const candidateSelect = document.getElementById('candidate-select');
  const toast = document.getElementById('toast');

  const REPO_URL = 'https://github.com/shivam-pandyacoder24/Student-Placement-Job-Search-Portal';

  const ROUTES = {
    home: { title: 'Overview', render: renderHome },
    jobs: { title: 'Jobs', render: renderJobs },
    categories: { title: 'Categories', render: renderCategories },
    applications: { title: 'My applications', render: renderApplications },
    skills: { title: 'Skill map', render: renderSkills },
    lookup: { title: 'Find by ID', render: renderLookup },
    structures: { title: 'Data structures', render: renderStructures },
  };

  const state = {
    route: 'home',
    candidateId: DATA.candidates[0].id,
    jobs: { query: '', field: 'either', method: 'linear', sortKey: 'deadline', direction: 'asc', algorithm: 'merge' },
    category: 'All jobs',
    skills: { from: 'Python', to: 'AI Engineer' },
    lookup: { jobId: '', low: '', high: '', candidateId: '', added: null, addError: '' },
    lastReview: null,
  };

  /* ---------- Small helpers ---------- */

  function esc(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function count(n, one, many) {
    return n + ' ' + (n === 1 ? one : many);
  }

  function jobCode(id) {
    return 'J' + id;
  }

  function formatPay(job) {
    if (job.pay.unit === 'LPA') return '₹' + job.pay.amount + ' LPA';
    return '₹' + job.pay.amount.toLocaleString('en-IN') + ' a month';
  }

  function formatDate(date) {
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  }

  function formatDateTime(iso) {
    const date = new Date(iso);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) + ', ' +
      date.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
  }

  function activeCandidate() {
    return portal.getCandidate(state.candidateId);
  }

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add('is-visible');
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(function () {
      toast.classList.remove('is-visible');
    }, 4200);
  }

  /* ---------- Saving in the browser ---------- */

  function save() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
        candidateId: state.candidateId,
        portal: portal.snapshot(),
      }));
    } catch (error) {
      // Private windows and blocked storage: the site still works, it just forgets on reload.
    }
  }

  function load() {
    try {
      const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY));
      if (!saved) return;
      portal.restore(saved.portal);
      if (portal.getCandidate(saved.candidateId) !== undefined) {
        state.candidateId = portal.getCandidate(saved.candidateId).id;
      }
    } catch (error) {
      // Damaged saved data is ignored.
    }
  }

  /* ---------- Shared pieces ---------- */

  function jobRow(job) {
    const applied = portal.hasApplied(state.candidateId, job.id);
    const soon = job.closesIn <= 7;
    return (
      '<li class="job">' +
        '<div class="job-what">' +
          '<h3 class="job-role">' + esc(job.role) + '</h3>' +
          '<p class="job-where">' + esc(job.company) + ', ' + esc(job.location) + '</p>' +
          '<p class="job-meta">' + esc(job.type) + ', CGPA ' + job.minCgpa.toFixed(1) + ' and above. ' +
            'Skills: ' + esc(job.skills.join(', ')) + '.</p>' +
        '</div>' +
        '<p class="job-pay"><span class="fact-label">Pay</span>' + esc(formatPay(job)) + '</p>' +
        '<p class="job-closes' + (soon ? ' is-soon' : '') + '"><span class="fact-label">Closes</span>' +
          esc(formatDate(job.deadline)) + '<span class="job-days">' + count(job.closesIn, 'day', 'days') + ' left</span></p>' +
        '<div class="job-act">' +
          '<span class="job-id">' + jobCode(job.id) + '</span>' +
          (applied
            ? '<button type="button" class="button is-done" disabled>Applied</button>'
            : '<button type="button" class="button" data-action="apply" data-job="' + job.id + '"' +
              ' aria-label="Apply to ' + esc(job.role) + ' at ' + esc(job.company) + '">Apply</button>') +
        '</div>' +
      '</li>'
    );
  }

  function jobList(jobs, emptyMessage) {
    if (jobs.length === 0) return '<p class="empty">' + emptyMessage + '</p>';
    let html = '<ol class="job-list">';
    for (let i = 0; i < jobs.length; i++) html += jobRow(jobs[i]);
    return html + '</ol>';
  }

  function option(value, label, selected) {
    return '<option value="' + esc(value) + '"' + (value === selected ? ' selected' : '') + '>' + esc(label) + '</option>';
  }

  /* Hash table drawn as numbered buckets with their chains. */
  function bucketRack(table, lookup, formatKey) {
    const buckets = table.bucketKeys();
    let html = '<ol class="rack" start="0">';
    for (let i = 0; i < buckets.length; i++) {
      const isTarget = lookup !== null && lookup.bucket === i;
      html += '<li class="rack-row' + (isTarget ? ' is-target' : '') + '">' +
        '<span class="rack-index">' + i + '</span><span class="rack-chain">';
      if (buckets[i].length === 0) html += '<span class="rack-empty">empty</span>';
      let compared = 0;
      for (let j = 0; j < buckets[i].length; j++) {
        let mark = '';
        if (isTarget && compared < lookup.comparisons) {
          compared++;
          mark = lookup.found && compared === lookup.comparisons ? ' is-found' : ' is-compared';
        }
        html += '<span class="rack-key' + mark + '">' + esc(formatKey(buckets[i][j])) + '</span>';
      }
      html += '</span></li>';
    }
    return html + '</ol>';
  }

  /* ---------- Overview: what this is, and one-click demos ---------- */

  /*
   * Each demo sets up one screen so a first-time visitor sees a structure
   * at work without having to know what to type.
   */
  const DEMOS = {
    route: {
      go: 'skills',
      setup: function () {
        state.skills = { from: 'Python', to: 'AI Engineer' };
      },
    },
    search: {
      title: 'Search with binary search',
      text: 'Looks for roles that start with “data” and marks which of the job records each step compared.',
      uses: 'Searching',
      go: 'jobs',
      setup: function () {
        state.jobs = { query: 'data', field: 'role', method: 'binary', sortKey: 'deadline', direction: 'asc', algorithm: 'merge' };
      },
    },
    sort: {
      title: 'Sort every job by salary',
      text: 'Puts all the openings in order, highest pay first, and counts the comparisons that merge, quick, insertion and bubble sort each needed.',
      uses: 'Arrays, sorting',
      go: 'jobs',
      setup: function () {
        state.jobs = { query: '', field: 'either', method: 'linear', sortKey: 'salary', direction: 'desc', algorithm: 'merge' };
      },
    },
    lookup: {
      title: 'Look up one job two ways',
      text: 'Finds job J1705 in a hash table and in a binary search tree, and draws the path each one took.',
      uses: 'Hashing, binary search tree',
      go: 'lookup',
      setup: function () {
        state.lookup.jobId = 'J1705';
      },
    },
    category: {
      title: 'Open a branch of the category tree',
      text: 'Selects Machine learning and collects every job filed under it and under its sub-categories.',
      uses: 'General tree',
      go: 'categories',
      setup: function () {
        state.category = 'Machine learning';
      },
    },
    apply: {
      title: 'Apply to three jobs, then undo',
      text: 'Adds three sample applications so you can watch them join the history, the undo stack and the review queue.',
      uses: 'Linked list, stack, queue',
      go: 'applications',
      setup: function () {
        const candidate = activeCandidate();
        let added = 0;
        [1771, 1893, 1640].forEach(function (jobId) {
          if (portal.apply(candidate.id, jobId).ok) added++;
        });
        save();
        showToast(added === 0
          ? 'Those three applications are already in your history.'
          : 'Added ' + count(added, 'sample application', 'sample applications') + ' for ' + candidate.name + '. Try Undo and Review.');
      },
    },
  };

  function renderHome() {
    const graph = portal.graph;
    const route = graph.shortestPath('Python', 'AI Engineer');
    let steps = '';
    for (let i = 0; i < route.path.length; i++) {
      steps += '<li class="route-step">' + esc(route.path[i]) + '</li>';
    }

    let demos = '';
    ['search', 'sort', 'lookup', 'category', 'apply'].forEach(function (key) {
      const demo = DEMOS[key];
      demos += '<li class="demo">' +
        '<div class="demo-what"><h3>' + esc(demo.title) + '</h3><p>' + esc(demo.text) + '</p></div>' +
        '<p class="demo-uses"><span class="fact-label">Uses</span>' + esc(demo.uses) + '</p>' +
        '<button type="button" class="button" data-action="demo" data-demo="' + key + '" aria-label="Show me: ' + esc(demo.title) + '">Show me</button>' +
      '</li>';
    });

    main.innerHTML =
      '<section class="view view-home">' +
        '<header class="view-head">' +
          '<h1>A placement portal that shows its working</h1>' +
          '<p class="lede">Search jobs and internships, apply, and track your applications. Every feature runs on a data structure ' +
            'written from scratch, and each screen draws that structure doing the job.</p>' +
          '<p class="home-actions"><a class="button" href="#jobs">Search the jobs</a>' +
            '<a class="button is-quiet" href="' + REPO_URL + '">Read the code on GitHub</a></p>' +
        '</header>' +

        '<section class="workings" aria-labelledby="example-title">' +
          '<h2 id="example-title">For example: Python to AI Engineer</h2>' +
          '<ol class="route">' + steps + '</ol>' +
          '<p>The skill map is a graph of ' + graph.nodeCount + ' skills, fields, roles and companies joined by ' + graph.edgeCount +
            ' links. Breadth-first search found this route, the shortest of all, after exploring ' + route.explored + ' of them.</p>' +
          '<button type="button" class="button" data-action="demo" data-demo="route">Open the skill map</button>' +
        '</section>' +

        '<section aria-labelledby="demos-title">' +
          '<h2 id="demos-title">See the rest in one click</h2>' +
          '<ul class="demo-list">' + demos + '</ul>' +
        '</section>' +

        '<section aria-labelledby="shows-title">' +
          '<h2 id="shows-title">What this project shows</h2>' +
          '<ul class="points">' +
            '<li><strong>Ten data structures and algorithms, written by hand.</strong> Arrays, searching, sorting, a linked list, a stack, ' +
              'a queue, two trees, a graph and hashing. None of them use JavaScript’s built-in sort, Map or Set. ' +
              '<a href="#structures">See where each one is used</a>.</li>' +
            '<li><strong>No frameworks or libraries.</strong> Plain HTML, CSS and JavaScript with no build step. It runs straight from a file.</li>' +
            '<li><strong>Tested.</strong> 39 automated tests cover every structure and the portal logic, including checks against random input.</li>' +
            '<li><strong>Built to be used.</strong> It works with a keyboard alone, fits a phone screen, and remembers your applications in the browser.</li>' +
          '</ul>' +
        '</section>' +
      '</section>';
  }

  /* ---------- Jobs: array, searching, sorting ---------- */

  const ORDER_LABELS = {
    deadline: ['Soonest first', 'Latest first'],
    salary: ['Lowest first', 'Highest first'],
    company: ['A to Z', 'Z to A'],
    role: ['A to Z', 'Z to A'],
  };

  function renderJobs() {
    const s = state.jobs;
    const companies = new DSA.HashTable(32);
    portal.jobs.forEach(function (job) { companies.set(job.company, true); });

    main.innerHTML =
      '<section class="view">' +
        '<header class="view-head">' +
          '<h1>Find a job or internship</h1>' +
          '<p class="lede">' + portal.jobs.length + ' openings from ' + companies.size +
            ' companies. Search by company or role, then sort the list.</p>' +
        '</header>' +
        '<form class="controls job-controls" id="job-controls" autocomplete="off">' +
          '<div class="field field-grow"><label for="job-query">Search</label>' +
            '<input type="search" id="job-query" name="query" value="' + esc(s.query) + '" placeholder="Try analyst or Vidya"></div>' +
          '<div class="field"><label for="job-field">Look in</label><select id="job-field" name="field">' +
            option('either', 'Company or role', s.field) + option('company', 'Company', s.field) + option('role', 'Role', s.field) +
          '</select></div>' +
          '<div class="field"><label for="job-method">Search with</label><select id="job-method" name="method">' +
            option('linear', 'Linear search', s.method) + option('binary', 'Binary search', s.method) +
          '</select></div>' +
          '<div class="field"><label for="job-sort">Sort by</label><select id="job-sort" name="sortKey">' +
            option('deadline', 'Deadline', s.sortKey) + option('salary', 'Salary', s.sortKey) +
            option('company', 'Company', s.sortKey) + option('role', 'Role', s.sortKey) +
          '</select></div>' +
          '<div class="field"><label for="job-direction">Order</label><select id="job-direction" name="direction">' +
            option('asc', ORDER_LABELS[s.sortKey][0], s.direction) + option('desc', ORDER_LABELS[s.sortKey][1], s.direction) +
          '</select></div>' +
          '<div class="field"><label for="job-algorithm">Sort with</label><select id="job-algorithm" name="algorithm">' +
            option('merge', 'Merge sort', s.algorithm) + option('quick', 'Quick sort', s.algorithm) +
            option('insertion', 'Insertion sort', s.algorithm) + option('bubble', 'Bubble sort', s.algorithm) +
          '</select></div>' +
        '</form>' +
        '<aside class="workings" id="job-workings" aria-label="How this list was produced"></aside>' +
        '<p class="result-line" id="job-result-line" aria-live="polite"></p>' +
        '<div id="job-results"></div>' +
      '</section>';

    updateJobs();
  }

  function cellStrip(trace) {
    const probeStep = new Array(trace.size).fill(0);
    if (trace.probes !== null) {
      for (let i = 0; i < trace.probes.length; i++) {
        if (probeStep[trace.probes[i]] === 0) probeStep[trace.probes[i]] = i + 1;
      }
    }
    const isMatch = new Array(trace.size).fill(false);
    for (let i = 0; i < trace.matches.length; i++) isMatch[trace.matches[i]] = true;

    let html = '<div class="cells" role="img" aria-label="' + esc(trace.label) + ': ' +
      count(trace.size, 'record', 'records') + ', ' + count(trace.matches.length, 'match', 'matches') + '">';
    for (let i = 0; i < trace.size; i++) {
      let cls = 'cell';
      if (isMatch[i]) cls += ' is-match';
      else if (trace.probes === null || probeStep[i] > 0) cls += ' is-checked';
      html += '<span class="' + cls + '">' + (probeStep[i] > 0 ? probeStep[i] : '') + '</span>';
    }
    return html + '</div>';
  }

  function updateJobs() {
    const s = state.jobs;
    const orderOptions = document.getElementById('job-direction').options;
    orderOptions[0].textContent = ORDER_LABELS[s.sortKey][0];
    orderOptions[1].textContent = ORDER_LABELS[s.sortKey][1];

    const found = portal.searchJobs(s.query, s.field, s.method);
    const sorted = portal.sortJobs(found.jobs, s.sortKey, s.direction, s.algorithm);
    const query = s.query.trim();
    const where = s.field === 'either' ? 'company or role' : s.field;

    document.getElementById('job-result-line').textContent = query === ''
      ? 'Showing all ' + sorted.jobs.length + ' openings.'
      : count(sorted.jobs.length, 'opening', 'openings') + ' for “' + query + '”.';

    let emptyMessage = 'No ' + where + ' contains “' + esc(query) + '”. Check the spelling or try a shorter word.';
    if (s.method === 'binary') {
      emptyMessage = 'No ' + where + ' starts with “' + esc(query) + '”. Binary search only matches the start of a name. ' +
        'Switch to linear search to match any part of it.';
    }
    document.getElementById('job-results').innerHTML = jobList(sorted.jobs, emptyMessage);

    // The workings panel.
    let html = '<h2>How this list was produced</h2><div class="working-grid">';

    html += '<div class="working"><h3>Searching</h3>';
    if (found.method === 'none') {
      html += '<p>Nothing typed yet, so no search ran. All ' + portal.jobs.length +
        ' records were read straight from the job array.</p>';
    } else if (found.method === 'linear') {
      html += '<p>Linear search checked all ' + found.comparisons + ' records one by one and found ' +
        count(found.jobs.length, 'match', 'matches') + '. It finds the text anywhere in the name.</p>' +
        cellStrip(found.traces[0]) +
        '<p class="key"><span class="cell is-checked"></span> checked <span class="cell is-match"></span> match</p>';
    } else {
      html += '<p>Binary search made ' + count(found.comparisons, 'comparison', 'comparisons') + ' and found ' +
        count(found.jobs.length, 'match', 'matches') + '. It halves a sorted list each step, so it only matches the start of a name.</p>';
      for (let i = 0; i < found.traces.length; i++) {
        html += '<p class="strip-label">' + esc(found.traces[i].label) + ', ' +
          count(found.traces[i].comparisons, 'comparison', 'comparisons') + '</p>' + cellStrip(found.traces[i]);
      }
      html += '<p class="key"><span class="cell is-checked">1</span> compared, in this order <span class="cell is-match"></span> match</p>';
    }
    html += '</div>';

    html += '<div class="working"><h3>Sorting</h3>';
    if (sorted.jobs.length < 2) {
      html += '<p>Fewer than two jobs in the list, so there was nothing to put in order.</p>';
    } else {
      html += '<p>' + esc(sorted.algorithm) + ' put ' + sorted.jobs.length + ' jobs in order of ' + esc(s.sortKey) +
        '. The same list with each algorithm:</p>' +
        '<table class="tally"><thead><tr><th scope="col">Algorithm</th><th scope="col">Comparisons</th><th scope="col">Moves</th></tr></thead><tbody>';
      const keys = ['merge', 'quick', 'insertion', 'bubble'];
      for (let i = 0; i < keys.length; i++) {
        const run = portal.sortJobs(found.jobs, s.sortKey, s.direction, keys[i]);
        html += '<tr' + (keys[i] === s.algorithm ? ' class="is-chosen"' : '') + '><th scope="row">' + esc(run.algorithm) +
          (keys[i] === s.algorithm ? ' <span class="chosen-note">in use</span>' : '') + '</th><td>' +
          run.comparisons + '</td><td>' + run.moves + '</td></tr>';
      }
      html += '</tbody></table>';
    }
    html += '</div></div>';
    document.getElementById('job-workings').innerHTML = html;
  }

  /* ---------- Categories: general tree ---------- */

  function renderCategories() {
    const tree = portal.categories;
    const result = portal.jobsInCategory(state.category);
    const sorted = portal.sortJobs(result.jobs, 'deadline', 'asc', 'merge').jobs;

    function branch(node) {
      let html = '<li><button type="button" class="tree-node" data-action="category" data-name="' + esc(node.name) + '"' +
        (node.name === state.category ? ' aria-current="true"' : '') + '>' +
        '<span class="tree-name">' + esc(node.name) + '</span><span class="tree-count">' + tree.countItems(node) + '</span></button>';
      if (node.children.length > 0) {
        html += '<ul>';
        for (let i = 0; i < node.children.length; i++) html += branch(node.children[i]);
        html += '</ul>';
      }
      return html + '</li>';
    }

    main.innerHTML =
      '<section class="view">' +
        '<header class="view-head">' +
          '<h1>Browse by category</h1>' +
          '<p class="lede">Choose a category to see every job in it and in the categories below it.</p>' +
        '</header>' +
        '<div class="split">' +
          '<aside class="workings tree-panel" aria-label="Category tree">' +
            '<h2>Category tree</h2>' +
            '<ul class="tree">' + branch(tree.root) + '</ul>' +
            '<p class="how">' + tree.size + ' categories on ' + tree.height() + ' levels. The number beside each one counts the jobs in it and below it.</p>' +
          '</aside>' +
          '<div class="split-main">' +
            '<p class="crumbs">' + result.path.map(esc).join('<span class="crumb-sep" aria-hidden="true">/</span>') + '</p>' +
            '<p class="result-line" aria-live="polite">' + count(sorted.length, 'opening', 'openings') + ' in ' + esc(state.category) +
              ', soonest deadline first.</p>' +
            '<p class="how">Depth-first search visited ' + count(result.searchVisited, 'category', 'categories') +
              ' to find this one, then collected jobs from ' + count(result.subtreeVisited, 'category', 'categories') + ' in its subtree.</p>' +
            jobList(sorted, 'No openings are filed under this category yet.') +
          '</div>' +
        '</div>' +
      '</section>';
  }

  /* ---------- Applications: linked list, stack, queue ---------- */

  function statusClass(status) {
    if (status === Portal.STATUS.SHORTLISTED) return 'is-yes';
    if (status === Portal.STATUS.NOT_SHORTLISTED) return 'is-no';
    return 'is-waiting';
  }

  function renderApplications() {
    const candidate = activeCandidate();
    const history = portal.history(candidate.id);
    const activity = portal.recentActivity(candidate.id);
    const waiting = portal.waiting();

    let chain = '';
    if (history.length === 0) {
      chain = '<p class="empty">No applications yet. <a href="#jobs">Find a job</a> and choose Apply.</p>';
    } else {
      chain = '<ol class="chain">';
      for (let i = 0; i < history.length; i++) {
        const application = history[i];
        const job = portal.getJob(application.jobId);
        const marks = (i === 0 ? '<span class="pointer-tag">head</span>' : '') +
          (i === history.length - 1 ? '<span class="pointer-tag">tail</span>' : '');
        chain += '<li class="chain-node">' +
          '<div class="node-box">' +
            '<div class="node-top">' + marks + '<span class="job-id">' + jobCode(job.id) + '</span>' +
              '<span class="status ' + statusClass(application.status) + '">' + esc(application.status) + '</span></div>' +
            '<h3 class="job-role">' + esc(job.role) + '</h3>' +
            '<p class="job-where">' + esc(job.company) + ', ' + esc(job.location) + '. Applied ' + esc(formatDateTime(application.appliedAt)) + '.</p>' +
            (application.notes.length > 0 ? '<p class="node-notes">' + esc(application.notes.join(' ')) + '</p>' : '') +
            '<button type="button" class="button is-quiet" data-action="withdraw" data-job="' + job.id + '"' +
              ' aria-label="Withdraw application to ' + esc(job.role) + ' at ' + esc(job.company) + '">Withdraw</button>' +
          '</div>' +
          '<span class="next-pointer" aria-hidden="true">next</span>' +
        '</li>';
      }
      chain += '<li class="chain-end">null</li></ol>';
    }

    let pile = '';
    if (activity.length === 0) {
      pile = '<p class="empty">Nothing to undo. Applying or withdrawing adds an item here.</p>';
    } else {
      pile = '<ol class="pile">';
      for (let i = 0; i < activity.length; i++) {
        const job = portal.getJob(activity[i].jobId);
        pile += '<li class="pile-item">' + (i === 0 ? '<span class="pointer-tag">top</span>' : '') +
          '<span>' + (activity[i].type === 'apply' ? 'Applied to ' : 'Withdrew from ') +
          esc(job.role) + ' at ' + esc(job.company) + '</span></li>';
      }
      pile += '</ol>';
    }

    let lane = '';
    if (waiting.length === 0) {
      lane = '<p class="empty">The queue is empty. New applications join at the back.</p>';
    } else {
      lane = '<ol class="lane">';
      for (let i = 0; i < waiting.length; i++) {
        const job = portal.getJob(waiting[i].jobId);
        const person = portal.getCandidate(waiting[i].candidateId);
        const mine = waiting[i].candidateId === candidate.id;
        lane += '<li class="ticket' + (mine ? ' is-mine' : '') + '">' +
          (i === 0 ? '<span class="pointer-tag">front</span>' : '') +
          (i === waiting.length - 1 ? '<span class="pointer-tag">back</span>' : '') +
          '<span class="ticket-who">' + esc(person.name) + (mine ? ' (you)' : '') + '</span>' +
          '<span class="ticket-job">' + jobCode(job.id) + ' ' + esc(job.role) + '</span></li>';
      }
      lane += '</ol>';
    }

    let verdict = '';
    if (state.lastReview !== null) {
      const review = state.lastReview;
      verdict = '<div class="verdict ' + (review.shortlisted ? 'is-yes' : 'is-no') + '">' +
        '<p><strong>' + esc(review.name) + ', ' + esc(review.role) + ' at ' + esc(review.company) + ': ' +
        (review.shortlisted ? 'shortlisted' : 'not shortlisted') + '.</strong> ' + esc(review.notes.join(' ')) + '</p></div>';
    }

    main.innerHTML =
      '<section class="view">' +
        '<header class="view-head">' +
          '<h1>My applications</h1>' +
          '<p class="lede">' + esc(candidate.name) + ', ' + esc(candidate.branch) + ', CGPA ' + candidate.cgpa + '. ' +
            (candidate.skills.length > 0 ? 'Skills: ' + esc(candidate.skills.join(', ')) + '.' : 'No skills listed.') + '</p>' +
        '</header>' +
        '<div class="app-grid">' +
          '<section class="workings panel-history" aria-labelledby="history-title">' +
            '<h2 id="history-title">Application history</h2>' +
            '<p class="how">A linked list. Each application points to the next one, and the newest joins at the head.</p>' +
            chain +
          '</section>' +
          '<section class="workings panel-stack" aria-labelledby="stack-title">' +
            '<h2 id="stack-title" tabindex="-1">Recent activity</h2>' +
            '<p class="how">A stack. Undo takes the top item off and reverses it.</p>' +
            '<button type="button" class="button" data-action="undo"' + (activity.length === 0 ? ' disabled' : '') + '>Undo last action</button>' +
            pile +
          '</section>' +
          '<section class="workings panel-queue" aria-labelledby="queue-title">' +
            '<h2 id="queue-title" tabindex="-1">Review queue</h2>' +
            '<p class="how">A queue. The placement cell reviews applications from every candidate in the order they arrived. ' +
              'An application is shortlisted when the CGPA meets the cutoff and the candidate has at least half the listed skills.</p>' +
            '<button type="button" class="button" data-action="review"' + (waiting.length === 0 ? ' disabled' : '') + '>Review next application</button>' +
            verdict + lane +
          '</section>' +
        '</div>' +
      '</section>';
  }

  /* ---------- Skill map: graph ---------- */

  const TYPE_NAMES = { skill: 'Skills', field: 'Fields', role: 'Roles', company: 'Companies' };
  const COLUMN_TITLES = ['Skills', 'Fields', 'Advanced fields', 'Roles', 'Companies'];

  /* Place every node in a column by level, ordered to keep links short. */
  function graphLayout() {
    if (graphLayout.cache) return graphLayout.cache;
    const graph = portal.graph;
    const columns = [[], [], [], [], []];
    graph.nodes().forEach(function (id) {
      columns[graph.data(id).level].push(id);
    });

    // Order companies by the average row of the roles that link to them.
    const roleRow = new DSA.HashTable(32);
    columns[3].forEach(function (id, row) { roleRow.set(id, row); });
    const weight = new DSA.HashTable(32);
    columns[4].forEach(function (company) { weight.set(company, { sum: 0, links: 0 }); });
    columns[3].forEach(function (role) {
      graph.neighbors(role).forEach(function (company) {
        const entry = weight.get(company);
        entry.sum += roleRow.get(role);
        entry.links++;
      });
    });
    columns[4] = DSA.sort.mergeSort(columns[4], function (a, b) {
      const wa = weight.get(a);
      const wb = weight.get(b);
      return wa.sum / wa.links - wb.sum / wb.links;
    }).sorted;

    const nodeWidth = 176;
    const nodeHeight = 28;
    const columnGap = 66;
    const rowGap = 41;
    const top = 44;
    let tallest = 0;
    for (let i = 0; i < columns.length; i++) if (columns[i].length > tallest) tallest = columns[i].length;
    const height = top + tallest * rowGap + 8;

    const place = new DSA.HashTable(64);
    for (let c = 0; c < columns.length; c++) {
      const offset = top + ((tallest - columns[c].length) * rowGap) / 2;
      for (let r = 0; r < columns[c].length; r++) {
        place.set(columns[c][r], {
          x: 12 + c * (nodeWidth + columnGap),
          y: offset + r * rowGap,
        });
      }
    }
    graphLayout.cache = {
      place: place,
      nodeWidth: nodeWidth,
      nodeHeight: nodeHeight,
      width: 24 + columns.length * nodeWidth + (columns.length - 1) * columnGap,
      height: height,
      columnGap: columnGap,
    };
    return graphLayout.cache;
  }

  function graphSvg(from, to, pathIds, reach) {
    const graph = portal.graph;
    const layout = graphLayout();
    const onPath = new DSA.HashTable(32);
    for (let i = 0; i < pathIds.length; i++) onPath.set(pathIds[i], i);

    let svg = '<svg class="graph" viewBox="0 0 ' + layout.width + ' ' + layout.height + '" width="' + layout.width +
      '" height="' + layout.height + '" role="group" aria-label="Skill map. Links run left to right, from skills to companies.">';

    for (let c = 0; c < COLUMN_TITLES.length; c++) {
      svg += '<text class="graph-title" x="' + (12 + c * (layout.nodeWidth + layout.columnGap)) + '" y="22">' + COLUMN_TITLES[c] + '</text>';
    }

    // Links first, so nodes sit on top. Draw the highlighted ones last.
    const edges = graph.edges();
    const layers = ['', '', ''];
    for (let i = 0; i < edges.length; i++) {
      const a = layout.place.get(edges[i].from);
      const b = layout.place.get(edges[i].to);
      const x1 = a.x + layout.nodeWidth;
      const y1 = a.y + layout.nodeHeight / 2;
      const x2 = b.x;
      const y2 = b.y + layout.nodeHeight / 2;
      const bend = (x2 - x1) / 2;
      const d = 'M' + x1 + ' ' + y1 + ' C' + (x1 + bend) + ' ' + y1 + ' ' + (x2 - bend) + ' ' + y2 + ' ' + x2 + ' ' + y2;
      const isPath = onPath.has(edges[i].from) && onPath.has(edges[i].to) &&
        onPath.get(edges[i].to) === onPath.get(edges[i].from) + 1;
      const isReach = edges[i].from === from || reach.has(edges[i].from);
      if (isPath) layers[2] += '<path class="link is-path" d="' + d + '"/>';
      else if (isReach) layers[1] += '<path class="link is-reach" d="' + d + '"/>';
      else layers[0] += '<path class="link" d="' + d + '"/>';
    }
    svg += layers[0] + layers[1] + layers[2];

    graph.nodes().forEach(function (id) {
      const spot = layout.place.get(id);
      const details = graph.data(id);
      let cls = 'node type-' + details.type;
      let note = '';
      if (id === from) { cls += ' is-start'; note = ', start'; }
      else if (id === to) { cls += ' is-target'; note = ', destination'; }
      if (onPath.has(id)) cls += ' is-path';
      else if (reach.has(id)) cls += ' is-reach';
      svg += '<g class="' + cls + '" data-node="' + esc(id) + '" tabindex="0" role="button" aria-label="' +
        esc(id) + ', ' + details.type + note + '" transform="translate(' + spot.x + ' ' + spot.y + ')">' +
        '<rect width="' + layout.nodeWidth + '" height="' + layout.nodeHeight + '" rx="5"/>' +
        '<text x="' + layout.nodeWidth / 2 + '" y="' + (layout.nodeHeight / 2 + 4.5) + '" text-anchor="middle">' + esc(id) + '</text></g>';
    });
    return svg + '</svg>';
  }

  function nodeOptions(selected, types) {
    const graph = portal.graph;
    let html = '';
    for (let t = 0; t < types.length; t++) {
      html += '<optgroup label="' + TYPE_NAMES[types[t]] + '">';
      graph.nodes().forEach(function (id) {
        if (graph.data(id).type === types[t]) html += option(id, id, selected);
      });
      html += '</optgroup>';
    }
    return html;
  }

  function renderSkills() {
    const graph = portal.graph;
    const from = state.skills.from;
    const to = state.skills.to;
    const route = graph.shortestPath(from, to);
    const search = graph.bfs(from);
    const reach = new DSA.HashTable(64);
    const reachedByType = { field: [], role: [], company: [] };
    for (let i = 1; i < search.order.length; i++) {
      const id = search.order[i];
      reach.set(id, true);
      const type = graph.data(id).type;
      if (reachedByType[type]) reachedByType[type].push({ id: id, steps: search.distance.get(id) });
    }

    let routeHtml = '';
    if (route.path === null) {
      routeHtml = '<p class="route-none">No route leads from ' + esc(from) + ' to ' + esc(to) +
        '. Start from a different skill, or pick a destination that is highlighted on the map.</p>';
    } else if (route.path.length === 1) {
      routeHtml = '<p class="route-none">Start and destination are the same. Pick a different destination.</p>';
    } else {
      routeHtml = '<ol class="route">';
      for (let i = 0; i < route.path.length; i++) {
        routeHtml += '<li class="route-step type-' + graph.data(route.path[i]).type + '">' + esc(route.path[i]) + '</li>';
      }
      routeHtml += '</ol><p class="how">' + count(route.path.length - 1, 'step', 'steps') +
        ', the shortest route. Breadth-first search took ' + count(route.explored, 'node', 'nodes') +
        ' off its queue out of ' + graph.nodeCount + ' before reaching ' + esc(to) + '.</p>';
    }

    function reachList(items) {
      if (items.length === 0) return '<p class="empty">None.</p>';
      let html = '<ul class="reach-list">';
      for (let i = 0; i < items.length; i++) {
        html += '<li><button type="button" class="reach-item" data-action="target" data-node="' + esc(items[i].id) + '">' +
          esc(items[i].id) + '<span class="reach-steps">' + count(items[i].steps, 'step', 'steps') + '</span></button></li>';
      }
      return html + '</ul>';
    }

    const toDetails = graph.data(to);
    const jobsHere = toDetails.type === 'role' || toDetails.type === 'company'
      ? portal.sortJobs(portal.jobsForNode(to), 'deadline', 'asc', 'merge').jobs
      : [];

    main.innerHTML =
      '<section class="view">' +
        '<header class="view-head">' +
          '<h1>Skill map</h1>' +
          '<p class="lede">See how a skill leads to fields, then roles, then the companies hiring for them.</p>' +
        '</header>' +
        '<form class="controls" id="skill-controls">' +
          '<div class="field"><label for="skill-from">Start from</label><select id="skill-from" name="from">' +
            nodeOptions(from, ['skill', 'field']) + '</select></div>' +
          '<div class="field"><label for="skill-to">Go to</label><select id="skill-to" name="to">' +
            nodeOptions(to, ['role', 'company', 'field']) + '</select></div>' +
        '</form>' +
        '<div class="route-box" aria-live="polite">' + routeHtml + '</div>' +
        '<section class="workings graph-panel" aria-labelledby="graph-title">' +
          '<h2 id="graph-title">The map</h2>' +
          '<p class="how">A directed graph with ' + graph.nodeCount + ' nodes and ' + graph.edgeCount +
            ' links. Select a skill or field to start from it. Select a role or company to go to it.</p>' +
          '<div class="graph-scroll" tabindex="0" role="region" aria-label="Skill map, scrolls sideways on small screens">' +
            graphSvg(from, to, route.path === null ? [] : route.path, reach) + '</div>' +
          '<p class="key"><span class="swatch is-path"></span> shortest route <span class="swatch is-reach"></span> reachable from ' + esc(from) +
            ' <span class="swatch"></span> not reachable</p>' +
        '</section>' +
        '<section class="reach" aria-labelledby="reach-title">' +
          '<h2 id="reach-title">Where ' + esc(from) + ' can take you</h2>' +
          '<p class="how">Everything breadth-first search reaches from ' + esc(from) + ', nearest first. Choose one to route to it.</p>' +
          '<div class="reach-grid">' +
            '<div><h3>Fields</h3>' + reachList(reachedByType.field) + '</div>' +
            '<div><h3>Roles</h3>' + reachList(reachedByType.role) + '</div>' +
            '<div><h3>Companies</h3>' + reachList(reachedByType.company) + '</div>' +
          '</div>' +
        '</section>' +
        (jobsHere.length > 0
          ? '<section aria-labelledby="node-jobs-title"><h2 id="node-jobs-title">' +
            (toDetails.type === 'company' ? 'Openings at ' : 'Openings for ') + esc(to) + '</h2>' + jobList(jobsHere, '') + '</section>'
          : '') +
      '</section>';
  }

  /* ---------- Find by ID: hash table and binary search tree ---------- */

  function bstSvg(search) {
    const nodes = portal.jobIndex.layout();
    const stepX = 31;
    const stepY = 58;
    const boxW = 30;
    const boxH = 20;
    const width = nodes.length * stepX + 16;
    const height = portal.jobIndex.height() * stepY;

    const spot = new DSA.HashTable(64);
    for (let i = 0; i < nodes.length; i++) {
      spot.set(nodes[i].key, { x: 8 + nodes[i].x * stepX + boxW / 2, y: 18 + nodes[i].depth * stepY });
    }
    const visited = new DSA.HashTable(16);
    if (search !== null) {
      for (let i = 0; i < search.path.length; i++) visited.set(search.path[i], i + 1);
    }

    let lines = '';
    let strong = '';
    let boxes = '';
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      const here = spot.get(node.key);
      if (node.parentKey !== null) {
        const parent = spot.get(node.parentKey);
        const line = '<line x1="' + parent.x + '" y1="' + (parent.y + boxH / 2) + '" x2="' + here.x + '" y2="' + (here.y - boxH / 2) + '"';
        if (visited.has(node.key) && visited.has(node.parentKey)) strong += line + ' class="branch is-path"/>';
        else lines += line + ' class="branch"/>';
      }
      let cls = 'bst-node';
      if (visited.has(node.key)) {
        cls += search.found && visited.get(node.key) === search.path.length ? ' is-found' : ' is-compared';
      }
      boxes += '<g class="' + cls + '" transform="translate(' + (here.x - boxW / 2) + ' ' + (here.y - boxH / 2) + ')">' +
        '<rect width="' + boxW + '" height="' + boxH + '" rx="4"/>' +
        '<text x="' + boxW / 2 + '" y="14" text-anchor="middle">' + node.key + '</text></g>';
    }
    return '<svg class="bst" viewBox="0 0 ' + width + ' ' + height + '" width="' + width + '" height="' + height +
      '" role="img" aria-label="Binary search tree of ' + nodes.length + ' job IDs, ' + portal.jobIndex.height() + ' levels tall">' +
      lines + strong + boxes + '</svg>';
  }

  function renderLookup() {
    const s = state.lookup;

    // Job by ID
    const jobId = Portal.parseJobId(s.jobId);
    let jobResult = '';
    let hashNote = '<p>Type a job ID to see which bucket it hashes to.</p>';
    let treeNote = '<p>Type a job ID to see the route the search takes from the root.</p>';
    let hashLookup = null;
    let treeSearch = null;
    if (s.jobId.trim() !== '') {
      if (jobId === null) {
        jobResult = '<p class="form-error">A job ID is a number, with or without the J. For example J1771.</p>';
      } else {
        hashLookup = portal.jobTable.lookup(jobId);
        treeSearch = portal.jobIndex.search(jobId);
        jobResult = hashLookup.found
          ? jobList([hashLookup.value], '')
          : '<p class="form-error">No job has the ID ' + jobCode(jobId) + '. IDs run from J' + portal.jobIndex.min() + ' to J' + portal.jobIndex.max() + '.</p>';
        hashNote = '<p>hash("' + jobId + '") = ' + hashLookup.hash + '. Divide by ' + portal.jobTable.bucketCount +
          ' buckets and the remainder is <strong>bucket ' + hashLookup.bucket + '</strong>. ' +
          (hashLookup.found
            ? 'Found after ' + count(hashLookup.comparisons, 'comparison', 'comparisons') + ' in a chain of ' + hashLookup.chainLength + '.'
            : 'Not in that bucket’s chain of ' + hashLookup.chainLength + ', so it is not in the table.') + '</p>';
        treeNote = '<p>' + (treeSearch.found ? 'Found after ' : 'Not found after ') +
          count(treeSearch.comparisons, 'comparison', 'comparisons') + ': ' + treeSearch.path.join(', then ') +
          '. At each ID the search went left for a smaller ID and right for a larger one.</p>';
      }
    }

    // Range of IDs
    let rangeResult = '';
    if (s.low.trim() !== '' || s.high.trim() !== '') {
      const low = Portal.parseJobId(s.low);
      const high = Portal.parseJobId(s.high);
      if (low === null || high === null) {
        rangeResult = '<p class="form-error">Enter a job ID in both boxes.</p>';
      } else if (low > high) {
        rangeResult = '<p class="form-error">The first ID must not be larger than the second.</p>';
      } else {
        const range = portal.jobIndex.range(low, high);
        rangeResult = '<p class="how">' + count(range.entries.length, 'job', 'jobs') + ' from ' + jobCode(low) + ' to ' + jobCode(high) +
          '. The tree visited ' + range.visited + ' of its ' + portal.jobIndex.size + ' nodes and skipped the rest.</p>';
        if (range.entries.length > 0) {
          rangeResult += '<ul class="id-list">';
          for (let i = 0; i < range.entries.length; i++) {
            const job = range.entries[i].value;
            rangeResult += '<li><span class="job-id">' + jobCode(job.id) + '</span> ' + esc(job.role) + ', ' + esc(job.company) + '</li>';
          }
          rangeResult += '</ul>';
        }
      }
    }

    // Candidate by ID
    let candidateResult = '';
    let candidateLookup = null;
    let candidateNote = '<p>Type a candidate ID to see which bucket it hashes to.</p>';
    if (s.candidateId.trim() !== '') {
      const id = Portal.normalizeCandidateId(s.candidateId);
      candidateLookup = portal.candidateTable.lookup(id);
      if (candidateLookup.found) {
        const person = candidateLookup.value;
        candidateResult = '<div class="person"><h3>' + esc(person.name) + '</h3><p>' + esc(person.id) + ', ' + esc(person.branch) +
          ', CGPA ' + person.cgpa + '. ' + (person.skills.length > 0 ? 'Skills: ' + esc(person.skills.join(', ')) + '.' : 'No skills listed.') + '</p>' +
          (person.id === state.candidateId
            ? '<p class="how">You are viewing the portal as this candidate.</p>'
            : '<button type="button" class="button is-quiet" data-action="view-as" data-candidate="' + esc(person.id) + '">View portal as ' + esc(person.name) + '</button>') +
          '</div>';
      } else {
        candidateResult = '<p class="form-error">No candidate has the ID ' + esc(id) + '. Sample IDs run from C101 to C110.</p>';
      }
      candidateNote = '<p>hash("' + esc(id) + '") = ' + candidateLookup.hash + '. Divide by ' + portal.candidateTable.bucketCount +
        ' buckets and the remainder is <strong>bucket ' + candidateLookup.bucket + '</strong>. ' +
        (candidateLookup.found
          ? 'Found after ' + count(candidateLookup.comparisons, 'comparison', 'comparisons') + '.'
          : 'Not in that bucket’s chain of ' + candidateLookup.chainLength + '.') + '</p>';
    }

    let skillBoxes = '';
    portal.graph.nodes().forEach(function (id) {
      if (portal.graph.data(id).type !== 'skill') return;
      skillBoxes += '<label class="check"><input type="checkbox" name="skills" value="' + esc(id) + '"> ' + esc(id) + '</label>';
    });

    let addedNote = '';
    if (s.added !== null) {
      addedNote = '<p class="form-ok">Added ' + esc(s.added.name) + ' as ' + esc(s.added.id) + '. The record went into bucket ' + s.added.bucket +
        (s.added.collided ? ', which already held another candidate, so it joined that chain.' : ', which was empty.') + '</p>';
    }

    main.innerHTML =
      '<section class="view">' +
        '<header class="view-head">' +
          '<h1>Find by ID</h1>' +
          '<p class="lede">Look up a job or a candidate by ID and compare the two ways the portal can find it.</p>' +
        '</header>' +

        '<section aria-labelledby="job-id-title">' +
          '<h2 id="job-id-title">Job ID</h2>' +
          '<form class="controls" id="job-lookup" autocomplete="off">' +
            '<div class="field"><label for="lookup-job">Job ID</label>' +
              '<input id="lookup-job" name="jobId" inputmode="numeric" value="' + esc(s.jobId) + '" placeholder="For example J1771"></div>' +
            '<button type="submit" class="button">Find job</button>' +
          '</form>' +
          '<div aria-live="polite">' + jobResult + '</div>' +
          '<div class="pair">' +
            '<section class="workings" aria-labelledby="job-hash-title"><h3 id="job-hash-title">Hash table</h3>' + hashNote +
              bucketRack(portal.jobTable, hashLookup, jobCode) + '</section>' +
            '<section class="workings" aria-labelledby="job-tree-title"><h3 id="job-tree-title">Binary search tree</h3>' + treeNote +
              '<div class="graph-scroll" tabindex="0" role="region" aria-label="Tree of job IDs, scrolls sideways on small screens">' + bstSvg(treeSearch) + '</div></section>' +
          '</div>' +
        '</section>' +

        '<section aria-labelledby="range-title">' +
          '<h2 id="range-title">Job IDs in a range</h2>' +
          '<form class="controls" id="range-lookup" autocomplete="off">' +
            '<div class="field"><label for="range-low">From ID</label><input id="range-low" name="low" inputmode="numeric" value="' + esc(s.low) + '" placeholder="J1200"></div>' +
            '<div class="field"><label for="range-high">To ID</label><input id="range-high" name="high" inputmode="numeric" value="' + esc(s.high) + '" placeholder="J1400"></div>' +
            '<button type="submit" class="button">List jobs</button>' +
          '</form>' +
          '<div aria-live="polite">' + rangeResult + '</div>' +
        '</section>' +

        '<section aria-labelledby="candidate-id-title">' +
          '<h2 id="candidate-id-title">Candidate ID</h2>' +
          '<form class="controls" id="candidate-lookup" autocomplete="off">' +
            '<div class="field"><label for="lookup-candidate">Candidate ID</label>' +
              '<input id="lookup-candidate" name="candidateId" value="' + esc(s.candidateId) + '" placeholder="For example C104"></div>' +
            '<button type="submit" class="button">Find candidate</button>' +
          '</form>' +
          '<div aria-live="polite">' + candidateResult + '</div>' +
          '<section class="workings" aria-labelledby="candidate-hash-title"><h3 id="candidate-hash-title">Hash table of candidates</h3>' + candidateNote +
            bucketRack(portal.candidateTable, candidateLookup, function (key) { return key; }) + '</section>' +
        '</section>' +

        '<section aria-labelledby="add-title">' +
          '<h2 id="add-title">Add a candidate</h2>' +
          '<p class="how">Add yourself to try the portal with your own CGPA and skills. The record is saved only in this browser.</p>' +
          '<form class="add-form" id="add-candidate" autocomplete="off" novalidate>' +
            '<div class="field"><label for="add-id">ID</label><input id="add-id" name="id" maxlength="20" placeholder="For example C111"></div>' +
            '<div class="field"><label for="add-name">Name</label><input id="add-name" name="name" maxlength="60"></div>' +
            '<div class="field"><label for="add-branch">Branch</label><input id="add-branch" name="branch" maxlength="60" placeholder="For example B.Tech AI"></div>' +
            '<div class="field"><label for="add-cgpa">CGPA</label><input id="add-cgpa" name="cgpa" inputmode="decimal" placeholder="0 to 10"></div>' +
            '<fieldset class="checks"><legend>Skills</legend>' + skillBoxes + '</fieldset>' +
            '<div class="add-actions"><button type="submit" class="button">Add candidate</button></div>' +
            '<div aria-live="polite">' + (s.addError !== '' ? '<p class="form-error">' + esc(s.addError) + '</p>' : '') + addedNote + '</div>' +
          '</form>' +
        '</section>' +
      '</section>';
  }

  /* ---------- Data structures overview ---------- */

  function renderStructures() {
    const rows = [
      ['Array', 'Holds the ' + portal.jobs.length + ' job records. Reading a record by position takes one step.', 'jobs', 'Jobs', 'js/dsa/dynamic-array.js'],
      ['Searching', 'Linear search matches text anywhere in a company or role. Binary search matches the start of a name on a sorted copy.', 'jobs', 'Jobs', 'js/dsa/search.js'],
      ['Sorting', 'Merge, quick, insertion and bubble sort order jobs by salary, company, deadline or role, and report the work each one did.', 'jobs', 'Jobs', 'js/dsa/sort.js'],
      ['Linked list', 'Each candidate’s application history. New applications join at the head; withdrawing unlinks a node.', 'applications', 'My applications', 'js/dsa/linked-list.js'],
      ['Stack', 'Recent activity. Undo pops the latest apply or withdraw and reverses it.', 'applications', 'My applications', 'js/dsa/stack.js'],
      ['Queue', 'The review queue. Applications from every candidate are reviewed first in, first out.', 'applications', 'My applications', 'js/dsa/queue.js'],
      ['Tree 1: general tree', 'The category hierarchy. Choosing a category walks its whole subtree depth-first.', 'categories', 'Categories', 'js/dsa/category-tree.js'],
      ['Tree 2: binary search tree', 'An index of job IDs. Finds one ID, or every ID in a range, by following branches.', 'lookup', 'Find by ID', 'js/dsa/bst.js'],
      ['Graph', 'Skills, fields, roles and companies. Breadth-first search finds the shortest route between two of them.', 'skills', 'Skill map', 'js/dsa/graph.js'],
      ['Hashing', 'Job and candidate lookup by ID. A hash picks the bucket; collisions share a chain.', 'lookup', 'Find by ID', 'js/dsa/hash-table.js'],
    ];
    let body = '';
    for (let i = 0; i < rows.length; i++) {
      body += '<tr><th scope="row">' + rows[i][0] + '</th><td>' + rows[i][1] + '</td>' +
        '<td><a href="#' + rows[i][2] + '">' + rows[i][3] + '</a></td><td><code>' + rows[i][4] + '</code></td></tr>';
    }

    main.innerHTML =
      '<section class="view">' +
        '<header class="view-head">' +
          '<h1>Data structures in this portal</h1>' +
          '<p class="lede">Every feature runs on a data structure or algorithm written by hand for this project. ' +
            'None of them use JavaScript’s built-in sort, Map or Set.</p>' +
        '</header>' +
        '<div class="table-scroll" tabindex="0" role="region" aria-label="Data structures and where they are used">' +
        '<table class="map-table">' +
          '<thead><tr><th scope="col">Structure</th><th scope="col">What it does here</th><th scope="col">See it on</th><th scope="col">Source file</th></tr></thead>' +
          '<tbody>' + body + '</tbody>' +
        '</table></div>' +
        '<section class="workings" aria-labelledby="numbers-title">' +
          '<h2 id="numbers-title">Sizes right now</h2>' +
          '<ul class="numbers">' +
            '<li><strong>' + portal.jobs.length + '</strong> job records in an array with room for ' + portal.jobs.capacity + '</li>' +
            '<li><strong>' + portal.jobTable.bucketCount + '</strong> buckets in the job hash table, about ' + portal.jobTable.loadFactor.toFixed(2) + ' jobs per bucket</li>' +
            '<li><strong>' + portal.jobIndex.height() + '</strong> levels in the binary search tree of job IDs</li>' +
            '<li><strong>' + portal.categories.size + '</strong> categories on ' + portal.categories.height() + ' levels</li>' +
            '<li><strong>' + portal.graph.nodeCount + '</strong> nodes and ' + portal.graph.edgeCount + ' links in the skill map</li>' +
            '<li><strong>' + portal.candidateList.length + '</strong> candidates in ' + portal.candidateTable.bucketCount + ' hash buckets</li>' +
            '<li><strong>' + portal.waiting().length + '</strong> applications waiting in the review queue</li>' +
          '</ul>' +
        '</section>' +
      '</section>';
  }

  /* ---------- Page shell ---------- */

  function fillCandidateSelect() {
    let html = '';
    portal.candidateList.forEach(function (candidate) {
      html += option(candidate.id, candidate.id + ', ' + candidate.name, state.candidateId);
    });
    candidateSelect.innerHTML = html;
  }

  function updateShell() {
    const total = portal.history(state.candidateId).length;
    const badge = document.getElementById('application-count');
    badge.textContent = total === 0 ? '' : String(total);
    if (total === 0) badge.removeAttribute('aria-label');
    else badge.setAttribute('aria-label', count(total, 'application', 'applications'));

    const links = document.querySelectorAll('.rail a');
    for (let i = 0; i < links.length; i++) {
      if (links[i].getAttribute('data-route') === state.route) links[i].setAttribute('aria-current', 'page');
      else links[i].removeAttribute('aria-current');
    }
  }

  /* Draw the current screen again, then put keyboard focus back. */
  function render(focusSelector, fallbackSelector) {
    ROUTES[state.route].render();
    updateShell();
    if (focusSelector) {
      let target = main.querySelector(focusSelector);
      // A button that has just become disabled cannot hold focus, so fall
      // back to the heading of its panel instead of losing the user's place.
      if ((!target || target.disabled) && fallbackSelector) target = main.querySelector(fallbackSelector);
      if (target && !target.disabled) target.focus({ preventScroll: true });
    }
  }

  function routeFromHash() {
    const name = window.location.hash.replace('#', '');
    return ROUTES[name] ? name : 'home';
  }

  function onRouteChange(moveFocus) {
    state.route = routeFromHash();
    document.title = ROUTES[state.route].title + ' | Placement Portal';
    render();
    // On small screens the section links scroll sideways; keep the current one in view.
    const current = document.querySelector('.rail a[aria-current="page"]');
    if (current && current.scrollIntoView) current.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    if (moveFocus) {
      window.scrollTo(0, 0);
      main.focus({ preventScroll: true });
    }
  }

  /* ---------- Events ---------- */

  function selectorFor(element) {
    if (element.id) return '#' + element.id;
    const action = element.getAttribute('data-action');
    if (!action) return null;
    let selector = '[data-action="' + action + '"]';
    ['data-job', 'data-name', 'data-node', 'data-candidate'].forEach(function (name) {
      if (element.hasAttribute(name)) selector += '[' + name + '="' + element.getAttribute(name).replace(/"/g, '\\"') + '"]';
    });
    return selector;
  }

  function chooseNode(id) {
    const type = portal.graph.data(id).type;
    if (type === 'role' || type === 'company') state.skills.to = id;
    else state.skills.from = id;
  }

  main.addEventListener('click', function (event) {
    const node = event.target.closest('[data-node]:not([data-action])');
    if (node) {
      chooseNode(node.getAttribute('data-node'));
      render('[data-node="' + node.getAttribute('data-node').replace(/"/g, '\\"') + '"]:not([data-action])');
      return;
    }

    const button = event.target.closest('[data-action]');
    if (!button || button.disabled) return;
    const action = button.getAttribute('data-action');
    const candidate = activeCandidate();

    if (action === 'apply') {
      const result = portal.apply(candidate.id, Number(button.getAttribute('data-job')));
      showToast(result.ok
        ? 'Applied to ' + result.job.role + ' at ' + result.job.company + '. It has joined the review queue.'
        : result.reason);
      save();
      if (state.route === 'jobs') { updateJobs(); updateShell(); }
      else render();
    } else if (action === 'withdraw') {
      const result = portal.withdraw(candidate.id, Number(button.getAttribute('data-job')));
      showToast(result.ok ? 'Withdrew from ' + result.job.role + ' at ' + result.job.company + '. Undo brings it back.' : result.reason);
      save();
      render('[data-action="undo"]', '#stack-title');
    } else if (action === 'undo') {
      const result = portal.undo(candidate.id);
      if (result.ok) {
        showToast(result.undone === 'apply'
          ? 'Undone: application to ' + result.job.role + ' at ' + result.job.company + ' removed.'
          : 'Undone: application to ' + result.job.role + ' at ' + result.job.company + ' restored.');
      } else {
        showToast(result.reason);
      }
      save();
      render('[data-action="undo"]', '#stack-title');
    } else if (action === 'review') {
      const review = portal.reviewNext();
      if (review !== null) {
        state.lastReview = {
          name: review.candidate.name,
          role: review.job.role,
          company: review.job.company,
          shortlisted: review.shortlisted,
          notes: review.application.notes,
        };
        showToast(review.candidate.name + ': ' + (review.shortlisted ? 'shortlisted' : 'not shortlisted') + ' for ' + review.job.role + '.');
      }
      save();
      render('[data-action="review"]', '#queue-title');
    } else if (action === 'category') {
      state.category = button.getAttribute('data-name');
      render(selectorFor(button));
    } else if (action === 'target') {
      state.skills.to = button.getAttribute('data-node');
      render(selectorFor(button));
    } else if (action === 'demo') {
      const demo = DEMOS[button.getAttribute('data-demo')];
      if (!demo) return;
      demo.setup();
      window.location.hash = demo.go; // the hashchange handler draws the screen
    } else if (action === 'view-as') {
      setCandidate(button.getAttribute('data-candidate'));
    }
  });

  // Graph nodes act as buttons, so Enter and Space must work on them too.
  main.addEventListener('keydown', function (event) {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const node = event.target.closest('g[data-node]');
    if (!node) return;
    event.preventDefault();
    node.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });

  function onJobControl(event) {
    if (!event.target.closest('#job-controls')) return;
    if (state.jobs[event.target.name] === event.target.value) return;
    state.jobs[event.target.name] = event.target.value;
    updateJobs();
  }

  main.addEventListener('input', onJobControl);

  main.addEventListener('change', function (event) {
    onJobControl(event);
    if (event.target.closest('#skill-controls')) {
      state.skills[event.target.name] = event.target.value;
      render('#' + event.target.id);
    }
  });

  main.addEventListener('submit', function (event) {
    event.preventDefault();
    const form = event.target;
    // getAttribute, because the add form has a field named "id" that would
    // otherwise be returned by form.id.
    const formId = form.getAttribute('id');
    const values = new FormData(form);
    const s = state.lookup;
    if (formId === 'job-lookup') {
      s.jobId = String(values.get('jobId'));
      render('#lookup-job');
    } else if (formId === 'range-lookup') {
      s.low = String(values.get('low'));
      s.high = String(values.get('high'));
      render('#range-low');
    } else if (formId === 'candidate-lookup') {
      s.candidateId = String(values.get('candidateId'));
      render('#lookup-candidate');
    } else if (formId === 'add-candidate') {
      const result = portal.registerCandidate({
        id: values.get('id'),
        name: values.get('name'),
        branch: values.get('branch'),
        cgpa: values.get('cgpa'),
        skills: values.getAll('skills'),
      });
      if (result.ok) {
        s.addError = '';
        s.added = { id: result.candidate.id, name: result.candidate.name, bucket: result.bucket, collided: result.collided };
        s.candidateId = result.candidate.id;
        save();
        fillCandidateSelect();
        showToast('Added ' + result.candidate.name + '. Choose them under “Viewing as” to use the portal as them.');
        render('#lookup-candidate');
      } else {
        // Keep what was typed; only show what needs fixing.
        s.addError = result.reason;
        s.added = null;
        const box = form.querySelector('[aria-live]');
        box.innerHTML = '<p class="form-error">' + esc(result.reason) + '</p>';
      }
    }
  });

  function setCandidate(id) {
    const candidate = portal.getCandidate(id);
    if (candidate === undefined) return;
    state.candidateId = candidate.id;
    state.lastReview = null;
    candidateSelect.value = candidate.id;
    save();
    render();
    showToast('Now viewing as ' + candidate.name + '.');
  }

  candidateSelect.addEventListener('change', function () {
    setCandidate(candidateSelect.value);
  });

  document.getElementById('reset-data').addEventListener('click', function () {
    if (!window.confirm('Clear your applications and any candidates you added from this browser?')) return;
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      // Nothing was saved, so there is nothing to clear.
    }
    window.location.reload();
  });

  window.addEventListener('hashchange', function () {
    onRouteChange(true);
  });

  load();
  fillCandidateSelect();
  onRouteChange(false);
})();
