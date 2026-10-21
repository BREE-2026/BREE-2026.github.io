/* BREE bilingual display layer. Translation strings are supplied by i18n-zh.js. */
(function () {
  "use strict";

  var LANG_KEY = "bree-lang";
  var ATTRS = ["alt", "aria-label", "aria-description", "title", "placeholder", "content"];
  var SKIP = "script,style,code,pre,kbd,samp,textarea,template,[hidden],[inert],[data-i18n-ignore],.i18n-template";
  var textOriginals = new WeakMap();
  var attrOriginals = new WeakMap();
  var observer;

  function preferredLanguage() {
    var query = new URLSearchParams(window.location.search).get("lang");
    if (query === "zh" || query === "en") return query;
    try {
      var saved = window.localStorage.getItem(LANG_KEY);
      if (saved === "zh" || saved === "en") return saved;
    } catch (e) {}
    return "en";
  }

  function setLanguage(lang, persist) {
    lang = lang === "zh" ? "zh" : "en";
    document.documentElement.lang = lang;
    document.documentElement.dataset.language = lang;
    if (persist !== false) {
      try { window.localStorage.setItem(LANG_KEY, lang); } catch (e) {}
    }
    var control = document.getElementById("bree-language-toggle");
    if (control) {
      control.setAttribute("aria-pressed", lang === "zh" ? "true" : "false");
      control.setAttribute("aria-label", lang === "zh" ? "Switch language to English" : "切换到简体中文");
      control.querySelectorAll("[data-language-option]").forEach(function (option) {
        option.setAttribute("aria-current", option.getAttribute("data-language-option") === lang ? "true" : "false");
      });
    }
    translateDocument(lang);
  }

  function dictionary() {
    return window.BREE_ZH && typeof window.BREE_ZH === "object" ? window.BREE_ZH : {};
  }

  function translatedText(original, lang) {
    if (lang !== "zh") return null;
    var dict = dictionary();
    if (typeof dict[original] === "string") return dict[original];
    var modelStatus = original.match(/^(\d+)\s+SLDASM components · optimized web mesh$/);
    var modelSuffix = "SLDASM components · optimized web mesh";
    if (modelStatus && typeof dict[modelSuffix] === "string") return modelStatus[1] + " " + dict[modelSuffix];
    return null;
  }

  function excluded(node) {
    var parent = node.parentElement;
    if (!parent || parent.closest(SKIP)) return true;
    var englishIsland = parent.closest('[data-lang="en"]');
    return !!(englishIsland && englishIsland.parentElement && englishIsland.parentElement.querySelector('[data-lang="zh"]'));
  }

  function setTranslatedScale(node, enabled) {
    if (!document.body || !document.body.classList.contains("docs") || !document.body.contains(node)) return;
    var wrapper = node.parentElement && node.parentElement.classList.contains("i18n-zh-scale") ? node.parentElement : null;
    if (enabled) {
      if (wrapper) return;
      wrapper = document.createElement("span");
      wrapper.className = "i18n-zh-scale";
      node.parentNode.insertBefore(wrapper, node);
      wrapper.appendChild(node);
    } else if (wrapper) {
      wrapper.replaceWith(node);
    }
  }

  function eligible(value) {
    var trimmed = value.trim();
    if (!trimmed || /^\d+(?:[.,:/%\s-]\d+)*$/.test(trimmed)) return false;
    if (/^(?:sudo|pip|npm|npx|python\d*|git|chmod|conda|uv|curl|lerobot-[\w-]+)\b/i.test(trimmed)) return false;
    return true;
  }

  function replacePreservingSpace(value, translated) {
    var lead = (value.match(/^\s*/) || [""])[0];
    var tail = (value.match(/\s*$/) || [""])[0];
    return lead + translated + tail;
  }

  function translateTextNode(node, lang) {
    if (!node || !node.parentElement || excluded(node)) return;
    var state = textOriginals.get(node);
    if (!state || node.nodeValue !== state.rendered) {
      state = { original: node.nodeValue, rendered: node.nodeValue };
      textOriginals.set(node, state);
    }
    var original = state.original;
    var trimmed = original.trim();
    if (!eligible(original)) return;
    if (node.parentElement.closest('[data-lang="zh"]')) {
      setTranslatedScale(node, false);
      return;
    }
    var translated = translatedText(trimmed, lang);
    var next = translated ? replacePreservingSpace(original, translated) : original;
    if (node.nodeValue !== next) node.nodeValue = next;
    state.rendered = next;
    setTranslatedScale(node, !!(lang === "zh" && translated));
  }

  function translateAttribute(element, name, lang) {
    if (element.closest(SKIP)) return;
    if (element.closest('[data-lang="zh"]')) return;
    var englishIsland = element.closest('[data-lang="en"]');
    if (englishIsland && englishIsland.parentElement && englishIsland.parentElement.querySelector('[data-lang="zh"]')) return;
    var values = attrOriginals.get(element);
    if (!values) { values = Object.create(null); attrOriginals.set(element, values); }
    var current = element.getAttribute(name);
    var state = values[name];
    if (!state || current !== state.rendered) {
      state = { original: current, rendered: current };
      values[name] = state;
    }
    var original = state.original;
    if (!original || !eligible(original)) return;
    var translated = translatedText(original.trim(), lang);
    var next = translated ? replacePreservingSpace(original, translated) : original;
    if (element.getAttribute(name) !== next) element.setAttribute(name, next);
    state.rendered = next;
  }

  function visit(root, lang) {
    if (!root) return;
    if (root.nodeType === Node.TEXT_NODE) { translateTextNode(root, lang); return; }
    if (root.nodeType !== Node.ELEMENT_NODE && root !== document.body) return;
    if (root.nodeType === Node.ELEMENT_NODE && !root.matches(SKIP)) {
      ATTRS.forEach(function (name) { if (root.hasAttribute(name)) translateAttribute(root, name, lang); });
    }
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (node) { return excluded(node) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT; }
    });
    var nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(function (node) { translateTextNode(node, lang); });
    if (root.querySelectorAll) {
      root.querySelectorAll("[alt],[aria-label],[aria-description],[title],[placeholder],[content]").forEach(function (element) {
        ATTRS.forEach(function (name) { if (element.hasAttribute(name)) translateAttribute(element, name, lang); });
      });
    }
  }

  function translateDocument(lang) {
    if (!document.body) return;
    visit(document.body, lang);
    var title = document.querySelector("head title");
    if (title) translateTextNode(title.firstChild, lang);
    document.querySelectorAll('meta[name="description"],meta[property="og:title"],meta[property="og:description"]').forEach(function (meta) {
      translateAttribute(meta, "content", lang);
    });
  }

  function mountControl() {
    if (document.getElementById("bree-language-toggle")) return;
    var button = document.createElement("button");
    button.type = "button";
    button.id = "bree-language-toggle";
    button.className = "bree-language-toggle";
    button.setAttribute("data-i18n-ignore", "");
    button.setAttribute("aria-label", "切换到简体中文");
    button.setAttribute("aria-pressed", "false");
    button.innerHTML = '<span aria-hidden="true" class="bree-language-toggle__icon">文</span><span class="bree-language-toggle__label"><span data-language-option="en" aria-current="true">EN</span><span class="bree-language-toggle__divider" aria-hidden="true">/</span><span data-language-option="zh">中文</span></span>';
    button.addEventListener("click", function () {
      setLanguage(document.documentElement.lang === "zh" ? "en" : "zh");
    });
    document.querySelectorAll(".docs-topbar .lang-switch").forEach(function (legacy) { legacy.remove(); });
    document.body.appendChild(button);
    setLanguage(document.documentElement.lang, false);
  }

  function startObserver() {
    if (!("MutationObserver" in window) || !document.body) return;
    observer = new MutationObserver(function (records) {
      var lang = document.documentElement.lang === "zh" ? "zh" : "en";
      records.forEach(function (record) {
        if (record.type === "characterData") translateTextNode(record.target, lang);
        record.addedNodes && record.addedNodes.forEach(function (node) { visit(node, lang); });
        if (record.type === "attributes" && record.target.nodeType === Node.ELEMENT_NODE && ATTRS.indexOf(record.attributeName) !== -1) {
          translateAttribute(record.target, record.attributeName, lang);
        }
      });
    });
    observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  }

  document.documentElement.classList.add("i18n-pending");
  setLanguage(preferredLanguage(), true);
  function ready() {
    mountControl();
    startObserver();
    document.documentElement.classList.remove("i18n-pending");
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", ready, { once: true });
  else ready();
})();
