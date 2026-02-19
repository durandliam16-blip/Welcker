// =============================================================================
// CONFIG SUPABASE — même URL/clé que dans login.html
// =============================================================================
const SUPABASE_URL      = 'https://qktbcgumyqjgbvcpynjo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFrdGJjZ3VteXFqZ2J2Y3B5bmpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4MDQ0MDYsImV4cCI6MjA4NjM4MDQwNn0.Bjv4bb2gnXKG8-UY4oSUQrjaJIzNWEG_zM8_XTQbwsY'; // ← Remplacez par votre clé eyJ...

const { createClient } = window.supabase;
const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// =============================================================================
// SÉCURITÉ — redirige uniquement sur déconnexion explicite
// (pas au chargement initial pour éviter la boucle login ↔ index)
// =============================================================================
sb.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT') {
        window.location.replace('login.html');
    }
});

// Déconnexion
async function handleLogout() {
    await sb.auth.signOut();
}

// Helper : récupère l'utilisateur courant
async function getUser() {
    const { data: { user } } = await sb.auth.getUser();
    return user;
}

// =============================================================================
// DATA MANAGER — 100% aligné sur le schéma Supabase réel
// =============================================================================
class DataManager {

    // ── Profil (table: profiles) ──────────────────────────────────────────────
    // Colonnes: id, nom, email, telephone, updated_at
    async getProfile() {
        const user = await getUser(); if (!user) return {};
        const { data, error } = await sb.from('profiles').select('*').eq('id', user.id).single();
        if (error && error.code !== 'PGRST116') { console.error('getProfile:', error.message); return {}; }
        return data || {};
    }

    async updateProfile(profileData) {
        const user = await getUser(); if (!user) return;
        const { error } = await sb.from('profiles').upsert({
            id:         user.id,
            nom:        profileData.nom        || null,
            email:      profileData.email      || null,
            telephone:  profileData.telephone  || null,
            avatar_url: profileData.avatar_url || null,
            updated_at: new Date().toISOString()
        });
        if (error) { console.error('updateProfile:', error.message); showToast('Erreur profil : ' + error.message, 'error'); }
        else showToast('Profil enregistré !', 'success');
    }

    // ── Investissements CTO/PEA ───────────────────────────────────────────────
    // Colonnes: id, user_id, type(boolean), titre, libelle, quantite,
    //           prix_unitaire, frais, date
    async getInvestments(mode) {
        const user = await getUser(); if (!user) return [];
        const table = mode === 'CTO' ? 'investment_transactions_cto' : 'investment_transactions_pea';
        const { data, error } = await sb.from(table).select('*')
            .eq('user_id', user.id).order('date', { ascending: false });
        if (error) { console.error(`getInvestments(${mode}):`, error.message); return []; }
        return data || [];
    }

    async addInvestment(mode, transaction) {
        const user = await getUser(); if (!user) return null;
        const table = mode === 'CTO' ? 'investment_transactions_cto' : 'investment_transactions_pea';
        // Seules les colonnes existantes dans le schéma
        const payload = {
            user_id:       user.id,
            type:          Boolean(transaction.type),   // boolean NOT NULL
            titre:         transaction.titre,
            libelle:       transaction.libelle || null,
            quantite:      parseFloat(transaction.quantite),
            prix_unitaire: parseFloat(transaction.prix_unitaire),
            frais:         parseFloat(transaction.frais) || 0,
            date:          transaction.date
        };
        const { data, error } = await sb.from(table).insert([payload]).select();
        if (error) { console.error(`addInvestment(${mode}):`, error.message); showToast('Erreur : ' + error.message, 'error'); return null; }
        showToast('Transaction ajoutée !', 'success');
        return data;
    }

    async deleteInvestment(mode, id) {
        const user = await getUser(); if (!user) return false;
        const table = mode === 'CTO' ? 'investment_transactions_cto' : 'investment_transactions_pea';
        const { error } = await sb.from(table).delete().eq('id', id).eq('user_id', user.id);
        if (error) { console.error(`deleteInvestment(${mode}):`, error.message); showToast('Erreur suppression : ' + error.message, 'error'); return false; }
        showToast('Transaction supprimée', 'success');
        return true;
    }

    // ── Cash-Flow (tables: cash_flow_entrees / cash_flow_sorties) ─────────────
    // Colonnes: id, user_id, categorie, description, montant, date
    async getCashFlow(type) {
        const user = await getUser(); if (!user) return [];
        const table = type === 'entree' ? 'cash_flow_entrees' : 'cash_flow_sorties';
        const { data, error } = await sb.from(table).select('*')
            .eq('user_id', user.id).order('date', { ascending: false });
        if (error) { console.error(`getCashFlow(${type}):`, error.message); return []; }
        return data || [];
    }

    async addCashFlow(type, item) {
        const user = await getUser(); if (!user) return false;
        const table = type === 'entree' ? 'cash_flow_entrees' : 'cash_flow_sorties';
        const payload = {
            user_id:     user.id,
            categorie:   item.categorie,                // NOT NULL
            description: item.description || null,
            montant:     parseFloat(item.montant),      // NOT NULL
            date:        item.date
        };
        const { error } = await sb.from(table).insert([payload]);
        if (error) { console.error(`addCashFlow(${type}):`, error.message); showToast('Erreur : ' + error.message, 'error'); return false; }
        showToast(type === 'entree' ? 'Entrée ajoutée !' : 'Dépense ajoutée !', 'success');
        return true;
    }

    async deleteCashFlow(type, id) {
        const user = await getUser(); if (!user) return false;
        const table = type === 'entree' ? 'cash_flow_entrees' : 'cash_flow_sorties';
        const { error } = await sb.from(table).delete().eq('id', id).eq('user_id', user.id);
        if (error) { console.error(`deleteCashFlow(${type}):`, error.message); showToast('Erreur suppression : ' + error.message, 'error'); return false; }
        showToast('Supprimé', 'success');
        return true;
    }

