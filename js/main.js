import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getDatabase, ref, set, get, update, onValue, push } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyBhJ5TMLVXrDe7z0t3QHyUcJh_i0L-rwlA",
  authDomain: "impostores-app.firebaseapp.com",
  databaseURL: "https://impostores-app-default-rtdb.firebaseio.com",
  projectId: "impostores-app",
  storageBucket: "impostores-app.firebasestorage.app",
  messagingSenderId: "397279646114",
  appId: "1:397279646114:web:9fed54027599cd07d6a2fb"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

let myName = "";
let roomId = "";
let isHost = false;
let roomData = null; 
let hostOpen = false;

const loginInterface = document.getElementById("loginInterface");
const gameInterface = document.getElementById("gameInterface");
const roomCodeDisplay = document.getElementById("roomCodeDisplay");
const phaseText = document.getElementById("phaseText");
const phaseDot = document.getElementById("phaseDot");
const openConfigBtn = document.getElementById("openConfigBtn");
const toast = document.getElementById("toast");

// =========================
// SISTEMA DE NOTIFICACIONES
// =========================
function showToast(msg, isError = false) {
  toast.textContent = msg;
  toast.style.borderColor = isError ? "var(--bad)" : "rgba(255,255,255,0.15)";
  toast.style.color = isError ? "var(--bad)" : "var(--text)";
  toast.classList.remove("hidden");
  setTimeout(() => toast.classList.add("hidden"), 3500);
}

// =========================
// CREAR Y UNIRSE A SALA
// =========================
document.getElementById("btnCreateRoom").addEventListener("click", async () => {
  myName = document.getElementById("loginName").value.trim().toUpperCase();
  if (!myName) return showToast("Por favor, ingresa tu nombre.", true);

  roomId = Math.random().toString(36).substring(2, 6).toUpperCase();
  isHost = true;

  const roomRef = ref(db, `rooms/${roomId}`);
  await set(roomRef, {
    state: "lobby",
    round: 0,
    settings: { mode: "mixed", topic: "navidad", impostors: 1, pin: "" },
    players: {
      [myName]: { score: 0, isHost: true, viewed: false }
    }
  });

  enterRoom();
});

document.getElementById("btnJoinRoom").addEventListener("click", async () => {
  myName = document.getElementById("loginName").value.trim().toUpperCase();
  roomId = document.getElementById("loginRoomCode").value.trim().toUpperCase();
  
  if (!myName || !roomId) return showToast("Ingresa tu nombre y el código de la sala.", true);

  const roomRef = ref(db, `rooms/${roomId}`);
  const snap = await get(roomRef);
  if (!snap.exists()) return showToast("La sala no existe. Verifica el código.", true);

  const data = snap.val();
  
  if (data.players && data.players[myName]) {
    return showToast("Ese nombre ya está en uso en esta sala. Elige otro.", true);
  }

  isHost = false;
  
  await update(ref(db, `rooms/${roomId}/players`), {
    [myName]: { score: 0, isHost: false, viewed: false }
  });

  enterRoom();
});

function enterRoom() {
  loginInterface.classList.add("hidden");
  gameInterface.classList.remove("hidden");
  roomCodeDisplay.textContent = `Sala: ${roomId} | Jugador: ${myName}`;

  onValue(ref(db, `rooms/${roomId}`), (snapshot) => {
    if (!snapshot.exists()) {
      showToast("La sala fue cerrada o reseteada.", true);
      setTimeout(() => window.location.reload(), 2000);
      return;
    }
    roomData = snapshot.val();
    renderUI();
  });
}

