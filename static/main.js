/* ====================================================================
   SARKARI SHOOTING — Editorial
   Minimal vanilla JS. One reveal animation, quiet interactions.
   ==================================================================== */

document.addEventListener('DOMContentLoaded', () => {

  /* ── 1. Nav: solid after scroll ──────────────────────────────── */
  const nav = document.getElementById('siteNav');
  if (nav && nav.classList.contains('nav--overlay')) {
    const onScroll = () => nav.classList.toggle('is-solid', window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ── 2. Mobile menu ──────────────────────────────────────────── */
  const burger = document.getElementById('navBurger');
  if (burger) {
    burger.addEventListener('click', () => {
      const open = document.body.classList.toggle('menu-open');
      burger.setAttribute('aria-expanded', open);
    });
    document.querySelectorAll('.menu a').forEach((a) =>
      a.addEventListener('click', () => document.body.classList.remove('menu-open'))
    );
  }

  /* ── 3. Hero slideshow ───────────────────────────────────────── */
  const slides = document.querySelectorAll('.hero-slide');
  if (slides.length > 1) {
    let idx = 0;
    let timer = null;
    const count = document.getElementById('heroCount');
    const pad = (n) => String(n + 1).padStart(2, '0');

    const show = (n) => {
      slides[idx].classList.remove('is-active');
      idx = (n + slides.length) % slides.length;
      slides[idx].classList.add('is-active');
      if (count) count.textContent = pad(idx) + ' / ' + pad(slides.length - 1);
    };
    const auto = () => { clearInterval(timer); timer = setInterval(() => show(idx + 1), 6500); };

    const prev = document.getElementById('heroPrev');
    const next = document.getElementById('heroNext');
    if (prev) prev.addEventListener('click', () => { show(idx - 1); auto(); });
    if (next) next.addEventListener('click', () => { show(idx + 1); auto(); });
    if (count) count.textContent = pad(0) + ' / ' + pad(slides.length - 1);
    auto();
  }

  /* ── 4. Reveal on scroll (single quiet fade) ─────────────────── */
  const revealEls = document.querySelectorAll('[data-reveal]');
  if (revealEls.length) {
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        obs.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach((el) => obs.observe(el));
  }

  /* ── 5. Films tabs ───────────────────────────────────────────── */
  const filmTabs = document.querySelectorAll('[data-film-tab]');
  filmTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      filmTabs.forEach((t) => t.classList.remove('is-active'));
      tab.classList.add('is-active');
      document.querySelectorAll('.films-panel').forEach((p) => {
        p.classList.toggle('is-shown', p.dataset.panel === tab.dataset.filmTab);
      });
    });
  });

  /* ── 6. Pricing tabs ─────────────────────────────────────────── */
  const priceTabs = document.querySelectorAll('[data-price-tab]');
  priceTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      priceTabs.forEach((t) => t.classList.remove('is-active'));
      tab.classList.add('is-active');
      document.querySelectorAll('.price-col').forEach((col) => {
        col.classList.toggle('is-shown', col.dataset.tier === tab.dataset.priceTab);
      });
    });
  });

  /* ── 7. Testimonial slider ───────────────────────────────────── */
  const testiSlides = document.querySelectorAll('.testi-slide');
  if (testiSlides.length > 1) {
    let t = 0;
    const showT = (n) => {
      testiSlides[t].classList.remove('is-active');
      t = (n + testiSlides.length) % testiSlides.length;
      testiSlides[t].classList.add('is-active');
    };
    const tp = document.getElementById('testiPrev');
    const tn = document.getElementById('testiNext');
    if (tp) tp.addEventListener('click', () => showT(t - 1));
    if (tn) tn.addEventListener('click', () => showT(t + 1));
  }

  /* ── 8. Instagram lightbox — iframe loads only on click ──────── */
  const lightbox = document.getElementById('lightbox');
  if (lightbox) {
    const stage = document.getElementById('lightboxStage');
    const ext = document.getElementById('lightboxExt');

    const openLb = (item) => {
      const embed = item.dataset.embed;
      stage.querySelectorAll('iframe').forEach((f) => f.remove());
      if (embed) {
        const iframe = document.createElement('iframe');
        iframe.src = embed;
        iframe.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
        iframe.setAttribute('allowfullscreen', '');
        iframe.setAttribute('scrolling', 'no');
        stage.appendChild(iframe);
      }
      if (ext) ext.href = item.dataset.link || '#';
      lightbox.classList.add('is-open');
      document.body.style.overflow = 'hidden';
    };
    const closeLb = () => {
      lightbox.classList.remove('is-open');
      document.body.style.overflow = '';
      setTimeout(() => stage.querySelectorAll('iframe').forEach((f) => f.remove()), 350);
    };

    document.querySelectorAll('.ig-item').forEach((item) => {
      item.addEventListener('click', () => openLb(item));
      item.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openLb(item); }
      });
    });
    document.getElementById('lightboxClose').addEventListener('click', closeLb);
    lightbox.addEventListener('click', (e) => { if (e.target === lightbox) closeLb(); });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && lightbox.classList.contains('is-open')) closeLb();
    });
  }

  /* ── 9. Enquiry popup — once per session (dwell or exit) ─────── */
  const popup = document.getElementById('popup');
  if (popup) {
    const KEY = 'ss-popup-seen';
    const show = () => {
      if (sessionStorage.getItem(KEY)) return;
      if (document.body.classList.contains('menu-open')) return;
      popup.classList.add('is-open');
      sessionStorage.setItem(KEY, '1');
      document.removeEventListener('mouseleave', onExit);
    };
    const hide = () => popup.classList.remove('is-open');
    const onExit = (e) => { if (e.clientY <= 0) show(); };

    setTimeout(show, 14000);
    document.addEventListener('mouseleave', onExit);

    document.getElementById('popupClose').addEventListener('click', hide);
    popup.addEventListener('click', (e) => { if (e.target === popup) hide(); });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && popup.classList.contains('is-open')) hide();
    });
    popup.querySelectorAll('[data-popup-cta]').forEach((b) => b.addEventListener('click', hide));
  }

  /* ── 10. Smooth anchors (offset fixed nav) ───────────────────── */
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const target = document.querySelector(a.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      const y = target.getBoundingClientRect().top + window.scrollY - 76;
      window.scrollTo({ top: y, behavior: 'smooth' });
    });
  });

});