    // ── Comptes bancaires (table: accounts) ───────────────────────────────────
    // Colonnes: id, user_id, num_compte, nom(NOT NULL), type, fournisseur,
    //           solde, date_now(NOT NULL), created_at
    // Les "autres biens" (immobilier, véhicule…) sont stockés dans cette même
    // table avec leur type dédié — pas de table 'biens' distincte.
    async getAccounts() {
        const user = await getUser(); if (!user) return [];
        const { data, error } = await sb.from('accounts').select('*')
            .eq('user_id', user.id).order('nom', { ascending: true });
        if (error) { console.error('getAccounts:', error.message); return []; }
        return data || [];
    }

    // Comptes bancaires classiques (type != biens)
    async getBankAccounts() {
        const all = await this.getAccounts();
        return all.filter(a => !['immobilier','vehicule','objet-valeur'].includes(a.type));
    }

    // "Autres biens" = entrées de accounts avec un type physique
    async getBiens() {
        const all = await this.getAccounts();
        return all.filter(a => ['immobilier','vehicule','objet-valeur'].includes(a.type));
    }

    async addAccount(account) {
        const user = await getUser(); if (!user) return false;
        const payload = {
            user_id:    user.id,
            nom:        account.nom,                          // NOT NULL
            type:       account.type        || null,
            fournisseur:account.fournisseur || null,
            solde:      parseFloat(account.solde) || 0,
            date_now:   new Date().toISOString()              // NOT NULL — obligatoire !
        };
        const { error } = await sb.from('accounts').insert([payload]);
        if (error) { console.error('addAccount:', error.message); showToast('Erreur : ' + error.message, 'error'); return false; }
        showToast('Compte ajouté !', 'success');
        return true;
    }

    // Ajouter un bien → même table accounts, type = immobilier/vehicule/objet-valeur
    async addBien(bien) {
        return this.addAccount({
            nom:        bien.nom,
            type:       bien.type,      // 'immobilier' | 'vehicule' | 'objet-valeur'
            solde:      bien.valeur,    // la valeur du bien est stockée dans solde
            fournisseur: bien.notes || null
        });
    }

    async deleteAccount(id) {
        const user = await getUser(); if (!user) return false;
        const { error } = await sb.from('accounts').delete().eq('id', id).eq('user_id', user.id);
        if (error) { console.error('deleteAccount:', error.message); showToast('Erreur suppression : ' + error.message, 'error'); return false; }
        showToast('Supprimé', 'success');
        return true;
    }

    // deleteBien = deleteAccount (même table)
    async deleteBien(id) { return this.deleteAccount(id); }

    // ── Paramètres (localStorage uniquement, pas de table dédiée) ────────────
    getSettings() { return JSON.parse(localStorage.getItem('welcker_settings') || '{"theme":"light","devise":"EUR"}'); }
    saveSettings(s) { localStorage.setItem('welcker_settings', JSON.stringify(s)); }
}

const dataManager = new DataManager();

