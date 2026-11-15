const STORAGE_KEY = "workerEntries";

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

let searchText = "";

function matchesSearch(r, q) {
  if (!q) return true;
  const exp = (r.items || []).map((it) => [it.type, it.amount].filter(Boolean).join(" ")).join(" ");
  const hay = [
    r.workerName,
    r.ownerName,
    r.dailyStatus,
    r.jobType,
    exp,
    formatDate(r.entryDate),
  ].filter(Boolean).join(" ").toLowerCase();
  return hay.includes(q.toLowerCase());
}

function renderRecords() {
  const records = loadJSON(STORAGE_KEY).filter(
    (r) => r.archived && matchesSearch(r, searchText)
  );
  const list = document.getElementById("recordsList");
  const emptyMsg = document.getElementById("emptyMsg");
  list.innerHTML = "";

  if (!records.length) {
    emptyMsg.style.display = "block";
    return;
  }
  emptyMsg.style.display = "none";

  let totalRate = 0;
  let totalExpense = 0;
  records.slice().reverse().forEach((r) => {
    const rate = parseFloat(r.dailyRate) || 0;
    const exp = (r.items || []).reduce((s, it) => s + (parseFloat(it.amount) || 0), 0);
    const itemsText = (r.items || [])
      .map((it) => [it.type, it.amount].filter(Boolean).join(": "))
      .filter(Boolean)
      .join("، ");
    totalRate += rate;
    totalExpense += exp;
    const li = document.createElement("li");
    li.className = "record-item";
    li.innerHTML = `
      <div class="record-main">
        <strong>${escapeHtml(r.workerName || "—")}</strong>
        <span class="record-meta">${escapeHtml(r.ownerName || "—")}${r.dailyStatus ? " — " + escapeHtml(r.dailyStatus) : ""}${r.jobType ? " — " + escapeHtml(r.jobType) : ""}${itemsText ? " — " + escapeHtml(itemsText) : ""}</span>
        <span class="record-meta">ڕۆژانە: ${formatNum(rate)} د.ع — خەرجی: ${formatNum(exp)} د.ع — کۆی: <strong>${formatNum(rate + exp)} د.ع</strong></span>
        <div class="record-actions">
          <button type="button" class="btn-back" data-id="${r.id}">گەڕانەوە بۆ فۆڕمی پێشوو</button>
        </div>
      </div>
      <div class="record-side">
        <span class="record-mobile">${formatDate(r.entryDate)}</span>
        <button class="record-del" title="ڕەشکردنەوە">&times;</button>
      </div>
    `;
    li.querySelector(".btn-back").addEventListener("click", (e) => {
      const all = loadJSON(STORAGE_KEY);
      const rec = all.find((x) => x.id === Number(e.target.dataset.id));
      if (rec) {
        rec.archived = false;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
        renderRecords();
      }
    });
    li.querySelector(".record-del").addEventListener("click", () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(loadJSON(STORAGE_KEY).filter((x) => x.id !== r.id))
      );
      renderRecords();
    });
    list.appendChild(li);
  });

  document.getElementById("totalRate").textContent = formatNum(totalRate);
  document.getElementById("totalExpense").textContent = formatNum(totalExpense);
  document.getElementById("totalGrand").textContent = formatNum(totalRate + totalExpense);
}

document.addEventListener("DOMContentLoaded", () => {
  const backBtn = document.getElementById("backBtn");
  if (backBtn) backBtn.addEventListener("click", () => (window.location.href = "index.html"));

  const searchBox = document.getElementById("searchBox");
  if (searchBox) {
    searchBox.addEventListener("input", () => {
      searchText = searchBox.value.trim();
      renderRecords();
    });
  }

  renderRecords();
});
