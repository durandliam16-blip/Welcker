// =============================================================================
// CONFIG SUPABASE — même URL/clé que dans login.html
// =============================================================================
const SUPABASE_URL      = 'https://qktbcgumyqjgbvcpynjo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFrdGJjZ3VteXFqZ2J2Y3B5bmpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4MDQ0MDYsImV4cCI6MjA4NjM4MDQwNn0.Bjv4bb2gnXKG8-UY4oSUQrjaJIzNWEG_zM8_XTQbwsY'; // ← Remplacez par votre clé eyJ...

const { createClient } = window.supabase;
const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// =============================================================================
// SÉCURITÉ — redirige uniquement sur déconnexion explicite
// (pas au chargement initial pour éviter la boucle login ↔ index)
// =============================================================================
sb.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT') {
        window.location.replace('login.html');
    }
});

// Déconnexion
async function handleLogout() {
    await sb.auth.signOut();
}

// Helper : récupère l'utilisateur courant
async function getUser() {
    const { data: { user } } = await sb.auth.getUser();
    return user;
}

// LOGGER LA CONNEXION
async function logConnexion() {
    try {
        const { data: { user } } = await sb.auth.getUser();
        if (!user) return;
        
        const today = new Date().toISOString().split('T')[0];
        
        // Récupérer l'erreur proprement
        const { error } = await sb.from('connexions').insert([{
            user_id: user.id,
            date_connexion: today
        }]);
        
        // Gérer l'erreur selon le code
        if (error) {
            if (error.code === '23505') {
                // Doublon détecté (normal)
                console.log('📅 Connexion déjà enregistrée aujourd\'hui');
            } else {
                console.error('Erreur log connexion:', error.message);
            }
        } else {
            console.log('✅ Connexion loggée');
        }
    } catch (error) {
        console.error('Erreur inattendue:', error);
    }
}

logConnexion();