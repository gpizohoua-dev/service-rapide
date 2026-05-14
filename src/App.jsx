import { useState, useEffect } from "react";

// ─── DONNÉES INITIALES ────────────────────────────────────────────────────────
const PRODUITS_INIT = [
  { id: "yuki", nom: "Yuki Cocktail", emoji: "🍹", prix: 300, couleur: "#22c55e" },
  { id: "youzou", nom: "Youzou", emoji: "🍋", prix: 300, couleur: "#eab308" },
  { id: "fanta_pomme", nom: "Fanta Pomme", emoji: "🟡", prix: 300, couleur: "#f97316" },
  { id: "fanta_fruit_rouge", nom: "Fanta Fruit Rouge", emoji: "🔴", prix: 300, couleur: "#ef4444" },
  { id: "coca", nom: "Coca Cola", emoji: "🥤", prix: 300, couleur: "#7c3aed" },
  { id: "world_cola", nom: "World Cola", emoji: "🫙", prix: 300, couleur: "#6b7280" },
  { id: "eau_mineral", nom: "Eau Minérale", emoji: "💧", prix: 100, couleur: "#38bdf8" },
  { id: "canette_coca", nom: "Canette Coca Cola", emoji: "🥫", prix: 500, couleur: "#dc2626" },
  { id: "canette_youzou", nom: "Canette Youzou", emoji: "🫙", prix: 500, couleur: "#ca8a04" },
  { id: "canette_orangina", nom: "Canette Orangina", emoji: "🍊", prix: 500, couleur: "#ea580c" },
];

const ENTREPOTS_INIT = [
  { id: "bat12", nom: "Bâtiment 12" },
  { id: "bat7", nom: "Bâtiment 7" },
  { id: "bat3", nom: "Bâtiment 3" },
];

const STOCK_INIT = {
  bat12: { yuki: 10, youzou: 2, fanta_pomme: 0, fanta_fruit_rouge: 5, coca: 3, world_cola: 0, eau_mineral: 20, canette_coca: 12, canette_youzou: 8, canette_orangina: 6 },
  bat7:  { yuki: 8,  youzou: 4, fanta_pomme: 6, fanta_fruit_rouge: 2, coca: 10, world_cola: 5, eau_mineral: 15, canette_coca: 10, canette_youzou: 5, canette_orangina: 4 },
  bat3:  { yuki: 15, youzou: 0, fanta_pomme: 3, fanta_fruit_rouge: 8, coca: 4, world_cola: 2, eau_mineral: 30, canette_coca: 7,  canette_youzou: 3, canette_orangina: 9 },
};

const COMPTES_INIT = [
  { id: "admin", nom: "Administrateur", role: "admin", pass: "admin123", entrepot: null },
  { id: "vendeur1", nom: "Mohamed", role: "vendeur", pass: "1234", entrepot: "bat12" },
  { id: "vendeur2", nom: "Fatima", role: "vendeur", pass: "1234", entrepot: "bat7" },
  { id: "vendeur3", nom: "Ibrahim", role: "vendeur", pass: "1234", entrepot: "bat3" },
];

const fmt = (n) => new Intl.NumberFormat("fr-FR").format(n) + " FCFA";
const today = () => new Date().toISOString().split("T")[0];
const hour = () => new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
const genId = () => `id_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

const SEUIL_BAS  = 5;  // alerte orange
const SEUIL_CRIT = 2;  // alerte rouge

// ─── CALCUL ALERTES STOCK ─────────────────────────────────────────────────────
function getAlertes(stock, entrepots) {
  const alertes = [];
  entrepots.forEach(e => {
    const s = stock[e.id] || {};
    PRODUITS_INIT.forEach(p => {
      const qte = s[p.id] ?? 0;
      if (qte === 0) {
        alertes.push({ entrepotId: e.id, entrepotNom: e.nom, produit: p, qte, niveau: "rupture" });
      } else if (qte <= SEUIL_CRIT) {
        alertes.push({ entrepotId: e.id, entrepotNom: e.nom, produit: p, qte, niveau: "critique" });
      } else if (qte <= SEUIL_BAS) {
        alertes.push({ entrepotId: e.id, entrepotNom: e.nom, produit: p, qte, niveau: "bas" });
      }
    });
  });
  return alertes;
}

// ─── HOOK PERSISTANCE localStorage ───────────────────────────────────────────
function usePersist(cle, valeurDefaut) {
  const [etat, setEtat] = useState(() => {
    try {
      const saved = localStorage.getItem("sr_" + cle);
      return saved ? JSON.parse(saved) : valeurDefaut;
    } catch { return valeurDefaut; }
  });

  const setEtatPersiste = (valeur) => {
    setEtat(prev => {
      const nouvelle = typeof valeur === "function" ? valeur(prev) : valeur;
      try { localStorage.setItem("sr_" + cle, JSON.stringify(nouvelle)); } catch {}
      return nouvelle;
    });
  };

  return [etat, setEtatPersiste];
}

// ─── COMPOSANT PRINCIPAL ──────────────────────────────────────────────────────
export default function ServiceRapide() {
  const [session, setSession] = useState(null);
  const [page, setPage] = useState("login");
  const [comptes, setComptes]     = usePersist("comptes", COMPTES_INIT);
  const [entrepots, setEntrepots] = usePersist("entrepots", ENTREPOTS_INIT);
  const [stock, setStock]         = usePersist("stock", STOCK_INIT);
  const [ventes, setVentes]       = usePersist("ventes", []);
  const [notif, setNotif] = useState(null);

  const notify = (msg, type = "ok") => {
    setNotif({ msg, type });
    setTimeout(() => setNotif(null), 3500);
  };

  const login = (id, pass) => {
    const compte = comptes.find(c => c.id === id && c.pass === pass);
    if (!compte) return false;
    setSession(compte);
    setPage(compte.role === "admin" ? "admin_dash" : "vendeur_dash");
    return true;
  };

  const logout = () => { setSession(null); setPage("login"); };

  // ── Réinitialiser toutes les données ──
  const reinitialiser = () => {
    setComptes(COMPTES_INIT);
    setEntrepots(ENTREPOTS_INIT);
    setStock(STOCK_INIT);
    setVentes([]);
    notify("🔄 Données réinitialisées");
  };

  const ajouterVendeur = (donnees) => {
    const { nom, loginId, pass, entrepotId } = donnees;
    // Vérifier que l'identifiant n'est pas déjà pris
    if (comptes.find(c => c.id === loginId)) {
      notify(`⚠️ L'identifiant "${loginId}" est déjà utilisé`, "err");
      return false;
    }
    setComptes(c => [...c, { id: loginId, nom, role: "vendeur", pass, entrepot: entrepotId }]);
    notify(`✅ Vendeur "${nom}" créé — identifiant : ${loginId}`);
    return true;
  };

  const supprimerVendeur = (vendeurId) => {
    setComptes(c => c.filter(x => x.id !== vendeurId));
    notify(`🗑️ Compte supprimé`);
  };

  const ajouterEntrepot = (nom) => {
    const id = "bat_" + genId();
    setEntrepots(e => [...e, { id, nom }]);
    setStock(s => {
      const newStock = { ...s, [id]: {} };
      PRODUITS_INIT.forEach(p => { newStock[id][p.id] = 0; });
      return newStock;
    });
    notify(`✅ Entrepôt "${nom}" ajouté`);
  };

  const supprimerEntrepot = (entrepotId) => {
    setEntrepots(e => e.filter(x => x.id !== entrepotId));
    setStock(s => { const ns = { ...s }; delete ns[entrepotId]; return ns; });
    notify(`🗑️ Entrepôt supprimé`);
  };

  const enregistrerVente = (venteDonnees) => {
    const { clientNom, produitId, quantite, entrepotId } = venteDonnees;
    const produit = PRODUITS_INIT.find(p => p.id === produitId);
    const stockActuel = stock[entrepotId]?.[produitId] ?? 0;
    if (stockActuel < quantite) { notify("⚠️ Stock insuffisant !", "err"); return false; }
    const newVente = {
      id: Date.now(), date: today(), heure: hour(), clientNom,
      produitId, produitNom: produit.nom, quantite,
      prixUnit: produit.prix, total: produit.prix * quantite,
      entrepotId, vendeurId: session.id, vendeurNom: session.nom,
    };
    setVentes(v => [...v, newVente]);
    setStock(s => ({ ...s, [entrepotId]: { ...s[entrepotId], [produitId]: s[entrepotId][produitId] - quantite } }));
    notify(`✅ Vente enregistrée — ${fmt(newVente.total)}`);
    return true;
  };

  const ajouterStock = (entrepotId, produitId, qte) => {
    setStock(s => ({ ...s, [entrepotId]: { ...s[entrepotId], [produitId]: (s[entrepotId][produitId] || 0) + qte } }));
    notify(`📦 Stock mis à jour ✓`);
  };

  return (
    <div style={styles.app}>
      <style>{css}</style>
      {notif && (
        <div style={{ ...styles.notif, background: notif.type === "err" ? "#ef4444" : "#22c55e" }}>
          {notif.msg}
        </div>
      )}
      {page === "login" && <LoginPage onLogin={login} />}
      {page === "vendeur_dash" && session && (
        <VendeurDash session={session} stock={stock} entrepots={entrepots}
          ventes={ventes.filter(v => v.vendeurId === session.id)}
          onVente={enregistrerVente} onLogout={logout} />
      )}
      {page === "admin_dash" && session?.role === "admin" && (
        <AdminDash stock={stock} ventes={ventes} comptes={comptes} entrepots={entrepots}
          onLogout={logout} onAjouterStock={ajouterStock}
          onAjouterVendeur={ajouterVendeur} onSupprimerVendeur={supprimerVendeur}
          onAjouterEntrepot={ajouterEntrepot} onSupprimerEntrepot={supprimerEntrepot}
          onReinitialiser={reinitialiser}
          notify={notify} />
      )}
    </div>
  );
}

