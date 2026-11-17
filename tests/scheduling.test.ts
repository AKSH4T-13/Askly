import assert from 'node:assert/strict';
import test from 'node:test';
import {schedule,schedulingNames,type Process} from '../src/scheduling.ts';
const processes:Process[]=[{id:'P1',arrival:0,burst:5,priority:2},{id:'P2',arrival:1,burst:2,priority:1},{id:'P3',arrival:2,burst:1,priority:0}];
test('FCFS completion and accounting',()=>{
 const r=schedule(processes,'fcfs');assert.deepEqual(r.metrics.map(m=>m.completion),[5,7,8]);assert.deepEqual(r.metrics.map(m=>m.waiting),[0,4,5]);assert.equal(r.steps[0].segments.length,0);
});
test('SJF is non-preemptive; SRTF preempts on a shorter arrival',()=>{
 assert.deepEqual(schedule(processes,'sjf').metrics.map(m=>m.completion),[5,8,6]);
 assert.deepEqual(schedule(processes,'srtf').metrics.map(m=>m.completion),[8,3,4]);
});
test('priority modes respect preemption and lower-number priority',()=>{
 assert.deepEqual(schedule(processes,'priority').metrics.map(m=>m.completion),[5,8,6]);
 assert.deepEqual(schedule(processes,'priority_preemptive').metrics.map(m=>m.completion),[8,4,3]);
});
test('Round Robin admits boundary arrivals before requeuing the expired process',()=>{
 const p=[{id:'A',arrival:0,burst:4,priority:0},{id:'B',arrival:2,burst:1,priority:0}];
 const r=schedule(p,'rr',2);assert.deepEqual(r.metrics.map(m=>m.completion),[5,3]);assert.deepEqual(r.steps.at(-1)!.segments.map(s=>s.id),['A','B','A']);
});
test('all schedulers preserve CPU time, arrivals, nonnegative metrics and snapshots',()=>{
 for(const kind of Object.keys(schedulingNames) as (keyof typeof schedulingNames)[]){
  const input=[...processes,{id:'LATE',arrival:20,burst:2,priority:0}],r=schedule(input,kind,2),last=r.steps.at(-1)!;
  assert.equal(last.time,22);assert.equal(last.segments.filter(s=>s.id!=='IDLE').reduce((sum,s)=>sum+s.end-s.start,0),10);
  for(const m of r.metrics){assert.ok(m.waiting>=0);assert.ok(m.response>=0);const p=input.find(p=>p.id===m.id)!;assert.equal(m.turnaround,m.waiting+p.burst);}
  assert.equal(r.steps[0].remaining.P1,5);assert.equal(last.remaining.P1,0);
 }
});
test('reject duplicate process IDs, invalid arrivals, bursts and quantum',()=>{
 assert.throws(()=>schedule([...processes,processes[0]],'fcfs'));assert.throws(()=>schedule([{...processes[0],burst:0}],'fcfs'));assert.throws(()=>schedule(processes,'rr',0));assert.throws(()=>schedule([{...processes[0],arrival:-1}],'sjf'));
});
