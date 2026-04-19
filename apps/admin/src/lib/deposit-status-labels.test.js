import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test('admin deposit status wording uses algorithm works for completed cycles', () => {
  const badgePath = path.join(__dirname, '..', 'components', 'status-badge.tsx');
  const depositsPagePath = path.join(__dirname, '..', 'app', 'deposits', 'page.tsx');
  const detailPagePath = path.join(__dirname, '..', 'app', 'deposits', '[id]', 'page.tsx');

  const badgeSource = fs.readFileSync(badgePath, 'utf8');
  const depositsPageSource = fs.readFileSync(depositsPagePath, 'utf8');
  const detailPageSource = fs.readFileSync(detailPagePath, 'utf8');

  assert.match(badgeSource, /COMPLETED:\s*'Algorithm works'/u);
  assert.match(badgeSource, /getStatusLabel\(status\)/u);
  assert.match(depositsPageSource, /<option value="COMPLETED">Algorithm works<\/option>/u);
  assert.match(detailPageSource, /getStatusLabel\(s\)/u);
});
