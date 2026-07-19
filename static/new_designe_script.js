/* ===================================================================
   SARKARI SHOOTING — Editorial Luxury Cinematography
   --------------------------------------------------
   Vanilla-JS animation framework. No external libs.
   =================================================================== */

/* ── Apply saved theme before paint (no flash) ── */
(function () {
  const saved = localStorage.getItem('ss-theme') || 'dark';
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

  if (splash) {
    /* brief brand mark on first visit of the session; skipped after */
    if (sessionStorage.getItem('ss-splash-seen')) {
      splash.classList.add('is-hidden');
    } else {
      sessionStorage.setItem('ss-splash-seen', '1');
      document.body.classList.add('is-splash-active');
      setTimeout(() => splash.classList.add('is-leaving'), 1800);
      setTimeout(() => {
        splash.classList.add('is-hidden');
        document.body.classList.remove('is-splash-active');
      }, 2600);
    }
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

    const setFrameVideo = (frame, playing) => {
      const video = frame.querySelector('video');
      if (!video) return;
      if (playing) {
        if (!video.dataset.userSound) video.muted = true; /* respect a visitor's unmute */
        video.play().catch(() => {});
      } else {
        video.pause();
      }
    };

    const jumpTo = (idx) => {
      setFrameVideo(heroFrames[activeIdx], false);
      heroFrames[activeIdx].classList.remove('is-active');
      pips[activeIdx].classList.remove('is-active');
      activeIdx = (idx + heroFrames.length) % heroFrames.length;
      heroFrames[activeIdx].classList.add('is-active');
      pips[activeIdx].classList.add('is-active');
      setFrameVideo(heroFrames[activeIdx], true);
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

    setFrameVideo(heroFrames[activeIdx], true); /* Safari can ignore autoplay attr */
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
     9a2. INSTAGRAM — click-to-load embeds in a lightbox
     ---------------------------------------------------------------
     The Instagram iframe is created ONLY when a card is clicked and
     destroyed on close, so embeds cost nothing at page load.
     =============================================================== */
  const igLightbox = document.getElementById('igLightbox');
  if (igLightbox) {
    const igFrame = document.getElementById('igLightboxFrame');

    const igOpen = (embedUrl) => {
      igLightbox.classList.add('is-open');
      igLightbox.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      const iframe = document.createElement('iframe');
      iframe.src = embedUrl;
      iframe.title = 'Instagram post';
      iframe.setAttribute('allowfullscreen', '');
      iframe.setAttribute('allow', 'autoplay; encrypted-media');
      igFrame.appendChild(iframe);
    };

    const igClose = () => {
      igLightbox.classList.remove('is-open');
      igLightbox.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      const iframe = igFrame.querySelector('iframe');
      if (iframe) iframe.remove(); /* stops playback, frees memory */
    };

    document.querySelectorAll('.ig-card[data-embed]').forEach((card) => {
      card.addEventListener('click', () => igOpen(card.dataset.embed));
    });

    /* in-card live previews — iframe src is set only when the card
       nears the viewport, so page load stays untouched */
    const liveFrames = document.querySelectorAll('iframe.ig-live[data-src]');
    if ('IntersectionObserver' in window) {
      const liveObs = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const frame = entry.target;
          frame.src = frame.dataset.src;
          frame.removeAttribute('data-src');
          liveObs.unobserve(frame);
        });
      }, { rootMargin: '400px 0px' });
      liveFrames.forEach((frame) => liveObs.observe(frame));
    } else {
      liveFrames.forEach((frame) => { frame.src = frame.dataset.src; });
    }
    igLightbox.querySelectorAll('[data-ig-close]').forEach((el) => el.addEventListener('click', igClose));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && igLightbox.classList.contains('is-open')) igClose();
    });
  }

  /* ===============================================================
     9a3. ENQUIRY POPUP — once per session, dwell or exit-intent
     =============================================================== */
  const enquiryPopup = document.getElementById('enquiryPopup');
  if (enquiryPopup && !sessionStorage.getItem('ss-popup-shown')) {
    let popupShown = false;
    let dwellTimer;

    const showPopup = () => {
      if (popupShown) return;
      popupShown = true;
      sessionStorage.setItem('ss-popup-shown', '1');
      clearTimeout(dwellTimer);
      enquiryPopup.classList.add('is-open');
      enquiryPopup.setAttribute('aria-hidden', 'false');
    };

    const hidePopup = () => {
      enquiryPopup.classList.remove('is-open');
      enquiryPopup.setAttribute('aria-hidden', 'true');
    };

    dwellTimer = setTimeout(showPopup, 12000);

    /* exit intent — cursor leaves through the top of the viewport */
    document.addEventListener('mouseout', (e) => {
      if (!e.relatedTarget && e.clientY <= 10) showPopup();
    });

    enquiryPopup.querySelectorAll('[data-popup-close]').forEach((el) => el.addEventListener('click', hidePopup));
    const popupCta = document.getElementById('enquiryPopupCta');
    if (popupCta) popupCta.addEventListener('click', hidePopup);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && enquiryPopup.classList.contains('is-open')) hidePopup();
    });
  }

  /* ===============================================================
     9a4. AMBIENT VIDEOS (CTA banner, service tiles) — start only
     when scrolled into view, pause when scrolled away
     =============================================================== */
  const ambientVideos = document.querySelectorAll('.cta-media-video, .tile-media-video');
  if (ambientVideos.length) {
    if ('IntersectionObserver' in window) {
      const ambientObs = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            if (!entry.target.dataset.userSound) entry.target.muted = true; /* silent unless visitor unmuted */
            entry.target.play().catch(() => {});
          } else {
            entry.target.pause();
          }
        });
      }, { rootMargin: '200px 0px' });
      ambientVideos.forEach((v) => ambientObs.observe(v));
    } else {
      ambientVideos.forEach((v) => { v.muted = true; v.play().catch(() => {}); });
    }
  }

  /* ===============================================================
     9a4b. SOUND TOGGLE — every autoplaying video gets a 🔇/🔊
     button; a click is the user gesture browsers require for audio
     =============================================================== */
  document.querySelectorAll('.tile-media-video, .cta-media-video, .hero-media-video').forEach((video) => {
    const host = video.parentElement;
    if (!host) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'vid-sound-btn';
    btn.setAttribute('aria-label', 'Unmute video');
    btn.innerHTML =
      '<svg class="snd-off" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8">' +
        '<path d="M11 5L6 9H3v6h3l5 4V5z"/><line x1="22" y1="9" x2="16" y2="15"/><line x1="16" y1="9" x2="22" y2="15"/></svg>' +
      '<svg class="snd-on" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8">' +
        '<path d="M11 5L6 9H3v6h3l5 4V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/></svg>';
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      video.muted = !video.muted;
      if (video.muted) {
        delete video.dataset.userSound;
      } else {
        video.dataset.userSound = '1';
        video.play().catch(() => {});
      }
      btn.classList.toggle('is-on', !video.muted);
      btn.setAttribute('aria-label', video.muted ? 'Unmute video' : 'Mute video');
    });
    host.appendChild(btn);
  });

  /* ===============================================================
     9a5. FILM DETAIL — gallery/video lightbox + hover previews
     =============================================================== */
  const filmLightbox = document.getElementById('filmLightbox');
  if (filmLightbox) {
    const flbMedia = document.getElementById('flbMedia');
    const flbCaption = document.getElementById('flbCaption');
    const flbCounter = document.getElementById('flbCounter');
    const flbPrev = document.getElementById('flbPrev');
    const flbNext = document.getElementById('flbNext');

    /* one collection per media type, in DOM order */
    const lbItems = { image: [], video: [] };
    document.querySelectorAll('[data-lb]').forEach((el) => {
      const type = el.dataset.lb;
      if (!lbItems[type]) return;
      el.dataset.lbIdx = lbItems[type].length;
      lbItems[type].push({ src: el.dataset.lbSrc, caption: el.dataset.lbCaption || '' });
    });

    let lbType = 'image';
    let lbIdx = 0;

    const renderLb = () => {
      const list = lbItems[lbType];
      const item = list[lbIdx];
      flbMedia.innerHTML = '';
      if (lbType === 'video') {
        const vid = document.createElement('video');
        vid.src = item.src;
        vid.controls = true;
        vid.autoplay = true;
        vid.playsInline = true;
        vid.muted = true; /* starts silent — viewer unmutes via controls */
        flbMedia.appendChild(vid);
      } else {
        const img = document.createElement('img');
        img.src = item.src;
        img.alt = item.caption;
        flbMedia.appendChild(img);
      }
      flbCaption.textContent = item.caption;
      flbCounter.textContent = list.length > 1 ? (lbIdx + 1) + ' / ' + list.length : '';
      const showNav = list.length > 1 ? '' : 'none';
      flbPrev.style.display = showNav;
      flbNext.style.display = showNav;
    };

    const openLb = (type, idx) => {
      lbType = type;
      lbIdx = idx;
      renderLb();
      filmLightbox.classList.add('is-open');
      filmLightbox.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    };

    const closeLb = () => {
      filmLightbox.classList.remove('is-open');
      filmLightbox.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      flbMedia.innerHTML = ''; /* stops any playing video */
    };

    const stepLb = (dir) => {
      const list = lbItems[lbType];
      lbIdx = (lbIdx + dir + list.length) % list.length;
      renderLb();
    };

    document.querySelectorAll('[data-lb]').forEach((el) => {
      const activate = () => openLb(el.dataset.lb, parseInt(el.dataset.lbIdx, 10) || 0);
      el.addEventListener('click', activate);
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(); }
      });
    });

    filmLightbox.querySelectorAll('[data-flb-close]').forEach((el) => el.addEventListener('click', closeLb));
    flbPrev.addEventListener('click', () => stepLb(-1));
    flbNext.addEventListener('click', () => stepLb(1));
    document.addEventListener('keydown', (e) => {
      if (!filmLightbox.classList.contains('is-open')) return;
      if (e.key === 'Escape') closeLb();
      if (e.key === 'ArrowLeft') stepLb(-1);
      if (e.key === 'ArrowRight') stepLb(1);
    });

    /* hover preview — video cards play muted while hovered */
    document.querySelectorAll('.film-video-item').forEach((card) => {
      const vid = card.querySelector('video');
      if (!vid) return;
      card.addEventListener('mouseenter', () => { vid.muted = true; vid.play().catch(() => {}); });
      card.addEventListener('mouseleave', () => { vid.pause(); vid.currentTime = 0.4; });
    });
  }

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
     19b. DEPTH & ATMOSPHERE — 3D tilt, hero parallax, cursor glow,
     film grain. Pure transforms, no libraries. Auto-disabled on
     touch devices and for prefers-reduced-motion.
     =============================================================== */
  const finePointer = window.matchMedia('(pointer: fine)').matches;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* — animated film grain overlay (all devices, imperceptibly cheap) — */
  if (!reducedMotion) {
    const grain = document.createElement('div');
    grain.className = 'film-grain';
    grain.setAttribute('aria-hidden', 'true');
    document.body.appendChild(grain);
  }

  if (finePointer && !reducedMotion) {
    /* — cursor glow: soft gold light that trails the pointer — */
    const glow = document.createElement('div');
    glow.className = 'cursor-glow';
    glow.setAttribute('aria-hidden', 'true');
    document.body.appendChild(glow);

    let glowX = window.innerWidth / 2, glowY = window.innerHeight / 3;
    let glowTX = glowX, glowTY = glowY;
    window.addEventListener('pointermove', (e) => { glowTX = e.clientX; glowTY = e.clientY; }, { passive: true });
    (function glowLoop() {
      glowX += (glowTX - glowX) * 0.1;
      glowY += (glowTY - glowY) * 0.1;
      glow.style.transform = 'translate3d(' + (glowX - 280) + 'px,' + (glowY - 280) + 'px,0)';
      requestAnimationFrame(glowLoop);
    })();

    /* — 3D tilt with gold glare on the site's card surfaces — */
    const TILT_MAX = 6; /* degrees */
    const tiltTargets = document.querySelectorAll(
      '.service-tile, .pricing-card, .ig-card, .portfolio-item, .review-card, .film-gallery-item, .film-video-item'
    );

    tiltTargets.forEach((el) => {
      el.classList.add('has-tilt');
      const glare = document.createElement('span');
      glare.className = 'tilt-glare';
      glare.setAttribute('aria-hidden', 'true');
      el.appendChild(glare);

      const s = { rx: 0, ry: 0, tx: 0, ty: 0, hover: false, raf: null };

      const tick = () => {
        s.rx += (s.tx - s.rx) * 0.16;
        s.ry += (s.ty - s.ry) * 0.16;
        const settled = Math.abs(s.rx - s.tx) < 0.03 && Math.abs(s.ry - s.ty) < 0.03;
        el.style.transform =
          'perspective(900px) rotateX(' + s.rx.toFixed(2) + 'deg) rotateY(' + s.ry.toFixed(2) + 'deg)' +
          (s.hover ? ' translateY(-6px)' : '');
        if (!settled || s.hover) {
          s.raf = requestAnimationFrame(tick);
        } else {
          s.raf = null;
          if (!s.hover) el.style.transform = ''; /* hand back to CSS */
        }
      };

      const start = () => { if (!s.raf) s.raf = requestAnimationFrame(tick); };

      el.addEventListener('pointerenter', () => { s.hover = true; start(); });
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const nx = (e.clientX - r.left) / r.width - 0.5;   /* -0.5 … 0.5 */
        const ny = (e.clientY - r.top) / r.height - 0.5;
        s.ty = nx * TILT_MAX * 2;
        s.tx = -ny * TILT_MAX * 2;
        el.style.setProperty('--mx', ((nx + 0.5) * 100).toFixed(1) + '%');
        el.style.setProperty('--my', ((ny + 0.5) * 100).toFixed(1) + '%');
      }, { passive: true });
      el.addEventListener('pointerleave', () => { s.hover = false; s.tx = 0; s.ty = 0; start(); });
    });

    /* — hero depth: text block leans gently toward the cursor — */
    const heroDepth = document.getElementById('heroSection');
    if (heroDepth) {
      let hx = 0, hy = 0, htx = 0, hty = 0, heroRaf = null;

      const heroTick = () => {
        hx += (htx - hx) * 0.08;
        hy += (hty - hy) * 0.08;
        const block = heroDepth.querySelector('.hero-frame.is-active .hero-text-block');
        if (block) {
          block.style.transform =
            'perspective(900px) rotateY(' + (hx * 2).toFixed(2) + 'deg) rotateX(' + (-hy * 2).toFixed(2) + 'deg)' +
            ' translate3d(' + (hx * 12).toFixed(1) + 'px,' + (hy * 9).toFixed(1) + 'px,0)';
        }
        if (Math.abs(hx - htx) > 0.002 || Math.abs(hy - hty) > 0.002) {
          heroRaf = requestAnimationFrame(heroTick);
        } else {
          heroRaf = null;
        }
      };

      const heroStart = () => { if (!heroRaf) heroRaf = requestAnimationFrame(heroTick); };

      heroDepth.addEventListener('pointermove', (e) => {
        const r = heroDepth.getBoundingClientRect();
        htx = (e.clientX - r.left) / r.width - 0.5;
        hty = (e.clientY - r.top) / r.height - 0.5;
        heroStart();
      }, { passive: true });
      heroDepth.addEventListener('pointerleave', () => { htx = 0; hty = 0; heroStart(); });
    }
  }

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
