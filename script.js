let previousData = [];
let globalData = [];
const TEAM_LOGOS = {
  BLR: {
    name: "Royal Challengers Bengaluru",
    logo: "https://upload.wikimedia.org/wikipedia/en/d/d4/Royal_Challengers_Bangalore_Logo.svg"
  },
  HYD: {
    name: "Sunrisers Hyderabad",
    logo: "https://upload.wikimedia.org/wikipedia/en/8/81/Sunrisers_Hyderabad.svg"
  },
  MUM: {
    name: "Mumbai Indians",
    logo: "https://upload.wikimedia.org/wikipedia/en/c/cd/Mumbai_Indians_Logo.svg"
  },
  KOL: {
    name: "Kolkata Knight Riders",
    logo: "https://upload.wikimedia.org/wikipedia/en/1/12/Kolkata_Knight_Riders_Logo.svg"
  },
  RR: {
    name: "Rajasthan Royals",
    logo: "https://upload.wikimedia.org/wikipedia/en/6/60/Rajasthan_Royals_Logo.svg"
  },
  CSK: {
    name: "Chennai Super Kings",
    logo: "https://upload.wikimedia.org/wikipedia/en/2/2e/Chennai_Super_Kings_Logo.svg"
  }
};

function getTeamsFromMatch(matchName) {
  const teams = matchName.split(" vs ").map(team => team.trim());
  return teams.length === 2 ? teams : [];
}

function loadData() {
  return fetch("./data.json?ts=" + Date.now())
    .then(res => res.json())
    .then(data => {

      data.forEach(player => {
        player.total = player.matches.reduce((sum, m) => sum + m.points, 0);
      });

      data.sort((a, b) => b.total - a.total);
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

/* Match rank calculation */
function getMatchRanks(matchName) {
  const players = [];

  globalData.forEach(player => {
    const match = player.matches.find(m => m.match === matchName);
    if (match) {
      players.push({ name: player.name, points: match.points });
    }
  });

  players.sort((a, b) => b.points - a.points);
  players.forEach((p, i) => p.rank = i + 1);

  return players;
}

/* MODAL */
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
    const teams = getTeamsFromMatch(m.match);
    const leftTeam = TEAM_LOGOS[teams[0]];
    const rightTeam = TEAM_LOGOS[teams[1]];

    html += `
      <div class="match-card">
        <div class="match-title">🏏 ${m.match}</div>
        <div class="teams-row">
          <div class="team-chip">
            ${leftTeam ? `<img src="${leftTeam.logo}" alt="${leftTeam.name} logo" class="team-logo">` : ""}
            <span>${teams[0] || ""}</span>
          </div>
          <span class="vs-text">vs</span>
          <div class="team-chip">
            ${rightTeam ? `<img src="${rightTeam.logo}" alt="${rightTeam.name} logo" class="team-logo">` : ""}
            <span>${teams[1] || ""}</span>
          </div>
        </div>
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
  const modal = document.getElementById("modal");
  if (e.target === modal) modal.style.display = "none";
};

function refreshData() {
  const btn = document.querySelector(".refresh-btn");

  btn.innerText = "⏳ Loading...";
  btn.disabled = true;

  loadData().then(() => {
    btn.innerText = "✅ Updated";
    
    setTimeout(() => {
      btn.innerText = "🔄 Refresh";
      btn.disabled = false;
    }, 1000);
  });
}

loadData();