// ─── LOGIN ────────────────────────────────────────────────────────────────────
function LoginPage({ onLogin }) {
  const [id, setId] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const handle = () => {
    setLoading(true);
    setTimeout(() => {
      if (!onLogin(id, pass)) setErr("Identifiant ou mot de passe incorrect.");
      setLoading(false);
    }, 600);
  };

  return (
    <div style={styles.loginWrap}>
      <div style={styles.loginCard}>
        <div style={styles.logo}>
          <span style={styles.logoIcon}>⚡</span>
          <span style={styles.logoText}>SERVICE RAPIDE</span>
        </div>
        <p style={styles.loginSub}>Gestion de stock & ventes</p>
        <div style={styles.field}>
          <label style={styles.label}>Identifiant</label>
          <input style={styles.input} placeholder="ex: vendeur1" value={id}
            onChange={e => { setId(e.target.value); setErr(""); }}
            onKeyDown={e => e.key === "Enter" && handle()} />
        </div>
        <div style={styles.field}>
          <label style={styles.label}>Mot de passe</label>
          <input style={styles.input} type="password" placeholder="••••••" value={pass}
            onChange={e => { setPass(e.target.value); setErr(""); }}
            onKeyDown={e => e.key === "Enter" && handle()} />
        </div>
        {err && <p style={styles.errMsg}>{err}</p>}
        <button style={styles.btnPrimary} onClick={handle} disabled={loading}>
          {loading ? "Connexion…" : "Se connecter →"}
        </button>

      </div>
    </div>
  );
}

// ─── VENDEUR DASHBOARD ────────────────────────────────────────────────────────
function VendeurDash({ session, stock, entrepots, ventes, onVente, onLogout }) {
  const [tab, setTab] = useState("vente");
  const entrepot = entrepots.find(e => e.id === session.entrepot);
  const monStock = stock[session.entrepot] || {};
  const caJour = ventes.filter(v => v.date === today()).reduce((s, v) => s + v.total, 0);

  // Alertes uniquement pour l'entrepôt du vendeur
  const alertes = getAlertes({ [session.entrepot]: monStock }, entrepots.filter(e => e.id === session.entrepot));
  const nbAlertes = alertes.length;

  return (
    <div style={styles.layout}>
      <Sidebar role="vendeur" nom={session.nom} entrepot={entrepot?.nom} tab={tab} setTab={setTab} onLogout={onLogout} nbAlertes={nbAlertes} />
      <main style={styles.main}>
        <Header titre={tab === "vente" ? "Nouvelle Vente" : tab === "stock" ? "Mon Stock" : "Mes Ventes"} caJour={caJour} />
        <BanniereAlertes alertes={alertes} />
        {tab === "vente" && <FormulaireVente stock={monStock} entrepotId={session.entrepot} onVente={onVente} alertes={alertes} />}
        {tab === "stock" && <StockView stock={monStock} />}
        {tab === "historique" && <HistoriqueVentes ventes={ventes} entrepots={entrepots} />}
      </main>
    </div>
  );
}

