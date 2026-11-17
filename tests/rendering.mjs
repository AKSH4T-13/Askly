import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {createElement} from 'react';
import {renderToString} from 'react-dom/server';
const server=await createServer({server:{middlewareMode:true},appType:'custom',logLevel:'error'});
try{
 const {default:ToolPlayer}=await server.ssrLoadModule('/src/ToolPlayer.tsx');
 const common={title:'Test visual',reason:'Render integration check',illustrative:true};
 const tools=[
  ...['linear','binary'].map(algorithm=>({...common,tool:'array',algorithm,values:[1,3,7,9],target:7})),
  ...['fcfs','sjf','srtf','priority','priority_preemptive','rr'].map(algorithm=>({...common,tool:'schedule',algorithm,processes:[{id:'P1',arrival:0,burst:4,priority:1},{id:'P2',arrival:1,burst:2,priority:0}],quantum:2})),
  {...common,tool:'general',layout:'cycle',nodes:[{id:'evap',label:'Evaporation'},{id:'rain',label:'Rain'}],links:[{source:'evap',target:'rain',label:'Condensation'}],scenes:[{caption:'Sun heats water.',active:['evap']}]},
  {...common,tool:'graph',algorithm:'dijkstra',nodes:['A','B'],edges:[{source:'A',target:'B',weight:4}],directed:false,source:'A',target:'B'},
 ];
 for(const tool of tools){const html=renderToString(createElement(ToolPlayer,{tool,onState:()=>{},pauseSignal:0}));assert.ok(html.length>300,tool.algorithm??tool.tool);}
 const html=renderToString(createElement('div',{},tools.slice(0,2).map((tool,i)=>createElement(ToolPlayer,{key:i,tool,onState:()=>{},pauseSignal:0,sharedIndex:999}))));
 assert.match(html,/Found at index 2/);assert.match(html,/Comparison step/);
 console.log('11 rendering integration checks passed (arrays, shared comparison, six schedulers, general scene, graph).');
}finally{await server.close();}
