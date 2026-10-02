'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { DATA, Portal } = require('./load.js');

function newPortal() {
  const fixed = new Date(2026, 9, 3, 10, 30); // 3 Oct 2026, local time
  return new Portal(DATA, { now: function () { return new Date(fixed); } });
}

function ids(jobs) {
  return jobs.map(function (job) { return job.id; });
}

test('sample data is consistent', function () {
  const portal = newPortal();
  assert.equal(portal.jobs.length, 36);
  assert.equal(portal.jobTable.size, 36);
  assert.equal(portal.jobIndex.size, 36, 'job IDs are unique');

  portal.jobs.forEach(function (job) {
    assert.notEqual(portal.categories.find(job.category), null, 'category exists: ' + job.category);
    const track = portal.graph.data(job.track);
    assert.ok(track && track.type === 'role', 'track is a role in the graph: ' + job.track);
    job.skills.forEach(function (skill) {
      const node = portal.graph.data(skill);
      assert.ok(node && node.type === 'skill', 'skill is in the graph: ' + skill);
    });
    assert.ok(job.closesIn > 0 && job.minCgpa > 0 && job.pay.amount > 0);
  });

  DATA.candidates.forEach(function (candidate) {
    candidate.skills.forEach(function (skill) {
      assert.equal(portal.graph.data(skill).type, 'skill');
    });
  });

  // Every link in the skill map goes forward a level, so there are no cycles.
  portal.graph.edges().forEach(function (edge) {
    assert.ok(portal.graph.data(edge.from).level < portal.graph.data(edge.to).level, edge.from + ' -> ' + edge.to);
  });
});

test('deadlines are worked out from today', function () {
  const portal = newPortal();
  const job = portal.getJob(1512); // closes in 9 days
  assert.equal(job.deadline.getFullYear(), 2026);
  assert.equal(job.deadline.getMonth(), 9);
  assert.equal(job.deadline.getDate(), 12);
});

test('linear and binary search find the same jobs for a prefix', function () {
  const portal = newPortal();
  ['vidya', 'data', 'p', 'full stack', 'kaveri fintech', 'zzz', 'a'].forEach(function (query) {
    ['company', 'role', 'either'].forEach(function (field) {
      const binary = portal.searchJobs(query, field, 'binary');
      const expected = portal.jobs.toArray().filter(function (job) {
        const company = job.company.toLowerCase().startsWith(query);
        const role = job.role.toLowerCase().startsWith(query);
        return field === 'company' ? company : field === 'role' ? role : company || role;
      });
      assert.deepEqual(ids(binary.jobs).sort(), ids(expected).sort(), query + ' in ' + field);
    });
  });
});

test('linear search matches text anywhere in the name', function () {
  const portal = newPortal();
  const result = portal.searchJobs('  ANALYST ', 'role', 'linear');
  const expected = portal.jobs.toArray().filter(function (job) { return /analyst/i.test(job.role); });
  assert.deepEqual(ids(result.jobs), ids(expected));
  assert.ok(result.jobs.length >= 5);
  assert.equal(result.comparisons, 36);

  assert.deepEqual(ids(portal.searchJobs('vidya', 'role', 'linear').jobs), []);
  assert.equal(portal.searchJobs('vidya', 'company', 'linear').jobs.length, 3);
  assert.equal(portal.searchJobs('', 'either', 'linear').jobs.length, 36);
});

test('binary search makes far fewer comparisons than linear search', function () {
  const portal = newPortal();
  const linear = portal.searchJobs('vidya', 'company', 'linear');
  const binary = portal.searchJobs('vidya', 'company', 'binary');
  assert.equal(linear.comparisons, 36);
  assert.ok(binary.comparisons <= 12, 'got ' + binary.comparisons);
  assert.deepEqual(ids(binary.jobs).sort(), ids(linear.jobs).sort());
  assert.equal(binary.traces[0].size, 36);
  assert.equal(binary.traces[0].matches.length, 3);
});

