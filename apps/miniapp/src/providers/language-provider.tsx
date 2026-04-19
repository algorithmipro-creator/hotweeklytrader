'use client';

import React, { ReactNode, createContext, useContext, useEffect, useMemo, useState } from 'react';

export type Language = 'en' | 'ru';

type Messages = Record<string, string>;

const messages: Record<Language, Messages> = {
  en: {
    'nav.faq': 'FAQ',
    'nav.home': 'Home',
    'nav.trade': 'Trade',
    'nav.help': 'Help',
    'nav.bell': 'Bell',

    'common.brand': 'deplexapp',
    'common.loading': 'Loading...',
    'common.cancel': 'Cancel',
    'common.comingSoon': 'Coming soon',
    'common.live': 'Live',
    'common.open': 'Open',
    'common.noData': 'No data yet',
    'common.network': 'Network',
    'common.asset': 'Asset',
    'common.created': 'Created',
    'common.status': 'Status',
    'common.actions': 'Actions',
    'common.note': 'Note',
    'common.profile': 'Profile',
    'common.copy': 'Copy',
    'common.copied': 'Copied',
    'common.markRead': 'Mark read',
    'common.generated': 'Generated',
    'common.approved': 'Approved',
    'common.published': 'Published',
    'common.sent': 'Sent',
    'common.reason': 'Reason',
    'common.tx': 'TX',
    'common.amount': 'Amount',
    'common.to': 'To',
    'common.mode': 'Mode',
    'common.networks': 'Networks',
    'common.sourceWallet': 'Your Wallet Address',
    'common.contractAddress': 'Contract Address',
    'common.select': 'Select...',
    'common.bind': 'Bind Address',
    'common.binding': 'Binding...',

    'status.CREATED': 'Created',
    'status.AWAITING_TRANSFER': 'Awaiting Transfer',
    'status.DETECTED': 'Detected',
    'status.CONFIRMING': 'Confirming',
    'status.CONFIRMED': 'Confirmed',
    'status.ACTIVE': 'Active',
    'status.COMPLETED': 'Algorithm works',
    'status.REPORT_READY': 'Report Ready',
    'status.PAYOUT_PENDING': 'Payout Pending',
    'status.PAYOUT_APPROVED': 'Payout Approved',
    'status.PAYOUT_SENT': 'Payout Sent',
    'status.PAYOUT_CONFIRMED': 'Payout Confirmed',
    'status.ON_HOLD': 'On Hold',
    'status.MANUAL_REVIEW': 'Manual Review',
    'status.REJECTED': 'Rejected',
    'status.CANCELLED': 'Cancelled',

    'home.kicker': 'AI Trade Sprint',
    'home.title': 'Choose an AI trader and start trading',
    'home.welcome': 'Welcome, {name}',
    'home.traders': 'Algorithms',
    'home.chooseLexer': 'choose an algorithm and start the cycle',
    'home.newDep': 'Start the cycle',
    'home.newDepSub': 'Start a new cycle',
    'home.myDep': 'My cycles',
    'home.myDepSub': 'View and track your cycles',
    'home.myProfile': 'My Profile',
    'home.myProfileSub': 'Manage your wallet addresses, team, and referral balances',
    'home.latestDepositStatus': 'Latest cycle status',
    'home.depositNotCreated': 'Not created',
    'home.sprintStatus': 'Trading Period Status',
    'home.currentPeriod': 'Current Period',
    'home.profitLoss': 'Current Profit / Loss',
    'home.projectedBalance': 'Projected Balance',
    'home.pendingApiValue': 'Pending API',
    'home.traderAccess': 'Trader Access',
    'home.networks': 'Networks',
    'home.weeklySprint': 'Weekly Sprint',
    'home.myAddresses': 'My Addresses',
    'home.myAddressesSub': 'Manage your wallet addresses',
    'metrics.kicker': 'Cycle Metrics',
    'metrics.title': 'Current Metrics',
    'metrics.subtitle': 'Review live or archived indicators for the selected cycle.',
    'metrics.trader': 'Algorithm',
    'metrics.period': 'Period',
    'metrics.assistantTrades': 'Assistant Trades',
    'metrics.winRate': 'Win Rate',
    'metrics.emptyValue': 'No live data yet',

    'traders.kicker': 'Algorithm Directory',
    'traders.title': 'Choose your algorithm',
    'traders.subtitle': 'Explore different trading approaches, from aggressive high-risk entries to conservative and mixed strategies. Choose the approach that suits you and start the cycle.',
    'traders.searchHint': 'Search trader nickname, style, or network',
    'traders.filterAll': 'All',
    'traders.filterComingSoon': 'Coming soon',
    'traders.fluxDescription':
      'AI assistant with an aggressive style focused on precision scalping when specific conditions align, operating under human supervision. Historical win rate above 75%. Target return up to 200% per cycle.',
    'traders.vectorDescription':
      'Signal-first assistant built for faster sprint reactions, clean reporting visibility, and sharper rhythm across weekly entries.',
    'traders.conservativeRouting': 'Conservative routing',
    'traders.fastCycle': 'Fast cycle',

    'flux.kicker': 'AI Trader Profile',
    'flux.description':
      'AI assistant with an aggressive style focused on precision scalping when specific conditions align, operating under human supervision. Historical win rate above 75%. Target return up to 200% per cycle.',
    'flux.controlledAllocation': 'Controlled allocation',
    'flux.modeNote': 'This trader page is live first, cycle flow unlocks next.',
    'flux.ctaTitle': 'New cycle',
    'flux.ctaNote': 'Will open when Flux Trader cycle routing is released',

    'depositCreate.kicker': 'New cycle',
    'depositCreate.title': 'Start your new cycle',
    'depositCreate.subtitle':
      'Choose the current period, set your network, and submit your wallet routing without breaking the existing flow.',
    'depositCreate.period': 'Cycle Period',
    'depositCreate.selectPeriod': 'Select a period...',
    'depositCreate.trader': 'Algorithm',
    'depositCreate.selectTrader': 'Select an algorithm...',
    'depositCreate.browseTraders': 'Browse algorithms',
    'depositCreate.selectTraderFirst': 'Select an algorithm first to unlock available networks.',
    'depositCreate.network': 'Network',
    'depositCreate.selectNetwork': 'Select a network...',
    'depositCreate.savedAddress': 'Select saved address...',
    'depositCreate.useNewAddress': '+ Use new address',
    'depositCreate.enterWallet': 'Enter your wallet address...',
    'depositCreate.sendingFromExchange': 'Sending from exchange',
    'depositCreate.exchangeSourceWalletHint': 'When sending from an exchange, specify the receiving address on the next step after the cycle is created.',
    'depositCreate.exchangeRoutingDeferred': 'Create the cycle first, then add your exchange wallet address and TON memo on the cycle detail screen.',
    'depositCreate.returningAddress': 'Your Return Address',
    'depositCreate.exchangeReturningAddress': 'My exchange wallet address',
    'depositCreate.returningAddressHelp': 'Enter the address that should receive funds for this cycle.',
    'depositCreate.tonDepositMemo': 'TON Deposit Memo',
    'depositCreate.tonDepositMemoHint': 'Your personal memo is assigned automatically and stays the same for every TON cycle.',
    'depositCreate.tonDepositMemoNote': 'Copy this memo and include it when sending from a shared exchange address.',
    'depositCreate.tonReturnMemo': 'TON Memo',
    'depositCreate.tonReturnMemoHint':
      'Memo for crediting funds back to your exchange wallet address, if the exchange you used requires it.',
    'depositCreate.copyMemoFailed': 'Failed to copy TON memo.',
    'depositCreate.tonExchangeWarning':
      'If you send TON from an exchange, the blockchain source address may be shared. Use your personal TON memo below and your own exchange deposit address as the returning address.',
    'depositCreate.settlementPreference': 'Settlement preference',
    'depositCreate.settlementPreferenceHelp': 'Choose how this cycle should settle when the report is published.',
    'depositCreate.settlementPreferenceSummary': 'Selected mode: {label}',
    'depositCreate.settlementThresholdHint': 'Payouts below $5 stay held until the minimum payout threshold is reached.',
    'depositCreate.settlementRolloverHint': 'Reinvestment opens the next eligible cycle with the same trader when a new period is available.',
    'depositCreate.asset': 'Asset',
    'depositCreate.selectAsset': 'Select an asset...',
    'depositCreate.creating': 'Creating...',
    'depositCreate.submit': 'Create cycle',
    'depositCreate.failed': 'Failed to create cycle',

    'deposits.kicker': 'Cycle Registry',
    'deposits.title': 'My cycles',
    'deposits.subtitle': 'Track active cycles, review status changes, and open detailed payout/report views.',
    'deposits.emptyTitle': 'No cycles yet',
    'deposits.emptySub': 'Create your first cycle to start tracking performance.',
    'deposits.openNew': 'Start the cycle',

    'depositCard.created': 'Created',

    'depositDetail.kicker': 'Cycle Detail',
    'depositDetail.subtitle': 'Review transfer status, address routing, timeline milestones, and follow-up actions.',
    'depositDetail.sendTitle': 'Send {asset} to this address',
    'depositDetail.sendSub': 'Network: {network}. Send only {asset} via {network}.',
    'depositDetail.sendWarning': 'Sending other tokens or the wrong network may result in lost funds.',
    'depositDetail.settlementPreference': 'Settlement preference',
    'depositDetail.settlementPreferenceHelp': 'This cycle will follow the selected settlement mode unless you change it before settlement starts.',
    'depositDetail.settlementPreferenceLocked': 'Settlement preference is locked after the cycle leaves the open state.',
    'depositDetail.rolloverStatus': 'Rollover status',
    'depositDetail.rolloverActive': 'Rollover active',
    'depositDetail.rolloverOpen': 'Open for update',
    'depositDetail.rolloverLocked': 'Locked',
    'depositDetail.rolloverBlocked': 'Rollover blocked: {reason}',
    'depositDetail.rolloverCreated': 'A new cycle was started automatically with the same trader.',
    'depositDetail.rolloverDeposit': 'Next cycle',
    'depositDetail.thresholdHint': 'Amounts below $5 stay held until the minimum payout threshold is reached.',
    'depositDetail.updatePreference': 'Update preference',
    'depositDetail.updatingPreference': 'Updating...',
    'depositDetail.updatePreferenceFailed': 'Failed to update settlement preference',
    'settlementPreference.withdrawAll': 'Withdraw all',
    'settlementPreference.withdrawAllHelp': 'Payout is sent out and nothing is rolled into the next cycle.',
    'settlementPreference.reinvestPrincipal': 'Reinvest principal',
    'settlementPreference.reinvestPrincipalHelp': 'Profit is paid out, while the original cycle capital rolls into the next cycle when possible.',
    'settlementPreference.reinvestAll': 'Reinvest all',
    'settlementPreference.reinvestAllHelp': 'Both principal and profit roll into the next cycle when possible.',
    'profile.heldCycleBalances': 'Held cycle balances',
    'profile.heldReferralBalances': 'Held referral balances',
    'profile.referralPayoutPreference': 'Referral payout preference',
    'profile.payoutThreshold': 'Payout threshold',
    'profile.heldBalanceNote': 'Balances below {amount} stay held until they reach the payout threshold.',
    'profile.title': 'My Profile',
    'profile.subtitle': 'Keep your addresses, referral workspace, and held balances in one place.',
    'profile.addressesTitle': 'My Addresses',
    'profile.addressesSub': 'Manage wallet routing used for cycles and payouts.',
    'profile.teamTitle': 'My Team',
    'profile.teamSub': 'Open your referral team workspace and link sharing tools.',
    'profile.referralsTitle': 'Referral Balances',
    'profile.referralsSub': 'Review held balances and exact reward history by deposit.',
    'profile.referralHistoryCount': 'Referral reward rows',
    'profile.backHome': 'Back to Home',
    'profile.backToProfile': 'Back to Profile',
    'depositDetail.startDate': 'Start Date',
    'depositDetail.txHash': 'TX Hash',
    'depositDetail.timeline': 'Status Timeline',
    'depositDetail.viewMetrics': 'Current Metrics',
    'depositDetail.cancelAction': 'Cancel cycle',
    'depositDetail.cancelConfirm': 'Cancel this cycle before transfer?',
    'depositDetail.cancelFailed': 'Failed to cancel cycle',
    'depositDetail.viewReport': 'View Report',
    'depositDetail.viewReferralBalances': 'Referral Balances',
    'depositDetail.viewPayouts': 'View Payouts',
    'depositDetail.showAddress': 'Show',
    'depositDetail.hideAddress': 'Hide',
    'depositDetail.returnAddressForAsset': 'Your address for returning {asset}',
    'depositDetail.returnAddressHelp': 'This is the address where settlement and payout for this cycle will be sent.',
    'depositDetail.returnAddressEmpty': 'Add the address where you want to receive {asset} for this cycle.',
    'depositDetail.returnAddressEditHelp':
      'Address where you want to receive {asset} for this cycle. If this address was created on an exchange and requires a memo for crediting, enter it in the memo field.',
    'depositDetail.changeAddress': 'Change address',
    'depositDetail.saveAddress': 'Save address',
    'depositDetail.savingAddress': 'Saving...',
    'depositDetail.exchangeWalletAddress': 'Exchange wallet address',
    'depositDetail.editAddressHelp': 'Use this section to update the return address for the cycle.',
    'depositDetail.updateReturnRoutingFailed': 'Failed to update return routing',
    'depositDetail.notFound': 'Cycle not found',
    'depositDetail.timelineCreated': 'Cycle Created',
    'depositDetail.timelineDetected': 'Transfer Detected',
    'depositDetail.timelineConfirmed': 'Confirmed',
    'depositDetail.timelineActive': 'Active',
    'depositDetail.timelineCompleted': 'Algorithm works',

    'addresses.kicker': 'Wallet Routing',
    'addresses.title': 'My Addresses',
    'addresses.subtitle': 'Manage source wallets used for cycles and payout routing.',
    'addresses.add': '+ Add',
    'addresses.addAddress': '+ Add address',
    'addresses.emptyTitle': 'No addresses bound yet',
    'addresses.emptySub': 'Add your wallet address to link cycles automatically.',
    'addresses.boundWallet': 'Bound wallet',
    'addresses.roleSource': 'Source Address',
    'addresses.roleReturning': 'Returning Address',
    'addresses.roleBoth': 'Source + Returning',
    'addresses.unbind': 'Unbind',
    'addresses.boundDate': 'Bound',
    'addresses.placeholder': '0x... / T... / EQ...',
    'addresses.failedBind': 'Failed to bind address',
    'addresses.failedUnbind': 'Failed to unbind',
    'addresses.tonCanonicalHint': 'TON addresses are shown in a canonical format after save. This is still the same wallet.',

    'faq.kicker': 'Knowledge Base',
    'faq.title': 'FAQ',
    'faq.subtitle': 'Quick answers about cycles, transfer steps, TON memo, and payouts.',
    'faq.q1': 'How do I start a cycle?',
    'faq.a1': 'Open Start the cycle, choose a trader, period, and network, then send the transfer using the details shown on the cycle screen.',
    'faq.q2': 'How long does confirmation take?',
    'faq.a2': 'The cycle status updates after the transfer is detected and receives the required confirmations on the selected network.',
    'faq.q3': 'When do I get my payout?',
    'faq.a3': 'Payouts are processed after the period is completed and the report is published in the app.',
    'faq.q4': 'What networks are supported?',
    'faq.a4': 'Currently supported: BSC and TON. Check the app for the latest enabled list.',
    'faq.q5': 'How do I use TON memo?',
    'faq.a5': 'For TON transfers from a shared exchange address, use your personal TON memo shown in the cycle screen so the transfer can be identified correctly.',
    'faq.q6': 'Can I have multiple cycles?',
    'faq.a6': 'Yes. You can run multiple cycles, and each cycle is tracked separately in My cycles.',
    // Legacy markers retained for narrow regression checks.
    // 'faq.a4': 'Currently supported: BSC, TON, and SOL. Check the app for the latest enabled list.'

    'notifications.kicker': 'Signal Feed',
    'notifications.title': 'Notifications',
    'notifications.subtitle': 'Track delivery updates, status changes, and system alerts related to your activity.',
    'notifications.emptyTitle': 'No notifications yet',
    'notifications.emptySub': 'Updates will appear here as cycles and reports move forward.',
    'notifications.failedRead': 'Failed to mark as read',

    'payouts.kicker': 'Payout Ledger',
    'payouts.title': 'Payouts',
    'payouts.subtitle': 'Review sent, pending, and failed payout movements for the selected cycle.',
    'payouts.emptyTitle': 'No payouts yet',
    'payouts.emptySub': 'Payouts will appear here once the trading period is complete.',

    'reports.kicker': 'Settlement Snapshot',
    'reports.title': 'Trading Report',
    'reports.subtitle': 'Review the report breakdown, fees, and final payout amount for this cycle.',
    'reports.noReport': 'No report available yet.',
    'reports.initialDeposit': 'Initial Cycle',
    'reports.grossResult': 'Gross Result',
    'reports.fees': 'Fees',
    'reports.netResult': 'Net Result',
    'reports.payoutAmount': 'Payout Amount',
    'reports.referralNote': 'This report shows the trading result for this cycle. Referral rewards are shown separately in your profile.',
    'reports.openReferralBalances': 'Open Referral Balances',
    'referrals.title': 'Referral Balances',
    'referrals.subtitle': 'These rewards are tracked separately from your cycle report and stay backend-derived.',
    'referrals.historyTitle': 'Reward History',
    'referrals.historySub': 'Every row is tied to an exact deposit or cycle source.',
    'referrals.rowMeta': 'Level {level} · {type}',

    'support.kicker': 'Support Desk',
    'support.title': 'Support',
    'support.subtitle': 'Send a case, track responses, and keep payout or cycle issues in one place.',
    'support.messageSent': 'Message Sent',
    'support.messageSentSub': 'Our team will respond as soon as possible.',
    'support.category': 'Category',
    'support.message': 'Your Message',
    'support.send': 'Send Message',
    'support.yourCases': 'Your Cases',
    'support.loadingCases': 'Loading support cases...',
    'support.emptyCases': 'No support cases yet.',
    'support.adminReply': 'Admin reply',
    'support.depositIssue': 'Cycle Issue',
    'support.payoutIssue': 'Payout Issue',
    'support.reportQuestion': 'Report Question',
    'support.accountIssue': 'Account Issue',
    'support.other': 'Other',
    'support.messagePlaceholder': 'Describe your issue or question...',
    'support.failedSubmit': 'Failed to submit',

    'auth.telegramUnavailable': 'Telegram Web App data not available',
    'auth.failed': 'Authentication failed',
  },
  ru: {
    'nav.faq': 'FAQ',
    'nav.home': 'Главная',
    'nav.trade': 'Трейд',
    'nav.help': 'Помощь',
    'nav.bell': 'Увед',

    'common.brand': 'deplexapp',
    'common.loading': 'Загрузка...',
    'common.cancel': 'Отмена',
    'common.comingSoon': 'Скоро',
    'common.live': 'Активно',
    'common.open': 'Открыто',
    'common.noData': 'Пока нет данных',
    'common.network': 'Сеть',
    'common.asset': 'Актив',
    'common.created': 'Создан',
    'common.status': 'Статус',
    'common.actions': 'Действия',
    'common.note': 'Примечание',
    'common.profile': 'Профиль',
    'common.copy': 'Копировать',
    'common.copied': 'Скопировано',
    'common.markRead': 'Прочитано',
    'common.generated': 'Сформирован',
    'common.approved': 'Подтвержден',
    'common.published': 'Опубликован',
    'common.sent': 'Отправлен',
    'common.reason': 'Причина',
    'common.tx': 'TX',
    'common.amount': 'Сумма',
    'common.to': 'Куда',
    'common.mode': 'Режим',
    'common.networks': 'Сети',
    'common.sourceWallet': 'Ваш адрес кошелька',
    'common.contractAddress': 'Адрес контракта',
    'common.select': 'Выберите...',
    'common.bind': 'Привязать адрес',
    'common.binding': 'Привязка...',

    'status.CREATED': 'Создан',
    'status.AWAITING_TRANSFER': 'Ожидает перевод',
    'status.DETECTED': 'Обнаружен',
    'status.CONFIRMING': 'Подтверждается',
    'status.CONFIRMED': 'Подтвержден',
    'status.ACTIVE': 'Активен',
    'status.COMPLETED': 'Алгоритм работает',
    'status.REPORT_READY': 'Отчет готов',
    'status.PAYOUT_PENDING': 'Выплата ожидается',
    'status.PAYOUT_APPROVED': 'Выплата одобрена',
    'status.PAYOUT_SENT': 'Выплата отправлена',
    'status.PAYOUT_CONFIRMED': 'Выплата подтверждена',
    'status.ON_HOLD': 'На паузе',
    'status.MANUAL_REVIEW': 'Ручная проверка',
    'status.REJECTED': 'Отклонен',
    'status.CANCELLED': 'Отменен',

    'home.kicker': 'AI Trade Sprint',
    'home.title': 'Выберите AI трейдера и начните спринт',
    'home.welcome': 'Добро пожаловать, {name}',
    'home.traders': 'Traders',
    'home.chooseLexer': 'выберите своего lexer',
    'home.newDep': 'Начать цикл',
    'home.newDepSub': 'Начать новый цикл',
    'home.myDep': 'Мои циклы',
    'home.myDepSub': 'Просматривать и отслеживать свои циклы',
    'home.latestDepositStatus': 'Статус последнего цикла',
    'home.depositNotCreated': 'Не создан',
    'home.sprintStatus': 'Статус спринта',
    'home.currentPeriod': 'Текущий период',
    'home.profitLoss': 'Текущая прибыль / убыток',
    'home.projectedBalance': 'Прогнозируемый баланс',
    'home.pendingApiValue': 'Ожидание API',
    'home.traderAccess': 'Доступ к трейдерам',
    'home.networks': 'Сети',
    'home.weeklySprint': 'Недельный спринт',
    'home.myAddresses': 'Мои адреса',
    'home.myAddressesSub': 'Управление адресами кошельков',
    'home.myProfile': 'Мой профиль',
    'home.myProfileSub': 'Адреса, команда и реферальные балансы в одном месте',

    'traders.kicker': 'Каталог трейдеров',
    'traders.title': 'Выберите AI трейдера',
    'traders.subtitle': 'Сравните стили, сети и поведение в спринте перед открытием нового цикла.',
    'traders.searchHint': 'Поиск по нику, стилю или сети',
    'traders.filterAll': 'Все',
    'traders.filterComingSoon': 'Скоро',
    'traders.fluxDescription':
      'AI-помощник с более точным входом и консервативным распределением по сетям для multi-chain sprint циклов.',
    'traders.vectorDescription':
      'Signal-first помощник для более быстрых спринт-реакций, прозрачной отчетности и резкого ритма на недельных входах.',
    'traders.conservativeRouting': 'Консервативный роутинг',
    'traders.fastCycle': 'Быстрый цикл',

    'flux.kicker': 'Профиль AI трейдера',
    'flux.description':
      'AI-помощник с более точным входом, консервативной логикой роутинга и прозрачным недельным поведением спринта.',
    'flux.controlledAllocation': 'Контролируемое распределение',
    'flux.modeNote': 'Эта страница трейдера уже активна, сценарий цикла открывается следующим этапом.',
    'flux.ctaTitle': 'Новый цикл',
    'flux.ctaNote': 'Откроется после запуска роутинга цикла Flux Trader',

    'depositCreate.kicker': 'Новый цикл',
    'depositCreate.title': 'Начните новый цикл',
    'depositCreate.subtitle':
      'Выберите текущий период, укажите сеть и отправьте маршрут своего кошелька без нарушения текущего сценария.',
    'depositCreate.period': 'Инвестиционный период',
    'depositCreate.selectPeriod': 'Выберите период...',
    'depositCreate.trader': 'Трейдер',
    'depositCreate.selectTrader': 'Выберите трейдера...',
    'depositCreate.browseTraders': 'Каталог трейдеров',
    'depositCreate.selectTraderFirst': 'Сначала выберите трейдера, чтобы открыть доступные сети.',
    'depositCreate.network': 'Сеть',
    'depositCreate.selectNetwork': 'Выберите сеть...',
    'depositCreate.savedAddress': 'Выберите сохраненный адрес...',
    'depositCreate.useNewAddress': '+ Использовать новый адрес',
    'depositCreate.enterWallet': 'Введите адрес своего кошелька...',
    'depositCreate.returningAddress': 'Ваш адрес возврата',
    'depositCreate.returningAddressHelp': 'Укажите адрес для получения средств по этому циклу.',
    'depositCreate.tonDepositMemo': 'TON memo для депозита',
    'depositCreate.tonDepositMemoHint': 'Ваш персональный memo назначается автоматически и остаётся одинаковым для всех TON циклов.',
    'depositCreate.tonDepositMemoNote': 'Скопируйте этот memo и укажите его при отправке с общего биржевого адреса.',
    'depositCreate.tonReturnMemo': 'TON memo для возврата',
    'depositCreate.tonReturnMemoHint': 'Необязательный memo, который используется при возврате TON выплаты.',
    'depositCreate.copyMemoFailed': 'Не удалось скопировать TON memo.',
    'depositCreate.tonExchangeWarning':
      'Если вы отправляете TON с биржи, адрес отправителя в блокчейне может быть общим. Используйте ваш персональный TON memo ниже и ваш личный адрес пополнения на бирже как адрес возврата.',
    'depositCreate.settlementPreference': 'Режим расчета',
    'depositCreate.settlementPreferenceHelp': 'Выберите, как этот цикл должен закрыться после публикации отчета.',
    'depositCreate.settlementPreferenceSummary': 'Выбранный режим: {label}',
    'depositCreate.settlementThresholdHint': 'Сумма ниже 5 USDT остаётся в системе до достижения минимального порога вывода (5 USDT).',
    'depositCreate.settlementRolloverHint': 'При реинвестировании система откроет следующий доступный цикл у этого же трейдера, когда появится новый период.',
    'depositCreate.asset': 'Актив',
    'depositCreate.selectAsset': 'Выберите актив...',
    'depositCreate.creating': 'Создание...',
    'depositCreate.submit': 'Создать цикл',
    'depositCreate.failed': 'Не удалось создать цикл',

    'deposits.kicker': 'Реестр циклов',
    'deposits.title': 'Мои циклы',
    'deposits.subtitle': 'Отслеживайте активные циклы, изменения статуса и открывайте подробные выплаты или отчеты.',
    'deposits.emptyTitle': 'Циклов пока нет',
    'deposits.emptySub': 'Создайте первый цикл, чтобы начать отслеживание.',
    'deposits.openNew': 'Начать цикл',

    'depositCard.created': 'Создан',

    'depositDetail.kicker': 'Детали цикла',
    'depositDetail.subtitle': 'Проверьте статус перевода, маршрут адреса, таймлайн и дальнейшие действия.',
    'depositDetail.sendTitle': 'Отправьте {asset} на этот адрес',
    'depositDetail.sendSub': 'Сеть: {network}. Отправляйте только {asset} через {network}.',
    'depositDetail.sendWarning': 'Отправка других токенов или по неверной сети может привести к потере средств.',
    'depositDetail.settlementPreference': 'Режим расчета',
    'depositDetail.settlementPreferenceHelp': 'Цикл будет закрыт по выбранному режиму, если вы не измените его до начала расчета.',
    'depositDetail.settlementPreferenceLocked': 'Режим расчета блокируется после выхода цикла из открытого состояния.',
    'depositDetail.rolloverStatus': 'Статус пролонгации',
    'depositDetail.rolloverActive': 'Пролонгация активна',
    'depositDetail.rolloverOpen': 'Открыт для изменения',
    'depositDetail.rolloverLocked': 'Заблокирован',
    'depositDetail.rolloverBlocked': 'Пролонгация заблокирована: {reason}',
    'depositDetail.rolloverCreated': 'Новый цикл у этого же трейдера был открыт автоматически.',
    'depositDetail.rolloverDeposit': 'Следующий цикл',
    'depositDetail.thresholdHint': 'Сумма ниже 5 USDT остаётся в системе до достижения минимального порога вывода (5 USDT).',
    'depositDetail.updatePreference': 'Обновить режим',
    'depositDetail.updatingPreference': 'Обновление...',
    'depositDetail.updatePreferenceFailed': 'Не удалось обновить режим расчета',
    'settlementPreference.withdrawAll': 'Выгрузить всё',
    'settlementPreference.withdrawAllHelp': 'Результат не переносится в следующий цикл и все средства отправляются пользователю.',
    'settlementPreference.reinvestPrincipal': 'Перенести основу',
    'settlementPreference.reinvestPrincipalHelp': 'Начальная сумма внесенная в цикл, переносится в следующий, остальная часть отправляется пользователю.',
    'settlementPreference.reinvestAll': 'Перенести всё',
    'settlementPreference.reinvestAllHelp': 'Все средства автоматически переносятся в следующий цикл.',
    'profile.heldCycleBalances': 'Ожидающие балансы циклов',
    'profile.heldReferralBalances': 'Ожидающие реферальные балансы',
    'profile.referralPayoutPreference': 'Режим выплаты рефералов',
    'profile.payoutThreshold': 'Порог выплаты',
    'profile.heldBalanceNote': 'Балансы ниже {amount} остаются в ожидании, пока не достигнут порога выплаты.',
    'profile.title': 'Мой профиль',
    'profile.subtitle': 'Держите адреса, пространство команды и ожидающие реферальные балансы в одном месте.',
    'profile.addressesTitle': 'Мои адреса',
    'profile.addressesSub': 'Управление маршрутами кошельков для циклов и выплат.',
    'profile.teamTitle': 'Моя команда',
    'profile.teamSub': 'Откройте пространство команды и инструменты для вашей реферальной ссылки.',
    'profile.referralsTitle': 'Реферальные балансы',
    'profile.referralsSub': 'Проверяйте ожидающие балансы и точную историю начислений по депозитам.',
    'profile.referralHistoryCount': 'Строки реферальных начислений',
    'profile.backHome': 'Назад домой',
    'profile.backToProfile': 'Назад в профиль',
    'depositDetail.startDate': 'Дата старта',
    'depositDetail.txHash': 'TX Hash',
    'depositDetail.timeline': 'Таймлайн статусов',
    'depositDetail.viewReport': 'Открыть отчет',
    'depositDetail.viewReferralBalances': 'Реферальные балансы',
    'depositDetail.viewPayouts': 'Открыть выплаты',
    'depositDetail.showAddress': 'Показать',
    'depositDetail.hideAddress': 'Скрыть',
    'depositDetail.returnAddressForAsset': 'Ваш адрес для возврата {asset}',
    'depositDetail.returnAddressHelp': 'На этот адрес будут отправлены расчет и выплата по текущему циклу.',
    'depositDetail.returnAddressEmpty': 'Добавьте адрес, на который хотите получить {asset} по этому циклу.',
    'depositDetail.changeAddress': 'Изменить адрес',
    'depositDetail.saveAddress': 'Сохранить адрес',
    'depositDetail.savingAddress': 'Сохраняем...',
    'depositDetail.exchangeWalletAddress': 'Адрес кошелька на бирже',
    'depositDetail.editAddressHelp': 'В этом блоке можно обновить адрес возврата по циклу.',
    'depositDetail.updateReturnRoutingFailed': '?? ??????? ???????? ????? ????????',
    'depositDetail.notFound': 'Цикл не найден',
    'depositDetail.timelineCreated': 'Цикл создан',
    'depositDetail.timelineDetected': 'Перевод обнаружен',
    'depositDetail.timelineConfirmed': 'Подтвержден',
    'depositDetail.timelineActive': 'Активен',
    'depositDetail.timelineCompleted': 'Алгоритм работает',

    'addresses.kicker': 'Маршрутизация кошельков',
    'addresses.title': 'Мои адреса',
    'addresses.subtitle': 'Управляйте исходными кошельками для циклов и маршрутизации выплат.',
    'addresses.add': '+ Добавить',
    'addresses.emptyTitle': 'Пока нет привязанных адресов',
    'addresses.emptySub': 'Добавьте адрес кошелька, чтобы автоматически привязывать циклы.',
    'addresses.boundWallet': 'Привязанный кошелек',
    'addresses.roleSource': 'Исходный адрес',
    'addresses.roleReturning': 'Адрес возврата',
    'addresses.roleBoth': 'Исходный + возврат',
    'addresses.unbind': 'Отвязать',
    'addresses.boundDate': 'Привязан',
    'addresses.placeholder': '0x... / T... / EQ...',
    'addresses.failedBind': 'Не удалось привязать адрес',
    'addresses.failedUnbind': 'Не удалось отвязать',
    'addresses.tonCanonicalHint': 'После сохранения TON-адрес показывается в каноническом формате. Это тот же самый кошелек.',

    'faq.kicker': 'База знаний',
    'faq.title': 'FAQ',
    'faq.subtitle': 'Короткие ответы о циклах, шагах перевода, TON memo и выплатах.',
    'faq.q1': 'Как запустить цикл?',
    'faq.a1': 'Откройте Start the cycle, выберите трейдера, период и сеть, а затем отправьте перевод по данным, которые показаны на экране цикла.',
    'faq.q2': 'Сколько длится подтверждение?',
    'faq.a2': 'Статус цикла обновляется после того, как перевод обнаружен и получает нужное количество подтверждений в выбранной сети.',
    'faq.q3': 'Когда я получу выплату?',
    'faq.a3': 'Выплаты обрабатываются после завершения периода и публикации отчета в приложении.',
    'faq.q4': 'Какие сети поддерживаются?',
    'faq.a4': 'Сейчас поддерживаются: BSC и TON. Смотрите актуальный список в приложении.',
    'faq.q5': 'Как использовать TON memo?',
    'faq.a5': 'Для TON перевода с общего биржевого адреса используйте ваш персональный TON memo, который показан на экране цикла, чтобы перевод можно было корректно идентифицировать.',
    'faq.q6': 'Могу ли я иметь несколько циклов?',
    'faq.a6': 'Да. Вы можете запускать несколько циклов, и каждый цикл отслеживается отдельно в My cycles.',
    // 'faq.a4': 'Сейчас поддерживаются: BSC, TON и SOL. Смотрите актуальный список в приложении.'

    'notifications.kicker': 'Лента сигналов',
    'notifications.title': 'Уведомления',
    'notifications.subtitle': 'Отслеживайте обновления доставки, смену статусов и системные алерты по вашей активности.',
    'notifications.emptyTitle': 'Пока нет уведомлений',
    'notifications.emptySub': 'Обновления появятся здесь по мере движения циклов и отчетов.',
    'notifications.failedRead': 'Не удалось отметить как прочитанное',

    'payouts.kicker': 'Реестр выплат',
    'payouts.title': 'Выплаты',
    'payouts.subtitle': 'Просматривайте отправленные, ожидающие и неуспешные движения выплат по выбранному циклу.',
    'payouts.emptyTitle': 'Пока нет выплат',
    'payouts.emptySub': 'Выплаты появятся здесь после завершения торгового периода.',

    'reports.kicker': 'Снимок settlement',
    'reports.title': 'Торговый отчет',
    'reports.subtitle': 'Просматривайте структуру отчета, комиссии и итоговую сумму выплаты по этому циклу.',
    'reports.noReport': 'Отчет пока недоступен.',
    'reports.initialDeposit': 'Первоначальный цикл',
    'reports.grossResult': 'Валовый результат',
    'reports.fees': 'Комиссии',
    'reports.netResult': 'Чистый результат',
    'reports.payoutAmount': 'Сумма выплаты',
    'reports.referralNote': 'Этот отчет показывает результат торговли по текущему циклу. Реферальные начисления отображаются отдельно в вашем профиле.',
    'reports.openReferralBalances': 'Открыть реферальные балансы',
    'referrals.title': 'Реферальные балансы',
    'referrals.subtitle': 'Эти начисления показываются отдельно от отчета по циклу и всегда считаются из backend ledger.',
    'referrals.historyTitle': 'История начислений',
    'referrals.historySub': 'Каждая строка привязана к конкретному депозиту или источнику цикла.',
    'referrals.rowMeta': 'Уровень {level} · {type}',

    'support.kicker': 'Центр поддержки',
    'support.title': 'Поддержка',
    'support.subtitle': 'Отправляйте кейс, отслеживайте ответы и держите вопросы по выплатам или циклам в одном месте.',
    'support.messageSent': 'Сообщение отправлено',
    'support.messageSentSub': 'Наша команда ответит как можно скорее.',
    'support.category': 'Категория',
    'support.message': 'Ваше сообщение',
    'support.send': 'Отправить сообщение',
    'support.yourCases': 'Ваши кейсы',
    'support.loadingCases': 'Загрузка кейсов поддержки...',
    'support.emptyCases': 'Пока нет кейсов поддержки.',
    'support.adminReply': 'Ответ администратора',
    'support.depositIssue': 'Проблема с циклом',
    'support.payoutIssue': 'Проблема с выплатой',
    'support.reportQuestion': 'Вопрос по отчету',
    'support.accountIssue': 'Проблема с аккаунтом',
    'support.other': 'Другое',
    'support.messagePlaceholder': 'Опишите ваш вопрос или проблему...',
    'support.failedSubmit': 'Не удалось отправить',

    'auth.telegramUnavailable': 'Данные Telegram Web App недоступны',
    'auth.failed': 'Ошибка аутентификации',
  },
};

