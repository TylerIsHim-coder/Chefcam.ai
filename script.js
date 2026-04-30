/* =====================================================
   Chefcam.ai — landing page interactions
   ===================================================== */

(() => {
  'use strict';

  const root = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (reduceMotion) root.classList.add('no-motion');

  /* ----- Reveal-on-scroll ------------------------------------------------ */
  const howStrip = document.getElementById('howSteps');
  const revealEls = document.querySelectorAll('[data-reveal]');

  // Apply per-element delay from data-reveal-delay
  revealEls.forEach((el) => {
    const delay = parseInt(el.dataset.revealDelay || '0', 10);
    if (delay) el.style.transitionDelay = `${delay}ms`;
  });

  const revealOutsideHow = [...revealEls].filter((el) => !howStrip || !howStrip.contains(el));
  const revealInsideHow = howStrip ? [...howStrip.querySelectorAll('[data-reveal]')] : [];

  if (reduceMotion || !('IntersectionObserver' in window)) {
    revealEls.forEach((el) => el.classList.add('is-visible'));
  } else {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    );
    revealOutsideHow.forEach((el) => io.observe(el));

    /* Steps carousel: reveal each slide when it enters the horizontal strip */
    if (howStrip && revealInsideHow.length) {
      const ioHow = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('is-visible');
              ioHow.unobserve(entry.target);
            }
          });
        },
        { root: howStrip, threshold: 0.45 }
      );
      revealInsideHow.forEach((el) => ioHow.observe(el));
    }
  }

  /* ----- How it works: horizontal snap + dots ---------------------------- */
  const howDots = document.querySelectorAll('.how__dot');
  const howSection = document.getElementById('how');
  const AUTO_ADVANCE_MS = 6000;
  const PROGRAMMATIC_SCROLL_SETTLE_MS = reduceMotion ? 80 : 520;

  if (howStrip && howDots.length) {
    const slides = howStrip.querySelectorAll('.how__step');
    let programmaticScroll = false;
    let autoAdvanceTimer = null;
    let howSectionVisible = false;
    let scrollUserDebounce = null;

    const getActiveIndex = () => {
      const mid = howStrip.scrollLeft + howStrip.clientWidth / 2;
      let best = 0;
      let bestDist = Infinity;
      slides.forEach((slide, i) => {
        const center = slide.offsetLeft + slide.offsetWidth / 2;
        const d = Math.abs(mid - center);
        if (d < bestDist) {
          bestDist = d;
          best = i;
        }
      });
      return best;
    };

    const setActiveDot = (index) => {
      howDots.forEach((dot, i) => {
        const on = i === index;
        dot.classList.toggle('is-active', on);
        if (on) dot.setAttribute('aria-current', 'true');
        else dot.removeAttribute('aria-current');
      });
    };

    const goToStep = (index) => {
      const slide = slides[index];
      if (!slide) return;
      slide.scrollIntoView({
        behavior: reduceMotion ? 'auto' : 'smooth',
        block: 'nearest',
        inline: 'nearest',
      });
    };

    const clearAutoAdvance = () => {
      if (autoAdvanceTimer !== null) {
        clearTimeout(autoAdvanceTimer);
        autoAdvanceTimer = null;
      }
    };

    const scheduleAutoAdvance = () => {
      clearAutoAdvance();
      if (reduceMotion || !howSectionVisible || document.hidden) return;
      autoAdvanceTimer = setTimeout(() => {
        autoAdvanceTimer = null;
        const i = getActiveIndex();
        const next = (i + 1) % slides.length;
        programmaticScroll = true;
        goToStep(next);
        setTimeout(() => {
          programmaticScroll = false;
          scheduleAutoAdvance();
        }, PROGRAMMATIC_SCROLL_SETTLE_MS);
      }, AUTO_ADVANCE_MS);
    };

    const userInteracted = () => {
      clearAutoAdvance();
      scheduleAutoAdvance();
    };

    let scrollQueued = false;
    howStrip.addEventListener(
      'scroll',
      () => {
        if (scrollQueued) return;
        scrollQueued = true;
        requestAnimationFrame(() => {
          scrollQueued = false;
          setActiveDot(getActiveIndex());
          if (!programmaticScroll) {
            clearTimeout(scrollUserDebounce);
            scrollUserDebounce = setTimeout(() => userInteracted(), 140);
          }
        });
      },
      { passive: true }
    );

    howDots.forEach((dot) => {
      dot.addEventListener('click', () => {
        const i = parseInt(dot.dataset.howStep || '0', 10);
        userInteracted();
        programmaticScroll = true;
        goToStep(i);
        setTimeout(() => {
          programmaticScroll = false;
        }, PROGRAMMATIC_SCROLL_SETTLE_MS);
      });
    });

    howStrip.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      e.preventDefault();
      const i = getActiveIndex();
      if (e.key === 'ArrowRight' && i < slides.length - 1) {
        userInteracted();
        programmaticScroll = true;
        goToStep(i + 1);
        setTimeout(() => {
          programmaticScroll = false;
        }, PROGRAMMATIC_SCROLL_SETTLE_MS);
      }
      if (e.key === 'ArrowLeft' && i > 0) {
        userInteracted();
        programmaticScroll = true;
        goToStep(i - 1);
        setTimeout(() => {
          programmaticScroll = false;
        }, PROGRAMMATIC_SCROLL_SETTLE_MS);
      }
    });

    if (howSection && 'IntersectionObserver' in window && !reduceMotion) {
      const ioHowSection = new IntersectionObserver(
        (entries) => {
          howSectionVisible = Boolean(entries[0]?.isIntersecting);
          if (howSectionVisible) {
            scheduleAutoAdvance();
          } else {
            clearAutoAdvance();
          }
        },
        { threshold: 0.32 }
      );
      ioHowSection.observe(howSection);
    }

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        clearAutoAdvance();
      } else if (howSectionVisible && !reduceMotion) {
        scheduleAutoAdvance();
      }
    });

    setActiveDot(0);
  }

  /* ----- Header blur on scroll ------------------------------------------ */
  const header = document.getElementById('siteHeader');
  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      header.classList.toggle('scrolled', window.scrollY > 8);
      ticking = false;
    });
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ----- Mobile nav toggle (sidebar drawer + backdrop) -------------------- */
  const toggle = document.querySelector('.nav__toggle');
  const drawer = document.getElementById('mobileNav');
  const navBackdrop = document.getElementById('navDrawerBackdrop');

  if (toggle && drawer) {
    const setOpen = (open) => {
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      drawer.setAttribute('aria-hidden', String(!open));
      if (navBackdrop) navBackdrop.setAttribute('aria-hidden', String(!open));
      document.body.classList.toggle('nav-open', open);
      document.body.style.overflow = open ? 'hidden' : '';
    };

    toggle.addEventListener('click', () => {
      const open = toggle.getAttribute('aria-expanded') !== 'true';
      setOpen(open);
    });

    navBackdrop?.addEventListener('click', () => setOpen(false));

    drawer.addEventListener('click', (e) => {
      if (e.target.closest('a')) setOpen(false);
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
        setOpen(false);
        toggle.focus();
      }
    });
  }

  /* ----- Smooth-scroll polish for anchor links -------------------------- */
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href^="#"]');
    if (!link) return;
    const id = link.getAttribute('href');
    if (id.length < 2) return;
    const target = document.querySelector(id);
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
  });
})();