test('every sort algorithm gives the same order for every key and direction', function () {
  const portal = newPortal();
  const all = portal.jobs.toArray();
  ['deadline', 'salary', 'company', 'role'].forEach(function (key) {
    ['asc', 'desc'].forEach(function (direction) {
      const reference = ids(portal.sortJobs(all, key, direction, 'merge').jobs);
      ['quick', 'insertion', 'bubble'].forEach(function (algorithm) {
        assert.deepEqual(ids(portal.sortJobs(all, key, direction, algorithm).jobs), reference, key + ' ' + direction + ' ' + algorithm);
      });
    });
  });

  const bySalary = portal.sortJobs(all, 'salary', 'desc', 'merge').jobs;
  assert.equal(bySalary[0].id, 1150, 'highest pay first: 24 LPA');
  for (let i = 1; i < bySalary.length; i++) assert.ok(bySalary[i - 1].annualPay >= bySalary[i].annualPay);

  const byDeadline = portal.sortJobs(all, 'deadline', 'asc', 'quick').jobs;
  assert.equal(byDeadline[0].id, 1038, 'closes soonest');

  const byCompany = portal.sortJobs(all, 'company', 'asc', 'bubble').jobs;
  assert.equal(byCompany[0].company, 'Bluepeak Systems');
  assert.equal(byCompany[35].company, 'Vidya AI');
});

test('an internship stipend is compared with salaries as a yearly figure', function () {
  const portal = newPortal();
  assert.equal(portal.getJob(1481).annualPay, 9.6); // 80,000 a month
  assert.equal(portal.getJob(1771).annualPay, 14);
});

test('choosing a category collects jobs from everything below it', function () {
  const portal = newPortal();
  const all = portal.jobsInCategory('All jobs');
  assert.equal(all.jobs.length, 36);
  assert.deepEqual(all.path, ['All jobs']);

  const ml = portal.jobsInCategory('Machine learning');
  assert.deepEqual(ml.path, ['All jobs', 'Data and AI', 'Machine learning']);
  assert.deepEqual(ids(ml.jobs).sort(), [1058, 1544, 1705, 1771, 1955]);
  assert.equal(ml.subtreeVisited, 3);

  const vision = portal.jobsInCategory('Computer vision');
  assert.deepEqual(vision.path, ['All jobs', 'Data and AI', 'Machine learning', 'Computer vision']);
  assert.deepEqual(ids(vision.jobs).sort(), [1058, 1705]);

  assert.deepEqual(portal.jobsInCategory('Nowhere').jobs, []);
  assert.equal(portal.categories.height(), 4);

  // Top-level categories split the jobs with nothing left over.
  let total = 0;
  portal.categories.root.children.forEach(function (child) {
    total += portal.jobsInCategory(child.name).jobs.length;
  });
  assert.equal(total, 36);
});

test('the skill map finds Python -> Data Science -> Machine Learning -> AI Engineer', function () {
  const portal = newPortal();
  assert.deepEqual(
    portal.graph.shortestPath('Python', 'AI Engineer').path,
    ['Python', 'Data Science', 'Machine Learning', 'AI Engineer']
  );
  assert.deepEqual(
    portal.graph.shortestPath('Python', 'Vidya AI').path.length, 5
  );
  assert.equal(portal.graph.shortestPath('Excel', 'Embedded Engineer').path, null);
  assert.equal(portal.graph.shortestPath('AI Engineer', 'Python').path, null);

  // Every role can be reached from at least one skill, and has a company hiring.
  portal.graph.nodes().forEach(function (id) {
    if (portal.graph.data(id).type !== 'role') return;
    assert.ok(portal.graph.neighbors(id).length > 0, id + ' has a company');
    assert.ok(portal.jobsForNode(id).length > 0, id + ' has jobs');
  });
  assert.deepEqual(ids(portal.jobsForNode('AI Engineer')).sort(), [1150, 1357, 1893]);
  assert.deepEqual(ids(portal.jobsForNode('Vidya AI')).sort(), [1058, 1771, 1893]);
});

