const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('miniapp uses a shared monitor bot illustration component with screen-specific variants', () => {
  const componentPath = path.join(__dirname, 'monitor-bot-illustration.tsx');
  const homePath = path.join(__dirname, '..', 'app', 'page.tsx');
  const tradersPath = path.join(__dirname, '..', 'app', 'traders', 'page.tsx');
  const traderProfilePath = path.join(__dirname, '..', 'app', 'traders', '[slug]', 'page.tsx');

  assert.equal(fs.existsSync(componentPath), true);

  const componentSource = fs.readFileSync(componentPath, 'utf8');
  const homeSource = fs.readFileSync(homePath, 'utf8');
  const tradersSource = fs.readFileSync(tradersPath, 'utf8');
  const traderProfileSource = fs.readFileSync(traderProfilePath, 'utf8');

  assert.match(componentSource, /home:/u);
  assert.match(componentSource, /tradersHero:/u);
  assert.match(componentSource, /traderProfileHero:/u);
  assert.match(componentSource, /deplexapp-monitor-bot\.jpg/u);
  assert.match(componentSource, /mask-image:/u);
  assert.doesNotMatch(componentSource, /bg-\[linear-gradient/u);
  assert.doesNotMatch(componentSource, /frameClassName:\s*'[^']*bg-\[/u);

  assert.match(homeSource, /MonitorBotIllustration/u);
  assert.match(homeSource, /variant="home"/u);

  assert.match(tradersSource, /MonitorBotIllustration/u);
  assert.match(tradersSource, /variant="tradersHero"/u);

  assert.match(traderProfileSource, /MonitorBotIllustration/u);
  assert.match(traderProfileSource, /variant="traderProfileHero"/u);
});

test('miniapp production docker image includes public assets for the monitor bot image', () => {
  const dockerfilePath = path.join(
    __dirname,
    '..',
    '..',
    '..',
    '..',
    'infrastructure',
    'docker',
    'miniapp',
    'Dockerfile',
  );
  const source = fs.readFileSync(dockerfilePath, 'utf8');

  assert.match(source, /COPY --from=builder \/app\/public \.\/public/u);
});
