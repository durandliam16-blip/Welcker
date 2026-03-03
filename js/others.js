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
// FONCTIONS GRAPHIQUES (Chart.js)
// =============================================================================

function destroyChart(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return null;
    
    const existingChart = Chart.getChart(canvas);
    if (existingChart) {
        existingChart.destroy();
    }
    
    return canvas.getContext('2d');
}

function renderPositionsChart(canvasId, positions) {
    const ctx = destroyChart(canvasId);
    if (!ctx || !positions || positions.length === 0) {
        // Pas de graphique si pas de positions
        const canvas = document.getElementById(canvasId);
        if (canvas) {
            canvas.parentElement.innerHTML = '<p style="text-align:center;color:var(--text-secondary);padding:40px;">Aucune position</p>';
        }
        return;
    }
    
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: positions.map(p => p.libelle || p.titre),
            datasets: [{
                data: positions.map(p => p.valorisation),
                backgroundColor: ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16']
            }]
        },
        options: {
            responsive: true,
            plugins: { 
                legend: { position: 'bottom' },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const value = context.parsed;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${context.label}: ${fmt(value)} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

function renderFluxChart(entrees, sorties) {
    const ctx = destroyChart('evolutionChart');
    if (!ctx) return;
    
    // Grouper par mois
    const moisEntrees = {};
    const moisSorties = {};
    
    entrees.forEach(e => {
        const mois = e.date.substring(0, 7); // YYYY-MM
        moisEntrees[mois] = (moisEntrees[mois] || 0) + parseFloat(e.montant);
    });
    
    sorties.forEach(s => {
        const mois = s.date.substring(0, 7);
        moisSorties[mois] = (moisSorties[mois] || 0) + parseFloat(s.montant);
    });
    
    // 12 derniers mois
    const labels = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const mois = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        labels.push(mois);
    }
    
    const dataEntrees = labels.map(m => moisEntrees[m] || 0);
    const dataSorties = labels.map(m => moisSorties[m] || 0);
    
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels.map(l => {
                const [y, m] = l.split('-');
                const mois = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
                return `${mois[parseInt(m) - 1]} ${y}`;
            }),
            datasets: [
                {
                    label: 'Entrées',
                    data: dataEntrees,
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    tension: 0.4,
                    fill: true
                },
                {
                    label: 'Sorties',
                    data: dataSorties,
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    tension: 0.4,
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'bottom' }
            },
            scales: {
                y: { beginAtZero: true }
            }
        }
    });
}

function renderCashFlowCategoryChart(type, data) {
    const canvasId = type === 'entree' ? 'entreeCategoriesChart' : 'depenseCategoriesChart';
    const ctx = destroyChart(canvasId);
    if (!ctx) return;
    
    // Grouper par catégorie
    const categories = {};
    data.forEach(item => {
        const cat = item.categorie || 'Autre';
        categories[cat] = (categories[cat] || 0) + parseFloat(item.montant || 0);
    });
    
    const labels = Object.keys(categories);
    const values = Object.values(categories);
    
    if (labels.length === 0) {
        const canvas = document.getElementById(canvasId);
        if (canvas) {
            canvas.parentElement.innerHTML = '<p style="text-align:center;color:var(--text-secondary);padding:40px;">Aucune donnée</p>';
        }
        return;
    }
    
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16']
            }]
        },
        options: {
            responsive: true,
            plugins: { 
                legend: { position: 'bottom' },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.label}: ${fmt(context.parsed)}`;
                        }
                    }
                }
            }
        }
    });
}

function renderCashFlowEvolutionChart(type, data) {
    const canvasId = type === 'entree' ? 'entreeEvolutionChart' : 'depenseEvolutionChart';
    const ctx = destroyChart(canvasId);
    if (!ctx) return;
    
    // Grouper par mois
    const mois = {};
    data.forEach(item => {
        const m = item.date.substring(0, 7); // YYYY-MM
        mois[m] = (mois[m] || 0) + parseFloat(item.montant || 0);
    });
    
    // 12 derniers mois
    const labels = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        labels.push(key);
    }
    
    const values = labels.map(l => mois[l] || 0);
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels.map(l => {
                const [y, m] = l.split('-');
                const moisNoms = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
                return `${moisNoms[parseInt(m) - 1]} ${y}`;
            }),
            datasets: [{
                label: type === 'entree' ? 'Entrées' : 'Dépenses',
                data: values,
                backgroundColor: type === 'entree' ? '#10b981' : '#ef4444'
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: { beginAtZero: true }
            }
        }
    });
}

// =============================================================================
// GESTION CASH & POSITIONS
// =============================================================================

function openCashModal(mode) {
    document.getElementById('cashAccountType').value = mode;
    openModal('modalGererCash');
}

async function submitCashTransaction(e) {
    e.preventDefault();
    const mode = document.getElementById('cashAccountType').value;
    const ok = await dataManager.addCashTransaction(mode, {
        type:        document.getElementById('cashType').value,
        montant:     document.getElementById('cashMontant').value,
        description: document.getElementById('cashDescription').value,
        date:        document.getElementById('cashDate').value
    });
    if (ok) {
        closeModal('modalGererCash');
        await updateInvestmentPage(mode);
    }
}

function renderPositionsTable(prefix, positions) {
    const tbody = document.getElementById(`${prefix}PositionsTable`);
    if (!tbody) return;
    
    if (!positions || positions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-state">Aucune position</td></tr>';
        return;
    }
    
    tbody.innerHTML = positions.map(p => `
        <tr>
            <td><strong>${p.libelle}</strong></td>
            <td>${p.titre}</td>
            <td>${p.quantite.toFixed(4)}</td>
            <td>${fmt(p.pru)}</td>
            <td>${fmt(p.dernierPrix)}</td>
            <td>${fmt(p.valorisation)}</td>
            <td class="${p.pvLatente >= 0 ? 'positive' : 'negative'}">${fmt(p.pvLatente)}</td>
        </tr>
    `).join('');
}

function renderCashHistory(prefix, cashTransactions) {
    const container = document.getElementById(`${prefix}CashHistory`);
    if (!container) return;
    
    if (!cashTransactions || cashTransactions.length === 0) {
        container.innerHTML = '<p class="empty-state">Aucune transaction cash</p>';
        return;
    }
    
    const icons = { depot: '➕', retrait: '➖', dividende: '💰', frais: '💳' };
    const colors = { depot: 'positive', retrait: 'negative', dividende: 'positive', frais: 'negative' };
    
    container.innerHTML = cashTransactions.slice(0, 10).map(ct => `
        <div class="cash-item">
            <span class="cash-icon">${icons[ct.type] || '💵'}</span>
            <div class="cash-details">
                <div class="cash-desc">${ct.description || ct.type}</div>
                <div class="cash-date">${new Date(ct.date).toLocaleDateString('fr-FR')}</div>
            </div>
            <div class="cash-amount ${colors[ct.type]}">${fmt(ct.montant)}</div>
        </div>
    `).join('');
}

function renderPositionsChart(canvasId, positions) {
    const ctx = destroyChart(canvasId);
    if (!ctx || !positions || positions.length === 0) return;
    
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: positions.map(p => p.libelle),
            datasets: [{
                data: positions.map(p => p.valorisation),
                backgroundColor: ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { position: 'bottom' } }
        }
    });
}

// Exposer globalement
window.openCashModal = openCashModal;

// =============================================================================
// BOOTSTRAP
// =============================================================================
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('formGererCash')?.addEventListener('submit', submitCashTransaction);
    
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