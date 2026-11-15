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

function isUsd(r) {
  return r.jobType === "محالەجە";
}

function recAmt(r) {
  return num(r.grandTotal || r.total);
}

function iqdAmt(r) {
  if (r.totalIqd !== undefined && r.totalIqd !== "" && r.totalIqd !== null) {
    return num(r.totalIqd);
  }
  const raw = recAmt(r);
  if (!isUsd(r)) return raw;
  const rate = num(r.dollarRate) || num(localStorage.getItem("lastDollarRate"));
  return rate ? raw * rate : raw;
}

function itemsSum(r) {
  return (r.items || []).reduce((x, it) => x + num(it.amount), 0);
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

let ownerPayFilter = "";

function renderOwnerInfo(mobile, payType = "") {
  ownerPayFilter = payType;
  const body = document.getElementById("ownerInfoBody");
  if (!mobile) {
    body.innerHTML = "";
    return;
  }

  const viewings = loadJSON("viewings").filter((r) => r.mobile === mobile);
  const promises = loadJSON("promises").filter((r) => r.mobile === mobile);
  const started = loadJSON("startedWorks").filter((r) => r.mobile === mobile);
  const completed = loadJSON(COMPLETED_KEY).filter(
    (r) => r.mobile === mobile && !r.archived && (!payType || r.paymentType === payType)
  );
  const ownerNameRef =
    (viewings[0] || promises[0] || started[0] || completed[0] || {}).ownerName || "";
  const entries = loadJSON(WORKERS_KEY).filter(
    (r) => !r.archived && (r.ownerMobile === mobile || (ownerNameRef !== "" && r.ownerName === ownerNameRef))
  );

  const myExpenses = loadJSON("myExpenses").filter((r) => r.ownerMobile === mobile);

  const ownerTotal = completed.reduce((s, r) => s + iqdAmt(r), 0);
  const expenseTotal =
    started.reduce((s, r) => s + itemsSum(r), 0) +
    myExpenses.reduce((s, r) => s + itemsSum(r), 0);
  const workerTotal = entries.reduce((s, e) => {
    return s + num(e.dailyRate) + itemsSum(e);
  }, 0);
  const profit = ownerTotal - expenseTotal - workerTotal;

  let html = `<div class="profit-box">
    <span class="calc-label">کۆی قازانج</span>
    <strong class="calc-value">${formatNum(profit)} د.ع</strong>
    <span class="calc-sub">
      خاوەن: <span>${formatNum(ownerTotal)}</span> د.ع —
      مەسروفات: <span>${formatNum(expenseTotal)}</span> —
      کرێکار: <span>${formatNum(workerTotal)}</span>
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
    html += row("جۆری پارەدان", c.paymentType) + row("کۆی پارە", `${formatNum(iqdAmt(c))} د.ع`);
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
      <th>کرێکار</th><th>بەروار</th><th>دۆخ</th><th>بڕی ڕۆژانە</th><th>مەسروفات</th><th>کۆی پارە</th>
    </tr></thead><tbody>`;
    entries.forEach((e) => {
      const exp = (e.items || []).reduce((s, it) => s + num(it.amount), 0);
      const expText = (e.items || [])
        .map((it) => [it.type, it.amount].filter(Boolean).join(": "))
        .filter(Boolean)
        .join("، ");
      html += `<tr>
        <td>${escapeHtml(e.workerName || "—")}</td>
        <td>${formatDate(e.entryDate)}</td>
        <td>${escapeHtml(e.dailyStatus || "—")}</td>
        <td>${formatNum(num(e.dailyRate))}</td>
        <td>${escapeHtml(expText || "—")}</td>
        <td>${formatNum(num(e.dailyRate) + exp)}</td>
      </tr>`;
    });
    html += "</tbody></table>";
  }

  html += `<div class="info-row total-row"><span>کۆی گشتی کرێکار و مەسروف</span><span>${formatNum(workerTotal + expenseTotal)} د.ع</span></div>`;

  body.innerHTML = html || "<p class='empty-msg'>هیچ زانیارییەک نییە بۆ ئەم خاوەن ماڵە</p>";
}

