// Data Storage Manager
// Configuration Supabase
const supabaseUrl = 'https://qktbcgumyqjgbvcpynjo.supabase.co/';
const supabaseKey = 'TA_CLE_ANON_PUBLIQUE'; // À récupérer dans Settings > API
const supabase = supabase.createClient(supabaseUrl, supabaseKey);

class DataManager {
    // Gestion du Profil & Settings
    async getProfile() {
        const { data } = await supabase.from('profiles').select('*').single();
        return data || {};
    }

    async updateProfile(profileData) {
        const { error } = await supabase.from('profiles').upsert(profileData);
        if (error) console.error("Erreur profil:", error);
    }

    // Gestion des Transactions CTO
    async getTransactionsCTO() {
        const { data } = await supabase
            .from('investment_transactions_cto')
            .select('*')
            .order('date', { ascending: false });
        return data || [];
    }

    async addTransactionCTO(transaction) {
        const { data, error } = await supabase.from('investment_transactions_cto').insert([transaction]);
        return data;
    }

    async deleteTransactionCTO(id) {
        await supabase.from('investment_transactions_cto').delete().eq('id', id);
    }

// Gestion des Transactions PEA
    async getTransactionsPEA() {
        const { data } = await supabase
            .from('investment_transactions_pea')
            .select('*')
            .order('date', { ascending: false });
        return data || [];
    }

    async addTransactionPEA(transaction) {
        const { data, error } = await supabase.from('investment_transactions_pea').insert([transaction]);
        return data;
    }

    async deleteTransactionPEA(id) {
        await supabase.from('investment_transactions_pea').delete().eq('id', id);
    }

    // Flux Financiers Dépenses
    async getCashFlowD() {
        const { data } = await supabase.from('cash_flow_sorties').select('*');
        return data || [];
    }

    async addCashFlowD(item) {
        await supabase.from('cash_flow_sorties').insert([item]);
    }

    // Comptes et Biens
    async getAccounts() {
        const { data } = await supabase.from('accounts').select('*');
        return data || [];
    }

    async addAccount(account) {
        await supabase.from('accounts').insert([account]);
    }

    // Flux Financiers Entrées
    async getCashFlowE() {
        const { data } = await supabase.from('cash_flow_entrees').select('*');
        return data || [];
    }

    async addCashFlowE(item) {
        await supabase.from('cash_flow_entrees').insert([item]);
    }
}


// Initialize DataManager
const dataManager = new DataManager();

// Navigation
async function navigateTo(page) {
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.dataset.page === page) link.classList.add('active');
    });

    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const activePage = document.getElementById(`page-${page}`);
    
    if (activePage) {
        activePage.classList.add('active');
        await updatePageContent(page);
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
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);
}

// --- LOGIQUE DE CALCUL ---
function calculatePortfolioStats(transactions) {
    let invested = 0;
    transactions.forEach(t => {
        const total = parseFloat(t.quantite) * parseFloat(t.prix_unitaire);
        if (t.type === true) { // Achat
            invested += total + parseFloat(t.frais || 0);
        } else { // Vente
            invested -= total - parseFloat(t.frais || 0);
        }
    });
    return { current: invested, performance: 0 }; 
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
async function updatePageContent(page) {
    switch (page) {
        case 'accueil': await updateAccueil(); break;
        case 'bilan': await updateBilan(); break;
        case 'comptes': await updateComptes(); break;
        case 'cto': await updateInvestmentPage('CTO'); break;
        case 'pea': await updateInvestmentPage('PEA'); break;
        case 'flux': await updateFlux(); break;
        case 'entrees': await updateCashFlowPage('entree'); break;
        case 'depenses': await updateCashFlowPage('sortie'); break;
        case 'profil': await updateProfil(); break;
    }
}

// Update Accueil
async function updateAccueil() {
    const [accounts, ctoTrans, peaTrans, entrees, sorties] = await Promise.all([
        dataManager.getAccounts(),
        dataManager.getTransactions('CTO'),
        dataManager.getTransactions('PEA'),
        dataManager.getCashFlow('entree'),
        dataManager.getCashFlow('sortie')
    ]);

    const ctoStats = calculatePortfolioStats(ctoTrans);
    const peaStats = calculatePortfolioStats(peaTrans);
    const accountsTotal = accounts.reduce((sum, a) => sum + parseFloat(a.solde), 0);
    const invTotal = ctoStats.current + peaStats.current;
    
    document.getElementById('patrimoineTotal').textContent = formatCurrency(accountsTotal + invTotal);
    document.getElementById('liquiditesTotal').textContent = formatCurrency(accountsTotal);
    document.getElementById('investissementsTotal').textContent = formatCurrency(invTotal);

    updateAccueilCharts(accountsTotal, invTotal, 0);
    renderRecentTransactions([...entrees, ...sorties]);
}

// Update Accueil Charts
function updateAccueilCharts(liq, inv, biens) {
    const ctx = document.getElementById('patrimoineChart');
    if (!ctx) return;
    if (Chart.getChart(ctx)) Chart.getChart(ctx).destroy();

    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Liquidités', 'Investissements', 'Biens'],
            datasets: [{
                data: [liq, inv, biens],
                backgroundColor: ['#10b981', '#2563eb', '#f59e0b']
            }]
        }
    });
}

