const STORAGE_KEY = "workerEntries";
const PAYMENTS_KEY = "workerPayments";
const KEYS = ["startedWorks"];

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

let capturedLoc = null;

function locLinkHtml(r) {
  if (r.lat != null && r.lng != null) {
    return `<a class="loc-link" href="https://www.google.com/maps?q=${r.lat},${r.lng}" target="_blank" rel="noopener">🗺 گۆگڵ ماپ</a>`;
  }
  if (r.address) {
    return `<a class="loc-link" href="https://www.google.com/maps?q=${encodeURIComponent(r.address)}" target="_blank" rel="noopener">🗺 گۆگڵ ماپ</a>`;
  }
  return "";
}

function recordLeft(r) {
  const exp = (r.items || []).reduce((s, it) => s + (parseFloat(it.amount) || 0), 0);
  const total = (parseFloat(r.dailyRate) || 0) + exp;
  const paid = loadJSON(PAYMENTS_KEY)
    .filter((p) => p.recordId === r.id)
    .reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
  return total - paid;
}

function renderRecords(workerId) {
  const records = loadJSON(STORAGE_KEY).filter(
    (r) => r.workerId === workerId && !r.archived && recordLeft(r) > 0
  );
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
        <span class="record-meta">${escapeHtml(r.dailyStatus)}${r.jobType ? " — " + escapeHtml(r.jobType) : ""}${r.address ? " — " + escapeHtml(r.address) : ""}</span>
      </div>
      <div class="record-side">
        <span class="record-mobile">${escapeHtml(formatDate(r.entryDate))}</span>
        ${locLinkHtml(r)}
        <button class="record-del" title="ڕەشکردنەوە">&times;</button>
      </div>
    `;
    li.querySelector(".record-del").addEventListener("click", () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(loadJSON(STORAGE_KEY).filter((x) => x.id !== r.id))
      );
      renderRecords(worker.id);
    });
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
  document.getElementById("workerNameDisplayExp").value = worker.name;

  const modal = document.getElementById("summaryModal");
  document.getElementById("summaryBtn").addEventListener("click", () => {
    const mine = loadJSON(STORAGE_KEY).filter(
      (r) => r.workerId === worker.id && !r.archived && recordLeft(r) > 0
    );
    const rate = mine.reduce((s, r) => s + (parseFloat(r.dailyRate) || 0), 0);
    const expense = mine.reduce(
      (s, r) => s + (r.items || []).reduce((x, it) => x + (parseFloat(it.amount) || 0), 0),
      0
    );
    const grand = mine.reduce((s, r) => s + recordLeft(r), 0);

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
          <td>${formatNum(recordLeft(r))}</td>
        </tr>`;
      });
      tableHtml += "</tbody></table>";
    }
    document.getElementById("dayTable").innerHTML = tableHtml;

    document.getElementById("sumRate").textContent = formatNum(rate);
    document.getElementById("sumExpense").textContent = formatNum(expense);
    document.getElementById("sumGrand").textContent = formatNum(grand);
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
  const expOwnerSelect = form.expOwnerSelect;

  const tabDay = document.getElementById("tabDay");
  const tabExp = document.getElementById("tabExp");
  const tabAddr = document.getElementById("tabAddr");
  const secDay = document.getElementById("secDay");
  const secExp = document.getElementById("secExp");
  const secAddr = document.getElementById("secAddr");
  function showSection(which) {
    secDay.hidden = which !== "day";
    secExp.hidden = which !== "exp";
    secAddr.hidden = which !== "addr";
    tabDay.classList.toggle("active", which === "day");
    tabExp.classList.toggle("active", which === "exp");
    tabAddr.classList.toggle("active", which === "addr");
  }
  tabDay.addEventListener("click", () => showSection("day"));
  tabExp.addEventListener("click", () => showSection("exp"));
  tabAddr.addEventListener("click", () => showSection("addr"));

  const owners = collectOwners();
  [ownerSelect, expOwnerSelect, form.addrOwnerSelect].forEach((sel) => {
    owners.forEach((o) => {
      const opt = document.createElement("option");
      opt.value = o.mobile;
      opt.textContent = `${o.ownerName} — ${o.mobile}`;
      opt.dataset.ownerName = o.ownerName;
      sel.appendChild(opt);
    });
  });

  const addrOwnerSelect = form.addrOwnerSelect;
  addrOwnerSelect.addEventListener("change", () => {
    const mobile = addrOwnerSelect.value;
    const name = addrOwnerSelect.selectedOptions[0]?.dataset.ownerName || "";
    const works = loadJSON("startedWorks").filter(
      (r) => !r.archived && (r.mobile === mobile || (name && r.ownerName === name))
    );
    const rec = works[works.length - 1];
    form.address.value = rec && rec.address ? rec.address : "";
    capturedLoc = rec && rec.lat != null && rec.lng != null ? { lat: rec.lat, lng: rec.lng } : null;
    document.getElementById("locStatus").textContent = capturedLoc
      ? "لۆکەیشنی خاوەن ماڵ ئامادەیە ✓"
      : "";
  });

  const today = new Date().toISOString().slice(0, 10);
  form.entryDate.value = today;
  form.expDate.value = today;

  addItemRow();
  document.getElementById("itemsBody").addEventListener("input", updateTotal);

  const locBtn = document.getElementById("locBtn");
  const locStatus = document.getElementById("locStatus");
  locBtn.addEventListener("click", () => {
    if (capturedLoc) {
      locStatus.textContent = "لۆکەیشنی خاوەن ماڵ ئامادەیە ✓";
      return;
    }
    if (!navigator.geolocation) {
      alert("ئەم وێبگەڕە لۆکەیشن پشتگیری ناکات");
      return;
    }
    locBtn.disabled = true;
    locStatus.textContent = "چاوەڕوان بە…";
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        capturedLoc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        locStatus.textContent = "لۆکەیشن وەرگیرا ✓";
        locBtn.disabled = false;
      },
      () => {
        locStatus.textContent = "نەتوانرا لۆکەیشن بهێندرێت";
        locBtn.disabled = false;
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  });

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

    const items = [...document.querySelectorAll(".item-row")]
      .map((row) => ({
        type: row.querySelector(".item-type").value.trim(),
        amount: row.querySelector(".item-amount").value.trim(),
      }))
      .filter((it) => it.type !== "" || it.amount !== "");

    const pickOwner = (sel) => {
      const o = sel.selectedOptions[0];
      return o && o.value ? o : null;
    };
    const ownerOpt = pickOwner(ownerSelect) || pickOwner(expOwnerSelect) || pickOwner(addrOwnerSelect);
    const ownerMobile = ownerSelect.value || expOwnerSelect.value || addrOwnerSelect.value || "";

    if (!ownerMobile) {
      alert("ناوی خاوەن ماڵ هەڵبژێرە");
      return;
    }
    if (!rateInput.value && !items.length) {
      alert("بڕی ڕۆژانە یان بڕی مەسرەف بنووسە");
      return;
    }

    const records = loadJSON(STORAGE_KEY);
    records.push({
      id: Date.now(),
      workerId: worker.id,
      workerName: worker.name,
      workerMobile: worker.mobile,
      ownerName: ownerOpt ? ownerOpt.dataset.ownerName : "",
      ownerMobile,
      dailyStatus: statusSelect.value,
      dailyRate: rateInput.value || "0",
      entryDate: form.entryDate.value || form.expDate.value,
      expDate: form.expDate.value,
      items,
      address: form.address.value.trim(),
      ...(capturedLoc ? { lat: capturedLoc.lat, lng: capturedLoc.lng } : {}),
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    form.reset();
    capturedLoc = null;
    document.getElementById("locStatus").textContent = "";
    form.entryDate.value = today;
    form.expDate.value = today;
    rateInput.readOnly = false;
    document.getElementById("itemsBody").innerHTML = "";
    addItemRow();
    updateTotal();
    renderRecords(worker.id);
    alert("تۆمارکرا");
  });

  renderRecords(worker.id);
});