// =============================================================================
// TOAST (notifications)
// =============================================================================
function showToast(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:9999;display:flex;flex-direction:column;gap:8px;';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    const colors = { success: '#10b981', error: '#ef4444', info: '#2563eb' };
    toast.style.cssText = `background:${colors[type]||colors.info};color:#fff;padding:12px 20px;border-radius:10px;font-size:14px;font-family:Inter,sans-serif;font-weight:500;box-shadow:0 4px 12px rgba(0,0,0,0.2);opacity:0;transform:translateY(10px);transition:all 0.3s;min-width:220px;`;
    toast.textContent = message;
    container.appendChild(toast);
    requestAnimationFrame(() => { toast.style.opacity = '1'; toast.style.transform = 'translateY(0)'; });
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// =============================================================================
// NAVIGATION
// =============================================================================
async function navigateTo(page) {
    document.querySelectorAll('.nav-link').forEach(l => l.classList.toggle('active', l.dataset.page === page));
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const el = document.getElementById(`page-${page}`);
    if (el) { el.classList.add('active'); await updatePageContent(page); }
}

// =============================================================================
// MODALS
// =============================================================================
function openModal(modalId, param) {
    const m = document.getElementById(modalId); if (!m) return;
    m.classList.add('active');
    if (modalId === 'modalAddTransaction' && param)
        document.getElementById('transactionCompte').value = param;
}
function closeModal(modalId) {
    const m = document.getElementById(modalId); if (!m) return;
    m.classList.remove('active');
    m.querySelector('form')?.reset();
}
document.querySelectorAll('.modal').forEach(m => {
    m.addEventListener('click', e => { if (e.target === m) closeModal(m.id); });
});

// =============================================================================
// UTILITAIRES
// =============================================================================
function fmt(amount) {
    const v = parseFloat(amount);
    return isNaN(v) ? '0,00 €' : new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(v);
}

function calcStats(transactions) {
    let invested = 0;
    (transactions || []).forEach(t => {
        const total = parseFloat(t.quantite || 0) * parseFloat(t.prix_unitaire || 0);
        const frais = parseFloat(t.frais || 0);
        invested += (t.type === true || t.type === 'achat') ? (total + frais) : -(total - frais);
    });
    return { current: Math.max(0, invested) };
}

function destroyChart(ctxId) {
    const ctx = document.getElementById(ctxId);
    if (ctx && Chart.getChart(ctx)) Chart.getChart(ctx).destroy();
    return ctx;
}

// =============================================================================
// ROUTING
// =============================================================================
async function updatePageContent(page) {
    switch (page) {
        case 'accueil':      await updateAccueil();              break;
        case 'bilan':        await updateBilan();                break;
        case 'comptes':      await updateComptes();              break;
        case 'cto':          await updateInvestmentPage('CTO');  break;
        case 'pea':          await updateInvestmentPage('PEA');  break;
        case 'autres-biens': await updateAutresBiens();          break;
        case 'flux':         await updateFlux();                 break;
        case 'entrees':      await updateCashFlowPage('entree'); break;
        case 'depenses':     await updateCashFlowPage('sortie'); break;
        case 'profil':       await updateProfil();               break;
        case 'parametres':   updateParametres();                 break;
    }
}

// =============================================================================
// PAGE ACCUEIL
// =============================================================================
async function updateAccueil() {
    const [accounts, ctoT, peaT, entrees, sorties, biens] = await Promise.all([
        dataManager.getBankAccounts(),       // liquidités = comptes bancaires uniquement
        dataManager.getInvestments('CTO'),
        dataManager.getInvestments('PEA'),
        dataManager.getCashFlow('entree'),
        dataManager.getCashFlow('sortie'),
        dataManager.getBiens()               // biens = accounts de type physique
    ]);
    const ctoVal   = calcStats(ctoT).current;
    const peaVal   = calcStats(peaT).current;
    const accTotal = accounts.reduce((s, a) => s + parseFloat(a.solde || 0), 0);
    const biensVal = biens.reduce((s, b) => s + parseFloat(b.solde || 0), 0); // solde = valeur du bien
    const invTotal = ctoVal + peaVal;

    document.getElementById('patrimoineTotal').textContent      = fmt(accTotal + invTotal + biensVal);
    document.getElementById('liquiditesTotal').textContent      = fmt(accTotal);
    document.getElementById('investissementsTotal').textContent = fmt(invTotal);

    const recent = [...entrees, ...sorties].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
    const cont = document.getElementById('dernieresTransactions');
    cont.innerHTML = recent.length
        ? recent.map(t => `<div class="transaction-item">
            <div><strong>${t.description || 'Transaction'}</strong>
            <div style="font-size:12px;color:var(--text-secondary)">${new Date(t.date).toLocaleDateString('fr-FR')}</div></div>
            <div style="font-weight:600">${fmt(t.montant)}</div></div>`).join('')
        : '<p class="empty-state">Aucune transaction</p>';

    // Graphiques
    const ctx1 = destroyChart('patrimoineChart');
    if (ctx1) new Chart(ctx1, { type: 'doughnut',
        data: { labels: ['Liquidités','Investissements','Biens'],
                datasets: [{ data: [accTotal, invTotal, biensVal], backgroundColor: ['#10b981','#2563eb','#f59e0b'] }] },
        options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
    });

    const allItems = [...entrees, ...sorties].sort((a, b) => new Date(a.date) - new Date(b.date));
    let cumul = 0;
    const evLabels = allItems.map(i => new Date(i.date).toLocaleDateString('fr-FR'));
    const evVals   = allItems.map(i => { cumul += parseFloat(i.montant || 0); return cumul; });
    const ctx2 = destroyChart('evolutionChart');
    if (ctx2) new Chart(ctx2, { type: 'line',
        data: { labels: evLabels.length ? evLabels : ['—'],
                datasets: [{ data: evVals.length ? evVals : [0], borderColor: '#2563eb', backgroundColor: 'rgba(37,99,235,0.1)', tension: 0.4, fill: true }] },
        options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
    });
}

// =============================================================================
// PAGE BILAN
// =============================================================================
async function updateBilan() {
    const [accs, cto, pea, biens] = await Promise.all([
        dataManager.getBankAccounts(), dataManager.getInvestments('CTO'),
        dataManager.getInvestments('PEA'), dataManager.getBiens()
    ]);
    const ctoVal   = calcStats(cto).current;
    const peaVal   = calcStats(pea).current;
    const accTotal = accs.reduce((s, a) => s + parseFloat(a.solde || 0), 0);
    const bTotal   = biens.reduce((s, b) => s + parseFloat(b.solde || 0), 0); // solde = valeur du bien

    document.getElementById('bilanPatrimoineTotal').textContent = fmt(accTotal + ctoVal + peaVal + bTotal);
    document.getElementById('bilanComptes').innerHTML = `
        <div class="stat-item"><span>CTO</span><span>${fmt(ctoVal)}</span></div>
        <div class="stat-item"><span>PEA</span><span>${fmt(peaVal)}</span></div>
        ${accs.map(a => `<div class="stat-item"><span>${a.nom}</span><span>${fmt(a.solde)}</span></div>`).join('')}`;
    document.getElementById('bilanInvestissements').innerHTML = `
        <div class="stat-item"><span>Total investissements</span><span>${fmt(ctoVal + peaVal)}</span></div>`;
    document.getElementById('bilanAutresBiens').innerHTML = `
        <div class="stat-item"><span>Total autres biens</span><span>${fmt(bTotal)}</span></div>
        ${biens.slice(0, 3).map(b => `<div class="stat-item"><span>${b.nom}</span><span>${fmt(b.solde)}</span></div>`).join('')}`;
}

// =============================================================================
// PAGE COMPTES
// =============================================================================
async function updateComptes() {
    const [accs, cto, pea] = await Promise.all([
        dataManager.getBankAccounts(),       // exclut les biens physiques
        dataManager.getInvestments('CTO'),
        dataManager.getInvestments('PEA')
    ]);
    document.getElementById('ctoAmount').textContent = fmt(calcStats(cto).current);
    document.getElementById('peaAmount').textContent = fmt(calcStats(pea).current);
    document.getElementById('ctoEvolution').innerHTML = '<span>+0%</span>';
    document.getElementById('peaEvolution').innerHTML = '<span>+0%</span>';
    document.getElementById('autresComptesContainer').innerHTML = accs.length
        ? accs.map(a => `
            <div class="card compte-card">
                <div class="compte-header"><h3>${a.nom}</h3><span class="compte-type">${a.type || 'compte'}</span></div>
                <div class="compte-amount">${fmt(a.solde)}</div>
                <button class="btn-danger" style="margin-top:12px;width:100%;font-size:12px;padding:6px" onclick="window._deleteAccount('${a.id}')">Supprimer</button>
            </div>`).join('')
        : '<p class="empty-state">Aucun compte bancaire</p>';
}

// =============================================================================
// PAGE CTO / PEA
// =============================================================================
async function updateInvestmentPage(mode) {
    const pfx  = mode.toLowerCase();
    const data = await dataManager.getInvestments(mode);
    const stats = calcStats(data);
    document.getElementById(`${pfx}ValeurActuelle`).textContent = fmt(stats.current);
    document.getElementById(`${pfx}Performance`).textContent   = '+0,00%';
    document.getElementById(`${pfx}PlusMoinsValue`).textContent = fmt(0);
    renderInvestTable(pfx, data, mode);
    renderInvestChart(pfx, data);
}

function renderInvestTable(pfx, data, mode) {
    const tbody = document.getElementById(`${pfx}TransactionsTable`); if (!tbody) return;
    const fType    = document.getElementById(`${pfx}FilterType`)?.value;
    const fDebut   = document.getElementById(`${pfx}FilterDateDebut`)?.value;
    const fFin     = document.getElementById(`${pfx}FilterDateFin`)?.value;

    let rows = [...data];
    if (fType && fType !== 'all') {
        const wantAchat = fType === 'achat';
        rows = rows.filter(t => (t.type === true || t.type === 'achat') === wantAchat);
    }
    if (fDebut) rows = rows.filter(t => t.date >= fDebut);
    if (fFin)   rows = rows.filter(t => t.date <= fFin);

    if (!rows.length) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-state">Aucune transaction</td></tr>'; return;
    }
    tbody.innerHTML = rows.map(t => {
        const isAchat = t.type === true || t.type === 'achat';
        const total   = parseFloat(t.quantite || 0) * parseFloat(t.prix_unitaire || 0);
        return `<tr>
            <td>${new Date(t.date).toLocaleDateString('fr-FR')}</td>
            <td><span class="compte-type" style="background:${isAchat?'#10b981':'#ef4444'};color:#fff">${isAchat?'Achat':'Vente'}</span></td>
            <td>${t.titre || '—'}</td>
            <td>${t.quantite || 0}</td>
            <td>${fmt(t.prix_unitaire)}</td>
            <td>${fmt(total)}</td>
            <td><button class="btn-icon" onclick="window._deleteInvestment('${mode}','${t.id}')" title="Supprimer">🗑️</button></td>
        </tr>`;
    }).join('');
}

