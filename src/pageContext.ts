export type PageContext={title:string;text:string;url:string;selection:boolean};
export class PageAccessError extends Error{
 origin:string;
 constructor(origin:string){super('Allow access to this website, then Askly can read the page. You can also reopen Askly using its toolbar icon.');this.origin=origin;}
}
// Self-contained: Chrome serializes this function into the active webpage.
export function extractPage():PageContext{
 const selected=window.getSelection()?.toString().trim()??'';
 const article=document.querySelector<HTMLElement>('article')?.innerText.trim();
 const main=document.querySelector<HTMLElement>('main')?.innerText.trim();
 const text=(selected||article||main||document.body?.innerText||'').trim().slice(0,24000);
 return {title:document.title.slice(0,500)||location.hostname,text,url:location.href,selection:!!selected};
}
export async function readActivePage(api:any):Promise<PageContext>{
 if(!api?.scripting||!api?.tabs)throw Error('Open Askly from the Chrome extension icon, not the localhost preview.');
 const [tab]=await api.tabs.query({active:true,currentWindow:true});
 if(!tab?.id)throw Error('No active webpage found. Open an article and click the Askly toolbar icon.');
 if(tab.url&&!/^https?:\/\//i.test(tab.url))throw Error('Chrome internal pages, new tabs, local PDFs and extension pages cannot be read. Open a normal https:// article.');
 if(tab.url&&/^https:\/\/(chromewebstore\.google\.com|chrome\.google\.com\/webstore)/i.test(tab.url))throw Error('Chrome blocks page reading on the Web Store. Try an ordinary article.');
 const inject=()=>api.scripting.executeScript({target:{tabId:tab.id},func:extractPage});
 let results;
 try{results=await inject();}
 catch(error){
  // activeTab can expire when the user navigates while the side panel stays open.
  if(!tab.url||!api.permissions?.request)throw Error('Page access expired. Click the Askly toolbar icon on this tab, then Read page again.');
  // Request on a separate direct button click, preserving Chrome's user gesture.
  throw new PageAccessError(new URL(tab.url).origin+'/*');
 }
 const page=results?.[0]?.result;
 if(!page||typeof page.text!=='string'||!page.text.trim())throw Error('No readable text found. Wait for the article to load, or select a paragraph and try again.');
 return page;
}
