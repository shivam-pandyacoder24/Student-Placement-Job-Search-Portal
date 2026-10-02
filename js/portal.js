/*
 * The portal's logic, with no page code in it.
 *
 * This file is where each data structure is put to work:
 *   DynamicArray      job records
 *   search / sort     finding and ordering jobs
 *   LinkedList        each candidate's application history
 *   Stack             each candidate's recent activity, for undo
 *   Queue             the placement cell's review queue
 *   CategoryTree      job categories
 *   BinarySearchTree  index of job IDs
 *   Graph             skills -> fields -> roles -> companies
 *   HashTable         job and candidate lookup by ID
 *
 * Needs every file in js/dsa/ to be loaded first.
 */
(function (global) {
  'use strict';
  const DSA = global.DSA;

  const STATUS = {
    WAITING: 'Waiting for review',
    SHORTLISTED: 'Shortlisted',
    NOT_SHORTLISTED: 'Not shortlisted',
  };

  const SORT_ALGORITHMS = {
    merge: { name: 'Merge sort', run: DSA.sort.mergeSort },
    quick: { name: 'Quick sort', run: DSA.sort.quickSort },
    insertion: { name: 'Insertion sort', run: DSA.sort.insertionSort },
    bubble: { name: 'Bubble sort', run: DSA.sort.bubbleSort },
  };

  const SORT_KEYS = {
    deadline: function (a, b) {
      return a.closesIn - b.closesIn;
    },
    salary: function (a, b) {
      return a.annualPay - b.annualPay;
    },
    company: function (a, b) {
      return DSA.search.compareText(a.companyKey, b.companyKey);
    },
    role: function (a, b) {
      return DSA.search.compareText(a.roleKey, b.roleKey);
    },
  };

  function normalize(text) {
    return String(text === undefined || text === null ? '' : text)
      .trim()
      .toLowerCase();
  }

  /* Accepts 1512, "1512", "J1512" or "j 1512". Returns a number or null. */
  function parseJobId(input) {
    const text = String(input === undefined || input === null ? '' : input)
      .trim()
      .replace(/^j\s*/i, '');
    if (!/^\d+$/.test(text)) return null;
    return Number(text);
  }

  class Portal {
    constructor(data, options) {
      const settings = options || {};
      this._now = settings.now || function () { return new Date(); };
      this._seq = 0;

      this._loadJobs(data.jobs);
      this._loadCategories(data.categories);
      this._loadGraph(data.skillGraph);
      this._loadCandidates(data.candidates);

      this.histories = new DSA.HashTable(16); // candidate ID -> LinkedList of applications
      this.activity = new DSA.HashTable(16); // candidate ID -> Stack of actions
      this.queue = new DSA.Queue(); // applications waiting for review, oldest first
    }

    /* ---------- Jobs: array, hash table, BST ---------- */

    _loadJobs(rawJobs) {
      const today = this._now();
      const midnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());

      this.jobs = new DSA.DynamicArray(rawJobs.length);
      this.jobTable = new DSA.HashTable(16, 3);
      this.jobIndex = new DSA.BinarySearchTree();

      for (let i = 0; i < rawJobs.length; i++) {
        const raw = rawJobs[i];
        const deadline = new Date(midnight);
        deadline.setDate(deadline.getDate() + raw.closesIn);
        const record = {
          id: raw.id,
          role: raw.role,
          company: raw.company,
          category: raw.category,
          track: raw.track,
          type: raw.type,
          location: raw.location,
          pay: raw.pay,
          // One comparable figure in lakhs per year, for sorting by salary.
          annualPay: raw.pay.unit === 'LPA' ? raw.pay.amount : (raw.pay.amount * 12) / 100000,
          closesIn: raw.closesIn,
          deadline: deadline,
          minCgpa: raw.minCgpa,
          skills: raw.skills.slice(),
          companyKey: normalize(raw.company),
          roleKey: normalize(raw.role),
        };
        this.jobs.push(record);
        this.jobTable.set(record.id, record);
        this.jobIndex.insert(record.id, record);
      }

      // Binary search needs sorted input, so keep one copy sorted by each key.
      const all = this.jobs.toArray();
      const byId = function (a, b) { return a.id - b.id; };
      this.jobsByCompany = DSA.sort.mergeSort(all, function (a, b) {
        return SORT_KEYS.company(a, b) || byId(a, b);
      }).sorted;
      this.jobsByRole = DSA.sort.mergeSort(all, function (a, b) {
        return SORT_KEYS.role(a, b) || byId(a, b);
      }).sorted;
    }

    getJob(id) {
      return this.jobTable.get(id);
    }

    /*
     * Search jobs by company or role.
     *   field  - 'company', 'role' or 'either'
     *   method - 'linear' (text anywhere in the name)
     *            'binary' (text at the start of the name)
     * `traces` describes the work done, for drawing it on the page.
     */
    searchJobs(query, field, method) {
      const text = normalize(query);
      const all = this.jobs.toArray();
      if (text === '') {
        return { jobs: all, comparisons: 0, method: 'none', traces: [] };
      }

      if (method === 'binary') {
        const lists = [];
        if (field !== 'role') lists.push({ label: 'company', sorted: this.jobsByCompany, key: 'companyKey' });
        if (field !== 'company') lists.push({ label: 'role', sorted: this.jobsByRole, key: 'roleKey' });

        const jobs = [];
        const taken = new DSA.HashTable(16);
        const traces = [];
        let comparisons = 0;
        for (let i = 0; i < lists.length; i++) {
          const list = lists[i];
          const result = DSA.search.binarySearchPrefix(list.sorted, function (job) {
            return job[list.key];
          }, text);
          comparisons += result.comparisons;
          traces.push({
            label: 'Jobs sorted by ' + list.label,
            size: list.sorted.length,
            probes: result.probes,
            matches: result.indexes,
            comparisons: result.comparisons,
          });
          for (let j = 0; j < result.indexes.length; j++) {
            const job = list.sorted[result.indexes[j]];
            if (!taken.has(job.id)) {
              taken.set(job.id, true);
              jobs.push(job);
            }
          }
        }
        return { jobs: jobs, comparisons: comparisons, method: 'binary', traces: traces };
      }

      const result = DSA.search.linearSearch(all, function (job) {
        if (field === 'company') return job.companyKey.includes(text);
        if (field === 'role') return job.roleKey.includes(text);
        return job.companyKey.includes(text) || job.roleKey.includes(text);
      });
      const jobs = [];
      for (let i = 0; i < result.indexes.length; i++) jobs.push(all[result.indexes[i]]);
      return {
        jobs: jobs,
        comparisons: result.comparisons,
        method: 'linear',
        traces: [
          {
            label: 'Jobs in stored order',
            size: all.length,
            probes: null, // every record is checked
            matches: result.indexes,
            comparisons: result.comparisons,
          },
        ],
      };
    }

    /*
     * Sort a list of jobs.
     *   key       - 'deadline', 'salary', 'company' or 'role'
     *   direction - 'asc' or 'desc'
     *   algorithm - 'merge', 'quick', 'insertion' or 'bubble'
     * Ties are broken by job ID so every algorithm gives the same order.
     */
    sortJobs(jobs, key, direction, algorithm) {
      const byKey = SORT_KEYS[key] || SORT_KEYS.deadline;
      const chosen = SORT_ALGORITHMS[algorithm] || SORT_ALGORITHMS.merge;
      const sign = direction === 'desc' ? -1 : 1;
      const result = chosen.run(jobs, function (a, b) {
        return sign * byKey(a, b) || a.id - b.id;
      });
      return {
        jobs: result.sorted,
        comparisons: result.comparisons,
        moves: result.moves,
        algorithm: chosen.name,
      };
    }

    /* ---------- Categories: general tree ---------- */

    _loadCategories(outline) {
      const tree = new DSA.CategoryTree(outline.name);
      (function addChildren(parent) {
        const children = parent.children || [];
        for (let i = 0; i < children.length; i++) {
          tree.add(parent.name, children[i].name);
          addChildren(children[i]);
        }
      })(outline);
      this.jobs.forEach(function (job) {
        tree.attach(job.category, job.id);
      });
      this.categories = tree;
    }

    /* Every job in a category and the categories below it. */
    jobsInCategory(name) {
      const search = this.categories.search(name);
      if (search.node === null) {
        return { jobs: [], path: [], searchVisited: search.visited, subtreeVisited: 0 };
      }
      const collected = this.categories.collect(name);
      const jobs = [];
      for (let i = 0; i < collected.items.length; i++) jobs.push(this.getJob(collected.items[i]));
      return {
        jobs: jobs,
        path: this.categories.pathTo(name),
        searchVisited: search.visited,
        subtreeVisited: collected.visited,
      };
    }

    /* ---------- Skill map: graph ---------- */

    _loadGraph(map) {
      const graph = new DSA.Graph();
      for (let i = 0; i < map.nodes.length; i++) {
        const node = map.nodes[i];
        graph.addNode(node.id, { type: node.type, level: node.level });
      }
      for (let i = 0; i < map.edges.length; i++) graph.addEdge(map.edges[i][0], map.edges[i][1]);

      // Roles link to the companies that have an opening for them.
      this.jobs.forEach(function (job) {
        graph.addNode(job.company, { type: 'company', level: 4 });
        graph.addEdge(job.track, job.company);
      });
      this.graph = graph;
    }

    /* Open jobs for a role, or at a company. */
    jobsForNode(id) {
      const details = this.graph.data(id);
      if (details === undefined) return [];
      const all = this.jobs.toArray();
      const matches = DSA.search.linearSearch(all, function (job) {
        return details.type === 'company' ? job.company === id : job.track === id;
      });
      const jobs = [];
      for (let i = 0; i < matches.indexes.length; i++) jobs.push(all[matches.indexes[i]]);
      return jobs;
    }

    /* ---------- Candidates: hash table ---------- */

    _loadCandidates(candidates) {
      this.candidateTable = new DSA.HashTable(8, 2);
      this.candidateList = new DSA.DynamicArray(candidates.length);
      this.addedCandidates = [];
      for (let i = 0; i < candidates.length; i++) {
        this.candidateTable.set(candidates[i].id, candidates[i]);
        this.candidateList.push(candidates[i]);
      }
    }

    getCandidate(id) {
      return this.candidateTable.get(normalizeCandidateId(id));
    }

    /* Add a candidate. Returns where the record landed in the hash table. */
    registerCandidate(details) {
      if (details === null || typeof details !== 'object') {
        return { ok: false, reason: 'Enter the candidate details.' };
      }
      const id = normalizeCandidateId(details.id);
      const name = String(details.name || '').trim();
      const cgpa = Number(details.cgpa);
      if (!/^[A-Z0-9]{2,20}$/.test(id)) {
        return { ok: false, reason: 'Use 2 to 20 letters and digits for the ID, with no spaces.' };
      }
      if (this.candidateTable.has(id)) {
        return { ok: false, reason: 'A candidate with ID ' + id + ' already exists.' };
      }
      if (name === '') return { ok: false, reason: 'Enter a name.' };
      if (String(details.cgpa).trim() === '' || !(cgpa >= 0 && cgpa <= 10)) {
        return { ok: false, reason: 'Enter a CGPA between 0 and 10.' };
      }
      const candidate = {
        id: id,
        name: name.slice(0, 60),
        branch: String(details.branch || '').trim().slice(0, 60) || 'Not given',
        cgpa: Math.round(cgpa * 100) / 100,
        skills: cleanSkills(details.skills),
      };
      const placed = this.candidateTable.set(id, candidate);
      this.candidateList.push(candidate);
      this.addedCandidates.push(candidate);
      return { ok: true, candidate: candidate, bucket: placed.bucket, collided: placed.collided };
    }

    /* ---------- Applications: linked list, stack, queue ---------- */

    _historyOf(candidateId) {
      const id = normalizeCandidateId(candidateId);
      let list = this.histories.get(id);
      if (list === undefined) {
        list = new DSA.LinkedList();
        this.histories.set(id, list);
      }
      return list;
    }

    _activityOf(candidateId) {
      const id = normalizeCandidateId(candidateId);
      let stack = this.activity.get(id);
      if (stack === undefined) {
        stack = new DSA.Stack();
        this.activity.set(id, stack);
      }
      return stack;
    }

    /* Applications, newest first. */
    history(candidateId) {
      return this._historyOf(candidateId).toArray();
    }

    /* Actions that can be undone, most recent first. */
    recentActivity(candidateId) {
      return this._activityOf(candidateId).toArray();
    }

    /* Applications waiting for review, next one first. */
    waiting() {
      return this.queue.toArray();
    }

    hasApplied(candidateId, jobId) {
      return this._historyOf(candidateId).find(function (application) {
        return application.jobId === jobId;
      }) !== null;
    }

    apply(candidateId, jobId) {
      const candidate = this.getCandidate(candidateId);
      const job = this.getJob(jobId);
      if (candidate === undefined) return { ok: false, reason: 'No candidate with ID ' + candidateId + '.' };
      if (job === undefined) return { ok: false, reason: 'No job with ID ' + jobId + '.' };
      if (this.hasApplied(candidate.id, job.id)) {
        return { ok: false, reason: 'Already applied to ' + job.role + ' at ' + job.company + '.' };
      }

      this._seq++;
      const application = {
        seq: this._seq,
        candidateId: candidate.id,
        jobId: job.id,
        appliedAt: this._now().toISOString(),
        status: STATUS.WAITING,
        notes: [],
      };
      this._historyOf(candidate.id).prepend(application); // newest at the head
      this._activityOf(candidate.id).push({ type: 'apply', seq: application.seq, jobId: job.id });
      this.queue.enqueue(application); // joins the back of the review queue
      return { ok: true, application: application, job: job };
    }

    withdraw(candidateId, jobId) {
      const candidate = this.getCandidate(candidateId);
      if (candidate === undefined) return { ok: false, reason: 'No candidate with ID ' + candidateId + '.' };
      const application = this._historyOf(candidate.id).removeWhere(function (item) {
        return item.jobId === jobId;
      });
      if (application === null) return { ok: false, reason: 'No application for that job.' };

      const wasWaiting = application.status === STATUS.WAITING;
      if (wasWaiting) this._leaveQueue(application);
      this._activityOf(candidate.id).push({
        type: 'withdraw',
        seq: application.seq,
        jobId: application.jobId,
        application: application,
        wasWaiting: wasWaiting,
      });
      return { ok: true, application: application, job: this.getJob(application.jobId) };
    }

    _leaveQueue(application) {
      this.queue.removeWhere(function (item) {
        return item === application;
      });
    }

    /* Reverse the candidate's most recent apply or withdraw. */
    undo(candidateId) {
      const candidate = this.getCandidate(candidateId);
      if (candidate === undefined) return { ok: false, reason: 'No candidate with ID ' + candidateId + '.' };
      const action = this._activityOf(candidate.id).pop();
      if (action === null) return { ok: false, reason: 'Nothing to undo.' };

      const history = this._historyOf(candidate.id);
      if (action.type === 'apply') {
        const application = history.removeWhere(function (item) {
          return item.seq === action.seq;
        });
        if (application !== null && application.status === STATUS.WAITING) this._leaveQueue(application);
      } else {
        // Put the application back where it was: the list is newest first.
        history.insertSorted(action.application, function (a, b) {
          return b.seq - a.seq;
        });
        // It gave up its place in the queue, so it rejoins at the back.
        if (action.wasWaiting) this.queue.enqueue(action.application);
      }
      return { ok: true, undone: action.type, job: this.getJob(action.jobId) };
    }

    /* Check one application against the job's requirements. */
    evaluate(candidate, job) {
      const cgpaOk = candidate.cgpa >= job.minCgpa;
      let matched = 0;
      for (let i = 0; i < job.skills.length; i++) {
        for (let j = 0; j < candidate.skills.length; j++) {
          if (candidate.skills[j] === job.skills[i]) {
            matched++;
            break;
          }
        }
      }
      const needed = Math.ceil(job.skills.length / 2);
      const skillsOk = matched >= needed;
      const cutoff = job.minCgpa.toFixed(1);
      const notes = [
        cgpaOk
          ? 'CGPA ' + candidate.cgpa + ' meets the ' + cutoff + ' cutoff.'
          : 'CGPA ' + candidate.cgpa + ' is below the ' + cutoff + ' cutoff.',
        skillsOk
          ? 'Has ' + matched + ' of the ' + job.skills.length + ' listed skills.'
          : 'Has ' + matched + ' of the ' + job.skills.length + ' listed skills; at least ' + needed + ' needed.',
      ];
      return { shortlisted: cgpaOk && skillsOk, notes: notes };
    }

    /* Review the application at the front of the queue. Null when empty. */
    reviewNext() {
      const application = this.queue.dequeue();
      if (application === null) return null;
      const candidate = this.getCandidate(application.candidateId);
      const job = this.getJob(application.jobId);
      const verdict = this.evaluate(candidate, job);
      application.status = verdict.shortlisted ? STATUS.SHORTLISTED : STATUS.NOT_SHORTLISTED;
      application.notes = verdict.notes;
      return { application: application, candidate: candidate, job: job, shortlisted: verdict.shortlisted };
    }

    /* ---------- Saving and loading ---------- */

    /* Everything a browser needs to store to bring the portal back. */
    snapshot() {
      const portal = this;
      const perCandidate = {};
      const ids = this.histories.keys();
      for (let i = 0; i < ids.length; i++) {
        perCandidate[ids[i]] = { history: portal.history(ids[i]), activity: [] };
      }
      const stackIds = this.activity.keys();
      for (let i = 0; i < stackIds.length; i++) {
        if (perCandidate[stackIds[i]] === undefined) perCandidate[stackIds[i]] = { history: [], activity: [] };
        perCandidate[stackIds[i]].activity = portal.recentActivity(stackIds[i]);
      }
      const waiting = this.queue.toArray();
      const queue = [];
      for (let i = 0; i < waiting.length; i++) {
        queue.push({ candidateId: waiting[i].candidateId, seq: waiting[i].seq });
      }
      return {
        version: 1,
        seq: this._seq,
        addedCandidates: this.addedCandidates.slice(),
        candidates: perCandidate,
        queue: queue,
      };
    }

    /* Rebuild from a snapshot. Anything that no longer makes sense is skipped. */
    restore(saved) {
      if (!saved || saved.version !== 1) return false;
      const portal = this;

      const added = Array.isArray(saved.addedCandidates) ? saved.addedCandidates : [];
      for (let i = 0; i < added.length; i++) portal.registerCandidate(added[i]);

      const statuses = [STATUS.WAITING, STATUS.SHORTLISTED, STATUS.NOT_SHORTLISTED];
      function cleanApplication(raw, candidateId) {
        if (!raw || portal.getJob(raw.jobId) === undefined || !Number.isInteger(raw.seq)) return null;
        return {
          seq: raw.seq,
          candidateId: candidateId,
          jobId: raw.jobId,
          appliedAt: String(raw.appliedAt || ''),
          status: statuses.indexOf(raw.status) === -1 ? STATUS.WAITING : raw.status,
          notes: Array.isArray(raw.notes) ? raw.notes.map(String) : [],
        };
      }

      function isQueued(application) {
        const waiting = portal.queue.toArray();
        for (let i = 0; i < waiting.length; i++) {
          if (waiting[i] === application) return true;
        }
        return false;
      }

      let highestSeq = 0;
      const perCandidate = saved.candidates || {};
      const ids = Object.keys(perCandidate);
      for (let i = 0; i < ids.length; i++) {
        const candidateId = ids[i];
        if (portal.getCandidate(candidateId) === undefined) continue;
        const entry = perCandidate[candidateId] || {};

        const list = portal._historyOf(candidateId);
        const history = Array.isArray(entry.history) ? entry.history : [];
        for (let j = 0; j < history.length; j++) {
          const application = cleanApplication(history[j], candidateId);
          if (application === null || portal.hasApplied(candidateId, application.jobId)) continue;
          list.append(application); // saved newest first, so appending keeps the order
          if (application.seq > highestSeq) highestSeq = application.seq;
        }

        const stack = portal._activityOf(candidateId);
        const actions = Array.isArray(entry.activity) ? entry.activity : [];
        for (let j = actions.length - 1; j >= 0; j--) {
          const action = actions[j]; // saved top first, so push from the bottom up
          if (!action || portal.getJob(action.jobId) === undefined) continue;
          if (action.type === 'apply') {
            stack.push({ type: 'apply', seq: action.seq, jobId: action.jobId });
          } else if (action.type === 'withdraw') {
            const application = cleanApplication(action.application, candidateId);
            if (application === null) continue;
            if (application.seq > highestSeq) highestSeq = application.seq;
            stack.push({
              type: 'withdraw',
              seq: application.seq,
              jobId: application.jobId,
              application: application,
              wasWaiting: action.wasWaiting === true,
            });
          }
        }
      }

      const queue = Array.isArray(saved.queue) ? saved.queue : [];
      for (let i = 0; i < queue.length; i++) {
        const ticket = queue[i] || {};
        const list = portal.histories.get(ticket.candidateId);
        if (list === undefined) continue;
        const application = list.find(function (item) {
          return item.seq === ticket.seq;
        });
        if (application !== null && application.status === STATUS.WAITING && !isQueued(application)) {
          portal.queue.enqueue(application);
        }
      }

      // A waiting application must be in the queue. If the saved queue lost
      // one, it rejoins at the back, oldest first.
      const stragglers = [];
      const listIds = portal.histories.keys();
      for (let i = 0; i < listIds.length; i++) {
        portal.histories.get(listIds[i]).forEach(function (application) {
          if (application.status === STATUS.WAITING && !isQueued(application)) stragglers.push(application);
        });
      }
      const ordered = DSA.sort.mergeSort(stragglers, function (a, b) {
        return a.seq - b.seq;
      }).sorted;
      for (let i = 0; i < ordered.length; i++) portal.queue.enqueue(ordered[i]);

      const savedSeq = Number.isInteger(saved.seq) ? saved.seq : 0;
      this._seq = savedSeq > highestSeq ? savedSeq : highestSeq;
      return true;
    }
  }

  /* Keep only text entries, without repeats. */
  function cleanSkills(skills) {
    const clean = [];
    if (!Array.isArray(skills)) return clean;
    for (let i = 0; i < skills.length; i++) {
      if (typeof skills[i] === 'string' && clean.indexOf(skills[i]) === -1) clean.push(skills[i]);
    }
    return clean;
  }

  function normalizeCandidateId(id) {
    return String(id === undefined || id === null ? '' : id)
      .trim()
      .toUpperCase();
  }

  global.Portal = Portal;
  Portal.STATUS = STATUS;
  Portal.SORT_ALGORITHMS = SORT_ALGORITHMS;
  Portal.parseJobId = parseJobId;
  Portal.normalizeCandidateId = normalizeCandidateId;
})(typeof window !== 'undefined' ? window : globalThis);