test('job lookup by ID works through the hash table and the BST', function () {
  const portal = newPortal();
  portal.jobs.forEach(function (job) {
    const hashed = portal.jobTable.lookup(job.id);
    assert.equal(hashed.found, true);
    assert.equal(hashed.value, job);
    const indexed = portal.jobIndex.search(job.id);
    assert.equal(indexed.found, true);
    assert.equal(indexed.value, job);
    assert.ok(indexed.comparisons <= portal.jobIndex.height());
  });
  assert.equal(portal.jobTable.lookup(9999).found, false);
  assert.equal(portal.jobIndex.search(9999).found, false);
  assert.equal(portal.jobIndex.height(), 6);
  assert.equal(portal.jobTable.bucketCount, 16);

  const sortedIds = portal.jobIndex.inorder().map(function (entry) { return entry.key; });
  assert.deepEqual(sortedIds, ids(portal.jobs.toArray()).sort(function (a, b) { return a - b; }));
  assert.deepEqual(
    portal.jobIndex.range(1200, 1400).entries.map(function (entry) { return entry.key; }),
    [1229, 1260, 1293, 1325, 1357, 1388]
  );
});

test('parseJobId accepts the forms people type', function () {
  assert.equal(Portal.parseJobId('J1512'), 1512);
  assert.equal(Portal.parseJobId(' j 1512 '), 1512);
  assert.equal(Portal.parseJobId(1512), 1512);
  assert.equal(Portal.parseJobId('15x2'), null);
  assert.equal(Portal.parseJobId(''), null);
  assert.equal(Portal.parseJobId('-5'), null);
});

test('candidates can be found and added', function () {
  const portal = newPortal();
  assert.equal(portal.getCandidate('c101').name, 'Aarav M.');
  assert.equal(portal.getCandidate('C999'), undefined);

  const added = portal.registerCandidate({ id: ' ra2301 ', name: 'Test Student', branch: 'B.Tech AI', cgpa: '8.25', skills: ['Python', 'Python', 7] });
  assert.equal(added.ok, true);
  assert.equal(added.candidate.id, 'RA2301');
  assert.equal(added.candidate.cgpa, 8.25);
  assert.deepEqual(added.candidate.skills, ['Python']);
  assert.equal(portal.getCandidate('RA2301'), added.candidate);
  assert.equal(portal.candidateTable.bucketOf('RA2301'), added.bucket);
  assert.equal(portal.candidateList.length, 11);

  assert.equal(portal.registerCandidate({ id: 'RA2301', name: 'Again', cgpa: 7 }).ok, false);
  assert.equal(portal.registerCandidate({ id: 'has space', name: 'X', cgpa: 7 }).ok, false);
  assert.equal(portal.registerCandidate({ id: 'RA1', name: '', cgpa: 7 }).ok, false);
  assert.equal(portal.registerCandidate({ id: 'RA1', name: 'X', cgpa: 11 }).ok, false);
  assert.equal(portal.registerCandidate({ id: 'RA1', name: 'X', cgpa: '' }).ok, false);
  assert.equal(portal.registerCandidate({ id: 'RA1', name: 'X', cgpa: 'abc' }).ok, false);
});

test('applying adds to the history, the activity stack and the review queue', function () {
  const portal = newPortal();
  assert.equal(portal.apply('C101', 1771).ok, true);
  assert.equal(portal.apply('C101', 1893).ok, true);
  assert.equal(portal.apply('C102', 1260).ok, true);

  assert.deepEqual(portal.history('C101').map(function (a) { return a.jobId; }), [1893, 1771], 'newest first');
  assert.deepEqual(portal.recentActivity('C101').map(function (a) { return a.jobId; }), [1893, 1771], 'top first');
  assert.deepEqual(portal.waiting().map(function (a) { return a.candidateId + ':' + a.jobId; }), ['C101:1771', 'C101:1893', 'C102:1260']);
  assert.equal(portal.hasApplied('C101', 1771), true);
  assert.equal(portal.hasApplied('C102', 1771), false);

  const again = portal.apply('C101', 1771);
  assert.equal(again.ok, false);
  assert.match(again.reason, /Already applied/);
  assert.equal(portal.apply('C101', 9999).ok, false);
  assert.equal(portal.apply('C999', 1771).ok, false);
  assert.equal(portal.waiting().length, 3);
});

