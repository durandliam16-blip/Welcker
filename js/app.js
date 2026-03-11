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