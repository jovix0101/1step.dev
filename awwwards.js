/**
 * awwwards.js — Animation engine for 1step.dev
 * Particle system, scroll choreography, cursor, tilt, boot
 */

/* ============================================
   Particle System
   ============================================ */
class ParticleField {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.particles = [];
    this.mouse = { x: -999, y: -999 };
    this.isActive = true;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.resize();
    this.init();
    this.bindEvents();
    this.loop();
  }

  resize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;
    this.canvas.style.width = this.width + 'px';
    this.canvas.style.height = this.height + 'px';
    this.ctx.scale(this.dpr, this.dpr);
  }

  init() {
    const count = this.width < 768 ? 40 : 100;
    this.particles = [];
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        size: Math.random() * 1.8 + 0.5,
        opacity: Math.random() * 0.5 + 0.15,
        hue: Math.random() > 0.5 ? 185 : 262 // cyan or violet
      });
    }
  }

  bindEvents() {
    window.addEventListener('resize', () => {
      this.resize();
      this.init();
    });

    window.addEventListener('mousemove', (e) => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
    });

    // Pause when not visible
    const observer = new IntersectionObserver(([entry]) => {
      this.isActive = entry.isIntersecting;
    }, { threshold: 0.1 });
    observer.observe(this.canvas);
  }

  update() {
    const repelRadius = 140;
    const repelStrength = 0.6;

    for (const p of this.particles) {
      // Mouse repulsion
      const dx = p.x - this.mouse.x;
      const dy = p.y - this.mouse.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < repelRadius && dist > 0) {
        const force = (1 - dist / repelRadius) * repelStrength;
        p.vx += (dx / dist) * force;
        p.vy += (dy / dist) * force;
      }

      // Apply velocity with friction
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.97;
      p.vy *= 0.97;

      // Boundary wrap
      if (p.x < -10) p.x = this.width + 10;
      if (p.x > this.width + 10) p.x = -10;
      if (p.y < -10) p.y = this.height + 10;
      if (p.y > this.height + 10) p.y = -10;
    }
  }

  draw() {
    this.ctx.clearRect(0, 0, this.width, this.height);

    // Draw connections
    const connectionDist = 90;
    for (let i = 0; i < this.particles.length; i++) {
      for (let j = i + 1; j < this.particles.length; j++) {
        const a = this.particles[i];
        const b = this.particles[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < connectionDist) {
          const alpha = (1 - dist / connectionDist) * 0.12;
          this.ctx.beginPath();
          this.ctx.strokeStyle = `rgba(0, 240, 255, ${alpha})`;
          this.ctx.lineWidth = 0.5;
          this.ctx.moveTo(a.x, a.y);
          this.ctx.lineTo(b.x, b.y);
          this.ctx.stroke();
        }
      }
    }

    // Draw particles
    for (const p of this.particles) {
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.ctx.fillStyle = `hsla(${p.hue}, 80%, 70%, ${p.opacity})`;
      this.ctx.fill();
    }
  }

  loop() {
    if (this.isActive) {
      this.update();
      this.draw();
    }
    requestAnimationFrame(() => this.loop());
  }
}

/* ============================================
   Custom Cursor
   ============================================ */
class CustomCursor {
  constructor() {
    if (window.matchMedia('(hover: none)').matches) return;

    this.dot = document.querySelector('.cursor-dot');
    this.ring = document.querySelector('.cursor-ring');
    if (!this.dot || !this.ring) return;

    this.pos = { x: 0, y: 0 };
    this.ringPos = { x: 0, y: 0 };
    this.visible = false;
    this.active = false;

    document.addEventListener('mousemove', (e) => {
      this.pos.x = e.clientX;
      this.pos.y = e.clientY;
      if (!this.visible) {
        this.visible = true;
        this.dot.style.opacity = '1';
        this.ring.style.opacity = '1';
      }
    });

    document.addEventListener('mouseleave', () => {
      this.visible = false;
      this.dot.style.opacity = '0';
      this.ring.style.opacity = '0';
    });

    // Track hover on interactive elements
    document.addEventListener('mouseover', (e) => {
      if (e.target.closest('a, button, .btn, .project-card, .skill-card, .contact-link, .nav-links a, input')) {
        this.active = true;
        this.dot.classList.add('active');
        this.ring.classList.add('active');
      }
    });

    document.addEventListener('mouseout', (e) => {
      if (e.target.closest('a, button, .btn, .project-card, .skill-card, .contact-link, .nav-links a, input')) {
        this.active = false;
        this.dot.classList.remove('active');
        this.ring.classList.remove('active');
      }
    });

    this.loop();
  }

