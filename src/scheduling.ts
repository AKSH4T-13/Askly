export type SchedulingAlgorithm='fcfs'|'sjf'|'srtf'|'priority'|'priority_preemptive'|'rr';
export type Process={id:string;arrival:number;burst:number;priority:number};
export type ScheduleStep={time:number;running:string|null;ready:string[];remaining:Record<string,number>;segments:{id:string;start:number;end:number}[];message:string};
export const schedulingNames:Record<SchedulingAlgorithm,string>={fcfs:'First Come First Served',sjf:'Shortest Job First',srtf:'Shortest Remaining Time First',priority:'Priority (non-preemptive)',priority_preemptive:'Priority (preemptive)',rr:'Round Robin'};
export function schedule(processes:Process[],algorithm:SchedulingAlgorithm,quantum=2){
 if(!Object.hasOwn(schedulingNames,algorithm))throw Error('Unsupported scheduler.');
 if(processes.length<1||processes.length>10||new Set(processes.map(p=>p.id)).size!==processes.length||processes.some(p=>! /^[A-Za-z0-9]{1,8}$/.test(p.id)||!Number.isInteger(p.arrival)||p.arrival<0||p.arrival>100||!Number.isInteger(p.burst)||p.burst<1||p.burst>50||!Number.isInteger(p.priority)||p.priority<0||p.priority>99))throw Error('Use 1-10 unique process IDs; integer arrivals 0-100, bursts 1-50, priorities 0-99.');
 if(!Number.isInteger(quantum)||quantum<1||quantum>50)throw Error('Quantum must be an integer from 1 to 50.');
 const remaining=Object.fromEntries(processes.map(p=>[p.id,p.burst])),first:Record<string,number>=Object.create(null),finish:Record<string,number>=Object.create(null),segments:ScheduleStep['segments']=[],steps:ScheduleStep[]=[],queue:string[]=[];
 const order=[...processes].sort((a,b)=>a.arrival-b.arrival||processes.indexOf(a)-processes.indexOf(b));
 let time=0,current:Process|undefined,slice=0,arrived=0;
 const admit=()=>{while(arrived<order.length&&order[arrived].arrival<=time)queue.push(order[arrived++].id);};
 const snapshot=(message:string,running:string|null)=>steps.push({time,running,ready:algorithm==='rr'?[...queue]:processes.filter(p=>p.arrival<=time&&remaining[p.id]>0&&p.id!==running).map(p=>p.id),remaining:{...remaining},segments:segments.map(s=>({...s})),message});
 snapshot('Ready. Smaller priority numbers mean higher priority. Context-switch overhead is zero.',null);
 const horizon=Math.max(...processes.map(p=>p.arrival))+processes.reduce((sum,p)=>sum+p.burst,0);
 while(Object.keys(finish).length<processes.length){
  if(time>horizon)throw Error('Scheduler exceeded its execution bound. Check the process configuration.');
  admit();
  if(algorithm==='rr'){
   if(current&&(remaining[current.id]===0||slice===quantum)){if(remaining[current.id]>0)queue.push(current.id);current=undefined;slice=0;}
   if(!current&&queue.length){const nextId=queue.shift();current=processes.find(p=>p.id===nextId);}
  }else{
   const eligible=order.filter(p=>p.arrival<=time&&remaining[p.id]>0);
   if(!current||remaining[current.id]===0||algorithm==='srtf'||algorithm==='priority_preemptive'){
    const rank=(p:Process)=>algorithm==='sjf'?p.burst:algorithm==='srtf'?remaining[p.id]:algorithm.startsWith('priority')?p.priority:p.arrival;
    current=eligible.sort((a,b)=>rank(a)-rank(b)||a.arrival-b.arrival||processes.indexOf(a)-processes.indexOf(b))[0];
   }
  }
  const id=current?.id??'IDLE';
  if(current&&first[id]===undefined)first[id]=time;
  snapshot(current?`At t=${time}, dispatch ${id}; ${remaining[id]} units remain.`:`At t=${time}, CPU is idle.`,current?.id??null);
  const last=segments.at(-1);if(last?.id===id&&last.end===time)last.end++;else segments.push({id,start:time,end:time+1});
  if(current){remaining[id]--;slice++;}time++;
  if(current&&remaining[id]===0)finish[id]=time;
 }
 snapshot(`All processes completed at t=${time}.`,null);
 const metrics=processes.map(p=>({id:p.id,completion:finish[p.id],turnaround:finish[p.id]-p.arrival,waiting:finish[p.id]-p.arrival-p.burst,response:first[p.id]-p.arrival}));
 return {steps,metrics};
}