// ─── ADMIN DASHBOARD ──────────────────────────────────────────────────────────
function AdminDash({ stock, ventes, comptes, entrepots, onLogout, onAjouterStock,
  onAjouterVendeur, onSupprimerVendeur, onAjouterEntrepot, onSupprimerEntrepot,
  onReinitialiser, notify }) {
  const [tab, setTab] = useState("overview");
  const [confirmReset, setConfirmReset] = useState(false);
  const caTotal = ventes.filter(v => v.date === today()).reduce((s, v) => s + v.total, 0);

  const alertes = getAlertes(stock, entrepots);
  const nbAlertes = alertes.length;

  return (
    <div style={styles.layout}>
      <Sidebar role="admin" nom="Administrateur" tab={tab} setTab={setTab} onLogout={onLogout}
        onReinitialiser={() => setConfirmReset(true)} nbAlertes={nbAlertes} />
      <main style={styles.main}>
        {confirmReset && (
          <div style={styles.modalOverlay}>
            <div style={styles.modalBox}>
              <div style={styles.modalTitle}>⚠️ Réinitialiser toutes les données ?</div>
              <p style={{ color: "#f1f5f9", fontSize: 14, lineHeight: 1.6 }}>
                Cette action supprimera <strong>toutes les ventes</strong>, remet le stock aux valeurs initiales
                et remet les comptes et entrepôts par défaut. Cette action est <strong style={{ color: "#ef4444" }}>irréversible</strong>.
              </p>
              <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                <button style={{ ...styles.btnDanger, flex: 1 }} onClick={() => { onReinitialiser(); setConfirmReset(false); }}>
                  🔄 Confirmer la réinitialisation
                </button>
                <button style={{ ...styles.btnSecondary, flex: 1 }} onClick={() => setConfirmReset(false)}>Annuler</button>
              </div>
            </div>
          </div>
        )}
        <Header titre={
          tab === "overview" ? "Vue Globale" : tab === "stock" ? "Gestion du Stock" :
          tab === "ventes" ? "Toutes les Ventes" : tab === "vendeurs" ? "Vendeurs" : "Entrepôts"
        } caJour={caTotal} />
        <BanniereAlertes alertes={alertes} isAdmin />
        {tab === "overview" && <AdminOverview stock={stock} ventes={ventes} entrepots={entrepots} comptes={comptes} />}
        {tab === "stock" && <AdminStock stock={stock} entrepots={entrepots} onAjouter={onAjouterStock} />}
        {tab === "ventes" && <HistoriqueVentes ventes={ventes} isAdmin entrepots={entrepots} />}
        {tab === "vendeurs" && <VendeursView ventes={ventes} comptes={comptes} entrepots={entrepots} onAjouter={onAjouterVendeur} onSupprimer={onSupprimerVendeur} />}
        {tab === "entrepots" && <EntrepotsView entrepots={entrepots} onAjouter={onAjouterEntrepot} onSupprimer={onSupprimerEntrepot} comptes={comptes} />}
      </main>
    </div>
  );
}

// ─── SIDEBAR ──────────────────────────────────────────────────────────────────
function Sidebar({ role, nom, entrepot, tab, setTab, onLogout, onReinitialiser, nbAlertes }) {
  const menu = role === "admin" ? [
    { id: "overview", label: "Vue globale", icon: "📊" },
    { id: "stock", label: "Stock", icon: "📦", alerte: true },
    { id: "ventes", label: "Ventes", icon: "📋" },
    { id: "vendeurs", label: "Vendeurs", icon: "👥" },
    { id: "entrepots", label: "Entrepôts", icon: "🏭" },
  ] : [
    { id: "vente", label: "Vente", icon: "🛒" },
    { id: "stock", label: "Stock", icon: "📦", alerte: true },
    { id: "historique", label: "Historique", icon: "📋" },
  ];

  return (
    <aside style={styles.sidebar}>
      <div style={styles.sideTop}>
        <div style={styles.sideLogoWrap}>
          <span style={styles.sideLogoIcon}>⚡</span>
          <div>
            <div style={styles.sideLogoTitle}>SERVICE RAPIDE</div>
            {entrepot && <div style={styles.sideEntrepot}>{entrepot}</div>}
          </div>
        </div>
        <div style={styles.sideUser}>
          <div style={styles.avatar}>{nom[0]}</div>
          <div>
            <div style={styles.userName}>{nom}</div>
            <div style={styles.userRole}>{role === "admin" ? "Administrateur" : "Vendeur"}</div>
          </div>
        </div>
        <nav>
          {menu.map(m => (
            <button key={m.id} style={{ ...styles.navBtn, ...(tab === m.id ? styles.navBtnActive : {}) }} onClick={() => setTab(m.id)}>
              <span>{m.icon}</span>
              <span style={{ flex: 1 }}>{m.label}</span>
              {m.alerte && nbAlertes > 0 && (
                <span style={styles.alertBadge}>{nbAlertes}</span>
              )}
            </button>
          ))}
        </nav>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {role === "admin" && onReinitialiser && (
          <button style={styles.resetBtn} onClick={onReinitialiser}>🔄 Réinitialiser</button>
        )}
        <button style={styles.logoutBtn} onClick={onLogout}>← Déconnexion</button>
      </div>
    </aside>
  );
}

