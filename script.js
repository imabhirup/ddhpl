let previousData = [];
let globalData = [];
let hallCarouselInitialized = false;

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
      renderHallOfFame(data);

      if (!hallCarouselInitialized) {
        initHallOfFameCarousel();
        hallCarouselInitialized = true;
      }

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

function getTooltipAttr(text) {
  return text ? `title="${text}"` : "";
}

function calculateConsistency(points, options = {}) {
  const { minMatches = 1, ignoreZero = true } = options;

  const validPoints = (Array.isArray(points) ? points : [])
    .map((point) => toNumber(point, 0))
    .filter((point) => (ignoreZero ? point > 0 : true));

  if (validPoints.length < minMatches) return null;

  const avg = validPoints.reduce((sum, point) => sum + point, 0) / validPoints.length;
  if (!Number.isFinite(avg) || avg <= 0) return null;

  const variance = validPoints.reduce((sum, point) => sum + Math.pow(point - avg, 2), 0) / validPoints.length;
  const sd = Math.sqrt(variance);
  const rawConsistency = 100 - ((sd / avg) * 100);
  const clampedConsistency = Math.max(0, Math.min(100, rawConsistency));

  return {
    consistency: Math.round(clampedConsistency),
    avg,
    sd,
    count: validPoints.length
  };
}


function toNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function getMatchFactor(match) {
  return toNumber(match?.ampfactor, 1) || 1;
}

function formatHallPoints(value) {
  return `${formatPoints(value)} pts`;
}

function formatHallAverage(value) {
  return `${formatPoints(value)} avg`;
}

function calculateStdDev(values) {
  if (!values.length) return Number.POSITIVE_INFINITY;
  const avg = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + Math.pow(value - avg, 2), 0) / values.length;
  return Math.sqrt(variance);
}


function getConsistencyKing(playersData) {
  const players = Array.isArray(playersData) ? playersData : [];
  const eligible = [];

  players.forEach((player, index) => {
    const matches = Array.isArray(player?.matches) ? player.matches : [];
    const validPoints = matches
      .map((match) => toNumber(match?.points, 0))
      .filter((points) => points > 0);

    if (validPoints.length < 5) return;

    const consistencyStats = calculateConsistency(validPoints, { minMatches: 5, ignoreZero: true });
    if (!consistencyStats) return;

    eligible.push({
      name: player?.name || "Unknown",
      consistency: consistencyStats.consistency,
      avg: consistencyStats.avg,
      index
    });
  });

  if (!eligible.length) return null;

  eligible.sort((a, b) => (b.consistency - a.consistency) || (b.avg - a.avg) || (a.index - b.index));
  return {
    name: eligible[0].name,
    consistency: eligible[0].consistency,
    avg: eligible[0].avg
  };
}

