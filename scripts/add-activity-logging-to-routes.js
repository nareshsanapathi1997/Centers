// This script helps identify routes that need activity logging
// Run: node scripts/add-activity-logging-to-routes.js

const fs = require('fs');
const path = require('path');

const routesDir = path.join(__dirname, '..', 'app', 'api', 'admin');

function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const hasLogActivity = content.includes('logActivity');
  const hasPOST = content.includes('export async function POST');
  const hasPATCH = content.includes('export async function PATCH');
  const hasDELETE = content.includes('export async function DELETE');
  
  if ((hasPOST || hasPATCH || hasDELETE) && !hasLogActivity) {
    console.log(`Missing activity logging: ${filePath}`);
  }
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      walkDir(filePath);
    } else if (file === 'route.ts') {
      checkFile(filePath);
    }
  }
}

console.log('Checking routes for missing activity logging...\n');
walkDir(routesDir);
console.log('\nDone!');
