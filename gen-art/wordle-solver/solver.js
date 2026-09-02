// ============================================
// Wordle Solver
// ============================================

let wordLen = 6;
let allWords = [];
const MAX_ROWS = 8;
const STATES = ["empty", "absent", "present", "correct"];

// --- Init ---
async function init() {
  await loadWords();
  setupLengthButtons();
  buildRows();
  setupActions();
  solve(); // show all words initially
}

async function loadWords() {
  try {
    const resp = await fetch("../wordle/words.json?t=" + Date.now());
    allWords = await resp.json();
  } catch (e) {
    allWords = [];
  }
}

// --- Length selector ---
function setupLengthButtons() {
  document.querySelectorAll(".length-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".length-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      wordLen = parseInt(btn.dataset.len);
      buildRows();
      solve();
    });
  });
}

// --- Build guess rows ---
function buildRows() {
  const section = document.getElementById("guessSection");
  section.innerHTML = "";

  for (let r = 0; r < MAX_ROWS; r++) {
    const row = document.createElement("div");
    row.className = "guess-row";

    const label = document.createElement("span");
    label.className = "row-label";
    label.textContent = r + 1;
    row.appendChild(label);

    for (let c = 0; c < wordLen; c++) {
      const input = document.createElement("input");
      input.type = "text";
      input.className = "tile-input";
      input.maxLength = 1;
      input.dataset.row = r;
      input.dataset.col = c;
      input.dataset.state = "empty";

      // Type letter
      input.addEventListener("input", (e) => {
        const val = e.target.value.replace(/[^a-zA-Z]/g, "");
        e.target.value = val.toUpperCase();
        if (val) {
          if (e.target.dataset.state === "empty") {
            e.target.dataset.state = "absent";
            e.target.className = "tile-input absent";
          }
          // Auto-advance to next tile
          const next = row.querySelector(`input[data-col="${c + 1}"]`);
          if (next) next.focus();
        }
      });

      // Click to cycle state
      input.addEventListener("click", (e) => {
        if (!e.target.value) return;
        cycleState(e.target);
      });

      // Backspace handling
      input.addEventListener("keydown", (e) => {
        if (e.key === "Backspace" && !e.target.value) {
          const prev = row.querySelector(`input[data-col="${c - 1}"]`);
          if (prev) {
            prev.value = "";
            prev.dataset.state = "empty";
            prev.className = "tile-input";
            prev.focus();
          }
          e.preventDefault();
        }
        if (e.key === "Enter") {
          e.preventDefault();
          solve();
        }
      });

      row.appendChild(input);
    }

    // Clear button
    const clearBtn = document.createElement("button");
    clearBtn.className = "row-clear";
    clearBtn.textContent = "x";
    clearBtn.title = "Clear row";
    clearBtn.addEventListener("click", () => {
      row.querySelectorAll(".tile-input").forEach(inp => {
        inp.value = "";
        inp.dataset.state = "empty";
        inp.className = "tile-input";
      });
    });
    row.appendChild(clearBtn);

    section.appendChild(row);
  }
}

function cycleState(tile) {
  const states = ["absent", "present", "correct"];
  const current = states.indexOf(tile.dataset.state);
  const next = (current + 1) % states.length;
  tile.dataset.state = states[next];
  tile.className = "tile-input " + states[next];
}

// --- Actions ---
function setupActions() {
  document.getElementById("solveBtn").addEventListener("click", solve);
  document.getElementById("resetBtn").addEventListener("click", () => {
    document.querySelectorAll(".tile-input").forEach(inp => {
      inp.value = "";
      inp.dataset.state = "empty";
      inp.className = "tile-input";
    });
    document.getElementById("excludeInput").value = "";
    solve();
  });
  document.getElementById("excludeInput").addEventListener("input", solve);
}

// --- Solver ---
function solve() {
  const constraints = parseConstraints();
  let candidates = allWords.filter(w => w.length === wordLen);
  candidates = candidates.filter(w => matchesConstraints(w, constraints));

  // Score and sort
  candidates = scoreCandidates(candidates);

  renderResults(candidates);
}

