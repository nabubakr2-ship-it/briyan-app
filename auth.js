(function () {
  const page = location.pathname.split("/").pop();
  const publicPages = ["login.html", "worker-login.html", "worker-day.html"];
  if (publicPages.includes(page)) return;
  if (!sessionStorage.getItem("adminAuth")) {
    sessionStorage.setItem("redirectAfterLogin", location.pathname + location.search);
    location.href = "login.html";
  }
})();
