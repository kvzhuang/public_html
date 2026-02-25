// FXHash features definition (optional but good practice)
window.$fxhashFeatures = {};

// Configuration
const CONFIG = {
  stationCount: 0, // Will be set randomly between 10-20
  lineCount: 0,    // Will be set randomly between 6-8
  speed: 0.02,     // Animation speed (0.0 to 1.0)
  connectionDistance: 5, // Pixel distance to snap to a station
};

let stations = [];
let lines = [];
// Metro-inspired palette (Taipei & International styles)
let palette = [
  '#C48C31', // Wenhu Brown (Taipei)
  '#E3002C', // Tamsui Red (Taipei)
  '#008659', // Xindian Green (Taipei)
  '#F8B61C', // Zhonghe Orange (Taipei)
  '#0070BD', // Bannan Blue (Taipei)
  '#FDDB00', // Circular Yellow (Taipei)
  '#8E44AD', // Standard Metro Purple
  '#FF69B4'  // Hot Pink (often used for special lines)
];

// Utility: Random range using fxrand
function fxRandom(min, max) {
  if (typeof max === 'undefined') {
    return fxrand() * min;
  }
  return fxrand() * (max - min) + min;
}

// Utility: Pick random integer using fxrand
function fxRandomInt(min, max) {
  return Math.floor(fxRandom(min, max + 1));
}

// Utility: Pick random item from array
function fxPick(arr) {
  return arr[Math.floor(fxrand() * arr.length)];
}

class Station {
  constructor(id, x, y, type) {
    this.id = id;
    this.pos = createVector(x, y);
    this.type = type; // 0: Circle, 1: Square, 2: Triangle
    this.radius = 12;
  }

  draw() {
    push();
    translate(this.pos.x, this.pos.y);
    stroke(50);
    strokeWeight(2);
    fill(255);

    if (this.type === 0) {
      ellipse(0, 0, this.radius * 2);
    } else if (this.type === 1) {
      rectMode(CENTER);
      rect(0, 0, this.radius * 1.8, this.radius * 1.8);
    } else if (this.type === 2) {
      triangle(
        0, -this.radius,
        -this.radius * 0.866, this.radius * 0.5,
        this.radius * 0.866, this.radius * 0.5
      );
    }
    pop();
  }
}

class Train {
  constructor(metroLine) {
    this.metroLine = metroLine;
    this.currentSegIndex = 0;
    this.t = 0; // 0.0 to 1.0 along the current segment
    this.speed = 1.5; // Reduced speed
    this.isReversing = false;
    this.pos = createVector(0, 0);
    this.angle = 0;

    this.waitTimer = 0; // Frames to wait at station
  }

    move() {
       // Handle waiting state
       if (this.waitTimer > 0) {
         this.waitTimer--;
         return;
       }

       let path = this.metroLine.permanentPath;
       if (path.length < 2) return;

       let pStart, pEnd;

       // Determine start and end points of the current segment based on direction
       if (!this.isReversing) {
          // Forward: Move from path[i] to path[i+1]
          // Safety check
          if (this.currentSegIndex >= path.length - 1) {
             this.isReversing = true;
             this.currentSegIndex = Math.max(0, path.length - 2);
             this.t = 0;
             return;
          }
          pStart = path[this.currentSegIndex];
          pEnd = path[this.currentSegIndex + 1];
       } else {
          // Backward: Move from path[i+1] to path[i]
          // Safety check
          if (this.currentSegIndex < 0) {
             this.isReversing = false;
             this.currentSegIndex = 0;
             this.t = 0;
             return;
          }
          pStart = path[this.currentSegIndex + 1];
          pEnd = path[this.currentSegIndex];
       }

       // Calculate movement
       let d = p5.Vector.dist(pStart, pEnd);
       let step = (d === 0) ? 1 : this.speed / d;
       this.t += step;

       // Calculate angle (always valid for the segment)
       this.angle = p5.Vector.sub(pEnd, pStart).heading();

       if (this.t >= 1.0) {
          // Arrived at destination
          this.t = 0;
          this.pos = pEnd.copy(); // Snap exactly to the target point

          // Check if we are at a station
          let isStation = false;
          for (let s of stations) {
               if (p5.Vector.dist(this.pos, s.pos) < 1) {
                   isStation = true;
                   break;
               }
          }

          // Logic for what to do next (Turn around or Next segment)
          if (!this.isReversing) {
              // Moving Forward
              if (this.currentSegIndex >= path.length - 2) {
                  // Reached the end of the line
                  this.waitTimer = 60;
                  this.isReversing = true;
                  // Do not change index; we will traverse the same segment backwards next
              } else {
                  // Continue to next segment
                  if (isStation) this.waitTimer = 40;
                  this.currentSegIndex++;
              }
          } else {
              // Moving Backward
              if (this.currentSegIndex <= 0) {
                  // Reached the start of the line
                  this.waitTimer = 60;
                  this.isReversing = false;
                  // Do not change index; we will traverse segment 0 forwards next
              } else {
                  // Continue to previous segment
                  if (isStation) this.waitTimer = 40;
                  this.currentSegIndex--;
              }
          }
       } else {
          // Interpolate Position
          this.pos = p5.Vector.lerp(pStart, pEnd, this.t);
       }
    }
  draw() {
    if (this.metroLine.permanentPath.length < 2) return;

    push();
    translate(this.pos.x, this.pos.y);
    rotate(this.angle);

    noStroke();
    rectMode(CENTER);

    // Pixel art style drawing
    // Main body (White/Silver)
    fill(240);
    rect(0, 0, 24, 12);

    // Color Stripe (Line Color)
    fill(this.metroLine.color);
    rect(0, 0, 16, 6);

    // Front Cab (Dark)
    fill(50);
    // Draw "windows" on the front depending on direction?
    // Since we rotate the whole thing, "front" is always positive X
    rect(8, 0, 4, 8);

    // Rear Cab window
    rect(-8, 0, 4, 8);

    pop();
  }
}

