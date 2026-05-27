// DDHPL Leaderboard Script
// Toofani Mode: uses ampfactor-multiplied scores
// Normal Mode: uses raw points only

let allData = [];
let currentData = [];
let toofaniMode = false;

const DATA_URL = 'data.json';
const CURRENT_URL = 'current.json';

// ─── Boot ────────────────────────────────────────────────────────────────────
async function init() {
  await loadData();
  setupHallCarousel();
}

async function refreshData() {
  await loadData();
}

// ─── Data Loading ─────────────────────────────────────────────────────────────
async function loadData() {
  try {
    const [dataRes, currentRes] = await Promise.all([
      fetch(DATA_URL),
      fetch(CURRENT_URL).catch(() => null)
    ]);

    allData = await dataRes.json();

    // Current match info
    if (currentRes && currentRes.ok) {
      const currentInfo = await currentRes.json();
      showCurrentMatch(currentInfo);
    }

    renderLeaderboard();
    renderHallOfFame();
    renderMatchCount();
  } catch (err) {
    console.error('Failed to load data:', err);
  }
}

// ─── Score Calculation ────────────────────────────────────────────────────────

/** Total points without any ampfactor */
function calcNormalTotal(player) {
  return player.matches.reduce((sum, m) => sum + (m.points || 0), 0);
}

/** Total points with ampfactor applied */
function calcToofaniTotal(player) {
  return player.matches.reduce((sum, m) => {
    const amp = m.ampfactor || 1;
    return sum + (m.points || 0) * amp;
  }, 0);
}

function getTotal(player) {
  return toofaniMode ? calcToofaniTotal(player) : calcNormalTotal(player);
}

// ─── Toofani Toggle ───────────────────────────────────────────────────────────
function toggleToofaniMode(isOn) {
  toofaniMode = isOn;
  renderLeaderboard();

  // Visual flair when Toofani mode turns on
  const header = document.querySelector('.leaderboard-header');
  if (isOn) {
    header.classList.add('toofani-active');
  } else {
    header.classList.remove('toofani-active');
  }
}

// ─── Leaderboard Rendering ────────────────────────────────────────────────────
function renderLeaderboard() {
  const list = document.getElementById('list');
  if (!list || allData.length === 0) return;

  // Sort by current score mode descending
  const sorted = [...allData].sort((a, b) => getTotal(b) - getTotal(a));

  list.innerHTML = sorted.map((player, idx) => {
    const rank = idx + 1;
    const total = getTotal(player);
    const rankEmoji = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;
    const rankClass = rank <= 3 ? `rank-top rank-${rank}` : 'rank-normal';

    return `
      <div class="leaderboard-row ${rank <= 3 ? 'top-row' : ''}" onclick="openModal('${player.name}')">
        <span class="player-name">${player.name}</span>
        <span class="player-score">${formatScore(total)}</span>
        <span class="player-rank ${rankClass}">${rankEmoji}</span>
      </div>
    `;
  }).join('');
}

function formatScore(n) {
  return Math.round(n).toLocaleString('en-IN');
}

// ─── Match Count ──────────────────────────────────────────────────────────────
function renderMatchCount() {
  if (allData.length === 0) return;
  const matchCount = allData[0].matches.length;
  const el = document.getElementById('matches-played');
  if (el) el.textContent = `${matchCount} matches played`;
}

// ─── Current Match (Live Status) ─────────────────────────────────────────────
function showCurrentMatch(info) {
  const liveStatus = document.getElementById('live-status');
  const updateBar = document.getElementById('update-bar');

  if (info && info.match) {
    if (liveStatus) liveStatus.style.display = 'block';
    if (updateBar) updateBar.textContent = `🔄 Last updated: ${info.match}${info.timestamp ? ' · ' + info.timestamp : ''}`;
  }
}