// =========================
// RENDERIZADO REACTIVO
// =========================
function renderUI() {
  if (!roomData) return;
  const players = roomData.players || {};
  const playerNames = Object.keys(players);
  
  if (isHost) {
    openConfigBtn.classList.remove("hidden");
    document.getElementById("hostGameControls").style.display = "flex";
    document.getElementById("hostSecretPanelCard").classList.remove("hidden");
    document.getElementById("startBtn").disabled = playerNames.length < 3;
    
    if (roomData.settings) {
      document.getElementById("topicMode").value = roomData.settings.mode || "mixed";
      document.getElementById("impostorSelect").value = roomData.settings.impostors || 1;
    }

    const customObj = roomData.customWords || {};
    const customCount = Object.keys(customObj).length;
    document.getElementById("customWordCountBadge").textContent = `${customCount} palabras personalizadas en la sala.`;
    
    const sel = document.getElementById("topicSelect");
    const currentVal = sel.value || (roomData.settings && roomData.settings.topic) || "navidad";
    
    let html = window.TOPICS.map(t => `<option value="${t.id}">${t.label}</option>`).join("");
    if (customCount > 0) html += `<option value="custom">Tus Personalizados (${customCount})</option>`;
    sel.innerHTML = html;
    if (sel.querySelector(`option[value="${currentVal}"]`)) sel.value = currentVal;
  }

  document.getElementById("roundBadge").textContent = `Ronda: ${roomData.round}`;
  
  if (roomData.state === "lobby") {
    phaseDot.style.background = "var(--ok)";
    phaseText.textContent = playerNames.length < 3 ? "Esperando al menos 3 jugadores..." : "Listos para iniciar.";
    if(isHost) {
      document.getElementById("startBtn").style.display = "inline-block";
      document.getElementById("endRoundBtn").classList.add("hidden");
    }
  } else if (roomData.state === "playing") {
    phaseDot.style.background = "var(--accent)";
    phaseText.textContent = `Ronda ${roomData.round} en curso.`;
    if(isHost) {
      document.getElementById("startBtn").style.display = "none";
      document.getElementById("endRoundBtn").classList.remove("hidden");
    }
  }

  const namesGrid = document.getElementById("namesGrid");
  namesGrid.innerHTML = "";
  playerNames.forEach(name => {
    const pData = players[name];
    const tile = document.createElement("div");
    tile.className = "tile";
    let stateText = (roomData.state === "playing" && pData.viewed) ? "Carta vista" : "Esperando";
    if (roomData.state === "lobby") stateText = "Conectado";

    tile.innerHTML = `<div><div class="name">${escapeHtml(name)} ${pData.isHost ? "👑" : ""}</div><div class="state">${stateText}</div></div>`;

    const btn = document.createElement("button");
    btn.textContent = "Ver mi carta";
    btn.disabled = (roomData.state !== "playing" || name !== myName);
    if(pData.viewed) btn.className = "ghost";
    btn.onclick = () => openCard();
    tile.appendChild(btn);
    namesGrid.appendChild(tile);
  });

  const scoreTableBody = document.getElementById("scoreTableBody");
  const sortedScores = playerNames.map(n => ({ name: n, score: players[n].score || 0 })).sort((a,b) => b.score - a.score);
  scoreTableBody.innerHTML = sortedScores.map(p => `<tr><td><strong>${escapeHtml(p.name)}</strong></td><td>${p.score} pts</td></tr>`).join("");

  if (isHost && roomData.state === "playing" && hostOpen) {
    let rows = "";
    playerNames.forEach(n => {
      const p = players[n];
      if(!p.role) return;
      const tag = p.role === "IMPOSTOR" ? `<span class="roleTag roleImp">IMPOSTOR</span>` : `<span class="roleTag roleIno">INOCENTE</span>`;
      const detail = p.role === "IMPOSTOR" ? `Pista: ${p.clue}` : `Palabra: ${p.word}`;
      rows += `<tr><td>${escapeHtml(n)}</td><td>${tag}</td><td>${detail}</td></tr>`;
    });
    document.getElementById("hostTable").innerHTML = `<tbody>${rows}</tbody>`;
  } else {
    document.getElementById("hostTable").innerHTML = "";
  }
}

// =========================
// LÓGICA DEL ANFITRIÓN
// =========================
openConfigBtn.addEventListener("click", () => document.getElementById("configOverlay").classList.add("show"));
document.getElementById("closeConfigBtn").addEventListener("click", () => document.getElementById("configOverlay").classList.remove("show"));

document.getElementById("savePinBtn").addEventListener("click", () => {
  const pin = document.getElementById("setupPinInput").value.trim();
  update(ref(db, `rooms/${roomId}/settings/pin`), pin);
  
  const status = document.getElementById("pinStatus");
  status.style.display = "inline-block";
  setTimeout(() => status.style.display = "none", 3000);
});

document.getElementById("saveConfigBtn").addEventListener("click", () => {
  update(ref(db, `rooms/${roomId}/settings`), {
    mode: document.getElementById("topicMode").value,
    topic: document.getElementById("topicSelect").value,
    impostors: parseInt(document.getElementById("impostorSelect").value),
    pin: roomData.settings.pin || "" 
  });
  document.getElementById("configOverlay").classList.remove("show");
  showToast("Configuración guardada.");
});

document.getElementById("addCustomWordBtn").addEventListener("click", async () => {
  const w = document.getElementById("customWordInput").value.trim().toUpperCase();
  const c = document.getElementById("customClueInput").value.trim();
  if (w && c) {
    const newWordRef = push(ref(db, `rooms/${roomId}/customWords`));
    await set(newWordRef, { word: w, clue: c, category: "Personalizado" });
    document.getElementById("customWordInput").value = "";
    document.getElementById("customClueInput").value = "";
    showToast("Palabra añadida con éxito.");
  } else {
    showToast("Rellena ambos campos.", true);
  }
});

