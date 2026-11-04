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
        const canvas = document.getElementById(canvasId);
        if (canvas) {
            canvas.parentElement.innerHTML = '<p style="text-align:center;color:var(--text-secondary);padding:40px;">Aucune position</p>';
        }
        return;
    }
    
    // Grouper par catégorie
    const parCategorie = {};
    positions.forEach(p => {
        const cat = p.categorie || 'Autres';
        if (!parCategorie[cat]) {
            parCategorie[cat] = 0;
        }
        parCategorie[cat] += p.valorisation || 0;
    });
    
    // Libellés par catégorie sans emojis
    const labels = Object.keys(parCategorie);
    const data = Object.values(parCategorie);
    
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: [
                    '#2563eb',
                    '#059669',
                    '#64748b',
                    '#0284c7',
                    '#d97706',
                    '#475569',
                    '#0d9488'
                ]
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'bottom' },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${label}: ${fmt(value)} (${percentage}%)`;
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

// State for category drill-down
window._cashFlowDrilldownData = {
    entree: { data: null, category: null },
    sortie: { data: null, category: null }
};

window.resetCategoryDrilldown = function(type) {
    if (window._cashFlowDrilldownData[type] && window._cashFlowDrilldownData[type].data) {
        renderCashFlowCategoryChart(type, window._cashFlowDrilldownData[type].data, null);
    }
};

function renderCashFlowCategoryChart(type, data, selectedCategory = null) {
    const isE = type === 'entree';
    const canvasId = isE ? 'entreesChart' : 'depensesChart';
    const titleId = isE ? 'entreesCategoryChartTitle' : 'depensesCategoryChartTitle';
    const resetBtnId = isE ? 'entreesCategoryResetBtn' : 'depensesCategoryResetBtn';
    const subtitleId = isE ? 'entreesCategorySubtitle' : 'depensesCategorySubtitle';

    window._cashFlowDrilldownData[type] = { data, category: selectedCategory };

    const ctx = destroyChart(canvasId);
    if (!ctx || !data || data.length === 0) return;

    const titleEl = document.getElementById(titleId);
    const resetBtn = document.getElementById(resetBtnId);
    const subtitleEl = document.getElementById(subtitleId);

    const colors = [
        '#2563eb', '#059669', '#d97706', '#64748b', '#0284c7', 
        '#8b5cf6', '#0d9488', '#ea580c', '#4f46e5', '#16a34a',
        '#f43f5e', '#7c3aed', '#0891b2', '#ca8a04', '#475569'
    ];

    if (!selectedCategory) {
        // === VUE NIVEAU 1 : TOUTES LES CATÉGORIES ===
        if (titleEl) titleEl.innerHTML = `<i data-lucide="pie-chart"></i> Répartition par catégorie`;
        if (resetBtn) resetBtn.style.display = 'none';
        if (subtitleEl) {
            subtitleEl.innerHTML = `Cliquez sur une catégorie pour voir le détail des postes`;
        }

        const cats = {};
        data.forEach(i => {
            const cat = i.categorie || 'Autre';
            cats[cat] = (cats[cat] || 0) + parseFloat(i.montant || 0);
        });

        const moisUniques = new Set();
        data.forEach(i => moisUniques.add(i.date.substring(0, 7)));
        const nbMois = Math.max(moisUniques.size, 1);

        const labels = Object.keys(cats);
        const values = labels.map(c => cats[c] / nbMois);
        const total = values.reduce((a, b) => a + b, 0);

        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: values,
                    backgroundColor: colors.slice(0, labels.length)
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '62%',
                plugins: {
                    legend: { position: 'bottom', labels: { boxWidth: 12, padding: 10 } },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.parsed || 0;
                                const pct = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                                return ` ${label}: ${fmt(value)}/mois (${pct}%) — Cliquer pour détailler`;
                            }
                        }
                    }
                },
                onClick: (evt, activeEls, chart) => {
                    if (!activeEls || activeEls.length === 0) return;
                    const idx = activeEls[0].index;
                    const catName = chart.data.labels[idx];
                    renderCashFlowCategoryChart(type, data, catName);
                },
                onHover: (evt, activeEls) => {
                    evt.native.target.style.cursor = activeEls.length ? 'pointer' : 'default';
                }
            }
        });
    } else {
        // === VUE NIVEAU 2 : DÉTAIL DE LA CATÉGORIE SÉLECTIONNÉE (DRILL-DOWN) ===
        const catNorm = selectedCategory.trim().toLowerCase();
        const items = data.filter(i => (i.categorie || '').trim().toLowerCase() === catNorm);

        if (titleEl) {
            titleEl.innerHTML = `<i data-lucide="layers"></i> Détail · <span style="color:var(--primary-color);text-transform:capitalize;">${selectedCategory}</span>`;
        }
        if (resetBtn) resetBtn.style.display = 'inline-flex';

        // Grouper par description harmonisée
        const subs = {};
        items.forEach(i => {
            let desc = (i.description || 'Divers').trim();
            if (desc.length > 0) {
                const lower = desc.toLowerCase();
                if (lower === 'blablacar') desc = 'BlaBlaCar';
                else if (lower === 'netflix') desc = 'Netflix';
                else if (lower === 'edf') desc = 'EDF';
                else if (lower === 'sncf') desc = 'SNCF';
                else if (lower === 'apl') desc = 'APL';
                else if (lower === 'caf') desc = 'CAF';
                else if (lower === 'visa') desc = 'Carte Bancaire / VISA';
                else if (lower === 'restos' || lower === 'resto') desc = 'Restaurants';
                else if (lower === 'kdo' || lower === 'kdos') desc = 'Cadeaux';
                else {
                    desc = desc.charAt(0).toUpperCase() + desc.slice(1);
                }
            }
            subs[desc] = (subs[desc] || 0) + parseFloat(i.montant || 0);
        });

        const subLabels = Object.keys(subs).sort((a, b) => subs[b] - subs[a]);
        const subValues = subLabels.map(l => subs[l]);
        const catTotal = subValues.reduce((a, b) => a + b, 0);

        if (subtitleEl) {
            subtitleEl.innerHTML = `Total : <strong>${fmt(catTotal)}</strong> (${items.length} opérations enregistrées)`;
        }

        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: subLabels,
                datasets: [{
                    data: subValues,
                    backgroundColor: colors.slice(0, subLabels.length)
                }]
            },
            options: {
                responsive: true,
                cutout: '58%',
                plugins: {
                    legend: { position: 'bottom', labels: { boxWidth: 12, padding: 10 } },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.parsed || 0;
                                const pct = catTotal > 0 ? ((value / catTotal) * 100).toFixed(1) : 0;
                                return ` ${label}: ${fmt(value)} (${pct}%)`;
                            }
                        }
                    }
                }
            }
        });
    }

    if (window.lucide) lucide.createIcons();
}

function renderCashFlowEvolutionChart(type, data) {
    const canvasId = type === 'entree' ? 'entreesEvolutionChart' : 'depensesEvolutionChart';
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
    
    // Couleurs selon le type
    const borderColor = type === 'entree' ? '#10b981' : '#ef4444';  // Vert ou Rouge
    const bgColor = type === 'entree' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)';  // Transparent
    
    new Chart(ctx, {
        type: 'line',  // Type courbe sinon "bar" pour histogramme
        data: {
            labels: labels.map(l => {
                const [y, m] = l.split('-');
                const moisNoms = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
                return `${moisNoms[parseInt(m) - 1]} ${y}`;
            }),
            datasets: [{
                label: type === 'entree' ? 'Entrées' : 'Dépenses',
                data: values,
                borderColor: borderColor,           // Couleur de la ligne
                backgroundColor: bgColor,            // Remplissage transparent
                tension: 0.4,                        // Courbe lisse
                fill: true,                          // Remplir sous la courbe
                pointRadius: 4,                      // Taille des points
                pointHoverRadius: 6,                 // Taille au survol
                pointBackgroundColor: borderColor,   // Couleur des points
                pointBorderColor: '#fff',            // Bordure blanche
                pointBorderWidth: 2                  // Épaisseur bordure
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: ${fmt(context.parsed.y)}`;
                        }
                    }
                }
            },
            interaction: {
                mode: 'nearest',
                axis: 'x',
                intersect: false
            },
            scales: {
                y: { 
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return fmt(value);
                        }
                    }
                }
            }
        }
    });
}