// ─── BANNIERE ALERTES ─────────────────────────────────────────────────────────
function BanniereAlertes({ alertes, isAdmin }) {
  const [ouvert, setOuvert] = useState(true);
  if (!alertes.length || !ouvert) return null;

  const ruptures  = alertes.filter(a => a.niveau === "rupture");
  const critiques = alertes.filter(a => a.niveau === "critique");
  const bas       = alertes.filter(a => a.niveau === "bas");

  return (
    <div style={styles.alertBanniere}>
      <div style={styles.alertBanniereHeader}>
        <div style={styles.alertBanniereTitle}>
          🔔 {alertes.length} alerte{alertes.length > 1 ? "s" : ""} de stock
          {isAdmin && <span style={styles.alertBanniereHint}> — Tous entrepôts</span>}
        </div>
        <button style={styles.alertFermer} onClick={() => setOuvert(false)}>✕</button>
      </div>
      <div style={styles.alertGrid}>
        {ruptures.map((a, i) => (
          <div key={i} style={{ ...styles.alertItem, borderColor: "#ef4444", background: "rgba(239,68,68,0.08)" }}>
            <span style={styles.alertNiveau}>🔴 RUPTURE</span>
            <span style={styles.alertProd}>{a.produit.emoji} {a.produit.nom}</span>
            {isAdmin && <span style={styles.alertEntrepot}>{a.entrepotNom}</span>}
            <span style={{ ...styles.alertQte, color: "#ef4444" }}>0 unité</span>
          </div>
        ))}
        {critiques.map((a, i) => (
          <div key={i} style={{ ...styles.alertItem, borderColor: "#f97316", background: "rgba(249,115,22,0.08)" }}>
            <span style={styles.alertNiveau}>🟠 CRITIQUE</span>
            <span style={styles.alertProd}>{a.produit.emoji} {a.produit.nom}</span>
            {isAdmin && <span style={styles.alertEntrepot}>{a.entrepotNom}</span>}
            <span style={{ ...styles.alertQte, color: "#f97316" }}>{a.qte} unité{a.qte > 1 ? "s" : ""}</span>
          </div>
        ))}
        {bas.map((a, i) => (
          <div key={i} style={{ ...styles.alertItem, borderColor: "#eab308", background: "rgba(234,179,8,0.08)" }}>
            <span style={styles.alertNiveau}>🟡 STOCK BAS</span>
            <span style={styles.alertProd}>{a.produit.emoji} {a.produit.nom}</span>
            {isAdmin && <span style={styles.alertEntrepot}>{a.entrepotNom}</span>}
            <span style={{ ...styles.alertQte, color: "#eab308" }}>{a.qte} unité{a.qte > 1 ? "s" : ""}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── HEADER ───────────────────────────────────────────────────────────────────
function Header({ titre, caJour }) {
  const [time, setTime] = useState(hour());
  useEffect(() => { const t = setInterval(() => setTime(hour()), 30000); return () => clearInterval(t); }, []);
  return (
    <div style={styles.header}>
      <h1 style={styles.headerTitle}>{titre}</h1>
      <div style={styles.headerRight}>
        <div style={styles.caCard}>
          <span style={styles.caLabel}>CA du jour</span>
          <span style={styles.caVal}>{fmt(caJour)}</span>
        </div>
        <div style={styles.clock}>{time}</div>
      </div>
    </div>
  );
}

// ─── FORMULAIRE VENTE ─────────────────────────────────────────────────────────
function FormulaireVente({ stock, entrepotId, onVente, alertes }) {
  const [client, setClient] = useState("");
  const [produit, setProduit] = useState("");
  const [qte, setQte] = useState(1);
  const [done, setDone] = useState(false);

  const prod = PRODUITS_INIT.find(p => p.id === produit);
  const total = prod ? prod.prix * qte : 0;
  const stockDispo = produit ? (stock[produit] ?? 0) : 0;
  const alerteProduit = alertes?.find(a => a.produit.id === produit);

  const submit = () => {
    if (!client.trim() || !produit || qte < 1) return;
    const ok = onVente({ clientNom: client, produitId: produit, quantite: qte, entrepotId });
    if (ok) { setClient(""); setProduit(""); setQte(1); setDone(true); setTimeout(() => setDone(false), 2000); }
  };

  return (
    <div style={styles.formWrap}>
      <div style={styles.formCard}>
        <h2 style={styles.sectionTitle}>Enregistrer une vente</h2>
        <div style={styles.formGrid}>
          <div style={styles.field}>
            <label style={styles.label}>Nom du client</label>
            <input style={styles.input} placeholder="ex: Mohamed" value={client} onChange={e => setClient(e.target.value)} />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Produit</label>
            <select style={styles.input} value={produit} onChange={e => setProduit(e.target.value)}>
              <option value="">-- Choisir --</option>
              {PRODUITS_INIT.map(p => {
                const qte = stock[p.id] ?? 0;
                const alerte = alertes?.find(a => a.produit.id === p.id);
                const prefixe = qte === 0 ? "🔴" : alerte ? "⚠️" : "";
                return (
                  <option key={p.id} value={p.id} disabled={qte === 0}>
                    {prefixe} {p.emoji} {p.nom} — {fmt(p.prix)} (stock: {qte})
                  </option>
                );
              })}
            </select>
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Quantité</label>
            <input style={styles.input} type="number" min={1} max={stockDispo} value={qte}
              onChange={e => setQte(Math.max(1, parseInt(e.target.value) || 1))} />
            {produit && <span style={styles.hint}>Stock disponible : {stockDispo}</span>}
          </div>
        </div>

        {/* Avertissement stock bas sur le produit sélectionné */}
        {alerteProduit && (
          <div style={{
            ...styles.alertItemInline,
            borderColor: alerteProduit.niveau === "rupture" ? "#ef4444" : alerteProduit.niveau === "critique" ? "#f97316" : "#eab308",
            background: alerteProduit.niveau === "rupture" ? "rgba(239,68,68,0.1)" : alerteProduit.niveau === "critique" ? "rgba(249,115,22,0.1)" : "rgba(234,179,8,0.1)",
          }}>
            {alerteProduit.niveau === "rupture" ? "🔴 Rupture de stock" :
             alerteProduit.niveau === "critique" ? `🟠 Stock critique — seulement ${alerteProduit.qte} unité(s) restante(s)` :
             `🟡 Stock bas — seulement ${alerteProduit.qte} unité(s) restante(s)`}
          </div>
        )}

        {prod && (
          <div style={styles.totalBox}>
            <div style={styles.totalRow}><span>Prix unitaire</span><strong>{fmt(prod.prix)}</strong></div>
            <div style={styles.totalRow}><span>Quantité</span><strong>{qte}</strong></div>
            <div style={{ ...styles.totalRow, ...styles.totalFinal }}><span>TOTAL</span><strong>{fmt(total)}</strong></div>
          </div>
        )}
        <button style={{ ...styles.btnPrimary, marginTop: 8, opacity: (!client || !produit || qte < 1) ? 0.5 : 1 }}
          onClick={submit} disabled={!client || !produit || qte < 1}>
          {done ? "✅ Enregistrée !" : "💾 Valider la vente"}
        </button>
      </div>
      <div>
        <h2 style={styles.sectionTitle}>Sélection rapide</h2>
        <div style={styles.prodGrid}>
          {PRODUITS_INIT.map(p => (
            <button key={p.id}
              style={{ ...styles.prodCard, borderColor: p.couleur, opacity: (stock[p.id] ?? 0) === 0 ? 0.4 : 1 }}
              onClick={() => setProduit(p.id)} disabled={(stock[p.id] ?? 0) === 0}>
              <div style={{ ...styles.prodEmoji, color: p.couleur }}>{p.emoji}</div>
              <div style={styles.prodNom}>{p.nom}</div>
              <div style={{ ...styles.prodPrix, color: p.couleur }}>{fmt(p.prix)}</div>
              <div style={styles.prodStock}>Stock : {stock[p.id] ?? 0}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── STOCK VIEW ───────────────────────────────────────────────────────────────
function StockView({ stock }) {
  const total = Object.values(stock).reduce((s, v) => s + v, 0);
  return (
    <div>
      <div style={styles.statRow}>
        <StatCard label="Total articles" val={total} icon="📦" />
        <StatCard label="Disponibles" val={Object.values(stock).filter(v => v > 0).length} icon="✅" />
        <StatCard label="Ruptures" val={Object.values(stock).filter(v => v === 0).length} icon="⚠️" />
      </div>
      <div style={styles.stockTable}>
        <table style={styles.table}>
          <thead>
            <tr>{["Produit", "Prix unitaire", "Quantité", "Valeur stock", "Statut"].map(h => <th key={h} style={styles.th}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {PRODUITS_INIT.map(p => {
              const qte = stock[p.id] ?? 0;
              return (
                <tr key={p.id} style={styles.tr}>
                  <td style={styles.td}><span style={{ color: p.couleur }}>{p.emoji}</span> {p.nom}</td>
                  <td style={styles.td}>{fmt(p.prix)}</td>
                  <td style={styles.td}><strong>{qte}</strong></td>
                  <td style={styles.td}>{fmt(p.prix * qte)}</td>
                  <td style={styles.td}>
                    <span style={{ ...styles.badge, background: qte === 0 ? "#ef4444" : qte < 3 ? "#f97316" : "#22c55e" }}>
                      {qte === 0 ? "Rupture" : qte < 3 ? "Faible" : "OK"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── HISTORIQUE VENTES ────────────────────────────────────────────────────────
function HistoriqueVentes({ ventes, isAdmin, entrepots }) {
  const [filtre, setFiltre] = useState("jour");
  const now = new Date();
  const filtered = ventes.filter(v => {
    const d = new Date(v.date);
    if (filtre === "jour") return v.date === today();
    if (filtre === "mois") return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    return true;
  });
  const ca = filtered.reduce((s, v) => s + v.total, 0);

  return (
    <div>
      <div style={styles.statRow}>
        <StatCard label="Ventes" val={filtered.length} icon="🛒" />
        <StatCard label="CA total" val={fmt(ca)} icon="💰" />
        <StatCard label="Panier moyen" val={filtered.length ? fmt(Math.round(ca / filtered.length)) : "—"} icon="📊" />
      </div>
      <div style={styles.filtreRow}>
        {["jour", "mois", "tout"].map(f => (
          <button key={f} style={{ ...styles.filtreBtn, ...(filtre === f ? styles.filtreBtnActive : {}) }} onClick={() => setFiltre(f)}>
            {f === "jour" ? "Aujourd'hui" : f === "mois" ? "Ce mois" : "Tout"}
          </button>
        ))}
      </div>
      {filtered.length === 0 ? <div style={styles.empty}>Aucune vente pour cette période.</div> : (
        <div style={styles.stockTable}>
          <table style={styles.table}>
            <thead>
              <tr>{["Heure", "Client", "Produit", "Qté", "Total", ...(isAdmin ? ["Vendeur", "Entrepôt"] : [])].map(h => <th key={h} style={styles.th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {[...filtered].reverse().map(v => {
                const p = PRODUITS_INIT.find(x => x.id === v.produitId);
                const e = entrepots?.find(x => x.id === v.entrepotId);
                return (
                  <tr key={v.id} style={styles.tr}>
                    <td style={styles.td}>{v.heure}</td>
                    <td style={styles.td}>{v.clientNom}</td>
                    <td style={styles.td}><span style={{ color: p?.couleur }}>{p?.emoji}</span> {v.produitNom}</td>
                    <td style={styles.td}>{v.quantite}</td>
                    <td style={styles.td}><strong style={{ color: "#22c55e" }}>{fmt(v.total)}</strong></td>
                    {isAdmin && <><td style={styles.td}>{v.vendeurNom}</td><td style={styles.td}>{e?.nom ?? v.entrepotId}</td></>}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── ADMIN OVERVIEW ───────────────────────────────────────────────────────────
function AdminOverview({ stock, ventes, entrepots, comptes }) {
  const caJour = ventes.filter(v => v.date === today()).reduce((s, v) => s + v.total, 0);
  const caMois = ventes.filter(v => {
    const d = new Date(v.date); const n = new Date();
    return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
  }).reduce((s, v) => s + v.total, 0);
  const totalStock = Object.values(stock).reduce((s, e) => s + Object.values(e).reduce((a, b) => a + b, 0), 0);

  return (
    <div>
      <div style={styles.statRow}>
        <StatCard label="CA aujourd'hui" val={fmt(caJour)} icon="📈" color="#22c55e" />
        <StatCard label="CA ce mois" val={fmt(caMois)} icon="💰" color="#3b82f6" />
        <StatCard label="Ventes aujourd'hui" val={ventes.filter(v => v.date === today()).length} icon="🛒" />
        <StatCard label="Stock total" val={totalStock + " unités"} icon="📦" />
        <StatCard label="Vendeurs" val={comptes.filter(c => c.role === "vendeur").length} icon="👥" />
        <StatCard label="Entrepôts" val={entrepots.length} icon="🏭" />
      </div>
      <h2 style={styles.sectionTitle}>Stock par entrepôt</h2>
      <div style={styles.entrepotGrid}>
        {entrepots.map(e => {
          const s = stock[e.id] || {};
          const total = Object.values(s).reduce((a, b) => a + b, 0);
          const ruptures = Object.values(s).filter(v => v === 0).length;
          return (
            <div key={e.id} style={styles.entrepotCard}>
              <div style={styles.entrepotNom}>🏭 {e.nom}</div>
              <div style={styles.entrepotTotal}>{total} unités</div>
              {ruptures > 0 && <div style={styles.ruptureTag}>⚠️ {ruptures} rupture(s)</div>}
              <div style={{ marginTop: 12 }}>
                {PRODUITS_INIT.map(p => (
                  <div key={p.id} style={styles.miniStockRow}>
                    <span>{p.emoji} {p.nom}</span>
                    <span style={{ color: (s[p.id] ?? 0) === 0 ? "#ef4444" : "#22c55e", fontWeight: 700 }}>{s[p.id] ?? 0}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── ADMIN STOCK ──────────────────────────────────────────────────────────────
function AdminStock({ stock, entrepots, onAjouter }) {
  const [entrepot, setEntrepot] = useState(entrepots[0]?.id || "");
  const [produit, setProduit] = useState("");
  const [qte, setQte] = useState(1);

  return (
    <div>
      <div style={styles.formCard}>
        <h2 style={styles.sectionTitle}>Approvisionner le stock</h2>
        <div style={styles.formGrid}>
          <div style={styles.field}>
            <label style={styles.label}>Entrepôt</label>
            <select style={styles.input} value={entrepot} onChange={e => setEntrepot(e.target.value)}>
              {entrepots.map(e => <option key={e.id} value={e.id}>{e.nom}</option>)}
            </select>
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Produit</label>
            <select style={styles.input} value={produit} onChange={e => setProduit(e.target.value)}>
              <option value="">-- Choisir --</option>
              {PRODUITS_INIT.map(p => <option key={p.id} value={p.id}>{p.emoji} {p.nom}</option>)}
            </select>
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Quantité à ajouter</label>
            <input style={styles.input} type="number" min={1} value={qte} onChange={e => setQte(Math.max(1, parseInt(e.target.value) || 1))} />
          </div>
        </div>
        <button style={{ ...styles.btnPrimary, opacity: !produit ? 0.5 : 1 }}
          onClick={() => { if (produit && entrepot) { onAjouter(entrepot, produit, qte); setProduit(""); setQte(1); } }}
          disabled={!produit || !entrepot}>
          ➕ Ajouter au stock
        </button>
      </div>
      <h2 style={styles.sectionTitle}>Stock global</h2>
      {entrepots.map(e => (
        <div key={e.id} style={{ marginBottom: 24 }}>
          <h3 style={styles.entrepotLabel}>🏭 {e.nom}</h3>
          <StockView stock={stock[e.id] || {}} />
        </div>
      ))}
    </div>
  );
}

// ─── VENDEURS VIEW ────────────────────────────────────────────────────────────
function VendeursView({ ventes, comptes, entrepots, onAjouter, onSupprimer }) {
  const [showForm, setShowForm] = useState(false);
  const [nom, setNom] = useState("");
  const [loginId, setLoginId] = useState("");
  const [pass, setPass] = useState("");
  const [entrepotId, setEntrepotId] = useState(entrepots[0]?.id || "");
  const [confirm, setConfirm] = useState(null);
  const [errLogin, setErrLogin] = useState("");

  // Auto-générer un identifiant propre à partir du nom
  const handleNomChange = (val) => {
    setNom(val);
    if (!loginId) {
      const suggestion = val.toLowerCase().trim()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
      setLoginId(suggestion);
    }
  };

  const submit = () => {
    if (!nom.trim() || !loginId.trim() || !pass.trim() || !entrepotId) return;
    setErrLogin("");
    const ok = onAjouter({ nom, loginId: loginId.trim(), pass, entrepotId });
    if (ok !== false) {
      setNom(""); setLoginId(""); setPass(""); setShowForm(false);
    } else {
      setErrLogin(`L'identifiant "${loginId}" est déjà utilisé, choisissez-en un autre.`);
    }
  };

  return (
    <div>
      {confirm && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalBox}>
            <div style={styles.modalTitle}>⚠️ Confirmer la suppression</div>
            <p style={{ color: "#f1f5f9", fontSize: 14 }}>
              Supprimer le compte de <strong style={{ color: "#f59e0b" }}>{confirm.nom}</strong> ?
            </p>
            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button style={{ ...styles.btnDanger, flex: 1 }} onClick={() => { onSupprimer(confirm.id); setConfirm(null); }}>🗑️ Supprimer</button>
              <button style={{ ...styles.btnSecondary, flex: 1 }} onClick={() => setConfirm(null)}>Annuler</button>
            </div>
          </div>
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ ...styles.sectionTitle, marginBottom: 0 }}>Gestion des vendeurs</h2>
        <button style={styles.btnAdd} onClick={() => setShowForm(!showForm)}>
          {showForm ? "✕ Annuler" : "➕ Nouveau vendeur"}
        </button>
      </div>
      {showForm && (
        <div style={styles.formCard}>
          <h3 style={styles.sectionTitle}>Créer un compte vendeur</h3>
          <div style={styles.formGrid}>
            <div style={styles.field}>
              <label style={styles.label}>Nom complet</label>
              <input style={styles.input} placeholder="ex: Aminata" value={nom} onChange={e => handleNomChange(e.target.value)} />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Identifiant de connexion</label>
              <input style={{ ...styles.input, borderColor: errLogin ? "#ef4444" : undefined }}
                placeholder="ex: aminata" value={loginId}
                onChange={e => { setLoginId(e.target.value.toLowerCase().replace(/\s/g, "_")); setErrLogin(""); }} />
              <span style={styles.hint}>C'est ce que le vendeur tapera pour se connecter</span>
              {errLogin && <span style={{ ...styles.hint, color: "#ef4444" }}>{errLogin}</span>}
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Mot de passe</label>
              <input style={styles.input} placeholder="ex: 5678" value={pass} onChange={e => setPass(e.target.value)} />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Entrepôt assigné</label>
              <select style={styles.input} value={entrepotId} onChange={e => setEntrepotId(e.target.value)}>
                {entrepots.map(e => <option key={e.id} value={e.id}>{e.nom}</option>)}
              </select>
            </div>
          </div>
          {nom && loginId && pass && (
            <div style={{ background: "#0f2a1a", border: "1px solid #22c55e", borderRadius: 8, padding: "10px 14px", marginBottom: 12, fontSize: 12 }}>
              <div style={{ color: "#22c55e", fontWeight: 800, marginBottom: 4 }}>📋 Récapitulatif des identifiants :</div>
              <div style={{ color: "#f1f5f9" }}>Identifiant : <strong style={{ color: "#f59e0b" }}>{loginId}</strong></div>
              <div style={{ color: "#f1f5f9" }}>Mot de passe : <strong style={{ color: "#f59e0b" }}>{pass}</strong></div>
              <div style={{ color: "#64748b", marginTop: 4, fontSize: 11 }}>⚠️ Notez ces informations avant de créer le compte</div>
            </div>
          )}
          <button style={{ ...styles.btnPrimary, opacity: (!nom || !loginId || !pass || !entrepotId) ? 0.5 : 1 }}
            onClick={submit} disabled={!nom || !loginId || !pass || !entrepotId}>
            ✅ Créer le compte
          </button>
        </div>
      )}
      <div style={styles.entrepotGrid}>
        {comptes.filter(c => c.role === "vendeur").map(v => {
          const mes = ventes.filter(x => x.vendeurId === v.id && x.date === today());
          const ca = mes.reduce((s, x) => s + x.total, 0);
          const entrepot = entrepots.find(e => e.id === v.entrepot);
          return (
            <div key={v.id} style={styles.vendeurCard}>
              <div style={styles.vendeurAvatar}>{v.nom[0]}</div>
              <div style={styles.vendeurNom}>{v.nom}</div>
              <div style={styles.vendeurEntrepot}>{entrepot?.nom ?? "—"}</div>
              <div style={{ fontSize: 11, background: "#1a2235", borderRadius: 6, padding: "4px 10px", marginBottom: 8, color: "#f59e0b", fontWeight: 700 }}>
                🔑 Login : {v.id}
              </div>
              <div style={styles.vendeurCA}>{fmt(ca)}</div>
              <div style={styles.vendeurVentes}>{mes.length} vente(s) aujourd'hui</div>
              <div style={{ marginTop: 10 }}>
                {mes.slice(-3).reverse().map(x => (
                  <div key={x.id} style={styles.miniVenteRow}>
                    <span>{x.clientNom}</span>
                    <span style={{ color: "#22c55e" }}>{fmt(x.total)}</span>
                  </div>
                ))}
              </div>
              <button style={{ ...styles.btnDanger, marginTop: 12, width: "100%", fontSize: 12 }} onClick={() => setConfirm(v)}>
                🗑️ Supprimer ce compte
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── ENTREPOTS VIEW ───────────────────────────────────────────────────────────
function EntrepotsView({ entrepots, onAjouter, onSupprimer, comptes }) {
  const [nom, setNom] = useState("");
  const [confirm, setConfirm] = useState(null);

  return (
    <div>
      {confirm && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalBox}>
            <div style={styles.modalTitle}>⚠️ Confirmer la suppression</div>
            <p style={{ color: "#f1f5f9", fontSize: 14 }}>
              Supprimer l'entrepôt <strong style={{ color: "#f59e0b" }}>{confirm.nom}</strong> ? Le stock sera perdu.
            </p>
            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button style={{ ...styles.btnDanger, flex: 1 }} onClick={() => { onSupprimer(confirm.id); setConfirm(null); }}>🗑️ Supprimer</button>
              <button style={{ ...styles.btnSecondary, flex: 1 }} onClick={() => setConfirm(null)}>Annuler</button>
            </div>
          </div>
        </div>
      )}
      <div style={styles.formCard}>
        <h2 style={styles.sectionTitle}>Ajouter un entrepôt</h2>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
          <div style={{ ...styles.field, flex: 1, marginBottom: 0 }}>
            <label style={styles.label}>Nom de l'entrepôt</label>
            <input style={styles.input} placeholder="ex: Bâtiment 5" value={nom} onChange={e => setNom(e.target.value)}
              onKeyDown={e => e.key === "Enter" && nom && (onAjouter(nom), setNom(""))} />
          </div>
          <button style={{ ...styles.btnPrimary, width: "auto", padding: "10px 20px", opacity: !nom ? 0.5 : 1 }}
            onClick={() => { if (nom) { onAjouter(nom); setNom(""); } }} disabled={!nom}>
            ➕ Ajouter
          </button>
        </div>
      </div>
      <h2 style={styles.sectionTitle}>Entrepôts ({entrepots.length})</h2>
      <div style={styles.entrepotGrid}>
        {entrepots.map(e => {
          const vendeurs = comptes.filter(c => c.role === "vendeur" && c.entrepot === e.id);
          return (
            <div key={e.id} style={styles.entrepotCard}>
              <div style={styles.entrepotNom}>🏭 {e.nom}</div>
              <div style={{ fontSize: 13, color: "#f1f5f9", marginBottom: 6 }}>👥 {vendeurs.length} vendeur(s)</div>
              {vendeurs.map(v => <div key={v.id} style={{ fontSize: 12, color: "#22c55e", paddingLeft: 8 }}>• {v.nom}</div>)}
              <button style={{ ...styles.btnDanger, marginTop: 12, width: "100%", fontSize: 12 }} onClick={() => setConfirm(e)}>
                🗑️ Supprimer
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── STAT CARD ────────────────────────────────────────────────────────────────
function StatCard({ label, val, icon, color }) {
  return (
    <div style={styles.statCard}>
      <div style={styles.statIcon}>{icon}</div>
      <div style={{ ...styles.statVal, color: color || "#f1f5f9" }}>{val}</div>
      <div style={styles.statLabel}>{label}</div>
    </div>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const C = { bg: "#0a0f1a", surface: "#111827", card: "#1a2235", border: "#1e2d45", accent: "#f59e0b", text: "#f1f5f9", muted: "#64748b", green: "#22c55e", red: "#ef4444" };

const styles = {
  app: { minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'IBM Plex Mono', 'Courier New', monospace" },
  notif: { position: "fixed", top: 20, right: 20, zIndex: 9999, padding: "12px 20px", borderRadius: 10, color: "#fff", fontWeight: 700, boxShadow: "0 4px 20px rgba(0,0,0,0.4)", fontSize: 14 },
  loginWrap: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: `radial-gradient(ellipse at 60% 40%, #1a2a1a 0%, #0a0f1a 70%)` },
  loginCard: { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: "48px 40px", width: 380, boxShadow: "0 24px 60px rgba(0,0,0,0.6)" },
  logo: { display: "flex", alignItems: "center", gap: 10, marginBottom: 4 },
  logoIcon: { fontSize: 28, filter: "drop-shadow(0 0 10px #f59e0b)" },
  logoText: { fontSize: 20, fontWeight: 800, letterSpacing: 3, color: C.accent },
  loginSub: { color: C.muted, fontSize: 13, marginBottom: 28, marginTop: 4 },
  field: { marginBottom: 16 },
  label: { display: "block", fontSize: 12, color: C.muted, marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 },
  input: { width: "100%", background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 14px", color: C.text, fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "inherit" },
  errMsg: { color: C.red, fontSize: 13, marginBottom: 8 },
  btnPrimary: { width: "100%", background: C.accent, color: "#0a0f1a", border: "none", borderRadius: 8, padding: "12px 20px", fontWeight: 800, fontSize: 15, cursor: "pointer", letterSpacing: 1, transition: "opacity .2s", fontFamily: "inherit" },
  btnDanger: { background: "#ef4444", color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" },
  btnSecondary: { background: C.card, color: C.text, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 16px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" },
  btnAdd: { background: C.card, color: C.accent, border: `1px solid ${C.accent}`, borderRadius: 8, padding: "8px 16px", fontWeight: 700, cursor: "pointer", fontSize: 13, fontFamily: "inherit" },
  loginHint: { marginTop: 24, padding: "12px 16px", background: C.card, borderRadius: 8, fontSize: 12, color: C.muted, textAlign: "center", lineHeight: 2 },
  layout: { display: "flex", minHeight: "100vh" },
  sidebar: { width: 220, background: C.surface, borderRight: `1px solid ${C.border}`, display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 20, flexShrink: 0, position: "sticky", top: 0, height: "100vh", overflowY: "auto" },
  sideTop: { display: "flex", flexDirection: "column", gap: 20 },
  sideLogoWrap: { display: "flex", alignItems: "center", gap: 8 },
  sideLogoIcon: { fontSize: 20 },
  sideLogoTitle: { fontSize: 11, fontWeight: 800, letterSpacing: 2, color: C.accent },
  sideEntrepot: { fontSize: 10, color: C.muted, marginTop: 2 },
  sideUser: { display: "flex", alignItems: "center", gap: 10, background: C.card, borderRadius: 10, padding: "10px 12px" },
  avatar: { width: 34, height: 34, borderRadius: "50%", background: C.accent, color: "#0a0f1a", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 16, flexShrink: 0 },
  userName: { fontSize: 13, fontWeight: 700 },
  userRole: { fontSize: 11, color: C.muted },
  navBtn: { display: "flex", alignItems: "center", gap: 8, width: "100%", background: "none", border: "none", color: C.muted, padding: "9px 12px", borderRadius: 8, cursor: "pointer", fontSize: 13, textAlign: "left", transition: "all .15s", fontFamily: "inherit" },
  navBtnActive: { background: C.card, color: C.text, borderLeft: `2px solid ${C.accent}` },
  logoutBtn: { background: "none", border: `1px solid ${C.border}`, color: C.muted, borderRadius: 8, padding: "8px 12px", cursor: "pointer", fontSize: 12, fontFamily: "inherit", width: "100%" },
  resetBtn: { background: "none", border: `1px solid #ef4444`, color: "#ef4444", borderRadius: 8, padding: "8px 12px", cursor: "pointer", fontSize: 12, fontFamily: "inherit", width: "100%" },
  alertBadge: { background: "#ef4444", color: "#fff", borderRadius: 10, fontSize: 10, fontWeight: 800, padding: "1px 6px", minWidth: 18, textAlign: "center" },
  alertBanniere: { background: "#0f1c2e", border: "1px solid #1e3a5f", borderRadius: 12, padding: "14px 18px", marginBottom: 20 },
  alertBanniereHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  alertBanniereTitle: { fontSize: 13, fontWeight: 800, color: "#f59e0b" },
  alertBanniereHint: { fontWeight: 400, color: "#64748b", fontSize: 12 },
  alertFermer: { background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 16, fontFamily: "inherit" },
  alertGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 8 },
  alertItem: { border: "1px solid", borderRadius: 8, padding: "8px 12px", display: "flex", flexDirection: "column", gap: 2 },
  alertNiveau: { fontSize: 10, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase" },
  alertProd: { fontSize: 12, fontWeight: 700, color: "#f1f5f9" },
  alertEntrepot: { fontSize: 11, color: "#64748b" },
  alertQte: { fontSize: 13, fontWeight: 800, marginTop: 2 },
  alertItemInline: { border: "1px solid", borderRadius: 8, padding: "8px 12px", fontSize: 12, fontWeight: 700, color: "#f1f5f9", marginBottom: 12 },
  main: { flex: 1, padding: 28, overflowY: "auto" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28, flexWrap: "wrap", gap: 12 },
  headerTitle: { fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: 1 },
  headerRight: { display: "flex", alignItems: "center", gap: 16 },
  caCard: { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "8px 16px", textAlign: "right" },
  caLabel: { display: "block", fontSize: 10, color: C.muted, letterSpacing: 1 },
  caVal: { fontSize: 16, fontWeight: 800, color: C.green },
  clock: { fontSize: 18, fontWeight: 800, color: C.accent, fontVariantNumeric: "tabular-nums" },
  statRow: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 16, marginBottom: 28 },
  statCard: { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "20px 18px" },
  statIcon: { fontSize: 22, marginBottom: 8 },
  statVal: { fontSize: 20, fontWeight: 800, marginBottom: 4 },
  statLabel: { fontSize: 12, color: C.muted },
  formWrap: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, alignItems: "start" },
  formCard: { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 24, marginBottom: 24 },
  formGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 },
  sectionTitle: { fontSize: 15, fontWeight: 700, marginBottom: 16, color: C.accent, letterSpacing: 1, marginTop: 0 },
  hint: { fontSize: 11, color: C.muted, marginTop: 4, display: "block" },
  totalBox: { background: C.card, borderRadius: 10, padding: "14px 18px", margin: "12px 0", borderLeft: `3px solid ${C.accent}` },
  totalRow: { display: "flex", justifyContent: "space-between", fontSize: 13, padding: "4px 0", color: C.muted },
  totalFinal: { fontSize: 16, color: C.text, fontWeight: 800, marginTop: 6, paddingTop: 8, borderTop: `1px solid ${C.border}` },
  prodGrid: { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 },
  prodCard: { background: C.surface, border: `2px solid`, borderRadius: 12, padding: "14px 12px", cursor: "pointer", textAlign: "center", transition: "transform .15s", fontFamily: "inherit" },
  prodEmoji: { fontSize: 26, marginBottom: 4 },
  prodNom: { fontSize: 12, fontWeight: 700, marginBottom: 4 },
  prodPrix: { fontSize: 13, fontWeight: 800, marginBottom: 2 },
  prodStock: { fontSize: 11, color: C.muted },
  stockTable: { overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse", background: C.surface, borderRadius: 12, overflow: "hidden" },
  th: { background: C.card, padding: "10px 14px", fontSize: 11, color: C.muted, textAlign: "left", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" },
  tr: { borderBottom: `1px solid ${C.border}` },
  td: { padding: "10px 14px", fontSize: 13 },
  badge: { display: "inline-block", padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, color: "#fff" },
  filtreRow: { display: "flex", gap: 8, marginBottom: 16 },
  filtreBtn: { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "6px 16px", color: C.muted, cursor: "pointer", fontSize: 12, fontFamily: "inherit" },
  filtreBtnActive: { background: C.accent, color: "#0a0f1a", borderColor: C.accent, fontWeight: 700 },
  empty: { color: C.muted, textAlign: "center", padding: 40, fontSize: 14 },
  entrepotGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20, marginBottom: 24 },
  entrepotCard: { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 },
  entrepotNom: { fontSize: 14, fontWeight: 800, marginBottom: 4 },
  entrepotTotal: { fontSize: 24, fontWeight: 800, color: C.accent, marginBottom: 4 },
  ruptureTag: { fontSize: 11, color: C.red, marginBottom: 8 },
  miniStockRow: { display: "flex", justifyContent: "space-between", fontSize: 12, padding: "3px 0", borderBottom: `1px solid ${C.border}` },
  entrepotLabel: { fontSize: 14, fontWeight: 700, color: C.accent, margin: "16px 0 8px" },
  vendeurCard: { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20, textAlign: "center" },
  vendeurAvatar: { width: 48, height: 48, borderRadius: "50%", background: C.accent, color: "#0a0f1a", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 22, margin: "0 auto 10px" },
  vendeurNom: { fontSize: 16, fontWeight: 800 },
  vendeurEntrepot: { fontSize: 12, color: C.muted, marginBottom: 4 },
  vendeurCA: { fontSize: 20, fontWeight: 800, color: C.green, marginBottom: 2 },
  vendeurVentes: { fontSize: 12, color: C.muted, marginBottom: 8 },
  miniVenteRow: { display: "flex", justifyContent: "space-between", fontSize: 11, padding: "3px 0", borderBottom: `1px solid ${C.border}` },
  modalOverlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" },
  modalBox: { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 28, width: 360, boxShadow: "0 20px 60px rgba(0,0,0,0.6)" },
  modalTitle: { fontSize: 16, fontWeight: 800, color: C.accent, marginBottom: 12 },
};

const css = `
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;700;800&display=swap');
  * { box-sizing: border-box; }
  body { margin: 0; }
  select option { background: #1a2235; color: #f1f5f9; }
  button:hover { filter: brightness(1.1); }
  input:focus, select:focus { outline: 1px solid #f59e0b; border-color: #f59e0b; }
  ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-track { background: #0a0f1a; } ::-webkit-scrollbar-thumb { background: #1e2d45; border-radius: 3px; }
`;