// ═══ NEU Lab Log — App State, Auth Guard & Core Navigation ═════════════════
// state vars · auth guard · handleSignOut · switchTab · refreshData

"use strict";

// ── State ──────────────────────────────────────────────────────────────────
let currentUser    = null;
let allLogs        = [];
let filteredLogs   = [];
let allProfessors  = [];
let allWhitelist   = [];        // allowedEmails collection entries
let allAuditLogs   = [];        // auditLogs collection entries
let allActiveRooms = [];        // activeRooms collection — live onSnapshot
let currentFilter  = "all";
let currentPage    = 1;
const PAGE_SIZE    = 15;

// ── Auth Guard ──────────────────────────────────────────────────────────────
auth.onAuthStateChanged(async (user) => {
  if (!user) { window.location.href = "index.html"; return; }
  try {
    const doc = await db.collection("users").doc(user.uid).get();
    if (!doc.exists || doc.data().role !== "admin") {
      await auth.signOut();
      window.location.href = "index.html";
      return;
    }
    currentUser = user;
    populateAdminUI(user);
    await refreshData();
    subscribeActiveRooms();
    document.getElementById("authGuard").style.opacity = "0";
    setTimeout(() => document.getElementById("authGuard").style.display = "none", 300);
  } catch(e) { console.error(e); window.location.href = "index.html"; }
});

function populateAdminUI(user) {
  document.getElementById("sidebarName").textContent = user.displayName || user.email;
  const av = document.getElementById("sidebarAvatar");
  if (user.photoURL) { av.src = user.photoURL; av.classList.remove("hidden"); }
}

// ── Sign Out ────────────────────────────────────────────────────────────────
async function handleSignOut() {
  if (_auditUnsubscribe)       { _auditUnsubscribe();       _auditUnsubscribe = null; }
  if (_activeRoomsUnsub)       { _activeRoomsUnsub();       _activeRoomsUnsub = null; }
  await auth.signOut();
  window.location.href = "index.html";
}

// ── Role Switching ────────────────────────────────────────────────────────
async function switchToProf() {
  if (!confirm("Switch to Professor mode?\n\nYou'll be taken to the scanner. Your admin role stays intact — switch back any time from the professor panel.")) return;
  try {
    // Set viewAs: 'professor' — does NOT change the role field.
    // This avoids the circular-read issue in Firestore security rules
    // (writing your own doc while a rule reads that same doc).
    // isAdmin: true is set as a permanent marker so the scanner knows
    // this user is really an admin and can show the "Switch to Admin" button.
    await db.collection("users").doc(currentUser.uid).update({
      viewAs:  "professor",
      isAdmin: true,
    });

    await db.collection("auditLogs").add({
      action:     "role_switch",
      adminEmail: currentUser.email,
      adminUid:   currentUser.uid,
      fromRole:   "admin",
      toRole:     "professor",
      timestamp:  firebase.firestore.FieldValue.serverTimestamp(),
    });

    window.location.href = "scanner.html";
  } catch(e) {
    console.error("switchToProf error:", e);
    showToast("error", "Could not switch role. Please try again.");
  }
}

// ── Tab Switching ────────────────────────────────────────────────────────────
function switchTab(name) {
  ["overview","logs","professors","audit"].forEach(t => {
    document.getElementById(`tab-${t}`).classList.toggle("hidden", t !== name);
    document.getElementById(`nav-${t}`).classList.toggle("active", t === name);
  });
  const titles = {
    overview:   "Dashboard",
    logs:       "Usage Logs",
    professors: "Professor Access",
    audit:      "Audit Log",
  };
  const subs = {
    overview:   "Laboratory Usage Overview",
    logs:       "All recorded room usage logs",
    professors: "Whitelist & access control for professors",
    audit:      "Full history of administrative actions",
  };
  document.getElementById("pageTitle").textContent    = titles[name] || "Dashboard";
  document.getElementById("pageSubtitle").textContent = subs[name]   || "";
  closeSidebar();

  if (name === "professors" && allWhitelist.length === 0 && allProfessors.length === 0) loadProfessorsTab();
  if (name === "audit"      && !_auditUnsubscribe)  loadAuditLog();
}

// ── Sidebar (mobile) ─────────────────────────────────────────────────────────
function openSidebar()  { document.getElementById("sidebar").classList.add("open");    document.getElementById("sidebarOverlay").classList.add("active"); }
function closeSidebar() { document.getElementById("sidebar").classList.remove("open"); document.getElementById("sidebarOverlay").classList.remove("active"); }

// ── Data Loading ─────────────────────────────────────────────────────────────
async function refreshData() {
  setTopbarLoading(true);
  try {
    const snap = await db.collection("logs").orderBy("timestamp", "desc").get();
    allLogs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    applyFilter(currentFilter);
    renderStats();
    renderOverviewTable();
    renderRoomBreakdown();
    updateLogsCountBadge();
    document.getElementById("lastUpdated").textContent = `Updated ${new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}`;
  } catch(e) {
    console.error("Data load error:", e);
    showToast("error", "Failed to load data. Please try again.");
  }
  setTopbarLoading(false);
}

function setTopbarLoading(on) {
  document.getElementById("topbarSpinner").classList.toggle("hidden", !on);
}

// ── Active Rooms — real-time subscription ────────────────────────────────
let _activeRoomsUnsub = null;
function subscribeActiveRooms() {
  if (_activeRoomsUnsub) return;
  _activeRoomsUnsub = db.collection("activeRooms")
    .onSnapshot(snap => {
      allActiveRooms = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      renderActiveRooms();
    }, err => console.error("activeRooms snapshot error:", err));
}