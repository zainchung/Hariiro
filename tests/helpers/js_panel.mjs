// Shared helpers for tests that run skin scripts in a node:vm context.
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const read = p => readFileSync(resolve(root, p), 'utf8');

// Statements only (at the start of a line or after ';'): "Needs include('x.js') first" in a
// comment is not one.
const INCLUDE_RE = /(?<=^|;)[ \t]*include\(\s*['"]([^'"]+)['"]\s*\);?/gm;

// JS Panel's include('x.js') loads js/x.js into the same script context before
// the rest of the file. Patch vm.runInContext so every include in a script is
// resolved that way, recursively, without listing the files per test.
export function installIncludeShim(vm) {
  const run = vm.runInContext.bind(vm);
  vm.runInContext = (source, context, options) => {
    if (typeof source === 'string' && source.includes('include(')) {
      source = source.replace(INCLUDE_RE, (_, file) => {
        vm.runInContext(read('js/' + file), context);
        return '';
      });
    }
    return run(source, context, options);
  };
  return run;
}
