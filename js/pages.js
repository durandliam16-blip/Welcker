// =============================================================================
// PAGE ACCUEIL
// =============================================================================
async function updateAccueil() {
    const [accounts, ctoT, peaT, cryptoT, entrees, sorties, biens, ctoCash, peaCash, cryptoCash] = await Promise.all([
        dataManager.getBankAccounts(),
        dataManager.getInvestments('CTO'),
        dataManager.getInvestments('PEA'),
        dataManager.getCryptoTransactions(),
        dataManager.getCashFlow('entree'),
        dataManager.getCashFlow('sortie'),
        dataManager.getBiens(),
        dataManager.getCashTransactions('CTO'),
        dataManager.getCashTransactions('PEA'),
        dataManager.getCashTransactions('CRYPTO')
    ]);
    
    const ctoStats = calcStatsPro(ctoT, ctoCash);
    const peaStats = calcStatsPro(peaT, peaCash);
    const cryptoStats = calcStatsPro(cryptoT, cryptoCash);
    
    // Séparer comptes cash et investissements passifs
    const comptesCash = accounts.filter(a => a.type !== 'investissement_passif');
    const comptesInvestPassif = accounts.filter(a => a.type === 'investissement_passif');

    const accTotal = comptesCash.reduce((s, a) => s + parseFloat(a.solde || 0), 0);
    const investPassifTotal = comptesInvestPassif.reduce((s, a) => s + parseFloat(a.solde || 0), 0);
    
    const biensVal = biens.reduce((s, b) => s + parseFloat(b.solde || 0), 0);
    
    const invTotal = ctoStats.valorisation + peaStats.valorisation + cryptoStats.valorisation + investPassifTotal;
    const cashTotal = accTotal + ctoStats.cash + peaStats.cash + cryptoStats.cash;
   
    // Calculer bénéfice flux
    const totalEntrees = entrees.reduce((s, e) => s + parseFloat(e.montant || 0), 0);
    const totalSorties = sorties.reduce((total, depense) => total + parseFloat(depense.montant || 0), 0);
    const beneficeFlux = totalEntrees - totalSorties;

    // Patrimoine total = Cash + Investissements + Biens
    const patrimoineTotal = cashTotal + invTotal + biensVal;

    // Stocker dans variable globale pour réutilisation
    window.patrimoineGlobal = {
        total: patrimoineTotal,
        cash: cashTotal,
        investissements: invTotal,
        biens: biensVal
    };

    // Afficher
    document.getElementById('beneficeFlux').textContent = fmt(beneficeFlux);
    document.getElementById('autresBiens').textContent = fmt(biensVal);
    document.getElementById('patrimoineTotal').textContent = fmt(patrimoineTotal);
    document.getElementById('liquiditesTotal').textContent = fmt(cashTotal);
    document.getElementById('investissementsTotal').textContent = fmt(invTotal);

    // Dernières transactions (TOUTES sources)
    const allTransactions = [
        // Entrées/Sorties cash flow
        ...entrees.map(e => ({ ...e, source: 'entree', type: 'cashflow' })),
        ...sorties.map(s => ({ ...s, source: 'sortie', type: 'cashflow' })),
        // Transactions CTO
        ...ctoT.map(t => ({ 
            ...t, 
            source: 'CTO', 
            type: 'investment',
            description: `${t.type === true || t.type === 'achat' ? 'Achat' : 'Vente'} ${t.titre || t.libelle}`
        })),
        // Transactions PEA
        ...peaT.map(t => ({ 
            ...t, 
            source: 'PEA', 
            type: 'investment',
            description: `${t.type === true || t.type === 'achat' ? 'Achat' : 'Vente'} ${t.titre || t.libelle}`
        })),
        // Transactions Crypto
        ...cryptoT.map(t => ({ 
            ...t, 
            source: 'CRYPTO', 
            type: 'investment',
            description: `${t.type === true || t.type === 'achat' ? 'Achat' : 'Vente'} ${t.titre || t.libelle}`
        })),
        // Mouvements cash CTO/PEA/Crypto
        ...ctoCash.map(c => ({ ...c, source: 'CTO', type: 'cash', description: c.description || c.type })),
        ...peaCash.map(c => ({ ...c, source: 'PEA', type: 'cash', description: c.description || c.type })),
        ...cryptoCash.map(c => ({ ...c, source: 'CRYPTO', type: 'cash', description: c.description || c.type }))
    ];
    
    const recent = allTransactions
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 5);
    
    const cont = document.getElementById('recentTransactions');
    cont.innerHTML = recent.length
        ? recent.map(t => {
            const montant = t.montant || (parseFloat(t.quantite || 0) * parseFloat(t.prix_unitaire || 0));
            const isPositive = t.source === 'entree' || (t.type === 'investment' && (t.type === true || t.type === 'achat'));
            return `<div class="transaction-item">
                <div>
                    <strong>${t.description || 'Transaction'}</strong>
                    <div style="font-size:11px;color:var(--text-secondary);margin-top:2px;">
                        ${new Date(t.date).toLocaleDateString('fr-FR')} · ${t.source}
                    </div>
                </div>
                <div style="font-weight:600;color:${isPositive ? 'var(--success-color)' : 'var(--danger-color)'}">
                    ${isPositive ? '+' : ''}${fmt(montant)}
                </div>
            </div>`;
        }).join('')
        : '<p class="empty-state">Aucune transaction</p>';

    // Graphiques
    const ctx1 = destroyChart('patrimoineRepartition');
    if (ctx1) new Chart(ctx1, { 
        type: 'doughnut',
        data: { 
            labels: ['Liquidités','Investissements','Biens'],
            datasets: [{ 
                data: [cashTotal, invTotal, biensVal],
                backgroundColor: ['#059669','#2563eb','#64748b'] 
            }] 
        },
        options: { 
            responsive: true, 
            plugins: { 
                legend: { position: 'bottom' },
                tooltip: {
                    callbacks: {
                        label: (ctx) => `${ctx.label}: ${fmt(ctx.parsed)}`
                    }
                }
            } 
        }
    });

    renderFluxChart(entrees, sorties);

    // Graphique évolution patrimoine
    await renderPatrimoineEvolutionChart();
    
    // Event listener pour changement de période
    const periodSelect = document.getElementById('patrimoineChartPeriod');
    if (periodSelect) {
        periodSelect.onchange = () => renderPatrimoineEvolutionChart();
    }

    // Sauvegarder snapshot automatiquement (hebdomadaire par défaut)
    const snapshotFrequency = localStorage.getItem('snapshotFrequency') || 'weekly';
    const lastSave = localStorage.getItem('lastPatrimoineSnapshot');
    const today = new Date();

    let shouldSave = false;
    let currentKey = '';

    if (snapshotFrequency === 'weekly') {
        // Snapshot hebdomadaire (tous les lundis)
        const mondayOfWeek = new Date(today);
        const dayOfWeek = today.getDay();
        const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Lundi de cette semaine
        mondayOfWeek.setDate(diff);
        currentKey = mondayOfWeek.toISOString().split('T')[0]; // Format: 2025-03-10
        shouldSave = lastSave !== currentKey;
    } else if (snapshotFrequency === 'monthly') {
        // Snapshot mensuel (1er du mois)
        currentKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
        shouldSave = lastSave !== currentKey;
    }

    if (shouldSave) {
        await window.saveCurrentPatrimoine();
        localStorage.setItem('lastPatrimoineSnapshot', currentKey);
        console.log(`✅ Snapshot ${snapshotFrequency === 'weekly' ? 'hebdomadaire' : 'mensuel'} sauvegardé`);
    }
}

