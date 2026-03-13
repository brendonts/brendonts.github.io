/**
 * Palantir-style background animation
 * - Particle nodes floating across a dark canvas
 * - Edges drawn between nearby nodes (network graph)
 * - Glowing node pulses
 * - Mouse-reactive: nodes gravitate/repel near cursor
 * - Hexagonal grid overlay for depth
 */

(function () {
  "use strict";

  const canvas = document.getElementById("bg-canvas");
  const ctx = canvas.getContext("2d");

  // ─── Config ──────────────────────────────────────────────────────────────────
  const CFG = {
    nodeCount: 80,
    nodeRadiusMin: 1.2,
    nodeRadiusMax: 3.2,
    speedMax: 0.35,
    connectDist: 160,       // px — draw edge if nodes are closer than this
    mouseRadius: 180,       // px — mouse influence radius
    mouseForce: 0.006,      // strength of mouse repulsion (reduced)
    edgeOpacityMax: 0.45,
    nodeOpacityMin: 0.3,
    nodeOpacityMax: 0.9,
    pulseSpeed: 0.012,
    glowColor: "72, 149, 239",   // RGB for glow (blue)
    nodeColor: "140, 198, 255",  // RGB for nodes
    edgeColor: "72, 149, 239",   // RGB for edges
    bgColor: "#04070f",          // page background (match CSS)
    hexGridSize: 90,
    hexGridOpacity: 0.04,
    boundaryRadius: 0.88,   // fraction of half-screen (elliptical) — 1.0 = edge
    boundaryForce: 0.0012,  // gentle pull back toward center
    maxEdges: 3,            // max connections drawn per node
  };

  // ─── State ────────────────────────────────────────────────────────────────────
  let W, H, dpr;
  let nodes = [];
  let mouse = { x: -9999, y: -9999 };
  let raf;

  // ─── Resize ───────────────────────────────────────────────────────────────────
  function resize() {
    dpr = window.devicePixelRatio || 1;
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // ─── Node factory ─────────────────────────────────────────────────────────────
  function createNode(forceSpread) {
    const angle = Math.random() * Math.PI * 2;
    const speed = (0.05 + Math.random() * CFG.speedMax);
    return {
      x: forceSpread ? Math.random() * W : Math.random() * W,
      y: forceSpread ? Math.random() * H : Math.random() * H,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      r: CFG.nodeRadiusMin + Math.random() * (CFG.nodeRadiusMax - CFG.nodeRadiusMin),
      phase: Math.random() * Math.PI * 2,  // pulse offset
      pulseSpeed: CFG.pulseSpeed * (0.5 + Math.random()),
      opacity: CFG.nodeOpacityMin + Math.random() * (CFG.nodeOpacityMax - CFG.nodeOpacityMin),
      maxEdges: 1 + Math.floor(Math.random() * CFG.maxEdges), // 1–maxEdges connections
    };
  }

  function initNodes() {
    nodes = [];
    for (let i = 0; i < CFG.nodeCount; i++) {
      nodes.push(createNode(true));
    }
  }

  // ─── Hex grid draw ────────────────────────────────────────────────────────────
  function drawHexGrid() {
    const s = CFG.hexGridSize;        // hex "size" (circumradius)
    const w = s * 2;
    const h = Math.sqrt(3) * s;
    ctx.strokeStyle = `rgba(${CFG.edgeColor}, ${CFG.hexGridOpacity})`;
    ctx.lineWidth = 0.5;

    for (let row = -1; row < Math.ceil(H / h) + 1; row++) {
      for (let col = -1; col < Math.ceil(W / (w * 0.75)) + 1; col++) {
        const cx = col * w * 0.75;
        const cy = row * h + (col % 2 === 0 ? 0 : h / 2);
        drawHex(cx, cy, s);
      }
    }
  }

  function drawHex(cx, cy, s) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 180) * (60 * i - 30);
      const px = cx + s * Math.cos(angle);
      const py = cy + s * Math.sin(angle);
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();
  }

  // ─── Draw loop ────────────────────────────────────────────────────────────────
  function draw() {
    ctx.clearRect(0, 0, W, H);

    // Hex grid overlay
    drawHexGrid();

    // Update + draw nodes
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];

      // Mouse repulsion
      const dx = n.x - mouse.x;
      const dy = n.y - mouse.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < CFG.mouseRadius && dist > 1) {
        const force = (1 - dist / CFG.mouseRadius) * CFG.mouseForce;
        n.vx += (dx / dist) * force * 60;
        n.vy += (dy / dist) * force * 60;
      }

      // Elliptical boundary — normalised to half screen so nodes spread
      // across the full canvas, only nudged back near the very edges
      const cx = W / 2, cy = H / 2;
      const nx = (n.x - cx) / (W / 2); // -1..1
      const ny = (n.y - cy) / (H / 2); // -1..1
      const enorm = Math.sqrt(nx * nx + ny * ny);
      if (enorm > CFG.boundaryRadius) {
        const excess = enorm - CFG.boundaryRadius;
        const pull = excess * CFG.boundaryForce * 60;
        n.vx -= (nx / enorm) * pull;
        n.vy -= (ny / enorm) * pull;
      }

      // Damping — stronger so mouse bursts decay quickly
      n.vx *= 0.96;
      n.vy *= 0.96;

      // Hard speed clamp
      const sp = Math.sqrt(n.vx * n.vx + n.vy * n.vy);
      if (sp > CFG.speedMax) {
        n.vx = (n.vx / sp) * CFG.speedMax;
        n.vy = (n.vy / sp) * CFG.speedMax;
      }

      // Move
      n.x += n.vx;
      n.y += n.vy;

      // Hard clamp — nodes never leave the canvas
      n.x = Math.max(0, Math.min(W, n.x));
      n.y = Math.max(0, Math.min(H, n.y));

      // Pulse
      n.phase += n.pulseSpeed;
      const pulse = 0.5 + 0.5 * Math.sin(n.phase);
      const currentOpacity = n.opacity * (0.6 + 0.4 * pulse);
      const currentR = n.r * (0.85 + 0.15 * pulse);

      // Node glow
      const grd = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, currentR * 5);
      grd.addColorStop(0, `rgba(${CFG.glowColor}, ${currentOpacity * 0.5})`);
      grd.addColorStop(1, `rgba(${CFG.glowColor}, 0)`);
      ctx.beginPath();
      ctx.arc(n.x, n.y, currentR * 5, 0, Math.PI * 2);
      ctx.fillStyle = grd;
      ctx.fill();

      // Node core
      ctx.beginPath();
      ctx.arc(n.x, n.y, currentR, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${CFG.nodeColor}, ${currentOpacity})`;
      ctx.fill();
    }

    // Edges — each node connects to at most maxEdges nearest neighbours
    const edgeCounts = new Int8Array(nodes.length);
    // Collect candidates sorted by distance, then draw greedily
    const candidates = [];
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        const d = dx * dx + dy * dy; // squared — sort key
        if (d < CFG.connectDist * CFG.connectDist) {
          candidates.push(i, j, d);
        }
      }
    }
    // Sort by distance ascending (every 3 entries: i, j, d²)
    const len = candidates.length / 3 | 0;
    const triples = [];
    for (let k = 0; k < len; k++) triples.push(k);
    triples.sort((a, b) => candidates[a * 3 + 2] - candidates[b * 3 + 2]);

    ctx.lineWidth = 0.7;
    for (let k = 0; k < triples.length; k++) {
      const base = triples[k] * 3;
      const i = candidates[base], j = candidates[base + 1];
      if (edgeCounts[i] >= nodes[i].maxEdges) continue;
      if (edgeCounts[j] >= nodes[j].maxEdges) continue;
      edgeCounts[i]++;
      edgeCounts[j]++;
      const d = Math.sqrt(candidates[base + 2]);
      const alpha = CFG.edgeOpacityMax * (1 - d / CFG.connectDist);
      ctx.beginPath();
      ctx.moveTo(nodes[i].x, nodes[i].y);
      ctx.lineTo(nodes[j].x, nodes[j].y);
      ctx.strokeStyle = `rgba(${CFG.edgeColor}, ${alpha})`;
      ctx.stroke();
    }

    // Mouse highlight node edges
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      const dx = n.x - mouse.x;
      const dy = n.y - mouse.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < CFG.mouseRadius) {
        const alpha = 0.6 * (1 - d / CFG.mouseRadius);
        ctx.beginPath();
        ctx.moveTo(mouse.x, mouse.y);
        ctx.lineTo(n.x, n.y);
        ctx.strokeStyle = `rgba(${CFG.glowColor}, ${alpha})`;
        ctx.lineWidth = 0.6;
        ctx.stroke();
      }
    }

    // Mouse glow dot
    if (mouse.x > 0) {
      const mg = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 30);
      mg.addColorStop(0, `rgba(${CFG.glowColor}, 0.15)`);
      mg.addColorStop(1, `rgba(${CFG.glowColor}, 0)`);
      ctx.beginPath();
      ctx.arc(mouse.x, mouse.y, 30, 0, Math.PI * 2);
      ctx.fillStyle = mg;
      ctx.fill();
    }

    raf = requestAnimationFrame(draw);
  }

  // ─── Events ───────────────────────────────────────────────────────────────────
  window.addEventListener("resize", () => {
    resize();
    initNodes();
  });

  window.addEventListener("mousemove", (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  });

  window.addEventListener("mouseleave", () => {
    mouse.x = -9999;
    mouse.y = -9999;
  });

  // ─── Init ─────────────────────────────────────────────────────────────────────
  resize();
  initNodes();
  draw();

})();
