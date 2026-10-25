// --- TELEGRAM MINI APP SDK & BACKEND SYNC ---
const tgApp = window.Telegram && window.Telegram.WebApp ? window.Telegram.WebApp : null;

function initTelegramMiniApp() {
  if (!tgApp) return;
  tgApp.ready();
  tgApp.expand();

  const user = tgApp.initDataUnsafe && tgApp.initDataUnsafe.user ? tgApp.initDataUnsafe.user : null;
  if (user && user.id) {
    fetch(`/api/state/${user.id}`)
      .then(r => r.json())
      .then(res => {
        if (res && res.data && Object.keys(res.data).length > 0) {
          Object.assign(state, res.data);
          renderAll();
        }
      })
      .catch(() => {});
  }
}

function syncStateToServer() {
  try {
    localStorage.setItem('fitpulse_state_v1', JSON.stringify({
      gender: state.gender,
      level: state.level,
      week: state.week,
      focus: state.focus,
      completedSets: state.completedSets,
      completedStretches: state.completedStretches,
      customWeights: state.customWeights,
      swappedExercises: state.swappedExercises,
      customMediaUrls: state.customMediaUrls
    }));
  } catch (e) {}

  if (!tgApp) return;
  const user = tgApp.initDataUnsafe && tgApp.initDataUnsafe.user ? tgApp.initDataUnsafe.user : null;
  if (user && user.id) {
    fetch('/api/state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tg_id: user.id,
        gender: state.gender,
        level: state.level,
        week: state.week,
        focus: state.focus,
        completedSets: state.completedSets,
        completedStretches: state.completedStretches,
        customWeights: state.customWeights,
        swappedExercises: state.swappedExercises,
        customMediaUrls: state.customMediaUrls
      })
    }).catch(() => {});
  }
}
