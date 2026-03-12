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
        libelle:       document.getElementById('transactionLibelle').value,
        categorie:     document.getElementById('transactionCategorie').value,    
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
    if (ok) { 
        showToast('Bien ajouté', 'success');
        closeModal('modalAddBien'); 
        await updateAutresBiens(); 
    }
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
    if (ok) { 
        showToast('Compte ajouté', 'success');
        closeModal('modalAddCompte'); 
        await updateComptes(); 
    }
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

// Supprimer transaction cash
window._deleteCashTransaction = async (id) => {
    if (!confirm('Supprimer cette transaction cash ?')) return;
    try {
        await dataManager.deleteCashTransaction(id);
        showToast('Transaction supprimée', 'success');
        // Rafraîchir la page actuelle
        const activePage = document.querySelector('.page.active');
        if (activePage) {
            const pageId = activePage.id.replace('page-', '');
            await updatePageContent(pageId);
        }
    } catch (err) {
        showToast('Erreur lors de la suppression', 'error');
        console.error(err);
    }
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

    const profile = await dataManager.getProfile();
    
    // UTILISER les valeurs déjà calculées
    const patrimoine = window.patrimoineGlobal?.total || 0;

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
        tbody.innerHTML = '<tr><td colspan="3" class="empty-state">Aucune position</td></tr>';
        return;
    }
    
    // Top 10 par valorisation
    const top10 = positions
        .sort((a, b) => (b.valorisation || 0) - (a.valorisation || 0))
        .slice(0, 10);
    
    tbody.innerHTML = top10.map(p => `
        <tr>
            <td>
                <strong style="color: var(--text-primary); font-size: 14px;">
                    ${p.libelle || p.titre}
                </strong>
                <div style="font-size: 11px; color: var(--text-secondary); margin-top: 2px;">
                    ${p.quantite.toFixed(4)} × ${fmt(p.dernierPrix)}
                </div>
            </td>
            <td style="text-align: right; font-weight: 600; font-size: 15px;">
                ${fmt(p.valorisation)}
            </td>
            <td style="text-align: right;">
                <span class="${p.pvLatente >= 0 ? 'positive' : 'negative'}" 
                      style="font-weight: 600; font-size: 14px;">
                    ${p.pvLatente >= 0 ? '+' : ''}${fmt(p.pvLatente)}
                </span>
                <div style="font-size: 11px; color: var(--text-secondary); margin-top: 2px;">
                    ${p.pvLatente >= 0 ? '+' : ''}${((p.pvLatente / p.capitalInvesti) * 100).toFixed(1)}%
                </div>
            </td>
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
            <button class="btn-icon" onclick="window._deleteCashTransaction('${ct.id}')" title="Supprimer" style="margin-left: 8px;">
                🗑️
            </button>
        </div>
    `).join('');
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