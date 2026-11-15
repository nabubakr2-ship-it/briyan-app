const STORAGE_KEY = "myExpenses";

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

function addItemRow(type = "", amount = "") {
  const body = document.getElementById("itemsBody");
  const row = document.createElement("div");
  row.className = "item-row";
  row.innerHTML = `
    <input type="text" class="item-type" placeholder="جۆری کاڵا">
    <input type="number" class="item-amount" placeholder="بڕ" min="0" step="any">
  `;
  row.querySelector(".item-type").value = type;
  row.querySelector(".item-amount").value = amount;

  row.addEventListener("input", () => {
    const rows = body.querySelectorAll(".item-row");
    const last = rows[rows.length - 1];
    if (row !== last) return;
    const t = row.querySelector(".item-type").value.trim();
    const a = row.querySelector(".item-amount").value.trim();
    if (t !== "" && a !== "") addItemRow();
  });

  body.appendChild(row);
}

function updateTotal() {
  const total = [...document.querySelectorAll(".item-amount")].reduce(
    (s, el) => s + (parseFloat(el.value) || 0),
    0
  );
  document.getElementById("totalAmount").textContent = formatNum(total);
}

function renderRecords() {
  const records = loadJSON(STORAGE_KEY);
  const list = document.getElementById("recordsList");
  const emptyMsg = document.getElementById("emptyMsg");
  const grandTotalBox = document.getElementById("grandTotalBox");
  list.innerHTML = "";

  if (records.length === 0) {
    emptyMsg.style.display = "block";
    grandTotalBox.hidden = true;
    return;
  }
  emptyMsg.style.display = "none";
  grandTotalBox.hidden = false;

  let grandTotal = 0;
  records.slice().reverse().forEach((r) => {
    const total = (r.items || []).reduce((s, it) => s + (parseFloat(it.amount) || 0), 0);
    grandTotal += total;
    const itemNames = (r.items || [])
      .map((it) => [it.type, it.amount].filter(Boolean).join(": "))
      .filter(Boolean)
      .join("، ");
    const li = document.createElement("li");
    li.className = "record-item";
    li.innerHTML = `
      <div class="record-main">
        <strong>${r.buyFor === "بۆ خۆم" ? "بۆ خۆم" : r.ownerName || r.payType || "—"}</strong>
        <span class="record-meta">${r.payType ? escapeHtml(r.payType) + " — " : ""}${formatDate(r.buyDate)}${itemNames ? " — " + escapeHtml(itemNames) : ""}</span>
      </div>
      <div class="record-side">
        <span class="record-mobile">${formatNum(total)}</span>
        <button class="record-del" title="ڕەشکردنەوە">&times;</button>
      </div>
    `;
    li.querySelector(".record-del").addEventListener("click", () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(loadJSON(STORAGE_KEY).filter((x) => x.id !== r.id))
      );
      renderRecords();
    });
    list.appendChild(li);
  });

  document.getElementById("grandTotalAmount").textContent = formatNum(grandTotal);
}

document.addEventListener("DOMContentLoaded", () => {
  const backBtn = document.getElementById("backBtn");
  if (backBtn) backBtn.addEventListener("click", () => (window.location.href = "index.html"));

  const form = document.getElementById("expenseForm");
  const today = new Date().toISOString().slice(0, 10);
  form.buyDate.value = today;

  addItemRow();
  document.getElementById("itemsBody").addEventListener("input", updateTotal);

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const items = [...document.querySelectorAll(".item-row")]
      .map((row) => ({
        type: row.querySelector(".item-type").value.trim(),
        amount: row.querySelector(".item-amount").value.trim(),
      }))
      .filter((it) => it.type !== "" || it.amount !== "");
    if (!items.length) {
      alert("بڕی مەسروف بنووسە");
      return;
    }

    const records = loadJSON(STORAGE_KEY);
    records.push({
      id: Date.now(),
      payType: form.payType.value,
      buyDate: form.buyDate.value,
      items,
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));

    form.reset();
    form.buyDate.value = today;
    document.getElementById("itemsBody").innerHTML = "";
    addItemRow();
    updateTotal();
    renderRecords();
    alert("تۆمارکرا");
  });

  const modal = document.getElementById("summaryModal");
  const summaryBody = document.getElementById("summaryBody");

  function renderSelfSummary() {
    const records = loadJSON(STORAGE_KEY);
    let total = 0;
    let html = "";
    if (records.length) {
      html = `<table class="summary-table"><thead><tr>
        <th>بەروار</th><th>جۆری پارەدان</th><th>کاڵاکان</th><th>کۆی پارە</th>
      </tr></thead><tbody>`;
      records.slice().reverse().forEach((r) => {
        const exp = (r.items || []).reduce((s, it) => s + (parseFloat(it.amount) || 0), 0);
        total += exp;
        const itemNames = (r.items || [])
          .map((it) => [it.type, it.amount].filter(Boolean).join(": "))
          .filter(Boolean)
          .join("، ");
        html += `<tr>
          <td>${formatDate(r.buyDate)}</td>
          <td>${escapeHtml(r.payType || "—")}</td>
          <td>${escapeHtml(itemNames || "—")}</td>
          <td>${formatNum(exp)}</td>
        </tr>`;
      });
      html += "</tbody></table>";
    }
    summaryBody.innerHTML =
      (html || "<p class='empty-msg'>هیچ تۆمارێک نییە</p>") +
      `<div class="info-row total-row"><span>کۆی گشتی</span><span>${formatNum(total)}</span></div>`;
  }

  document.getElementById("selfSummaryBtn").addEventListener("click", () => {
    renderSelfSummary();
    modal.hidden = false;
  });
  document.getElementById("summaryClose").addEventListener("click", () => {
    modal.hidden = true;
  });
  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.hidden = true;
  });

  renderRecords();
});