function renderInvestChart(pfx, data) {
    const ctx = destroyChart(`${pfx}EvolutionChart`); if (!ctx) return;
    const sorted = [...data].sort((a, b) => new Date(a.date) - new Date(b.date));
    let c = 0;
    const labels = sorted.map(t => new Date(t.date).toLocaleDateString('fr-FR'));
    const vals   = sorted.map(t => { c += (t.type === true || t.type === 'achat' ? 1 : -1) * parseFloat(t.quantite||0) * parseFloat(t.prix_unitaire||0); return Math.max(0,c); });
    if (!labels.length) { labels.push('—'); vals.push(0); }
    new Chart(ctx, { type: 'line',
        data: { labels, datasets: [{ data: vals, borderColor: '#2563eb', backgroundColor: 'rgba(37,99,235,0.1)', tension: 0.4, fill: true }] },
        options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
    });
}

// =============================================================================
// PAGE AUTRES BIENS
// =============================================================================
async function updateAutresBiens() {
    const biens = await dataManager.getBiens();
    const cont  = document.getElementById('biensContainer');
    if (!biens.length) { cont.innerHTML = '<div class="card"><p class="empty-state">Aucun bien enregistré</p></div>'; return; }
    cont.innerHTML = biens.map(b => `
        <div class="card bien-card">
            <span class="bien-type">${b.type || 'bien'}</span>
            <h3>${b.nom}</h3>
            <div class="bien-value">${fmt(b.solde)}</div>
            ${b.fournisseur ? `<p style="margin-top:8px;color:var(--text-secondary);font-size:14px">${b.fournisseur}</p>` : ''}
            <button class="btn-danger" style="margin-top:16px;width:100%" onclick="window._deleteBien('${b.id}')">Supprimer</button>
        </div>`).join('');
}

// =============================================================================
// PAGE FLUX
// =============================================================================
async function updateFlux() {
    const [e, s] = await Promise.all([dataManager.getCashFlow('entree'), dataManager.getCashFlow('sortie')]);
    const tE = e.reduce((sum, i) => sum + parseFloat(i.montant || 0), 0);
    const tS = s.reduce((sum, i) => sum + parseFloat(i.montant || 0), 0);
    document.getElementById('entreesTotales').textContent = fmt(tE);
    document.getElementById('sortiesTotales').textContent = fmt(tS);
    const soldeEl = document.getElementById('soldeFlux');
    soldeEl.textContent = fmt(tE - tS);
    soldeEl.className   = `flux-value ${(tE-tS) >= 0 ? 'positive' : 'negative'}`;

    // Graphique barres 6 derniers mois
    const months  = ['Jan','Fév','Mar','Avr','Mai','Juin','Juil','Aoû','Sep','Oct','Nov','Déc'];
    const now     = new Date();
    const labels  = Array.from({length:6},(_,i) => months[new Date(now.getFullYear(), now.getMonth()-5+i, 1).getMonth()]);
    const sumByOffset = (items, offset) => {
        const d = new Date(now.getFullYear(), now.getMonth()-5+offset, 1);
        return items.filter(i => { const id = new Date(i.date); return id.getMonth()===d.getMonth()&&id.getFullYear()===d.getFullYear(); })
                    .reduce((sum, i) => sum + parseFloat(i.montant||0), 0);
    };
    const ctx1 = destroyChart('fluxChart');
    if (ctx1) new Chart(ctx1, { type: 'bar',
        data: { labels, datasets: [
            { label:'Entrées', data: Array.from({length:6},(_,i)=>sumByOffset(e,i)), backgroundColor:'#10b981' },
            { label:'Sorties', data: Array.from({length:6},(_,i)=>sumByOffset(s,i)), backgroundColor:'#ef4444' }
        ]}, options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
    });
}

