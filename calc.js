const COMPLETED_KEY = "completedWorks";
const WORKERS_KEY = "workerEntries";
const KEYS = ["viewings", "promises", "startedWorks", "completedWorks"];

function loadJSON(key) {
  try {
    return JSON.parse(localStorage.getItem(key)) || [];
  } catch {
    return [];
  }
}

function formatNum(n) {
  return Number.isInteger(n)
    ? n.toLocaleString("en-US")
    : n.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

function num(v) {
  return parseFloat(v) || 0;
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

function collectOwners() {
  const map = new Map();
  KEYS.forEach((key) => {
    loadJSON(key).forEach((r) => {
      if (r.ownerName && r.mobile && !map.has(r.mobile)) {
        map.set(r.mobile, { ownerName: r.ownerName, mobile: r.mobile });
      }
    });
  });
  loadJSON(WORKERS_KEY).forEach((r) => {
    if (r.ownerName && r.ownerMobile && !map.has(r.ownerMobile)) {
      map.set(r.ownerMobile, { ownerName: r.ownerName, mobile: r.ownerMobile });
    }
  });
  return [...map.values()];
}

function agreementText(r) {
  if (!r.agreementType) return "";
  if (r.agreementType === "مەتر تووڵ و مرەبەح") {
    return `${r.agreementType} (تووڵ: ${r.priceWool || "-"}، مرەبەح: ${r.priceMarble || "-"})`;
  }
  return `${r.agreementType}${r.price ? ` (${r.price})` : ""}`;
}

function renderOwnerInfo(mobile, payType = "") {
  const body = document.getElementById("ownerInfoBody");
  if (!mobile) {
    body.innerHTML = "";
    return;
  }

  const viewings = loadJSON("viewings").filter((r) => r.mobile === mobile);
  const promises = loadJSON("promises").filter((r) => r.mobile === mobile);
  const started = loadJSON("startedWorks").filter((r) => r.mobile === mobile);
  const completed = loadJSON(COMPLETED_KEY).filter(
    (r) => r.mobile === mobile && (!payType || r.paymentType === payType)
  );
  const entries = loadJSON(WORKERS_KEY).filter(
    (r) => r.ownerMobile === mobile || r.ownerName === (viewings[0] || promises[0] || started[0] || completed[0] || {}).ownerName
  );

  const myExpenses = loadJSON("myExpenses").filter((r) => r.ownerMobile === mobile);

  const ownerTotal = completed.reduce((s, r) => s + num(r.grandTotal || r.total), 0);
  const expenseTotal =
    started.reduce((s, r) => s + (r.items || []).reduce((x, it) => x + num(it.amount), 0), 0) +
    myExpenses.reduce((s, r) => s + (r.items || []).reduce((x, it) => x + num(it.amount), 0), 0);
  const workerTotal = entries.reduce((s, e) => {
    const exp = (e.items || []).reduce((x, it) => x + num(it.amount), 0);
    return s + num(e.dailyRate) + exp;
  }, 0);
  const profit = ownerTotal - expenseTotal - workerTotal;

  let html = `<div class="profit-box">
    <span class="calc-label">کۆی قازانج</span>
    <strong class="calc-value">${formatNum(profit)}</strong>
    <span class="calc-sub">
      <span>${formatNum(ownerTotal)}</span> خاوەن ماڵ −
      <span>${formatNum(expenseTotal)}</span> مەسروفات −
      <span>${formatNum(workerTotal)}</span> کرێکار
    </span>
  </div>`;
  const row = (k, v) =>
    v ? `<div class="info-row"><span>${k}</span><span>${escapeHtml(String(v))}</span></div>` : "";

  viewings.forEach((v) => {
    html += `<h3 class="info-section">تەماشاکردن — ${formatDate(v.viewDate)}</h3>`;
    html += row("جۆری ئیش", v.jobType) + row("ڕێک کەوتن", agreementText(v));
  });
  promises.forEach((p) => {
    html += `<h3 class="info-section">بەڵێن — ${formatDate(p.promiseDate)}</h3>`;
    html += row("جۆری ئیش", p.jobType) + row("ڕێک کەوتن", agreementText(p));
  });
  started.forEach((s) => {
    html += `<h3 class="info-section">ئیشی دەست پێکراو — ${formatDate(s.startDate)}</h3>`;
    html += row("جۆری ئیش", s.jobType);
    if (s.waxType) html += row("جۆری محالەجە", s.waxType);
    (s.items || []).forEach((it) => {
      html += `<div class="info-row"><span>${escapeHtml(it.type)}</span><span>${escapeHtml(String(it.amount))}</span></div>`;
    });
  });
  completed.forEach((c) => {
    html += `<h3 class="info-section">ئیشی تەواو کراو — ${formatDate(c.completeDate)}</h3>`;
    html += row("جۆری ئیش", c.jobType) + row("ڕێک کەوتن", agreementText(c));
    html += row("جۆری پارەدان", c.paymentType) + row("کۆی پارە", c.grandTotal || c.total);
  });

  if (myExpenses.length) {
    html += `<h3 class="info-section">مەسروفاتی خەرجی خۆم</h3>`;
    myExpenses.forEach((e) => {
      html += `<div class="info-row"><span>${formatDate(e.buyDate)}${e.workStatus ? " — " + escapeHtml(e.workStatus) : ""}${e.dayType ? " (" + escapeHtml(e.dayType) + ")" : ""}</span><span></span></div>`;
      (e.items || []).forEach((it) => {
        html += `<div class="info-row"><span>— ${escapeHtml(it.type || "")}</span><span>${escapeHtml(String(it.amount || ""))}</span></div>`;
      });
    });
  }

  if (entries.length) {
    html += `<h3 class="info-section">کرێکاران</h3><table class="summary-table"><thead><tr>
      <th>کرێکار</th><th>بەروار</th><th>دۆخ</th><th>بڕی ڕۆژانە</th><th>کۆی پارە</th>
    </tr></thead><tbody>`;
    entries.forEach((e) => {
      const exp = (e.items || []).reduce((s, it) => s + num(it.amount), 0);
      html += `<tr>
        <td>${escapeHtml(e.workerName || "—")}</td>
        <td>${formatDate(e.entryDate)}</td>
        <td>${escapeHtml(e.dailyStatus || "—")}</td>
        <td>${formatNum(num(e.dailyRate))}</td>
        <td>${formatNum(num(e.dailyRate) + exp)}</td>
      </tr>`;
    });
    html += "</tbody></table>";
  }

  body.innerHTML = html || "<p class='empty-msg'>هیچ زانیارییەک نییە بۆ ئەم خاوەن ماڵە</p>";
}

document.addEventListener("DOMContentLoaded", () => {
  const backBtn = document.getElementById("backBtn");
  if (backBtn) backBtn.addEventListener("click", () => (window.location.href = "index.html"));

  const completed = loadJSON(COMPLETED_KEY);
  const ownersTotal = completed.reduce((s, r) => {
    if (r.grandTotal) return s + num(r.grandTotal);
    if (r.total) return s + num(r.total);
    return s;
  }, 0);

  const entries = loadJSON(WORKERS_KEY);
  const workersTotal = entries.reduce((s, r) => {
    const exp = (r.items || []).reduce((x, it) => x + num(it.amount), 0);
    return s + num(r.dailyRate) + exp;
  }, 0);

  const myExpensesTotal = loadJSON("myExpenses").reduce(
    (s, r) => s + (r.items || []).reduce((x, it) => x + num(it.amount), 0),
    0
  );

  document.getElementById("ownersTotal").textContent = formatNum(ownersTotal);
  document.getElementById("workersTotal").textContent = formatNum(workersTotal);
  document.getElementById("expensesTotal").textContent = formatNum(myExpensesTotal);
  document.getElementById("remaining").textContent = formatNum(
    ownersTotal - workersTotal - myExpensesTotal
  );

  const modal = document.getElementById("ownerModal");
  const select = document.getElementById("ownerInfoSelect");
  collectOwners().forEach((o) => {
    const opt = document.createElement("option");
    opt.value = o.mobile;
    opt.textContent = `${o.ownerName} — ${o.mobile}`;
    select.appendChild(opt);
  });
  select.addEventListener("change", () => renderOwnerInfo(select.value));

  document.getElementById("ownerInfoBtn").addEventListener("click", () => {
    select.value = "";
    renderOwnerInfo("");
    modal.hidden = false;
  });
  document.getElementById("ownerModalClose").addEventListener("click", () => {
    modal.hidden = true;
  });
  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.hidden = true;
  });

  const payModal = document.getElementById("payModal");
  const payModalBody = document.getElementById("payModalBody");
  const payOwnerSelect = document.getElementById("payOwnerSelect");
  let currentPay = "";
  document.querySelectorAll(".pay-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const pay = btn.dataset.pay;
      currentPay = pay;
      document.getElementById("payModalTitle").textContent = `پارەی ${pay}`;

      const ownerMap = new Map();
      completed
        .filter((r) => r.paymentType === pay && r.ownerName && r.mobile)
        .forEach((r) => {
          if (!ownerMap.has(r.mobile)) ownerMap.set(r.mobile, r.ownerName);
        });
      payOwnerSelect.innerHTML = '<option value="">-- هەموو خاوەن ماڵەکان --</option>';
      ownerMap.forEach((name, mobile) => {
        const opt = document.createElement("option");
        opt.value = mobile;
        opt.textContent = name;
        payOwnerSelect.appendChild(opt);
      });
      const records = completed
        .filter((r) => r.paymentType === pay && !r.archived)
        .slice()
        .reverse();
      let total = 0;
      let html = "";
      if (records.length) {
        html = `<table class="summary-table"><thead><tr>
          <th>خاوەن ماڵ</th><th>بەروار</th><th>جۆری ئیش</th><th>کۆی پارە</th>
        </tr></thead><tbody>`;
        records.forEach((r) => {
          const amt = num(r.grandTotal || r.total);
          total += amt;
          html += `<tr>
            <td>${escapeHtml(r.ownerName || "—")}</td>
            <td>${formatDate(r.completeDate)}</td>
            <td>${escapeHtml(r.jobType || "—")}</td>
            <td>${formatNum(amt)}</td>
          </tr>`;
        });
        html += "</tbody></table>";
      }
      payModalBody.innerHTML = html || "<p class='empty-msg'>هیچ تۆمارێک نییە</p>";
      document.getElementById("payTotal").textContent = formatNum(total);
      payModal.hidden = false;
    });
  });
  document.getElementById("payModalClose").addEventListener("click", () => {
    payModal.hidden = true;
  });
  payModal.addEventListener("click", (e) => {
    if (e.target === payModal) payModal.hidden = true;
  });

  document.getElementById("sendArchiveBtn").addEventListener("click", () => {
    if (!currentPay) return;
    const all = loadJSON(COMPLETED_KEY);
    let count = 0;
    all.forEach((r) => {
      if (r.paymentType === currentPay && !r.archived) {
        r.archived = true;
        count++;
      }
    });
    if (!count) {
      alert("هیچ تۆمارێک نییە بۆ ناردن");
      return;
    }
    localStorage.setItem(COMPLETED_KEY, JSON.stringify(all));
    alert(`${count} تۆمار نێردرا بۆ ئەرشیف`);
    document.querySelector(`.pay-btn[data-pay="${currentPay}"]`).click();
  });

  document.getElementById("payOwnerInfoBtn").addEventListener("click", () => {
    const mobile = payOwnerSelect.value;
    if (!mobile) {
      alert("سەرەتا ناوی خاوەن ماڵ هەڵبژێرە");
      return;
    }
    const ownerSelect = document.getElementById("ownerInfoSelect");
    ownerSelect.value = mobile;
    renderOwnerInfo(mobile, currentPay);
    modal.hidden = false;
  });
});
