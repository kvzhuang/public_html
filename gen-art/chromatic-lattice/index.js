// 20 Creative Commons / Open Source friendly palettes
const palettes = [
  // 1. Retro
  ["#264653", "#2a9d8f", "#e9c46a", "#f4a261", "#e76f51"],
  // 2. Cold Blue
  ["#00b4d8", "#0077b6", "#03045e", "#90e0ef", "#caf0f8"],
  // 3. Pink & Purple
  ["#cdb4db", "#ffc8dd", "#ffafcc", "#bde0fe", "#a2d2ff"],
  // 4. Earth Tones
  ["#606c38", "#283618", "#fefae0", "#dda15e", "#bc6c25"],
  // 5. Neon
  ["#ff0000", "#ff8700", "#ffd300", "#deff0a", "#a1ff0a", "#0aff99", "#0aefff", "#147df5", "#580aff", "#be0aff"],
  // 6. Mono
  ["#000000", "#14213d", "#fca311", "#e5e5e5", "#ffffff"],
  // 7. Pastel
  ["#fbf8cc", "#fde4cf", "#ffcfd2", "#f1c0e8", "#cfbaf0", "#a3c4f3", "#90dbf4", "#8eecf5", "#98f5e1", "#b9fbc0"],
  // 8. Forest
  ["#2d6a4f", "#40916c", "#52b788", "#74c69d", "#95d5b2"],
  // 9. Sunset
  ["#ff595e", "#ffca3a", "#8ac926", "#1982c4", "#6a4c93"],
  // 10. Bauhaus
  ["#2b2b2b", "#de3d3d", "#ffffff", "#e8e8e8", "#2b2b2b"],
  // 11. Ocean
  ["#0077b6", "#00b4d8", "#90e0ef", "#caf0f8", "#f0f8ff"],
  // 12. Berry
  ["#6b0f1a", "#b91372", "#faedcd", "#d4a373", "#e3d5ca"],
  // 13. Candy
  ["#ffcdb2", "#ffb4a2", "#e5989b", "#b5838d", "#6d6875"],
  // 14. Industrial
  ["#353535", "#3c6e71", "#ffffff", "#d9d9d9", "#284b63"],
  // 15. Warm
  ["#e63946", "#f1faee", "#a8dadc", "#457b9d", "#1d3557"],
  // 16. Cyber
  ["#7209b7", "#3a0ca3", "#4361ee", "#4cc9f0", "#f72585"],
  // 17. Coffee
  ["#6f4e37", "#a67b5b", "#ecb176", "#fed8b1", "#ffffdd"],
  // 18. Mint
  ["#2b2d42", "#8d99ae", "#edf2f4", "#ef233c", "#d90429"],
  // 19. Gold
  ["#14213d", "#000000", "#fca311", "#e5e5e5", "#ffffff"],
  // 20. Pop
  ["#003049", "#d62828", "#f77f00", "#fcbf49", "#eae2b7"]
];

// Helper to pick random palette
const paletteIdx = Math.floor($fx.rand() * palettes.length);
const selectedPalette = palettes[paletteIdx];
const paletteName = `Palette ${paletteIdx + 1}`;

// Grid Density
const density = Math.floor($fx.rand() * 3) + 0; // 0=Low, 1=Med, 2=High
const colsBase = [10, 15, 20][density];

window.$fx.features({
  "Palette": paletteName,
  "Grid Density": ["Low", "Medium", "High"][density],
  "Variation": $fx.rand() > 0.5 ? "Clean" : "Distorted"
});

let gridPoints = [];
let gridLines = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(RGB);

  // Create grid points
  // Triangular grid: offset every other row
  const cols = colsBase;
  // Calculate approximate rows based on aspect ratio to fill screen
  // Hexagon/Triangle height ratio is roughly sqrt(3)/2 (~0.866)
  const hexHeight = (width / cols) * 0.866;
  const rows = Math.ceil(height / hexHeight) + 2;

  const cellW = width / cols;
  const cellH = hexHeight;

  gridPoints = [];
  gridLines = [];

  // 1. Generate Points
  for (let y = -1; y < rows; y++) {
    for (let x = -1; x < cols + 1; x++) {
      let xPos = x * cellW;
      let yPos = y * cellH;

      // Offset odd rows
      if (y % 2 !== 0) {
        xPos += cellW / 2;
      }

      // Store point with some properties
      gridPoints.push({
        x: xPos,
        y: yPos,
        origX: xPos,
        origY: yPos,
        r: cellW * 0.1, // radius base
        color: selectedPalette[Math.floor($fx.rand() * selectedPalette.length)],
        type: $fx.rand(), // for variation
        sizeMult: $fx.rand() * 0.35 + 0.1, // reduced max size to 0.45 to allow larger movement
        distortion: {
          x: ($fx.rand() - 0.5) * cellW * 0.2,
          y: ($fx.rand() - 0.5) * cellH * 0.2
        },
        visible: $fx.rand() <= 0.95, // Determine visibility once

        // Animation Properties
        animMode: $fx.rand() > 0.5 ? 'pulse' : 'move',
        animPhase: $fx.rand() * TWO_PI,
        animSpeed: 0.02 + $fx.rand() * 0.03,
        neighbors: [],
        targetNeighbor: null
      });
    }
  }

  // 2. Compute Neighbors and Lines (Static Topology)
  for (let i = 0; i < gridPoints.length; i++) {
    for (let j = i + 1; j < gridPoints.length; j++) {
      const p1 = gridPoints[i];
      const p2 = gridPoints[j];
      const d = dist(p1.origX, p1.origY, p2.origX, p2.origY);

      // Connect if close enough (neighbor in tri grid)
      if (d < cellW * 1.1) {
        gridLines.push([p1, p2]);
        p1.neighbors.push(p2);
        p2.neighbors.push(p1);
      }
    }
  }

  // 3. Assign targets for movers
  for (let p of gridPoints) {
    if (p.animMode === 'move' && p.neighbors.length > 0) {
      p.targetNeighbor = p.neighbors[Math.floor($fx.rand() * p.neighbors.length)];
    } else {
      p.animMode = 'pulse'; // Fallback
    }
  }
}

