const STORAGE_KEY = "workerEntries";
const KEYS = ["viewings", "promises", "startedWorks", "completedWorks"];

const RATES = {
  "ڕۆژی تەواو": 25000,
  "نیو ڕۆژ": 15000,
};

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

function collectOwners() {
  const map = new Map();
  KEYS.forEach((key) => {
    loadJSON(key).forEach((r) => {
      if (r.ownerName && r.mobile && !map.has(r.mobile)) {
        map.set(r.mobile, { ownerName: r.ownerName, mobile: r.mobile });
      }
    });
  });
  return [...map.values()];
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

function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
  }[c]));
}

function renderRecords(workerId) {
  const records = loadJSON(STORAGE_KEY).filter((r) => r.workerId === workerId);
  const list = document.getElementById("recordsList");
  const emptyMsg = document.getElementById("emptyMsg");
  list.innerHTML = "";

  if (records.length === 0) {
    emptyMsg.style.display = "block";
    return;
  }
  emptyMsg.style.display = "none";

  records.slice().reverse().forEach((r) => {
    const li = document.createElement("li");
    li.className = "record-item";
    li.innerHTML = `
      <div class="record-main">
        <strong>${escapeHtml(r.ownerName || "—")}</strong>
        <span class="record-meta">${escapeHtml(r.dailyStatus)} — ${escapeHtml(r.jobType)}</span>
      </div>
      <span class="record-mobile">${escapeHtml(formatDate(r.entryDate))}</span>
    `;
    list.appendChild(li);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  let worker = null;
  try {
    worker = JSON.parse(sessionStorage.getItem("currentWorker"));
  } catch {}
  if (!worker) {
    window.location.href = "worker-login.html";
    return;
  }

  document.getElementById("workerTitle").textContent = `تۆماری ڕۆژانە — ${worker.name}`;
  document.getElementById("workerNameDisplay").value = worker.name;

  const modal = document.getElementById("summaryModal");
  document.getElementById("summaryBtn").addEventListener("click", () => {
    const mine = loadJSON(STORAGE_KEY).filter((r) => r.workerId === worker.id);
    const rate = mine.reduce((s, r) => s + (parseFloat(r.dailyRate) || 0), 0);
    const expense = mine.reduce(
      (s, r) => s + (r.items || []).reduce((x, it) => x + (parseFloat(it.amount) || 0), 0),
      0
    );

    let tableHtml = "";
    if (mine.length) {
      tableHtml = `<table class="summary-table">
        <thead><tr>
          <th>خاوەن ماڵ</th><th>بەروار</th><th>دۆخ</th><th>جۆری ئیش</th><th>خەرجی</th><th>کۆی پارە</th>
        </tr></thead><tbody>`;
      mine.slice().reverse().forEach((r) => {
        const items = r.items || [];
        const exp = items.reduce((s, it) => s + (parseFloat(it.amount) || 0), 0);
        const itemNames = items
          .map((it) => [it.type, it.amount].filter(Boolean).join(": "))
          .filter(Boolean)
          .join("، ");
        const rRate = parseFloat(r.dailyRate) || 0;
        tableHtml += `<tr>
          <td>${escapeHtml(r.ownerName || "—")}</td>
          <td>${formatDate(r.entryDate)}</td>
          <td>${escapeHtml(r.dailyStatus || "—")}</td>
          <td>${escapeHtml(r.jobType || "—")}</td>
          <td>${escapeHtml(itemNames || "—")}</td>
          <td>${formatNum(rRate + exp)}</td>
        </tr>`;
      });
      tableHtml += "</tbody></table>";
    }
    document.getElementById("dayTable").innerHTML = tableHtml;

    document.getElementById("sumRate").textContent = formatNum(rate);
    document.getElementById("sumExpense").textContent = formatNum(expense);
    document.getElementById("sumGrand").textContent = formatNum(rate + expense);
    modal.hidden = false;
  });
  document.getElementById("summaryClose").addEventListener("click", () => {
    modal.hidden = true;
  });
  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.hidden = true;
  });
  document.getElementById("logoutBtn").addEventListener("click", () => {
    sessionStorage.removeItem("currentWorker");
    window.location.href = "worker-login.html";
  });

  const form = document.getElementById("dayForm");
  const rateInput = form.dailyRate;
  const statusSelect = form.dailyStatus;
  const ownerSelect = form.ownerSelect;

  collectOwners().forEach((o) => {
    const opt = document.createElement("option");
    opt.value = o.mobile;
    opt.textContent = `${o.ownerName} — ${o.mobile}`;
    opt.dataset.ownerName = o.ownerName;
    ownerSelect.appendChild(opt);
  });

  const today = new Date().toISOString().slice(0, 10);
  form.entryDate.value = today;

  addItemRow();
  document.getElementById("itemsBody").addEventListener("input", updateTotal);

  statusSelect.addEventListener("change", () => {
    const s = statusSelect.value;
    if (s === "ڕۆژی تەواو" || s === "نیو ڕۆژ") {
      rateInput.value = RATES[s];
      rateInput.readOnly = true;
    } else {
      rateInput.readOnly = false;
      if (s !== "دیاریکردنی دەست") rateInput.value = "";
    }
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!rateInput.value) {
      alert("بڕی ڕۆژانە بنووسە");
      return;
    }

    const ownerOpt = ownerSelect.selectedOptions[0];
    const items = [...document.querySelectorAll(".item-row")]
      .map((row) => ({
        type: row.querySelector(".item-type").value.trim(),
        amount: row.querySelector(".item-amount").value.trim(),
      }))
      .filter((it) => it.type !== "" || it.amount !== "");

    const records = loadJSON(STORAGE_KEY);
    records.push({
      id: Date.now(),
      workerId: worker.id,
      workerName: worker.name,
      workerMobile: worker.mobile,
      ownerName: ownerOpt ? ownerOpt.dataset.ownerName : "",
      ownerMobile: ownerSelect.value || "",
      jobType: form.jobType.value,
      dailyStatus: statusSelect.value,
      dailyRate: rateInput.value,
      entryDate: form.entryDate.value,
      items,
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    form.reset();
    form.entryDate.value = today;
    rateInput.readOnly = false;
    document.getElementById("itemsBody").innerHTML = "";
    addItemRow();
    updateTotal();
    renderRecords(worker.id);
    alert("تۆمارکرا");
  });

  renderRecords(worker.id);
});
