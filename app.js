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
   GLOBAL DATA HOLDERS
=======================================*/
let trainingPlan = [];
let raceMode = null;

/* ======================================
   LOAD DATA (JSON EXTERNAL)
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
   THEME MODE (CLARO / OSCURO)
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
   CHECKLIST STATE MANAGEMENT
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
   RECOMPENSAS (Gamificación)
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

/* Calcula progresos para las recompensas */
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

    if (dayFullyDone) {
      daysCompleted++;
    }

    if (day.type.includes("Largo") && dayFullyDone) {
      longRunDone = true;
    }
    if (day.type.includes("Fuerza")) strengthDays++;
    if (day.type.includes("Z2") || day.type.includes("Intervalos")) runDays++;
  });

  return {
    daysCompleted,
    longRunDone,
    strengthDays,
    runDays,
  };
}

/* ======================================
   RENDER TIP (Vida real)
=======================================*/
function renderRealLifeTip() {
  const el = document.getElementById("real-life-tip");
  if (!el) return;
  el.textContent = getRealLifeTip();
}

/* ======================================
   RENDER WEEK PLAN
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
      <span class="day-pill" style="border-color:${day.color}; color:${day.color}">${day.type}</span>
      <div class="block">
        <div class="block-label">Entrenamiento</div>
        <p>${day.workout}</p>
      </div>
      <div class="block">
        <div class="block-label">Reto</div>
        <p>${day.action}</p>
      </div>
    `;

    const preBlock = document.createElement("div");
    preBlock.className = "block";
    preBlock.innerHTML = `
      <div class="block-label">Pre-entreno</div>
      <p><strong>Comida:</strong> ${day.pre.comida}</p>
      <p><strong>Hidratación:</strong> ${day.pre.hidratacion}</p>
      <p><strong>Tiempo:</strong> ${day.pre.tiempo}</p>
    `;
    card.appendChild(preBlock);

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
    summary.textContent = `${(dayState.completed || []).filter(Boolean).length}/${day.checklist.length} completados`;

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

  if (window.innerWidth >= 768) {
    activateDesktopCarousel();
  } else {
    activateMobileSwipe();
  }
}

/* =======================
   Apple TV Desktop Carousel
=======================*/
function activateDesktopCarousel() {
  const container = document.getElementById("week-carousel");
  const cards = Array.from(container.querySelectorAll(".day-card"));
  if (!cards.length) return;

  function applyActiveClasses(activeIdx) {
    cards.forEach((card, i) => {
      card.classList.remove("active", "left", "right");
      if (i === activeIdx) card.classList.add("active");
      else if (i < activeIdx) card.classList.add("left");
      else if (i > activeIdx) card.classList.add("right");
    });
  }

  function updateActiveCard() {
    const containerRect = container.getBoundingClientRect();
    const containerCenter = containerRect.left + containerRect.width / 2;

    let minDist = Infinity;
    let activeIdx = 0;

    cards.forEach((card, i) => {
      const rect = card.getBoundingClientRect();
      const cardCenter = rect.left + rect.width / 2;
      const dist = Math.abs(cardCenter - containerCenter);
      if (dist < minDist) {
        minDist = dist;
        activeIdx = i;
      }
    });

    applyActiveClasses(activeIdx);
  }

  // Al inicio calculamos según posición actual
  updateActiveCard();

  // Limpiamos handlers anteriores
  if (container._carouselScrollHandler) {
    container.removeEventListener("scroll", container._carouselScrollHandler);
  }
  container._carouselScrollHandler = updateActiveCard;
  container.addEventListener("scroll", updateActiveCard);

  if (container._carouselResizeHandler) {
    window.removeEventListener("resize", container._carouselResizeHandler);
  }
  container._carouselResizeHandler = () => {
    setTimeout(updateActiveCard, 100);
  };
  window.addEventListener("resize", container._carouselResizeHandler);
}

