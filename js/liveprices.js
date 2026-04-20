// =============================================================================
// LOGIQUE P&L :
//   calcStatsPro() regroupe déjà tous les achats d'une même action en UNE seule
//   position avec un PRU pondéré. Ex :
//     Achat 1 : 10 titres @ 150 €  →  capital = 1 500 €
//     Achat 2 :  5 titres @ 180 €  →  capital = 2 400 €  /  PRU = 160 €
//
//   P&L live = quantité_totale × (cours_live − PRU)
//            = 15 × (cours − 160)
//            = identique à : 10×(cours−150) + 5×(cours−180) ✓
// =============================================================================

const PROXIES    = ['https://corsproxy.io/?url=', 'https://api.allorigins.win/raw?url='];
const YAHOO_URL  = 'https://query1.finance.yahoo.com/v7/finance/quote?symbols=';
const TICKER_KEY = 'welcker_tickers'; // localStorage : { "LVMH": "MC.PA", ... }

// ── localStorage ─────────────────────────────────────────────────────────────
function getTickers() {
    try { return JSON.parse(localStorage.getItem(TICKER_KEY) || '{}'); } catch { return {}; }
}
function saveTickers(map) { localStorage.setItem(TICKER_KEY, JSON.stringify(map)); }

// ── Appel Yahoo Finance (fallback sur proxy secondaire) ───────────────────────
async function fetchPrices(symbols) {
    if (!symbols.length) return {};
    const url = YAHOO_URL + encodeURIComponent(symbols.join(','));
    for (const proxy of PROXIES) {
        try {
            const res  = await fetch(proxy + url, { signal: AbortSignal.timeout(8000) });
            if (!res.ok) continue;
            const json = await res.json();
            const raw  = json.contents ? JSON.parse(json.contents) : json;
            const out  = {};
            (raw?.quoteResponse?.result || []).forEach(q => {
                out[q.symbol] = {
                    price:    q.regularMarketPrice,
                    changePct: q.regularMarketChangePercent ?? 0,
                    currency: q.currency || 'EUR'
                };
            });
            return out;
        } catch { /* proxy suivant */ }
    }
    return {};
}

// ── Point d'entrée : à appeler en fin de updateInvestmentPage() ───────────────
// positions = stats.positions  (déjà consolidées par calcStatsPro)
// pfx       = 'cto' | 'pea' | 'crypto'
async function initLivePrices(pfx, positions) {
    if (!positions?.length) return;
    window[`_lp_${pfx}`] = positions;

    // Insérer la barre une seule fois
    if (!document.getElementById(`${pfx}LpBar`)) {
        const anchor = document.querySelector(`#page-${pfx} .table-container`)
                    ?? document.querySelector(`#page-${pfx} .positions-table`)?.parentElement;
        if (!anchor) return;
        const bar = document.createElement('div');
        bar.id = `${pfx}LpBar`;
        anchor.parentElement.insertBefore(bar, anchor);
    }

    renderBar(pfx, positions);

    // Si tous les tickers sont déjà configurés → refresh auto
    const map = getTickers();
    if (positions.length && positions.every(p => map[p.libelle || p.titre || ''])) {
        await doRefresh(pfx, positions);
    }
}

// ── Barre d'outils ───────────────────────────────────────────────────────────
function renderBar(pfx, positions) {
    const bar = document.getElementById(`${pfx}LpBar`);
    if (!bar) return;
    const map  = getTickers();
    const done = positions.filter(p => map[p.libelle || p.titre || '']).length;

    bar.innerHTML = `
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;
                    padding:10px 14px;margin-bottom:14px;
                    background:var(--bg-primary);border:1px solid var(--border-color);
                    border-radius:var(--radius-md);font-size:13px;">
            <span style="font-weight:600;">📡 Cours en direct</span>
            <span id="${pfx}LpStatus" style="flex:1;color:var(--text-tertiary);font-size:12px;">
                ${done}/${positions.length} tickers configurés
            </span>
            <button onclick="lpRefresh('${pfx}')"
                style="padding:6px 14px;background:linear-gradient(135deg,#2563eb,#7c3aed);
                       color:#fff;border:none;border-radius:8px;font-size:12px;font-weight:600;
                       cursor:pointer;font-family:inherit;">
                🔄 Rafraîchir
            </button>
            <button onclick="lpOpenConfig('${pfx}')"
                style="padding:6px 12px;background:var(--bg-secondary);color:var(--text-secondary);
                       border:1px solid var(--border-color);border-radius:8px;font-size:12px;
                       font-weight:600;cursor:pointer;font-family:inherit;">
                ⚙️ Tickers
            </button>
        </div>`;
}

