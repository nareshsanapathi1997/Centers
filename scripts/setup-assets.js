const fs = require('fs')
const path = require('path')

// Copy assets from v1-yellow to public/assets
const sourceDir = path.join(__dirname, '..', 'v1-yellow', 'assets')
const destDir = path.join(__dirname, '..', 'public', 'assets')

function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src)
  const stats = exists && fs.statSync(src)
  const isDirectory = exists && stats.isDirectory()

  if (isDirectory) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true })
    }
    fs.readdirSync(src).forEach((childItemName) => {
      copyRecursiveSync(
        path.join(src, childItemName),
        path.join(dest, childItemName)
      )
    })
  } else {
    fs.copyFileSync(src, dest)
  }
}

if (fs.existsSync(sourceDir)) {
  console.log('Copying assets from v1-yellow to public/assets...')
  copyRecursiveSync(sourceDir, destDir)
  console.log('Assets copied successfully!')
} else {
  console.log('Source directory not found. Please ensure v1-yellow/assets exists.')
}

// Font Awesome webfonts (required for enrollment icons)
const preloginFontsDir = path.join(__dirname, '..', '..', 'prelogin_frontend', 'public', 'assets', 'fonts')
const fontsDestDir = path.join(destDir, 'fonts')

if (fs.existsSync(preloginFontsDir)) {
  if (!fs.existsSync(fontsDestDir)) {
    fs.mkdirSync(fontsDestDir, { recursive: true })
  }
  let copied = 0
  for (const name of fs.readdirSync(preloginFontsDir)) {
    if (!/^fa-/.test(name)) continue
    const src = path.join(preloginFontsDir, name)
    const dest = path.join(fontsDestDir, name)
    if (!fs.existsSync(dest)) {
      fs.copyFileSync(src, dest)
      copied += 1
    }
  }
  if (copied > 0) {
    console.log(`Copied ${copied} Font Awesome font file(s) from prelogin_frontend.`)
  }
}

