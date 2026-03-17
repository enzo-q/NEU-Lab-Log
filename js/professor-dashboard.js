// ═══ NEU Lab Log — Professor Dashboard: sessions · check-out · history ═════

"use strict";


let currentUser      = null;
let todaySessions    = [];
let activeSession    = null;     // { id, roomNumber, timestamp }
let durationInterval = null;

// ── Auth Guard (professor only) ──────────────────────────────────────────────
auth.onAuthStateChanged(async (user) => {
  if (!user) { window.location.href = "index.html"; return; }
  try {
    const doc = await db.collection("users").doc(user.uid).get();
    if (!doc.exists || doc.data().role !== "professor" || doc.data().isBlocked === true) {
      await auth.signOut();
      window.location.href = "index.html";
      return;
    }
    currentUser = user;
    // Show "Switch to Admin" button if this user is an admin in professor mode
    if (doc.data().isAdmin === true) {
      const btn = document.getElementById("switchAdminBtn");
      if (btn) btn.classList.remove("hidden");
      const btnBottom = document.getElementById("switchAdminBtnBottom");
      if (btnBottom) btnBottom.style.display = "flex";
    }
    populateUI(user);
    await loadSessions();
    fadeOutGuard();
  } catch(e) {
    console.error(e);
    window.location.href = "index.html";
  }
});

function fadeOutGuard() {
  const guard = document.getElementById("authGuard");
  guard.style.transition = "opacity 0.3s";
  guard.style.opacity    = "0";
  setTimeout(() => guard.style.display = "none", 320);
}

function populateUI(user) {
  document.getElementById("userName").textContent  = user.displayName || "Professor";
  document.getElementById("userEmail").textContent = user.email;
  const av = document.getElementById("userAvatar");
  if (user.photoURL) { av.src = user.photoURL; av.classList.remove("hidden"); }

  const now = new Date();
  document.getElementById("dateLabel").textContent = now.toLocaleDateString("en-PH", {
    weekday: "long", month: "long", day: "numeric"
  });
}

