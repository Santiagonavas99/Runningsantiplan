/* ======================================
   IMPORTS (rewards + recomendaciones)
=======================================*/
import { calculateRewards } from "./components/rewards.js";
import { getRealLifeTip } from "./components/recommendations.js";

/* ======================================
   STORAGE KEYS
=======================================*/
const STORAGE_KEY = "running_fuerza_checklist_v2";
const THEME_KEY = "theme_mode";

/* ======================================
   GLOBAL DATA
=======================================*/
let trainingPlan = [];
let raceMode = null;

/* ======================================
   LOAD JSON DATA
=======================================*/
async function loadData() {
  try {
    const planRes = await fetch("./data/training-plan.json");
    trainingPlan = await planRes.json();

    const raceRes = await fetch("./data/race-mode.json");
    raceMode = await raceRes.json();

    renderPlan();
    showRewards();
    renderRealLifeTip();
  } catch (err) {
    console.error("Error cargando JSON:", err);
  }
}

/* ======================================
   THEME MODE
=======================================*/
function loadTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  const isDark = saved !== "light";
  document.body.classList.toggle("dark", isDark);
  document.body.classList.toggle("light", !isDark);
}

function toggleTheme() {
  const isDark = document.body.classList.contains("dark");
  localStorage.setItem(THEME_KEY, isDark ? "light" : "dark");
  loadTheme();
}

/* ======================================
   CHECKLIST STATE
=======================================*/
function loadState() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
}

function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function resetWeek() {
  localStorage.removeItem(STORAGE_KEY);
  renderPlan();
}

/* ======================================
   REWARDS
=======================================*/
function showRewards() {
  const rewardsBox = document.getElementById("rewards");
  if (!rewardsBox) return;

  const progress = getWeeklyProgress();
  const rewards = calculateRewards(progress);

  rewardsBox.innerHTML = rewards
    .map((r) => `<div class="reward">${r}</div>`)
    .join("");
}

function getWeeklyProgress() {
  const state = loadState();
  let daysCompleted = 0;
  let longRunDone = false;
  let strengthDays = 0;
  let runDays = 0;

  trainingPlan.forEach((day) => {
    const st = state[day.id];

    const dayFullyDone =
      st && st.completed && st.completed.length === day.checklist.length;

    if (dayFullyDone) daysCompleted++;
    if (day.type.includes("Largo") && dayFullyDone) longRunDone = true;
    if (day.type.includes("Fuerza")) strengthDays++;
    if (day.type.includes("Z2") || day.type.includes("Intervalos")) runDays++;
  });

  return { daysCompleted, longRunDone, strengthDays, runDays };
}

/* ======================================
   REAL LIFE TIP
=======================================*/
function renderRealLifeTip() {
  const el = document.getElementById("real-life-tip");
  if (!el) return;
  el.textContent = getRealLifeTip();
}

/* ======================================
   RENDER PLAN
=======================================*/
function renderPlan() {
  const container = document.getElementById("week-carousel");
  if (!container) return;

  container.innerHTML = "";

  const state = loadState();
  let totalTasks = 0;
  let completedTasks = 0;

  trainingPlan.forEach((day) => {
    const dayState = state[day.id] || { completed: [] };

    const card = document.createElement("article");
    card.className = "day-card";
    card.innerHTML = `
      <div class="day-name">${day.name}</div>
      <div class="day-title">${day.title}</div>
      <span class="day-pill" style="border-color:${day.color}; color:${day.color}">
        ${day.type}
      </span>

      <div class="block">
        <div class="block-label">Entrenamiento</div>
        <p>${day.workout}</p>
      </div>

      <div class="block">
        <div class="block-label">Reto</div>
        <p>${day.action}</p>
      </div>

      <div class="block">
        <div class="block-label">Pre-entreno</div>
        <p><strong>Comida:</strong> ${day.pre.comida}</p>
        <p><strong>Hidratación:</strong> ${day.pre.hidratacion}</p>
        <p><strong>Tiempo:</strong> ${day.pre.tiempo}</p>
      </div>
    `;

    const checklistWrap = document.createElement("div");
    checklistWrap.className = "checklist";

    day.checklist.forEach((t, i) => {
      totalTasks++;
      const done = !!dayState.completed[i];
      if (done) completedTasks++;

      const item = document.createElement("label");
      item.className = `check-item ${done ? "done" : ""}`;
      item.innerHTML = `
        <input type="checkbox" data-day="${day.id}" data-index="${i}" ${done ? "checked" : ""}>
        <span>${t}</span>
      `;

      checklistWrap.appendChild(item);
    });

    card.appendChild(checklistWrap);

    const summary = document.createElement("div");
    summary.className = "summary-chip";
    summary.textContent =
      `${(dayState.completed || []).filter(Boolean).length} / ${day.checklist.length} completados`;

    const resetBtn = document.createElement("button");
    resetBtn.className = "reset-day";
    resetBtn.textContent = "Reiniciar día";
    resetBtn.dataset.day = day.id;

    const footer = document.createElement("div");
    footer.appendChild(summary);
    footer.appendChild(resetBtn);

    card.appendChild(footer);
    container.appendChild(card);
  });

  updateProgress(totalTasks, completedTasks);

  // Activar slider con flechas
  activateArrowSlider();
}

/* ======================================
   SIMPLE SLIDER CON FLECHAS
=======================================*/
function activateArrowSlider() {
  const container = document.getElementById("week-carousel");
  const cards = Array.from(container.querySelectorAll(".day-card"));
  if (!cards.length) return;

  let index = 0;

  function goTo(i) {
    index = Math.max(0, Math.min(i, cards.length - 1));
    cards[index].scrollIntoView({
      behavior: "smooth",
      inline: "center"
    });
  }

  document.getElementById("prev-btn").onclick = () => goTo(index - 1);
  document.getElementById("next-btn").onclick = () => goTo(index + 1);

  goTo(0);
}

/* ======================================
   PROGRESS
=======================================*/
function updateProgress(total, completed) {
  const pct = total === 0 ? 0 : Math.round((completed / total) * 100);
  const bar = document.getElementById("progress-bar-fill");
  const text = document.getElementById("progress-text");
  if (bar) bar.style.width = pct + "%";
  if (text) text.textContent = `${completed} / ${total} bloques`;
}

/* ======================================
   EVENT LISTENERS
=======================================*/
document.addEventListener("click", (e) => {
  if (e.target.matches("input[type='checkbox']")) {
    const id = e.target.dataset.day;
    const idx = Number(e.target.dataset.index);

    const state = loadState();
    if (!state[id]) state[id] = { completed: [] };

    state[id].completed[idx] = e.target.checked;
    saveState(state);
    renderPlan();
  }

  if (e.target.matches(".reset-day")) {
    const id = e.target.dataset.day;
    const state = loadState();
    delete state[id];
    saveState(state);
    renderPlan();
  }

  if (e.target.matches("#new-week")) resetWeek();

  if (e.target.matches("#theme-toggle")) toggleTheme();
});

/* ======================================
   INIT
=======================================*/
loadTheme();
loadData();