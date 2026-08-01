/* ======================================================================
   RAMA BAZIN & COUTURE — app.js
   Application PWA 100% autonome — Aucune dépendance serveur obligatoire.
   Toutes les ressources sont référencées à la racine du dépôt GitHub.
   Powered by EMPIRE DONKO
   ====================================================================== */

(function () {
  "use strict";

  /* ----------------------------------------------------------------
   * 0. CONFIGURATION GLOBALE
   * ------------------------------------------------------------- */
  const CONFIG = {
    dataFile: "data.json",
    localKeys: {
      clientId: "rama_client_id",
      cart: "rama_cart",
      favorites: "rama_favorites",
      measurements: "rama_measurements",
      history: "rama_history",
      lastSync: "rama_last_sync"
    },
    // Remplacez cette URL par celle de votre Google Apps Script Web App
    // (Déployer > Nouveau déploiement > Application Web) pour activer la
    // synchronisation multi-appareils via Google Sheets. Le site fonctionne
    // intégralement hors-ligne même si cette URL n'est pas configurée.
    googleScriptUrl: "",
    whatsappBase: "https://wa.me/"
  };

  let SITE_DATA = null;

  /* ----------------------------------------------------------------
   * 1. UTILITAIRES
   * ------------------------------------------------------------- */
  function $(selector, scope) {
    return (scope || document).querySelector(selector);
  }
  function $all(selector, scope) {
    return Array.prototype.slice.call((scope || document).querySelectorAll(selector));
  }
  function formatFCFA(amount) {
    const n = Number(amount) || 0;
    return n.toLocaleString("fr-FR").replace(/,/g, " ") + " FCFA";
  }
  function escapeHtml(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
  function readJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      console.warn("Lecture locale impossible pour", key, e);
      return fallback;
    }
  }
  function writeJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.warn("Écriture locale impossible pour", key, e);
      return false;
    }
  }
  function toast(message, duration) {
    let host = $("#rama-toast-host");
    if (!host) {
      host = document.createElement("div");
      host.id = "rama-toast-host";
      host.setAttribute("aria-live", "polite");
      document.body.appendChild(host);
    }
    const el = document.createElement("div");
    el.className = "rama-toast";
    el.textContent = message;
    host.appendChild(el);
    requestAnimationFrame(() => el.classList.add("is-visible"));
    setTimeout(() => {
      el.classList.remove("is-visible");
      setTimeout(() => el.remove(), 300);
    }, duration || 2600);
  }

  /* ----------------------------------------------------------------
   * 2. IDENTIFIANT CLIENT & STOCKAGE LOCAL
   * ------------------------------------------------------------- */
  function generateClientId() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let suffix = "";
    for (let i = 0; i < 4; i++) {
      suffix += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return "RAMA-" + suffix;
  }
  function getClientId() {
    let id = localStorage.getItem(CONFIG.localKeys.clientId);
    if (!id) {
      id = generateClientId();
      localStorage.setItem(CONFIG.localKeys.clientId, id);
    }
    return id;
  }
  function setClientId(id) {
    const clean = String(id || "").trim().toUpperCase();
    if (!/^RAMA-[A-Z0-9]{4}$/.test(clean)) {
      return false;
    }
    localStorage.setItem(CONFIG.localKeys.clientId, clean);
    return true;
  }

  function getCart() {
    return readJSON(CONFIG.localKeys.cart, []);
  }
  function setCart(cart) {
    writeJSON(CONFIG.localKeys.cart, cart);
    updateCartBadge();
  }
  function addToCart(productId, qty) {
    const cart = getCart();
    const existing = cart.find((it) => it.id === productId);
    if (existing) {
      existing.qty += qty || 1;
    } else {
      cart.push({ id: productId, qty: qty || 1 });
    }
    setCart(cart);
    scheduleSync();
  }
  function removeFromCart(productId) {
    setCart(getCart().filter((it) => it.id !== productId));
    scheduleSync();
  }
  function updateCartQty(productId, qty) {
    const cart = getCart();
    const item = cart.find((it) => it.id === productId);
    if (item) {
      item.qty = Math.max(1, qty);
      setCart(cart);
      scheduleSync();
    }
  }
  function clearCart() {
    setCart([]);
    scheduleSync();
  }

  function getFavorites() {
    return readJSON(CONFIG.localKeys.favorites, []);
  }
  function toggleFavorite(productId) {
    let favs = getFavorites();
    if (favs.includes(productId)) {
      favs = favs.filter((id) => id !== productId);
    } else {
      favs.push(productId);
    }
    writeJSON(CONFIG.localKeys.favorites, favs);
    scheduleSync();
    return favs.includes(productId);
  }

  function getMeasurements() {
    return readJSON(CONFIG.localKeys.measurements, {});
  }
  function setMeasurements(data) {
    writeJSON(CONFIG.localKeys.measurements, data);
    scheduleSync();
  }

  function getHistory() {
    return readJSON(CONFIG.localKeys.history, []);
  }
  function addHistoryEntry(entry) {
    const h = getHistory();
    h.unshift(Object.assign({ date: new Date().toISOString() }, entry));
    writeJSON(CONFIG.localKeys.history, h.slice(0, 50));
    scheduleSync();
  }

  /* ----------------------------------------------------------------
   * 3. SYNCHRONISATION GOOGLE SHEETS (via Google Apps Script)
   * ------------------------------------------------------------- */
  let syncTimer = null;
  function scheduleSync() {
    if (!CONFIG.googleScriptUrl) return;
    clearTimeout(syncTimer);
    syncTimer = setTimeout(syncNow, 1200);
  }
  function buildSyncPayload() {
    return {
      clientId: getClientId(),
      cart: getCart(),
      favorites: getFavorites(),
      measurements: getMeasurements(),
      history: getHistory(),
      updatedAt: new Date().toISOString()
    };
  }
  function syncNow() {
    if (!CONFIG.googleScriptUrl || !navigator.onLine) return Promise.resolve(false);
    const payload = buildSyncPayload();
    return fetch(CONFIG.googleScriptUrl, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: "save", payload: payload })
    })
      .then(() => {
        localStorage.setItem(CONFIG.localKeys.lastSync, new Date().toISOString());
        return true;
      })
      .catch((err) => {
        console.warn("Synchronisation impossible (mode hors-ligne):", err);
        return false;
      });
  }
  function restoreFromCloud(clientId) {
    if (!CONFIG.googleScriptUrl) {
      toast("Synchronisation cloud non configurée. Vos données restent locales.");
      return Promise.resolve(false);
    }
    const url = CONFIG.googleScriptUrl + "?action=load&clientId=" + encodeURIComponent(clientId);
    return fetch(url)
      .then((res) => res.json())
      .then((remote) => {
        if (!remote) return false;
        if (remote.cart) writeJSON(CONFIG.localKeys.cart, remote.cart);
        if (remote.favorites) writeJSON(CONFIG.localKeys.favorites, remote.favorites);
        if (remote.measurements) writeJSON(CONFIG.localKeys.measurements, remote.measurements);
        if (remote.history) writeJSON(CONFIG.localKeys.history, remote.history);
        return true;
      })
      .catch((err) => {
        console.warn("Restauration cloud impossible:", err);
        return false;
      });
  }

  /* ----------------------------------------------------------------
   * 4. CHARGEMENT DES DONNÉES (data.json)
   * ------------------------------------------------------------- */
  function loadData() {
    return fetch(CONFIG.dataFile + "?v=" + Date.now(), { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error("data.json introuvable (" + res.status + ")");
        return res.json();
      })
      .then((json) => {
        SITE_DATA = json;
        return json;
      })
      .catch((err) => {
        console.error("Erreur de chargement de data.json :", err);
        SITE_DATA = { meta: {}, categories: [], products: [], videos: [] };
        toast("Impossible de charger le catalogue. Vérifiez votre connexion.");
        return SITE_DATA;
      });
  }

  /* ----------------------------------------------------------------
   * 5. RENDU — INFORMATIONS GÉNÉRALES
   * ------------------------------------------------------------- */
  function renderMeta() {
    const meta = SITE_DATA.meta || {};
    $all("[data-bind='siteName']").forEach((el) => (el.textContent = meta.siteName || ""));
    $all("[data-bind='slogan']").forEach((el) => (el.textContent = meta.slogan || ""));
    $all("[data-bind='email']").forEach((el) => {
      el.textContent = meta.email || "";
      if (el.tagName === "A") el.href = "mailto:" + (meta.email || "");
    });
    $all("[data-bind='instagram']").forEach((el) => (el.textContent = meta.instagram || ""));
    $all("[data-bind='siege']").forEach((el) => (el.textContent = meta.siege || ""));
    $all("[data-bind='annexe']").forEach((el) => (el.textContent = meta.annexe || ""));
    $all("[data-bind='phone1Display']").forEach((el) => (el.textContent = meta.phone1Display || ""));
    $all("[data-bind='phone2Display']").forEach((el) => (el.textContent = meta.phone2Display || ""));
    $all("[data-wa-link='phone1']").forEach((el) => {
      el.href = CONFIG.whatsappBase + (meta.phone1Wa || "") + "?text=" + encodeURIComponent("Bonjour Rama Bazin & Couture, je souhaite avoir des renseignements.");
    });
    $all("[data-wa-link='phone2']").forEach((el) => {
      el.href = CONFIG.whatsappBase + (meta.phone2Wa || "") + "?text=" + encodeURIComponent("Bonjour Rama Bazin & Couture, je souhaite avoir des renseignements.");
    });
    $all("[data-bind='logo']").forEach((el) => {
      if (el.tagName === "IMG") el.src = meta.logo || "logo.jpg";
    });
    const heroImg = $("#hero-media-image");
    if (heroImg && meta.heroImage) heroImg.src = meta.heroImage;
    document.title = (meta.siteName || "Rama Bazin & Couture") + " — " + (meta.slogan || "");
  }

  /* ----------------------------------------------------------------
   * 6. RENDU — BOUTIQUE
   * ------------------------------------------------------------- */
  let activeCategory = "all";
  let searchTerm = "";

  function renderCategoryFilters() {
    const host = $("#category-filters");
    if (!host) return;
    const cats = SITE_DATA.categories || [];
    let html = '<button type="button" class="chip is-active" data-cat="all">Tout</button>';
    cats.forEach((c) => {
      html += '<button type="button" class="chip" data-cat="' + escapeHtml(c.id) + '">' + escapeHtml(c.label) + "</button>";
    });
    host.innerHTML = html;
    $all(".chip", host).forEach((btn) => {
      btn.addEventListener("click", () => {
        activeCategory = btn.getAttribute("data-cat");
        $all(".chip", host).forEach((b) => b.classList.toggle("is-active", b === btn));
        renderProducts();
      });
    });
  }

  function categoryLabel(id) {
    const cat = (SITE_DATA.categories || []).find((c) => c.id === id);
    return cat ? cat.label : id;
  }

  function productCardHtml(p) {
    const favs = getFavorites();
    const isFav = favs.includes(p.id);
    const meta = SITE_DATA.meta || {};
    const waMsg = encodeURIComponent(
      "Bonjour Rama Bazin & Couture, je souhaite commander : " + p.name + " (" + formatFCFA(p.price) + "). Merci de me confirmer la disponibilité."
    );
    return (
      '<article class="product-card" data-id="' + escapeHtml(p.id) + '">' +
        '<button type="button" class="fav-btn' + (isFav ? " is-active" : "") + '" data-fav="' + escapeHtml(p.id) + '" aria-label="Ajouter aux favoris" aria-pressed="' + isFav + '">&#9825;</button>' +
        '<div class="product-media"><img src="' + escapeHtml(p.image) + '" alt="' + escapeHtml(p.name) + '" loading="lazy" onerror="this.src=\'logo.jpg\';this.classList.add(\'img-fallback\')"></div>' +
        '<div class="product-body">' +
          '<span class="product-cat">' + escapeHtml(categoryLabel(p.category)) + "</span>" +
          '<h3 class="product-name">' + escapeHtml(p.name) + "</h3>" +
          '<p class="product-price">' + formatFCFA(p.price) + "</p>" +
          '<div class="product-actions">' +
            '<button type="button" class="btn btn-ghost btn-sm" data-add="' + escapeHtml(p.id) + '">Ajouter au panier</button>' +
            '<a class="btn btn-gold btn-sm" target="_blank" rel="noopener" href="' + CONFIG.whatsappBase + escapeHtml(meta.phone1Wa || "") + "?text=" + waMsg + '">Commander WhatsApp</a>' +
          "</div>" +
        "</div>" +
      "</article>"
    );
  }

  function renderProducts() {
    const grid = $("#products-grid");
    if (!grid) return;
    const products = SITE_DATA.products || [];
    const filtered = products.filter((p) => {
      const matchCat = activeCategory === "all" || p.category === activeCategory;
      const matchSearch = !searchTerm || p.name.toLowerCase().indexOf(searchTerm.toLowerCase()) !== -1;
      return matchCat && matchSearch;
    });
    if (!filtered.length) {
      grid.innerHTML = '<p class="empty-state">Aucun article dans cette catégorie pour le moment. Revenez bientôt&nbsp;!</p>';
      return;
    }
    grid.innerHTML = filtered.map(productCardHtml).join("");
    $all("[data-add]", grid).forEach((btn) => {
      btn.addEventListener("click", () => {
        addToCart(btn.getAttribute("data-add"), 1);
        toast("Article ajouté au panier.");
      });
    });
    $all("[data-fav]", grid).forEach((btn) => {
      btn.addEventListener("click", () => {
        const active = toggleFavorite(btn.getAttribute("data-fav"));
        btn.classList.toggle("is-active", active);
        btn.setAttribute("aria-pressed", String(active));
        toast(active ? "Ajouté aux favoris." : "Retiré des favoris.");
      });
    });
  }

  function renderFeatured() {
    const host = $("#featured-grid");
    if (!host) return;
    const featured = (SITE_DATA.products || []).filter((p) => p.featured).slice(0, 4);
    host.innerHTML = featured.map(productCardHtml).join("");
    $all("[data-add]", host).forEach((btn) => {
      btn.addEventListener("click", () => {
        addToCart(btn.getAttribute("data-add"), 1);
        toast("Article ajouté au panier.");
      });
    });
    $all("[data-fav]", host).forEach((btn) => {
      btn.addEventListener("click", () => {
        const active = toggleFavorite(btn.getAttribute("data-fav"));
        btn.classList.toggle("is-active", active);
        btn.setAttribute("aria-pressed", String(active));
      });
    });
  }

  /* ----------------------------------------------------------------
   * 7. PANIER — TIROIR & CHECKOUT WHATSAPP
   * ------------------------------------------------------------- */
  function updateCartBadge() {
    const count = getCart().reduce((sum, it) => sum + it.qty, 0);
    $all("[data-cart-count]").forEach((el) => {
      el.textContent = String(count);
      el.classList.toggle("is-hidden", count === 0);
    });
  }

  function renderCartDrawer() {
    const host = $("#cart-items");
    if (!host) return;
    const cart = getCart();
    const products = SITE_DATA.products || [];
    if (!cart.length) {
      host.innerHTML = '<p class="empty-state">Votre panier est vide.</p>';
      $("#cart-total") && ($("#cart-total").textContent = formatFCFA(0));
      return;
    }
    let total = 0;
    host.innerHTML = cart
      .map((item) => {
        const p = products.find((pp) => pp.id === item.id);
        if (!p) return "";
        const lineTotal = p.price * item.qty;
        total += lineTotal;
        return (
          '<div class="cart-line" data-id="' + escapeHtml(p.id) + '">' +
            '<img src="' + escapeHtml(p.image) + '" alt="' + escapeHtml(p.name) + '" onerror="this.src=\'logo.jpg\'">' +
            '<div class="cart-line-info">' +
              '<p class="cart-line-name">' + escapeHtml(p.name) + "</p>" +
              '<p class="cart-line-price">' + formatFCFA(p.price) + "</p>" +
              '<div class="qty-control">' +
                '<button type="button" data-qty-minus="' + escapeHtml(p.id) + '" aria-label="Diminuer">−</button>' +
                '<span>' + item.qty + "</span>" +
                '<button type="button" data-qty-plus="' + escapeHtml(p.id) + '" aria-label="Augmenter">+</button>' +
              "</div>" +
            "</div>" +
            '<button type="button" class="cart-remove" data-remove="' + escapeHtml(p.id) + '" aria-label="Retirer">✕</button>' +
          "</div>"
        );
      })
      .join("");
    if ($("#cart-total")) $("#cart-total").textContent = formatFCFA(total);
    $all("[data-qty-plus]", host).forEach((btn) =>
      btn.addEventListener("click", () => {
        const item = cart.find((it) => it.id === btn.getAttribute("data-qty-plus"));
        updateCartQty(btn.getAttribute("data-qty-plus"), (item ? item.qty : 0) + 1);
        renderCartDrawer();
      })
    );
    $all("[data-qty-minus]", host).forEach((btn) =>
      btn.addEventListener("click", () => {
        const item = cart.find((it) => it.id === btn.getAttribute("data-qty-minus"));
        const newQty = (item ? item.qty : 1) - 1;
        if (newQty <= 0) {
          removeFromCart(btn.getAttribute("data-qty-minus"));
        } else {
          updateCartQty(btn.getAttribute("data-qty-minus"), newQty);
        }
        renderCartDrawer();
      })
    );
    $all("[data-remove]", host).forEach((btn) =>
      btn.addEventListener("click", () => {
        removeFromCart(btn.getAttribute("data-remove"));
        renderCartDrawer();
        toast("Article retiré du panier.");
      })
    );
  }

  function buildCartWhatsAppMessage() {
    const cart = getCart();
    const products = SITE_DATA.products || [];
    let total = 0;
    let lines = ["Bonjour Rama Bazin & Couture, je souhaite commander :"];
    cart.forEach((item) => {
      const p = products.find((pp) => pp.id === item.id);
      if (!p) return;
      const lineTotal = p.price * item.qty;
      total += lineTotal;
      lines.push("- " + p.name + " x" + item.qty + " = " + formatFCFA(lineTotal));
    });
    lines.push("Total : " + formatFCFA(total));
    lines.push("Mon ID Client : " + getClientId());
    return lines.join("\n");
  }

  function openCartCheckout() {
    const cart = getCart();
    if (!cart.length) {
      toast("Votre panier est vide.");
      return;
    }
    const meta = SITE_DATA.meta || {};
    const message = encodeURIComponent(buildCartWhatsAppMessage());
    addHistoryEntry({ type: "commande", items: cart, total: buildCartWhatsAppMessage() });
    window.open(CONFIG.whatsappBase + (meta.phone1Wa || "") + "?text=" + message, "_blank", "noopener");
  }

  function setupCartDrawer() {
    const drawer = $("#cart-drawer");
    const overlay = $("#cart-overlay");
    const openBtns = $all("[data-open-cart]");
    const closeBtns = $all("[data-close-cart]");
    function open() {
      renderCartDrawer();
      drawer && drawer.classList.add("is-open");
      overlay && overlay.classList.add("is-open");
      document.body.classList.add("no-scroll");
    }
    function close() {
      drawer && drawer.classList.remove("is-open");
      overlay && overlay.classList.remove("is-open");
      document.body.classList.remove("no-scroll");
    }
    openBtns.forEach((b) => b.addEventListener("click", open));
    closeBtns.forEach((b) => b.addEventListener("click", close));
    overlay && overlay.addEventListener("click", close);
    const checkoutBtn = $("#cart-checkout");
    checkoutBtn && checkoutBtn.addEventListener("click", openCartCheckout);
    const clearBtn = $("#cart-clear");
    clearBtn &&
      clearBtn.addEventListener("click", () => {
        clearCart();
        renderCartDrawer();
        toast("Panier vidé.");
      });
  }

  /* ----------------------------------------------------------------
   * 8. VIDÉOS — LECTEUR SUR MESURE
   * ------------------------------------------------------------- */
  function renderVideos() {
    const host = $("#videos-grid");
    if (!host) return;
    const videos = SITE_DATA.videos || [];
    if (!videos.length) {
      host.innerHTML = '<p class="empty-state">Les vidéos de défilés arrivent bientôt.</p>';
      return;
    }
    host.innerHTML = videos
      .map(
        (v) =>
          '<figure class="video-card" data-video-card>' +
            '<div class="video-frame">' +
              '<video preload="metadata" playsinline poster="' + escapeHtml(v.poster || "") + '" src="' + escapeHtml(v.file) + '"></video>' +
              '<button type="button" class="video-play-overlay" data-video-toggle aria-label="Lire la vidéo">' +
                '<span class="play-icon" aria-hidden="true">&#9658;</span>' +
              "</button>" +
              '<div class="video-controls">' +
                '<button type="button" class="vc-btn" data-video-toggle aria-label="Lecture / Pause">&#9658;</button>' +
                '<div class="video-progress"><div class="video-progress-fill"></div></div>' +
                '<button type="button" class="vc-btn" data-video-mute aria-label="Son">&#128266;</button>' +
              "</div>" +
            "</div>" +
            '<figcaption>' + escapeHtml(v.title) + "</figcaption>" +
          "</figure>"
      )
      .join("");

    $all("[data-video-card]", host).forEach((card) => {
      const video = $("video", card);
      const overlay = $(".video-play-overlay", card);
      const toggleBtns = $all("[data-video-toggle]", card);
      const muteBtn = $("[data-video-mute]", card);
      const fill = $(".video-progress-fill", card);

      function playPause() {
        if (video.paused) {
          $all("video", host).forEach((v) => {
            if (v !== video) v.pause();
          });
          video
            .play()
            .then(() => card.classList.add("is-playing"))
            .catch(() => toast("Lecture impossible sur cet appareil."));
        } else {
          video.pause();
          card.classList.remove("is-playing");
        }
      }
      toggleBtns.forEach((btn) => btn.addEventListener("click", playPause));
      overlay.addEventListener("click", playPause);
      video.addEventListener("play", () => card.classList.add("is-playing"));
      video.addEventListener("pause", () => card.classList.remove("is-playing"));
      video.addEventListener("ended", () => card.classList.remove("is-playing"));
      video.addEventListener("timeupdate", () => {
        if (video.duration) {
          fill.style.width = (video.currentTime / video.duration) * 100 + "%";
        }
      });
      muteBtn &&
        muteBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          video.muted = !video.muted;
          muteBtn.innerHTML = video.muted ? "&#128263;" : "&#128266;";
        });
    });
  }

  /* ----------------------------------------------------------------
   * 9. COMPTE CLIENT — ID, MESURES, FAVORIS, HISTORIQUE
   * ------------------------------------------------------------- */
  function renderAccount() {
    const idField = $("#client-id-display");
    if (idField) idField.textContent = getClientId();

    const form = $("#measurements-form");
    if (form) {
      const saved = getMeasurements();
      $all("input[data-measure]", form).forEach((input) => {
        const key = input.getAttribute("data-measure");
        if (saved[key] != null) input.value = saved[key];
      });
    }

    const favHost = $("#favorites-grid");
    if (favHost) {
      const favs = getFavorites();
      const products = (SITE_DATA.products || []).filter((p) => favs.includes(p.id));
      favHost.innerHTML = products.length
        ? products.map(productCardHtml).join("")
        : '<p class="empty-state">Aucun favori pour le moment. Touchez le cœur sur un article pour l\'ajouter ici.</p>';
      $all("[data-add]", favHost).forEach((btn) =>
        btn.addEventListener("click", () => {
          addToCart(btn.getAttribute("data-add"), 1);
          toast("Article ajouté au panier.");
        })
      );
      $all("[data-fav]", favHost).forEach((btn) =>
        btn.addEventListener("click", () => {
          toggleFavorite(btn.getAttribute("data-fav"));
          renderAccount();
        })
      );
    }

    const histHost = $("#history-list");
    if (histHost) {
      const hist = getHistory();
      histHost.innerHTML = hist.length
        ? hist
            .map((h) => {
              const d = new Date(h.date);
              return (
                '<li class="history-item"><span class="history-date">' +
                d.toLocaleDateString("fr-FR") +
                "</span><span class=\"history-type\">" +
                escapeHtml(h.type || "activité") +
                "</span></li>"
              );
            })
            .join("")
        : '<li class="empty-state">Aucun historique pour le moment.</li>';
    }
  }

  function setupAccount() {
    const form = $("#measurements-form");
    if (form) {
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        const data = {};
        $all("input[data-measure]", form).forEach((input) => {
          data[input.getAttribute("data-measure")] = input.value.trim();
        });
        setMeasurements(data);
        toast("Vos mesures ont été enregistrées.");
      });
    }
    const restoreForm = $("#restore-id-form");
    if (restoreForm) {
      restoreForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const input = $("#restore-id-input", restoreForm);
        const value = input ? input.value : "";
        if (setClientId(value)) {
          restoreFromCloud(getClientId()).then((ok) => {
            renderAccount();
            renderCartDrawer();
            updateCartBadge();
            toast(ok ? "Profil restauré avec succès." : "ID enregistré. Données locales conservées.");
          });
        } else {
          toast("Format d'ID invalide. Exemple : RAMA-98A1");
        }
      });
    }
    const copyBtn = $("#copy-client-id");
    if (copyBtn) {
      copyBtn.addEventListener("click", () => {
        const id = getClientId();
        if (navigator.clipboard) {
          navigator.clipboard.writeText(id).then(() => toast("ID copié : " + id));
        } else {
          toast("Votre ID : " + id);
        }
      });
    }
  }

  /* ----------------------------------------------------------------
   * 10. RECHERCHE
   * ------------------------------------------------------------- */
  function setupSearch() {
    const input = $("#product-search");
    if (!input) return;
    input.addEventListener("input", () => {
      searchTerm = input.value;
      renderProducts();
    });
  }

  /* ----------------------------------------------------------------
   * 11. NAVIGATION / MENU MOBILE / SCROLL HEADER
   * ------------------------------------------------------------- */
  function setupNav() {
    const toggle = $("#nav-toggle");
    const menu = $("#nav-menu");
    if (toggle && menu) {
      toggle.addEventListener("click", () => {
        const isOpen = menu.classList.toggle("is-open");
        toggle.setAttribute("aria-expanded", String(isOpen));
        document.body.classList.toggle("no-scroll", isOpen);
      });
      $all("a", menu).forEach((link) =>
        link.addEventListener("click", () => {
          menu.classList.remove("is-open");
          toggle.setAttribute("aria-expanded", "false");
          document.body.classList.remove("no-scroll");
        })
      );
    }
    const header = $("#site-header");
    if (header) {
      const onScroll = () => header.classList.toggle("is-scrolled", window.scrollY > 40);
      document.addEventListener("scroll", onScroll, { passive: true });
      onScroll();
    }
  }

  /* ----------------------------------------------------------------
   * 12. REVEAL AU SCROLL
   * ------------------------------------------------------------- */
  function setupReveal() {
    const targets = $all("[data-reveal]");
    if (!("IntersectionObserver" in window) || !targets.length) {
      targets.forEach((t) => t.classList.add("is-visible"));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    targets.forEach((t) => observer.observe(t));
  }

  /* ----------------------------------------------------------------
   * 13. ANNÉE FOOTER
   * ------------------------------------------------------------- */
  function setupFooterYear() {
    const el = $("#footer-year");
    if (el) el.textContent = String(new Date().getFullYear());
  }

  /* ----------------------------------------------------------------
   * 14. SERVICE WORKER + INSTALLATION PWA
   * ------------------------------------------------------------- */
  function setupServiceWorker() {
    if (!("serviceWorker" in navigator)) return;
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("sw.js")
        .then((reg) => {
          reg.addEventListener("updatefound", () => {
            const installing = reg.installing;
            if (!installing) return;
            installing.addEventListener("statechange", () => {
              if (installing.state === "installed" && navigator.serviceWorker.controller) {
                showUpdateBanner(reg);
              }
            });
          });
        })
        .catch((err) => console.warn("Service Worker non enregistré :", err));
    });
  }
  function showUpdateBanner(reg) {
    const banner = $("#update-banner");
    if (!banner) return;
    banner.classList.add("is-visible");
    const btn = $("#update-refresh");
    btn &&
      btn.addEventListener("click", () => {
        if (reg.waiting) reg.waiting.postMessage({ type: "SKIP_WAITING" });
        window.location.reload();
      });
  }
  let deferredInstallPrompt = null;
  function setupInstallPrompt() {
    const banner = $("#install-banner");
    const iosModal = $("#ios-install-modal");
    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      deferredInstallPrompt = e;
      if (banner) banner.classList.add("is-visible");
    });
    const installBtn = $("#install-accept");
    installBtn &&
      installBtn.addEventListener("click", () => {
        if (banner) banner.classList.remove("is-visible");
        if (deferredInstallPrompt) {
          deferredInstallPrompt.prompt();
          deferredInstallPrompt.userChoice.finally(() => (deferredInstallPrompt = null));
        }
      });
    const dismissBtn = $("#install-dismiss");
    dismissBtn && dismissBtn.addEventListener("click", () => banner && banner.classList.remove("is-visible"));

    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
    if (isIOS && !isStandalone) {
      const iosBtn = $("#ios-install-hint");
      iosBtn && iosBtn.addEventListener("click", () => iosModal && iosModal.classList.add("is-visible"));
      const iosClose = $("#ios-install-close");
      iosClose && iosClose.addEventListener("click", () => iosModal && iosModal.classList.remove("is-visible"));
      if (iosBtn) iosBtn.classList.remove("is-hidden");
    }
  }

  /* ----------------------------------------------------------------
   * 15. INITIALISATION
   * ------------------------------------------------------------- */
  function init() {
    setupNav();
    setupFooterYear();
    setupServiceWorker();
    setupInstallPrompt();
    setupCartDrawer();
    setupSearch();

    loadData().then(() => {
      renderMeta();
      renderCategoryFilters();
      renderProducts();
      renderFeatured();
      renderVideos();
      renderAccount();
      setupAccount();
      updateCartBadge();
      setupReveal();
      const el = document.documentElement;
      el.classList.add("is-ready");
    });

    window.addEventListener("online", () => {
      toast("Connexion rétablie. Synchronisation en cours…");
      syncNow();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // Expose une API minimale pour le débogage / usages avancés
  window.RamaApp = {
    getClientId,
    getCart,
    getFavorites,
    getMeasurements,
    getHistory,
    syncNow
  };
})();
