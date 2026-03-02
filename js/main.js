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
let pendingAction = null; 

const loginInterface = document.getElementById("loginInterface");
const gameInterface = document.getElementById("gameInterface");
const toast = document.getElementById("toast");
const phaseDot = document.getElementById("phaseDot");
const phaseText = document.getElementById("phaseText");

function showToast(msg, isError = false) {
  toast.textContent = msg;
  toast.style.borderColor = isError ? "var(--bad)" : "rgba(255,255,255,0.15)";
  toast.style.color = isError ? "var(--bad)" : "var(--text)";
  toast.classList.remove("hidden");
  setTimeout(() => toast.classList.add("hidden"), 3500);
}

document.getElementById("btnCreateRoom").addEventListener("click", async () => {
  myName = document.getElementById("loginName").value.trim().toUpperCase();
  if (!myName) return showToast("Por favor, ingresa tu nombre.", true);

  roomId = Math.random().toString(36).substring(2, 6).toUpperCase();
  isHost = true;

  await set(ref(db, `rooms/${roomId}`), {
    state: "lobby", 
    round: 0,
    settings: { mode: "mixed", topic: "navidad", impostors: 1, pin: "" },
    players: { [myName]: { score: 0, isHost: true, viewed: false, isAlive: true } }
  });
  enterRoom();
});

document.getElementById("btnJoinRoom").addEventListener("click", async () => {
  myName = document.getElementById("loginName").value.trim().toUpperCase();
  roomId = document.getElementById("loginRoomCode").value.trim().toUpperCase();
  
  if (!myName || !roomId) return showToast("Ingresa tu nombre y el código de la sala.", true);
  const snap = await get(ref(db, `rooms/${roomId}`));
  if (!snap.exists()) return showToast("La sala no existe. Verifica el código.", true);

  if (snap.val().players && snap.val().players[myName]) {
    return showToast("Ese nombre ya está en uso en esta sala. Elige otro.", true);
  }

  isHost = false;
  await update(ref(db, `rooms/${roomId}/players`), {
    [myName]: { score: 0, isHost: false, viewed: false, isAlive: true }
  });
  enterRoom();
});

function enterRoom() {
  loginInterface.classList.add("hidden");
  gameInterface.classList.remove("hidden");
  document.getElementById("roomCodeDisplay").textContent = `Sala: ${roomId} | Jugador: ${myName}`;

  onValue(ref(db, `rooms/${roomId}`), (snapshot) => {
    if (!snapshot.exists()) {
      alert("La sala fue cerrada permanentemente por el anfitrión.");
      window.location.reload();
      return;
    }
    
    roomData = snapshot.val();

    if (roomData.players && !roomData.players[myName]) {
      alert("Has sido expulsado de la sala.");
      window.location.reload();
      return;
    }

    renderUI();
  });
}

