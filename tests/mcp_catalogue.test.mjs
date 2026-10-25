// tests/mcp_catalogue.test.mjs — the committed MCP catalogue must match the app.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildCatalogue, catalogueJson, CATALOGUE_PATH, INDEX_HTML_PATH } from '../mcp/build-catalogue.mjs';

describe('P4-11 MCP catalogue', () => {
  it('catalogue-json-up-to-date', () => {
    const fresh = buildCatalogue(INDEX_HTML_PATH);
    const committedRaw = readFileSync(CATALOGUE_PATH, 'utf8');
    const committed = JSON.parse(committedRaw);

    assert.deepEqual(committed, fresh, 'mcp/catalogue.json matches index.html (run node mcp/build-catalogue.mjs)');
    // Line endings may be CRLF in a Windows checkout; the content must match.
    assert.equal(committedRaw.replace(/\r\n/g, '\n'), catalogueJson(fresh), 'the file is written in the stable format (no timestamps)');
    assert.equal(fresh.exercises.length, 100, 'every built-in exercise exported');
    assert.deepEqual(Object.keys(fresh.exercises[0]), ['id', 'name', 'equipment', 'muscle', 'primary', 'secondary', 'type']);
    assert.deepEqual(fresh.exercises.map((e) => e.id), fresh.exercises.map((e) => e.id).slice().sort((a, b) =>
      Number(a.slice(2)) - Number(b.slice(2))), 'sorted by id number');
    assert.deepEqual(fresh.exercises[6].secondary, ['Glutes'], 'secondary muscles kept');
    assert.ok(fresh.muscles.includes('Full body') && fresh.equipment.includes('Kettlebell'), 'filters exported');
    assert.ok(fresh.types.includes('duration'), 'exercise types exported');
  });
});
