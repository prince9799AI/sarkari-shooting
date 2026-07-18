/* ===================================================================
   SARKARI SHOOTING — Editorial Luxury Cinematography
   --------------------------------------------------
   Vanilla-JS animation framework. No external libs.
   =================================================================== */

/* ── Apply saved theme before paint (no flash) ── */
(function () {
  const saved = localStorage.getItem('ss-theme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);
})();

/* small motion helper: cubic ease-out for counters */
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

document.addEventListener('DOMContentLoaded', () => {

  /* ===============================================================
     1. THEME TOGGLE
     =============================================================== */
  const switchTheme = () => {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('ss-theme', next);
  };

  document.querySelectorAll('#themeToggle, #themeToggleMobile').forEach((btn) => {
    btn.addEventListener('click', switchTheme);
  });

  /* ===============================================================
     2. SPLASH / FLASH SCREEN
     ---------------------------------------------------------------
     - Falling petals generated dynamically (no extra DOM in template)
     - Ring loader only (no spinner fallback)
     - Sequence: rings → monogram → line → name → tagline → cue
     - Exits at ~3.6s with scale-fade
     =============================================================== */
  const splash = document.getElementById('ssSplash');
  const petalsHost = document.getElementById('splashPetals');

  const renderPetals = () => {
    if (!petalsHost) return;
    const palette = [
      'var(--blush)',
      'var(--blush-deep)',
      'var(--champagne)',
      'var(--gold-soft)'
    ];
    const count = 22;
    for (let i = 0; i < count; i++) {
      const petal = document.createElement('span');
      petal.className = 'petal';
      const size = 5 + Math.random() * 9;
      petal.style.left = Math.random() * 100 + 'vw';
      petal.style.width = size + 'px';
      petal.style.height = size * 1.4 + 'px';
      petal.style.background = palette[Math.floor(Math.random() * palette.length)];
      petal.style.animationDuration = 5 + Math.random() * 6 + 's';
      petal.style.animationDelay = Math.random() * 4 + 's';
      petal.style.opacity = (0.4 + Math.random() * 0.4).toFixed(2);
      petalsHost.appendChild(petal);
    }
  };

  if (splash) {
    document.body.classList.add('is-splash-active');
    renderPetals();
    setTimeout(() => splash.classList.add('is-leaving'), 3500);
    setTimeout(() => {
      splash.classList.add('is-hidden');
      document.body.classList.remove('is-splash-active');
    }, 4400);
  }

  /* ===============================================================
     3. SCROLL PROGRESS BAR (top of page)
     =============================================================== */
  const progressBar = document.getElementById('scrollProgress');
  const updateProgress = () => {
    if (!progressBar) return;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const pct = max > 0 ? (window.scrollY / max) * 100 : 0;
    progressBar.style.width = pct + '%';
  };
  window.addEventListener('scroll', updateProgress, { passive: true });
  updateProgress();

  /* ===============================================================
     5. STICKY + AUTO-HIDE NAVIGATION
     =============================================================== */
  const nav = document.getElementById('ssNav');
  if (nav) {
    let lastY = window.scrollY;
    let ticking = false;
    const updateNav = () => {
      const y = window.scrollY;
      nav.classList.toggle('is-sticky', y > 50);
      if (y > 280 && y > lastY + 4) {
        nav.classList.add('is-hidden');
      } else if (y < lastY - 4 || y < 280) {
        nav.classList.remove('is-hidden');
      }
      lastY = y;
      ticking = false;
    };
    window.addEventListener('scroll', () => {
      if (!ticking) { requestAnimationFrame(updateNav); ticking = true; }
    }, { passive: true });
    updateNav();
  }

  /* ===============================================================
     6. MOBILE MENU
     =============================================================== */
  const burger = document.getElementById('ssBurger');
  const mobileMenu = document.getElementById('ssMobileMenu');
  if (burger && mobileMenu) {
    const mobileAnchors = mobileMenu.querySelectorAll('a');
    const toggle = () => {
      const open = !burger.classList.contains('is-open');
      burger.classList.toggle('is-open', open);
      mobileMenu.classList.toggle('is-visible', open);
      burger.setAttribute('aria-expanded', String(open));
      mobileMenu.setAttribute('aria-hidden', String(!open));
      document.body.style.overflow = open ? 'hidden' : '';
    };
    burger.addEventListener('click', toggle);
    mobileAnchors.forEach((link) => link.addEventListener('click', () => {
      if (burger.classList.contains('is-open')) toggle();
    }));
  }

  /* ===============================================================
     7. HERO SLIDESHOW
     =============================================================== */
  const heroFrames = document.querySelectorAll('.hero-frame');
  const pagination = document.getElementById('heroPagination');
  if (heroFrames.length && pagination) {
    let activeIdx = 0;
    let autoTimer;

    heroFrames.forEach((_, i) => {
      const pip = document.createElement('span');
      pip.classList.add('pip');
      if (i === 0) pip.classList.add('is-active');
      pip.addEventListener('click', () => jumpTo(i));
      pagination.appendChild(pip);
    });

    const pips = pagination.querySelectorAll('.pip');

    const jumpTo = (idx) => {
      heroFrames[activeIdx].classList.remove('is-active');
      pips[activeIdx].classList.remove('is-active');
      activeIdx = (idx + heroFrames.length) % heroFrames.length;
      heroFrames[activeIdx].classList.add('is-active');
      pips[activeIdx].classList.add('is-active');
      runHeroLetterReveal(heroFrames[activeIdx].querySelector('[data-letter-reveal]'));
      restartAuto();
    };

    const restartAuto = () => {
      clearInterval(autoTimer);
      autoTimer = setInterval(() => jumpTo(activeIdx + 1), 6500);
    };

    const prevBtn = document.querySelector('.hero-prev-btn');
    const nextBtn = document.querySelector('.hero-next-btn');
    if (prevBtn) prevBtn.addEventListener('click', () => jumpTo(activeIdx - 1));
    if (nextBtn) nextBtn.addEventListener('click', () => jumpTo(activeIdx + 1));

    restartAuto();
  }

  /* ===============================================================
     8. HERO TITLE — PER-LETTER REVEAL
     ---------------------------------------------------------------
     Replaces a heading's text with span.ltr per glyph,
     then stagger-animates each letter via CSS.
     =============================================================== */
  function runHeroLetterReveal(target) {
    if (!target) return;
    const original = target.dataset.lrOriginal || target.textContent.trim();
    target.dataset.lrOriginal = original;
    target.innerHTML = '';
    const letters = original.split('');
    letters.forEach((ch, i) => {
      const span = document.createElement('span');
      span.className = 'ltr';
      span.textContent = ch === ' ' ? '\u00A0' : ch;
      span.style.animationDelay = (0.9 + i * 0.035) + 's';
      target.appendChild(span);
    });
  }
  document.querySelectorAll('.hero-frame.is-active [data-letter-reveal]').forEach(runHeroLetterReveal);

  /* ===============================================================
     9. PORTFOLIO FILTER
     =============================================================== */
  const filterChips = document.querySelectorAll('.filter-chip');
  const galleryPanels = document.querySelectorAll('.gallery-panel');
  filterChips.forEach((chip) => {
    chip.addEventListener('click', () => {
      filterChips.forEach((c) => c.classList.remove('is-selected'));
      galleryPanels.forEach((p) => p.classList.remove('is-shown'));
      chip.classList.add('is-selected');
      const target = document.querySelector(`[data-gallery="${chip.dataset.filter}"]`);
      if (target) target.classList.add('is-shown');
    });
  });

  /* ===============================================================
     9b. PRICING — Photography / Cinematography tier toggle
     =============================================================== */
  const pricingToggleBtns = document.querySelectorAll('.pricing-toggle-btn');
  const pricingCards = document.querySelectorAll('.pricing-card');
  if (pricingToggleBtns.length && pricingCards.length) {
    pricingToggleBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const tier = btn.dataset.tier;
        pricingToggleBtns.forEach((b) => b.classList.remove('is-selected'));
        btn.classList.add('is-selected');
        pricingCards.forEach((card) => {
          card.classList.toggle('is-hidden', card.dataset.tier !== tier);
        });
      });
    });
  }

  /* ===============================================================
     10. TESTIMONIALS — drag + arrows
     =============================================================== */
  const ribbon = document.getElementById('testimonialRibbon');
  const prevArrow = document.getElementById('testimPrev');
  const nextArrow = document.getElementById('testimNext');
  if (ribbon) {
    let scrollPos = 0;

    const cardStep = () => {
      const card = ribbon.querySelector('.review-card');
      if (!card) return 410;
      const gap = parseInt(window.getComputedStyle(ribbon).gap, 10) || 32;
      return card.offsetWidth + gap;
    };

    const maxDrift = () => Math.max(0, ribbon.scrollWidth - ribbon.parentElement.offsetWidth);

    const shift = (dir) => {
      const step = cardStep();
      scrollPos = Math.min(Math.max(scrollPos + dir * step, 0), maxDrift());
      ribbon.style.transform = `translateX(-${scrollPos}px)`;
    };

    if (prevArrow) prevArrow.addEventListener('click', () => shift(-1));
    if (nextArrow) nextArrow.addEventListener('click', () => shift(1));

    let dragging = false;
    let startX = 0;
    let startPos = 0;

    ribbon.addEventListener('mousedown', (e) => {
      dragging = true; startX = e.pageX; startPos = scrollPos;
      ribbon.classList.add('is-dragging');
    });

    window.addEventListener('mousemove', (e) => {
      if (!dragging) return;
      scrollPos = Math.min(Math.max(startPos + (startX - e.pageX), 0), maxDrift());
      ribbon.style.transform = `translateX(-${scrollPos}px)`;
    });

    window.addEventListener('mouseup', () => {
      dragging = false; ribbon.classList.remove('is-dragging');
    });

    ribbon.addEventListener('touchstart', (e) => {
      dragging = true; startX = e.touches[0].pageX; startPos = scrollPos;
    }, { passive: true });

    window.addEventListener('touchmove', (e) => {
      if (!dragging) return;
      scrollPos = Math.min(Math.max(startPos + (startX - e.touches[0].pageX), 0), maxDrift());
      ribbon.style.transform = `translateX(-${scrollPos}px)`;
    }, { passive: true });

    window.addEventListener('touchend', () => { dragging = false; });
  }

  /* ===============================================================
     11. SMOOTH-EASED COUNTERS (with gold flash on completion)
     =============================================================== */
  const statCells = document.querySelectorAll('.stat-cell');
  let counterDone = false;

  const animateCounters = () => {
    if (counterDone) return;
    counterDone = true;
    statCells.forEach((cell) => {
      const el = cell.querySelector('.stat-number');
      if (!el) return;
      const target = parseInt(el.dataset.count, 10) || 0;
      const suffix = el.dataset.suffix || '';
      const duration = 1800;
      const start = performance.now();
      const tick = (now) => {
        const t = Math.min(1, (now - start) / duration);
        const value = Math.round(target * easeOutCubic(t));
        el.textContent = value + suffix;
        if (t < 1) {
          requestAnimationFrame(tick);
        } else {
          cell.classList.add('is-counted');
          setTimeout(() => cell.classList.remove('is-counted'), 900);
        }
      };
      requestAnimationFrame(tick);
    });
  };

  const statsSection = document.querySelector('.ss-stats');
  if (statsSection) {
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) { animateCounters(); obs.unobserve(entry.target); }
      });
    }, { threshold: 0.3 });
    obs.observe(statsSection);
  }

  /* ===============================================================
     12. SCROLL REVEAL — Intersection Observer framework
     ---------------------------------------------------------------
     Supports:
       data-reveal="fade-up | fade | slide-left | slide-right | scale-in | stagger"
       data-delay="120"      (ms — applied to root)
       data-stagger="0.12"   (seconds — applied to children when reveal="stagger")
     Plus legacy data-animate (kept working).
     =============================================================== */
  const revealEls = document.querySelectorAll('[data-animate], [data-reveal]');

  const revealObs = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const delay = parseInt(el.dataset.delay, 10) || 0;
      el.style.transitionDelay = delay + 'ms';

      if (el.getAttribute('data-reveal') === 'stagger') {
        const stagger = parseFloat(el.dataset.stagger) || 0.12;
        const children = el.querySelectorAll('[data-reveal-child]');
        const childList = children.length ? children : el.children;
        Array.from(childList).forEach((child, i) => {
          child.style.transitionDelay = (delay + i * stagger * 1000) + 'ms';
        });
      }

      el.classList.add('is-visible');
      revealObs.unobserve(el);
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -50px 0px' });

  revealEls.forEach((el) => revealObs.observe(el));

  /* ===============================================================
     13. ACTIVE NAV LINK — Section spy
     =============================================================== */
  const navLinks = document.querySelectorAll('.nav-menu a[href^="#"]');
  const sectionMap = new Map();
  navLinks.forEach((link) => {
    const id = link.getAttribute('href').slice(1);
    const section = document.getElementById(id);
    if (section) sectionMap.set(section, link);
  });

  if (sectionMap.size) {
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const link = sectionMap.get(entry.target);
        if (!link) return;
        if (entry.isIntersecting) {
          navLinks.forEach((l) => l.classList.remove('is-active'));
          link.classList.add('is-active');
        }
      });
    }, { rootMargin: '-40% 0px -55% 0px', threshold: 0 });
    sectionMap.forEach((_, section) => spy.observe(section));
  }

  /* ===============================================================
     14. CTA PARALLAX BANNER (smoother)
     =============================================================== */
  const ctaBanner = document.querySelector('.ss-cta-banner');
  if (ctaBanner) {
    const ctaImage = ctaBanner.querySelector('img');
    let parallaxTick = false;
    const runParallax = () => {
      const rect = ctaBanner.getBoundingClientRect();
      const vh = window.innerHeight;
      if (rect.top < vh && rect.bottom > 0) {
        const progress = (vh - rect.top) / (vh + rect.height);
        ctaImage.style.transform = `translateY(${(progress - 0.5) * 70}px) scale(1.04)`;
      }
      parallaxTick = false;
    };
    window.addEventListener('scroll', () => {
      if (!parallaxTick) { requestAnimationFrame(runParallax); parallaxTick = true; }
    }, { passive: true });
    runParallax();
  }

  /* ===============================================================
     15. PROCESS-TIMELINE — gold line draws as user scrolls through
     =============================================================== */
  const processSection = document.querySelector('.ss-process');
  const processProgress = document.getElementById('processProgress');
  if (processSection && processProgress) {
    const drawProgress = () => {
      const rect = processSection.getBoundingClientRect();
      const vh = window.innerHeight;
      const total = rect.height + vh * 0.6;
      const seen = Math.min(Math.max(vh - rect.top, 0), total);
      const pct = (seen / total) * 100;
      processProgress.style.width = `calc(${Math.max(0, Math.min(75, pct - 5))}% )`;
    };
    window.addEventListener('scroll', drawProgress, { passive: true });
    window.addEventListener('resize', drawProgress);
    drawProgress();
  }

  /* ===============================================================
     16. MAGNETIC CTA HOVER (desktop pointer only)
     =============================================================== */
  const isCoarsePointer = window.matchMedia('(pointer: coarse)').matches;
  if (!isCoarsePointer) {
    document.querySelectorAll('[data-magnetic]').forEach((el) => {
      el.style.transition = (el.style.transition || '') + ', transform 0.35s cubic-bezier(0.16,1,0.3,1)';
      el.addEventListener('mousemove', (e) => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
        const y = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
        const intensity = 10;
        el.style.transform = `translate(${x * intensity}px, ${y * intensity}px)`;
      });
      el.addEventListener('mouseleave', () => { el.style.transform = ''; });
    });
  }

  /* ===============================================================
     17. HIDE HERO SCROLL CUE AFTER SCROLLING PAST IT
     =============================================================== */
  const scrollCue = document.querySelector('.hero-scroll-cue');
  if (scrollCue) {
    window.addEventListener('scroll', () => {
      scrollCue.classList.toggle('is-hidden', window.scrollY > 140);
    }, { passive: true });
  }

  /* ===============================================================
     18. BACK TO TOP BUTTON
     =============================================================== */
  const backToTop = document.getElementById('backToTop');
  if (backToTop) {
    const toggle = () => backToTop.classList.toggle('is-visible', window.scrollY > 600);
    window.addEventListener('scroll', toggle, { passive: true });
    backToTop.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    toggle();
  }

  /* ===============================================================
     19. ENQUIRY FORM — submit feedback (client-side fallback)
     =============================================================== */
  document.querySelectorAll('.enquiry-form, .contact-form-grid').forEach((form) => {
    form.addEventListener('submit', (e) => {
      if (form.method && form.method.toLowerCase() === 'post' && form.action) return;
      e.preventDefault();
      const btn = form.querySelector('.solid-btn');
      if (!btn) return;
      const original = btn.textContent;
      btn.textContent = 'Sending…';
      btn.style.pointerEvents = 'none';
      setTimeout(() => {
        btn.textContent = '✓  Thank You';
        setTimeout(() => {
          btn.textContent = original;
          btn.style.pointerEvents = '';
          form.reset();
        }, 2200);
      }, 700);
    });
  });

  /* ===============================================================
     20. SMOOTH ANCHOR SCROLL (offset for sticky nav)
     =============================================================== */
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', (e) => {
      const hash = anchor.getAttribute('href');
      if (hash.length < 2) return;
      const target = document.querySelector(hash);
      if (!target) return;
      e.preventDefault();
      const navH = nav ? nav.offsetHeight : 0;
      const y = target.getBoundingClientRect().top + window.scrollY - navH + 4;
      window.scrollTo({ top: y, behavior: 'smooth' });
    });
  });

});