function draw() {
  background(255);

  const cellW = width / colsBase;

  // 1. Draw Grid Lines (Static or Dynamic?)
  // Let's draw lines between the ORIGINAL positions to form the "track"
  // This keeps the structure visible while balls move on it.
  stroke(200);
  strokeWeight(1);
  for (let [p1, p2] of gridLines) {
    line(p1.origX, p1.origY, p2.origX, p2.origY);
  }

  // 2. Draw Circles at Vertices (Grid Nodes)
  noStroke();
  fill(50);
  for (let p of gridPoints) {
    circle(p.origX, p.origY, 4);
  }

  // 3. Draw Animated Shapes
  for (let p of gridPoints) {
    if (!p.visible) continue;

    fill(p.color);

    // Calculate Animated State
    let currentX = p.origX;
    let currentY = p.origY;
    let currentSize = cellW * p.sizeMult;

    // Apply Animation
    if (p.animMode === 'pulse') {
        // Pulsing: Sine wave on size
        // Range: 0.8x to 1.1x of original size, carefully to avoid overlap
        // If sizeMult is small, we can pulse more. If large, less.
        let pulseFactor = 0.1 * Math.sin(frameCount * p.animSpeed + p.animPhase);
        currentSize = currentSize * (1 + pulseFactor);

    } else if (p.animMode === 'move') {
        // Multi-directional movement along lines
        if (p.neighbors.length > 0) {
            // Cycle through neighbors based on time
            // We switch targets when the sine wave crosses zero (at the center)
            // t controls the oscillation 0 -> 1 -> 0
            let t = frameCount * p.animSpeed + p.animPhase;

            // Determine which neighbor to target based on the "cycle" of the wave
            let activeNeighborIdx = Math.floor(t / PI) % p.neighbors.length;
            let targetNeighbor = p.neighbors[activeNeighborIdx];

            // Move factor: Goes from 0 to 0.25 and back to 0
            // We use abs(sin(t)) so it always moves "out" towards the current target
            let moveFactor = 0.25 * Math.abs(Math.sin(t));

            // Interpolate
            currentX = lerp(p.origX, targetNeighbor.origX, moveFactor);
            currentY = lerp(p.origY, targetNeighbor.origY, moveFactor);
        }
    }

    // Drawing Logic (mostly preserved)
    let type = p.type;

    push();
    translate(currentX, currentY);

    if ($fx.getFeature("Variation") === "Distorted") {
        // We use a pseudo-random rotation based on fixed seed + time?
        // Or just fixed? Original was fixed rand: rotate($fx.rand() * TWO_PI);
        // But we are in draw loop now. We need consistent rotation.
        // Let's use the point's distortion property or index to seed it,
        // or just calculate it once in setup.
        // To keep it simple and stable, I'll remove rotation or make it static based on type
        rotate(p.type * TWO_PI);
    }

    if (type < 0.6) {
      // Standard Circle
      circle(0, 0, currentSize);

      // Inner circle (consistent choice needed)
      // We need to store if it has inner circle.
      // Let's deduce from 'type' to be deterministic without storing extra
      if ((p.type * 100) % 1 > 0.5) {
         // Derive color from palette using type
         let cIdx = Math.floor((p.type * 1000) % selectedPalette.length);
         fill(selectedPalette[cIdx]);
         circle(0, 0, currentSize * 0.4);
      }
    } else if (type < 0.8) {
      // Concentric / Target
      circle(0, 0, currentSize);
      fill(255, 100);
      circle(0, 0, currentSize * 0.6);
      fill(p.color);
      circle(0, 0, currentSize * 0.3);
    } else {
      // "Blob"
      if ($fx.getFeature("Variation") === "Distorted") {
         scale(1, 0.6);
      }
      circle(0, 0, currentSize);
    }

    // Pupil
    fill(20);
    // Use stored distortion for offset to keep it stable but static relative to sphere
    // Or animate pupil too? Let's keep pupil static relative to sphere center
    let offX = p.distortion.x; // Use pre-calculated distortion
    let offY = p.distortion.y;
    // Clamp offset to be inside
    let limit = currentSize * 0.2;
    // We need to re-scale the stored distortion (which was based on cellW) to currentSize
    // Simplified:
    circle(offX * (currentSize/cellW), offY * (currentSize/cellW), currentSize * 0.15);

    pop();
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  // Re-run setup
  // Since we use $fx.rand(), we need to reset the PRNG state if we want exact same output,
  // but fxhash snippet handles the PRNG. $fx.rand.reset() resets it to initial seed.
  $fx.rand.reset();
  setup();
}
