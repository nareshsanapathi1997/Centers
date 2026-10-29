const {chromium}=require('@playwright/test');const O='C:/Users/Naresh/cm-screens-redirect';require('fs').mkdirSync(O,{recursive:true});
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1440,height:900}});
await p.goto('http://localhost:2500/courses/1',{waitUntil:'networkidle'});await p.screenshot({path:O+'/1-main-site-courses-category.png'});
const l=p.locator('a[href*="/program/"]').first();console.log('link',await l.getAttribute('href'));await Promise.all([p.waitForURL(/program/),l.click()]);await p.waitForLoadState('networkidle');console.log('landed',p.url());await p.screenshot({path:O+'/2-landed-on-centre-program.png'});await b.close()})();
