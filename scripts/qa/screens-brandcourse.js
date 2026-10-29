const { chromium } = require('@playwright/test');
(async()=>{const fs=require('fs');const d='C:/Users/Naresh/cm-screens-brandcourse';fs.mkdirSync(d,{recursive:true});
const u='http://localhost:2500/courses/program/cat-2027-weekend-classroom';const b=await chromium.launch();
async function shot(n,vp,dark,cookie){const c=await b.newContext({viewport:vp});
if(cookie)await c.addCookies([{name:'cm_last_centre',value:'pune-deccan',url:'http://localhost:2500'}]);
if(dark)await c.addInitScript(()=>{localStorage.setItem('duch_theme','dark')});
const p=await c.newPage();await p.goto(u,{waitUntil:'networkidle'});
if(dark)await p.evaluate(()=>{document.documentElement.classList.add('dark','theme-dark');document.documentElement.setAttribute('data-theme','dark')});
await p.waitForTimeout(500);await p.screenshot({path:d+'/'+n+'.png',fullPage:true});await c.close();}
await shot('desktop-light',{width:1440,height:900},false,false);
await shot('desktop-dark',{width:1440,height:900},true,false);
await shot('mobile-light',{width:390,height:844},false,false);
await shot('desktop-light-lastcentre',{width:1440,height:900},false,true);
await b.close();})();
