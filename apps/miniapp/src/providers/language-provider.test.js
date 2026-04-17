const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('russian home title uses the updated assistant copy', () => {
  const filePath = path.join(__dirname, 'language-provider.tsx');
  const source = fs.readFileSync(filePath, 'utf8');

  assert.match(source, /Начните торговлю ИИ-ассистентом/u);
});

test('home page hero uses language-specific robot offsets', () => {
  const filePath = path.join(__dirname, '..', 'app', 'page.tsx');
  const source = fs.readFileSync(filePath, 'utf8');

  assert.match(source, /const \{ t, language \} = useLanguage\(\);/u);
  assert.match(source, /language === 'ru' \? 'translate-y-1 -translate-x-4' : 'translate-y-0 -translate-x-3'/u);
});

test('russian home hero narrows the text column and heading size', () => {
  const filePath = path.join(__dirname, '..', 'app', 'page.tsx');
  const source = fs.readFileSync(filePath, 'utf8');

  assert.match(source, /const isRussian = language === 'ru';/u);
  assert.match(source, /const heroTextClassName = isRussian[\s\S]*max-w-\[13\.5rem\][\s\S]*max-w-\[15rem\]/u);
  assert.match(source, /const heroTitleClassName = isRussian[\s\S]*text-\[1\.78rem\][\s\S]*text-3xl/u);
});

