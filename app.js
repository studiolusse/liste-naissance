/**
 * Liste de naissance — page statique.
 * Affiche la liste et enregistre les réservations en appelant l'API
 * Google Apps Script définie dans config.js (APP_CONFIG.API_URL).
 */
(function () {
  'use strict';

  var API_URL = (window.APP_CONFIG || {}).API_URL || '';
  var params = new URLSearchParams(location.search);
  var MOCK = params.has('mock');

  /* ============================ API ============================ */

  // Le POST part sans Content-Type explicite : le corps est alors envoyé en
  // text/plain, ce qui évite la requête préliminaire CORS vers Apps Script.
  function apiGet() {
    if (MOCK) return Promise.resolve(JSON.parse(JSON.stringify(window.MOCK_DATA)));
    return fetch(API_URL, { method: 'GET', redirect: 'follow' }).then(function (r) { return r.json(); });
  }
  function apiPost(payload) {
    if (MOCK) return mockPost(payload);
    return fetch(API_URL, { method: 'POST', body: JSON.stringify(payload), redirect: 'follow' })
      .then(function (r) { return r.json(); });
  }
  var mockReserves = {};
  function mockNomProduit(id) {
    var nom = 'ce cadeau';
    (window.MOCK_DATA.groups || []).forEach(function (g) {
      (g.produits || []).forEach(function (p) { if (p.id === id) nom = p.nom; });
    });
    return nom;
  }
  function mockPost(payload) {
    return new Promise(function (resolve) {
      setTimeout(function () {
        if (payload.action === 'reserver') {
          if (mockReserves[payload.id]) { resolve({ ok: false, reason: 'deja_reserve' }); return; }
          mockReserves[payload.id] = payload.nom;
          resolve({ ok: true, produit: mockNomProduit(payload.id), token: 'demo-' + payload.id, mailEnvoye: !!payload.email });
        } else if (payload.action === 'infojeton') {
          resolve({ trouve: true, produit: 'ce cadeau' });
        } else if (payload.action === 'annuler') {
          resolve({ ok: true, produit: 'ce cadeau' });
        } else {
          resolve({ ok: false, reason: 'action_inconnue' });
        }
      }, 450);
    });
  }

  /* ========================= Utilitaires ======================= */

  function esc(v) {
    if (v == null) return '';
    return String(v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function sanitizeUrl(u) {
    u = (u == null ? '' : String(u)).trim();
    return /^https?:\/\//i.test(u) ? u : '';
  }
  function $(id) { return document.getElementById(id); }

  /* ==================== Chargement de la liste ================= */

  document.addEventListener('DOMContentLoaded', function () {
    var tokenAnnul = params.get('annuler');
    if (tokenAnnul) { initAnnulation(tokenAnnul); return; }
    chargerListe();
  });

  var SNAP_CLE = 'liste_snapshot_v1';

  function chargerListe() {
    // Affiche d'abord la dernière liste connue pour un rendu immédiat.
    var snap = null;
    if (!MOCK) {
      try { snap = JSON.parse(localStorage.getItem(SNAP_CLE) || 'null'); } catch (e) {}
      if (snap && snap.groups) renderPage(snap);
    }
    // Puis récupère la version à jour et rafraîchit l'affichage.
    apiGet().then(function (data) {
      if (!data || (!data.ok && !data.groups)) throw new Error('réponse invalide');
      if (!MOCK) { try { localStorage.setItem(SNAP_CLE, JSON.stringify(data)); } catch (e) {} }
      renderPage(data);
    }).catch(function () {
      if (!snap) { // l'erreur ne s'affiche que si aucune liste n'a pu être montrée
        $('chargement').hidden = true;
        $('erreur-chargement').hidden = false;
      }
    });
  }

  function renderPage(data) {
    var cfg = data.config || {};
    document.title = cfg.titre || 'Liste de naissance';
    $('brand-name').textContent = cfg.titre || 'Liste de naissance';
    var chip = $('sous-titre');
chip.textContent = cfg.sous_titre || '';
chip.style.display = cfg.sous_titre ? '' : 'none';
    // Titre principal : clé "titre_page" du config, sinon libellé par défaut.
    $('titre').textContent = cfg.titre_page || ('Liste de naissance de ' + (cfg.titre || ''));
    $('meta-date').textContent = '📅 ' + (cfg.date || '');

    // Intro (paragraphes + signature)
    var introHtml = '';
    String(cfg.intro || '').split('\n').forEach(function (ligne) {
      if (ligne.trim()) introHtml += '<p>' + esc(ligne) + '</p>';
    });
    if (cfg.signature) introHtml += '<p class="signature">' + esc(cfg.signature) + '</p>';
    $('intro').innerHTML = introHtml;

    if (cfg.adresse_livraison) {
      $('adresse-valeur').textContent = cfg.adresse_livraison;
      $('adresse').hidden = false;
    }

    // Produits
    var groups = data.groups || [];
    var html = '';
    if (!groups.length) {
      html = etatVideHTML();
    } else {
      groups.forEach(function (g) {
        var n = (g.produits || []).length;
        html += '<section class="categorie" data-cat="' + esc(g.categorie) + '">' +
          '<div class="categorie-entete"><h2>' + esc(g.categorie) + '</h2>' +
          '<span class="badge-count">' + n + ' article' + (n > 1 ? 's' : '') + '</span></div>' +
          '<div class="grille">' + (g.produits || []).map(carteHTML).join('') + '</div></section>';
      });
    }
    $('liste-produits').innerHTML = html;

    majCompteur();
    $('chargement').hidden = true;
    $('contenu').hidden = false;
  }

  function carteHTML(p) {
    var photo = sanitizeUrl(p.photo), url = sanitizeUrl(p.url);
    // referrerpolicy="no-referrer" : certains CDN marchands refusent les images
    // demandées depuis un autre site. Si l'image échoue malgré tout, onerror
    // bascule sur l'icône cadeau plutôt que d'afficher une image cassée.
    var img = photo
      ? '<img src="' + esc(photo) + '" alt="' + esc(p.nom) + '" loading="lazy" ' +
        'referrerpolicy="no-referrer" ' +
        'onerror="this.parentNode.innerHTML=&quot;<div class=\\&quot;produit-placeholder\\&quot;>🎁</div>&quot;">'
      : '<div class="produit-placeholder">🎁</div>';
    var desc = p.description ? '<p class="produit-desc">' + esc(p.description) + '</p>' : '';
    var enseigne = '';
    if (p.enseigne) enseigne = '<div class="produit-enseigne">🏬 ' + esc(p.enseigne) + '</div>';
    else if (!url) enseigne = '<div class="produit-enseigne libre">🛍️ Modèle au choix</div>';
    var prix = p.prix ? '<div class="produit-prix">' + esc(p.prix) + '</div>' : '';
    var lien = url ? '<a class="produit-lien" href="' + esc(url) + '" target="_blank" rel="noopener">Voir le produit →</a>' : '';

    // Un produit déjà réservé s'affiche grisé, avec un bouton inactif.
    // Le nom de la personne qui a réservé n'est ni transmis ni affiché.
    var reserve = (p.disponible === false);
    var bouton = reserve
      ? '<button class="btn btn-reserve-inactif" disabled>Déjà réservé</button>'
      : '<button class="btn btn-reserver" data-id="' + esc(p.id) + '" data-nom="' + esc(p.nom) + '">Réserver</button>';

    return '<article class="produit' + (reserve ? ' est-reserve' : '') + '" id="card-' + esc(p.id) + '">' +
      '<div class="produit-image">' + img + '</div>' +
      '<div class="produit-corps">' +
      '<h3 class="produit-nom">' + esc(p.nom) + '</h3>' + desc + enseigne + prix +
      bouton + lien + '</div></article>';
  }

  function etatVideHTML() {
    return '<section class="card vide"><div class="vide-emoji">💝</div>' +
      '<h2>Tous les cadeaux ont été réservés&nbsp;!</h2>' +
      '<p>Un immense merci à tous. Si tu souhaites tout de même participer, contacte-nous directement.</p></section>';
  }

  /* ==================== Réservation (modale) =================== */

  var courant = { id: null, nom: null, declencheur: null };
  var copyTimer = null;
  var fermetureTimer = null;   // fermeture automatique après « déjà réservé »
  var envoiEnCours = false;
  var overlay = $('overlay');
  var modale = overlay.querySelector('.modale');
  var etapeForm = $('etape-form');
  var etapeSucces = $('etape-succes');
  var champNom = $('champ-nom');
  var champEmail = $('champ-email');
  var champMessage = $('champ-message');
  var etapeSansEmail = $('etape-sans-email');
  var btnContinuerSansEmail = $('continuer-sans-email');
  var btnRetourEmail = $('retour-email');
  var erreurBox = $('modale-erreur');
  var btnConfirmer = $('confirmer-resa');

  function fondInert(actif) {
    Array.prototype.forEach.call(document.body.children, function (el) {
      if (el === overlay) return;
      if (actif) { el.setAttribute('inert', ''); el.setAttribute('aria-hidden', 'true'); }
      else { el.removeAttribute('inert'); el.removeAttribute('aria-hidden'); }
    });
  }

  function ouvrirModale(id, nom) {
    if (fermetureTimer) { clearTimeout(fermetureTimer); fermetureTimer = null; }
    courant.id = id; courant.nom = nom; courant.declencheur = document.activeElement;
    $('modale-produit').textContent = nom;
    champNom.value = ''; champEmail.value = ''; champMessage.value = '';
    cacherErreur();
    etapeForm.hidden = false; etapeSucces.hidden = true; etapeSansEmail.hidden = true;
    btnConfirmer.disabled = false; btnConfirmer.textContent = 'Je réserve';
    overlay.hidden = false; fondInert(true);
    setTimeout(function () { champNom.focus(); }, 50);
  }
  function fermerModale() {
    overlay.hidden = true; fondInert(false);
    if (courant.declencheur && courant.declencheur.focus) { try { courant.declencheur.focus(); } catch (e) {} }
    courant.declencheur = null;
  }
  function afficherErreur(msg) { erreurBox.hidden = false; erreurBox.textContent = msg; }
  function cacherErreur() { erreurBox.hidden = true; erreurBox.textContent = ''; }
  function reactiver() {
    btnConfirmer.disabled = false; btnConfirmer.textContent = 'Je réserve';
    btnContinuerSansEmail.disabled = false; btnContinuerSansEmail.textContent = 'Continuer quand même';
    btnRetourEmail.disabled = false;
  }

  function emailValide(v) { return /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]{2,}$/.test(v); }

  function confirmerReservation() {
    if (btnConfirmer.disabled) return;
    var nom = champNom.value.trim();
    if (!nom) { afficherErreur('Merci d’indiquer ton prénom.'); champNom.focus(); return; }

    var email = champEmail.value.trim();
    if (email && !emailValide(email)) {
      afficherErreur('Cette adresse e-mail ne semble pas valide.');
      champEmail.focus();
      return;
    }
    cacherErreur();

    // Sans e-mail, une étape d'avertissement précède la validation : le lien
    // d'annulation ne sera affiché qu'une fois et ne pourra pas être renvoyé.
    if (!email) { afficherEtapeSansEmail(); return; }

    envoyerReservation(email);
  }

  function afficherEtapeSansEmail() {
    etapeForm.hidden = true;
    etapeSansEmail.hidden = false;
    btnContinuerSansEmail.disabled = false;
    btnContinuerSansEmail.textContent = 'Continuer quand même';
    setTimeout(function () { btnRetourEmail.focus(); }, 50);
  }

  function retourFormulaire() {
    etapeSansEmail.hidden = true;
    etapeForm.hidden = false;
    setTimeout(function () { champEmail.focus(); }, 50);
  }

  function envoyerReservation(email) {
    var message = champMessage.value.trim();
    var nom = champNom.value.trim();
    // L'id et le nom sont figés ici : la réponse arrive plus tard et doit
    // s'appliquer à ce produit, même si la modale a été rouverte entre-temps.
    var idEnvoye = courant.id;
    var nomEnvoye = courant.nom;
    var avecEmail = !!email;

    envoiEnCours = true;
    btnConfirmer.disabled = true; btnConfirmer.textContent = 'Réservation…';
    btnContinuerSansEmail.disabled = true; btnContinuerSansEmail.textContent = 'Réservation…';
    btnRetourEmail.disabled = true;

    apiPost({ action: 'reserver', id: idEnvoye, nom: nom, message: message, email: email })
      .then(function (res) { onReservationOk(res, idEnvoye, nomEnvoye, avecEmail); })
      .catch(function () {
        envoiEnCours = false;
        retourFormulaire();
        afficherErreur('Connexion interrompue. Vérifie ta connexion et réessaie.'); reactiver();
      });
  }
  function onReservationOk(res, idEnvoye, nomEnvoye, avecEmail) {
    envoiEnCours = false;
    if (res && res.ok) {
      // La modale a pu être fermée pendant l'envoi : on la rouvre pour que le
      // lien d'annulation soit toujours présenté au moins une fois.
      if (overlay.hidden) { overlay.hidden = false; fondInert(true); }
      afficherSucces(res, nomEnvoye, avecEmail);
      marquerCarteReservee(idEnvoye);
      return;
    }
    if (!etapeSansEmail.hidden) retourFormulaire();
    var reason = res ? res.reason : 'erreur';
    if (reason === 'deja_reserve') {
      afficherErreur('Oh non, quelqu’un vient tout juste de réserver ce cadeau. Choisis-en un autre 😊');
      marquerCarteReservee(idEnvoye);
      fermetureTimer = setTimeout(function () { fermetureTimer = null; fermerModale(); }, 2500);
    } else if (reason === 'config') {
      afficherErreur('Le site n’est pas tout à fait prêt. Préviens les parents 🙏'); reactiver();
    } else if (reason === 'occupe') {
      afficherErreur('Le site est très sollicité, réessaie dans un instant.'); reactiver();
    } else {
      afficherErreur('Une erreur est survenue. Réessaie dans un instant.'); reactiver();
    }
  }
  function afficherSucces(res, nomEnvoye, avecEmail) {
    $('succes-produit').textContent = res.produit || nomEnvoye || '';
    var url = res.token ? (location.origin + location.pathname + '?annuler=' + encodeURIComponent(res.token)) : '';
    $('succes-lien').value = url;
    var bloc = $('annulation-bloc');
    if (bloc) bloc.style.display = url ? '' : 'none';

    // Message adapté selon qu'un récapitulatif a été envoyé ou non.
    var mailOk = avecEmail && res.mailEnvoye === true;
    var info = $('succes-mail-info');
    if (info) {
      if (mailOk) {
        info.innerHTML = '📬 Un récapitulatif vient de t’être envoyé par e-mail (pense à vérifier tes spams).';
        info.hidden = false;
      } else if (avecEmail) {
        info.innerHTML = '⚠️ L’e-mail n’a pas pu être envoyé. Garde bien le lien ci-dessous.';
        info.hidden = false;
      } else {
        info.hidden = true;
      }
    }

    // Sans e-mail, ce lien est la seule trace de la réservation.
    var intro = $('annulation-intro');
    var astuce = $('annulation-astuce');
    if (bloc && intro && astuce) {
      if (mailOk) {
        bloc.classList.remove('urgent');
        intro.innerHTML = 'Un imprévu&nbsp;? Tu peux annuler ta réservation avec ce lien&nbsp;:';
        astuce.innerHTML = '💡 Ce lien se trouve aussi dans l’e-mail que tu viens de recevoir.';
      } else {
        bloc.classList.add('urgent');
        intro.innerHTML = '⚠️ <strong>Dernière chance&nbsp;: copie ce lien maintenant.</strong><br>' +
          'Sans adresse e-mail, il ne pourra pas t’être renvoyé et ne sera <strong>plus jamais affiché</strong>.';
        astuce.innerHTML = '💡 Colle-le dans une note, un SMS que tu t’envoies, ou mets-le en favori. ' +
          'Sinon, il faudra contacter directement les futurs parents.';
      }
    }

    etapeForm.hidden = true; etapeSansEmail.hidden = true; etapeSucces.hidden = false;
    setTimeout(function () { var f = $('fermer-succes'); if (f) f.focus(); }, 50);
  }

  /** Grise la carte du produit et rend son bouton inactif. */
  function marquerCarteReservee(id) {
    var carte = $('card-' + id);
    if (!carte) { majCompteur(); return; }
    carte.classList.add('est-reserve');
    var btn = carte.querySelector('.btn-reserver');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Déjà réservé';
      btn.classList.remove('btn-reserver');
      btn.classList.add('btn-reserve-inactif');
      btn.removeAttribute('data-id');
    }
    majCompteur();
  }
  function majCompteur() {
    // Seuls les cadeaux encore disponibles sont comptés.
    var restants = document.querySelectorAll('.produit:not(.est-reserve)').length;
    var compteur = $('compteur');
    if (compteur) {
      compteur.innerHTML = '<span id="compteur-nb">' + restants + '</span> cadeau' +
        (restants > 1 ? 'x' : '') + ' disponible' + (restants > 1 ? 's' : '');
    }
  }

  function copierLien() {
    var champLien = $('succes-lien');
    champLien.select(); champLien.setSelectionRange(0, 99999);
    try { document.execCommand('copy'); } catch (e) {}
    if (navigator.clipboard) navigator.clipboard.writeText(champLien.value).catch(function () {});
    var btn = $('copier-lien');
    if (copyTimer) clearTimeout(copyTimer);
    btn.textContent = 'Copié ✓';
    copyTimer = setTimeout(function () { btn.textContent = 'Copier'; copyTimer = null; }, 1800);
  }

  function piegeFocus(e) {
    if (e.key !== 'Tab') return;
    var sel = 'button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])';
    var f = Array.prototype.filter.call(modale.querySelectorAll(sel), function (el) {
      return el.offsetParent !== null && !el.disabled;
    });
    if (!f.length) return;
    var premier = f[0], dernier = f[f.length - 1];
    if (e.shiftKey && document.activeElement === premier) { e.preventDefault(); dernier.focus(); }
    else if (!e.shiftKey && document.activeElement === dernier) { e.preventDefault(); premier.focus(); }
  }

  document.addEventListener('click', function (e) {
    var b = e.target.closest('.btn-reserver[data-id]');
    if (b && b.getAttribute('data-id')) ouvrirModale(b.getAttribute('data-id'), b.getAttribute('data-nom'));
  });
  $('fermer-modale').addEventListener('click', fermerModale);
  $('annuler-modale').addEventListener('click', fermerModale);
  $('fermer-succes').addEventListener('click', fermerModale);
  btnConfirmer.addEventListener('click', confirmerReservation);
  btnRetourEmail.addEventListener('click', retourFormulaire);
  btnContinuerSansEmail.addEventListener('click', function () {
    if (btnContinuerSansEmail.disabled) return;
    envoyerReservation('');
  });
  $('copier-lien').addEventListener('click', copierLien);
  champNom.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !btnConfirmer.disabled) { e.preventDefault(); confirmerReservation(); }
  });
  champEmail.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !btnConfirmer.disabled) { e.preventDefault(); confirmerReservation(); }
  });
  overlay.addEventListener('keydown', piegeFocus);
  overlay.addEventListener('click', function (e) { if (e.target === overlay && !etapeForm.hidden) fermerModale(); });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape' || overlay.hidden) return;
    // Depuis l'avertissement, Échap revient au formulaire.
    if (!etapeSansEmail.hidden) { retourFormulaire(); return; }
    if (!etapeForm.hidden) fermerModale();
  });

  /* ==================== Annulation (?annuler=token) ============ */

  function initAnnulation(token) {
    var ov = $('overlay-annulation');
    ov.hidden = false;
    apiPost({ action: 'infojeton', token: token }).then(function (info) {
      $('annul-chargement').hidden = true;
      if (info && info.trouve) {
        $('annul-produit').textContent = info.produit || '';
        $('annul-confirm').hidden = false;
      } else {
        $('annul-invalide').hidden = false;
      }
    }).catch(function () {
      $('annul-chargement').hidden = true; $('annul-invalide').hidden = false;
    });

    $('annul-confirmer').addEventListener('click', function () {
      var btn = this;
      if (btn.disabled) return;
      btn.disabled = true; btn.textContent = 'Annulation…';
      $('annul-erreur').hidden = true;
      apiPost({ action: 'annuler', token: token }).then(function (res) {
        if (res && res.ok) {
          $('annul-fait-produit').textContent = res.produit || '';
          $('annul-confirm').hidden = true; $('annul-fait').hidden = false;
        } else {
          $('annul-erreur').hidden = false;
          $('annul-erreur').textContent = (res && res.reason === 'introuvable')
            ? 'Cette réservation a déjà été annulée.'
            : 'Une erreur est survenue. Réessaie dans un instant.';
          btn.disabled = false; btn.textContent = 'Oui, annuler';
        }
      }).catch(function () {
        $('annul-erreur').hidden = false;
        $('annul-erreur').textContent = 'Connexion interrompue. Réessaie.';
        btn.disabled = false; btn.textContent = 'Oui, annuler';
      });
    });

    function retour() { location.href = location.origin + location.pathname; }
    $('annul-retour').addEventListener('click', retour);
    $('annul-fermer').addEventListener('click', retour);
    $('annul-fermer-2').addEventListener('click', retour);
  }

})();