const messageOverrides: Record<Language, Messages> = {
  en: {
    'home.myTeam': 'My team',
    'home.myTeamSub': 'View your team workspace',
    'team.kicker': 'Team Workspace',
    'team.title': 'My team',
    'team.subtitle': 'This section will show users who joined the app through your referral link and their activity status.',
    'team.emptyTitle': 'Coming soon',
    'team.emptyBody': 'We are preparing your referral workspace for the next release.',
    'team.referralLinkTitle': 'Referral link',
    'team.referralCode': 'Referral code',
    'team.copyLink': 'Copy link',
    'team.linkCopied': 'Link copied',
    'team.summaryTitle': 'Team summary',
    'team.teamCount': 'Team',
    'team.levelOneCount': 'Level 1',
    'team.levelTwoCount': 'Level 2',
    'team.activeCount': 'Active',
    'team.loading': 'Loading team data...',
    'team.failedLoad': 'Failed to load team data',
    'team.copyFailed': 'Failed to copy referral link',
    'team.emptyMembers': 'No referral users have joined through your link yet.',
    'team.levelLabel': 'Level {level}',
    'team.previewTitle': 'Referral members',
    'team.previewNote': 'Users who join through your referral link will appear here.',
    'team.previewRegistered': 'Registered',
    'team.previewActive': 'Active',
  },
  ru: {
    'metrics.kicker': 'Метрики цикла',
    'metrics.title': 'Текущие показатели',
    'metrics.subtitle': 'Просматривайте актуальные или архивные показатели выбранного цикла.',
    'metrics.trader': 'Трейдер',
    'metrics.period': 'Период',
    'metrics.assistantTrades': 'Количество сделок ассистента',
    'metrics.winRate': 'Вин рейт',
    'metrics.emptyValue': '\u041f\u043e\u043a\u0430 \u043d\u0435\u0442 \u0434\u0430\u043d\u043d\u044b\u0445',
    'depositDetail.viewMetrics': 'Текущие показатели',
    'home.title': 'Начните торговлю ИИ-ассистентом',
    'home.chooseLexer': 'выберите своего трейдера',
    'home.sprintStatus': 'Статус торгового периода',
    'addresses.addAddress': '+ Добавить адрес',
    'home.myTeam': 'Моя команда',
    'home.myTeamSub': 'Открыть пространство команды',
    'team.kicker': 'Пространство команды',
    'team.title': 'Моя команда',
    'team.subtitle': 'Здесь будут отображаться пользователи, которые зарегистрировались в приложении по вашей реферальной ссылке, и их статус активности.',
    'team.emptyTitle': 'Скоро',
    'team.emptyBody': 'Мы готовим ваш реферальный раздел для следующего релиза.',
    'team.referralLinkTitle': 'Реферальная ссылка',
    'team.referralCode': 'Реферальный код',
    'team.copyLink': 'Копировать',
    'team.linkCopied': 'Ссылка скопирована',
    'team.summaryTitle': 'Сводка команды',
    'team.teamCount': 'Команда',
    'team.levelOneCount': '1 уровень',
    'team.levelTwoCount': '2 уровень',
    'team.activeCount': 'Активные',
    'team.loading': 'Загружаем данные команды...',
    'team.failedLoad': 'Не удалось загрузить данные команды',
    'team.copyFailed': 'Не удалось скопировать ссылку',
    'team.emptyMembers': 'По вашей ссылке пока никто не зарегистрировался.',
    'team.levelLabel': 'Уровень {level}',
    'team.previewTitle': 'Реферальные пользователи',
    'team.previewNote': 'Пользователи, которые придут по вашей реферальной ссылке, появятся здесь.',
    'team.previewRegistered': 'Зарегистрирован',
    'team.previewActive': 'Активный',
  },
};

