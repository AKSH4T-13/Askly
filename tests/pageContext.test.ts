import assert from 'node:assert/strict';
import test from 'node:test';
import {readActivePage,extractPage,PageAccessError} from '../src/pageContext.ts';
const page={title:'Binary search',text:'Search a sorted array.',url:'https://example.com/dsa',selection:false};
function api(executeScript:()=>Promise<unknown>,url=page.url){return {tabs:{query:async()=>[{id:7,url}]},scripting:{executeScript}};}
test('returns extracted content from the active tab',async()=>{assert.deepEqual(await readActivePage(api(async()=>[{result:page}])),page);});
test('expired activeTab exposes the current origin for a direct permission button',async()=>{
 let requested=false;
 const mock={...api(async()=>{throw Error('Access denied');}),permissions:{request:async()=>{requested=true;return true;}}};
 await assert.rejects(()=>readActivePage(mock),(error:unknown)=>error instanceof PageAccessError&&error.origin==='https://example.com/*');
 assert.equal(requested,false,'No delayed permission requests outside a direct user gesture');
});
test('retries successfully after the user grants permission',async()=>{
 let granted=false;
 const mock={...api(async()=>{if(!granted)throw Error('Access denied');return [{result:page}];}),permissions:{request:async()=>{granted=true;return true;}}};
 await assert.rejects(()=>readActivePage(mock),PageAccessError);
 await mock.permissions.request();
 assert.deepEqual(await readActivePage(mock),page);
});
test('rejects preview, restricted pages, missing tabs and empty content',async()=>{
 await assert.rejects(()=>readActivePage(undefined),/extension icon/);
 await assert.rejects(()=>readActivePage(api(async()=>[],'chrome://extensions')),/internal pages/);
 await assert.rejects(()=>readActivePage(api(async()=>[],'https://chromewebstore.google.com/detail/test')),/Web Store/);
 await assert.rejects(()=>readActivePage({tabs:{query:async()=>[]},scripting:{}}),/No active webpage/);
 await assert.rejects(()=>readActivePage(api(async()=>[{result:{...page,text:'   '}}])),/No readable text/);
});
test('extraction prioritizes selection, falls back from empty article, and caps page text',()=>{
 const saved=Object.fromEntries(['window','document','location'].map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));
 let selection=' selected paragraph ',article='   ';
 try{
  Object.defineProperty(globalThis,'window',{configurable:true,value:{getSelection:()=>({toString:()=>selection})}});
  Object.defineProperty(globalThis,'location',{configurable:true,value:{href:page.url,hostname:'example.com'}});
  Object.defineProperty(globalThis,'document',{configurable:true,value:{title:page.title,querySelector:(selector:string)=>({innerText:selector==='article'?article:'main article text'}),body:{innerText:'body'}}});
  assert.equal(extractPage().text,'selected paragraph');assert.equal(extractPage().selection,true);
  selection='';assert.equal(extractPage().text,'main article text');
  article='x'.repeat(25000);assert.equal(extractPage().text.length,24000);
 }finally{for(const [key,descriptor] of Object.entries(saved)){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else Reflect.deleteProperty(globalThis,key);}}
});
