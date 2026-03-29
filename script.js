let previousData = [];

function loadData() {
  fetch("./data.json")
    .then(res => res.json())
    .then(data => {

      // calculate total
      data.forEach(player => {
        player.total = player.matches.reduce((sum, m) => sum + m.points, 0);
      });

      // sort
      data.sort((a, b) => b.total - a.total);

      // rank
      data.forEach((p, i) => p.rank = i + 1);

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

    // 🔥 detect change
    const old = previousData.find(p => p.name === player.name);
    if (old && old.total !== player.total) {
      div.classList.add("updated");
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

/* Refresh button */
function refreshData() {
  loadData();
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

/* outside click */
window.onclick = function(e) {
  const modal = document.getElementById("modal");
  if (e.target === modal) modal.style.display = "none";
};

/* initial load */
loadData();