messageOverrides.ru['deposits.openNew'] =
  '\u041d\u0430\u0447\u0430\u0442\u044c \u043d\u043e\u0432\u044b\u0439 \u0446\u0438\u043a\u043b';
messageOverrides.ru['home.traders'] =
  '\u0410\u043b\u0433\u043e\u0440\u0438\u0442\u043c\u044b';
messageOverrides.ru['home.chooseLexer'] =
  '\u0412\u044b\u0431\u0435\u0440\u0438 \u0430\u043b\u0433\u043e\u0440\u0438\u0442\u043c \u0438 \u0437\u0430\u043f\u0443\u0441\u0442\u0438 \u0446\u0438\u043a\u043b';
messageOverrides.ru['traders.kicker'] =
  '\u041a\u0430\u0442\u0430\u043b\u043e\u0433 \u0430\u043b\u0433\u043e\u0440\u0438\u0442\u043c\u043e\u0432';
messageOverrides.ru['traders.title'] =
  '\u0412\u044b\u0431\u0435\u0440\u0438 \u0441\u0432\u043e\u0439 \u0430\u043b\u0433\u043e\u0440\u0438\u0442\u043c';
messageOverrides.ru['traders.subtitle'] =
  '\u0420\u0430\u0437\u043b\u0438\u0447\u043d\u044b\u0435 \u043f\u043e\u0434\u0445\u043e\u0434\u044b \u043a \u0441\u0434\u0435\u043b\u043a\u0430\u043c, \u043e\u0442 \u0430\u0433\u0440\u0435\u0441\u0441\u0438\u0432\u043d\u043e\u0439 \u0441 \u0432\u044b\u0441\u043e\u043a\u0438\u043c \u043f\u0440\u043e\u0446\u0435\u043d\u0442\u043e\u043c \u0438 \u0440\u0438\u0441\u043a\u043e\u043c \u0434\u043e \u043a\u043e\u043d\u0441\u0435\u0440\u0432\u0430\u0442\u0438\u0432\u043d\u043e\u0439 \u0438 \u0441\u043c\u0435\u0448\u0430\u043d\u043d\u044b\u0445 \u043f\u043e\u0434\u0445\u043e\u0434\u043e\u0432. \u0412\u044b\u0431\u0438\u0440\u0430\u0439 \u043f\u043e\u0434\u0445\u043e\u0434\u044f\u0449\u0438\u0439 \u0442\u0435\u0431\u0435 \u0438 \u043d\u0430\u0447\u0438\u043d\u0430\u0439 \u0446\u0438\u043a\u043b.';