// ── Rafraîchissement ─────────────────────────────────────────────────────────
async function doRefresh(pfx, positions) {
    const status = document.getElementById(`${pfx}LpStatus`);
    if (status) status.textContent = '⏳ Récupération…';

    const map = getTickers();

    // Construire { "MC.PA": positionObj, ... }
    const tickerPos = {};
    positions.forEach(p => {
        const ticker = map[p.libelle || p.titre || ''];
        if (ticker) tickerPos[ticker] = p;
    });

    const symbols = Object.keys(tickerPos);
    if (!symbols.length) {
        if (status) status.innerHTML =
            `⚠️ Aucun ticker — <a href="#" onclick="lpOpenConfig('${pfx}')"
             style="color:var(--primary-color)">configurer</a>`;
        return;
    }

    const prices = await fetchPrices(symbols);
    if (!Object.keys(prices).length) {
        if (status) status.textContent = '❌ Impossible de récupérer les cours.';
        return;
    }

    injectColumns(pfx, positions, tickerPos, prices);

    const nbOk = symbols.filter(s => prices[s]).length;
    const now  = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    if (status) status.textContent = `✅ ${nbOk}/${symbols.length} mis à jour · ${now}`;
}

// ── Injection des colonnes dans le tableau des positions ─────────────────────
function injectColumns(pfx, positions, tickerPos, prices) {
    const table = document.querySelector(`#page-${pfx} .positions-table`);
    if (!table) return;

    // En-têtes (une seule fois)
    const thead = table.querySelector('thead tr');
    if (thead && !thead.querySelector('.lp-th')) {
        ['Cours live', 'P&L live'].forEach(label => {
            const th = document.createElement('th');
            th.className = 'lp-th';
            th.textContent = label;
            thead.appendChild(th);
        });
    }

    const rows = table.querySelectorAll('tbody tr');

    positions.forEach((pos, i) => {
        const row    = rows[i];
        if (!row) return;

        const ticker = tickerPos
            ? Object.keys(tickerPos).find(t => tickerPos[t] === pos)
            : null;
        const quote  = ticker ? prices[ticker] : null;

        // Créer ou réutiliser les cellules
        let tdCours = row.querySelector('.lp-price');
        let tdPL    = row.querySelector('.lp-pl');
        if (!tdCours) {
            tdCours = document.createElement('td'); tdCours.className = 'lp-price';
            tdPL    = document.createElement('td'); tdPL.className    = 'lp-pl';
            row.appendChild(tdCours);
            row.appendChild(tdPL);
        }

        if (!quote || quote.price == null) {
            tdCours.textContent = '—';
            tdPL.textContent    = '—';
            return;
        }

        // ── P&L = quantité_totale × (cours_live − PRU_pondéré) ───────────────
        // pos.pru est déjà le PRU pondéré de TOUS les achats (calcStatsPro)
        // Mathématiquement identique à Σ(qté_i × (cours − prix_achat_i))
        const pl    = pos.quantite * (quote.price - pos.pru);
        const plPct = pos.pru > 0 ? ((quote.price - pos.pru) / pos.pru) * 100 : 0;

        const colorPL  = pl    >= 0 ? 'var(--success-color)' : 'var(--danger-color)';
        const colorDay = quote.changePct >= 0 ? 'var(--success-color)' : 'var(--danger-color)';
        const s = v => v >= 0 ? '+' : '';

        tdCours.innerHTML = `
            <div style="font-weight:600;">${fmtLive(quote.price, quote.currency)}</div>
            <div style="font-size:11px;color:${colorDay};">
                ${s(quote.changePct)}${quote.changePct.toFixed(2)}% auj.
            </div>`;

        tdPL.innerHTML = `
            <div style="font-weight:700;color:${colorPL};">${s(pl)}${fmt(pl)}</div>
            <div style="font-size:11px;color:${colorPL};">${s(plPct)}${plPct.toFixed(2)}%</div>`;
    });
}

