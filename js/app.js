// =============================================================================
// TOAST (notifications)
// =============================================================================
function showToast(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    const icons = {
        success: '<i data-lucide="check-circle-2" style="color:var(--success-color);width:16px;height:16px;flex-shrink:0;"></i>',
        error: '<i data-lucide="alert-circle" style="color:var(--danger-color);width:16px;height:16px;flex-shrink:0;"></i>',
        info: '<i data-lucide="info" style="color:var(--primary-color);width:16px;height:16px;flex-shrink:0;"></i>'
    };
    toast.innerHTML = `${icons[type] || icons.info}<span>${escapeHTML(message)}</span>`;
    container.appendChild(toast);
    if (window.lucide) lucide.createIcons();
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(4px)';
        toast.style.transition = 'all 140ms ease';
        setTimeout(() => toast.remove(), 150);
    }, 3200);
}

// =============================================================================
// NAVIGATION
// =============================================================================
async function navigateTo(page) {
    closeMobileSidebar();
    document.querySelectorAll('.nav-link').forEach(l => l.classList.toggle('active', l.dataset.page === page));
    document.querySelectorAll('.mobile-nav-item').forEach(l => l.classList.toggle('active', l.dataset.page === page));
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const el = document.getElementById(`page-${page}`);
    if (el) { 
        el.classList.add('active'); 
        
        // Mise à jour dynamique du titre dans l'en-tête
        const titles = {
            accueil: 'Tableau de bord',
            bilan: 'Bilan patrimonial',
            comptes: 'Comptes & Portefeuilles',
            cto: 'Compte-Titres (CTO)',
            pea: 'Plan d'Épargne Actions (PEA)',
            crypto: 'Actifs numériques & Crypto',
            'autres-biens': 'Autres biens & Immobilier',
            flux: 'Flux financiers',
            entrees: 'Entrées de trésorerie',
            depenses: 'Décaissements & Dépenses',
            social: 'Réseau & Partage',
            profil: 'Profil utilisateur',
            parametres: 'Paramètres'
        };
        const titleEl = document.getElementById('headerPageTitle');
        if (titleEl && titles[page]) titleEl.textContent = titles[page];

        await updatePageContent(page); 
        if (window.lucide) lucide.createIcons();
    }
}

// =============================================================================
// MOBILE SIDEBAR CONTROLS
// =============================================================================
function toggleMobileSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;
    if (sidebar.classList.contains('mobile-open')) {
        closeMobileSidebar();
    } else {
        openMobileSidebar();
    }
}

function openMobileSidebar() {
    const sidebar = document.getElementById('sidebar');
    const backdrop = document.getElementById('sidebarBackdrop');
    if (sidebar) sidebar.classList.add('mobile-open');
    if (backdrop) backdrop.classList.add('active');
    document.body.style.overflow = 'hidden';
    if (window.lucide) lucide.createIcons();
}

function closeMobileSidebar() {
    const sidebar = document.getElementById('sidebar');
    const backdrop = document.getElementById('sidebarBackdrop');
    if (sidebar) sidebar.classList.remove('mobile-open');
    if (backdrop) backdrop.classList.remove('active');
    document.body.style.overflow = '';
}

