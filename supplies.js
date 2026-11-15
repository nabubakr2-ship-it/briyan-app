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

function addItemRow(type = "", amount = "") {
  const body = document.getElementById("itemsBody");
  const row = document.createElement("div");
  row.className = "item-row";
  row.innerHTML = `
    <input type="text" class="item-type" placeholder="جۆری کاڵا">
    <input type="number" class="item-amount" placeholder="بڕی پارە" min="0" step="any">
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

document.addEventListener("DOMContentLoaded", () => {
  const backBtn = document.getElementById("backBtn");
  if (backBtn) backBtn.addEventListener("click", () => (window.location.href = "index.html"));

  const form = document.getElementById("supplyForm");
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
      alert("کاڵا و بڕ بنووسە");
      return;
    }

    const records = loadJSON(STORAGE_KEY);
    records.push({
      id: Date.now(),
      buyDate: form.buyDate.value,
      shopName: form.shopName.value.trim(),
      payType: form.payType.value,
      note: form.note.value.trim(),
      items,
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    form.reset();
    form.buyDate.value = today;
    document.getElementById("itemsBody").innerHTML = "";
    addItemRow();
    updateTotal();
    alert("تۆمارکرا");
  });

  document.getElementById("recordsToggleBtn").addEventListener("click", () => {
    window.location.href = "supplies-list.html";
  });
});
