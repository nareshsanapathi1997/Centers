const path=require('path'),fs=require('fs');const {chromium}=require('@playwright/test');
const B='http://localhost:2500',OUT='C:/Users/Naresh/cm-screens-features';fs.mkdirSync(OUT,{recursive:true});
const sets=[{n:'public',pages:[['program','/chennai-central/program/cat-2027-weekend-classroom'],['payment','/chennai-central/payment/cat-2027-weekend-classroom']]},
{n:'admin',login:['/admin/login','chennai-central-admin','Admin@123'],pages:[['admin-enrollment','/admin/1/enrollment']]},
{n:'super',login:['/super-admin/login','superadmin','SuperAdmin@123'],pages:[['super-enrollment','/super-admin/enrollment']]}];
(async()=>{const br=await chromium.launch();for(const mode of ['light','dark']){for(const s of sets){
const ctx=await br.newContext({viewport:{width:1440,height:900},colorScheme:mode});
await ctx.addInitScript(m=>{try{localStorage.setItem('duch_theme',m==='dark'?'theme-dark':'theme-light');localStorage.setItem('theme',m);localStorage.setItem('cm-theme-default',m);document.addEventListener('DOMContentLoaded',()=>{document.documentElement.classList.toggle('dark',m==='dark');document.documentElement.dataset.theme=m})}catch(e){}},mode);
const p=await ctx.newPage();if(s.login){await p.goto(B+s.login[0],{waitUntil:'networkidle'});await p.locator('input:not([type=password]):not([type=hidden]):not([type=checkbox]):visible').first().fill(s.login[1]);await p.locator('input[type=password]:visible').first().fill(s.login[2]);await Promise.all([p.waitForURL(u=>!u.pathname.endsWith('/login'),{timeout:20000}).catch(()=>{}),p.locator('button[type=submit]:visible').first().click()]);}
for(const [n,u] of s.pages){await p.goto(B+u,{waitUntil:'networkidle'}).catch(()=>{});await p.waitForTimeout(1200);const f=`${OUT}/${n}-${mode}.png`;await p.screenshot({path:f,fullPage:n.includes('enrollment')?false:true});console.log(f);}
await ctx.close();}}await br.close();})();