document.getElementById("openHostBtn").addEventListener("click", () => {
  const typedPin = document.getElementById("pinInput").value.trim();
  const realPin = roomData.settings.pin || "";
  const errorMsg = document.getElementById("pinErrorMsg");
  
  if(realPin !== "" && typedPin !== realPin) {
    errorMsg.style.display = "block";
    setTimeout(() => errorMsg.style.display = "none", 3000);
    return;
  }
  
  errorMsg.style.display = "none";
  hostOpen = true;
  document.getElementById("openHostBtn").disabled = true;
  document.getElementById("closeHostBtn").disabled = false;
  document.getElementById("pinInput").value = ""; 
  document.getElementById("hostPanel").classList.remove("hidden");
  renderUI(); 
});

document.getElementById("closeHostBtn").addEventListener("click", () => {
  hostOpen = false;
  document.getElementById("hostPanel").classList.add("hidden");
  document.getElementById("openHostBtn").disabled = false;
  document.getElementById("closeHostBtn").disabled = true;
  renderUI();
});

document.getElementById("pinInput").addEventListener("input", () => {
  document.getElementById("pinErrorMsg").style.display = "none";
});

document.getElementById("startBtn").addEventListener("click", async () => {
  const playerNames = Object.keys(roomData.players);
  const settings = roomData.settings;
  
  let pool = [...window.MIXED_POOL];
  if (roomData.customWords) pool = [...pool, ...Object.values(roomData.customWords)];

  if (settings.mode === "single") {
    if (settings.topic === "custom" && roomData.customWords) {
        pool = Object.values(roomData.customWords);
    } else {
        const topicObj = window.TOPICS.find(t => t.id === settings.topic);
        if(topicObj) pool = topicObj.sets;
    }
  }
  
  if (pool.length === 0) return showToast("No hay palabras en este tema.", true);

  const setWord = pool[Math.floor(Math.random() * pool.length)];
  let impCount = settings.impostors;
  if (playerNames.length < 4 && impCount === 2) impCount = 1; 
  
  const shuffled = playerNames.slice().sort(() => 0.5 - Math.random());
  const impostors = new Set(shuffled.slice(0, impCount));

  const updates = {};
  updates[`rooms/${roomId}/state`] = "playing";
  updates[`rooms/${roomId}/round`] = roomData.round + 1;

  playerNames.forEach(name => {
    updates[`rooms/${roomId}/players/${name}/viewed`] = false;
    if (impostors.has(name)) {
      updates[`rooms/${roomId}/players/${name}/role`] = "IMPOSTOR";
      updates[`rooms/${roomId}/players/${name}/category`] = setWord.category;
      updates[`rooms/${roomId}/players/${name}/clue`] = setWord.clue;
    } else {
      updates[`rooms/${roomId}/players/${name}/role`] = "INOCENTE";
      updates[`rooms/${roomId}/players/${name}/category`] = setWord.category;
      updates[`rooms/${roomId}/players/${name}/word`] = setWord.word;
    }
  });

  await update(ref(db), updates);
});

// =========================
// INTERACCIÓN DE CARTAS
// =========================
function openCard() {
  const me = roomData.players[myName];
  if (!me || !me.role) return;

  document.getElementById("modalTitle").textContent = `Carta de ${myName}`;
  document.getElementById("modalSub").textContent = `Categoría: ${me.category}`;

  const revealContent = document.getElementById("revealContent");
  if (me.role === "INOCENTE") {
    document.getElementById("roleBig").innerHTML = `<span style="color:var(--ok)">INOCENTE</span>`;
    document.getElementById("roleExplain").textContent = "Habla de tu palabra secreta sin decirla.";
    revealContent.innerHTML = `<div class="muted">Tu palabra es:</div><div class="big">${escapeHtml(me.word)}</div>`;
  } else {
    document.getElementById("roleBig").innerHTML = `<span style="color:var(--bad)">IMPOSTOR</span>`;
    document.getElementById("roleExplain").textContent = "Usa la pista para no ser descubierto.";
    revealContent.innerHTML = `<div class="muted">Pista:</div><div class="big">${escapeHtml(me.clue)}</div>`;
  }

  document.getElementById("cover").classList.remove("hidden");
  document.getElementById("overlay").classList.add("show");
  update(ref(db, `rooms/${roomId}/players/${myName}/viewed`), true);
}

