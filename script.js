let previousData = [];
let globalData = [];

function applyCompetitionRanks(data, scoreSelector) {
  data.forEach((player, index) => {
    if (index === 0) {
      player.rank = 1;
      return;
    }

    const currentScore = scoreSelector(player);
    const previousScore = scoreSelector(data[index - 1]);

    if (currentScore === previousScore) {
      player.rank = data[index - 1].rank; // same rank for tied scores
    } else {
      player.rank = index + 1; // skip rank automatically
    }
  });
}

function loadData() {
  return fetch("./data.json?ts=" + Date.now())
    .then(res => res.json())
    .then(data => {
      // Calculate total points
      data.forEach(player => {
        player.total = player.matches?.reduce((sum, m) => {
          const factor = m.ampfactor ? m.ampfactor : 1;
          return sum + (m.points * factor);
        }, 0) || 0;
      });

      // Sort & rank
      data.sort((a, b) => b.total - a.total);
      applyCompetitionRanks(data, player => player.total);

      globalData = data;

      updateHeader(data);
      renderLeaderboard(data);

      previousData = JSON.parse(JSON.stringify(data));
    });
}

/* HEADER (Dynamic) */
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

/* Match rank */
function getMatchRanks(matchName) {
  const players = [];

  globalData.forEach(player => {
    const match = player.matches.find(m => m.match === matchName);
    if (match) {
      players.push({ name: player.name, points: match.points });
    }
  });

  players.sort((a, b) => b.points - a.points);
  applyCompetitionRanks(players, player => player.points);

  return players;
}

function formatPoints(value) {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function buildBarChart(player, matches, points, avg) {
  if (!matches.length) {
    return '<div class="chart-empty">No matches available.</div>';
  }

  const max = Math.max(...points) || 1;

  const bars = points.map((point, index) => {
    const ratio = Math.max((point / max) * 100, 4);
    const matchObj = player.matches.find(m => m.match === matches[index]);
    const rank = getMatchRanks(matches[index]).find(p => p.name === player.name)?.rank || "-";
    const tone = point > avg ? "#22C55E" : point < avg ? "#EF4444" : "#F59E0B";

    const factor = matchObj?.ampfactor || 1;

    return `
      <div class="bar-item">
        <div class="bar-value">${formatPoints(point)}</div>
        <div class="bar-track">
          ${factor > 1 ? `<span class="bar-badge">${factor}x</span>` : ""}
          <div class="bar-fill" style="height:${ratio.toFixed(2)}%;background:${tone};" title="${matches[index]} • ${formatPoints(point)} pts • Rank #${rank}${factor > 1 ? ` • ${factor}x Applied` : ""}"></div>
        </div>
        <div class="bar-label">${matches[index]}</div>
      </div>
    `;
  }).join("");

  return `<div class="bar-chart" style="height:120px;">${bars}</div>`;
}

function calculateConsistency(points, avg) {
  if (points.length <= 1) return 100;
  const variance = points.reduce((sum, point) => sum + Math.pow(point - avg, 2), 0) / points.length;
  const stdDev = Math.sqrt(variance);
  const normalized = avg ? stdDev / avg : 1;
  const consistency = 100 - (normalized * 100);
  return Math.max(0, Math.min(100, consistency));
}

/* Modal */
function openModal(player) {
  const modal = document.getElementById("modal");
  const content = document.getElementById("modal-content");

  const allPoints = player.matches.map(m => m.points * (m.ampfactor || 1));
  const avg = allPoints.length
    ? allPoints.reduce((sum, point) => sum + point, 0) / allPoints.length
    : 0;
  const best = allPoints.length ? Math.max(...allPoints) : 0;
  const worst = allPoints.length ? Math.min(...allPoints) : 0;
  const consistency = calculateConsistency(allPoints, avg);

  const lastMatches = player.matches.slice(-10);
  const matches = lastMatches.map(m => m.match);
  const points = lastMatches.map(m => m.points * (m.ampfactor || 1));

  const bestMatch = player.matches[allPoints.indexOf(best)]?.match || "-";
  const worstMatch = player.matches[allPoints.indexOf(worst)]?.match || "-";

  let html = `
    <div class="modal-header">
      <h2>${player.name}</h2>
      <div class="total-points">${formatPoints(player.total)} pts</div>
    </div>

    <div class="analytics-section">
      <div class="analytics-card">
        <div class="analytics-title">📊 Match-wise Points</div>
        ${buildBarChart(player, matches, points, avg)}
      </div>

      <div class="analytics-card">
        <div class="analytics-title">🧠 Insights</div>
        <div class="insights-grid">
          <div class="insight-item">
            <span class="insight-label">🔥 Best</span>
            <span class="insight-value">${formatPoints(best)} (${bestMatch})</span>
          </div>
          <div class="insight-item">
            <span class="insight-label">❄️ Worst</span>
            <span class="insight-value">${formatPoints(worst)} (${worstMatch})</span>
          </div>
          <div class="insight-item" title="Average = Total points ÷ number of matches">
            <span class="insight-label">🎯 Avg</span>
            <span class="insight-value">${formatPoints(avg)} pts</span>
          </div>
          <div class="insight-item" title="Consistency = 100 - (Standard Deviation / Average × 100)">
            <span class="insight-label">⚡ Consistency</span>
            <span class="insight-value">${Math.round(consistency)}%</span>
          </div>
        </div>
      </div>
    </div>

    <div class="matches-list">
  `;

  player.matches.forEach(m => {
    const ranks = getMatchRanks(m.match);
    const playerRank = ranks.find(p => p.name === player.name)?.rank;

    const factor = m.ampfactor || 1;
    const indvPoint = m.points * factor;

    const isBoosted = factor > 1;

    html += `
      <div class="match-card ${isBoosted ? 'boosted' : ''}">
        <div class="match-title">
          🏏 ${m.match}
          ${isBoosted ? `<span class="amp-badge">${factor}x</span>` : ''}
        </div>
        <div class="match-info">
          <span class="rank-badge">Rank #${playerRank}</span>
          <span class="match-points">${formatPoints(indvPoint)} pts</span>
        </div>
      </div>
    `;
  });

  html += `</div>`;

  content.innerHTML = html;
  modal.style.display = "flex";
  requestAnimationFrame(() => {
    modal.classList.add("open");
  });
}

function closeModal() {
  const modal = document.getElementById("modal");
  modal.classList.remove("open");
  setTimeout(() => {
    modal.style.display = "none";
  }, 180);
}

window.onclick = function(e) {
  const modal = document.getElementById("modal");
  if (e.target === modal) closeModal();
};

/* Refresh */
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