// =============================================================================
// MODALS
// =============================================================================
function openModal(modalId, param) {
    const m = document.getElementById(modalId); if (!m) return;
    m.classList.add('active');
    if (modalId === 'modalAddTransaction' && param)
        document.getElementById('transactionCompte').value = param;
    if (modalId === 'modalAddDepense' && typeof window.onCategorieChange === 'function')
        window.onCategorieChange('depense');
    if (modalId === 'modalAddEntree' && typeof window.onCategorieChange === 'function')
        window.onCategorieChange('entree');
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

// =============================================================================
// CALCUL AVANCÉ DES STATISTIQUES INVESTISSEMENTS (avec libelle)
// =============================================================================
function calcStatsPro(transactions, cashTransactions = []) {
    const positions = {}; 
    let cashTotal = 0;
    
    // Calculer cash (dépôts - achats + ventes)
    cashTransactions.forEach(ct => {
        if (ct.type === 'depot' || ct.type === 'dividende') {
            cashTotal += parseFloat(ct.montant || 0);
        } else if (ct.type === 'retrait' || ct.type === 'frais') {
            cashTotal -= parseFloat(ct.montant || 0);
        }
    });
    
    // Grouper par libellé
    (transactions || []).forEach(t => {
        const libelle = t.libelle || t.titre || 'UNKNOWN';
        
        if (!positions[libelle]) {
            positions[libelle] = {
                libelle,
                titre: t.titre || libelle,
                categorie: t.categorie || 'Autres',
                quantite: 0,
                capitalInvesti: 0,
                pru: 0,
                pvRealisee: 0,
                dernierPrix: 0
            };
        }
        
        const pos = positions[libelle];
        const montant = parseFloat(t.quantite || 0) * parseFloat(t.prix_unitaire || 0);
        const frais = parseFloat(t.frais || 0);
        const isAchat = (t.type === true || t.type === 'achat');
        
        if (isAchat) {
            pos.quantite += parseFloat(t.quantite);
            pos.capitalInvesti += montant + frais;
            pos.pru = pos.quantite > 0 ? pos.capitalInvesti / pos.quantite : 0;
            pos.dernierPrix = parseFloat(t.prix_unitaire);
            cashTotal -= (montant + frais);
        } else {
            const pvSurVente = (parseFloat(t.prix_unitaire) - pos.pru) * parseFloat(t.quantite) - frais;
            pos.pvRealisee += pvSurVente;
            pos.quantite -= parseFloat(t.quantite);
            const capitalVendu = pos.pru * parseFloat(t.quantite);
            pos.capitalInvesti = Math.max(0, pos.capitalInvesti - capitalVendu);
            pos.pru = pos.quantite > 0 ? pos.capitalInvesti / pos.quantite : 0;
            pos.dernierPrix = parseFloat(t.prix_unitaire);
            cashTotal += (montant - frais);
        }
    });
    
    // Calculer totaux
    let valorisationTotale = 0;
    let capitalTotalInvesti = 0;
    let pvRealiseeTotal = 0;
    let pvLatenteTotal = 0;
    const positionsActives = [];
    
    Object.values(positions).forEach(pos => {
        if (pos.quantite > 0.001) {
            const valorisation = pos.quantite * pos.dernierPrix;
            pos.valorisation = valorisation;
            valorisationTotale += valorisation;
            capitalTotalInvesti += pos.capitalInvesti;
            const pvLatente = valorisation - pos.capitalInvesti;
            pos.pvLatente = pvLatente;
            pvLatenteTotal += pvLatente;
            positionsActives.push(pos);
        }
        pvRealiseeTotal += pos.pvRealisee;
    });
    
    const pvTotale = pvRealiseeTotal + pvLatenteTotal;
    const totalPortefeuille = valorisationTotale + cashTotal;
    // Calculer total déposé (somme des dépôts - retraits)
let totalDepose = 0;
cashTransactions.forEach(ct => {
    if (ct.type === 'depot') totalDepose += parseFloat(ct.montant || 0);
    else if (ct.type === 'retrait') totalDepose -= parseFloat(ct.montant || 0);
});

// Performance = (total portefeuille - total déposé) / total déposé × 100
const performance = totalDepose > 0 ? ((totalPortefeuille - totalDepose) / totalDepose) * 100 : 0;
    
    return {
        positions: positionsActives,
        valorisation: valorisationTotale,
        capitalInvesti: capitalTotalInvesti,
        pvRealisee: pvRealiseeTotal,
        pvLatente: pvLatenteTotal,
        pvTotale,
        performance,
        cash: cashTotal,
        totalPortefeuille
    };
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
        case 'crypto':       await updateInvestmentPage('CRYPTO'); break;
        case 'autres-biens': await updateAutresBiens();          break;
        case 'flux':         await updateFlux();                 break;
        case 'entrees':      await updateCashFlowPage('entree'); break;
        case 'depenses':     await updateCashFlowPage('sortie'); break;
        case 'social':       await updateSocial();               break;
        case 'profil':       await updateProfil();               break;
        case 'parametres':   updateParametres();                 break;
    }
}