test('latest deposit summary translations are present for both languages', () => {
  const filePath = path.join(__dirname, 'language-provider.tsx');
  const source = fs.readFileSync(filePath, 'utf8');

  assert.ok(source.includes("'home.latestDepositStatus': 'Latest cycle status'"));
  assert.ok(source.includes("messageOverrides.ru['home.traders']"));
  assert.ok(source.includes("messageOverrides.ru['traders.kicker']"));
  assert.ok(source.includes("messageOverrides.ru['traders.title']"));
  assert.ok(source.includes("messageOverrides.ru['depositCreate.period']"));
  assert.ok(source.includes("messageOverrides.ru['depositCreate.trader']"));
  assert.ok(source.includes("messageOverrides.ru['depositCreate.selectTrader']"));
  assert.ok(source.includes("messageOverrides.ru['depositCreate.browseTraders']"));
  assert.match(source, /'home\.latestDepositStatus': '[\u0400-\u04FF]/u);
});

test('my team translations are present for both languages', () => {
  const filePath = path.join(__dirname, 'language-provider.tsx');
  const source = fs.readFileSync(filePath, 'utf8');

  assert.ok(source.includes("'home.myTeam': 'My team'"));
  assert.ok(source.includes("'home.myTeamSub': 'View your team workspace'"));
  assert.ok(source.includes("'team.kicker': 'Team Workspace'"));
  assert.ok(source.includes("'team.title': 'My team'"));
  assert.ok(source.includes("'team.emptyTitle': 'Coming soon'"));
  assert.ok(source.includes("'team.previewRegistered': 'Registered'"));
  assert.ok(source.includes("'team.previewActive': 'Active'"));
  assert.ok(source.includes("'team.linkCopied': 'Link copied'"));
  assert.match(source, /'home\.myTeam': '[\u0400-\u04FF]/u);
  assert.match(source, /'home\.myTeamSub': '[\u0400-\u04FF]/u);
  assert.match(source, /'team\.kicker': '[\u0400-\u04FF]/u);
  assert.match(source, /'team\.title': '[\u0400-\u04FF]/u);
  assert.match(source, /'team\.subtitle': '[\u0400-\u04FF]/u);
  assert.match(source, /'team\.emptyTitle': '[\u0400-\u04FF]/u);
  assert.match(source, /'team\.emptyBody': '[\u0400-\u04FF]/u);
  assert.match(source, /'team\.previewTitle': '[\u0400-\u04FF]/u);
  assert.match(source, /'team\.previewNote': '[\u0400-\u04FF]/u);
  assert.match(source, /'team\.previewRegistered': '[\u0400-\u04FF]/u);
  assert.match(source, /'team\.previewActive': '[\u0400-\u04FF]/u);
  assert.match(source, /'team\.linkCopied': '[\u0400-\u04FF]/u);
});

test('home page uses deposit summary helpers and new metric labels', () => {
  const filePath = path.join(__dirname, '..', 'app', 'page.tsx');
  const source = fs.readFileSync(filePath, 'utf8');

  assert.match(source, /pickLatestDeposit/u);
  assert.match(source, /getLocalizedPeriodLabel/u);
  assert.match(source, /StatusBadge/u);
  assert.match(source, /t\('home\.latestDepositStatus'\)/u);
  assert.match(source, /t\('home\.profitLoss'\)/u);
  assert.match(source, /t\('home\.projectedBalance'\)/u);
  assert.match(source, /'0\.00 USDT'/u);
  assert.match(source, /href=\{`\/metrics\/\$\{summaryDeposit\.deposit_id\}`\}/u);
});

test('metrics translations are present for both languages', () => {
  const filePath = path.join(__dirname, 'language-provider.tsx');
  const source = fs.readFileSync(filePath, 'utf8');

  assert.ok(source.includes("'metrics.kicker': 'Cycle Metrics'"));
  assert.ok(source.includes("'metrics.title': 'Current Metrics'"));
  assert.ok(source.includes("'metrics.emptyValue': 'No live data yet'"));
  assert.match(source, /'metrics\.emptyValue': '(?:[\u0400-\u04FF ]+|(?:\\u[0-9A-Fa-f]{4})+(?: (?:\\u[0-9A-Fa-f]{4})+)*)'/u);
  assert.ok(source.includes("'metrics.subtitle': 'Review live or archived indicators for the selected cycle.'"));
  assert.ok(source.includes("'metrics.trader': 'Algorithm'"));
  assert.ok(source.includes("'depositDetail.kicker': 'Cycle Detail'"));
  assert.ok(source.includes("'depositDetail.viewMetrics': 'Current Metrics'"));
  assert.ok(source.includes("'metrics.kicker': 'Метрики цикла'"));
  assert.ok(source.includes("'metrics.subtitle': 'Просматривайте актуальные или архивные показатели выбранного цикла.'"));
  assert.ok(source.includes("'depositDetail.kicker': 'Детали цикла'"));
  assert.ok(source.includes("messageOverrides.ru['metrics.trader']"));
  assert.match(source, /'metrics\.kicker': '[\u0400-\u04FF]/u);
  assert.match(source, /'metrics\.subtitle': '[\u0400-\u04FF]/u);
  assert.match(source, /'depositDetail\.kicker': '[\u0400-\u04FF]/u);
  assert.match(source, /'metrics\.title': '[\u0400-\u04FF]/u);
  assert.match(source, /'depositDetail\.viewMetrics': '[\u0400-\u04FF]/u);
});

test('miniapp language provider uses the approved cycle terminology', () => {
  const filePath = path.join(__dirname, 'language-provider.tsx');
  const source = fs.readFileSync(filePath, 'utf8');

  assert.ok(source.includes("'home.traders': 'Algorithms'"));
  assert.ok(source.includes("'home.newDep': 'Start the cycle'"));
  assert.ok(source.includes("'home.newDepSub': 'Start a new cycle'"));
  assert.ok(source.includes("'home.myDep': 'My cycles'"));
  assert.ok(source.includes("'home.myDepSub': 'View and track your cycles'"));
  assert.ok(source.includes("'traders.subtitle': 'Explore different trading approaches, from aggressive high-risk entries to conservative and mixed strategies. Choose the approach that suits you and start the cycle.'"));
  assert.ok(source.includes("'flux.modeNote': 'This trader page is live first, cycle flow unlocks next.'"));
  assert.ok(source.includes("'flux.ctaTitle': 'New cycle'"));
  assert.ok(source.includes("'depositCreate.kicker': 'New cycle'"));
  assert.ok(source.includes("'depositCreate.title': 'Start your new cycle'"));
  assert.ok(source.includes("'depositCreate.period': 'Cycle Period'"));
  assert.ok(source.includes("'depositCreate.trader': 'Algorithm'"));
  assert.ok(source.includes("'depositCreate.selectTrader': 'Select an algorithm...'"));
  assert.ok(source.includes("'depositCreate.browseTraders': 'Browse algorithms'"));
  assert.ok(source.includes("'depositCreate.submit': 'Create cycle'"));
  assert.ok(source.includes("'depositCreate.failed': 'Failed to create cycle'"));
  assert.ok(source.includes("'deposits.kicker': 'Cycle Registry'"));
  assert.ok(source.includes("'deposits.title': 'My cycles'"));
  assert.ok(source.includes("'deposits.subtitle': 'Track active cycles, review status changes, and open detailed payout/report views.'"));
  assert.ok(source.includes("'deposits.emptyTitle': 'No cycles yet'"));
  assert.ok(source.includes("'deposits.emptySub': 'Create your first cycle to start tracking performance.'"));
  assert.ok(source.includes("'deposits.openNew': 'Start the cycle'"));
  assert.ok(source.includes("'home.latestDepositStatus': 'Latest cycle status'"));
  assert.ok(source.includes("'depositDetail.notFound': 'Cycle not found'"));
  assert.ok(source.includes("'depositDetail.timelineCreated': 'Cycle Created'"));
  assert.ok(source.includes("'addresses.subtitle': 'Manage source wallets used for cycles and payout routing.'"));
  assert.ok(source.includes("'faq.q1': 'How do I start a cycle?'"));
  assert.ok(source.includes("'faq.q6': 'Can I have multiple cycles?'"));
  assert.ok(source.includes("'support.depositIssue': 'Cycle Issue'"));
  assert.ok(source.includes("'depositCreate.kicker': 'Новый цикл'"));
  assert.ok(source.includes("'faq.q1': 'Как запустить цикл?'"));
  assert.ok(source.includes("'support.depositIssue': 'Проблема с циклом'"));
  assert.match(source, /'home\.latestDepositStatus': '[\u0400-\u04FF]/u);
  assert.match(source, /'depositCreate\.kicker': '[\u0400-\u04FF]/u);
  assert.match(source, /'deposits\.emptyTitle': '[\u0400-\u04FF]/u);
  assert.match(source, /'deposits\.emptySub': '[\u0400-\u04FF]/u);
  assert.ok(source.includes("'home.newDep': 'Начать цикл'"));
  assert.ok(source.includes("'home.newDepSub': 'Начать новый цикл'"));
  assert.ok(source.includes("'home.myDep': 'Мои циклы'"));
  assert.ok(source.includes("'home.myDepSub': 'Просматривать и отслеживать свои циклы'"));
  assert.ok(source.includes("'depositCreate.title': 'Начните новый цикл'"));
  assert.ok(source.includes("'deposits.kicker': 'Реестр циклов'"));
  assert.ok(source.includes("'deposits.title': 'Мои циклы'"));
  assert.ok(source.includes("'deposits.subtitle': 'Отслеживайте активные циклы, изменения статуса и открывайте подробные выплаты или отчеты.'"));
  assert.ok(source.includes("'deposits.openNew': 'Начать цикл'"));
});

test('first app entry defaults language provider to russian before any saved preference exists', () => {
  const filePath = path.join(__dirname, 'language-provider.tsx');
  const source = fs.readFileSync(filePath, 'utf8');

  assert.match(source, /const \[language, setLanguageState\] = useState<Language>\('ru'\);/u);
  assert.match(source, /if \(stored === 'en' \|\| stored === 'ru'\) \{\s*setLanguageState\(stored\);/u);
});

test('supported network faq copy no longer lists tron or eth', () => {
  const filePath = path.join(__dirname, 'language-provider.tsx');
  const source = fs.readFileSync(filePath, 'utf8');

  assert.ok(source.includes("'faq.a4': 'Currently supported: BSC, TON, and SOL. Check the app for the latest enabled list.'"));
  assert.ok(source.includes("'faq.a4': 'Сейчас поддерживаются: BSC, TON и SOL. Смотрите актуальный список в приложении.'"));
  assert.equal(source.includes('Currently supported: BSC, TRON, TON, ETH, and SOL.'), false);
  assert.equal(source.includes('Сейчас поддерживаются: BSC, TRON, TON, ETH и SOL.'), false);
});



test('completed cycle copy uses algorithm works wording', () => {
  const filePath = path.join(__dirname, 'language-provider.tsx');
  const source = fs.readFileSync(filePath, 'utf8');

  assert.ok(source.includes("'status.COMPLETED': 'Algorithm works'"));
  assert.ok(source.includes("'depositDetail.timelineCompleted': 'Algorithm works'"));
  assert.ok(source.includes("'status.COMPLETED': '\u0410\u043b\u0433\u043e\u0440\u0438\u0442\u043c \u0440\u0430\u0431\u043e\u0442\u0430\u0435\u0442'"));
  assert.ok(source.includes("'depositDetail.timelineCompleted': '\u0410\u043b\u0433\u043e\u0440\u0438\u0442\u043c \u0440\u0430\u0431\u043e\u0442\u0430\u0435\u0442'"));
});

test('ton memo copy translations describe the permanent user memo flow', () => {
  const filePath = path.join(__dirname, 'language-provider.tsx');
  const source = fs.readFileSync(filePath, 'utf8');

  assert.ok(source.includes("'depositCreate.tonDepositMemoHint': 'Your personal memo is assigned automatically and stays the same for every TON cycle.'"));
  assert.ok(source.includes("'depositCreate.tonDepositMemoNote': 'Copy this memo and include it when sending from a shared exchange address.'"));
  assert.ok(source.includes("'depositCreate.sendingFromExchange': 'Sending from exchange'"));
  assert.ok(source.includes("'depositCreate.exchangeSourceWalletHint': 'When sending from an exchange, specify the receiving address on the next step after the cycle is created.'"));
  assert.ok(source.includes("'depositCreate.exchangeReturningAddress': 'My exchange wallet address'"));
  assert.ok(source.includes("'depositCreate.tonReturnMemo': 'TON Memo'"));
  assert.match(
    source,
    /'depositCreate\.tonReturnMemoHint':\s*'Memo for crediting funds back to your exchange wallet address, if the exchange you used requires it\.'/u,
  );
  assert.ok(source.includes("'depositCreate.copyMemoFailed': 'Failed to copy TON memo.'"));
  assert.ok(source.includes("'depositCreate.tonDepositMemoHint': 'Ваш персональный memo назначается автоматически и остаётся одинаковым для всех TON циклов.'"));
  assert.ok(source.includes("'depositCreate.tonDepositMemoNote': 'Скопируйте этот memo и укажите его при отправке с общего биржевого адреса.'"));
  assert.ok(source.includes("'depositCreate.copyMemoFailed': 'Не удалось скопировать TON memo.'"));
});

test('settlement preference translations cover cycle rollover and payout threshold guidance', () => {
  const filePath = path.join(__dirname, 'language-provider.tsx');
  const source = fs.readFileSync(filePath, 'utf8');

  assert.ok(source.includes("'depositCreate.settlementPreference': 'Settlement preference'"));
  assert.ok(source.includes("'depositCreate.settlementThresholdHint': 'Payouts below $5 stay held until the minimum payout threshold is reached.'"));
  assert.ok(source.includes("'depositCreate.settlementRolloverHint': 'Reinvestment opens the next eligible cycle with the same trader when a new period is available.'"));
  assert.ok(source.includes("'depositDetail.rolloverCreated': 'A new cycle was started automatically with the same trader.'"));
  assert.ok(source.includes("'depositDetail.rolloverDeposit': 'Next cycle'"));
  assert.ok(source.includes("'depositDetail.thresholdHint': 'Amounts below $5 stay held until the minimum payout threshold is reached.'"));
  assert.match(source, /'depositCreate\.settlementPreference': '[\u0400-\u04FF]/u);
  assert.match(source, /'depositCreate\.settlementThresholdHint': '[\u0400-\u04FF]/u);
  assert.match(source, /'depositCreate\.settlementRolloverHint': '[\u0400-\u04FF]/u);
  assert.match(source, /'depositDetail\.rolloverCreated': '[\u0400-\u04FF]/u);
  assert.match(source, /'depositDetail\.rolloverDeposit': '[\u0400-\u04FF]/u);
  assert.match(source, /'depositDetail\.thresholdHint': '[\u0400-\u04FF]/u);
});

test('create cycle and address menus only expose currently enabled networks', () => {
  const createDepositPath = path.join(__dirname, '..', 'app', 'create-deposit', 'page.tsx');
  const createDepositSource = fs.readFileSync(createDepositPath, 'utf8');
  const addressesPath = path.join(__dirname, '..', 'app', 'addresses', 'page.tsx');
  const addressesSource = fs.readFileSync(addressesPath, 'utf8');

  assert.match(createDepositSource, /const NETWORKS = \['BSC', 'TON', 'SOL'\];/u);
  assert.match(addressesSource, /const NETWORKS = \['BSC', 'TON', 'SOL'\];/u);
});

test('deposit details route actions include current metrics navigation', () => {
  const filePath = path.join(__dirname, '..', 'app', 'deposits', '[id]', 'page.tsx');
  const source = fs.readFileSync(filePath, 'utf8');

  assert.match(source, /href=\{`\/metrics\/\$\{deposit\.deposit_id\}`\}/u);
  assert.match(source, /t\('depositDetail\.viewMetrics'\)/u);
});
