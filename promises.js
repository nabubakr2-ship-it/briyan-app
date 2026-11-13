const PROMISES_KEY = "promises";
const VIEWINGS_KEY = "viewings";

function loadJSON(key) {
  try {
    return JSON.parse(localStorage.getItem(key)) || [];
  } catch {
    return [];
  }
}

function saveJSON(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
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
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[c]));
}

function stripRecord(r) {
  const o = { ...r };
  ["id", "sentToContractor", "promised", "viewingId"].forEach((k) => delete o[k]);
  return o;
}

let pendingViewingId = null;

function updatePriceFields() {
  const form = document.getElementById("promiseForm");
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

function renderSentList() {
  const viewings = loadJSON(VIEWINGS_KEY).filter((v) => v.sentToContractor);
  const list = document.getElementById("sentList");
  const emptyMsg = document.getElementById("sentEmpty");
  list.innerHTML = "";

  if (viewings.length === 0) {
    emptyMsg.style.display = "block";
    return;
  }
  emptyMsg.style.display = "none";

  viewings.forEach((v) => {
    const li = document.createElement("li");
    li.className = "record-item";
    li.innerHTML = `
      <div class="record-main">
        <strong>${escapeHtml(v.ownerName)}</strong>
        <span class="record-meta">${escapeHtml(v.jobType)} — ${formatDate(v.viewDate)}</span>
      </div>
      <span class="record-mobile">${escapeHtml(v.mobile)}</span>
      <button class="btn-promise">بەڵێن بدە</button>
    `;
    li.querySelector(".btn-promise").addEventListener("click", () => {
      const form = document.getElementById("promiseForm");
      form.ownerName.value = v.ownerName;
      form.jobType.value = v.jobType;
      form.mobile.value = v.mobile;
      form.promiseDate.value = "";
      applyAgreement(form, v);
      pendingViewingId = v.id;
      form.scrollIntoView({ behavior: "smooth", block: "start" });
      form.promiseDate.focus();
    });
    list.appendChild(li);
  });
}

function renderPromiseList() {
  const promises = loadJSON(PROMISES_KEY);
  const list = document.getElementById("promiseList");
  const emptyMsg = document.getElementById("promiseEmpty");
  list.innerHTML = "";

  if (promises.length === 0) {
    emptyMsg.style.display = "block";
    return;
  }
  emptyMsg.style.display = "none";

  promises.slice().reverse().forEach((p) => {
    const li = document.createElement("li");
    li.className = "record-item";
    li.innerHTML = `
      <div class="record-main">
        <strong>${escapeHtml(p.ownerName)}</strong>
        <span class="record-meta">${escapeHtml(p.jobType)} — ${formatDate(p.promiseDate)}${escapeHtml(agreementInfo(p))}</span>
      </div>
      <span class="record-mobile">${escapeHtml(p.mobile)}</span>
      <div class="record-actions">
        <button class="btn-promise btn-send-work">ناردن بۆ ئیش</button>
      </div>
    `;
    li.querySelector(".btn-send-work").addEventListener("click", () => {
      localStorage.setItem("pendingPromise", JSON.stringify(p));
      window.location.href = "started.html";
    });
    list.appendChild(li);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const backBtn = document.getElementById("backBtn");
  if (backBtn) backBtn.addEventListener("click", () => (window.location.href = "index.html"));

  const form = document.getElementById("promiseForm");
  form.jobType.addEventListener("change", updatePriceFields);
  form.agreementType.addEventListener("change", updatePriceFields);
  loadLastAgreement(form);
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const mobile = form.mobile.value.trim();
    if (!/^\d{7,15}$/.test(mobile.replace(/[\s-]/g, ""))) {
      alert("ژمارە مۆبایلەکە نادروستە");
      return;
    }
    const promises = loadJSON(PROMISES_KEY);
    const history = {};
    if (pendingViewingId !== null) {
      const allViewings = loadJSON(VIEWINGS_KEY);
      const v = allViewings.find((x) => x.id === pendingViewingId);
      if (v) history.viewing = stripRecord(v);
    }
    promises.push({
      id: Date.now(),
      ownerName: form.ownerName.value.trim(),
      jobType: form.jobType.value,
      promiseDate: form.promiseDate.value,
      mobile: mobile.replace(/[\s-]/g, ""),
      viewingId: pendingViewingId,
      history,
      ...collectAgreement(form),
    });
    saveJSON(PROMISES_KEY, promises);
    saveLastAgreement(collectAgreement(form));

    if (pendingViewingId !== null) {
      const viewings = loadJSON(VIEWINGS_KEY).filter((x) => x.id !== pendingViewingId);
      saveJSON(VIEWINGS_KEY, viewings);
      pendingViewingId = null;
    }

    form.reset();
    renderSentList();
    renderPromiseList();
    alert("بەڵێن تۆمارکرا");
  });

  renderSentList();
  renderPromiseList();
});
