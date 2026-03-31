let previousData = [];
let globalData = [];

function loadData() {
  return fetch("./data.json?ts=" + Date.now())
    .then(res => res.json())
    .then(data => {

      // total points
      data.forEach(player => {
        player.total = player.matches?.reduce((sum, m) => sum + m.points, 0) || 0;
      });

      // sort & rank
      data.sort((a, b) => b.total - a.total);
      data.forEach((p, i) => p.rank = i + 1);

      globalData = data;

      updateHeader(data);
      renderPodium(data);
      renderLeaderboard(data);

      previousData = JSON.parse(JSON.stringify(data));
    });
}

/* HEADER */
function updateHeader(data) {
  const matchSet = new Set();

  data.forEach(p => {
    p.matches.forEach(m => matchSet.add(m.match));
  });

  document.getElementById("matches-played").innerText =
    matchSet.size + " Matches Played";

  const matches = [...matchSet];
  const lastMatch = matches[matches.length - 1];

  if (lastMatch) {
    document.getElementById("update-bar").innerHTML =
      `Leaderboard updated after <b>${lastMatch}</b>`;
  }
}

/* 🏆 PODIUM */
function renderPodium(data) {
  const podium = document.getElementById("podium");

  if (data.length < 3) {
    podium.innerHTML = "";
    return;
  }

  const top3 = data.slice(0, 3);

  podium.innerHTML = `
    <div class="podium-container">
      <div class="podium-item second">
        <div class="avatar"></div>
        <div class="name">${top3[1].name}</div>
        <div class="points">${top3[1].total}</div>
        <div class="rank">2</div>
      </div>

      <div class="podium-item first">
        <div class="avatar"></div>
        <div class="name">${top3[0].name}</div>
        <div class="points">${top3[0].total}</div>
        <div class="rank">1</div>
      </div>

      <div class="podium-item third">
        <div class="avatar"></div>
        <div class="name">${top3[2].name}</div>
        <div class="points">${top3[2].total}</div>
        <div class="rank">3</div>
      </div>
    </div>
  `;
}

/* Leaderboard */
function renderLeaderboard(data) {
  const container = document.getElementById("list");
  container.innerHTML = "";

  data.forEach(player => {
    const row = document.createElement("div");
    row.className = "row";

    const old = previousData.find(p => p.name === player.name);

    let movement = "";
    if (old) {
      if (player.rank < old.rank) movement = "⬆️";
      else if (player.rank > old.rank) movement = "⬇️";
    }

    row.innerHTML = `
      <div class="left">
        <img src="https://cdn-icons-png.flaticon.com/512/149/149071.png" />
        <span class="name">${player.name}</span>
      </div>

      <div class="points">${player.total.toLocaleString()}</div>
      <div class="rank">#${player.rank} ${movement}</div>
    `;

    row.onclick = () => openModal(player);
    container.appendChild(row);
  });
}

/* Modal */
function getMatchRanks(matchName) {
  const players = [];

  globalData.forEach(player => {
    const match = player.matches.find(m => m.match === matchName);
    if (match) players.push({ name: player.name, points: match.points });
  });

  players.sort((a, b) => b.points - a.points);
  players.forEach((p, i) => p.rank = i + 1);

  return players;
}

function openModal(player) {
  const modal = document.getElementById("modal");
  const content = document.getElementById("modal-content");

  let html = `
    <div class="modal-header">
      <h2>${player.name}</h2>
      <div class="total-points">Total Points: ${player.total}</div>
    </div>
  `;

  player.matches.forEach(m => {
    const ranks = getMatchRanks(m.match);
    const playerRank = ranks.find(p => p.name === player.name)?.rank;

    html += `
      <div class="match-card">
        <div class="match-title">🏏 ${m.match}</div>
        <div class="match-info">
          <span class="rank-badge">Rank #${playerRank}</span>
          <span class="match-points">${m.points} pts</span>
        </div>
      </div>
    `;
  });

  content.innerHTML = html;
  modal.style.display = "flex";
}

function closeModal() {
  document.getElementById("modal").style.display = "none";
}

window.onclick = function(e) {
  if (e.target.id === "modal") closeModal();
};

/* 🔄 Refresh */
function refreshData() {
  const btn = document.querySelector(".refresh-btn");

  btn.classList.add("spinning");
  btn.disabled = true;

  setTimeout(() => {
    loadData().then(() => {
      btn.classList.remove("spinning");
      btn.disabled = false;
    });
  }, 600);
}

loadData();
