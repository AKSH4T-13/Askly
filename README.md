# Askly — page-driven visual learning

Askly reads the current webpage or selection, then Groq chooses validated visualization tools based on the page and the user's explicit question. It does not default every page to a hardcoded sorting demo.

## Run

1. `npm install`
2. `npm run build`
3. Chrome → `chrome://extensions` → Developer mode → Load unpacked → select `dist`.
4. `venv\Scripts\python.exe -m pip install -r backend/requirements.txt`
5. Root `.env`: `GROQ_API_KEY=...`; optional `GROQ_MODEL=openai/gpt-oss-20b`.
6. `venv\Scripts\python.exe -m uvicorn backend.main:app --host 127.0.0.1 --port 8000`
7. After updates, restart the Python backend and reload Askly on `chrome://extensions`.

Standalone development: `npm run dev`. Optional `VITE_API_URL` selects a different development API. Production defaults to localhost:8000. Page extraction requires the installed extension; localhost preview cannot read other tabs.

## New primary flow

- **Read page** attaches selected text, article, main content or body. It shows the title, character count, loading and local errors. Website permission recovery uses a separate direct user click.
- **Visualize this page** sends page context to the planner and suggests relevant tools.
- **Ask & explore** prioritizes the explicit question; questions outside the page are allowed and labelled.
- **Compare visually** opens both suggested tools, using validated shared array/target or shared processes for comparisons.
- Array, scheduling and explanatory-scene comparisons share playback controls; graph tools keep independent controls. Step counts are not runtime benchmarks.
- **Explain this step** pauses playback and sends the displayed states to Groq.
- Fixed algorithm menus live in the optional **Manual playground**.

## Tool registry

- Array: Bubble/Selection/Insertion/Merge/Quick Sort; Linear/Binary/Rotated Sorted Search.
- Graph: BFS, DFS, Dijkstra, topological sort (Kahn), Kruskal/DSU. Editable graph and traversal state.
- CPU scheduling: FCFS, SJF, SRTF, Priority (preemptive and non-preemptive), Round Robin. Gantt chart, ready queue, remaining work, completion/waiting/turnaround/response metrics. Editable processes and quantum for individual tools. Lower number means higher priority, integer time units, zero switch overhead, deterministic arrival/input-order tie breaking. RR admits boundary arrivals before requeuing the expired process.
- General visual: model-generated nodes, labelled connections and scenes with staged highlights. Flow, sequence, cycle and comparison layouts. Nodes can be selected to inspect their connections. These are explanatory visuals, not arbitrary verified simulations. No generated HTML/JS is executed.

Tool plans use a Pydantic discriminated union with bounds, reference validation, algorithm preconditions and comparison-input checks. Explicit examples should be preserved; generated data is marked illustrative. Exact page evidence is checked against the supplied excerpt. Large pages use a bounded keyword-ranked excerpt (not a vector database); relevant content can be missed, so select a paragraph for precise focus.

## Checks

- `npm run test:render`: server-render integration checks for all tool families and shared comparison.
- `npm test`: algorithms, graph cases, extraction, scheduling and accounting.
- `python -m unittest discover -s tests -p "test_*.py"`: routing schemas, context, evidence and validation; no external API calls.
- `npm run build`: TypeScript checks and production extension build.
- `python -m backend.test_groq`: optional live provider smoke test.

## Limits and remaining scope

Groq rate limits still apply; no automatic retry loop. General scenes and tool selection can be wrong even when the schema is valid. Invalid plans produce an actionable error. Conversation is in memory. Source highlighting and persistent history remain future work.

Agreed future dedicated tools: arrays (two pointers, sliding window, prefix sum), linked lists, stacks/queues, trees/BST, heaps, recursion/backtracking. Unsupported concepts currently route to the general explanatory visual. Hash tables, dynamic programming and a separate greedy topic are excluded.