function calculateHallOfFame(playersData) {
  const players = Array.isArray(playersData) ? playersData : [];

  const stats = players.map((player, index) => {
    const matches = Array.isArray(player?.matches) ? player.matches : [];
    const normalized = matches.map((match, matchIndex) => ({
      order: matchIndex,
      match: match?.match || "Unknown Match",
      points: toNumber(match?.points, 0),
      ampfactor: getMatchFactor(match)
    }));

    const weightedTotal = normalized.reduce((sum, match) => sum + (match.points * match.ampfactor), 0);
    const avgAll = normalized.length
      ? normalized.reduce((sum, match) => sum + match.points, 0) / normalized.length
      : 0;

    const positiveMatches = normalized.filter((match) => match.points > 0);
    const positiveAvg = positiveMatches.length
      ? positiveMatches.reduce((sum, match) => sum + match.points, 0) / positiveMatches.length
      : Number.POSITIVE_INFINITY;


    return {
      index,
      name: player?.name || "Unknown",
      matches: normalized,
      weightedTotal,
      avgAll,
      positiveMatches,
      positiveAvg,
      explosiveCount: normalized.filter((match) => match.points >= 900).length,
      missedCount: normalized.filter((match) => match.points === 0).length
    };
  });

  const allMatches = [];
  const positiveScoreMatches = [];

  stats.forEach((player) => {
    player.matches.forEach((match) => {
      const record = {
        playerIndex: player.index,
        playerName: player.name,
        points: match.points,
        match: match.match,
        order: match.order
      };

      allMatches.push(record);
      if (match.points > 0) {
        positiveScoreMatches.push(record);
      }
    });
  });

  const champion = [...stats]
    .sort((a, b) => (b.weightedTotal - a.weightedTotal) || (b.avgAll - a.avgAll) || (a.index - b.index))[0];

  const highestScore = [...allMatches]
    .sort((a, b) => (b.points - a.points) || (a.playerIndex - b.playerIndex) || (a.order - b.order))[0];

  const lowestScore = [...positiveScoreMatches]
    .sort((a, b) => (a.points - b.points) || (a.playerIndex - b.playerIndex) || (a.order - b.order))[0];

  const consistencyKing = getConsistencyKing(playersData);

  const explosivePlayer = [...stats]
    .sort((a, b) => (b.explosiveCount - a.explosiveCount) || (a.index - b.index))[0];

  const lowestPerformer = stats
    .filter((player) => Number.isFinite(player.positiveAvg))
    .sort((a, b) => (a.positiveAvg - b.positiveAvg) || (a.index - b.index))[0];

  const mostMissed = [...stats]
    .sort((a, b) => (b.missedCount - a.missedCount) || (a.index - b.index))[0];

  return {
    champion: champion ? {
      name: champion.name,
      total: champion.weightedTotal,
      stat: formatHallPoints(champion.weightedTotal)
    } : null,
    highestScore: highestScore ? {
      name: highestScore.playerName,
      points: highestScore.points,
      match: highestScore.match,
      stat: `${formatHallPoints(highestScore.points)} (${highestScore.match})`
    } : null,
    lowestScore: lowestScore ? {
      name: lowestScore.playerName,
      points: lowestScore.points,
      match: lowestScore.match,
      stat: `${formatHallPoints(lowestScore.points)} (${lowestScore.match})`
    } : null,
    consistencyKing: consistencyKing ? {
      name: consistencyKing.name,
      consistency: consistencyKing.consistency,
      avg: consistencyKing.avg,
      stat: `${consistencyKing.consistency}% consistent`
    } : null,
    explosivePlayer: explosivePlayer ? {
      name: explosivePlayer.name,
      count: explosivePlayer.explosiveCount,
      stat: `${explosivePlayer.explosiveCount} scores > 900`
    } : null,
    lowestPerformer: lowestPerformer ? {
      name: lowestPerformer.name,
      avg: lowestPerformer.positiveAvg,
      stat: `avg ${formatPoints(lowestPerformer.positiveAvg)} pts`
    } : null,
    mostMissed: mostMissed ? {
      name: mostMissed.name,
      missedCount: mostMissed.missedCount,
      stat: `${mostMissed.missedCount} missed matches`
    } : null
  };
}

