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

// ===============================
// STEP 1: Build GLOBAL MATCH ORDER
// ===============================
const matchOrder = [];
const matchAmpMap = new Map();

data.forEach(player => {
  player.matches.forEach(m => {
    if (!matchOrder.includes(m.match)) {
      matchOrder.push(m.match);
    }
    if (!matchAmpMap.has(m.match)) {
      matchAmpMap.set(m.match, m.ampfactor || null);
    }
  });
});

// Convert players to map
const dataMap = new Map();
data.forEach(player => dataMap.set(player.name, player));

// ===============================
// CASE A: current.json HAS DATA
// ===============================
if (Array.isArray(current) && current.length > 0) {
  const newMatchName = current[0]?.matches?.[0]?.match;
  const newAmpFactor = current[0]?.matches?.[0]?.ampfactor;

  if (!newMatchName) {
    console.log("⚠️ Invalid current.json");
    process.exit(0);
  }

  // Prevent duplicate
  if (matchOrder.includes(newMatchName)) {
    console.log("ℹ️ Match already exists");
    process.exit(0);
  }

  // Add new match at END of sequence
  matchOrder.push(newMatchName);
  matchAmpMap.set(newMatchName, newAmpFactor || null);

  // Add/update players
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
}

// ===============================
// FINAL STEP: REBUILD ALL PLAYERS
// ===============================
dataMap.forEach(player => {
  const playerMatchMap = new Map();
  player.matches.forEach(m => {
    playerMatchMap.set(m.match, m);
  });

  const rebuiltMatches = [];

  matchOrder.forEach(matchName => {
    if (playerMatchMap.has(matchName)) {
      rebuiltMatches.push(playerMatchMap.get(matchName));
    } else {
      rebuiltMatches.push({
        match: matchName,
        points: 0,
        ...(matchAmpMap.get(matchName)
          ? { ampfactor: matchAmpMap.get(matchName) }
          : {})
      });
    }
  });

  player.matches = rebuiltMatches;
});

// Save
const updatedData = Array.from(dataMap.values());
fs.writeFileSync(dataPath, JSON.stringify(updatedData, null, 2));

console.log("✅ Sequence preserved & data normalized");