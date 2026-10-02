# Student Placement & Job Search Portal

A student-facing website for searching internships and jobs and keeping track of applications. Every feature runs on a data structure or algorithm written by hand for this project, and each screen draws the structure that produced what you see.

**Live site:** https://shivam-pandyacoder24.github.io/Student-Placement-Job-Search-Portal/ (served by GitHub Pages; see [Deploying](#deploying))

All companies, openings and candidates are sample data made up for this project. Nothing on the site is a real job offer.

## What you can do

- **Jobs** – search 36 openings by company or role, and sort them by deadline, salary, company or role. A panel shows which records the search touched and how many comparisons each sorting algorithm needed.
- **Categories** – browse a category tree. Choosing a category lists every job in it and in the categories below it.
- **My applications** – apply, withdraw and undo. See your history as a linked list, your recent activity as a stack, and the placement cell's review queue shared by all candidates.
- **Skill map** – pick a skill and a destination to get the shortest route, for example `Python → Data Science → Machine Learning → AI Engineer`, drawn on the full graph.
- **Find by ID** – look up a job or candidate by ID and compare the hash table lookup with the binary search tree search. List all job IDs in a range. Add yourself as a candidate.
- **Data structures** – a table of every structure, where it is used and which file it lives in.

## How each data structure is used

| Topic | Used for | Where to see it | Source |
| --- | --- | --- | --- |
| Arrays | The job records, in a dynamic array that doubles when full | Jobs | `js/dsa/dynamic-array.js` |
| Searching | Linear search (text anywhere in a name) and binary search (start of a name, on a sorted copy) | Jobs | `js/dsa/search.js` |
| Sorting | Merge, quick, insertion and bubble sort by salary, company, deadline or role | Jobs | `js/dsa/sort.js` |
| Linked list | Each candidate's application history; newest at the head, withdraw unlinks a node | My applications | `js/dsa/linked-list.js` |
| Stack | Recent activity; undo pops the last apply or withdraw and reverses it | My applications | `js/dsa/stack.js` |
| Queue | The review queue; applications are reviewed first in, first out | My applications | `js/dsa/queue.js` |
| Tree 1 | General tree of job categories; depth-first walk of a subtree | Categories | `js/dsa/category-tree.js` |
| Tree 2 | Binary search tree of job IDs; single search and range search | Find by ID | `js/dsa/bst.js` |
| Graph | Directed graph of skills, fields, roles and companies; breadth-first shortest path | Skill map | `js/dsa/graph.js` |
| Hashing | Hash table with chaining for job and candidate lookup by ID | Find by ID | `js/dsa/hash-table.js` |

The structures also build on each other: the graph stores its adjacency lists in the hash table, runs breadth-first search with the queue and depth-first search with the stack, and the category tree uses the queue for its level-order walk. None of them use JavaScript's built-in `sort`, `Map` or `Set`.

### Time complexity

| Operation | Cost |
| --- | --- |
| Read a job by array index | O(1) |
| Linear search | O(n) |
| Binary search on a sorted list | O(log n) |
| Merge sort | O(n log n) |
| Quick sort | O(n log n) average, O(n²) worst case |
| Insertion sort, bubble sort | O(n²), O(n) on a list that is already sorted |
| Add an application at the head of the linked list | O(1) |
| Withdraw (find and unlink a node) | O(n) |
| Stack push / pop | O(1) |
| Queue enqueue / dequeue | O(1) |
| Collect the jobs in a category subtree | O(nodes in the subtree) |
| BST search / insert | O(h), where h is the height of the tree |
| Hash table lookup | O(1) average, O(length of the chain) worst case |
| Breadth-first search on the graph | O(V + E) |

## Running it

No build step and nothing to install. Either:

- open `index.html` in a browser, or
- serve the folder and visit http://localhost:8000:

  ```
  python3 -m http.server 8000
  ```

Your applications and any candidates you add are saved in the browser's local storage, and nowhere else. Use "Clear my saved data" in the footer to start again.

## Tests

The data structures and the portal logic are covered by 39 tests that run on Node.js 20 or newer, with no dependencies:

```
node --test
```

The tests check each structure on its own (including against random input), then check the portal: search and sort results, the category tree, the skill map, ID lookup, apply / withdraw / undo / review, and saving and restoring.

## Project layout

```
index.html              the page
css/styles.css          all styling
js/dsa/                 the data structures and algorithms, one file each
js/data/                sample jobs, categories, skill map and candidates
js/portal.js            portal logic: puts each structure to work, no page code
js/app.js               builds each screen and draws the structures
tests/                  tests for js/dsa/ and js/portal.js
```

A few details worth knowing when reading the code:

- Job deadlines are stored as "closes in N days" and turned into dates when the page loads, so the sample data never goes out of date.
- Internship stipends are per month and salaries are per year. Sorting by salary compares both as a yearly figure.
- Jobs are added to the binary search tree in the order they appear in `js/data/jobs.js`. That order is deliberately not sorted by ID, because sorted input would turn the tree into a chain.
- An application is shortlisted when the candidate's CGPA meets the job's cutoff and the candidate has at least half of the listed skills.
- Undoing a withdrawal puts the application back in its old place in the history. If it was still waiting for review, it rejoins the queue at the back.

## Deploying

The site is plain HTML, CSS and JavaScript, so GitHub Pages can serve it straight from this repository:

1. On GitHub, open **Settings → Pages**.
2. Under **Build and deployment**, set **Source** to **Deploy from a branch**.
3. Choose branch **main** and folder **/ (root)**, then **Save**.

After a minute or two the site is available at the link at the top of this file.