document.addEventListener("DOMContentLoaded", () => {
  const backBtn = document.getElementById("backBtn");
  if (backBtn) backBtn.addEventListener("click", () => (window.location.href = "index.html"));

  let completed = [];
  function refreshTotals() {
    completed = loadJSON(COMPLETED_KEY);
    const ownersTotal = completed.reduce((s, r) => s + iqdAmt(r), 0);

  const entries = loadJSON(WORKERS_KEY).filter((r) => !r.archived);
  const workersTotal = entries.reduce((s, r) => {
    const exp = (r.items || []).reduce((x, it) => x + num(it.amount), 0);
    return s + num(r.dailyRate) + exp;
  }, 0);

  const myExpensesTotal = loadJSON("myExpenses").reduce(
    (s, r) => s + (r.items || []).reduce((x, it) => x + num(it.amount), 0),
    0
  );

  const setTxt = (id, v) => {
    const el = document.getElementById(id);
    if (el) el.textContent = v;
  };
  setTxt("ownersTotal", formatNum(ownersTotal));
  setTxt("workersTotal", formatNum(workersTotal));
  setTxt("expensesTotal", formatNum(myExpensesTotal));
  setTxt("remaining", formatNum(ownersTotal - workersTotal - myExpensesTotal));

  const debtRecords = completed.filter(
    (r) => (r.paymentType === "قیست" || r.paymentType === "قەرز") && !r.archived
  );
  setTxt("debtTotal", formatNum(
    debtRecords.reduce((s, r) => s + iqdAmt(r), 0)
  ));
  setTxt("debtPaidTotal", formatNum(
    debtRecords.reduce(
      (s, r) =>
        s +
        (r.installmentsPaid || []).reduce((x, p) => x + num(p.amount), 0) +
        (r.debtPayments || []).reduce((x, p) => x + num(p.amount), 0),
      0
    )
  ));

  const cashRecords = completed.filter((r) => r.paymentType === "نەقد" && !r.archived);
  const cashPaid = cashRecords.reduce(
    (s, r) => s + (r.cashPayments || []).reduce((x, p) => x + num(p.amount), 0),
    0
  );
  const cashTotal = cashRecords.reduce((s, r) => s + iqdAmt(r), 0);
  setTxt("cashPaidTotal", formatNum(cashPaid));
  setTxt("cashLeftTotal", formatNum(
    Math.max(0, cashTotal - cashPaid)
  ));
  }
  refreshTotals();

  const modal = document.getElementById("ownerModal");
  const select = document.getElementById("ownerInfoSelect");
  collectOwners().forEach((o) => {
    const opt = document.createElement("option");
    opt.value = o.mobile;
    opt.textContent = `${o.ownerName} — ${o.mobile}`;
    select.appendChild(opt);
  });
  select.addEventListener("change", () => renderOwnerInfo(select.value));

  const workTotalModal = document.getElementById("workTotalModal");
  document.getElementById("workTotalBtn").addEventListener("click", () => {
    refreshTotals();
    workTotalModal.hidden = false;
  });
  document.getElementById("workTotalClose").addEventListener("click", () => {
    workTotalModal.hidden = true;
  });
  workTotalModal.addEventListener("click", (e) => {
    if (e.target === workTotalModal) workTotalModal.hidden = true;
  });

  const profitModal = document.getElementById("profitModal");
  document.getElementById("profitBtn").addEventListener("click", () => {
    const body = document.getElementById("profitBody");
    const byOwner = new Map();
    const get = (mobile, name) => {
      const key = mobile || name || "—";
      if (!byOwner.has(key)) byOwner.set(key, { name: name || "—", mobile, owner: 0, expense: 0, worker: 0 });
      return byOwner.get(key);
    };
    completed.forEach((r) => {
      const o = get(r.mobile, r.ownerName);
      o.owner += iqdAmt(r);
    });
    loadJSON("startedWorks").forEach((r) => {
      const o = get(r.mobile, r.ownerName);
      o.expense += itemsSum(r);
    });
    loadJSON("myExpenses").forEach((r) => {
      const o = get(r.ownerMobile, "");
      o.expense += itemsSum(r);
    });
    loadJSON(WORKERS_KEY).filter((r) => !r.archived).forEach((e) => {
      const o = get(e.ownerMobile, e.ownerName);
      o.worker += num(e.dailyRate) + itemsSum(e);
    });

    let html = `<table class="summary-table"><thead><tr>
      <th>خاوەن ماڵ</th><th>خاوەن</th><th>مەسروفات</th><th>کرێکار</th><th>قازانج</th>
    </tr></thead><tbody>`;
    let tOwner = 0, tExpense = 0, tWorker = 0;
    byOwner.forEach((o) => {
      const profit = o.owner - o.expense - o.worker;
      tOwner += o.owner; tExpense += o.expense; tWorker += o.worker;
      html += `<tr>
        <td>${escapeHtml(o.name)}</td>
        <td>${formatNum(o.owner)} د.ع</td>
        <td>${formatNum(o.expense)} د.ع</td>
        <td>${formatNum(o.worker)} د.ع</td>
        <td>${formatNum(profit)} د.ع</td>
      </tr>`;
    });
    html += `</tbody></table>
      <div class="info-row total-row"><span>کۆی گشتی قازانج</span><span>${formatNum(tOwner - tExpense - tWorker)} د.ع</span></div>`;
    body.innerHTML = byOwner.size ? html : "<p class='empty-msg'>هیچ زانیارییەک نییە</p>";
    profitModal.hidden = false;
  });
  document.getElementById("profitClose").addEventListener("click", () => {
    profitModal.hidden = true;
  });
  profitModal.addEventListener("click", (e) => {
    if (e.target === profitModal) profitModal.hidden = true;
  });

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
      if (pay === "قیست") {
        let remainingTotal = 0;
        if (records.length) {
          html = `<table class="summary-table"><thead><tr>
            <th>خاوەن ماڵ</th><th>کۆی پارە</th><th>هەر قیست</th><th>ژمارە</th><th>وەرگیراو</th><th>ماوە</th><th></th>
          </tr></thead><tbody>`;
          records.forEach((r) => {
            const amt = iqdAmt(r);
            total += amt;
            const instAmt = num(r.installmentAmount);
            const instCnt = num(r.installmentCount);
            const paidList = r.installmentsPaid || [];
            const paidAmt = paidList.reduce((s, p) => s + num(p.amount), 0);
            const leftAmt = Math.max(0, amt - paidAmt);
            remainingTotal += leftAmt;
            const paidCnt = paidList.length;
            html += `<tr>
              <td>${escapeHtml(r.ownerName || "—")}</td>
              <td>${formatNum(amt)} د.ع</td>
              <td>${instAmt ? formatNum(instAmt) : "—"}</td>
              <td>${instCnt || "—"}</td>
              <td>${paidAmt ? `${formatNum(paidAmt)} د.ع (${paidCnt}/${instCnt || "؟"})` : "—"}</td>
              <td>${formatNum(leftAmt)} د.ع</td>
              <td>${leftAmt > 0 ? `<button type="button" class="inst-pay" data-id="${r.id}">وەرگیرا</button><button type="button" class="inst-pay-all" data-id="${r.id}">کۆی پارە</button>` : ""}</td>
            </tr>`;
          });
          html += "</tbody></table>";
        }
        payModalBody.innerHTML = html || "<p class='empty-msg'>هیچ تۆمارێک نییە</p>";
        document.getElementById("payTotal").textContent = `کۆی پارە: ${formatNum(total)} د.ع — ماوە: ${formatNum(remainingTotal)} د.ع`;
        payModalBody.querySelectorAll(".inst-pay").forEach((btn) => {
          btn.addEventListener("click", () => {
            const cell = btn.closest("td");
            cell.innerHTML = `
              <div class="inst-pay-inline">
                <input type="number" class="inst-amount" min="0" step="any" placeholder="بڕی پارە (د.ع)">
                <input type="date" class="inst-date" value="${new Date().toISOString().slice(0, 10)}">
                <button type="button" class="inst-save">تۆمار</button>
              </div>`;
            const input = cell.querySelector(".inst-amount");
            const dateInput = cell.querySelector(".inst-date");
            input.focus();
            const save = () => {
              const val = parseFloat(input.value);
              if (!val || val <= 0) {
                alert("بڕی پارە نادروستە");
                return;
              }
              const all = loadJSON(COMPLETED_KEY);
              const rec = all.find((x) => x.id === Number(btn.dataset.id));
              if (rec) {
                rec.installmentsPaid = rec.installmentsPaid || [];
                rec.installmentsPaid.push({
                  date: dateInput.value || new Date().toISOString().slice(0, 10),
                  amount: val,
                });
                localStorage.setItem(COMPLETED_KEY, JSON.stringify(all));
                document.querySelector(`.pay-btn[data-pay="${pay}"]`).click();
              }
            };
            cell.querySelector(".inst-save").addEventListener("click", save);
            input.addEventListener("keydown", (e) => {
              if (e.key === "Enter") save();
            });
          });
        });
        payModal.hidden = false;
        return;
      }
      if (pay === "نەقد") {
        let remainingTotal = 0;
        if (records.length) {
          html = `<table class="summary-table"><thead><tr>
            <th>خاوەن ماڵ</th><th>کۆی پارە</th><th>وەرگیراو</th><th>ماوە</th><th></th>
          </tr></thead><tbody>`;
          records.forEach((r) => {
            const amt = iqdAmt(r);
            total += amt;
            const paidAmt = (r.cashPayments || []).reduce((s, p) => s + num(p.amount), 0);
            const leftAmt = Math.max(0, amt - paidAmt);
            remainingTotal += leftAmt;
            html += `<tr>
              <td>${escapeHtml(r.ownerName || "—")}</td>
              <td>${formatNum(amt)} د.ع</td>
              <td>${paidAmt ? `${formatNum(paidAmt)} د.ع` : "—"}</td>
              <td>${formatNum(leftAmt)} د.ع</td>
              <td>${leftAmt > 0 ? `<button type="button" class="inst-pay" data-id="${r.id}">وەرگرتن</button><button type="button" class="inst-pay-all" data-id="${r.id}">کۆی پارە</button>` : ""}</td>
            </tr>`;
          });
          html += "</tbody></table>";
        }
        payModalBody.innerHTML = html || "<p class='empty-msg'>هیچ تۆمارێک نییە</p>";
        document.getElementById("payTotal").textContent = `کۆی پارە: ${formatNum(total)} د.ع — ماوە: ${formatNum(remainingTotal)} د.ع`;
        payModalBody.querySelectorAll(".inst-pay").forEach((btn) => {
          btn.addEventListener("click", () => {
            const cell = btn.closest("td");
            cell.innerHTML = `
              <div class="inst-pay-inline">
                <input type="number" class="inst-amount" min="0" step="any" placeholder="بڕی پارە (د.ع)">
                <input type="date" class="inst-date" value="${new Date().toISOString().slice(0, 10)}">
                <button type="button" class="inst-save">تۆمار</button>
              </div>`;
            const input = cell.querySelector(".inst-amount");
            const dateInput = cell.querySelector(".inst-date");
            input.focus();
            const save = () => {
              const val = parseFloat(input.value);
              if (!val || val <= 0) {
                alert("بڕی پارە نادروستە");
                return;
              }
              const all = loadJSON(COMPLETED_KEY);
              const rec = all.find((x) => x.id === Number(btn.dataset.id));
              if (rec) {
                rec.cashPayments = rec.cashPayments || [];
                rec.cashPayments.push({
                  date: dateInput.value || new Date().toISOString().slice(0, 10),
                  amount: val,
                });
                localStorage.setItem(COMPLETED_KEY, JSON.stringify(all));
                document.querySelector(`.pay-btn[data-pay="${pay}"]`).click();
              }
            };
            cell.querySelector(".inst-save").addEventListener("click", save);
            input.addEventListener("keydown", (e) => {
              if (e.key === "Enter") save();
            });
          });
        });
        payModal.hidden = false;
        return;
      }
      if (pay === "قەرز") {
        let remainingTotal = 0;
        if (records.length) {
          html = `<table class="summary-table"><thead><tr>
            <th>خاوەن ماڵ</th><th>کۆی قەرز</th><th>وەرگیراوەوە</th><th>ماوە</th><th></th>
          </tr></thead><tbody>`;
          records.forEach((r) => {
            const amt = iqdAmt(r);
            total += amt;
            const paidAmt = (r.debtPayments || []).reduce((s, p) => s + num(p.amount), 0);
            const leftAmt = Math.max(0, amt - paidAmt);
            remainingTotal += leftAmt;
            html += `<tr>
              <td>${escapeHtml(r.ownerName || "—")}</td>
              <td>${formatNum(amt)} د.ع</td>
              <td>${paidAmt ? `${formatNum(paidAmt)} د.ع` : "—"}</td>
              <td>${formatNum(leftAmt)} د.ع</td>
              <td>${leftAmt > 0 ? `<button type="button" class="inst-pay" data-id="${r.id}">دانەوە</button><button type="button" class="inst-pay-all" data-id="${r.id}">کۆی پارە</button>` : ""}</td>
            </tr>`;
          });
          html += "</tbody></table>";
        }
        payModalBody.innerHTML = html || "<p class='empty-msg'>هیچ تۆمارێک نییە</p>";
        document.getElementById("payTotal").textContent = `کۆی قەرز: ${formatNum(total)} د.ع — ماوە: ${formatNum(remainingTotal)} د.ع`;
        payModalBody.querySelectorAll(".inst-pay").forEach((btn) => {
          btn.addEventListener("click", () => {
            const cell = btn.closest("td");
            cell.innerHTML = `
              <div class="inst-pay-inline">
                <input type="number" class="inst-amount" min="0" step="any" placeholder="بڕی پارە (د.ع)">
                <input type="date" class="inst-date" value="${new Date().toISOString().slice(0, 10)}">
                <button type="button" class="inst-save">تۆمار</button>
              </div>`;
            const input = cell.querySelector(".inst-amount");
            const dateInput = cell.querySelector(".inst-date");
            input.focus();
            const save = () => {
              const val = parseFloat(input.value);
              if (!val || val <= 0) {
                alert("بڕی پارە نادروستە");
                return;
              }
              const all = loadJSON(COMPLETED_KEY);
              const rec = all.find((x) => x.id === Number(btn.dataset.id));
              if (rec) {
                rec.debtPayments = rec.debtPayments || [];
                rec.debtPayments.push({
                  date: dateInput.value || new Date().toISOString().slice(0, 10),
                  amount: val,
                });
                localStorage.setItem(COMPLETED_KEY, JSON.stringify(all));
                document.querySelector(`.pay-btn[data-pay="${pay}"]`).click();
              }
            };
            cell.querySelector(".inst-save").addEventListener("click", save);
            input.addEventListener("keydown", (e) => {
              if (e.key === "Enter") save();
            });
          });
        });
        payModal.hidden = false;
        return;
      }
      if (records.length) {
        html = `<table class="summary-table"><thead><tr>
          <th>خاوەن ماڵ</th><th>بەروار</th><th>جۆری ئیش</th><th>کۆی پارە</th>
        </tr></thead><tbody>`;
        records.forEach((r) => {
          const amt = iqdAmt(r);
          total += amt;
          html += `<tr>
            <td>${escapeHtml(r.ownerName || "—")}</td>
            <td>${formatDate(r.completeDate)}</td>
            <td>${escapeHtml(r.jobType || "—")}</td>
            <td>${formatNum(amt)} د.ع</td>
          </tr>`;
        });
        html += "</tbody></table>";
      }
      payModalBody.innerHTML = html || "<p class='empty-msg'>هیچ تۆمارێک نییە</p>";
      document.getElementById("payTotal").textContent = `${formatNum(total)} د.ع`;
      payModal.hidden = false;
    });
  });
  payModalBody.addEventListener("click", (e) => {
    const btn = e.target.closest(".inst-pay-all");
    if (!btn) return;
    const all = loadJSON(COMPLETED_KEY);
    const rec = all.find((x) => x.id === Number(btn.dataset.id));
    if (!rec) return;
    const payKey =
      currentPay === "قیست" ? "installmentsPaid" :
      currentPay === "نەقد" ? "cashPayments" : "debtPayments";
    const amt = iqdAmt(rec);
    const paidAmt = (rec[payKey] || []).reduce((s, p) => s + num(p.amount), 0);
    const leftAmt = Math.max(0, amt - paidAmt);
    if (leftAmt <= 0) return;
    rec[payKey] = rec[payKey] || [];
    rec[payKey].push({
      date: new Date().toISOString().slice(0, 10),
      amount: leftAmt,
    });
    localStorage.setItem(COMPLETED_KEY, JSON.stringify(all));
    document.querySelector(`.pay-btn[data-pay="${currentPay}"]`).click();
  });
  document.getElementById("payModalClose").addEventListener("click", () => {
    payModal.hidden = true;
  });
  payModal.addEventListener("click", (e) => {
    if (e.target === payModal) payModal.hidden = true;
  });

  document.getElementById("ownerArchiveBtn").addEventListener("click", () => {
    const mobile = document.getElementById("ownerInfoSelect").value;
    if (!mobile) {
      alert("سەرەتا ناوی خاوەن ماڵ هەڵبژێرە");
      return;
    }
    const all = loadJSON(COMPLETED_KEY);
    let count = 0;
    all.forEach((r) => {
      if (
        r.mobile === mobile &&
        !r.archived &&
        (!ownerPayFilter || r.paymentType === ownerPayFilter)
      ) {
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
    renderOwnerInfo(mobile, ownerPayFilter);
    refreshTotals();
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
