// Affichage des noms des fichiers sélectionnés
document.getElementById('cv').addEventListener('change', function (e) {
    const fileName = e.target.files[0] ? e.target.files[0].name : 'Aucun fichier sélectionné';
    document.getElementById('cv-name').textContent = fileName;
});

document.getElementById('lettre-motivation').addEventListener('change', function (e) {
    const fileName = e.target.files[0] ? e.target.files[0].name : 'Aucun fichier sélectionné';
    document.getElementById('lettre-motivation-name').textContent = fileName;
});

// Vérification de la connexion et pré-remplissage du formulaire
document.addEventListener('DOMContentLoaded', () => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || !localStorage.getItem('token')) {
        window.location.href = 'connexion.html';
        return;
    }

    // Pré-remplissage des champs
    document.getElementById('nom').value = user.nom || '';
    document.getElementById('email').value = user.email || '';

    // Gestion de la déconnexion
    document.getElementById('logout-btn').addEventListener('click', () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = 'index.html';
    });
});

// Gestion de la soumission du formulaire
document.getElementById('profile-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) {
        window.location.href = 'connexion.html';
        return;
    }

    const formData = new FormData();
    formData.append('nom', document.getElementById('nom').value);
    formData.append('titre', document.getElementById('titre').value);
    formData.append('competences', document.getElementById('competences').value);
    formData.append('experience', document.getElementById('experience').value);
    formData.append('formation', document.getElementById('formation').value);
    formData.append('recherche', document.getElementById('recherche').value);

    const cvFile = document.getElementById('cv').files[0];
    const lettreFile = document.getElementById('lettre-motivation').files[0];
    if (cvFile) formData.append('cv', cvFile);
    if (lettreFile) formData.append('lettre_motivation', lettreFile);

    try {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('Non authentifié');

        const res = await fetch('http://127.0.0.1:8000/profil', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
            },
            body: formData,
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.detail || 'Erreur lors de la mise à jour du profil');
        }

        const data = await res.json();
        alert('Profil mis à jour avec succès!');

        if (data.user) {
            localStorage.setItem('user', JSON.stringify(data.user));
        }
    } catch (err) {
        console.error('Erreur:', err);
        alert(err.message || 'Échec de la mise à jour du profil');
    }
});
    
fetch("navbar.html")
  .then(res => res.text())
  .then(html => {
    document.getElementById("navbar-placeholder").innerHTML = html;

    const script = document.createElement("script");
    script.src = "script/navbar.js";
    document.body.appendChild(script);
  });