// =============================================================================
// SANKEY DIAGRAM - FLUX FINANCIERS
// =============================================================================

function renderSankeyDiagram(entrees, sorties) {
    const container = document.getElementById('sankeyDiagram');
    if (!container) return;
    
    // Filtrer par période sélectionnée
    const filterSelect = document.getElementById('sankeyMonthFilter');
    const filterValue = filterSelect ? filterSelect.value : 'all';
    
    let filteredEntrees = [...entrees];
    let filteredSorties = [...sorties];
    
    if (filterValue !== 'all') {
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();
        
        const filterByPeriod = (items) => {
            if (filterValue === '0') {
                // Ce mois-ci uniquement
                return items.filter(item => {
                    const d = new Date(item.date);
                    return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
                });
            } else if (filterValue === '1') {
                // Mois dernier uniquement
                const lastMonth = new Date(currentYear, currentMonth - 1, 1);
                const lastMonthYear = lastMonth.getFullYear();
                const lastMonthIndex = lastMonth.getMonth();
                return items.filter(item => {
                    const d = new Date(item.date);
                    return d.getFullYear() === lastMonthYear && d.getMonth() === lastMonthIndex;
                });
            } else {
                // X derniers mois (3, 6, 12)
                const monthsBack = parseInt(filterValue);
                return items.filter(item => {
                    const itemDate = new Date(item.date);
                    const monthsDiff = (currentYear - itemDate.getFullYear()) * 12 + 
                                    (currentMonth - itemDate.getMonth());
                    return monthsDiff >= 0 && monthsDiff < monthsBack;
                });
            }
        };
        
        filteredEntrees = filterByPeriod(entrees);
        filteredSorties = filterByPeriod(sorties);
    }
    
    // Grouper par catégorie
    const entreesParCategorie = {};
    const sortiesParCategorie = {};
    
    filteredEntrees.forEach(e => {
        const cat = e.categorie || 'Autres entrées';
        entreesParCategorie[cat] = (entreesParCategorie[cat] || 0) + parseFloat(e.montant || 0);
    });
    
    filteredSorties.forEach(s => {
        const cat = s.categorie || 'Autres dépenses';
        sortiesParCategorie[cat] = (sortiesParCategorie[cat] || 0) + parseFloat(s.montant || 0);
    });
    
    const totalEntrees = Object.values(entreesParCategorie).reduce((sum, v) => sum + v, 0);
    const totalSorties = Object.values(sortiesParCategorie).reduce((sum, v) => sum + v, 0);
    const economies = totalEntrees - totalSorties;
    
    // Si pas de données, afficher message
    if (totalEntrees === 0 && totalSorties === 0) {
        container.innerHTML = '<p class="empty-state" style="padding: 100px 20px; text-align: center; color: var(--text-secondary);">Aucune donnée pour la période sélectionnée</p>';
        return;
    }
    
    // Créer les nœuds (nodes)
    const nodes = [];
    const nodeLabels = [];
    const nodeColors = [];
    
    let nodeIndex = 0;
    const nodeMap = {};
    
    // 1. Nœuds d'entrée (gauche)
    Object.keys(entreesParCategorie).forEach(cat => {
        nodeMap[`entree_${cat}`] = nodeIndex;
        nodeLabels.push(`${cat}<br>${fmt(entreesParCategorie[cat])}`);
        nodeColors.push('#10b981');
        nodeIndex++;
    });
    
    // 2. Nœud central "Budget"
    const budgetIndex = nodeIndex;
    nodeLabels.push(`💰 Budget<br>${fmt(totalEntrees)}`);
    nodeColors.push('#2563eb');
    nodeIndex++;
    
    // 3. Nœuds de sortie (droite)
    Object.keys(sortiesParCategorie).forEach(cat => {
        nodeMap[`sortie_${cat}`] = nodeIndex;
        nodeLabels.push(`${cat}<br>${fmt(sortiesParCategorie[cat])}`);
        nodeColors.push('#ef4444');
        nodeIndex++;
    });
    
    // 4. Nœud économies (si positif)
    let economiesIndex = -1;
    if (economies > 0) {
        economiesIndex = nodeIndex;
        nodeLabels.push(`💎 Économies<br>${fmt(economies)}`);
        nodeColors.push('#f59e0b');
        nodeIndex++;
    }
    
    // Créer les liens (links)
    const sources = [];
    const targets = [];
    const values = [];
    const linkColors = [];
    
    // Liens : Entrées → Budget
    Object.entries(entreesParCategorie).forEach(([cat, montant]) => {
        sources.push(nodeMap[`entree_${cat}`]);
        targets.push(budgetIndex);
        values.push(montant);
        linkColors.push('rgba(16, 185, 129, 0.4)');
    });
    
    // Liens : Budget → Dépenses
    Object.entries(sortiesParCategorie).forEach(([cat, montant]) => {
        sources.push(budgetIndex);
        targets.push(nodeMap[`sortie_${cat}`]);
        values.push(montant);
        linkColors.push('rgba(239, 68, 68, 0.4)');
    });
    
    // Lien : Budget → Économies
    if (economies > 0) {
        sources.push(budgetIndex);
        targets.push(economiesIndex);
        values.push(economies);
        linkColors.push('rgba(245, 158, 11, 0.6)');
    }
    
    // Configuration Plotly
    const data = [{
        type: 'sankey',
        orientation: 'h',
        node: {
            pad: 15,
            thickness: 20,
            line: { color: 'white', width: 2 },
            label: nodeLabels,
            color: nodeColors,
            customdata: nodeLabels.map((label, i) => label.split('<br>')[0]),
            hovertemplate: '%{customdata}<br>%{value:,.2f} €<extra></extra>'
        },
        link: {
            source: sources,
            target: targets,
            value: values,
            color: linkColors,
            hovertemplate: '%{source.customdata} → %{target.customdata}<br>%{value:,.2f} €<extra></extra>'
        }
    }];
    
    const layout = {
        font: {
            family: 'Inter, sans-serif',
            size: 12,
            color: getComputedStyle(document.documentElement).getPropertyValue('--text-primary').trim()
        },
        plot_bgcolor: 'transparent',
        paper_bgcolor: 'transparent',
        margin: { l: 10, r: 10, t: 10, b: 10 },
        hoverlabel: {
            font: {
                family: 'Inter, sans-serif',
                size: 13
            }
        }
    };
    
    const config = {
        displayModeBar: true,
        displaylogo: false,
        modeBarButtonsToRemove: ['pan2d', 'lasso2d', 'select2d'],
        responsive: true
    };
    
    Plotly.newPlot('sankeyDiagram', data, layout, config);
}

