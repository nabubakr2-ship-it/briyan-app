const KEY = "completedWorks";

function loadJSON(key) {
  try {
    return JSON.parse(localStorage.getItem(key)) || [];
  } catch {
    return [];
  }
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

function formatNum(n) {
  return Number.isInteger(n)
    ? n.toLocaleString("en-US")
    : n.toLocaleString("en-US", { maximumFractionDigits: 2 });
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

function paidSum(r) {
  return (r.installmentsPaid || []).reduce((s, p) => s + num(p.amount), 0);
}

function renderList() {
  const records = loadJSON(KEY)
    .filter((r) => r.paymentType === "قیست" && !r.archived)
    .slice()
    .reverse();
  const list = document.getElementById("instList");
  const emptyMsg = document.getElementById("instEmpty");
  list.innerHTML = "";

  if (!records.length) {
    emptyMsg.style.display = "block";
    return;
  }
  emptyMsg.style.display = "none";

  records.forEach((r) => {
    const total = iqdAmt(r);
    const paid = paidSum(r);
    const left = Math.max(0, total - paid);
    const instAmt = num(r.installmentAmount);
    const instCnt = num(r.installmentCount);
    const paidCnt = (r.installmentsPaid || []).length;

    const li = document.createElement("li");
    li.className = "record-item";
    li.innerHTML = `
      <div class="record-main">
        <strong>${escapeHtml(r.ownerName || "—")}</strong>
        <span class="record-meta">کۆی پارە: ${formatNum(total)} د.ع — وەرگیراو: ${formatNum(paid)} د.ع — ماوە: <strong>${formatNum(left)} د.ع</strong>${
          instCnt ? ` — (${paidCnt}/${instCnt} قیست)` : ""
        }</span>
        <span class="record-meta">${instAmt ? `هەر قیست: ${formatNum(instAmt)} د.ع — ` : ""}${formatDate(r.completeDate)}</span>
      </div>
      <div class="inst-pay-box">
        ${
          left > 0
            ? `<button type="button" class="inst-pay-toggle">داخڵ کردنی پارەی قیست</button>
               <div class="inst-pay-form" hidden>
                 <input type="number" class="inst-amount" min="0" step="any" placeholder="بڕی پارە (د.ع)">
                 <button type="button" class="inst-save">تۆمار</button>
               </div>`
            : `<span class="inst-done">تەواو بوو</span>`
        }
      </div>
    `;

    const toggle = li.querySelector(".inst-pay-toggle");
    if (toggle) {
      const formBox = li.querySelector(".inst-pay-form");
      const input = li.querySelector(".inst-amount");
      toggle.addEventListener("click", () => {
        formBox.hidden = !formBox.hidden;
        if (!formBox.hidden) input.focus();
      });
      li.querySelector(".inst-save").addEventListener("click", () => {
        const val = parseFloat(input.value);
        if (!val || val <= 0) {
          alert("بڕی پارە نادروستە");
          return;
        }
        const all = loadJSON(KEY);
        const target = all.find((x) => x.id === r.id);
        if (target) {
          target.installmentsPaid = target.installmentsPaid || [];
          target.installmentsPaid.push({
            date: new Date().toISOString().slice(0, 10),
            amount: val,
          });
          localStorage.setItem(KEY, JSON.stringify(all));
          renderList();
        }
      });
    }

    list.appendChild(li);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const backBtn = document.getElementById("backBtn");
  if (backBtn) backBtn.addEventListener("click", () => (window.location.href = "index.html"));
  renderList();
});