async function updateCashFlowPage(type) {
    const data = await dataManager.getCashFlow(type);
    const tbody = document.getElementById(type === 'entree' ? 'entreesTable' : 'depensesTable');
    
    tbody.innerHTML = data.map(i => `
        <tr>
            <td>${new Date(i.date).toLocaleDateString()}</td>
            <td><span class="compte-type">${i.categorie}</span></td>
            <td>${i.description}</td>
            <td class="${type === 'entree' ? 'positive' : 'negative'}">${formatCurrency(i.montant)}</td>
            <td><button class="btn-icon" onclick="deleteCashFlowAction('${type}','${i.id}')">🗑️</button></td>
        </tr>
    `).join('');
}

async function updateInvestmentPage(mode) {
    const data = await dataManager.getInvestments(mode);
    const stats = calculateStats(data);
    const pfx = mode.toLowerCase();

    document.getElementById(`${pfx}ValeurActuelle`).textContent = formatCurrency(stats.current);
    document.getElementById(`${pfx}TransactionsTable`).innerHTML = data.map(t => `
        <tr>
            <td>${new Date(t.date).toLocaleDateString()}</td>
            <td><span class="compte-type" style="background:${t.type?'#10b981':'#ef4444'};color:white">${t.type?'Achat':'Vente'}</span></td>
            <td>${t.titre}</td>
            <td>${t.quantite}</td>
            <td>${formatCurrency(t.prix_unitaire)}</td>
            <td>${formatCurrency(t.quantite * t.prix_unitaire)}</td>
            <td><button class="btn-icon" onclick="deleteInvestmentAction('${mode}','${t.id}')">🗑️</button></td>
        </tr>
    `).join('');
}

async function updateFlux() {
    const [e, s] = await Promise.all([dataManager.getCashFlow('entree'), dataManager.getCashFlow('sortie')]);
    const totalE = e.reduce((sum, i) => sum + parseFloat(i.montant), 0);
    const totalS = s.reduce((sum, i) => sum + parseFloat(i.montant), 0);

    document.getElementById('entreesTotales').textContent = formatCurrency(totalE);
    document.getElementById('sortiesTotales').textContent = formatCurrency(totalS);
    const soldeEl = document.getElementById('soldeFlux');
    soldeEl.textContent = formatCurrency(totalE - totalS);
    soldeEl.className = `flux-value ${(totalE - totalS) >= 0 ? 'positive' : 'negative'}`;
}

// Update Bilan
async function updateBilan() {
    const [accs, cto, pea] = await Promise.all([
        dataManager.getAccounts(), dataManager.getInvestments('CTO'), dataManager.getInvestments('PEA')
    ]);

    const ctoVal = calculateStats(cto).current;
    const peaVal = calculateStats(pea).current;
    const accTotal = accs.reduce((sum, a) => sum + parseFloat(a.solde), 0);

    document.getElementById('bilanPatrimoineTotal').textContent = formatCurrency(accTotal + ctoVal + peaVal);
    document.getElementById('bilanComptes').innerHTML = `
        <div class="stat-item"><span>Investissements (Total)</span><span>${formatCurrency(ctoVal + peaVal)}</span></div>
        ${accs.map(a => `<div class="stat-item"><span>${a.nom}</span><span>${formatCurrency(a.solde)}</span></div>`).join('')}
    `;
}

