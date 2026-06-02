/* ═══════════════════════════════════════════════════════════════════
   SYSTEM NĪTI — A Field Manual for Resilient Systems
   Behaviour · v.1.0
   ═══════════════════════════════════════════════════════════════════ */

(() => {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const lerp = (a, b, n) => (1 - n) * a + n * b;
  const clamp = (n, min, max) => Math.min(Math.max(n, min), max);
  const isTouch = matchMedia('(hover: none)').matches;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const supportsRAF = !reduce;

  /* ──────────────────────────────────────────────────────────────
     0. UTILITIES
     ────────────────────────────────────────────────────────────── */

  // Split text into words (each wrapped in a span) for stagger reveal
  function splitWords(el) {
    if (el.dataset.splitDone) return;
    const text = el.textContent;
    el.textContent = '';
    const words = text.split(/\s+/).filter(Boolean);
    words.forEach((w, idx) => {
      const word = document.createElement('span');
      word.className = 'word';
      const inner = document.createElement('span');
      inner.className = 'word-inner';
      inner.textContent = w;
      inner.style.setProperty('--d', `${idx * 30}ms`);
      word.appendChild(inner);
      el.appendChild(word);
      if (idx < words.length - 1) el.appendChild(document.createTextNode(' '));
    });
    el.dataset.splitDone = 'true';
  }

  // Time formatter
  const pad = (n) => String(n).padStart(2, '0');
  const formatTime = (d = new Date()) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const formatTimeSec = (d = new Date()) => `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;

  // Smooth value lerp with rAF
  function smoothTo(current, target, lambda = 0.15) {
    return lerp(current, target, 1 - Math.exp(-lambda * 16));
  }

  /* ──────────────────────────────────────────────────────────────
     1. LOADER
     ────────────────────────────────────────────────────────────── */

  class Loader {
    constructor() {
      this.el = $('#loader');
      this.countEl = $('#loaderCount');
      this.barEl = $('#loaderBar');
      this.progress = 0;
      this.target = 0;
      this.done = false;
      if (!this.el) { this.done = true; document.body.classList.remove('is-loading'); return; }
      if (window.__SKIP_LOADER__) { this.done = true; this.el.style.display = 'none'; document.body.classList.remove('is-loading'); return; }
      this.start();
    }
    start() {
      this.tick();
    }
    tick() {
      if (this.done) return;
      // accumulate target with some randomness; smooth to it
      this.target = Math.min(100, this.target + (Math.random() * 4 + 1.4));
      this.progress = smoothTo(this.progress, this.target, 0.18);
      const p = Math.floor(this.progress);
      this.countEl.textContent = pad(p);
      this.barEl.style.right = `${100 - p}%`;
      if (p < 100) {
        requestAnimationFrame(() => this.tick());
      } else {
        this.countEl.textContent = '100';
        this.barEl.style.right = '0%';
        this.finish();
      }
    }
    finish() {
      this.done = true;
      setTimeout(() => {
        this.el.classList.add('is-done');
        document.body.classList.remove('is-loading');
        setTimeout(() => { this.el.style.display = 'none'; }, 1400);
        document.dispatchEvent(new CustomEvent('loader:done'));
      }, 500);
    }
  }

  // Allow bypassing the loader via ?skip in the URL
  if (location.search.includes('skip')) {
    window.__SKIP_LOADER__ = true;
    document.body.classList.add('is-loaded');
    document.body.classList.remove('is-loading');
    const ld = $('#loader');
    if (ld) ld.style.display = 'none';
  }

  /* ──────────────────────────────────────────────────────────────
     2. CURSOR
     ────────────────────────────────────────────────────────────── */

  class Cursor {
    constructor() {
      if (isTouch || reduce) return;
      this.el = $('#cursor');
      this.dot = $('.cursor-dot', this.el);
      this.ring = $('.cursor-ring', this.el);
      this.label = $('#cursorLabel');
      this.mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
      this.pos = { dot: { x: 0, y: 0 }, ring: { x: 0, y: 0 } };
      this.ringPos = { x: 0, y: 0 };
      this.targets = $$('[data-cursor]');
      this.bind();
    }
    bind() {
      window.addEventListener('mousemove', (e) => {
        this.mouse.x = e.clientX;
        this.mouse.y = e.clientY;
      }, { passive: true });
      this.targets.forEach((t) => {
        const lbl = t.dataset.cursor;
        t.addEventListener('mouseenter', () => {
          this.el.classList.add('is-hover', 'has-label');
          if (lbl) this.el.dataset.label = lbl;
        });
        t.addEventListener('mouseleave', () => {
          this.el.classList.remove('is-hover', 'has-label');
          delete this.el.dataset.label;
        });
      });
      $$('a, button, .decree-step, .checklist li, .decree-track-wrap').forEach((el) => {
        if (el.dataset.cursor) return;
        el.addEventListener('mouseenter', () => this.el.classList.add('is-hover'));
        el.addEventListener('mouseleave', () => this.el.classList.remove('is-hover'));
      });
      window.addEventListener('mousedown', () => this.el.classList.add('is-press'));
      window.addEventListener('mouseup', () => this.el.classList.remove('is-press'));
      this.render();
    }
    render() {
      // dot follows tightly
      this.pos.dot.x = smoothTo(this.pos.dot.x, this.mouse.x, 0.6);
      this.pos.dot.y = smoothTo(this.pos.dot.y, this.mouse.y, 0.6);
      this.dot.style.transform = `translate(${this.pos.dot.x}px, ${this.pos.dot.y}px) translate(-50%, -50%)`;
      // ring follows with lag
      this.ringPos.x = smoothTo(this.ringPos.x, this.mouse.x, 0.18);
      this.ringPos.y = smoothTo(this.ringPos.y, this.mouse.y, 0.18);
      this.ring.style.transform = `translate(${this.ringPos.x}px, ${this.ringPos.y}px) translate(-50%, -50%)`;
      this.label.style.transform = `translate(${this.ringPos.x}px, ${this.ringPos.y}px) translate(20px, 20px)`;
      requestAnimationFrame(() => this.render());
    }
  }

  /* ──────────────────────────────────────────────────────────────
     3. LENIS SMOOTH SCROLL
     ────────────────────────────────────────────────────────────── */

  class SmoothScroll {
    constructor() {
      if (reduce) { this.lenis = null; return; }
      this.lenis = new Lenis({
        duration: 1.2,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
        wheelMultiplier: 1,
        touchMultiplier: 1.4,
      });
      this.lenis.on('scroll', (e) => {
        this.onScroll(e.scroll, e.limit, e.progress);
      });
      this.scroll = 0;
      this.limit = 1;
      this.progress = 0;
      this.render();
    }
    onScroll(s, l, p) { this.scroll = s; this.limit = l; this.progress = p; }
    render(time) {
      this.lenis.raf(time);
      requestAnimationFrame((t) => this.render(t));
    }
    scrollTo(target, opts = {}) {
      if (this.lenis) this.lenis.scrollTo(target, { duration: 1.6, ...opts });
      else window.scrollTo({ top: target, behavior: 'smooth' });
    }
  }

  /* ──────────────────────────────────────────────────────────────
     4. TOP PROGRESS
     ────────────────────────────────────────────────────────────── */

  class TopProgress {
    constructor(scroll) {
      this.el = $('#topProgress').firstElementChild;
      this.scroll = scroll;
      this.render();
    }
    render() {
      const p = this.scroll.progress || 0;
      this.el.style.transform = `scaleX(${p})`;
      requestAnimationFrame(() => this.render());
    }
  }

  /* ──────────────────────────────────────────────────────────────
     5. TIME CLOCKS
     ────────────────────────────────────────────────────────────── */

  class Clocks {
    constructor() {
      this.navEl = $('#navTime');
      this.footEl = $('#footerTime');
      this.tick();
      setInterval(() => this.tick(), 1000);
    }
    tick() {
      const now = new Date();
      if (this.navEl) this.navEl.textContent = formatTime(now);
      if (this.footEl) this.footEl.textContent = formatTimeSec(now);
    }
  }

  /* ──────────────────────────────────────────────────────────────
     6. SECTION OBSERVER (reveal + chapter nav)
     ────────────────────────────────────────────────────────────── */

  class SectionObserver {
    constructor() {
      this.sections = $$('[data-section], .chapter, .preface');
      this.io = new IntersectionObserver(this.onIntersect.bind(this), {
        threshold: [0, 0.15, 0.5],
        rootMargin: '0px 0px -10% 0px',
      });
      this.sections.forEach((s) => this.io.observe(s));
    }
    onIntersect(entries) {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('is-in');
        }
      });
    }
  }

  /* ──────────────────────────────────────────────────────────────
     7. CHAPTER NAVIGATION
     ────────────────────────────────────────────────────────────── */

  class ChapterNav {
    constructor(scroll) {
      this.track = $('#chapterNavTrack');
      this.current = $('#chapterNavCurrent');
      this.scroll = scroll;
      this.chapters = [
        { num: '00', label: 'Preface', id: 'preface' },
        { num: '01', label: 'Requirements', id: 'ch-01' },
        { num: '02', label: 'Architecture', id: 'ch-02' },
        { num: '03', label: 'Resources', id: 'ch-03' },
        { num: '04', label: 'Observability', id: 'ch-04' },
        { num: '05', label: 'Ownership', id: 'ch-05' },
        { num: '06', label: 'APIs', id: 'ch-06' },
        { num: '07', label: 'Scaling', id: 'ch-07' },
        { num: '08', label: 'Caching', id: 'ch-08' },
        { num: '09', label: 'Resilience', id: 'ch-09' },
        { num: '10', label: 'Backups', id: 'ch-10' },
        { num: '11', label: 'Security', id: 'ch-11' },
        { num: '12', label: 'Deployment', id: 'ch-12' },
        { num: '13', label: 'Chaos', id: 'ch-13' },
        { num: '14', label: 'Documentation', id: 'ch-14' },
        { num: '15', label: 'Governance', id: 'ch-15' },
        { num: '16', label: 'The Decree', id: 'decree' },
      ];
      this.render();
      this.observe();
    }
    render() {
      this.track.innerHTML = '';
      this.chapters.forEach((c) => {
        const item = document.createElement('button');
        item.type = 'button';
        item.className = 'chapter-nav-item';
        item.dataset.id = c.id;
        item.setAttribute('aria-label', `${c.num} — ${c.label}`);
        item.innerHTML = `
          <span class="chapter-nav-item-label">${c.label}</span>
          <span class="chapter-nav-item-dot" aria-hidden="true"></span>
        `;
        item.addEventListener('click', () => {
          const el = document.getElementById(c.id);
          if (el) this.scroll.scrollTo(el, { offset: -80 });
        });
        this.track.appendChild(item);
      });
    }
    observe() {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting && e.intersectionRatio > 0.15) {
            const id = e.target.id;
            const ch = this.chapters.find((c) => c.id === id);
            if (ch) this.setActive(ch.num);
          }
        });
      }, { threshold: [0, 0.15, 0.4, 0.7], rootMargin: '-30% 0px -30% 0px' });
      this.chapters.forEach((c) => {
        const el = document.getElementById(c.id);
        if (el) io.observe(el);
      });
    }
    setActive(num) {
      $$('.chapter-nav-item', this.track).forEach((it) => {
        const id = it.dataset.id;
        const ch = this.chapters.find((c) => c.id === id);
        it.classList.toggle('is-active', ch && ch.num === num);
      });
      this.current.textContent = num;
    }
  }

  /* ──────────────────────────────────────────────────────────────
     8. TEXT SPLITTER
     ────────────────────────────────────────────────────────────── */

  class TextSplitter {
    constructor() {
      $$('[data-reveal-split]').forEach(splitWords);
    }
  }

  /* ──────────────────────────────────────────────────────────────
     9. COUNTERS
     ────────────────────────────────────────────────────────────── */

  class Counters {
    constructor() {
      this.items = $$('[data-count]');
      this.observed = false;
      this.io = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting && !this.observed) {
            this.observed = true;
            this.start();
          }
        });
      }, { threshold: 0.3 });
      const heroStats = $('.hero-stats');
      if (heroStats) this.io.observe(heroStats);
    }
    start() {
      this.items.forEach((el) => {
        const target = parseInt(el.dataset.count, 10);
        const dur = 1600;
        const start = performance.now();
        const step = (t) => {
          const p = Math.min(1, (t - start) / dur);
          const eased = 1 - Math.pow(1 - p, 4);
          const val = Math.floor(eased * target);
          el.textContent = pad(val);
          if (p < 1) requestAnimationFrame(step);
          else el.textContent = pad(target);
        };
        requestAnimationFrame(step);
      });
    }
  }

  /* ──────────────────────────────────────────────────────────────
     10. HERO PARALLAX
     ────────────────────────────────────────────────────────────── */

  class HeroParallax {
    constructor() {
      if (isTouch || reduce) return;
      this.glyph = $('#heroGlyph');
      this.title = $('.hero-title');
      this.stats = $('.hero-stats');
      this.mouse = { x: 0, y: 0, tx: 0, ty: 0 };
      this.scrollY = 0;
      this.bind();
      this.render();
    }
    bind() {
      window.addEventListener('mousemove', (e) => {
        this.mouse.tx = (e.clientX / window.innerWidth - 0.5) * 2;
        this.mouse.ty = (e.clientY / window.innerHeight - 0.5) * 2;
      }, { passive: true });
      window.addEventListener('scroll', () => { this.scrollY = window.scrollY; }, { passive: true });
    }
    render() {
      this.mouse.x = smoothTo(this.mouse.x, this.mouse.tx, 0.06);
      this.mouse.y = smoothTo(this.mouse.y, this.mouse.ty, 0.06);
      if (this.glyph) {
        const p = Math.min(1, this.scrollY / window.innerHeight);
        this.glyph.style.transform = `translate3d(calc(-8% + ${this.mouse.x * 30}px), calc(-50% + ${this.mouse.y * 20}px - ${p * 80}px), 0) rotate(${-2 + this.mouse.x * 1.5}deg)`;
      }
      if (this.title) {
        const ty = this.mouse.y * -8 - (this.scrollY * 0.08);
        this.title.style.transform = `translate3d(0, ${ty}px, 0)`;
      }
      if (this.stats) {
        this.stats.style.transform = `translate3d(${this.mouse.x * 6}px, ${this.mouse.y * 4}px, 0)`;
      }
      requestAnimationFrame(() => this.render());
    }
  }

  /* ──────────────────────────────────────────────────────────────
     11. NAV STATE
     ────────────────────────────────────────────────────────────── */

  class Nav {
    constructor() {
      this.el = $('#nav');
      this.cn = $('#chapterNav');
      window.addEventListener('scroll', () => {
        const solid = window.scrollY > 80;
        this.el.classList.toggle('is-solid', solid);
      }, { passive: true });
      // show on loader done
      document.addEventListener('loader:done', () => {
        setTimeout(() => {
          this.el.classList.add('is-ready');
          this.cn.classList.add('is-ready');
        }, 600);
      });
    }
  }

  /* ──────────────────────────────────────────────────────────────
     12. HORIZONTAL SCROLL — DECREE (sticky / scroll-driven)
     ────────────────────────────────────────────────────────────── */

  class HorizontalScroll {
    constructor() {
      this.section = $('#decree');
      this.wrap = $('#decreeTrackWrap');
      this.track = $('#decreeTrack');
      this.progress = $('#decreeProgress');
      this.counter = $('#decreeCounterCurrent');
      this.steps = $$('.decree-step', this.track);
      if (!this.section || !this.wrap || !this.track) return;
      this.pos = 0; this.target = 0; this.max = 0;
      this.maxScroll = 0;
      this.sectionTop = 0;
      this.sectionHeight = 0;
      this.isDragging = false;
      this.dragStart = 0;
      this.dragOrigin = 0;
      this.compute();
      this.bind();
      this.render();
      window.addEventListener('resize', () => this.compute());
      // re-measure when fonts are ready (text reflow may change widths)
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(() => this.compute());
      }
    }
    compute() {
      // measure track width
      this.max = Math.max(0, this.track.scrollWidth - window.innerWidth);
      // compute section height needed so vertical scroll can drive horizontal
      // need: scroll distance = max
      // section top + section height - viewport height = bottom of section
      // we want sticky region to fill viewport for the entire scroll
      // total section height = viewport + max
      const minHeight = window.innerHeight * 1.2;
      const required = window.innerHeight + this.max + 64;
      const finalH = Math.max(minHeight, required);
      this.section.style.height = `${finalH}px`;
      this.maxScroll = finalH - window.innerHeight;
      const rect = this.section.getBoundingClientRect();
      this.sectionTop = window.scrollY + rect.top;
    }
    bind() {
      window.addEventListener('scroll', () => {
        this.sectionTop = this.section.offsetTop;
        this.onScroll();
      }, { passive: true });
      window.addEventListener('resize', () => this.onScroll(), { passive: true });
      // drag overrides
      const onDown = (e) => {
        this.isDragging = true;
        this.wrap.classList.add('is-dragging');
        this.dragStart = (e.touches ? e.touches[0].clientX : e.clientX);
        this.dragOrigin = this.target;
      };
      const onMove = (e) => {
        if (!this.isDragging) return;
        const x = (e.touches ? e.touches[0].clientX : e.clientX);
        const dx = this.dragStart - x;
        const progress = dx / this.max;
        // translate to scroll position
        const scrollDelta = progress * this.maxScroll;
        const newScroll = this.sectionTop + scrollDelta;
        window.scrollTo({ top: clamp(newScroll, this.sectionTop, this.sectionTop + this.maxScroll), behavior: 'auto' });
      };
      const onUp = () => {
        this.isDragging = false;
        this.wrap.classList.remove('is-dragging');
      };
      this.wrap.addEventListener('mousedown', onDown);
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
      this.wrap.addEventListener('touchstart', onDown, { passive: true });
      this.wrap.addEventListener('touchmove', onMove, { passive: true });
      this.wrap.addEventListener('touchend', onUp);
      // wheel: convert vertical to progress within section
      this.wrap.addEventListener('wheel', (e) => {
        if (this.max === 0) return;
        if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
          e.preventDefault();
          // map deltaY to additional scroll
          const newScroll = window.scrollY + e.deltaY * 1.4;
          window.scrollTo({ top: newScroll, behavior: 'auto' });
        }
      }, { passive: false });
      // arrow keys
      window.addEventListener('keydown', (e) => {
        const rect = this.section.getBoundingClientRect();
        if (rect.top > window.innerHeight || rect.bottom < 0) return;
        if (e.key === 'ArrowRight') window.scrollBy({ top: 120, behavior: 'smooth' });
        if (e.key === 'ArrowLeft') window.scrollBy({ top: -120, behavior: 'smooth' });
      });
    }
    onScroll() {
      const y = window.scrollY;
      const progress = clamp((y - this.sectionTop) / this.maxScroll, 0, 1);
      this.target = progress * this.max;
    }
    render() {
      this.pos = smoothTo(this.pos, this.target, 0.12);
      this.track.style.transform = `translate3d(${-this.pos}px, 0, 0)`;
      const p = this.max > 0 ? (this.pos / this.max) : 0;
      if (this.progress) this.progress.style.width = `${p * 100}%`;
      // update step counter — find the step whose midpoint is closest to viewport center
      if (this.steps.length && this.counter) {
        const vw = window.innerWidth;
        const cv = vw / 2;
        let best = 0;
        for (let i = 0; i < this.steps.length; i++) {
          const r = this.steps[i].getBoundingClientRect();
          const mid = r.left + r.width / 2;
          if (mid <= cv + 20) best = i + 1;
        }
        const num = pad(Math.max(1, Math.min(10, best)));
        if (this.counter.textContent !== num) this.counter.textContent = num;
      }
      requestAnimationFrame(() => this.render());
    }
  }

  /* ──────────────────────────────────────────────────────────────
     13. GRAIN (canvas)
     ────────────────────────────────────────────────────────────── */

  class Grain {
    constructor() {
      this.canvas = $('#grain');
      if (!this.canvas) return;
      this.ctx = this.canvas.getContext('2d');
      this.resize();
      window.addEventListener('resize', () => this.resize());
      this.animate();
    }
    resize() {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      this.canvas.width = window.innerWidth * dpr;
      this.canvas.height = window.innerHeight * dpr;
      this.canvas.style.width = window.innerWidth + 'px';
      this.canvas.style.height = window.innerHeight + 'px';
      this.w = this.canvas.width;
      this.h = this.canvas.height;
    }
    frame() {
      // Render noise efficiently by drawing a small portion
      const ctx = this.ctx;
      const w = this.w, h = this.h;
      const imgData = ctx.createImageData(w, h);
      const data = imgData.data;
      // very low alpha grain — sampled sparsely for perf
      for (let y = 0; y < h; y += 2) {
        for (let x = 0; x < w; x += 2) {
          const idx = (y * w + x) * 4;
          const v = (Math.random() * 32) | 0;
          data[idx] = v;
          data[idx + 1] = v;
          data[idx + 2] = v;
          data[idx + 3] = 28;
        }
      }
      ctx.putImageData(imgData, 0, 0);
    }
    animate() {
      if (reduce) return;
      this.frame();
      // re-render every 200ms for animated grain
      setTimeout(() => this.animate(), 180);
    }
  }

  /* ──────────────────────────────────────────────────────────────
     14. SMOOTH ANCHORS
     ────────────────────────────────────────────────────────────── */

  class SmoothAnchors {
    constructor(scroll) {
      this.scroll = scroll;
      $$('a[href^="#"]').forEach((a) => {
        a.addEventListener('click', (e) => {
          const id = a.getAttribute('href');
          if (id.length < 2) return;
          const el = document.querySelector(id);
          if (!el) return;
          e.preventDefault();
          this.scroll.scrollTo(el, { offset: -40 });
        });
      });
    }
  }

  /* ──────────────────────────────────────────────────────────────
     15. TITLE GLITCH ON HERO LOAD
     ────────────────────────────────────────────────────────────── */

  class HeroTitleReveal {
    constructor() {
      this.title = $('.hero-title');
      if (!this.title) return;
      this.words = $$('.hero-title-word', this.title);
      this.bind();
    }
    bind() {
      this.title.addEventListener('mouseenter', () => {
        this.words.forEach((w) => w.classList.add('is-hi'));
      });
      this.title.addEventListener('mouseleave', () => {
        this.words.forEach((w) => w.classList.remove('is-hi'));
      });
    }
  }

  /* ──────────────────────────────────────────────────────────────
     16. BOOT
     ────────────────────────────────────────────────────────────── */

  function boot() {
    if ($('#loader')) document.body.classList.add('is-loading');

    const scroll = new SmoothScroll();
    new Loader();
    new Clocks();
    new Cursor();
    new TextSplitter();
    new Nav();
    new SectionObserver();
    new ChapterNav(scroll);
    new Counters();
    new HeroParallax();
    new HeroTitleReveal();
    new HorizontalScroll();
    new Grain();
    new TopProgress(scroll);
    new SmoothAnchors(scroll);

    // After loader completes, enable direct animations and trigger
    // initial reveals for any sections already in view.
    document.addEventListener('loader:done', () => {
      setTimeout(() => {
        document.body.classList.add('is-loaded');
        // trigger reveals for sections already in view
        $$('[data-section], .chapter, .preface').forEach((s) => {
          const rect = s.getBoundingClientRect();
          if (rect.top < window.innerHeight * 0.85 && rect.bottom > 0) {
            s.classList.add('is-in');
          }
        });
        // horizontal scroll needs to recompute after layout settles
        setTimeout(() => window.dispatchEvent(new Event('resize')), 200);
      }, 200);
    });
    // If loader was bypassed, run reveals immediately
    if (window.__SKIP_LOADER__) {
      setTimeout(() => {
        $$('[data-section], .chapter, .preface').forEach((s) => {
          const rect = s.getBoundingClientRect();
          if (rect.top < window.innerHeight * 0.85 && rect.bottom > 0) {
            s.classList.add('is-in');
          }
        });
        setTimeout(() => window.dispatchEvent(new Event('resize')), 100);
      }, 100);
    }

    // Initialise post behaviour if this is a post page
    if ($('.post-article') || $('.post-nav')) {
      new PostInit();
    }
  }

  /* ════════════════════════════════════════════════════════════════
     POST / ARTICLE BEHAVIOUR
     (only initialised when a post-* element exists)
     ════════════════════════════════════════════════════════════════ */

  class PostNav {
    constructor() {
      this.bar = $('.post-nav');
      this.barProgress = $('.post-nav-progress-bar');
      if (!this.bar) return;
      this.tick();
      window.addEventListener('scroll', () => this.tick(), { passive: true });
      window.addEventListener('resize', () => this.tick());
    }
    tick() {
      const doc = document.documentElement;
      const h = doc.scrollHeight - window.innerHeight;
      const p = h > 0 ? Math.min(1, Math.max(0, window.scrollY / h)) : 0;
      if (this.barProgress) this.barProgress.style.width = (p * 100).toFixed(2) + '%';
      this.bar.classList.toggle('is-stuck', window.scrollY > 8);
    }
  }

  class ReadingTime {
    constructor() {
      const el = $('[data-reading-time]');
      const article = $('.post-article');
      if (!el || !article) return;
      const text = (article.textContent || '').trim();
      const words = text.split(/\s+/).filter(Boolean).length;
      const minutes = Math.max(1, Math.round(words / 220));
      el.textContent = minutes + ' min read';
      el.dataset.words = String(words);
    }
  }

  class Toc {
    constructor() {
      this.toc = $('.post-toc');
      this.article = $('.post-article');
      if (!this.toc || !this.article) return;
      this.headings = $$('h2[id], h3[id]', this.article);
      if (this.headings.length < 2) { this.toc.style.display = 'none'; return; }
      this.build();
      this.bind();
    }
    build() {
      const list = $('ul', this.toc);
      this.headings.forEach((h) => {
        const li = document.createElement('li');
        li.className = h.tagName === 'H3' ? 'toc-h3' : 'toc-h2';
        const a = document.createElement('a');
        a.href = '#' + h.id;
        a.textContent = h.textContent.replace(/^[\s\d.\-—]+/, '');
        a.dataset.target = h.id;
        li.appendChild(a);
        list.appendChild(li);
      });
      this.links = $$('a', this.toc);
    }
    bind() {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) this.activate(e.target.id);
        });
      }, { rootMargin: '-20% 0px -70% 0px', threshold: 0 });
      this.headings.forEach((h) => io.observe(h));
    }
    activate(id) {
      this.links.forEach((a) => a.classList.toggle('is-active', a.dataset.target === id));
    }
  }

  class AudioPlayer {
    constructor() {
      this.root = $('.audio-player');
      if (!this.root) return;
      this.btn = $('.audio-play', this.root);
      this.wave = $('.audio-waveform', this.root);
      this.time = $('.audio-time', this.root);
      this.rate = $('.audio-rate', this.root);
      this.article = $('.post-article');
      this.bars = [];
      this.rateValue = 1.0;
      this.synthSupported = 'speechSynthesis' in window;
      this.utter = null;
      this.ticking = false;
      this.lastBar = -1;
      this.words = [];
      this.startWord = 0;
      this.build();
      this.bind();
      if (!this.synthSupported) {
        this.btn.disabled = true;
        this.btn.style.opacity = '0.4';
        this.root.title = 'Audio not supported in this browser';
      }
    }
    build() {
      if (!this.article) return;
      const text = (this.article.textContent || '').trim();
      this.words = text.split(/\s+/).filter(Boolean);
      const N = Math.min(120, this.words.length);
      const stride = Math.max(1, Math.floor(this.words.length / N));
      this.wave.innerHTML = '';
      this.bars = [];
      for (let i = 0; i < N; i++) {
        const b = document.createElement('span');
        b.className = 'audio-waveform-bar';
        const wordIdx = i * stride;
        const w = this.words[wordIdx] || '';
        const h = 8 + Math.min(28, (w.length * 3) + ((w.charCodeAt(0) || 0) % 14));
        b.style.height = h + 'px';
        this.wave.appendChild(b);
        this.bars.push(b);
      }
      this.setTime(0, this.words.length / 2.6);
      this.wave.addEventListener('click', (e) => this.scrub(e));
    }
    setTime(current, total) {
      const fmt = (s) => {
        s = Math.max(0, Math.floor(s));
        const m = Math.floor(s / 60);
        const ss = (s % 60).toString().padStart(2, '0');
        return m + ':' + ss;
      };
      this.time.textContent = fmt(current) + ' / ' + fmt(total);
    }
    bind() {
      this.btn.addEventListener('click', () => this.toggle());
      if (this.rate) {
        this.rate.addEventListener('click', () => {
          const speeds = [0.8, 1.0, 1.25, 1.5, 1.75];
          const idx = speeds.indexOf(this.rateValue);
          this.rateValue = speeds[(idx + 1) % speeds.length];
          this.rate.textContent = this.rateValue.toFixed(2) + '×';
          if (this.utter) { this.utter.rate = this.rateValue; }
        });
      }
    }
    toggle() {
      if (!this.synthSupported) return;
      if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
        window.speechSynthesis.pause();
        this.setPlaying(false);
      } else if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
        this.setPlaying(true);
      } else {
        this.play();
      }
    }
    play() {
      window.speechSynthesis.cancel();
      const paras = $$('p, h2, h3, li', this.article);
      const chunks = [];
      paras.forEach((p) => {
        const t = (p.textContent || '').trim();
        if (t && t.length > 1) chunks.push(t);
      });
      const text = chunks.join('. ');
      this.utter = new SpeechSynthesisUtterance(text);
      this.utter.rate = this.rateValue;
      this.utter.pitch = 1.0;
      this.utter.onstart = () => { this.setPlaying(true); this.startTick(); };
      this.utter.onend = () => { this.setPlaying(false); this.ticking = false; };
      this.utter.onerror = () => { this.setPlaying(false); this.ticking = false; };
      window.speechSynthesis.speak(this.utter);
    }
    setPlaying(on) {
      this.root.classList.toggle('is-playing', on);
      this.btn.innerHTML = on
        ? '<span class="audio-play-icon audio-play-icon-pause"></span>'
        : '<span class="audio-play-icon audio-play-icon-play"></span>';
      this.wave.classList.toggle('is-active', on);
    }
    startTick() {
      if (this.ticking) return;
      this.ticking = true;
      const total = this.words.length;
      const wpm = 150 * this.rateValue;
      const startT = performance.now();
      const tick = () => {
        if (!this.ticking) return;
        const elapsed = (performance.now() - startT) / 1000;
        const spoken = Math.min(total, (elapsed / 60) * wpm);
        const barIdx = Math.min(this.bars.length - 1, Math.floor((spoken / total) * this.bars.length));
        if (barIdx !== this.lastBar) {
          this.lastBar = barIdx;
          this.bars.forEach((b, i) => {
            b.classList.toggle('is-played', i < barIdx);
            b.classList.toggle('is-current', i === barIdx);
          });
        }
        const totalSec = (total / wpm) * 60;
        this.setTime(elapsed, totalSec);
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }
    scrub(e) {
      const rect = this.wave.getBoundingClientRect();
      const p = (e.clientX - rect.left) / rect.width;
      const barIdx = Math.floor(p * this.bars.length);
      this.bars.forEach((b, i) => {
        b.classList.toggle('is-played', i < barIdx);
        b.classList.toggle('is-current', i === barIdx);
      });
    }
  }

  class CodeHighlight {
    constructor() {
      this.blocks = $$('pre code[class*="language-"]');
      if (!this.blocks.length) return;
      this.load();
    }
    load() {
      if (window.Prism) { this.run(); return; }
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://cdn.jsdelivr.net/npm/prismjs@1.29.0/themes/prism-tomorrow.min.css';
      document.head.appendChild(link);
      const autoload = document.createElement('script');
      autoload.src = 'https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-core.min.js';
      autoload.onload = () => {
        const langs = ['markup', 'css', 'javascript', 'typescript', 'jsx', 'tsx', 'bash', 'json', 'yaml', 'go', 'python', 'sql', 'rust', 'markdown', 'docker', 'hcl'];
        Promise.all(langs.map((l) => new Promise((r) => {
          if (l === 'markup' || l === 'css') return r();
          const s = document.createElement('script');
          s.src = 'https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-' + l + '.min.js';
          s.onload = r; s.onerror = r;
          document.head.appendChild(s);
        }))).then(() => this.run());
      };
      document.head.appendChild(autoload);
    }
    run() {
      this.blocks.forEach((b) => {
        const lang = (b.className.match(/language-(\S+)/) || [])[1] || 'text';
        b.parentElement.setAttribute('data-lang', lang);
      });
      if (window.Prism) window.Prism.highlightAll();
    }
  }

  class PostReveal {
    constructor() {
      const els = $$('.post-article > p, .post-article > h2, .post-article > h3, .post-article > ul, .post-article > ol, .post-article > pre, .post-article > .post-callout, .post-article > .post-pullquote, .post-article > .post-figure, .post-article > .post-aside, .post-article > .post-defs, .post-article > hr');
      if (!els.length) return;
      els.forEach((el) => { el.style.opacity = '0'; el.style.transform = 'translateY(16px)'; el.style.transition = 'opacity 0.7s var(--ease-out-expo), transform 0.7s var(--ease-out-expo)'; });
      const io = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.style.opacity = '1';
            e.target.style.transform = 'none';
            io.unobserve(e.target);
          }
        });
      }, { threshold: 0.05, rootMargin: '0px 0px -8% 0px' });
      els.forEach((el) => io.observe(el));
    }
  }

  class PostInit {
    constructor() {
      new PostNav();
      new ReadingTime();
      new Toc();
      new AudioPlayer();
      new CodeHighlight();
      new PostReveal();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
