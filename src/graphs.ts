export type GraphAlgorithm='bfs'|'dfs'|'dijkstra'|'topological'|'kruskal';
export type Edge={from:string;to:string;weight:number};
export type Graph={nodes:string[];edges:Edge[];directed:boolean};
export type GraphStep={active:string|null;visited:string[];frontier:string[];distances:Record<string,number|null>;parents:Record<string,string>;path:string[];line:number;message:string;accepted?:Edge[];considered?:Edge;rejected?:boolean;totalWeight?:number;components?:Record<string,string>;cycle?:boolean};
export const graphMeta={
 bfs:{name:'Breadth-First Search',time:'O(V + E)',code:['enqueue source; mark discovered','dequeue next node','discover unvisited neighbors; enqueue','repeat until queue is empty']},
 dfs:{name:'Depth-First Search',time:'O(V + E)',code:['push source onto stack','pop next unvisited node','visit node; push neighbors in reverse order','repeat until stack is empty']},
 dijkstra:{name:'Dijkstra Shortest Path',time:'O(V^2 + E)',code:['source distance = 0; others = infinity','select nearest unsettled node','relax outgoing edges','settle node; repeat','reconstruct path using parents']},
 topological:{name:'Topological Sort (Kahn)',time:'O(V + E)',code:['compute indegrees; enqueue zero-indegree nodes','dequeue node; append to order','decrement each outgoing neighbor indegree','enqueue neighbors whose indegree becomes zero','if order size < V: cycle; otherwise return order']},
 kruskal:{name:'Kruskal + DSU',time:'O(E log E + V)',code:['sort edges by weight; initialize disjoint sets','find roots of edge endpoints (path compression)','if roots match: reject cycle-forming edge','otherwise union by rank; accept edge','return minimum spanning tree or forest']}
} as const;
export const exampleEdges='A B 4\nA C 2\nB C 1\nB D 5\nC D 8\nC E 10\nD E 2\nD F 6\nE F 3';
export function parseGraph(nodeText:string,edgeText:string,directed:boolean):Graph{
 const nodes=nodeText.trim().split(/[\s,]+/).filter(Boolean);
 if(nodes.length<1||nodes.length>12||new Set(nodes).size!==nodes.length||nodes.some(n=>! /^[A-Za-z0-9]{1,4}$/.test(n)))throw Error('Use 1-12 unique node labels (1-4 letters or digits).');
 const edges:Edge[]=[];const seen=new Set<string>();
 for(const row of edgeText.split('\n').filter(r=>r.trim())){
  const parts=row.trim().split(/[\s,]+/);const [from,to]=parts;const weight=parts.length===2?1:Number(parts[2]);
  if(parts.length<2||parts.length>3||!nodes.includes(from)||!nodes.includes(to)||from===to||!Number.isFinite(weight)||weight<0||weight>999)throw Error('Each edge: FROM TO WEIGHT (0-999). Nodes must exist; self-edges are unsupported.');
  const id=directed?`${from}:${to}`:[from,to].sort().join(':');if(seen.has(id))throw Error('Remove duplicate edges.');seen.add(id);edges.push({from,to,weight});
 }
 if(edges.length>40)throw Error('Use at most 40 edges.');return {nodes,edges,directed};
}
export function graphTrace(graph:Graph,algorithm:GraphAlgorithm,source:string,target:string):GraphStep[]{
 if(algorithm==='topological')return topologicalTrace(graph);
 if(algorithm==='kruskal')return kruskalTrace(graph);
 if(!graph.nodes.includes(source)||!graph.nodes.includes(target))throw Error('Source and target must be existing nodes.');
 if(graph.edges.some(e=>e.weight<0))throw Error('Negative edge weights are unsupported.');
 const adjacency:Record<string,{node:string;weight:number}[]>=Object.fromEntries(graph.nodes.map(n=>[n,[]]));
 for(const edge of graph.edges){adjacency[edge.from].push({node:edge.to,weight:edge.weight});if(!graph.directed)adjacency[edge.to].push({node:edge.from,weight:edge.weight});}
 for(const entries of Object.values(adjacency))entries.sort((a,b)=>a.node.localeCompare(b.node));
 const neighbors=(node:string)=>adjacency[node];
 const steps:GraphStep[]=[],visited:string[]=[],parents:Record<string,string>={},distances:Record<string,number|null>=Object.fromEntries(graph.nodes.map(n=>[n,null]));
 distances[source]=0;
 const push=(line:number,message:string,active:string|null,frontier:string[],path:string[]=[])=>steps.push({active,visited:[...visited],frontier:[...frontier],distances:{...distances},parents:{...parents},path:[...path],line,message});
 const pathToTarget=()=>{if(distances[target]===null)return [];const path=[target];while(path[0]!==source){const parent=parents[path[0]];if(!parent)return [];path.unshift(parent);}return path;};
 push(0,`Start at ${source}. ${algorithm==='bfs'?'BFS counts edges; weights are ignored.':algorithm==='dfs'?'DFS explores depth first; weights are ignored.':'Distances use non-negative edge weights.'}`,source,[source]);
 if(algorithm==='dijkstra'){
  while(visited.length<graph.nodes.length){const candidates=graph.nodes.filter(n=>!visited.includes(n)&&distances[n]!==null);if(!candidates.length)break;const node=candidates.reduce((best,n)=>distances[n]!<distances[best]!?n:best);push(1,`Nearest unsettled node: ${node}, distance ${distances[node]}.`,node,candidates);
   for(const next of neighbors(node)){if(visited.includes(next.node))continue;const candidate=distances[node]!+next.weight;if(distances[next.node]===null||candidate<distances[next.node]!){distances[next.node]=candidate;parents[next.node]=node;push(2,`Relax ${node} -> ${next.node}: new distance ${candidate}.`,node,candidates);}}
   visited.push(node);push(3,`Settle ${node}; its shortest distance is final.`,node,candidates.filter(n=>n!==node));
  }
 }else if(algorithm==='dfs'){
  const stack:{node:string;parent?:string;depth:number}[]=[{node:source,depth:0}];
  while(stack.length){const entry=stack.pop()!,node=entry.node;if(visited.includes(node))continue;
   if(entry.parent)parents[node]=entry.parent;distances[node]=entry.depth;
   push(1,`Pop ${node}.`,node,stack.map(e=>e.node));visited.push(node);
   for(const next of [...neighbors(node)].reverse()){if(visited.includes(next.node))continue;stack.push({node:next.node,parent:node,depth:entry.depth+1});push(2,`Push ${next.node}; its parent is confirmed when visited.`,node,stack.map(e=>e.node));}
   push(3,`Finished exploring ${node}.`,node,stack.map(e=>e.node));
  }
 }else{
  const frontier=[source],discovered=new Set([source]);
  while(frontier.length){const node=frontier.shift()!;push(1,`Dequeue ${node}.`,node,frontier);visited.push(node);
   for(const next of neighbors(node)){if(discovered.has(next.node))continue;discovered.add(next.node);parents[next.node]=node;distances[next.node]=distances[node]!+1;frontier.push(next.node);push(2,`Discover ${next.node} from ${node}.`,node,frontier);}
   push(3,`Finished exploring ${node}.`,node,frontier);
  }
 }
 const path=pathToTarget();push(algorithm==='dijkstra'?4:3,path.length?`${algorithm==='dfs'?'DFS tree path':'Shortest path'}: ${path.join(' -> ')}. ${algorithm==='dijkstra'?`Total weight: ${distances[target]}.`:algorithm==='bfs'?`Edges: ${distances[target]}.`:'DFS does not guarantee the shortest path.'}`:`${target} is unreachable from ${source}.`,null,[],path);return steps;
}

