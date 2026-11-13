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

function collectOwners() {
  const map = new Map();
  loadJSON("startedWorks").forEach((r) => {
    if (r.ownerName && r.mobile && !map.has(r.mobile)) {
      map.set(r.mobile, { ownerName: r.ownerName, mobile: r.mobile });
    }
  });
  return [...map.values()];
}

function populateOwners() {
  const select = document.getElementById("ownerSelect");
  collectOwners().forEach((o) => {
    const opt = document.createElement("option");
    opt.value = o.mobile;
    opt.textContent = `${o.ownerName} — ${o.mobile}`;
    opt.dataset.ownerName = o.ownerName;
    select.appendChild(opt);
  });
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
        <strong>${escapeHtml(r.ownerName || "—")}</strong>
        <span class="record-meta">${escapeHtml(r.workStatus || "")}${r.dayType ? " — " + escapeHtml(r.dayType) : ""} — ${formatDate(r.buyDate)}${itemNames ? " — " + escapeHtml(itemNames) : ""}</span>
      </div>
      <span class="record-mobile">${formatNum(total)}</span>
      <div class="record-actions">
        <button class="record-delete" title="ڕەشکردنەوە">&times;</button>
      </div>
    `;
    li.querySelector(".record-delete").addEventListener("click", () => {
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
  populateOwners();

  const workStatus = form.workStatus;
  const dayTypeField = document.getElementById("dayTypeField");
  workStatus.addEventListener("change", () => {
    const show = workStatus.value === "لە ئیش بووم";
    dayTypeField.hidden = !show;
    form.dayType.required = show;
    if (!show) form.dayType.value = "";
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (workStatus.value === "لە ئیش بووم" && !form.dayType.value) {
      alert("جۆری ڕۆژ هەڵبژێرە");
      return;
    }
    const ownerOpt = form.ownerSelect.selectedOptions[0];
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
      ownerName: ownerOpt ? ownerOpt.dataset.ownerName : "",
      ownerMobile: form.ownerSelect.value,
      workStatus: workStatus.value,
      dayType: workStatus.value === "لە ئیش بووم" ? form.dayType.value : "",
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
  const summaryOwner = document.getElementById("summaryOwner");
  const summaryBody = document.getElementById("summaryBody");

  function fillSummaryOwners() {
    const records = loadJSON(STORAGE_KEY);
    const owners = new Map();
    records.forEach((r) => {
      if (r.ownerName && !owners.has(r.ownerMobile)) {
        owners.set(r.ownerMobile, r.ownerName);
      }
    });
    summaryOwner.innerHTML = '<option value="">-- هەڵبژێرە --</option>';
    owners.forEach((name, mobile) => {
      const opt = document.createElement("option");
      opt.value = mobile;
      opt.textContent = name;
      summaryOwner.appendChild(opt);
    });
  }

  function renderSummary() {
    const mobile = summaryOwner.value;
    summaryBody.innerHTML = "";
    if (!mobile) return;

    const records = loadJSON(STORAGE_KEY).filter((r) => r.ownerMobile === mobile);
    let expenseTotal = 0;
    let fullDays = 0;
    let halfDays = 0;
    let offDays = 0;
    records.forEach((r) => {
      (r.items || []).forEach((it) => {
        expenseTotal += parseFloat(it.amount) || 0;
      });
      if (r.workStatus === "لە ئیش بووم") {
        if (r.dayType === "ڕۆژی تەواو") fullDays++;
        else if (r.dayType === "نیو ڕۆژ") halfDays++;
      } else if (r.workStatus === "لە ئیش نەبووم") {
        offDays++;
      }
    });

    summaryBody.innerHTML = `
      <div class="info-row"><span>کۆی مەسروف</span><span>${formatNum(expenseTotal)}</span></div>
      <div class="info-row"><span>ڕۆژی تەواو</span><span>${fullDays}</span></div>
      <div class="info-row"><span>نیو ڕۆژ</span><span>${halfDays}</span></div>
      <div class="info-row"><span>لە ئیش نەبووم</span><span>${offDays}</span></div>
      <div class="info-row total-row"><span>کۆی ڕۆژانە</span><span>${fullDays + halfDays}</span></div>
    `;
  }

  document.getElementById("summaryBtn").addEventListener("click", () => {
    fillSummaryOwners();
    summaryOwner.value = "";
    renderSummary();
    modal.hidden = false;
  });
  summaryOwner.addEventListener("change", renderSummary);
  document.getElementById("summaryClose").addEventListener("click", () => {
    modal.hidden = true;
  });
  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.hidden = true;
  });

  renderRecords();
});
