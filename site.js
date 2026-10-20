const toggle = document.querySelector('.menu-toggle');
const nav = document.querySelector('#main-nav');
const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
const animeApi = window.anime;
const animate = animeApi?.animate;
const stagger = animeApi?.stagger;
const canAnimate = !motionQuery.matches && typeof animate === 'function';

toggle?.addEventListener('click', () => {
  const open = toggle.getAttribute('aria-expanded') === 'true';
  toggle.setAttribute('aria-expanded', String(!open));
  toggle.setAttribute('aria-label', open ? 'Open menu' : 'Close menu');
  nav?.classList.toggle('is-open', !open);

  if (!open && canAnimate) {
    animate(nav.querySelectorAll('a'), {
      opacity: [0, 1],
      y: [12, 0],
      delay: stagger(45),
      duration: 360,
      ease: 'out(3)',
    });
  }
});
nav?.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
  toggle?.setAttribute('aria-expanded', 'false');
  toggle?.setAttribute('aria-label', 'Open menu');
  nav.classList.remove('is-open');
}));
toggle?.addEventListener('click', () => {
  if (toggle.getAttribute('aria-expanded') === 'true') nav?.querySelector('a')?.focus();
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && toggle?.getAttribute('aria-expanded') === 'true') {
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Open menu');
    nav?.classList.remove('is-open');
    toggle.focus();
  }
});
document.querySelector('#year').textContent = new Date().getFullYear();

if (canAnimate) {
  const installFill = document.querySelector('.install-fill');
  if (installFill) {
    document.documentElement.classList.add('anime-ready');
    animate(installFill, { width: ['2%', '100%'], duration: 5000, loop: true, ease: 'inOut(2)' });
  }

  const intro = [
    ['.hero-copy > .eyebrow', 0],
    ['.hero-copy h1', 90],
    ['.hero-lede', 210],
    ['.hero-actions', 300],
    ['.hero-note', 400],
    ['.art-caption', 320],
  ];
  intro.forEach(([selector, delay]) => {
    const element = document.querySelector(selector);
    if (element) animate(element, { opacity: [0, 1], y: [18, 0], duration: 680, delay, ease: 'out(3)' });
  });

  animate('.local-card', { y: -9, duration: 2600, loop: true, alternate: true, ease: 'inOut(2)' });
  animate('.web-card', { y: 10, duration: 3000, delay: 150, loop: true, alternate: true, ease: 'inOut(2)' });
  animate('.orbit-one', { rotate: 335, duration: 36000, loop: true, ease: 'linear' });
  animate('.orbit-two', { rotate: -305, duration: 48000, loop: true, ease: 'linear' });
  animate('.flight-path span', { scale: [0.92, 1.08], duration: 1400, loop: true, alternate: true, ease: 'inOut(2)' });
  animate('.spark', { scale: [0.82, 1.12], rotate: [-8, 8], duration: 1900, loop: true, alternate: true, ease: 'inOut(2)' });
  animate('.live-dot, .status-pill i', { scale: [0.8, 1.18], opacity: [0.65, 1], duration: 1250, loop: true, alternate: true, ease: 'inOut(2)' });
  animate('.closing-star', { rotate: 360, duration: 24000, loop: true, ease: 'linear' });

  document.querySelectorAll('.button, .text-link').forEach(button => {
    button.addEventListener('pointerenter', () => animate(button, { y: -2, duration: 180, ease: 'out(3)' }));
    button.addEventListener('pointerleave', () => animate(button, { y: 0, duration: 260, ease: 'out(3)' }));
  });

  document.querySelectorAll('.step, .roadmap-cards article').forEach(card => {
    card.addEventListener('pointerenter', () => animate(card, { y: -5, duration: 220, ease: 'out(3)' }));
    card.addEventListener('pointerleave', () => animate(card, { y: 0, duration: 320, ease: 'out(3)' }));
  });
}

const revealTargets = document.querySelectorAll(
  '.section-head, .step, .why-title, .principles article, .roadmap-heading, .roadmap-cards article, .closing-stamp, .closing-inner > div:nth-child(2)'
);
if ('IntersectionObserver' in window && !motionQuery.matches) {
  const reveal = new IntersectionObserver(entries => entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
      if (canAnimate) {
        animate(entry.target, {
          opacity: [0, 1],
          y: [22, 0],
          delay: (Number(entry.target.dataset.motionIndex) % 3) * 75,
          duration: 720,
          ease: 'out(3)',
        });
      }
      reveal.unobserve(entry.target);
    }
  }), { threshold: 0.12 });
  revealTargets.forEach((target, index) => {
    target.dataset.motionIndex = String(index);
    target.classList.add('will-reveal');
    reveal.observe(target);
  });
}

const topbar = document.querySelector('.topbar');
let progressFrame = 0;
const updateScrollProgress = () => {
  if (progressFrame) return;
  progressFrame = requestAnimationFrame(() => {
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    const progress = scrollable > 0 ? window.scrollY / scrollable : 0;
    topbar?.style.setProperty('--scroll-progress', String(progress));
    progressFrame = 0;
  });
};
window.addEventListener('scroll', updateScrollProgress, { passive: true });
updateScrollProgress();

// Keep the navigation useful as visitors move through this long-form page.
const sectionLinks = [...document.querySelectorAll('#main-nav a[href^="#"]')];
const linkedSections = sectionLinks
  .map(link => ({ link, section: document.querySelector(link.getAttribute('href')) }))
  .filter(item => item.section);
if ('IntersectionObserver' in window) {
  const sectionObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      linkedSections.forEach(({ link, section }) => {
        if (section === entry.target) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
    });
  }, { rootMargin: '-25% 0px -65% 0px' });
  linkedSections.forEach(({ section }) => sectionObserver.observe(section));
}