class MetroLine {
  constructor(id, color, startStation) {
    this.id = id;
    this.color = color;
    this.stations = [startStation]; // List of connected stations

    // permanentPath stores the vertices that are fully "built"
    this.permanentPath = [startStation.pos.copy()];

    // currentPathQueue stores the waypoints to get to the next station
    this.currentPathQueue = [];

    this.head = startStation.pos.copy(); // Current animating head position
    this.targetStation = null;
    this.isFinished = false;

    // Calculate a unique visual offset to prevent overlapping lines
    // We distribute lines in a small circle around the true coordinates
    let offsetAngle = (this.id / CONFIG.lineCount) * TWO_PI;
    let offsetMag = 4; // Magnitude of offset (pixels)
    this.visualOffset = createVector(cos(offsetAngle) * offsetMag, sin(offsetAngle) * offsetMag);

    this.train = new Train(this); // <--- Initialize Train

    this.findNewTarget();
  }

  findNewTarget() {
    let currentStation = this.stations[this.stations.length - 1];
    // Start searching from the station position, not the arbitrary head position
    // (though they should be the same when finding a new target)
    let currentPos = currentStation.pos;

    let bestDist = Infinity;
    let candidate = null;

    // Find nearest station not already in THIS line
    for (let s of stations) {
      if (this.stations.includes(s)) continue;

      let d = p5.Vector.dist(currentPos, s.pos);
      // Weight distance with randomness
      let weightedDist = d * (1 + fxrand() * 0.8);

      if (weightedDist < bestDist) {
        bestDist = weightedDist;
        candidate = s;
      }
    }

    if (candidate) {
      this.targetStation = candidate;
      this.calculateRoute(currentPos, candidate.pos);
    } else {
      this.isFinished = true;
    }
  }

  // Calculate an octilinear path (horizontal, vertical, diagonal)
  calculateRoute(start, end) {
    this.currentPathQueue = [];

    let dx = end.x - start.x;
    let dy = end.y - start.y;
    let adx = Math.abs(dx);
    let ady = Math.abs(dy);
    let signX = Math.sign(dx);
    let signY = Math.sign(dy);

    // Strategy: Go diagonal as much as possible, then straight
    // OR: Go straight then diagonal.
    // We can randomize this choice or stick to one.
    // "Diagonal first" usually looks cleaner for metro maps.

    let minDiff = Math.min(adx, ady);

    // 1. Diagonal Segment
    // We move by 'minDiff' in both X and Y directions
    let p1 = createVector(start.x + signX * minDiff, start.y + signY * minDiff);

    // Only add p1 if it's not effectively the start or end point
    if (p5.Vector.dist(start, p1) > 1 && p5.Vector.dist(p1, end) > 1) {
       this.currentPathQueue.push(p1);
    }

    // 2. The Final Point (The Station)
    this.currentPathQueue.push(end.copy());
  }

