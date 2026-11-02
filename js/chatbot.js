// =============================================================================
// ASSISTANT FINANCIER IA - API GEMINI (GOOGLE AI STUDIO)
// Intégration complète : Contexte financier temps réel, Personas & Prompts
// =============================================================================

(function() {
    // État local de la conversation
    let conversationHistory = []; // format: [{ role: 'user'|'model', parts: [{ text }] }]
    let isWaitingResponse = false;

    // Personas disponibles
    const PERSONAS = {
        wealth_manager: {
            title: "Gestionnaire de Patrimoine Privé",
            role: "Conseiller Patrimonial Family Office",
            icon: "briefcase",
            prompt: `Tu es un Gestionnaire de Patrimoine Privé et Conseiller de Family Office suisse de haut rang.
Ton rôle est d'analyser la situation financière de ton client avec sagesse, prudence, vision stratégique à long terme et rigueur.
Tu privilégies :
- La diversification et la résilience du patrimoine global (trésorerie, actions, immobilier, actifs réels).
- La gestion saine du risque et la sécurité du matelas de précaution.
- L'optimisation fiscale et la minimisation des coûts de détention.
- Des explications pédagogiques, bienveillantes, étayées par les montants exacts de l'utilisateur.
Utilise toujours des montants en euros formatés (ex: 1 250,00 €), structure tes réponses avec des titres Markdown clairs et des listes à puces concises.`
        },
        analyst: {
            title: "Analyste Financier & Quant",
            role: "Analyste Marchés & Performance",
            icon: "line-chart",
            prompt: `Tu es un Analyste Financier Senior et Quant.
Ton style est ultra-chiffré, objectif, direct et mathématique.
Tu te focalises sur :
- Les rendements réels, les ratios de performance et le coût d'opportunité du capital.
- La décomposition précise des flux de trésorerie (taux d'épargne, charges fixes vs variables).
- L'efficience de l'allocation d'actifs et les plus ou moins-values constatées.
Cite systématiquement les chiffres précis issus des comptes du client, compare les ratios aux standards du secteur et sois synthétique.`
        },
        budget_coach: {
            title: "Coach Budgétaire Radical",
            role: "Optimiseur de Cash-Flow",
            icon: "target",
            prompt: `Tu es un Coach Budgétaire d'Élite, intransigeant sur les dépenses superflues.
Ton objectif numéro un est de booster la capacité d'épargne mensuelle du client et d'éliminer tout gaspillage.
Tu te focalises sur :
- L'analyse au scalpel des décaissements et postes de dépenses les plus lourds.
- L'identification des abonnements ou charges compressibles.
- Des actions immédiates, radicales et pragmatiques pour économiser dès ce mois-ci.
Sois direct, percutant, motivant et sans langue de bois, tout en restant respectueux.`
        },
        growth_trader: {
            title: "Trader & Croissance / Crypto",
            role: "Stratège Actifs Dynamiques",
            icon: "zap",
            prompt: `Tu es un Stratège en Investissements Dynamiques, Marchés Actions et Écosystème Web3/Crypto.
Ton objectif est de maximiser la croissance du capital à travers des paris asymétriques réfléchis et une allocation offensive mais maîtrisée.
Tu te focalises sur :
- La rentabilité des portefeuilles CTO, PEA et Crypto.
- La gestion du risque de perte maximale (drawdown).
- L'identification de leviers de croissance financière.
Sois moderne, stratégique, énergique et donne des pistes concrètes d'optimisation.`
        }
    };

    // ── GESTION DE LA CLÉ API & MODÈLE ──────────────────────────────────────────
    function getApiKey() {
        return localStorage.getItem('welcker_gemini_api_key') || '';
    }

    function setApiKey(key) {
        if (!key) {
            localStorage.removeItem('welcker_gemini_api_key');
        } else {
            localStorage.setItem('welcker_gemini_api_key', key.trim());
        }
    }

    function getSelectedModel() {
        return localStorage.getItem('welcker_gemini_model') || 'gemini-2.5-pro';
    }

    function setSelectedModel(model) {
        localStorage.setItem('welcker_gemini_model', model);
    }

    function getSelectedPersona() {
        return localStorage.getItem('welcker_gemini_persona') || 'wealth_manager';
    }

    function setSelectedPersona(persona) {
        localStorage.setItem('welcker_gemini_persona', persona);
    }

    // ── EXTRACTION DU CONTEXTE FINANCIER COMPLET EN TEMPS RÉEL ──────────────────
    async function extractFinancialContext() {
        try {
            const [
                accounts,
                ctoTx, ctoCash,
                peaTx, peaCash,
                cryptoTx, cryptoCash,
                biens,
                entrees,
                sorties
            ] = await Promise.all([
                dataManager.getBankAccounts ? dataManager.getBankAccounts() : [],
                dataManager.getInvestments ? dataManager.getInvestments('CTO') : [],
                dataManager.getCashTransactions ? dataManager.getCashTransactions('CTO') : [],
                dataManager.getInvestments ? dataManager.getInvestments('PEA') : [],
                dataManager.getCashTransactions ? dataManager.getCashTransactions('PEA') : [],
                dataManager.getCryptoTransactions ? dataManager.getCryptoTransactions() : [],
                dataManager.getCashTransactions ? dataManager.getCashTransactions('CRYPTO') : [],
                dataManager.getBiens ? dataManager.getBiens() : [],
                dataManager.getCashFlow ? dataManager.getCashFlow('entree') : [],
                dataManager.getCashFlow ? dataManager.getCashFlow('sortie') : []
            ]);

            // Calcul stats investissements
            const ctoStats = typeof calcStatsPro === 'function' ? calcStatsPro(ctoTx, ctoCash) : { totalPortefeuille: 0, performance: 0, positions: [] };
            const peaStats = typeof calcStatsPro === 'function' ? calcStatsPro(peaTx, peaCash) : { totalPortefeuille: 0, performance: 0, positions: [] };
            const cryptoStats = typeof calcStatsPro === 'function' ? calcStatsPro(cryptoTx, cryptoCash) : { totalPortefeuille: 0, performance: 0, positions: [] };

            // Totaux
            const totalLiquidites = (accounts || [])
                .filter(a => a.type !== 'investissement_passif')
                .reduce((s, a) => s + parseFloat(a.solde || 0), 0);

            const totalInvestPassif = (accounts || [])
                .filter(a => a.type === 'investissement_passif')
                .reduce((s, a) => s + parseFloat(a.solde || 0), 0);

            const totalInvest = (ctoStats.totalPortefeuille || 0) + (peaStats.totalPortefeuille || 0) + (cryptoStats.totalPortefeuille || 0) + totalInvestPassif;
            const totalBiens = (biens || []).reduce((s, b) => s + parseFloat(b.valeur || 0), 0);
            const totalPatrimoine = totalLiquidites + totalInvest + totalBiens;

            // Analyse flux
            const moisEntrees = new Set((entrees || []).map(e => (e.date || '').substring(0, 7)).filter(Boolean));
            const moisSorties = new Set((sorties || []).map(s => (s.date || '').substring(0, 7)).filter(Boolean));
            const nbMoisE = Math.max(moisEntrees.size, 1);
            const nbMoisS = Math.max(moisSorties.size, 1);

            const sommeEntrees = (entrees || []).reduce((s, e) => s + parseFloat(e.montant || 0), 0);
            const sommeSorties = (sorties || []).reduce((s, e) => s + parseFloat(e.montant || 0), 0);

            const moyenneEntreesMensuelle = sommeEntrees / nbMoisE;
            const moyenneSortiesMensuelle = sommeSorties / nbMoisS;
            const epargneMensuelle = moyenneEntreesMensuelle - moyenneSortiesMensuelle;
            const tauxEpargne = moyenneEntreesMensuelle > 0 ? (epargneMensuelle / moyenneEntreesMensuelle) * 100 : 0;
            const runwayMois = moyenneSortiesMensuelle > 0 ? (totalLiquidites / moyenneSortiesMensuelle) : 0;

            // Dépenses par catégorie
            const depensesParCat = {};
            (sorties || []).forEach(s => {
                const c = s.categorie || 'autre';
                depensesParCat[c] = (depensesParCat[c] || 0) + parseFloat(s.montant || 0);
            });

            // Entrées par catégorie
            const entreesParCat = {};
            (entrees || []).forEach(e => {
                const c = e.categorie || 'autre';
                entreesParCat[c] = (entreesParCat[c] || 0) + parseFloat(e.montant || 0);
            });

            // Formatage récapitulatif textuel pour le prompt système
            let brief = `=== DONNÉES FINANCIÈRES RÉELLES ET À JOUR DE L'UTILISATEUR (APPLICATION WELCKER) ===\n\n`;
            brief += `1. PATRIMOINE CONSOLIDÉ NET : ${totalPatrimoine.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €\n`;
            brief += `   - Liquidités bancaires : ${totalLiquidites.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} € (${totalPatrimoine > 0 ? ((totalLiquidites / totalPatrimoine) * 100).toFixed(1) : 0}%)\n`;
            brief += `   - Placements & investissements : ${totalInvest.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} € (${totalPatrimoine > 0 ? ((totalInvest / totalPatrimoine) * 100).toFixed(1) : 0}%)\n`;
            brief += `   - Autres biens physiques & immobilier : ${totalBiens.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} € (${totalPatrimoine > 0 ? ((totalBiens / totalPatrimoine) * 100).toFixed(1) : 0}%)\n\n`;

            brief += `2. COMPTES BANCAIRES :\n`;
            (accounts || []).forEach(a => {
                brief += `   - ${a.nom || 'Compte'} (${a.type || 'compte'}) : ${parseFloat(a.solde || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €\n`;
            });
            brief += `\n`;

            brief += `3. PORTEFEUILLES D'INVESTISSEMENTS :\n`;
            brief += `   - CTO (Compte-Titres) : ${ctoStats.totalPortefeuille.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} € | Performance globale : ${ctoStats.performance >= 0 ? '+' : ''}${ctoStats.performance.toFixed(2)}%\n`;
            if (ctoStats.positions && ctoStats.positions.length > 0) {
                ctoStats.positions.slice(0, 5).forEach(p => {
                    brief += `     * ${p.titre || p.libelle} : ${p.valorisation.toFixed(2)} € (PV latente: ${p.pvLatente.toFixed(2)} €)\n`;
                });
            }
            brief += `   - PEA (Plan Épargne Actions) : ${peaStats.totalPortefeuille.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} € | Performance globale : ${peaStats.performance >= 0 ? '+' : ''}${peaStats.performance.toFixed(2)}%\n`;
            if (peaStats.positions && peaStats.positions.length > 0) {
                peaStats.positions.slice(0, 5).forEach(p => {
                    brief += `     * ${p.titre || p.libelle} : ${p.valorisation.toFixed(2)} € (PV latente: ${p.pvLatente.toFixed(2)} €)\n`;
                });
            }
            brief += `   - Crypto-actifs : ${cryptoStats.totalPortefeuille.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} € | Performance globale : ${cryptoStats.performance >= 0 ? '+' : ''}${cryptoStats.performance.toFixed(2)}%\n\n`;

            brief += `4. AUTRES BIENS PHYSIQUES :\n`;
            (biens || []).forEach(b => {
                brief += `   - ${b.nom || 'Bien'} : ${parseFloat(b.valeur || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €${b.notes ? ` (Notes: ${b.notes})` : ''}\n`;
            });
            brief += `\n`;

            brief += `5. CASH-FLOW MENSUEL & TRÉSORERIE :\n`;
            brief += `   - Entrées moyennes constatées : ${moyenneEntreesMensuelle.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} € / mois\n`;
            Object.entries(entreesParCat).forEach(([cat, sum]) => {
                brief += `     * ${cat} : ${(sum / nbMoisE).toFixed(2)} € / mois\n`;
            });
            brief += `   - Dépenses moyennes constatées : ${moyenneSortiesMensuelle.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} € / mois\n`;
            Object.entries(depensesParCat).forEach(([cat, sum]) => {
                brief += `     * ${cat} : ${(sum / nbMoisS).toFixed(2)} € / mois\n`;
            });
            brief += `   - Épargne nette mensuelle : ${epargneMensuelle.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} € / mois\n`;
            brief += `   - Taux d'épargne : ${tauxEpargne.toFixed(1)}%\n`;
            brief += `   - Runway (matelas de réserve de trésorerie disponible) : ${runwayMois.toFixed(1)} mois de dépenses courantes couvertes\n`;

            return brief;
        } catch (e) {
            console.error('Erreur extraction contexte financier:', e);
            return 'Contexte financier en cours de synchronisation.';
        }
    }

    // ── PARSER MARKDOWN SIMPLE & SÉCURISÉ ───────────────────────────────────────
    function renderMarkdown(md) {
        if (!md) return '';
        let html = md
            // Escape basique
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');

        // Blocs de code ```...```
        html = html.replace(/```([a-z]*)\n([\s\S]*?)```/g, (match, lang, code) => {
            return `<pre><code>${code.trim()}</code></pre>`;
        });

        // Code inline `code`
        html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

        // Titres ###, ##, #
        html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
        html = html.replace(/^## (.*$)/gim, '<h3>$1</h3>');
        html = html.replace(/^# (.*$)/gim, '<h2>$1</h2>');

        // Gras **text** et Italique *text*
        html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

        // Ligne horizontale
        html = html.replace(/^---$/gim, '<hr>');

        // Listes à puces (- ou *)
        html = html.replace(/^\s*[-*]\s+(.*$)/gim, '<li>$1</li>');
        html = html.replace(/(<li>.*<\/li>)/gims, (match) => `<ul>${match}</ul>`);
        // Évite listes imbriquées multiples
        html = html.replace(/<\/ul>\s*<ul>/g, '');

        // Retours à la ligne doubles en paragraphes
        const paras = html.split(/\n\n+/);
        html = paras.map(p => {
            p = p.trim();
            if (p.startsWith('<h3>') || p.startsWith('<h2>') || p.startsWith('<ul>') || p.startsWith('<pre>') || p.startsWith('<hr>')) {
                return p;
            }
            return `<p>${p.replace(/\n/g, '<br>')}</p>`;
        }).join('');

        return html;
    }

    // ── APPEL API GEMINI ───────────────────────────────────────────────────────
    async function callGeminiApi(userMessage) {
        const apiKey = getApiKey();
        if (!apiKey) {
            throw new Error('MISSING_API_KEY');
        }

        const model = getSelectedModel();
        const personaKey = getSelectedPersona();
        const persona = PERSONAS[personaKey] || PERSONAS.wealth_manager;

        // Préparer le contexte financier temps réel
        const financialContext = await extractFinancialContext();

        // Système d'instruction complet
        const systemPrompt = `${persona.prompt}\n\n${financialContext}\n\nRÈGLES STRICTES DE RÉPONSE :
1. Réponds TOUJOURS en français avec clarté, élégance et précision.
2. Utilise les données financières réelles fournies ci-dessus (ne dis jamais que tu n'as pas accès aux comptes de l'utilisateur : TU AS LEUR SYNTHÈSE COMPLÈTE EN TEMPS RÉEL).
3. Cite les chiffres précis en euros (€), calcule les pourcentages pertinents et structure tes réponses avec des puces claires.
4. Adopte strictement la personnalité sélectionnée : ${persona.title}.`;

        // Ajouter message utilisateur à l'historique local
        conversationHistory.push({
            role: 'user',
            parts: [{ text: userMessage }]
        });

        // Modèles candidats pour fallback gracieux si besoin
        const modelsToTry = [model];
        if (model !== 'gemini-2.5-flash') modelsToTry.push('gemini-2.5-flash');
        if (model !== 'gemini-1.5-pro') modelsToTry.push('gemini-1.5-pro');

        let lastError = null;
        for (const candidateModel of modelsToTry) {
            try {
                const url = `https://generativelanguage.googleapis.com/v1beta/models/${candidateModel}:generateContent?key=${apiKey}`;
                
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        systemInstruction: {
                            parts: [{ text: systemPrompt }]
                        },
                        contents: conversationHistory,
                        generationConfig: {
                            temperature: 0.35,
                            maxOutputTokens: 2500
                        }
                    })
                });

                if (!response.ok) {
                    const errData = await response.json().catch(() => ({}));
                    const errMsg = errData.error?.message || `Erreur HTTP ${response.status}`;
                    console.warn(`Échec tentative modèle ${candidateModel}:`, errMsg);
                    lastError = new Error(errMsg);
                    // Si l'erreur est une clé invalide, ne pas réessayer avec les autres modèles
                    if (response.status === 400 && errMsg.includes('API key not valid')) {
                        throw new Error('INVALID_API_KEY');
                    }
                    continue;
                }

                const data = await response.json();
                const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text;
                if (!replyText) {
                    throw new Error('Réponse vide reçue de l\'API Gemini');
                }

                // Enregistrer dans l'historique
                conversationHistory.push({
                    role: 'model',
                    parts: [{ text: replyText }]
                });

                return replyText;
            } catch (err) {
                if (err.message === 'INVALID_API_KEY') throw err;
                lastError = err;
            }
        }

        throw lastError || new Error('Impossible de joindre le modèle Gemini');
    }

    // ── GESTION DE L'INTERFACE UI ──────────────────────────────────────────────
    window.toggleChatbot = function() {
        const drawer = document.getElementById('aiDrawer');
        const backdrop = document.getElementById('aiDrawerBackdrop');
        if (!drawer) return;

        const isOpen = drawer.classList.contains('active');
        if (isOpen) {
            drawer.classList.remove('active');
            if (backdrop) backdrop.classList.remove('active');
        } else {
            drawer.classList.add('active');
            if (backdrop) backdrop.classList.add('active');
            initChatbotUI();
            // Focus input
            setTimeout(() => {
                const input = document.getElementById('aiMessageInput');
                if (input) input.focus();
            }, 280);
        }
    };

    window.toggleAiSettings = function() {
        const panel = document.getElementById('aiApiKeyPanel');
        if (!panel) return;
        panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
        if (panel.style.display === 'block') {
            const input = document.getElementById('aiApiKeyInput');
            if (input) {
                input.value = getApiKey();
                input.focus();
            }
        }
    };

    window.saveAiApiKey = function() {
        const input = document.getElementById('aiApiKeyInput');
        if (!input) return;
        const key = input.value.trim();
        if (!key) {
            setApiKey('');
            if (typeof showToast === 'function') showToast('Clé API supprimée.', 'info');
        } else {
            setApiKey(key);
            if (typeof showToast === 'function') showToast('Clé API Gemini enregistrée avec succès !', 'success');
            document.getElementById('aiApiKeyPanel').style.display = 'none';
        }
        renderWelcomeCard();
    };

    window.onAiPersonaChange = function() {
        const sel = document.getElementById('aiPersonaSelect');
        if (!sel) return;
        setSelectedPersona(sel.value);
        if (typeof showToast === 'function') {
            const p = PERSONAS[sel.value];
            showToast(`Persona activé : ${p ? p.title : sel.value}`, 'info');
        }
        renderWelcomeCard();
    };

    window.onAiModelChange = function() {
        const sel = document.getElementById('aiModelSelect');
        if (!sel) return;
        setSelectedModel(sel.value);
        if (typeof showToast === 'function') {
            showToast(`Modèle : ${sel.options[sel.selectedIndex].text}`, 'info');
        }
    };

    window.clearAiChat = function() {
        conversationHistory = [];
        renderWelcomeCard();
        if (typeof showToast === 'function') showToast('Historique de discussion effacé.', 'info');
    };

    window.sendAiPrompt = function(promptText) {
        const input = document.getElementById('aiMessageInput');
        if (input) {
            input.value = promptText;
            handleAiSubmit();
        }
    };

    window.handleAiInputKeydown = function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleAiSubmit();
        }
    };

    window.handleAiSubmit = async function(e) {
        if (e) e.preventDefault();
        if (isWaitingResponse) return;

        const input = document.getElementById('aiMessageInput');
        const sendBtn = document.getElementById('aiSendBtn');
        const text = input ? input.value.trim() : '';

        if (!text) return;

        const apiKey = getApiKey();
        if (!apiKey) {
            appendMessage('user', text);
            appendSystemNotice('api_key_required');
            if (input) input.value = '';
            return;
        }

        // Afficher message utilisateur
        appendMessage('user', text);
        if (input) {
            input.value = '';
            input.style.height = 'auto';
        }

        // Afficher indicateur de réflexion
        isWaitingResponse = true;
        if (sendBtn) sendBtn.disabled = true;
        const loadingBubble = showTypingIndicator();

        try {
            const response = await callGeminiApi(text);
            removeTypingIndicator(loadingBubble);
            appendMessage('assistant', response);
        } catch (err) {
            removeTypingIndicator(loadingBubble);
            console.error('Erreur Chatbot Gemini:', err);
            if (err.message === 'MISSING_API_KEY' || err.message === 'INVALID_API_KEY') {
                appendSystemNotice(err.message === 'INVALID_API_KEY' ? 'api_key_invalid' : 'api_key_required');
            } else {
                appendMessage('assistant', `⚠️ **Erreur de communication avec Gemini** : ${err.message || 'Vérifiez votre connexion internet ou vos quotas Google AI Studio.'}`);
            }
        } finally {
            isWaitingResponse = false;
            if (sendBtn) sendBtn.disabled = false;
            scrollToBottom();
            if (window.lucide) lucide.createIcons();
        }
    };

    function appendMessage(role, text) {
        const container = document.getElementById('aiMessagesContainer');
        if (!container) return;

        // Supprimer la carte de bienvenue dès le 1er message
        const welcome = container.querySelector('.ai-welcome-card');
        if (welcome && conversationHistory.length <= 1) {
            welcome.remove();
        }

        const msgDiv = document.createElement('div');
        msgDiv.className = `ai-message ${role}`;

        if (role === 'user') {
            msgDiv.innerHTML = `<div class="ai-message-bubble">${escapeHTML(text).replace(/\n/g, '<br>')}</div>`;
        } else {
            msgDiv.innerHTML = `
                <div class="ai-avatar" style="width:28px;height:28px;align-self:flex-start;margin-top:2px;">
                    <i data-lucide="bot" style="width:15px;height:15px;"></i>
                </div>
                <div class="ai-message-bubble">${renderMarkdown(text)}</div>
            `;
        }

        container.appendChild(msgDiv);
        scrollToBottom();
        if (window.lucide) lucide.createIcons();
    }

    function showTypingIndicator() {
        const container = document.getElementById('aiMessagesContainer');
        if (!container) return null;

        const typingDiv = document.createElement('div');
        typingDiv.className = 'ai-message assistant typing-placeholder';
        typingDiv.innerHTML = `
            <div class="ai-avatar" style="width:28px;height:28px;align-self:flex-start;margin-top:2px;">
                <i data-lucide="bot" style="width:15px;height:15px;"></i>
            </div>
            <div class="ai-message-bubble" style="padding:10px 14px;">
                <div class="ai-typing-indicator">
                    <span class="ai-typing-dot"></span>
                    <span class="ai-typing-dot"></span>
                    <span class="ai-typing-dot"></span>
                </div>
            </div>
        `;
        container.appendChild(typingDiv);
        scrollToBottom();
        if (window.lucide) lucide.createIcons();
        return typingDiv;
    }

    function removeTypingIndicator(el) {
        if (el && el.parentNode) el.remove();
    }

    function appendSystemNotice(type) {
        const container = document.getElementById('aiMessagesContainer');
        if (!container) return;

        const noticeDiv = document.createElement('div');
        noticeDiv.className = 'ai-message assistant';

        if (type === 'api_key_required' || type === 'api_key_invalid') {
            const isInvalid = type === 'api_key_invalid';
            noticeDiv.innerHTML = `
                <div class="ai-avatar" style="width:28px;height:28px;align-self:flex-start;color:var(--danger-color);">
                    <i data-lucide="key" style="width:15px;height:15px;"></i>
                </div>
                <div class="ai-message-bubble" style="border-left: 3px solid var(--danger-color);">
                    <h3 style="margin-top:0;color:var(--text-primary);display:flex;align-items:center;gap:6px;">
                        ${isInvalid ? 'Clé API Gemini invalide' : 'Clé API Google AI Studio requise'}
                    </h3>
                    <p style="font-size:13px;color:var(--text-secondary);">
                        ${isInvalid 
                            ? 'La clé configurée a été refusée par l\'API Google AI Studio. Veuillez vérifier que vous l\'avez copiée intégralement.' 
                            : 'Pour dialoguer avec votre assistant financier et analyser votre patrimoine en direct, veuillez renseigner votre clé gratuite Google AI Studio.'}
                    </p>
                    <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap;">
                        <button type="button" class="btn-primary" style="font-size:12px;padding:6px 12px;" onclick="toggleAiSettings()">
                            <i data-lucide="key" style="width:13px;height:13px;"></i> Configurer ma clé API
                        </button>
                        <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener" class="btn-secondary" style="font-size:12px;padding:6px 12px;text-decoration:none;">
                            Créer ma clé gratuite sur aistudio.google.com ↗
                        </a>
                    </div>
                </div>
            `;
        }

        container.appendChild(noticeDiv);
        scrollToBottom();
        if (window.lucide) lucide.createIcons();
    }

    function renderWelcomeCard() {
        const container = document.getElementById('aiMessagesContainer');
        if (!container) return;

        container.innerHTML = '';
        const personaKey = getSelectedPersona();
        const persona = PERSONAS[personaKey] || PERSONAS.wealth_manager;
        const hasKey = !!getApiKey();

        const welcome = document.createElement('div');
        welcome.className = 'ai-welcome-card';
        welcome.innerHTML = `
            <div class="ai-welcome-header">
                <div class="ai-avatar">
                    <i data-lucide="sparkles"></i>
                </div>
                <div>
                    <h3>Bonjour ! Je suis votre ${persona.title}.</h3>
                    <p class="ai-welcome-desc">J'ai accès à l'ensemble de votre patrimoine consolidé, comptes bancaires, portefeuilles et flux de trésorerie Welcker.</p>
                </div>
            </div>

            <div class="ai-welcome-features">
                <div class="ai-feature-pill">
                    <i data-lucide="pie-chart"></i>
                    <span>Allocation & diversification</span>
                </div>
                <div class="ai-feature-pill">
                    <i data-lucide="trending-up"></i>
                    <span>Optimisation de cash-flow</span>
                </div>
                <div class="ai-feature-pill">
                    <i data-lucide="shield"></i>
                    <span>Audit du matelas de réserve</span>
                </div>
                <div class="ai-feature-pill">
                    <i data-lucide="cpu"></i>
                    <span>Modèle : ${getSelectedModel()}</span>
                </div>
            </div>

            ${!hasKey ? `
            <div style="background:var(--primary-subtle);border:1px solid var(--primary-border);border-radius:var(--radius-md);padding:10px 12px;margin-top:6px;display:flex;align-items:center;justify-content:space-between;gap:10px;">
                <div style="font-size:12px;color:var(--text-primary);">
                    <strong>Clé API requise :</strong> Activez votre assistant avec votre clé Google AI Studio.
                </div>
                <button type="button" class="btn-primary" style="font-size:11.5px;padding:5px 10px;white-space:nowrap;" onclick="toggleAiSettings()">
                    Ajouter ma clé
                </button>
            </div>
            ` : `
            <div style="font-size:11.5px;color:var(--text-tertiary);margin-top:4px;">
                Posez-moi n'importe quelle question ou choisissez une suggestion ci-dessous pour démarrer l'analyse.
            </div>
            `}
        `;

        container.appendChild(welcome);
        if (window.lucide) lucide.createIcons();
    }

    function scrollToBottom() {
        const container = document.getElementById('aiMessagesContainer');
        if (container) {
            container.scrollTop = container.scrollHeight;
        }
    }

    function initChatbotUI() {
        const personaSelect = document.getElementById('aiPersonaSelect');
        if (personaSelect) personaSelect.value = getSelectedPersona();

        const modelSelect = document.getElementById('aiModelSelect');
        if (modelSelect) modelSelect.value = getSelectedModel();

        const apiKeyInput = document.getElementById('aiApiKeyInput');
        if (apiKeyInput) apiKeyInput.value = getApiKey();

        if (conversationHistory.length === 0) {
            renderWelcomeCard();
        }
    }

    // Auto-initialisation au chargement
    document.addEventListener('DOMContentLoaded', () => {
        initChatbotUI();
    });
})();
