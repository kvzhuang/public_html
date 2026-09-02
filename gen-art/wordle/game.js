// ============================================
// Wordle - Daily Word Game
// Loads daily word from daily.json (base64)
// ============================================

const MAX_GUESSES = 8;
let answer = "";
let wordLen = 5;
let currentRow = 0;
let currentCol = 0;
let currentGuess = "";
let gameOver = false;
let boardEl, messageEl, keyboardEl, infoEl;
let guessResults = []; // store each row's result for share

// Valid 5-7 letter words for input validation
let validWords = null;

async function init() {
  boardEl = document.getElementById("board");
  messageEl = document.getElementById("message");
  keyboardEl = document.getElementById("keyboard");
  infoEl = document.getElementById("info");

  try {
    const resp = await fetch("daily.json?t=" + Date.now());
    const data = await resp.json();
    answer = atob(data.word).toLowerCase();
    wordLen = answer.length;
    if (data.date) {
      infoEl.textContent = data.date + " | " + wordLen + " letters";
    }
  } catch (e) {
    answer = "wordle";
    wordLen = 6;
    infoEl.textContent = wordLen + " letters";
  }

  // Load valid words list
  try {
    const resp = await fetch("words.json?t=" + Date.now());
    validWords = await resp.json();
  } catch (e) {
    validWords = null;
  }

  createBoard();
  createKeyboard();
  setupListeners();
}

function createBoard() {
  boardEl.innerHTML = "";
  for (let r = 0; r < MAX_GUESSES; r++) {
    const row = document.createElement("div");
    row.className = "row";
    row.id = "row-" + r;
    for (let c = 0; c < wordLen; c++) {
      const tile = document.createElement("div");
      tile.className = "tile";
      tile.id = `tile-${r}-${c}`;
      row.appendChild(tile);
    }
    boardEl.appendChild(row);
  }
}

function createKeyboard() {
  const rows = [
    ["q","w","e","r","t","y","u","i","o","p"],
    ["a","s","d","f","g","h","j","k","l"],
    ["Enter","z","x","c","v","b","n","m","Backspace"]
  ];

  keyboardEl.innerHTML = "";
  for (const row of rows) {
    const rowEl = document.createElement("div");
    rowEl.className = "kb-row";
    for (const key of row) {
      const btn = document.createElement("button");
      btn.className = "key";
      btn.dataset.key = key;
      if (key === "Enter" || key === "Backspace") {
        btn.classList.add("wide");
        btn.textContent = key === "Backspace" ? "DEL" : "ENTER";
      } else {
        btn.textContent = key;
      }
      btn.addEventListener("click", () => handleKey(key));
      rowEl.appendChild(btn);
    }
    keyboardEl.appendChild(rowEl);
  }
}

function setupListeners() {
  document.addEventListener("keydown", (e) => {
    if (gameOver) return;
    if (e.key === "Enter") handleKey("Enter");
    else if (e.key === "Backspace") handleKey("Backspace");
    else if (/^[a-zA-Z]$/.test(e.key)) handleKey(e.key.toLowerCase());
  });
}

function handleKey(key) {
  if (gameOver) return;

  if (key === "Backspace") {
    if (currentCol > 0) {
      currentCol--;
      currentGuess = currentGuess.slice(0, -1);
      const tile = document.getElementById(`tile-${currentRow}-${currentCol}`);
      tile.textContent = "";
      tile.classList.remove("filled");
    }
    return;
  }

  if (key === "Enter") {
    if (currentCol < wordLen) {
      showMessage("Not enough letters");
      shakeRow(currentRow);
      return;
    }

    // Validate word if word list available
    if (validWords && !validWords.includes(currentGuess) && currentGuess !== answer) {
      showMessage("Not in word list");
      shakeRow(currentRow);
      return;
    }

    revealRow(currentRow, currentGuess);
    return;
  }

  // Letter input
  if (currentCol < wordLen && /^[a-z]$/.test(key)) {
    const tile = document.getElementById(`tile-${currentRow}-${currentCol}`);
    tile.textContent = key;
    tile.classList.add("filled");
    currentGuess += key;
    currentCol++;
  }
}