function renderUI() {
  if (!roomData) return;
  const players = roomData.players || {};
  const playerNames = Object.keys(players);
  const alivePlayers = playerNames.filter(p => players[p].isAlive);
  
  document.getElementById("startBtn").classList.add("hidden");
  document.getElementById("startVotingBtn").classList.add("hidden");
  document.getElementById("endRoundBtn").classList.add("hidden");
  
  if (isHost) {
    document.getElementById("openConfigBtn").classList.remove("hidden");
    document.getElementById("hostGameControls").style.display = "flex";
    document.getElementById("hostSecretPanelCard").classList.remove("hidden");
    document.getElementById("startBtn").disabled = playerNames.length < 3;
    
    if (roomData.settings) {
      document.getElementById("topicMode").value = roomData.settings.mode || "mixed";
      document.getElementById("impostorSelect").value = roomData.settings.impostors || 1;
    }
    const customCount = Object.keys(roomData.customWords || {}).length;
    document.getElementById("customWordCountBadge").textContent = `${customCount} palabras personalizadas en la sala.`;

    const hostPlayerList = document.getElementById("hostPlayerList");
    hostPlayerList.innerHTML = "";
    playerNames.forEach(p => {
      const tag = document.createElement("div");
      tag.className = "player-tag";
      tag.textContent = p;
      if (p !== myName) {
        const delBtn = document.createElement("button");
        delBtn.className = "player-tag-del";
        delBtn.textContent = "❌";
        delBtn.onclick = async () => {
          if(confirm(`¿Expulsar a ${p} de la sala?`)) {
            await set(ref(db, `rooms/${roomId}/players/${p}`), null);
          }
        };
        tag.appendChild(delBtn);
      }
      hostPlayerList.appendChild(tag);
    });
  }

  document.getElementById("roundBadge").textContent = `Ronda: ${roomData.round}`;
  
  // ==========================================
  // GESTIÓN DE FASES
  // ==========================================
  document.getElementById("votingOverlay").classList.remove("show");
  document.getElementById("resolutionOverlay").classList.remove("show");

  if (roomData.state === "lobby") {
    phaseDot.style.background = "var(--ok)";
    phaseText.textContent = playerNames.length < 3 ? "Esperando al menos 3 jugadores..." : "Listos para iniciar.";
    if(isHost) document.getElementById("startBtn").classList.remove("hidden");

  } else if (roomData.state === "playing") {
    phaseDot.style.background = "var(--accent)";
    
    // NUEVO: Anunciar quién empieza a hablar
    const starter = roomData.startingPlayer || "Alguien";
    phaseText.innerHTML = `Partida en Curso. <strong>¡Inicia hablando: ${starter}!</strong>`;
    
    if(isHost) {
      document.getElementById("startVotingBtn").classList.remove("hidden");
      document.getElementById("endRoundBtn").classList.remove("hidden");
    }

  } else if (roomData.state === "voting") {
    phaseDot.style.background = "var(--bad)";
    phaseText.textContent = `Fase de Votación`;
    document.getElementById("votingOverlay").classList.add("show");
    
    const myVote = (roomData.votes || {})[myName];
    const imDead = !players[myName].isAlive;

    if (myVote || imDead) {
      document.getElementById("votingOptions").innerHTML = "";
      document.getElementById("votingWaiting").classList.remove("hidden");
      document.getElementById("votingWaiting").textContent = imDead ? "Estás eliminado. Observando..." : "Esperando los votos de los demás...";
    } else {
      document.getElementById("votingWaiting").classList.add("hidden");
      const optionsContainer = document.getElementById("votingOptions");
      optionsContainer.innerHTML = ""; 
      
      alivePlayers.filter(p => p !== myName).forEach(p => {
        const btn = document.createElement("button");
        btn.className = "ghost full-width";
        btn.style.padding = "14px";
        btn.textContent = `Votar por ${p}`;
        btn.addEventListener("click", async () => {
          await set(ref(db, `rooms/${roomId}/votes/${myName}`), p);
        });
        optionsContainer.appendChild(btn);
      });
    }

    if (isHost) {
      document.getElementById("votingHostControls").classList.remove("hidden");
      document.getElementById("forceCalculateVotesBtn").onclick = () => processVotes(roomData.votes, alivePlayers);
      
      const expectedVotes = alivePlayers.length;
      const actualVotes = Object.keys(roomData.votes || {}).length;
      if (actualVotes >= expectedVotes && expectedVotes > 0) {
        processVotes(roomData.votes, alivePlayers);
      }
    } else {
      document.getElementById("votingHostControls").classList.add("hidden");
    }

  } else if (roomData.state === "resolution") {
    phaseDot.style.background = "var(--accent)";
    phaseText.textContent = `Resultados`;
    document.getElementById("resolutionOverlay").classList.add("show");
    
    const el = roomData.eliminatedPlayer;
    if (el === "EMPATE") {
      document.getElementById("resolutionTitle").textContent = "Nadie fue eliminado";
      document.getElementById("resolutionRole").textContent = "Empate en los votos";
      document.getElementById("resolutionRole").style.color = "var(--text)";
    } else {
      document.getElementById("resolutionTitle").textContent = `${el} fue eliminado`;
      const role = players[el].role;
      const color = role === "IMPOSTOR" ? "var(--bad)" : "var(--ok)";
      document.getElementById("resolutionRole").innerHTML = `Era <span style="color:${color}">${role}</span>`;
    }

    if (isHost) {
      document.getElementById("resolutionHostControls").classList.remove("hidden");
      document.getElementById("resolutionWaiting").classList.add("hidden");
    } else {
      document.getElementById("resolutionHostControls").classList.add("hidden");
      document.getElementById("resolutionWaiting").classList.remove("hidden");
    }
  }

  // ==========================================
  // TABLERO VISUAL
  // ==========================================
  const namesGrid = document.getElementById("namesGrid");
  namesGrid.innerHTML = "";
  playerNames.forEach(name => {
    const pData = players[name];
    const tile = document.createElement("div");
    tile.className = "tile";
    
    let stateText = "";
    if (!pData.isAlive && roomData.state !== "lobby") {
      stateText = "☠️ Eliminado";
      tile.style.opacity = "0.4";
    } else if (roomData.state === "playing") {
      stateText = pData.viewed ? "Carta vista" : "Esperando";
    } else if (roomData.state === "lobby") {
      stateText = "Conectado";
    } else {
      stateText = "En Juego";
    }

    // Resaltar al jugador que inicia la ronda
    let highlight = "";
    if (roomData.state === "playing" && name === roomData.startingPlayer) {
      highlight = `border: 2px solid var(--accent); box-shadow: 0 0 10px rgba(255, 221, 87, 0.4);`;
    }

    tile.innerHTML = `<div style="${highlight} padding: 12px; border-radius: 16px; width: 100%; display: flex; flex-direction: column; align-items: center;"><div class="name">${escapeHtml(name)} ${pData.isHost ? "👑" : ""}</div><div class="state">${stateText}</div></div>`;

    const btn = document.createElement("button");
    btn.textContent = "Ver mi carta";
    btn.disabled = (roomData.state === "lobby" || name !== myName || !pData.isAlive);
    if(pData.viewed) btn.className = "ghost";
    btn.onclick = () => openCard();
    tile.appendChild(btn);
    
    // Si queremos que el flex se vea bien reseteamos la estructura
    tile.innerHTML = '';
    const infoDiv = document.createElement("div");
    if (roomData.state === "playing" && name === roomData.startingPlayer) {
      tile.style.borderColor = "var(--accent)";
      tile.style.boxShadow = "0 0 10px rgba(255, 221, 87, 0.3)";
    }
    infoDiv.innerHTML = `<div class="name">${escapeHtml(name)} ${pData.isHost ? "👑" : ""}</div><div class="state">${stateText}</div>`;
    tile.appendChild(infoDiv);
    tile.appendChild(btn);
    
    namesGrid.appendChild(tile);
  });

  const scoreTableBody = document.getElementById("scoreTableBody");
  const sortedScores = playerNames.map(n => ({ name: n, score: players[n].score || 0 })).sort((a,b) => b.score - a.score);
  scoreTableBody.innerHTML = sortedScores.map(p => `<tr><td><strong>${escapeHtml(p.name)}</strong></td><td>${p.score} pts</td></tr>`).join("");

  if (isHost && roomData.state !== "lobby" && hostOpen) {
    let rows = "";
    playerNames.forEach(n => {
      const p = players[n];
      if(!p.role) return;
      const tag = p.role === "IMPOSTOR" ? `<span class="roleTag roleImp">IMPOSTOR</span>` : `<span class="roleTag roleIno">INOCENTE</span>`;
      const detail = p.role === "IMPOSTOR" ? `Pista: ${p.clue}` : `Palabra: ${p.word}`;
      const deadIcon = !p.isAlive ? "☠️ " : "";
      rows += `<tr><td>${deadIcon}${escapeHtml(n)}</td><td>${tag}</td><td>${detail}</td></tr>`;
    });
    document.getElementById("hostTable").innerHTML = `<tbody>${rows}</tbody>`;
  } else {
    document.getElementById("hostTable").innerHTML = "";
  }
}

