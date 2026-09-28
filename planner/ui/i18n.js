(() => {
// Multilingual localization engine for TSO Adventure Tactical Planner
// Languages supported: English ('en', default), Ukrainian ('uk'), Russian ('ru')

const I18N = {
  en: {
    // Header & Navigation
    'app.title': 'TSO Adventure Planner',
    'app.badge': '',
    'nav.params': 'Parameters',
    'nav.results': 'Results',
    
    // Sidebar Tabs
    'tab.camps': 'Camps',
    'tab.generals': 'Generals',
    'tab.troops': 'Troops',
    'tab.settings': 'Accuracy',

    // Pane 1: Camps & Adventure
    'pane.camps.title': 'Adventure',
    'pane.camps.searchPlaceholder': 'Search adventure...',
    'pane.camps.notFound': 'No adventures found',
    'pane.camps.reload': 'Reload adventure list',
    'pane.camps.all': 'All in order',
    'pane.camps.clear': 'Clear',
    'pane.camps.queueTitle': 'Attack queue',
    'pane.camps.selected': '{count} selected',
    'pane.camps.queueEmpty': 'Queue is empty — click camps above',
    'pane.camps.manual': 'Enter camp numbers manually',
    'pane.camps.manualPlaceholder': 'e.g.: 1, 2, 3, 4, 5',
    'camp.legend.small': 'small',
    'camp.legend.medium': 'medium',
    'camp.legend.large': 'large',
    'camp.legend.boss': 'boss',
    'camp.tooltip': 'Camp {num} (Sector {sector}, {type})\nEnemies ({total}): {enemies}',
    'camp.suffix': '{camps} camps',
    'pane.camps.openMap': 'Map',
    'mapModal.title': 'Adventure Map',
    'mapModal.queueStatus': 'Queue: {selected} / {total} camps',
    'mapModal.all': 'All in order',
    'mapModal.clear': 'Clear',
    'mapModal.close': 'Done',
    'mapModal.zoomIn': 'Zoom in',
    'mapModal.zoomOut': 'Zoom out',
    'mapModal.zoomReset': 'Fit map',
    'mapModal.statusSelected': 'Selected (#{order} in queue) — click to remove',
    'mapModal.statusUnselected': 'Not selected — click to add to queue',
    'mapModal.loading': 'Loading map image...',
    'mapModal.loadError': 'Map image could not be loaded.',

    // Pane 2: Generals
    'pane.gen.title': 'Generals Setup',
    'pane.gen.all': 'All',
    'pane.gen.none': 'None',
    'pane.gen.dropText': 'Generals export file (.json)',
    'pane.gen.dropHint': '💡 Export file from simulator at <a href="https://tsowiki.eu/simulator/" target="_blank" rel="noopener" style="color:#60a5fa; text-decoration:underline;">tsowiki.eu/simulator</a> (section «Generals» &rarr; «Export»).',
    'pane.gen.searchPlaceholder': 'Search general...',
    'gen.th.use': 'Use',
    'gen.th.name': 'Name',
    'gen.th.type': 'Type',
    'gen.th.capacity': 'Cap.',
    'gen.table.empty': 'Load generals export file from <a href="https://tsowiki.eu/simulator/" target="_blank" rel="noopener" style="color:#60a5fa; text-decoration:underline;">tsowiki.eu/simulator</a>',
    'gen.table.noMatch': 'No generals found',
    'gen.hint.loaded': 'Loaded: <b>{count}</b> generals. Capacity and skills included.',
    'gen.hint.error': 'Error: {msg}',

    // Pane 3: Troops & Garrison
    'pane.troops.title': 'Troops & Garrison',
    'pane.troops.presetElite': 'Elite',
    'pane.troops.presetAll': 'All',
    'unit.th.unit': 'Unit',
    'unit.th.use': 'Use',
    'unit.th.noLoss': 'No Loss',
    'unit.th.stock': 'Garrison',
    'unit.tooltip.noLoss.title': '«No Loss» Mode (noLoss)',
    'unit.tooltip.noLoss.body': 'Strictly protects this unit from any loss. The unit will never be used in a sacrificial opener wave and will only be deployed for guaranteed 100% victories with 0 losses.',
    'unit.tooltip.stock.title': 'Troop Garrison Limit',
    'unit.tooltip.stock.body': 'Maximum number of units available in the garrison across all generals in a single wave. Empty field = unlimited.',

    // Pane 4: Algorithm Settings
    'pane.settings.title': 'Algorithm Settings',
    'settings.genUsage.label': 'General usage mode',
    'settings.genUsage.tooltipTitle': 'General Usage Strategy',
    'settings.genUsage.tooltipMin': '<b>Minimum (conserve)</b> — Priority 1: troop and general preservation. Does not rush to clear all camps in one wave. Prioritizes the safest, lowest-cost lineups with minimal casualties (lostValue), avoiding risky opener wipes and 2-hour general cooldowns.',
    'settings.genUsage.tooltipMax': '<b>Maximum (speed)</b> — Priority 1: clear the maximum number of camps in parallel per wave to finish the adventure in minimal waves (e.g. 18 camps in 2 waves). Conserves generals on easy camps (solo) to deploy multi-general squads against bosses and fortified camps.',
    'settings.genUsage.min': 'Minimum (conserve)',
    'settings.genUsage.max': 'Maximum (speed)',

    'settings.lossAcc.label': 'Garrison loss deduction',
    'settings.lossAcc.tooltipTitle': 'Garrison Loss Deduction',
    'settings.lossAcc.tooltipMax': '<b>Worst-case (max)</b>: deducts maximum damage observed across all simulation runs. Guarantees the army will never run out of troops due to bad RNG.',
    'settings.lossAcc.tooltipAvg': '<b>Average (avg)</b>: deducts expected statistical average losses.',
    'settings.lossAcc.max': 'Worst-case (max)',
    'settings.lossAcc.avg': 'Average (avg)',

    'settings.sacrifice.label': 'Sacrificial armies (opener)',
    'settings.sacrifice.tooltipTitle': 'Sacrificial Armies',
    'settings.sacrifice.tooltipBody': '<b>Cheap</b>: only allows sacrificing cheap units (Recruits, Militia, Swordsmen, Knights). Units marked «no loss» are strictly forbidden.<br><br><b>Any</b>: allows any unprotected units.<br><br><b>Disable</b>: forbids attacks resulting in army wipeouts.',
    'settings.sacrifice.cheap': 'Cheap',
    'settings.sacrifice.any': 'Any',
    'settings.sacrifice.none': 'Disable',

    'settings.step.label': 'Composition step (%)',
    'settings.step.tooltipTitle': 'Composition Grid Step (%)',
    'settings.step.tooltipBody': 'Step size when iterating troop ratios in generals\' armies. For example, 10% tests compositions in increments of 10%, 20%, 30%...<br><br>10% offers the optimal balance of precision and speed.',

    'settings.reps.label': 'Screening reps',
    'settings.reps.tooltipTitle': 'Screening Simulations',
    'settings.reps.tooltipBody': 'Number of battle simulations during candidate screening. Quickly eliminates unviable compositions.',

    'settings.verify.label': 'Verification reps',
    'settings.verify.tooltipTitle': 'Verification Simulations',
    'settings.verify.tooltipBody': 'Number of verification simulations on the final winning army to guarantee 100% win rate and eliminate hidden defeat chances.',

    'settings.maxGen.label': 'Max generals per camp',
    'settings.maxGen.tooltipTitle': 'Max Generals in Squad',
    'settings.maxGen.tooltipBody': 'Limit the length of a general squad chain per camp. 0 = unlimited (as many as needed to clear the camp).',
    'settings.maxGen.hint': '0 = no limit (all generals)',

    'settings.beam.label': 'Beam width',
    'settings.beam.tooltipTitle': 'Beam Search Width',
    'settings.beam.tooltipBody': 'Number of best candidate armies retained for the next squad stage. Higher = wider and deeper search.',

    'settings.chain.label': 'Single army clears camps in sequence (chain)',
    'settings.chain.tooltipTitle': 'General Attack Chain',
    'settings.chain.tooltipBody': 'A general with a single army sequentially defeats multiple camps, keeping surviving troops from battle to battle.',

    // Sidebar Bottom Dock & Mobile Bottom Bar
    'dock.queue': 'Queue: <b id="dockQueueCount">{count}</b> camps',
    'dock.run': 'Calculate wave plan',
    'mobile.queue': 'Camps in queue: <b class="font-mono" id="mobileQueueCount">{count}</b>',
    'mobile.run': 'Calculate',

    // Empty State
    'empty.title': 'Ready for tactical calculation',
    'empty.desc': 'Unlike typical single-camp calculators, here you do not need to solve each camp individually: the system pools all generals and automatically assigns them across <b>all selected camps</b> at once.',
    'empty.step1': 'In the <b>Generals</b> tab, upload your JSON export file (exported from simulator at <a href="https://tsowiki.eu/simulator/" target="_blank" rel="noopener" style="color:#60a5fa; text-decoration:underline;">tsowiki.eu/simulator</a>)',
    'empty.step2': 'Select target camps in the <b>Camps</b> tab (single camp, sector, or the full adventure)',
    'empty.step3': 'Click <b>«Calculate wave plan»</b> to receive a complete, ready-to-use wave schedule',

    // Skeleton Loader
    'loader.title': 'Simulating battles & optimizing armies...',
    'loader.desc': 'Combat simulation and general wave assignment',
    'loader.timer': 'Time: {time}s',
    'loader.progress': 'Calculated {solved} of {total} camps ({pct}%)',
    'loader.campSearching': 'Solving camp {num}...',
    'loader.cancel': 'Cancel calculation',
    'loader.canceled': 'Calculation canceled by user',
    'calc.engine.worker': 'In browser (Web Worker, zero timeouts)',
    'calc.engine.server': 'On server',

    // Dashboard Results
    'result.title': 'Tactical Battle Plan',
    'result.subtitle': '{adv} · {camps} camps',
    'result.btnCopy': 'Copy plan',
    'result.btnCopyClient': 'Copy client script',
    'result.btnCopyWaveClient': 'Copy wave {num} for client',
    'result.bento.waves': 'Waves',
    'result.bento.lostValue': 'Lost value',
    'result.bento.lostUnits': 'Troop losses',
    'result.bento.unitsUnit': 'units',
    'result.bento.noLosses': 'No losses',
    'result.bento.generals': 'Generals deployed',
    'result.bento.calcTime': 'Calc time',
    'result.unlimited': 'unlimited',
    'result.recovery.title': 'Barracks Resource Recovery',
    'result.recovery.units': 'Casualties:',
    'result.recovery.resources': 'Resources needed to restock barracks:',
    'result.recovery.tooltip': '{count} {unit}: requires {res}',
    'result.error.title': 'Failed to build plan',
    'result.error.calcTitle': 'Calculation error',

    // Wave Cards
    'wave.badge': 'Wave {num}',
    'wave.campsParallel': '{count} camps simultaneously',
    'wave.stockBefore': 'Garrison before: {stock}',
    'wave.cooldown': '⏳ Cooldown 2h',
    'wave.cooldownDesc': '<b>{list}</b> (fallen and excluded from subsequent waves)',
    'wave.freeRevive': '✨ Free revive',
    'wave.freeReviveDesc': '<b>{list}</b> (revived via 1-UP / talent and ready for next wave)',
    'wave.stockAfter': 'Garrison remaining: {stock}',
    'wave.armiesUsed': 'Armies deployed: {stock}',
    'wave.lossesDeducted': 'Losses written off: {stock}',
    'wave.blocker': 'Wave ended: camp {num} — {reason} (requires squad of {need} gen.)',

    // Attack Cards
    'atk.camp': 'Camp {num}',
    'atk.sector': 'sector {num}',
    'atk.enemy': 'Enemies:',
    'atk.losses': 'Losses:',
    'atk.noLoss': 'no losses',
    'atk.lostNone': 'none',
    'atk.cost': 'cost: {cost}',
    'atk.victory': '100% Victory',
    'atk.soloNo': '(solo impossible)',
    'atk.sacrificeBadge': 'sacrifice',
    'atk.chainBadge': 'Chain {idx}/{total} ({path})',
    'atk.squadBadge': 'Squad ({count} gen.)',
    'atk.cap': 'cap. {cap}',
    'atk.killed': 'Defenders killed: <b>{count}</b>',
    'atk.rounds': 'Rounds: <b>{count}</b>',
    'atk.stepLosses': 'Losses: <b>{losses}</b>',
    'atk.badgeRevived': '✨ revived',
    'atk.badgeRevivedTip': 'Ghost / Narcissus revived for free',
    'atk.badgeCooldown': '⏳ cd 2h',
    'atk.badgeCooldownTip': 'Fallen: cooldown 2 hours',

    // Unsolved warning
    'unsolved.title': 'Unconquered camps remaining: {camps}',
    'unsolved.reason': 'Stop reason: {reason}',

    // Toasts & Alerts
    'toast.needGenerals': 'Please upload your generals file in the «Generals» tab',
    'toast.needCamps': 'Please select at least one camp to attack in the «Camps» tab',
    'toast.copied': 'Plan copied to clipboard!',
    'toast.copyFailed': 'Failed to copy plan to clipboard',
    'toast.clientCopied': 'Client attack script copied to clipboard!',
    'toast.clientWaveCopied': 'Wave {num} script copied for client!',
    'toast.jsonError': 'Error parsing generals JSON: {err}',

    // Roles
    'role.opener': 'opener',
    'role.finisher': 'finisher',
    'role.pusher': 'pusher',
    'role.solo': 'solo',
    'role.attack': 'attack',

    // Reasons
    'reason.stock': 'not enough restricted units in garrison',
    'reason.generals': 'no available generals of required capacity',
    'reason.both': 'both generals and unit garrison exhausted',

    // Clipboard plan text
    'plan.header': '=== BATTLE PLAN: {adv} ===',
    'plan.summary': 'Waves: {waves} | Lost value: {losses}',
    'plan.lossesSummary': 'Troop casualties: {units}',
    'plan.resourcesSummary': 'Resources needed to restock: {res}',
    'plan.waveHeader': '--- WAVE {wave} ({camps} camps) ---',
    'plan.cdLabel': '[Cooldown 2h]: {list}',
    'plan.reviveLabel': '[Free revive]: {list}',
    'plan.campHeader': '[Camp {num}] {type} (Sector {sector})',
    'plan.attackLine': '  {order}. {gen} ({role}): {army} [Losses: {losses}]',
    'plan.noLoss': 'no losses',
  },

  uk: {
    // Header & Navigation
    'app.title': 'TSO Adventure Planner',
    'app.badge': '',
    'nav.params': 'Параметри',
    'nav.results': 'Результати',

    // Sidebar Tabs
    'tab.camps': 'Табори',
    'tab.generals': 'Генерали',
    'tab.troops': 'Війська',
    'tab.settings': 'Точність',

    // Pane 1: Camps & Adventure
    'pane.camps.title': 'Пригода',
    'pane.camps.searchPlaceholder': 'Пошук пригоди...',
    'pane.camps.notFound': 'Пригод не знайдено',
    'pane.camps.reload': 'Оновити список пригод',
    'pane.camps.all': 'Всі по порядку',
    'pane.camps.clear': 'Очистити',
    'pane.camps.queueTitle': 'Черга атаки',
    'pane.camps.selected': '{count} обрано',
    'pane.camps.queueEmpty': 'Черга порожня — натисніть табори вище',
    'pane.camps.manual': 'Ввести номери вручну',
    'pane.camps.manualPlaceholder': 'наприклад: 1, 2, 3, 4, 5',
    'camp.legend.small': 'малий',
    'camp.legend.medium': 'середній',
    'camp.legend.large': 'великий',
    'camp.legend.boss': 'бос',
    'camp.tooltip': 'Табір {num} (Сектор {sector}, {type})\nВорогів ({total}): {enemies}',
    'camp.suffix': '{camps} таб.',
    'pane.camps.openMap': 'Карта',
    'mapModal.title': 'Карта пригоди',
    'mapModal.queueStatus': 'Черга: {selected} / {total} таборів',
    'mapModal.all': 'Всі по порядку',
    'mapModal.clear': 'Очистити',
    'mapModal.close': 'Готово',
    'mapModal.zoomIn': 'Збільшити',
    'mapModal.zoomOut': 'Зменшити',
    'mapModal.zoomReset': 'Скинути масштаб',
    'mapModal.statusSelected': 'Обрано (#{order} у черзі) — натисніть, щоб видалити',
    'mapModal.statusUnselected': 'Не обрано — натисніть, щоб додати у чергу',
    'mapModal.loading': 'Завантаження карти...',
    'mapModal.loadError': 'Не вдалося завантажити карту.',

    // Pane 2: Generals
    'pane.gen.title': 'Завантаження генералів',
    'pane.gen.all': 'Всі',
    'pane.gen.none': 'Нікого',
    'pane.gen.dropText': 'Файл експорту генералів (.json)',
    'pane.gen.dropHint': '💡 Файл береться із симулятора на <a href="https://tsowiki.eu/simulator/" target="_blank" rel="noopener" style="color:#60a5fa; text-decoration:underline;">tsowiki.eu/simulator</a> (розділ «Генерали» &rarr; «Експорт»).',
    'pane.gen.searchPlaceholder': 'Пошук генерала...',
    'gen.th.use': 'Вик.',
    'gen.th.name': 'Ім\'я',
    'gen.th.type': 'Тип',
    'gen.th.capacity': 'Містк.',
    'gen.table.empty': 'Завантажте файл експорту генералів з <a href="https://tsowiki.eu/simulator/" target="_blank" rel="noopener" style="color:#60a5fa; text-decoration:underline;">tsowiki.eu/simulator</a>',
    'gen.table.noMatch': 'Нічого не знайдено',
    'gen.hint.loaded': 'Завантажено: <b>{count}</b> генералів. Місткість та навички враховано.',
    'gen.hint.error': 'Помилка: {msg}',

    // Pane 3: Troops & Garrison
    'pane.troops.title': 'Війська та гарнізон',
    'pane.troops.presetElite': 'Елітні',
    'pane.troops.presetAll': 'Всі',
    'unit.th.unit': 'Юніт',
    'unit.th.use': 'Вик.',
    'unit.th.noLoss': 'Без втрат',
    'unit.th.stock': 'Гарнізон',
    'unit.tooltip.noLoss.title': 'Режим «Без втрат» (noLoss)',
    'unit.tooltip.noLoss.body': 'Суворо захищає юніта від будь-яких втрат. Юніт ніколи не потрапить у жертовну хвилю відкриття і буде використовуватися лише за гарантованої 100% перемоги з 0 втрат.',
    'unit.tooltip.stock.title': 'Ліміт гарнізону військ',
    'unit.tooltip.stock.body': 'Максимальна кількість юнітів, доступних у гарнізоні для всіх генералів однієї хвилі. Порожнє поле = без обмежень.',

    // Pane 4: Algorithm Settings
    'pane.settings.title': 'Параметри алгоритму',
    'settings.genUsage.label': 'Режим генералів',
    'settings.genUsage.tooltipTitle': 'Стратегія використання генералів',
    'settings.genUsage.tooltipMin': '<b>Мінімум (берегти)</b> — пріоритет №1: збереження генералів та військ. Алгоритм не прагне зачистити всі табори за одну хвилю будь-якою ціною. Обираються найбільш надійні та дешеві склади з мінімальними втратами (lostValue). Виключаються зайві жертви та ризик 2-годинного відкату генералів.',
    'settings.genUsage.tooltipMax': '<b>Максимум (швидкість)</b> — пріоритет №1: знищити максимум таборів паралельно за одну хвилю і мінімізувати число хвиль у пригоді (наприклад, пройти всю мапу за 2 хвилі). Заощаджує генералів на легких таборах (соло), щоб сформувати потужні ударні загони (squads) для босів.',
    'settings.genUsage.min': 'Мінімум (берегти)',
    'settings.genUsage.max': 'Максимум (швидкість)',

    'settings.lossAcc.label': 'Списання втрат з гарнізону',
    'settings.lossAcc.tooltipTitle': 'Списання втрат з гарнізону',
    'settings.lossAcc.tooltipMax': '<b>За найгіршим (max)</b>: списує максимальну шкоду з усіх прогонів симулятора. Гарантує, що армія не залишиться без військ при невдалому рандомі.',
    'settings.lossAcc.tooltipAvg': '<b>За середнім (avg)</b>: списує середнє маточікування втрат.',
    'settings.lossAcc.max': 'За гіршим (max)',
    'settings.lossAcc.avg': 'За середнім (avg)',

    'settings.sacrifice.label': 'Жертовні армії (відкриття)',
    'settings.sacrifice.tooltipTitle': 'Жертовні армії',
    'settings.sacrifice.tooltipBody': '<b>Дешеві</b>: дозволяє жертвувати на відкритті лише дешевими військами (Новобранці, Ополчення, Мечники, Лицарі). Юніти «без втрат» заборонені.<br><br><b>Будь-які</b>: дозволяє будь-які незахищені війська.<br><br><b>Заборонити</b>: забороняє атаки із загибеллю армії.',
    'settings.sacrifice.cheap': 'Дешеві',
    'settings.sacrifice.any': 'Будь-які',
    'settings.sacrifice.none': 'Заборонити',

    'settings.step.label': 'Крок складу (%)',
    'settings.step.tooltipTitle': 'Крок сітки складу (%)',
    'settings.step.tooltipBody': 'Крок перебору часток військ в армії генерала. Наприклад, 10% перебирає склад із кроком 10%, 20%, 30%...<br><br>10% — оптимальний баланс високої точності та швидкості.',

    'settings.reps.label': 'Прогонів (відбір)',
    'settings.reps.tooltipTitle': 'Прогонів при відборі',
    'settings.reps.tooltipBody': 'Кількість симуляцій бою при первинному скринінгу кандидатів. Швидко відсіває нежиттєздатні склади.',

    'settings.verify.label': 'Прогонів (перевірка)',
    'settings.verify.tooltipTitle': 'Прогонів при перевірці',
    'settings.verify.tooltipBody': 'Кількість перевірочних симуляцій фінальної переможної армії для гарантії 100% перемоги та відсутності прихованих шансів програти.',

    'settings.maxGen.label': 'Макс. генералів на табір',
    'settings.maxGen.tooltipTitle': 'Макс. генералів у загоні',
    'settings.maxGen.tooltipBody': 'Обмеження розміру ланцюжка генералів на один табір. 0 = без обмежень (скільки необхідно для взяття табору).',
    'settings.maxGen.hint': '0 = без ліміту (всі генерали)',

    'settings.beam.label': 'Ширина променя (beam)',
    'settings.beam.tooltipTitle': 'Ширина променевого пошуку',
    'settings.beam.tooltipBody': 'Кількість найкращих проміжних армій, які передаються на наступний етап складання загону. Більше = ширший пошук.',

    'settings.chain.label': 'Одна армія бере табори поспіль (ланцюжок)',
    'settings.chain.tooltipTitle': 'Ланцюжок атак одним генералом',
    'settings.chain.tooltipBody': 'Генерал з однією армією послідовно зачищає кілька таборів поспіль, зберігаючи вцілілих юнітів від бою до бою.',

    // Sidebar Bottom Dock & Mobile Bottom Bar
    'dock.queue': 'Черга: <b id="dockQueueCount">{count}</b> таб.',
    'dock.run': 'Розрахувати план хвиль',
    'mobile.queue': 'Таборів у черзі: <b class="font-mono" id="mobileQueueCount">{count}</b>',
    'mobile.run': 'Розрахувати',

    // Empty State
    'empty.title': 'Готовий до розрахунку тактики',
    'empty.desc': 'На відміну від звичайних симуляторів, тут не потрібно рахувати кожен табір окремо: система об\'єднує всіх генералів і автоматично розподіляє їх по <b>всіх обраних таборах</b> одразу.',
    'empty.step1': 'У вкладці <b>Генерали</b> завантажте JSON-файл (експорт із симулятора на <a href="https://tsowiki.eu/simulator/" target="_blank" rel="noopener" style="color:#60a5fa; text-decoration:underline;">tsowiki.eu/simulator</a>)',
    'empty.step2': 'Відзначте потрібні табори у вкладці <b>Табори</b> (один табір, сектор або всю пригоду)',
    'empty.step3': 'Натисніть <b>«Розрахувати план хвиль»</b> — отримайте готовий розклад атак по хвилях',

    // Skeleton Loader
    'loader.title': 'Триває симуляція та підбір армій...',
    'loader.desc': 'Розрахунок боїв та розподіл генералів',
    'loader.timer': 'Час: {time}s',
    'loader.progress': 'Розраховано {solved} з {total} таборів ({pct}%)',
    'loader.campSearching': 'Підбір армії для табору {num}...',
    'loader.cancel': 'Скасувати розрахунок',
    'loader.canceled': 'Розрахунок скасовано користувачем',
    'calc.engine.worker': 'У браузері (Web Worker, без таймаутів)',
    'calc.engine.server': 'На сервері',

    // Dashboard Results
    'result.title': 'Тактичний план бою',
    'result.subtitle': '{adv} · {camps} таборів',
    'result.btnCopy': 'Скопіювати план',
    'result.btnCopyClient': 'Копіювати для клієнта',
    'result.btnCopyWaveClient': 'Копіювати хвилю {num} для клієнта',
    'result.bento.waves': 'Хвиль',
    'result.bento.lostValue': 'Вартість втрат',
    'result.bento.lostUnits': 'Втрати військ',
    'result.bento.unitsUnit': 'юн.',
    'result.bento.noLosses': 'Без втрат',
    'result.bento.generals': 'Генералів задіяно',
    'result.bento.calcTime': 'Час розрахунку',
    'result.unlimited': 'без обмежень',
    'result.recovery.title': 'Ресурси на відновлення (Казарма)',
    'result.recovery.units': 'Втрачені війська:',
    'result.recovery.resources': 'Необхідно для найму в казармі:',
    'result.recovery.tooltip': '{count} {unit}: потрібно {res}',
    'result.error.title': 'Не вдалося побудувати план',
    'result.error.calcTitle': 'Помилка розрахунку',

    // Wave Cards
    'wave.badge': 'Хвиля {num}',
    'wave.campsParallel': '{count} таборів одночасно',
    'wave.stockBefore': 'Гарнізон до: {stock}',
    'wave.cooldown': '⏳ Відкат 2 години',
    'wave.cooldownDesc': '<b>{list}</b> (загинули та вибули з наступних хвиль)',
    'wave.freeRevive': '✨ Безкоштовне воскресіння',
    'wave.freeReviveDesc': '<b>{list}</b> (воскресли за властивістю 1-UP / навичкою і готові до наступної хвилі)',
    'wave.stockAfter': 'Залишок у гарнізоні: {stock}',
    'wave.armiesUsed': 'Виведено армій: {stock}',
    'wave.lossesDeducted': 'Списано втрат: {stock}',
    'wave.blocker': 'Хвиля завершена: табір {num} — {reason} (потрібен загін з {need} ген.)',

    // Attack Cards
    'atk.camp': 'Табір {num}',
    'atk.sector': 'сектор {num}',
    'atk.enemy': 'Супротивник:',
    'atk.losses': 'Втрати:',
    'atk.noLoss': 'без втрат',
    'atk.lostNone': 'немає',
    'atk.cost': 'вартість: {cost}',
    'atk.victory': 'Перемога 100%',
    'atk.soloNo': '(соло неможливо)',
    'atk.sacrificeBadge': 'жертва',
    'atk.chainBadge': 'Ланцюжок {idx}/{total} ({path})',
    'atk.squadBadge': 'Загін ({count} ген.)',
    'atk.cap': 'містк. {cap}',
    'atk.killed': 'Знищено у таборі: <b>{count}</b>',
    'atk.rounds': 'Раундів: <b>{count}</b>',
    'atk.stepLosses': 'Втрати: <b>{losses}</b>',
    'atk.badgeRevived': '✨ воскрес',
    'atk.badgeRevivedTip': 'Примарний / Нарцис воскрес безкоштовно',
    'atk.badgeCooldown': '⏳ відкат 2г',
    'atk.badgeCooldownTip': 'Загинув: відкат 2 години',

    // Unsolved warning
    'unsolved.title': 'Залишилися не взятими табори: {camps}',
    'unsolved.reason': 'Причина зупинки: {reason}',

    // Toasts & Alerts
    'toast.needGenerals': 'Завантажте файл генералів у вкладці «Генерали»',
    'toast.needCamps': 'Оберіть хоча б один табір для атаки у вкладці «Табори»',
    'toast.copied': 'План скопійовано в буфер обміну!',
    'toast.copyFailed': 'Не вдалося скопіювати план',
    'toast.clientCopied': 'Скрипт атак для клієнта скопійовано!',
    'toast.clientWaveCopied': 'Скрипт хвилі {num} для клієнта скопійовано!',
    'toast.jsonError': 'Помилка читання JSON генералів: {err}',

    // Roles
    'role.opener': 'відкриття',
    'role.finisher': 'добивання',
    'role.pusher': 'продавлювання',
    'role.solo': 'соло',
    'role.attack': 'атака',

    // Reasons
    'reason.stock': 'не вистачає юнітів у гарнізоні',
    'reason.generals': 'немає вільних генералів потрібної місткості',
    'reason.both': 'вичерпано генералів та гарнізон військ',

    // Clipboard plan text
    'plan.header': '=== ПЛАН БОЮ: {adv} ===',
    'plan.summary': 'Хвиль: {waves} | Втрати: {losses}',
    'plan.lossesSummary': 'Втрати військ: {units}',
    'plan.resourcesSummary': 'Ресурси на відновлення: {res}',
    'plan.waveHeader': '--- ХВИЛЯ {wave} ({camps} таб.) ---',
    'plan.cdLabel': '[Відкат 2г]: {list}',
    'plan.reviveLabel': '[Безкоштовне воскресіння]: {list}',
    'plan.campHeader': '[Табір {num}] {type} (Сектор {sector})',
    'plan.attackLine': '  {order}. {gen} ({role}): {army} [Втрати: {losses}]',
    'plan.noLoss': 'без втрат',
  },

  ru: {
    // Header & Navigation
    'app.title': 'TSO Adventure Planner',
    'app.badge': '',
    'nav.params': 'Параметры',
    'nav.results': 'Результат',

    // Sidebar Tabs
    'tab.camps': 'Лагеря',
    'tab.generals': 'Генералы',
    'tab.troops': 'Войска',
    'tab.settings': 'Точность',

    // Pane 1: Camps & Adventure
    'pane.camps.title': 'Приключение',
    'pane.camps.searchPlaceholder': 'Поиск приключения...',
    'pane.camps.notFound': 'Приключения не найдены',
    'pane.camps.reload': 'Обновить список приключений',
    'pane.camps.all': 'Все по порядку',
    'pane.camps.clear': 'Очистить',
    'pane.camps.queueTitle': 'Очередь атаки',
    'pane.camps.selected': '{count} выбрано',
    'pane.camps.queueEmpty': 'Очередь пуста — нажмите лагеря выше',
    'pane.camps.manual': 'Ввести номера вручную',
    'pane.camps.manualPlaceholder': 'например: 1, 2, 3, 4, 5',
    'camp.legend.small': 'малый',
    'camp.legend.medium': 'средний',
    'camp.legend.large': 'большой',
    'camp.legend.boss': 'босс',
    'camp.tooltip': 'Лагерь {num} (Сектор {sector}, {type})\nВрагов ({total}): {enemies}',
    'camp.suffix': '{camps} лаг.',
    'pane.camps.openMap': 'Карта',
    'mapModal.title': 'Карта приключения',
    'mapModal.queueStatus': 'Очередь: {selected} / {total} лагерей',
    'mapModal.all': 'Все по порядку',
    'mapModal.clear': 'Очистить',
    'mapModal.close': 'Готово',
    'mapModal.zoomIn': 'Приблизить',
    'mapModal.zoomOut': 'Отдалить',
    'mapModal.zoomReset': 'Сбросить масштаб',
    'mapModal.statusSelected': 'Выбран (#{order} в очереди) — нажмите, чтобы удалить',
    'mapModal.statusUnselected': 'Не выбран — нажмите, чтобы добавить в очередь',
    'mapModal.loading': 'Загрузка карты...',
    'mapModal.loadError': 'Не удалось загрузить карту.',

    // Pane 2: Generals
    'pane.gen.title': 'Загрузка генералов',
    'pane.gen.all': 'Все',
    'pane.gen.none': 'Никого',
    'pane.gen.dropText': 'Файл экспорта генералов (.json)',
    'pane.gen.dropHint': '💡 Файл берётся из симулятора на <a href="https://tsowiki.eu/simulator/" target="_blank" rel="noopener" style="color:#60a5fa; text-decoration:underline;">tsowiki.eu/simulator</a> (раздел «Генералы» &rarr; «Экспорт»).',
    'pane.gen.searchPlaceholder': 'Поиск генерала...',
    'gen.th.use': 'Исп.',
    'gen.th.name': 'Имя',
    'gen.th.type': 'Тип',
    'gen.th.capacity': 'Вмест.',
    'gen.table.empty': 'Загрузите файл экспорта генералов с <a href="https://tsowiki.eu/simulator/" target="_blank" rel="noopener" style="color:#60a5fa; text-decoration:underline;">tsowiki.eu/simulator</a>',
    'gen.table.noMatch': 'Ничего не найдено',
    'gen.hint.loaded': 'Загружено: <b>{count}</b> генералов. Вместимость и навыки учтены.',
    'gen.hint.error': 'Ошибка: {msg}',

    // Pane 3: Troops & Garrison
    'pane.troops.title': 'Войска и гарнизон',
    'pane.troops.presetElite': 'Элитные',
    'pane.troops.presetAll': 'Все',
    'unit.th.unit': 'Юнит',
    'unit.th.use': 'Исп.',
    'unit.th.noLoss': 'Без потерь',
    'unit.th.stock': 'Гарнизон',
    'unit.tooltip.noLoss.title': 'Режим «Без потерь» (noLoss)',
    'unit.tooltip.noLoss.body': 'Строго защищает юнита от любых потерь. Юнит никогда не попадёт во вскрывающую/жертвенную волну и будет использоваться только при гарантированной 100% победе с 0 потерь.',
    'unit.tooltip.stock.title': 'Лимит гарнизона войск',
    'unit.tooltip.stock.body': 'Максимальное количество юнитов, доступных в гарнизоне суммарно для всех генералов одной волны. Пустое поле = без ограничений.',

    // Pane 4: Algorithm Settings
    'pane.settings.title': 'Параметры алгоритма',
    'settings.genUsage.label': 'Режим генералов',
    'settings.genUsage.tooltipTitle': 'Стратегия использования генералов',
    'settings.genUsage.tooltipMin': '<b>Минимум (беречь)</b> — приоритет №1: максимальное сбережение генералов и войск. Алгоритм не пытается взять все лагеря за одну волну любой ценой. Подбираются самые надёжные и дешёвые составы с минимальной стоимостью потерь (lostValue). Исключаются лишние жертвенные атаки и риски отправки генералов на 2-часовой откат.',
    'settings.genUsage.tooltipMax': '<b>Максимум (скорость)</b> — приоритет №1: уничтожить максимальное число лагерей параллельно за одну волну, чтобы сократить общее число волн в приключении (например, закрыть 18 лагерей всего за 2 волны). На простых лагерях генералы экономятся (соло), высвобождая ударные связки (squads) для боссов и сложных лагерей.',
    'settings.genUsage.min': 'Минимум (беречь)',
    'settings.genUsage.max': 'Максимум (скорость)',

    'settings.lossAcc.label': 'Списание потерь из гарнизона',
    'settings.lossAcc.tooltipTitle': 'Списание потерь из гарнизона',
    'settings.lossAcc.tooltipMax': '<b>По худшему (max)</b>: списывает максимальный урон из всех прогонов симулятора. Гарантирует, что армия не останется без войск при неудачном рандоме.',
    'settings.lossAcc.tooltipAvg': '<b>По среднему (avg)</b>: списывает среднее матожидание потерь.',
    'settings.lossAcc.max': 'По худшему (max)',
    'settings.lossAcc.avg': 'По среднему (avg)',

    'settings.sacrifice.label': 'Жертвенные армии (вскрытие)',
    'settings.sacrifice.tooltipTitle': 'Жертвенные армии',
    'settings.sacrifice.tooltipBody': '<b>Дешёвые</b>: разрешает жертвовать на вскрытии только дешёвыми войсками (Новобранцы, Ополчение, Мечники, Рыцари). Юниты «без потерь» запрещены.<br><br><b>Любые</b>: разрешает любые незащищённые войска.<br><br><b>Запретить</b>: запрещает атаки с гибелью армии.',
    'settings.sacrifice.cheap': 'Дешёвые',
    'settings.sacrifice.any': 'Любые',
    'settings.sacrifice.none': 'Запретить',

    'settings.step.label': 'Шаг состава (%)',
    'settings.step.tooltipTitle': 'Шаг сетки состава (%)',
    'settings.step.tooltipBody': 'Шаг перебора долей войск в армии генерала. Например, 10% перебирает состав с шагом 10%, 20%, 30%...<br><br>10% — оптимальный баланс высокой точности и скорости.',

    'settings.reps.label': 'Прогонов (отбор)',
    'settings.reps.tooltipTitle': 'Прогонов при отборе',
    'settings.reps.tooltipBody': 'Количество симуляций боя при первичном скрининге кандидатов. Быстро отсеивает нежизнеспособные составы.',

    'settings.verify.label': 'Прогонов (проверка)',
    'settings.verify.tooltipTitle': 'Прогонов при проверке',
    'settings.verify.tooltipBody': 'Количество проверочных симуляций финальной победной армии для гарантии 100% победы и отсутствия скрытых шансов проиграть.',

    'settings.maxGen.label': 'Макс. генералов на лагерь',
    'settings.maxGen.tooltipTitle': 'Макс. генералов в отряде',
    'settings.maxGen.tooltipBody': 'Ограничение размера цепочки генералов на один лагерь. 0 = без ограничений (сколько необходимо для взятия лагеря).',
    'settings.maxGen.hint': '0 = без лимита (все генералы)',

    'settings.beam.label': 'Ширина луча (beam)',
    'settings.beam.tooltipTitle': 'Ширина лучевого поиска',
    'settings.beam.tooltipBody': 'Количество лучших промежуточных армий, которые передаются на следующий этап составления отряда. Больше = шире поиск.',

    'settings.chain.label': 'Одна армия берёт лагеря подряд (цепочка)',
    'settings.chain.tooltipTitle': 'Цепочка атак одним генералом',
    'settings.chain.tooltipBody': 'Генерал с одной армией последовательно зачищает несколько лагерей подряд, сохраняя выживших юнитов от боя к бою.',

    // Sidebar Bottom Dock & Mobile Bottom Bar
    'dock.queue': 'Очередь: <b id="dockQueueCount">{count}</b> лаг.',
    'dock.run': 'Рассчитать план волн',
    'mobile.queue': 'Лагерей в очереди: <b class="font-mono" id="mobileQueueCount">{count}</b>',
    'mobile.run': 'Рассчитать',

    // Empty State
    'empty.title': 'Готов к расчёту тактики',
    'empty.desc': 'В отличие от обычных симуляторов, здесь не нужно считать каждый лагерь отдельно: система объединяет всех генералов и автоматически распределяет их по <b>всем выбранным лагерям</b> сразу.',
    'empty.step1': 'Во вкладке <b>Генералы</b> загрузите JSON-файл (экспорт из симулятора на <a href="https://tsowiki.eu/simulator/" target="_blank" rel="noopener" style="color:#60a5fa; text-decoration:underline;">tsowiki.eu/simulator</a>)',
    'empty.step2': 'Отметьте нужные лагеря во вкладке <b>Лагеря</b> (один лагерь, сектор или всё приключение)',
    'empty.step3': 'Нажмите <b>«Рассчитать план волн»</b> — получите готовое расписание атак по волнам',

    // Skeleton Loader
    'loader.title': 'Идёт симуляция и подбор армий...',
    'loader.desc': 'Расчёт боёв и распределение генералов',
    'loader.timer': 'Время: {time}s',
    'loader.progress': 'Рассчитано {solved} из {total} лагерей ({pct}%)',
    'loader.campSearching': 'Подбор армии для лагеря {num}...',
    'loader.cancel': 'Отменить расчет',
    'loader.canceled': 'Расчет отменен пользователем',
    'calc.engine.worker': 'В браузере (Web Worker, без таймаутов)',
    'calc.engine.server': 'На сервере',

    // Dashboard Results
    'result.title': 'Тактический план боя',
    'result.subtitle': '{adv} · {camps} лагерей',
    'result.btnCopy': 'Скопировать план',
    'result.btnCopyClient': 'Копировать для клиента',
    'result.btnCopyWaveClient': 'Копировать волну {num} для клиента',
    'result.bento.waves': 'Волн',
    'result.bento.lostValue': 'Стоимость потерь',
    'result.bento.lostUnits': 'Потери войск',
    'result.bento.unitsUnit': 'юн.',
    'result.bento.noLosses': 'Без потерь',
    'result.bento.generals': 'Генералов задействовано',
    'result.bento.calcTime': 'Время расчёта',
    'result.unlimited': 'без ограничений',
    'result.recovery.title': 'Ресурсы на восстановление потерь (Казарма)',
    'result.recovery.units': 'Потери войск:',
    'result.recovery.resources': 'Необходимо ресурсов для найма в казарме:',
    'result.recovery.tooltip': '{count} {unit}: требуется {res}',
    'result.error.title': 'Не удалось построить план',
    'result.error.calcTitle': 'Ошибка расчёта',

    // Wave Cards
    'wave.badge': 'Волна {num}',
    'wave.campsParallel': '{count} лагерей одновременно',
    'wave.stockBefore': 'Гарнизон до: {stock}',
    'wave.cooldown': '⏳ Откат 2 часа',
    'wave.cooldownDesc': '<b>{list}</b> (погибли и выбыли из следующих волн)',
    'wave.freeRevive': '✨ Бесплатный слив',
    'wave.freeReviveDesc': '<b>{list}</b> (воскресли по свойству 1-UP / навыку и готовы к следующей волне)',
    'wave.stockAfter': 'Остаток в гарнизоне: {stock}',
    'wave.armiesUsed': 'Выведено армий: {stock}',
    'wave.lossesDeducted': 'Списано потерь: {stock}',
    'wave.blocker': 'Волна завершена: лагерь {num} — {reason} (требуется отряд из {need} ген.)',

    // Attack Cards
    'atk.camp': 'Лагерь {num}',
    'atk.sector': 'сектор {num}',
    'atk.enemy': 'Противник:',
    'atk.losses': 'Потери:',
    'atk.noLoss': 'без потерь',
    'atk.lostNone': 'нет',
    'atk.cost': 'стоимость: {cost}',
    'atk.victory': 'Победа 100%',
    'atk.soloNo': '(соло невозможно)',
    'atk.sacrificeBadge': 'жертва',
    'atk.chainBadge': 'Цепочка {idx}/{total} ({path})',
    'atk.squadBadge': 'Отряд ({count} ген.)',
    'atk.cap': 'вмест. {cap}',
    'atk.killed': 'Убито в лагере: <b>{count}</b>',
    'atk.rounds': 'Раундов: <b>{count}</b>',
    'atk.stepLosses': 'Потери: <b>{losses}</b>',
    'atk.badgeRevived': '✨ воскрес',
    'atk.badgeRevivedTip': 'Призрачный / Нарцисс воскрес бесплатно',
    'atk.badgeCooldown': '⏳ откат 2ч',
    'atk.badgeCooldownTip': 'Погиб: откат 2 часа',

    // Unsolved warning
    'unsolved.title': 'Остались не взятыми лагеря: {camps}',
    'unsolved.reason': 'Причина остановки: {reason}',

    // Toasts & Alerts
    'toast.needGenerals': 'Загрузите файл генералов во вкладке «Генералы»',
    'toast.needCamps': 'Выберите хотя бы один лагерь для атаки во вкладке «Лагеря»',
    'toast.copied': 'План скопирован в буфер обмена!',
    'toast.copyFailed': 'Не удалось скопировать план',
    'toast.clientCopied': 'Скрипт атак для клиента скопирован в буфер обмена!',
    'toast.clientWaveCopied': 'Скрипт волны {num} для клиента скопирован в буфер обмена!',
    'toast.jsonError': 'Ошибка чтения JSON генералов: {err}',

    // Roles
    'role.opener': 'вскрытие',
    'role.finisher': 'добивание',
    'role.pusher': 'продавливание',
    'role.solo': 'соло',
    'role.attack': 'атака',

    // Reasons
    'reason.stock': 'не хватает юнитов в гарнизоне',
    'reason.generals': 'нет свободных генералов нужной вместимости',
    'reason.both': 'исчерпаны и генералы, и гарнизон войск',

    // Clipboard plan text
    'plan.header': '=== ПЛАН БОЯ: {adv} ===',
    'plan.summary': 'Волн: {waves} | Потери: {losses}',
    'plan.lossesSummary': 'Потери войск: {units}',
    'plan.resourcesSummary': 'Ресурсы на восстановление: {res}',
    'plan.waveHeader': '--- ВОЛНА {wave} ({camps} лаг.) ---',
    'plan.cdLabel': '[Откат 2ч]: {list}',
    'plan.reviveLabel': '[Бесплатное воскрешение]: {list}',
    'plan.campHeader': '[Лагерь {num}] {type} (Сектор {sector})',
    'plan.attackLine': '  {order}. {gen} ({role}): {army} [Потери: {losses}]',
    'plan.noLoss': 'без потерь',
  }
};

// Resources dictionary for troop recruitment in barracks
const RESOURCE_NAMES = {
  Settler: { en: 'Settler', uk: 'Поселенець', ru: 'Поселенец', icon: '🧑' },
  Brew: { en: 'Brew', uk: 'Квас', ru: 'Квас', icon: '🍺' },
  BronzeSword: { en: 'Bronze Sword', uk: 'Бронзовий меч', ru: 'Бронзовый меч', icon: '🗡️' },
  IronSword: { en: 'Iron Sword', uk: 'Залізний меч', ru: 'Железный меч', icon: '⚔️' },
  SteelSword: { en: 'Steel Sword', uk: 'Сталевий меч', ru: 'Стальной меч', icon: '⚔️' },
  DamasceneSword: { en: 'Damascene Sword', uk: 'Дамаський меч', ru: 'Дамасский меч', icon: '⚔️' },
  PlatinumSword: { en: 'Platinum Sword', uk: 'Платиновий меч', ru: 'Платиновый меч', icon: '⚔️' },
  Bow: { en: 'Bow', uk: 'Лук', ru: 'Лук', icon: '🏹' },
  Longbow: { en: 'Longbow', uk: 'Довгий лук', ru: 'Длинный лук', icon: '🏹' },
  Crossbow: { en: 'Crossbow', uk: 'Арбалет', ru: 'Арбалет', icon: '🎯' },
  Arquebus: { en: 'Arquebus', uk: 'Аркебуза', ru: 'Аркебуза', icon: '🔫' },
  Cannon: { en: 'Cannon', uk: 'Гармата', ru: 'Пушка', icon: '💣' },
  Mortar: { en: 'Mortar', uk: 'Мортира', ru: 'Мортира', icon: '💣' },
  Horse: { en: 'Horse', uk: 'Кінь', ru: 'Лошадь', icon: '🐴' },
  BattleHorse: { en: 'Battle Horse', uk: 'Бойовий кінь', ru: 'Боевой конь', icon: '🐎' },
  Gunpowder: { en: 'Gunpowder', uk: 'Порох', ru: 'Порох', icon: '💥' },
};

// Unit localized names dictionary (official The Settlers Online naming)
const UNIT_NAMES = {
  // Regular player units
  Recruit: { en: 'Recruit', uk: 'Новобранець', ru: 'Новобранец' },
  Militia: { en: 'Militia', uk: 'Ополчення', ru: 'Ополчение' },
  Soldier: { en: 'Soldier', uk: 'Солдат', ru: 'Солдат' },
  EliteSoldier: { en: 'Elite Soldier', uk: 'Елітний солдат', ru: 'Элитный солдат' },
  Cavalry: { en: 'Cavalry', uk: 'Кавалерія', ru: 'Кавалерия' },
  Bowman: { en: 'Bowman', uk: 'Лучник', ru: 'Лучник' },
  Longbowman: { en: 'Longbowman', uk: 'Стрілець із довгим луком', ru: 'Стрелок из длинного лука' },
  Crossbowman: { en: 'Crossbowman', uk: 'Арбалетник', ru: 'Арбалетчик' },
  Cannoneer: { en: 'Cannoneer', uk: 'Канонір', ru: 'Канонир' },

  // Elite player units
  Swordsman: { en: 'Swordsman', uk: 'Мечник', ru: 'Мечник' },
  MountedSwordsman: { en: 'Mounted Swordsman', uk: 'Кінний мечник', ru: 'Конный мечник' },
  Knight: { en: 'Knight', uk: 'Лицар', ru: 'Рыцарь' },
  Marksman: { en: 'Marksman', uk: 'Стрілець', ru: 'Стрелок' },
  ArmoredMarksman: { en: 'Armored Marksman', uk: 'Стрілець у броні', ru: 'Стрелок в броне' },
  MountedMarksman: { en: 'Mounted Marksman', uk: 'Кінний стрілець', ru: 'Конный стрелок' },
  Besieger: { en: 'Besieger', uk: 'Майстер облоги', ru: 'Мастер осады' },

  // Adventure enemy units & bosses (from original game references)
  'BanditBoss1': { en: 'Skunk', uk: 'Скунс', ru: 'Скунс' },
  'BanditBoss2': { en: 'One-Eyed Bert', uk: 'Одноокий Берт', ru: 'Одноглазый Берт' },
  'BanditBoss3': { en: 'Metal Tooth', uk: 'Фіксатий', ru: 'Фиксатый' },
  'BanditBoss4': { en: 'Chuck', uk: 'Чак', ru: 'Чак' },
  'BanditBoss5': { en: 'Wild Mary', uk: 'Дика Мері', ru: 'Дикая Мери' },
  'BanditBowman': { en: 'Stone Thrower', uk: 'Пращник', ru: 'Пращник' },
  'BanditCavalry': { en: 'Guard Dog', uk: 'Вартовий собака', ru: 'Сторожевая собака' },
  'BanditLongbowman': { en: 'Ranger', uk: 'Рейнджер', ru: 'Рейнджер' },
  'BanditMilitia': { en: 'Thug', uk: 'Головоріз', ru: 'Головорез' },
  'BanditRecruit': { en: 'Scavenger', uk: 'Старівник', ru: 'Старьевщик' },
  'BanditSoldier': { en: 'Roughneck', uk: 'Хуліган', ru: 'Хулиган' },
  'BirthdayShaman': { en: 'Mystical Shaman', uk: 'Містичний шаман', ru: 'Мистический шаман' },
  'BlondeBowman': { en: 'Blonde Bowman', uk: 'Лучник-блондин', ru: 'Лучник-блондин' },
  'ChristmasBoss1': { en: 'Croaker', uk: 'Ворчун', ru: 'Ворчун' },
  'ChristmasBoss1variant': { en: 'Croaker', uk: 'Ворчун', ru: 'Ворчун' },
  'ChristmasBossTwin1': { en: 'Ribbitha', uk: 'Квакша', ru: 'Квакша' },
  'ChristmasBossTwin2': { en: 'Ribbitha', uk: 'Квакша', ru: 'Квакша' },
  'ChristmasBossTwin3': { en: 'Ribbitha', uk: 'Квакша', ru: 'Квакша' },
  'ChupacabraBoss': { en: 'El Chupacabra', uk: 'Чупакабра', ru: 'Чупакабра' },
  'CultBoss1': { en: 'Witch of the Swamp', uk: 'Болотяна відьма', ru: 'Болотная ведьма' },
  'CultBoss2': { en: 'Dark High Priest', uk: 'Темный первосвященник', ru: 'Темный первосвященник' },
  'CultBoss3': { en: 'Spawn of Hell', uk: 'Исчадие ада', ru: 'Исчадие ада' },
  'CultBoss4': { en: 'Preacher of Flames', uk: 'Пламенная проповедница', ru: 'Пламенная проповедница' },
  'CultBowman': { en: 'Fanatic', uk: 'Фанатик', ru: 'Фанатик' },
  'CultCanoneer': { en: 'Dancing Dervish', uk: 'Пляшущий дервиш', ru: 'Пляшущий дервиш' },
  'CultCavalry': { en: 'Shadowsneaker', uk: 'Крадькома', ru: 'Крадущийся' },
  'CultCrossbowman': { en: 'Firedancer', uk: 'Танцор огня', ru: 'Танцор огня' },
  'CultLongbowman': { en: 'Dark Priest', uk: 'Темний священик', ru: 'Темный священник' },
  'CultRecruit': { en: 'Cultist', uk: 'Сектант', ru: 'Сектант' },
  'DarkLordBoss': { en: 'Dark Lord', uk: 'Темный повелитель', ru: 'Темный повелитель' },
  'Deer_Unit': { en: 'Deer', uk: 'Олень', ru: 'Олень' },
  'DefensiveMiner': { en: 'Defensive Miner', uk: 'Шахтер-защитник', ru: 'Шахтер-защитник' },
  'DragonBoss': { en: 'Ancient Dragon', uk: 'Древний дракон', ru: 'Древний дракон' },
  'EasterBoss1': { en: 'Garrun the Trapper', uk: 'Зверолов Гаррун', ru: 'Зверолов Гаррун' },
  'EasterBowman': { en: 'Rabbit Hunter', uk: 'Охотник на кроликов', ru: 'Охотник на кроликов' },
  'EasterCavalry': { en: 'Hound', uk: 'Гончая', ru: 'Гончая' },
  'EasterRecruit': { en: 'Lowly Poacher', uk: 'Трусливый браконьер', ru: 'Трусливый браконьер' },
  'EliteWildlifeAir': { en: 'Frost Eagle', uk: 'Снежный орел', ru: 'Снежный орел' },
  'EliteWildlifeBowman': { en: 'Frost Wolf', uk: 'Снежный волк', ru: 'Снежный волк' },
  'EliteWildlifeCannoneer': { en: 'Frost Giant', uk: 'Снежный великан', ru: 'Снежный великан' },
  'EliteWildlifeCavalry': { en: 'Frost Fox', uk: 'Снежный лис', ru: 'Снежный лис' },
  'EliteWildlifeLongbowman': { en: 'Frost Leopard', uk: 'Снежный леопард', ru: 'Снежный леопард' },
  'EliteWildlifeMilitia': { en: 'Frost Bear', uk: 'Снежный медведь', ru: 'Снежный медведь' },
  'EliteWildlifeRecruit': { en: 'Frost Ibex', uk: 'Снежный альпийский козел', ru: 'Снежный альпийский козел' },
  'EnemyCannoneer': { en: 'Cannoneer', uk: 'Канонир', ru: 'Канонир' },
  'EnemyCrossbowman': { en: 'Crossbowman', uk: 'Арбалетчик', ru: 'Арбалетчик' },
  'EnemyEliteSoldier': { en: 'Elite Soldier', uk: 'Элитный солдат', ru: 'Элитный солдат' },
  'EpicRaidBoss1': { en: 'Giant Bogor', uk: 'Великан Богор', ru: 'Великан Богор' },
  'EpicRaidBoss10': { en: 'Dark Magician', uk: 'Темный маг', ru: 'Темный маг' },
  'EpicRaidBoss11': { en: 'Lying Goat', uk: 'Лежащий козел', ru: 'Лежащий козел' },
  'EpicRaidBoss12': { en: 'Cudgel Claus', uk: 'Дед Дубина', ru: 'Дед Дубина' },
  'EpicRaidBoss13': { en: 'Assassin', uk: 'Убийца', ru: 'Убийца' },
  'EpicRaidBoss14': { en: 'Greedy Inn-Keeper', uk: 'Жадный трактирщик', ru: 'Жадный трактирщик' },
  'EpicRaidBoss2': { en: 'Giant Gogor', uk: 'Великан Гогор', ru: 'Великан Гогор' },
  'EpicRaidBoss3': { en: 'Unicorn', uk: 'Единорог', ru: 'Единорог' },
  'EpicRaidBoss4': { en: 'Furious Boar', uk: 'Бешеный кабан', ru: 'Бешеный кабан' },
  'EpicRaidBoss5': { en: 'Evil King', uk: 'Злой король', ru: 'Злой король' },
  'EpicRaidBoss6': { en: 'Iron Fist', uk: 'Железный кулак', ru: 'Железный кулак' },
  'EpicRaidBoss7': { en: 'Giant Bear', uk: 'Медведь-гигант', ru: 'Медведь-гигант' },
  'EpicRaidBoss8': { en: 'Rivaling Tailor', uk: 'Портной-конкурент', ru: 'Портной-конкурент' },
  'EpicRaidBoss9': { en: 'Black Bull', uk: 'Черный бык', ru: 'Черный бык' },
  'EpicRaidBossCaptain': { en: 'Royal Captain', uk: 'Королевский капитан', ru: 'Королевский капитан' },
  'EpicRaidBossEvilQueen': { en: 'Ilsebille, the Evil Queen', uk: 'Злая королева Ильзебиль', ru: 'Злая королева Ильзебиль' },
  'EpicRaidBossHuntsman': { en: 'Royal Huntsmen Leader', uk: 'Глава королевских охотников', ru: 'Глава королевских охотников' },
  'EpicRaidBossJuggernaut': { en: 'Royal Juggernaut', uk: 'Королевский крушитель', ru: 'Королевский крушитель' },
  'EpicRaidBossMayor': { en: 'The Mayor', uk: 'Мэр', ru: 'Мэр' },
  'EpicRaidBossPiper': { en: 'The Pied Piper of Hamelin', uk: 'Гамельнский крысолов', ru: 'Гамельнский крысолов' },
  'EpicRaidBossRatKing': { en: 'The King of Rats', uk: 'Крысиный король', ru: 'Крысиный король' },
  'EpicRaidBossStepmother': { en: 'The Evil Stepmother', uk: 'Злая мачеха', ru: 'Злая мачеха' },
  'EpicRaidKingdomBowman': { en: 'Royal Bowman', uk: 'Королевский лучник', ru: 'Королевский лучник' },
  'EpicRaidKingdomCannoneer': { en: 'Royal Cannoneer', uk: 'Королевский канонир', ru: 'Королевский канонир' },
  'EpicRaidKingdomCavalry': { en: 'Royal Cavalry', uk: 'Королевская кавалерия', ru: 'Королевская кавалерия' },
  'EpicRaidKingdomLongbowman': { en: 'Royal Longbowman', uk: 'Королевский стрелок из длинного лука', ru: 'Королевский стрелок из длинного лука' },
  'EpicRaidKingdomMilitia': { en: 'Royal Militia', uk: 'Королевское ополчение', ru: 'Королевское ополчение' },
  'EpicRaidKingdomRecruit': { en: 'Royal Recruit', uk: 'Королевский новобранец', ru: 'Королевский новобранец' },
  'FirmDefender': { en: 'Firm Defender', uk: 'Непреклонный защитник', ru: 'Непреклонный защитник' },
  'GoldenGuard': { en: 'Golden Guard', uk: 'Золотой страж', ru: 'Золотой страж' },
  'KingdomBoss1': { en: 'Sir Robin', uk: 'Сэр Робин', ru: 'Сэр Робин' },
  'KingdomBoss2': { en: 'Big Bertha', uk: 'Большая Берта', ru: 'Большая Берта' },
  'KingdomBowman': { en: 'Bowman Deserter', uk: 'Лучник-дезертир', ru: 'Лучник-дезертир' },
  'KingdomCannoneer': { en: 'Cannoneer Deserter', uk: 'Канонир-дезертир', ru: 'Канонир-дезертир' },
  'KingdomCavalry': { en: 'Cavalry Deserter', uk: 'Кавалерист-дезертир', ru: 'Кавалерист-дезертир' },
  'KingdomCrossbowman': { en: 'Crossbowman Deserter', uk: 'Арбалетчик-дезертир', ru: 'Арбалетчик-дезертир' },
  'KingdomEliteSoldier': { en: 'Elite Soldier Deserter', uk: 'Элитный солдат-дезертир', ru: 'Элитный солдат-дезертир' },
  'KingdomLongbowman': { en: 'Longbowman Deserter', uk: 'Лучник-дезертир', ru: 'Лучник-дезертир' },
  'KingdomMilitia': { en: 'Militia Deserter', uk: 'Ополченец-дезертир', ru: 'Ополченец-дезертир' },
  'KingdomRecruit': { en: 'Recruit Deserter', uk: 'Новобранец-дезертир', ru: 'Новобранец-дезертир' },
  'KingdomSoldier': { en: 'Soldier Deserter', uk: 'Солдат-дезертир', ru: 'Солдат-дезертир' },
  'MadScientistBoss': { en: 'Mad Scientist', uk: 'Безумный ученый', ru: 'Безумный ученый' },
  'MayaCanoneer': { en: 'Jaguar Warrior', uk: 'Воин-ягуар', ru: 'Воин-ягуар' },
  'MayaCavalry': { en: 'Shaman', uk: 'Шаман', ru: 'Шаман' },
  'MayaRecruit': { en: 'Tribesman', uk: 'Член племени', ru: 'Член племени' },
  'MiniGolemCannoneer': { en: 'Miniature Lava Golem', uk: 'Миниатюрный лавовый голем', ru: 'Миниатюрный лавовый голем' },
  'MiniGolemCavalry': { en: 'Miniature Ice Golem', uk: 'Миниатюрный ледяной голем', ru: 'Миниатюрный ледяной голем' },
  'MiniGolemMilitia': { en: 'Miniature Rock Golem', uk: 'Миниатюрный каменный голем', ru: 'Миниатюрный каменный голем' },
  'MiniGolemRecruit': { en: 'Miniature Clay Golem', uk: 'Миниатюрный глиняный голем', ru: 'Миниатюрный глиняный голем' },
  'NeutralCavalry': { en: 'Grey Wolf', uk: 'Серый Волк', ru: 'Серый Волк' },
  'NordsBowman': { en: 'Valkyrie', uk: 'Валькірія', ru: 'Валькирия' },
  'NordsCanoneer': { en: 'Berserk', uk: 'Берсерк', ru: 'Берсерк' },
  'NordsEliteSoldier': { en: 'Jomsviking', uk: 'Йомсвікінг', ru: 'Йомсвикинг' },
  'NordsMilitia': { en: 'Karl', uk: 'Карл', ru: 'Карл' },
  'NordsRecruit': { en: 'Thrall', uk: 'Невільник', ru: 'Невольник' },
  'NordsSoldier': { en: 'Housecarl', uk: 'Хускерл', ru: 'Хускерл' },
  'OrientalApe1': { en: 'Stick-wielding Ape', uk: 'Обезьяна с палкой', ru: 'Обезьяна с палкой' },
  'OrientalApe2': { en: 'Stone-throwing Ape', uk: 'Обезьяна с камнями', ru: 'Обезьяна с камнями' },
  'OrientalApe3': { en: 'Alpha Ape', uk: 'Мавпа-ватажок', ru: 'Обезьяна-вожак' },
  'OrientalApe4': { en: 'Nervous Ape', uk: 'Неспокійна мавпа', ru: 'Беспокойная обезьяна' },
  'OrientalBanditBoss1': { en: 'Shrewd Thief', uk: 'Вправний розбійник', ru: 'Искусный разбойник' },
  'OrientalBanditBoss10': { en: 'Silly Thief', uk: 'Дурний розбійник', ru: 'Глупый разбойник' },
  'OrientalBanditBoss2': { en: 'Smart Thief', uk: 'Хитромудрий розбійник', ru: 'Хитроумный разбойник' },
  'OrientalBanditBoss3': { en: 'Mysterious Thief', uk: 'Загадковий розбійник', ru: 'Загадочный разбойник' },
  'OrientalBanditBoss4': { en: 'Treacherous Thief', uk: 'Підступний розбійник', ru: 'Коварный разбойник' },
  'OrientalBanditBoss5': { en: 'Snooty Thief', uk: 'Пихатий розбійник', ru: 'Высокомерный разбойник' },
  'OrientalBanditBoss6': { en: 'Grayed Thief', uk: 'Сірий розбійник', ru: 'Серый разбойник' },
  'OrientalBanditBoss7': { en: 'Sneaking Thief', uk: 'Причаєний розбійник', ru: 'Таящийся разбойник' },
  'OrientalBanditBoss8': { en: 'Scarred Thief', uk: 'Матерій розбійник', ru: 'Матерый разбойник' },
  'OrientalBanditBoss9': { en: 'Greedy Thief', uk: 'Жадібний розбійник', ru: 'Жадный разбойник' },
  'OrientalBanditBowman': { en: 'Dune Marksman', uk: 'Стрілець дюн', ru: 'Стрелок дюн' },
  'OrientalBanditCanoneer': { en: 'Stone Cannon', uk: 'Кам\'яна гармата', ru: 'Каменное орудие' },
  'OrientalBanditCavalry': { en: 'Horseman', uk: 'Вершник', ru: 'Всадник' },
  'OrientalBanditCavalryBowman': { en: 'Mounted Bowman', uk: 'Кінний лучник', ru: 'Конный лучник' },
  'OrientalBanditLongbowman': { en: 'Desert Marksman', uk: 'Пустельний стрілець', ru: 'Пустынный стрелок' },
  'OrientalBanditLord': { en: 'Bandit Lord', uk: 'Володар розбійників', ru: 'Повелитель разбойников' },
  'OrientalBanditMilitia': { en: 'Sword Wielder', uk: 'Знавець меча', ru: 'Знаток меча' },
  'OrientalBanditRecruit': { en: 'Sword Clasher', uk: 'Рубака на мечах', ru: 'Рубака на мечах' },
  'OrientalBanditSoldier': { en: 'Sword Master', uk: 'Майстер меча', ru: 'Мастер меча' },
  'OrientalBolderWorm': { en: 'Boulder Worm', uk: 'Валунний черв', ru: 'Валунный червь' },
  'OrientalCannonTower1': { en: 'Giant Cannon', uk: 'Величезна гармата', ru: 'Огромная пушка' },
  'OrientalCorruptedBolderWorm': { en: 'Corrupted Boulder Worm', uk: 'Проклятий валунний черв', ru: 'Проклятый валунный червь' },
  'OrientalCorruptedGiantBat': { en: 'Corrupted Giant Bat', uk: 'Проклятий велетенський кажан', ru: 'Проклятый огромный нетопырь' },
  'OrientalCrumpyParrot': { en: 'Grumpy Parrot', uk: 'Сердитий папуга', ru: 'Сердитый попугай' },
  'OrientalGiantBat': { en: 'Giant Bat', uk: 'Велетенський кажан', ru: 'Огромный нетопырь' },
  'OrientalGiantBlossom1': { en: 'Hungry Blossom', uk: 'Голодна квітка', ru: 'Голодный цветок' },
  'OrientalGiantBlossom2': { en: 'Fierce Blossom', uk: 'Люта квітка', ru: 'Свирепый цветок' },
  'OrientalGiantBlossom3': { en: 'Bulbous Blossom', uk: 'Округла квітка', ru: 'Округлый цветок' },
  'OrientalGiantSeaSnake': { en: 'Giant Sea Snake', uk: 'Велетенський морський змій', ru: 'Огромный морской змей' },
  'OrientalGuard1': { en: 'Grumpy Guard', uk: 'Сердитий страж', ru: 'Сердитый страж' },
  'OrientalGuard2': { en: 'Insane Guard', uk: 'Божевільний страж', ru: 'Безумный страж' },
  'OrientalInformant': { en: 'Informant', uk: 'Донощик', ru: 'Доносчик' },
  'OrientalLibraryBoss': { en: 'Library Golem', uk: 'Бібліотечний голем', ru: 'Библиотечный голем' },
  'OrientalOasisGuardian': { en: 'Oasis Guardian', uk: 'Вартовий оазису', ru: 'Страж оазиса' },
  'OrientalSailorBoss1': { en: 'Steersman', uk: 'Штурман', ru: 'Штурман' },
  'OrientalSailorBoss2': { en: 'Mutineer', uk: 'Бунтівник', ru: 'Бунтовщик' },
  'OrientalSailorBoss3': { en: 'Captain', uk: 'Капітан', ru: 'Капитан' },
  'OrientalSailorBowman': { en: 'Boatswain', uk: 'Боцман', ru: 'Боцман' },
  'OrientalSailorCanoneer': { en: 'Cannon Master', uk: 'Пушкар', ru: 'Пушкарь' },
  'OrientalSailorCavalry': { en: 'Mounted Sailor', uk: 'Кінний моряк', ru: 'Конный моряк' },
  'OrientalSailorLongbowman': { en: 'Petty Officer Second Class', uk: 'Старшина 2-го класу', ru: 'Старшина 2-го класса' },
  'OrientalSailorMilitia': { en: 'Battle Hardened Sailor', uk: 'Досвідчений моряк', ru: 'Опытный моряк' },
  'OrientalSailorRecruit': { en: 'Sailor', uk: 'Моряк', ru: 'Моряк' },
  'OrientalStoneStatue1': { en: 'Large Stone Statue', uk: 'Велика кам\'яна статуя', ru: 'Большая каменная статуя' },
  'OrientalStoneStatue2': { en: 'Mossy Stone Statue', uk: 'Замшіла кам\'яна статуя', ru: 'Замшелая каменная статуя' },
  'PartyCrasherBoss1': { en: 'Denis the Delinquent', uk: 'Деннис-преступник', ru: 'Деннис-преступник' },
  'PartyCrasherBoss2': { en: 'Alex the Troublemaker', uk: 'Алекс-смутьян', ru: 'Алекс-смутьян' },
  'PartyCrasherBoss3': { en: 'Bob the Miscreant', uk: 'Боб-подлец', ru: 'Боб-подлец' },
  'PartyCrasherBowman': { en: 'Ruffian', uk: 'Головоріз', ru: 'Головорез' },
  'PartyCrasherCannoneer': { en: 'Whiner', uk: 'Плакса', ru: 'Плакса' },
  'PartyCrasherCavalry': { en: 'Prankster', uk: 'Озорник', ru: 'Озорник' },
  'PartyCrasherCrossbowman': { en: 'Cad', uk: 'Невежа', ru: 'Невежа' },
  'PartyCrasherEliteCavalry': { en: 'Scallywag', uk: 'Лежебока', ru: 'Лежебока' },
  'PartyCrasherEliteSoldier': { en: 'Grouch', uk: 'Брюзга', ru: 'Брюзга' },
  'PartyCrasherLongbowman': { en: 'Scoundrel', uk: 'Жулик', ru: 'Жулик' },
  'PartyCrasherMilitia': { en: 'Vandal', uk: 'Вандал', ru: 'Вандал' },
  'PartyCrasherRecruit': { en: 'Rascal', uk: 'Плутишка', ru: 'Плутишка' },
  'PartyCrasherSoldier': { en: 'Bully', uk: 'Забияка', ru: 'Забияка' },
  'PirateBoss1': { en: 'Crazy Ship\'s Cook', uk: 'Божевільний кок', ru: 'Безумный кок' },
  'PirateBowman': { en: 'Knife Thrower', uk: 'Метальник ножів', ru: 'Метатель ножей' },
  'PirateCaptain': { en: 'Petty Officer Second class', uk: 'Старшина 2-го класу', ru: 'Старшина 2-го класса' },
  'PirateCavalry': { en: 'Caltrop', uk: 'Кальтроп', ru: 'Кальтроп' },
  'PirateLongbowman': { en: 'Gunman', uk: 'Стрілець', ru: 'Стрелок' },
  'PirateMilitia': { en: 'Sabrerattler', uk: 'Підбурювач', ru: 'Подстрекатель' },
  'PirateRecruit': { en: 'Deckscrubber', uk: 'Скребок', ru: 'Скребок' },
  'RaidersBoss1': { en: 'Uproarious Bull', uk: 'Ревучий Бик', ru: 'Ревущий Бык' },
  'RaidersBowman': { en: 'Composite Bowman', uk: 'Стрілець зі складеним луком', ru: 'Стрелок с составным луком' },
  'RaidersCavalry': { en: 'Lance Rider', uk: 'Вершник зі списом', ru: 'Всадник с копьем' },
  'RaidersCavalryBow': { en: 'Riding Bowman', uk: 'Вершник із луком', ru: 'Всадник с луком' },
  'RaidersCavalryCrossbow': { en: 'Cataphract', uk: 'Важка кіннота', ru: 'Тяжелая конница' },
  'RaidersCavalryLongbow': { en: 'Riding Amazonian Guard', uk: 'Амазонки-вершниці', ru: 'Амазонки-наездницы' },
  'RaidersRecruit': { en: 'Nomad', uk: 'Кочовик', ru: 'Кочевник' },
  'RecklessRider': { en: 'Reckless Rider', uk: 'Хвацький вершник', ru: 'Лихой всадник' },
  'SlickBanditBoss': { en: 'Slick Bandit Boss', uk: 'Скользкий босс разбойников', ru: 'Скользкий босс разбойников' },
  'TMC_BossEnormousIbex': { en: 'Enormous Ibex', uk: 'Гігантський альпійський козел', ru: 'Гигантский альпийский козел' },
  'TMC_BossFrostBearMatriarch': { en: 'Frost Bear Matriarch', uk: 'Снежная мать-медведица', ru: 'Снежная мать-медведица' },
  'TMC_BossFrostGiantKing_0': { en: 'Risi', uk: 'Рісі', ru: 'Риси' },
  'TMC_BossFrostGiantKing_1': { en: 'Risi', uk: 'Рісі', ru: 'Риси' },
  'TMC_BossFrostGiantKing_2': { en: 'Risi', uk: 'Рісі', ru: 'Риси' },
  'TMC_BossFrostGiantKing_3': { en: 'Risi', uk: 'Рісі', ru: 'Риси' },
  'TMC_BossFrostGiantKing_4': { en: 'Risi', uk: 'Рісі', ru: 'Риси' },
  'TMC_BossGargantuanLynx': { en: 'Gargantuan Lynx', uk: 'Гігантська рись', ru: 'Гигантская рысь' },
  'TMC_BossGhastlyWolf': { en: 'Ghastly Wolf', uk: 'Моторошний вовк', ru: 'Жуткий волк' },
  'TMC_BossMammoth': { en: 'Mammoth', uk: 'Мамонт', ru: 'Мамонт' },
  'TMC_BossNordsLeader': { en: 'Bandit Lord Björn', uk: 'Ватажок розбійників Бйорн', ru: 'Главарь разбойников Бьорн' },
  'TMC_BossParagonElk': { en: 'Paragon Elk', uk: 'Ідеальний олень', ru: 'Идеальный олень' },
  'TMC_BossRavagingOx': { en: 'Ravaging Ox', uk: 'Бик-руйнівник', ru: 'Бык-разрушитель' },
  'TMC_BossSmilodon': { en: 'Smilodon', uk: 'Смілодон', ru: 'Смилодон' },
  'TMC_BossWinterTerror': { en: 'Winter Terror', uk: 'Зимовий жах', ru: 'Зимний ужас' },
  'TMC_ColossalEagleBoss': { en: 'Colossal Eagle', uk: 'Величезний орел', ru: 'Огромный орел' },
  'TMC_v1_NordsRightHandBoss': { en: 'Steel Beard', uk: 'Сталебород', ru: 'Сталебород' },
  'TreasureShipLoot': { en: 'Treasure', uk: 'Скарб', ru: 'Сокровище' },
  'WildlifeBowman': { en: 'Wolf', uk: 'Вовк', ru: 'Волк' },
  'WildlifeCannoneer': { en: 'Giant', uk: 'Легендарний ветеран', ru: 'Легендарный ветеран' },
  'WildlifeCavalry': { en: 'Fox', uk: 'Лисиця', ru: 'Лиса' },
  'WildlifeLongbowman': { en: 'Wolf Packleader', uk: 'Вовк-ватажок', ru: 'Волк-вожак' },
  'WildlifeMilitia': { en: 'Bear', uk: 'Ведмідь', ru: 'Медведь' },
  'WildlifeRecruit': { en: 'Boar', uk: 'Кабан', ru: 'Кабан' },
};

// Active language state
let currentLang = 'en';
try {
  const saved = localStorage.getItem('tsoplan.lang');
  if (saved && (saved === 'en' || saved === 'uk' || saved === 'ru')) {
    currentLang = saved;
  }
} catch (e) {}

const langListeners = [];

function getCurrentLang() {
  return currentLang;
}

function setLanguage(lang) {
  if (lang !== 'en' && lang !== 'uk' && lang !== 'ru') return;
  currentLang = lang;
  try {
    localStorage.setItem('tsoplan.lang', lang);
  } catch (e) {}

  document.documentElement.lang = lang;
  updateLanguageSwitcherUI();
  updatePageTranslations();

  for (const fn of langListeners) {
    try { fn(lang); } catch (e) { console.error(e); }
  }
}

function onLanguageChange(fn) {
  langListeners.push(fn);
}

function t(key, params = {}) {
  const dict = I18N[currentLang] || I18N.en;
  let str = dict[key] !== undefined ? dict[key] : (I18N.en[key] !== undefined ? I18N.en[key] : key);
  for (const [k, v] of Object.entries(params)) {
    str = str.replaceAll(`{${k}}`, v);
  }
  return str;
}

function tUnit(unitId) {
  const item = UNIT_NAMES[unitId];
  if (!item) return unitId;
  return item[currentLang] || item.en || unitId;
}

function tResource(resId) {
  const item = RESOURCE_NAMES[resId];
  if (!item) return resId;
  return item[currentLang] || item.en || resId;
}

function getResourceIcon(resId) {
  const item = RESOURCE_NAMES[resId];
  return (item && item.icon) || '📦';
}

function tCampType(type) {
  const s = String(type || '').toLowerCase();
  if (s.includes('leader') || s.includes('boss')) return t('camp.legend.boss');
  if (s.includes('small')) return t('camp.legend.small');
  if (s.includes('medium')) return t('camp.legend.medium');
  if (s.includes('large') || s.includes('big')) return t('camp.legend.large');
  return type;
}

function tRole(role) {
  if (!role) return t('role.attack');
  const s = String(role).toLowerCase();
  if (s.includes('вскрытие') || s.includes('opener') || s.includes('відкриття')) return t('role.opener');
  if (s.includes('добивание') || s.includes('finisher') || s.includes('добивання')) return t('role.finisher');
  if (s.includes('продавливание') || s.includes('pusher') || s.includes('продавлювання')) return t('role.pusher');
  if (s.includes('соло') || s.includes('solo')) return t('role.solo');
  return role;
}

function tReason(reason) {
  if (!reason) return '';
  const s = String(reason).toLowerCase();
  if (s.includes('не хватает запаса') || s.includes('не вистачає запасу') || s.includes('гарниз') || s.includes('гарніз') || s.includes('garrison') || s.includes('restricted units')) return t('reason.stock');
  if (s.includes('нет свободных генералов') || s.includes('немає вільних генералів') || s.includes('no available generals')) return t('reason.generals');
  if (s.includes('кончились') || s.includes('закінчилися') || s.includes('исчерпаны') || s.includes('вичерпано') || s.includes('both generals')) return t('reason.both');
  return reason;
}

function updateLanguageSwitcherUI() {
  document.querySelectorAll('.lang-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.lang === currentLang);
  });
}

function updatePageTranslations() {
  // Update data-i18n elements (HTML or text)
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    const val = t(key);
    if (el.getAttribute('data-i18n-html') === 'true' || /<[a-z][\s\S]*>/i.test(val)) {
      el.innerHTML = val;
    } else {
      el.textContent = val;
    }
  });

  // Update placeholders
  document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    const key = el.getAttribute('data-i18n-placeholder');
    el.placeholder = t(key);
  });

  // Update titles/tooltips
  document.querySelectorAll('[data-i18n-title]').forEach((el) => {
    const key = el.getAttribute('data-i18n-title');
    el.title = t(key);
  });
}