// ── Modal configuration des tickers ─────────────────────────────────────────
function lpOpenConfig(pfx) {
    document.getElementById('lpModal')?.remove();
    const positions = window[`_lp_${pfx}`] || [];
    const map = getTickers();

    const rows = positions.map(pos => {
        const key = pos.libelle || pos.titre || '';
        const val = map[key] || '';
        return `
        <div style="display:flex;align-items:center;gap:10px;padding:9px 0;
                    border-bottom:1px solid var(--border-color);">
            <div style="flex:1;min-width:0;">
                <div style="font-size:14px;font-weight:500;color:var(--text-primary);
                            white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                    ${escapeHTML(key)}
                </div>
                <div style="font-size:11px;color:var(--text-tertiary);margin-top:2px;">
                    ${(pos.quantite || 0).toFixed(4)} titres · PRU ${fmt(pos.pru || 0)}
                </div>
            </div>
            <input class="lp-inp" data-key="${escapeHTML(key)}"
                   value="${escapeHTML(val)}" placeholder="MC.PA, AAPL…"
                   oninput="this.value=this.value.toUpperCase()"
                   style="width:120px;padding:7px 10px;border:1px solid var(--border-color);
                          border-radius:6px;font-size:13px;font-family:inherit;
                          background:var(--bg-primary);color:var(--text-primary);outline:none;"/>
            <button onclick="lpTest(this)"
                    title="Tester ce ticker"
                    style="padding:7px 10px;background:var(--bg-secondary);
                           border:1px solid var(--border-color);border-radius:6px;
                           font-size:12px;cursor:pointer;font-family:inherit;">🔍</button>
        </div>`;
    }).join('');

    const m = document.createElement('div');
    m.id = 'lpModal';
    m.className = 'modal active';
    m.innerHTML = `
        <div class="modal-content" style="max-width:520px;">
            <div class="modal-header">
                <h2>⚙️ Tickers Yahoo Finance</h2>
                <button class="modal-close"
                    onclick="document.getElementById('lpModal').remove()">&times;</button>
            </div>
            <div class="modal-body">
                <p style="font-size:13px;color:var(--text-secondary);margin-bottom:4px;">
                    Trouvez le ticker sur
                    <a href="https://finance.yahoo.com" target="_blank"
                       style="color:var(--primary-color);">finance.yahoo.com</a>.
                </p>
                <p style="font-size:12px;color:var(--text-tertiary);margin-bottom:16px;">
                    Exemples : <code>MC.PA</code> LVMH &nbsp;·&nbsp;
                               <code>TTE.PA</code> TotalEnergies &nbsp;·&nbsp;
                               <code>AAPL</code> Apple &nbsp;·&nbsp;
                               <code>CW8.PA</code> MSCI World &nbsp;·&nbsp;
                               <code>BTC-USD</code> Bitcoin
                </p>
                <div>${rows || '<p style="color:var(--text-tertiary)">Aucune position active.</p>'}</div>
                <div id="lpTestOut" style="display:none;margin-top:12px;padding:10px;
                     background:var(--bg-secondary);border-radius:8px;font-size:13px;"></div>
            </div>
            <div class="modal-actions">
                <button class="btn-secondary"
                    onclick="document.getElementById('lpModal').remove()">Annuler</button>
                <button class="btn-primary" onclick="lpSave('${pfx}')">💾 Enregistrer</button>
            </div>
        </div>`;

    m.addEventListener('click', e => { if (e.target === m) m.remove(); });
    document.body.appendChild(m);
}

async function lpTest(btn) {
    const input  = btn.closest('div').querySelector('.lp-inp');
    const out    = document.getElementById('lpTestOut');
    const ticker = input?.value?.trim().toUpperCase();
    if (!ticker || !out) return;

    out.style.display = 'block';
    out.textContent   = `⏳ Test "${ticker}"…`;

    const prices = await fetchPrices([ticker]);
    if (prices[ticker]) {
        const p   = prices[ticker];
        const clr = p.changePct >= 0 ? 'var(--success-color)' : 'var(--danger-color)';
        const s   = p.changePct >= 0 ? '+' : '';
        out.innerHTML = `✅ <strong>${ticker}</strong> — ${fmtLive(p.price, p.currency)}
            <span style="color:${clr};margin-left:8px;">${s}${p.changePct.toFixed(2)}% auj.</span>`;
        input.style.borderColor = 'var(--success-color)';
    } else {
        out.innerHTML = `❌ "<strong>${ticker}</strong>" introuvable. Vérifiez sur Yahoo Finance.`;
        input.style.borderColor = 'var(--danger-color)';
    }
}

async function lpSave(pfx) {
    const map = getTickers();
    document.querySelectorAll('.lp-inp').forEach(inp => {
        const key = inp.dataset.key;
        const val = inp.value.trim().toUpperCase();
        if (val) map[key] = val; else delete map[key];
    });
    saveTickers(map);
    document.getElementById('lpModal')?.remove();
    const positions = window[`_lp_${pfx}`] || [];
    renderBar(pfx, positions);
    await doRefresh(pfx, positions);
}

// ── Formatage prix (devise variable selon le marché) ─────────────────────────
function fmtLive(value, currency = 'EUR') {
    if (value == null) return '—';
    try {
        return new Intl.NumberFormat('fr-FR', {
            style: 'currency', currency,
            minimumFractionDigits: 2, maximumFractionDigits: 2
        }).format(value);
    } catch {
        return `${value.toFixed(2)} ${currency}`;
    }
}

// ── Expositions globales ─────────────────────────────────────────────────────
window.initLivePrices = initLivePrices;
window.lpRefresh      = (pfx) => doRefresh(pfx, window[`_lp_${pfx}`] || []);
window.lpOpenConfig   = lpOpenConfig;
window.lpTest         = lpTest;
window.lpSave         = lpSave;
