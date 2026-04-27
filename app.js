const RUNS_KEY = "121LadderChallengeRuns";
const CURRENT_KEY = "121LadderChallengeCurrentRun";
const START_SCORE = 121;
const END_SCORE = 170;
const VERSION = "1.0.0";

const $ = (id) => document.getElementById(id);

const state = {
  runs: [],
  currentRun: null,
  previousBest: START_SCORE,
};

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function todayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function makeRun() {
  return {
    id: uid(),
    startedAt: new Date().toISOString(),
    endedAt: null,
    completed: false,
    attempts: [],
  };
}

function loadData() {
  try {
    state.runs = JSON.parse(localStorage.getItem(RUNS_KEY) || "[]");
  } catch {
    state.runs = [];
  }

  try {
    state.currentRun = JSON.parse(localStorage.getItem(CURRENT_KEY) || "null");
  } catch {
    state.currentRun = null;
  }

  if (!state.currentRun) state.currentRun = makeRun();
  state.previousBest = getBestScore();
}

function saveData() {
  localStorage.setItem(RUNS_KEY, JSON.stringify(state.runs));
  localStorage.setItem(CURRENT_KEY, JSON.stringify(state.currentRun));
}

function isRunEnded(run = state.currentRun) {
  return Boolean(run && run.endedAt);
}

function getCurrentScore() {
  const run = state.currentRun;
  if (!run || !run.attempts.length) return START_SCORE;
  const last = run.attempts[run.attempts.length - 1];
  if (run.completed) return END_SCORE;
  if (run.endedAt && last.result === "miss") return last.score;
  return Math.min(START_SCORE + run.attempts.filter((a) => a.result === "hit").length, END_SCORE);
}

function getRunReachedScore(run) {
  if (!run || !run.attempts.length) return START_SCORE;
  return Math.max(...run.attempts.map((a) => a.score));
}

function allRunsIncludingCurrent() {
  const currentHasProgress = state.currentRun && (state.currentRun.attempts.length || !state.currentRun.endedAt);
  const savedIds = new Set(state.runs.map((run) => run.id));
  return currentHasProgress && !savedIds.has(state.currentRun.id)
    ? [...state.runs, state.currentRun]
    : [...state.runs];
}

function completedAndEndedRuns() {
  return state.runs;
}

function getBestScore(runs = allRunsIncludingCurrent()) {
  if (!runs.length) return START_SCORE;
  return Math.max(START_SCORE, ...runs.map(getRunReachedScore));
}

function getTodayBest() {
  const today = todayKey();
  const todaysRuns = allRunsIncludingCurrent().filter((run) => todayKey(new Date(run.startedAt)) === today);
  return todaysRuns.length ? getBestScore(todaysRuns) : START_SCORE;
}

function finishRun({ completed = false } = {}) {
  state.currentRun.endedAt = new Date().toISOString();
  state.currentRun.completed = completed;
  const existingIndex = state.runs.findIndex((run) => run.id === state.currentRun.id);
  if (existingIndex >= 0) state.runs[existingIndex] = state.currentRun;
  else state.runs.push(state.currentRun);
}

function recordAttempt(result) {
  if (isRunEnded()) return;
  const score = getCurrentScore();
  state.currentRun.attempts.push({ score, result, timestamp: new Date().toISOString() });

  if (result === "miss") {
    finishRun({ completed: false });
  } else if (score === END_SCORE) {
    finishRun({ completed: true });
  }

  saveData();
  render({ animateScore: true, showBestMessage: getBestScore() > state.previousBest });
  state.previousBest = getBestScore();
}

function undo() {
  const run = state.currentRun;
  if (!run || !run.attempts.length) return;

  const wasEnded = isRunEnded(run);
  run.attempts.pop();
  run.endedAt = null;
  run.completed = false;

  if (wasEnded) {
    state.runs = state.runs.filter((savedRun) => savedRun.id !== run.id);
  }

  saveData();
  render({ animateScore: true, message: "Undo complete. Run reopened." });
}

function newRun() {
  state.currentRun = makeRun();
  saveData();
  render({ animateScore: true, message: "New run started at 121." });
}