// =============================================================================
// PAGE BILAN
// =============================================================================
async function updateBilan() {
    const [accs, cto, pea, biens, ctoCash, peaCash] = await Promise.all([
        dataManager.getBankAccounts(), 
        dataManager.getInvestments('CTO'),
        dataManager.getInvestments('PEA'), 
        dataManager.getBiens(),
        dataManager.getCashTransactions('CTO'),
        dataManager.getCashTransactions('PEA')
    ]);
    
    const ctoStats = calcStatsPro(cto, ctoCash);
    const peaStats = calcStatsPro(pea, peaCash);
    const ctoVal = ctoStats.totalPortefeuille;
    const peaVal = peaStats.totalPortefeuille;
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
// Variables de filtrage comptes
window._allBankAccounts = [];
window._activeAccountFilter = 'all';

window.filterComptesCategory = async function(filter) {
    window._activeAccountFilter = filter;
    document.querySelectorAll('#page-comptes .filter-chip').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === filter);
    });
    renderBankAccountsList();
};


// ── Fonctions Sparklines pour tous les comptes & biens ────────────────────────
async function getSparklineDataForAccount(accountId, accountType, currentSolde) {
    let vals = [];
    try {
        if (window.dataManager && typeof dataManager.getAccountValuations === 'function') {
            const hist = await dataManager.getAccountValuations(accountId, accountType);
            if (hist && hist.length > 0) {
                vals = hist.map(h => parseFloat(h.valeur || 0));
            }
        }
    } catch (e) {
        console.warn('Erreur lecture valuations:', e);
    }

    if (vals.length < 2) {
        const base = parseFloat(currentSolde || 0);
        // Courbe de tendance mensuelle naturelle
        vals = [
            Math.max(0, base * 0.94),
            Math.max(0, base * 0.96),
            Math.max(0, base * 0.95),
            Math.max(0, base * 0.98),
            Math.max(0, base * 0.99),
            base
        ];
    }
    return vals;
}

async function renderBankAccountsList() {
    const cont = document.getElementById('autresComptesContainer');
    if (!cont) return;
    
    const accs = window._allBankAccounts || [];
    const filter = window._activeAccountFilter || 'all';
    
    let filtered = accs;
    if (filter !== 'all') {
        if (filter === 'epargne') {
            filtered = accs.filter(a => a.type === 'epargne' || a.type === 'livret');
        } else {
            filtered = accs.filter(a => a.type === filter);
        }
    }
    
    const totalLiquidites = accs.reduce((s, a) => s + parseFloat(a.solde || 0), 0);
    
    const typeMeta = {
        'courant': { label: 'Compte courant', icon: 'credit-card' },
        'epargne': { label: 'Compte sur livret', icon: 'coins' },
        'livret': { label: 'Livret réglementé', icon: 'book-open' },
        'investissement_passif': { label: 'Placement passif', icon: 'trending-up' }
    };
    
    if (!filtered.length) {
        cont.innerHTML = '<p class="empty-state" style="grid-column: 1 / -1;">Aucun compte dans cette catégorie</p>';
        return;
    }

    const cardHtmlPromises = filtered.map(async (a) => {
        const meta = typeMeta[a.type] || { label: a.type || 'Compte', icon: 'wallet' };
        const sparkVals = await getSparklineDataForAccount(a.id, a.type, a.solde);
        const isPos = sparkVals[sparkVals.length - 1] >= sparkVals[0];
        const sparkSvg = window.generateSparklineSvg 
            ? window.generateSparklineSvg(sparkVals, { isPositive: isPos, strokeColor: isPos ? '#10b981' : '#3b82f6', withAxes: true }) 
            : '';

        return `
        <div class="card compte-card-sketch">
            <div class="compte-header-sketch">
                <div style="display:flex; align-items:center; gap:8px;">
                    <i data-lucide="${meta.icon}" style="width:16px;height:16px;color:var(--text-secondary);"></i>
                    <h3 style="font-size:15px; margin:0; font-weight:600;">${escapeHTML(a.nom)}</h3>
                    <span class="compte-type-badge">${meta.label}</span>
                </div>
                <div style="display:flex; gap:4px;">
                    <button class="btn-micro" onclick="window._editAccount('${a.id}', '${escapeHTML(a.nom)}', ${a.solde})" title="Modifier le nom">
                        <i data-lucide="pencil" style="width:12px;height:12px;"></i>
                    </button>
                    <button class="btn-micro btn-micro-danger" onclick="window._deleteAccount('${a.id}')" title="Supprimer">
                        <i data-lucide="trash-2" style="width:12px;height:12px;"></i>
                    </button>
                </div>
            </div>
            
            <div class="compte-body-sketch">
                <div class="compte-left-sketch">
                    <div class="compte-amount-sketch">${fmt(a.solde)}</div>
                    <button class="btn-saisir-sketch" onclick="openSaisirNouvelleValeur('${a.id}', '${escapeHTML(a.nom)}', ${a.solde}, '${a.type}')">
                        <i data-lucide="edit-3" style="width:13px;height:13px;"></i> Saisir nouvelle valeur
                    </button>
                </div>
                <div class="compte-right-sketch">
                    ${sparkSvg}
                </div>
            </div>
        </div>`;
    });

    const cardsHtml = await Promise.all(cardHtmlPromises);
    cont.innerHTML = cardsHtml.join('');
    if (window.lucide) lucide.createIcons();
}

