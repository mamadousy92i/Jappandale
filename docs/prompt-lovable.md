# Prompt à donner à Lovable (page d'accueil Jappandale)

> Copie-colle le bloc ci-dessous dans Lovable pour comparer son rendu.

---

Crée une landing page moderne, épurée et professionnelle pour **Jappandale**, une plateforme sénégalaise de **financement participatif (crowdfunding)** et de mise en relation financière. Le rendu doit rivaliser avec les grandes plateformes du secteur (Kickstarter, GoFundMe, KissKissBankBank) : beaucoup d'espace blanc, une typographie forte, un ton confiant et chaleureux. Toute l'interface est en **français** (accents corrects).

**Ce que fait la plateforme :** Jappandale relie les porteurs de projets sénégalais (entrepreneurs, artisans, coopératives, associations) à une communauté de donateurs, d'investisseurs et de membres de la diaspora. Les campagnes sont vérifiées (vérification d'identité KYC), la collecte est transparente et le suivi se fait de bout en bout.

**Identité visuelle (charte à respecter strictement) :**
- Couleur d'accent : **or `#FAC502`** (variantes : clair `#FDD835`, foncé `#C99A00`), utilisée avec parcimonie (boutons d'action, accents, icônes, dégradés).
- Fond blanc `#FFFFFF`, fond secondaire gris très clair `#F5F5F5`.
- Texte : `#1A1A1A` (principal), `#555555` (secondaire), `#888888` (atténué).
- **Titres en Playfair Display** (serif, gras), **corps de texte en Inter** (sans-serif).
- Boutons très arrondis (style pilule), cartes à coins arrondis (~20px), ombres douces, bordure or au survol.
- Animations d'apparition douces au défilement (fondu + légère translation), respectant `prefers-reduced-motion`. Micro-interactions soignées au survol.

**Sections attendues (dans cet ordre) :**
1. **En-tête** collant : logo + nom « Jappandale », liens « Se connecter » et bouton « S'inscrire ».
2. **Héro** en deux colonnes : à gauche un petit label en majuscules « Financement participatif · Sénégal », un grand titre « Connecter les projets aux opportunités de financement », un sous-titre décrivant la plateforme, deux boutons (« Lancer mon projet » principal, « Comment ça marche » secondaire) et trois gages de confiance (Projets vérifiés · Collecte transparente · Ouvert à la diaspora). À droite, une **photo chaleureuse d'un entrepreneur africain** (ex. artisan, commerçant) dans une carte arrondie avec un léger halo doré et un petit badge flottant « Chaque projet est vérifié ».
3. **« Une plateforme, deux communautés »** : deux grandes cartes avec photo en en-tête — « Vous portez un projet » et « Vous voulez contribuer » — chacune avec une courte description, 3 points à puces et un bouton.
4. **« Comment ça marche »** : trois étapes numérotées (1. Le projet est présenté · 2. La communauté contribue · 3. Le projet prend vie).
5. **« Tous les secteurs qui font le Sénégal »** : une galerie de 4 vignettes photo avec dégradé sombre et libellé en bas (Artisanat, Commerce, Agriculture, Mode & couture).
6. **« La confiance au cœur de la plateforme »** : 4 cartes — Profils vérifiés, Score Jappandale® (badge « Bientôt »), Passeport Financier® (badge « Bientôt »), Pensé pour la diaspora.
7. **Appel à l'action final** sur fond sombre : « Votre projet mérite sa chance. Votre soutien change tout. » avec bouton « Créer mon compte ».
8. **Pied de page** : nom, courte accroche, liens « Créer un compte » / « Se connecter », mention « © Jappandale — Dakar, Sénégal ».

**Contenu (photos & ton) :** utilise des photos authentiques d'entrepreneuriat africain / sénégalais (artisans, marchés, agriculture, commerce, communauté), aux tons naturels et chaleureux. Ton positif, accessible, orienté impact local et confiance. **N'invente pas de chiffres** (la plateforme est nouvelle) : reste qualitatif. Ne mentionne aucune autre marque ou société.

Stack souhaitée : React + Tailwind CSS + shadcn/ui.
