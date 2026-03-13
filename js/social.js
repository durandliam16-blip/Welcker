// =============================================================================
// PAGE SOCIAL — social.js
// Gestion des features Famille & Réseau avec système de déverrouillage
// =============================================================================

// ─────────────────────────────────────────────────────────────────────────────
// INIT — appelée par updatePageContent('social')
// ─────────────────────────────────────────────────────────────────────────────
async function updateSocial() {
    const profile = await dataManager.getProfile();

    // Mettre à jour les deux cards selon l'état en DB
    renderFeatureCard('famille', profile.famille === true);
    renderFeatureCard('reseau',  profile.reseau  === true);

    if (profile.famille === true) await loadFamilleContent();
    if (profile.reseau  === true) await loadReseauContent();
}

// ─────────────────────────────────────────────────────────────────────────────
// RENDU DES CARDS
// ─────────────────────────────────────────────────────────────────────────────
function renderFeatureCard(feature, isUnlocked) {
    const card = document.getElementById(`social-card-${feature}`);
    if (!card) return;

    if (isUnlocked) {
        card.classList.add('unlocked');
        card.querySelector('.feature-card-blur').style.display = 'none';
    } else {
        card.classList.remove('unlocked');
        card.querySelector('.feature-card-blur').style.display = '';
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// POP-UP DE DÉVERROUILLAGE
// ─────────────────────────────────────────────────────────────────────────────
function openUnlockModal(feature) {
    const modal = document.getElementById('modalUnlockSocial');
    if (!modal) return;

    const isFamille = feature === 'famille';

    // Icône + classe couleur
    const iconEl   = modal.querySelector('.unlock-modal-icon');
    const titleEl  = modal.querySelector('.unlock-modal-title');
    const listEl   = modal.querySelector('.unlock-features-list');
    const confirmBtn = modal.querySelector('.btn-unlock-confirm');

    iconEl.className    = `unlock-modal-icon ${feature}`;
    iconEl.textContent  = isFamille ? '👨‍👩‍👧‍👦' : '🤝';
    titleEl.textContent = isFamille
        ? 'Activer la fonctionnalité Famille'
        : 'Activer le Réseau Social';

    // Description de la fonctionnalité
    const features = isFamille
        ? [
            'Reliez votre compte à celui de votre partenaire ou famille',
            'Visualisez le patrimoine combiné du foyer',
            'Comparez les dépenses et revenus de chaque membre',
            'Tableau de bord familial avec statistiques consolidées'
          ]
        : [
            'Ajoutez des amis utilisant Welcker',
            'Suivez leur activité financière (anonymisée)',
            'Comparez votre taux d\'épargne avec votre entourage',
            'Recevez et envoyez des demandes d\'amis'
          ];

    listEl.innerHTML = features.map(f =>
        `<li><span class="check">✓</span>${escapeHTML(f)}</li>`
    ).join('');

    // Bouton confirm : couleur + action
    confirmBtn.className   = `btn-unlock btn-unlock-confirm ${feature}`;
    confirmBtn.textContent = 'Oui, activer !';
    confirmBtn.onclick     = () => confirmUnlock(feature);

    // Stocker la feature en cours dans le modal
    modal.dataset.feature = feature;

    modal.classList.add('active');
}

function closeUnlockModal() {
    const modal = document.getElementById('modalUnlockSocial');
    if (modal) modal.classList.remove('active');
}

// ─────────────────────────────────────────────────────────────────────────────
// CONFIRMATION & MISE À JOUR DB
// ─────────────────────────────────────────────────────────────────────────────
async function confirmUnlock(feature) {
    const confirmBtn = document.querySelector('#modalUnlockSocial .btn-unlock-confirm');
    if (confirmBtn) { confirmBtn.disabled = true; confirmBtn.textContent = 'Activation…'; }

    const success = await dataManager.unlockSocialFeature(feature);

    closeUnlockModal();

    if (success) {
        launchConfetti();
        showToast(`🎉 Fonctionnalité ${feature === 'famille' ? 'Famille' : 'Réseau'} activée !`, 'success');
        renderFeatureCard(feature, true);

        // Charger le contenu correspondant
        if (feature === 'famille') await loadFamilleContent();
        else                        await loadReseauContent();
    } else {
        showToast('Erreur lors de l\'activation. Réessayez.', 'error');
    }

    if (confirmBtn) { confirmBtn.disabled = false; }
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTENU FAMILLE
// ─────────────────────────────────────────────────────────────────────────────
async function loadFamilleContent() {
    const container = document.getElementById('famille-content-inner');
    if (!container) return;

    // Récupérer les membres de la famille + stats consolidées
    const members  = await dataManager.getFamilleMembers();
    const myStats  = window.patrimoineGlobal || { total: 0, cash: 0, investissements: 0, biens: 0 };

    // Calculer le total foyer (moi + membres)
    let totalFoyer = myStats.total;
    members.forEach(m => { totalFoyer += parseFloat(m.patrimoine_total || 0); });

    // Afficher les membres
    const membersHTML = members.length
        ? members.map(m => {
            const initiales = (m.nom || m.email || '?').slice(0, 2).toUpperCase();
            return `
            <div class="famille-member">
                <div class="famille-member-avatar">${escapeHTML(initiales)}</div>
                <span class="famille-member-name">${escapeHTML(m.nom || m.email)}</span>
                <span class="famille-member-role">${escapeHTML(m.role || 'Membre')}</span>
            </div>`;
          }).join('')
        : `<div style="font-size:13px;color:var(--text-tertiary);padding:8px 0;">Aucun membre pour l'instant.</div>`;

    container.innerHTML = `
        <!-- Membres -->
        <div>
            <div style="font-size:13px;font-weight:600;color:var(--text-secondary);margin-bottom:10px;text-transform:uppercase;letter-spacing:.5px;">Membres du foyer</div>
            <div class="famille-members">
                ${membersHTML}
            </div>
        </div>

        <!-- Inviter -->
        <button class="famille-invite-btn" onclick="openInviteFamilleModal()">
            ➕ Inviter un membre
        </button>

        <!-- Statistiques consolidées -->
        <div>
            <div style="font-size:13px;font-weight:600;color:var(--text-secondary);margin-bottom:10px;text-transform:uppercase;letter-spacing:.5px;">Patrimoine du foyer</div>
            <div class="famille-stat-row">
                <span class="famille-stat-label">💰 Total combiné</span>
                <span class="famille-stat-value">${fmt(totalFoyer)}</span>
            </div>
            <div class="famille-stat-row">
                <span class="famille-stat-label">🏦 Mon patrimoine</span>
                <span class="famille-stat-value">${fmt(myStats.total)}</span>
            </div>
            ${members.map(m => `
            <div class="famille-stat-row">
                <span class="famille-stat-label">👤 ${escapeHTML(m.nom || m.email)}</span>
                <span class="famille-stat-value">${fmt(m.patrimoine_total || 0)}</span>
            </div>`).join('')}
        </div>
    `;
}

// Modal d'invitation famille
function openInviteFamilleModal() {
    const modal = document.getElementById('modalInviteFamille');
    if (modal) modal.classList.add('active');
}

function closeInviteFamilleModal() {
    const modal = document.getElementById('modalInviteFamille');
    if (modal) { modal.classList.remove('active'); modal.querySelector('form')?.reset(); }
}

async function submitInviteFamille(e) {
    e.preventDefault();
    const email = document.getElementById('inviteEmail')?.value?.trim();
    if (!email) return;

    const success = await dataManager.inviteFamilleMember(email);
    if (success) {
        showToast(`Invitation envoyée à ${email} !`, 'success');
        closeInviteFamilleModal();
    } else {
        showToast('Erreur lors de l\'envoi. Vérifiez l\'email.', 'error');
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTENU RÉSEAU
// ─────────────────────────────────────────────────────────────────────────────
async function loadReseauContent() {
    showReseauTab('amis'); // Onglet par défaut
}

async function showReseauTab(tab) {
    // Mettre à jour l'UI des onglets
    document.querySelectorAll('.reseau-tab').forEach(t => {
        t.classList.toggle('active', t.dataset.tab === tab);
    });

    const container = document.getElementById('reseau-tab-content');
    if (!container) return;

    if (tab === 'amis')       await renderAmis(container);
    else if (tab === 'demandes') await renderDemandes(container);
    else if (tab === 'activite') await renderActivite(container);
}

async function renderAmis(container) {
    const amis = await dataManager.getAmis();

    if (!amis.length) {
        container.innerHTML = `
            <div class="reseau-empty">
                <span>👥</span>
                Vous n'avez pas encore d'amis.<br>Recherchez un utilisateur ci-dessous.
            </div>
            ${renderReseauSearch()}`;
        return;
    }

    container.innerHTML = `
        <div class="reseau-ami-list">
            ${amis.map(a => {
                const initiales = (a.nom || a.email || '?').slice(0, 2).toUpperCase();
                return `
                <div class="reseau-ami">
                    <div class="reseau-ami-avatar">${escapeHTML(initiales)}</div>
                    <div class="reseau-ami-info">
                        <div class="reseau-ami-name">${escapeHTML(a.nom || a.email)}</div>
                        <div class="reseau-ami-activity">${escapeHTML(a.last_activity || 'Aucune activité récente')}</div>
                    </div>
                    <div class="reseau-ami-actions">
                        <button class="reseau-btn-sm reseau-btn-view" onclick="viewAmiProfil('${escapeHTML(a.ami_id)}')">Voir</button>
                    </div>
                </div>`;
            }).join('')}
        </div>
        ${renderReseauSearch()}`;
}

async function renderDemandes(container) {
    const demandes = await dataManager.getDemandesAmis();

    if (!demandes.length) {
        container.innerHTML = `
            <div class="reseau-empty">
                <span>📬</span>
                Aucune demande en attente.
            </div>`;
        return;
    }

    container.innerHTML = `
        <div class="reseau-ami-list">
            ${demandes.map(d => {
                const initiales = (d.nom || d.email || '?').slice(0, 2).toUpperCase();
                return `
                <div class="reseau-ami">
                    <div class="reseau-ami-avatar">${escapeHTML(initiales)}</div>
                    <div class="reseau-ami-info">
                        <div class="reseau-ami-name">${escapeHTML(d.nom || d.email)}</div>
                        <div class="reseau-ami-activity">Souhaite rejoindre votre réseau</div>
                    </div>
                    <div class="reseau-ami-actions">
                        <button class="reseau-btn-sm reseau-btn-accept"
                            onclick="repondreDemandeAmi('${escapeHTML(d.id)}', true)">✓</button>
                        <button class="reseau-btn-sm reseau-btn-decline"
                            onclick="repondreDemandeAmi('${escapeHTML(d.id)}', false)">✕</button>
                    </div>
                </div>`;
            }).join('')}
        </div>`;
}

async function renderActivite(container) {
    const feed = await dataManager.getActiviteFeed();

    if (!feed.length) {
        container.innerHTML = `
            <div class="reseau-empty">
                <span>📡</span>
                Aucune activité récente dans votre réseau.
            </div>`;
        return;
    }

    container.innerHTML = `
        <div style="display:flex;flex-direction:column;">
            ${feed.map(f => {
                const initiales = (f.nom || '?').slice(0, 2).toUpperCase();
                return `
                <div class="activity-item">
                    <div class="activity-avatar">${escapeHTML(initiales)}</div>
                    <div class="activity-text">
                        <strong>${escapeHTML(f.nom || 'Utilisateur')}</strong> ${escapeHTML(f.action)}
                    </div>
                    <span class="activity-time">${escapeHTML(f.time_ago || '')}</span>
                </div>`;
            }).join('')}
        </div>`;
}

function renderReseauSearch() {
    return `
        <div class="reseau-search-add" style="margin-top:12px;">
            <input type="email" id="reseauSearchInput" placeholder="Email d'un utilisateur…" />
            <button class="reseau-add-btn" onclick="envoyerDemandeAmi()">Ajouter</button>
        </div>`;
}

async function envoyerDemandeAmi() {
    const input = document.getElementById('reseauSearchInput');
    const email = input?.value?.trim();
    if (!email) { showToast('Entrez un email valide.', 'error'); return; }

    const success = await dataManager.sendDemandeAmi(email);
    if (success) {
        showToast(`Demande envoyée à ${email} !`, 'success');
        if (input) input.value = '';
    } else {
        showToast('Utilisateur introuvable ou erreur.', 'error');
    }
}

async function repondreDemandeAmi(demandeId, accepter) {
    const success = await dataManager.repondreDemandeAmi(demandeId, accepter);
    if (success) {
        showToast(accepter ? 'Ami ajouté !' : 'Demande refusée.', accepter ? 'success' : 'info');
        await showReseauTab('demandes');
        // Mettre à jour le badge
        updateReseauBadge();
    }
}

async function updateReseauBadge() {
    const demandes = await dataManager.getDemandesAmis();
    const badge = document.querySelector('.reseau-tab[data-tab="demandes"] .reseau-tab-badge');
    if (badge) {
        badge.textContent = demandes.length || '';
        badge.style.display = demandes.length ? '' : 'none';
    }
}

function viewAmiProfil(amiId) {
    // À implémenter : modale de profil public d'un ami
    showToast('Profil de cet ami (à venir)', 'info');
}

// ─────────────────────────────────────────────────────────────────────────────
// CONFETTI animation
// ─────────────────────────────────────────────────────────────────────────────
function launchConfetti() {
    const layer = document.createElement('div');
    layer.className = 'unlock-confetti';
    document.body.appendChild(layer);

    const colors = ['#6366f1', '#8b5cf6', '#0ea5e9', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];
    const count = 60;

    for (let i = 0; i < count; i++) {
        const piece = document.createElement('div');
        piece.className = 'confetti-piece';
        piece.style.left    = Math.random() * 100 + 'vw';
        piece.style.background = colors[Math.floor(Math.random() * colors.length)];
        piece.style.animationDuration  = (Math.random() * 1.5 + 1) + 's';
        piece.style.animationDelay     = (Math.random() * 0.8) + 's';
        piece.style.width  = (Math.random() * 8 + 4) + 'px';
        piece.style.height = (Math.random() * 8 + 4) + 'px';
        layer.appendChild(piece);
    }

    setTimeout(() => layer.remove(), 3500);
}