// Update Comptes
async function updateComptes() {
    const [accs, cto, pea] = await Promise.all([
        dataManager.getAccounts(), dataManager.getInvestments('CTO'), dataManager.getInvestments('PEA')
    ]);

    document.getElementById('ctoAmount').textContent = formatCurrency(calculateStats(cto).current);
    document.getElementById('peaAmount').textContent = formatCurrency(calculateStats(pea).current);

    document.getElementById('autresComptesContainer').innerHTML = accs.map(a => `
        <div class="card compte-card">
            <div class="compte-header"><h3>${a.nom}</h3><span class="compte-type">${a.type}</span></div>
            <div class="compte-amount">${formatCurrency(a.solde)}</div>
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
async function updateProfil() {
    const p = await dataManager.getProfile();
    document.getElementById('profilNom').value = p.nom || '';
    document.getElementById('profilEmail').value = p.email || '';
    document.getElementById('profilTel').value = p.telephone || '';
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

// Form Handlers (Exemple pour transaction)
async function addTransaction(e) {
    e.preventDefault();
    const mode = document.getElementById('transactionCompte').value;
    await dataManager.addInvestment(mode, {
        type: document.getElementById('transactionType').value === 'achat',
        date: document.getElementById('transactionDate').value,
        titre: document.getElementById('transactionTitre').value,
        quantite: parseFloat(document.getElementById('transactionQuantite').value),
        prix_unitaire: parseFloat(document.getElementById('transactionPrix').value),
        frais: parseFloat(document.getElementById('transactionFrais').value)
    });
    closeModal('modalAddTransaction');
    await updatePageContent(mode.toLowerCase());
}

async function addCashFlowAction(e, type) {
    e.preventDefault();
    const pfx = type === 'entree' ? 'entree' : 'depense';
    await dataManager.addCashFlow(type, {
        date: document.getElementById(`${pfx}Date`).value,
        categorie: document.getElementById(`${pfx}Categorie`).value,
        description: document.getElementById(`${pfx}Description`).value,
        montant: parseFloat(document.getElementById(`${pfx}Montant`).value)
    });
    closeModal(type === 'entree' ? 'modalAddEntree' : 'modalAddDepense');
    await updatePageContent(type === 'entree' ? 'entrees' : 'depenses');
}

// Global Helpers pour les boutons supprimer (onclick)
window.deleteInvestmentAction = async (m, id) => { if(confirm('Supprimer ?')) { await dataManager.deleteInvestment(m, id); updatePageContent(m.toLowerCase()); }};
window.deleteCashFlowAction = async (t, id) => { if(confirm('Supprimer ?')) { await dataManager.deleteCashFlow(t, id); updatePageContent(t === 'entree' ? 'entrees' : 'depenses'); }};

// --- 6. UTILS & CHARTS ---
function formatCurrency(v) { return new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR'}).format(v); }

function updateAccueilCharts(liq, inv, b) {
    const ctx = document.getElementById('patrimoineChart');
    if (!ctx) return;
    if (Chart.getChart(ctx)) Chart.getChart(ctx).destroy();
    new Chart(ctx, {
        type: 'doughnut',
        data: { labels:['Liquidités','Investissements','Biens'], datasets:[{data:[liq, inv, b], backgroundColor:['#10b981','#2563eb','#f59e0b']}]}
    });
}

function renderRecentList(list) {
    const container = document.getElementById('dernieresTransactions');
    if (!list.length) { container.innerHTML = '<p class="empty-state">Aucune transaction</p>'; return; }
    container.innerHTML = list.map(t => `
        <div class="transaction-item">
            <span>${t.description || t.titre}</span>
            <span class="${t.montant ? 'negative' : 'positive'}">${formatCurrency(t.montant || (t.quantite*t.prix_unitaire))}</span>
        </div>
    `).join('');
}

// --- 7. BOOTSTRAP ---
document.addEventListener('DOMContentLoaded', () => {
    navigateTo('accueil');
    document.querySelectorAll('.nav-link').forEach(l => l.addEventListener('click', e => navigateTo(e.currentTarget.dataset.page)));
    
    // Bind forms
    document.getElementById('formAddTransaction')?.addEventListener('submit', addTransaction);
    document.getElementById('formAddEntree')?.addEventListener('submit', e => addCashFlowAction(e, 'entree'));
    document.getElementById('formAddDepense')?.addEventListener('submit', e => addCashFlowAction(e, 'sortie'));
});

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
    navigateTo('accueil');
    
    // Bind navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            navigateTo(link.dataset.page);
        });
    });
});
