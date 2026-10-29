/**
 * Minimal require hook so Node scripts can load the app's TypeScript modules
 * (e.g. lib/db.ts) without a build step. Resolves the `@/` path alias to the
 * project root. Type-only; no type checking happens here.
 */
const fs = require('fs');
const path = require('path');
const Module = require('module');
const ts = require('typescript');

const ROOT = path.join(__dirname, '..', '..');

const originalResolve = Module._resolveFilename;
Module._resolveFilename = function resolve(request, parent, ...rest) {
  if (request.startsWith('@/')) request = path.join(ROOT, request.slice(2));
  return originalResolve.call(this, request, parent, ...rest);
};

require.extensions['.ts'] = function compile(module, filename) {
  const source = fs.readFileSync(filename, 'utf8');
  const { outputText } = ts.transpileModule(source, {
    fileName: filename,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
      resolveJsonModule: true,
    },
  });
  module._compile(outputText, filename);
};
