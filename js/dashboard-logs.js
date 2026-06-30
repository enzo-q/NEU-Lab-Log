// ═══ NEU Lab Log — Logs Tab: Filtering, Table, Void/Restore, Export ════════

"use strict";

// ── Sprint 4: Date Filtering ───────────────────────────────────────────────
function setFilter(type) {
  currentFilter = type;
  currentPage   = 1;
  ["all","today","week","month","custom"].forEach(f => {
    document.getElementById(`pill-${f}`).classList.toggle("active", f === type);
  });
  document.getElementById("customDateRange").classList.toggle("hidden", type !== "custom");
  if (type !== "custom") applyFilter(type);
}

function applyFilter(type) {
  const now   = new Date();
  let from    = null, to = null;

  if (type === "today") {
    from = new Date(now); from.setHours(0,0,0,0);
    to   = new Date(now); to.setHours(23,59,59,999);
  } else if (type === "week") {
    const day = now.getDay(); // 0=Sun
    from = new Date(now); from.setDate(now.getDate() - day); from.setHours(0,0,0,0);
    to   = new Date(now); to.setHours(23,59,59,999);
  } else if (type === "month") {
    from = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    to   = new Date(now); to.setHours(23,59,59,999);
  } else if (type === "custom") {
    // handled by applyCustomFilter
    return;
  }

  filteredLogs = from
    ? allLogs.filter(l => {
        const d = l.timestamp?.toDate ? l.timestamp.toDate() : null;
        return d && d >= from && d <= to;
      })
    : [...allLogs];

  currentPage = 1;
  renderLogsTable();
}

function applyCustomFilter() {
  const fromVal = document.getElementById("dateFrom").value;
  const toVal   = document.getElementById("dateTo").value;
  if (!fromVal || !toVal) { showToast("warning", "Please select both a start and end date."); return; }

  const from = new Date(fromVal); from.setHours(0,0,0,0);
  const to   = new Date(toVal);   to.setHours(23,59,59,999);
  if (from > to) { showToast("warning", "Start date must be before end date."); return; }

  filteredLogs = allLogs.filter(l => {
    const d = l.timestamp?.toDate ? l.timestamp.toDate() : null;
    return d && d >= from && d <= to;
  });
  currentPage = 1;
  renderLogsTable();
}