function parseConstraints() {
  const correct = {};    // position -> letter (green)
  const present = {};    // letter -> Set of positions where it's yellow
  const presentLetters = new Set(); // letters that must be in the word
  const absent = new Set(); // letters not in word (gray)
  const minCounts = {};  // letter -> minimum count (from green + yellow)

  const rows = document.querySelectorAll(".guess-row");

  rows.forEach(row => {
    const tiles = row.querySelectorAll(".tile-input");
    const rowLetters = [];

    tiles.forEach(tile => {
      rowLetters.push({
        letter: tile.value.toLowerCase(),
        state: tile.dataset.state,
        col: parseInt(tile.dataset.col)
      });
    });

    // Skip empty rows
    if (rowLetters.every(t => !t.letter)) return;

    // Count occurrences of each letter in this row's greens+yellows
    const letterCounts = {};

    rowLetters.forEach(({ letter, state, col }) => {
      if (!letter) return;

      if (state === "correct") {
        correct[col] = letter;
        presentLetters.add(letter);
        letterCounts[letter] = (letterCounts[letter] || 0) + 1;
      } else if (state === "present") {
        if (!present[letter]) present[letter] = new Set();
        present[letter].add(col);
        presentLetters.add(letter);
        letterCounts[letter] = (letterCounts[letter] || 0) + 1;
      } else if (state === "absent") {
        // Only absent if this letter has no green/yellow in this row
        // (handles duplicate letter logic)
        // We'll process after counting
      }
    });

    // Update min counts
    for (const [letter, count] of Object.entries(letterCounts)) {
      minCounts[letter] = Math.max(minCounts[letter] || 0, count);
    }

    // Process absent letters (gray)
    rowLetters.forEach(({ letter, state }) => {
      if (!letter || state !== "absent") return;
      // If this letter also has green/yellow in this row, it's a "max count" hint
      // Otherwise it's fully absent
      if (!letterCounts[letter]) {
        absent.add(letter);
      }
      // If it has greens/yellows, the gray means "no MORE than the green+yellow count"
      // We handle this implicitly: the letter must appear exactly minCounts times
    });
  });

  // Additional excluded letters from input
  const excludeStr = document.getElementById("excludeInput").value.toLowerCase();
  for (const ch of excludeStr) {
    if (/[a-z]/.test(ch) && !presentLetters.has(ch)) {
      absent.add(ch);
    }
  }

  return { correct, present, presentLetters, absent, minCounts };
}

function matchesConstraints(word, { correct, present, presentLetters, absent, minCounts }) {
  const letters = word.split("");

  // Check correct positions (green)
  for (const [pos, letter] of Object.entries(correct)) {
    if (letters[pos] !== letter) return false;
  }

  // Check present letters not in certain positions (yellow)
  for (const [letter, positions] of Object.entries(present)) {
    // Must contain this letter
    if (!letters.includes(letter)) return false;
    // Must NOT be in the yellow positions
    for (const pos of positions) {
      if (letters[pos] === letter) return false;
    }
  }

  // Check all present letters exist
  for (const letter of presentLetters) {
    if (!letters.includes(letter)) return false;
  }

  // Check absent letters
  for (const letter of absent) {
    if (letters.includes(letter)) return false;
  }

  // Check minimum counts
  for (const [letter, count] of Object.entries(minCounts)) {
    const actual = letters.filter(l => l === letter).length;
    if (actual < count) return false;
  }

  return true;
}

// --- Scoring ---
function scoreCandidates(candidates) {
  if (candidates.length === 0) return [];

  // Letter frequency at each position
  const posFreq = Array.from({ length: wordLen }, () => ({}));
  const totalFreq = {};

  candidates.forEach(w => {
    const seen = new Set();
    for (let i = 0; i < w.length; i++) {
      const ch = w[i];
      posFreq[i][ch] = (posFreq[i][ch] || 0) + 1;
      if (!seen.has(ch)) {
        totalFreq[ch] = (totalFreq[ch] || 0) + 1;
        seen.add(ch);
      }
    }
  });

  // Score: sum of positional frequency + unique letter bonus
  return candidates.map(w => {
    let score = 0;
    const seen = new Set();
    for (let i = 0; i < w.length; i++) {
      score += posFreq[i][w[i]] || 0;
      if (!seen.has(w[i])) {
        score += (totalFreq[w[i]] || 0) * 0.5;
        seen.add(w[i]);
      }
    }
    // Bonus for unique letters (more info per guess)
    score += seen.size * 10;
    return { word: w, score };
  }).sort((a, b) => b.score - a.score).map(x => x.word);
}

// --- Render ---
function renderResults(candidates) {
  const resultsEl = document.getElementById("results");

  if (allWords.length === 0) {
    resultsEl.innerHTML = '<div class="no-results">Loading word list...</div>';
    return;
  }

  const header = `
    <div class="results-header">
      <h2>Suggestions</h2>
      <span class="results-count">${candidates.length} words</span>
    </div>
  `;

  if (candidates.length === 0) {
    resultsEl.innerHTML = header + '<div class="no-results">No matching words found. Check your clues.</div>';
    return;
  }

  const limit = Math.min(candidates.length, 200);
  const cards = candidates.slice(0, limit).map((w, i) => {
    const cls = i < 5 ? "word-card top-pick" : "word-card";
    return `<div class="${cls}">${w}</div>`;
  }).join("");

  const extra = candidates.length > limit
    ? `<div class="no-results">Showing ${limit} of ${candidates.length} results</div>`
    : "";

  resultsEl.innerHTML = header + `<div class="results-grid">${cards}</div>` + extra;
}

init();
