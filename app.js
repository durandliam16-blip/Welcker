// Data Storage Manager
class DataManager {
    constructor() {
        this.initializeData();
    }

    initializeData() {
        if (!localStorage.getItem('monpatrimoine_data')) {
            const initialData = {
                transactions: {
                    CTO: [],
                    PEA: []
                },
                comptes: [],
                biens: [],
                entrees: [],
                depenses: [],
                profile: {
                    nom: '',
                    email: '',
                    telephone: '',
                    dateInscription: new Date().toISOString()
                },
                settings: {
                    theme: 'light',
                    devise: 'EUR',
                    notifications: {
                        transactions: true,
                        rapport: true
                    }
                }
            };
            this.saveData(initialData);
        }
    }

    getData() {
        return JSON.parse(localStorage.getItem('monpatrimoine_data'));
    }

    saveData(data) {
        localStorage.setItem('monpatrimoine_data', JSON.stringify(data));
        localStorage.setItem('last_update', new Date().toISOString());
    }

    addTransaction(compte, transaction) {
        const data = this.getData();
        transaction.id = Date.now().toString();
        transaction.date = transaction.date || new Date().toISOString().split('T')[0];
        data.transactions[compte].push(transaction);
        this.saveData(data);
        return transaction;
    }

    deleteTransaction(compte, id) {
        const data = this.getData();
        data.transactions[compte] = data.transactions[compte].filter(t => t.id !== id);
        this.saveData(data);
    }

    addCompte(compte) {
        const data = this.getData();
        compte.id = Date.now().toString();
        data.comptes.push(compte);
        this.saveData(data);
        return compte;
    }

    addBien(bien) {
        const data = this.getData();
        bien.id = Date.now().toString();
        data.biens.push(bien);
        this.saveData(data);
        return bien;
    }

    deleteBien(id) {
        const data = this.getData();
        data.biens = data.biens.filter(b => b.id !== id);
        this.saveData(data);
    }

    addEntree(entree) {
        const data = this.getData();
        entree.id = Date.now().toString();
        data.entrees.push(entree);
        this.saveData(data);
        return entree;
    }

    deleteEntree(id) {
        const data = this.getData();
        data.entrees = data.entrees.filter(e => e.id !== id);
        this.saveData(data);
    }

    addDepense(depense) {
        const data = this.getData();
        depense.id = Date.now().toString();
        data.depenses.push(depense);
        this.saveData(data);
        return depense;
    }

    deleteDepense(id) {
        const data = this.getData();
        data.depenses = data.depenses.filter(d => d.id !== id);
        this.saveData(data);
    }

    updateProfile(profile) {
        const data = this.getData();
        data.profile = { ...data.profile, ...profile };
        this.saveData(data);
    }

    updateSettings(settings) {
        const data = this.getData();
        data.settings = { ...data.settings, ...settings };
        this.saveData(data);
    }

    exportData() {
        const data = this.getData();
        const dataStr = JSON.stringify(data, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `monpatrimoine_backup_${new Date().toISOString().split('T')[0]}.json`;
        link.click();
    }

    importData(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                this.saveData(data);
                alert('Données importées avec succès !');
                location.reload();
            } catch (error) {
                alert('Erreur lors de l\'importation des données');
            }
        };
        reader.readAsText(file);
    }

    clearAllData() {
        if (confirm('Êtes-vous sûr de vouloir supprimer toutes les données ? Cette action est irréversible.')) {
            localStorage.removeItem('monpatrimoine_data');
            localStorage.removeItem('last_update');
            this.initializeData();
            alert('Toutes les données ont été supprimées');
            location.reload();
        }
    }
}

// Initialize DataManager
const dataManager = new DataManager();

// Navigation
function navigateTo(page) {
    // Update active nav link
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.dataset.page === page) {
            link.classList.add('active');
        }
    });

    // Show active page
    document.querySelectorAll('.page').forEach(p => {
        p.classList.remove('active');
    });
    const activePage = document.getElementById(`page-${page}`);
    if (activePage) {
        activePage.classList.add('active');
        updatePageContent(page);
    }
}

