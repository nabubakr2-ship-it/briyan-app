document.addEventListener("DOMContentLoaded", () => {
  const workerLoginLink = document.getElementById("workerLoginLink");
  if (workerLoginLink) {
    workerLoginLink.addEventListener("click", () => {
      sessionStorage.setItem("isAdmin", "1");
    });
  }

  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      sessionStorage.removeItem("adminAuth");
      sessionStorage.removeItem("currentWorker");
      window.location.href = "login.html";
    });
  }

  const menuButtons = document.querySelectorAll(".menu-btn");
  if (menuButtons.length) {
    menuButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const page = btn.getAttribute("data-page") || btn.getAttribute("data-form");
        if (page.endsWith(".html")) {
          window.location.href = page;
        } else {
          window.location.href = `form.html?title=${encodeURIComponent(page)}`;
        }
      });
    });
    return;
  }

  const formTitle = document.getElementById("formTitle");
  if (formTitle) {
    const params = new URLSearchParams(window.location.search);
    const title = params.get("title");
    if (title) {
      formTitle.textContent = title;
      document.title = title;
    }
  }

  const backBtn = document.getElementById("backBtn");
  if (backBtn) {
    backBtn.addEventListener("click", () => {
      window.location.href = "index.html";
    });
  }

  const form = document.getElementById("blankForm");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      alert("تۆمارکرا (دەرکەوت)");
      form.reset();
    });
  }
});
