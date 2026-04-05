const fs = require("fs");

const dataPath = "./data.json";
const currentPath = "./current.json";

const data = JSON.parse(fs.readFileSync(dataPath, "utf-8"));

let current = [];
try {
  current = JSON.parse(fs.readFileSync(currentPath, "utf-8"));
} catch (e) {
  console.log("⚠️ current.json missing, treating as empty.");
}

// Convert players to map
const dataMap = new Map();
data.forEach(player => {
  dataMap.set(player.name, player);
});

// ✅ STEP 1: Collect ALL matches + ampfactor map
const matchMap = new Map();

data.forEach(player => {
  player.matches.forEach(m => {
    if (!matchMap.has(m.match)) {
      matchMap.set(m.match, m.ampfactor || null);
    }
  });
});

// ===============================
// ✅ CASE A: current.json HAS DATA
// ===============================
if (Array.isArray(current) && current.length > 0) {
  const newMatchName = current[0]?.matches?.[0]?.match;
  const newAmpFactor = current[0]?.matches?.[0]?.ampfactor;

  if (!newMatchName) {
    console.log("⚠️ Invalid current.json. Skipping.");
    process.exit(0);
  }

  // Prevent duplicate match
  const alreadyExists = data.some(p =>
    p.matches.some(m => m.match === newMatchName)
  );

  if (alreadyExists) {
    console.log("ℹ️ Match already exists. Skipping.");
    process.exit(0);
  }

  // Add new match to players
  current.forEach(currPlayer => {
    if (!dataMap.has(currPlayer.name)) {
      dataMap.set(currPlayer.name, {
        name: currPlayer.name,
        matches: []
      });
    }

    const player = dataMap.get(currPlayer.name);
    const matchData = currPlayer.matches?.[0];

    player.matches.push({
      match: newMatchName,
      points: matchData?.points ?? 0,
      ...(newAmpFactor ? { ampfactor: newAmpFactor } : {})
    });
  });

  // Add missing players with 0
  dataMap.forEach(player => {
    const hasMatch = player.matches.some(m => m.match === newMatchName);
    if (!hasMatch) {
      player.matches.push({
        match: newMatchName,
        points: 0,
        ...(newAmpFactor ? { ampfactor: newAmpFactor } : {})
      });
    }
  });

  console.log("✅ New match appended");
}

// =====================================
// ✅ CASE B: current.json is EMPTY
// =====================================
else {
  console.log("ℹ️ current.json empty → normalizing data.json");

  dataMap.forEach(player => {
    const playerMatches = new Set(player.matches.map(m => m.match));

    matchMap.forEach((amp, matchName) => {
      if (!playerMatches.has(matchName)) {
        player.matches.push({
          match: matchName,
          points: 0,
          ...(amp ? { ampfactor: amp } : {})
        });
      }
    });
  });

  console.log("✅ Missing matches filled with 0 points");
}

// Save updated data
const updatedData = Array.from(dataMap.values());
fs.writeFileSync(dataPath, JSON.stringify(updatedData, null, 2));

console.log("✅ data.json finalized");