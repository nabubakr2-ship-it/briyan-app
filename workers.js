const STORAGE_KEY = "workerEntries";
const ACCOUNTS_KEY = "workerAccounts";

function loadJSON(key) {
  try {
    return JSON.parse(localStorage.getItem(key)) || [];
  } catch {
    return [];
  }
}

function formatNum(n) {
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("ckb-u-nu-latn", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
  }[c]));
}

function renderRecords() {
  const records = loadJSON(STORAGE_KEY);
  const list = document.getElementById("recordsList");
  const emptyMsg = document.getElementById("emptyMsg");
  list.innerHTML = "";

  if (records.length === 0) {
    emptyMsg.style.display = "block";
    return;
  }
  emptyMsg.style.display = "none";

  records.slice().reverse().forEach((r) => {
    const total = (r.items || []).reduce((s, it) => s + (parseFloat(it.amount) || 0), 0);
    const li = document.createElement("li");
    li.className = "record-item";
    li.innerHTML = `
      <div class="record-main">
        <strong>${escapeHtml(r.workerName)}</strong>
        <span class="record-meta">${r.ownerName ? escapeHtml(r.ownerName) + " — " : ""}${formatDate(r.entryDate)} — ${escapeHtml(r.dailyStatus)}${r.postDeliver ? " — پۆست: " + escapeHtml(r.postDeliver) : ""}${total ? " — خەرجی: " + formatNum(total) : ""}</span>
      </div>
      <span class="record-mobile">${escapeHtml(r.dailyRate)}</span>
      <div class="record-actions">
        <button class="record-delete" title="ڕەشکردنەوە">&times;</button>
      </div>
    `;
    li.querySelector(".record-delete").addEventListener("click", () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(loadJSON(STORAGE_KEY).filter((x) => x.id !== r.id))
      );
      renderRecords();
    });
    list.appendChild(li);
  });
}

function genCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 4; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

function loadAccounts() {
  return loadJSON(ACCOUNTS_KEY);
}

function saveAccounts(list) {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(list));
}