// Attach to window

const ADVENTURE_NAMES = {
  "1001NightsWoodcutter": {
    "en": "Ali Baba the Young Woodcutter",
    "uk": "Алі-Баба, молодий лісоруб",
    "ru": "Али-Баба, молодой дровосек"
  },
  "1001NightsFirstThief": {
    "en": "Ali Baba and the First Thief",
    "uk": "Алі-Баба і перший розбійник",
    "ru": "Али-Баба и первый разбойник"
  },
  "1001NightsSecondThief": {
    "en": "Ali Baba and the Second Thief",
    "uk": "Алі-Баба і другий розбійник",
    "ru": "Али-Баба и второй разбойник"
  },
  "1001NightsThirdThief": {
    "en": "Ali Baba and the Third Thief",
    "uk": "Алі-Баба і третій розбійник",
    "ru": "Али-Баба и третий разбойник"
  },
  "1001NightsTreasureKnowledge": {
    "en": "Ali Baba and the Treasure of Knowledge",
    "uk": "Алі-Баба і скарб знань",
    "ru": "Али-Баба и сокровище знаний"
  },
  "1001NightsTreasureWisdom": {
    "en": "Ali Baba and the Treasure of Wisdom",
    "uk": "Алі-Баба і скарб мудрості",
    "ru": "Али-Баба и сокровище мудрости"
  },
  "1001NightsBesiegedCity": {
    "en": "Sindbad and the Besieged City",
    "uk": "Синдбад і обложене місто",
    "ru": "Синдбад и осажденный город"
  },
  "1001NightsOilLamp": {
    "en": "Aladdin and the Oil Lamp",
    "uk": "Аладдін і чарівна лампа",
    "ru": "Аладдин и волшебная лампа"
  },
  "1001NightsSeaSnake": {
    "en": "Sindbad and the Sea Snake",
    "uk": "Синдбад і морський змій",
    "ru": "Синдбад и морской змей"
  },
  "1001NightsPrincess": {
    "en": "Aladdin and the Beautiful Princess",
    "uk": "Аладдін і прекрасна принцеса",
    "ru": "Аладдин и прекрасная принцесса"
  },
  "BanditNest": {
    "en": "Bandit Nest",
    "uk": "Лігво розбійників",
    "ru": "Притон разбойников"
  },
  "NewBanditNest": {
    "en": "Return to the Bandit's Nest",
    "uk": "Повернення до лігва розбійників",
    "ru": "Возвращение в притон разбойников"
  },
  "BountyHunterNew": {
    "en": "Bounty Hunter",
    "uk": "Мисливець за головами",
    "ru": "Охотник за головами"
  },
  "Horseback": {
    "en": "Horseback",
    "uk": "Верхи на коні",
    "ru": "Верхом на лошади"
  },
  "OldFriends": {
    "en": "Old Friends",
    "uk": "Старі друзі",
    "ru": "Старые друзья"
  },
  "MotherLove": {
    "en": "Motherly Love",
    "uk": "Материнська любов",
    "ru": "Материнская любовь"
  },
  "Outlaws": {
    "en": "Outlaws",
    "uk": "Поза законом",
    "ru": "Вне закона"
  },
  "Gunpowder": {
    "en": "Gunpowder",
    "uk": "Порох",
    "ru": "Порох"
  },
  "RoaringBull": {
    "en": "Roaring Bull",
    "uk": "Ревучий бык",
    "ru": "Ревущий бык"
  },
  "SecludedExperiments": {
    "en": "Secluded Experiments",
    "uk": "Самотні експерименти",
    "ru": "Уединенные эксперименты"
  },
  "MoreSecludedExperiments": {
    "en": "More Secluded Experiments",
    "uk": "Нові самотні експерименти",
    "ru": "Новые уединенные эксперименты"
  },
  "SonsOfTheVeld": {
    "en": "Sons Of The Veld",
    "uk": "Сини степів",
    "ru": "Сыны степей"
  },
  "StealingFromTheRich": {
    "en": "Stealing From The Rich",
    "uk": "Пограбування багатих",
    "ru": "Ограбление богатых"
  },
  "StealingFromTheRich02": {
    "en": "Desperate Rich",
    "uk": "Зневірені багатії",
    "ru": "Отчаявшиеся богачи"
  },
  "SurpriseAttack": {
    "en": "Surprise Attack",
    "uk": "Несподіваний напад",
    "ru": "Внезапное нападение"
  },
  "TheBlackKnights": {
    "en": "The Black Knights",
    "uk": "Чорні лицарі",
    "ru": "Черные рыцари"
  },
  "TheDarkBrotherhood": {
    "en": "The Dark Brotherhood",
    "uk": "Темне братство",
    "ru": "Темное братство"
  },
  "TheDarkPriests": {
    "en": "The Dark Priests",
    "uk": "Темні священики",
    "ru": "Темные священники"
  },
  "TheIslandOfThePirates": {
    "en": "The Island Of The Pirates",
    "uk": "Острів піратів",
    "ru": "Остров пиратов"
  },
  "TheNords": {
    "en": "The Nords",
    "uk": "Північани",
    "ru": "Северяне"
  },
  "TheNords2": {
    "en": "The Invasion of the Nords",
    "uk": "Вторгнення північан",
    "ru": "Вторжение северян"
  },
  "TheSiege": {
    "en": "The Siege",
    "uk": "Облога",
    "ru": "Осада"
  },
  "Traitors": {
    "en": "Traitors",
    "uk": "Зрадники",
    "ru": "Предатели"
  },
  "Traitors02": {
    "en": "Sir Robin's Revenge",
    "uk": "Помста сера Робіна",
    "ru": "Месть сэра Робина"
  },
  "VictorTheVicious": {
    "en": "Victor The Vicious",
    "uk": "Віктор Грізний",
    "ru": "Виктор Грозный"
  },
  "WitchOfTheSwamp": {
    "en": "Witch of the Swamp",
    "uk": "Болотяна відьма",
    "ru": "Болотная ведьма"
  },
  "MadHenry": {
    "en": "Wild Mary",
    "uk": "Дика Мері",
    "ru": "Дикая Мэри"
  },
  "TheValiantLittleTailor": {
    "en": "The Valiant Little Tailor",
    "uk": "Хоробрий кравчик",
    "ru": "Храбрый портняжка"
  },
  "TheCleverLittleTailor": {
    "en": "The Clever Little Tailor",
    "uk": "Розумний кравчик",
    "ru": "Умный портняжка"
  },
  "TheHeroicLittleTailor": {
    "en": "The Heroic Little Tailor",
    "uk": "Героїчний кравчик",
    "ru": "Геройский портняжка"
  },
  "TheSonsOfTheLittleTailor": {
    "en": "The Sons of the Little Tailor",
    "uk": "Сини кравчика",
    "ru": "Сыновья портняжки"
  },
  "TheBetrayedLittleTailor": {
    "en": "The Betrayed Little Tailor",
    "uk": "Зраджений кравчик",
    "ru": "Преданный портняжка"
  },
  "MiadArcticExplosion": {
    "en": "Arctic Explosion",
    "uk": "Вибух в Арктиці",
    "ru": "Взрыв в Арктике"
  },
  "MiadBastilleIsland": {
    "en": "Bastille Island",
    "uk": "Острів Бастилія",
    "ru": "Остров Бастилия"
  },
  "MiadPirateLife": {
    "en": "Pirate Life",
    "uk": "Піратське життя",
    "ru": "Пиратская жизнь"
  },
  "MiadSleepyReef": {
    "en": "Sleepy Reef",
    "uk": "Сонний риф",
    "ru": "Сонный риф"
  },
  "MiadTheLostSkull": {
    "en": "The Lost Skull",
    "uk": "Втрачений череп",
    "ru": "Потерянный череп"
  },
  "MiadTheSleepingVolcano": {
    "en": "The Sleeping Volcano",
    "uk": "Сплячий вулкан",
    "ru": "Спящий вулкан"
  },
  "MiadTikkiIsland": {
    "en": "Tikki Island",
    "uk": "Острів Тіккі",
    "ru": "Остров Тикки"
  },
  "MiadTropicalSun": {
    "en": "Tropical Sun",
    "uk": "Тропічне сонце",
    "ru": "Тропическое солнце"
  },
  "BonabertiBusiness": {
    "en": "Bonaberti Business",
    "uk": "Справа Бонаберті",
    "ru": "Дело Бонаберти"
  },
  "BuccaneerRoundup": {
    "en": "The Buccaneer Roundup",
    "uk": "Піратська облава",
    "ru": "Пиратская облава"
  },
  "RaidingTheRaiders": {
    "en": "Raiding the Raiders",
    "uk": "Наліт на грабіжників",
    "ru": "Налет на налетчиков"
  },
  "LakesideTreasure": {
    "en": "Lakeside Treasure",
    "uk": "Озерний скарб",
    "ru": "Озерное сокровище"
  },
  "TombRaiders": {
    "en": "Tomb Raiders",
    "uk": "Розкрадачі гробниць",
    "ru": "Расхитители гробниц"
  },
  "Whirlwind": {
    "en": "The Whirlwind",
    "uk": "Вихор",
    "ru": "Вихрь"
  },
  "SplitCity": {
    "en": "Split City in Summer",
    "uk": "Розділене місто влітку",
    "ru": "Разделенный город летом"
  },
  "SplitCityFall": {
    "en": "Split City in Fall",
    "uk": "Розділене місто восени",
    "ru": "Разделенный город осенью"
  },
  "BuffAdventures_ValuableIntel": {
    "en": "Valuable Intel",
    "uk": "Цінні відомості",
    "ru": "Ценная информация"
  },
  "BuffAdventures_DragonsRoost": {
    "en": "The Dragon's Roost",
    "uk": "Притулок дракона",
    "ru": "Пристанище дракона"
  },
  "BuffAdventures_OfSongsAndCurses": {
    "en": "Of Songs and Curses",
    "uk": "Пісні та прокляття",
    "ru": "Песни и проклятия"
  },
  "BuffAdventures_RaidOfTheNords": {
    "en": "Raid of the Nords",
    "uk": "Рейд північан",
    "ru": "Рейд северян"
  },
  "BuffAdventures_ElChupacabra": {
    "en": "El Chupacabra",
    "uk": "Ель Чупакабра",
    "ru": "Эль Чупакабра"
  },
  "BuffAdventures_LostCity": {
    "en": "The Lost City",
    "uk": "Загублене місто",
    "ru": "Затерянный город"
  },
  "BuffAdventures_OneStepAhead": {
    "en": "One Step Ahead",
    "uk": "На крок попереду",
    "ru": "На шаг впереди"
  },
  "BuffAdventures_TMC_At_the_Foot_of_the_Mountain": {
    "en": "At the Foot of the Mountain",
    "uk": "Біля підніжжя гори",
    "ru": "У подножия горы"
  },
  "BuffAdventures_TMC_Unknown_Regions": {
    "en": "Unknown Regions",
    "uk": "Невідомі регіони",
    "ru": "Неизведанные регионы"
  },
  "BuffAdventures_TMC_Mountain_Labyrinth": {
    "en": "Mountain Labyrinth",
    "uk": "Гірський лабіринт",
    "ru": "Горный лабиринт"
  },
  "BuffAdventures_TMC_The_People_of_the_Mountain": {
    "en": "The People of the Mountain",
    "uk": "Народ гір",
    "ru": "Народ гор"
  },
  "BuffAdventures_TMC_A_giant_Battle": {
    "en": "A Giant Battle",
    "uk": "Битва гігантів",
    "ru": "Битва гигантов"
  },
  "BuffAdventures_Evil_Queen_Fisherman": {
    "en": "The Fisherman and his Wife",
    "uk": "Рибалка та його дружина",
    "ru": "Рыбак и его жена"
  },
  "BuffAdventures_Evil_Queen_Hansel_Gretel": {
    "en": "Hansel and Gretel",
    "uk": "Гензель і Гретель",
    "ru": "Гензель и Гретель"
  },
  "BuffAdventures_Evil_Queen_Piper_of_Hamelin": {
    "en": "The Pied Piper of Hamelin",
    "uk": "Гамельнський щуролов",
    "ru": "Крысолов из Гамельна"
  },
  "BuffAdventures_Evil_Queen_Red_Riding_Hood": {
    "en": "Red Riding Hood",
    "uk": "Червона Шапочка",
    "ru": "Красная Шапочка"
  },
  "BuffAdventures_Evil_Queen_Snow_White": {
    "en": "Snow White",
    "uk": "Білосніжка",
    "ru": "Белоснежка"
  },
  "EasterGarrunTrapper": {
    "en": "Garrun the Trapper",
    "uk": "Гаррун-звіролов",
    "ru": "Гаррун-зверолов"
  },
  "Birthday2013MilitaryAdventure1ShopVersion": {
    "en": "The Shaman",
    "uk": "Шаман",
    "ru": "Шаман"
  },
  "Birthday2013MilitaryAdventure2ShopVersion": {
    "en": "Old Ruins",
    "uk": "Старі руїни",
    "ru": "Старые руины"
  },
  "Birthday2020CakeMap1": {
    "en": "Misty Cake (Level 26-38)",
    "uk": "Туманний пиріг (26-38 рів.)",
    "ru": "Туманный пирог (26-38 ур.)"
  },
  "Birthday2020CakeMap2": {
    "en": "Misty Cake (Level 39-53)",
    "uk": "Туманний пиріг (39-53 рів.)",
    "ru": "Туманный пирог (39-53 ур.)"
  },
  "Birthday2020CakeMap3": {
    "en": "Misty Cake (Level 54+)",
    "uk": "Туманний пиріг (54+ рів.)",
    "ru": "Туманный пирог (54+ ур.)"
  },
  "HWCampaign1_Adv1": {
    "en": "Monsters from the Mist",
    "uk": "Монстри з туману",
    "ru": "Монстры из тумана"
  },
  "HWCampaign1_Adv2": {
    "en": "Looming Danger",
    "uk": "Небезпека, що насувається",
    "ru": "Надвигающаяся опасность"
  },
  "HWCampaign1_Adv3": {
    "en": "The Dark Gate",
    "uk": "Темна брама",
    "ru": "Темные врата"
  },
  "HalloweenEvent_InvadingZombies": {
    "en": "Invading Zombies",
    "uk": "Навала зомбі",
    "ru": "Нашествие зомби"
  },
  "ChristmasAdventure2013": {
    "en": "The Stolen Sleigh",
    "uk": "Вкрадені сани",
    "ru": "Украденные сани"
  },
  "ChristmasAdventureEasy": {
    "en": "Save the Christmas Feast",
    "uk": "Врятуйте різдвяний бенкет",
    "ru": "Спасите рождественский пир"
  },
  "XMAS_Cookie_Easy_2": {
    "en": "Winter Wonderland (Level 26-35)",
    "uk": "Зимова казка (26-35 рів.)",
    "ru": "Зимняя сказка (26-35 ур.)"
  },
  "XMAS_Cookie_Medium_2": {
    "en": "Winter Wonderland (Level 36-50)",
    "uk": "Зимова казка (36-50 рів.)",
    "ru": "Зимняя сказка (36-50 ур.)"
  },
  "XMAS_Cookie_Hard_2": {
    "en": "Winter Wonderland (Level 51+)",
    "uk": "Зимова казка (51+ рів.)",
    "ru": "Зимняя сказка (51+ ур.)"
  },
  "EoWEventAdventure": {
    "en": "The End Of The World",
    "uk": "Кінець світу",
    "ru": "Конец света"
  },
  "PartyCrashers": {
    "en": "Party Crashers",
    "uk": "Незвані гості",
    "ru": "Незваные гости"
  },
  "Sector2": {
    "en": "Home Island: Sector 2",
    "uk": "Домашній острів: Сектор 2",
    "ru": "Домашний остров: Сектор 2"
  },
  "Sector3": {
    "en": "Home Island: Sector 3",
    "uk": "Домашній острів: Сектор 3",
    "ru": "Домашний остров: Сектор 3"
  },
  "Sector5": {
    "en": "Home Island: Sector 5",
    "uk": "Домашній острів: Сектор 5",
    "ru": "Домашний остров: Сектор 5"
  },
  "Sector6": {
    "en": "Home Island: Sector 6",
    "uk": "Домашній острів: Сектор 6",
    "ru": "Домашний остров: Сектор 6"
  },
  "Sector7": {
    "en": "Home Island: Sector 7",
    "uk": "Домашній острів: Сектор 7",
    "ru": "Домашний остров: Сектор 7"
  },
  "Sector8": {
    "en": "Home Island: Sector 8",
    "uk": "Домашній острів: Сектор 8",
    "ru": "Домашний остров: Сектор 8"
  },
  "Sector9": {
    "en": "Home Island: Sector 9",
    "uk": "Домашній острів: Сектор 9",
    "ru": "Домашний остров: Сектор 9"
  },
  "SectorA2": {
    "en": "Home Island: Archipelago A2",
    "uk": "Домашній острів: Архіпелаг A2",
    "ru": "Домашний остров: Архипелаг A2"
  },
  "SectorA3": {
    "en": "Home Island: Archipelago A3",
    "uk": "Домашній острів: Архіпелаг A3",
    "ru": "Домашний остров: Архипелаг A3"
  },
  "SectorA4": {
    "en": "Home Island: Archipelago A4",
    "uk": "Домашній острів: Архіпелаг A4",
    "ru": "Домашний остров: Архипелаг A4"
  },
  "SectorA5": {
    "en": "Home Island: Archipelago A5",
    "uk": "Домашній острів: Архіпелаг A5",
    "ru": "Домашний остров: Архипелаг A5"
  },
  "SectorA6": {
    "en": "Home Island: Archipelago A6",
    "uk": "Домашній острів: Архіпелаг A6",
    "ru": "Домашний остров: Архипелаг A6"
  },
  "SectorA7": {
    "en": "Home Island: Archipelago A7",
    "uk": "Домашній острів: Архіпелаг A7",
    "ru": "Домашний остров: Архипелаг A7"
  }
};

function tAdv(id) {
  if (!id) return '';
  const item = ADVENTURE_NAMES[id];
  if (!item) return id;
  return item[currentLang] || item.en || id;
}

function getAdventureTranslations(id) {
  return ADVENTURE_NAMES[id] || null;
}

window.I18N_ENGINE = {
  I18N,
  UNIT_NAMES,
  RESOURCE_NAMES,
  getCurrentLang,
  setLanguage,
  onLanguageChange,
  t,
  tUnit,
  tResource,
  getResourceIcon,
  tCampType,
  tRole,
  tReason,
  updatePageTranslations,
  updateLanguageSwitcherUI,
  ADVENTURE_NAMES,
  tAdv,
  getAdventureTranslations,
};
})();
