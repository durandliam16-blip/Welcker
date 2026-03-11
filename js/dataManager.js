
// =============================================================================
// DATA MANAGER — 100% aligné sur le schéma Supabase réel
// =============================================================================
class DataManager {

    // ── Profil (table: profiles) ──────────────────────────────────────────────
    // Colonnes: id, nom, email, telephone, updated_at
    async getProfile() {
        const user = await getUser(); if (!user) return {};
        const { data, error } = await sb.from('profiles').select('*').eq('id', user.id).single();
        if (error && error.code !== 'PGRST116') { console.error('getProfile:', error.message); return {}; }
        return data || {};
    }

    async updateProfile(profileData) {
        const user = await getUser(); if (!user) return;
        const { error } = await sb.from('profiles').upsert({
            id:         user.id,
            nom:        profileData.nom        || null,
            email:      profileData.email      || null,
            telephone:  profileData.telephone  || null,
            avatar_url: profileData.avatar_url || null,
            updated_at: new Date().toISOString()
        });
        if (error) { console.error('updateProfile:', error.message); showToast('Erreur profil : ' + error.message, 'error'); }
        else showToast('Profil enregistré !', 'success');
    }

    // ── Investissements CTO/PEA ───────────────────────────────────────────────
    // Colonnes: id, user_id, type(boolean), titre, libelle, quantite,
    //           prix_unitaire, frais, date
    async getInvestments(mode) {
        const user = await getUser(); if (!user) return [];
        const table = mode === 'CTO' ? 'investment_transactions_cto' : 'investment_transactions_pea';
        const { data, error } = await sb.from(table).select('*')
            .eq('user_id', user.id).order('date', { ascending: false });
        if (error) { console.error(`getInvestments(${mode}):`, error.message); return []; }
        return data || [];
    }

    async addInvestment(mode, transaction) {
        const user = await getUser(); if (!user) return null;
        const table = mode === 'CTO' ? 'investment_transactions_cto' : 'investment_transactions_pea';
        // Seules les colonnes existantes dans le schéma
        const payload = {
            user_id:       user.id,
            type:          Boolean(transaction.type),   // boolean NOT NULL
            titre:         transaction.titre,
            libelle:       transaction.libelle || null,
            quantite:      parseFloat(transaction.quantite),
            prix_unitaire: parseFloat(transaction.prix_unitaire),
            frais:         parseFloat(transaction.frais) || 0,
            date:          transaction.date
        };
        const { data, error } = await sb.from(table).insert([payload]).select();
        if (error) { console.error(`addInvestment(${mode}):`, error.message); showToast('Erreur : ' + error.message, 'error'); return null; }
        showToast('Transaction ajoutée !', 'success');
        return data;
    }

    async deleteInvestment(mode, id) {
        const user = await getUser(); if (!user) return false;
        const table = mode === 'CTO' ? 'investment_transactions_cto' : 'investment_transactions_pea';
        const { error } = await sb.from(table).delete().eq('id', id).eq('user_id', user.id);
        if (error) { console.error(`deleteInvestment(${mode}):`, error.message); showToast('Erreur suppression : ' + error.message, 'error'); return false; }
        showToast('Transaction supprimée', 'success');
        return true;
    }

    // ── Crypto ──────────────────────────────────────────
    async getCryptoTransactions() {
        const user = await getUser(); if (!user) return [];
        const { data, error } = await sb.from('investment_transactions_crypto').select('*')
            .eq('user_id', user.id).order('date', { ascending: false });
        if (error) { console.error('getCryptoTransactions:', error.message); return []; }
        return data || [];
    }

    async addCryptoTransaction(transaction) {
        const user = await getUser(); if (!user) return null;
        const payload = {
            user_id:       user.id,
            type:          Boolean(transaction.type),
            titre:         transaction.titre,
            libelle:       transaction.libelle || null,
            quantite:      parseFloat(transaction.quantite),
            prix_unitaire: parseFloat(transaction.prix_unitaire),
            frais:         parseFloat(transaction.frais) || 0,
            date:          transaction.date
        };
        const { data, error } = await sb.from('investment_transactions_crypto').insert([payload]).select();
        if (error) { console.error('addCryptoTransaction:', error.message); showToast('Erreur : ' + error.message, 'error'); return null; }
        showToast('Transaction ajoutée !', 'success');
        return data;
    }

    async deleteCryptoTransaction(id) {
        const user = await getUser(); if (!user) return false;
        const { error } = await sb.from('investment_transactions_crypto').delete().eq('id', id).eq('user_id', user.id);
        if (error) { console.error('deleteCryptoTransaction:', error.message); showToast('Erreur suppression : ' + error.message, 'error'); return false; }
        showToast('Transaction supprimée', 'success');
        return true;
    }

    // ── Cash Transactions ──────────────────────────────────────────
    async getCashTransactions(mode) {
        const user = await getUser(); if (!user) return [];
        const { data, error } = await sb.from('cash_transactions').select('*')
            .eq('user_id', user.id)
            .eq('account_type', mode)
            .order('date', { ascending: false });
        if (error) { console.error(`getCashTransactions(${mode}):`, error.message); return []; }
        return data || [];
    }

