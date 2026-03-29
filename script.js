const data = [
  { rank: 1, name: "powerhitter11 - T1", points: 989.5 },
  { rank: 2, name: "Pan_0_Tea - T3", points: 985 },
  { rank: 3, name: "srijonichallengers - T3", points: 944.5 },
  { rank: 4, name: "drawahdiarse - T1", points: 917.5 },
  { rank: 5, name: "heartsc3pr3j - T1", points: 907 },
  { rank: 6, name: "Roktobeej - T2", points: 905.5 },
  { rank: 7, name: "PaglaChidiXI - T1", points: 873.5 },
  { rank: 8, name: "astroxixuihi - T1", points: 859 },
  { rank: 9, name: "AhanaWarriors - T2", points: 844.5 },
  { rank: 10, name: "Deadphool - T2", points: 828 },
  { rank: 11, name: "codehpzjpijw - T1", points: 814.5 },
  { rank: 12, name: "TeamTannyi - T1", points: 811.5 },
  { rank: 13, name: "oasisdobbsec - T1", points: 783.5 },
  { rank: 14, name: "hammers19 - T1", points: 762 },
  { rank: 15, name: "AllTimeWinner - T1", points: 739 },
  { rank: 16, name: "fancykxvwfxk - T1", points: 701 },
  { rank: 17, name: "3abhirup - T3", points: 697.5 },
  { rank: 18, name: "Petano_Party - T2", points: 648.5 }
];

const container = document.getElementById("list");

data.forEach(player => {

  // remove "- T1"
  const cleanName = player.name.replace(/ - .*/, "");

  const div = document.createElement("div");
  div.classList.add("card");

  if (player.rank <= 3) div.classList.add(`rank-${player.rank}`);
  if (cleanName.toLowerCase().includes("abhirup")) div.classList.add("me");

  div.innerHTML = `
    <div class="left">
      <div class="avatar"></div>
      <div>
        <div class="rank">#${player.rank}</div>
        <div class="name">${cleanName}</div>
      </div>
    </div>
    <div class="points">${player.points}</div>
  `;

  container.appendChild(div);
});
