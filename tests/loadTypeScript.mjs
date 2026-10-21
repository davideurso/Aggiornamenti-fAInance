import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import ts from 'typescript';
const cache = new Map();
// Execute the actual small, dependency-free TypeScript modules in Node without
// launching a bundler or maintaining a second copy of their implementations.
export function loadTypeScript(filename) {
  const file = path.resolve(filename);
  if (cache.has(file)) return cache.get(file).exports;
  const module = { exports: {} };
  cache.set(file,module);
  const fallback = createRequire(file);
  function requireLocal(specifier) {
    if (!specifier.startsWith('.')) return fallback(specifier);
    const base = path.resolve(path.dirname(file),specifier);
    const target = [base,base+'.ts',base+'.tsx',base+'.js'].find(candidate => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
    if (!target) throw new Error('Module not found: '+base);
    return loadTypeScript(target);
  }
  const code = ts.transpileModule(fs.readFileSync(file,'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  new Function('require','module','exports',code)(requireLocal,module,module.exports);
  return module.exports;
}