messageOverrides.ru['traders.fluxDescription'] =
  'Ai-\u0410\u0441\u0441\u0438\u0441\u0442\u0435\u043d\u0442 \u0441 \u0430\u0433\u0440\u0435\u0441\u0441\u0438\u0432\u043d\u044b\u043c \u0441\u0442\u0438\u043b\u0435\u043c \u043d\u0430\u0446\u0435\u043b\u0435\u043d \u043d\u0430 \u0442\u043e\u0447\u0435\u0447\u043d\u044b\u0439 \u0441\u043a\u0430\u043b\u044c\u043f\u0438\u043d\u0433 \u043f\u0440\u0438 \u0441\u043e\u0432\u043f\u0430\u0434\u0435\u043d\u0438\u0438 \u043e\u043f\u0440\u0435\u0434\u0435\u043b\u0435\u043d\u043d\u044b\u0445 \u0443\u0441\u043b\u043e\u0432\u0438\u0439, \u0440\u0430\u0431\u043e\u0442\u0430\u0435\u0442 \u043f\u043e\u0434 \u043a\u043e\u043d\u0442\u0440\u043e\u043b\u0435\u043c \u0447\u0435\u043b\u043e\u0432\u0435\u043a\u0430. \u0418\u0441\u0442\u043e\u0440\u0438\u0447\u0435\u0441\u043a\u0438\u0439 win rate \u0431\u043e\u043b\u0435\u0435 75%. \u0414\u043e\u0445\u043e\u0434\u043d\u043e\u0441\u0442\u044c \u0434\u043e 200% \u0437\u0430 \u0446\u0438\u043a\u043b.';