// Setup navigation
document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const page = link.dataset.page;
        navigateTo(page);
    });
});

// Modal Management
function openModal(modalId, param) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        if (modalId === 'modalAddTransaction' && param) {
            document.getElementById('transactionCompte').value = param;
        }
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        // Reset form
        const form = modal.querySelector('form');
        if (form) form.reset();
    }
}

// Close modal on outside click
document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal(modal.id);
        }
    });
});

// Format Currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'EUR'
    }).format(amount);
}

// Calculate Portfolio Value
function calculatePortfolioValue(compte) {
    const data = dataManager.getData();
    const transactions = data.transactions[compte] || [];
    
    let totalValue = 0;
    let totalInvested = 0;
    const holdings = {};

    transactions.forEach(t => {
        const montant = parseFloat(t.quantite) * parseFloat(t.prix);
        
        if (t.type === 'achat') {
            if (!holdings[t.titre]) {
                holdings[t.titre] = { quantite: 0, prixMoyen: 0, total: 0 };
            }
            holdings[t.titre].total += montant;
            holdings[t.titre].quantite += parseFloat(t.quantite);
            holdings[t.titre].prixMoyen = holdings[t.titre].total / holdings[t.titre].quantite;
            totalInvested += montant + parseFloat(t.frais || 0);
        } else if (t.type === 'vente') {
            if (holdings[t.titre]) {
                holdings[t.titre].quantite -= parseFloat(t.quantite);
                holdings[t.titre].total -= parseFloat(t.quantite) * holdings[t.titre].prixMoyen;
            }
            totalInvested -= montant - parseFloat(t.frais || 0);
        }
    });

    // For demo, assume current value = invested (in real app, fetch real-time prices)
    totalValue = totalInvested;

    return {
        valeurActuelle: totalValue,
        montantInvesti: totalInvested,
        plusMoinsValue: totalValue - totalInvested,
        performance: totalInvested > 0 ? ((totalValue - totalInvested) / totalInvested * 100) : 0,
        holdings: holdings
    };
}

// Update Page Content
function updatePageContent(page) {
    switch (page) {
        case 'accueil':
            updateAccueil();
            break;
        case 'bilan':
            updateBilan();
            break;
        case 'comptes':
            updateComptes();
            break;
        case 'cto':
            updateCTO();
            break;
        case 'pea':
            updatePEA();
            break;
        case 'autres-biens':
            updateAutresBiens();
            break;
        case 'flux':
            updateFlux();
            break;
        case 'entrees':
            updateEntrees();
            break;
        case 'depenses':
            updateDepenses();
            break;
        case 'profil':
            updateProfil();
            break;
        case 'parametres':
            updateParametres();
            break;
    }
}

// Update Accueil
function updateAccueil() {
    const data = dataManager.getData();
    
    // Calculate totals
    const ctoValue = calculatePortfolioValue('CTO').valeurActuelle;
    const peaValue = calculatePortfolioValue('PEA').valeurActuelle;
    const comptesTotal = data.comptes.reduce((sum, c) => sum + parseFloat(c.solde), 0);
    const biensTotal = data.biens.reduce((sum, b) => sum + parseFloat(b.valeur), 0);
    
    const patrimoineTotal = ctoValue + peaValue + comptesTotal + biensTotal;
    const liquidites = comptesTotal;
    const investissements = ctoValue + peaValue;

    document.getElementById('patrimoineTotal').textContent = formatCurrency(patrimoineTotal);
    document.getElementById('liquiditesTotal').textContent = formatCurrency(liquidites);
    document.getElementById('investissementsTotal').textContent = formatCurrency(investissements);

    // Update last transactions
    const allTransactions = [
        ...data.transactions.CTO.map(t => ({ ...t, compte: 'CTO' })),
        ...data.transactions.PEA.map(t => ({ ...t, compte: 'PEA' })),
        ...data.entrees.map(t => ({ ...t, type: 'entree' })),
        ...data.depenses.map(t => ({ ...t, type: 'depense' }))
    ];
    
    allTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    const dernières = allTransactions.slice(0, 5);
    const container = document.getElementById('dernieresTransactions');
    
    if (dernières.length === 0) {
        container.innerHTML = '<p class="empty-state">Aucune transaction</p>';
    } else {
        container.innerHTML = dernières.map(t => `
            <div class="transaction-item">
                <div>
                    <strong>${t.titre || t.description || 'Transaction'}</strong>
                    <div style="font-size: 12px; color: var(--text-secondary);">${new Date(t.date).toLocaleDateString('fr-FR')}</div>
                </div>
                <div style="font-weight: 600; ${t.type === 'vente' || t.type === 'depense' ? 'color: var(--danger-color)' : 'color: var(--success-color)'}">
                    ${t.type === 'vente' || t.type === 'depense' ? '-' : '+'}${formatCurrency(t.montant || (t.quantite * t.prix))}
                </div>
            </div>
        `).join('');
    }

    // Update charts
    updateAccueilCharts(patrimoineTotal, liquidites, investissements, biensTotal);
}

