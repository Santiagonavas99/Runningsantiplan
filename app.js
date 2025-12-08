/* ======================================
   IMPORTS
=======================================*/
import { calculateRewards } from "./components/rewards.js";
import { getRealLifeTip } from "./components/recommendations.js";

/* ======================================
   STORAGE KEYS
=======================================*/
const STORAGE_KEY = "running_fuerza_checklist_v2";
const THEME_KEY = "theme_mode";

/* ======================================
   GLOBAL
=======================================*/
let trainingPlan = [];

/* ======================================
   LOAD DATA
=======================================*/
async function loadData() {
  const planRes = await fetch("./data/training-plan.json");
  trainingPlan = await planRes.json();

  renderPlan();
  showRewards();
  renderRealLifeTip();
}

/* ======================================
   THEME
=======================================*/
function loadTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  const isDark = saved !== "light";
  document.body.classList.toggle("dark", isDark);
}

function toggleTheme() {
  const isDark = document.body.classList.contains("dark");
  localStorage.setItem(THEME_KEY, isDark ? "light" : "dark");
  loadTheme();
}

/* ======================================
   STATE
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
  const rewards = calculateRewards(getWeeklyProgress());

  rewardsBox.innerHTML = rewards.map(r => `<div>${r}</div>`).join("");
}

function getWeeklyProgress() {
  const state = loadState();
  let completed = 0;

  trainingPlan.forEach(day => {
    const st = state[day.id]?.completed || [];
    if (st.length === day.checklist.length) completed++;
  });

  return { completed };
}

/* ======================================
   RENDER
=======================================*/
function renderPlan() {
  const container = document.getElementById("week-carousel");
  container.innerHTML = "";

  const state = loadState();

  let total = 0;
  let done = 0;

  trainingPlan.forEach(day => {
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
      total++;
      const checked = !!dayState.completed[i];
      if (checked) done++;

      const item = document.createElement("label");
      item.className = `check-item ${checked ? "done" : ""}`;
      item.innerHTML = `
        <input type="checkbox" data-day="${day.id}" data-index="${i}" ${checked ? "checked" : ""}>
        <span>${t}</span>
      `;
      checklistWrap.appendChild(item);
    });

    card.appendChild(checklistWrap);

    const summary = document.createElement("div");
    summary.className = "summary-chip";
    summary.textContent = `${dayState.completed.filter(Boolean).length} / ${day.checklist.length} completados`;

    const resetBtn = document.createElement("button");
    resetBtn.className = "reset-day";
    resetBtn.dataset.day = day.id;
    resetBtn.textContent = "Reiniciar día";

    const footer = document.createElement("div");
    footer.appendChild(summary);
    footer.appendChild(resetBtn);

    card.appendChild(footer);
    container.appendChild(card);
  });

  updateProgress(total, done);

  enableSwipe();
}

/* ======================================
   SWIPE
=======================================*/
function enableSwipe() {
  const container = document.getElementById("week-carousel");

  let startX = 0;

  container.addEventListener("touchstart", e => {
    startX = e.touches[0].clientX;
  });

  container.addEventListener("touchend", e => {
    const delta = e.changedTouches[0].clientX - startX;

    if (Math.abs(delta) > 50) {
      if (delta < 0) container.scrollBy({ left: 350, behavior: "smooth" });
      else container.scrollBy({ left: -350, behavior: "smooth" });
    }
  });
}

/* ======================================
   PROGRESS
=======================================*/
function updateProgress(total, completed) {
  const pct = total ? Math.round(completed / total * 100) : 0;
  document.getElementById("progress-bar-fill").style.width = pct + "%";
  document.getElementById("progress-text").textContent = `${completed} / ${total} bloques`;
}

/* ======================================
   EVENTS
=======================================*/
document.addEventListener("click", e => {

  // Check
  if (e.target.matches("input[type='checkbox']")) {
    const id = e.target.dataset.day;
    const idx = Number(e.target.dataset.index);

    const state = loadState();
    if (!state[id]) state[id] = { completed: [] };

    state[id].completed[idx] = e.target.checked;
    saveState(state);
    renderPlan();
  }

  // Reset day
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

/* Deshabilitar pinch-to-zoom */
document.addEventListener("touchstart", e => {
  if (e.touches.length > 1) e.preventDefault();
}, { passive: false });