function revealRow(row, guess) {
  const tiles = [];
  const result = evaluateGuess(guess, answer);

  // Block input during animation
  gameOver = true;

  for (let i = 0; i < wordLen; i++) {
    const tile = document.getElementById(`tile-${row}-${i}`);
    tiles.push(tile);

    setTimeout(() => {
      tile.classList.add("reveal");
      setTimeout(() => {
        tile.classList.add(result[i]);
        updateKeyColor(guess[i], result[i]);
      }, 250);
    }, i * 300);
  }

  // Store result for sharing
  guessResults.push(result);

  // Wait for all animations to fully complete
  const animDone = (wordLen - 1) * 300 + 600;

  setTimeout(() => {
    if (guess === answer) {
      const msgs = ["Genius!", "Magnificent!", "Impressive!", "Splendid!", "Great!", "Nice!", "Close one!", "Phew!"];
      showMessage(msgs[row] || "You got it!", 0);
      setTimeout(function() {
        showSharePanel(true, row + 1);
      }, 800);
    } else if (row === MAX_GUESSES - 1) {
      showMessage(answer.toUpperCase(), 0);
      setTimeout(function() { showSharePanel(false, MAX_GUESSES); }, 800);
    } else {
      // Not game over yet, re-enable input
      gameOver = false;
    }

    currentRow++;
    currentCol = 0;
    currentGuess = "";
  }, animDone);
}

function evaluateGuess(guess, target) {
  const result = Array(wordLen).fill("absent");
  const targetArr = target.split("");
  const guessArr = guess.split("");
  const used = Array(wordLen).fill(false);

  // First pass: correct position
  for (let i = 0; i < wordLen; i++) {
    if (guessArr[i] === targetArr[i]) {
      result[i] = "correct";
      used[i] = true;
      guessArr[i] = null;
    }
  }

  // Second pass: present but wrong position
  for (let i = 0; i < wordLen; i++) {
    if (guessArr[i] === null) continue;
    for (let j = 0; j < wordLen; j++) {
      if (!used[j] && guessArr[i] === targetArr[j]) {
        result[i] = "present";
        used[j] = true;
        break;
      }
    }
  }

  return result;
}

function updateKeyColor(letter, status) {
  const key = document.querySelector(`.key[data-key="${letter}"]`);
  if (!key) return;

  const priority = { correct: 3, present: 2, absent: 1 };
  const current = key.classList.contains("correct") ? 3
    : key.classList.contains("present") ? 2
    : key.classList.contains("absent") ? 1 : 0;

  if (priority[status] > current) {
    key.classList.remove("correct", "present", "absent");
    key.classList.add(status);
  }
}

function showMessage(msg, duration = 1500) {
  messageEl.textContent = msg;
  if (duration > 0) {
    setTimeout(() => { messageEl.textContent = ""; }, duration);
  }
}

// ===== Share =====
function generateShareText(won, attempts) {
  const dateStr = document.getElementById("info").textContent.split("|")[0].trim();
  const header = `Wordle ${dateStr} ${won ? attempts : "X"}/${MAX_GUESSES}`;

  const grid = guessResults.map(row => {
    return row.map(state => {
      if (state === "correct") return "\u{1F7E9}";
      if (state === "present") return "\u{1F7E8}";
      return "\u{2B1B}";
    }).join("");
  }).join("\n");

  return header + "\n\n" + grid;
}

function showSharePanel(won, attempts) {
  const shareText = generateShareText(won, attempts);
  const overlay = document.getElementById("share-overlay");

  if (!overlay) {
    alert(shareText);
    return;
  }

  const preview = document.getElementById("share-preview");
  const title = document.getElementById("share-title");

  title.textContent = won ? "You won! Share your result" : "Better luck next time!";
  preview.textContent = shareText;
  overlay.classList.add("show");

  // Close on overlay click (outside panel)
  overlay.onclick = (e) => {
    if (e.target === overlay) overlay.classList.remove("show");
  };

  const pageUrl = window.location.href.split("?")[0];
  const encodedText = encodeURIComponent(shareText + "\n\n" + pageUrl);

  // Copy
  document.getElementById("btnCopy").onclick = () => {
    navigator.clipboard.writeText(shareText + "\n\n" + pageUrl).then(() => {
      const toast = document.getElementById("copy-toast");
      toast.style.display = "block";
      setTimeout(() => { toast.style.display = "none"; }, 1500);
    });
  };

  // Facebook
  document.getElementById("btnFB").onclick = () => {
    window.open("https://www.facebook.com/sharer/sharer.php?quote=" + encodedText + "&u=" + encodeURIComponent(pageUrl), "_blank");
  };

  // Threads
  document.getElementById("btnThreads").onclick = () => {
    window.open("https://www.threads.net/intent/post?text=" + encodedText, "_blank");
  };

  // X (Twitter)
  document.getElementById("btnX").onclick = () => {
    window.open("https://twitter.com/intent/tweet?text=" + encodedText, "_blank");
  };
}

function shakeRow(row) {
  const rowEl = document.getElementById("row-" + row);
  rowEl.classList.add("shake");
  setTimeout(() => rowEl.classList.remove("shake"), 500);
}

init();