function renderHallOfFame(playersData) {
  const hallData = calculateHallOfFame(playersData);

  const cardMap = [
    { key: "champion", playerSelector: "#champion-name", statSelector: "#champion-total" },
    { key: "highestScore", playerSelector: "#highest-score-name", statSelector: "#highest-score-points" },
    { key: "lowestScore", playerSelector: "#lowest-score-name", statSelector: "#lowest-score-points" },
    { key: "consistencyKing", playerSelector: "#consistency-king-name", statSelector: "#consistency-king-stat" },
    { key: "explosivePlayer", playerSelector: "#explosive-player-name", statSelector: "#explosive-player-count" },
    { key: "lowestPerformer", playerSelector: "#lowest-performer-name", statSelector: "#lowest-performer-stat" },
    { key: "mostMissed", playerSelector: "#most-missed-name", statSelector: "#most-missed-stat" }
  ];

  cardMap.forEach(({ key, playerSelector, statSelector }) => {
    const result = hallData[key];
    const cards = document.querySelectorAll(`[data-achievement="${key}"]`);

    cards.forEach((card) => {
      const playerEl = card.querySelector('.hall-player');
      const statEl = card.querySelector('.hall-stat');

      if (!result) {
        card.style.visibility = "hidden";
        card.style.opacity = "0";
        card.setAttribute("aria-hidden", "true");
        return;
      }

      card.style.visibility = "visible";
      card.style.opacity = "1";
      if (playerEl) playerEl.textContent = result.name;
      if (statEl) statEl.textContent = result.stat;
    });

    const primaryPlayerEl = document.querySelector(playerSelector);
    const primaryStatEl = document.querySelector(statSelector);

    if (!result) {
      if (primaryPlayerEl) primaryPlayerEl.textContent = "--";
      if (primaryStatEl) primaryStatEl.textContent = "--";
      return;
    }

    if (primaryPlayerEl) primaryPlayerEl.textContent = result.name;
    if (primaryStatEl) primaryStatEl.textContent = result.stat;
  });
}