// =============================================================================
// PAGE CASH-FLOW (entrées / dépenses)
// =============================================================================
async function updateCashFlowPage(type) {
    const isE  = type === 'entree';
    const data = await dataManager.getCashFlow(type);
    const tbody = document.getElementById(isE ? 'entreesTable' : 'depensesTable'); if (!tbody) return;

    const fCat    = document.getElementById(isE ? 'entreesFilterCategorie' : 'depensesFilterCategorie')?.value;
    const fPer    = document.getElementById(isE ? 'entreesFilterPeriode'   : 'depensesFilterPeriode')?.value;
    const now     = new Date();
    let rows = [...data];
    if (fCat && fCat !== 'all') rows = rows.filter(i => i.categorie === fCat);
    if (fPer === 'mois')  rows = rows.filter(i => { const d=new Date(i.date); return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear(); });
    if (fPer === 'annee') rows = rows.filter(i => new Date(i.date).getFullYear()===now.getFullYear());

    tbody.innerHTML = rows.length
        ? rows.map(i => `<tr>
            <td>${new Date(i.date).toLocaleDateString('fr-FR')}</td>
            <td><span class="compte-type">${i.categorie}</span></td>
            <td>${i.description || '—'}</td>
            <td class="${isE?'positive':'negative'}">${fmt(i.montant)}</td>
            <td><button class="btn-icon" onclick="window._deleteCashFlow('${type}','${i.id}')" title="Supprimer">🗑️</button></td>
        </tr>`).join('')
        : `<tr><td colspan="5" class="empty-state">Aucune donnée</td></tr>`;

    // Graphiques
    const cats = {};
    data.forEach(i => cats[i.categorie] = (cats[i.categorie]||0) + parseFloat(i.montant||0));
    if (Object.keys(cats).length) {
        const ctx = destroyChart(isE ? 'entreesChart' : 'depensesChart');
        if (ctx) new Chart(ctx, { type: 'pie',
            data: { labels: Object.keys(cats), datasets:[{ data: Object.values(cats), backgroundColor:['#2563eb','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899'] }] },
            options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
        });
    }
    // --- GRAPHIQUE ÉVOLUTION (Ligne) - S'adapte aux Entrées et Dépenses ---
    const now2 = new Date();
    const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun'];
    
    // Les données "data" contiennent déjà les entrées ou les dépenses selon la page
    const vals = Array.from({length:6}, (_,i) => {
        const d = new Date(now2.getFullYear(), now2.getMonth()-5+i, 1);
        return data.filter(x => { 
            const id = new Date(x.date); 
            return id.getMonth() === d.getMonth() && id.getFullYear() === d.getFullYear(); 
        }).reduce((s,x) => s + parseFloat(x.montant || 0), 0);
    });

    // Définition des couleurs et de l'ID selon la page
    const chartId = isE ? 'entreesEvolutionChart' : 'depensesEvolutionChart';
    const borderColor = isE ? '#10b981' : '#ef4444'; // Vert pour Entrées, Rouge pour Dépenses
    const bgColor = isE ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)';

    const ctxEvo = destroyChart(chartId);
    if (ctxEvo) {
        new Chart(ctxEvo, { 
            type: 'line',
            data: { 
                labels: months, 
                datasets: [{ 
                    data: vals, 
                    borderColor: borderColor, 
                    backgroundColor: bgColor, 
                    tension: 0.4, 
                    fill: true 
                }] 
            },
            options: { responsive: true, plugins: { legend: { display: false } } }
        });
    }
} // <-- Fin de la fonction updateCashFlowPage

// =============================================================================
// PAGE PROFIL & PARAMÈTRES
// =============================================================================
let currentAvatarData = null; // Stocke temporairement l'avatar sélectionné

async function updateProfil() {
    const p = await dataManager.getProfile();
    document.getElementById('profilNom').value   = p.nom       || '';
    document.getElementById('profilEmail').value = p.email     || '';
    document.getElementById('profilTel').value   = p.telephone || '';
    
    // Charger l'avatar
    if (p.avatar_url) {
        displayAvatar(p.avatar_url);
    } else {
        // Afficher placeholder par défaut
        document.getElementById('profilAvatarImg').style.display = 'none';
        document.getElementById('profilAvatarPlaceholder').style.display = 'flex';
    }
}

function displayAvatar(url) {
    const img = document.getElementById('profilAvatarImg');
    const placeholder = document.getElementById('profilAvatarPlaceholder');
    
    img.src = url;
    img.style.display = 'block';
    placeholder.style.display = 'none';
}