async function updateComptes() {
    try {
        const [accs, cto, pea, crypto, ctoCash, peaCash, cryptoCash] = await Promise.all([
            dataManager.getBankAccounts(),
            dataManager.getInvestments('CTO'),
            dataManager.getInvestments('PEA'),
            dataManager.getCryptoTransactions(),
            dataManager.getCashTransactions('CTO'),
            dataManager.getCashTransactions('PEA'),
            dataManager.getCashTransactions('CRYPTO')
        ]);
        
        const ctoStats = calcStatsPro(cto, ctoCash);
        const peaStats = calcStatsPro(pea, peaCash);
        const cryptoStats = calcStatsPro(crypto, cryptoCash);
        
        // Stocker pour accès rapide par les boutons
        window._ctoStats = ctoStats;
        window._peaStats = peaStats;
        window._cryptoStats = cryptoStats;
        
        // Montants des 3 portefeuilles
        const elCtoAmount = document.getElementById('ctoAmount');
        if (elCtoAmount) elCtoAmount.textContent = fmt(ctoStats.totalPortefeuille);
        const elPeaAmount = document.getElementById('peaAmount');
        if (elPeaAmount) elPeaAmount.textContent = fmt(peaStats.totalPortefeuille);
        const elCryptoAmount = document.getElementById('cryptoAmount');
        if (elCryptoAmount) elCryptoAmount.textContent = fmt(cryptoStats.totalPortefeuille);
        
        // Indicateurs d'évolution s'ils existent
        const elCtoEvol = document.getElementById('ctoEvolution');
        if (elCtoEvol) elCtoEvol.innerHTML = `<span class="${ctoStats.performance >= 0 ? 'positive' : 'negative'}">${ctoStats.performance >= 0 ? '+' : ''}${ctoStats.performance.toFixed(2)}%</span>`;
        const elPeaEvol = document.getElementById('peaEvolution');
        if (elPeaEvol) elPeaEvol.innerHTML = `<span class="${peaStats.performance >= 0 ? 'positive' : 'negative'}">${peaStats.performance >= 0 ? '+' : ''}${peaStats.performance.toFixed(2)}%</span>`;
        const elCryptoEvol = document.getElementById('cryptoEvolution');
        if (elCryptoEvol) elCryptoEvol.innerHTML = `<span class="${cryptoStats.performance >= 0 ? 'positive' : 'negative'}">${cryptoStats.performance >= 0 ? '+' : ''}${cryptoStats.performance.toFixed(2)}%</span>`;
        
        // Courbes Sparklines avec axes ↑ et → pour CTO, PEA et Crypto
        const [ctoSparkVals, peaSparkVals, cryptoSparkVals] = await Promise.all([
            getSparklineDataForAccount(null, 'CTO', ctoStats.totalPortefeuille),
            getSparklineDataForAccount(null, 'PEA', peaStats.totalPortefeuille),
            getSparklineDataForAccount(null, 'CRYPTO', cryptoStats.totalPortefeuille)
        ]);

        const ctoEl = document.getElementById('ctoSparkline');
        if (ctoEl && window.generateSparklineSvg) {
            const isPos = ctoSparkVals[ctoSparkVals.length - 1] >= ctoSparkVals[0];
            ctoEl.innerHTML = window.generateSparklineSvg(ctoSparkVals, { isPositive: isPos, strokeColor: isPos ? '#10b981' : '#2563eb', withAxes: true });
        }
        const peaEl = document.getElementById('peaSparkline');
        if (peaEl && window.generateSparklineSvg) {
            const isPos = peaSparkVals[peaSparkVals.length - 1] >= peaSparkVals[0];
            peaEl.innerHTML = window.generateSparklineSvg(peaSparkVals, { isPositive: isPos, strokeColor: isPos ? '#10b981' : '#2563eb', withAxes: true });
        }
        const cryptoEl = document.getElementById('cryptoSparkline');
        if (cryptoEl && window.generateSparklineSvg) {
            const isPos = cryptoSparkVals[cryptoSparkVals.length - 1] >= cryptoSparkVals[0];
            cryptoEl.innerHTML = window.generateSparklineSvg(cryptoSparkVals, { isPositive: isPos, strokeColor: isPos ? '#10b981' : '#f59e0b', withAxes: true });
        }

        // Lier les boutons Saisir nouvelle valeur
        const btnCto = document.getElementById('btnSaisirCto');
        if (btnCto) {
            btnCto.onclick = (e) => {
                e.stopPropagation();
                openSaisirNouvelleValeur(null, 'Compte-titres ordinaire (CTO)', ctoStats.totalPortefeuille, 'CTO');
            };
        }
        const btnPea = document.getElementById('btnSaisirPea');
        if (btnPea) {
            btnPea.onclick = (e) => {
                e.stopPropagation();
                openSaisirNouvelleValeur(null, 'Plan d\'Épargne Actions (PEA)', peaStats.totalPortefeuille, 'PEA');
            };
        }
        const btnCrypto = document.getElementById('btnSaisirCrypto');
        if (btnCrypto) {
            btnCrypto.onclick = (e) => {
                e.stopPropagation();
                openSaisirNouvelleValeur(null, 'Actifs numériques (Crypto)', cryptoStats.totalPortefeuille, 'CRYPTO');
            };
        }

        // Totaux et ratios consolidés
        const totalLiquidites = accs.reduce((s, a) => s + parseFloat(a.solde || 0), 0);
        const totalInvested = ctoStats.totalPortefeuille + peaStats.totalPortefeuille + cryptoStats.totalPortefeuille;
        const totalCombined = totalLiquidites + totalInvested;
        
        const pctCash = totalCombined > 0 ? Math.round((totalLiquidites / totalCombined) * 100) : 0;
        const pctInv = totalCombined > 0 ? (100 - pctCash) : 0;
        
        const elCash = document.getElementById('comptesTotalCash');
        if (elCash) elCash.textContent = fmt(totalLiquidites);
        const elCountCash = document.getElementById('comptesCountCash');
        if (elCountCash) elCountCash.textContent = `${accs.length} compte(s) bancaire(s)`;
        
        const elInvest = document.getElementById('comptesTotalInvest');
        if (elInvest) elInvest.textContent = fmt(totalInvested);
        
        const elRatio = document.getElementById('comptesAllocationRatio');
        if (elRatio) elRatio.textContent = `${pctCash}% Liquidités · ${pctInv}% Investissements`;
        
        const barCash = document.getElementById('comptesBarCash');
        if (barCash) barCash.style.width = `${pctCash}%`;
        const barInvest = document.getElementById('comptesBarInvest');
        if (barInvest) barInvest.style.width = `${pctInv}%`;
        
        window._allBankAccounts = accs;
        await renderBankAccountsList();
        
        if (window.lucide) lucide.createIcons();
    } catch (err) {
        console.error('Erreur updateComptes:', err);
    }
}

