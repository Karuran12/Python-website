(() => {
    const user = JSON.parse(localStorage.getItem("user"));
    const userInfo = document.getElementById("user-info");
    const logoutLink = document.getElementById("logout-link");
    const signupLink = document.getElementById("signup-link");
    const popup = document.getElementById("popup-message");
  
    if (user) {
      userInfo.textContent = `${user.nom}`;
      userInfo.style.display = "inline";
      logoutLink.style.display = "inline";
      if (signupLink) signupLink.style.display = "none";
  
      if (!sessionStorage.getItem("popupShown")) {
        popup.textContent = `Bonjour ${user.nom} !`;
        popup.style.display = "block";
        popup.style.left = "20px";
        setTimeout(() => {
          popup.style.left = "-300px";
          setTimeout(() => popup.style.display = "none", 500);
        }, 3000);
        sessionStorage.setItem("popupShown", "true");
      }
    } else {
      if (signupLink) signupLink.style.display = "inline";
      logoutLink.style.display = "none";
      userInfo.style.display = "none";
    }
  
    logoutLink.addEventListener("click", () => {
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      sessionStorage.removeItem("popupShown");
      window.location.href = "connexion.html";
    });
  })();
  