// ── Sign Out ──────────────────────────────────────────────────────────────────
async function handleSignOut() {
  clearInterval(durationInterval);

  // Auto-checkout active session before signing out
  // so the room is freed and session is properly closed
  if (activeSession) {
    try {
      await db.collection("logs").doc(activeSession.id).update({
        logoutAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
      await db.collection("activeRooms").doc(activeSession.roomNumber).delete().catch(() => {});
      db.collection("auditLogs").add({
        action: "prof_checkout", professorEmail: currentUser.email, professorUid: currentUser.uid,
        roomNumber: activeSession.roomNumber, logDocId: activeSession.id,
        autoCheckout: true,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      }).catch(() => {});
    } catch(_) {}
  }

  await auth.signOut();
  window.location.href = "index.html";
}

// ── Switch back to Admin ──────────────────────────────────────────────────────
async function switchToAdmin() {
  // Auto-checkout active session first so the room is freed
  if (activeSession) {
    try {
      await db.collection("logs").doc(activeSession.id).update({
        logoutAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
      await db.collection("activeRooms").doc(activeSession.roomNumber).delete().catch(() => {});
      db.collection("auditLogs").add({
        action: "prof_checkout", professorEmail: currentUser.email, professorUid: currentUser.uid,
        roomNumber: activeSession.roomNumber, logDocId: activeSession.id,
        autoCheckout: true,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      }).catch(() => {});
    } catch(_) {}
  }
  try {
    await db.collection("users").doc(currentUser.uid).update({ role: "admin" });
    await db.collection("auditLogs").add({
      action:     "role_switch",
      adminEmail: currentUser.email,
      adminUid:   currentUser.uid,
      fromRole:   "professor",
      toRole:     "admin",
      timestamp:  firebase.firestore.FieldValue.serverTimestamp(),
    });
    window.location.href = "dashboard.html";
  } catch(e) {
    console.error("switchToAdmin error:", e);
    alert("Could not switch role. Please try again.");
  }
}


async function loadSessions() {
  document.getElementById("loadingCard").style.display    = "flex";
  document.getElementById("activeSessionCard").classList.add("hidden");
  document.getElementById("noSessionCard").classList.add("hidden");
  document.getElementById("historySection").classList.add("hidden");
  clearInterval(durationInterval);

  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // ── Single-equality filter only — no composite index needed ──
    // orderBy is handled client-side so Firestore never demands a
    // composite index.  We fetch all of this professor's logs and
    // filter to today in JS.  In practice professors have very few
    // documents so this is fast and reliable.
    const snap = await db.collection("logs")
      .where("professorUid", "==", currentUser.uid)
      .get();

    const allMyLogs = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    // Filter to today and sort newest-first, all in JS
    todaySessions = allMyLogs
      .filter(s => {
        const ts = s.timestamp?.toDate ? s.timestamp.toDate() : null;
        return ts && ts >= todayStart;
      })
      .sort((a, b) => {
        const ta = a.timestamp?.toDate ? a.timestamp.toDate().getTime() : 0;
        const tb = b.timestamp?.toDate ? b.timestamp.toDate().getTime() : 0;
        return tb - ta; // newest first
      });

    // Active session = most recent log today without logoutAt and not voided
    activeSession = todaySessions.find(s => !s.logoutAt && !s.invalid) || null;

    renderActiveSession();
    renderHistory();
  } catch(e) {
    console.error("Load sessions error:", e);
    showToast("error", "Failed to load sessions. Check your connection.");
  }

  document.getElementById("loadingCard").style.display = "none";
}

// ── Render Active Session ─────────────────────────────────────────────────────
function renderActiveSession() {
  if (activeSession) {
    document.getElementById("activeSessionCard").classList.remove("hidden");
    document.getElementById("noSessionCard").classList.add("hidden");

    document.getElementById("activeRoomName").textContent   = activeSession.roomNumber || "—";
    const checkinDate = activeSession.timestamp?.toDate ? activeSession.timestamp.toDate() : new Date();
    document.getElementById("activeCheckinTime").textContent = checkinDate.toLocaleTimeString("en-PH", {
      hour: "2-digit", minute: "2-digit"
    });

    // Live duration ticker
    clearInterval(durationInterval);
    updateDurationDisplay(checkinDate);
    durationInterval = setInterval(() => updateDurationDisplay(checkinDate), 30000);
  } else {
    document.getElementById("activeSessionCard").classList.add("hidden");
    document.getElementById("noSessionCard").classList.remove("hidden");
  }
}

function updateDurationDisplay(checkinDate) {
  const diffMs  = Date.now() - checkinDate.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const h       = Math.floor(diffMin / 60);
  const m       = diffMin % 60;
  document.getElementById("activeDuration").textContent =
    h > 0 ? `${h}h ${m}m` : `${m}m`;
}

// ── Check Out ─────────────────────────────────────────────────────────────────
async function checkoutFromRoom() {
  if (!activeSession) return;
  const btn = document.getElementById("checkoutBtn");
  btn.disabled = true;
  btn.innerHTML = `
    <svg class="spinner" style="width:18px;height:18px;border-width:2.5px" viewBox="0 0 24 24"></svg>
    Checking out…`;

  try {
    await db.collection("logs").doc(activeSession.id).update({
      logoutAt: firebase.firestore.FieldValue.serverTimestamp(),
    });

    // Free the room so other professors can check in
    await db.collection("activeRooms").doc(activeSession.roomNumber).delete().catch(() => {});

    clearInterval(durationInterval);

    // Log checkout activity to audit
    db.collection("auditLogs").add({
      action: "prof_checkout", professorEmail: currentUser.email, professorUid: currentUser.uid,
      roomNumber: activeSession.roomNumber, logDocId: activeSession.id,
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
    }).catch(e => console.error("[Audit] prof_checkout write failed:", e.message));

    // Update local state
    const logoutNow = { toDate: () => new Date() };
    const sessionInList = todaySessions.find(s => s.id === activeSession.id);
    if (sessionInList) sessionInList.logoutAt = logoutNow;
    activeSession = null;

    renderActiveSession();
    renderHistory();
    showToast("success", "Checked out successfully!");

    // Add a brief "checked out" flash on the first history row
    setTimeout(() => {
      const firstRow = document.querySelector(".session-row");
      if (firstRow) { firstRow.classList.add("success-flash"); }
    }, 100);

  } catch(e) {
    console.error("Checkout error:", e);
    btn.disabled = false;
    btn.innerHTML = `
      <svg style="width:18px;height:18px" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
      </svg>
      Check Out from Room`;
    showToast("error", "Checkout failed. Please try again.");
  }
}

// ── Render History ────────────────────────────────────────────────────────────
function renderHistory() {
  const section = document.getElementById("historySection");
  const list    = document.getElementById("sessionsList");
  const badge   = document.getElementById("sessionCount");

  const validSessions = todaySessions.filter(s => !s.invalid);
  badge.textContent   = `${validSessions.length} session${validSessions.length !== 1 ? "s" : ""} today`;

  section.classList.remove("hidden");

  if (validSessions.length === 0) {
    list.innerHTML = `<div class="py-8 text-center text-white/25 text-xs">No sessions today. Scan a room QR to get started.</div>`;
    return;
  }

  list.innerHTML = validSessions.map((s, idx) => {
    const isActive    = !s.logoutAt;
    const checkin     = s.timestamp?.toDate ? s.timestamp.toDate() : new Date();
    const checkout    = s.logoutAt?.toDate  ? s.logoutAt.toDate()  : null;
    const checkinStr  = checkin.toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" });
    const checkoutStr = checkout ? checkout.toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" }) : null;

    let durationStr = "";
    if (checkout) {
      const diffMin = Math.round((checkout - checkin) / 60000);
      const h = Math.floor(diffMin / 60), m = diffMin % 60;
      durationStr = h > 0 ? `${h}h ${m}m` : `${m}m`;
    }

    return `
      <div class="session-row">
        <!-- Room badge -->
        <div class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mr-3
          ${isActive ? "bg-emerald-500/15 border border-emerald-500/25" : "bg-white/05 border border-white/10"}">
          <svg class="w-4.5 h-4.5 ${isActive ? "text-emerald-400" : "text-white/30"}" style="width:18px;height:18px"
            fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.8">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
          </svg>
        </div>

        <!-- Details -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-1">
            <span class="font-display font-bold text-white text-sm truncate">${s.roomNumber || "—"}</span>
            ${isActive
              ? `<span class="chip bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                   <span class="live-pulse w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Active
                 </span>`
              : (durationStr
                  ? `<span class="chip bg-white/07 text-white/35 border border-white/10">${durationStr}</span>`
                  : "")
            }
          </div>
          <div class="flex items-center gap-3 text-[11px]">
            <span class="text-white/40 flex items-center gap-1">
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"/>
              </svg>
              In: <strong class="text-white/55">${checkinStr}</strong>
            </span>
            ${checkoutStr
              ? `<span class="text-white/40 flex items-center gap-1">
                   <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                     <path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7"/>
                   </svg>
                   Out: <strong class="text-white/55">${checkoutStr}</strong>
                 </span>`
              : `<span class="text-white/25 italic text-[10px]">Not checked out yet</span>`
            }
          </div>
        </div>
      </div>`;
  }).join("");
}

// ── Toast ─────────────────────────────────────────────────────────────────────
let toastTimer = null;
function showToast(type, message) {
  const toast   = document.getElementById("toast");
  const content = document.getElementById("toastContent");
  const styles  = {
    success: "bg-green-900/95 border border-green-500/30 text-green-200",
    error:   "bg-red-900/95 border border-red-500/30 text-red-200",
    warning: "bg-amber-900/95 border border-amber-500/30 text-amber-200",
  };
  const icons = {
    success: `<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>`,
    error:   `<path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>`,
    warning: `<path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>`,
  };
  content.className = `rounded-xl px-4 py-3 text-xs flex items-center gap-2.5 shadow-2xl backdrop-blur-md ${styles[type] || styles.success}`;
  content.innerHTML = `<svg class="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">${icons[type] || icons.success}</svg><span>${message}</span>`;
  toast.classList.add("show");
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 3200);
}

// ── PWA Service Worker ────────────────────────────────────────────────────────
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}