// Sélection d'un avatar prédéfini
function selectPresetAvatar(avatarId) {
    // Avatars encodés en data URL (petits gradients + emoji)
    const presets = {
        '1': 'data:image/svg+xml;base64,' + btoa(`
            <svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
                        <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
                    </linearGradient>
                </defs>
                <circle cx="100" cy="100" r="100" fill="url(#grad1)" />
                <text x="100" y="130" font-size="80" text-anchor="middle" fill="white">💼</text>
            </svg>
        `),
        '2': 'data:image/svg+xml;base64,' + btoa(`
            <svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <linearGradient id="grad2" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style="stop-color:#f093fb;stop-opacity:1" />
                        <stop offset="100%" style="stop-color:#f5576c;stop-opacity:1" />
                    </linearGradient>
                </defs>
                <circle cx="100" cy="100" r="100" fill="url(#grad2)" />
                <text x="100" y="130" font-size="80" text-anchor="middle" fill="white">🚀</text>
            </svg>
        `),
        '3': 'data:image/svg+xml;base64,' + btoa(`
            <svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <linearGradient id="grad3" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style="stop-color:#4facfe;stop-opacity:1" />
                        <stop offset="100%" style="stop-color:#00f2fe;stop-opacity:1" />
                    </linearGradient>
                </defs>
                <circle cx="100" cy="100" r="100" fill="url(#grad3)" />
                <text x="100" y="130" font-size="80" text-anchor="middle" fill="white">🌟</text>
            </svg>
        `),
        '4': 'data:image/svg+xml;base64,' + btoa(`
            <svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <linearGradient id="grad4" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style="stop-color:#43e97b;stop-opacity:1" />
                        <stop offset="100%" style="stop-color:#38f9d7;stop-opacity:1" />
                    </linearGradient>
                </defs>
                <circle cx="100" cy="100" r="100" fill="url(#grad4)" />
                <text x="100" y="130" font-size="80" text-anchor="middle" fill="white">💎</text>
            </svg>
        `)
    };
    
    currentAvatarData = { type: 'preset', url: presets[avatarId] };
    displayAvatar(presets[avatarId]);
    
    // Highlight visuel
    document.querySelectorAll('.avatar-preset').forEach(el => el.classList.remove('selected'));
    document.querySelector(`.avatar-preset[data-avatar="${avatarId}"]`).classList.add('selected');
    
    showToast('Avatar sélectionné ! Cliquez sur "Enregistrer" pour sauvegarder.', 'info');
}

// Upload d'un fichier image
async function handleAvatarUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Vérifications
    if (!file.type.startsWith('image/')) {
        showToast('Veuillez sélectionner une image (PNG, JPG...)', 'error');
        return;
    }
    if (file.size > 2 * 1024 * 1024) { // 2MB max
        showToast('L\'image est trop lourde (max 2MB)', 'error');
        return;
    }
    
    showToast('Upload en cours...', 'info');
    
    try {
        const user = await getUser();
        if (!user) throw new Error('Non authentifié');
        
        // Upload vers Supabase Storage
        const fileName = `avatar_${user.id}_${Date.now()}.${file.name.split('.').pop()}`;
        const { data, error } = await sb.storage
            .from('avatars')
            .upload(fileName, file, { upsert: true });
        
        if (error) throw error;
        
        // Récupérer l'URL publique
        const { data: urlData } = sb.storage.from('avatars').getPublicUrl(fileName);
        
        currentAvatarData = { type: 'upload', url: urlData.publicUrl };
        displayAvatar(urlData.publicUrl);
        
        showToast('Photo uploadée ! Cliquez sur "Enregistrer".', 'success');
        
    } catch (err) {
        console.error('Upload avatar:', err);
        showToast('Erreur upload : ' + err.message, 'error');
    }
}

async function saveProfile() {
    const profileData = {
        nom:       document.getElementById('profilNom').value,
        email:     document.getElementById('profilEmail').value,
        telephone: document.getElementById('profilTel').value
    };
    
    // Ajouter l'avatar si un nouveau a été sélectionné
    if (currentAvatarData) {
        profileData.avatar_url = currentAvatarData.url;
    }
    
    await dataManager.updateProfile(profileData);
    
    // Réinitialiser le state temporaire
    currentAvatarData = null;
}

function updateParametres() {
    const s = dataManager.getSettings();
    document.getElementById('settingTheme').value  = s.theme  || 'light';
    document.getElementById('settingDevise').value = s.devise || 'EUR';
}

function changeTheme() {
    const theme = document.getElementById('settingTheme').value;
    document.body.setAttribute('data-theme', theme);
    dataManager.saveSettings({ ...dataManager.getSettings(), theme });
}

async function submitFeatureSuggestion() {
    const textarea = document.getElementById('featureSuggestion');
    const status = document.getElementById('suggestionStatus');
    const suggestion = textarea.value.trim();

    if (!suggestion) {
        status.textContent = '⚠️ Veuillez écrire une suggestion avant d\'envoyer.';
        status.style.color = 'var(--warning-color)';
        return;
    }

    status.textContent = '📤 Envoi en cours...';
    status.style.color = 'var(--text-secondary)';

    try {
        const user = await getUser();
        const profile = await dataManager.getProfile();

        // Enregistrement dans une table Supabase 'feature_suggestions'
        const { error } = await sb.from('feature_suggestions').insert([{
            user_id: user?.id || null,
            user_name: profile.nom || 'Anonyme',
            user_email: profile.email || null,
            suggestion: suggestion,
            created_at: new Date().toISOString()
        }]);

        if (error) {
            console.error('submitFeatureSuggestion:', error.message);
            status.textContent = '❌ Erreur lors de l\'envoi. Réessayez plus tard.';
            status.style.color = 'var(--danger-color)';
        } else {
            status.textContent = '✅ Merci ! Votre suggestion a été envoyée.';
            status.style.color = 'var(--success-color)';
            textarea.value = '';
            setTimeout(() => { status.textContent = ''; }, 5000);
        }
    } catch (err) {
        console.error('submitFeatureSuggestion catch:', err);
        status.textContent = '❌ Erreur réseau. Vérifiez votre connexion.';
        status.style.color = 'var(--danger-color)';
    }
}