function renderLogsTable() {
  const query      = document.getElementById("searchInput")?.value.toLowerCase().trim() || "";
  const showVoided = document.getElementById("showVoidedToggle")?.checked || false;

  let rows = filteredLogs;

  // Hide voided entries unless toggle is on
  if (!showVoided) rows = rows.filter(l => !l.invalid);

  if (query) {
    rows = rows.filter(l =>
      (l.professorEmail || "").toLowerCase().includes(query) ||
      (l.roomNumber     || "").toLowerCase().includes(query)
    );
  }

  const total      = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (currentPage > totalPages) currentPage = totalPages;

  const start = (currentPage - 1) * PAGE_SIZE;
  const page  = rows.slice(start, start + PAGE_SIZE);

  const voidedCount = filteredLogs.filter(l => l.invalid).length;
  const countSuffix = voidedCount > 0 && !showVoided
    ? ` <span class="text-red-400/60">(${voidedCount} voided hidden)</span>` : "";

  document.getElementById("logsResultCount").innerHTML =
    total === 0 ? "No logs found" :
    `Showing ${start+1}–${Math.min(start+PAGE_SIZE, total)} of ${total.toLocaleString()} log${total!==1?"s":""}${countSuffix}`;

  const tbody = document.getElementById("logsTableBody");
  if (page.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center py-10 text-white/25 text-sm">No logs match your filter.</td></tr>`;
  } else {
    tbody.innerHTML = page.map((log, i) => {
      const isVoid = !!log.invalid;
      return `
      <tr id="log-row-${log.id}" class="${isVoid ? "log-voided" : ""}">
        <td class="text-white/30 text-xs w-10">${start + i + 1}</td>
        <td>
          <div class="flex items-center gap-2">
            <div class="w-6 h-6 rounded-full bg-navy-700 border border-white/10 flex items-center justify-center text-[10px] font-bold text-gold-400 font-display shrink-0">
              ${(log.professorEmail || "?")[0].toUpperCase()}
            </div>
            <span class="text-white/70 text-xs ${isVoid ? "line-through" : ""}">${log.professorEmail || "—"}</span>
          </div>
        </td>
        <td>
          <span class="badge ${isVoid ? "badge-red" : "badge-gold"}">${log.roomNumber || "—"}</span>
          ${isVoid ? `<span class="ml-1.5 text-[10px] font-bold text-red-400/70 font-display uppercase tracking-wide">VOID</span>` : ""}
        </td>
        <td>
          <span class="text-white/45 text-xs">${formatTimestamp(log.timestamp)}</span>
          ${log.logoutAt
            ? `<p class="text-emerald-400/50 text-[10px] mt-0.5">✓ Out: ${formatTimestamp(log.logoutAt)}</p>`
            : ""}
          ${isVoid && log.invalidatedBy
            ? `<div class="mt-0.5">
                <p class="text-red-400/50 text-[10px]">Voided by ${log.invalidatedBy}</p>
                ${log.voidReason ? `<p class="text-red-400/40 text-[10px] italic" style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${(log.voidReason||'').replace(/"/g,'&quot;')}">Reason: ${log.voidReason}</p>` : ""}
               </div>`
            : ""}
        </td>
        <td class="text-right">
          <button
            onclick="toggleInvalidLog('${log.id}', ${isVoid}, this)"
            class="px-2.5 py-1 rounded-lg text-[11px] font-bold font-display transition-all
              ${isVoid
                ? "bg-green-500/10 hover:bg-green-500/20 text-green-400/70 hover:text-green-400 border border-green-500/20 hover:border-green-500/35"
                : "bg-red-500/08 hover:bg-red-500/18 text-red-400/50 hover:text-red-400 border border-red-500/15 hover:border-red-500/30"}"
            title="${isVoid ? "Restore this log entry" : "Mark this log as invalid (void)"}"
          >
            ${isVoid ? "Restore" : "Void"}
          </button>
        </td>
      </tr>`;
    }).join("");
  }

  document.getElementById("prevPage").disabled = currentPage <= 1;
  document.getElementById("nextPage").disabled = currentPage >= totalPages;
  document.getElementById("pageInfo").textContent = total > 0 ? `Page ${currentPage} of ${totalPages}` : "";
}

function changePage(dir) {
  currentPage += dir;
  renderLogsTable();
  document.querySelector(".main-content").scrollTo({ top: 0, behavior: "smooth" });
}

// ── Void Reason Modal ─────────────────────────────────────────────────────
let _voidingLogId  = null;
let _voidingBtn    = null;

// Escape key closes the modal
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && _voidingLogId) closeVoidModal();
});

function openVoidModal(logId, btn) {
  _voidingLogId = logId;
  _voidingBtn   = btn;
  document.getElementById("voidReasonInput").value = "";
  const modal = document.getElementById("voidModal");
  modal.style.display = "flex";
  setTimeout(() => document.getElementById("voidReasonInput").focus(), 120);
}

function closeVoidModal() {
  document.getElementById("voidModal").style.display = "none";
  _voidingLogId = null;
  _voidingBtn   = null;
}

