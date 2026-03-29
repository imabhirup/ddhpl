fetch("data.json")
  .then(res => res.json())
  .then(data => {

    const container = document.getElementById("list");

    // 🔥 Calculate total + rank
    data.forEach(player => {
      player.total = player.matches.reduce((sum, m) => sum + m.points, 0);
    });

    // Sort by total points
    data.sort((a, b) => b.total - a.total);

    // Assign ranks
    data.forEach((p, i) => p.rank = i + 1);

    // Render UI
    data.forEach(player => {

      const div = document.createElement("div");
      div.classList.add("card");

      if (player.rank <= 3) div.classList.add(`rank-${player.rank}`);

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
  });


/* MODAL */

function openModal(player) {
  const modal = document.getElementById("modal");
  const content = document.getElementById("modal-content");

  content.innerHTML = `
    <h2>${player.name}</h2>
    <p>Total Points: ${player.total}</p>

    <div class="matches">
      ${player.matches.map(m => `
        <div class="match">
          <div>
            <strong>${m.match}</strong>
          </div>
          <div>${m.points}</div>
        </div>
      `).join("")}
    </div>
  `;

  modal.style.display = "flex";
}

function closeModal() {
  document.getElementById("modal").style.display = "none";
}