// =============================================================================
// Anti - XSS
// =============================================================================
function escapeHTML(str) {
    if (!str) return '';
    return str.toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Définit une variale pour le réutiliser
window.patrimoineGlobal = {
    total: 0,
    cash: 0,
    investissements: 0,
    biens: 0
};

// =============================================================================
// FAST PORTFOLIO ADJUSTMENT (CTO / PEA / CRYPTO)
// =============================================================================
window.openFastPortfolioModal = async function(type) {
    const modal = document.getElementById('modalFastPortfolio');
    if (!modal) return;
    document.getElementById('fastPortfolioType').value = type;
    const titleEl = document.getElementById('fastPortfolioTitle');
    if (titleEl) titleEl.textContent = `Ajuster la valeur : ${type.toUpperCase()}`;

    let currentVal = 0;
    try {
        if (type === 'CTO') {
            const [tx, cash] = await Promise.all([dataManager.getInvestments('CTO'), dataManager.getCashTransactions('CTO')]);
            currentVal = calcStatsPro(tx, cash).totalPortefeuille;
        } else if (type === 'PEA') {
            const [tx, cash] = await Promise.all([dataManager.getInvestments('PEA'), dataManager.getCashTransactions('PEA')]);
            currentVal = calcStatsPro(tx, cash).totalPortefeuille;
        } else if (type === 'CRYPTO') {
            const [tx, cash] = await Promise.all([dataManager.getCryptoTransactions(), dataManager.getCashTransactions('CRYPTO')]);
            currentVal = calcStatsPro(tx, cash).totalPortefeuille;
        }
    } catch (e) {
        console.warn('Erreur récupération valorisation:', e);
    }

    const valInput = document.getElementById('fastPortfolioValeur');
    if (valInput) {
        valInput.value = currentVal > 0 ? currentVal.toFixed(2) : '';
    }
    modal.classList.add('active');
    if (window.lucide) lucide.createIcons();
    if (valInput) valInput.focus();
};

window.saveFastPortfolio = async function(e) {
    if (e) e.preventDefault();
    const type = document.getElementById('fastPortfolioType').value;
    const targetVal = parseFloat(document.getElementById('fastPortfolioValeur').value);
    const note = document.getElementById('fastPortfolioNote').value.trim() || 'Ajustement valorisation';

    if (isNaN(targetVal) || targetVal < 0) {
        showToast('Veuillez saisir une valorisation valide.', 'error');
        return;
    }

    try {
        let currentVal = 0;
        if (type === 'CTO') {
            const [tx, cash] = await Promise.all([dataManager.getInvestments('CTO'), dataManager.getCashTransactions('CTO')]);
            currentVal = calcStatsPro(tx, cash).totalPortefeuille;
        } else if (type === 'PEA') {
            const [tx, cash] = await Promise.all([dataManager.getInvestments('PEA'), dataManager.getCashTransactions('PEA')]);
            currentVal = calcStatsPro(tx, cash).totalPortefeuille;
        } else if (type === 'CRYPTO') {
            const [tx, cash] = await Promise.all([dataManager.getCryptoTransactions(), dataManager.getCashTransactions('CRYPTO')]);
            currentVal = calcStatsPro(tx, cash).totalPortefeuille;
        }

        const delta = targetVal - currentVal;
        if (Math.abs(delta) < 0.01) {
            showToast('La valorisation est déjà conforme.', 'info');
            closeModal('modalFastPortfolio');
            return;
        }

        const today = new Date().toISOString().split('T')[0];
        const cashType = delta > 0 ? 'depot' : 'retrait';
        const montant = Math.abs(delta);

        await dataManager.addCashTransaction(type, {
            type: cashType,
            montant: montant,
            description: `${note} (${delta > 0 ? '+' : ''}${delta.toFixed(2)} €)`,
            date: today
        });

        showToast(`Valorisation ${type} mise à jour : ${targetVal.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €`, 'success');
        closeModal('modalFastPortfolio');
        await updateComptes();
        if (type === 'CTO') await updateInvestmentPage('CTO');
        else if (type === 'PEA') await updateInvestmentPage('PEA');
        else if (type === 'CRYPTO') await updateInvestmentPage('CRYPTO');
    } catch (err) {
        console.error('Erreur ajustement portefeuille:', err);
        showToast('Erreur lors de la mise à jour de la valorisation.', 'error');
    }
};
