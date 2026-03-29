let previousData = [];

function loadData() {
  fetch("./data.json?ts=" + new Date().getTime())
    .then(res => res.json())
    .then(data => {

      const container = document.getElementById("list");

      // total
      data.forEach(player => {
        player.total = player.matches.reduce((sum, m) => sum + m.points, 0);
      });

      // sort
      data.sort((a, b) => b.total - a.total);

      // rank
      data.forEach((p, i) => p.rank = i + 1);

      renderLeaderboard(data);

      previousData = JSON.parse(JSON.stringify(data));
    })
    .catch(err => console.error(err));
}

function renderLeaderboard(data) {
  const container = document.getElementById("list");
  container.innerHTML = "";

  data.forEach(player => {

    const div = document.createElement("div");
    div.className = "card";

    if (player.rank <= 3) div.classList.add(`rank-${player.rank}`);

    const old = previousData.find(p => p.name === player.name);

    // Score update animation
    if (old && old.total !== player.total) {
      div.classList.add("updated");
    }

    // Rank movement animation
    if (old) {
      if (player.rank < old.rank) {
        div.classList.add("rank-up");
      } else if (player.rank > old.rank) {
        div.classList.add("rank-down");
      }
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

    div.addEventListener("click", () => openModal(player));

    container.appendChild(div);
  });
}

/* Refresh */
function refreshData() {
  const btn = document.querySelector(".refresh-btn");
  btn.innerText = "⏳ Loading...";

  loadData();

  setTimeout(() => {
    btn.innerText = "🔄 Refresh";
  }, 800);
}

/* Modal */
function openModal(player) {
  const modal = document.getElementById("modal");
  const content = document.getElementById("modal-content");

  content.innerHTML = `
    <h2>${player.name}</h2>
    <p>Total Points: ${player.total}</p>
    ${player.matches.map(m => `
      <div class="match">
        <span>${m.match}</span>
        <span>${m.points}</span>
      </div>
    `).join("")}
  `;

  modal.style.display = "flex";
}

function closeModal() {
  document.getElementById("modal").style.display = "none";
}

/* Close on outside click */
window.onclick = function(e) {
  const modal = document.getElementById("modal");
  if (e.target === modal) {
    modal.style.display = "none";
  }
};

/* Initial load */
loadData();
