/* ── Theme: apply saved preference before paint ── */
(function() {
  const saved = localStorage.getItem('ss-theme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);
})();

document.addEventListener('DOMContentLoaded', () => {

  /* ── Countdown (ISO date from template) ── */
  function initCountdown() {
    const root = document.getElementById('heroCountdown');
    if (!root) return;
    const iso = root.dataset.countdownTarget;
    if (!iso) return;

    const dEl = document.getElementById('cdDays');
    const hEl = document.getElementById('cdHours');
    const mEl = document.getElementById('cdMins');
    const sEl = document.getElementById('cdSecs');
    if (!dEl || !hEl || !mEl || !sEl) return;

    const targetMs = Date.parse(iso);
    if (Number.isNaN(targetMs)) return;

    function tick() {
      let diff = targetMs - Date.now();
      if (diff <= 0) {
        dEl.textContent = '00';
        hEl.textContent = '00';
        mEl.textContent = '00';
        sEl.textContent = '00';
        root.setAttribute('aria-label', 'Event time reached');
        return;
      }
      const secs = Math.floor(diff / 1000);
      const dd = Math.floor(secs / 86400);
      const hh = Math.floor((secs % 86400) / 3600);
      const mm = Math.floor((secs % 3600) / 60);
      const ss = secs % 60;
      const pad = (n) => String(n).padStart(2, '0');
      dEl.textContent = pad(Math.min(dd, 99));
      hEl.textContent = pad(hh);
      mEl.textContent = pad(mm);
      sEl.textContent = pad(ss);
    }

    tick();
    setInterval(tick, 1000);
  }

  initCountdown();

  /* ── Staggered section children ── */
  document.querySelectorAll('[data-stagger]').forEach((block) => {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const parent = entry.target;
          parent.classList.add('is-revealed');
          [...parent.children].forEach((child, i) => {
            child.style.transitionDelay = `${i * 0.09}s`;
          });
          io.unobserve(parent);
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -32px 0px' }
    );
    io.observe(block);
  });

  /* ── Hero title: stagger words on active slide ── */
  function resetHeroTitlesToPlainText() {
    document.querySelectorAll('.hero-frame .js-hero-title').forEach((el) => {
      if (el.dataset.fullText) {
        el.textContent = el.dataset.fullText;
      }
    });
  }

  function animateActiveHeroTitle() {
    resetHeroTitlesToPlainText();
    const active = document.querySelector('.hero-frame.is-active .js-hero-title');
    if (!active) return;
    if (!active.dataset.fullText) {
      active.dataset.fullText = active.textContent.trim();
    }
    const words = active.dataset.fullText.split(/\s+/).filter(Boolean);
    active.innerHTML = words
      .map(
        (w, i) =>
          `<span class="hero-title-word" style="animation-delay:${0.08 + i * 0.11}s">${w}</span>`
      )
      .join(' ');
  }

  /* ── Theme Toggle ── */
  function switchTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('ss-theme', next);
  }

  document.querySelectorAll('#themeToggle, #themeToggleMobile').forEach(btn => {
    btn.addEventListener('click', switchTheme);
  });

  /* ── Preloader ── */
  const loader = document.getElementById('ssPreloader');
  if (loader) {
    window.addEventListener('load', () => {
      setTimeout(() => loader.classList.add('is-hidden'), 500);
    });
    setTimeout(() => loader.classList.add('is-hidden'), 2800);
  }

  /* ── Sticky Navigation ── */
  const nav = document.getElementById('ssNav');
  if (nav) {
    const checkSticky = () => nav.classList.toggle('is-sticky', window.scrollY > 50);
    window.addEventListener('scroll', checkSticky, { passive: true });
    checkSticky();
  }

  /* ── Mobile Menu ── */
  const burger = document.getElementById('ssBurger');
  const mobileMenu = document.getElementById('ssMobileMenu');
  if (burger && mobileMenu) {
    const mobileAnchors = mobileMenu.querySelectorAll('a');
    burger.addEventListener('click', () => {
      burger.classList.toggle('is-open');
      mobileMenu.classList.toggle('is-visible');
      document.body.style.overflow = mobileMenu.classList.contains('is-visible') ? 'hidden' : '';
    });
    mobileAnchors.forEach(link => {
      link.addEventListener('click', () => {
        burger.classList.remove('is-open');
        mobileMenu.classList.remove('is-visible');
        document.body.style.overflow = '';
      });
    });
  }

  /* ── Hero Slideshow ── */
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

    function jumpTo(idx) {
      heroFrames[activeIdx].classList.remove('is-active');
      pips[activeIdx].classList.remove('is-active');
      activeIdx = (idx + heroFrames.length) % heroFrames.length;
      heroFrames[activeIdx].classList.add('is-active');
      pips[activeIdx].classList.add('is-active');
      restartAuto();
      animateActiveHeroTitle();
    }

    function restartAuto() {
      clearInterval(autoTimer);
      autoTimer = setInterval(() => jumpTo(activeIdx + 1), 6500);
    }

    const prevBtn = document.querySelector('.hero-prev-btn');
    const nextBtn = document.querySelector('.hero-next-btn');
    if (prevBtn) prevBtn.addEventListener('click', () => jumpTo(activeIdx - 1));
    if (nextBtn) nextBtn.addEventListener('click', () => jumpTo(activeIdx + 1));

    restartAuto();
  }

  /* ── Portfolio Tabs ── */
  const filterChips = document.querySelectorAll('.filter-chip');
  const galleryPanels = document.querySelectorAll('.gallery-panel');
  filterChips.forEach(chip => {
    chip.addEventListener('click', () => {
      filterChips.forEach(c => c.classList.remove('is-selected'));
      galleryPanels.forEach(p => p.classList.remove('is-shown'));
      chip.classList.add('is-selected');
      const target = document.querySelector(`[data-gallery="${chip.dataset.filter}"]`);
      if (target) target.classList.add('is-shown');
    });
  });

  /* ── Testimonials Carousel ── */
  const ribbon = document.getElementById('testimonialRibbon');
  const prevArrow = document.getElementById('testimPrev');
  const nextArrow = document.getElementById('testimNext');
  if (ribbon) {
    let scrollPos = 0;

    function cardStep() {
      const card = ribbon.querySelector('.review-card');
      if (!card) return 410;
      const gap = parseInt(window.getComputedStyle(ribbon).gap) || 32;
      return card.offsetWidth + gap;
    }

    function maxDrift() {
      return Math.max(0, ribbon.scrollWidth - ribbon.parentElement.offsetWidth);
    }

    function shift(dir) {
      const step = cardStep();
      scrollPos = Math.min(Math.max(scrollPos + dir * step, 0), maxDrift());
      ribbon.style.transform = `translateX(-${scrollPos}px)`;
    }

    if (prevArrow) prevArrow.addEventListener('click', () => shift(-1));
    if (nextArrow) nextArrow.addEventListener('click', () => shift(1));

    let dragging = false, startX = 0, startPos = 0;

    ribbon.addEventListener('mousedown', e => {
      dragging = true; startX = e.pageX; startPos = scrollPos;
      ribbon.classList.add('is-dragging');
    });

    window.addEventListener('mousemove', e => {
      if (!dragging) return;
      scrollPos = Math.min(Math.max(startPos + (startX - e.pageX), 0), maxDrift());
      ribbon.style.transform = `translateX(-${scrollPos}px)`;
    });

    window.addEventListener('mouseup', () => { dragging = false; ribbon.classList.remove('is-dragging'); });

    ribbon.addEventListener('touchstart', e => {
      dragging = true; startX = e.touches[0].pageX; startPos = scrollPos;
    }, { passive: true });

    window.addEventListener('touchmove', e => {
      if (!dragging) return;
      scrollPos = Math.min(Math.max(startPos + (startX - e.touches[0].pageX), 0), maxDrift());
      ribbon.style.transform = `translateX(-${scrollPos}px)`;
    }, { passive: true });

    window.addEventListener('touchend', () => { dragging = false; });
  }

  /* ── Counter Animation ── */
  const statNumbers = document.querySelectorAll('.stat-number');
  let counterDone = false;

  function animateCounters() {
    if (counterDone) return;
    statNumbers.forEach(el => {
      const target = parseInt(el.dataset.count, 10);
      const suffix = el.dataset.suffix || '';
      let current = 0;
      const increment = Math.ceil(target / 60);
      const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
          current = target;
          clearInterval(timer);
        }
        el.textContent = current + suffix;
      }, 25);
    });
    counterDone = true;
  }

  const statsSection = document.querySelector('.ss-stats');
  if (statsSection) {
    const statsObs = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) { animateCounters(); statsObs.unobserve(entry.target); }
      });
    }, { threshold: 0.3 });
    statsObs.observe(statsSection);
  }

  /* ── Scroll Reveal ── */
  const revealItems = document.querySelectorAll('[data-animate]');
  const revealObs = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        revealObs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  revealItems.forEach(el => revealObs.observe(el));

  /* ── CTA Parallax ── */
  const ctaBanner = document.querySelector('.ss-cta-banner');
  if (ctaBanner) {
    const ctaImage = ctaBanner.querySelector('img');
    window.addEventListener('scroll', () => {
      const rect = ctaBanner.getBoundingClientRect();
      const vh = window.innerHeight;
      if (rect.top < vh && rect.bottom > 0) {
        const progress = (vh - rect.top) / (vh + rect.height);
        ctaImage.style.transform = `translateY(${(progress - 0.5) * 55}px)`;
      }
    }, { passive: true });
  }

  /* ── Contact Form: loading state on POST + client fallback ── */
  const enquiryForms = document.querySelectorAll('.enquiry-form, .contact-form-grid');
  enquiryForms.forEach((form) => {
    form.addEventListener('submit', (e) => {
      const btn = form.querySelector('.solid-btn--submit') || form.querySelector('.solid-btn');
      if (form.method.toLowerCase() === 'post' && form.action) {
        if (btn) btn.classList.add('is-loading');
        return;
      }
      e.preventDefault();
      if (!btn) return;
      const label = btn.querySelector('.btn-label');
      const orig = label ? label.textContent : btn.textContent;
      if (label) label.textContent = 'Thank You!';
      else btn.textContent = 'Thank You!';
      btn.style.pointerEvents = 'none';
      setTimeout(() => {
        if (label) label.textContent = orig;
        else btn.textContent = orig;
        btn.style.pointerEvents = '';
        form.reset();
      }, 2500);
    });
  });

  /* ── Smooth Scroll ── */
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', e => {
      const target = document.querySelector(anchor.getAttribute('href'));
      if (target) { e.preventDefault(); target.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    });
  });

  animateActiveHeroTitle();

});
