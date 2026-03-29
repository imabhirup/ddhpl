const container = document.getElementById("list");

data.forEach(player => {

  // ✅ Clean name properly
  const cleanName = player.name.replace(/ - .*/, "");

  const div = document.createElement("div");
  div.classList.add("card");

  if (player.rank <= 3) div.classList.add(`rank-${player.rank}`);
  if (cleanName.toLowerCase().includes("abhirup")) div.classList.add("me");

  div.innerHTML = `
    <div class="left">
      <div class="avatar"></div>
      <div>
        <div class="rank">Rank #${player.rank}</div>
        <div class="name">${cleanName}</div>
      </div>
    </div>
    <div class="points">${player.points}</div>
  `;

  container.appendChild(div);
});
