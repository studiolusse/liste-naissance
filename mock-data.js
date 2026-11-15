/**
 * Données de démonstration pour tester la page SANS l'API.
 * Activées en ouvrant la page avec ?mock=1
 * (le vrai site utilise l'API définie dans config.js).
 */
window.MOCK_DATA = {
  ok: true,
  config: {
    titre: "Petit Chevalier de l'Électronique",
    sous_titre: "Liste de naissance",
    date: "23 novembre 2026",
    intro:
      "Chers tous,\n" +
      "L'année 2026 s'annonce riche en nouvelles aventures puisque nous accueillerons un nouveau membre dans notre famille le 23 novembre prochain (si bébé est à l'heure). Pour préparer sa venue, voici une petite liste de matériels, jouets, habits et ustensiles qui nous sera bien utile ! Sentez-vous libre de participer en réservant un objet ou en nous contactant si vous souhaitez participer autrement ☺️\n" +
      "Des bisous et à très vite !",
    signature: "Agnès, Thomas, Marvel, Harlem et la graine de chevalier électronicien",
    adresse_livraison: "12 rue Camille Flammarion 91120 Palaiseau"
  },
  groups: [
    {
      categorie: "Vêtements",
      produits: [
        { id: "P0007", nom: "Bodies manches longues 3 mois (lot de 5)", description: "Unis ou petits motifs, coton bio de préférence — modèle libre.", photo: "", url: "", enseigne: "", prix: "" }
      ]
    },
    {
      categorie: "Chambre",
      produits: [
        { id: "P0003", nom: "Gigoteuse 0-6 mois en coton bio", description: "Douce et respirante, motif petites étoiles.", photo: "", url: "https://www.vertbaudet.fr/gigoteuse", enseigne: "Vertbaudet", prix: "35,00 €" }
      ]
    },
    {
      categorie: "Alimentation",
      produits: [
        { id: "P0001", nom: "MAM Biberons en verre Feel Good dès la naissance (lot de 2)", description: "Lot de 2 biberons en verre MAM « Feel Good » (170 ml + 260 ml selon page)", photo: "", url: "https://www.amazon.fr/mam-biberon", enseigne: "Amazon", prix: "39,99 €" },
        { id: "P0002", nom: "Chauffe-biberon rapide", description: "Réchauffe le lait uniformément en quelques minutes.", photo: "", url: "https://www.beaba.com/chauffe-biberon", enseigne: "Beaba", prix: "29,90 €", disponible: false }
      ]
    },
    {
      categorie: "Eveil & jouets",
      produits: [
        { id: "P0004", nom: "Arche d'éveil en bois", description: "Avec 5 jouets suspendus à contrastes.", photo: "", url: "https://www.natureetdecouvertes.com/arche", enseigne: "Nature & Découvertes", prix: "44,00 €" },
        { id: "P0005", nom: "Doudou tout doux", description: "Le doudou de ton choix, tout simplement.", photo: "", url: "", enseigne: "", prix: "" }
      ]
    }
  ],
  remaining: 5
};
