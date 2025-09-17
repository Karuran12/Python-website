document.addEventListener("DOMContentLoaded", () => {
  fetch("http://127.0.0.1:8000/entreprises")
      .then(response => response.json())
      .then(data => {
          const companiesScroller = document.querySelector(".companies-scroller");
          if (companiesScroller && data.entreprises) {
              data.entreprises.forEach(nom => {
                  const div = document.createElement("div");
                  div.className = "company-box";
                  div.textContent = nom;
                  companiesScroller.appendChild(div);
              });
          }
      })
      .catch(error => {
          console.error("Erreur lors de la récupération des entreprises:", error);
      });
});

fetch("http://127.0.0.1:8000/offres-recentes")
  .then(response => response.json())
  .then(data => {
    const carousel = document.querySelector(".jobs-carousel");
    carousel.innerHTML = ""; // Vide l'existant

    data.offres.forEach(offre => {
      const card = document.createElement("div");
      card.className = "job-card";
      card.innerHTML = `
        <div class="company-logo">💼</div>
        <h3>${offre.poste}</h3>
        <p class="company">${offre.nom_entreprise} • ${offre.lieu}</p>
        <p class="match">${offre.compatibilite}% de compatibilité</p>
        <span class="tag">${offre.type_contrat}</span>
      `;
      carousel.appendChild(card);
    });
  })
  .catch(error => {
    console.error("Erreur lors de la récupération des offres récentes:", error);
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