// =========================
// LÓGICAS DE VOTOS
// =========================
document.getElementById("startVotingBtn").addEventListener("click", async () => {
  await update(ref(db, `rooms/${roomId}`), { state: "voting", votes: null });
});

async function processVotes(votes, alivePlayers) {
  if (!votes) votes = {};
  const counts = {};
  for(let v in votes) counts[votes[v]] = (counts[votes[v]] || 0) + 1;

  let max = 0; let eliminated = null; let tie = false;
  for(let p in counts) {
    if(counts[p] > max) { max = counts[p]; eliminated = p; tie = false; }
    else if(counts[p] === max) { tie = true; }
  }

  const updates = { state: "resolution", eliminatedPlayer: tie ? "EMPATE" : eliminated };
  if (!tie && eliminated) {
    updates[`players/${eliminated}/isAlive`] = false;
  }
  await update(ref(db, `rooms/${roomId}`), updates);
}

document.getElementById("btnContinueGame").addEventListener("click", async () => {
  await update(ref(db, `rooms/${roomId}`), { state: "playing" });
});
document.getElementById("btnGoToScore").addEventListener("click", () => {
  document.getElementById("scoreOverlay").classList.add("show");
});

// =========================
// INICIAR RONDA GLOBAL
// =========================
document.getElementById("startBtn").addEventListener("click", async () => {
  const playerNames = Object.keys(roomData.players);
  const settings = roomData.settings;
  
  let pool = [...window.MIXED_POOL];
  if (roomData.customWords) pool = [...pool, ...Object.values(roomData.customWords)];
  if (settings.mode === "single") {
    if (settings.topic === "custom" && roomData.customWords) pool = Object.values(roomData.customWords);
    else { const t = window.TOPICS.find(t => t.id === settings.topic); if(t) pool = t.sets; }
  }
  if (pool.length === 0) return showToast("No hay palabras en este tema.", true);

  let lastWordUsed = null;
  for (let p in roomData.players) { if (roomData.players[p].role === "INOCENTE" && roomData.players[p].word) { lastWordUsed = roomData.players[p].word; break; } }
  let filteredPool = pool.length > 1 && lastWordUsed ? pool.filter(item => item.word !== lastWordUsed) : pool;
  const setWord = filteredPool[Math.floor(Math.random() * filteredPool.length)];

  let impCount = settings.impostors;
  if (playerNames.length < 4 && impCount === 2) impCount = 1; 
  const shuffled = playerNames.slice().sort(() => 0.5 - Math.random());
  const impostors = new Set(shuffled.slice(0, impCount));

  // NUEVO: Elegir aleatoriamente quién empieza (solo entre los jugadores)
  const startingPlayer = playerNames[Math.floor(Math.random() * playerNames.length)];

  const updates = {};
  updates[`rooms/${roomId}/state`] = "playing";
  updates[`rooms/${roomId}/round`] = roomData.round + 1;
  updates[`rooms/${roomId}/votes`] = null;
  updates[`rooms/${roomId}/startingPlayer`] = startingPlayer; // Guardar quién inicia

  playerNames.forEach(name => {
    updates[`rooms/${roomId}/players/${name}/viewed`] = false;
    updates[`rooms/${roomId}/players/${name}/isAlive`] = true; 
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
  set(ref(db, `rooms/${roomId}/players/${myName}/viewed`), true);
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
// PUNTOS Y RESTO DEL HOST
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
  await update(ref(db), updates);
  document.getElementById("scoreOverlay").classList.remove("show");
  document.getElementById("resolutionOverlay").classList.remove("show");
}

document.getElementById("winInnocentsBtn").onclick = () => awardPointsAndReset('innocents');
document.getElementById("winImpostorBtn").onclick = () => awardPointsAndReset('impostor');
document.getElementById("winImpostorWordBtn").onclick = () => awardPointsAndReset('impostor_word');
document.getElementById("winNobodyBtn").onclick = () => awardPointsAndReset('nobody');

openConfigBtn.addEventListener("click", () => document.getElementById("configOverlay").classList.add("show"));
document.getElementById("closeConfigBtn").addEventListener("click", () => document.getElementById("configOverlay").classList.remove("show"));
document.getElementById("savePinBtn").addEventListener("click", async () => {
  await set(ref(db, `rooms/${roomId}/settings/pin`), document.getElementById("setupPinInput").value.trim());
  const status = document.getElementById("pinStatus"); status.style.display = "inline-block"; setTimeout(() => status.style.display = "none", 3000);
});
document.getElementById("saveConfigBtn").addEventListener("click", () => {
  update(ref(db, `rooms/${roomId}/settings`), { mode: document.getElementById("topicMode").value, topic: document.getElementById("topicSelect").value, impostors: parseInt(document.getElementById("impostorSelect").value), pin: roomData.settings.pin || "" });
  document.getElementById("configOverlay").classList.remove("show"); showToast("Configuración guardada.");
});
document.getElementById("addCustomWordBtn").addEventListener("click", async () => {
  const w = document.getElementById("customWordInput").value.trim().toUpperCase(), c = document.getElementById("customClueInput").value.trim();
  if (w && c) { await set(push(ref(db, `rooms/${roomId}/customWords`)), { word: w, clue: c, category: "Personalizado" }); document.getElementById("customWordInput").value = ""; document.getElementById("customClueInput").value = ""; showToast("Palabra añadida con éxito."); } else showToast("Rellena ambos campos.", true);
});
document.getElementById("openHostBtn").addEventListener("click", () => {
  const typedPin = document.getElementById("pinInput").value.trim(), realPin = roomData.settings.pin || "";
  if(realPin !== "" && typedPin !== realPin) { document.getElementById("pinErrorMsg").style.display = "block"; setTimeout(() => document.getElementById("pinErrorMsg").style.display = "none", 3000); return; }
  hostOpen = true; document.getElementById("openHostBtn").disabled = true; document.getElementById("closeHostBtn").disabled = false; document.getElementById("pinInput").value = ""; document.getElementById("hostPanel").classList.remove("hidden"); renderUI(); 
});
document.getElementById("closeHostBtn").addEventListener("click", () => { hostOpen = false; document.getElementById("hostPanel").classList.add("hidden"); document.getElementById("openHostBtn").disabled = false; document.getElementById("closeHostBtn").disabled = true; renderUI(); });
document.getElementById("pinInput").addEventListener("input", () => document.getElementById("pinErrorMsg").style.display = "none");

// =========================
// RESET Y DESTRUCCIÓN
// =========================
document.getElementById("resetGameBtn").addEventListener("click", () => {
  pendingAction = "reset";
  document.getElementById("resetWarningText").textContent = "¿Estás seguro? Esto reiniciará todos los puntos a 0, borrará palabras personalizadas y mandará la sala a Ronda 0.";
  document.getElementById("resetOverlay").classList.add("show");
});

document.getElementById("destroyRoomBtn").addEventListener("click", () => {
  pendingAction = "destroy";
  document.getElementById("resetWarningText").textContent = "ESTO ES DEFINITIVO. ¿Destruir la sala? Todos los jugadores serán desconectados y la partida dejará de existir en los servidores.";
  document.getElementById("resetOverlay").classList.add("show");
});

document.getElementById("cancelResetBtn").addEventListener("click", () => document.getElementById("resetOverlay").classList.remove("show"));

document.getElementById("confirmActionBtn").addEventListener("click", async () => {
  if (pendingAction === "reset") {
    const updates = { [`rooms/${roomId}/state`]: "lobby", [`rooms/${roomId}/round`]: 0, [`rooms/${roomId}/customWords`]: null, [`rooms/${roomId}/settings/pin`]: "" };
    for (let name in roomData.players) { updates[`rooms/${roomId}/players/${name}/score`] = 0; updates[`rooms/${roomId}/players/${name}/viewed`] = false; updates[`rooms/${roomId}/players/${name}/role`] = null; updates[`rooms/${roomId}/players/${name}/word`] = null; updates[`rooms/${roomId}/players/${name}/clue`] = null; updates[`rooms/${roomId}/players/${name}/isAlive`] = true;}
    hostOpen = false; document.getElementById("hostPanel").classList.add("hidden"); document.getElementById("openHostBtn").disabled = false; document.getElementById("closeHostBtn").disabled = true;
    document.getElementById("setupPinInput").value = ""; document.getElementById("pinInput").value = "";
    await update(ref(db), updates); 
    showToast("La sala se ha reiniciado por completo.");
  } else if (pendingAction === "destroy") {
    await set(ref(db, `rooms/${roomId}`), null);
  }
  document.getElementById("resetOverlay").classList.remove("show"); 
  document.getElementById("configOverlay").classList.remove("show"); 
});

function escapeHtml(str) { return String(str).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;"); }