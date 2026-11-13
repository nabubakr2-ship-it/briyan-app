document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("loginForm");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    let accounts = [];
    try {
      accounts = JSON.parse(localStorage.getItem("workerAccounts")) || [];
    } catch {}
    const found = accounts.find(
      (a) =>
        a.id.toLowerCase() === form.loginId.value.trim().toLowerCase() &&
        a.password === form.loginPass.value.trim()
    );
    if (!found) {
      alert("ئایدی یان پاسۆرد هەڵەیە");
      return;
    }
    if (found.role !== "کرێکار") {
      sessionStorage.setItem("adminAuth", "1");
      const allowed = [
        "index.html", "viewings.html", "promises.html", "started.html",
        "completed.html", "calc.html", "workers.html", "expenses.html", "form.html",
        "archive.html",
      ];
      const target = (sessionStorage.getItem("redirectAfterLogin") || "").split("/").pop();
      sessionStorage.removeItem("redirectAfterLogin");
      location.href = allowed.includes(target) ? target : "index.html";
    } else {
      sessionStorage.setItem("currentWorker", JSON.stringify(found));
      window.location.href = "worker-day.html";
    }
  });
});