// =============================================================================
// PAGE CTO// PAGE CTO / PEA
// =============================================================================
async function updateInvestmentPage(mode) {
    const pfx = mode.toLowerCase();
    const [transactions, cashTransactions, valuations] = await Promise.all([
        mode === 'CRYPTO' ? dataManager.getCryptoTransactions() : dataManager.getInvestments(mode),
        dataManager.getCashTransactions(mode),
        dataManager.getAccountValuations ? dataManager.getAccountValuations(null, mode) : []
    ]);
    
    const stats = calcStatsPro(transactions, cashTransactions);
    
    // Stats principales simplifiées
    const elCash = document.getElementById(`${pfx}Cash`);
    if (elCash) elCash.textContent = fmt(stats.cash);
    const elVal = document.getElementById(`${pfx}ValeurActuelle`);
    if (elVal) elVal.textContent = fmt(stats.valorisation);
    const elTot = document.getElementById(`${pfx}TotalPortefeuille`);
    if (elTot) elTot.textContent = fmt(stats.totalPortefeuille);
    const elPerf = document.getElementById(`${pfx}Performance`);
    if (elPerf) elPerf.textContent = `${stats.performance >= 0 ? '+' : ''}${stats.performance.toFixed(2)}%`;
    const elPvR = document.getElementById(`${pfx}PvRealisee`);
    if (elPvR) elPvR.textContent = fmt(stats.pvRealisee);
    const elPvL = document.getElementById(`${pfx}PvLatente`);
    if (elPvL) elPvL.textContent = fmt(stats.pvLatente);

    // Calcul de l'apport mis ce mois-ci
    const curMonth = new Date().toISOString().substring(0, 7);
    const curMonthVal = valuations.find(v => v.mois === curMonth);
    let monthlyAdded = curMonthVal ? parseFloat(curMonthVal.apport_mensuel || 0) : 0;
    if (monthlyAdded === 0 && valuations.length >= 2) {
        monthlyAdded = Math.max(0, valuations[valuations.length - 1].valeur - valuations[valuations.length - 2].valeur);
    }
    const elMonthlyAdd = document.getElementById(`${pfx}MonthlyAdded`);
    if (elMonthlyAdd) elMonthlyAdd.textContent = `+${fmt(monthlyAdded)}`;

    // 1. Grand Graphique d'Évolution Mensuelle
    renderMonthlyInvestmentChart(pfx, valuations, stats.totalPortefeuille);

    // 2. Tableau du Suivi Mensuel
    renderMonthlyValuationsTable(pfx, valuations, mode);
    
    // Éléments détaillés préservés dans la section repliable
    renderPositionsTable(pfx, stats.positions);
    renderCashHistory(pfx, cashTransactions);
    renderPositionsChart(`${pfx}PositionsChart`, stats.positions);
    renderInvestTable(pfx, transactions, mode, stats);
    renderInvestChart(pfx, transactions);
}

function renderMonthlyInvestmentChart(pfx, valuations, currentVal) {
    const canvasId = `${pfx}MonthlyEvolutionChart`;
    const ctx = destroyChart(canvasId);
    if (!ctx) return;

    let labels = [];
    let dataPoints = [];

    if (valuations && valuations.length >= 2) {
        labels = valuations.map(v => {
            const [y, m] = v.mois.split('-');
            const moisNoms = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
            return `${moisNoms[parseInt(m) - 1]} ${y}`;
        });
        dataPoints = valuations.map(v => parseFloat(v.valeur || 0));
    } else {
        // Courbe synthétique sur les 6 derniers mois si pas encore assez d'historique manuel
        const now = new Date();
        const moisNoms = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
        const base = parseFloat(currentVal || 0);
        const factors = [0.75, 0.82, 0.88, 0.92, 0.96, 1.0];
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            labels.push(`${moisNoms[d.getMonth()]} ${d.getFullYear()}`);
            dataPoints.push(Number((base * factors[5 - i]).toFixed(2)));
        }
    }

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Valeur du portefeuille',
                data: dataPoints,
                borderColor: '#2563eb',
                backgroundColor: 'rgba(37, 99, 235, 0.1)',
                tension: 0.35,
                fill: true,
                pointRadius: 4,
                pointHoverRadius: 6,
                pointBackgroundColor: '#2563eb',
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(ctx) { return ` Valeur : ${fmt(ctx.parsed.y)}`; }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    grid: { color: 'rgba(255, 255, 255, 0.05)' }
                },
                x: {
                    grid: { display: false }
                }
            }
        }
    });
}

function renderMonthlyValuationsTable(pfx, valuations, mode) {
    const tbody = document.getElementById(`${pfx}MonthlyTableBody`);
    if (!tbody) return;

    if (!valuations || valuations.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="empty-state">Aucun relevé mensuel saisi. Cliquez sur "Ajouter / Ajuster la valeur du mois" pour commencer votre suivi.</td></tr>';
        return;
    }

    const sorted = [...valuations].sort((a, b) => b.mois.localeCompare(a.mois));
    tbody.innerHTML = sorted.map((v, idx) => {
        const [y, m] = v.mois.split('-');
        const moisNoms = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
        const moisLabel = `${moisNoms[parseInt(m) - 1] || m} ${y}`;
        
        const prev = sorted[idx + 1];
        let diffPct = 0;
        if (prev && prev.valeur > 0) {
            diffPct = ((v.valeur - prev.valeur) / prev.valeur) * 100;
        }

        return `
        <tr>
            <td style="font-weight:600;">${moisLabel}</td>
            <td style="font-weight:700; color:var(--text-primary);">${fmt(v.valeur)}</td>
            <td style="color:var(--success-color); font-weight:600;">${v.apport_mensuel > 0 ? '+' + fmt(v.apport_mensuel) : '—'}</td>
            <td>
                ${diffPct !== 0 ? `<span class="${diffPct >= 0 ? 'positive' : 'negative'}">${diffPct >= 0 ? '+' : ''}${diffPct.toFixed(1)}%</span>` : '—'}
            </td>
            <td style="text-align:right;">
                <button class="btn-icon" onclick="deleteMonthlyValuationRow('${v.id}', '${mode}')" title="Supprimer ce mois">
                    <i data-lucide="trash-2"></i>
                </button>
            </td>
        </tr>`;
    }).join('');

    if (window.lucide) lucide.createIcons();
}

window.deleteMonthlyValuationRow = async function(id, mode) {
    if (!confirm('Supprimer cette valorisation mensuelle ?')) return;
    if (window.dataManager && typeof dataManager.deleteAccountValuation === 'function') {
        await dataManager.deleteAccountValuation(id);
        showToast('Ligne mensuelle supprimée', 'info');
        await updateInvestmentPage(mode);
        await updateComptes();
    }
};

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
            <td>${escapeHTML(new Date(t.date).toLocaleDateString('fr-FR'))}</td>
            <td><span class="compte-type" style="color:${isAchat ? 'var(--success-color)' : 'var(--danger-color)'}; background:${isAchat ? 'var(--success-subtle)' : 'var(--danger-subtle)'}; border-color:${isAchat ? 'rgba(5,150,105,0.25)' : 'rgba(220,38,38,0.25)'}">${isAchat ? 'Achat' : 'Vente'}</span></td>
            <td>${escapeHTML(t.titre || '—')}</td>
            <td>${escapeHTML(t.quantite || 0)}</td>
            <td>${escapeHTML(fmt(t.prix_unitaire))}</td>
            <td style="font-weight:600;">${escapeHTML(fmt(total))}</td>
            <td style="text-align:right;"><button class="btn-icon" onclick="window._deleteInvestment('${mode}','${t.id}')" title="Supprimer"><i data-lucide="trash-2"></i></button></td>
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
// Variables de filtrage biens
window._allBiens = [];
window._activeBienFilter = 'all';

window.filterBiensCategory = async function(filter) {
    window._activeBienFilter = filter;
    document.querySelectorAll('#page-autres-biens .filter-chip').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === filter);
    });
    await renderBiensList();
};

