const STORAGE_KEY = "completedWorks";

function loadRecords() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function formatNum(n) {
  const v = parseFloat(n) || 0;
  return Number.isInteger(v) ? String(v) : v.toFixed(2);
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

function agreementInfo(r) {
  if (r.jobType === "شکان") {
    return r.price ? ` — بڕی پارە (${r.price})` : "";
  }
  if (!r.agreementType) return "";
  if (r.agreementType === "مەتر تووڵ و مرەبەح") {
    return ` — ${r.agreementType} (کۆی پارە: ${r.grandTotal || "-"})`;
  }
  return ` — ${r.agreementType}${r.total ? ` (کۆی پارە: ${r.total})` : r.price ? ` (${r.price})` : ""}`;
}

function infoRow(k, v) {
  return v ? `<div class="info-row"><span>${k}</span><span>${escapeHtml(String(v))}</span></div>` : "";
}

function openInfo(r) {
  const h = r.history || {};
  const v = h.viewing || {};
  const p = h.promise || {};
  const s = h.started || {};
  let html = "";
  html += `<h3 class="info-section">زانیارییەکان</h3>`;
  html += infoRow("ناوی خاوەن ماڵ", r.ownerName);
  html += infoRow("ژمارە مۆبایل", r.mobile);
  html += infoRow("جۆری ئیش", r.jobType);
  html += infoRow("جۆری پارەدان", r.paymentType);
  html += `<h3 class="info-section">بەروارەکان</h3>`;
  html += infoRow("بەرواری تەماشاکردن", v.viewDate ? formatDate(v.viewDate) : "");
  html += infoRow("بەرواری بەڵێن", p.promiseDate ? formatDate(p.promiseDate) : "");
  html += infoRow("بەرواری دەستپێکردن", s.startDate ? formatDate(s.startDate) : "");
  html += infoRow("بەرواری تەواوکردن", r.completeDate ? formatDate(r.completeDate) : "");
  html += `<h3 class="info-section">ڕێک کەوتن و نرخ</h3>`;
  html += infoRow("جۆری ڕێک کەوتن", r.agreementType);
  html += infoRow("نرخ", r.price);
  html += infoRow("بڕی مەتر", r.meter);
  html += infoRow("کۆی پارە", r.total);
  html += infoRow("نرخی تووڵ", r.priceWool);
  html += infoRow("نرخی مرەبەح", r.priceMarble);
  html += infoRow("بڕی مەتر تووڵ", r.meterWool);
  html += infoRow("بڕی مەتر مرەبەح", r.meterMarble);
  html += infoRow("کۆی پارە تووڵ", r.totalWool);
  html += infoRow("کۆی پارە مرەبەح", r.totalMarble);
  html += infoRow("کۆی پارە گشتی", r.grandTotal);
  const items = s.items || [];
  if (items.length) {
    html += `<h3 class="info-section">خەرجی / مەسرەف</h3>`;
    items.forEach((it) => {
      html += `<div class="info-row"><span>${escapeHtml(it.type)}</span><span>${escapeHtml(String(it.amount))}</span></div>`;
    });
  }
  document.getElementById("infoBody").innerHTML = html;
  document.getElementById("infoModal").hidden = false;
}

let currentPay = "";

function render() {
  const records = loadRecords()
    .filter((r) => r.archived && (!currentPay || r.paymentType === currentPay))
    .slice()
    .reverse();
  const list = document.getElementById("recordsList");
  const emptyMsg = document.getElementById("emptyMsg");
  list.innerHTML = "";

  if (records.length === 0) {
    emptyMsg.style.display = "block";
    return;
  }
  emptyMsg.style.display = "none";

  records.forEach((r) => {
    const li = document.createElement("li");
    li.className = "record-item";
    li.innerHTML = `
      <div class="record-main">
        <strong>${escapeHtml(r.ownerName)}</strong>
        <span class="record-meta">${escapeHtml(r.jobType)} — ${formatDate(r.completeDate)}${escapeHtml(agreementInfo(r))}</span>
      </div>
      <span class="record-mobile">${formatNum(r.grandTotal || r.total)}</span>
      <div class="record-actions">
        <button class="btn-info">زانیاری خاوەن ماڵ</button>
        <button class="btn-back">گەڕانەوە بۆ فۆڕمی پێشوو</button>
      </div>
    `;
    li.querySelector(".btn-info").addEventListener("click", () => openInfo(r));
    li.querySelector(".btn-back").addEventListener("click", () => {
      const all = loadRecords();
      const target = all.find((x) => x.id === r.id);
      if (target) {
        target.archived = false;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
        render();
      }
    });
    list.appendChild(li);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const backBtn = document.getElementById("backBtn");
  if (backBtn) backBtn.addEventListener("click", () => (window.location.href = "index.html"));

  document.querySelectorAll(".pay-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      currentPay = currentPay === btn.dataset.pay ? "" : btn.dataset.pay;
      document.getElementById("listTitle").textContent = currentPay
        ? `ئەرشیفی ${currentPay}`
        : "هەموو تۆمارەکان";
      render();
    });
  });

  const modal = document.getElementById("infoModal");
  document.getElementById("infoClose").addEventListener("click", () => {
    modal.hidden = true;
  });
  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.hidden = true;
  });

  render();
});