/* =======================
   Stack Tinder Mobile Swipe
=======================*/
function activateMobileSwipe() {
  const container = document.getElementById("week-carousel");
  let cards = Array.from(container.querySelectorAll(".day-card"));
  if (!cards.length) return;

  // Reset visual base
  cards.forEach((card) => {
    card.classList.remove("stack-top", "stack-2", "stack-3");
    card.style.transform = "";
    card.style.opacity = "";
    card.style.pointerEvents = "";
    card.style.transition = "";
  });

  function applyStackClasses() {
    cards = Array.from(container.querySelectorAll(".day-card"));
    cards.forEach((card) => {
      card.classList.remove("stack-top", "stack-2", "stack-3");
    });

    if (cards[0]) cards[0].classList.add("stack-top");
    if (cards[1]) cards[1].classList.add("stack-2");
    if (cards[2]) cards[2].classList.add("stack-3");
  }

  applyStackClasses();

  let startX = 0;
  let currentX = 0;
  let dragging = false;
  let activeCard = null;

  function onPointerDown(e) {
    if (dragging) return;

    const top = cards[0];
    if (!top) return;

    const cardTarget = e.target.closest(".day-card");
    if (!cardTarget || cardTarget !== top) return;

    activeCard = top;
    dragging = true;

    const point = e.touches ? e.touches[0] : e;
    startX = point.clientX;
    currentX = 0;

    activeCard.style.transition = "none";
  }

  function onPointerMove(e) {
    if (!dragging || !activeCard) return;

    const point = e.touches ? e.touches[0] : e;
    currentX = point.clientX - startX;
    const rotate = currentX * 0.03;

    activeCard.style.transform = `translateX(${currentX}px) rotate(${rotate}deg)`;
  }

  function onPointerUp() {
    if (!dragging || !activeCard) return;

    const threshold = 120;

    if (Math.abs(currentX) > threshold) {
      activeCard.style.transition =
        "transform 0.22s cubic-bezier(.4,1.6,.6,1), opacity 0.18s";
      activeCard.style.transform = `translateX(${
        currentX > 0 ? 600 : -600
      }px) rotate(${currentX * 0.06}deg)`;
      activeCard.style.opacity = "0";

      const cardToRemove = activeCard;
      setTimeout(() => {
        cardToRemove.remove();
        cards = Array.from(container.querySelectorAll(".day-card"));
        applyStackClasses();
      }, 220);
    } else {
      activeCard.style.transition =
        "transform 0.18s cubic-bezier(.4,1.6,.6,1)";
      activeCard.style.transform = "translateX(0) rotate(0deg)";
    }

    dragging = false;
    activeCard = null;
    currentX = 0;
  }

  if (container._mobileSwipeCleanup) {
    container._mobileSwipeCleanup();
  }

  const eventsTarget = container;

  eventsTarget.addEventListener("pointerdown", onPointerDown);
  eventsTarget.addEventListener("pointermove", onPointerMove);
  eventsTarget.addEventListener("pointerup", onPointerUp);
  eventsTarget.addEventListener("pointercancel", onPointerUp);

  eventsTarget.addEventListener("touchstart", onPointerDown, { passive: true });
  eventsTarget.addEventListener("touchmove", onPointerMove, { passive: true });
  eventsTarget.addEventListener("touchend", onPointerUp);
  eventsTarget.addEventListener("touchcancel", onPointerUp);

  container._mobileSwipeCleanup = () => {
    eventsTarget.removeEventListener("pointerdown", onPointerDown);
    eventsTarget.removeEventListener("pointermove", onPointerMove);
    eventsTarget.removeEventListener("pointerup", onPointerUp);
    eventsTarget.removeEventListener("pointercancel", onPointerUp);

    eventsTarget.removeEventListener("touchstart", onPointerDown);
    eventsTarget.removeEventListener("touchmove", onPointerMove);
    eventsTarget.removeEventListener("touchend", onPointerUp);
    eventsTarget.removeEventListener("touchcancel", onPointerUp);
  };
}

/* ======================================
   PROGRESS BAR
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