function topologicalTrace(graph:Graph):GraphStep[]{
 if(!graph.directed)throw Error('Topological sort requires a directed graph. Enable Directed edges.');
 const indegree:Record<string,number>=Object.fromEntries(graph.nodes.map(n=>[n,0]));
 const adjacent:Record<string,string[]>=Object.fromEntries(graph.nodes.map(n=>[n,[]]));
 for(const edge of graph.edges){indegree[edge.to]++;adjacent[edge.from].push(edge.to);}
 for(const list of Object.values(adjacent))list.sort();
 const queue=graph.nodes.filter(n=>indegree[n]===0).sort(),order:string[]=[],steps:GraphStep[]=[];
 const push=(line:number,message:string,active:string|null,cycle=false)=>steps.push({active,visited:[...order],frontier:[...queue],distances:{...indegree},parents:{},path:[],line,message,cycle});
 push(0,'Computed indegrees. Queue starts with all zero-indegree nodes.',null);
 while(queue.length){const node=queue.shift()!;order.push(node);push(1,`Append ${node} to the ordering.`,node);
  for(const next of adjacent[node]){indegree[next]--;push(2,`Remove dependency ${node} -> ${next}; indegree(${next}) = ${indegree[next]}.`,next);if(indegree[next]===0){queue.push(next);push(3,`${next} has no remaining dependencies. Enqueue it.`,next);}}
 }
 const cycle=order.length!==graph.nodes.length;
 push(4,cycle?`Cycle detected: only ${order.length}/${graph.nodes.length} nodes could be ordered. Remaining nodes are blocked; some may depend on a cycle.`:`Valid topological order: ${order.join(' -> ')}.`,null,cycle);return steps;
}