// Update Accueil Charts
function updateAccueilCharts(patrimoineTotal, liquidites, investissements, biensTotal) {
    // Patrimoine Chart
    const patrimoineCtx = document.getElementById('patrimoineChart');
    if (patrimoineCtx && Chart.getChart(patrimoineCtx)) {
        Chart.getChart(patrimoineCtx).destroy();
    }
    
    if (patrimoineCtx) {
        new Chart(patrimoineCtx, {
            type: 'doughnut',
            data: {
                labels: ['Liquidités', 'Investissements', 'Biens'],
                datasets: [{
                    data: [liquidites, investissements, biensTotal],
                    backgroundColor: ['#10b981', '#2563eb', '#f59e0b']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    // Evolution Chart
    const evolutionCtx = document.getElementById('evolutionChart');
    if (evolutionCtx && Chart.getChart(evolutionCtx)) {
        Chart.getChart(evolutionCtx).destroy();
    }
    
    if (evolutionCtx) {
        const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun'];
        const values = months.map((_, i) => patrimoineTotal * (0.8 + i * 0.04));
        
        new Chart(evolutionCtx, {
            type: 'line',
            data: {
                labels: months,
                datasets: [{
                    label: 'Patrimoine',
                    data: values,
                    borderColor: '#2563eb',
                    backgroundColor: 'rgba(37, 99, 235, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: false
                    }
                }
            }
        });
    }
}

// Update Bilan
function updateBilan() {
    const data = dataManager.getData();
    
    const ctoValue = calculatePortfolioValue('CTO').valeurActuelle;
    const peaValue = calculatePortfolioValue('PEA').valeurActuelle;
    const comptesTotal = data.comptes.reduce((sum, c) => sum + parseFloat(c.solde), 0);
    const biensTotal = data.biens.reduce((sum, b) => sum + parseFloat(b.valeur), 0);
    
    const patrimoineTotal = ctoValue + peaValue + comptesTotal + biensTotal;

    document.getElementById('bilanPatrimoineTotal').textContent = formatCurrency(patrimoineTotal);

    // Comptes
    document.getElementById('bilanComptes').innerHTML = `
        <div class="stat-item">
            <span>CTO</span>
            <span>${formatCurrency(ctoValue)}</span>
        </div>
        <div class="stat-item">
            <span>PEA</span>
            <span>${formatCurrency(peaValue)}</span>
        </div>
        ${data.comptes.map(c => `
            <div class="stat-item">
                <span>${c.nom}</span>
                <span>${formatCurrency(c.solde)}</span>
            </div>
        `).join('')}
    `;

    // Investissements
    document.getElementById('bilanInvestissements').innerHTML = `
        <div class="stat-item">
            <span>Total investissements</span>
            <span>${formatCurrency(ctoValue + peaValue)}</span>
        </div>
    `;

    // Autres biens
    document.getElementById('bilanAutresBiens').innerHTML = `
        <div class="stat-item">
            <span>Total autres biens</span>
            <span>${formatCurrency(biensTotal)}</span>
        </div>
        ${data.biens.slice(0, 3).map(b => `
            <div class="stat-item">
                <span>${b.nom}</span>
                <span>${formatCurrency(b.valeur)}</span>
            </div>
        `).join('')}
    `;
}

// Update Comptes
function updateComptes() {
    const data = dataManager.getData();
    const cto = calculatePortfolioValue('CTO');
    const pea = calculatePortfolioValue('PEA');

    document.getElementById('ctoAmount').textContent = formatCurrency(cto.valeurActuelle);
    document.getElementById('ctoEvolution').textContent = `${cto.performance >= 0 ? '+' : ''}${cto.performance.toFixed(2)}%`;
    document.getElementById('ctoEvolution').className = cto.performance >= 0 ? 'positive' : 'negative';

    document.getElementById('peaAmount').textContent = formatCurrency(pea.valeurActuelle);
    document.getElementById('peaEvolution').textContent = `${pea.performance >= 0 ? '+' : ''}${pea.performance.toFixed(2)}%`;
    document.getElementById('peaEvolution').className = pea.performance >= 0 ? 'positive' : 'negative';

    // Other accounts
    const container = document.getElementById('autresComptesContainer');
    container.innerHTML = data.comptes.map(compte => `
        <div class="card compte-card">
            <div class="compte-header">
                <h3>${compte.nom}</h3>
                <span class="compte-type">${compte.type}</span>
            </div>
            <div class="compte-amount">${formatCurrency(compte.solde)}</div>
        </div>
    `).join('');
}

// Update CTO
function updateCTO() {
    const cto = calculatePortfolioValue('CTO');
    
    document.getElementById('ctoValeurActuelle').textContent = formatCurrency(cto.valeurActuelle);
    document.getElementById('ctoPerformance').textContent = `${cto.performance >= 0 ? '+' : ''}${cto.performance.toFixed(2)}%`;
    document.getElementById('ctoPerformance').className = `stat-value ${cto.performance >= 0 ? 'positive' : 'negative'}`;
    document.getElementById('ctoPlusMoinsValue').textContent = formatCurrency(cto.plusMoinsValue);
    document.getElementById('ctoPlusMoinsValue').className = `stat-value ${cto.plusMoinsValue >= 0 ? 'positive' : 'negative'}`;

    updateTransactionsTable('CTO');
    updateEvolutionChart('CTO');
}

// Update PEA
function updatePEA() {
    const pea = calculatePortfolioValue('PEA');
    
    document.getElementById('peaValeurActuelle').textContent = formatCurrency(pea.valeurActuelle);
    document.getElementById('peaPerformance').textContent = `${pea.performance >= 0 ? '+' : ''}${pea.performance.toFixed(2)}%`;
    document.getElementById('peaPerformance').className = `stat-value ${pea.performance >= 0 ? 'positive' : 'negative'}`;
    document.getElementById('peaPlusMoinsValue').textContent = formatCurrency(pea.plusMoinsValue);
    document.getElementById('peaPlusMoinsValue').className = `stat-value ${pea.plusMoinsValue >= 0 ? 'positive' : 'negative'}`;

    updateTransactionsTable('PEA');
    updateEvolutionChart('PEA');
}

// Update Transactions Table
function updateTransactionsTable(compte) {
    const data = dataManager.getData();
    let transactions = data.transactions[compte] || [];
    
    // Apply filters
    const filterType = document.getElementById(`${compte.toLowerCase()}FilterType`)?.value;
    const filterDateDebut = document.getElementById(`${compte.toLowerCase()}FilterDateDebut`)?.value;
    const filterDateFin = document.getElementById(`${compte.toLowerCase()}FilterDateFin`)?.value;

    if (filterType && filterType !== 'all') {
        transactions = transactions.filter(t => t.type === filterType);
    }
    if (filterDateDebut) {
        transactions = transactions.filter(t => t.date >= filterDateDebut);
    }
    if (filterDateFin) {
        transactions = transactions.filter(t => t.date <= filterDateFin);
    }

    transactions.sort((a, b) => new Date(b.date) - new Date(a.date));

    const tbody = document.getElementById(`${compte.toLowerCase()}TransactionsTable`);
    if (!tbody) return;

    if (transactions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-state">Aucune transaction</td></tr>';
        return;
    }

    tbody.innerHTML = transactions.map(t => `
        <tr>
            <td>${new Date(t.date).toLocaleDateString('fr-FR')}</td>
            <td><span class="compte-type" style="background: ${t.type === 'achat' ? 'var(--success-color)' : 'var(--danger-color)'}; color: white;">${t.type}</span></td>
            <td>${t.titre}</td>
            <td>${t.quantite}</td>
            <td>${formatCurrency(t.prix)}</td>
            <td>${formatCurrency(parseFloat(t.quantite) * parseFloat(t.prix))}</td>
            <td>
                <button class="btn-icon" onclick="deleteTransaction('${compte}', '${t.id}')" title="Supprimer">🗑️</button>
            </td>
        </tr>
    `).join('');
}

// Update Evolution Chart
function updateEvolutionChart(compte) {
    const data = dataManager.getData();
    const transactions = data.transactions[compte] || [];
    
    const ctx = document.getElementById(`${compte.toLowerCase()}EvolutionChart`);
    if (!ctx) return;

    if (Chart.getChart(ctx)) {
        Chart.getChart(ctx).destroy();
    }

    // Calculate cumulative values
    const sortedTransactions = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    const labels = [];
    const values = [];
    let cumulative = 0;

    sortedTransactions.forEach(t => {
        const montant = parseFloat(t.quantite) * parseFloat(t.prix);
        if (t.type === 'achat') {
            cumulative += montant;
        } else {
            cumulative -= montant;
        }
        labels.push(new Date(t.date).toLocaleDateString('fr-FR'));
        values.push(cumulative);
    });

    if (labels.length === 0) {
        labels.push('Aucune donnée');
        values.push(0);
    }

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Valeur du portefeuille',
                data: values,
                borderColor: '#2563eb',
                backgroundColor: 'rgba(37, 99, 235, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

// Filter Transactions
function filterTransactions(compte) {
    updateTransactionsTable(compte);
}

// Delete Transaction
function deleteTransaction(compte, id) {
    if (confirm('Supprimer cette transaction ?')) {
        dataManager.deleteTransaction(compte, id);
        if (compte === 'CTO') {
            updateCTO();
        } else {
            updatePEA();
        }
    }
}

// Update Autres Biens
function updateAutresBiens() {
    const data = dataManager.getData();
    const container = document.getElementById('biensContainer');
    
    if (data.biens.length === 0) {
        container.innerHTML = '<div class="card"><p class="empty-state">Aucun bien enregistré</p></div>';
        return;
    }

    container.innerHTML = data.biens.map(bien => `
        <div class="card bien-card">
            <span class="bien-type">${bien.type}</span>
            <h3>${bien.nom}</h3>
            <div class="bien-value">${formatCurrency(bien.valeur)}</div>
            ${bien.dateAcquisition ? `<p style="color: var(--text-secondary); font-size: 14px;">Acquis le ${new Date(bien.dateAcquisition).toLocaleDateString('fr-FR')}</p>` : ''}
            ${bien.notes ? `<p style="margin-top: 12px;">${bien.notes}</p>` : ''}
            <button class="btn-danger" style="margin-top: 16px; width: 100%;" onclick="deleteBien('${bien.id}')">Supprimer</button>
        </div>
    `).join('');
}

// Delete Bien
function deleteBien(id) {
    if (confirm('Supprimer ce bien ?')) {
        dataManager.deleteBien(id);
        updateAutresBiens();
    }
}

// Update Flux
function updateFlux() {
    const data = dataManager.getData();
    
    const entreesTotal = data.entrees.reduce((sum, e) => sum + parseFloat(e.montant), 0);
    const depensesTotal = data.depenses.reduce((sum, d) => sum + parseFloat(d.montant), 0);
    const solde = entreesTotal - depensesTotal;

    document.getElementById('entreesTotales').textContent = formatCurrency(entreesTotal);
    document.getElementById('sortiesTotales').textContent = formatCurrency(depensesTotal);
    document.getElementById('soldeFlux').textContent = formatCurrency(solde);
    document.getElementById('soldeFlux').className = `flux-value ${solde >= 0 ? 'positive' : 'negative'}`;

    updateFluxCharts(data);
}

// Update Flux Charts
function updateFluxCharts(data) {
    // Monthly evolution
    const fluxCtx = document.getElementById('fluxChart');
    if (fluxCtx && Chart.getChart(fluxCtx)) {
        Chart.getChart(fluxCtx).destroy();
    }
    
    if (fluxCtx) {
        const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun'];
        const entreesData = months.map(() => Math.random() * 3000 + 2000);
        const depensesData = months.map(() => Math.random() * 2000 + 1000);

        new Chart(fluxCtx, {
            type: 'bar',
            data: {
                labels: months,
                datasets: [
                    {
                        label: 'Entrées',
                        data: entreesData,
                        backgroundColor: '#10b981'
                    },
                    {
                        label: 'Sorties',
                        data: depensesData,
                        backgroundColor: '#ef4444'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    // Annual
    const fluxAnnuelCtx = document.getElementById('fluxAnnuelChart');
    if (fluxAnnuelCtx && Chart.getChart(fluxAnnuelCtx)) {
        Chart.getChart(fluxAnnuelCtx).destroy();
    }
    
    if (fluxAnnuelCtx) {
        const entreesTotal = data.entrees.reduce((sum, e) => sum + parseFloat(e.montant), 0);
        const depensesTotal = data.depenses.reduce((sum, d) => sum + parseFloat(d.montant), 0);

        new Chart(fluxAnnuelCtx, {
            type: 'doughnut',
            data: {
                labels: ['Entrées', 'Sorties'],
                datasets: [{
                    data: [entreesTotal, depensesTotal],
                    backgroundColor: ['#10b981', '#ef4444']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }
}

// Update Entrées
function updateEntrees() {
    const data = dataManager.getData();
    let entrees = data.entrees;

    // Apply filters
    const filterCategorie = document.getElementById('entreesFilterCategorie')?.value;
    const filterPeriode = document.getElementById('entreesFilterPeriode')?.value;

    if (filterCategorie && filterCategorie !== 'all') {
        entrees = entrees.filter(e => e.categorie === filterCategorie);
    }

    if (filterPeriode && filterPeriode !== 'all') {
        const now = new Date();
        if (filterPeriode === 'mois') {
            entrees = entrees.filter(e => {
                const date = new Date(e.date);
                return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
            });
        } else if (filterPeriode === 'annee') {
            entrees = entrees.filter(e => {
                const date = new Date(e.date);
                return date.getFullYear() === now.getFullYear();
            });
        }
    }

    entrees.sort((a, b) => new Date(b.date) - new Date(a.date));

    const tbody = document.getElementById('entreesTable');
    if (entrees.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="empty-state">Aucune entrée</td></tr>';
    } else {
        tbody.innerHTML = entrees.map(e => `
            <tr>
                <td>${new Date(e.date).toLocaleDateString('fr-FR')}</td>
                <td><span class="compte-type">${e.categorie}</span></td>
                <td>${e.description}</td>
                <td class="positive">${formatCurrency(e.montant)}</td>
                <td>
                    <button class="btn-icon" onclick="deleteEntree('${e.id}')" title="Supprimer">🗑️</button>
                </td>
            </tr>
        `).join('');
    }

    updateEntreesChart(data);
}

// Update Entrées Chart
function updateEntreesChart(data) {
    const ctx = document.getElementById('entreesChart');
    if (!ctx) return;

    if (Chart.getChart(ctx)) {
        Chart.getChart(ctx).destroy();
    }

    const categories = {};
    data.entrees.forEach(e => {
        categories[e.categorie] = (categories[e.categorie] || 0) + parseFloat(e.montant);
    });

    new Chart(ctx, {
        type: 'pie',
        data: {
            labels: Object.keys(categories),
            datasets: [{
                data: Object.values(categories),
                backgroundColor: ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

// Filter Entrées
function filterEntrees() {
    updateEntrees();
}

// Delete Entrée
function deleteEntree(id) {
    if (confirm('Supprimer cette entrée ?')) {
        dataManager.deleteEntree(id);
        updateEntrees();
    }
}

// Update Dépenses
function updateDepenses() {
    const data = dataManager.getData();
    let depenses = data.depenses;

    // Apply filters
    const filterCategorie = document.getElementById('depensesFilterCategorie')?.value;
    const filterPeriode = document.getElementById('depensesFilterPeriode')?.value;

    if (filterCategorie && filterCategorie !== 'all') {
        depenses = depenses.filter(d => d.categorie === filterCategorie);
    }

    if (filterPeriode && filterPeriode !== 'all') {
        const now = new Date();
        if (filterPeriode === 'mois') {
            depenses = depenses.filter(d => {
                const date = new Date(d.date);
                return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
            });
        } else if (filterPeriode === 'annee') {
            depenses = depenses.filter(d => {
                const date = new Date(d.date);
                return date.getFullYear() === now.getFullYear();
            });
        }
    }

    depenses.sort((a, b) => new Date(b.date) - new Date(a.date));

    const tbody = document.getElementById('depensesTable');
    if (depenses.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="empty-state">Aucune dépense</td></tr>';
    } else {
        tbody.innerHTML = depenses.map(d => `
            <tr>
                <td>${new Date(d.date).toLocaleDateString('fr-FR')}</td>
                <td><span class="compte-type">${d.categorie}</span></td>
                <td>${d.description}</td>
                <td class="negative">${formatCurrency(d.montant)}</td>
                <td>
                    <button class="btn-icon" onclick="deleteDepense('${d.id}')" title="Supprimer">🗑️</button>
                </td>
            </tr>
        `).join('');
    }

    updateDepensesCharts(data);
}

// Update Dépenses Charts
function updateDepensesCharts(data) {
    // Category chart
    const ctx = document.getElementById('depensesChart');
    if (ctx && Chart.getChart(ctx)) {
        Chart.getChart(ctx).destroy();
    }
    
    if (ctx) {
        const categories = {};
        data.depenses.forEach(d => {
            categories[d.categorie] = (categories[d.categorie] || 0) + parseFloat(d.montant);
        });

        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(categories),
                datasets: [{
                    data: Object.values(categories),
                    backgroundColor: ['#ef4444', '#f59e0b', '#10b981', '#2563eb', '#8b5cf6', '#ec4899']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    // Evolution chart
    const evolCtx = document.getElementById('depensesEvolutionChart');
    if (evolCtx && Chart.getChart(evolCtx)) {
        Chart.getChart(evolCtx).destroy();
    }
    
    if (evolCtx) {
        const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun'];
        const values = months.map(() => Math.random() * 1500 + 500);

        new Chart(evolCtx, {
            type: 'line',
            data: {
                labels: months,
                datasets: [{
                    label: 'Dépenses mensuelles',
                    data: values,
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    }
}

// Filter Dépenses
function filterDepenses() {
    updateDepenses();
}

// Delete Dépense
function deleteDepense(id) {
    if (confirm('Supprimer cette dépense ?')) {
        dataManager.deleteDepense(id);
        updateDepenses();
    }
}

// Update Profil
function updateProfil() {
    const data = dataManager.getData();
    const profile = data.profile;

    document.getElementById('profilNom').value = profile.nom || '';
    document.getElementById('profilEmail').value = profile.email || '';
    document.getElementById('profilTel').value = profile.telephone || '';

    const dateInscription = new Date(profile.dateInscription);
    document.getElementById('membreDepuis').textContent = dateInscription.toLocaleDateString('fr-FR');

    const totalTransactions = 
        data.transactions.CTO.length + 
        data.transactions.PEA.length + 
        data.entrees.length + 
        data.depenses.length;
    document.getElementById('nbTransactions').textContent = totalTransactions;

    const lastUpdate = localStorage.getItem('last_update');
    if (lastUpdate) {
        document.getElementById('derniereConnexion').textContent = new Date(lastUpdate).toLocaleString('fr-FR');
    }
}

// Save Profile
function saveProfile() {
    const profile = {
        nom: document.getElementById('profilNom').value,
        email: document.getElementById('profilEmail').value,
        telephone: document.getElementById('profilTel').value
    };
    dataManager.updateProfile(profile);
    alert('Profil enregistré !');
}

// Update Paramètres
function updateParametres() {
    const data = dataManager.getData();
    const settings = data.settings;

    document.getElementById('settingTheme').value = settings.theme || 'light';
    document.getElementById('settingDevise').value = settings.devise || 'EUR';
    document.getElementById('settingNotifTransactions').checked = settings.notifications?.transactions !== false;
    document.getElementById('settingNotifRapport').checked = settings.notifications?.rapport !== false;
}

// Change Theme
function changeTheme() {
    const theme = document.getElementById('settingTheme').value;
    document.body.setAttribute('data-theme', theme);
    dataManager.updateSettings({ theme });
}

// Export Data
function exportData() {
    dataManager.exportData();
}

// Import Data
function importData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            dataManager.importData(file);
        }
    };
    input.click();
}

// Confirm Delete Data
function confirmDeleteData() {
    dataManager.clearAllData();
}

// Form Handlers
document.getElementById('formAddTransaction')?.addEventListener('submit', addTransaction);
document.getElementById('formAddBien')?.addEventListener('submit', addBien);
document.getElementById('formAddEntree')?.addEventListener('submit', addEntree);
document.getElementById('formAddDepense')?.addEventListener('submit', addDepense);
document.getElementById('formAddCompte')?.addEventListener('submit', addCompte);

function addTransaction(e) {
    e.preventDefault();
    
    const transaction = {
        type: document.getElementById('transactionType').value,
        date: document.getElementById('transactionDate').value,
        titre: document.getElementById('transactionTitre').value,
        quantite: document.getElementById('transactionQuantite').value,
        prix: document.getElementById('transactionPrix').value,
        frais: document.getElementById('transactionFrais').value,
        notes: document.getElementById('transactionNotes').value
    };

    const compte = document.getElementById('transactionCompte').value;
    dataManager.addTransaction(compte, transaction);
    
    closeModal('modalAddTransaction');
    
    if (compte === 'CTO') {
        updateCTO();
    } else {
        updatePEA();
    }
}

function addBien(e) {
    e.preventDefault();
    
    const bien = {
        type: document.getElementById('bienType').value,
        nom: document.getElementById('bienNom').value,
        valeur: document.getElementById('bienValeur').value,
        dateAcquisition: document.getElementById('bienDateAcquisition').value,
        notes: document.getElementById('bienNotes').value
    };

    dataManager.addBien(bien);
    closeModal('modalAddBien');
    updateAutresBiens();
}

function addEntree(e) {
    e.preventDefault();
    
    const entree = {
        date: document.getElementById('entreeDate').value,
        categorie: document.getElementById('entreeCategorie').value,
        description: document.getElementById('entreeDescription').value,
        montant: document.getElementById('entreeMontant').value
    };

    dataManager.addEntree(entree);
    closeModal('modalAddEntree');
    updateEntrees();
}

function addDepense(e) {
    e.preventDefault();
    
    const depense = {
        date: document.getElementById('depenseDate').value,
        categorie: document.getElementById('depenseCategorie').value,
        description: document.getElementById('depenseDescription').value,
        montant: document.getElementById('depenseMontant').value
    };

    dataManager.addDepense(depense);
    closeModal('modalAddDepense');
    updateDepenses();
}

function addCompte(e) {
    e.preventDefault();
    
    const compte = {
        nom: document.getElementById('compteNom').value,
        type: document.getElementById('compteType').value,
        solde: document.getElementById('compteSolde').value
    };

    dataManager.addCompte(compte);
    closeModal('modalAddCompte');
    updateComptes();
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    // Set today's date as default for date inputs
    const today = new Date().toISOString().split('T')[0];
    document.querySelectorAll('input[type="date"]').forEach(input => {
        if (!input.value) {
            input.value = today;
        }
    });

    // Load theme
    const data = dataManager.getData();
    if (data.settings?.theme) {
        document.body.setAttribute('data-theme', data.settings.theme);
    }

    // Initialize first page
    updateAccueil();
});