function resetAllData() {
  const ok = window.confirm("Delete all 121 Ladder Challenge data from this device? This cannot be undone.");
  if (!ok) return;
  state.runs = [];
  state.currentRun = makeRun();
  state.previousBest = START_SCORE;
  localStorage.removeItem(RUNS_KEY);
  localStorage.removeItem(CURRENT_KEY);
  saveData();
  render({ animateScore: true, message: "All data reset." });
}

function scoreStats() {
  const rows = [];
  for (let score = START_SCORE; score <= END_SCORE; score += 1) {
    const attempts = allRunsIncludingCurrent().flatMap((run) => run.attempts).filter((a) => a.score === score);
    const hits = attempts.filter((a) => a.result === "hit").length;
    const misses = attempts.filter((a) => a.result === "miss").length;
    rows.push({ score, attempts: attempts.length, hits, misses, pct: attempts.length ? Math.round((hits / attempts.length) * 100) : null });
  }
  return rows;
}

function renderStatsTable() {
  const body = $("statsTableBody");
  body.innerHTML = "";
  scoreStats().forEach(({ score, attempts, hits, misses, pct }) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${score}</td>
      <td>${attempts}</td>
      <td>${hits}</td>
      <td>${misses}</td>
      <td>${score === START_SCORE ? "—" : pct === null ? "—" : `${pct}%`}</td>
    `;
    body.appendChild(tr);
  });
}

function render(options = {}) {
  const score = getCurrentScore();
  const best = getBestScore();
  const today = getTodayBest();
  const endedRuns = completedAndEndedRuns();
  const reachedScores = endedRuns.map(getRunReachedScore);
  const average = reachedScores.length ? (reachedScores.reduce((a, b) => a + b, 0) / reachedScores.length).toFixed(1) : "0";
  const completedCount = endedRuns.filter((run) => run.completed).length;

  $("scoreDisplay").textContent = score;
  $("bestScore").textContent = best;
  $("totalRuns").textContent = endedRuns.length;
  $("todayBest").textContent = today;

  $("statsTotalRuns").textContent = endedRuns.length;
  $("statsBestScore").textContent = best;
  $("statsTodayBest").textContent = today;
  $("statsAverage").textContent = average;
  $("statsCompleted").textContent = completedCount;

  const status = $("runStatus");
  status.className = "status-pill";
  if (state.currentRun.completed) {
    status.textContent = "Complete";
    status.classList.add("complete");
  } else if (isRunEnded()) {
    status.textContent = "Run Ended";
    status.classList.add("ended");
  } else {
    status.textContent = "Live Run";
  }

  const message = $("scoreMessage");
  message.classList.remove("best");
  if (options.showBestMessage) {
    message.textContent = "New Best! Keep climbing.";
    message.classList.add("best");
  } else if (options.message) {
    message.textContent = options.message;
  } else if (state.currentRun.completed) {
    message.textContent = "Ladder Complete. You hit 170!";
    message.classList.add("best");
  } else if (isRunEnded()) {
    message.textContent = `Run ended at ${score}. Tap New Run or Undo.`;
  } else {
    message.textContent = "Hit it to move up. Miss it and the run ends.";
  }

  $("hitBtn").disabled = isRunEnded();
  $("missBtn").disabled = isRunEnded();
  $("undoBtn").disabled = !state.currentRun.attempts.length;

  if (options.animateScore) {
    const el = $("scoreDisplay");
    el.classList.remove("bump");
    void el.offsetWidth;
    el.classList.add("bump");
  }

  renderStatsTable();
}

function showScreen(screenId) {
  document.querySelectorAll(".screen").forEach((screen) => screen.classList.toggle("active", screen.id === screenId));
  document.querySelectorAll(".nav-btn").forEach((btn) => btn.classList.toggle("active", btn.dataset.screen === screenId));
}

function bindEvents() {
  $("hitBtn").addEventListener("click", () => recordAttempt("hit"));
  $("missBtn").addEventListener("click", () => recordAttempt("miss"));
  $("undoBtn").addEventListener("click", undo);
  $("newRunBtn").addEventListener("click", newRun);
  $("resetBtn").addEventListener("click", resetAllData);
  document.querySelectorAll(".nav-btn").forEach((btn) => btn.addEventListener("click", () => showScreen(btn.dataset.screen)));
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").catch(() => {});
    });
  }
}

loadData();
bindEvents();
render();
registerServiceWorker();
