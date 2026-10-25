// --- RENDER FUNCTIONS ---

    function renderControls() {
      document.querySelectorAll('.gender-btn').forEach(btn => {
        const active = btn.dataset.gender === state.gender;
        btn.className = `gender-btn py-2 px-3 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 ${
          active ? 'bg-emerald-500 text-slate-950 shadow' : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
        }`;
      });

      document.querySelectorAll('.level-btn').forEach(btn => {
        const active = btn.dataset.level === state.level;
        btn.className = `level-btn py-2 px-2 rounded-lg text-xs font-semibold transition ${
          active ? 'bg-emerald-500 text-slate-950 shadow' : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
        }`;
      });

      document.querySelectorAll('.week-btn').forEach(btn => {
        const wNum = Number(btn.dataset.week);
        const active = wNum === state.week;
        const isDeload = wNum === 4;
        btn.className = `week-btn py-2 rounded-lg text-[11px] font-bold transition ${
          active
            ? isDeload ? 'bg-teal-400 text-slate-950 shadow' : 'bg-indigo-500 text-white shadow'
            : isDeload ? 'bg-teal-950/60 text-teal-300 border border-teal-500/30 hover:bg-teal-900/50' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
        }`;
      });

      document.querySelectorAll('.focus-btn').forEach(btn => {
        const active = btn.dataset.focus === state.focus;
        btn.className = `focus-btn shrink-0 px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
          active ? 'bg-emerald-500 text-slate-950 shadow' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
        }`;
      });

      const lvl = LEVEL_CONFIG[state.level];
      const wk = WEEK_CONFIG[state.week];
      const setsNow = Math.max(2, lvl.baseSets + wk.addSets);
      const rMin = Math.max(8, lvl.baseRepsMin + wk.addReps);
      const rMax = Math.max(10, lvl.baseRepsMax + wk.addReps);
      const genderLabel = state.gender === 'male' ? 'Мужчина (акцент: масса и сила)' : 'Девушка (акцент: рельеф и ягодицы)';

      document.getElementById('progressionBadge').textContent = wk.label;
      document.getElementById('formulaTitle').textContent = `${genderLabel} · ${lvl.name} · Неделя ${state.week}/8`;
      document.getElementById('formulaDetails').textContent =
        `${setsNow} раб. подхода × ${rMin}–${rMax} повторений · Отдых ${lvl.restSec} сек · ${wk.isDeload ? 'Разгрузка ЦНС (RIR 3–4)' : lvl.rir}`;
    }

    function renderDayStrip() {
      const strip = document.getElementById('dayStrip');
      strip.innerHTML = '';

      DAYS_OF_WEEK.forEach((d, idx) => {
        const plan = getScheduleForDay(idx);
        const isSelected = idx === state.selectedDay;
        const isTrain = plan.type === 'train';

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `flex flex-col items-center justify-center py-2.5 px-1 rounded-xl border text-xs transition ${
          isSelected
            ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-extrabold shadow-lg shadow-emerald-500/20'
            : isTrain
            ? 'bg-slate-800/90 text-slate-200 border-slate-700 hover:bg-slate-800'
            : 'bg-slate-950/60 text-slate-500 border-slate-800/80 hover:bg-slate-900'
        }`;

        btn.innerHTML = `
          <span class="text-[11px] uppercase">${d.short}</span>
          <span class="mt-1 w-2 h-2 rounded-full ${
            isSelected ? 'bg-slate-950' : isTrain ? 'bg-emerald-400' : 'bg-slate-700'
          }"></span>
        `;

        btn.addEventListener('click', () => {
          state.selectedDay = idx;
          renderAll();
        });
        strip.appendChild(btn);
      });

      const currentPlan = getScheduleForDay(state.selectedDay);
      document.getElementById('selectedDayLabel').textContent =
        `${DAYS_OF_WEEK[state.selectedDay].full} — ${currentPlan.title}`;
    }

    function renderWorkoutDay() {
      const container = document.getElementById('workoutDayContainer');
      const stretchContainer = document.getElementById('stretchingBlockContainer');
      const plan = getScheduleForDay(state.selectedDay);

      if (plan.type === 'rest') {
        document.getElementById('dayCompletionStat').textContent = 'День отдыха';
        container.innerHTML = `
          <div class="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 text-center space-y-3">
            <div class="w-12 h-12 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 mx-auto flex items-center justify-center text-xl font-bold">
              🧘
            </div>
            <h3 class="text-base font-bold text-white">${plan.title}</h3>
            <p class="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
              После прицельной проработки мышечной группы волокнам требуется 48–72 часа на суперкомпенсацию и синтез белка. Сегодня — легкая активность и восстановление.
            </p>
            <button type="button" id="jumpNextWorkoutBtn" class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 text-xs font-bold hover:bg-emerald-400 transition">
              Перейти к следующему тренировочному дню →
            </button>
          </div>
        `;
        stretchContainer.innerHTML = '';
        const jumpBtn = document.getElementById('jumpNextWorkoutBtn');
        if (jumpBtn) {
          jumpBtn.addEventListener('click', () => {
            const nextTrain = [0, 2, 4, 5].find(d => d > state.selectedDay) ?? 0;
            state.selectedDay = nextTrain;
            renderAll();
          });
        }
        return;
      }

      let totalSetsDay = 0;
      let doneSetsDay = 0;

      container.innerHTML = '';

      plan.exercises.forEach((ex, exIndex) => {
        const presc = getExercisePrescription(ex);
        totalSetsDay += presc.sets;
        const alternativesCount = getAlternativesForExercise(ex.id).length;

        const card = document.createElement('div');
        card.className = `bg-slate-900/90 border rounded-2xl p-4 space-y-3 transition ${
          ex.isSwapped ? 'border-indigo-500/50' : 'border-slate-800 hover:border-slate-700'
        }`;

        // Build set pills
        let setsHtml = '';
        for (let s = 1; s <= presc.sets; s++) {
          const key = `${state.selectedDay}-${ex.slotOrigId}-${s}`;
          const isDone = !!state.completedSets[key];
          if (isDone) doneSetsDay++;

          setsHtml += `
            <button type="button" data-set-key="${key}" class="set-toggle-btn flex items-center justify-between px-3 py-2 rounded-xl border text-xs font-semibold transition ${
              isDone
                ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:border-slate-700'
            }">
              <span>Сет ${s}: <strong>${presc.repsRange}</strong> повт.</span>
              <span class="w-5 h-5 rounded-md flex items-center justify-center text-[11px] ${
                isDone ? 'bg-emerald-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-500'
              }">${isDone ? '✓' : s}</span>
            </button>
          `;
        }

        const weightControlHtml = ex.baseWeightMale > 0 ? `
          <div class="flex items-center gap-1.5 bg-slate-950/80 border border-slate-800 rounded-xl px-2.5 py-1">
            <button type="button" data-weight-ex="${ex.id}" data-weight-delta="-2" class="weight-adj-btn text-slate-400 hover:text-white px-1.5 font-bold">−</button>
            <span class="text-xs font-bold text-emerald-400 min-w-[54px] text-center">${presc.weight} кг</span>
            <button type="button" data-weight-ex="${ex.id}" data-weight-delta="2" class="weight-adj-btn text-slate-400 hover:text-white px-1.5 font-bold">+</button>
          </div>
        ` : `<span class="text-xs font-semibold text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-xl border border-indigo-500/20">Свой вес / Кардио</span>`;

        const swappedBadge = ex.isSwapped
          ? `<span class="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">Заменено</span>`
          : '';

        const roleBadge = ex.roleTag
          ? `<span class="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-800 text-amber-300 border border-amber-500/20">${ex.roleTag}</span>`
          : '';

        card.innerHTML = `
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <!-- Left: Animated Real Photo Thumbnail + Title -->
            <div class="flex items-center gap-3">
              <button type="button" data-info-ex="${ex.id}" data-slot-orig="${ex.slotOrigId}" class="info-ex-btn relative shrink-0 w-20 h-20 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center overflow-hidden group hover:border-emerald-500/60 transition" title="Открыть живое фото и технику">
                ${getExerciseThumbHTML(ex)}
                <span class="absolute bottom-1 right-1 bg-slate-950/90 text-emerald-400 border border-emerald-500/40 rounded-md px-1.5 py-0.5 text-[9px] font-extrabold shadow">▶ ФОТО</span>
              </button>
              <div class="space-y-1">
                <div class="flex flex-wrap items-center gap-1.5">
                  <span class="w-5 h-5 rounded-md bg-slate-800 text-slate-300 text-[11px] font-bold flex items-center justify-center">${exIndex + 1}</span>
                  <span class="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-800 text-emerald-400">${ex.muscle}</span>
                  ${roleBadge}
                  <span class="text-[11px] text-slate-400">${ex.equipment}</span>
                  ${swappedBadge}
                </div>
                <h4 class="text-sm font-bold text-white leading-snug">${ex.title}</h4>
              </div>
            </div>

            <!-- Right: Weight + Video Btn + Swap Btn -->
            <div class="flex flex-wrap items-center gap-1.5">
              ${weightControlHtml}
              <button type="button" data-info-ex="${ex.id}" data-slot-orig="${ex.slotOrigId}" class="info-ex-btn px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-emerald-400 border border-slate-700 transition flex items-center gap-1">
                <span>▶ Техника</span>
              </button>
              <button type="button" data-swap-orig="${ex.slotOrigId}" data-swap-curr="${ex.id}" class="swap-ex-btn px-2.5 py-1.5 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 text-xs font-semibold text-indigo-300 border border-indigo-500/30 transition flex items-center gap-1">
                <span>🔄 Заменить (${alternativesCount})</span>
              </button>
            </div>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
            ${setsHtml}
          </div>
        `;

        container.appendChild(card);
      });

      document.getElementById('dayCompletionStat').textContent = `${doneSetsDay} / ${totalSetsDay} сетов`;

      // Render Post-Workout Cooldown & Stretching Block (like FitnessOnline)
      let doneStretches = 0;
      const stretchesHtml = plan.stretches.map(st => {
        const stKey = `${state.selectedDay}-${st.id}`;
        const isDone = !!state.completedStretches[stKey];
        if (isDone) doneStretches++;
        return `
          <div class="p-3 rounded-xl bg-slate-950/70 border ${isDone ? 'border-teal-500/50 bg-teal-950/20' : 'border-slate-800'} flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div class="space-y-0.5">
              <div class="flex items-center gap-2">
                <span class="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-teal-500/15 text-teal-300 border border-teal-500/30">${st.duration}</span>
                <span class="text-[11px] text-slate-400">${st.target}</span>
              </div>
              <h5 class="text-xs sm:text-sm font-bold text-white">${st.title}</h5>
              <p class="text-[11px] text-slate-400 leading-relaxed">${st.desc}</p>
            </div>
            <button type="button" data-stretch-key="${stKey}" class="stretch-toggle-btn shrink-0 px-3 py-2 rounded-xl text-xs font-bold transition ${
              isDone ? 'bg-teal-500 text-slate-950' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }">
              ${isDone ? '✓ Выполнено' : 'Отметить заминку'}
            </button>
          </div>
        `;
      }).join('');

      stretchContainer.innerHTML = `
        <div class="bg-gradient-to-br from-teal-950/50 via-slate-900 to-slate-900 border border-teal-500/30 rounded-2xl p-4 space-y-3">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div class="flex items-center gap-2">
              <span class="text-lg">🧘‍♂️</span>
              <div>
                <h3 class="text-sm font-extrabold text-white">Заминка и растяжка рабочих мышц в конце тренировки (5–7 мин)</h3>
                <p class="text-xs text-slate-400">Подобрана специально под сегодняшние мышечные группы (как в FitnessOnline)</p>
              </div>
            </div>
            <span class="text-xs font-bold text-teal-300 bg-teal-500/10 px-2.5 py-1 rounded-lg border border-teal-500/20">
              Заминка: ${doneStretches} / ${plan.stretches.length}
            </span>
          </div>
          <div class="space-y-2">
            ${stretchesHtml}
          </div>
        </div>
      `;

      // Attach listeners for set buttons
      container.querySelectorAll('.set-toggle-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const k = btn.dataset.setKey;
          state.completedSets[k] = !state.completedSets[k];
          if (state.completedSets[k]) {
            startRestTimer(LEVEL_CONFIG[state.level].restSec);
          }
          renderAll();
        });
      });

      // Attach listeners for weight adjustment
      container.querySelectorAll('.weight-adj-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const exId = btn.dataset.weightEx;
          const delta = Number(btn.dataset.weightDelta);
          const exObj = EXERCISES.find(e => e.id === exId);
          const current = getExercisePrescription(exObj).weight;
          state.customWeights[exId] = Math.max(2, current + delta);
          renderAll();
        });
      });

      // Attach listeners for technique modal
      container.querySelectorAll('.info-ex-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          openExerciseModal(btn.dataset.infoEx, btn.dataset.slotOrig || null);
        });
      });

      // Attach listeners for Swap modal
      container.querySelectorAll('.swap-ex-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          openSwapModal(state.selectedDay, btn.dataset.swapOrig, btn.dataset.swapCurr);
        });
      });

      // Attach listeners for Stretch toggles
      stretchContainer.querySelectorAll('.stretch-toggle-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const k = btn.dataset.stretchKey;
          state.completedStretches[k] = !state.completedStretches[k];
          renderAll();
        });
      });
    }

    function renderFullWeekSchedule() {
      const grid = document.getElementById('fullWeekGrid');
      grid.innerHTML = '';

      DAYS_OF_WEEK.forEach((d, idx) => {
        const plan = getScheduleForDay(idx);
        const isTrain = plan.type === 'train';

        const exListHtml = isTrain
          ? plan.exercises.map((ex, i) => {
              const p = getExercisePrescription(ex);
              return `<li class="flex items-center justify-between text-xs py-1 border-b border-slate-800/60 last:border-0">
                <span class="text-slate-300 truncate pr-2">${i + 1}. ${ex.title}</span>
                <span class="text-emerald-400 font-semibold shrink-0">${p.sets}×${p.repsRange}</span>
              </li>`;
            }).join('') + `<li class="text-[11px] text-teal-300 pt-1.5 font-semibold">🧘 + Заминка и растяжка (${plan.stretches.length} упр.)</li>`
          : `<p class="text-xs text-slate-500 py-2">Активное восстановление, растяжка или прогулка.</p>`;

        const card = document.createElement('div');
        card.className = `rounded-xl p-3.5 border ${
          isTrain ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-950/30 border-slate-800/50'
        }`;
        card.innerHTML = `
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-extrabold uppercase ${isTrain ? 'text-emerald-400' : 'text-slate-500'}">${d.full}</span>
            <button type="button" data-open-day="${idx}" class="open-day-btn text-[11px] font-semibold text-indigo-400 hover:underline">
              Открыть день →
            </button>
          </div>
          <div class="text-xs font-bold text-white mb-2">${plan.title}</div>
          <ul class="space-y-0.5">${exListHtml}</ul>
        `;
        grid.appendChild(card);
      });

      grid.querySelectorAll('.open-day-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          state.selectedDay = Number(btn.dataset.openDay);
          switchTab('workout');
          renderAll();
        });
      });
    }

    function renderExerciseCatalog() {
      const filterVal = document.getElementById('CatalogMuscleFilter').value;
      const listEl = document.getElementById('exerciseCatalogList');
      listEl.innerHTML = '';

      const filtered = EXERCISES.filter(e => filterVal === 'all' || e.muscle === filterVal);

      filtered.forEach(ex => {
        const presc = getExercisePrescription(ex);
        const alts = getAlternativesForExercise(ex.id);
        const item = document.createElement('div');
        item.className = 'bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between gap-3';
        item.innerHTML = `
          <div class="flex items-start gap-3">
            <div class="shrink-0 w-20 h-20 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center overflow-hidden">
              ${getExerciseThumbHTML(ex)}
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex flex-wrap items-center justify-between gap-1">
                <span class="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400">${ex.muscle}</span>
                <span class="text-[10px] text-slate-400">${EQUIP_BADGE_LABELS[ex.equipCategory] || ex.equipment}</span>
              </div>
              <h4 class="text-sm font-bold text-white mt-1 leading-snug">${ex.title}</h4>
              <p class="text-[11px] text-slate-400 mt-1">Аналогов в базе: <strong class="text-indigo-300">${alts.length}</strong></p>
            </div>
          </div>
          <div class="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs">
            <span class="text-slate-300">Норма: <strong class="text-emerald-400">${presc.sets} × ${presc.repsRange}</strong></span>
            <button type="button" data-info-ex="${ex.id}" class="catalog-info-btn text-emerald-400 font-semibold hover:underline">▶ Живое фото и техника →</button>
          </div>
        `;
        listEl.appendChild(item);
      });

      listEl.querySelectorAll('.catalog-info-btn').forEach(btn => {
        btn.addEventListener('click', () => openExerciseModal(btn.dataset.infoEx, null));
      });
    }

    function renderAnalytics() {
      const doneKeys = Object.keys(state.completedSets).filter(k => state.completedSets[k]);
      const completedCount = doneKeys.length;

      let totalVolume = 0;
      doneKeys.forEach(k => {
        const parts = k.split('-');
        const dayIdx = Number(parts[0]);
        const slotOrigId = parts[1];
        const swapKey = `${dayIdx}-${slotOrigId}`;
        const activeId = state.swappedExercises[swapKey] || slotOrigId;
        const ex = EXERCISES.find(e => e.id === activeId);
        if (ex) {
          const p = getExercisePrescription(ex);
          totalVolume += (p.weight || 15) * p.avgReps;
        }
      });

      const stretchDoneCount = Object.keys(state.completedStretches).filter(k => state.completedStretches[k]).length;
      const calories = completedCount * 28 + stretchDoneCount * 15;

      document.getElementById('statCompletedSets').textContent = String(completedCount);
      document.getElementById('statTotalVolume').textContent = `${totalVolume.toLocaleString('ru-RU')} кг`;
      document.getElementById('statCalories').textContent = `${calories} ккал`;

      const barsContainer = document.getElementById('volumeBarsContainer');
      barsContainer.innerHTML = '';

      const sampleExercises = getScheduleForDay(0).exercises;
      const weekVolumes = [1, 2, 3, 4, 5, 6, 7, 8].map(w => {
        const lvl = LEVEL_CONFIG[state.level];
        const wk = WEEK_CONFIG[w];
        let sum = 0;
        sampleExercises.forEach(ex => {
          const baseW = state.gender === 'male' ? (ex.baseWeightMale || 20) : (ex.baseWeightFemale || 12);
          const sets = Math.max(2, lvl.baseSets + wk.addSets);
          const reps = Math.max(8, lvl.baseRepsMin + wk.addReps);
          const weight = Math.round(baseW * lvl.weightMult * wk.weightFactor);
          sum += sets * reps * weight;
        });
        return { week: w, volume: sum, isDeload: wk.isDeload };
      });

      const maxVol = Math.max(...weekVolumes.map(v => v.volume), 1);

      weekVolumes.forEach(item => {
        const heightPct = Math.max(18, Math.round((item.volume / maxVol) * 100));
        const isCurrent = item.week === state.week;
        const col = document.createElement('div');
        col.className = 'flex-1 flex flex-col items-center justify-end h-full cursor-pointer';
        col.innerHTML = `
          <div class="text-[10px] font-bold mb-1 ${isCurrent ? 'text-emerald-400' : item.isDeload ? 'text-teal-300' : 'text-slate-400'}">${item.volume}</div>
          <div class="w-full max-w-[42px] rounded-t-xl transition-all duration-300 ${
            isCurrent
              ? 'bg-gradient-to-t from-emerald-600 to-emerald-400 shadow-lg shadow-emerald-500/20'
              : item.isDeload
              ? 'bg-teal-900/70 border border-teal-500/40'
              : 'bg-slate-800 hover:bg-slate-700'
          }" style="height: ${heightPct}%"></div>
          <div class="text-[10px] font-bold mt-2 ${isCurrent ? 'text-white' : item.isDeload ? 'text-teal-300' : 'text-slate-400'}">Н${item.week}${item.isDeload ? '🌿' : ''}</div>
        `;
        col.addEventListener('click', () => {
          state.week = item.week;
          renderAll();
        });
        barsContainer.appendChild(col);
      });
    }

    // --- TECHNIQUE & REAL PHOTO/VIDEO MODAL ---
    function renderModalStage() {
      const ex = EXERCISES.find(e => e.id === state.modalExId);
      if (!ex) return;

      const stage = document.getElementById('modalVideoStage');
      const modePhotoBtn = document.getElementById('modePhotoBtn');
      const modeVectorBtn = document.getElementById('modeVectorBtn');
      const frameBadge = document.getElementById('frameIndicatorBadge');

      modePhotoBtn.className = `px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
        state.modalMediaMode === 'photo' ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
      }`;
      modeVectorBtn.className = `px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
        state.modalMediaMode === 'vector' ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
      }`;

      if (state.modalFlipInterval) {
        clearInterval(state.modalFlipInterval);
        state.modalFlipInterval = null;
      }

      const customUrl = state.customMediaUrls[ex.id];
      const urls = getExercisePhotoUrls(ex);

      if (state.modalMediaMode === 'vector') {
        frameBadge.textContent = 'Биомеханика';
        stage.innerHTML = getExerciseVisualSVG(ex.animType, false);
        return;
      }

      if (customUrl && customUrl.endsWith('.mp4')) {
        frameBadge.textContent = 'HD MP4 Видео';
        stage.innerHTML = `<video src="${customUrl}" autoplay loop muted playsinline controls class="max-h-56 rounded-xl object-contain"></video>`;
        return;
      }

      if (customUrl) {
        frameBadge.textContent = 'Своя GIF-анимация';
        stage.innerHTML = `
          <img
            src="${customUrl}"
            alt="${ex.title}"
            class="max-h-56 rounded-xl object-contain"
            onerror="this.onerror=null; this.src='${urls[0] || ''}';"
          />
        `;
        return;
      }

      // Default: Real 2-frame Exercise Photo Flipbook from Free Exercise DB
      state.modalFrameIdx = 0;
      frameBadge.textContent = 'Фаза 1: Старт';

      stage.innerHTML = `
        <img
          id="modalFlipImage"
          src="${urls[0]}"
          alt="${ex.title}"
          class="max-h-56 w-auto rounded-xl object-contain shadow-lg border border-slate-800 transition-all duration-200"
          onerror="this.style.display='none'; document.getElementById('modalFallbackSvg').classList.remove('hidden');"
        />
        <div id="modalFallbackSvg" class="hidden flex items-center justify-center">
          ${getExerciseVisualSVG(ex.animType, false)}
        </div>
      `;

      state.modalFlipInterval = setInterval(() => {
        if (state.animPaused) return;
        const imgEl = document.getElementById('modalFlipImage');
        if (!imgEl) return;
        state.modalFrameIdx = state.modalFrameIdx === 0 ? 1 : 0;
        imgEl.src = urls[state.modalFrameIdx];
        frameBadge.textContent = state.modalFrameIdx === 0 ? 'Фаза 1: Старт' : 'Фаза 2: Пик усилия';
      }, 950);
    }

    function openExerciseModal(exId, slotOrigId) {
      const ex = EXERCISES.find(e => e.id === exId);
      if (!ex) return;

      state.modalExId = exId;
      state.animPaused = false;
      document.getElementById('toggleAnimPlayBtn').textContent = 'Пауза';
      document.getElementById('modalVideoStage').classList.remove('svg-paused');
      document.getElementById('customMediaBox').classList.add('hidden');
      document.getElementById('customMediaUrlInput').value = state.customMediaUrls[ex.id] || '';

      document.getElementById('modalMuscleTag').textContent = ex.muscle;
      document.getElementById('modalEquipBadge').textContent = EQUIP_BADGE_LABELS[ex.equipCategory] || ex.equipment;
      document.getElementById('modalExerciseTitle').textContent = ex.title;
      document.getElementById('modalTempoText').textContent = `Темп: ${ex.tempo || '2 сек вниз · 1 сек вверх'}`;
      document.getElementById('modalExerciseSteps').innerHTML = ex.steps
        .split('\n')
        .map(line => `<p>${line}</p>`)
        .join('');
      document.getElementById('modalEquipment').textContent = `Инвентарь: ${ex.equipment}`;

      renderModalStage();

      const alts = getAlternativesForExercise(ex.id);
      const altListEl = document.getElementById('modalAlternativesList');
      altListEl.innerHTML = '';
      alts.forEach(alt => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-indigo-500/30 border border-slate-700 hover:border-indigo-500/40 text-[11px] text-slate-200 transition flex items-center gap-1';
        chip.innerHTML = `<span>🔄 ${alt.title}</span>`;
        chip.addEventListener('click', () => {
          if (slotOrigId) {
            state.swappedExercises[`${state.selectedDay}-${slotOrigId}`] = alt.id;
            renderAll();
          }
          openExerciseModal(alt.id, slotOrigId);
        });
        altListEl.appendChild(chip);
      });

      document.getElementById('exerciseModal').classList.remove('hidden');
    }

    function closeExerciseModal() {
      if (state.modalFlipInterval) {
        clearInterval(state.modalFlipInterval);
        state.modalFlipInterval = null;
      }
      document.getElementById('exerciseModal').classList.add('hidden');
    }

    // --- SWAP EXERCISE MODAL ---
    function openSwapModal(dayIdx, origId, currentId) {
      state.activeSwapSlot = { dayIdx, origId, currentId };
      state.swapFilterEq = 'all';

      const currEx = EXERCISES.find(e => e.id === currentId);
      document.getElementById('swapCurrentExSub').textContent =
        `Сейчас в плане: ${currEx ? currEx.title : ''} (${currEx ? currEx.muscle : ''})`;

      renderSwapModalOptions();
      document.getElementById('swapModal').classList.remove('hidden');
    }

    function renderSwapModalOptions() {
      if (!state.activeSwapSlot) return;
      const { dayIdx, origId, currentId } = state.activeSwapSlot;

      document.querySelectorAll('.swap-eq-btn').forEach(btn => {
        const active = btn.dataset.eq === state.swapFilterEq;
        btn.className = `swap-eq-btn shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
          active ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
        }`;
      });

      const baseEx = EXERCISES.find(e => e.id === origId);
      const allSameMuscle = EXERCISES.filter(e => e.muscle === baseEx.muscle);

      const filtered = allSameMuscle.filter(ex => {
        if (state.swapFilterEq === 'all') return true;
        return ex.equipCategory === state.swapFilterEq;
      });

      const container = document.getElementById('swapOptionsContainer');
      container.innerHTML = '';

      if (filtered.length === 0) {
        container.innerHTML = `<p class="text-xs text-slate-400 py-4 text-center">Для выбранного фильтра оборудования нет вариантов. Выберите «Все варианты».</p>`;
        return;
      }

      filtered.forEach(ex => {
        const isCurrent = ex.id === currentId;
        const isOriginal = ex.id === origId;
        const presc = getExercisePrescription(ex);

        const row = document.createElement('div');
        row.className = `p-3 rounded-xl border flex items-center justify-between gap-3 transition ${
          isCurrent
            ? 'bg-emerald-500/15 border-emerald-500/50'
            : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
        }`;

        row.innerHTML = `
          <div class="flex items-center gap-3 min-w-0">
            <div class="shrink-0 w-16 h-16 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center overflow-hidden">
              ${getExerciseThumbHTML(ex)}
            </div>
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-1.5">
                <span class="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-emerald-400">${EQUIP_BADGE_LABELS[ex.equipCategory] || ex.equipment}</span>
                ${isOriginal ? '<span class="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">По умолчанию</span>' : ''}
                ${isCurrent ? '<span class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500 text-slate-950">Выбрано</span>' : ''}
              </div>
              <h4 class="text-xs sm:text-sm font-bold text-white mt-1 truncate">${ex.title}</h4>
              <p class="text-[11px] text-slate-400">Нагрузка: ${presc.sets}×${presc.repsRange} ${presc.weight > 0 ? '· ' + presc.weight + ' кг' : '· Свой вес'}</p>
            </div>
          </div>

          <button type="button" data-select-swap="${ex.id}" class="select-swap-btn shrink-0 px-3 py-2 rounded-xl text-xs font-bold transition ${
            isCurrent
              ? 'bg-slate-800 text-slate-400'
              : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow'
          }">
            ${isCurrent ? 'Оставить' : 'Выбрать'}
          </button>
        `;
        container.appendChild(row);
      });

      container.querySelectorAll('.select-swap-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const chosenId = btn.dataset.selectSwap;
          const swapKey = `${dayIdx}-${origId}`;
          if (chosenId === origId) {
            delete state.swappedExercises[swapKey];
          } else {
            state.swappedExercises[swapKey] = chosenId;
          }
          closeSwapModal();
          renderAll();
        });
      });
    }

    function closeSwapModal() {
      document.getElementById('swapModal').classList.add('hidden');
      state.activeSwapSlot = null;
    }

    function switchTab(tabName) {
      state.activeTab = tabName;
      ['workout', 'schedule', 'exercises', 'analytics'].forEach(t => {
        const el = document.getElementById(`view-${t}`);
        if (el) el.classList.toggle('hidden', t !== tabName);
      });

      document.querySelectorAll('.nav-tab-btn').forEach(btn => {
        const active = btn.dataset.tab === tabName;
        btn.className = `nav-tab-btn flex flex-col items-center justify-center py-1.5 rounded-xl font-semibold text-xs transition ${
          active ? 'text-emerald-400 bg-emerald-500/10' : 'text-slate-400 hover:text-slate-200'
        }`;
      });
    }

    // Rest Timer
    function formatTime(sec) {
      const m = String(Math.floor(sec / 60)).padStart(2, '0');
      const s = String(sec % 60).padStart(2, '0');
      return `${m}:${s}`;
    }

    function startRestTimer(seconds) {
      if (state.timerInterval) clearInterval(state.timerInterval);
      state.timerSeconds = seconds;
      state.timerRunning = true;
      const btn = document.getElementById('restTimerBtn');
      const label = document.getElementById('restTimerLabel');
      btn.classList.add('timer-active', 'border-emerald-500');
      label.textContent = `Отдых ${formatTime(state.timerSeconds)}`;

      state.timerInterval = setInterval(() => {
        state.timerSeconds--;
        if (state.timerSeconds <= 0) {
          clearInterval(state.timerInterval);
          state.timerRunning = false;
          btn.classList.remove('timer-active', 'border-emerald-500');
          label.textContent = 'Отдых завершен!';
        } else {
          label.textContent = `Отдых ${formatTime(state.timerSeconds)}`;
        }
      }, 1000);
    }

    function renderAll() {
      syncStateToServer();
      renderControls();
      renderDayStrip();
      renderWorkoutDay();
      renderFullWeekSchedule();
      renderExerciseCatalog();
      renderAnalytics();
    }

    // Global background ticker that animates all exercise card thumbnails (0.jpg <-> 1.jpg)
    function startCardThumbFlipper() {
      if (state.cardFlipInterval) clearInterval(state.cardFlipInterval);
      state.cardFlipInterval = setInterval(() => {
        state.globalFrameIdx = state.globalFrameIdx === 0 ? 1 : 0;
        document.querySelectorAll('.ex-live-thumb').forEach(img => {
          const nextSrc = state.globalFrameIdx === 0 ? img.dataset.frame0 : img.dataset.frame1;
          if (nextSrc && img.src !== nextSrc) {
            img.src = nextSrc;
          }
        });
      }, 1100);
    }

    // --- INITIALIZATION & EVENT LISTENERS ---
    window.addEventListener('DOMContentLoaded', () => {
      document.querySelectorAll('.gender-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          state.gender = btn.dataset.gender;
          renderAll();
        });
      });

      document.querySelectorAll('.level-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          state.level = btn.dataset.level;
          renderAll();
        });
      });

      document.querySelectorAll('.week-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          state.week = Number(btn.dataset.week);
          renderAll();
        });
      });

      document.querySelectorAll('.focus-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          state.focus = btn.dataset.focus;
          renderAll();
        });
      });

      document.querySelectorAll('.nav-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          switchTab(btn.dataset.tab);
        });
      });

      document.getElementById('CatalogMuscleFilter').addEventListener('change', () => {
        renderExerciseCatalog();
      });

      // Modal mode buttons (Real Photo Flipbook vs Vector Schema)
      document.getElementById('modePhotoBtn').addEventListener('click', () => {
        state.modalMediaMode = 'photo';
        renderModalStage();
      });
      document.getElementById('modeVectorBtn').addEventListener('click', () => {
        state.modalMediaMode = 'vector';
        renderModalStage();
      });

      // Custom Media URL input inside modal
      document.getElementById('openCustomMediaInputBtn').addEventListener('click', () => {
        document.getElementById('customMediaBox').classList.toggle('hidden');
      });
      document.getElementById('applyCustomMediaBtn').addEventListener('click', () => {
        const val = document.getElementById('customMediaUrlInput').value.trim();
        if (state.modalExId) {
          if (val) {
            state.customMediaUrls[state.modalExId] = val;
          } else {
            delete state.customMediaUrls[state.modalExId];
          }
          state.modalMediaMode = 'photo';
          renderModalStage();
          renderAll();
        }
      });

      // Video/Technique Modal controls
      document.getElementById('closeModalBtn').addEventListener('click', closeExerciseModal);
      document.getElementById('modalCloseAction').addEventListener('click', closeExerciseModal);
      document.getElementById('exerciseModal').addEventListener('click', (e) => {
        if (e.target.id === 'exerciseModal') closeExerciseModal();
      });

      document.getElementById('toggleAnimPlayBtn').addEventListener('click', () => {
        state.animPaused = !state.animPaused;
        const stage = document.getElementById('modalVideoStage');
        stage.classList.toggle('svg-paused', state.animPaused);
        document.getElementById('toggleAnimPlayBtn').textContent = state.animPaused ? '▶ Пуск' : 'Пауза';
      });

      // Swap Modal controls
      document.getElementById('closeSwapModalBtn').addEventListener('click', closeSwapModal);
      document.getElementById('cancelSwapBtn').addEventListener('click', closeSwapModal);
      document.getElementById('swapModal').addEventListener('click', (e) => {
        if (e.target.id === 'swapModal') closeSwapModal();
      });

      document.querySelectorAll('.swap-eq-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          state.swapFilterEq = btn.dataset.eq;
          renderSwapModalOptions();
        });
      });

      // Rest timer manual toggle
      document.getElementById('restTimerBtn').addEventListener('click', () => {
        if (state.timerRunning) {
          clearInterval(state.timerInterval);
          state.timerRunning = false;
          document.getElementById('restTimerBtn').classList.remove('timer-active', 'border-emerald-500');
          document.getElementById('restTimerLabel').textContent = `Отдых ${formatTime(LEVEL_CONFIG[state.level].restSec)}`;
        } else {
          startRestTimer(LEVEL_CONFIG[state.level].restSec);
        }
      });

      // Reset progress & swaps
      document.getElementById('resetProgressBtn').addEventListener('click', () => {
        state.completedSets = {};
        state.completedStretches = {};
        state.customWeights = {};
        state.swappedExercises = {};
        renderAll();
      });

      renderAll();
      try {
        const saved = JSON.parse(localStorage.getItem('fitpulse_state_v1') || '{}');
        Object.assign(state, saved);
      } catch (e) {}
      initTelegramMiniApp();
      renderAll();
      startCardThumbFlipper();
    });
  