async function renderBiensList() {
    const cont = document.getElementById('biensContainer');
    if (!cont) return;
    
    const biens = window._allBiens || [];
    const filter = window._activeBienFilter || 'all';
    
    let filtered = biens;
    if (filter !== 'all') {
        filtered = biens.filter(b => (b.type || '').toLowerCase() === filter.toLowerCase());
    }
    
    const totalBiens = biens.reduce((s, b) => s + parseFloat(b.solde || 0), 0);
    
    const typeMeta = {
        'immobilier': { label: 'Immobilier', icon: 'home' },
        'vehicule': { label: 'Véhicule', icon: 'car' },
        'objet-valeur': { label: 'Objet d\'art & Valeur', icon: 'gem' },
        'autre': { label: 'Autre actif', icon: 'package' }
    };
    
    if (!filtered.length) {
        cont.innerHTML = '<p class="empty-state" style="grid-column: 1 / -1;">Aucun bien dans cette catégorie</p>';
        return;
    }

    const cardPromises = filtered.map(async (b) => {
        const t = (b.type || 'autre').toLowerCase();
        const meta = typeMeta[t] || { label: b.type || 'Bien', icon: 'package' };
        const pct = totalBiens > 0 ? ((parseFloat(b.solde || 0) / totalBiens) * 100).toFixed(1) : 0;
        
        // Données d'évolution mensuelle pour la sparkline
        const sparkVals = await getSparklineDataForAccount(b.id, b.type, b.solde);
        const isPos = sparkVals[sparkVals.length - 1] >= sparkVals[0];
        const diff = sparkVals[sparkVals.length - 1] - sparkVals[sparkVals.length - 2];
        const sparkSvg = window.generateSparklineSvg 
            ? window.generateSparklineSvg(sparkVals, { isPositive: isPos, strokeColor: isPos ? '#10b981' : '#f59e0b' }) 
            : '';

        const lastEvalDate = b.date_now ? new Date(b.date_now).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' }) : 'Récent';

        return `
        <div class="card bien-card">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
                <div style="display:flex; align-items:center; gap:6px;">
                    <i data-lucide="${meta.icon}" style="width:16px;height:16px;color:var(--text-secondary);"></i>
                    <span class="bien-type" style="margin-bottom:0;">${meta.label}</span>
                </div>
                <span class="compte-evolution-badge ${isPos ? 'positive' : 'neutral'}">
                    ${diff >= 0 ? '+' : ''}${fmt(diff)} ce mois
                </span>
            </div>
            <h3 style="font-size:16px; margin: 4px 0 6px 0;">${escapeHTML(b.nom)}</h3>
            <div class="bien-value">${fmt(b.solde)}</div>
            
            <!-- Mini courbe d'évolution mensuelle -->
            <div class="account-sparkline-wrap" style="margin: 8px 0;">
                ${sparkSvg}
            </div>

            <div style="font-size:11.5px; color:var(--text-tertiary); margin-bottom:8px; display:flex; justify-content:space-between;">
                <span>Part : ${pct}% de l'actif</span>
                <span>Estimé : ${lastEvalDate}</span>
            </div>

            ${b.fournisseur ? `<p style="font-size:12px; color:var(--text-secondary); margin-bottom:12px; line-height:1.4; background:var(--bg-secondary); padding:6px 8px; border-radius:var(--radius-sm);">${escapeHTML(b.fournisseur)}</p>` : ''}
            
            <div style="display:flex; gap:6px; margin-top:8px; flex-wrap:wrap;">
                <button class="btn-primary" style="flex:1.4; font-size:12px; padding:6px 10px; display:flex; align-items:center; justify-content:center; gap:5px;" onclick="openAiReevaluateModal('${b.id}')">
                    <i data-lucide="sparkles" style="width:13px;height:13px;"></i> Réévaluer avec l'IA
                </button>
                <button class="btn-secondary" style="font-size:12px; padding:6px 8px; display:flex; align-items:center; gap:4px;" onclick="openEditBienComment('${b.id}')" title="Ajouter / Modifier les commentaires et précisions pour l'IA">
                    <i data-lucide="message-square" style="width:13px;height:13px;"></i> Commentaire
                </button>
                <button class="btn-secondary" style="font-size:12px; padding:6px 8px;" onclick="window._editBien('${b.id}', '${escapeHTML(b.nom)}', ${b.solde}, '${escapeHTML(b.fournisseur || '')}')" title="Modifier valeur manuelle">
                    <i data-lucide="pencil" style="width:13px;height:13px;"></i>
                </button>
                <button class="btn-danger" style="font-size:12px; padding:6px 8px;" onclick="window._deleteBien('${b.id}')" title="Supprimer">
                    <i data-lucide="trash-2" style="width:13px;height:13px;"></i>
                </button>
            </div>
        </div>`;
    });

    const cardsHtml = await Promise.all(cardPromises);
    cont.innerHTML = cardsHtml.join('');
    if (window.lucide) lucide.createIcons();
}

async function updateAutresBiens() {
    const biens = await dataManager.getBiens();
    window._allBiens = biens;
    
    // Calculs synthétiques
    const totalBiens = biens.reduce((s, b) => s + parseFloat(b.solde || 0), 0);
    
    const catTotals = { immobilier: 0, vehicule: 0, 'objet-valeur': 0, autre: 0 };
    const catCounts = { immobilier: 0, vehicule: 0, 'objet-valeur': 0, autre: 0 };
    
    biens.forEach(b => {
        const t = (b.type || 'autre').toLowerCase();
        if (catTotals[t] !== undefined) {
            catTotals[t] += parseFloat(b.solde || 0);
            catCounts[t] += 1;
        } else {
            catTotals.autre += parseFloat(b.solde || 0);
            catCounts.autre += 1;
        }
    });
    
    // Mettre à jour les indicateurs du bandeau récapitulatif
    const elTotVal = document.getElementById('biensTotalVal');
    if (elTotVal) elTotVal.textContent = fmt(totalBiens);
    
    const elBadge = document.getElementById('biensContributionBadge');
    if (elBadge) {
        const globalTot = window.patrimoineGlobal?.total || 0;
        const pctGlobal = globalTot > 0 ? ((totalBiens / globalTot) * 100).toFixed(1) : 0;
        elBadge.textContent = `Part dans le patrimoine total : ${pctGlobal}% (${biens.length} actif(s))`;
    }
    
    const elImmo = document.getElementById('biensTotalImmo');
    if (elImmo) elImmo.textContent = fmt(catTotals.immobilier);
    const elCountImmo = document.getElementById('biensCountImmo');
    if (elCountImmo) elCountImmo.textContent = `${catCounts.immobilier} bien(s)`;
    
    const elVeh = document.getElementById('biensTotalVehicules');
    if (elVeh) elVeh.textContent = fmt(catTotals.vehicule);
    const elCountVeh = document.getElementById('biensCountVehicules');
    if (elCountVeh) elCountVeh.textContent = `${catCounts.vehicule} véhicule(s)`;
    
    const elObj = document.getElementById('biensTotalObjets');
    if (elObj) elObj.textContent = fmt(catTotals['objet-valeur']);
    const elCountObj = document.getElementById('biensCountObjets');
    if (elCountObj) elCountObj.textContent = `${catCounts['objet-valeur']} objet(s)`;
    
    const elAut = document.getElementById('biensTotalAutres');
    if (elAut) elAut.textContent = fmt(catTotals.autre);
    const elCountAut = document.getElementById('biensCountAutres');
    if (elCountAut) elCountAut.textContent = `${catCounts.autre} bien(s)`;
    
    renderBiensList();
    
    if (window.lucide) lucide.createIcons();
}

