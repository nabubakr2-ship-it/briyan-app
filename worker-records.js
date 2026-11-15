const STORAGE_KEY = "workerEntries";

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

let searchText = "";
let filterWorker = "";
let filterOwner = "";

function fillFilterOptions() {
  const records = loadJSON(STORAGE_KEY);
  const workers = [...new Set(records.map((r) => r.workerName).filter(Boolean))];
  const owners = [...new Set(records.map((r) => r.ownerName).filter(Boolean))];
  const fw = document.getElementById("filterWorker");
  const fo = document.getElementById("filterOwner");
  fw.innerHTML = '<option value="">-- هەموو کرێکاران --</option>';
  fo.innerHTML = '<option value="">-- هەموو خاوەن ماڵەکان --</option>';
  workers.forEach((w) => {
    const opt = document.createElement("option");
    opt.value = w;
    opt.textContent = w;
    fw.appendChild(opt);
  });
  owners.forEach((o) => {
    const opt = document.createElement("option");
    opt.value = o;
    opt.textContent = o;
    fo.appendChild(opt);
  });
  fw.value = filterWorker;
  fo.value = filterOwner;
}

function renderSummaryTable() {
  const records = loadJSON(STORAGE_KEY)
    .filter((r) => (!filterWorker || r.workerName === filterWorker) && (!filterOwner || r.ownerName === filterOwner))
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
  document.getElementById("summaryBody").innerHTML =
    html || "<p class='empty-msg'>هیچ تۆمارێک نییە</p>";
  document.getElementById("grandTotal").textContent = formatNum(grand);
}

function matchesSearch(r, q) {
  if (!q) return true;
  const exp = (r.items || []).map((it) => [it.type, it.amount].filter(Boolean).join(" ")).join(" ");
  const hay = [
    r.workerName,
    r.ownerName,
    r.dailyStatus,
    r.jobType,
    exp,
    formatDate(r.entryDate),
  ].filter(Boolean).join(" ").toLowerCase();
  return hay.includes(q.toLowerCase());
}

function renderRecords() {
  const records = loadJSON(STORAGE_KEY).filter((r) => matchesSearch(r, searchText));
  const list = document.getElementById("recordsList");
  const emptyMsg = document.getElementById("emptyMsg");
  list.innerHTML = "";

  if (!records.length) {
    emptyMsg.style.display = "block";
    return;
  }
  emptyMsg.style.display = "none";

  let totalRate = 0;
  let totalExpense = 0;
  records.slice().reverse().forEach((r) => {
    const rate = parseFloat(r.dailyRate) || 0;
    const exp = (r.items || []).reduce((s, it) => s + (parseFloat(it.amount) || 0), 0);
    const itemsText = (r.items || [])
      .map((it) => [it.type, it.amount].filter(Boolean).join(": "))
      .filter(Boolean)
      .join("، ");
    totalRate += rate;
    totalExpense += exp;
    const li = document.createElement("li");
    li.className = "record-item";
    li.innerHTML = `
      <div class="record-main">
        <strong>${escapeHtml(r.workerName || "—")}</strong>
        <span class="record-meta">${escapeHtml(r.ownerName || "—")}${r.dailyStatus ? " — " + escapeHtml(r.dailyStatus) : ""}${r.jobType ? " — " + escapeHtml(r.jobType) : ""}${itemsText ? " — " + escapeHtml(itemsText) : ""}</span>
        <span class="record-meta">ڕۆژانە: ${formatNum(rate)} د.ع — خەرجی: ${formatNum(exp)} د.ع — کۆی: <strong>${formatNum(rate + exp)} د.ع</strong></span>
      </div>
      <div class="record-side">
        <span class="record-mobile">${formatDate(r.entryDate)}</span>
        <button class="record-del" title="ڕەشکردنەوە">&times;</button>
      </div>
    `;
    li.querySelector(".record-del").addEventListener("click", () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(loadJSON(STORAGE_KEY).filter((x) => x.id !== r.id))
      );
      renderRecords();
      fillFilterOptions();
      renderSummaryTable();
    });
    list.appendChild(li);
  });

  document.getElementById("totalRate").textContent = formatNum(totalRate);
  document.getElementById("totalExpense").textContent = formatNum(totalExpense);
  document.getElementById("totalGrand").textContent = formatNum(totalRate + totalExpense);
}

document.addEventListener("DOMContentLoaded", () => {
  const backBtn = document.getElementById("backBtn");
  if (backBtn) backBtn.addEventListener("click", () => (window.location.href = "index.html"));

  const searchBox = document.getElementById("searchBox");
  if (searchBox) {
    searchBox.addEventListener("input", () => {
      searchText = searchBox.value.trim();
      renderRecords();
    });
  }

  fillFilterOptions();
  renderSummaryTable();
  document.getElementById("filterWorker").addEventListener("change", (e) => {
    filterWorker = e.target.value;
    renderSummaryTable();
  });
  document.getElementById("filterOwner").addEventListener("change", (e) => {
    filterOwner = e.target.value;
    renderSummaryTable();
  });

  renderRecords();
});
