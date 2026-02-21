// =========================
// Estado de la Aplicación
// =========================
let roundNumber = 0;
let assignment = new Map();
let viewed = new Set();
let lockViewed = false;

// Puntuaciones
let SCORES = {};
let CUSTOM_WORDS = []; 

// Host
let hostPIN = "";
let hostOpen = false;
let selectedTopicId = "mixed";

// =========================
// DOM Elements
// =========================
const startBtn = document.getElementById("startBtn");
const endRoundBtn = document.getElementById("endRoundBtn");
const lockViewedBtn = document.getElementById("lockViewedBtn");
const roundBadge = document.getElementById("roundBadge");
const phaseText = document.getElementById("phaseText");
const phaseDot = document.getElementById("phaseDot");

const topicSelect = document.getElementById("topicSelect");
const topicMode = document.getElementById("topicMode");
const impostorSelect = document.getElementById("impostorSelect");

// UI Config Modal
const configOverlay = document.getElementById("configOverlay");
const openConfigBtn = document.getElementById("openConfigBtn");
const closeConfigBtn = document.getElementById("closeConfigBtn");

// UI Jugadores
const playerNameInput = document.getElementById("playerNameInput");
const addPlayerBtn = document.getElementById("addPlayerBtn");
const playerSetupList = document.getElementById("playerSetupList");
const playerCountBadge = document.getElementById("playerCountBadge");
const scoreTableBody = document.getElementById("scoreTableBody");

// UI Anfitrión y Reset
const setupPinInput = document.getElementById("setupPinInput");
const savePinBtn = document.getElementById("savePinBtn");
const pinStatus = document.getElementById("pinStatus");
const resetGameBtn = document.getElementById("resetGameBtn");

// NUEVOS DOM Elements para Reset
const resetOverlay = document.getElementById("resetOverlay");
const cancelResetBtn = document.getElementById("cancelResetBtn");
const confirmResetBtn = document.getElementById("confirmResetBtn");

// NUEVO DOM Element para Error de PIN
const pinErrorMsg = document.getElementById("pinErrorMsg");

// UI Temas Custom
const customWordInput = document.getElementById("customWordInput");
const customClueInput = document.getElementById("customClueInput");
const addCustomWordBtn = document.getElementById("addCustomWordBtn");
const customWordCountBadge = document.getElementById("customWordCountBadge");

// UI Cartas y Tablero
const namesGrid = document.getElementById("namesGrid");
const overlay = document.getElementById("overlay");
const scoreOverlay = document.getElementById("scoreOverlay");
const cover = document.getElementById("cover");
const holdBtn = document.getElementById("holdBtn");

// =========================
// Utilidades
// =========================
function setPhase(text, ok = true) {
  phaseText.textContent = text;
  phaseDot.style.background = ok ? "var(--ok)" : "var(--bad)";
}