// =============================================================================
// HANDLERS FORMULAIRES
// =============================================================================
async function addTransaction(e) {
    e.preventDefault();
    const mode = document.getElementById('transactionCompte').value;
    const ok = await dataManager.addInvestment(mode, {
        type:          document.getElementById('transactionType').value === 'achat',
        date:          document.getElementById('transactionDate').value,
        titre:         document.getElementById('transactionTitre').value,
        quantite:      parseFloat(document.getElementById('transactionQuantite').value),
        prix_unitaire: parseFloat(document.getElementById('transactionPrix').value),
        frais:         parseFloat(document.getElementById('transactionFrais').value) || 0
    });
    if (ok) { closeModal('modalAddTransaction'); await updateInvestmentPage(mode); }
}

async function addBienForm(e) {
    e.preventDefault();
    const ok = await dataManager.addBien({
        type:   document.getElementById('bienType').value,
        nom:    document.getElementById('bienNom').value,
        valeur: parseFloat(document.getElementById('bienValeur').value),  // → solde dans DB
        notes:  document.getElementById('bienNotes').value || null        // → fournisseur dans DB
    });
    if (ok) { closeModal('modalAddBien'); await updateAutresBiens(); }
}

async function addEntreeForm(e) {
    e.preventDefault();
    const ok = await dataManager.addCashFlow('entree', {
        date:        document.getElementById('entreeDate').value,
        categorie:   document.getElementById('entreeCategorie').value,
        description: document.getElementById('entreeDescription').value,
        montant:     parseFloat(document.getElementById('entreeMontant').value)
    });
    if (ok) { closeModal('modalAddEntree'); await updateCashFlowPage('entree'); }
}

async function addDepenseForm(e) {
    e.preventDefault();
    const ok = await dataManager.addCashFlow('sortie', {
        date:        document.getElementById('depenseDate').value,
        categorie:   document.getElementById('depenseCategorie').value,
        description: document.getElementById('depenseDescription').value,
        montant:     parseFloat(document.getElementById('depenseMontant').value)
    });
    if (ok) { closeModal('modalAddDepense'); await updateCashFlowPage('sortie'); }
}

async function addCompteForm(e) {
    e.preventDefault();
    const ok = await dataManager.addAccount({
        nom:   document.getElementById('compteNom').value,
        type:  document.getElementById('compteType').value,
        solde: parseFloat(document.getElementById('compteSolde').value)
    });
    if (ok) { closeModal('modalAddCompte'); await updateComptes(); }
}

// =============================================================================
// ACTIONS GLOBALES (onclick dans le HTML)
// =============================================================================
window._deleteInvestment = async (mode, id) => {
    if (!confirm('Supprimer cette transaction ?')) return;
    const ok = await dataManager.deleteInvestment(mode, id);
    if (ok) await updateInvestmentPage(mode);
};

window._deleteCashFlow = async (type, id) => {
    if (!confirm('Supprimer ?')) return;
    const ok = await dataManager.deleteCashFlow(type, id);
    if (ok) await updateCashFlowPage(type);
};

window._deleteBien = async (id) => {
    if (!confirm('Supprimer ce bien ?')) return;
    const ok = await dataManager.deleteBien(id);
    if (ok) await updateAutresBiens();
};

window._deleteAccount = async (id) => {
    if (!confirm('Supprimer ce compte ?')) return;
    const ok = await dataManager.deleteAccount(id);
    if (ok) await updateComptes();
};

window.filterEntrees      = () => updateCashFlowPage('entree');
window.filterDepenses     = () => updateCashFlowPage('sortie');
window.filterTransactions = async (mode) => {
    const data = await dataManager.getInvestments(mode);
    renderInvestTable(mode.toLowerCase(), data, mode);
};

// =============================================================================
// POPUPS HEADER — Profil & Notifications
// =============================================================================

function _placePopup(el, anchor) {
    const r = anchor.getBoundingClientRect();
    el.style.cssText += `position:fixed;top:${r.bottom + 8}px;right:${window.innerWidth - r.right}px;z-index:6000;`;
    document.body.appendChild(el);
}

// ── Popup Profil ──────────────────────────────────────────────────────────────
async function toggleProfilPopup() {
    document.getElementById('popupNotifs')?.remove();
    if (document.getElementById('popupProfil')) {
        document.getElementById('popupProfil').remove();
        return;
    }

    const [profile, bankAccs, cto, pea, biens] = await Promise.all([
        dataManager.getProfile(),
        dataManager.getBankAccounts(),
        dataManager.getInvestments('CTO'),
        dataManager.getInvestments('PEA'),
        dataManager.getBiens()
    ]);

    const accTotal = bankAccs.reduce((s,a) => s + parseFloat(a.solde||0), 0);
    const invTotal = calcStats(cto).current + calcStats(pea).current;
    const biensVal = biens.reduce((s,b) => s + parseFloat(b.solde||0), 0);
    const patrimoine = accTotal + invTotal + biensVal;

    const initiale = (profile.nom || 'U')[0].toUpperCase();
    
    // Avatar : afficher l'image si disponible, sinon initiale
    const avatarHTML = profile.avatar_url
        ? `<img src="${profile.avatar_url}" alt="Avatar" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`
        : initiale;
    
    const pop = document.createElement('div');
    pop.id = 'popupProfil';
    pop.className = 'header-popup';
    pop.innerHTML = `
      <div class="popup-header">
        <div class="popup-avatar">${avatarHTML}</div>
        <div>
          <div class="popup-name">${profile.nom || 'Utilisateur'}</div>
          <div class="popup-email">${profile.email || ''}</div>
        </div>
      </div>
      <div class="popup-divider"></div>
      <div class="popup-stat">
        <span class="popup-stat-label">💰 Patrimoine total</span>
        <span class="popup-stat-value">${fmt(patrimoine)}</span>
      </div>
      <div class="popup-stat">
        <span class="popup-stat-label">📞 Téléphone</span>
        <span class="popup-stat-value">${profile.telephone || '—'}</span>
      </div>
      <div class="popup-divider"></div>
      <button class="popup-action-btn" onclick="navigateTo('profil');document.getElementById('popupProfil')?.remove()">✏️ Modifier le profil</button>
      <button class="popup-action-btn popup-logout-btn" onclick="handleLogout()">🚪 Se déconnecter</button>
    `;
    _placePopup(pop, document.getElementById('userBtn'));
}

