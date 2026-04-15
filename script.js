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

function getTooltipAttr(text) {
  return text ? `title="${text}"` : "";
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
  const consistency = calculateConsistency(allPoints, avg);

  const bestMatch = matchesData.find(m => m.points === best)?.match || "-";
  const worstMatch = matchesData.find(m => m.points === worst)?.match || "-";
  const avgTooltip = "Average = Total points ÷ matches";
  const consistencyTooltip = "Consistency = 100 - (Standard Deviation / Average × 100)";

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
            <span class="insight-value">${Math.round(consistency)}%</span>
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

initHallOfFameCarousel();
