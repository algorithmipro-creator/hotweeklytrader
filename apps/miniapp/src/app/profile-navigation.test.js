const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const appDir = __dirname;

test('home page routes personal workspace through profile', () => {
  const source = fs.readFileSync(path.join(appDir, 'page.tsx'), 'utf8');

  assert.match(source, /href="\/profile"/u);
  assert.doesNotMatch(source, /href="\/addresses"/u);
});

test('legacy addresses entry redirects into profile addresses', () => {
  const source = fs.readFileSync(path.join(appDir, 'addresses', 'page.tsx'), 'utf8');

  assert.match(source, /redirect\('\/profile\/addresses'\)/u);
});

test('profile workspace routes exist', () => {
  const requiredFiles = [
    path.join(appDir, 'profile', 'page.tsx'),
    path.join(appDir, 'profile', 'addresses', 'page.tsx'),
    path.join(appDir, 'profile', 'team', 'page.tsx'),
    path.join(appDir, 'profile', 'referrals', 'page.tsx'),
  ];

  requiredFiles.forEach((filePath) => {
    assert.equal(fs.existsSync(filePath), true, `${filePath} should exist`);
  });
});
