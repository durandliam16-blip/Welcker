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
                backgroundColor: ['#10b981','#2563eb','#f59e0b'] 
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
async function updateComptes() {
    const [accs, cto, pea, crypto, ctoCash, peaCash, cryptoCash] = await Promise.all([
        dataManager.getBankAccounts(),
        dataManager.getInvestments('CTO'),
        dataManager.getInvestments('PEA'),
        dataManager.getCryptoTransactions(),  // ← AJOUTÉ
        dataManager.getCashTransactions('CTO'),
        dataManager.getCashTransactions('PEA'),
        dataManager.getCashTransactions('CRYPTO')  // ← AJOUTÉ
    ]);
    
    const ctoStats = calcStatsPro(cto, ctoCash);
    const peaStats = calcStatsPro(pea, peaCash);
    const cryptoStats = calcStatsPro(crypto, cryptoCash);  // ← AJOUTÉ
    
    document.getElementById('ctoAmount').textContent = fmt(ctoStats.totalPortefeuille);
    document.getElementById('peaAmount').textContent = fmt(peaStats.totalPortefeuille);
    document.getElementById('cryptoAmount').textContent = fmt(cryptoStats.totalPortefeuille);  // ← AJOUTÉ
    
    document.getElementById('ctoEvolution').innerHTML = `<span class="${ctoStats.performance >= 0 ? 'positive' : 'negative'}">${ctoStats.performance >= 0 ? '+' : ''}${ctoStats.performance.toFixed(2)}%</span>`;
    document.getElementById('peaEvolution').innerHTML = `<span class="${peaStats.performance >= 0 ? 'positive' : 'negative'}">${peaStats.performance >= 0 ? '+' : ''}${peaStats.performance.toFixed(2)}%</span>`;
    document.getElementById('cryptoEvolution').innerHTML = `<span class="${cryptoStats.performance >= 0 ? 'positive' : 'negative'}">${cryptoStats.performance >= 0 ? '+' : ''}${cryptoStats.performance.toFixed(2)}%</span>`;  // ← AJOUTÉ
    
    const cont = document.getElementById('autresComptesContainer');
    cont.innerHTML = accs.length
        ? accs.map(a => {
            const typeLabels = {
                'courant': '💳 Courant',
                'epargne': '💰 Épargne',
                'livret': '📘 Livret',
                'investissement_passif': '📊 Inv. passif'
            };
            return `
            <div class="card compte-card">
                <div class="compte-header">
                    <h3>${a.nom}</h3>
                    <span class="compte-type">${typeLabels[a.type] || a.type || 'Compte'}</span>
                </div>
                <div class="compte-amount">${fmt(a.solde)}</div>
                <button class="btn-danger" style="margin-top:12px;width:100%;font-size:12px;padding:8px" onclick="window._deleteAccount('${a.id}')">
                    🗑️ Supprimer
                </button>
            </div>`;
        }).join('')
        : '<p class="empty-state">Aucun compte bancaire</p>';
}

// =============================================================================
// PAGE CTO / PEA
// =============================================================================
async function updateInvestmentPage(mode) {
    const pfx = mode.toLowerCase();
    const [transactions, cashTransactions] = await Promise.all([
        mode === 'CRYPTO' ? dataManager.getCryptoTransactions() : dataManager.getInvestments(mode),
        dataManager.getCashTransactions(mode)
    ]);
    
    const stats = calcStatsPro(transactions, cashTransactions);
    
    // Stats principales
    document.getElementById(`${pfx}Cash`).textContent = fmt(stats.cash);
    document.getElementById(`${pfx}ValeurActuelle`).textContent = fmt(stats.valorisation);
    document.getElementById(`${pfx}TotalPortefeuille`).textContent = fmt(stats.totalPortefeuille);
    document.getElementById(`${pfx}Performance`).textContent = `${stats.performance >= 0 ? '+' : ''}${stats.performance.toFixed(2)}%`;
    document.getElementById(`${pfx}PvRealisee`).textContent = fmt(stats.pvRealisee);
    document.getElementById(`${pfx}PvLatente`).textContent = fmt(stats.pvLatente);
    
    // Tableaux et graphiques
    renderPositionsTable(pfx, stats.positions);
    renderCashHistory(pfx, cashTransactions);
    renderPositionsChart(`${pfx}PositionsChart`, stats.positions);
    renderInvestTable(pfx, transactions, mode, stats);
    renderInvestChart(pfx, transactions);
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
            <td>${escapeHTML(new Date(t.date).toLocaleDateString('fr-FR'))}</td>
            <td><span class="compte-type" style="background:${isAchat?'#10b981':'#ef4444'};color:#fff">${isAchat?'Achat':'Vente'}</span></td>
            <td>${escapeHTML(t.titre || '—')}</td>
            <td>${escapeHTML(t.quantite || 0)}</td>
            <td>${escapeHTML(fmt(t.prix_unitaire))}</td>
            <td>${escapeHTML(fmt(total))}</td>
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
    // Graphiques
    renderCashFlowCategoryChart(type, data);
    renderCashFlowEvolutionChart(type, data);
}

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
// EXPOSER LES FONCTIONS GLOBALEMENT (pour onclick dans HTML)
// =============================================================================

window.selectPresetAvatar = selectPresetAvatar;
window.handleAvatarUpload = handleAvatarUpload;
window.displayAvatar = displayAvatar;
window.saveProfile = saveProfile;
window.updateParametres = updateParametres;
window.changeTheme = changeTheme;