const STORAGE_KEY = "startedWorks";
const PROMISES_KEY = "promises";
const PENDING_KEY = "pendingPromise";

function loadRecords() {
  return loadRecordsFrom(STORAGE_KEY);
}

function loadRecordsFrom(key) {
  try {
    return JSON.parse(localStorage.getItem(key)) || [];
  } catch {
    return [];
  }
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
    const type = row.querySelector(".item-type").value.trim();
    const amount = row.querySelector(".item-amount").value.trim();
    if (type !== "" && amount !== "") addItemRow();
  });

  body.appendChild(row);
}

function formatNum(n) {
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

function updateTotal() {
  const total = [...document.querySelectorAll(".item-amount")].reduce(
    (s, el) => s + (parseFloat(el.value) || 0),
    0
  );
  document.getElementById("totalAmount").textContent = formatNum(total);
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

function stripRecord(r) {
  const o = { ...r };
  ["id", "sentToContractor", "promised", "viewingId", "sentToWork"].forEach((k) => delete o[k]);
  return o;
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

function updatePriceFields() {
  const form = document.getElementById("workForm");
  const isMohalaja = form.jobType.value === "محالەجە";
  const isShkan = form.jobType.value === "شکان";

  document.getElementById("agreementField").hidden = !isMohalaja;
  document.getElementById("shkanPriceField").hidden = !isShkan;
  form.agreementType.required = isMohalaja;
  form.shkanPrice.required = isShkan;

  if (!isMohalaja) form.agreementType.value = "";
  if (!isShkan) form.shkanPrice.value = "";

  const t = form.agreementType.value;
  const single = ["مەتر تووڵ", "مەتر مرەبەح", "گۆترە"].includes(t);
  const double = t === "مەتر تووڵ و مرەبەح";

  document.getElementById("priceSingleField").hidden = !single;
  document.getElementById("priceWoolField").hidden = !double;
  document.getElementById("priceMarbleField").hidden = !double;

  form.price.required = single;
  form.priceWool.required = double;
  form.priceMarble.required = double;

  if (!single) form.price.value = "";
  if (!double) {
    form.priceWool.value = "";
    form.priceMarble.value = "";
  }
}

function agreementInfo(r) {
  if (r.jobType === "شکان") {
    return r.price ? ` — بڕی پارە (${r.price})` : "";
  }
  if (!r.agreementType) return "";
  if (r.agreementType === "مەتر تووڵ و مرەبەح") {
    return ` — ${r.agreementType} (تووڵ: ${r.priceWool || "-"}، مرەبەح: ${r.priceMarble || "-"})`;
  }
  return ` — ${r.agreementType}${r.price ? ` (${r.price})` : ""}`;
}

function applyAgreement(form, src) {
  form.agreementType.value = src.agreementType || "";
  form.shkanPrice.value = form.jobType.value === "شکان" ? src.price || "" : "";
  updatePriceFields();
  if (form.jobType.value !== "شکان") form.price.value = src.price || "";
  form.priceWool.value = src.priceWool || "";
  form.priceMarble.value = src.priceMarble || "";
}

function collectAgreementStatic(r) {
  return {
    agreementType: r.agreementType || "",
    price: r.price || "",
    priceWool: r.priceWool || "",
    priceMarble: r.priceMarble || "",
  };
}

function collectAgreement(form) {
  const t = form.agreementType.value;
  const isShkan = form.jobType.value === "شکان";
  return {
    agreementType: isShkan ? "" : t,
    price: isShkan
      ? form.shkanPrice.value
      : t && form.price.value !== ""
        ? form.price.value
        : "",
    priceWool: t === "مەتر تووڵ و مرەبەح" ? form.priceWool.value : "",
    priceMarble: t === "مەتر تووڵ و مرەبەح" ? form.priceMarble.value : "",
  };
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

function infoRow(k, v) {
  return v !== "" && v !== undefined && v !== null
    ? `<div class="info-row"><span>${k}</span><span>${escapeHtml(String(v))}</span></div>`
    : "";
}

function openInfo(r) {
  let html = "";
  html += `<h3 class="info-section">زانیارییەکان</h3>`;
  html += infoRow("ناوی خاوەن ماڵ", r.ownerName);
  html += infoRow("ژمارە مۆبایل", r.mobile);
  html += infoRow("جۆری ئیش", r.jobType);
  html += infoRow("بەرواری دەستپێکردن", formatDate(r.startDate));
  html += infoRow("ڕێک کەوتن", agreementInfo(r).replace(/^ — /, ""));

  const items = r.items || [];
  if (items.length) {
    const exp = items.reduce((s, it) => s + (parseFloat(it.amount) || 0), 0);
    html += `<h3 class="info-section">مەسروفات — کۆی: ${formatNum(exp)}</h3>`;
    items.forEach((it) => {
      html += `<div class="info-row"><span>${escapeHtml(it.type || "—")}</span><span>${escapeHtml(String(it.amount || ""))}</span></div>`;
    });
  }

  const entries = loadRecordsFrom("workerEntries").filter(
    (e) => !e.archived && (e.ownerMobile === r.mobile || (r.ownerName && e.ownerName === r.ownerName))
  );
  if (entries.length) {
    html += `<h3 class="info-section">زانیاری کرێکار</h3><table class="summary-table"><thead><tr>
      <th>کرێکار</th><th>بەروار</th><th>دۆخ</th><th>ڕۆژانە</th><th>مەسروفات</th><th>کۆی پارە</th>
    </tr></thead><tbody>`;
    entries.slice().reverse().forEach((e) => {
      const exp = (e.items || []).reduce((s, it) => s + (parseFloat(it.amount) || 0), 0);
      const itemNames = (e.items || [])
        .map((it) => [it.type, it.amount].filter(Boolean).join(": "))
        .filter(Boolean)
        .join("، ");
      const rate = parseFloat(e.dailyRate) || 0;
      html += `<tr>
        <td>${escapeHtml(e.workerName || "—")}</td>
        <td>${formatDate(e.entryDate)}</td>
        <td>${escapeHtml(e.dailyStatus || "—")}</td>
        <td>${formatNum(rate)}</td>
        <td>${escapeHtml(itemNames || "—")}</td>
        <td>${formatNum(rate + exp)}</td>
      </tr>`;
    });
    html += "</tbody></table>";
  }

  document.getElementById("infoBody").innerHTML = html || "<p class='empty-msg'>زانیاری نییە</p>";
  document.getElementById("infoModal").hidden = false;
}

function setEditMode(id) {
  editingId = id;
  const btn = document.querySelector('#workForm button[type="submit"]');
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

  records.slice().reverse().forEach((r) => {
    const total = (r.items || []).reduce(
      (s, it) => s + (parseFloat(it.amount) || 0),
      0
    );
    const totalText = total ? `کۆی خەرجی: ${formatNum(total)}` : "";
    const li = document.createElement("li");
    li.className = "record-item";
    li.innerHTML = `
      <div class="record-main">
        <strong>${escapeHtml(r.ownerName)}</strong>
        <span class="record-meta">${formatDate(r.startDate)}${totalText ? " — " + escapeHtml(totalText) : ""}${escapeHtml(agreementInfo(r))}${r.address ? " — " + escapeHtml(r.address) : ""}</span>
      </div>
      <div class="record-side">
        <span class="record-mobile">${escapeHtml(r.mobile)}</span>
        ${locLinkHtml(r)}
        <button class="record-del" title="ڕەشکردنەوە">&times;</button>
      </div>
      <div class="record-actions">
        <button class="btn-info" data-id="${r.id}">لیستی زانیاری</button>
        <button class="btn-promise btn-send-done">ناردن بۆ تەواوکردن</button>
        <button class="record-edit" title="گۆڕانکاری">✎</button>
      </div>
    `;
    li.querySelector(".btn-info").addEventListener("click", () => openInfo(r));
    li.querySelector(".btn-send-done").addEventListener("click", () => {
      localStorage.setItem(
        "pendingStarted",
        JSON.stringify({ id: r.id, ownerName: r.ownerName, mobile: r.mobile, jobType: r.jobType, ...collectAgreementStatic(r), address: r.address || "", ...(r.lat != null && r.lng != null ? { lat: r.lat, lng: r.lng } : {}) })
      );
      window.location.href = "completed.html";
    });
    li.querySelector(".record-edit").addEventListener("click", () => {
      const form = document.getElementById("workForm");
      form.ownerName.value = r.ownerName;
      form.mobile.value = r.mobile;
      form.startDate.value = r.startDate;
      form.address.value = r.address || "";
      capturedLoc = r.lat != null && r.lng != null ? { lat: r.lat, lng: r.lng } : null;
      document.getElementById("locStatus").textContent = capturedLoc ? "لۆکەیشن وەرگیرا ✓" : "";
      form.jobType.value = r.jobType || "";
      const body = document.getElementById("itemsBody");
      body.innerHTML = "";
      (r.items && r.items.length ? r.items : [{}]).forEach((it) =>
        addItemRow(it.type || "", it.amount || "")
      );
      addItemRow();
      applyAgreement(form, r);
      setEditMode(r.id);
      updateTotal();
      form.scrollIntoView({ behavior: "smooth", block: "start" });
      form.ownerName.focus();
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

  addItemRow();
  document.getElementById("itemsBody").addEventListener("input", updateTotal);

  const form = document.getElementById("workForm");
  form.jobType.addEventListener("change", updatePriceFields);
  form.agreementType.addEventListener("change", updatePriceFields);
  loadLastAgreement(form);

  let pendingPromiseId = null;
  try {
    const pending = JSON.parse(localStorage.getItem(PENDING_KEY));
    if (pending) {
      localStorage.removeItem(PENDING_KEY);
      pendingPromiseId = pending.id;
      form.ownerName.value = pending.ownerName || "";
      form.mobile.value = pending.mobile || "";
      form.jobType.value = pending.jobType || "";
      applyAgreement(form, pending);
      form.address.value = pending.address || "";
      capturedLoc = pending.lat != null && pending.lng != null ? { lat: pending.lat, lng: pending.lng } : null;
      document.getElementById("locStatus").textContent = capturedLoc ? "لۆکەیشن وەرگیرا ✓" : "";
    }
  } catch {}

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const mobile = form.mobile.value.trim();
    if (!/^\d{7,15}$/.test(mobile.replace(/[\s-]/g, ""))) {
      alert("ژمارە مۆبایلەکە نادروستە");
      return;
    }

    const items = [...document.querySelectorAll(".item-row")]
      .map((row) => ({
        type: row.querySelector(".item-type").value.trim(),
        amount: row.querySelector(".item-amount").value.trim(),
      }))
      .filter((it) => it.type !== "" || it.amount !== "");

    let history = {};
    if (pendingPromiseId !== null && editingId === null) {
      const promises = loadRecordsFrom(PROMISES_KEY);
      const p = promises.find((x) => x.id === pendingPromiseId);
      if (p) history = { ...(p.history || {}), promise: stripRecord(p) };
    }

    const records = loadRecords();
    const data = {
      ownerName: form.ownerName.value.trim(),
      mobile: mobile.replace(/[\s-]/g, ""),
      startDate: form.startDate.value,
      jobType: form.jobType.value,
      items,
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

    if (pendingPromiseId !== null) {
      const promises = loadRecordsFrom(PROMISES_KEY);
      localStorage.setItem(
        PROMISES_KEY,
        JSON.stringify(promises.filter((x) => x.id !== pendingPromiseId))
      );
      pendingPromiseId = null;
    }

    setEditMode(null);
    form.reset();
    capturedLoc = null;
    document.getElementById("locStatus").textContent = "";
    document.getElementById("itemsBody").innerHTML = "";
    addItemRow();
    updateTotal();
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

  const infoModal = document.getElementById("infoModal");
  document.getElementById("infoClose").addEventListener("click", () => {
    infoModal.hidden = true;
  });
  infoModal.addEventListener("click", (e) => {
    if (e.target === infoModal) infoModal.hidden = true;
  });

  renderRecords();
});