function escapeHtml(str) {
  return String(str).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// =========================
// Modal de Configuración
// =========================
openConfigBtn.addEventListener("click", () => configOverlay.classList.add("show"));
closeConfigBtn.addEventListener("click", () => configOverlay.classList.remove("show"));

// =========================
// CRUD Jugadores y Puntos
// =========================
function addPlayer() {
  const name = playerNameInput.value.trim().toUpperCase();
  if (name && !NAMES.includes(name)) {
    NAMES.push(name);
    SCORES[name] = 0; 
    playerNameInput.value = "";
    updatePlayerUI();
  }
}

function removePlayer(name) {
  NAMES = NAMES.filter(n => n !== name);
  delete SCORES[name];
  updatePlayerUI();
}

function updatePlayerUI() {
  playerCountBadge.textContent = `${NAMES.length} Jugador${NAMES.length !== 1 ? 'es' : ''}`;
  startBtn.disabled = NAMES.length < 3; 
  
  if (NAMES.length < 3) {
    setPhase("Abre los Ajustes (⚙️) y añade jugadores.", false);
    namesGrid.innerHTML = `<div class="hint">Añade jugadores en "Ajustes" para comenzar.</div>`;
  } else {
    setPhase("Listos para iniciar ronda.", true);
  }

  if (NAMES.length === 0) {
    playerSetupList.innerHTML = `<div class="hint">No hay jugadores. Añade al menos 3.</div>`;
    scoreTableBody.innerHTML = `<tr><td colspan="2" class="hint">Añade jugadores para ver sus puntos</td></tr>`;
    return;
  }

  playerSetupList.innerHTML = NAMES.map(n => `
    <div class="player-tag">
      ${escapeHtml(n)}
      <button class="player-tag-del" onclick="removePlayer('${escapeHtml(n)}')">×</button>
    </div>
  `).join("");

  const sortedScores = Object.entries(SCORES).sort((a,b) => b[1] - a[1]);
  scoreTableBody.innerHTML = sortedScores.map(([name, pts]) => `
    <tr>
      <td style="font-weight:bold;">${escapeHtml(name)}</td>
      <td>${pts} pts</td>
    </tr>
  `).join("");
}

addPlayerBtn.addEventListener("click", addPlayer);
playerNameInput.addEventListener("keypress", (e) => { if (e.key === "Enter") addPlayer(); });

// =========================
// Configuración de Host
// =========================
savePinBtn.addEventListener("click", () => {
  hostPIN = setupPinInput.value.trim();
  pinStatus.style.display = "inline-block";
  setTimeout(() => { pinStatus.style.display = "none"; }, 3000);
});

// =========================
// Temas Personalizados
// =========================
function addCustomWord() {
  const w = customWordInput.value.trim().toUpperCase();
  const c = customClueInput.value.trim();
  if (w && c) {
    CUSTOM_WORDS.push({ word: w, category: "Personalizado", clue: c });
    customWordInput.value = "";
    customClueInput.value = "";
    customWordCountBadge.textContent = `${CUSTOM_WORDS.length} palabras personalizadas añadidas.`;
    renderTopics(); 
  }
}
addCustomWordBtn.addEventListener("click", addCustomWord);

function getActivePool() {
  let pool = [];
  if (topicMode.value === "mixed") {
    pool = [...MIXED_POOL, ...CUSTOM_WORDS];
  } else {
    if (selectedTopicId === "custom") {
      pool = [...CUSTOM_WORDS];
    } else {
      const topic = TOPICS.find(t => t.id === selectedTopicId);
      pool = topic ? topic.sets : [];
    }
  }
  return pool;
}

function renderTopics() {
  let html = TOPICS.map(t => `<option value="${t.id}">${t.label}</option>`).join("");
  if (CUSTOM_WORDS.length > 0) {
    html += `<option value="custom">Tus Personalizados (${CUSTOM_WORDS.length})</option>`;
  }
  topicSelect.innerHTML = html;
  
  if (topicSelect.querySelector(`option[value="${selectedTopicId}"]`)) {
    topicSelect.value = selectedTopicId;
  } else {
    selectedTopicId = topicSelect.value;
  }
}
topicMode.addEventListener("change", () => renderTopics());
topicSelect.addEventListener("change", () => { selectedTopicId = topicSelect.value; });

// =========================
// Lógica del Juego
// =========================
function getImpostorCount() {
  let n = parseInt(impostorSelect.value, 10);
  if (NAMES.length < 4 && n === 2) n = 1; 
  return n;
}

function startRound() {
  if (NAMES.length < 3) return;

  const pool = getActivePool();
  if (pool.length === 0) {
    alert("No hay palabras en el tema seleccionado. Elige otro o añade palabras.");
    return;
  }

  roundNumber++;
  assignment.clear();
  viewed.clear();
  lockViewed = false;

  const set = pool[Math.floor(Math.random() * pool.length)];
  const impostorCount = getImpostorCount();
  const shuffled = shuffle(NAMES);
  const impostors = new Set(shuffled.slice(0, impostorCount));

  for (const name of NAMES) {
    if (impostors.has(name)) assignment.set(name, { role: "IMPOSTOR", category: set.category, clue: set.clue });
    else assignment.set(name, { role: "INOCENTE", word: set.word, category: set.category });
  }

  roundBadge.textContent = `Ronda: ${roundNumber}`;
  setPhase(`Ronda ${roundNumber} en curso. Hablen de la palabra.`);
  
  startBtn.style.display = "none";
  endRoundBtn.style.display = "inline-block";
  lockViewedBtn.disabled = false;
  lockViewedBtn.textContent = "Bloquear cartas vistas";
  
  renderGameGrid();
  if (hostOpen) renderHost();
}

function renderGameGrid() {
  namesGrid.innerHTML = "";
  if(NAMES.length === 0) return;

  for (const name of NAMES) {
    const tile = document.createElement("div");
    tile.className = "tile";
    const st = viewed.has(name) ? "Carta vista" : "Sin ver";
    
    tile.innerHTML = `
      <div>
        <div class="name">${escapeHtml(name)}</div>
        <div class="state">${st}</div>
      </div>
    `;
    
    const btn = document.createElement("button");
    btn.textContent = "Ver mi carta";
    btn.disabled = (roundNumber === 0) || (lockViewed && viewed.has(name));
    btn.className = viewed.has(name) && lockViewed ? "ghost" : "";
    btn.onclick = () => openCard(name);
    
    tile.appendChild(btn);
    namesGrid.appendChild(tile);
  }
}

// Abrir Modal de Carta
function openCard(name) {
  const info = assignment.get(name);
  if (!info) return;

  document.getElementById("modalTitle").textContent = `Carta de ${name}`;
  document.getElementById("modalSub").textContent = `Categoría: ${info.category} · No compartas pantalla`;

  const revealContent = document.getElementById("revealContent");
  if (info.role === "INOCENTE") {
    document.getElementById("roleBig").innerHTML = `<span style="color:var(--ok)">INOCENTE</span>`;
    document.getElementById("roleExplain").textContent = "Tienes la palabra secreta. Habla de ella sin decirla.";
    revealContent.innerHTML = `<div class="muted">Tu palabra es:</div><div class="big">${escapeHtml(info.word)}</div>`;
  } else {
    document.getElementById("roleBig").innerHTML = `<span style="color:var(--bad)">IMPOSTOR</span>`;
    document.getElementById("roleExplain").textContent = "Disimula. Usa la pista para no ser descubierto.";
    revealContent.innerHTML = `<div class="muted">Pista:</div><div class="big">${escapeHtml(info.clue)}</div>`;
  }

  cover.classList.remove("hidden");
  overlay.classList.add("show");
  viewed.add(name);
  renderGameGrid();
}

// =========================
// Mantener para revelar
// =========================
let holding = false, holdTimer = null;
function beginHold() {
  if (holding) return;
  holding = true;
  holdTimer = setTimeout(() => cover.classList.add("hidden"), 300);
}
function endHold() {
  holding = false;
  clearTimeout(holdTimer);
  cover.classList.remove("hidden");
}

holdBtn.addEventListener("mousedown", beginHold);
holdBtn.addEventListener("mouseup", endHold);
holdBtn.addEventListener("mouseleave", endHold);
holdBtn.addEventListener("touchstart", (e) => { e.preventDefault(); beginHold(); }, { passive: false });
holdBtn.addEventListener("touchend", (e) => { e.preventDefault(); endHold(); }, { passive: false });

window.addEventListener("keydown", (e) => {
  if (!overlay.classList.contains("show")) return;
  if (e.code === "Space" && !holding) {
    e.preventDefault(); 
    beginHold();
  }
  if (e.code === "Escape") {
    overlay.classList.remove("show");
  }
});
window.addEventListener("keyup", (e) => {
  if (e.code === "Space") endHold();
});

document.getElementById("closeOverlayBtn").addEventListener("click", () => overlay.classList.remove("show"));

// =========================
// Fin de Ronda y Puntos
// =========================
endRoundBtn.addEventListener("click", () => scoreOverlay.classList.add("show"));
document.getElementById("closeScoreOverlayBtn").addEventListener("click", () => scoreOverlay.classList.remove("show"));

function awardPointsAndReset(scenario) {
  const innocents = [];
  const impostors = [];
  for (let [name, info] of assignment.entries()) {
    if (info.role === "INOCENTE") innocents.push(name);
    else impostors.push(name);
  }

  if (scenario === 'innocents') innocents.forEach(n => SCORES[n] += 1);
  else if (scenario === 'impostor') impostors.forEach(n => SCORES[n] += 3);
  else if (scenario === 'impostor_word') impostors.forEach(n => SCORES[n] += 2);
  
  updatePlayerUI(); 
  scoreOverlay.classList.remove("show");
  
  startBtn.style.display = "inline-block";
  startBtn.disabled = false;
  endRoundBtn.style.display = "none";
  setPhase("Ronda finalizada. Revisa los puntos e inicia la siguiente.");
  
  assignment.clear();
  renderGameGrid();
}

document.getElementById("winInnocentsBtn").onclick = () => awardPointsAndReset('innocents');
document.getElementById("winImpostorBtn").onclick = () => awardPointsAndReset('impostor');
document.getElementById("winImpostorWordBtn").onclick = () => awardPointsAndReset('impostor_word');
document.getElementById("winNobodyBtn").onclick = () => awardPointsAndReset('nobody');

// =========================
// Host Panel en Juego
// =========================
document.getElementById("openHostBtn").addEventListener("click", () => {
  const typed = document.getElementById("pinInput").value.trim();
  
  // NUEVO: Validación de error integrada
  if(hostPIN !== "" && typed !== hostPIN) {
    pinErrorMsg.style.display = "block";
    setTimeout(() => pinErrorMsg.style.display = "none", 3000);
    return;
  }
  
  pinErrorMsg.style.display = "none"; // Asegurar que se oculta si acierta
  hostOpen = true;
  document.getElementById("openHostBtn").disabled = true;
  document.getElementById("closeHostBtn").disabled = false;
  document.getElementById("pinInput").value = ""; 
  if (roundNumber > 0) renderHost();
});

document.getElementById("closeHostBtn").addEventListener("click", () => {
  hostOpen = false;
  document.getElementById("hostPanel").classList.remove("show");
  document.getElementById("openHostBtn").disabled = false;
  document.getElementById("closeHostBtn").disabled = true;
});

// Ocultar mensaje de error si el usuario empieza a escribir de nuevo
document.getElementById("pinInput").addEventListener("input", () => {
  pinErrorMsg.style.display = "none";
});

function renderHost() {
  if (!hostOpen || assignment.size === 0) return;
  const entries = NAMES.map(n => ({ name: n, ...assignment.get(n) }));
  
  let rows = "";
  for(let e of entries) {
    if(!e.role) continue;
    const tag = e.role === "IMPOSTOR" ? `<span class="roleTag roleImp">IMPOSTOR</span>` : `<span class="roleTag roleIno">INOCENTE</span>`;
    const detail = e.role === "IMPOSTOR" ? `Pista: ${escapeHtml(e.clue)}` : `Palabra: ${escapeHtml(e.word)}`;
    rows += `<tr><td>${escapeHtml(e.name)}</td><td>${tag}</td><td>${detail}</td></tr>`;
  }
  
  document.getElementById("hostTable").innerHTML = `<tbody>${rows}</tbody>`;
  document.getElementById("hostPanel").classList.add("show");
}

// =========================
// RESETEAR EL JUEGO COMPLETO
// =========================
resetGameBtn.addEventListener("click", () => {
  resetOverlay.classList.add("show");
});

cancelResetBtn.addEventListener("click", () => {
  resetOverlay.classList.remove("show");
});

confirmResetBtn.addEventListener("click", () => {
  NAMES = [];
  SCORES = {};
  CUSTOM_WORDS = [];
  roundNumber = 0;
  hostPIN = "";
  assignment.clear();
  viewed.clear();
  hostOpen = false;

  setupPinInput.value = "";
  document.getElementById("pinInput").value = "";
  customWordInput.value = "";
  customClueInput.value = "";
  playerNameInput.value = "";

  roundBadge.textContent = "Ronda: 0";
  customWordCountBadge.textContent = "0 palabras personalizadas añadidas.";
  document.getElementById("hostPanel").classList.remove("show");
  document.getElementById("openHostBtn").disabled = false;
  document.getElementById("closeHostBtn").disabled = true;
  startBtn.style.display = "inline-block";
  endRoundBtn.style.display = "none";
  
  updatePlayerUI();
  renderTopics();
  renderGameGrid();
  
  resetOverlay.classList.remove("show");
  configOverlay.classList.remove("show"); 
  setPhase("El juego ha sido reseteado. Abre ajustes para empezar de nuevo.");
});

// Extras
startBtn.addEventListener("click", startRound);
lockViewedBtn.addEventListener("click", () => {
  lockViewed = !lockViewed;
  lockViewedBtn.textContent = lockViewed ? "Desbloquear cartas" : "Bloquear cartas vistas";
  renderGameGrid();
});

// Init
renderTopics();
updatePlayerUI();