async function confirmVoidLog() {
  if (!_voidingLogId) return;
  const reason  = document.getElementById("voidReasonInput").value.trim();
  const logId   = _voidingLogId;
  const btn     = _voidingBtn;
  closeVoidModal();

  const row = document.getElementById(`log-row-${logId}`);
  if (row) row.style.opacity = "0.4";
  if (btn) btn.disabled = true;

  try {
    const update = {
      invalid:        true,
      invalidatedBy:  currentUser.email,
      invalidatedAt:  firebase.firestore.FieldValue.serverTimestamp(),
      ...(reason ? { voidReason: reason } : {}),
    };
    await db.collection("logs").doc(logId).update(update);

    // If this log is the currently active session for the room, free it
    const voidedLog = allLogs.find(l => l.id === logId);
    if (voidedLog?.roomNumber) {
      const activeRoomDoc = await db.collection("activeRooms").doc(voidedLog.roomNumber).get();
      if (activeRoomDoc.exists && activeRoomDoc.data().logDocId === logId) {
        await db.collection("activeRooms").doc(voidedLog.roomNumber).delete().catch(() => {});
      }
    }

    const patch = { invalid: true, invalidatedBy: currentUser.email,
                    invalidatedAt: { toDate: () => new Date() },
                    ...(reason ? { voidReason: reason } : {}) };
    const logInAll      = allLogs.find(l => l.id === logId);
    const logInFiltered = filteredLogs.find(l => l.id === logId);
    if (logInAll)      Object.assign(logInAll,      patch);
    if (logInFiltered) Object.assign(logInFiltered, patch);

    renderLogsTable(); renderStats(); renderOverviewTable();
    renderRoomBreakdown(); updateLogsCountBadge();
    showToast("success", "Log entry voided. Record preserved but excluded from statistics.");

    // ── Audit ──────────────────────────────────────────────────
    writeAudit("void_log", {
      logDocId:       logId,
      professorEmail: logInAll?.professorEmail || "",
      roomNumber:     logInAll?.roomNumber     || "",
      ...(reason ? { voidReason: reason } : {}),
    });
  } catch(e) {
    console.error("Void error:", e);
    if (row) row.style.opacity = "1";
    if (btn) btn.disabled = false;
    showToast("error", "Failed to void log entry. Please try again.");
  }
}

async function toggleInvalidLog(logId, isCurrentlyVoid, btn) {
  if (!isCurrentlyVoid) {
    // Opening void — show reason modal
    openVoidModal(logId, btn);
    return;
  }

  // Restoring
  if (!confirm("Restore this log entry? It will be counted in statistics again.")) return;

  const row = document.getElementById(`log-row-${logId}`);
  if (row) row.style.opacity = "0.4";
  btn.disabled = true;

  try {
    await db.collection("logs").doc(logId).update({
      invalid:        false,
      invalidatedBy:  firebase.firestore.FieldValue.delete(),
      invalidatedAt:  firebase.firestore.FieldValue.delete(),
      voidReason:     firebase.firestore.FieldValue.delete(),
    });

    const logInAll      = allLogs.find(l => l.id === logId);
    const logInFiltered = filteredLogs.find(l => l.id === logId);
    if (logInAll)      { logInAll.invalid = false; delete logInAll.invalidatedBy; delete logInAll.invalidatedAt; delete logInAll.voidReason; }
    if (logInFiltered) { logInFiltered.invalid = false; delete logInFiltered.invalidatedBy; delete logInFiltered.invalidatedAt; delete logInFiltered.voidReason; }

    renderLogsTable(); renderStats(); renderOverviewTable();
    renderRoomBreakdown(); updateLogsCountBadge();
    showToast("success", "Log entry restored and included in statistics.");

    // ── Audit ──────────────────────────────────────────────────
    writeAudit("restore_log", {
      logDocId:       logId,
      professorEmail: logInAll?.professorEmail || "",
      roomNumber:     logInAll?.roomNumber     || "",
    });
  } catch(e) {
    console.error("Restore error:", e);
    if (row) row.style.opacity = "1";
    btn.disabled = false;
    showToast("error", "Failed to restore log entry. Please try again.");
  }
}


// ── Export CSV ────────────────────────────────────────────────────────────
function exportCSV() {
  // Exclude voided logs from export — they are not valid usage records
  const rows = filteredLogs.filter(l => !l.invalid);
  if (rows.length === 0) { showToast("warning", "No valid (non-voided) logs to export."); return; }
  const headers = ["#","Professor Email","Room Number","Check-in Date","Check-in Time","Check-out Time"];
  const lines   = rows.map((l, i) => {
    const d = l.timestamp?.toDate ? l.timestamp.toDate() : new Date();
    const out = l.logoutAt?.toDate ? l.logoutAt.toDate().toLocaleTimeString() : "";
    return [i+1, l.professorEmail||"", l.roomNumber||"", d.toLocaleDateString(), d.toLocaleTimeString(), out].join(",");
  });
  const csv = [headers.join(","), ...lines].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `neu-lab-logs-${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast("success", `Exported ${rows.length} valid log${rows.length!==1?"s":""} as CSV.`);
}
