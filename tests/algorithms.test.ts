import assert from 'node:assert/strict';
import test from 'node:test';
import {trace,parseValues} from '../src/algorithms.ts';
for(const algorithm of ['bubble','selection','insertion','merge','quick'] as const){
 test(`${algorithm}: sorted output and immutable snapshots`,()=>{
  for(const input of [[5,-2,5,0,9],[1],[9,8,7,6],[1,2,3],[-4,-7,-1]]){
   const original=[...input],steps=trace(algorithm,input);
   assert.deepEqual(steps.at(-1)!.values,[...input].sort((a,b)=>a-b));
   assert.deepEqual(input,original);assert.deepEqual(steps[0].values,original);
  }
 });
}
test('binary and linear find present and absent targets',()=>{
 for(const key of ['binary','linear'] as const)for(const target of [-3,0,4,11,99]){
  const input=[-3,0,4,11];assert.equal(trace(key,input,target).at(-1)!.found,input.indexOf(target));
 }
});
test('rotated search covers every pivot, target, and missing values',()=>{
 const sorted=[-5,-1,3,9,14,20];
 for(let pivot=0;pivot<sorted.length;pivot++){
  const input=[...sorted.slice(pivot),...sorted.slice(0,pivot)];
  for(const target of [...sorted,99])assert.equal(trace('rotated',input,target).at(-1)!.found,input.indexOf(target));
 }
});
test('reject invalid inputs',()=>{
 for(const raw of ['', '1,x','1,Infinity','1,2.5',Array(33).fill(1).join(',')])assert.throws(()=>parseValues(raw));
 assert.throws(()=>trace('binary',[2,1]));assert.throws(()=>trace('rotated',[2,2,1]));assert.throws(()=>trace('rotated',[3,1,4,2]));
});
