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
    const ctx2 = destroyChart('fluxAnnuelChart');
    if (ctx2) new Chart(ctx2, { type: 'doughnut',
        data: { labels:['Entrées','Sorties'], datasets:[{ data:[tE,tS], backgroundColor:['#10b981','#ef4444'] }] },
        options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
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
    if (!isE) {
        const now2 = new Date();
        const months = ['Jan','Fév','Mar','Avr','Mai','Jun'];
        const vals = Array.from({length:6},(_,i) => {
            const d = new Date(now2.getFullYear(), now2.getMonth()-5+i, 1);
            return data.filter(x => { const id=new Date(x.date); return id.getMonth()===d.getMonth()&&id.getFullYear()===d.getFullYear(); })
                       .reduce((s,x) => s+parseFloat(x.montant||0), 0);
        });
        const ctx = destroyChart('depensesEvolutionChart');
        if (ctx) new Chart(ctx, { type: 'line',
            data: { labels: months, datasets: [{ data: vals, borderColor:'#ef4444', backgroundColor:'rgba(239,68,68,0.1)', tension:0.4, fill:true }] },
            options: { responsive: true, plugins: { legend: { display: false } } }
        });
    }
}

// =============================================================================
// PAGE PROFIL & PARAMÈTRES
// =============================================================================
async function updateProfil() {
    const p = await dataManager.getProfile();
    document.getElementById('profilNom').value   = p.nom       || '';
    document.getElementById('profilEmail').value = p.email     || '';
    document.getElementById('profilTel').value   = p.telephone || '';
}

async function saveProfile() {
    await dataManager.updateProfile({
        nom:       document.getElementById('profilNom').value,
        email:     document.getElementById('profilEmail').value,
        telephone: document.getElementById('profilTel').value
    });
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
// BOOTSTRAP
// =============================================================================
document.addEventListener('DOMContentLoaded', () => {
    // Navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', e => { e.preventDefault(); navigateTo(link.dataset.page); });
    });

    // Formulaires
    document.getElementById('formAddTransaction')?.addEventListener('submit', addTransaction);
    document.getElementById('formAddBien')?.addEventListener('submit', addBienForm);
    document.getElementById('formAddEntree')?.addEventListener('submit', addEntreeForm);
    document.getElementById('formAddDepense')?.addEventListener('submit', addDepenseForm);
    document.getElementById('formAddCompte')?.addEventListener('submit', addCompteForm);

    // Thème
    document.body.setAttribute('data-theme', dataManager.getSettings().theme || 'light');

    // Dates par défaut
    const today = new Date().toISOString().split('T')[0];
    document.querySelectorAll('input[type="date"]').forEach(i => { if (!i.value) i.value = today; });

    // Charger la page d'accueil
    navigateTo('accueil');
});