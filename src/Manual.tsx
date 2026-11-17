import React,{useCallback,useEffect,useState} from 'react';

import {algorithms,parseValues,trace,type Algorithm,type Step} from './algorithms';
import './style.css';
import {readActivePage,PageAccessError} from './pageContext';
import GraphLab,{type GraphContext} from './GraphLab';
declare const chrome:any;
const API='http://127.0.0.1:8000';
type Chat={role:'user'|'assistant';content:string};
async function request(path:string,body:unknown){const r=await fetch(API+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(55000)});const data=await r.json();if(!r.ok)throw Error(typeof data.detail==='string'?data.detail:'Request failed. Check your inputs.');return data;}
export default function Manual(){
 const [algorithm,setAlgorithm]=useState<Algorithm>('bubble'),[raw,setRaw]=useState('38, 12, 27, 8, 45, 19'),[target,setTarget]=useState('19');
 const [steps,setSteps]=useState<Step[]>(()=>trace('bubble',[38,12,27,8,45,19])),[index,setIndex]=useState(0),[playing,setPlaying]=useState(false),[speed,setSpeed]=useState(650);
 const [error,setError]=useState(''),[question,setQuestion]=useState(''),[chat,setChat]=useState<Chat[]>([]),[busy,setBusy]=useState(false),[page,setPage]=useState({title:'No page attached',text:''});
 const [pageOrigin,setPageOrigin]=useState('');
 const [reading,setReading]=useState(false),[pageError,setPageError]=useState('');
 const [mode,setMode]=useState<'arrays'|'graphs'>('arrays'),[graphContext,setGraphContext]=useState<GraphContext|null>(null);
 const [pauseSignal,setPauseSignal]=useState(0);
 const receiveGraph=useCallback((context:GraphContext)=>setGraphContext(context),[]);
 const current=steps[index],meta=algorithms[algorithm];
 useEffect(()=>{if(!playing)return;const t=setInterval(()=>setIndex(i=>{if(i>=steps.length-1){setPlaying(false);return i;}return i+1;}),speed);return()=>clearInterval(t);},[playing,speed,steps]);
 function load(key:Algorithm,values:number[],needle:number){const next=trace(key,values,needle);setAlgorithm(key);setRaw(values.join(', '));setTarget(String(needle));setSteps(next);setIndex(0);setPlaying(false);setError('');}
 function build(){try{const needle=Number(target);if(!Number.isFinite(needle)||!target.trim())throw Error('Enter a valid target.');load(algorithm,parseValues(raw),needle);}catch(e){setError((e as Error).message);}}
 function choose(key:Algorithm){let values=[38,12,27,8,45,19];if(key==='binary')values=[8,12,19,27,38,45];if(key==='rotated')values=[27,38,45,8,12,19];load(key,values,19);}
 async function attach(){
  if(reading)return;
  setReading(true);setPageError('');setPageOrigin('');
  try{
   const next=await readActivePage(typeof chrome==='undefined'?undefined:chrome);
   setPage(next);
   if(next.text!==page.text)setChat([]);
  }catch(e){
   setPage({title:'No page attached',text:''});
   setPageError((e as Error).message);
   if(e instanceof PageAccessError)setPageOrigin(e.origin);
  }finally{setReading(false);}
 }
 async function allowPage(){
  try{
   const granted=await chrome.permissions.request({origins:[pageOrigin]});
   if(granted)await attach();
   else setPageError('Access was not granted. Click the Askly toolbar icon on your article and try Read page again.');
  }catch{setPageError('Click the Askly toolbar icon on this webpage, then try Read page again.');}
 }
 async function ask(configure=false){if(!question.trim()||busy)return;setPlaying(false);setPauseSignal(s=>s+1);setBusy(true);setError('');const q=question.trim();setQuestion('');try{
  if(configure){const config=await request('/configure',{question:q});if(!Object.hasOwn(algorithms,config.algorithm))throw Error('Unsupported algorithm.');load(config.algorithm,parseValues(config.values.join(',')),config.target);setChat(c=>[...c,{role:'user',content:q},{role:'assistant',content:'Playground configured. Press Play to explore it.'}]);}
  else {const data=await request('/ask',{question:q,algorithm:mode==='graphs'?graphContext?.algorithm:algorithm,step:mode==='graphs'?graphContext?.step:current,page_text:page.text,page_title:page.title,history:chat.slice(-10).map(m=>({...m,content:m.content.slice(0,6000)}))});setChat(c=>[...c,{role:'user',content:q},{role:'assistant',content:data.answer}]);}
 }catch(e){setQuestion(q);setError((e as Error).message+' Make sure the backend is running.');}finally{setBusy(false);}}
 const min=Math.min(0,...current.values),max=Math.max(1,...current.values),range=max-min||1;
 return <main><header><div className="brand"><span className="logo">a</span><div><h1>askly<span> / playground</span></h1><p>Don't just read it. See it happen.</p></div></div><span className="badge">DSA LAB</span></header>
 <section className="page"><div><small>PAGE CONTEXT</small><p>{page.title}</p>{page.text&&<p className="page-status" role="status">Attached {page.text.length.toLocaleString()} characters. Ask a question below.</p>}</div><button disabled={reading} onClick={attach}>{reading?'Reading...':page.text?'Refresh page':'Read page'}</button></section>{pageError&&<div className="error page-error" role="alert">{pageError}{pageOrigin&&<p><button onClick={allowPage}>Allow page access</button></p>}</div>}
 <div className="section-heading"><h2>Make the invisible visible.</h2><p>Pick an algorithm. Take it apart, one step at a time.</p></div>
 <div className="mode-tabs"><button className={mode==='arrays'?'selected':''} onClick={()=>{setMode('arrays');setPlaying(false);}}>Arrays & searching</button><button className={mode==='graphs'?'selected':''} onClick={()=>{setMode('graphs');setPlaying(false);}}>Graphs</button></div>
 {mode==='graphs'?<GraphLab onContext={receiveGraph} pauseSignal={pauseSignal}/>:<section className="card"><div className="row"><label className="grow">ALGORITHM<select value={algorithm} disabled={busy} onChange={e=>choose(e.target.value as Algorithm)}>{['Sorting','Searching'].map(group=><optgroup key={group} label={group}>{Object.entries(algorithms).filter(([,a])=>a.group===group).map(([key,a])=><option key={key} value={key}>{a.name}</option>)}</optgroup>)}</select></label><span className="tag">{meta.group}</span></div>
 <div className="row inputs"><label className="grow">YOUR ARRAY<input value={raw} onChange={e=>setRaw(e.target.value)} placeholder="38, 12, 27, 8"/></label>{meta.group==='Searching'&&<label className="target">TARGET<input value={target} onChange={e=>setTarget(e.target.value)}/></label>}<button className="apply" disabled={busy} onClick={build}>Apply</button></div>
 <div className="metrics"><span>Time <b>{meta.time}</b></span><span>Space <b>{meta.space}</b></span></div>
 <div className="canvas"><div className="canvas-label">{meta.name}<span>{index+1} / {steps.length}</span></div><svg viewBox={`0 0 ${Math.max(360,current.values.length*34)} 210`} role="img" aria-label={`${meta.name}: ${current.message}`}>
 {current.values.map((value,i)=>{const w=Math.max(360,current.values.length*34)/current.values.length;const zero=160-(0-min)/range*125,y=160-(value-min)/range*125;return <g key={i}><rect x={i*w+5} y={Math.min(y,zero)} width={Math.max(4,w-10)} height={Math.max(4,Math.abs(zero-y))} rx="5" className={current.found===i?'found':current.active.includes(i)?'active':current.sorted.includes(i)?'sorted':'bar'}/><text x={i*w+w/2} y={value>=0?y-9: y+16} textAnchor="middle">{value}</text><text className="index" x={i*w+w/2} y="192" textAnchor="middle">{i}</text></g>;})}</svg><div className="legend"><span> Active</span><span> Sorted / found</span><span>Index below each value</span></div></div>
 <div className="controls"><button aria-label="Reset" onClick={()=>{setPlaying(false);setIndex(0);}}>Reset</button><button aria-label="Previous step" disabled={index===0} onClick={()=>{setPlaying(false);setIndex(i=>i-1);}}>Prev</button><button className="primary" onClick={()=>{if(index===steps.length-1)setIndex(0);setPlaying(p=>!p);}}>{playing?'Pause':' Play'}</button><button aria-label="Next step" disabled={index===steps.length-1} onClick={()=>{setPlaying(false);setIndex(i=>i+1);}}>Next</button><label className="speed">Speed<input aria-label="Playback speed" type="range" min="100" max="1500" step="100" value={1600-speed} onChange={e=>setSpeed(1600-Number(e.target.value))}/></label></div>
 <input aria-label="Timeline" className="timeline" type="range" min="0" max={steps.length-1} value={index} onChange={e=>{setPlaying(false);setIndex(Number(e.target.value));}}/>
 <div className="explanation" aria-live="polite"><small>WHAT'S HAPPENING</small><p>{current.message}</p><div className="variables">{Object.entries(current.vars).map(([k,v])=><code key={k}>{k} = {v}</code>)}</div></div>
 <details open><summary>Pseudocode</summary><ol className="code">{meta.code.map((line,i)=><li className={i===current.line?'highlight':''} key={i}>{line}</li>)}</ol></details></section>}
 <section className="card tutor"><div className="row"><h2>Ask about this moment</h2><span className="tag">GROQ</span></div><p className="muted">Your tutor sees the exact step you're looking at. Page text is sent only when you ask.</p><div className="chat" aria-live="polite">{chat.length===0?<p className="empty">“Why did these values swap?”<br/>“Show binary search for 27 in [3, 9, 18, 27, 42]”</p>:chat.map((m,i)=><div key={i} className={'message '+m.role}><small>{m.role==='user'?'YOU':'ASKLY'}</small><p>{m.content}</p></div>)}</div><textarea aria-label="Ask Askly" value={question} onChange={e=>setQuestion(e.target.value)} placeholder="Ask why, or describe what to visualize…" maxLength={2000}/><div className="row"><button disabled={busy||!question.trim()||mode==='graphs'} title={mode==='graphs'?'Edit graphs using the graph editor above':'Configure an array visualizer'} onClick={()=>ask(true)}>Build visual </button><button className="primary" disabled={busy||!question.trim()} onClick={()=>ask()}>{busy?'Thinking…':'Ask Askly'}</button></div></section>
 {error&&<div className="error" role="alert">{error}</div>}<footer>Sorting, searching + graphs - first working slice<br/>Trees, arrays and more come next.</footer></main>;
}
