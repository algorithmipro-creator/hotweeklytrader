import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test('admin api client exposes canonical trader reporting payload loader', () => {
  const filePath = path.join(__dirname, 'api.ts');
  const source = fs.readFileSync(filePath, 'utf8');

  assert.ok(source.includes('export async function getCanonicalPeriodTraderReporting(periodId: string)'));
  assert.ok(source.includes("api.get(`/admin/periods/${periodId}/trader-reporting`)"));
});