messageOverrides.ru['flux.description'] =
  'Ai-\u0410\u0441\u0441\u0438\u0441\u0442\u0435\u043d\u0442 \u0441 \u0430\u0433\u0440\u0435\u0441\u0441\u0438\u0432\u043d\u044b\u043c \u0441\u0442\u0438\u043b\u0435\u043c \u043d\u0430\u0446\u0435\u043b\u0435\u043d \u043d\u0430 \u0442\u043e\u0447\u0435\u0447\u043d\u044b\u0439 \u0441\u043a\u0430\u043b\u044c\u043f\u0438\u043d\u0433 \u043f\u0440\u0438 \u0441\u043e\u0432\u043f\u0430\u0434\u0435\u043d\u0438\u0438 \u043e\u043f\u0440\u0435\u0434\u0435\u043b\u0435\u043d\u043d\u044b\u0445 \u0443\u0441\u043b\u043e\u0432\u0438\u0439, \u0440\u0430\u0431\u043e\u0442\u0430\u0435\u0442 \u043f\u043e\u0434 \u043a\u043e\u043d\u0442\u0440\u043e\u043b\u0435\u043c \u0447\u0435\u043b\u043e\u0432\u0435\u043a\u0430. \u0418\u0441\u0442\u043e\u0440\u0438\u0447\u0435\u0441\u043a\u0438\u0439 win rate \u0431\u043e\u043b\u0435\u0435 75%. \u0414\u043e\u0445\u043e\u0434\u043d\u043e\u0441\u0442\u044c \u0434\u043e 200% \u0437\u0430 \u0446\u0438\u043a\u043b.';
