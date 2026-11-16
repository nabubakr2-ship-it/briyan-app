const STORAGE_KEY = "completedWorks";
const STARTED_KEY = "startedWorks";
const PENDING_KEY = "pendingStarted";

let formEl = null;
let jobTypeEl = null;

function loadRecords() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function stripRecord(r) {
  const o = { ...r };
  ["id", "sentToContractor", "promised", "viewingId", "sentToWork"].forEach((k) => delete o[k]);
  delete o.history;
  return o;
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

function isSingle(t) {
  return ["مەتر تووڵ", "مەتر مرەبەح", "گۆترە"].includes(t);
}

function isDouble(t) {
  return t === "مەتر تووڵ و مرەبەح";
}

function updatePriceFields() {
  const form = document.getElementById("completedForm");
  const isMohalaja = form.jobType.value === "محالەجە";
  const isShkan = form.jobType.value === "شکان";

  document.getElementById("agreementField").hidden = !isMohalaja;
  document.getElementById("shkanPriceField").hidden = !isShkan;
  form.agreementType.required = isMohalaja;
  form.shkanPrice.required = isShkan;

  if (!isMohalaja) form.agreementType.value = "";
  if (!isShkan) {
    form.shkanPrice.value = "";
    document.getElementById("shkanTotal").value = "";
  }

  const t = form.agreementType.value;
  const gotra = isMohalaja && t === "گۆترە";
  const single = isMohalaja && isSingle(t) && !gotra;
  const double = isMohalaja && isDouble(t);
  const showSingle = single || gotra;

  document.getElementById("priceFields").hidden = !(showSingle || double);
  document.getElementById("singleFields").hidden = !showSingle;
  document.getElementById("doubleFields").hidden = !double;

  form.price.required = showSingle;
  form.meter.required = single;
  const meterLabel = document.querySelector('label[for="meter"]');
  if (meterLabel) meterLabel.hidden = gotra;
  form.meter.hidden = gotra;
  ["priceWool", "priceMarble", "meterWool", "meterMarble"].forEach((id) => {
    form[id].required = double;
  });

  if (!showSingle) {
    form.price.value = "";
    form.meter.value = "";
  }
  if (!double) {
    form.priceWool.value = "";
    form.priceMarble.value = "";
    form.meterWool.value = "";
    form.meterMarble.value = "";
  }
  recalcPrice();
  document.getElementById("totalIqdField").hidden = !(isMohalaja || isShkan);
  recalcIqd();
}

function recalcPrice() {
  const n = (id) => parseFloat(document.getElementById(id).value) || 0;
  const gotra = document.getElementById("agreementType").value === "گۆترە";
  document.getElementById("total").value = formatNum(
    gotra ? n("price") : n("price") * n("meter")
  );
  const tw = n("priceWool") * n("meterWool");
  const tm = n("priceMarble") * n("meterMarble");
  document.getElementById("totalWool").value = formatNum(tw);
  document.getElementById("totalMarble").value = formatNum(tm);
  document.getElementById("grandTotal").value = formatNum(tw + tm);
  recalcIqd();
}

function usdTotal() {
  const n = (id) => parseFloat(document.getElementById(id).value) || 0;
  if (document.getElementById("shkanPriceField") && !document.getElementById("shkanPriceField").hidden) {
    return 0;
  }
  const gt = n("grandTotal");
  if (gt) return gt;
  return n("total");
}

function recalcIqd() {
  const rate = parseFloat(document.getElementById("dollarRate").value) || 0;
  const out = document.getElementById("totalIqd");
  if (!out) return;
  const form = document.getElementById("completedForm");
  if (form.jobType.value === "شکان") {
    const v = parseFloat(document.getElementById("shkanTotal").value || form.shkanPrice.value) || 0;
    out.value = v ? formatNum(v) : "";
    return;
  }
  const usd = usdTotal();
  out.value = usd && rate ? formatNum(usd * rate) : "";
}

function collectAgreement(form) {
  if (form.jobType.value === "شکان") {
    const total = document.getElementById("shkanTotal").value || form.shkanPrice.value;
    return {
      agreementType: "",
      price: form.shkanPrice.value,
      meter: "",
      total,
      priceWool: "",
      priceMarble: "",
      meterWool: "",
      meterMarble: "",
      totalWool: "",
      totalMarble: "",
      grandTotal: "",
    };
  }
  const t = form.agreementType.value;
  const single = isSingle(t);
  const double = isDouble(t);
  return {
    agreementType: t,
    price: single ? form.price.value : "",
    meter: single ? form.meter.value : "",
    total: single ? document.getElementById("total").value : "",
    priceWool: double ? form.priceWool.value : "",
    priceMarble: double ? form.priceMarble.value : "",
    meterWool: double ? form.meterWool.value : "",
    meterMarble: double ? form.meterMarble.value : "",
    totalWool: double ? document.getElementById("totalWool").value : "",
    totalMarble: double ? document.getElementById("totalMarble").value : "",
    grandTotal: double ? document.getElementById("grandTotal").value : "",
  };
}

function applyAgreement(form, src) {
  form.agreementType.value = src.agreementType || "";
  form.shkanPrice.value = form.jobType.value === "شکان" ? src.price || "" : "";
  document.getElementById("shkanTotal").value = form.shkanPrice.value;
  updatePriceFields();
  form.price.value = src.price || "";
  form.meter.value = src.meter || "";
  form.priceWool.value = src.priceWool || "";
  form.priceMarble.value = src.priceMarble || "";
  form.meterWool.value = src.meterWool || "";
  form.meterMarble.value = src.meterMarble || "";
  recalcPrice();
}

function agreementInfo(r) {
  if (r.jobType === "شکان") {
    return r.price ? ` — بڕی پارە (${r.price})${r.total ? ` — کۆی پارە (${r.total})` : ""}` : "";
  }
  if (!r.agreementType) return "";
  if (isDouble(r.agreementType)) {
    return ` — ${r.agreementType} (کۆی پارە: ${r.grandTotal || "-"})`;
  }
  return ` — ${r.agreementType}${r.total ? ` (کۆی پارە: ${r.total})` : r.price ? ` (${r.price})` : ""}`;
}

function saveLastAgreement(data) {
  try {
    localStorage.setItem("lastAgreementType", data.agreementType || "");
    localStorage.setItem("lastPrice", data.price || "");
    localStorage.setItem("lastPriceWool", data.priceWool || "");
    localStorage.setItem("lastPriceMarble", data.priceMarble || "");
  } catch {}
}

function loadLastAgreement(form) {
  try {
    applyAgreement(form, {
      agreementType: localStorage.getItem("lastAgreementType"),
      price: localStorage.getItem("lastPrice"),
      priceWool: localStorage.getItem("lastPriceWool"),
      priceMarble: localStorage.getItem("lastPriceMarble"),
    });
  } catch {}
}

function infoSection(title, pairs) {
  const items = pairs.filter(([, val]) => val !== "" && val !== undefined && val !== null);
  if (!items.length) return "";
  return (
    `<h3 class="info-section">${title}</h3>` +
    items
      .map(([k, val]) => `<div class="info-row"><span>${k}</span><span>${escapeHtml(String(val))}</span></div>`)
      .join("")
  );
}

function openInfo(r) {
  const h = r.history || {};
  const v = h.viewing || {};
  const p = h.promise || {};
  const s = h.started || {};

  let html = "";
  html += infoSection("زانیارییەکان", [
    ["ناوی خاوەن ماڵ", r.ownerName],
    ["ژمارە مۆبایل", r.mobile],
    ["جۆری ئیش", r.jobType],
    ["جۆری پارەدان", r.paymentType],
  ]);
  html += infoSection("بەروارەکان", [
    ["بەرواری تەماشاکردن", v.viewDate ? formatDate(v.viewDate) : ""],
    ["بەرواری بەڵێن", p.promiseDate ? formatDate(p.promiseDate) : ""],
    ["بەرواری دەستپێکردن", s.startDate ? formatDate(s.startDate) : ""],
    ["بەرواری تەواوکردن", r.completeDate ? formatDate(r.completeDate) : ""],
  ]);
  html += infoSection("ڕێک کەوتن و نرخ", [
    ["جۆری ڕێک کەوتن", r.agreementType],
    ["نرخ", r.price],
    ["بڕی مەتر", r.meter],
    ["کۆی پارە", r.total],
    ["نرخی تووڵ", r.priceWool],
    ["نرخی مرەبەح", r.priceMarble],
    ["بڕی مەتر تووڵ", r.meterWool],
    ["بڕی مەتر مرەبەح", r.meterMarble],
    ["کۆی پارە تووڵ", r.totalWool],
    ["کۆی پارە مرەبەح", r.totalMarble],
    ["کۆی پارە گشتی", r.grandTotal],
    ["نرخی دۆلار", r.dollarRate ? `${r.dollarRate} د.ع` : ""],
    ["کۆی پارە بە دینار", r.totalIqd],
  ]);
  html += infoSection("محالەجە", [
    ["جۆری محالەجە", s.waxType],
    ["نرخ", s.waxPrice],
    ["نرخی تووڵ", s.waxPriceWool],
    ["نرخی مرەبەح", s.waxPriceMarble],
  ]);
  const items = s.items || [];
  if (items.length) {
    html +=
      `<h3 class="info-section">خەرجی / مەسرەف</h3>` +
      items
        .map(
          (it) =>
            `<div class="info-row"><span>${escapeHtml(it.type)}</span><span>${escapeHtml(String(it.amount))}</span></div>`
        )
        .join("");
  }

  document.getElementById("modalBody").innerHTML = html || "<p class='empty-msg'>زانیاری نییە</p>";
  document.getElementById("infoModal").hidden = false;
}

let editingId = null;
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

function setEditMode(id) {
  editingId = id;
  const btn = document.querySelector('#completedForm button[type="submit"]');
  btn.textContent = id === null ? "پاشەکەوت" : "نوێکردنەوە";
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

  records.filter((r) => !r.archived && !r.paymentType).slice().reverse().forEach((r) => {
    const li = document.createElement("li");
    li.className = "record-item";
    li.innerHTML = `
      <div class="record-main">
        <strong>${escapeHtml(r.ownerName)}</strong>
        <span class="record-meta">${escapeHtml(r.jobType)} — ${formatDate(r.completeDate)}${escapeHtml(agreementInfo(r))}${r.address ? " — " + escapeHtml(r.address) : ""}</span>
      </div>
      <div class="record-side">
        <span class="record-mobile">${escapeHtml(r.mobile)}</span>
        ${locLinkHtml(r)}
        <button class="record-del" title="ڕەشکردنەوە">&times;</button>
      </div>
      <select class="pay-select" title="جۆری پارەدان">
        <option value="">-- جۆر --</option>
        <option value="نەقد" ${r.paymentType === "نەقد" ? "selected" : ""}>نەقد</option>
        <option value="قەرز" ${r.paymentType === "قەرز" ? "selected" : ""}>قەرز</option>
        <option value="قیست" ${r.paymentType === "قیست" ? "selected" : ""}>قیست</option>
      </select>
      <div class="record-actions">
        <button class="btn-info">کۆی زانیاریەکان</button>
        <button class="record-edit" title="گۆڕانکاری">✎</button>
      </div>
    `;
    li.querySelector(".pay-select").addEventListener("change", (e) => {
      const all = loadRecords();
      const target = all.find((x) => x.id === r.id);
      if (target) {
        target.paymentType = e.target.value;
        if (e.target.value === "قیست" && !target.installmentCount) {
          const amt = prompt("بڕی هەر قیستێک (د.ع):", target.installmentAmount || "");
          const cnt = prompt("ژمارەی قیستەکان:", target.installmentCount || "");
          target.installmentAmount = parseFloat(amt) || 0;
          target.installmentCount = parseInt(cnt, 10) || 0;
          target.installmentsPaid = target.installmentsPaid || [];
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
        renderRecords();
      }
    });
    li.querySelector(".btn-info").addEventListener("click", () => openInfo(r));
    li.querySelector(".record-edit").addEventListener("click", () => {
      formEl.ownerName.value = r.ownerName;
      formEl.mobile.value = r.mobile;
      formEl.completeDate.value = r.completeDate;
      formEl.address.value = r.address || "";
      capturedLoc = r.lat != null && r.lng != null ? { lat: r.lat, lng: r.lng } : null;
      document.getElementById("locStatus").textContent = capturedLoc ? "لۆکەیشن وەرگیرا ✓" : "";
      jobTypeEl.value = r.jobType || "";
      document.getElementById("dollarRate").value = r.dollarRate || "";
      applyAgreement(formEl, r);
      setEditMode(r.id);
      formEl.scrollIntoView({ behavior: "smooth", block: "start" });
      formEl.ownerName.focus();
    });
    li.querySelector(".record-del").addEventListener("click", () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(loadRecords().filter((x) => x.id !== r.id))
      );
      if (editingId === r.id) setEditMode(null);
      renderRecords();
    });
    list.appendChild(li);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const backBtn = document.getElementById("backBtn");
  if (backBtn) backBtn.addEventListener("click", () => (window.location.href = "index.html"));

  const form = document.getElementById("completedForm");
  const jobType = form.jobType;
  formEl = form;
  jobTypeEl = jobType;

  loadLastAgreement(form);
  form.agreementType.addEventListener("change", updatePriceFields);
  form.shkanPrice.addEventListener("input", () => {
    document.getElementById("shkanTotal").value = form.shkanPrice.value;
    recalcIqd();
  });
  document.getElementById("priceFields").addEventListener("input", recalcPrice);
  const dollarRateEl = document.getElementById("dollarRate");
  try {
    dollarRateEl.value = localStorage.getItem("lastDollarRate") || "";
  } catch {}
  dollarRateEl.addEventListener("input", () => {
    try {
      localStorage.setItem("lastDollarRate", dollarRateEl.value);
    } catch {}
    recalcIqd();
  });

  let pendingStartedId = null;
  try {
    const pending = JSON.parse(localStorage.getItem(PENDING_KEY));
    if (pending) {
      localStorage.removeItem(PENDING_KEY);
      pendingStartedId = pending.id;
      form.ownerName.value = pending.ownerName || "";
      form.mobile.value = pending.mobile || "";
      form.address.value = pending.address || "";
      capturedLoc = pending.lat != null && pending.lng != null ? { lat: pending.lat, lng: pending.lng } : null;
      document.getElementById("locStatus").textContent = capturedLoc ? "لۆکەیشن وەرگیرا ✓" : "";
      jobType.value = pending.jobType || "";
      applyAgreement(form, {
        agreementType: pending.agreementType || pending.waxType || "",
        price: pending.price || pending.waxPrice || "",
        priceWool: pending.priceWool || pending.waxPriceWool || "",
        priceMarble: pending.priceMarble || pending.waxPriceMarble || "",
      });
    }
  } catch {}

  if (!jobType.value) {
    try {
      jobType.value = localStorage.getItem("lastJobType") || "";
    } catch {}
  }
  updatePriceFields();

  jobType.addEventListener("change", () => {
    updatePriceFields();
    try {
      if (jobType.value) localStorage.setItem("lastJobType", jobType.value);
    } catch {}
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const mobile = form.mobile.value.trim();
    if (!/^\d{7,15}$/.test(mobile.replace(/[\s-]/g, ""))) {
      alert("ژمارە مۆبایلەکە نادروستە");
      return;
    }

    let history = {};
    if (pendingStartedId !== null && editingId === null) {
      const started = JSON.parse(localStorage.getItem(STARTED_KEY) || "[]");
      const s = started.find((x) => x.id === pendingStartedId);
      if (s) history = { ...(s.history || {}), started: stripRecord(s) };
    }

    const records = loadRecords();
    const data = {
      ownerName: form.ownerName.value.trim(),
      mobile: mobile.replace(/[\s-]/g, ""),
      jobType: jobType.value,
      completeDate: form.completeDate.value,
      dollarRate: document.getElementById("dollarRate").value,
      totalIqd: document.getElementById("totalIqd").value,
      ...collectAgreement(form),
      address: form.address.value.trim(),
      ...(capturedLoc ? { lat: capturedLoc.lat, lng: capturedLoc.lng } : {}),
    };
    if (editingId !== null) {
      const target = records.find((x) => x.id === editingId);
      if (target) Object.assign(target, data);
    } else {
      records.push({ id: Date.now(), history, ...data });
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    saveLastAgreement(collectAgreement(form));

    if (pendingStartedId !== null) {
      const started = JSON.parse(localStorage.getItem(STARTED_KEY) || "[]");
      localStorage.setItem(
        STARTED_KEY,
        JSON.stringify(started.filter((x) => x.id !== pendingStartedId))
      );
      pendingStartedId = null;
    }

    setEditMode(null);
    form.reset();
    capturedLoc = null;
    document.getElementById("locStatus").textContent = "";
    updatePriceFields();
    renderRecords();
    alert("تۆمارکرا");
  });

  const locBtn = document.getElementById("locBtn");
  const locStatus = document.getElementById("locStatus");
  locBtn.addEventListener("click", () => {
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

  form.addEventListener("reset", () => setEditMode(null));

  const modal = document.getElementById("infoModal");
  document.getElementById("modalClose").addEventListener("click", () => {
    modal.hidden = true;
  });
  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.hidden = true;
  });

  renderRecords();
});
