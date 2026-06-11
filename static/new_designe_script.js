/* ════════════════════════════════════════════════════════════
   SARKARI SHOOTING — interactions
   Lenis smooth scroll · GSAP reveals · 3D tilt · counters
   filters · testimonials · pricing toggle · widgets
   ════════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hasGsap = typeof gsap !== "undefined";
  if (hasGsap && typeof ScrollTrigger !== "undefined") gsap.registerPlugin(ScrollTrigger);

  /* ──────────────────────────────────────────────
     Preloader — count to 100, open the aperture
  ────────────────────────────────────────────── */
  const preloader = document.getElementById("preloader");
  const counterEl = document.getElementById("preloaderCount");

  function finishPreloader() {
    if (!preloader) return;
    preloader.classList.add("is-done");
    document.body.classList.add("is-loaded");
    runHeroIntro();
  }

  if (preloader && counterEl && !prefersReduced) {
    let n = 0;
    const tick = setInterval(() => {
      n = Math.min(100, n + Math.ceil(Math.random() * 7));
      counterEl.textContent = n;
      if (n >= 100) {
        clearInterval(tick);
        setTimeout(finishPreloader, 350);
      }
    }, 38);
    // Safety: never trap the user behind the loader
    setTimeout(finishPreloader, 6000);
  } else {
    finishPreloader();
  }

  /* ──────────────────────────────────────────────
     Hero intro stagger
  ────────────────────────────────────────────── */
  function runHeroIntro() {
    const items = document.querySelectorAll("[data-hero-stagger]");
    if (!items.length) return;
    if (!hasGsap || prefersReduced) {
      items.forEach((el) => (el.style.opacity = 1));
      return;
    }
    gsap.fromTo(
      items,
      { y: 60, opacity: 0 },
      { y: 0, opacity: 1, duration: 1.3, stagger: 0.14, ease: "power4.out", delay: 0.15 }
    );
  }
  // Pre-hide hero items so the intro doesn't flash
  if (hasGsap && !prefersReduced) {
    document.querySelectorAll("[data-hero-stagger]").forEach((el) => (el.style.opacity = 0));
  }

  /* ──────────────────────────────────────────────
     Lenis smooth scrolling
  ────────────────────────────────────────────── */
  let lenis = null;
  if (typeof Lenis !== "undefined" && !prefersReduced) {
    lenis = new Lenis({ duration: 1.15, smoothWheel: true });
    function raf(t) {
      lenis.raf(t);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);
    if (hasGsap) lenis.on("scroll", ScrollTrigger.update);
  }

  function scrollToTarget(target) {
    if (lenis) lenis.scrollTo(target, { offset: -70 });
    else target.scrollIntoView({ behavior: "smooth" });
  }

  // Anchor links
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const id = a.getAttribute("href");
      if (id.length < 2) return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      closeMobileMenu();
      scrollToTarget(target);
    });
  });

  /* ──────────────────────────────────────────────
     Navbar — shrink + hide on scroll down
  ────────────────────────────────────────────── */
  const nav = document.getElementById("mainNav");
  const progress = document.getElementById("scrollProgress");
  const backTop = document.getElementById("backTop");
  let lastY = 0;

  function onScroll() {
    const y = window.scrollY;
    if (nav) {
      nav.classList.toggle("is-scrolled", y > 40);
      nav.classList.toggle("is-hidden", y > 500 && y > lastY);
    }
    if (progress) {
      const h = document.documentElement.scrollHeight - innerHeight;
      progress.style.width = (h > 0 ? (y / h) * 100 : 0) + "%";
    }
    if (backTop) backTop.classList.toggle("is-visible", y > 800);
    lastY = y;
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  if (backTop) backTop.addEventListener("click", () => (lenis ? lenis.scrollTo(0) : window.scrollTo({ top: 0, behavior: "smooth" })));

  /* ──────────────────────────────────────────────
     Mobile menu
  ────────────────────────────────────────────── */
  const burger = document.getElementById("burger");
  const mobileMenu = document.getElementById("mobileMenu");

  function closeMobileMenu() {
    if (!mobileMenu) return;
    mobileMenu.classList.remove("is-open");
    burger && burger.classList.remove("is-open");
    burger && burger.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
  }

  if (burger && mobileMenu) {
    burger.addEventListener("click", () => {
      const open = mobileMenu.classList.toggle("is-open");
      burger.classList.toggle("is-open", open);
      burger.setAttribute("aria-expanded", String(open));
      document.body.style.overflow = open ? "hidden" : "";
    });
  }

  /* ──────────────────────────────────────────────
     Custom cursor + magnetic buttons
  ────────────────────────────────────────────── */
  const dot = document.getElementById("cursorDot");
  const halo = document.getElementById("cursorHalo");

  if (dot && halo && matchMedia("(hover: hover)").matches && !prefersReduced) {
    let mx = -100, my = -100, hx = -100, hy = -100;
    addEventListener("mousemove", (e) => { mx = e.clientX; my = e.clientY; });

    (function cursorLoop() {
      hx += (mx - hx) * 0.16;
      hy += (my - hy) * 0.16;
      dot.style.transform = `translate(${mx}px, ${my}px) translate(-50%,-50%)`;
      halo.style.transform = `translate(${hx}px, ${hy}px) translate(-50%,-50%)`;
      requestAnimationFrame(cursorLoop);
    })();

    document.querySelectorAll("a, button, [data-tilt]").forEach((el) => {
      el.addEventListener("mouseenter", () => halo.classList.add("is-hover"));
      el.addEventListener("mouseleave", () => halo.classList.remove("is-hover"));
    });
  }

  // Magnetic pull
  if (matchMedia("(hover: hover)").matches && !prefersReduced) {
    document.querySelectorAll("[data-magnetic]").forEach((el) => {
      el.addEventListener("mousemove", (e) => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left - r.width / 2) * 0.25;
        const y = (e.clientY - r.top - r.height / 2) * 0.35;
        el.style.transform = `translate(${x}px, ${y}px)`;
      });
      el.addEventListener("mouseleave", () => { el.style.transform = ""; });
    });
  }

  /* ──────────────────────────────────────────────
     Scroll-triggered reveals
  ────────────────────────────────────────────── */
  function setupReveals() {
    const els = document.querySelectorAll("[data-reveal]");
    if (!els.length) return;

    if (!hasGsap || prefersReduced) {
      els.forEach((el) => (el.style.opacity = 1));
      return;
    }

    els.forEach((el) => {
      const type = el.dataset.reveal || "fade-up";
      const delay = parseFloat(el.dataset.delay || 0) * 0.12;
      const from = { opacity: 0 };
      if (type === "fade-up") from.y = 56;
      if (type === "slide-right") from.x = -70;
      if (type === "slide-left") from.x = 70;
      if (type === "scale-in") from.scale = 0.85;

      gsap.fromTo(el, from, {
        opacity: 1, x: 0, y: 0, scale: 1,
        duration: 1.15, delay, ease: "power3.out",
        scrollTrigger: { trigger: el, start: "top 88%", once: true },
      });
    });
  }

  /* ──────────────────────────────────────────────
     Parallax (elements + banner bg)
  ────────────────────────────────────────────── */
  function setupParallax() {
    if (!hasGsap || prefersReduced) return;

    document.querySelectorAll("[data-parallax]").forEach((el) => {
      const speed = parseFloat(el.dataset.speed || -0.2);
      gsap.to(el, {
        yPercent: speed * 100,
        ease: "none",
        scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: 0.8 },
      });
    });

    document.querySelectorAll("[data-parallax-bg]").forEach((bg) => {
      gsap.fromTo(bg, { yPercent: -12 }, {
        yPercent: 12,
        ease: "none",
        scrollTrigger: { trigger: bg.parentElement, start: "top bottom", end: "bottom top", scrub: 0.6 },
      });
    });
  }

  /* ──────────────────────────────────────────────
     Animated counters
  ────────────────────────────────────────────── */
  function setupCounters() {
    const nums = document.querySelectorAll(".stat-num[data-count]");
    if (!nums.length) return;

    const animate = (el) => {
      const target = parseInt(el.dataset.count, 10) || 0;
      const dur = 1800;
      const t0 = performance.now();
      const step = (t) => {
        const p = Math.min(1, (t - t0) / dur);
        const eased = 1 - Math.pow(1 - p, 4);
        el.textContent = Math.round(target * eased).toLocaleString("en-IN");
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };

    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          animate(entry.target);
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.6 });

    nums.forEach((el) => io.observe(el));
  }

  /* ──────────────────────────────────────────────
     3D tilt on cards
  ────────────────────────────────────────────── */
  function setupTilt() {
    if (!matchMedia("(hover: hover)").matches || prefersReduced) return;

    document.querySelectorAll("[data-tilt]").forEach((card) => {
      const max = parseFloat(card.dataset.tiltMax || 7);

      card.addEventListener("mousemove", (e) => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        const rx = (0.5 - py) * max;
        const ry = (px - 0.5) * max;
        card.style.transition = "transform 0.08s linear";
        card.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateZ(6px)`;
        card.style.setProperty("--mx", px * 100 + "%");
        card.style.setProperty("--my", py * 100 + "%");
      });

      card.addEventListener("mouseleave", () => {
        card.style.transition = "transform 0.7s cubic-bezier(0.22,1,0.36,1)";
        card.style.transform = "perspective(900px) rotateX(0) rotateY(0)";
      });
    });
  }

  /* ──────────────────────────────────────────────
     Portfolio — placeholder gallery + filters
  ────────────────────────────────────────────── */
  const PLACEHOLDER_WORK = [
    { cat: "weddings",   name: "Weddings",   title: "Royal Vows, Udaipur",      meta: "Feb 2026 · Palace Wedding", img: "https://images.unsplash.com/photo-1519741497674-611481863552?w=800&q=80" },
    { cat: "portraits",  name: "Portraits",  title: "Golden Hour Muse",         meta: "Studio Editorial",          img: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=800&q=80" },
    { cat: "events",     name: "Events",     title: "Sangeet Under Stars",      meta: "Jaipur · 600 Guests",       img: "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800&q=80" },
    { cat: "weddings",   name: "Weddings",   title: "The First Look",           meta: "Goa · Beach Ceremony",      img: "https://images.unsplash.com/photo-1606800052052-a08af7148866?w=800&q=80" },
    { cat: "commercial", name: "Commercial", title: "Heritage Couture",         meta: "Fashion Campaign",          img: "https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=800&q=80" },
    { cat: "portraits",  name: "Portraits",  title: "Monsoon Stories",          meta: "Outdoor Series",            img: "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=800&q=80" },
    { cat: "events",     name: "Events",     title: "Indie Nights Live",        meta: "Concert Coverage",          img: "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=800&q=80" },
    { cat: "weddings",   name: "Weddings",   title: "Mehendi Morning",          meta: "Jodhpur · Haveli",          img: "https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=800&q=80" },
    { cat: "commercial", name: "Commercial", title: "Crafted in Gold",          meta: "Jewellery Campaign",        img: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800&q=80" },
  ];

  function setupPortfolio() {
    const grid = document.getElementById("masonryGrid");
    const bar = document.getElementById("filterBar");
    if (!grid || !bar) return;

    // Inject placeholders if the Django context provided nothing
    if (!grid.querySelector(".masonry-item")) {
      grid.innerHTML = PLACEHOLDER_WORK.map((w) => `
        <a href="#contact" class="masonry-item" data-category="${w.cat}" data-tilt data-tilt-max="5">
          <img src="${w.img}" alt="${w.title}" loading="lazy">
          <div class="masonry-overlay">
            <span class="masonry-cat">${w.name}</span>
            <h3 class="masonry-title">${w.title}</h3>
            <span class="masonry-meta">${w.meta}</span>
          </div>
        </a>`).join("");
    }

    const items = Array.from(grid.querySelectorAll(".masonry-item"));

    bar.addEventListener("click", (e) => {
      const btn = e.target.closest(".filter-btn");
      if (!btn) return;
      bar.querySelectorAll(".filter-btn").forEach((b) => b.classList.toggle("is-active", b === btn));
      const filter = btn.dataset.filter;

      items.forEach((item) => {
        const show = filter === "all" || item.dataset.category === filter;
        if (show && item.classList.contains("is-filtered")) {
          item.classList.remove("is-filtered");
          if (hasGsap && !prefersReduced) gsap.fromTo(item, { opacity: 0, y: 26 }, { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" });
        } else if (!show) {
          item.classList.add("is-filtered");
        }
      });

      if (hasGsap) ScrollTrigger.refresh();
    });

    setupTilt(); // re-bind tilt for injected items
  }

  /* ──────────────────────────────────────────────
     Testimonials — auto-rotating carousel
  ────────────────────────────────────────────── */
  function setupTestimonials() {
    const stage = document.getElementById("testimonialStage");
    const dotsWrap = document.getElementById("testimonialDots");
    if (!stage || !dotsWrap) return;

    const slides = Array.from(stage.querySelectorAll(".testimonial-slide"));
    if (slides.length < 2) return;

    let idx = slides.findIndex((s) => s.classList.contains("is-active"));
    if (idx < 0) idx = 0;
    let timer = null;

    slides.forEach((_, i) => {
      const b = document.createElement("button");
      b.setAttribute("role", "tab");
      b.setAttribute("aria-label", "Testimonial " + (i + 1));
      b.addEventListener("click", () => { go(i); restart(); });
      dotsWrap.appendChild(b);
    });
    const dots = Array.from(dotsWrap.children);

    function go(i) {
      idx = (i + slides.length) % slides.length;
      slides.forEach((s, k) => s.classList.toggle("is-active", k === idx));
      dots.forEach((d, k) => d.classList.toggle("is-active", k === idx));
    }

    function restart() {
      clearInterval(timer);
      if (!prefersReduced) timer = setInterval(() => go(idx + 1), 5200);
    }

    go(idx);
    restart();
    stage.addEventListener("mouseenter", () => clearInterval(timer));
    stage.addEventListener("mouseleave", restart);
  }

  /* ──────────────────────────────────────────────
     Pricing toggle (Photography / Photo + Film)
  ────────────────────────────────────────────── */
  function setupPricing() {
    const toggle = document.querySelector(".pricing-toggle");
    if (!toggle) return;

    toggle.addEventListener("click", (e) => {
      const btn = e.target.closest(".toggle-opt");
      if (!btn || btn.classList.contains("is-active")) return;

      toggle.querySelectorAll(".toggle-opt").forEach((b) => b.classList.toggle("is-active", b === btn));
      const mode = btn.dataset.mode;

      document.querySelectorAll(".price-value").forEach((el) => {
        const target = parseInt(el.dataset[mode], 10) || 0;
        const start = parseInt(el.textContent.replace(/[^\d]/g, ""), 10) || 0;
        const t0 = performance.now();
        const dur = 650;
        const step = (t) => {
          const p = Math.min(1, (t - t0) / dur);
          const eased = 1 - Math.pow(1 - p, 3);
          el.textContent = Math.round(start + (target - start) * eased).toLocaleString("en-IN");
          if (p < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      });
    });
  }

  /* ──────────────────────────────────────────────
     Availability widget — mock calendar
  ────────────────────────────────────────────── */
  function setupAvailability() {
    const cal = document.getElementById("miniCalendar");
    const slotEl = document.getElementById("nextSlot");
    if (!cal || !slotEl) return;

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = now.getDate();

    // Deterministic pseudo-random bookings so the widget looks stable
    const isBooked = (d) => ((d * 7 + month * 13) % 10) < 5;

    const heads = ["S", "M", "T", "W", "T", "F", "S"];
    const firstDow = new Date(year, month, 1).getDay();
    let html = heads.map((h) => `<span class="cal-cell is-head">${h}</span>`).join("");
    html += "<span class='cal-cell'></span>".repeat(firstDow);

    let nextFree = null;
    for (let d = 1; d <= daysInMonth; d++) {
      const past = d < today;
      const booked = past || isBooked(d);
      if (!booked && nextFree === null && d >= today) nextFree = d;
      html += `<span class="cal-cell ${booked ? "is-booked" : "is-free"}">${d}</span>`;
    }
    cal.innerHTML = html;

    const monthName = now.toLocaleString("en-IN", { month: "long" });
    if (nextFree) {
      slotEl.textContent = `${monthName} ${nextFree}, ${year}`;
    } else {
      const nm = new Date(year, month + 1, 1);
      slotEl.textContent = nm.toLocaleString("en-IN", { month: "long" }) + " " + nm.getFullYear();
    }
  }

  /* ──────────────────────────────────────────────
     Instagram-style feed grid
  ────────────────────────────────────────────── */
  function setupInsta() {
    const grid = document.getElementById("instaGrid");
    if (!grid) return;

    const shots = [
      "https://images.unsplash.com/photo-1537633552985-df8429e8048b?w=500&q=80",
      "https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=500&q=80",
      "https://images.unsplash.com/photo-1583939411023-14783179e581?w=500&q=80",
      "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=500&q=80",
      "https://images.unsplash.com/photo-1522673607200-164d1b6ce486?w=500&q=80",
      "https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=500&q=80",
    ];

    grid.innerHTML = shots.map((src, i) => `
      <a class="insta-tile" href="#" aria-label="Instagram post ${i + 1}" onclick="return false;">
        <img src="${src}" alt="Recent shoot ${i + 1}" loading="lazy">
      </a>`).join("");
  }

  /* ──────────────────────────────────────────────
     Boot
  ────────────────────────────────────────────── */
  function init() {
    setupInsta();
    setupPortfolio();
    setupReveals();
    setupParallax();
    setupCounters();
    setupTilt();
    setupTestimonials();
    setupPricing();
    setupAvailability();
    if (hasGsap) setTimeout(() => ScrollTrigger.refresh(), 600);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
