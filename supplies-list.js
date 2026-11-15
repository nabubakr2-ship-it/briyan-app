const STORAGE_KEY = "supplyPurchases";

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

let filterPay = "";
let searchText = "";

function matchesSearch(r, q) {
  if (!q) return true;
  const hay = [
    r.shopName,
    r.payType,
    r.note,
    (r.items || []).map((it) => it.type).join(" "),
    formatDate(r.buyDate),
  ].filter(Boolean).join(" ").toLowerCase();
  return hay.includes(q.toLowerCase());
}

function renderRecords() {
  const records = loadJSON(STORAGE_KEY).filter(
    (r) => (!filterPay || r.payType === filterPay) && matchesSearch(r, searchText)
  );
  const list = document.getElementById("recordsList");
  const emptyMsg = document.getElementById("emptyMsg");
  list.innerHTML = "";

  if (!records.length) {
    emptyMsg.style.display = "block";
    return;
  }
  emptyMsg.style.display = "none";

  let totalPurchases = 0;
  let totalDebt = 0;
  let totalCash = 0;
  records.slice().reverse().forEach((r) => {
    const total = (r.items || []).reduce((s, it) => s + (parseFloat(it.amount) || 0), 0);
    const itemNames = (r.items || [])
      .map((it) => [it.type, it.amount].filter(Boolean).join(": "))
      .filter(Boolean)
      .join("، ");
    const isDebt = r.payType === "قەرز";
    const paidAmt = isDebt
      ? (r.debtPayments || []).reduce((s, p) => s + (parseFloat(p.amount) || 0), 0)
      : 0;
    const leftAmt = Math.max(0, total - paidAmt);
    totalPurchases += total;
    if (isDebt) totalDebt += leftAmt;
    if (r.payType === "نەقد") totalCash += total;
    const li = document.createElement("li");
    li.className = "record-item";
    li.innerHTML = `
      <div class="record-main">
        <strong>${formatNum(total)} د.ع</strong>
        <span class="record-meta">${formatDate(r.buyDate)}${r.shopName ? " — " + escapeHtml(r.shopName) : ""}${r.payType ? " — " + escapeHtml(r.payType) : ""}${r.note ? " — " + escapeHtml(r.note) : ""}${itemNames ? " — " + escapeHtml(itemNames) : ""}</span>
        ${isDebt ? `<span class="record-meta">وەرگیراوەوە: ${formatNum(paidAmt)} د.ع — ماوە: <strong>${formatNum(leftAmt)} د.ع</strong></span>` : ""}
        <div class="record-actions">
          ${isDebt && leftAmt > 0 ? `<button type="button" class="inst-pay" data-id="${r.id}">دانەوە</button>` : ""}
        </div>
      </div>
      <div class="record-side">
        <span class="record-mobile">${formatDate(r.buyDate)}</span>
        <button class="record-del" title="ڕەشکردنەوە">&times;</button>
      </div>
    `;
    const payBtn = li.querySelector(".inst-pay");
    if (payBtn) {
      payBtn.addEventListener("click", () => {
        const cell = payBtn.parentElement;
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
          const all = loadJSON(STORAGE_KEY);
          const rec = all.find((x) => x.id === Number(payBtn.dataset.id));
          if (rec) {
            rec.debtPayments = rec.debtPayments || [];
            rec.debtPayments.push({
              date: dateInput.value || new Date().toISOString().slice(0, 10),
              amount: val,
            });
            localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
            renderRecords();
          }
        };
        cell.querySelector(".inst-save").addEventListener("click", save);
        input.addEventListener("keydown", (e) => {
          if (e.key === "Enter") save();
        });
      });
    }
    li.querySelector(".record-del").addEventListener("click", () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(loadJSON(STORAGE_KEY).filter((x) => x.id !== r.id))
      );
      renderRecords();
    });
    list.appendChild(li);
  });

  document.getElementById("totalPurchases").textContent = formatNum(totalPurchases);
  document.getElementById("totalDebt").textContent = formatNum(totalDebt);
  document.getElementById("totalCash").textContent = formatNum(totalCash);
}

document.addEventListener("DOMContentLoaded", () => {
  const backBtn = document.getElementById("backBtn");
  if (backBtn) backBtn.addEventListener("click", () => (window.location.href = "supplies.html"));

  const searchBox = document.getElementById("searchBox");
  if (searchBox) {
    searchBox.addEventListener("input", () => {
      searchText = searchBox.value.trim();
      renderRecords();
    });
  }

  const cashBtn = document.getElementById("filterCash");
  const debtBtn = document.getElementById("filterDebt");
  cashBtn.addEventListener("click", () => {
    filterPay = filterPay === "نەقد" ? "" : "نەقد";
    cashBtn.classList.toggle("active", filterPay === "نەقد");
    debtBtn.classList.remove("active");
    renderRecords();
  });
  debtBtn.addEventListener("click", () => {
    filterPay = filterPay === "قەرز" ? "" : "قەرز";
    debtBtn.classList.toggle("active", filterPay === "قەرز");
    cashBtn.classList.remove("active");
    renderRecords();
  });

  renderRecords();
});