  loop() {
    // Dot follows immediately
    this.dot.style.left = this.pos.x + 'px';
    this.dot.style.top = this.pos.y + 'px';

    // Ring follows with spring delay
    this.ringPos.x += (this.pos.x - this.ringPos.x) * 0.12;
    this.ringPos.y += (this.pos.y - this.ringPos.y) * 0.12;
    this.ring.style.left = this.ringPos.x + 'px';
    this.ring.style.top = this.ringPos.y + 'px';

    requestAnimationFrame(() => this.loop());
  }
}

/* ============================================
   Card Tilt Effect
   ============================================ */
function initTiltCards() {
  const cards = document.querySelectorAll('.skill-card');
  cards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      const rotateX = (y - 0.5) * -8;
      const rotateY = (x - 0.5) * 8;

      card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
      card.style.setProperty('--mouse-x', `${x * 100}%`);
      card.style.setProperty('--mouse-y', `${y * 100}%`);
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = 'perspective(800px) rotateX(0) rotateY(0) translateY(0)';
    });
  });
}

/* ============================================
   Hero Text Split
   ============================================ */
function splitHeroText() {
  const heroName = document.querySelector('.hero-name');
  if (!heroName) return;

  const text = heroName.textContent;
  heroName.innerHTML = '';
  text.split('').forEach((char, i) => {
    const span = document.createElement('span');
    span.className = 'char';
    span.textContent = char === ' ' ? ' ' : char;
    span.style.animationDelay = `${i * 0.04}s`;
    heroName.appendChild(span);
  });
}

/* ============================================
   Typing Effect for Role
   ============================================ */
function initTypedRole() {
  const roleEl = document.querySelector('.hero-role-text');
  if (!roleEl) return;

  // Read roles from data-roles attribute (comma-separated), fallback to defaults
  const dataRoles = roleEl.getAttribute('data-roles');
  const texts = dataRoles
    ? dataRoles.split(',').map(s => s.trim()).filter(Boolean)
    : [
        'Full-Stack Developer',
        'Creative Technologist',
        'Open Source Contributor',
        'Digital Craftsman'
      ];

  if (texts.length === 0) return;

  let textIndex = 0;
  let charIndex = 0;
  let isDeleting = false;
  let speed = 80;

  function type() {
    const current = texts[textIndex];

    if (isDeleting) {
      roleEl.textContent = current.substring(0, charIndex - 1);
      charIndex--;
      speed = 40;
    } else {
      roleEl.textContent = current.substring(0, charIndex + 1);
      charIndex++;
      speed = 80;
    }

    if (!isDeleting && charIndex === current.length) {
      speed = 2500;
      isDeleting = true;
    } else if (isDeleting && charIndex === 0) {
      isDeleting = false;
      textIndex = (textIndex + 1) % texts.length;
      speed = 400;
    }

    setTimeout(type, speed);
  }

  setTimeout(type, 1000);
}

/* ============================================
   GSAP Scroll Animations
   ============================================ */