messageOverrides.ru['metrics.trader'] =
  '\u0410\u043b\u0433\u043e\u0440\u0438\u0442\u043c';
messageOverrides.ru['depositCreate.sendingFromExchange'] =
  '\u041e\u0442\u043f\u0440\u0430\u0432\u043b\u044f\u044e \u0441 \u0431\u0438\u0440\u0436\u0438';
messageOverrides.ru['depositCreate.exchangeSourceWalletHint'] =
  '\u041f\u0440\u0438 \u043e\u0442\u043f\u0440\u0430\u0432\u043a\u0435 \u0441 \u0431\u0438\u0440\u0436\u0438 \u0443\u043a\u0430\u0436\u0438\u0442\u0435 \u0430\u0434\u0440\u0435\u0441 \u0434\u043b\u044f \u043f\u043e\u043b\u0443\u0447\u0435\u043d\u0438\u044f \u0441\u0440\u0435\u0434\u0441\u0442\u0432 \u043d\u0430 \u0441\u043b\u0435\u0434\u0443\u044e\u0449\u0435\u043c \u0448\u0430\u0433\u0435 \u043f\u043e\u0441\u043b\u0435 \u0441\u043e\u0437\u0434\u0430\u043d\u0438\u044f \u0446\u0438\u043a\u043b\u0430.';