/* Modal */
function openModal(player) {
  const modal = document.getElementById("modal");
  const content = document.getElementById("modal-content");
  const matchesData = [...player.matches].reverse();

  const allPoints = player.matches.map(m => m.points * (m.ampfactor || 1));
  const rawPoints = matchesData.map(m => m.points);
  const validPoints = matchesData
    .filter(m => m.points > 0)
    .map(m => m.points);

  const avg = allPoints.length
    ? allPoints.reduce((sum, point) => sum + point, 0) / allPoints.length
    : 0;
  const best = rawPoints.length ? Math.max(...rawPoints) : 0;
  const worst = validPoints.length ? Math.min(...validPoints) : 0;
  const consistencyStats = calculateConsistency(rawPoints, { minMatches: 1, ignoreZero: true });

  const bestMatch = matchesData.find(m => m.points === best)?.match || "-";
  const worstMatch = matchesData.find(m => m.points === worst)?.match || "-";
  const avgTooltip = "Average = Total points ÷ matches";
  const consistencyTooltip = "Consistency = 100 - (SD / Avg × 100), using only matches with points > 0";

  let html = `
    <div class="modal-header">
      <h2>${player.name}</h2>
      <div class="total-points">${formatPoints(player.total)} pts</div>
    </div>

    <div class="analytics-section">
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
          <div class="insight-item" ${getTooltipAttr(avgTooltip)}>
            <span class="insight-label">🎯 Avg</span>
            <span class="insight-value">${formatPoints(avg)} pts</span>
          </div>
          <div class="insight-item" ${getTooltipAttr(consistencyTooltip)}>
            <span class="insight-label">⚡ Consistency</span>
            <span class="insight-value">${consistencyStats ? `${consistencyStats.consistency}%` : "N/A"}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="matches-list">
  `;

  matchesData.forEach(m => {
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


function initHallOfFameCarousel() {
  const carousel = document.getElementById("hall-carousel");
  const track = document.getElementById("hall-track");
  const prevBtn = document.getElementById("hall-prev");
  const nextBtn = document.getElementById("hall-next");

  if (!carousel || !track || !prevBtn || !nextBtn) return;

  const originalSlides = Array.from(track.children);
  if (!originalSlides.length) return;

  let slidesPerView = 3;
  let currentIndex = 0;
  let autoRotateTimer = null;
  let slideStep = 0;
  let touchStartX = 0;

  function getSlidesPerView() {
    if (window.innerWidth <= 640) return 1;
    if (window.innerWidth <= 960) return 2;
    return 3;
  }

  function markAccessibility() {
    const cards = Array.from(track.children);
    cards.forEach((card, index) => {
      const activeStart = currentIndex;
      const activeEnd = currentIndex + slidesPerView - 1;
      const isVisible = index >= activeStart && index <= activeEnd;
      card.setAttribute("aria-hidden", isVisible ? "false" : "true");
    });
  }

  function calculateSlideStep() {
    const cards = track.children;
    if (cards.length < 2) {
      slideStep = cards[0]?.getBoundingClientRect().width || carousel.clientWidth;
      return;
    }

    slideStep = cards[1].offsetLeft - cards[0].offsetLeft;
  }

  function applyPosition(withTransition = true) {
    track.style.transition = withTransition ? "transform 0.45s ease" : "none";
    track.style.transform = `translateX(-${currentIndex * slideStep}px)`;
    markAccessibility();
  }

  function buildInfiniteTrack() {
    track.querySelectorAll(".clone-slide").forEach((clone) => clone.remove());

    slidesPerView = getSlidesPerView();
    const cloneCount = Math.min(slidesPerView, originalSlides.length);

    const headClones = originalSlides.slice(0, cloneCount).map((slide) => {
      const clone = slide.cloneNode(true);
      clone.classList.add("clone-slide");
      clone.removeAttribute("id");
      return clone;
    });

    const tailClones = originalSlides.slice(-cloneCount).map((slide) => {
      const clone = slide.cloneNode(true);
      clone.classList.add("clone-slide");
      clone.removeAttribute("id");
      return clone;
    });

    tailClones.forEach((clone) => track.insertBefore(clone, track.firstChild));
    headClones.forEach((clone) => track.appendChild(clone));

    currentIndex = cloneCount;
    calculateSlideStep();
    applyPosition(false);
  }

  function moveTo(nextIndex) {
    currentIndex = nextIndex;
    applyPosition(true);
  }

  function startAutoRotate() {
    stopAutoRotate();
    autoRotateTimer = setInterval(() => {
      moveTo(currentIndex + 1);
    }, 3000);
  }

  function stopAutoRotate() {
    if (!autoRotateTimer) return;
    clearInterval(autoRotateTimer);
    autoRotateTimer = null;
  }

  track.addEventListener("transitionend", () => {
    const cloneCount = Math.min(slidesPerView, originalSlides.length);
    const maxOriginalIndex = cloneCount + originalSlides.length - 1;

    if (currentIndex > maxOriginalIndex) {
      currentIndex = cloneCount;
      applyPosition(false);
    }

    if (currentIndex < cloneCount) {
      currentIndex = maxOriginalIndex;
      applyPosition(false);
    }
  });

  prevBtn.addEventListener("click", () => {
    moveTo(currentIndex - 1);
    startAutoRotate();
  });

  nextBtn.addEventListener("click", () => {
    moveTo(currentIndex + 1);
    startAutoRotate();
  });

  carousel.addEventListener("mouseenter", stopAutoRotate);
  carousel.addEventListener("mouseleave", startAutoRotate);
  carousel.addEventListener("focusin", stopAutoRotate);
  carousel.addEventListener("focusout", startAutoRotate);

  carousel.addEventListener("touchstart", (event) => {
    touchStartX = event.changedTouches[0].screenX;
  }, { passive: true });

  carousel.addEventListener("touchend", (event) => {
    const touchEndX = event.changedTouches[0].screenX;
    const delta = touchEndX - touchStartX;

    if (Math.abs(delta) < 30) return;

    if (delta < 0) moveTo(currentIndex + 1);
    else moveTo(currentIndex - 1);

    startAutoRotate();
  }, { passive: true });

  window.addEventListener("resize", () => {
    const nextSlidesPerView = getSlidesPerView();
    if (nextSlidesPerView === slidesPerView) {
      calculateSlideStep();
      applyPosition(false);
      return;
    }

    buildInfiniteTrack();
  });

  buildInfiniteTrack();
  startAutoRotate();
}

