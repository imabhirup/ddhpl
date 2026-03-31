let previousData = [];
let globalData = [];

function loadData() {
  return fetch("./data.json?ts=" + Date.now())
    .then(res => res.json())
    .then(data => {

      // Calculate total points
      data.forEach(player => {
        player.total = player.matches?.reduce((sum, m) => sum + m.points, 0) || 0;
      });

      // Sort & rank
      data.sort((a, b) => b.total - a.total);
      data.forEach((p, i) => p.rank = i + 1);

      globalData = data;

      updateHeader(data);
      renderLeaderboard(data);

      previousData = JSON.parse(JSON.stringify(data));
    });
}

/* Header */
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

/* Leaderboard */
function renderLeaderboard(data) {
  const container = document.getElementById("list");
  container.innerHTML = "";

  data.forEach(player => {
    const row = document.createElement("div");
    row.className = "row";

    row.innerHTML = `
      <div class="left">
        <img src="https://cdn-icons-png.flaticon.com/512/149/149071.png" />
        <span class="name">${player.name}</span>
      </div>

      <div class="points">${player.total.toLocaleString()}</div>
      <div class="rank">#${player.rank}</div>
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

/* Refresh */
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