function renderAccounts() {
  const list = document.getElementById("accountsList");
  const accounts = loadAccounts();
  list.innerHTML = "";
  accounts.forEach((a) => {
    const li = document.createElement("li");
    li.className = "record-item";
    li.innerHTML = `
      <div class="record-main">
        <strong>${escapeHtml(a.name)}</strong>
        <span class="record-meta acc-creds">ID: ${escapeHtml(a.id)} — PASS: ${escapeHtml(a.password)}</span>
      </div>
      <span class="record-mobile">${escapeHtml(a.mobile)}${a.role ? " — " + escapeHtml(a.role) : ""}</span>
      <div class="record-actions">
        <button class="btn-reset" title="پاسۆردی نوێ">پاسۆردی نوێ</button>
        <button class="record-delete" title="ڕەشکردنەوە">&times;</button>
      </div>
    `;
    li.querySelector(".btn-reset").addEventListener("click", () => {
      const next = prompt(`پاسۆردی نوێ بۆ ${a.name}:`, genCode() + genCode());
      if (next === null) return;
      const pw = next.trim();
      if (!pw) {
        alert("پاسۆرد ناتوانێت بەتاڵ بێت");
        return;
      }
      a.password = pw;
      saveAccounts(accounts);
      renderAccounts();
      alert(`پاسۆردی نوێ: ${a.password}`);
    });
    li.querySelector(".record-delete").addEventListener("click", () => {
      saveAccounts(accounts.filter((x) => x.id !== a.id));
      renderAccounts();
    });
    list.appendChild(li);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const backBtn = document.getElementById("backBtn");
  if (backBtn) backBtn.addEventListener("click", () => (window.location.href = "index.html"));

  const accountForm = document.getElementById("accountForm");
  accountForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const accounts = loadAccounts();
    const id = accountForm.accId.value.trim();
    const password = accountForm.accPass.value.trim();
    if (!id || !password) {
      alert("ئایدی و پاسۆرد پڕ بکەرەوە");
      return;
    }
    if (accounts.some((a) => a.id.toLowerCase() === id.toLowerCase())) {
      alert("ئەم ئایدییە پێشتر بەکارهاتووە");
      return;
    }
    const account = {
      id,
      password,
      name: accountForm.accName.value.trim(),
      mobile: accountForm.accMobile.value.trim().replace(/[\s-]/g, ""),
      role: accountForm.accRole.value,
    };
    accounts.push(account);
    saveAccounts(accounts);
    accountForm.reset();
    renderAccounts();
    alert(`ئایدی: ${account.id}\nپاسۆرد: ${account.password}`);
  });
  renderAccounts();

  const modal = document.getElementById("allSummaryModal");
  const filterWorker = document.getElementById("filterWorker");
  const filterOwner = document.getElementById("filterOwner");

  function fillFilterOptions() {
    const records = loadJSON(STORAGE_KEY);
    const workers = [...new Set(records.map((r) => r.workerName).filter(Boolean))];
    const owners = [...new Set(records.map((r) => r.ownerName).filter(Boolean))];
    filterWorker.innerHTML = '<option value="">-- هەموو کرێکاران --</option>';
    filterOwner.innerHTML = '<option value="">-- هەموو خاوەن ماڵەکان --</option>';
    workers.forEach((w) => {
      const opt = document.createElement("option");
      opt.value = w;
      opt.textContent = w;
      filterWorker.appendChild(opt);
    });
    owners.forEach((o) => {
      const opt = document.createElement("option");
      opt.value = o;
      opt.textContent = o;
      filterOwner.appendChild(opt);
    });
  }

  function renderAllSummary() {
    const w = filterWorker.value;
    const o = filterOwner.value;
    const records = loadJSON(STORAGE_KEY)
      .filter((r) => (!w || r.workerName === w) && (!o || r.ownerName === o))
      .slice()
      .reverse();
    let html = "";
    let grand = 0;
    if (records.length) {
      html = `<table class="summary-table">
        <thead><tr>
          <th>کرێکار</th><th>خاوەن ماڵ</th><th>بەروار</th><th>دۆخ</th><th>پۆست</th><th>خەرجی</th><th>کۆی پارە</th>
        </tr></thead><tbody>`;
      records.forEach((r) => {
        const items = r.items || [];
        const exp = items.reduce((s, it) => s + (parseFloat(it.amount) || 0), 0);
        const itemNames = items
          .map((it) => [it.type, it.amount].filter(Boolean).join(": "))
          .filter(Boolean)
          .join("، ");
        const rate = parseFloat(r.dailyRate) || 0;
        grand += rate + exp;
        html += `<tr>
          <td>${escapeHtml(r.workerName || "—")}</td>
          <td>${escapeHtml(r.ownerName || "—")}</td>
          <td>${formatDate(r.entryDate)}</td>
          <td>${escapeHtml(r.dailyStatus || "—")}</td>
          <td>${escapeHtml(r.postDeliver || "—")}</td>
          <td>${escapeHtml(itemNames || "—")}</td>
          <td>${formatNum(rate + exp)}</td>
        </tr>`;
      });
      html += "</tbody></table>";
    }
    document.getElementById("allSummaryBody").innerHTML =
      html || "<p class='empty-msg'>هیچ تۆمارێک نییە</p>";
    document.getElementById("allGrandTotal").textContent = formatNum(grand);
  }

  document.getElementById("allSummaryBtn").addEventListener("click", () => {
    fillFilterOptions();
    renderAllSummary();
    modal.hidden = false;
  });
  filterWorker.addEventListener("change", renderAllSummary);
  filterOwner.addEventListener("change", renderAllSummary);
  document.getElementById("allSummaryClose").addEventListener("click", () => {
    modal.hidden = true;
  });
  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.hidden = true;
  });

  renderRecords();
});