function initScrollAnimations() {
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

  gsap.registerPlugin(ScrollTrigger);

  // Hero parallax
  const heroName = document.querySelector('.hero-name');
  if (heroName) {
    gsap.to(heroName, {
      y: -80,
      opacity: 0,
      ease: 'none',
      scrollTrigger: {
        trigger: '.hero',
        start: 'top top',
        end: 'bottom top',
        scrub: 1
      }
    });
  }

  // Section reveals
  gsap.utils.toArray('.reveal').forEach(el => {
    gsap.to(el, {
      opacity: 1,
      y: 0,
      duration: 0.9,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: el,
        start: 'top 85%',
        toggleActions: 'play none none none'
      }
    });
  });

  gsap.utils.toArray('.reveal-left').forEach(el => {
    gsap.to(el, {
      opacity: 1,
      x: 0,
      duration: 0.9,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: el,
        start: 'top 85%',
        toggleActions: 'play none none none'
      }
    });
  });

  gsap.utils.toArray('.reveal-right').forEach(el => {
    gsap.to(el, {
      opacity: 1,
      x: 0,
      duration: 0.9,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: el,
        start: 'top 85%',
        toggleActions: 'play none none none'
      }
    });
  });

  gsap.utils.toArray('.reveal-scale').forEach(el => {
    gsap.to(el, {
      opacity: 1,
      scale: 1,
      duration: 0.9,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: el,
        start: 'top 85%',
        toggleActions: 'play none none none'
      }
    });
  });

  // Skill cards stagger
  const skillCards = gsap.utils.toArray('.skill-card');
  if (skillCards.length) {
    gsap.from(skillCards, {
      opacity: 0,
      y: 60,
      scale: 0.95,
      stagger: 0.1,
      duration: 0.7,
      ease: 'back.out(1.4)',
      scrollTrigger: {
        trigger: '.skills-grid',
        start: 'top 80%',
        toggleActions: 'play none none none'
      }
    });
  }

  // Project cards stagger
  const projectCards = gsap.utils.toArray('.project-card');
  if (projectCards.length) {
    projectCards.forEach((card, i) => {
      gsap.from(card, {
        opacity: 0,
        x: i % 2 === 0 ? -40 : 40,
        y: 30,
        duration: 0.8,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: card,
          start: 'top 85%',
          toggleActions: 'play none none none'
        }
      });
    });
  }

  // Contact links stagger
  const contactLinks = gsap.utils.toArray('.contact-link');
  if (contactLinks.length) {
    gsap.from(contactLinks, {
      opacity: 0,
      x: -30,
      stagger: 0.08,
      duration: 0.6,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: '.contact-links',
        start: 'top 85%',
        toggleActions: 'play none none none'
      }
    });
  }

  // Nav active state on scroll
  const sections = document.querySelectorAll('.section[id]');
  sections.forEach(section => {
    ScrollTrigger.create({
      trigger: section,
      start: 'top center',
      end: 'bottom center',
      onEnter: () => setActiveNav(section.id),
      onEnterBack: () => setActiveNav(section.id)
    });
  });
}

function setActiveNav(sectionId) {
  document.querySelectorAll('.nav-links a').forEach(link => {
    link.classList.toggle('active', link.getAttribute('href') === `#${sectionId}`);
  });
}

/* ============================================
   Boot Sequence
   ============================================ */
function initBootSequence() {
  // The power button and terminal logic is handled by main.js
  // This function adds the visual enhancements on top

  const powerBtn = document.getElementById('power-on-btn');
  if (!powerBtn) return;

  // Add subtle glow animation to the orb
  powerBtn.addEventListener('mouseenter', () => {
    powerBtn.style.boxShadow = '0 0 60px rgba(0, 240, 255, 0.15), 0 0 120px rgba(139, 92, 246, 0.08)';
  });

  powerBtn.addEventListener('mouseleave', () => {
    if (!powerBtn.classList.contains('interaction-held')) {
      powerBtn.style.boxShadow = '';
    }
  });
}

/* ============================================
   Smooth scroll for nav links
   ============================================ */
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', (e) => {
      const target = document.querySelector(link.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
}

/* ============================================
   Initialize
   ============================================ */
document.addEventListener('DOMContentLoaded', () => {
  // Particle canvas
  const canvas = document.getElementById('particle-canvas');
  if (canvas) new ParticleField(canvas);

  // Custom cursor
  new CustomCursor();

  // Hero text effects
  splitHeroText();
  initTypedRole();

  // Card interactions
  initTiltCards();

  // Boot enhancements
  initBootSequence();

  // Smooth scroll
  initSmoothScroll();

  // GSAP animations (wait for GSAP to load)
  if (typeof gsap !== 'undefined') {
    initScrollAnimations();
  } else {
    // Retry after a moment if GSAP loads async
    setTimeout(() => {
      if (typeof gsap !== 'undefined') initScrollAnimations();
    }, 500);
  }
});