    async addCashTransaction(mode, transaction) {
        const user = await getUser(); if (!user) return false;
        const payload = {
            user_id:      user.id,
            account_type: mode,
            type:         transaction.type,
            montant:      parseFloat(transaction.montant),
            description:  transaction.description || null,
            date:         transaction.date
        };
        const { error } = await sb.from('cash_transactions').insert([payload]);
        if (error) { console.error(`addCashTransaction(${mode}):`, error.message); showToast('Erreur : ' + error.message, 'error'); return false; }
        showToast('Transaction cash ajoutée !', 'success');
        return true;
    }

    async deleteCashTransaction(id) {
        const user = await getUser(); if (!user) return false;
        const { error } = await sb.from('cash_transactions').delete().eq('id', id).eq('user_id', user.id);
        if (error) { console.error('deleteCashTransaction:', error.message); showToast('Erreur suppression : ' + error.message, 'error'); return false; }
        showToast('Transaction supprimée', 'success');
        return true;
    }

    // ── Crypto (identique à CTO/PEA) ──────────────────────────────
    async getCryptoTransactions() {
        const user = await getUser(); if (!user) return [];
        const { data, error } = await sb.from('investment_transactions_crypto').select('*')
            .eq('user_id', user.id).order('date', { ascending: false });
        if (error) { console.error('getCryptoTransactions:', error.message); return []; }
        return data || [];
    }

    async addCryptoTransaction(transaction) {
        const user = await getUser(); if (!user) return null;
        const payload = {
            user_id:       user.id,
            type:          Boolean(transaction.type),
            titre:         transaction.titre,
            libelle:       transaction.libelle || null,
            quantite:      parseFloat(transaction.quantite),
            prix_unitaire: parseFloat(transaction.prix_unitaire),
            frais:         parseFloat(transaction.frais) || 0,
            date:          transaction.date
        };
        const { data, error } = await sb.from('investment_transactions_crypto').insert([payload]).select();
        if (error) { console.error('addCryptoTransaction:', error.message); showToast('Erreur : ' + error.message, 'error'); return null; }
        showToast('Transaction ajoutée !', 'success');
        return data;
    }

    async deleteCryptoTransaction(id) {
        const user = await getUser(); if (!user) return false;
        const { error } = await sb.from('investment_transactions_crypto').delete().eq('id', id).eq('user_id', user.id);
        if (error) { console.error('deleteCryptoTransaction:', error.message); showToast('Erreur suppression : ' + error.message, 'error'); return false; }
        showToast('Transaction supprimée', 'success');
        return true;
    }

    // ── Cash Transactions (dépôts, retraits, dividendes) ──────────────────────
    async getCashTransactions(mode) {
        const user = await getUser(); if (!user) return [];
        const { data, error } = await sb.from('cash_transactions').select('*')
            .eq('user_id', user.id)
            .eq('account_type', mode)
            .order('date', { ascending: false });
        if (error) { console.error(`getCashTransactions(${mode}):`, error.message); return []; }
        return data || [];
    }

    async addCashTransaction(mode, transaction) {
        const user = await getUser(); if (!user) return false;
        const payload = {
            user_id:      user.id,
            account_type: mode,
            type:         transaction.type,        // 'depot', 'retrait', 'dividende', 'frais'
            montant:      parseFloat(transaction.montant),
            description:  transaction.description || null,
            date:         transaction.date
        };
        const { error } = await sb.from('cash_transactions').insert([payload]);
        if (error) { console.error(`addCashTransaction(${mode}):`, error.message); showToast('Erreur : ' + error.message, 'error'); return false; }
        showToast('Transaction cash ajoutée !', 'success');
        return true;
    }

    async deleteCashTransaction(id) {
        const user = await getUser(); if (!user) return false;
        const { error } = await sb.from('cash_transactions').delete().eq('id', id).eq('user_id', user.id);
        if (error) { console.error('deleteCashTransaction:', error.message); showToast('Erreur suppression : ' + error.message, 'error'); return false; }
        showToast('Transaction supprimée', 'success');
        return true;
    }

    // ── Cash-Flow (tables: cash_flow_entrees / cash_flow_sorties) ─────────────
    // Colonnes: id, user_id, categorie, description, montant, date
    async getCashFlow(type) {
        const user = await getUser(); if (!user) return [];
        const table = type === 'entree' ? 'cash_flow_entrees' : 'cash_flow_sorties';
        const { data, error } = await sb.from(table).select('*')
            .eq('user_id', user.id).order('date', { ascending: false });
        if (error) { console.error(`getCashFlow(${type}):`, error.message); return []; }
        return data || [];
    }

    async addCashFlow(type, item) {
        const user = await getUser(); if (!user) return false;
        const table = type === 'entree' ? 'cash_flow_entrees' : 'cash_flow_sorties';
        const payload = {
            user_id:     user.id,
            categorie:   item.categorie,                // NOT NULL
            description: item.description || null,
            montant:     parseFloat(item.montant),      // NOT NULL
            date:        item.date
        };
        const { error } = await sb.from(table).insert([payload]);
        if (error) { console.error(`addCashFlow(${type}):`, error.message); showToast('Erreur : ' + error.message, 'error'); return false; }
        showToast(type === 'entree' ? 'Entrée ajoutée !' : 'Dépense ajoutée !', 'success');
        return true;
    }

