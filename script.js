fetch("data.json")
  .then(res => res.json())
  .then(data => {

    const container = document.getElementById("list");

    data.forEach(player => {
      player.total = player.matches.reduce((sum, m) => sum + m.points, 0);
    });

    data.sort((a, b) => b.total - a.total);

    data.forEach((p, i) => p.rank = i + 1);

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