test('the review queue is first in, first out and applies the cutoffs', function () {
  const portal = newPortal();
  portal.apply('C101', 1771); // CGPA 8.6 vs 8.0; has Python, Statistics, SQL
  portal.apply('C105', 1771); // CGPA 6.8 vs 8.0
  portal.apply('C104', 1640); // CGPA fine; has none of Linux, Git, Networking

  const first = portal.reviewNext();
  assert.equal(first.candidate.id, 'C101');
  assert.equal(first.shortlisted, true);
  assert.equal(first.application.status, Portal.STATUS.SHORTLISTED);
  assert.equal(portal.history('C101')[0].status, Portal.STATUS.SHORTLISTED, 'the history node is the same record');

  const second = portal.reviewNext();
  assert.equal(second.candidate.id, 'C105');
  assert.equal(second.shortlisted, false);
  assert.match(second.application.notes.join(' '), /below the 8\.0 cutoff/);

  const third = portal.reviewNext();
  assert.equal(third.candidate.id, 'C104');
  assert.equal(third.shortlisted, false);
  assert.match(third.application.notes.join(' '), /Has 0 of the 3 listed skills; at least 2 needed/);

  assert.equal(portal.reviewNext(), null);
});

test('withdrawing removes the application from the history and the queue', function () {
  const portal = newPortal();
  portal.apply('C101', 1771);
  portal.apply('C102', 1260);
  portal.apply('C101', 1893);

  assert.equal(portal.withdraw('C101', 1771).ok, true);
  assert.deepEqual(portal.history('C101').map(function (a) { return a.jobId; }), [1893]);
  assert.deepEqual(portal.waiting().map(function (a) { return a.jobId; }), [1260, 1893], 'others keep their order');
  assert.equal(portal.withdraw('C101', 1771).ok, false);
  assert.equal(portal.hasApplied('C101', 1771), false);
  assert.equal(portal.apply('C101', 1771).ok, true, 'can apply again after withdrawing');
});

test('undo reverses applies and withdrawals in last-in, first-out order', function () {
  const portal = newPortal();
  portal.apply('C101', 1771);
  portal.apply('C101', 1893);
  portal.apply('C101', 1150);
  portal.withdraw('C101', 1893);
  assert.deepEqual(portal.history('C101').map(function (a) { return a.jobId; }), [1150, 1771]);
  assert.deepEqual(portal.waiting().map(function (a) { return a.jobId; }), [1771, 1150]);

  // Undo the withdrawal: back in its old place in the history, back of the queue.
  let undone = portal.undo('C101');
  assert.equal(undone.undone, 'withdraw');
  assert.equal(undone.job.id, 1893);
  assert.deepEqual(portal.history('C101').map(function (a) { return a.jobId; }), [1150, 1893, 1771]);
  assert.deepEqual(portal.waiting().map(function (a) { return a.jobId; }), [1771, 1150, 1893]);

  // Undo the three applications, newest first.
  undone = portal.undo('C101');
  assert.equal(undone.undone, 'apply');
  assert.equal(undone.job.id, 1150);
  portal.undo('C101');
  assert.deepEqual(portal.history('C101').map(function (a) { return a.jobId; }), [1771]);
  portal.undo('C101');
  assert.deepEqual(portal.history('C101'), []);
  assert.deepEqual(portal.waiting(), []);

  const nothing = portal.undo('C101');
  assert.equal(nothing.ok, false);
  assert.match(nothing.reason, /Nothing to undo/);
});

test('undo keeps each candidate separate and copes with reviewed applications', function () {
  const portal = newPortal();
  portal.apply('C101', 1771);
  portal.apply('C102', 1260);
  portal.reviewNext(); // C101's application is now shortlisted

  // Withdraw a reviewed application, then undo: it comes back reviewed, not queued.
  portal.withdraw('C101', 1771);
  assert.deepEqual(portal.waiting().map(function (a) { return a.jobId; }), [1260]);
  portal.undo('C101');
  assert.equal(portal.history('C101')[0].status, Portal.STATUS.SHORTLISTED);
  assert.deepEqual(portal.waiting().map(function (a) { return a.jobId; }), [1260]);

  // Undo the original apply: gone from the history, queue untouched.
  portal.undo('C101');
  assert.deepEqual(portal.history('C101'), []);
  assert.deepEqual(portal.history('C102').map(function (a) { return a.jobId; }), [1260]);
  assert.deepEqual(portal.waiting().map(function (a) { return a.jobId; }), [1260]);
  assert.equal(portal.undo('C101').ok, false);
});

