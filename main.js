/**
 * main.js — UI interactions
 * - Navbar scroll state
 * - Scroll-reveal for sections
 * - Smooth active link highlighting
 */

(function () {
  "use strict";

  // ─── Navbar scroll class ────────────────────────────────────────────────────
  const navbar = document.getElementById("navbar");
  window.addEventListener("scroll", () => {
    navbar.classList.toggle("scrolled", window.scrollY > 40);
  }, { passive: true });

  // ─── Scroll reveal ──────────────────────────────────────────────────────────
  const revealTargets = document.querySelectorAll(
    ".section-label, .about-text, .about-stats, .skill-card, .project-card, .contact-inner > *"
  );

  revealTargets.forEach((el) => el.classList.add("reveal"));

  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
  );

  revealTargets.forEach((el, i) => {
    // Stagger cards
    el.style.transitionDelay = `${(i % 6) * 0.07}s`;
    revealObserver.observe(el);
  });

  // ─── Hamburger menu ─────────────────────────────────────────────────────────
  const hamburger = document.querySelector(".nav-hamburger");
  const navList = document.querySelector(".nav-links");

  if (hamburger) {
    hamburger.addEventListener("click", () => {
      navbar.classList.toggle("nav-open");
      navList.classList.toggle("open");
    });

    navList.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        navbar.classList.remove("nav-open");
        navList.classList.remove("open");
      });
    });
  }

  // ─── Active nav link on scroll ──────────────────────────────────────────────
  const sections = document.querySelectorAll("section[id]");
  const navLinks = document.querySelectorAll(".nav-links a");

  const sectionObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const id = entry.target.getAttribute("id");
          navLinks.forEach((link) => {
            link.style.color = link.getAttribute("href") === `#${id}`
              ? "var(--accent)"
              : "";
          });
        }
      });
    },
    { threshold: 0.4 }
  );

  sections.forEach((s) => sectionObserver.observe(s));

})();
