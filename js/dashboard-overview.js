// ═══ NEU Lab Log — Overview Tab: Stats, Room Breakdown, Recent Logs ════════

"use strict";

// ── Sprint 3: Statistics (invalid logs excluded from all counts) ──────────
function validLogs() { return allLogs.filter(l => !l.invalid); }

function renderStats() {
  const logs = validLogs();

  document.getElementById("statTotalLogs").textContent = logs.length.toLocaleString();

  const uniqueProfs = new Set(logs.map(l => l.professorUid)).size;
  document.getElementById("statUniqueProfessors").textContent = uniqueProfs.toLocaleString();

  const roomCounts = {};
  logs.forEach(l => { if (l.roomNumber) roomCounts[l.roomNumber] = (roomCounts[l.roomNumber] || 0) + 1; });
  const sorted = Object.entries(roomCounts).sort((a,b) => b[1]-a[1]);
  if (sorted.length > 0) {
    document.getElementById("statMostUsedRoom").textContent  = sorted[0][0];
    document.getElementById("statMostUsedCount").textContent = `${sorted[0][1]} usage${sorted[0][1] !== 1 ? "s" : ""} recorded`;
  } else {
    document.getElementById("statMostUsedRoom").textContent  = "—";
    document.getElementById("statMostUsedCount").textContent = "";
  }

  const todayStart = new Date(); todayStart.setHours(0,0,0,0);
  const todayCount = logs.filter(l => l.timestamp?.toDate && l.timestamp.toDate() >= todayStart).length;
  document.getElementById("statLogsTrend").innerHTML = todayCount > 0
    ? `<span class="text-green-400 font-bold">${todayCount}</span> <span class="text-white/30">log${todayCount!==1?"s":""} today</span>`
    : `<span class="text-white/25">No logs today</span>`;
}

function renderOverviewTable() {
  const recent = validLogs().slice(0, 8);
  const tbody  = document.getElementById("overviewTableBody");
  if (recent.length === 0) {
    tbody.innerHTML = `<tr><td colspan="3" class="text-center py-8 text-white/25 text-sm">No logs recorded yet.</td></tr>`;
    return;
  }
  tbody.innerHTML = recent.map(log => `
    <tr>
      <td><span class="text-white/70 text-xs">${truncateEmail(log.professorEmail || "—")}</span></td>
      <td><span class="badge badge-gold">${log.roomNumber || "—"}</span></td>
      <td><span class="text-white/40 text-xs">${formatTimestamp(log.timestamp)}</span></td>
    </tr>`).join("");
}

function renderRoomBreakdown() {
  const roomCounts = {};
  validLogs().forEach(l => { if (l.roomNumber) roomCounts[l.roomNumber] = (roomCounts[l.roomNumber] || 0) + 1; });
  const sorted = Object.entries(roomCounts).sort((a,b) => b[1]-a[1]).slice(0, 6);
  const max    = sorted[0]?.[1] || 1;
  const el     = document.getElementById("roomBreakdown");

  if (sorted.length === 0) {
    el.innerHTML = `<p class="text-white/25 text-xs text-center py-6">No room data yet.</p>`;
    return;
  }
  el.innerHTML = sorted.map(([room, count]) => `
    <div>
      <div class="flex items-center justify-between mb-1">
        <span class="text-white/75 text-xs font-semibold font-display">${room}</span>
        <span class="text-gold-400 text-xs font-bold">${count}</span>
      </div>
      <div class="h-1.5 bg-white/08 rounded-full overflow-hidden">
        <div class="h-full rounded-full bg-gradient-to-r from-gold-600 to-gold-400"
          style="width:${Math.round((count/max)*100)}%;transition:width 0.8s cubic-bezier(0.4,0,0.2,1)"></div>
      </div>
    </div>`).join("");
}

function updateLogsCountBadge() {
  const badge = document.getElementById("logsCountBadge");
  const count = validLogs().length;
  if (count > 0) { badge.textContent = count; badge.classList.remove("hidden"); }
  else           { badge.classList.add("hidden"); }
}

// ── Occupied Rooms panel (live) ───────────────────────────────────────────
function renderActiveRooms() {
  const section = document.getElementById("activeRoomsSection");
  const list    = document.getElementById("activeRoomsList");
  const badge   = document.getElementById("activeRoomsBadge");
  if (!section || !list) return;

  if (allActiveRooms.length === 0) {
    section.classList.add("hidden");
    badge.classList.add("hidden");
    return;
  }

  section.classList.remove("hidden");
  badge.textContent = allActiveRooms.length;
  badge.classList.remove("hidden");

  const esc = s => String(s || "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");

  list.innerHTML = allActiveRooms.map(room => {
    const since = room.timestamp?.toDate
      ? room.timestamp.toDate().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      : "—";
    return `
      <div class="flex items-center justify-between gap-3 px-5 py-3 border-b border-white/05 last:border-0">
        <div class="flex items-center gap-3 min-w-0">
          <span class="shrink-0 w-2 h-2 rounded-full bg-green-400" style="animation:pulse 2s cubic-bezier(0.4,0,0.6,1) infinite"></span>
          <span class="font-display font-bold text-white text-sm shrink-0">${esc(room.id)}</span>
          <span class="text-white/40 text-xs truncate">${esc(room.professorEmail || "—")}</span>
        </div>
        <div class="flex items-center gap-3 shrink-0">
          <span class="text-white/25 text-xs hidden sm:block">since ${since}</span>
          <button
            onclick="forceCheckout(${JSON.stringify(room.id)}, ${JSON.stringify(room.professorEmail || "")}, ${JSON.stringify(room.logDocId || "")})"
            class="px-3 py-1 rounded-lg text-xs font-bold font-display transition-all"
            style="background:rgba(239,68,68,0.10);border:1px solid rgba(239,68,68,0.22);color:rgba(248,113,113,0.85);"
            onmouseover="this.style.background='rgba(239,68,68,0.22)';this.style.color='#f87171';"
            onmouseout="this.style.background='rgba(239,68,68,0.10)';this.style.color='rgba(248,113,113,0.85)';"
          >Force Checkout</button>
        </div>
      </div>`;
  }).join("");
}

async function forceCheckout(roomId, professorEmail, logDocId) {
  const name = professorEmail || "this professor";
  if (!confirm(`Force check out ${name} from ${roomId}?\n\nThis will end their active session immediately.`)) return;

  try {
    const batch = db.batch();

    // Stamp logoutAt on the log doc so it closes cleanly
    if (logDocId) {
      batch.update(db.collection("logs").doc(logDocId), {
        logoutAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
    }
    // Delete the activeRooms doc — this frees the room immediately
    batch.delete(db.collection("activeRooms").doc(roomId));

    await batch.commit();

    // Write audit trail
    await writeAudit("force_checkout", {
      professorEmail: professorEmail || "",
      roomNumber:     roomId,
      logDocId:       logDocId || "",
    });

    showToast("success", `${name} checked out of ${roomId}.`);
  } catch(e) {
    console.error("forceCheckout error:", e);
    showToast("error", "Force checkout failed. Please try again.");
  }
}