// Exposer globalement
window.renderSankeyDiagram = renderSankeyDiagram;

// =============================================================================
// GRAPHIQUE ÉVOLUTION PATRIMOINE (historique réel)
// =============================================================================

async function renderPatrimoineEvolutionChart() {
    const canvas = document.getElementById('patrimoineChart');
    if (!canvas) return;
    
    const ctx = destroyChart('patrimoineChart');
    if (!ctx) return;
    
    /// Récupérer période sélectionnée
    const periodSelect = document.getElementById('patrimoineChartPeriod');
    const period = periodSelect ? periodSelect.value : '12';

    // Limiter la période maximale pour éviter la surcharge
    const maxMonths = 36; // 3 ans max
    const months = period === 'all' ? maxMonths : Math.min(parseInt(period), maxMonths);

    // Récupérer l'historique
    const history = await dataManager.getPatrimoineHistory(months);
    
    if (!history || history.length === 0) {
        canvas.parentElement.innerHTML = '<p style="text-align:center;color:var(--text-secondary);padding:100px 20px;">Aucun historique disponible. Utilisez le bouton "💾 Sauvegarder snapshot" pour commencer à enregistrer l\'évolution de votre patrimoine.</p>';
        return;
    }
    
    // Préparer les données
    const labels = history.map(h => new Date(h.date).toLocaleDateString('fr-FR', { 
        day: 'numeric', 
        month: 'short',
        year: history.length > 90 ? 'numeric' : undefined // Afficher année si > 3 mois
    }));
    
    const patrimoineData = history.map(h => parseFloat(h.patrimoine_total));
    const cashData = history.map(h => parseFloat(h.cash_total || 0));
    const investData = history.map(h => parseFloat(h.investissements_total || 0));
    const biensData = history.map(h => parseFloat(h.biens_total || 0));
    
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Patrimoine total',
                    data: patrimoineData,
                    borderColor: '#2563eb',
                    backgroundColor: 'rgba(37, 99, 235, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointRadius: history.length > 100 ? 0 : 3,
                    pointHoverRadius: 6
                },
                {
                    label: 'Cash',
                    data: cashData,
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.05)',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    fill: false,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHoverRadius: 4
                },
                {
                    label: 'Investissements',
                    data: investData,
                    borderColor: '#f59e0b',
                    backgroundColor: 'rgba(245, 158, 11, 0.05)',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    fill: false,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHoverRadius: 4
                },
                {
                    label: 'Biens',
                    data: biensData,
                    borderColor: '#8b5cf6',
                    backgroundColor: 'rgba(139, 92, 246, 0.05)',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    fill: false,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHoverRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        padding: 20,
                        font: { size: 12 }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.dataset.label + ': ' + fmt(context.parsed.y);
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return new Intl.NumberFormat('fr-FR', { 
                                style: 'currency', 
                                currency: 'EUR',
                                maximumFractionDigits: 0
                            }).format(value);
                        }
                    }
                },
                x: {
                    ticks: {
                        maxRotation: 45,
                        minRotation: 0,
                        autoSkip: true,
                        maxTicksLimit: 20
                    }
                }
            }
        }
    });
}

