document.addEventListener("DOMContentLoaded", () => {
  if (sessionStorage.getItem("isAdmin")) {
    document.getElementById("backHome").hidden = false;
  }

  const form = document.getElementById("loginForm");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const accounts = await fetchRemoteAccounts();
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
      window.location.href = "index.html";
      return;
    }
    sessionStorage.setItem("currentWorker", JSON.stringify(found));
    sessionStorage.removeItem("isAdmin");
    window.location.href = "worker-day.html";
  });
});