let holding = false, holdTimer = null;
const cover = document.getElementById("cover");
function beginHold() { if (holding) return; holding = true; holdTimer = setTimeout(() => cover.classList.add("hidden"), 300); }
function endHold() { holding = false; clearTimeout(holdTimer); cover.classList.remove("hidden"); }

const holdBtn = document.getElementById("holdBtn");
holdBtn.addEventListener("mousedown", beginHold); holdBtn.addEventListener("mouseup", endHold); holdBtn.addEventListener("mouseleave", endHold);
holdBtn.addEventListener("touchstart", (e) => { e.preventDefault(); beginHold(); }, { passive: false }); holdBtn.addEventListener("touchend", (e) => { e.preventDefault(); endHold(); }, { passive: false });

window.addEventListener("keydown", (e) => {
  if (!document.getElementById("overlay").classList.contains("show")) return;
  if (e.code === "Space" && !holding) { e.preventDefault(); beginHold(); }
  if (e.code === "Escape") document.getElementById("overlay").classList.remove("show");
});
window.addEventListener("keyup", (e) => { if (e.code === "Space") endHold(); });
document.getElementById("closeOverlayBtn").addEventListener("click", () => document.getElementById("overlay").classList.remove("show"));

// =========================
// FIN DE RONDA
// =========================
document.getElementById("endRoundBtn").addEventListener("click", () => document.getElementById("scoreOverlay").classList.add("show"));
document.getElementById("closeScoreOverlayBtn").addEventListener("click", () => document.getElementById("scoreOverlay").classList.remove("show"));

async function awardPointsAndReset(scenario) {
  const updates = {};
  updates[`rooms/${roomId}/state`] = "lobby";

  const players = roomData.players;
  for (let name in players) {
    let currentScore = players[name].score || 0;
    if (scenario === 'innocents' && players[name].role === "INOCENTE") currentScore += 1;
    if (scenario === 'impostor' && players[name].role === "IMPOSTOR") currentScore += 3;
    if (scenario === 'impostor_word' && players[name].role === "IMPOSTOR") currentScore += 2;
    updates[`rooms/${roomId}/players/${name}/score`] = currentScore;
  }

  hostOpen = false;
  document.getElementById("hostPanel").classList.add("hidden");
  document.getElementById("openHostBtn").disabled = false;
  document.getElementById("closeHostBtn").disabled = true;

  await update(ref(db), updates);
  document.getElementById("scoreOverlay").classList.remove("show");
}

document.getElementById("winInnocentsBtn").onclick = () => awardPointsAndReset('innocents');
document.getElementById("winImpostorBtn").onclick = () => awardPointsAndReset('impostor');
document.getElementById("winImpostorWordBtn").onclick = () => awardPointsAndReset('impostor_word');
document.getElementById("winNobodyBtn").onclick = () => awardPointsAndReset('nobody');

// =========================
// RESETEAR SALA ONLINE
// =========================
document.getElementById("resetGameBtn").addEventListener("click", () => {
  document.getElementById("resetOverlay").classList.add("show");
});

document.getElementById("cancelResetBtn").addEventListener("click", () => {
  document.getElementById("resetOverlay").classList.remove("show");
});

document.getElementById("confirmResetBtn").addEventListener("click", async () => {
  const updates = {};
  updates[`rooms/${roomId}/state`] = "lobby";
  updates[`rooms/${roomId}/round`] = 0;
  updates[`rooms/${roomId}/customWords`] = null; 
  updates[`rooms/${roomId}/settings/pin`] = ""; 

  for (let name in roomData.players) {
    updates[`rooms/${roomId}/players/${name}/score`] = 0;
    updates[`rooms/${roomId}/players/${name}/viewed`] = false;
    updates[`rooms/${roomId}/players/${name}/role`] = null;
    updates[`rooms/${roomId}/players/${name}/word`] = null;
    updates[`rooms/${roomId}/players/${name}/clue`] = null;
    updates[`rooms/${roomId}/players/${name}/category`] = null;
  }

  hostOpen = false;
  document.getElementById("hostPanel").classList.add("hidden");
  document.getElementById("openHostBtn").disabled = false;
  document.getElementById("closeHostBtn").disabled = true;

  document.getElementById("setupPinInput").value = "";
  document.getElementById("pinInput").value = "";
  
  await update(ref(db), updates);
  
  document.getElementById("resetOverlay").classList.remove("show");
  document.getElementById("configOverlay").classList.remove("show");
  
  showToast("La sala se ha reiniciado por completo.");
});

function escapeHtml(str) { return String(str).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;"); }