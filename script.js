let previousData = [];
let globalData = [];

function loadData() {
  fetch("./data.json?ts=" + Date.now())
    .then(res => res.json())
    .then(data => {

      // total points
      data.forEach(player => {
        player.total = player.matches.reduce((sum, m) => sum + m.points, 0);
      });

      // sort overall
      data.sort((a, b) => b.total - a.total);

      // overall rank
      data.forEach((p, i) => p.rank = i + 1);

      globalData = data;

      renderLeaderboard(data);
      previousData = JSON.parse(JSON.stringify(data));
    });
}

function renderLeaderboard(data) {
  const container = document.getElementById("list");
  container.innerHTML = "";

  data.forEach(player => {

    const div = document.createElement("div");
    div.className = "card";

    if (player.rank <= 3) div.classList.add(`rank-${player.rank}`);

    const old = previousData.find(p => p.name === player.name);

    if (old && old.total !== player.total) div.classList.add("updated");

    if (old) {
      if (player.rank < old.rank) div.classList.add("rank-up");
      else if (player.rank > old.rank) div.classList.add("rank-down");
    }

    div.innerHTML = `
      <div class="left">
        <div class="avatar"></div>
        <div>
          <div class="rank">Rank #${player.rank}</div>
          <div class="name">${player.name}</div>
        </div>
      </div>
      <div class="points">${player.total}</div>
    `;

    div.onclick = () => openModal(player);

    container.appendChild(div);
  });
}

/* 🔥 Calculate match-wise ranks */
function getMatchRanks(matchName) {
  const players = [];

  globalData.forEach(player => {
    const match = player.matches.find(m => m.match === matchName);
    if (match) {
      players.push({
        name: player.name,
        points: match.points
      });
    }
  });

  // sort by match points
  players.sort((a, b) => b.points - a.points);

  // assign rank
  players.forEach((p, i) => p.rank = i + 1);

  return players;
}

/* 🔥 Modal with match ranks */
function openModal(player) {
  const modal = document.getElementById("modal");
  const content = document.getElementById("modal-content");

  content.innerHTML = `
    <h2>${player.name}</h2>
    <p>Total Points: ${player.total}</p>
  `;

  player.matches.forEach(m => {
    const ranks = getMatchRanks(m.match);
    const playerRank = ranks.find(p => p.name === player.name)?.rank;

    content.innerHTML += `
      <div class="match-block">
        <div class="match-header">🏏 ${m.match}</div>
        <div class="match-row">
          <span>Rank: #${playerRank}</span>
          <span>Points: ${m.points}</span>
        </div>
      </div>
    `;
  });

  modal.style.display = "flex";
}

function closeModal() {
  document.getElementById("modal").style.display = "none";
}

window.onclick = function(e) {
  const modal = document.getElementById("modal");
  if (e.target === modal) modal.style.display = "none";
};

function refreshData() {
  const btn = document.querySelector(".refresh-btn");
  btn.innerText = "⏳ Loading...";

  loadData();

  setTimeout(() => {
    btn.innerText = "🔄 Refresh";
  }, 800);
}

loadData();
