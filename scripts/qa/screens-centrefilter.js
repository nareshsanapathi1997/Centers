const { chromium } = require('@playwright/test');
(async()=>{const fs=require('fs');const d='C:/Users/Naresh/cm-screens-centrefilter';fs.rmSync(d,{recursive:true,force:true});fs.mkdirSync(d,{recursive:true});
const B='http://localhost:2500';const b=await chromium.launch();
async function shot(n,path,vp,dark,fn){const c=await b.newContext({viewport:vp});
if(dark)await c.addInitScript(()=>{localStorage.setItem('duch_theme','dark')});
const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));await p.goto(B+path,{waitUntil:'networkidle'});
if(dark)await p.evaluate(()=>{document.documentElement.classList.add('dark','theme-dark');document.documentElement.setAttribute('data-theme','dark')});
if(fn)await fn(p);await p.waitForTimeout(600);await p.screenshot({path:d+'/'+n+'.png',fullPage:!fn||n.includes('full')});console.log(n,p.url(),errs.length?'JSERR '+errs.join('|'):'');await c.close();}
const D={width:1440,height:900},M={width:390,height:844};
await shot('brand-light-pune','/courses/program/cat-2027-weekend-classroom?centre=pune-deccan',D,false);
await shot('brand-dark-all','/courses/program/cat-2027-weekend-classroom?centre=all',D,true);
await shot('brand-light-click',  '/courses/program/cat-2027-weekend-classroom?centre=all',D,false,async p=>{await p.click('.cf-pill:has-text("Chennai")');await p.locator('#centres').scrollIntoViewIfNeeded();});
await shot('brand-mobile-dropdown','/courses/program/cat-2027-weekend-classroom?centre=all',M,false,async p=>{await p.locator('.cf').scrollIntoViewIfNeeded();await p.click('.cf-combo__btn');await p.fill('.cf-combo__search','pu');});
await shot('category-light-all','/courses/1?centre=all',D,false);
await shot('category-light-pune','/courses/1?centre=pune-deccan',D,false);
await shot('category-dark-pune','/courses/1?centre=pune-deccan',D,true);
await shot('courses-mobile-pune','/courses?centre=pune-deccan',M,false);
await shot('courses-dark-all','/courses?centre=all',D,true);
await b.close();})();
