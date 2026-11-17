import assert from 'node:assert/strict';
import test from 'node:test';
import {parseGraph,graphTrace,exampleEdges} from '../src/graphs.ts';
test('Dijkstra finds shortest weighted route and keeps snapshots immutable',()=>{
 const g=parseGraph('A B C D E F',exampleEdges,false),steps=graphTrace(g,'dijkstra','A','F'),last=steps.at(-1)!;
 assert.equal(last.distances.F,13);assert.deepEqual(last.path,['A','C','B','D','E','F']);assert.equal(steps[0].distances.F,null);assert.deepEqual(steps[0].visited,[]);
});
test('BFS ignores weights and uses minimum number of edges',()=>{
 const g=parseGraph('A B C D','A B 99\nB D 99\nA C 1\nC B 1',false),last=graphTrace(g,'bfs','A','D').at(-1)!;
 assert.equal(last.distances.D,2);assert.deepEqual(last.path,['A','B','D']);
});
test('DFS visits each reachable node once and reports a valid tree path',()=>{
 const g=parseGraph('A B C D','A B\nA C\nB C\nC D',false),last=graphTrace(g,'dfs','A','D').at(-1)!;
 assert.equal(new Set(last.visited).size,4);assert.equal(last.visited.length,4);assert.deepEqual(last.path,['A','B','C','D']);
});
test('directed edges, disconnected nodes, zero-weight edges, source=target',()=>{
 const g=parseGraph('A B C','A B 0',true);
 assert.equal(graphTrace(g,'dijkstra','A','B').at(-1)!.distances.B,0);
 for(const key of ['bfs','dfs','dijkstra'] as const){assert.deepEqual(graphTrace(g,key,'B','A').at(-1)!.path,[]);assert.deepEqual(graphTrace(g,key,'A','A').at(-1)!.path,['A']);assert.deepEqual(graphTrace(g,key,'A','C').at(-1)!.path,[]);}
});
test('reject malformed graphs',()=>{
 for(const [nodes,edges] of [['A A',''],['A B','A C 1'],['A B','A B -1'],['A B','A B 2\nB A 3'],['A B','A A 1']])assert.throws(()=>parseGraph(nodes,edges,false));
});
test('topological order respects every directed edge across disconnected components',()=>{
 const graph=parseGraph('A B C D E F','A C\nB C\nC D\nE F',true),steps=graphTrace(graph,'topological','',''),last=steps.at(-1)!;
 assert.equal(last.cycle,false);assert.equal(last.visited.length,6);
 for(const edge of graph.edges)assert.ok(last.visited.indexOf(edge.from)<last.visited.indexOf(edge.to));
 assert.equal(steps[0].distances.C,2);assert.equal(last.distances.C,0);
});
test('topological sort detects a cycle without claiming blocked dependents are all cycle members',()=>{
 const graph=parseGraph('A B C D','A B\nB A\nB C',true),last=graphTrace(graph,'topological','','').at(-1)!;
 assert.equal(last.cycle,true);assert.deepEqual(last.visited,['D']);assert.match(last.message,/blocked/);
 assert.throws(()=>graphTrace({...graph,directed:false},'topological','',''));
});
test('Kruskal builds the minimum spanning tree and rejects cycle-forming edges',()=>{
 const graph=parseGraph('A B C D','A B 1\nB C 2\nA C 3\nC D 4\nB D 10',false),steps=graphTrace(graph,'kruskal','',''),last=steps.at(-1)!;
 assert.equal(last.totalWeight,7);assert.equal(last.accepted!.length,3);assert.equal(new Set(Object.values(last.components!)).size,1);assert.ok(steps.some(s=>s.rejected));
 assert.equal(steps[0].accepted!.length,0);assert.equal(steps[0].parents.D,'D');
});
test('Kruskal handles isolated vertices, equal weights, zero weights and graph mode validation',()=>{
 const graph=parseGraph('A B C D E','A B 0\nB C 1\nA C 1',false),last=graphTrace(graph,'kruskal','','').at(-1)!;
 assert.equal(last.totalWeight,1);assert.equal(new Set(Object.values(last.components!)).size,3);assert.match(last.message,/forest/);
 assert.throws(()=>graphTrace({...graph,directed:true},'kruskal','',''));
 const isolated=graphTrace(parseGraph('A','',false),'kruskal','','').at(-1)!;assert.equal(isolated.totalWeight,0);assert.equal(isolated.components!.A,'A');
});