  update() {
    this.train.move(); // <--- Update Train

    if (this.isFinished || this.currentPathQueue.length === 0) return;

    let targetWaypoint = this.currentPathQueue[0];

    // Move head towards target waypoint
    let dir = p5.Vector.sub(targetWaypoint, this.head);
    let dist = dir.mag();
    let step = 2; // Speed

    if (dist <= step) {
      // Reached waypoint
      this.head = targetWaypoint.copy();
      this.permanentPath.push(this.head.copy());

      // Remove reached waypoint
      this.currentPathQueue.shift();

      // If queue is empty, we reached the station
      if (this.currentPathQueue.length === 0) {
        this.stations.push(this.targetStation);
        this.findNewTarget();
      }
    } else {
      // Keep moving
      dir.normalize();
      dir.mult(step);
      this.head.add(dir);
    }
  }

  draw() {
    push(); // Start isolation for this line's offset
    translate(this.visualOffset.x, this.visualOffset.y); // Apply the "lane" offset

    noFill();
    stroke(this.color);
    strokeWeight(6);
    // ROUND cap and join are crucial for the "curved" look on 45-degree turns
    strokeCap(ROUND);
    strokeJoin(ROUND);

    beginShape();
    // Draw established path
    for (let v of this.permanentPath) {
      vertex(v.x, v.y);
    }
    // Draw line to current animating head
    vertex(this.head.x, this.head.y);
    endShape();

    this.train.draw(); // <--- Draw Train (will inherit the translate)

    pop(); // End isolation
  }
}

function setup() {
  // Determine canvas size based on window but keep it square-ish or ratio bounded
  let dim = Math.min(windowWidth, windowHeight) * 0.9;
  createCanvas(dim, dim);

  // Set fxhash features
  CONFIG.stationCount = fxRandomInt(10, 20);
  CONFIG.lineCount = fxRandomInt(6, 8);

  window.$fxhashFeatures = {
    "Stations": CONFIG.stationCount,
    "Lines": CONFIG.lineCount
  };

  console.log("fxhash:", fxhash);
  console.log("Features:", window.$fxhashFeatures);

  initializeMetro();
}

function initializeMetro() {
  stations = [];
  lines = [];

  // 1. Create Stations
  // Use simple rejection sampling to ensure they aren't too close
  let attempts = 0;
  while (stations.length < CONFIG.stationCount && attempts < 1000) {
    let margin = width * 0.1;
    let x = fxRandom(margin, width - margin);
    let y = fxRandom(margin, height - margin);
    let pos = createVector(x, y);

    let tooClose = false;
    for (let s of stations) {
      if (p5.Vector.dist(s.pos, pos) < width * 0.15) {
        tooClose = true;
        break;
      }
    }

    if (!tooClose) {
      let type = fxRandomInt(0, 2); // 0, 1, or 2
      stations.push(new Station(stations.length, x, y, type));
    }
    attempts++;
  }

  // 2. Create Lines
  // Shuffle palette
  let shuffledPalette = [...palette];
  // Fisher-Yates shuffle using fxrand
  for (let i = shuffledPalette.length - 1; i > 0; i--) {
    let j = Math.floor(fxrand() * (i + 1));
    [shuffledPalette[i], shuffledPalette[j]] = [shuffledPalette[j], shuffledPalette[i]];
  }

  for (let i = 0; i < CONFIG.lineCount; i++) {
    // Pick a random starting station
    let startStation = stations[Math.floor(fxrand() * stations.length)];
    let col = shuffledPalette[i % shuffledPalette.length];
    lines.push(new MetroLine(i, col, startStation));
  }
}

let previewTriggered = false;

function draw() {
  background('#fbf9f5');

  // Logic
  for (let line of lines) {
    line.update();
  }

  // Draw Lines first (so they are under stations)
  for (let line of lines) {
    line.draw();
  }

  // Draw Stations
  for (let s of stations) {
    s.draw();
  }

  // Check if all lines are finished to trigger fxpreview
  let allFinished = lines.every(l => l.isFinished);
  if (allFinished && !previewTriggered) {
    // Give it a small delay or check to ensure visual consistency
    if (frameCount % 60 === 0) {
      fxpreview();
      previewTriggered = true;
      console.log("Map complete, trains continuing...");
    }
  }
}

function windowResized() {
  let dim = Math.min(windowWidth, windowHeight) * 0.9;
  resizeCanvas(dim, dim);
  // Re-initializing positions on resize is tricky without storing normalized coords.
  // For this prototype, we'll just let it be or reload.
  // Ideally, store positions as 0.0-1.0 and scale on draw.
  initializeMetro();
}

