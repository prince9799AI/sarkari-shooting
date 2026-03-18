/* ============================================
   THE WEDDING FILMER — INTERACTIONS
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {

  /* --- Preloader --- */
  const preloader = document.getElementById('preloader');
  window.addEventListener('load', () => {
    setTimeout(() => preloader.classList.add('hidden'), 600);
  });
  setTimeout(() => preloader.classList.add('hidden'), 3000);

  /* --- Header scroll state --- */
  const header = document.getElementById('siteHeader');
  const onScroll = () => {
    header.classList.toggle('scrolled', window.scrollY > 60);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* --- Mobile menu --- */
  const menuToggle = document.getElementById('menuToggle');
  const mobileOverlay = document.getElementById('mobileOverlay');
  const mobileLinks = mobileOverlay.querySelectorAll('a');

  menuToggle.addEventListener('click', () => {
    menuToggle.classList.toggle('active');
    mobileOverlay.classList.toggle('open');
    document.body.style.overflow = mobileOverlay.classList.contains('open') ? 'hidden' : '';
  });

  mobileLinks.forEach(link => {
    link.addEventListener('click', () => {
      menuToggle.classList.remove('active');
      mobileOverlay.classList.remove('open');
      document.body.style.overflow = '';
    });
  });

  /* --- Hero Slider --- */
  const slides = document.querySelectorAll('.hero-slide');
  const dotsContainer = document.getElementById('heroDots');
  let currentSlide = 0;
  let heroInterval;

  slides.forEach((_, i) => {
    const dot = document.createElement('span');
    dot.classList.add('dot');
    if (i === 0) dot.classList.add('active');
    dot.addEventListener('click', () => goToSlide(i));
    dotsContainer.appendChild(dot);
  });

  const dots = dotsContainer.querySelectorAll('.dot');

  function goToSlide(idx) {
    slides[currentSlide].classList.remove('active');
    dots[currentSlide].classList.remove('active');
    currentSlide = (idx + slides.length) % slides.length;
    slides[currentSlide].classList.add('active');
    dots[currentSlide].classList.add('active');
    resetHeroTimer();
  }

  function resetHeroTimer() {
    clearInterval(heroInterval);
    heroInterval = setInterval(() => goToSlide(currentSlide + 1), 6000);
  }

  document.querySelector('.hero-prev').addEventListener('click', () => goToSlide(currentSlide - 1));
  document.querySelector('.hero-next').addEventListener('click', () => goToSlide(currentSlide + 1));

  resetHeroTimer();

  /* --- Tabs --- */
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabPanels = document.querySelectorAll('.tab-panel');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      tabPanels.forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      const targetPanel = document.querySelector(`[data-panel="${btn.dataset.tab}"]`);
      if (targetPanel) targetPanel.classList.add('active');
    });
  });

  /* --- Music Player --- */
  const trackRows = document.querySelectorAll('.track-row');
  let currentAudio = null;
  let currentBtn = null;

  trackRows.forEach(row => {
    const audio = row.querySelector('.track-audio');
    const btn = row.querySelector('.track-play-btn');

    btn.addEventListener('click', () => {
      if (currentAudio && currentAudio !== audio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
        currentBtn.classList.remove('playing');
      }

      if (audio.paused) {
        audio.play();
        btn.classList.add('playing');
        currentAudio = audio;
        currentBtn = btn;
      } else {
        audio.pause();
        btn.classList.remove('playing');
        currentAudio = null;
        currentBtn = null;
      }
    });

    audio.addEventListener('ended', () => {
      btn.classList.remove('playing');
      currentAudio = null;
      currentBtn = null;
    });
  });

  /* --- Testimonials Carousel (drag + buttons) --- */
  const voiceTrack = document.getElementById('voiceTrack');
  const voicesPrev = document.getElementById('voicesPrev');
  const voicesNext = document.getElementById('voicesNext');
  let voicePos = 0;

  function getCardWidth() {
    const card = voiceTrack.querySelector('.voice-card');
    if (!card) return 400;
    const style = window.getComputedStyle(voiceTrack);
    const gap = parseInt(style.gap) || 32;
    return card.offsetWidth + gap;
  }

  function getMaxScroll() {
    return Math.max(0, voiceTrack.scrollWidth - voiceTrack.parentElement.offsetWidth);
  }

  function moveVoices(dir) {
    const step = getCardWidth();
    const max = getMaxScroll();
    voicePos = Math.min(Math.max(voicePos + dir * step, 0), max);
    voiceTrack.style.transform = `translateX(-${voicePos}px)`;
  }

  voicesPrev.addEventListener('click', () => moveVoices(-1));
  voicesNext.addEventListener('click', () => moveVoices(1));

  // Drag support
  let isDragging = false;
  let dragStart = 0;
  let dragOffset = 0;

  voiceTrack.addEventListener('mousedown', e => {
    isDragging = true;
    dragStart = e.pageX;
    dragOffset = voicePos;
    voiceTrack.classList.add('dragging');
  });

  window.addEventListener('mousemove', e => {
    if (!isDragging) return;
    const diff = dragStart - e.pageX;
    const max = getMaxScroll();
    voicePos = Math.min(Math.max(dragOffset + diff, 0), max);
    voiceTrack.style.transform = `translateX(-${voicePos}px)`;
  });

  window.addEventListener('mouseup', () => {
    isDragging = false;
    voiceTrack.classList.remove('dragging');
  });

  // Touch support
  voiceTrack.addEventListener('touchstart', e => {
    isDragging = true;
    dragStart = e.touches[0].pageX;
    dragOffset = voicePos;
  }, { passive: true });

  window.addEventListener('touchmove', e => {
    if (!isDragging) return;
    const diff = dragStart - e.touches[0].pageX;
    const max = getMaxScroll();
    voicePos = Math.min(Math.max(dragOffset + diff, 0), max);
    voiceTrack.style.transform = `translateX(-${voicePos}px)`;
  }, { passive: true });

  window.addEventListener('touchend', () => { isDragging = false; });

  /* --- Scroll Reveal --- */
  const revealElements = document.querySelectorAll('[data-reveal]');
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

  revealElements.forEach(el => revealObserver.observe(el));

  /* --- Parallax CTA Image --- */
  const ctaSection = document.querySelector('.cta-parallax');
  if (ctaSection) {
    const ctaImg = ctaSection.querySelector('img');
    window.addEventListener('scroll', () => {
      const rect = ctaSection.getBoundingClientRect();
      const viewH = window.innerHeight;
      if (rect.top < viewH && rect.bottom > 0) {
        const progress = (viewH - rect.top) / (viewH + rect.height);
        ctaImg.style.transform = `translateY(${(progress - 0.5) * 60}px)`;
      }
    }, { passive: true });
  }

  /* --- Map pin staggered animation --- */
  const pins = document.querySelectorAll('.map-pin');
  pins.forEach((pin, i) => {
    pin.style.setProperty('--i', i);
    pin.style.animationDelay = `${i * 0.2}s`;
  });

  /* --- Contact form (mock) --- */
  const contactForm = document.getElementById('contactForm');
  if (contactForm) {
    contactForm.addEventListener('submit', e => {
      e.preventDefault();
      const btn = contactForm.querySelector('.btn-filled');
      const origText = btn.textContent;
      btn.textContent = 'Thank You!';
      btn.style.pointerEvents = 'none';
      setTimeout(() => {
        btn.textContent = origText;
        btn.style.pointerEvents = '';
        contactForm.reset();
      }, 2500);
    });
  }

  /* --- Smooth scroll for anchor links --- */
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', e => {
      const target = document.querySelector(anchor.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

});
