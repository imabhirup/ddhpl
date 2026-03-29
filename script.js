fetch("./data.json")
  .then(res => res.json())
  .then(data => {

    const container = document.getElementById("list");
    container.innerHTML = "";

    // Calculate total
    data.forEach(player => {
      player.total = player.matches.reduce((sum, m) => sum + m.points, 0);
    });

    // Sort
    data.sort((a, b) => b.total - a.total);

    // Rank
    data.forEach((p, i) => p.rank = i + 1);

    // Render
    data.forEach(player => {

      const div = document.createElement("div");
      div.className = "card";

      if (player.rank <= 3) {
        div.classList.add(`rank-${player.rank}`);
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

      // ✅ SAFE CLICK HANDLER
      div.onclick = function () {
        openModal(player);
      };

      container.appendChild(div);
    });
  })
  .catch(err => console.error("Error loading JSON:", err));


/* MODAL */

function openModal(player) {
  const modal = document.getElementById("modal");
  const content = document.getElementById("modal-content");

  if (!modal || !content) {
    console.error("Modal not found");
    return;
  }

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
  const modal = document.getElementById("modal");
  modal.style.display = "none";
}
