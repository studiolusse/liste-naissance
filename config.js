/**
 * Configuration de la page.
 * -------------------------------------------------------------
 * API_URL : l'URL de ton application web Google Apps Script déployée
 *           en API (celle qui finit par /exec). C'est le SEUL lien à
 *           coller ici. Il n'est pas secret : les identifiants restent
 *           côté Google, cette URL ne fait qu'appeler ton script.
 *
 * Pour tester la page SANS l'API (données de démo) : ouvre la page
 * avec ?mock=1 à la fin de l'URL.
 */
window.APP_CONFIG = {
  API_URL: "https://script.google.com/macros/s/AKfycbwmhzYeh2mvf77S0hmMyWXv-MQCnpyap-fIMP4VDz0pX_3JiZFF3yumBInGHn095nUfPw/exec"
};
