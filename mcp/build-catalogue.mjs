// mcp/build-catalogue.mjs — regenerate mcp/catalogue.json from index.html.
//
// The app owns the exercise list (EXERCISE_ROWS + MUSCLES/EQUIPMENT/
// EXERCISE_TYPES). This script extracts exactly those declarations, runs them
// in a node:vm sandbox, expands the rows with the app's own expandExerciseRow,
// and writes a stable JSON file (2-space indent, sorted by id number, no
// timestamps) so the MCP server and the freshness test read the same bytes.
//
// Run: node mcp/build-catalogue.mjs

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import vm from 'node:vm';

const here = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(here, '..');
export const INDEX_HTML_PATH = path.join(REPO_ROOT, 'index.html');
export const CATALOGUE_PATH = path.join(here, 'catalogue.json');

function oneLineArray(source, name) {
  const re = new RegExp('const ' + name + ' = (\\[[^\\]]*\\]);');
  const m = re.exec(source);
  if (!m) throw new Error('build-catalogue: could not find const ' + name);
  return m[1];
}

function exerciseBlock(source) {
  const start = source.indexOf('const EXERCISE_ROWS =');
  const end = source.indexOf('const DEFAULT_EXERCISES', start);
  if (start < 0 || end < 0) throw new Error('build-catalogue: could not find EXERCISE_ROWS / expandExerciseRow');
  return source.slice(start, end);
}

function idNumber(id) {
  const m = /^ex(\d+)$/.exec(String(id));
  return m ? parseInt(m[1], 10) : Number.MAX_SAFE_INTEGER;
}

/* Reads index.html and returns the catalogue object (never writes). */
export function buildCatalogue(htmlPath = INDEX_HTML_PATH) {
  const html = readFileSync(htmlPath, 'utf8');
  const scriptMatch = /<script>([\s\S]*?)<\/script>/.exec(html);
  if (!scriptMatch) throw new Error('build-catalogue: no <script> block in index.html');
  const source = scriptMatch[1];

  const code = [
    'const MUSCLES = ' + oneLineArray(source, 'MUSCLES') + ';',
    'const EQUIPMENT = ' + oneLineArray(source, 'EQUIPMENT') + ';',
    'const EXERCISE_TYPES = ' + oneLineArray(source, 'EXERCISE_TYPES') + ';',
    exerciseBlock(source),
    'result = {',
    '  MUSCLES: MUSCLES,',
    '  EQUIPMENT: EQUIPMENT,',
    '  EXERCISE_TYPES: EXERCISE_TYPES,',
    '  exercises: EXERCISE_ROWS.map(expandExerciseRow)',
    '};'
  ].join('\n');

  const sandbox = { result: null };
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox, { filename: 'index.html<catalogue>' });
  const result = sandbox.result;

  const exercises = Array.from(result.exercises).map(function (ex) {
    return {
      id: ex.id,
      name: ex.name,
      equipment: ex.equipment,
      muscle: ex.muscle,
      primary: ex.primary,
      secondary: Array.from(ex.secondary || []),
      type: ex.type
    };
  }).sort(function (a, b) {
    const d = idNumber(a.id) - idNumber(b.id);
    return d !== 0 ? d : String(a.id).localeCompare(String(b.id));
  });

  return {
    version: 1,
    muscles: Array.from(result.MUSCLES),
    equipment: Array.from(result.EQUIPMENT),
    types: Array.from(result.EXERCISE_TYPES),
    exercises: exercises
  };
}

/* Same object -> the exact committed file text. No timestamp, no platform
   paths: the freshness test can deep-equal the parsed committed file and the
   bytes can be reviewed in a diff. */
export function catalogueJson(catalogue) {
  return JSON.stringify(catalogue, null, 2) + '\n';
}

export function writeCatalogue(htmlPath = INDEX_HTML_PATH, outPath = CATALOGUE_PATH) {
  const catalogue = buildCatalogue(htmlPath);
  writeFileSync(outPath, catalogueJson(catalogue), 'utf8');
  return catalogue;
}

const invokedDirectly = process.argv[1] &&
  pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (invokedDirectly) {
  const catalogue = writeCatalogue();
  process.stdout.write('Wrote ' + CATALOGUE_PATH + ' (' + catalogue.exercises.length + ' exercises)\n');
}
