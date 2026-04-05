const fs = require("fs");

const dataPath = "./data.json";
const currentPath = "./current.json";

const data = JSON.parse(fs.readFileSync(dataPath, "utf-8"));
let current = [];

try {
  current = JSON.parse(fs.readFileSync(currentPath, "utf-8"));
} catch (e) {
  console.log("⚠️ current.json missing or invalid. Skipping update.");
  process.exit(0);
}

// ✅ HANDLE BLANK current.json
if (!Array.isArray(current) || current.length === 0) {
  console.log("ℹ️ current.json is empty. No updates applied.");
  process.exit(0);
}

// Extract match info safely
const newMatchName = current[0]?.matches?.[0]?.match;
const newAmpFactor = current[0]?.matches?.[0]?.ampfactor;

// If match name missing → skip
if (!newMatchName) {
  console.log("⚠️ No match found in current.json. Skipping.");
  process.exit(0);
}

// Convert existing players to map
const dataMap = new Map();
data.forEach(player => {
  dataMap.set(player.name, player);
});

// Step 1: Add/update players from current.json
current.forEach(currPlayer => {
  if (!dataMap.has(currPlayer.name)) {
    dataMap.set(currPlayer.name, {
      name: currPlayer.name,
      matches: []
    });
  }

  const player = dataMap.get(currPlayer.name);

  // 🚫 Prevent duplicate match append
  if (player.matches.some(m => m.match === newMatchName)) return;

  const matchData = currPlayer.matches?.[0];

  player.matches.push({
    match: newMatchName,
    points: matchData?.points ?? 0,
    ...(newAmpFactor ? { ampfactor: newAmpFactor } : {})
  });
});

// Step 2: Handle missing players → assign 0
dataMap.forEach(player => {
  const alreadyPlayed = player.matches.some(m => m.match === newMatchName);

  if (!alreadyPlayed) {
    player.matches.push({
      match: newMatchName,
      points: 0,
      ...(newAmpFactor ? { ampfactor: newAmpFactor } : {})
    });
  }
});

// Step 3: Save updated data
const updatedData = Array.from(dataMap.values());

fs.writeFileSync(dataPath, JSON.stringify(updatedData, null, 2));

console.log("✅ data.json updated successfully");