test('random sequences of actions keep the three structures in step', function () {
  let state = 2026;
  function random() {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  }
  const portal = newPortal();
  const candidates = ['C101', 'C102', 'C103'];
  const jobIds = ids(portal.jobs.toArray());

  for (let step = 0; step < 1500; step++) {
    const candidate = candidates[Math.floor(random() * candidates.length)];
    const jobId = jobIds[Math.floor(random() * 8)];
    const roll = random();
    if (roll < 0.45) portal.apply(candidate, jobId);
    else if (roll < 0.65) portal.withdraw(candidate, jobId);
    else if (roll < 0.85) portal.undo(candidate);
    else portal.reviewNext();

    // The queue holds exactly the waiting applications from all histories.
    const waiting = portal.waiting();
    const expected = [];
    candidates.forEach(function (id) {
      const history = portal.history(id);
      const seen = {};
      history.forEach(function (application, index) {
        assert.equal(seen[application.jobId], undefined, 'one application per job');
        seen[application.jobId] = true;
        if (index > 0) assert.ok(history[index - 1].seq > application.seq, 'history is newest first');
        if (application.status === Portal.STATUS.WAITING) expected.push(application);
      });
    });
    assert.equal(waiting.length, expected.length);
    expected.forEach(function (application) {
      assert.ok(waiting.indexOf(application) !== -1, 'waiting application is queued');
    });
  }
});

test('a snapshot restores histories, activity, the queue and added candidates', function () {
  const portal = newPortal();
  portal.registerCandidate({ id: 'RA2301', name: 'Test Student', branch: 'B.Tech AI', cgpa: 8.2, skills: ['Python'] });
  portal.apply('C101', 1771);
  portal.apply('RA2301', 1512);
  portal.apply('C101', 1893);
  portal.apply('C101', 1150);
  portal.reviewNext(); // C101 / 1771
  portal.withdraw('C101', 1893);

  const saved = JSON.parse(JSON.stringify(portal.snapshot()));
  const copy = newPortal();
  assert.equal(copy.restore(saved), true);

  assert.equal(copy.getCandidate('RA2301').name, 'Test Student');
  assert.deepEqual(copy.history('C101'), portal.history('C101'));
  assert.deepEqual(copy.history('RA2301'), portal.history('RA2301'));
  assert.deepEqual(copy.recentActivity('C101'), portal.recentActivity('C101'));
  assert.deepEqual(
    copy.waiting().map(function (a) { return a.candidateId + ':' + a.jobId; }),
    ['RA2301:1512', 'C101:1150']
  );
  assert.equal(copy.waiting()[1], copy.history('C101')[0], 'queue and history share one record');

  // Undo still works after a restore, and new applications get fresh numbers.
  copy.undo('C101');
  assert.deepEqual(copy.history('C101').map(function (a) { return a.jobId; }), [1150, 1893, 1771]);
  const fresh = copy.apply('C102', 1260);
  assert.ok(fresh.application.seq > 4);
});

test('restore ignores damaged or unknown data', function () {
  assert.equal(newPortal().restore(null), false);
  assert.equal(newPortal().restore({ version: 99 }), false);

  const portal = newPortal();
  const ok = portal.restore({
    version: 1,
    seq: 'x',
    addedCandidates: [{ id: 'bad id', name: 'X', cgpa: 5 }, null, { id: 'OK1', name: 'Fine', cgpa: 7, skills: 'Python' }],
    candidates: {
      C101: {
        history: [
          { seq: 3, jobId: 1771, status: 'Waiting for review' },
          { seq: 2, jobId: 4242, status: 'Shortlisted' }, // no such job
          { seq: 1, jobId: 1771, status: 'Shortlisted' }, // duplicate job
          'junk',
        ],
        activity: [{ type: 'apply', seq: 3, jobId: 1771 }, { type: 'explode' }, null],
      },
      GHOST: { history: [{ seq: 9, jobId: 1512 }] },
    },
    queue: [{ candidateId: 'GHOST', seq: 9 }, null], // the waiting C101 application is missing here
  });
  assert.equal(ok, true);
  assert.equal(portal.getCandidate('OK1').name, 'Fine');
  assert.deepEqual(portal.getCandidate('OK1').skills, []);
  assert.deepEqual(portal.history('C101').map(function (a) { return a.jobId; }), [1771]);
  assert.deepEqual(portal.waiting().map(function (a) { return a.jobId; }), [1771], 'waiting application rejoins the queue');
  assert.equal(portal.apply('C102', 1260).application.seq, 4);
});