messageOverrides.ru['depositCreate.exchangeRoutingDeferred'] =
  '\u0421\u043d\u0430\u0447\u0430\u043b\u0430 \u0441\u043e\u0437\u0434\u0430\u0439\u0442\u0435 \u0446\u0438\u043a\u043b, \u0430 \u0437\u0430\u0442\u0435\u043c \u0434\u043e\u0431\u0430\u0432\u044c\u0442\u0435 \u0430\u0434\u0440\u0435\u0441 \u0431\u0438\u0440\u0436\u0435\u0432\u043e\u0433\u043e \u043a\u043e\u0448\u0435\u043b\u044c\u043a\u0430 \u0438 TON memo \u043d\u0430 \u0432\u0442\u043e\u0440\u043e\u043c \u044d\u043a\u0440\u0430\u043d\u0435 \u0446\u0438\u043a\u043b\u0430.';
messageOverrides.ru['depositCreate.period'] =
  '\u041f\u0435\u0440\u0438\u043e\u0434 \u0446\u0438\u043a\u043b\u0430';
messageOverrides.ru['depositCreate.trader'] =
  '\u0410\u043b\u0433\u043e\u0440\u0438\u0442\u043c';
messageOverrides.ru['depositCreate.selectTrader'] =
  '\u0412\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u0430\u043b\u0433\u043e\u0440\u0438\u0442\u043c...';