// ─── Hall of Fame ─────────────────────────────────────────────────────────────
function renderHallOfFame() {
  if (allData.length === 0) return;

  // Champion — highest toofani total
  const byToofani = [...allData].sort((a, b) => calcToofaniTotal(b) - calcToofaniTotal(a));
  const champion = byToofani[0];
  setHofCard('champion-name', 'champion-total', champion.name, formatScore(calcToofaniTotal(champion)) + ' pts');

  // Highest single match score
  let highestMatch = null, highestPlayer = '';
  allData.forEach(p => {
    p.matches.forEach(m => {
      if (!highestMatch || m.points > highestMatch.points) {
        highestMatch = m;
        highestPlayer = p.name;
      }
    });
  });
  if (highestMatch) {
    setHofCard('highest-score-name', 'highest-score-points', highestPlayer, `${highestMatch.points} (${highestMatch.match})`);
  }

  // Lowest single match score (non-zero)
  let lowestMatch = null, lowestPlayer = '';
  allData.forEach(p => {
    p.matches.forEach(m => {
      if (m.points > 0 && (!lowestMatch || m.points < lowestMatch.points)) {
        lowestMatch = m;
        lowestPlayer = p.name;
      }
    });
  });
  if (lowestMatch) {
    setHofCard('lowest-score-name', 'lowest-score-points', lowestPlayer, `${lowestMatch.points} (${lowestMatch.match})`);
  }

  // Consistency King — lowest variance (std dev) across non-zero matches
  const consistencyScores = allData.map(p => {
    const pts = p.matches.filter(m => m.points > 0).map(m => m.points);
    if (pts.length === 0) return { name: p.name, stddev: Infinity };
    const mean = pts.reduce((a, b) => a + b, 0) / pts.length;
    const variance = pts.reduce((a, b) => a + (b - mean) ** 2, 0) / pts.length;
    return { name: p.name, stddev: Math.sqrt(variance) };
  }).sort((a, b) => a.stddev - b.stddev);
  const consistencyKing = consistencyScores[0];
  setHofCard('consistency-king-name', 'consistency-king-stat', consistencyKing.name, `σ ${Math.round(consistencyKing.stddev)}`);

  // Explosive Player — most matches with ampfactor
  const explosiveCounts = allData.map(p => ({
    name: p.name,
    count: p.matches.filter(m => m.ampfactor && m.ampfactor > 1).length
  })).sort((a, b) => b.count - a.count);
  const explosive = explosiveCounts[0];
  setHofCard('explosive-player-name', 'explosive-player-count', explosive.name, `${explosive.count} boosted matches`);

  // Lowest Performer — lowest toofani total
  const lowestPerformer = byToofani[byToofani.length - 1];
  setHofCard('lowest-performer-name', 'lowest-performer-stat', lowestPerformer.name, formatScore(calcToofaniTotal(lowestPerformer)) + ' pts');

  // Most Missed Matches
  const missedCounts = allData.map(p => ({
    name: p.name,
    count: p.matches.filter(m => m.points === 0).length
  })).sort((a, b) => b.count - a.count);
  const mostMissed = missedCounts[0];
  setHofCard('most-missed-name', 'most-missed-stat', mostMissed.name, `${mostMissed.count} missed`);
}

function setHofCard(nameId, statId, name, stat) {
  const nameEl = document.getElementById(nameId);
  const statEl = document.getElementById(statId);
  if (nameEl) nameEl.textContent = name;
  if (statEl) statEl.textContent = stat;
}

// ─── Hall Carousel ────────────────────────────────────────────────────────────
let hallIndex = 0;

function setupHallCarousel() {
  const track = document.getElementById('hall-track');
  const prevBtn = document.getElementById('hall-prev');
  const nextBtn = document.getElementById('hall-next');
  if (!track) return;

  const cards = track.querySelectorAll('.hof-card');
  const total = cards.length;

  function updateCarousel() {
    track.style.transform = `translateX(-${hallIndex * 100}%)`;
  }

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      hallIndex = (hallIndex - 1 + total) % total;
      updateCarousel();
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      hallIndex = (hallIndex + 1) % total;
      updateCarousel();
    });
  }
}

// ─── Modal ────────────────────────────────────────────────────────────────────
function openModal(name) {
  const player = allData.find(p => p.name === name);
  if (!player) return;

  const normalTotal = calcNormalTotal(player);
  const toofaniTotal = calcToofaniTotal(player);

  const matchRows = player.matches.map((m, i) => {
    const amp = m.ampfactor || 1;
    const boosted = m.points * amp;
    return `
      <tr class="${m.points === 0 ? 'missed' : ''}">
        <td>${i + 1}</td>
        <td>${m.match}</td>
        <td>${m.points}</td>
        <td>${amp > 1 ? `<span class="amp-badge">×${amp}</span>` : '—'}</td>
        <td>${amp > 1 ? boosted : m.points}</td>
      </tr>
    `;
  }).join('');

  const content = document.getElementById('modal-content');
  content.innerHTML = `
    <h2>${name}</h2>
    <div class="modal-totals">
      <div class="modal-total-card">
        <span class="total-label">Normal Score</span>
        <span class="total-value">${formatScore(normalTotal)}</span>
      </div>
      <div class="modal-total-card toofani">
        <span class="total-label">⚡ Toofani Score</span>
        <span class="total-value">${formatScore(toofaniTotal)}</span>
      </div>
    </div>
    <table class="match-table">
      <thead>
        <tr>
          <th>#</th>
          <th>Match</th>
          <th>Points</th>
          <th>Amp</th>
          <th>Boosted</th>
        </tr>
      </thead>
      <tbody>${matchRows}</tbody>
    </table>
  `;

  const modal = document.getElementById('modal');
  modal.style.display = 'flex';
}

function closeModal() {
  const modal = document.getElementById('modal');
  modal.style.display = 'none';
}

// Close modal on background click
document.addEventListener('click', function (e) {
  const modal = document.getElementById('modal');
  if (e.target === modal) closeModal();
});

// ─── Start ────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', init);
