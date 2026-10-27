/* Cabinet Magaye Sène — site logic. Réalisation : Dalal Studio. */
(function () {
  "use strict";
  var $ = function (s) { return document.querySelector(s); };
  var $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };
  var FR = {}; var lang = "fr";
  $$("[data-i18n]").forEach(function (el) { FR[el.dataset.i18n] = el.textContent; });
  $$("[data-i18n-aria]").forEach(function (el) { FR[el.dataset.i18nAria] = el.getAttribute("aria-label"); });
  $$("[data-i18n-title]").forEach(function (el) { FR[el.dataset.i18nTitle] = el.getAttribute("title"); });
  FR.meta_title = document.title;
  FR.meta_desc = $('meta[name="description"]').content;
  Object.keys(window.FR_EXTRA).forEach(function (k) { FR[k] = window.FR_EXTRA[k]; });
  function t(k) { var d = lang === "en" ? window.EN : FR; return d[k] != null ? d[k] : FR[k]; }

  function apply(l) {
    lang = l === "en" ? "en" : "fr";
    document.documentElement.lang = lang;
    $$("[data-i18n]").forEach(function (el) { var v = t(el.dataset.i18n); if (v != null) el.textContent = v; });
    $$("[data-i18n-aria]").forEach(function (el) { var v = t(el.dataset.i18nAria); if (v != null) el.setAttribute("aria-label", v); });
    $$("[data-i18n-title]").forEach(function (el) { var v = t(el.dataset.i18nTitle); if (v != null) el.setAttribute("title", v); });
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


  // Reduce large photos in the browser (max 1600 px, JPEG) so uploads stay small. PDFs are sent as they are.
  function shrink(file) {
    if (!/^image\/(jpeg|png|webp|heic|heif)$/.test(file.type) || file.size < 900 * 1024) return Promise.resolve(file);
    return new Promise(function (resolve) {
      var img = new Image(), url = URL.createObjectURL(file);
      img.onload = function () {
        var max = 1600, w = img.naturalWidth, h = img.naturalHeight, r = Math.min(1, max / Math.max(w, h));
        var c = document.createElement("canvas"); c.width = Math.round(w * r); c.height = Math.round(h * r);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        c.toBlob(function (b) { resolve(b && b.size < file.size ? b : file); }, "image/jpeg", 0.8);
      };
      img.onerror = function () { URL.revokeObjectURL(url); resolve(file); };
      img.src = url;
    });
  }

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
    var files = $$('#reqForm input[type="file"]').map(function (i) { return i.files && i.files[0] ? { name: i.name, file: i.files[0] } : null; }).filter(Boolean);
    for (var k = 0; k < files.length; k++) {
      var ty = files[k].file.type;
      if (!(ty === "application/pdf" || /^image\//.test(ty))) { status.classList.add("bad"); status.textContent = t("f_bad_type"); return; }
    }
    var sb = $("#f-submit"); sb.disabled = true; sb.textContent = t("f_sending");
    Promise.all(files.map(function (f) { return shrink(f.file).then(function (b) { return { name: f.name, blob: b, orig: f.file, fname: f.file.name }; }); }))
      .then(function (ready) {
        var total = ready.reduce(function (a, r) { return a + r.blob.size; }, 0);
        if (total > 7 * 1024 * 1024) { var er = new Error("big"); er.big = true; throw er; }
        var fd = new FormData(form);
        var docs = fd.getAll("documents"); fd.delete("documents"); fd.append("documents", docs.join(", "));
        ["piece_propriete", "piece_plan", "piece_photo"].forEach(function (n) { fd.delete(n); });
        ready.forEach(function (r) { fd.append(r.name, r.blob, r.blob === r.orig ? r.fname : r.fname.replace(/\.[^.]+$/, "") + ".jpg"); });
        return fetch("/", { method: "POST", body: fd });
      })
      .then(function (r) { if (!r.ok) throw new Error(r.status); form.reset(); $("#f-lang").value = lang; status.classList.add("ok"); status.textContent = t("f_ok"); })
      .catch(function (err) { status.classList.add("bad"); status.textContent = err && err.big ? t("f_too_big") : t("f_err"); })
      .then(function () { sb.disabled = false; sb.textContent = t("f_send"); });
  });

  apply(initial());
})();
