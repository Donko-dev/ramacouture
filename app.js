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
      lastSync: "rama_last_sync",
      theme: "rama_theme",
      currency: "rama_currency",
      lang: "rama_lang"
    },
    // Remplacez cette URL par celle de votre Google Apps Script Web App
    // (Déployer > Nouveau déploiement > Application Web) pour activer la
    // synchronisation multi-appareils via Google Sheets. Le site fonctionne
    // intégralement hors-ligne même si cette URL n'est pas configurée.
    googleScriptUrl: "",
    whatsappBase: "https://wa.me/"
  };

  // Devises proposées si data.json n'en fournit pas (taux indicatifs vers 1 FCFA XOF)
  const DEFAULT_CURRENCIES = [
    { code: "XOF", label: "FCFA (Bénin)", symbol: "FCFA", rate: 1 },
    { code: "GNF", label: "FCFA Guinéen", symbol: "GNF", rate: 14.3 },
    { code: "EUR", label: "Euro", symbol: "€", rate: 0.001524 },
    { code: "USD", label: "Dollar US", symbol: "$", rate: 0.00164 }
  ];

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
  function getCurrencies() {
    return (SITE_DATA && SITE_DATA.meta && SITE_DATA.meta.currencies && SITE_DATA.meta.currencies.length)
      ? SITE_DATA.meta.currencies
      : DEFAULT_CURRENCIES;
  }
  function getCurrentCurrencyCode() {
    return localStorage.getItem(CONFIG.localKeys.currency) || "XOF";
  }
  function setCurrentCurrencyCode(code) {
    localStorage.setItem(CONFIG.localKeys.currency, code);
  }
  function formatPrice(amountXOF) {
    const n = Number(amountXOF) || 0;
    const code = getCurrentCurrencyCode();
    const currency = getCurrencies().find((c) => c.code === code) || getCurrencies()[0];
    if (!currency) return n.toLocaleString("fr-FR") + " FCFA";
    const value = n * Number(currency.rate);
    if (currency.code === "XOF" || currency.code === "GNF") {
      return Math.round(value).toLocaleString("fr-FR").replace(/,/g, " ") + " " + currency.symbol;
    }
    return currency.symbol + " " + value.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
   * 1bis. INTERNATIONALISATION (FR / EN)
   * ------------------------------------------------------------- */
  const TRANSLATIONS = {
    fr: {
      "nav.home": "Accueil",
      "nav.boutique": "Boutique",
      "nav.videos": "Défilés &amp; Ateliers",
      "nav.about": "Notre Savoir-faire",
      "nav.account": "Mon Compte",
      "nav.contact": "Contact",
      "nav.orderWhatsapp": "Commander sur WhatsApp",
      "hero.eyebrow": "Cotonou · Bénin",
      "hero.title": "L'excellence du <em>Bazin</em><br>&amp; de la Couture",
      "hero.lead": "Bazin VIP, Bazin Miel, Getzner et créations Haute Couture façonnés avec exigence, pour sublimer chaque cérémonie.",
      "hero.cta1": "Découvrir la boutique",
      "hero.cta2": "Prendre rendez-vous",
      "hero.scroll": "Défiler",
      "featured.eyebrow": "Sélection",
      "featured.title": "Nos pièces du moment",
      "featured.lead": "Un aperçu des créations les plus demandées de la saison.",
      "boutique.eyebrow": "Boutique",
      "boutique.title": "Toute la collection",
      "boutique.lead": "Filtrez par catégorie ou recherchez une pièce précise. Chaque article peut être ajouté au panier ou commandé directement sur WhatsApp.",
      "boutique.searchPlaceholder": "Rechercher un article…",
      "boutique.all": "Tout",
      "videos.eyebrow": "En mouvement",
      "videos.title": "Défilés &amp; Ateliers",
      "videos.lead": "Regardez nos vidéos directement sur la page, sans jamais quitter le site.",
      "about.eyebrow": "Notre Savoir-faire",
      "about.title": "Une exigence transmise avec passion",
      "about.lead": "Chez Rama Bazin &amp; Couture, chaque tissu est choisi avec soin et chaque création est pensée pour révéler votre allure. De la sélection du Bazin le plus riche jusqu'à la dernière finition d'un ensemble Haute Couture, notre atelier de Cotonou met son savoir-faire au service de votre élégance.",
      "about.stat1": "Catégories",
      "about.stat2": "Adresses à Cotonou",
      "about.stat3": "Sur-mesure disponible",
      "account.eyebrow": "Espace Cliente",
      "account.title": "Mon Compte",
      "account.lead": "Vos mesures, favoris et historique sont conservés sur cet appareil. Utilisez votre ID Client pour les retrouver sur un autre téléphone.",
      "account.idTitle": "Mon ID Client",
      "account.copyId": "Copier mon ID",
      "account.idHint": "Conservez cet identifiant : il vous permet de restaurer vos mesures, favoris et panier sur un autre appareil.",
      "account.restorePlaceholder": "Saisir un ID (ex : RAMA-98A1)",
      "account.restore": "Restaurer",
      "account.measurementsTitle": "Mes mesures de couture",
      "account.saveMeasurements": "Enregistrer mes mesures",
      "account.favoritesTitle": "Mes favoris",
      "account.historyTitle": "Mon historique",
      "measure.poitrine": "Poitrine (cm)",
      "measure.taille": "Taille (cm)",
      "measure.hanches": "Hanches (cm)",
      "measure.longueur": "Longueur (cm)",
      "measure.epaule": "Épaule (cm)",
      "measure.manche": "Manche (cm)",
      "measure.cou": "Tour de cou (cm)",
      "measure.poignet": "Poignet (cm)",
      "contact.eyebrow": "Contact",
      "contact.title": "Venez nous rendre visite",
      "contact.headOffice": "Siège",
      "contact.annex": "Annexe",
      "contact.phone": "Téléphone / WhatsApp",
      "contact.email": "Email",
      "contact.whatsappBtn": "Écrire sur WhatsApp",
      "contact.whatsapp2Btn": "Deuxième ligne WhatsApp",
      "contact.mailBtn": "Envoyer un email",
      "contact.socialsTitle": "Réseaux sociaux",
      "contact.qrText": "Scannez pour retrouver instantanément Rama Bazin &amp; Couture et le partager à vos proches.",
      "footer.navigation": "Navigation",
      "footer.whatsappShop": "WhatsApp Boutique",
      "footer.rights": "Tous droits réservés.",
      "cart.title": "Mon Panier",
      "cart.total": "Total",
      "cart.checkout": "Commander sur WhatsApp",
      "cart.clear": "Vider le panier",
      "cart.empty": "Votre panier est vide.",
      "cart.addedToast": "Article ajouté au panier.",
      "cart.removedToast": "Article retiré du panier.",
      "cart.clearedToast": "Panier vidé.",
      "product.addToCart": "Ajouter au panier",
      "product.orderWhatsapp": "Commander WhatsApp",
      "product.photoSoon": "Photo à venir",
      "product.empty": "Aucun article dans cette catégorie pour le moment. Revenez bientôt !",
      "favorites.empty": "Aucun favori pour le moment. Touchez le cœur sur un article pour l'ajouter ici.",
      "favorites.addedToast": "Ajouté aux favoris.",
      "favorites.removedToast": "Retiré des favoris.",
      "history.empty": "Aucun historique pour le moment.",
      "videos.empty": "Les vidéos de défilés arrivent bientôt.",
      "videos.playError": "Lecture impossible sur cet appareil.",
      "videos.viewOnTiktok": "Voir sur TikTok",
      "videos.viewOnInstagram": "Voir sur Instagram",
      "account.idInvalid": "Format d'ID invalide. Exemple : RAMA-98A1",
      "account.restoredToast": "Profil restauré avec succès.",
      "account.idSavedToast": "ID enregistré. Données locales conservées.",
      "account.copiedToast": "ID copié : ",
      "measurementsSavedToast": "Vos mesures ont été enregistrées.",
      "sync.notConfigured": "Synchronisation cloud non configurée. Vos données restent locales.",
      "sync.online": "Connexion rétablie. Synchronisation en cours…",
      "data.loadError": "Impossible de charger le catalogue. Vérifiez votre connexion.",
      "pwa.installText": "Installez Rama Bazin &amp; Couture pour un accès rapide, même hors-ligne.",
      "pwa.install": "Installer",
      "pwa.later": "Plus tard",
      "pwa.updateText": "Une nouvelle version du site est disponible.",
      "pwa.refresh": "Actualiser",
      "pwa.installIos": "Installer sur iPhone",
      "pwa.iosTitle": "Installation sur iPhone / iPad",
      "pwa.iosStep1": "Appuyez sur le bouton Partager ⬆ dans Safari.",
      "pwa.iosStep2": "Choisissez « Sur l'écran d'accueil » ➕.",
      "pwa.iosStep3": "Confirmez pour installer Rama Bazin &amp; Couture.",
      "pwa.close": "Fermer",
      "wa.greetingGeneric": "Bonjour Rama Bazin & Couture, je souhaite avoir des renseignements.",
      "wa.orderProduct": "Bonjour Rama Bazin & Couture, je souhaite commander : ",
      "wa.orderConfirm": "). Merci de me confirmer la disponibilité.",
      "wa.cartGreeting": "Bonjour Rama Bazin & Couture, je souhaite commander :",
      "wa.total": "Total : ",
      "wa.myId": "Mon ID Client : "
    },
    en: {
      "nav.home": "Home",
      "nav.boutique": "Shop",
      "nav.videos": "Shows &amp; Workshops",
      "nav.about": "Our Craftsmanship",
      "nav.account": "My Account",
      "nav.contact": "Contact",
      "nav.orderWhatsapp": "Order on WhatsApp",
      "hero.eyebrow": "Cotonou · Benin",
      "hero.title": "The Excellence of <em>Bazin</em><br>&amp; Couture",
      "hero.lead": "Bazin VIP, Bazin Miel, Getzner and Haute Couture creations crafted with rigor, to elevate every celebration.",
      "hero.cta1": "Discover the shop",
      "hero.cta2": "Book an appointment",
      "hero.scroll": "Scroll",
      "featured.eyebrow": "Selection",
      "featured.title": "This Season's Pieces",
      "featured.lead": "A glimpse of our most sought-after creations this season.",
      "boutique.eyebrow": "Shop",
      "boutique.title": "The Full Collection",
      "boutique.lead": "Filter by category or search for a specific piece. Every item can be added to your cart or ordered directly on WhatsApp.",
      "boutique.searchPlaceholder": "Search an item…",
      "boutique.all": "All",
      "videos.eyebrow": "In Motion",
      "videos.title": "Shows &amp; Workshops",
      "videos.lead": "Watch our videos directly on the page, without ever leaving the site.",
      "about.eyebrow": "Our Craftsmanship",
      "about.title": "A standard of excellence passed on with passion",
      "about.lead": "At Rama Bazin &amp; Couture, every fabric is chosen with care and every creation is designed to reveal your style. From selecting the richest Bazin to the final finish of a Haute Couture ensemble, our Cotonou workshop puts its expertise at the service of your elegance.",
      "about.stat1": "Categories",
      "about.stat2": "Addresses in Cotonou",
      "about.stat3": "Made-to-measure available",
      "account.eyebrow": "Client Area",
      "account.title": "My Account",
      "account.lead": "Your measurements, favorites and history are kept on this device. Use your Client ID to retrieve them on another phone.",
      "account.idTitle": "My Client ID",
      "account.copyId": "Copy my ID",
      "account.idHint": "Keep this ID safe: it lets you restore your measurements, favorites and cart on another device.",
      "account.restorePlaceholder": "Enter an ID (e.g. RAMA-98A1)",
      "account.restore": "Restore",
      "account.measurementsTitle": "My Sewing Measurements",
      "account.saveMeasurements": "Save my measurements",
      "account.favoritesTitle": "My Favorites",
      "account.historyTitle": "My History",
      "measure.poitrine": "Bust (cm)",
      "measure.taille": "Waist (cm)",
      "measure.hanches": "Hips (cm)",
      "measure.longueur": "Length (cm)",
      "measure.epaule": "Shoulder (cm)",
      "measure.manche": "Sleeve (cm)",
      "measure.cou": "Neck (cm)",
      "measure.poignet": "Wrist (cm)",
      "contact.eyebrow": "Contact",
      "contact.title": "Come visit us",
      "contact.headOffice": "Head Office",
      "contact.annex": "Annex",
      "contact.phone": "Phone / WhatsApp",
      "contact.email": "Email",
      "contact.whatsappBtn": "Message on WhatsApp",
      "contact.whatsapp2Btn": "Second WhatsApp Line",
      "contact.mailBtn": "Send an email",
      "contact.socialsTitle": "Social Media",
      "contact.qrText": "Scan to instantly find Rama Bazin &amp; Couture and share it with your friends.",
      "footer.navigation": "Navigation",
      "footer.whatsappShop": "WhatsApp Shop",
      "footer.rights": "All rights reserved.",
      "cart.title": "My Cart",
      "cart.total": "Total",
      "cart.checkout": "Order on WhatsApp",
      "cart.clear": "Clear cart",
      "cart.empty": "Your cart is empty.",
      "cart.addedToast": "Item added to cart.",
      "cart.removedToast": "Item removed from cart.",
      "cart.clearedToast": "Cart cleared.",
      "product.addToCart": "Add to cart",
      "product.orderWhatsapp": "Order via WhatsApp",
      "product.photoSoon": "Photo coming soon",
      "product.empty": "No items in this category yet. Check back soon!",
      "favorites.empty": "No favorites yet. Tap the heart on an item to add it here.",
      "favorites.addedToast": "Added to favorites.",
      "favorites.removedToast": "Removed from favorites.",
      "history.empty": "No history yet.",
      "videos.empty": "Runway videos are coming soon.",
      "videos.playError": "Playback isn't available on this device.",
      "videos.viewOnTiktok": "View on TikTok",
      "videos.viewOnInstagram": "View on Instagram",
      "account.idInvalid": "Invalid ID format. Example: RAMA-98A1",
      "account.restoredToast": "Profile restored successfully.",
      "account.idSavedToast": "ID saved. Local data kept.",
      "account.copiedToast": "ID copied: ",
      "measurementsSavedToast": "Your measurements have been saved.",
      "sync.notConfigured": "Cloud sync isn't configured. Your data stays local.",
      "sync.online": "Connection restored. Syncing…",
      "data.loadError": "Unable to load the catalog. Please check your connection.",
      "pwa.installText": "Install Rama Bazin &amp; Couture for quick access, even offline.",
      "pwa.install": "Install",
      "pwa.later": "Later",
      "pwa.updateText": "A new version of the site is available.",
      "pwa.refresh": "Refresh",
      "pwa.installIos": "Install on iPhone",
      "pwa.iosTitle": "Install on iPhone / iPad",
      "pwa.iosStep1": "Tap the Share button ⬆ in Safari.",
      "pwa.iosStep2": "Choose \"Add to Home Screen\" ➕.",
      "pwa.iosStep3": "Confirm to install Rama Bazin &amp; Couture.",
      "pwa.close": "Close",
      "wa.greetingGeneric": "Hello Rama Bazin & Couture, I'd like some information.",
      "wa.orderProduct": "Hello Rama Bazin & Couture, I'd like to order: ",
      "wa.orderConfirm": "). Please confirm availability.",
      "wa.cartGreeting": "Hello Rama Bazin & Couture, I'd like to order:",
      "wa.total": "Total: ",
      "wa.myId": "My Client ID: "
    }
  };

  function getCurrentLang() {
    return localStorage.getItem(CONFIG.localKeys.lang) === "en" ? "en" : "fr";
  }
  function t(key) {
    const lang = getCurrentLang();
    return (TRANSLATIONS[lang] && TRANSLATIONS[lang][key]) || TRANSLATIONS.fr[key] || key;
  }
  function localize(obj, field) {
    if (!obj) return "";
    const lang = getCurrentLang();
    if (lang === "en" && obj[field + "_en"]) return obj[field + "_en"];
    return obj[field] || "";
  }
  function applyStaticTranslations() {
    document.documentElement.lang = getCurrentLang();
    $all("[data-i18n]").forEach((el) => {
      el.innerHTML = t(el.getAttribute("data-i18n"));
    });
    $all("[data-i18n-html]").forEach((el) => {
      el.innerHTML = t(el.getAttribute("data-i18n-html"));
    });
    $all("[data-i18n-placeholder]").forEach((el) => {
      el.setAttribute("placeholder", t(el.getAttribute("data-i18n-placeholder")));
    });
    $all("[data-i18n-aria]").forEach((el) => {
      el.setAttribute("aria-label", t(el.getAttribute("data-i18n-aria")));
    });
    const langCurrent = $("#lang-current");
    if (langCurrent) langCurrent.textContent = getCurrentLang().toUpperCase();
  }
  function setLanguage(lang) {
    localStorage.setItem(CONFIG.localKeys.lang, lang === "en" ? "en" : "fr");
    applyStaticTranslations();
    if (SITE_DATA) {
      renderCategoryFilters();
      renderProducts();
      renderFeatured();
      renderVideos();
      renderAccount();
      renderCartDrawer();
      renderMeta();
    }
  }
  function setupLanguage() {
    applyStaticTranslations();
    const btn = $("#lang-toggle");
    if (!btn) return;
    btn.addEventListener("click", () => {
      setLanguage(getCurrentLang() === "fr" ? "en" : "fr");
    });
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
      toast(t("sync.notConfigured"));
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
    // IMPORTANT : ne jamais ajouter de paramètre aléatoire (ex. ?v=timestamp)
    // à cette URL. Le Service Worker met en cache "data.json" avec une URL
    // stable ; un paramètre changeant empêcherait la correspondance de cache
    // et casserait l'affichage des produits en mode hors-ligne.
    return fetch(CONFIG.dataFile, { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error("data.json introuvable (" + res.status + ")");
        return res.json();
      })
      .then((json) => {
        SITE_DATA = json;
        return json;
      })
      .catch((err) => {
        console.warn("Réseau indisponible pour data.json, tentative via le cache local :", err);
        return loadDataFromCacheStorage();
      });
  }

  function loadDataFromCacheStorage() {
    if (!("caches" in window)) {
      return failLoadData();
    }
    return caches
      .open("rama-couture-v2-static")
      .then((cache) => cache.match(CONFIG.dataFile))
      .then((cached) => {
        if (cached) return cached.json();
        // Filet de sécurité : cherche dans n'importe quel cache existant
        return caches.match(CONFIG.dataFile).then((anyCached) => {
          if (anyCached) return anyCached.json();
          throw new Error("Aucune copie hors-ligne de data.json disponible.");
        });
      })
      .then((json) => {
        SITE_DATA = json;
        return json;
      })
      .catch(() => failLoadData());
  }

  function failLoadData() {
    SITE_DATA = { meta: {}, categories: [], products: [], videos: [] };
    toast(t("data.loadError"));
    return SITE_DATA;
  }

  /* ----------------------------------------------------------------
   * 5. RENDU — INFORMATIONS GÉNÉRALES
   * ------------------------------------------------------------- */
  function renderMeta() {
    const meta = SITE_DATA.meta || {};
    $all("[data-bind='siteName']").forEach((el) => (el.textContent = meta.siteName || ""));
    $all("[data-bind='slogan']").forEach((el) => (el.textContent = localize(meta, "slogan")));
    $all("[data-bind='email']").forEach((el) => {
      el.textContent = meta.email || "";
      if (el.tagName === "A") el.href = "mailto:" + (meta.email || "");
    });
    $all("[data-bind-href='mailtoLink']").forEach((el) => {
      el.href = "mailto:" + (meta.email || "");
    });
    $all("[data-bind='instagram']").forEach((el) => (el.textContent = meta.instagram || ""));
    $all("[data-bind='siege']").forEach((el) => (el.textContent = localize(meta, "siege")));
    $all("[data-bind='annexe']").forEach((el) => (el.textContent = localize(meta, "annexe")));
    $all("[data-bind='phone1Display']").forEach((el) => (el.textContent = meta.phone1Display || ""));
    $all("[data-bind='phone2Display']").forEach((el) => (el.textContent = meta.phone2Display || ""));
    $all("[data-wa-link='phone1']").forEach((el) => {
      el.href = CONFIG.whatsappBase + (meta.phone1Wa || "") + "?text=" + encodeURIComponent(t("wa.greetingGeneric"));
    });
    $all("[data-wa-link='phone2']").forEach((el) => {
      el.href = CONFIG.whatsappBase + (meta.phone2Wa || "") + "?text=" + encodeURIComponent(t("wa.greetingGeneric"));
    });
    $all("[data-bind='logo']").forEach((el) => {
      if (el.tagName === "IMG") el.src = meta.logo || "logo.jpg";
    });
    const heroImg = $("#hero-media-image");
    if (heroImg && meta.heroImage) heroImg.src = meta.heroImage;
    document.title = (meta.siteName || "Rama Bazin & Couture") + " — " + (localize(meta, "slogan") || "");
    renderSocialIcons();
  }

  /* ----------------------------------------------------------------
   * 5bis. APPARENCE PERSONNALISABLE (couleurs, polices, taille)
   * ------------------------------------------------------------- */
  const LOADED_FONTS = new Set(["Cormorant Garamond", "Manrope"]);
  function ensureGoogleFont(fontName) {
    if (!fontName || LOADED_FONTS.has(fontName)) return;
    LOADED_FONTS.add(fontName);
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=" + encodeURIComponent(fontName).replace(/%20/g, "+") + ":ital,wght@0,400;0,600;0,700;1,500&display=swap";
    document.head.appendChild(link);
  }
  function applyDesignSettings() {
    const design = (SITE_DATA.meta && SITE_DATA.meta.design) || {};
    const root = document.documentElement.style;
    if (design.colorGold) root.setProperty("--gold", design.colorGold);
    if (design.colorGoldDeep) root.setProperty("--gold-deep", design.colorGoldDeep);
    if (design.fontDisplay) {
      ensureGoogleFont(design.fontDisplay);
      root.setProperty("--display", "'" + design.fontDisplay + "', 'Georgia', serif");
    }
    if (design.fontBody) {
      ensureGoogleFont(design.fontBody);
      root.setProperty("--body", "'" + design.fontBody + "', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif");
    }
    if (design.baseFontSize) {
      document.documentElement.style.fontSize = Number(design.baseFontSize) + "px";
    }
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
    const stillValid = activeCategory === "all" || cats.some((c) => c.id === activeCategory);
    if (!stillValid) activeCategory = "all";
    let html = '<button type="button" class="chip' + (activeCategory === "all" ? " is-active" : "") + '" data-cat="all">' + escapeHtml(t("boutique.all")) + "</button>";
    cats.forEach((c) => {
      html += '<button type="button" class="chip' + (activeCategory === c.id ? " is-active" : "") + '" data-cat="' + escapeHtml(c.id) + '">' + escapeHtml(localize(c, "label")) + "</button>";
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
    return cat ? localize(cat, "label") : id;
  }

  function productCardHtml(p) {
    const favs = getFavorites();
    const isFav = favs.includes(p.id);
    const meta = SITE_DATA.meta || {};
    const name = localize(p, "name");
    const waMsg = encodeURIComponent(t("wa.orderProduct") + name + " (" + formatPrice(p.price) + t("wa.orderConfirm"));
    return (
      '<article class="product-card" data-id="' + escapeHtml(p.id) + '">' +
        '<button type="button" class="fav-btn' + (isFav ? " is-active" : "") + '" data-fav="' + escapeHtml(p.id) + '" aria-label="Ajouter aux favoris" aria-pressed="' + isFav + '">&#9825;</button>' +
        '<div class="product-media" data-open-detail="' + escapeHtml(p.id) + '">' +
          '<div class="no-photo-fallback"><span class="icon" aria-hidden="true">&#9986;</span><span class="label">' + escapeHtml(t("product.photoSoon")) + "</span></div>" +
          '<img src="' + escapeHtml(p.image) + '" alt="' + escapeHtml(name) + '" loading="lazy" onerror="this.style.display=\'none\'">' +
        "</div>" +
        '<div class="product-body">' +
          '<span class="product-cat">' + escapeHtml(categoryLabel(p.category)) + "</span>" +
          '<h3 class="product-name" data-open-detail="' + escapeHtml(p.id) + '">' + escapeHtml(name) + "</h3>" +
          '<p class="product-price">' + formatPrice(p.price) + "</p>" +
          '<div class="product-actions">' +
            '<button type="button" class="btn btn-ghost btn-sm" data-add="' + escapeHtml(p.id) + '">' + escapeHtml(t("product.addToCart")) + "</button>" +
            '<a class="btn btn-gold btn-sm" target="_blank" rel="noopener" href="' + CONFIG.whatsappBase + escapeHtml(meta.phone1Wa || "") + "?text=" + waMsg + '">' + escapeHtml(t("product.orderWhatsapp")) + "</a>" +
          "</div>" +
        "</div>" +
      "</article>"
    );
  }
  function bindProductDetailOpeners(scope) {
    $all("[data-open-detail]", scope).forEach((el) => {
      el.addEventListener("click", () => openProductModal(el.getAttribute("data-open-detail")));
    });
  }

  function renderProducts() {
    const grid = $("#products-grid");
    if (!grid) return;
    const products = SITE_DATA.products || [];
    const filtered = products.filter((p) => {
      const matchCat = activeCategory === "all" || p.category === activeCategory;
      const name = localize(p, "name").toLowerCase();
      const matchSearch = !searchTerm || name.indexOf(searchTerm.toLowerCase()) !== -1;
      return matchCat && matchSearch;
    });
    if (!filtered.length) {
      grid.innerHTML = '<p class="empty-state">' + escapeHtml(t("product.empty")) + "</p>";
      return;
    }
    grid.innerHTML = filtered.map(productCardHtml).join("");
    bindProductDetailOpeners(grid);
    $all("[data-add]", grid).forEach((btn) => {
      btn.addEventListener("click", () => {
        addToCart(btn.getAttribute("data-add"), 1);
        toast(t("cart.addedToast"));
      });
    });
    $all("[data-fav]", grid).forEach((btn) => {
      btn.addEventListener("click", () => {
        const active = toggleFavorite(btn.getAttribute("data-fav"));
        btn.classList.toggle("is-active", active);
        btn.setAttribute("aria-pressed", String(active));
        toast(active ? t("favorites.addedToast") : t("favorites.removedToast"));
      });
    });
  }

  function renderFeatured() {
    const host = $("#featured-grid");
    if (!host) return;
    const featured = (SITE_DATA.products || []).filter((p) => p.featured).slice(0, 4);
    host.innerHTML = featured.map(productCardHtml).join("");
    bindProductDetailOpeners(host);
    $all("[data-add]", host).forEach((btn) => {
      btn.addEventListener("click", () => {
        addToCart(btn.getAttribute("data-add"), 1);
        toast(t("cart.addedToast"));
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
      host.innerHTML = '<p class="empty-state">' + escapeHtml(t("cart.empty")) + "</p>";
      $("#cart-total") && ($("#cart-total").textContent = formatPrice(0));
      return;
    }
    let total = 0;
    host.innerHTML = cart
      .map((item) => {
        const p = products.find((pp) => pp.id === item.id);
        if (!p) return "";
        const name = localize(p, "name");
        const lineTotal = p.price * item.qty;
        total += lineTotal;
        return (
          '<div class="cart-line" data-id="' + escapeHtml(p.id) + '">' +
            '<span class="cart-line-thumb"><img src="' + escapeHtml(p.image) + '" alt="' + escapeHtml(name) + '" onerror="this.style.display=\'none\'"></span>' +
            '<div class="cart-line-info">' +
              '<p class="cart-line-name">' + escapeHtml(name) + "</p>" +
              '<p class="cart-line-price">' + formatPrice(p.price) + "</p>" +
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
    if ($("#cart-total")) $("#cart-total").textContent = formatPrice(total);
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
        toast(t("cart.removedToast"));
      })
    );
  }

  function buildCartWhatsAppMessage() {
    const cart = getCart();
    const products = SITE_DATA.products || [];
    let total = 0;
    let lines = [t("wa.cartGreeting")];
    cart.forEach((item) => {
      const p = products.find((pp) => pp.id === item.id);
      if (!p) return;
      const lineTotal = p.price * item.qty;
      total += lineTotal;
      lines.push("- " + localize(p, "name") + " x" + item.qty + " = " + formatPrice(lineTotal));
    });
    lines.push(t("wa.total") + formatPrice(total));
    lines.push(t("wa.myId") + getClientId());
    return lines.join("\n");
  }

  function openCartCheckout() {
    const cart = getCart();
    if (!cart.length) {
      toast(t("cart.empty"));
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
        toast(t("cart.clearedToast"));
      });
  }

  /* ----------------------------------------------------------------
   * 7bis. MODAL DÉTAIL PRODUIT
   * ------------------------------------------------------------- */
  let modalQty = 1;
  let modalProductId = null;
  function openProductModal(productId) {
    const p = (SITE_DATA.products || []).find((pp) => pp.id === productId);
    if (!p) return;
    modalProductId = productId;
    modalQty = 1;
    const meta = SITE_DATA.meta || {};
    const name = localize(p, "name");
    $("#product-modal-img").src = p.image;
    $("#product-modal-img").alt = name;
    $("#product-modal-img").style.display = "";
    $("#product-modal-img").onerror = function () {
      this.style.display = "none";
    };
    $("#product-modal-cat").textContent = categoryLabel(p.category);
    $("#product-modal-name").textContent = name;
    $("#product-modal-price").textContent = formatPrice(p.price);
    $("#product-modal-desc").textContent = localize(p, "description");
    $("#product-modal-qty-value").textContent = String(modalQty);
    const waMsg = encodeURIComponent(t("wa.orderProduct") + name + " (" + formatPrice(p.price) + t("wa.orderConfirm"));
    $("#product-modal-wa").href = CONFIG.whatsappBase + (meta.phone1Wa || "") + "?text=" + waMsg;
    $("#product-modal-overlay").classList.add("is-open");
    document.body.classList.add("no-scroll");
  }
  function closeProductModal() {
    $("#product-modal-overlay").classList.remove("is-open");
    document.body.classList.remove("no-scroll");
    modalProductId = null;
  }
  function setupProductModal() {
    const overlay = $("#product-modal-overlay");
    if (!overlay) return;
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeProductModal();
    });
    $("#product-modal-close").addEventListener("click", closeProductModal);
    $("#product-modal-qty-minus").addEventListener("click", () => {
      modalQty = Math.max(1, modalQty - 1);
      $("#product-modal-qty-value").textContent = String(modalQty);
    });
    $("#product-modal-qty-plus").addEventListener("click", () => {
      modalQty += 1;
      $("#product-modal-qty-value").textContent = String(modalQty);
    });
    $("#product-modal-add").addEventListener("click", () => {
      if (!modalProductId) return;
      addToCart(modalProductId, modalQty);
      toast(t("cart.addedToast"));
      closeProductModal();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && overlay.classList.contains("is-open")) closeProductModal();
    });
  }


  /* ----------------------------------------------------------------
   * 8. VIDÉOS — TIKTOK / INSTAGRAM (LIENS RÉELS) + LECTEUR LOCAL
   * ------------------------------------------------------------- */
  const TIKTOK_ICON = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M16.6 5.2c.8.86 1.9 1.4 3.1 1.5V9.3c-1.28-.02-2.5-.42-3.55-1.1v6.34c0 3.18-2.57 5.76-5.76 5.76S4.63 17.72 4.63 14.54c0-3.06 2.4-5.56 5.42-5.74v2.83a2.9 2.9 0 1 0 2.05 2.77V2h2.5c0 1.16.36 2.24 1 3.2z"/></svg>';
  const INSTAGRAM_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4.2"/><circle cx="17.3" cy="6.7" r="1.1" fill="currentColor" stroke="none"/></svg>';

  function isTikTokPostUrl(url) {
    return /tiktok\.com\/.+\/video\/\d+/.test(url || "");
  }
  function isInstagramPostUrl(url) {
    return /instagram\.com\/(reel|p|tv)\//.test(url || "");
  }
  let tiktokScriptLoaded = false;
  let instagramScriptLoaded = false;
  function ensureTikTokScript() {
    if (tiktokScriptLoaded) {
      if (window.__tiktokEmbedLoad) window.__tiktokEmbedLoad();
      return;
    }
    tiktokScriptLoaded = true;
    const s = document.createElement("script");
    s.src = "https://www.tiktok.com/embed.js";
    s.async = true;
    document.body.appendChild(s);
  }
  function ensureInstagramScript() {
    if (instagramScriptLoaded) {
      if (window.instgrm) window.instgrm.Embeds.process();
      return;
    }
    instagramScriptLoaded = true;
    const s = document.createElement("script");
    s.src = "https://www.instagram.com/embed.js";
    s.async = true;
    s.onload = () => {
      if (window.instgrm) window.instgrm.Embeds.process();
    };
    document.body.appendChild(s);
  }

  function videoCardHtml(v) {
    const title = localize(v, "title");

    // Publication précise TikTok (lien direct vers une vidéo) → lecteur officiel intégré
    if (v.provider === "tiktok" && isTikTokPostUrl(v.url)) {
      const videoId = (v.url.match(/\/video\/(\d+)/) || [])[1] || "";
      return (
        '<figure class="video-card video-card-embed" data-video-embed="tiktok">' +
          '<blockquote class="tiktok-embed" cite="' + escapeHtml(v.url) + '" data-video-id="' + escapeHtml(videoId) + '" style="max-width:100%;min-width:100%;">' +
            '<section></section>' +
          "</blockquote>" +
          '<figcaption>' + escapeHtml(title) + "</figcaption>" +
        "</figure>"
      );
    }

    // Publication précise Instagram (Reel/post) → lecteur officiel intégré
    if (v.provider === "instagram" && isInstagramPostUrl(v.url)) {
      return (
        '<figure class="video-card video-card-embed" data-video-embed="instagram">' +
          '<blockquote class="instagram-media" data-instgrm-permalink="' + escapeHtml(v.url) + '" data-instgrm-version="14" style="width:100%;"></blockquote>' +
          '<figcaption>' + escapeHtml(title) + "</figcaption>" +
        "</figure>"
      );
    }

    // Vidéo hébergée localement (petit fichier téléversé à la racine)
    if (v.provider === "self" || (!v.provider && v.file)) {
      return (
        '<figure class="video-card" data-video-card>' +
          '<div class="video-frame">' +
            '<video preload="metadata" playsinline poster="' + escapeHtml(v.poster || "") + '" src="' + escapeHtml(v.file || "") + '"></video>' +
            '<button type="button" class="video-play-overlay" data-video-toggle aria-label="Lire la vidéo">' +
              '<span class="play-icon" aria-hidden="true">&#9658;</span>' +
            "</button>" +
            '<div class="video-controls">' +
              '<button type="button" class="vc-btn" data-video-toggle aria-label="Lecture / Pause">&#9658;</button>' +
              '<div class="video-progress"><div class="video-progress-fill"></div></div>' +
              '<button type="button" class="vc-btn" data-video-mute aria-label="Son">&#128266;</button>' +
            "</div>" +
          "</div>" +
          '<figcaption>' + escapeHtml(title) + "</figcaption>" +
        "</figure>"
      );
    }

    // Repli élégant : pas encore de publication précise renseignée → carte
    // de renvoi vers la page TikTok / Instagram de la boutique (jamais vide,
    // jamais le logo répété : identité visuelle propre à chaque réseau).
    const isTikTok = v.provider === "tiktok";
    const icon = isTikTok ? TIKTOK_ICON : INSTAGRAM_ICON;
    const brandClass = isTikTok ? "tiktok" : "instagram";
    const ctaLabel = isTikTok ? t("videos.viewOnTiktok") : t("videos.viewOnInstagram");
    const url = v.url || (isTikTok ? "https://www.tiktok.com" : "https://www.instagram.com");
    return (
      '<a class="video-card video-teaser ' + brandClass + '" href="' + escapeHtml(url) + '" target="_blank" rel="noopener">' +
        '<div class="video-teaser-icon">' + icon + "</div>" +
        '<p class="video-teaser-title">' + escapeHtml(title) + "</p>" +
        '<span class="video-teaser-cta">' + escapeHtml(ctaLabel) + " ↗</span>" +
      "</a>"
    );
  }

  function renderVideos() {
    const host = $("#videos-grid");
    if (!host) return;
    const videos = SITE_DATA.videos || [];
    if (!videos.length) {
      host.innerHTML = '<p class="empty-state">' + escapeHtml(t("videos.empty")) + "</p>";
      return;
    }
    host.innerHTML = videos.map(videoCardHtml).join("");

    // Charge les scripts officiels uniquement si des posts précis sont présents
    if (videos.some((v) => v.provider === "tiktok" && isTikTokPostUrl(v.url))) {
      ensureTikTokScript();
    }
    if (videos.some((v) => v.provider === "instagram" && isInstagramPostUrl(v.url))) {
      ensureInstagramScript();
    }

    // Lecteur sur mesure pour les vidéos hébergées localement uniquement
    $all("[data-video-card]", host).forEach((card) => {
      const video = $("video", card);
      const overlay = $(".video-play-overlay", card);
      const toggleBtns = $all("[data-video-toggle]", card);
      const muteBtn = $("[data-video-mute]", card);
      const fill = $(".video-progress-fill", card);
      if (!video) return;

      function playPause() {
        if (video.paused) {
          $all("video", host).forEach((v) => {
            if (v !== video) v.pause();
          });
          video
            .play()
            .then(() => card.classList.add("is-playing"))
            .catch(() => toast(t("videos.playError")));
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

    setupVideoScrollFocus(host);
  }

  function setupVideoScrollFocus(host) {
    const cards = $all(".video-card", host);
    if (!cards.length || !("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          entry.target.classList.toggle("is-in-focus", entry.isIntersecting);
        });
      },
      { threshold: 0.6 }
    );
    cards.forEach((c) => observer.observe(c));
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
        : '<p class="empty-state">' + escapeHtml(t("favorites.empty")) + "</p>";
      bindProductDetailOpeners(favHost);
      $all("[data-add]", favHost).forEach((btn) =>
        btn.addEventListener("click", () => {
          addToCart(btn.getAttribute("data-add"), 1);
          toast(t("cart.addedToast"));
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
      const locale = getCurrentLang() === "en" ? "en-GB" : "fr-FR";
      histHost.innerHTML = hist.length
        ? hist
            .map((h) => {
              const d = new Date(h.date);
              return (
                '<li class="history-item"><span class="history-date">' +
                d.toLocaleDateString(locale) +
                "</span><span class=\"history-type\">" +
                escapeHtml(h.type || "activité") +
                "</span></li>"
              );
            })
            .join("")
        : '<li class="empty-state">' + escapeHtml(t("history.empty")) + "</li>";
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
        toast(t("measurementsSavedToast"));
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
            toast(ok ? t("account.restoredToast") : t("account.idSavedToast"));
          });
        } else {
          toast(t("account.idInvalid"));
        }
      });
    }
    const copyBtn = $("#copy-client-id");
    if (copyBtn) {
      copyBtn.addEventListener("click", () => {
        const id = getClientId();
        if (navigator.clipboard) {
          navigator.clipboard.writeText(id).then(() => toast(t("account.copiedToast") + id));
        } else {
          toast(t("account.copiedToast") + id);
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
    const overlay = $("#nav-overlay");
    function closeMenu() {
      menu.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
      document.body.classList.remove("no-scroll");
      overlay && overlay.classList.remove("is-open");
    }
    function openMenu() {
      menu.classList.add("is-open");
      toggle.setAttribute("aria-expanded", "true");
      document.body.classList.add("no-scroll");
      overlay && overlay.classList.add("is-open");
    }
    if (toggle && menu) {
      toggle.addEventListener("click", () => {
        if (menu.classList.contains("is-open")) closeMenu();
        else openMenu();
      });
      $all("a", menu).forEach((link) => link.addEventListener("click", closeMenu));
      overlay && overlay.addEventListener("click", closeMenu);
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && menu.classList.contains("is-open")) closeMenu();
      });
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
   * 14bis. THÈME CLAIR / SOMBRE
   * ------------------------------------------------------------- */
  function getCurrentTheme() {
    return localStorage.getItem(CONFIG.localKeys.theme) === "light" ? "light" : "dark";
  }
  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    const icon = $("#theme-icon");
    if (icon) icon.textContent = theme === "light" ? "🌙" : "☀️";
    const metaTheme = $("meta[name='theme-color']");
    if (metaTheme) metaTheme.setAttribute("content", theme === "light" ? "#FBF8F2" : "#0B0906");
  }
  function setupTheme() {
    applyTheme(getCurrentTheme());
    const btn = $("#theme-toggle");
    if (!btn) return;
    btn.addEventListener("click", () => {
      const next = getCurrentTheme() === "light" ? "dark" : "light";
      localStorage.setItem(CONFIG.localKeys.theme, next);
      applyTheme(next);
    });
  }

  /* ----------------------------------------------------------------
   * 14ter. SÉLECTEUR DE DEVISE
   * ------------------------------------------------------------- */
  function setupCurrency() {
    const toggle = $("#currency-toggle");
    const panel = $("#currency-panel");
    const currentLabel = $("#currency-current");
    if (!toggle || !panel) return;

    function renderPanel() {
      const currencies = getCurrencies();
      const active = getCurrentCurrencyCode();
      panel.innerHTML = currencies
        .map(
          (c) =>
            '<button type="button" class="currency-option' + (c.code === active ? " is-active" : "") + '" data-currency="' + escapeHtml(c.code) + '" role="option" aria-selected="' + (c.code === active) + '">' +
              "<span>" + escapeHtml(c.label) + "</span><small>" + escapeHtml(c.symbol) + "</small>" +
            "</button>"
        )
        .join("");
      $all("[data-currency]", panel).forEach((btn) => {
        btn.addEventListener("click", () => {
          setCurrentCurrencyCode(btn.getAttribute("data-currency"));
          closePanel();
          refreshCurrencyLabel();
          if (SITE_DATA) {
            renderProducts();
            renderFeatured();
            renderAccount();
            renderCartDrawer();
          }
        });
      });
    }
    function refreshCurrencyLabel() {
      const active = getCurrencies().find((c) => c.code === getCurrentCurrencyCode()) || getCurrencies()[0];
      if (currentLabel && active) currentLabel.textContent = active.code;
    }
    function openPanel() {
      renderPanel();
      panel.classList.add("is-open");
      toggle.setAttribute("aria-expanded", "true");
    }
    function closePanel() {
      panel.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
    }
    toggle.addEventListener("click", (e) => {
      e.stopPropagation();
      if (panel.classList.contains("is-open")) closePanel();
      else openPanel();
    });
    document.addEventListener("click", (e) => {
      if (!panel.contains(e.target) && e.target !== toggle) closePanel();
    });
    refreshCurrencyLabel();
  }

  /* ----------------------------------------------------------------
   * 14quater. RÉSEAUX SOCIAUX — LOGOS OFFICIELS
   * ------------------------------------------------------------- */
  const SOCIAL_ICONS = {
    instagram: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4.2"/><circle cx="17.3" cy="6.7" r="1.1" fill="currentColor" stroke="none"/></svg>',
    facebook: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M14 8.5h2.5V5.2c-.43-.06-1.9-.2-3.6-.2-3.57 0-6 2.24-6 6.35v3.15H3.4V18h3.5v10h4.15V18h3.36l.53-3.5H11.05v-2.75c0-1 .28-1.75 2.95-1.75z"/></svg>',
    tiktok: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M16.6 5.2c.8.86 1.9 1.4 3.1 1.5V9.3c-1.28-.02-2.5-.42-3.55-1.1v6.34c0 3.18-2.57 5.76-5.76 5.76S4.63 17.72 4.63 14.54c0-3.06 2.4-5.56 5.42-5.74v2.83a2.9 2.9 0 1 0 2.05 2.77V2h2.5c0 1.16.36 2.24 1 3.2z"/></svg>',
    snapchat: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2.7c2.9 0 4.6 2.15 4.7 4.35.05 1 .02 1.9 0 2.55.5.16 1.05.02 1.4-.2.35-.22.9-.2 1.05.32.13.45-.15.85-.9 1.2-.28.13-.75.28-.75.28s-.1.7.35 1.35c.55.8 1.55 1.15 2.2 1.3.3.07.5.35.4.68-.13.42-1 .8-2.1.98-.07.2-.15.55-.25.85-.1.3-.4.4-.75.35-.4-.05-.9-.15-1.55-.15-.55 0-.95.15-1.5.5-.65.42-1.4.95-2.35.95s-1.7-.53-2.35-.95c-.55-.35-.95-.5-1.5-.5-.65 0-1.15.1-1.55.15-.35.05-.65-.05-.75-.35-.1-.3-.18-.65-.25-.85-1.1-.18-1.97-.56-2.1-.98-.1-.33.1-.61.4-.68.65-.15 1.65-.5 2.2-1.3.45-.65.35-1.35.35-1.35s-.47-.15-.75-.28c-.75-.35-1.03-.75-.9-1.2.15-.52.7-.54 1.05-.32.35.22.9.36 1.4.2.02-.63-.02-1.55.02-2.55.1-2.2 1.8-4.35 4.7-4.35z"/></svg>',
    whatsapp: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.29-1.39a9.87 9.87 0 0 0 4.7 1.2h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm5.79 14.11c-.24.68-1.4 1.33-1.93 1.4-.5.07-1.11.1-1.79-.11-.41-.13-.94-.3-1.62-.6-2.85-1.23-4.71-4.1-4.85-4.29-.14-.19-1.16-1.54-1.16-2.94s.73-2.08.99-2.36c.26-.28.57-.35.76-.35.19 0 .38 0 .55.01.18.01.41-.07.64.49.24.57.81 1.98.88 2.12.07.14.12.31.02.5-.09.19-.14.31-.28.48-.14.17-.29.37-.42.5-.14.14-.28.29-.12.57.16.28.71 1.17 1.52 1.9 1.05.94 1.93 1.23 2.21 1.37.28.14.44.12.61-.07.16-.19.68-.79.87-1.06.19-.28.37-.23.62-.14.26.09 1.63.77 1.91.91.28.14.47.21.53.33.07.12.07.68-.17 1.36z"/></svg>',
    mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 6-10 7L2 6"/></svg>'
  };
  function renderSocialIcons() {
    const meta = SITE_DATA.meta || {};
    const socials = meta.socials || {};
    const items = [];
    if (socials.instagram) items.push({ key: "instagram", url: socials.instagram, label: "Instagram" });
    if (socials.facebook) items.push({ key: "facebook", url: socials.facebook, label: "Facebook" });
    if (socials.tiktok) items.push({ key: "tiktok", url: socials.tiktok, label: "TikTok" });
    if (socials.snapchat) items.push({ key: "snapchat", url: socials.snapchat, label: "Snapchat" });
    const html = items
      .map(
        (it) =>
          '<a class="social-icon ' + it.key + '" href="' + escapeHtml(it.url) + '" target="_blank" rel="noopener" aria-label="' + it.label + '">' + SOCIAL_ICONS[it.key] + "</a>"
      )
      .join("");
    ["#social-icons-contact", "#social-icons-footer"].forEach((sel) => {
      const host = $(sel);
      if (host) host.innerHTML = html;
    });
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
    setupTheme();
    setupCurrency();
    setupLanguage();
    setupProductModal();

    function renderEverything() {
      applyDesignSettings();
      renderMeta();
      renderCategoryFilters();
      renderProducts();
      renderFeatured();
      renderVideos();
      renderAccount();
      updateCartBadge();
    }

    loadData().then(() => {
      renderEverything();
      setupAccount();
      setupReveal();
      const el = document.documentElement;
      el.classList.add("is-ready");
    });

    window.addEventListener("online", () => {
      toast(t("sync.online"));
      syncNow();
      // Recharge le catalogue dès que la connexion revient, pour afficher
      // immédiatement les produits ajoutés pendant la coupure.
      loadData().then(renderEverything);
    });

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible" && navigator.onLine && SITE_DATA) {
        loadData().then(renderEverything);
      }
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