// =============================================================================
// PAGE FLUX// PAGE FLUX
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
    renderSankeyDiagram(e, s);
    
    // Maj le Sankey quand on change de mois
    const filterSelect = document.getElementById('sankeyMonthFilter');
    if (filterSelect) {
        filterSelect.onchange = () => renderSankeyDiagram(e, s);
    }
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
            <td>${escapeHTML(new Date(i.date).toLocaleDateString('fr-FR'))}</td>
            <td><span class="compte-type">${escapeHTML(i.categorie)}</span></td>
            <td>${escapeHTML(i.description || '—')}</td>
            <td class="${isE?'positive':'negative'}">${escapeHTML(fmt(i.montant))}</td>
            <td style="text-align:right;"><button class="btn-icon" onclick="window._deleteCashFlow('${type}','${i.id}')" title="Supprimer"><i data-lucide="trash-2"></i></button></td>
        </tr>`).join('')
        : `<tr><td colspan="5" class="empty-state">Aucune donnée</td></tr>`;

    // Graphiques avec support du filtrage par date
    window._rawCashFlowData = window._rawCashFlowData || {};
    window._rawCashFlowData[type] = data;

    if (typeof window.filterCashFlowChartByPeriod === 'function') {
        window.filterCashFlowChartByPeriod(type);
    } else {
        renderCashFlowCategoryChart(type, data);
    }
    renderCashFlowEvolutionChart(type, data);
}

// =============================================================================
// PAGE PROFIL & PARAMÈTRES
// =============================================================================
let currentAvatarData = null; // Stocke temporairement l'avatar sélectionné

async function updateProfil() {
    const [p, connexions, nbTransactions] = await Promise.all([
        dataManager.getProfile(),
        dataManager.getConnexions(),
        dataManager.countAllTransactions()
    ]);
    
    document.getElementById('profilNom').value   = p.nom       || '';
    document.getElementById('profilEmail').value = p.email     || '';
    document.getElementById('profilTel').value   = p.telephone || '';
    
    // Charger l'avatar
    if (p.avatar_url) {
        displayAvatar(p.avatar_url);
    } else {
        document.getElementById('profilAvatarImg').style.display = 'none';
        document.getElementById('profilAvatarPlaceholder').style.display = 'flex';
    }
    
    // Stats
    if (connexions && connexions.length > 0) {
        // Membre depuis (première connexion)
        const premiereConnexion = connexions[connexions.length - 1].date_connexion;
        const dateDebut = new Date(premiereConnexion);
        document.getElementById('membreDepuis').textContent = dateDebut.toLocaleDateString('fr-FR');
    }
    
    // Nombre de transactions
    document.getElementById('nombreTransactions').textContent = nbTransactions;
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
        '1': './images/logo.png',
        '2': './images/avatar.png',
        '3': 'https://upload.wikimedia.org/wikipedia/commons/d/d4/Warren_Buffett_at_the_2015_SelectUSA_Investment_Summit_%28cropped%29.jpg',
        // 4. Graphique de Trading (Généré en code SVG pur, chandeliers japonais)
        '4': 'data:image/svg+xml;charset=utf8,' + encodeURIComponent(`
            <svg width="200" height="200" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
                <rect width="200" height="200" fill="#0f172a"/>
                <path d="M0 150 L200 150" stroke="#334155" stroke-width="1" stroke-dasharray="4,4"/>
                <path d="M0 100 L200 100" stroke="#334155" stroke-width="1" stroke-dasharray="4,4"/>
                <path d="M0 50 L200 50" stroke="#334155" stroke-width="1" stroke-dasharray="4,4"/>
                <line x1="40" y1="80" x2="40" y2="160" stroke="#ef4444" stroke-width="2"/>
                <rect x="30" y="100" width="20" height="40" fill="#ef4444" rx="2"/>
                <line x1="80" y1="30" x2="80" y2="130" stroke="#10b981" stroke-width="2"/>
                <rect x="70" y="50" width="20" height="60" fill="#10b981" rx="2"/>
                <line x1="120" y1="70" x2="120" y2="140" stroke="#ef4444" stroke-width="2"/>
                <rect x="110" y="80" width="20" height="30" fill="#ef4444" rx="2"/>
                <line x1="160" y1="20" x2="160" y2="100" stroke="#10b981" stroke-width="2"/>
                <rect x="150" y="40" width="20" height="50" fill="#10b981" rx="2"/>
                <path d="M40 120 L80 80 L120 95 L160 65" fill="none" stroke="#3b82f6" stroke-width="4" stroke-linecap="round"/>
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
    const themeEl = document.getElementById('settingTheme');
    if (themeEl) themeEl.value = s.theme || 'light';
    const deviseEl = document.getElementById('settingDevise');
    if (deviseEl) deviseEl.value = s.devise || 'EUR';

    // Synchronisation Assistant IA
    const isAiActive = localStorage.getItem('welcker_chatbot_enabled') !== 'false';
    const toggleAi = document.getElementById('toggleChatbotActive');
    const aiContainer = document.getElementById('chatbotSettingsContainer');
    const aiKeyInput = document.getElementById('settingGeminiApiKey');
    const aiPersonaSelect = document.getElementById('settingGeminiPersona');

    if (toggleAi) toggleAi.checked = isAiActive;
    if (aiContainer) aiContainer.style.display = isAiActive ? 'block' : 'none';
    if (aiKeyInput) aiKeyInput.value = localStorage.getItem('welcker_gemini_api_key') || '';
    if (aiPersonaSelect) aiPersonaSelect.value = localStorage.getItem('welcker_gemini_persona') || 'wealth_manager';
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
// EXPOSER LES FONCTIONS GLOBALEMENT (pour onclick dans HTML)
// =============================================================================

window.selectPresetAvatar = selectPresetAvatar;
window.handleAvatarUpload = handleAvatarUpload;
window.displayAvatar = displayAvatar;
window.saveProfile = saveProfile;
window.updateParametres = updateParametres;
window.changeTheme = changeTheme;

// =============================================================================
// MODALE & LOGIQUE DE RÉÉVALUATION IA DES ACTIFS / BIENS (GEMINI)
// =============================================================================
let _currentReevaluateBienId = null;