function kruskalTrace(graph:Graph):GraphStep[]{
 if(graph.directed)throw Error('Kruskal requires an undirected graph. Disable Directed edges.');
 const parent:Record<string,string>=Object.fromEntries(graph.nodes.map(n=>[n,n]));
 const rank:Record<string,number>=Object.fromEntries(graph.nodes.map(n=>[n,0]));
 const accepted:Edge[]=[],steps:GraphStep[]=[];let totalWeight=0;
 const root=(node:string):string=>{if(parent[node]!==node)parent[node]=root(parent[node]);return parent[node];};
 const representative=(node:string):string=>{while(parent[node]!==node)node=parent[node];return node;};
 const ordered=[...graph.edges].sort((a,b)=>a.weight-b.weight||a.from.localeCompare(b.from)||a.to.localeCompare(b.to));
 const push=(line:number,message:string,edge?:Edge,rejected=false)=>steps.push({active:edge?.from??null,visited:[...new Set(accepted.flatMap(e=>[e.from,e.to]))],frontier:[],distances:{...rank},parents:{...parent},path:[],line,message,accepted:accepted.map(e=>({...e})),considered:edge?{...edge}:undefined,rejected,totalWeight,components:Object.fromEntries(graph.nodes.map(n=>[n,representative(n)]))});
 push(0,'Each node starts in its own set. Process edges from lowest to highest weight.');
 for(const edge of ordered){const a=root(edge.from),b=root(edge.to);push(1,`Find(${edge.from}) = ${a}; Find(${edge.to}) = ${b}.`,edge);
  if(a===b){push(2,`Reject ${edge.from} - ${edge.to}: both endpoints already share a component.`,edge,true);continue;}
  if(rank[a]<rank[b])parent[a]=b;else{parent[b]=a;if(rank[a]===rank[b])rank[a]++;}
  accepted.push({...edge});totalWeight+=edge.weight;push(3,`Accept ${edge.from} - ${edge.to} (${edge.weight}). Union their sets.`,edge);
 }
 const count=new Set(graph.nodes.map(representative)).size;
 push(4,count===1?`Minimum spanning tree complete. Total weight: ${totalWeight}.`:`Disconnected graph: minimum spanning forest with ${count} components. Total weight: ${totalWeight}.`);return steps;
}
