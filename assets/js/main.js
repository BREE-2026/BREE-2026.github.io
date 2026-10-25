/* BREE site: bilingual toggle, tabs, code copy, docs sidebar, reveal */
(function () {
  "use strict";

  var LANG_KEY = "bree-lang";

  /* ---------- language ---------- */
  function applyLang(lang) {
    document.documentElement.lang = lang;
    try { localStorage.setItem(LANG_KEY, lang); } catch (e) {}
    document.querySelectorAll(".lang-switch button").forEach(function (b) {
      var active = b.getAttribute("data-lang") === lang;
      b.classList.toggle("active", active);
      /* switcher reads "EN/CN" in the English UI and "CN/EN" in the Chinese UI
         (active language first, via CSS order) */
      b.textContent = b.getAttribute("data-lang") === "en" ? "EN" : "CN";
    });
  }
  var saved = null;
  try { saved = localStorage.getItem(LANG_KEY); } catch (e) {}
  var qsLang = new URLSearchParams(location.search).get("lang");
  applyLang(qsLang === "zh" || qsLang === "en" ? qsLang
    : saved === "zh" || saved === "en" ? saved : "en");

  document.querySelectorAll(".lang-switch button").forEach(function (b) {
    b.addEventListener("click", function () { applyLang(b.getAttribute("data-lang")); });
  });

  /* ---------- shared BREE navigation on documentation pages ---------- */
  if (document.body.classList.contains("docs")) {
    var docsTopbar = document.querySelector(".docs-topbar-inner");
    if (docsTopbar && !docsTopbar.querySelector(".site-v2-doc-nav")) {
      var siteNav = document.createElement("nav");
      siteNav.className = "site-v2-doc-nav";
      siteNav.setAttribute("aria-label", "Primary navigation");
      siteNav.innerHTML = '<a href="../index.html">Homepage</a><a href="../assets.html">BREE Assets</a><a href="../dataset.html">BREE Dataset</a><a class="active" href="../guideline.html">Guideline / Documentation</a><a href="../leaderboard.html">Leaderboard</a>';
      docsTopbar.appendChild(siteNav);
    }
  }

  /* ---------- tabs ---------- */
  document.querySelectorAll("[data-tabs]").forEach(function (root) {
    root.querySelectorAll(".tab-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = btn.getAttribute("data-tab");
        root.querySelectorAll(".tab-btn").forEach(function (b) { b.classList.toggle("active", b === btn); });
        root.querySelectorAll(".tab-panel").forEach(function (p) {
          p.classList.toggle("active", p.id === id);
        });
      });
    });
  });

  /* ---------- copy buttons ---------- */
  document.querySelectorAll(".codeblock").forEach(function (block) {
    var btn = block.querySelector(".copy-btn");
    if (!btn) return;
    btn.addEventListener("click", function () {
      var pre = block.querySelector("pre");
      if (!pre) return;
      var text = pre.innerText;
      function done() {
        var old = btn.textContent;
        btn.textContent = "Copied ✓";
        btn.classList.add("copied");
        setTimeout(function () { btn.textContent = old; btn.classList.remove("copied"); }, 1600);
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, function () { fallback(); });
      } else { fallback(); }
      function fallback() {
        var ta = document.createElement("textarea");
        ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
        document.body.appendChild(ta); ta.select();
        try { document.execCommand("copy"); done(); } catch (e) {}
        document.body.removeChild(ta);
      }
    });
  });

  /* ---------- docs mobile sidebar ---------- */
  var toggle = document.querySelector(".docs-menu-toggle");
  var nav = document.querySelector(".docs-nav");
  if (toggle && nav) {
    function closeDocsMenu() {
      nav.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
    }
    toggle.addEventListener("click", function (e) {
      e.stopPropagation();
      toggle.setAttribute("aria-expanded", String(nav.classList.toggle("open")));
    });
    document.addEventListener("click", function (e) {
      if (!nav.contains(e.target) && !toggle.contains(e.target)) closeDocsMenu();
    });
    nav.addEventListener("click", function (e) {
      if (e.target.closest("a")) closeDocsMenu();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.classList.contains("open")) {
        closeDocsMenu();
        toggle.focus();
      }
    });
  }

  /* ---------- reveal on scroll ---------- */
  var reveals = document.querySelectorAll(".reveal");
  if (reveals.length && "IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("visible"); io.unobserve(en.target); }
      });
    }, { threshold: 0.12 });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("visible"); });
  }
})();
