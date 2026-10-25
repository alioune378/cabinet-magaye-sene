/* Cabinet Magaye Sène — site logic. Réalisation : Dalal Studio. */
(function () {
  "use strict";
  var $ = function (s) { return document.querySelector(s); };
  var $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };
  var FR = {}; var lang = "fr";
  $$("[data-i18n]").forEach(function (el) { FR[el.dataset.i18n] = el.textContent; });
  FR.meta_title = document.title;
  FR.meta_desc = $('meta[name="description"]').content;
  Object.keys(window.FR_EXTRA).forEach(function (k) { FR[k] = window.FR_EXTRA[k]; });
  function t(k) { var d = lang === "en" ? window.EN : FR; return d[k] != null ? d[k] : FR[k]; }

  function apply(l) {
    lang = l === "en" ? "en" : "fr";
    document.documentElement.lang = lang;
    $$("[data-i18n]").forEach(function (el) { var v = t(el.dataset.i18n); if (v != null) el.textContent = v; });
    document.title = t("meta_title");
    $('meta[name="description"]').content = t("meta_desc");
    $$(".lang-btn").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.lang === lang)); });
    $("#f-lang").value = lang;
    try { localStorage.setItem("ms-lang", lang); } catch (e) {}
    var u = new URL(location.href);
    if (lang === "en") u.searchParams.set("lang", "en"); else u.searchParams.delete("lang");
    history.replaceState(null, "", u.pathname + u.search + u.hash);
  }
  function initial() {
    var q = new URLSearchParams(location.search).get("lang");
    if (q === "en" || q === "fr") return q;
    try { var s = localStorage.getItem("ms-lang"); if (s) return s; } catch (e) {}
    return (navigator.language || "fr").slice(0, 2) === "fr" ? "fr" : (navigator.language ? "en" : "fr");
  }

  // menu
  var btn = $("#menuBtn"), nav = $("#navLinks");
  function setMenu(o) { btn.setAttribute("aria-expanded", String(o)); nav.classList.toggle("open", o); }
  btn.addEventListener("click", function () { setMenu(btn.getAttribute("aria-expanded") !== "true"); });
  $$("#navLinks a").forEach(function (a) { a.addEventListener("click", function () { setMenu(false); }); });
  $$(".lang-btn").forEach(function (b) { b.addEventListener("click", function () { apply(b.dataset.lang); }); });

  // legal dialog
  var dlg = $("#legalDlg");
  $("#legalBtn").addEventListener("click", function () { dlg.showModal ? dlg.showModal() : dlg.setAttribute("open", ""); });
  $("#legalClose").addEventListener("click", function () { dlg.close ? dlg.close() : dlg.removeAttribute("open"); });

  // compact header after scrolling
  var header = $(".header");
  var onScroll = function () { header.classList.toggle("scrolled", window.scrollY > 40); };
  window.addEventListener("scroll", onScroll, { passive: true }); onScroll();

  // "Aucun" document unchecks the others, and vice versa
  $$('#reqForm input[name="documents"]').forEach(function (cb) {
    cb.addEventListener("change", function () {
      if (!cb.checked) return;
      $$('#reqForm input[name="documents"]').forEach(function (o) {
        if (o !== cb && ((cb.value === "Aucun") !== (o.value === "Aucun"))) o.checked = false;
      });
    });
  });

  // form
  var form = $("#reqForm"), status = $("#formStatus");
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    status.className = "form-status"; status.textContent = "";
    var bad = null;
    $$("#reqForm [required]").forEach(function (f) {
      var empty = !f.value.trim();
      f.toggleAttribute("aria-invalid", empty);
      if (empty && !bad) bad = f;
    });
    if (bad) { status.classList.add("bad"); status.textContent = t("f_req"); bad.focus(); return; }
    var em = $("#f-email");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em.value.trim())) { em.setAttribute("aria-invalid", ""); status.classList.add("bad"); status.textContent = t("f_bad_email"); em.focus(); return; }
    var sb = $("#f-submit"); sb.disabled = true; sb.textContent = t("f_sending");
    var fd = new FormData(form);
    var docs = fd.getAll("documents"); fd.delete("documents"); fd.append("documents", docs.join(", "));
    fetch("/", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(fd).toString() })
      .then(function (r) { if (!r.ok) throw new Error(r.status); form.reset(); $("#f-lang").value = lang; status.classList.add("ok"); status.textContent = t("f_ok"); })
      .catch(function () { status.classList.add("bad"); status.textContent = t("f_err"); })
      .then(function () { sb.disabled = false; sb.textContent = t("f_send"); });
  });

  apply(initial());
})();
