document.getElementById("connexion-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const credentials = {
        email: document.getElementById("email").value.trim(),
        motdepasse: document.getElementById("motdepasse").value.trim()
    };

    if (!credentials.email || !credentials.motdepasse) {
        return alert("Email et mot de passe requis");
    }

    try {
        const res = await fetch("http://127.0.0.1:8000/connexion", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(credentials)
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.detail || "Identifiants invalides");
        }

        const data = await res.json();
        localStorage.setItem("token", data.access_token);
        localStorage.setItem("user", JSON.stringify(data.user));
        window.location.href = "accueil.html";

    } catch (err) {
        console.error("Erreur:", err);
        alert(err.message || "Connexion impossible");
    }
});