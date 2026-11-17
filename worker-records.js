const STORAGE_KEY = "workerEntries";
const PAYMENTS_KEY = "workerPayments";

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
let summaryMode = "day";

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
  const all = loadJSON(STORAGE_KEY)
    .filter((r) => !r.archived && (!filterWorker || r.workerName === filterWorker) && (!filterOwner || r.ownerName === filterOwner))
    .slice()
    .reverse();
  const records = all.filter((r) =>
    summaryMode === "day"
      ? (parseFloat(r.dailyRate) || 0) > 0 || r.dailyStatus
      : (r.items || []).length > 0
  );
  let html = "";
  let grand = 0;
  if (records.length) {
    if (summaryMode === "day") {
      html = `<table class="summary-table">
        <thead><tr>
          <th>کرێکار</th><th>خاوەن ماڵ</th><th>بەروار</th><th>دۆخ</th><th>کۆی</th><th>کۆی پارە</th><th></th>
        </tr></thead><tbody>`;
      records.forEach((r) => {
        const rate = parseFloat(r.dailyRate) || 0;
        grand += rate;
        html += `<tr>
          <td>${escapeHtml(r.workerName || "—")}</td>
          <td>${escapeHtml(r.ownerName || "—")}</td>
          <td>${formatDate(r.entryDate)}</td>
          <td>${escapeHtml(r.dailyStatus || "—")}</td>
          <td>${formatNum(rate)} د.ع</td>
          <td>${formatNum(rate)} د.ع</td>
          <td><button type="button" class="btn-info" data-id="${r.id}">زانیاریەکان</button></td>
        </tr>`;
      });
    } else {
      html = `<table class="summary-table">
        <thead><tr>
          <th>کرێکار</th><th>خاوەن ماڵ</th><th>بەروار</th><th>خەرجی</th><th>کۆی خەرجی</th><th></th>
        </tr></thead><tbody>`;
      records.forEach((r) => {
        const items = r.items || [];
        const exp = items.reduce((sum, it) => sum + (parseFloat(it.amount) || 0), 0);
        const itemNames = items
          .map((it) => [it.type, it.amount].filter(Boolean).join(": "))
          .filter(Boolean)
          .join("، ");
        grand += exp;
        html += `<tr>
          <td>${escapeHtml(r.workerName || "—")}</td>
          <td>${escapeHtml(r.ownerName || "—")}</td>
          <td>${formatDate(r.entryDate)}</td>
          <td>${escapeHtml(itemNames || "—")}</td>
          <td>${formatNum(exp)} د.ع</td>
          <td><button type="button" class="btn-info" data-id="${r.id}">زانیاریەکان</button></td>
        </tr>`;
      });
    }
    html += "</tbody></table>";
  }
  document.getElementById("summaryBody").innerHTML =
    html || "<p class='empty-msg'>هیچ تۆمارێک نییە</p>";
  document.getElementById("grandTotal").textContent = formatNum(grand);
  document.getElementById("summaryBody").querySelectorAll(".btn-info").forEach((btn) => {
    btn.addEventListener("click", () => {
      const rec = loadJSON(STORAGE_KEY).find((x) => x.id === Number(btn.dataset.id));
      if (rec) openInfo(rec, summaryMode);
    });
  });
}

function infoRow(k, v) {
  return v !== "" && v !== undefined && v !== null
    ? `<div class="info-row"><span>${k}</span><span>${escapeHtml(String(v))}</span></div>`
    : "";
}

let infoRecordId = null;
let infoWorkerName = "";