// Sauvegarder snapshot actuel
window.saveCurrentPatrimoine = async function() {
    try {
        // Récupérer toutes les données actuelles
        const [accounts, ctoT, peaT, cryptoT, biens, ctoCash, peaCash, cryptoCash] = await Promise.all([
            dataManager.getBankAccounts(),
            dataManager.getInvestments('CTO'),
            dataManager.getInvestments('PEA'),
            dataManager.getCryptoTransactions(),
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
        const patrimoineTotal = cashTotal + invTotal + biensVal;
        
        // Sauvegarder dans Supabase
        const success = await dataManager.savePatrimoineSnapshot({
            total: patrimoineTotal,
            cash: cashTotal,
            investissements: invTotal,
            biens: biensVal
        });
        
        if (success) {
            showToast('Snapshot sauvegardé !', 'success');
            // Rafraîchir le graphique
            await renderPatrimoineEvolutionChart();
        } else {
            showToast('Erreur lors de la sauvegarde', 'error');
        }
    } catch (err) {
        console.error('saveCurrentPatrimoine:', err);
        showToast('Erreur : ' + err.message, 'error');
    }
};

// Exposer globalement
window.renderPatrimoineEvolutionChart = renderPatrimoineEvolutionChart;

// =============================================================================
// FILTRAGE PAR DATE DES CAMEMBERTS ENTRÉES / SORTIES
// =============================================================================
window._rawCashFlowData = window._rawCashFlowData || {};

window.filterCashFlowChartByPeriod = function(type) {
    const isE = type === 'entree';
    const periodSelect = document.getElementById(isE ? 'entreesChartPeriod' : 'depensesChartPeriod');
    const customDiv = document.getElementById(isE ? 'entreesChartCustomDates' : 'depensesChartCustomDates');
    const period = periodSelect ? periodSelect.value : 'all';

    if (customDiv) {
        customDiv.style.display = period === 'custom' ? 'inline-flex' : 'none';
    }

    const rawData = window._rawCashFlowData[type] || [];
    let filtered = [...rawData];
    const now = new Date();

    if (period === 'all') {
        const todayIso = new Date().toISOString().split('T')[0];
        filtered = filtered.filter(i => (i.date || '') <= todayIso);
    } else if (period === 'current_month') {
        filtered = filtered.filter(i => {
            const d = new Date(i.date);
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        });
    } else if (period === 'last_month') {
        const lastM = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        filtered = filtered.filter(i => {
            const d = new Date(i.date);
            return d.getMonth() === lastM.getMonth() && d.getFullYear() === lastM.getFullYear();
        });
    } else if (period === '3_months') {
        const threeMAgo = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
        filtered = filtered.filter(i => new Date(i.date) >= threeMAgo);
    } else if (period === 'current_year') {
        filtered = filtered.filter(i => new Date(i.date).getFullYear() === now.getFullYear());
    } else if (period === 'custom') {
        const sVal = document.getElementById(isE ? 'entreesChartDateStart' : 'depensesChartDateStart')?.value;
        const eVal = document.getElementById(isE ? 'entreesChartDateEnd' : 'depensesChartDateEnd')?.value;
        if (sVal) {
            const sDate = new Date(sVal);
            filtered = filtered.filter(i => new Date(i.date) >= sDate);
        }
        if (eVal) {
            const eDate = new Date(eVal);
            eDate.setHours(23, 59, 59, 999);
            filtered = filtered.filter(i => new Date(i.date) <= eDate);
        }
    }

    renderCashFlowCategoryChart(type, filtered, null);
};


// =============================================================================
// GÉNÉRATEUR DE MINI COURBES D'ÉVOLUTION (SPARKLINES SVG)
// =============================================================================
window.generateSparklineSvg = function(dataPoints = [], options = {}) {
    const width = options.width || 140;
    const height = options.height || 54;
    const isPositive = options.isPositive !== undefined ? options.isPositive : true;
    const strokeColor = options.strokeColor || (isPositive ? '#10b981' : '#3b82f6');
    const withAxes = options.withAxes !== undefined ? options.withAxes : true;

    let values = (dataPoints || []).map(v => typeof v === 'number' ? v : parseFloat(v || 0));
    if (values.length < 2) {
        const base = values[0] || 100;
        values = [base * 0.94, base * 0.97, base * 0.95, base * 0.98, base * 0.99, base];
    }

    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = (max - min) === 0 ? 1 : (max - min);

    // Marge pour les axes ↑ et → du croquis
    const originX = withAxes ? 12 : 2;
    const originY = height - 8;
    const effWidth = width - originX - 10;
    const effHeight = originY - 10;

    const points = values.map((val, idx) => {
        const x = originX + (idx / (values.length - 1)) * effWidth;
        const y = originY - ((val - min) / range) * effHeight;
        return { x: Number(x.toFixed(1)), y: Number(y.toFixed(1)) };
    });

    let dPath = 'M ' + points[0].x + ',' + points[0].y;
    for (let i = 0; i < points.length - 1; i++) {
        const p0 = points[i];
        const p1 = points[i + 1];
        const midX = (p0.x + p1.x) / 2;
        dPath += ' C ' + midX + ',' + p0.y + ' ' + midX + ',' + p1.y + ' ' + p1.x + ',' + p1.y;
    }

    const dArea = dPath + ' L ' + (originX + effWidth) + ',' + originY + ' L ' + originX + ',' + originY + ' Z';
    const lastP = points[points.length - 1];
    const gradId = 'spk_' + Math.random().toString(36).substring(2, 9);

    let axesSvg = '';
    if (withAxes) {
        axesSvg = `
            <!-- Axe vertical avec flèche ↑ -->
            <line x1="${originX}" y1="${originY}" x2="${originX}" y2="4" stroke="#64748b" stroke-width="1.3" stroke-linecap="round" />
            <polygon points="${originX-2.5},6 ${originX+2.5},6 ${originX},2" fill="#64748b" />
            
            <!-- Axe horizontal avec flèche → -->
            <line x1="${originX}" y1="${originY}" x2="${width - 4}" y2="${originY}" stroke="#64748b" stroke-width="1.3" stroke-linecap="round" />
            <polygon points="${width-6},${originY-2.5} ${width-6},${originY+2.5} ${width-2},${originY}" fill="#64748b" />
        `;
    }

    return '<svg class="sparkline-svg sparkline-with-axes" viewBox="0 0 ' + width + ' ' + height + '" preserveAspectRatio="none" style="width:100%; height:100%; display:block; overflow:visible;">' +
        '<defs>' +
        '<linearGradient id="' + gradId + '" x1="0" y1="0" x2="0" y2="1">' +
        '<stop offset="0%" stop-color="' + strokeColor + '" stop-opacity="0.25" />' +
        '<stop offset="100%" stop-color="' + strokeColor + '" stop-opacity="0.0" />' +
        '</linearGradient>' +
        '</defs>' +
        axesSvg +
        '<path d="' + dArea + '" fill="url(#' + gradId + ')" />' +
        '<path d="' + dPath + '" fill="none" stroke="' + strokeColor + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />' +
        '<circle cx="' + lastP.x + '" cy="' + lastP.y + '" r="2.8" fill="' + strokeColor + '" stroke="#ffffff" stroke-width="1.5" />' +
        '</svg>';
};
