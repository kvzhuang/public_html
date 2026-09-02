    const canvas = document.getElementById("art");
    const ctx = canvas.getContext("2d");
    const meta = document.getElementById("meta");
    const toggleButton = document.getElementById("toggle");
    const resetButton = document.getElementById("reset");
    const saveButton = document.getElementById("save");
    const redEnergy = document.getElementById("redEnergy");
    const cyanEnergy = document.getElementById("cyanEnergy");
    const redBar = document.getElementById("redBar");
    const cyanBar = document.getElementById("cyanBar");

    let dpr = 1;
    let w = 0;
    let h = 0;
    let center = { x: 0, y: 0 };
    let arenaRadius = 0;
    let seed = "";
    let random = Math.random;
    let tops = [];
    let sparks = [];
    let paused = false;
    let frame = 0;
    let winner = "";

    function mulberry32(value) {
      return function rand() {
        value |= 0;
        value = value + 0x6D2B79F5 | 0;
        let t = Math.imul(value ^ value >>> 15, 1 | value);
        t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
      };
    }

    function hashSeed(text) {
      let hsh = 2166136261;
      for (let i = 0; i < text.length; i += 1) {
        hsh ^= text.charCodeAt(i);
        hsh = Math.imul(hsh, 16777619);
      }
      return hsh >>> 0;
    }

    function rand(min, max) {
      return min + (max - min) * random();
    }

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = Math.floor(window.innerWidth);
      h = Math.floor(window.innerHeight);
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      center = { x: w / 2, y: h / 2 };
      arenaRadius = Math.min(w, h) * 0.39;
      paintBase(true);
    }

    function makeTop(name, color, accent, side) {
      const angle = side < 0 ? Math.PI + rand(-0.36, 0.36) : rand(-0.36, 0.36);
      const distance = arenaRadius * rand(0.34, 0.58);
      const speed = rand(2.4, 3.7);
      const tangent = angle + side * Math.PI / 2 + rand(-0.3, 0.3);

      return {
        name,
        color,
        accent,
        x: center.x + Math.cos(angle) * distance,
        y: center.y + Math.sin(angle) * distance,
        vx: Math.cos(tangent) * speed,
        vy: Math.sin(tangent) * speed,
        radius: rand(19, 26),
        spin: rand(0, Math.PI * 2),
        spinSpeed: side * rand(0.36, 0.56),
        energy: 100,
        wins: 0,
        trail: [],
        phase: rand(0, Math.PI * 2)
      };
    }

    function resetBattle(nextSeed) {
      seed = nextSeed || Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, "0");
      random = mulberry32(hashSeed(seed));
      frame = 0;
      winner = "";
      sparks = [];
      paintBase(true);
      tops = [
        makeTop("Crimson", "#f04b46", "#f5c451", -1),
        makeTop("Ion", "#35d6d0", "#d6f6ff", 1)
      ];
      updateHud();
    }

    function paintBase(clear) {
      if (clear) {
        ctx.clearRect(0, 0, w, h);
      }

      const grad = ctx.createRadialGradient(center.x, center.y, arenaRadius * 0.06, center.x, center.y, arenaRadius * 1.3);
      grad.addColorStop(0, "#182026");
      grad.addColorStop(0.68, "#101317");
      grad.addColorStop(1, "#07080a");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      ctx.save();
      ctx.translate(center.x, center.y);
      ctx.strokeStyle = "rgba(255,255,255,0.10)";
      ctx.lineWidth = 1;
      for (let r = arenaRadius * 0.25; r <= arenaRadius; r += arenaRadius * 0.125) {
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.stroke();
      }

      for (let i = 0; i < 40; i += 1) {
        const a = i / 40 * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * arenaRadius * 0.2, Math.sin(a) * arenaRadius * 0.2);
        ctx.lineTo(Math.cos(a) * arenaRadius, Math.sin(a) * arenaRadius);
        ctx.strokeStyle = i % 5 === 0 ? "rgba(245,196,81,0.13)" : "rgba(255,255,255,0.045)";
        ctx.stroke();
      }

      ctx.lineWidth = 5;
      ctx.strokeStyle = "rgba(255,255,255,0.24)";
      ctx.beginPath();
      ctx.arc(0, 0, arenaRadius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.lineWidth = 1.5;
      ctx.strokeStyle = "rgba(245,196,81,0.40)";
      ctx.beginPath();
      ctx.arc(0, 0, arenaRadius * 0.985, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    function updateTop(top, other) {
      if (top.energy <= 0) return;

      const dxCenter = center.x - top.x;
      const dyCenter = center.y - top.y;
      const toCenter = Math.atan2(dyCenter, dxCenter);
      const swirl = toCenter + Math.PI / 2 * Math.sign(top.spinSpeed);
      const wobble = Math.sin(frame * 0.028 + top.phase) * 0.08;
      const pull = 0.016 + (100 - top.energy) * 0.00016;

      top.vx += Math.cos(toCenter) * pull + Math.cos(swirl + wobble) * 0.045;
      top.vy += Math.sin(toCenter) * pull + Math.sin(swirl + wobble) * 0.045;

      top.x += top.vx;
      top.y += top.vy;
      top.spin += top.spinSpeed * (0.6 + top.energy / 120);
      top.energy = Math.max(0, top.energy - 0.018 - Math.abs(top.spinSpeed) * 0.006);

      const dist = Math.hypot(top.x - center.x, top.y - center.y);
      if (dist + top.radius > arenaRadius) {
        const nx = (top.x - center.x) / dist;
        const ny = (top.y - center.y) / dist;
        const dot = top.vx * nx + top.vy * ny;
        top.vx -= 1.84 * dot * nx;
        top.vy -= 1.84 * dot * ny;
        top.vx *= 0.90;
        top.vy *= 0.90;
        top.x = center.x + nx * (arenaRadius - top.radius);
        top.y = center.y + ny * (arenaRadius - top.radius);
        top.energy = Math.max(0, top.energy - 0.9);
        addSparks(top.x, top.y, nx, ny, top.color, 7);
      }

      const dx = other.x - top.x;
      const dy = other.y - top.y;
      const collisionDistance = top.radius + other.radius;
      const d = Math.hypot(dx, dy);
      if (d > 0 && d < collisionDistance && top.energy > 0 && other.energy > 0) {
        collide(top, other, dx / d, dy / d, collisionDistance - d);
      }

      top.vx *= 0.993;
      top.vy *= 0.993;
      top.spinSpeed *= 0.9996;
      top.trail.push({ x: top.x, y: top.y, energy: top.energy });
      if (top.trail.length > 240) top.trail.shift();
    }

    function collide(a, b, nx, ny, overlap) {
      a.x -= nx * overlap * 0.5;
      a.y -= ny * overlap * 0.5;
      b.x += nx * overlap * 0.5;
      b.y += ny * overlap * 0.5;

      const tx = -ny;
      const ty = nx;
      const vaN = a.vx * nx + a.vy * ny;
      const vbN = b.vx * nx + b.vy * ny;
      const vaT = a.vx * tx + a.vy * ty;
      const vbT = b.vx * tx + b.vy * ty;
      const bite = Math.sin(a.spin - b.spin) * 1.2;

      a.vx = vbN * nx + (vaT + bite) * tx;
      a.vy = vbN * ny + (vaT + bite) * ty;
      b.vx = vaN * nx + (vbT - bite) * tx;
      b.vy = vaN * ny + (vbT - bite) * ty;

      const hit = Math.abs(vaN - vbN) + Math.abs(a.spinSpeed - b.spinSpeed) * 3;
      a.energy = Math.max(0, a.energy - hit * rand(0.18, 0.36));
      b.energy = Math.max(0, b.energy - hit * rand(0.18, 0.36));
      a.spinSpeed *= 0.992;
      b.spinSpeed *= 0.992;
      addSparks((a.x + b.x) / 2, (a.y + b.y) / 2, nx, ny, "#f5c451", Math.floor(10 + hit * 2));
    }

    function addSparks(x, y, nx, ny, color, count) {
      for (let i = 0; i < count; i += 1) {
        const angle = Math.atan2(ny, nx) + Math.PI + rand(-1.25, 1.25);
        const speed = rand(1.5, 7.2);
        sparks.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: rand(14, 34),
          maxLife: 34,
          color
        });
      }
      if (sparks.length > 420) sparks.splice(0, sparks.length - 420);
    }

    function drawTrail(top) {
      if (top.trail.length < 2) return;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      for (let i = 1; i < top.trail.length; i += 1) {
        const p = top.trail[i - 1];
        const q = top.trail[i];
        const alpha = i / top.trail.length * 0.62;
        ctx.strokeStyle = hexToRgba(top.color, alpha);
        ctx.lineWidth = 1.4 + i / top.trail.length * 7;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(q.x, q.y);
        ctx.stroke();
      }
    }

    function drawTop(top) {
      const pulse = Math.sin(frame * 0.1 + top.phase) * 0.08 + 1;
      const lean = (100 - top.energy) / 100 * Math.sin(frame * 0.18 + top.phase) * 0.16;

      ctx.save();
      ctx.translate(top.x, top.y);
      ctx.rotate(top.spin + lean);
      ctx.shadowColor = top.color;
      ctx.shadowBlur = 22;

      const grd = ctx.createRadialGradient(-top.radius * 0.25, -top.radius * 0.35, 2, 0, 0, top.radius * 1.35);
      grd.addColorStop(0, "#ffffff");
      grd.addColorStop(0.18, top.accent);
      grd.addColorStop(0.48, top.color);
      grd.addColorStop(1, "#15191f");

      ctx.fillStyle = grd;
      ctx.beginPath();
      for (let i = 0; i < 18; i += 1) {
        const a = i / 18 * Math.PI * 2;
        const r = top.radius * (i % 2 === 0 ? 1.08 * pulse : 0.78);
        const x = Math.cos(a) * r;
        const y = Math.sin(a) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();

      ctx.shadowBlur = 0;
      ctx.strokeStyle = "rgba(255,255,255,0.72)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.strokeStyle = "rgba(0,0,0,0.38)";
      ctx.lineWidth = 3;
      for (let i = 0; i < 3; i += 1) {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        const a = i / 3 * Math.PI * 2;
        ctx.lineTo(Math.cos(a) * top.radius * 0.96, Math.sin(a) * top.radius * 0.96);
        ctx.stroke();
      }

      ctx.fillStyle = "#f6f4ed";
      ctx.beginPath();
      ctx.arc(0, 0, top.radius * 0.28, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    function drawSparks() {
      for (let i = sparks.length - 1; i >= 0; i -= 1) {
        const s = sparks[i];
        s.x += s.vx;
        s.y += s.vy;
        s.vx *= 0.96;
        s.vy *= 0.96;
        s.life -= 1;
        const alpha = Math.max(0, s.life / s.maxLife);
        ctx.strokeStyle = hexToRgba(s.color, alpha);
        ctx.lineWidth = 1 + alpha * 2.5;
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(s.x - s.vx * 2.2, s.y - s.vy * 2.2);
        ctx.stroke();
        if (s.life <= 0) sparks.splice(i, 1);
      }
    }

    function hexToRgba(hex, alpha) {
      const n = parseInt(hex.slice(1), 16);
      const r = n >> 16 & 255;
      const g = n >> 8 & 255;
      const b = n & 255;
      return `rgba(${r},${g},${b},${alpha})`;
    }

    function drawWinner() {
      if (!winner) return;
      ctx.save();
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = "700 18px ui-sans-serif, system-ui, sans-serif";
      ctx.fillStyle = "rgba(245,243,238,0.88)";
      ctx.shadowColor = "rgba(0,0,0,0.72)";
      ctx.shadowBlur = 18;
      ctx.fillText(`${winner} wins`, center.x, center.y);
      ctx.restore();
    }

    function updateHud() {
      const red = tops[0] || { energy: 0 };
      const cyan = tops[1] || { energy: 0 };
      redEnergy.textContent = Math.round(red.energy);
      cyanEnergy.textContent = Math.round(cyan.energy);
      redBar.style.transform = `scaleX(${red.energy / 100})`;
      cyanBar.style.transform = `scaleX(${cyan.energy / 100})`;
      meta.textContent = `seed ${seed} · ${winner || "auto battle running"}`;
    }

    function tick() {
      if (!paused) {
        frame += 1;
        ctx.fillStyle = "rgba(8, 9, 11, 0.075)";
        ctx.fillRect(0, 0, w, h);
        paintBase(false);

        updateTop(tops[0], tops[1]);
        updateTop(tops[1], tops[0]);

        if (!winner) {
          if (tops[0].energy <= 0 && tops[1].energy <= 0) winner = "No one";
          else if (tops[0].energy <= 0) winner = tops[1].name;
          else if (tops[1].energy <= 0) winner = tops[0].name;
        }

        drawTrail(tops[0]);
        drawTrail(tops[1]);
        drawSparks();
        drawTop(tops[0]);
        drawTop(tops[1]);
        drawWinner();

        if (frame % 6 === 0) updateHud();
        if (winner && frame % 180 === 0) resetBattle();
      }
      requestAnimationFrame(tick);
    }

    toggleButton.addEventListener("click", () => {
      paused = !paused;
      toggleButton.innerHTML = paused
        ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M8 5v14l11-7L8 5Z" fill="currentColor"/></svg>'
        : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M8 5v14M16 5v14" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>';
    });

    resetButton.addEventListener("click", () => resetBattle());

    saveButton.addEventListener("click", () => {
      const link = document.createElement("a");
      link.download = `auto-top-battle-${seed}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    });

    window.addEventListener("resize", () => {
      resize();
      resetBattle(seed);
    });

    resize();
    resetBattle(new URLSearchParams(location.search).get("seed"));
    requestAnimationFrame(tick);