// ── Popup Notifications ───────────────────────────────────────────────────────
async function toggleNotifsPopup() {
    document.getElementById('popupProfil')?.remove();
    if (document.getElementById('popupNotifs')) {
        document.getElementById('popupNotifs').remove();
        return;
    }

    const [cto, pea, entrees, sorties] = await Promise.all([
        dataManager.getInvestments('CTO'),
        dataManager.getInvestments('PEA'),
        dataManager.getCashFlow('entree'),
        dataManager.getCashFlow('sortie')
    ]);

    const notifs = [];

    // Dernières transactions d'investissement
    [...cto, ...pea].sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0, 2).forEach(t => {
        const achat = t.type === true;
        const montant = parseFloat(t.quantite) * parseFloat(t.prix_unitaire);
        notifs.push({
            icon: achat ? '📈' : '📉',
            title: `${achat ? 'Achat' : 'Vente'} — ${t.titre}`,
            detail: `${fmt(montant)} · ${new Date(t.date).toLocaleDateString('fr-FR')}`,
            type: achat ? 'success' : 'warning'
        });
    });

    // Dernière entrée
    const lastEntree = [...entrees].sort((a,b) => new Date(b.date) - new Date(a.date))[0];
    if (lastEntree) {
        notifs.push({
            icon: '💸',
            title: `Entrée — ${lastEntree.categorie}`,
            detail: `${fmt(lastEntree.montant)} · ${new Date(lastEntree.date).toLocaleDateString('fr-FR')}`,
            type: 'success'
        });
    }

    // Dépense la plus importante récente
    const bigSortie = [...sorties].sort((a,b) => b.montant - a.montant)[0];
    if (bigSortie) {
        notifs.push({
            icon: '⚠️',
            title: `Grosse dépense — ${bigSortie.categorie}`,
            detail: `${fmt(bigSortie.montant)} · ${new Date(bigSortie.date).toLocaleDateString('fr-FR')}`,
            type: 'danger'
        });
    }

    // Placeholder demande de suivi (à relier à une vraie table amis plus tard)
    notifs.push({
        icon: '👥',
        title: 'Demandes de suivi',
        detail: 'Aucune nouvelle demande',
        type: 'info'
    });

    const notifsHTML = notifs.length
        ? notifs.map(n => `
            <div class="popup-notif popup-notif-${n.type}">
                <span class="popup-notif-icon">${n.icon}</span>
                <div class="popup-notif-body">
                    <div class="popup-notif-title">${n.title}</div>
                    <div class="popup-notif-detail">${n.detail}</div>
                </div>
            </div>`).join('')
        : '<p style="color:var(--text-secondary);text-align:center;padding:16px;font-size:13px">Aucune notification</p>';

    const pop = document.createElement('div');
    pop.id = 'popupNotifs';
    pop.className = 'header-popup';
    pop.innerHTML = `
      <div class="popup-notif-header">
        <span style="font-weight:600;font-size:14px">🔔 Notifications</span>
        <span class="popup-notif-badge">${notifs.length}</span>
      </div>
      <div class="popup-divider"></div>
      <div class="popup-notif-list">${notifsHTML}</div>
    `;
    _placePopup(pop, document.getElementById('notificationBtn'));
}

// =============================================================================
// BOOTSTRAP
// =============================================================================
document.addEventListener('DOMContentLoaded', () => {
    // Navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', e => { e.preventDefault(); navigateTo(link.dataset.page); });
    });

    // Modales — fermeture en cliquant sur le fond
    document.querySelectorAll('.modal').forEach(m => {
        m.addEventListener('click', e => { if (e.target === m) closeModal(m.id); });
    });

    // Formulaires
    document.getElementById('formAddTransaction')?.addEventListener('submit', addTransaction);
    document.getElementById('formAddBien')?.addEventListener('submit', addBienForm);
    document.getElementById('formAddEntree')?.addEventListener('submit', addEntreeForm);
    document.getElementById('formAddDepense')?.addEventListener('submit', addDepenseForm);
    document.getElementById('formAddCompte')?.addEventListener('submit', addCompteForm);

    // Boutons popups header
    document.getElementById('userBtn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleProfilPopup();
    });
    document.getElementById('notificationBtn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleNotifsPopup();
    });

    // Fermer les popups en cliquant ailleurs
    document.addEventListener('click', (e) => {
        if (!e.target.closest('#popupProfil') && !e.target.closest('#userBtn'))
            document.getElementById('popupProfil')?.remove();
        if (!e.target.closest('#popupNotifs') && !e.target.closest('#notificationBtn'))
            document.getElementById('popupNotifs')?.remove();
    });

    // Thème
    document.body.setAttribute('data-theme', dataManager.getSettings().theme || 'light');

    // Dates par défaut
    const today = new Date().toISOString().split('T')[0];
    document.querySelectorAll('input[type="date"]').forEach(i => { if (!i.value) i.value = today; });

    // Charger la page d'accueil
    navigateTo('accueil');
});