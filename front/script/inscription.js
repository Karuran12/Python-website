document.getElementById("inscription-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const user = {
        nom: document.getElementById("nom").value.trim(),
        email: document.getElementById("email").value.trim(),
        motdepasse: document.getElementById("motdepasse").value.trim(),
        role: "candidat"
    };

    if (!user.nom || !user.email || !user.motdepasse) {
        return alert("Tous les champs sont obligatoires");
    }

    try {
        const res = await fetch("http://127.0.0.1:8000/inscription", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(user)
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.detail || "Erreur serveur");
        }

        const data = await res.json();
        localStorage.setItem("token", data.access_token);
        localStorage.setItem("user", JSON.stringify(data.user));
        window.location.href = "accueil.html";

    } catch (err) {
        console.error("Erreur:", err);
        alert(err.message || "Échec de l'inscription");
    }
});