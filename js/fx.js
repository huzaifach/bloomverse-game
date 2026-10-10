/* BLOOMVERSE — pooled canvas particles, floating text, ambient pollen. */
const FX = {
  canvas: null, ctx: null, parts: [], pollen: [],
  running: false, lastT: 0, reduced: false,
  COLORS: ['#E8B64C', '#F6DE9C', '#D98E6A', '#8FAE8B', '#F2A7A7', '#FFF6E9'],

  init(){
    this.canvas = document.getElementById('fx');
    this.ctx = this.canvas.getContext('2d');
    this.resize();
    window.addEventListener('resize', () => this.resize());
    for (let i = 0; i < 120; i++) this.parts.push({ alive: false });
    this.lastT = performance.now();
    this.running = true;
    requestAnimationFrame(t => this.loop(t));
  },

  resize(){
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    this.canvas.width = innerWidth * dpr;
    this.canvas.height = innerHeight * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  },

  setReduced(on){ this.reduced = on; if (on){ this.parts.forEach(p => p.alive = false); this.pollen = []; } },

  spawn(x, y, opts = {}){
    if (this.reduced) return;
    const p = this.parts.find(p => !p.alive);
    if (!p) return;
    const a = Math.random() * Math.PI * 2, sp = (opts.speed || 140) * (0.4 + Math.random() * 0.8);
    p.alive = true; p.x = x; p.y = y;
    p.vx = Math.cos(a) * sp; p.vy = Math.sin(a) * sp - 60;
    p.life = 0; p.max = (opts.life || 0.7) * (0.7 + Math.random() * 0.6);
    p.size = (opts.size || 5) * (0.6 + Math.random() * 0.8);
    p.color = opts.color || this.COLORS[(Math.random() * this.COLORS.length) | 0];
    p.rot = Math.random() * Math.PI * 2; p.vr = (Math.random() - 0.5) * 8;
    p.grav = opts.grav !== undefined ? opts.grav : 160;
  },

  burst(x, y, n = 10, opts = {}){
    for (let i = 0; i < n; i++) this.spawn(x, y, opts);
  },

  floatText(x, y, text, color = '#6E8F6A'){
    if (this.reduced) { UI.toast(text); return; }
    const el = document.createElement('div');
    el.className = 'float-text'; el.textContent = text;
    el.style.left = x + 'px'; el.style.top = y + 'px';
    if (color) el.style.color = color;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1150);
  },

  pollenTick(){
    if (this.reduced || document.hidden) return;
    if (this.pollen.length < 22 && Math.random() < 0.25){
      this.pollen.push({ x: Math.random() * innerWidth, y: innerHeight + 10,
        vy: -(12 + Math.random() * 20), vx: (Math.random() - 0.5) * 14,
        size: 2 + Math.random() * 3, a: 0.12 + Math.random() * 0.2,
        ph: Math.random() * Math.PI * 2 });
    }
  },

  loop(t){
    if (!this.running) return;
    const dt = Math.min((t - this.lastT) / 1000, 0.05);
    this.lastT = t;
    const c = this.ctx;
    c.clearRect(0, 0, innerWidth, innerHeight);

    // ambient pollen
    this.pollenTick();
    for (let i = this.pollen.length - 1; i >= 0; i--){
      const p = this.pollen[i];
      p.ph += dt; p.x += (p.vx + Math.sin(p.ph) * 10) * dt; p.y += p.vy * dt;
      if (p.y < -12){ this.pollen.splice(i, 1); continue; }
      c.globalAlpha = p.a;
      c.fillStyle = '#E8B64C';
      c.beginPath(); c.arc(p.x, p.y, p.size, 0, 7); c.fill();
    }
    c.globalAlpha = 1;

    // burst particles
    for (const p of this.parts){
      if (!p.alive) continue;
      p.life += dt;
      if (p.life >= p.max){ p.alive = false; continue; }
      p.vy += p.grav * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
      const k = 1 - p.life / p.max;
      c.save(); c.translate(p.x, p.y); c.rotate(p.rot);
      c.globalAlpha = Math.min(1, k * 1.6);
      c.fillStyle = p.color;
      c.beginPath(); c.ellipse(0, 0, p.size, p.size * 0.55, 0, 0, 7); c.fill();
      c.restore();
    }
    c.globalAlpha = 1;
    requestAnimationFrame(tt => this.loop(tt));
  }
};