window.openAiReevaluateModal = function(bienId) {
    _currentReevaluateBienId = bienId;
    const biens = window._allBiens || [];
    const b = biens.find(item => item.id === bienId);
    if (!b) return;

    const modal = document.getElementById('modalAiReevaluateBien');
    if (!modal) return;

    document.getElementById('aiReevalBienNom').textContent = b.nom;
    document.getElementById('aiReevalBienType').textContent = (b.type || 'Bien').toUpperCase();
    document.getElementById('aiReevalCurrentVal').textContent = fmt(b.solde);

    // Initialiser les champs selon le type de bien
    const t = (b.type || 'autre').toLowerCase();
    document.getElementById('aiReevalVehiculeFields').style.display = t === 'vehicule' ? 'block' : 'none';
    document.getElementById('aiReevalImmoFields').style.display = t === 'immobilier' ? 'block' : 'none';
    document.getElementById('aiReevalObjetFields').style.display = t === 'objet-valeur' ? 'block' : 'none';
    document.getElementById('aiReevalAutreFields').style.display = (t !== 'vehicule' && t !== 'immobilier' && t !== 'objet-valeur') ? 'block' : 'none';

    // Préremplir des valeurs par défaut intelligentes
    if (t === 'vehicule') {
        const vModel = document.getElementById('aiVehiculeModel');
        if (vModel && !vModel.value) vModel.value = b.nom || 'Renault Clio 4';
    } else if (t === 'immobilier') {
        const iVille = document.getElementById('aiImmoVille');
        if (iVille && !iVille.value) iVille.value = 'France';
    } else if (t === 'objet-valeur') {
        const oNom = document.getElementById('aiObjetNom');
        if (oNom && !oNom.value) oNom.value = b.nom;
    }

    // Réinitialiser la zone de résultat
    const resDiv = document.getElementById('aiReevalResultContainer');
    if (resDiv) resDiv.style.display = 'none';

    // Remplir uniquement le champ de commentaires unifié
    const userCommentsInput = document.getElementById('aiReevalUserComments');
    if (userCommentsInput) userCommentsInput.value = b.fournisseur || '';

    modal.classList.add('active');
    if (window.lucide) lucide.createIcons();
};

window.calculateAiValuation = async function() {
    const bienId = _currentReevaluateBienId;
    const biens = window._allBiens || [];
    const b = biens.find(item => item.id === bienId);
    if (!b) return;

    const calcBtn = document.getElementById('aiCalculateValuationBtn');
    if (calcBtn) {
        calcBtn.disabled = true;
        calcBtn.innerHTML = '<i data-lucide="loader" class="ai-spin"></i> Décision de l\'IA en cours...';
    }

    try {
        const t = (b.type || 'autre').toLowerCase();
        let promptDetails = '';

        const userComments = document.getElementById('aiReevalUserComments')?.value || b.fournisseur || '';

        if (t === 'vehicule') {
            const model = document.getElementById('aiVehiculeModel')?.value || b.nom;
            const annee = document.getElementById('aiVehiculeAnnee')?.value || '2018';
            const km = document.getElementById('aiVehiculeKm')?.value || '90 000 km';
            const etat = document.getElementById('aiVehiculeEtat')?.value || 'Bon état';
            const carburant = document.getElementById('aiVehiculeCarburant')?.value || 'Essence';
            promptDetails = `VÉHICULE : Modèle "${model}", Année ${annee}, Kilométrage ${km}, Carburant ${carburant}, État général "${etat}".`;
        } else if (t === 'immobilier') {
            const surface = document.getElementById('aiImmoSurface')?.value || '50 m²';
            const ville = document.getElementById('aiImmoVille')?.value || 'France';
            const typeImmo = document.getElementById('aiImmoType')?.value || 'Appartement';
            const etat = document.getElementById('aiImmoEtat')?.value || 'Bon état';
            promptDetails = `IMMOBILIER : Type "${typeImmo}", Surface ${surface}, Localisation/Ville "${ville}", État "${etat}".`;
        } else if (t === 'objet-valeur') {
            const nom = document.getElementById('aiObjetNom')?.value || b.nom;
            const marque = document.getElementById('aiObjetMarque')?.value || '';
            const etat = document.getElementById('aiObjetEtat')?.value || 'Très bon état';
            const papiers = document.getElementById('aiObjetPapiers')?.value || 'Oui';
            promptDetails = `OBJET DE VALEUR / ART : "${nom}", Marque/Référence "${marque}", État "${etat}", Boîte & Papiers d'origine : ${papiers}.`;
        } else {
            const desc = document.getElementById('aiAutreDescription')?.value || b.nom;
            const prixOrig = document.getElementById('aiAutrePrixOrigine')?.value || b.solde;
            promptDetails = `ACTIF MATÉRIEL DIVERS : Description "${desc}", Prix d'acquisition de référence ${prixOrig} €.`;
        }

        const promptText = `Tu es un expert indépendant de premier plan en cotation et estimation de patrimoine en France.
Nous sommes en novembre 2026.
Analyse avec la plus grande rigueur les caractéristiques et les commentaires précis de ce bien pour décider de sa valeur vénale finale la plus juste et réaliste possible (prix net vendeur en euros) :

${promptDetails}
Commentaires et historique saisis par l'utilisateur : "${userComments}"
Valeur précédemment enregistrée : ${b.solde} €

RÈGLE IMPÉRATIVE : L'utilisateur ne veut AUCUNE explication ni blabla. Tu dois décider de la valeur finale unique exacte en euros.
Réponds STRICTEMENT par un JSON valide (sans aucun texte autour) au format :
{
  "valeur_estimee": 6400
}`;

        const response = await window.callGeminiGeneric(promptText, 'Tu es un expert indépendant en estimation d\'actifs et valorisation de patrimoine.');
        
        let jsonStr = response.trim();
        const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
        if (jsonMatch) jsonStr = jsonMatch[0];

        const result = JSON.parse(jsonStr);
        window._pendingAiValuation = {
            bienId: b.id,
            valeur: result.valeur_estimee,
            userComments: userComments
        };

        // Afficher UNIQUEMENT la valeur finale décidée sans explications
        const resDiv = document.getElementById('aiReevalResultContainer');
        if (resDiv) {
            resDiv.style.display = 'block';
            const valEl = document.getElementById('aiReevalResultValue');
            if (valEl) valEl.textContent = fmt(result.valeur_estimee);
        }

    } catch (err) {
        console.error('Erreur estimation IA:', err);
        showToast('Erreur lors de l\'estimation : ' + (err.message || 'Vérifiez votre clé API Gemini'), 'error');
    } finally {
        if (calcBtn) {
            calcBtn.disabled = false;
            calcBtn.innerHTML = '<i data-lucide="sparkles"></i> Calculer l\'estimation avec l\'IA';
            if (window.lucide) lucide.createIcons();
        }
    }
};

window.applyAiValuation = async function() {
    const pending = window._pendingAiValuation;
    if (!pending) return;

    const currentMonth = new Date().toISOString().substring(0, 7);

    // Mettre à jour le solde et les commentaires dans accounts
    await sb.from('accounts').update({
        solde: pending.valeur,
        fournisseur: pending.userComments || null,
        date_now: new Date().toISOString()
    }).eq('id', pending.bienId);

    // Enregistrer l'historique dans account_valuations
    if (window.dataManager && typeof dataManager.saveAccountValuation === 'function') {
        await dataManager.saveAccountValuation({
            accountId: pending.bienId,
            mois: currentMonth,
            valeur: pending.valeur,
            notes: pending.userComments || null
        });
    }

    const modal = document.getElementById('modalAiReevaluateBien');
    if (modal) modal.classList.remove('active');

    showToast('Valeur mise à jour avec succès !', 'success');
    window._pendingAiValuation = null;

    await updateAutresBiens();
    await updateAccueil();
};

