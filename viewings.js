const STORAGE_KEY = "viewings";

function loadRecords() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveRecords(records) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
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

let editingId = null;

function setEditMode(id) {
  editingId = id;
  const form = document.getElementById("viewingForm");
  const submitBtn = form.querySelector('button[type="submit"]');
  submitBtn.textContent = "نوێکردنەوە";
  if (id === null) {
    form.reset();
    submitBtn.textContent = "پاشەکەوت";
    updatePriceFields();
  }
}

function updatePriceFields() {
  const form = document.getElementById("viewingForm");
  const isMohalaja = form.jobType.value === "محالەجە";
  const isShkan = form.jobType.value === "شکان";

  document.getElementById("agreementField").hidden = !isMohalaja;
  document.getElementById("shkanPriceField").hidden = !isShkan;
  form.agreementType.required = isMohalaja;
  form.shkanPrice.required = isShkan;

  if (!isMohalaja) {
    form.agreementType.value = "";
  }
  if (!isShkan) {
    form.shkanPrice.value = "";
  }

  const t = form.agreementType.value;
  const single = ["مەتر تووڵ", "مەتر مرەبەح", "گۆترە"].includes(t);
  const double = t === "مەتر تووڵ و مرەبەح";

  const singleField = document.getElementById("priceSingleField");
  const woolField = document.getElementById("priceWoolField");
  const marbleField = document.getElementById("priceMarbleField");

  singleField.hidden = !single;
  woolField.hidden = !double;
  marbleField.hidden = !double;

  form.price.required = single;
  form.priceWool.required = double;
  form.priceMarble.required = double;

  if (!single) form.price.value = "";
  if (!double) {
    form.priceWool.value = "";
    form.priceMarble.value = "";
  }
}

function priceInfo(r) {
  if (r.jobType === "شکان") {
    return r.price ? ` — بڕی پارە (${r.price})` : "";
  }
  if (!r.agreementType) return "";
  if (r.agreementType === "مەتر تووڵ و مرەبەح") {
    return ` — ${r.agreementType} (تووڵ: ${r.priceWool || "-"}، مرەبەح: ${r.priceMarble || "-"})`;
  }
  return ` — ${r.agreementType}${r.price ? ` (${r.price})` : ""}`;
}

function renderRecords() {
  const records = loadRecords();
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
    li.className = "record-item" + (r.sentToContractor ? " sent" : "");
    li.innerHTML = `
      <div class="record-main">
        <strong>${escapeHtml(r.ownerName)}</strong>
        <span class="record-meta">${escapeHtml(r.jobType)} — ${formatDate(r.viewDate)}${escapeHtml(priceInfo(r))}${
          r.sentToContractor ? ' <span class="sent-badge">نێردرا بۆ بەڵێندان</span>' : ""
        }</span>
      </div>
      <span class="record-mobile">${escapeHtml(r.mobile)}</span>
      <div class="record-actions">
        <button class="record-edit" title="گۆڕانکاری">✎</button>
        <button class="record-send" title="ناردن بۆ بەڵێندان" ${
          r.sentToContractor ? "disabled" : ""
        }>⇢</button>
        <button class="record-delete" title="ڕەشکردنەوە">&times;</button>
      </div>
    `;

    li.querySelector(".record-edit").addEventListener("click", () => {
      const form = document.getElementById("viewingForm");
      form.ownerName.value = r.ownerName;
      form.mobile.value = r.mobile;
      form.jobType.value = r.jobType;
      form.viewDate.value = r.viewDate;
      form.agreementType.value = r.agreementType || "";
      form.shkanPrice.value = r.jobType === "شکان" ? r.price || "" : "";
      updatePriceFields();
      form.price.value = r.jobType === "شکان" ? "" : r.price || "";
      form.priceWool.value = r.priceWool || "";
      form.priceMarble.value = r.priceMarble || "";
      setEditMode(r.id);
      form.scrollIntoView({ behavior: "smooth", block: "start" });
      form.ownerName.focus();
    });

    li.querySelector(".record-send").addEventListener("click", () => {
      const all = loadRecords();
      const target = all.find((x) => x.id === r.id);
      if (target) {
        target.sentToContractor = true;
        saveRecords(all);
        renderRecords();
      }
    });

    li.querySelector(".record-delete").addEventListener("click", () => {
      saveRecords(loadRecords().filter((x) => x.id !== r.id));
      if (editingId === r.id) setEditMode(null);
      renderRecords();
    });

    list.appendChild(li);
  });
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[c]));
}

document.addEventListener("DOMContentLoaded", () => {
  const backBtn = document.getElementById("backBtn");
  if (backBtn) backBtn.addEventListener("click", () => (window.location.href = "index.html"));

  const form = document.getElementById("viewingForm");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const mobile = form.mobile.value.trim();
    if (!/^\d{7,15}$/.test(mobile.replace(/[\s-]/g, ""))) {
      alert("ژمارە مۆبایلەکە نادروستە");
      return;
    }
    const isShkan = form.jobType.value === "شکان";
    const isMohalaja = form.jobType.value === "محالەجە";
    const data = {
      ownerName: form.ownerName.value.trim(),
      mobile: mobile.replace(/[\s-]/g, ""),
      jobType: form.jobType.value,
      viewDate: form.viewDate.value,
      agreementType: isMohalaja ? form.agreementType.value : "",
      price: isShkan
        ? form.shkanPrice.value
        : form.agreementType.value && form.price.value !== ""
          ? form.price.value
          : "",
      priceWool: form.agreementType.value === "مەتر تووڵ و مرەبەح" ? form.priceWool.value : "",
      priceMarble: form.agreementType.value === "مەتر تووڵ و مرەبەح" ? form.priceMarble.value : "",
    };
    const records = loadRecords();
    if (editingId !== null) {
      const target = records.find((x) => x.id === editingId);
      if (target) Object.assign(target, data);
      setEditMode(null);
    } else {
      records.push({ id: Date.now(), sentToContractor: false, ...data });
    }
    saveRecords(records);
    form.reset();
    renderRecords();
  });

  form.jobType.addEventListener("change", updatePriceFields);
  form.agreementType.addEventListener("change", updatePriceFields);

  form.addEventListener("reset", () => setEditMode(null));

  renderRecords();
});
