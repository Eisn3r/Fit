    // --- PUBLIC DOMAIN EXERCISE PHOTO CDN (yuhonas/free-exercise-db) ---
    const FREE_DB_IMG_PREFIX = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/';

    // --- STATE & CONFIGURATION ---
    const state = {
      gender: 'male',         // 'male' | 'female'
      level: 'beginner',      // 'beginner' | 'intermediate' | 'pro'
      week: 1,                // 1 .. 8 (8-week undulating periodization)
      focus: 'fullbody',      // 'fullbody' | 'upper' | 'lower' | 'push' | 'pull' | 'core'
      selectedDay: 0,         // 0 (Mon) .. 6 (Sun)
      activeTab: 'workout',
      completedSets: {},      // key: `${day}-${slotId}-${setIndex}` -> boolean
      completedStretches: {}, // key: `${day}-${stretchId}` -> boolean
      customWeights: {},      // key: `${exId}` -> number
      swappedExercises: {},   // key: `${day}-${slotOrigId}` -> replacementExId
      customMediaUrls: {},    // clean default -> uses reliable Free Exercise DB 0.jpg & 1.jpg photos
      activeSwapSlot: null,   // { dayIdx, origId, currentId }
      swapFilterEq: 'all',    // 'all' | 'free' | 'machine' | 'bodyweight'
      modalExId: null,
      modalMediaMode: 'photo', // 'photo' | 'vector'
      modalFrameIdx: 0,
      modalFlipInterval: null,
      cardFlipInterval: null,
      globalFrameIdx: 0,
      animPaused: false,
      timerSeconds: 90,
      timerRunning: false,
      timerInterval: null
    };

    const DAYS_OF_WEEK = [
      { short: 'ПН', full: 'Понедельник' },
      { short: 'ВТ', full: 'Вторник' },
      { short: 'СР', full: 'Среда' },
      { short: 'ЧТ', full: 'Четверг' },
      { short: 'ПТ', full: 'Пятница' },
      { short: 'СБ', full: 'Суббота' },
      { short: 'ВС', full: 'Воскресенье' }
    ];

    const LEVEL_CONFIG = {
      beginner: {
        name: 'Новичок',
        baseSets: 3,
        baseRepsMin: 10,
        baseRepsMax: 12,
        weightMult: 1.0,
        restSec: 90,
        rir: 'RIR 2–3 (комфортный запас сил)'
      },
      intermediate: {
        name: 'Средний',
        baseSets: 3,
        baseRepsMin: 12,
        baseRepsMax: 14,
        weightMult: 1.35,
        restSec: 75,
        rir: 'RIR 1–2 (плотная рабочая нагрузка)'
      },
      pro: {
        name: 'Атлет PRO',
        baseSets: 4,
        baseRepsMin: 12,
        baseRepsMax: 16,
        weightMult: 1.7,
        restSec: 60,
        rir: 'RIR 0–1 (высокая интенсивность)'
      }
    };

    // 8-Week Undulating Periodization (Block 1 -> Week 4 Deload -> Block 2 Peak)
    const WEEK_CONFIG = {
      1: { label: 'Неделя 1 (Блок 1): Адаптация и техника', addSets: 0, addReps: 0, weightFactor: 1.0, isDeload: false },
      2: { label: 'Неделя 2 (Блок 1): Набор рабочего объема (+2 повт)', addSets: 0, addReps: 2, weightFactor: 1.04, isDeload: false },
      3: { label: 'Неделя 3 (Блок 1): Интенсификация (+1 сет, +5% вес)', addSets: 1, addReps: 2, weightFactor: 1.07, isDeload: false },
      4: { label: 'Неделя 4 🌿 (DELOAD): Разгрузка ЦНС и связок (−1 сет, −10% вес)', addSets: -1, addReps: -2, weightFactor: 0.90, isDeload: true },
      5: { label: 'Неделя 5 (Блок 2): Новый силовой цикл (+8% вес)', addSets: 0, addReps: 1, weightFactor: 1.09, isDeload: false },
      6: { label: 'Неделя 6 (Блок 2): Гипертрофия (+1 сет, +10% вес)', addSets: 1, addReps: 2, weightFactor: 1.12, isDeload: false },
      7: { label: 'Неделя 7 (Блок 2): Предпиковый объем (+1 сет, +13% вес)', addSets: 1, addReps: 3, weightFactor: 1.15, isDeload: false },
      8: { label: 'Неделя 8 🔥 (ПИК ЦИКЛА): Максимальный прогресс (+16% вес)', addSets: 1, addReps: 4, weightFactor: 1.18, isDeload: false }
    };

    // Post-Workout Stretching & Cooldown Database (tailored to specific day's muscles)
    const STRETCH_ROUTINES = {
      pull: [
        { id: 'str_lat_hang', title: 'Декомпрессионный вис + Вытяжение широчайших у опоры', duration: '60 сек', target: 'Широчайшие и круглые мышцы спины', desc: 'Возьмитесь одной рукой за стойку и отведите таз назад, ощущая вытяжение всей боковой линии спины.' },
        { id: 'str_bicep_wall', title: 'Растяжка бицепса и предплечий с отведением прямой руки', duration: '45 сек / рука', target: 'Двуглавая мышца плеча и локтевые связки', desc: 'Упритесь ладонью в стойку пальцами вниз на уровне плеча и мягко поверните корпус в противоположную сторону.' },
        { id: 'str_cat_cow', title: 'Мобилизация грудного и поясничного отдела «Кошка — Корова»', duration: '60 сек', target: 'Разгибатели позвоночника', desc: 'Плавно чередуйте округление и прогиб спины в ритме глубокого дыхания.' }
      ],
      lower: [
        { id: 'str_quad_stand', title: 'Растяжка квадрицепса стоя с захватом стопы', duration: '45 сек / нога', target: 'Передняя поверхность бедра', desc: 'Подтяните пятку к ягодице, удерживая колени вместе и слегка подкручивая таз вперед.' },
        { id: 'str_hamstring_fold', title: 'Наклон к прямой ноге на опоре (Бицепс бедра)', duration: '50 сек / нога', target: 'Задняя поверхность бедра и икры', desc: 'С прямой спиной плавно тянитесь животом к бедру, не округляя поясничный отдел.' },
        { id: 'str_pigeon_glute', title: 'Глубокая растяжка ягодиц и дельт (Поза голубя + Плечо)', duration: '60 сек / сторона', target: 'Большая и средняя ягодичная, дельты', desc: 'Снимает спазм после приседаний, тяг и жимов на плечи, ускоряя восстановление.' }
      ],
      push: [
        { id: 'str_chest_door', title: 'Глубокое раскрытие грудных мышц у силовой стойки', duration: '60 сек', target: 'Большая и малая грудная мышца', desc: 'Зафиксируйте предплечье на стойке под углом 90° и плавно подайте корпус вперед.' },
        { id: 'str_tricep_overhead', title: 'Растяжка длинной головки трицепса за головой', duration: '45 сек / рука', target: 'Трицепс и плечевой сустав', desc: 'Заведите согнутую руку за голову и противоположной ладонью мягко надавите на локоть вниз.' },
        { id: 'str_shoulder_cross', title: 'Горизонтальное приведение руки к груди', duration: '45 сек / сторона', target: 'Передняя и средняя дельта', desc: 'Прижмите прямую руку к груди на уровне плеча, опуская лопатку вниз.' }
      ],
      core: [
        { id: 'str_cobra_abs', title: 'Поза Кобры (Сфинкса) на коврике', duration: '60 сек', target: 'Прямая и косые мышцы живота', desc: 'Лягте на живот и плавно приподнимите грудную клетку на руках, вытягивая мышцы пресса.' },
        { id: 'str_pigeon_glute2', title: 'Растяжка ягодичных лежа на спине (Цифра 4)', duration: '45 сек / нога', target: 'Ягодицы и грушевидная мышца', desc: 'Положите стопу на колено опорной ноги и мягко притяните бедро к себе.' },
        { id: 'str_child_pose', title: 'Диафрагмальное дыхание в позе ребенка', duration: '60 сек', target: 'Расслабление поясницы и ЦНС', desc: 'Медленный вдох на 4 счета и плавный выдох на 6 счетов для снижения пульса.' }
      ]
    };

    // Detailed Anatomical & Vector Schema Generator
    function getExerciseVisualSVG(animType, isMini = false) {
      const sizeClass = isMini ? 'w-16 h-16' : 'w-48 h-48';
      switch (animType) {
        case 'squat':
          return `
            <svg viewBox="0 0 120 120" class="${sizeClass}">
              <line x1="15" y1="104" x2="105" y2="104" stroke="#334155" stroke-width="4" stroke-linecap="round"/>
              <line x1="25" y1="20" x2="25" y2="104" stroke="#1e293b" stroke-width="3"/>
              <g class="svg-squat">
                <line x1="22" y1="42" x2="98" y2="42" stroke="#94a3b8" stroke-width="3.5" stroke-linecap="round"/>
                <rect x="24" y="34" width="6" height="16" rx="2" fill="#10b981"/>
                <rect x="90" y="34" width="6" height="16" rx="2" fill="#10b981"/>
                <circle cx="60" cy="28" r="8" fill="#e2e8f0"/>
                <line x1="60" y1="36" x2="56" y2="68" stroke="#38bdf8" stroke-width="6" stroke-linecap="round"/>
                <circle cx="54" cy="70" r="9" fill="#f43f5e" class="muscle-glow"/>
                <line x1="56" y1="68" x2="74" y2="82" stroke="#e2e8f0" stroke-width="5" stroke-linecap="round"/>
              </g>
              <line x1="74" y1="82" x2="64" y2="102" stroke="#94a3b8" stroke-width="5" stroke-linecap="round"/>
              <line x1="60" y1="102" x2="75" y2="102" stroke="#10b981" stroke-width="4" stroke-linecap="round"/>
            </svg>
          `;
        case 'bridge':
          return `
            <svg viewBox="0 0 120 120" class="${sizeClass}">
              <line x1="10" y1="102" x2="110" y2="102" stroke="#334155" stroke-width="4" stroke-linecap="round"/>
              <rect x="16" y="70" width="24" height="32" rx="4" fill="#1e293b" stroke="#475569" stroke-width="2"/>
              <g class="svg-bridge">
                <circle cx="30" cy="60" r="7" fill="#e2e8f0"/>
                <line x1="34" y1="68" x2="66" y2="68" stroke="#38bdf8" stroke-width="6" stroke-linecap="round"/>
                <circle cx="66" cy="68" r="10" fill="#f43f5e" class="muscle-glow"/>
                <circle cx="66" cy="60" r="7" fill="#10b981" stroke="#0f172a" stroke-width="2"/>
                <line x1="66" y1="68" x2="90" y2="74" stroke="#e2e8f0" stroke-width="5" stroke-linecap="round"/>
              </g>
              <line x1="90" y1="74" x2="92" y2="100" stroke="#94a3b8" stroke-width="5" stroke-linecap="round"/>
            </svg>
          `;
        case 'push':
          return `
            <svg viewBox="0 0 120 120" class="${sizeClass}">
              <line x1="15" y1="102" x2="105" y2="102" stroke="#334155" stroke-width="4" stroke-linecap="round"/>
              <rect x="25" y="74" width="65" height="8" rx="3" fill="#334155"/>
              <line x1="35" y1="82" x2="35" y2="102" stroke="#475569" stroke-width="4"/>
              <line x1="80" y1="82" x2="80" y2="102" stroke="#475569" stroke-width="4"/>
              <circle cx="34" cy="65" r="7" fill="#e2e8f0"/>
              <line x1="42" y1="68" x2="78" y2="68" stroke="#38bdf8" stroke-width="6" stroke-linecap="round"/>
              <circle cx="52" cy="65" r="9" fill="#f43f5e" class="muscle-glow"/>
              <g class="svg-push">
                <line x1="52" y1="66" x2="52" y2="42" stroke="#e2e8f0" stroke-width="4.5" stroke-linecap="round"/>
                <line x1="28" y1="40" x2="76" y2="40" stroke="#94a3b8" stroke-width="3.5" stroke-linecap="round"/>
                <rect x="30" y="32" width="6" height="16" rx="2" fill="#10b981"/>
                <rect x="68" y="32" width="6" height="16" rx="2" fill="#10b981"/>
              </g>
            </svg>
          `;
        case 'pull':
          return `
            <svg viewBox="0 0 120 120" class="${sizeClass}">
              <line x1="20" y1="14" x2="100" y2="14" stroke="#475569" stroke-width="4" stroke-linecap="round"/>
              <line x1="60" y1="14" x2="60" y2="55" stroke="#64748b" stroke-width="2" stroke-dasharray="3 2"/>
              <circle cx="60" cy="54" r="7" fill="#e2e8f0"/>
              <line x1="60" y1="62" x2="60" y2="94" stroke="#38bdf8" stroke-width="7" stroke-linecap="round"/>
              <circle cx="60" cy="72" r="10" fill="#f43f5e" class="muscle-glow"/>
              <g class="svg-pull">
                <line x1="30" y1="30" x2="90" y2="30" stroke="#10b981" stroke-width="4" stroke-linecap="round"/>
                <line x1="36" y1="30" x2="52" y2="62" stroke="#e2e8f0" stroke-width="4" stroke-linecap="round"/>
                <line x1="84" y1="30" x2="68" y2="62" stroke="#e2e8f0" stroke-width="4" stroke-linecap="round"/>
              </g>
            </svg>
          `;
        case 'curl':
          return `
            <svg viewBox="0 0 120 120" class="${sizeClass}">
              <line x1="20" y1="104" x2="100" y2="104" stroke="#334155" stroke-width="4" stroke-linecap="round"/>
              <circle cx="56" cy="30" r="8" fill="#e2e8f0"/>
              <line x1="56" y1="40" x2="56" y2="74" stroke="#38bdf8" stroke-width="7" stroke-linecap="round"/>
              <line x1="56" y1="74" x2="56" y2="102" stroke="#94a3b8" stroke-width="5" stroke-linecap="round"/>
              <circle cx="60" cy="54" r="8" fill="#f43f5e" class="muscle-glow"/>
              <g class="svg-curl">
                <line x1="60" y1="58" x2="84" y2="64" stroke="#e2e8f0" stroke-width="4.5" stroke-linecap="round"/>
                <circle cx="86" cy="64" r="6" fill="#10b981"/>
              </g>
            </svg>
          `;
        default:
          return `
            <svg viewBox="0 0 120 120" class="${sizeClass}">
              <line x1="12" y1="96" x2="108" y2="96" stroke="#334155" stroke-width="4" stroke-linecap="round"/>
              <g class="svg-bridge">
                <circle cx="30" cy="68" r="7" fill="#e2e8f0"/>
                <line x1="36" y1="72" x2="88" y2="84" stroke="#38bdf8" stroke-width="6" stroke-linecap="round"/>
                <circle cx="62" cy="78" r="10" fill="#f43f5e" class="muscle-glow"/>
                <line x1="36" y1="72" x2="36" y2="94" stroke="#10b981" stroke-width="4" stroke-linecap="round"/>
              </g>
            </svg>
          `;
      }
    }

    // Comprehensive Exercise Database mapped to verified Free Exercise DB folders (0.jpg & 1.jpg)
    const EXERCISES = [
      // --- LEGS & GLUTES ---
      {
        id: 'sq_barbell',
        dbFolder: 'Barbell_Full_Squat',
        roleTag: 'База #1',
        title: 'Приседания со штангой на плечах',
        muscle: 'Ноги и Ягодицы',
        equipment: 'Штанга в силовой раме',
        equipCategory: 'free',
        animType: 'squat',
        tempo: '2 сек вниз · 1 сек мощный подъем',
        baseWeightMale: 50,
        baseWeightFemale: 24,
        tags: ['fullbody', 'lower'],
        alternatives: ['leg_press_machine', 'hack_squat_machine', 'goblet_db_squat', 'bw_jump_squat'],
        steps: '1. Поставьте стопы чуть шире плеч, носки слегка развернуты.\n2. На вдохе плавно опуститесь вниз до параллели бедра с полом, удерживая спину ровной.\n3. На выдохе мощно вытолкните себя пятками вверх.'
      },
      {
        id: 'leg_press_machine',
        dbFolder: 'Leg_Press',
        roleTag: 'База / Объем',
        title: 'Жим ногами в тренажере лежа',
        muscle: 'Ноги и Ягодицы',
        equipment: 'Тренажер жим ногами',
        equipCategory: 'machine',
        animType: 'squat',
        tempo: '2 сек опускание · 1 сек жим без блокировки коленей',
        baseWeightMale: 100,
        baseWeightFemale: 60,
        tags: ['fullbody', 'lower'],
        alternatives: ['sq_barbell', 'hack_squat_machine', 'goblet_db_squat', 'bw_jump_squat'],
        steps: '1. Прижмите поясницу и таз плотно к спинке сиденья.\n2. Поставьте стопы на середину платформы на ширине плеч.\n3. Опустите платформу до угла 90° в коленях и выжмите вверх, не разгибая колени до щелчка.'
      },
      {
        id: 'hack_squat_machine',
        dbFolder: 'Hack_Squat',
        roleTag: 'Вспомогательное',
        title: 'Гакк-приседания в тренажере',
        muscle: 'Ноги и Ягодицы',
        equipment: 'Гакк-машина / Смит',
        equipCategory: 'machine',
        animType: 'squat',
        tempo: '2–3 сек подконтрольно вниз · 1 сек вверх',
        baseWeightMale: 60,
        baseWeightFemale: 34,
        tags: ['lower'],
        alternatives: ['sq_barbell', 'leg_press_machine', 'goblet_db_squat'],
        steps: '1. Прижмите спину к каретке тренажера, стопы выдвиньте чуть вперед.\n2. Плавно опуститесь до параллели бедер с платформой.\n3. Выжмите вес пятками, сохраняя напряжение в квадрицепсах и ягодицах.'
      },
      {
        id: 'goblet_db_squat',
        dbFolder: 'Goblet_Squat',
        roleTag: 'Вспомогательное',
        title: 'Кубковые приседания с гантелью у груди',
        muscle: 'Ноги и Ягодицы',
        equipment: 'Одна гантель / Гиря',
        equipCategory: 'free',
        animType: 'squat',
        tempo: '2 сек вниз · пауза 1 сек · 1 сек вверх',
        baseWeightMale: 24,
        baseWeightFemale: 14,
        tags: ['fullbody', 'lower'],
        alternatives: ['sq_barbell', 'leg_press_machine', 'bw_jump_squat'],
        steps: '1. Удерживайте гантель вертикально перед грудью обеими ладонями.\n2. Локти направлены вниз, грудь раскрыта.\n3. Глубоко присядьте между коленями и поднимитесь без наклона корпуса вперед.'
      },
      {
        id: 'bw_jump_squat',
        dbFolder: 'Freehand_Jump_Squat',
        roleTag: 'Функционал',
        title: 'Темповые приседания без тренажеров (Свой вес)',
        muscle: 'Ноги и Ягодицы',
        equipment: 'Собственный вес / Резинка',
        equipCategory: 'bodyweight',
        animType: 'squat',
        tempo: 'Двойная пружина внизу · подъем без отдыха вверху',
        baseWeightMale: 0,
        baseWeightFemale: 0,
        tags: ['lower', 'core'],
        alternatives: ['sq_barbell', 'goblet_db_squat', 'leg_press_machine'],
        steps: '1. Опуститесь в присед до параллели с полом.\n2. Сделайте 2 коротких покачивания (пульсации) в нижней точке для максимального жжения.\n3. Поднимитесь вверх, не выпрямляя ноги до конца, и сразу уходите в следующий повтор.'
      },
      {
        id: 'hip_thrust',
        dbFolder: 'Barbell_Hip_Thrust',
        roleTag: 'База ягодиц',
        title: 'Ягодичный мостик со штангой (Hip Thrust)',
        muscle: 'Ноги и Ягодицы',
        equipment: 'Скамья + штанга',
        equipCategory: 'free',
        animType: 'bridge',
        tempo: '1 сек подъем · 1 сек пиковое сжатие · 2 сек вниз',
        baseWeightMale: 60,
        baseWeightFemale: 40,
        tags: ['fullbody', 'lower'],
        alternatives: ['glute_kickback_cable', 'romanian_dl', 'single_leg_bridge'],
        steps: '1. Упритесь лопатками в край скамьи, штанга лежит на тазовом сгибе.\n2. На выдохе поднимите таз вверх до прямой линии корпуса и сожмите ягодицы на 1 секунду в пиковой точке.\n3. Плавно опустите таз вниз без касания пола.'
      },
      {
        id: 'glute_kickback_cable',
        dbFolder: 'Glute_Kickback',
        roleTag: 'Изоляция',
        title: 'Махи ногой назад на ягодицы в кроссовере',
        muscle: 'Ноги и Ягодицы',
        equipment: 'Блочный тренажер / Манжета',
        equipCategory: 'machine',
        animType: 'bridge',
        tempo: '1 сек мах назад · 1 сек фиксация · 2 сек возврат',
        baseWeightMale: 18,
        baseWeightFemale: 12,
        tags: ['lower'],
        alternatives: ['hip_thrust', 'lunges', 'single_leg_bridge'],
        steps: '1. Закрепите манжету на голени у нижнего блока и наклоните корпус вперед на 30°.\n2. Отведите рабочую ногу назад и чуть в сторону за счет сжатия ягодицы, без прогиба в пояснице.\n3. Медленно верните ногу в исходное положение.'
      },
      {
        id: 'single_leg_bridge',
        dbFolder: 'Butt_Lift_Bridge',
        roleTag: 'Изоляция',
        title: 'Ягодичный мостик лежа (без инвентаря)',
        muscle: 'Ноги и Ягодицы',
        equipment: 'Коврик / Свой вес',
        equipCategory: 'bodyweight',
        animType: 'bridge',
        tempo: '2 сек вверх · 2 сек задержка на пике',
        baseWeightMale: 0,
        baseWeightFemale: 0,
        tags: ['lower'],
        alternatives: ['hip_thrust', 'glute_kickback_cable', 'romanian_dl'],
        steps: '1. Лягте на спину, согните ноги в опоре на пятки.\n2. Мощно вытолкните таз вверх, сжимая ягодицы в верхней точке на 2 секунды.\n3. Плавно опустите таз вниз.'
      },
      {
        id: 'romanian_dl',
        dbFolder: 'Romanian_Deadlift',
        roleTag: 'База задней цепи',
        title: 'Румынская тяга со штангой / гантелями',
        muscle: 'Ноги и Ягодицы',
        equipment: 'Штанга / Гантели',
        equipCategory: 'free',
        animType: 'squat',
        tempo: '3 сек растяжение вниз · 1 сек подъем',
        baseWeightMale: 55,
        baseWeightFemale: 28,
        tags: ['fullbody', 'lower', 'pull'],
        alternatives: ['lying_leg_curl', 'hyperextension_glute', 'hip_thrust'],
        steps: '1. Колени слегка мягкие, спина идеально прямая.\n2. Отводите таз назад, скользя снарядом вдоль голеней до ощущения растяжения задней поверхности бедра.\n3. За счет сокращения ягодиц и бицепса бедра вернитесь в исходное положение.'
      },
      {
        id: 'lying_leg_curl',
        dbFolder: 'Lying_Leg_Curls',
        roleTag: 'Изоляция бедра',
        title: 'Сгибание ног в тренажере лежа',
        muscle: 'Ноги и Ягодицы',
        equipment: 'Тренажер для бицепса бедра',
        equipCategory: 'machine',
        animType: 'bridge',
        tempo: '1 сек сгибание · 2 сек плавное разгибание',
        baseWeightMale: 36,
        baseWeightFemale: 20,
        tags: ['lower'],
        alternatives: ['romanian_dl', 'hyperextension_glute', 'single_leg_bridge'],
        steps: '1. Лягте в тренажер так, чтобы валик находился чуть выше щиколоток, прижмите таз к скамье.\n2. На выдохе согните голени к ягодицам.\n3. Подконтрольно опустите вес, не бросая плитки.'
      },
      {
        id: 'hyperextension_glute',
        dbFolder: 'Hyperextensions_Back_Extensions',
        roleTag: 'Вспомогательное',
        title: 'Гиперэкстензия с акцентом на ягодицы и бицепс бедра',
        muscle: 'Ноги и Ягодицы',
        equipment: 'Римский стул / Свой вес',
        equipCategory: 'bodyweight',
        animType: 'bridge',
        tempo: '2 сек вниз · 1 сек подъем за счет ягодиц',
        baseWeightMale: 10,
        baseWeightFemale: 0,
        tags: ['lower', 'pull'],
        alternatives: ['romanian_dl', 'lying_leg_curl', 'hip_thrust'],
        steps: '1. Настройте подушку тренажера ниже сгиба таза, слегка округлите верх спины.\n2. Опуститесь вниз, растягивая заднюю поверхность бедра.\n3. Поднимитесь до прямой линии тела исключительно за счет сжатия ягодиц.'
      },
      {
        id: 'lunges',
        dbFolder: 'Dumbbell_Lunges',
        roleTag: 'Унилатеральное',
        title: 'Выпады с гантелями (классические / болгарские)',
        muscle: 'Ноги и Ягодицы',
        equipment: 'Гантели',
        equipCategory: 'free',
        animType: 'squat',
        tempo: '2 сек вниз · 1 сек толчок пяткой',
        baseWeightMale: 24,
        baseWeightFemale: 16,
        tags: ['lower', 'fullbody'],
        alternatives: ['leg_press_machine', 'step_ups_bench', 'glute_kickback_cable'],
        steps: '1. Сделайте широкий шаг вперед, удерживая корпус слегка наклоненным.\n2. Опуститесь до прямого угла в переднем колене.\n3. Мощно оттолкнитесь пяткой передней ноги назад.'
      },
      {
        id: 'step_ups_bench',
        dbFolder: 'Dumbbell_Step_Ups',
        roleTag: 'Унилатеральное',
        title: 'Высокие зашагивания на скамью / тумбу',
        muscle: 'Ноги и Ягодицы',
        equipment: 'Бокс / Скамья',
        equipCategory: 'bodyweight',
        animType: 'squat',
        tempo: 'Контролируемый подъем и спуск без толчка задней ногой',
        baseWeightMale: 12,
        baseWeightFemale: 0,
        tags: ['lower'],
        alternatives: ['lunges', 'goblet_db_squat', 'leg_press_machine'],
        steps: '1. Поставьте всю стопу рабочей ноги на тумбу или скамью.\n2. Перенесите вес вперед и поднимитесь вверх без отталкивания носком нижней ноги.\n3. Медленно вернитесь вниз под контролем.'
      },

      // --- CHEST ---
      {
        id: 'bench_press',
        dbFolder: 'Barbell_Bench_Press_-_Medium_Grip',
        roleTag: 'База #1 (Жим)',
        title: 'Жим штанги лежа на горизонтальной скамье',
        muscle: 'Грудь',
        equipment: 'Горизонтальная скамья',
        equipCategory: 'free',
        animType: 'push',
        tempo: '2 сек опускание · 1 сек выжим',
        baseWeightMale: 50,
        baseWeightFemale: 18,
        tags: ['fullbody', 'upper', 'push'],
        alternatives: ['chest_press_machine', 'incline_db_press', 'pushups_variations'],
        steps: '1. Сведите лопатки и плотно прижмитесь к скамье, стопы в упоре.\n2. Опустите снаряд к нижней части груди под контролем.\n3. На выдохе выжмите вверх без отрыва таза.'
      },
      {
        id: 'chest_press_machine',
        dbFolder: 'Leverage_Chest_Press',
        roleTag: 'База в тренажере',
        title: 'Жим от груди сидя в рычажном тренажере (Хаммер)',
        muscle: 'Грудь',
        equipment: 'Тренажер для груди',
        equipCategory: 'machine',
        animType: 'push',
        tempo: '2 сек негативная фаза · 1 сек жим',
        baseWeightMale: 48,
        baseWeightFemale: 20,
        tags: ['fullbody', 'upper', 'push'],
        alternatives: ['bench_press', 'incline_db_press', 'pec_deck_fly', 'pushups_variations'],
        steps: '1. Отрегулируйте сиденье так, чтобы рукояти были на уровне середины груди.\n2. Сведите лопатки, прижмите спину к подушке и выжмите рукояти вперед.\n3. Плавно верните вес назад, растягивая грудные мышцы.'
      },
      {
        id: 'incline_db_press',
        dbFolder: 'Incline_Dumbbell_Press',
        roleTag: 'Верх груди',
        title: 'Жим гантелей на наклонной скамье (30°)',
        muscle: 'Грудь',
        equipment: 'Наклонная скамья + гантели',
        equipCategory: 'free',
        animType: 'push',
        tempo: '2 сек глубокое растяжение · 1 сек вверх',
        baseWeightMale: 36,
        baseWeightFemale: 14,
        tags: ['upper', 'push', 'fullbody'],
        alternatives: ['pec_deck_fly', 'chest_press_machine', 'bench_press', 'pushups_variations'],
        steps: '1. Установите спинку скамьи под углом 30 градусов.\n2. Опускайте гантели глубоко, растягивая грудные мышцы.\n3. Выжимайте по дуге вверх, не соударяя гантели в верхней точке.'
      },
      {
        id: 'pec_deck_fly',
        dbFolder: 'Butterfly',
        roleTag: 'Изоляция груди',
        title: 'Сведение рук в тренажере «Бабочка» (Пек-Дек)',
        muscle: 'Грудь',
        equipment: 'Тренажер Пек-Дек / Кроссовер',
        equipCategory: 'machine',
        animType: 'push',
        tempo: '1 сек сведение · 1 сек пиковая пауза · 2 сек разведение',
        baseWeightMale: 35,
        baseWeightFemale: 15,
        tags: ['upper', 'push'],
        alternatives: ['incline_db_press', 'chest_press_machine', 'pushups_variations'],
        steps: '1. Сядьте ровно, локти слегка согнуты и движутся в горизонтальной плоскости.\n2. На выдохе сведите рукояти перед собой и задержитесь на 1 секунду.\n3. Плавно разведите руки до комфортного растяжения груди.'
      },
      {
        id: 'pushups_variations',
        dbFolder: 'Pushups',
        roleTag: 'Свой вес',
        title: 'Классические отжимания от пола / скамьи',
        muscle: 'Грудь',
        equipment: 'Без инвентаря (Свой вес)',
        equipCategory: 'bodyweight',
        animType: 'push',
        tempo: '2 сек вниз · 1 сек мощный подъем',
        baseWeightMale: 0,
        baseWeightFemale: 0,
        tags: ['fullbody', 'upper', 'push'],
        alternatives: ['bench_press', 'chest_press_machine', 'incline_db_press'],
        steps: '1. Примите упор лежа, ладони чуть шире плеч, корпус и ноги в одну прямую линию.\n2. Опуститесь грудью почти до касания пола, локти под углом 45° к корпусу.\n3. Выжмите себя вверх, полностью включая грудные мышцы и трицепс.'
      },

      // --- BACK ---
      {
        id: 'lat_pulldown',
        dbFolder: 'Wide-Grip_Lat_Pulldown',
        roleTag: 'Вертикальная тяга',
        title: 'Вертикальная тяга верхнего блока к груди',
        muscle: 'Спина',
        equipment: 'Блочный тренажер',
        equipCategory: 'machine',
        animType: 'pull',
        tempo: '1 сек тяга вниз · 2 сек подконтрольный возврат',
        baseWeightMale: 45,
        baseWeightFemale: 25,
        tags: ['fullbody', 'upper', 'pull'],
        alternatives: ['pullups_assist', 'one_arm_db_row', 'seated_row'],
        steps: '1. Возьмитесь за рукоять хватом чуть шире плеч.\n2. Опустите плечи вниз и тяните рукоять к верху груди, направляя локти вниз и назад.\n3. Плавно верните рукоять вверх, растягивая широчайшие.'
      },
      {
        id: 'pullups_assist',
        dbFolder: 'Pullups',
        roleTag: 'База спины',
        title: 'Подтягивания на перекладине / в Гравитроне',
        muscle: 'Спина',
        equipment: 'Турник / Гравитрон',
        equipCategory: 'bodyweight',
        animType: 'pull',
        tempo: '1.5 сек подъем · 2 сек опускание',
        baseWeightMale: 0,
        baseWeightFemale: 0,
        tags: ['fullbody', 'upper', 'pull'],
        alternatives: ['lat_pulldown', 'one_arm_db_row', 'seated_row'],
        steps: '1. Возьмитесь за перекладину средним или широким хватом.\n2. Сведите лопатки и подтянитесь грудью к перекладине.\n3. Плавно опуститесь вниз без рывков.'
      },
      {
        id: 'seated_row',
        dbFolder: 'Seated_Cable_Rows',
        roleTag: 'Горизонтальная тяга',
        title: 'Горизонтальная тяга нижнего блока к поясу',
        muscle: 'Спина',
        equipment: 'Блочный тренажер',
        equipCategory: 'machine',
        animType: 'pull',
        tempo: '1 сек тяга · 1 сек сведение лопаток · 2 сек возврат',
        baseWeightMale: 45,
        baseWeightFemale: 24,
        tags: ['upper', 'pull', 'fullbody'],
        alternatives: ['one_arm_db_row', 'barbell_bent_row', 'lat_pulldown'],
        steps: '1. Сохраняйте нейтральное положение позвоночника, грудь раскрыта.\n2. Тяните рукоять к низу живота, сводя лопатки вместе.\n3. Задержитесь на полсекунды и подконтрольно вытяните руки вперед.'
      },
      {
        id: 'one_arm_db_row',
        dbFolder: 'One-Arm_Dumbbell_Row',
        roleTag: 'Унилатеральная тяга',
        title: 'Тяга гантели одной рукой в наклоне',
        muscle: 'Спина',
        equipment: 'Гантель + Скамья',
        equipCategory: 'free',
        animType: 'pull',
        tempo: '1 сек тяга к бедру · 2 сек растяжение вниз',
        baseWeightMale: 22,
        baseWeightFemale: 12,
        tags: ['upper', 'pull', 'fullbody'],
        alternatives: ['seated_row', 'barbell_bent_row', 'lat_pulldown'],
        steps: '1. Упритесь свободной рукой и коленом в скамью, спина параллельна полу.\n2. Тяните гантель по дуге к тазобедренному суставу, работая широчайшей мышцей.\n3. Опустите гантель вниз, растягивая спину.'
      },
      {
        id: 'barbell_bent_row',
        dbFolder: 'Bent_Over_Barbell_Row',
        roleTag: 'База толщины спины',
        title: 'Тяга штанги в наклоне к поясу',
        muscle: 'Спина',
        equipment: 'Штанга',
        equipCategory: 'free',
        animType: 'pull',
        tempo: '1 сек мощная тяга · 2 сек вниз',
        baseWeightMale: 45,
        baseWeightFemale: 22,
        tags: ['upper', 'pull'],
        alternatives: ['seated_row', 'one_arm_db_row', 'pullups_assist'],
        steps: '1. Наклоните корпус вперед под углом 45°, поясница жестко зафиксирована.\n2. Тяните снаряд к нижней части живота, ведя локти вдоль корпуса.\n3. Подконтрольно опустите снаряд.'
      },

      // --- SHOULDERS ---
      {
        id: 'shoulder_press',
        dbFolder: 'Dumbbell_Shoulder_Press',
        roleTag: 'База плеч',
        title: 'Жим гантелей сидя над головой',
        muscle: 'Плечи',
        equipment: 'Гантели + Скамья',
        equipCategory: 'free',
        animType: 'push',
        tempo: '1 сек выжим · 2 сек опускание',
        baseWeightMale: 24,
        baseWeightFemale: 10,
        tags: ['fullbody', 'upper', 'push'],
        alternatives: ['shoulder_machine_press', 'lateral_raises_db', 'pike_pushups'],
        steps: '1. Сядьте ровно, прижав поясницу к спинке скамьи.\n2. Выжмите гантели вверх над головой, не выключая локти полностью.\n3. Медленно опустите до уровня ушей.'
      },
      {
        id: 'shoulder_machine_press',
        dbFolder: 'Leverage_Shoulder_Press',
        roleTag: 'Тренажер дельт',
        title: 'Жим на плечи в рычажном тренажере сидя',
        muscle: 'Плечи',
        equipment: 'Тренажер для дельт',
        equipCategory: 'machine',
        animType: 'push',
        tempo: '1 сек вверх · 2 сек вниз',
        baseWeightMale: 32,
        baseWeightFemale: 14,
        tags: ['upper', 'push'],
        alternatives: ['shoulder_press', 'lateral_raises_db', 'pike_pushups'],
        steps: '1. Установите сиденье так, чтобы рукояти находились на уровне плеч.\n2. Плавно выжмите рукояти вверх на выдохе.\n3. Подконтрольно опустите в исходную точку без бросания веса.'
      },
      {
        id: 'lateral_raises_db',
        dbFolder: 'Side_Lateral_Raise',
        roleTag: 'Средняя дельта',
        title: 'Махи гантелями в стороны стоя (Средняя дельта)',
        muscle: 'Плечи',
        equipment: 'Пара гантелей',
        equipCategory: 'free',
        animType: 'push',
        tempo: '1 сек подъем до параллели · 2 сек плавное опускание',
        baseWeightMale: 16,
        baseWeightFemale: 8,
        tags: ['upper', 'push', 'fullbody'],
        alternatives: ['shoulder_press', 'shoulder_machine_press', 'pike_pushups'],
        steps: '1. Встаньте ровно, руки чуть согнуты в локтях.\n2. Поднимите гантели через стороны до уровня плеч, ведя движение локтями.\n3. Медленно опустите вниз без раскачки корпуса.'
      },
      {
        id: 'pike_pushups',
        dbFolder: 'Handstand_Push-Ups',
        roleTag: 'Свой вес',
        title: 'Отжимания «Уголком» на дельты (Без тренажеров)',
        muscle: 'Плечи',
        equipment: 'Без инвентаря (Свой вес)',
        equipCategory: 'bodyweight',
        animType: 'push',
        tempo: '2 сек вниз · 1 сек выжим',
        baseWeightMale: 0,
        baseWeightFemale: 0,
        tags: ['upper', 'push'],
        alternatives: ['shoulder_press', 'shoulder_machine_press', 'lateral_raises_db'],
        steps: '1. Примите упор лежа и поднимите таз высоко вверх так, чтобы тело образовало перевернутую букву V.\n2. Сгибайте локти, опуская макушку к полу между ладонями.\n3. Мощно выжмите себя обратно вверх силой дельтовидных мышц.'
      },

      // --- ARMS (BICEPS & TRICEPS) ---
      {
        id: 'bicep_tricep',
        dbFolder: 'Alternate_Incline_Dumbbell_Curl',
        roleTag: 'Бицепс (гантели)',
        title: 'Поочередные сгибания рук с гантелями на бицепс',
        muscle: 'Руки',
        equipment: 'Гантели',
        equipCategory: 'free',
        animType: 'curl',
        tempo: '1 сек сокращение · 2 сек негативная фаза',
        baseWeightMale: 20,
        baseWeightFemale: 10,
        tags: ['upper', 'pull'],
        alternatives: ['hammer_curls_db', 'ez_bar_skullcrusher', 'cable_arms_superset'],
        steps: '1. Прижмите локти к корпусу и выполните сгибания рук на бицепс без раскачки спины.\n2. В верхней точке зафиксируйте сокращение на полсекунды и плавно опустите гантели.'
      },
      {
        id: 'hammer_curls_db',
        dbFolder: 'Hammer_Curls',
        roleTag: 'Бицепс + Плечелучевая',
        title: 'Молотки с гантелями стоя (Hammer Curls)',
        muscle: 'Руки',
        equipment: 'Гантели',
        equipCategory: 'free',
        animType: 'curl',
        tempo: '1 сек подъем · 2 сек подконтрольно вниз',
        baseWeightMale: 22,
        baseWeightFemale: 10,
        tags: ['upper', 'pull'],
        alternatives: ['bicep_tricep', 'cable_arms_superset', 'ez_bar_skullcrusher'],
        steps: '1. Удерживайте гантели нейтральным хватом (ладони смотрят друг на друга).\n2. Сгибайте руки в локтях без выведения локтей вперед.\n3. Медленно опустите вниз до полного растяжения.'
      },
      {
        id: 'ez_bar_skullcrusher',
        dbFolder: 'EZ-Bar_Skullcrusher',
        roleTag: 'Трицепс (база)',
        title: 'Французский жим с EZ-штангой лежа (Трицепс)',
        muscle: 'Руки',
        equipment: 'Изогнутый гриф',
        equipCategory: 'free',
        animType: 'curl',
        tempo: 'Подконтрольный темп 2-0-1',
        baseWeightMale: 24,
        baseWeightFemale: 12,
        tags: ['upper', 'push'],
        alternatives: ['cable_arms_superset', 'bench_dips_diamond', 'bicep_tricep'],
        steps: '1. Лягте на скамью и удерживайте EZ-гриф перед собой.\n2. Сгибая только локти, плавно опустите гриф ко лбу или чуть за голову.\n3. Мощно разогните руки силой трицепсов.'
      },
      {
        id: 'cable_arms_superset',
        dbFolder: 'Triceps_Pushdown_-_Rope_Attachment',
        roleTag: 'Трицепс (блок)',
        title: 'Разгибания рук на верхнем блоке с канатом',
        muscle: 'Руки',
        equipment: 'Блочный тренажер',
        equipCategory: 'machine',
        animType: 'curl',
        tempo: 'Постоянное натяжение троса 1-1-2',
        baseWeightMale: 22,
        baseWeightFemale: 10,
        tags: ['upper', 'push'],
        alternatives: ['ez_bar_skullcrusher', 'bench_dips_diamond', 'bicep_tricep'],
        steps: '1. Прижмите локти к бокам и возьмитесь за канатную рукоять верхнего блока.\n2. На выдохе разогните руки до конца, разводя концы каната в стороны в нижней точке.\n3. Плавно верните в исходное положение.'
      },
      {
        id: 'bench_dips_diamond',
        dbFolder: 'Bench_Dips',
        roleTag: 'Трицепс (свой вес)',
        title: 'Обратные отжимания от скамьи на трицепс',
        muscle: 'Руки',
        equipment: 'Скамья / Свой вес',
        equipCategory: 'bodyweight',
        animType: 'curl',
        tempo: '2 сек вниз · 1 сек вверх',
        baseWeightMale: 0,
        baseWeightFemale: 0,
        tags: ['upper', 'push'],
        alternatives: ['cable_arms_superset', 'ez_bar_skullcrusher', 'bicep_tricep'],
        steps: '1. Упритесь ладонями в край скамьи позади себя и опускайте таз вниз, сгибая локти до 90°.\n2. Мощно разгибайте руки, фокусируясь на трицепсе.'
      },

      // --- CORE & CARDIO ---
      {
        id: 'plank_crunch',
        dbFolder: 'Cable_Crunch',
        roleTag: 'Кор / Пресс',
        title: 'Скручивания на верхнем блоке «Молитва» + Планка',
        muscle: 'Пресс и Кор',
        equipment: 'Блочный тренажер / Коврик',
        equipCategory: 'machine',
        animType: 'core',
        tempo: 'Выдох на скручивании · 45 сек статика в планке',
        baseWeightMale: 20,
        baseWeightFemale: 15,
        tags: ['fullbody', 'core', 'lower'],
        alternatives: ['hanging_leg_raise', 'bicycle_abs_mat'],
        steps: '1. Встаньте на колени перед блоком, удерживая канат у головы.\n2. Скручивайте корпус вниз на выдохе, направляя локти к коленям за счет мышц пресса.'
      },
      {
        id: 'hanging_leg_raise',
        dbFolder: 'Hanging_Leg_Raise',
        roleTag: 'Низ пресса',
        title: 'Подъемы ног в висе на перекладине',
        muscle: 'Пресс и Кор',
        equipment: 'Турник / Стойка для пресса',
        equipCategory: 'bodyweight',
        animType: 'core',
        tempo: '1 сек подъем с подкруткой таза · 2 сек опускание',
        baseWeightMale: 0,
        baseWeightFemale: 0,
        tags: ['core', 'fullbody'],
        alternatives: ['plank_crunch', 'bicycle_abs_mat'],
        steps: '1. Повисните на перекладине или упритесь предплечьями в подушки тренажера.\n2. На выдохе поднимите ноги вверх, обязательно подкручивая таз.\n3. Плавно опустите ноги без раскачки.'
      },
      {
        id: 'bicycle_abs_mat',
        dbFolder: 'Air_Bike',
        roleTag: 'Рельеф кора',
        title: 'Кранчи «Велосипед» лежа на коврике',
        muscle: 'Пресс и Кор',
        equipment: 'Коврик (Без тренажеров)',
        equipCategory: 'bodyweight',
        animType: 'core',
        tempo: 'Непрерывный контролируемый ритм',
        baseWeightMale: 0,
        baseWeightFemale: 0,
        tags: ['core', 'fullbody'],
        alternatives: ['plank_crunch', 'hanging_leg_raise'],
        steps: '1. Лягте на спину, прижмите поясницу к полу и поочередно тянитесь локтем к противоположному колену.\n2. Держите пресс в постоянном напряжении.'
      },
      {
        id: 'hiit_cardio',
        dbFolder: 'Rowing_Stationary',
        roleTag: 'Кардио-финишер',
        title: 'Интервальный гребной тренажер / Кардио',
        muscle: 'Пресс и Кор',
        equipment: 'Кардио-тренажер',
        equipCategory: 'machine',
        animType: 'core',
        tempo: '40 сек ускорение · 20 сек спокойный темп',
        baseWeightMale: 0,
        baseWeightFemale: 0,
        tags: ['core', 'fullbody'],
        alternatives: ['burpee_jumping_jacks', 'bicycle_abs_mat'],
        steps: '1. Чередуйте 40 секунд активного темпа и 20 секунд спокойного восстановления.\n2. Следите за ровным дыханием и пульсом в зоне 135–155 уд/мин.'
      },
      {
        id: 'burpee_jumping_jacks',
        dbFolder: 'Mountain_Climbers',
        roleTag: 'Кардио-кор',
        title: 'Динамичный «Альпинист» (Mountain Climbers)',
        muscle: 'Пресс и Кор',
        equipment: 'Без тренажеров (Свой вес)',
        equipCategory: 'bodyweight',
        animType: 'core',
        tempo: '35 сек работа · 25 сек отдых',
        baseWeightMale: 0,
        baseWeightFemale: 0,
        tags: ['core', 'fullbody'],
        alternatives: ['hiit_cardio', 'bicycle_abs_mat'],
        steps: '1. Примите упор лежа и поочередно в быстром темпе подтягивайте колени к груди.\n2. Отличная замена любому кардио-тренажеру в зале или дома.'
      }
    ];

    const EQUIP_BADGE_LABELS = {
      free: 'Гантели / Штанга',
      machine: 'Тренажер / Блок',
      bodyweight: 'Без тренажеров'
    };

    // Helper: Get Photo URLs for an exercise (0.jpg and 1.jpg from Free Exercise DB)
    function getExercisePhotoUrls(ex) {
      if (!ex || !ex.dbFolder) return [];
      return [
        `${FREE_DB_IMG_PREFIX}${ex.dbFolder}/0.jpg`,
        `${FREE_DB_IMG_PREFIX}${ex.dbFolder}/1.jpg`
      ];
    }

    // Helper: Generate animated thumbnail HTML (real photo flipbook with SVG fallback)
    function getExerciseThumbHTML(ex) {
      const customUrl = state.customMediaUrls[ex.id];
      const urls = getExercisePhotoUrls(ex);

      if (customUrl && customUrl.endsWith('.mp4')) {
        return `<video src="${customUrl}" autoplay loop muted playsinline class="w-full h-full object-cover"></video>`;
      }

      if (urls.length === 2) {
        const src0 = customUrl || urls[0];
        const src1 = customUrl || urls[1];
        return `
          <img
            src="${src0}"
            data-frame0="${src0}"
            data-frame1="${src1}"
            alt="${ex.title}"
            class="ex-live-thumb w-full h-full object-cover transition-opacity duration-200"
            onerror="this.style.display='none'; this.nextElementSibling.classList.remove('hidden');"
          />
          <div class="hidden w-full h-full flex items-center justify-center">
            ${getExerciseVisualSVG(ex.animType, true)}
          </div>
        `;
      }
      return getExerciseVisualSVG(ex.animType, true);
    }

    // FitnessOnline-style Cyclic Split Schedule (dividing muscle groups by day for full-body mass & tone)
    function getScheduleForDay(dayIdx) {
      const scheduleTemplates = {
        // FULLBODY SPLIT (FitnessOnline logic: Back/Biceps -> Legs/Shoulders -> Chest/Triceps -> Glutes/Core)
        fullbody: [
          {
            title: 'День 1 (ПН): Спина + Бицепс (Ширина, толщина и руки)',
            type: 'train',
            stretchGroup: 'pull',
            filter: ['lat_pulldown', 'barbell_bent_row', 'seated_row', 'one_arm_db_row', 'bicep_tricep', 'hammer_curls_db']
          },
          { title: 'Вторник: Восстановление ЦНС и легкая растяжка', type: 'rest', stretchGroup: 'pull', filter: [] },
          {
            title: 'День 2 (СР): Ноги + Плечи (База низа и 3D-дельты)',
            type: 'train',
            stretchGroup: 'lower',
            filter: ['sq_barbell', 'romanian_dl', 'leg_press_machine', 'lying_leg_curl', 'shoulder_press', 'lateral_raises_db']
          },
          { title: 'Четверг: Активный отдых (8 000–10 000 шагов)', type: 'rest', stretchGroup: 'lower', filter: [] },
          {
            title: 'День 3 (ПТ): Грудные + Трицепс (Жимовая мощь и руки)',
            type: 'train',
            stretchGroup: 'push',
            filter: ['bench_press', 'incline_db_press', 'chest_press_machine', 'pec_deck_fly', 'ez_bar_skullcrusher', 'cable_arms_superset']
          },
          {
            title: 'День 4 (СБ): Ягодицы + Пресс и Функционал (Доработка цикла)',
            type: 'train',
            stretchGroup: 'core',
            filter: ['hip_thrust', 'lunges', 'glute_kickback_cable', 'plank_crunch', 'hanging_leg_raise', 'hiit_cardio']
          },
          { title: 'Воскресенье: Полный выходной и суперкомпенсация', type: 'rest', stretchGroup: 'core', filter: [] }
        ],
        upper: [
          { title: 'ПН: Спина + Задняя дельта + Бицепс (6 упр.)', type: 'train', stretchGroup: 'pull', filter: ['pullups_assist', 'lat_pulldown', 'seated_row', 'one_arm_db_row', 'bicep_tricep', 'hammer_curls_db'] },
          { title: 'День восстановления', type: 'rest', stretchGroup: 'pull', filter: [] },
          { title: 'СР: Грудь + Передняя/Средняя дельта + Трицепс (6 упр.)', type: 'train', stretchGroup: 'push', filter: ['bench_press', 'incline_db_press', 'pec_deck_fly', 'shoulder_press', 'lateral_raises_db', 'cable_arms_superset'] },
          { title: 'День восстановления', type: 'rest', stretchGroup: 'push', filter: [] },
          { title: 'ПТ: Плечи + Руки (Бицепс/Трицепс суперсеты, 6 упр.)', type: 'train', stretchGroup: 'push', filter: ['shoulder_machine_press', 'lateral_raises_db', 'bicep_tricep', 'hammer_curls_db', 'ez_bar_skullcrusher', 'bench_dips_diamond'] },
          { title: 'СБ: Поддерживающий день Ног + Кор (5 упр.)', type: 'train', stretchGroup: 'lower', filter: ['sq_barbell', 'romanian_dl', 'hip_thrust', 'plank_crunch', 'hanging_leg_raise'] },
          { title: 'Выходной день', type: 'rest', stretchGroup: 'core', filter: [] }
        ],
        lower: [
          { title: 'ПН: Квадрицепс + Ягодицы (Силовая база, 6 упр.)', type: 'train', stretchGroup: 'lower', filter: ['sq_barbell', 'leg_press_machine', 'hack_squat_machine', 'lunges', 'hip_thrust', 'plank_crunch'] },
          { title: 'Восстановление и растяжка ног', type: 'rest', stretchGroup: 'lower', filter: [] },
          { title: 'СР: Спина + Плечи + Осанка (Разгрузка ног, 6 упр.)', type: 'train', stretchGroup: 'pull', filter: ['lat_pulldown', 'seated_row', 'incline_db_press', 'shoulder_press', 'lateral_raises_db', 'bicycle_abs_mat'] },
          { title: 'Активный отдых', type: 'rest', stretchGroup: 'lower', filter: [] },
          { title: 'ПТ: Бицепс бедра + Ягодицы (Задняя цепь, 6 упр.)', type: 'train', stretchGroup: 'lower', filter: ['romanian_dl', 'hip_thrust', 'lying_leg_curl', 'hyperextension_glute', 'glute_kickback_cable', 'hanging_leg_raise'] },
          { title: 'СБ: Унилатеральная проработка ягодиц + Кор (6 упр.)', type: 'train', stretchGroup: 'core', filter: ['goblet_db_squat', 'step_ups_bench', 'single_leg_bridge', 'glute_kickback_cable', 'plank_crunch', 'hiit_cardio'] },
          { title: 'Выходной день', type: 'rest', stretchGroup: 'lower', filter: [] }
        ],
        push: [
          { title: 'ПН: Грудь (База) + Трицепс (6 упр.)', type: 'train', stretchGroup: 'push', filter: ['bench_press', 'incline_db_press', 'chest_press_machine', 'pec_deck_fly', 'ez_bar_skullcrusher', 'cable_arms_superset'] },
          { title: 'День отдыха', type: 'rest', stretchGroup: 'push', filter: [] },
          { title: 'СР: Плечи (3 пучка) + Верх груди + Пресс (6 упр.)', type: 'train', stretchGroup: 'push', filter: ['shoulder_press', 'shoulder_machine_press', 'lateral_raises_db', 'incline_db_press', 'pike_pushups', 'plank_crunch'] },
          { title: 'День отдыха', type: 'rest', stretchGroup: 'push', filter: [] },
          { title: 'ПТ: Грудь (Пампинг) + Трицепс + Кор (6 упр.)', type: 'train', stretchGroup: 'push', filter: ['chest_press_machine', 'pec_deck_fly', 'pushups_variations', 'cable_arms_superset', 'bench_dips_diamond', 'hanging_leg_raise'] },
          { title: 'СБ: Компенсация — Спина и Ноги (5 упр.)', type: 'train', stretchGroup: 'pull', filter: ['lat_pulldown', 'seated_row', 'sq_barbell', 'romanian_dl', 'plank_crunch'] },
          { title: 'Выходной день', type: 'rest', stretchGroup: 'push', filter: [] }
        ],
        pull: [
          { title: 'ПН: Ширина спины + Бицепс (6 упр.)', type: 'train', stretchGroup: 'pull', filter: ['pullups_assist', 'lat_pulldown', 'one_arm_db_row', 'seated_row', 'bicep_tricep', 'hammer_curls_db'] },
          { title: 'День отдыха', type: 'rest', stretchGroup: 'pull', filter: [] },
          { title: 'СР: Толщина спины + Задняя цепь бедра (6 упр.)', type: 'train', stretchGroup: 'pull', filter: ['barbell_bent_row', 'romanian_dl', 'seated_row', 'hyperextension_glute', 'bicep_tricep', 'plank_crunch'] },
          { title: 'День отдыха', type: 'rest', stretchGroup: 'pull', filter: [] },
          { title: 'ПТ: Детализация спины + Руки (6 упр.)', type: 'train', stretchGroup: 'pull', filter: ['lat_pulldown', 'one_arm_db_row', 'pullups_assist', 'hammer_curls_db', 'bicep_tricep', 'hanging_leg_raise'] },
          { title: 'СБ: Компенсация — Ноги, Грудь и Плечи (5 упр.)', type: 'train', stretchGroup: 'lower', filter: ['sq_barbell', 'bench_press', 'shoulder_press', 'lateral_raises_db', 'bicycle_abs_mat'] },
          { title: 'Выходной день', type: 'rest', stretchGroup: 'pull', filter: [] }
        ],
        core: [
          { title: 'ПН: Пресс + Ягодицы + Кардио-метаболизм (6 упр.)', type: 'train', stretchGroup: 'core', filter: ['plank_crunch', 'hanging_leg_raise', 'hip_thrust', 'lunges', 'bicycle_abs_mat', 'hiit_cardio'] },
          { title: 'Низкоинтенсивное кардио', type: 'rest', stretchGroup: 'core', filter: [] },
          { title: 'СР: Функциональный Верх + Стабилизация кора (6 упр.)', type: 'train', stretchGroup: 'push', filter: ['pushups_variations', 'lat_pulldown', 'shoulder_press', 'plank_crunch', 'burpee_jumping_jacks', 'hiit_cardio'] },
          { title: 'День восстановления', type: 'rest', stretchGroup: 'core', filter: [] },
          { title: 'ПТ: Функциональный Низ + Рельеф живота (6 упр.)', type: 'train', stretchGroup: 'lower', filter: ['goblet_db_squat', 'romanian_dl', 'step_ups_bench', 'hanging_leg_raise', 'bicycle_abs_mat', 'burpee_jumping_jacks'] },
          { title: 'СБ: Субботний жиросжигающий HIIT-комплекс (5 упр.)', type: 'train', stretchGroup: 'core', filter: ['bw_jump_squat', 'pushups_variations', 'bicycle_abs_mat', 'burpee_jumping_jacks', 'hiit_cardio'] },
          { title: 'Выходной день', type: 'rest', stretchGroup: 'core', filter: [] }
        ]
      };

      const list = scheduleTemplates[state.focus] || scheduleTemplates.fullbody;
      const dayPlan = list[dayIdx];

      let slotIds = [...dayPlan.filter];
      if (state.gender === 'female' && state.focus === 'fullbody' && dayIdx === 2) {
        // On Legs/Shoulders day (Wed), ensure Hip Thrust is included for female profile
        if (!slotIds.includes('hip_thrust')) {
          slotIds.splice(1, 1, 'hip_thrust');
        }
      }

      const dayExercises = slotIds.map(origId => {
        const swapKey = `${dayIdx}-${origId}`;
        const activeId = state.swappedExercises[swapKey] || origId;
        const exObj = EXERCISES.find(e => e.id === activeId) || EXERCISES.find(e => e.id === origId);
        return {
          ...exObj,
          slotOrigId: origId,
          isSwapped: activeId !== origId
        };
      }).filter(Boolean);

      return {
        ...dayPlan,
        exercises: dayExercises,
        stretches: STRETCH_ROUTINES[dayPlan.stretchGroup || 'pull'] || STRETCH_ROUTINES.pull
      };
    }

    // Get all alternative exercises for a given exercise ID
    function getAlternativesForExercise(exId) {
      const baseEx = EXERCISES.find(e => e.id === exId);
      if (!baseEx) return [];
      const explicitIds = baseEx.alternatives || [];
      const sameMuscle = EXERCISES.filter(e => e.muscle === baseEx.muscle && e.id !== exId).map(e => e.id);
      const mergedIds = Array.from(new Set([...explicitIds, ...sameMuscle]));
      return mergedIds.map(id => EXERCISES.find(e => e.id === id)).filter(Boolean);
    }

    // Calculate Dynamic Sets, Reps & Recommended Weight for an Exercise
    function getExercisePrescription(ex) {
      const lvl = LEVEL_CONFIG[state.level];
      const wk = WEEK_CONFIG[state.week];

      const sets = Math.max(2, lvl.baseSets + wk.addSets);
      const repsMin = Math.max(8, lvl.baseRepsMin + wk.addReps);
      const repsMax = Math.max(10, lvl.baseRepsMax + wk.addReps);

      const rawBase = state.gender === 'male' ? ex.baseWeightMale : ex.baseWeightFemale;
      let recWeight = 0;
      if (rawBase > 0) {
        recWeight = Math.round((rawBase * lvl.weightMult * wk.weightFactor) / 2) * 2;
      }
      if (state.customWeights[ex.id] !== undefined) {
        recWeight = state.customWeights[ex.id];
      }

      return {
        sets,
        repsRange: `${repsMin}–${repsMax}`,
        avgReps: Math.round((repsMin + repsMax) / 2),
        weight: recWeight
      };
    }

    