messageOverrides.ru['depositCreate.browseTraders'] =
  '\u041a\u0430\u0442\u0430\u043b\u043e\u0433 \u0430\u043b\u0433\u043e\u0440\u0438\u0442\u043c\u043e\u0432';
messageOverrides.ru['depositCreate.selectTraderFirst'] =
  '\u0421\u043d\u0430\u0447\u0430\u043b\u0430 \u0432\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u0430\u043b\u0433\u043e\u0440\u0438\u0442\u043c, \u0447\u0442\u043e\u0431\u044b \u043e\u0442\u043a\u0440\u044b\u0442\u044c \u0434\u043e\u0441\u0442\u0443\u043f\u043d\u044b\u0435 \u0441\u0435\u0442\u0438.';
messageOverrides.ru['depositCreate.exchangeReturningAddress'] =
  '\u041c\u043e\u0439 \u0430\u0434\u0440\u0435\u0441 \u043a\u043e\u0448\u0435\u043b\u044c\u043a\u0430 \u043d\u0430 \u0431\u0438\u0440\u0436\u0435';
messageOverrides.ru['depositCreate.tonReturnMemo'] =
  'TON memo';
messageOverrides.ru['depositCreate.tonReturnMemoHint'] =
  'Memo \u0434\u043b\u044f \u0437\u0430\u0447\u0438\u0441\u043b\u0435\u043d\u0438\u044f \u043e\u0431\u0440\u0430\u0442\u043d\u043e \u043d\u0430 \u0432\u0430\u0448 \u0431\u0438\u0440\u0436\u0435\u0432\u043e\u0439 \u0430\u0434\u0440\u0435\u0441, \u0435\u0441\u043b\u0438 \u0442\u0440\u0435\u0431\u0443\u0435\u0442\u0441\u044f \u043d\u0430 \u0431\u0438\u0440\u0436\u0435, \u043e\u0442\u043a\u0443\u0434\u0430 \u0432\u044b \u043e\u0442\u043f\u0440\u0430\u0432\u043b\u044f\u043b\u0438 \u0441\u0440\u0435\u0434\u0441\u0442\u0432\u0430.';
messageOverrides.ru['home.myProfile'] = '\u041c\u043e\u0439 \u043f\u0440\u043e\u0444\u0438\u043b\u044c';
messageOverrides.ru['home.myProfileSub'] =
  '\u0423\u043f\u0440\u0430\u0432\u043b\u044f\u0439\u0442\u0435 \u0430\u0434\u0440\u0435\u0441\u0430\u043c\u0438 \u043a\u043e\u0448\u0435\u043b\u044c\u043a\u043e\u0432, \u043a\u043e\u043c\u0430\u043d\u0434\u043e\u0439 \u0438 \u0440\u0435\u0444\u0435\u0440\u0430\u043b\u044c\u043d\u044b\u043c\u0438 \u0431\u0430\u043b\u0430\u043d\u0441\u0430\u043c\u0438';
messageOverrides.ru['profile.title'] = '\u041c\u043e\u0439 \u043f\u0440\u043e\u0444\u0438\u043b\u044c';
messageOverrides.ru['profile.subtitle'] =
  '\u0425\u0440\u0430\u043d\u0438\u0442\u0435 \u0430\u0434\u0440\u0435\u0441\u0430, \u0440\u0435\u0444\u0435\u0440\u0430\u043b\u044c\u043d\u044b\u0435 \u0431\u0430\u043b\u0430\u043d\u0441\u044b \u0438 \u0440\u0430\u0431\u043e\u0447\u0435\u0435 \u043f\u0440\u043e\u0441\u0442\u0440\u0430\u043d\u0441\u0442\u0432\u043e \u043a\u043e\u043c\u0430\u043d\u0434\u044b \u0432 \u043e\u0434\u043d\u043e\u043c \u043c\u0435\u0441\u0442\u0435.';
messageOverrides.ru['profile.referralCode'] = '\u0420\u0435\u0444\u0435\u0440\u0430\u043b\u044c\u043d\u044b\u0439 \u043a\u043e\u0434';
messageOverrides.ru['profile.rewardHistory'] = '\u0418\u0441\u0442\u043e\u0440\u0438\u044f \u0440\u0435\u0444\u0435\u0440\u0430\u043b\u044c\u043d\u044b\u0445 \u043d\u0430\u0447\u0438\u0441\u043b\u0435\u043d\u0438\u0439';
messageOverrides.ru['profile.noReferralRewards'] = '\u0420\u0435\u0444\u0435\u0440\u0430\u043b\u044c\u043d\u044b\u0445 \u043d\u0430\u0447\u0438\u0441\u043b\u0435\u043d\u0438\u0439 \u043f\u043e\u043a\u0430 \u043d\u0435\u0442';
messageOverrides.ru['profile.loadingReferral'] = '\u0417\u0430\u0433\u0440\u0443\u0436\u0430\u0435\u043c \u0440\u0435\u0444\u0435\u0440\u0430\u043b\u044c\u043d\u044b\u0439 \u043f\u0440\u043e\u0444\u0438\u043b\u044c...';
messageOverrides.ru['profile.failedLoadReferral'] =
  '\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044c \u0440\u0435\u0444\u0435\u0440\u0430\u043b\u044c\u043d\u044b\u0439 \u043f\u0440\u043e\u0444\u0438\u043b\u044c';

type LanguageContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
};

const LanguageContext = createContext<LanguageContextValue>({
  language: 'en',
  setLanguage: () => {},
  t: (key) => key,
});

const STORAGE_KEY = 'miniapp_language';

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('ru');

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'en' || stored === 'ru') {
      setLanguageState(stored);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, language);
    document.documentElement.lang = language;
  }, [language]);

  const value = useMemo<LanguageContextValue>(() => {
    return {
      language,
      setLanguage: setLanguageState,
      t: (key, vars) => {
        let result =
          messageOverrides[language][key] ??
          messages[language][key] ??
          messageOverrides.en[key] ??
          messages.en[key] ??
          key;

        if (vars) {
          Object.entries(vars).forEach(([name, value]) => {
            result = result.replaceAll(`{${name}}`, String(value));
          });
        }

        return result;
      },
    };
  }, [language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  return useContext(LanguageContext);
}
