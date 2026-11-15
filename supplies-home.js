const STORAGE_KEY = "homeownerPurchases";
const STARTED_KEY = "startedWorks";
const LAST_KEY = "lastHomeownerPurchase";

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

const ownerMobiles = {};

function populateOwners() {
  const sel = document.getElementById("ownerSelect");
  const seen = new Set();
  loadJSON(STARTED_KEY).forEach((r) => {
    const name = (r.ownerName || "").trim();
    if (!name || seen.has(name)) return;
    seen.add(name);
    ownerMobiles[name] = r.mobile || "";
    const opt = document.createElement("option");
    opt.value = name;
    opt.textContent = name;
    sel.appendChild(opt);
  });
}

function addItemRow(name = "", qty = "", price = "") {
  const body = document.getElementById("itemsBody");
  const row = document.createElement("div");
  row.className = "item-row item-row-3";
  row.innerHTML = `
    <input type="text" class="item-name" placeholder="ناوی کاڵا">
    <input type="number" class="item-qty" placeholder="بڕ" min="0" step="any">
    <input type="number" class="item-price" placeholder="نرخ" min="0" step="any">
  `;
  row.querySelector(".item-name").value = name;
  row.querySelector(".item-qty").value = qty;
  row.querySelector(".item-price").value = price;

  row.addEventListener("input", () => {
    const rows = body.querySelectorAll(".item-row");
    const last = rows[rows.length - 1];
    if (row !== last) return;
    const n = row.querySelector(".item-name").value.trim();
    const q = row.querySelector(".item-qty").value.trim();
    const p = row.querySelector(".item-price").value.trim();
    if (n !== "" && q !== "" && p !== "") addItemRow();
  });

  body.appendChild(row);
}

function updateTotal() {
  const total = [...document.querySelectorAll(".item-row")].reduce(
    (s, row) =>
      s +
      (parseFloat(row.querySelector(".item-qty").value) || 0) *
        (parseFloat(row.querySelector(".item-price").value) || 0),
    0
  );
  document.getElementById("totalAmount").textContent = formatNum(total);
}

document.addEventListener("DOMContentLoaded", () => {
  const backBtn = document.getElementById("backBtn");
  if (backBtn) backBtn.addEventListener("click", () => (window.location.href = "index.html"));

  populateOwners();

  const form = document.getElementById("homeBuyForm");
  const today = new Date().toISOString().slice(0, 10);
  form.buyDate.value = today;

  let last = {};
  try {
    last = JSON.parse(localStorage.getItem(LAST_KEY)) || {};
  } catch {}
  if (last.ownerName) form.ownerSelect.value = last.ownerName;
  if (last.payType) form.payType.value = last.payType;

  const lastItems = Array.isArray(last.items) && last.items.length ? last.items : [{ name: "", qty: "", price: "" }];
  lastItems.forEach((it) => addItemRow(it.name || "", it.qty || "", it.price || ""));
  document.getElementById("itemsBody").addEventListener("input", updateTotal);
  updateTotal();

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const items = [...document.querySelectorAll(".item-row")]
      .map((row) => ({
        name: row.querySelector(".item-name").value.trim(),
        qty: parseFloat(row.querySelector(".item-qty").value) || 0,
        price: parseFloat(row.querySelector(".item-price").value) || 0,
      }))
      .filter((it) => it.name !== "" || it.qty > 0 || it.price > 0);
    const valid = items.filter((it) => it.name !== "" && it.qty > 0 && it.price > 0);
    if (!valid.length) {
      alert("کاڵا و بڕ و نرخ بنووسە");
      return;
    }
    const total = valid.reduce((s, it) => s + it.qty * it.price, 0);

    const records = loadJSON(STORAGE_KEY);
    records.push({
      id: Date.now(),
      ownerName: form.ownerSelect.value,
      ownerMobile: ownerMobiles[form.ownerSelect.value] || "",
      buyDate: form.buyDate.value,
      items: valid,
      total,
      payType: form.payType.value,
    });
    const saved = {
      ownerName: form.ownerSelect.value,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    localStorage.setItem(LAST_KEY, JSON.stringify(saved));
    document.getElementById("itemsBody").innerHTML = "";
    addItemRow();
    form.reset();
    form.ownerSelect.value = saved.ownerName;
    form.buyDate.value = today;
    updateTotal();
    alert("تۆمارکرا");
  });

  document.getElementById("recordsToggleBtn").addEventListener("click", () => {
    window.location.href = "supplies-home-list.html";
  });
});
