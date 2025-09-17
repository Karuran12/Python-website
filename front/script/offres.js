document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("filter-form");
  const compatibility = document.getElementById("compatibility");
  const compatibilityValue = document.getElementById("compatibility-value");
  const jobList = document.querySelector(".job-list");

  async function chargerFiltresDynamiques() {
    try {
      const res = await fetch("http://localhost:8000/offres-filtres");
      const data = await res.json();

      const locationSelect = document.getElementById("location");
      const contractSelect = document.getElementById("contract");

      if (data.lieux) {
        locationSelect.innerHTML = `<option value="">Tous</option>` +
          data.lieux.map(lieu => `<option value="${lieu}">${lieu}</option>`).join("");
      }

      if (data.contrats) {
        contractSelect.innerHTML = `<option value="">Tous</option>` +
          data.contrats.map(type => `<option value="${type}">${type}</option>`).join("");
      }
    } catch (error) {
      console.error("Erreur chargement des filtres :", error);
    }
  }

  chargerFiltresDynamiques();

  compatibility.addEventListener("input", () => {
    compatibilityValue.textContent = `≥ ${compatibility.value}%`;
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    jobList.innerHTML = "<div class='loading'>Chargement des offres...</div>";

    const search = document.getElementById("search").value.trim();
    const location = document.getElementById("location").value;
    const contract = document.getElementById("contract").value;
    const compatibilityValue = compatibility.value;

    try {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (location && location !== "Tous") params.append("lieu", location);
      if (contract && contract !== "Tous") params.append("type_contrat", contract);
      if (compatibilityValue && compatibilityValue !== "0") params.append("compatibilite", compatibilityValue);

      const response = await fetch(`http://localhost:8000/offres?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }
      
      const data = await response.json();

      jobList.innerHTML = "";

      if (!data.offres || data.offres.length === 0) {
        jobList.innerHTML = `
          <div class="no-results">
            <p>Aucune offre ne correspond à vos critères.</p>
            <button onclick="document.getElementById('filter-form').reset(); compatibilityValue.textContent='≥ 0%'; form.dispatchEvent(new Event('submit'))">
              Réinitialiser les filtres
            </button>
          </div>
        `;
        return;
      }

      data.offres.forEach(offre => {
        const card = document.createElement("div");
        card.className = "job-card";
        card.innerHTML = `
          <div class="company-logo">${getCompanyIcon(offre.entreprise)}</div>
          <h3>${offre.titre}</h3>
          <p class="company">${offre.entreprise} • ${offre.lieu}</p>
          <p class="match ${getCompatibilityClass(offre.compatibilite)}">${offre.compatibilite}% de compatibilité</p>
          <span class="tag ${offre.type_contrat.toLowerCase()}">${offre.type_contrat}</span>
          <p class="description">${offre.description}</p>
          <p class="date">Publié le ${formatDate(offre.date_publication)}</p>
          <button class="btn-apply">Postuler</button>
        `;
        jobList.appendChild(card);
      });

    } catch (err) {
      console.error("Erreur:", err);
      jobList.innerHTML = `
        <div class="error">
          <p>Erreur lors du chargement des offres</p>
          <button onclick="location.reload()">Réessayer</button>
        </div>
      `;
    }
  });

  function getCompanyIcon(company) {
    const icons = ["💼", "🏢", "🏛️", "💻", "📊", "🎨"];
    return icons[company.length % icons.length];
  }

  function getCompatibilityClass(percentage) {
    if (percentage >= 80) return "high";
    if (percentage >= 60) return "medium";
    return "low";
  }

  function formatDate(dateString) {
    const options = { day: 'numeric', month: 'long', year: 'numeric' };
    return new Date(dateString).toLocaleDateString('fr-FR', options);
  }

  ["search", "location", "contract", "compatibility"].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener("change", () => {
        form.dispatchEvent(new Event("submit"));
      });
    }
  });

  document.getElementById("search").addEventListener("input", () => {
    form.dispatchEvent(new Event("submit"));
  });

  form.dispatchEvent(new Event("submit"));
});

fetch("navbar.html")
  .then(res => res.text())
  .then(html => {
    document.getElementById("navbar-placeholder").innerHTML = html;
    const script = document.createElement("script");
    script.src = "script/navbar.js";
    document.body.appendChild(script);
  });

fetch("footer.html")
.then(res => res.text())
.then(html => {
    document.getElementById("footer-placeholder").innerHTML = html;
});