function openInfo(r, mode) {
  mode = mode || "all";
  infoRecordId = r.id;
  infoWorkerName = r.workerName || "";
  const items = r.items || [];
  const exp = items.reduce((s, it) => s + (parseFloat(it.amount) || 0), 0);
  const rate = parseFloat(r.dailyRate) || 0;
  let html = "";
  html += `<h3 class="info-section">زانیارییەکان</h3>`;
  html += infoRow("ناوی کرێکار", r.workerName);
  html += infoRow("ژمارە مۆبایلی کرێکار", r.workerMobile);
  html += infoRow("ناوی خاوەن ماڵ", r.ownerName);
  html += infoRow("ژمارە مۆبایلی خاوەن ماڵ", r.ownerMobile);
  if (mode !== "exp") html += infoRow("جۆری ئیش", r.jobType);
  html += infoRow("دۆخی ڕۆژانە", r.dailyStatus);
  html += infoRow("بەروار", formatDate(r.entryDate));
  if (mode !== "exp") html += infoRow("بڕی ڕۆژانە", `${formatNum(rate)} د.ع`);
  if (mode !== "day" && items.length) {
    html += `<h3 class="info-section">مەسروفات</h3>`;
    items.forEach((it) => {
      html += `<div class="info-row"><span>${escapeHtml(it.type || "—")}</span><span>${escapeHtml(String(it.amount || ""))}</span></div>`;
    });
  }
  html += `<h3 class="info-section">کۆی گشتی</h3>`;
  if (mode !== "day") html += infoRow("کۆی خەرجی", `${formatNum(exp)} د.ع`);
  html += infoRow("کۆی پارە", `${formatNum(mode === "day" ? rate : mode === "exp" ? exp : rate + exp)} د.ع`);

  const recTotal = rate + exp;
  const recPaid = loadJSON(PAYMENTS_KEY)
    .filter((p) => p.recordId === r.id)
    .reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
  const recLeft = Math.max(0, recTotal - recPaid);
  html += `<h3 class="info-section">پارەی کرێکار</h3>`;
  html += infoRow("کۆی پارەی ئەم تۆمارە", `${formatNum(recTotal)} د.ع`);
  html += infoRow("وەرگیراو", `${formatNum(recPaid)} د.ع`);
  html += infoRow("ماوە", `${formatNum(recLeft)} د.ع`);

  document.getElementById("infoBody").innerHTML = html;
  document.getElementById("infoPayBtn").style.display = recLeft > 0 ? "" : "none";
  document.getElementById("infoPayAllBtn").style.display = recLeft > 0 ? "" : "none";
  document.getElementById("infoActions").hidden = false;
  document.getElementById("infoPayBox").hidden = true;
  document.getElementById("infoPayAmount").value = "";
  document.getElementById("infoModal").hidden = false;
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

function workerTotals() {
  const map = new Map();
  loadJSON(STORAGE_KEY)
    .filter((r) => !r.archived)
    .forEach((r) => {
      const name = r.workerName || "—";
      const rate = parseFloat(r.dailyRate) || 0;
      const exp = (r.items || []).reduce((s, it) => s + (parseFloat(it.amount) || 0), 0);
      map.set(name, (map.get(name) || 0) + rate + exp);
    });
  return map;
}

function paidTotals() {
  const archivedIds = new Set(
    loadJSON(STORAGE_KEY).filter((r) => r.archived).map((r) => r.id)
  );
  const map = new Map();
  loadJSON(PAYMENTS_KEY).forEach((p) => {
    if (p.recordId !== undefined && p.recordId !== null && archivedIds.has(p.recordId)) return;
    const name = p.workerName || "—";
    map.set(name, (map.get(name) || 0) + (parseFloat(p.amount) || 0));
  });
  return map;
}

function renderPayments() {
  const body = document.getElementById("paymentsBody");
  const totals = workerTotals();
  const paid = paidTotals();
  const names = [...new Set([...totals.keys(), ...paid.keys()])];
  let html = "";
  let grandTotal = 0;
  let grandPaid = 0;
  if (names.length) {
    html = `<table class="summary-table"><thead><tr>
      <th>کرێکار</th><th>کۆی پارە</th><th>وەرگیراو</th><th>ماوە</th>
    </tr></thead><tbody>`;
    names.forEach((name) => {
      const total = totals.get(name) || 0;
      const paidAmt = paid.get(name) || 0;
      const left = Math.max(0, total - paidAmt);
      if (left <= 0) return;
      grandTotal += total;
      grandPaid += paidAmt;
      html += `<tr>
        <td>${escapeHtml(name)}</td>
        <td>${formatNum(total)} د.ع</td>
        <td>${formatNum(paidAmt)} د.ع</td>
        <td>${formatNum(left)} د.ع</td>
      </tr>`;
    });
    html += "</tbody></table>";
  }
  body.innerHTML = html || "<p class='empty-msg'>هیچ کرێکارێک نییە</p>";
  document.getElementById("payGrand").textContent =
    `${formatNum(grandTotal)} د.ع — ماوە: ${formatNum(Math.max(0, grandTotal - grandPaid))} د.ع`;
}

function renderRecords() {
  renderPayments();
  const records = loadJSON(STORAGE_KEY).filter((r) => !r.archived);
  let totalRate = 0;
  let totalExpense = 0;
  records.forEach((r) => {
    const rate = parseFloat(r.dailyRate) || 0;
    const exp = (r.items || []).reduce((sum, it) => sum + (parseFloat(it.amount) || 0), 0);
    totalRate += rate;
    totalExpense += exp;
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
  const tabDay = document.getElementById("sumTabDay");
  const tabExp = document.getElementById("sumTabExp");
  tabDay.addEventListener("click", () => {
    summaryMode = "day";
    tabDay.classList.add("active");
    tabExp.classList.remove("active");
    renderSummaryTable();
  });
  tabExp.addEventListener("click", () => {
    summaryMode = "exp";
    tabExp.classList.add("active");
    tabDay.classList.remove("active");
    renderSummaryTable();
  });

  document.getElementById("filterWorker").addEventListener("change", (e) => {
    filterWorker = e.target.value;
    renderSummaryTable();
  });
  document.getElementById("filterOwner").addEventListener("change", (e) => {
    filterOwner = e.target.value;
    renderSummaryTable();
  });

  const infoPayBtn = document.getElementById("infoPayBtn");
  const infoActions = document.getElementById("infoActions");
  const infoPayBox = document.getElementById("infoPayBox");
  infoPayBtn.addEventListener("click", () => {
    document.getElementById("infoPayDate").value = new Date().toISOString().slice(0, 10);
    infoActions.hidden = true;
    infoPayBox.hidden = false;
    document.getElementById("infoPayAmount").focus();
  });
  document.getElementById("infoPaySave").addEventListener("click", () => {
    const val = parseFloat(document.getElementById("infoPayAmount").value);
    if (!val || val <= 0) {
      alert("بڕی پارە نادروستە");
      return;
    }
    const rec = loadJSON(STORAGE_KEY).find((x) => x.id === infoRecordId);
    if (rec) {
      const exp = (rec.items || []).reduce((s, it) => s + (parseFloat(it.amount) || 0), 0);
      const total = (parseFloat(rec.dailyRate) || 0) + exp;
      const paidAmt = loadJSON(PAYMENTS_KEY)
        .filter((p) => p.recordId === rec.id)
        .reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
      const left = Math.max(0, total - paidAmt);
      if (val > left) {
        alert(`بڕی پارە لە ماوە (${formatNum(left)} د.ع) زیاترە — قبوڵ ناکرێت`);
        return;
      }
    }
    const all = loadJSON(PAYMENTS_KEY);
    all.push({
      id: Date.now(),
      workerName: infoWorkerName,
      recordId: infoRecordId,
      amount: val,
      date: document.getElementById("infoPayDate").value || new Date().toISOString().slice(0, 10),
    });
    localStorage.setItem(PAYMENTS_KEY, JSON.stringify(all));
    infoActions.hidden = false;
    infoPayBox.hidden = true;
    document.getElementById("infoPayAmount").value = "";
    renderPayments();
    if (rec) openInfo(rec);
  });

  document.getElementById("infoPayAllBtn").addEventListener("click", () => {
    const rec = loadJSON(STORAGE_KEY).find((x) => x.id === infoRecordId);
    if (!rec) return;
    const exp = (rec.items || []).reduce((s, it) => s + (parseFloat(it.amount) || 0), 0);
    const total = (parseFloat(rec.dailyRate) || 0) + exp;
    const paidAmt = loadJSON(PAYMENTS_KEY)
      .filter((p) => p.recordId === rec.id)
      .reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
    const left = Math.max(0, total - paidAmt);
    if (left <= 0) {
      alert("ماوە نییە — پارەکە تەواو دراوە");
      return;
    }
    const all = loadJSON(PAYMENTS_KEY);
    all.push({
      id: Date.now(),
      workerName: infoWorkerName,
      recordId: rec.id,
      amount: left,
      date: new Date().toISOString().slice(0, 10),
    });
    localStorage.setItem(PAYMENTS_KEY, JSON.stringify(all));
    renderPayments();
    alert(`کۆی ماوە (${formatNum(left)} د.ع) پێدرا`);
    openInfo(rec);
  });

  document.getElementById("infoArchiveBtn").addEventListener("click", () => {
    if (infoRecordId === null) return;
    const all = loadJSON(STORAGE_KEY);
    const rec = all.find((x) => x.id === infoRecordId);
    if (!rec) return;
    rec.archived = true;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    document.getElementById("infoModal").hidden = true;
    fillFilterOptions();
    renderSummaryTable();
    renderRecords();
  });

  renderRecords();

  const infoModal = document.getElementById("infoModal");
  document.getElementById("infoClose").addEventListener("click", () => {
    infoModal.hidden = true;
  });
  infoModal.addEventListener("click", (e) => {
    if (e.target === infoModal) infoModal.hidden = true;
  });
});