    async deleteCashFlow(type, id) {
        const user = await getUser(); if (!user) return false;
        const table = type === 'entree' ? 'cash_flow_entrees' : 'cash_flow_sorties';
        const { error } = await sb.from(table).delete().eq('id', id).eq('user_id', user.id);
        if (error) { console.error(`deleteCashFlow(${type}):`, error.message); showToast('Erreur suppression : ' + error.message, 'error'); return false; }
        showToast('Supprimé', 'success');
        return true;
    }

    // ── Comptes bancaires (table: accounts) ───────────────────────────────────
    // Colonnes: id, user_id, num_compte, nom(NOT NULL), type, fournisseur,
    //           solde, date_now(NOT NULL), created_at
    // Les "autres biens" (immobilier, véhicule…) sont stockés dans cette même
    // table avec leur type dédié — pas de table 'biens' distincte.
    async getAccounts() {
        const user = await getUser(); if (!user) return [];
        const { data, error } = await sb.from('accounts').select('*')
            .eq('user_id', user.id).order('nom', { ascending: true });
        if (error) { console.error('getAccounts:', error.message); return []; }
        return data || [];
    }

    // Comptes bancaires classiques (type != biens)
    async getBankAccounts() {
        const all = await this.getAccounts();
        return all.filter(a => !['immobilier','vehicule','objet-valeur'].includes(a.type));
    }

    // "Autres biens" = entrées de accounts avec un type physique
    async getBiens() {
        const all = await this.getAccounts();
        return all.filter(a => ['immobilier','vehicule','objet-valeur'].includes(a.type));
    }

    async addAccount(account) {
        const user = await getUser(); if (!user) return false;
        const payload = {
            user_id:    user.id,
            nom:        account.nom,                          // NOT NULL
            type:       account.type        || null,
            fournisseur:account.fournisseur || null,
            solde:      parseFloat(account.solde) || 0,
            date_now:   new Date().toISOString()              // NOT NULL — obligatoire !
        };
        const { error } = await sb.from('accounts').insert([payload]);
        if (error) { console.error('addAccount:', error.message); showToast('Erreur : ' + error.message, 'error'); return false; }
        return true;
    }

    // Ajouter un bien → même table accounts, type = immobilier/vehicule/objet-valeur
    async addBien(bien) {
        return this.addAccount({
            nom:        bien.nom,
            type:       bien.type,      // 'immobilier' | 'vehicule' | 'objet-valeur'
            solde:      bien.valeur,    // la valeur du bien est stockée dans solde
            fournisseur: bien.notes || null
        });
    }

    async deleteAccount(id) {
        const user = await getUser(); if (!user) return false;
        const { error } = await sb.from('accounts').delete().eq('id', id).eq('user_id', user.id);
        if (error) { console.error('deleteAccount:', error.message); showToast('Erreur suppression : ' + error.message, 'error'); return false; }
        showToast('Supprimé', 'success');
        return true;
    }

    // deleteBien = deleteAccount (même table)
    async deleteBien(id) { return this.deleteAccount(id); }

    // ── Paramètres (localStorage uniquement, pas de table dédiée) ────────────
    getSettings() { return JSON.parse(localStorage.getItem('welcker_settings') || '{"theme":"light","devise":"EUR"}'); }
    saveSettings(s) { localStorage.setItem('welcker_settings', JSON.stringify(s)); }

    // =============================================================================
    // HISTORIQUE DU PATRIMOINE
    // =============================================================================

    async getPatrimoineHistory(days = 365) {
        const user = await getUser();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        
        const { data, error } = await sb
            .from('patrimoine_history')
            .select('*')
            .eq('user_id', user.id)
            .gte('date', startDate.toISOString().split('T')[0])
            .order('date', { ascending: true });
        
        if (error) {
            console.error('getPatrimoineHistory:', error);
            return [];
        }
        return data || [];
    }

    async savePatrimoineSnapshot(patrimoineData) {
        const user = await getUser();
        const today = new Date().toISOString().split('T')[0];
        
        const payload = {
            user_id: user.id,
            date: today,
            patrimoine_total: patrimoineData.total,
            cash_total: patrimoineData.cash,
            investissements_total: patrimoineData.investissements,
            biens_total: patrimoineData.biens
        };
        
        // Upsert : Insert ou Update si existe déjà pour aujourd'hui
        const { data, error } = await sb
            .from('patrimoine_history')
            .upsert(payload, { onConflict: 'user_id,date' })
            .select();
        
        if (error) {
            console.error('savePatrimoineSnapshot:', error);
            return false;
        }
        return true;
    }

    async deletePatrimoineHistory(id) {
        const { error } = await sb
            .from('patrimoine_history')
            .delete()
            .eq('id', id);
        
        if (error) {
            console.error('deletePatrimoineHistory:', error);
            return false;
        }
        return true;
    }
}

const dataManager = new DataManager();