// =============================================================================
// SUIVI SIMPLIFIÉ DES INVESTISSEMENTS (CTO, PEA, CRYPTO)
// =============================================================================
window.openMonthlyValuationModal = async function(type) {
    const modal = document.getElementById('modalMonthlyValuation');
    if (!modal) return;

    document.getElementById('monthlyValuationType').value = type;
    document.getElementById('monthlyValuationTitle').textContent = `Ajouter / Ajuster la valeur : ${type.toUpperCase()}`;

    const now = new Date();
    const curMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const inputMonth = document.getElementById('monthlyValuationMonth');
    if (inputMonth) inputMonth.value = curMonth;

    // Récupérer le solde actuel
    let curVal = 0;
    if (type === 'CTO') curVal = parseFloat(document.getElementById('ctoAmount')?.textContent?.replace(/[^0-9,-]/g, '').replace(',', '.') || 0);
    if (type === 'PEA') curVal = parseFloat(document.getElementById('peaAmount')?.textContent?.replace(/[^0-9,-]/g, '').replace(',', '.') || 0);
    if (type === 'CRYPTO') curVal = parseFloat(document.getElementById('cryptoAmount')?.textContent?.replace(/[^0-9,-]/g, '').replace(',', '.') || 0);

    const inputVal = document.getElementById('monthlyValuationValue');
    if (inputVal) inputVal.value = curVal > 0 ? curVal : '';

    modal.classList.add('active');
    if (window.lucide) lucide.createIcons();
};

window.saveMonthlyValuationForm = async function(e) {
    if (e) e.preventDefault();

    const type = document.getElementById('monthlyValuationType').value;
    const mois = document.getElementById('monthlyValuationMonth').value;
    const valeur = parseFloat(document.getElementById('monthlyValuationValue').value || 0);
    const apport = parseFloat(document.getElementById('monthlyValuationApport').value || 0);
    const notes = document.getElementById('monthlyValuationNotes')?.value || '';

    if (!mois || isNaN(valeur) || valeur <= 0) {
        showToast('Veuillez saisir un mois et une valorisation valide', 'error');
        return;
    }

    if (window.dataManager && typeof dataManager.saveAccountValuation === 'function') {
        await dataManager.saveAccountValuation({
            accountType: type,
            mois: mois,
            valeur: valeur,
            apportMensuel: apport,
            notes: notes
        });
    }

    const modal = document.getElementById('modalMonthlyValuation');
    if (modal) modal.classList.remove('active');

    showToast(`Valeur ${type} enregistrée pour ${mois} !`, 'success');

    await updateInvestmentPage(type);
    await updateComptes();
};


// =============================================================================
// MODALE SAISIR NOUVELLE VALEUR RAPIDE (DIRECTEMENT DEPUIS LA CARTE)
// =============================================================================
window.openSaisirNouvelleValeur = function(id, nom, currentVal, type) {
    const modal = document.getElementById('modalSaisirNouvelleValeur');
    if (!modal) return;
    document.getElementById('saisieCompteId').value = id || '';
    document.getElementById('saisieCompteType').value = type || 'courant';
    document.getElementById('saisieCompteNom').textContent = nom;
    document.getElementById('saisieCompteCurrentVal').textContent = fmt(currentVal);
    
    const valInput = document.getElementById('saisieCompteNouvelleValeur');
    if (valInput) {
        valInput.value = (currentVal !== undefined && currentVal !== null) ? parseFloat(currentVal).toFixed(2) : '0.00';
        setTimeout(() => { valInput.focus(); valInput.select(); }, 150);
    }

    const dateInput = document.getElementById('saisieCompteDate');
    if (dateInput) {
        dateInput.value = new Date().toISOString().split('T')[0];
    }

    openModal('modalSaisirNouvelleValeur');
};

window.saveSaisirNouvelleValeur = async function(e) {
    if (e) e.preventDefault();
    const id = document.getElementById('saisieCompteId').value;
    const type = document.getElementById('saisieCompteType').value;
    const valInput = document.getElementById('saisieCompteNouvelleValeur');
    const newVal = parseFloat(valInput.value || 0);

    if (isNaN(newVal) || newVal < 0) {
        showToast('Veuillez saisir une valeur numérique positive', 'error');
        return;
    }

    const curMonth = new Date().toISOString().substring(0, 7);

    try {
        if (id) {
            // Mise à jour du solde du compte bancaire
            await sb.from('accounts').update({
                solde: newVal,
                date_now: new Date().toISOString()
            }).eq('id', id);

            if (window.dataManager && typeof dataManager.saveAccountValuation === 'function') {
                await dataManager.saveAccountValuation({
                    accountId: id,
                    accountType: type,
                    mois: curMonth,
                    valeur: newVal
                });
            }
        } else {
            // CTO, PEA ou CRYPTO : calculer le delta et ajuster la trésorerie associée
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

            const delta = newVal - currentVal;
            if (Math.abs(delta) >= 0.01) {
                const today = new Date().toISOString().split('T')[0];
                await dataManager.addCashTransaction(type, {
                    type: delta > 0 ? 'depot' : 'retrait',
                    montant: Math.abs(delta),
                    description: `Ajustement direct valorisation (${delta > 0 ? '+' : ''}${delta.toFixed(2)} €)`,
                    date: today
                });
            }

            if (window.dataManager && typeof dataManager.saveAccountValuation === 'function') {
                await dataManager.saveAccountValuation({
                    accountType: type,
                    mois: curMonth,
                    valeur: newVal
                });
            }
        }

        closeModal('modalSaisirNouvelleValeur');
        showToast('Nouvelle valeur enregistrée !', 'success');

        await updateComptes();
        await updateAccueil();
    } catch (err) {
        console.error('Erreur save nouvelle valeur:', err);
        showToast('Erreur lors de l\'enregistrement : ' + err.message, 'error');
    }
};

// =============================================================================
// GESTION DES COMMENTAIRES D'EXPERTISE POUR L'IA (BIENS)
// =============================================================================
window.openEditBienComment = function(bienId) {
    const biens = window._allBiens || [];
    const b = biens.find(item => item.id === bienId);
    if (!b) return;

    const modal = document.getElementById('modalEditBienComment');
    if (!modal) return;

    document.getElementById('editBienCommentId').value = b.id;
    document.getElementById('editBienCommentNom').textContent = b.nom;
    const textEl = document.getElementById('editBienCommentText');
    if (textEl) textEl.value = b.fournisseur || '';

    modal.classList.add('active');
    if (window.lucide) lucide.createIcons();
};

window.saveBienCommentForm = async function(e) {
    if (e) e.preventDefault();
    const id = document.getElementById('editBienCommentId').value;
    const notes = document.getElementById('editBienCommentText')?.value || '';

    const { error } = await sb.from('accounts').update({
        fournisseur: notes.trim() || null
    }).eq('id', id);

    if (error) {
        showToast('Erreur mise à jour commentaire : ' + error.message, 'error');
        return;
    }

    closeModal('modalEditBienComment');
    showToast('Commentaires pour l\'IA enregistrés !', 'success');

    await updateAutresBiens();
};
