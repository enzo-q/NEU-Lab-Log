// ═══ NEU Lab Log — Audit Log Engine: write · onSnapshot · render · export ══

"use strict";

// ══════════════════════════════════════════════════════════════════════════
// AUDIT LOG ENGINE
// ══════════════════════════════════════════════════════════════════════════

// ── Action metadata ──────────────────────────────────────────────────────
const AUDIT_META = {
  void_log:   { label:"Void Log",       pillar:"void",      iconClass:"audit-void",
    svg:`<path stroke-linecap="round" stroke-linejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/>` },
  restore_log:{ label:"Restore Log",    pillar:"restore",   iconClass:"audit-restore",
    svg:`<path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>` },
  block:      { label:"Block Professor",pillar:"block",     iconClass:"audit-block",
    svg:`<path stroke-linecap="round" stroke-linejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/>` },
  unblock:    { label:"Unblock Prof.",  pillar:"unblock",   iconClass:"audit-unblock",
    svg:`<path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>` },
  wl_add:     { label:"WL Add",         pillar:"wl-add",    iconClass:"audit-wl-add",
    svg:`<path stroke-linecap="round" stroke-linejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"/>` },
  wl_remove:  { label:"WL Remove",      pillar:"wl-remove", iconClass:"audit-wl-remove",
    svg:`<path stroke-linecap="round" stroke-linejoin="round" d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zm8-5h4"/>` },
  wl_bulk:    { label:"WL Bulk Add",    pillar:"wl-bulk",        iconClass:"audit-wl-bulk",
    svg:`<path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>` },
  force_checkout: { label:"Force Checkout", pillar:"force-checkout", iconClass:"audit-block",
    svg:`<path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>` },
  role_switch: { label:"Role Switch",     pillar:"role-switch",    iconClass:"audit-unblock",
    svg:`<path stroke-linecap="round" stroke-linejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/>` },
  promote_admin: { label:"Promote Admin", pillar:"promote-admin",  iconClass:"audit-unblock",
    svg:`<path stroke-linecap="round" stroke-linejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"/>` },
  // ── Professor activity ────────────────────────────────────────────────
  prof_signin:   { label:"Prof Sign-in",  pillar:"prof-signin",   iconClass:"audit-prof-signin",
    svg:`<path stroke-linecap="round" stroke-linejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"/>` },
  prof_scan:     { label:"QR Scan",       pillar:"prof-scan",     iconClass:"audit-prof-scan",
    svg:`<path stroke-linecap="round" stroke-linejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 3.5V16M4 4h6v6H4V4zm10 0h6v6h-6V4zM4 14h6v6H4v-6z"/>` },
  prof_checkout: { label:"Check-out",     pillar:"prof-checkout", iconClass:"audit-prof-checkout",
    svg:`<path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>` },
};

// ── Audit state ───────────────────────────────────────────────────────────
let auditCategoryFilter = "all";   // "all" | "admin" | "professor"
let auditActionFilter   = "all";   // specific action type sub-filter
let auditPage           = 1;
const AUDIT_PAGE_SIZE   = 20;
let _auditUnsubscribe   = null;    // holds the active onSnapshot unsubscribe fn

const ADMIN_ACTIONS = new Set(["void_log","restore_log","block","unblock","wl_add","wl_remove","wl_bulk","force_checkout","role_switch","promote_admin"]);
const PROF_ACTIONS  = new Set(["prof_signin","prof_scan","prof_checkout"]);

// ── Write an audit entry — optimistic local prepend, zero-latency ─────────
async function writeAudit(action, details) {
  try {
    // Write to Firestore; get the real doc ID back immediately
    const docRef = await db.collection("auditLogs").add({
      action,
      adminEmail: currentUser.email,
      adminUid:   currentUser.uid,
      timestamp:  firebase.firestore.FieldValue.serverTimestamp(),
      ...details,
    });

    // Prepend an optimistic entry using the real ID so the onSnapshot
    // will overwrite it in-place (same id → no flicker, no duplicate)
    const optimistic = {
      id:         docRef.id,
      action,
      adminEmail: currentUser.email,
      adminUid:   currentUser.uid,
      timestamp:  { toDate: () => new Date() },
      ...details,
    };
    allAuditLogs = [optimistic, ...allAuditLogs.filter(e => e.id !== docRef.id)];
    updateAuditBadge(allAuditLogs.length);

    if (!document.getElementById("tab-audit").classList.contains("hidden")) {
      renderAuditLog();
      requestAnimationFrame(() => {
        const el = document.getElementById(`audit-entry-${docRef.id}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "nearest" });
          el.classList.add("audit-flash");
        }
      });
    }
  } catch(e) {
    console.warn("[Audit] Write failed (non-critical):", e.message);
  }
}

// ── Subscribe to auditLogs via onSnapshot (replaces one-shot get()) ───────
function loadAuditLog(silent = false) {
  if (_auditUnsubscribe) { _auditUnsubscribe(); _auditUnsubscribe = null; }

  if (!silent) {
    document.getElementById("auditSpinner").classList.remove("hidden");
    document.getElementById("auditList").innerHTML =
      `<div class="flex items-center justify-center gap-3 py-12 text-white/30 text-sm">
        <div class="spinner"></div> Loading audit log…
      </div>`;
  }

  _auditUnsubscribe = db.collection("auditLogs")
    .orderBy("timestamp", "desc")
    .limit(500)
    .onSnapshot(
      snap => {
        allAuditLogs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        updateAuditBadge(allAuditLogs.length);
        renderAuditLog();
        document.getElementById("auditSpinner").classList.add("hidden");
      },
      err => {
        console.error("Audit snapshot error:", err);
        document.getElementById("auditList").innerHTML =
          `<div class="py-12 text-center text-red-400/60 text-sm">Failed to load audit log. Please refresh.</div>`;
        document.getElementById("auditSpinner").classList.add("hidden");
      }
    );
}

// ── Category tab switching ────────────────────────────────────────────────
function setAuditCategory(type) {
  auditCategoryFilter = type;
  auditActionFilter   = "all";
  auditPage           = 1;

  // Toggle category pills
  ["all","admin","professor"].forEach(c => {
    document.getElementById(`cpill-${c}`).classList.toggle("active", c === type);
  });

  // Show/hide action sub-pill rows
  const adminPills = document.getElementById("adminActionPills");
  const profPills  = document.getElementById("profActionPills");
  adminPills.classList.toggle("hidden", type !== "admin");
  profPills.classList.toggle("hidden",  type !== "professor");

  // Reset admin pill active states
  ["all","void_log","restore_log","block","unblock","wl_add","wl_remove"].forEach(a => {
    document.getElementById(`apill-${a}`).classList.toggle("active", a === "all");
  });
  // Reset professor pill active states
  ["all","prof_signin","prof_scan","prof_checkout"].forEach(a => {
    document.getElementById(`ppill-${a}`).classList.toggle("active", a === "all");
  });

  renderAuditLog();
}

function setAuditAction(type) {
  auditActionFilter = type;
  auditPage         = 1;
  ["all","void_log","restore_log","block","unblock","wl_add","wl_remove"].forEach(a => {
    document.getElementById(`apill-${a}`).classList.toggle("active", a === type);
  });
  renderAuditLog();
}

function setAuditProfAction(type) {
  auditActionFilter = type;
  auditPage         = 1;
  ["all","prof_signin","prof_scan","prof_checkout"].forEach(a => {
    document.getElementById(`ppill-${a}`).classList.toggle("active", a === type);
  });
  renderAuditLog();
}

// ── Render the audit timeline ─────────────────────────────────────────────
function renderAuditLog() {
  const searchQ = (document.getElementById("auditSearch")?.value || "").toLowerCase().trim();

  let rows = allAuditLogs;

  // Category filter first — narrows to admin or professor actions
  if (auditCategoryFilter === "admin")     rows = rows.filter(r => ADMIN_ACTIONS.has(r.action));
  else if (auditCategoryFilter === "professor") rows = rows.filter(r => PROF_ACTIONS.has(r.action));

  // Action sub-filter
  if (auditActionFilter !== "all") {
    rows = rows.filter(r => r.action === auditActionFilter);
  }

  // Filter by search string (admin email, target email, room, reason)
  if (searchQ) {
    rows = rows.filter(r =>
      (r.adminEmail       || "").toLowerCase().includes(searchQ) ||
      (r.professorEmail   || "").toLowerCase().includes(searchQ) ||
      (r.targetEmail      || "").toLowerCase().includes(searchQ) ||
      (r.roomNumber       || "").toLowerCase().includes(searchQ) ||
      (r.voidReason       || "").toLowerCase().includes(searchQ) ||
      (r.action           || "").toLowerCase().includes(searchQ)
    );
  }

  const total      = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / AUDIT_PAGE_SIZE));
  if (auditPage > totalPages) auditPage = totalPages;

  const start   = (auditPage - 1) * AUDIT_PAGE_SIZE;
  const pageRows = rows.slice(start, start + AUDIT_PAGE_SIZE);

  // Result count label
  document.getElementById("auditResultCount").innerHTML =
    total === 0
      ? `<span class="text-white/25">No entries found</span>`
      : `Showing <strong class="text-white/60">${start + 1}–${Math.min(start + AUDIT_PAGE_SIZE, total)}</strong> of <strong class="text-white/60">${total.toLocaleString()}</strong> entr${total !== 1 ? "ies" : "y"}`;

  // Summary stats bar (only when showing all actions, no search)
  renderAuditSummary(allAuditLogs);

  // Pagination
  document.getElementById("auditPrevPage").disabled = auditPage <= 1;
  document.getElementById("auditNextPage").disabled = auditPage >= totalPages;
  document.getElementById("auditPageInfo").textContent = total > 0 ? `Page ${auditPage} of ${totalPages}` : "";

  // Empty state
  const list = document.getElementById("auditList");
  if (pageRows.length === 0) {
    list.innerHTML = `
      <div class="py-14 text-center">
        <svg class="w-10 h-10 text-white/10 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
        </svg>
        <p class="text-white/25 text-sm">No audit entries match your filter.</p>
      </div>`;
    return;
  }

  list.innerHTML = pageRows.map((entry, idx) => {
    const meta = AUDIT_META[entry.action] || {
      label: entry.action, pillar: "restore", iconClass: "audit-restore",
      svg: `<path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>`
    };
    const isLast = idx === pageRows.length - 1;
    const ts     = entry.timestamp?.toDate
      ? entry.timestamp.toDate().toLocaleString("en-PH", { month:"short", day:"numeric", year:"numeric", hour:"2-digit", minute:"2-digit" })
      : "—";

    const detail = buildAuditDetail(entry);

    return `
    <div class="audit-row${isLast ? " last" : ""}" id="audit-entry-${entry.id}">
      <!-- Icon column -->
      <div class="audit-icon-wrap">
        <div class="audit-icon ${meta.iconClass}">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
            ${meta.svg}
          </svg>
        </div>
      </div>

      <!-- Content column -->
      <div class="min-w-0">
        <div class="flex items-start justify-between gap-2 flex-wrap mb-1">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="audit-pill ${meta.pillar}">${meta.label}</span>
            <span class="text-white/50 text-xs font-semibold truncate max-w-[200px]">${entry.professorEmail || entry.adminEmail || "—"}</span>
          </div>
          <span class="text-white/25 text-[11px] font-display shrink-0">${ts}</span>
        </div>
        <p class="text-white/45 text-xs leading-relaxed">${detail}</p>
      </div>
    </div>`;
  }).join("");
}

// ── Build the human-readable detail line for each action ─────────────────
function buildAuditDetail(entry) {
  const esc = s => String(s || "").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  switch (entry.action) {
    case "void_log":
      return `Voided log for <strong class="text-white/65">${esc(entry.professorEmail)}</strong>
              &mdash; Room <strong class="text-white/65">${esc(entry.roomNumber)}</strong>
              ${entry.voidReason
                ? `&mdash; Reason: <em class="text-red-400/70">"${esc(entry.voidReason)}"</em>`
                : '<span class="text-white/25">(no reason given)</span>'}`;

    case "restore_log":
      return `Restored voided log for <strong class="text-white/65">${esc(entry.professorEmail)}</strong>
              &mdash; Room <strong class="text-white/65">${esc(entry.roomNumber)}</strong>`;

    case "block":
      return `Blocked professor access for <strong class="text-white/65">${esc(entry.professorEmail)}</strong>`;

    case "unblock":
      return `Restored access for <strong class="text-white/65">${esc(entry.professorEmail)}</strong>`;

    case "wl_add":
      return `Added <strong class="text-white/65">${esc(entry.targetEmail)}</strong> to the email whitelist`;

    case "wl_remove":
      return `Removed <strong class="text-white/65">${esc(entry.targetEmail)}</strong> from the email whitelist`;

    case "wl_bulk":
      return `Bulk-added <strong class="text-white/65">${entry.count || "?"} email${(entry.count||0)!==1?"s":""}</strong> to the whitelist`;

    case "force_checkout":
      return `Force checked out <strong class="text-white/65">${esc(entry.professorEmail)}</strong> from room <strong class="text-white/65">${esc(entry.roomNumber)}</strong>`;

    case "role_switch":
      return `Switched role from <strong class="text-white/65">${esc(entry.fromRole)}</strong> to <strong class="text-white/65">${esc(entry.toRole)}</strong>`;

    case "promote_admin":
      return `Promoted <strong class="text-white/65">${esc(entry.professorEmail)}</strong> to <strong class="text-white/65">Admin</strong>`;

    case "prof_signin":
      return `<strong class="text-white/65">${esc(entry.professorEmail || entry.adminEmail)}</strong> signed in to the app`;

    case "prof_scan":
      return `<strong class="text-white/65">${esc(entry.professorEmail || entry.adminEmail)}</strong> checked in to room <strong class="text-white/65">${esc(entry.roomNumber)}</strong>`;

    case "prof_checkout":
      return `<strong class="text-white/65">${esc(entry.professorEmail || entry.adminEmail)}</strong> checked out of room <strong class="text-white/65">${esc(entry.roomNumber)}</strong>${entry.autoCheckout ? ' <span class="text-white/30 italic text-[10px]">(auto on sign-out)</span>' : ''}`;

    default:
      return `<span class="text-white/30 italic">${esc(entry.action)}</span>`;
  }
}

// ── Summary stats bar ─────────────────────────────────────────────────────
function renderAuditSummary(entries) {
  const bar = document.getElementById("auditSummaryRow");
  if (!entries.length) { bar.classList.add("hidden"); return; }

  const counts = {};
  entries.forEach(e => { counts[e.action] = (counts[e.action] || 0) + 1; });

  const chips = [
    ["void_log",     "Voids",      "text-red-400/70"],
    ["restore_log",  "Restores",   "text-emerald-400/70"],
    ["block",        "Blocks",     "text-amber-400/70"],
    ["unblock",      "Unblocks",   "text-blue-400/70"],
    ["wl_add",       "WL Adds",    "text-emerald-400/70"],
    ["wl_remove",    "WL Removes", "text-red-400/70"],
    ["wl_bulk",      "Bulk Adds",  "text-emerald-400/70"],
    ["prof_signin",  "Sign-ins",   "text-blue-300/70"],
    ["prof_scan",    "Scans",      "text-emerald-300/70"],
    ["prof_checkout","Check-outs", "text-purple-300/70"],
  ].filter(([k]) => counts[k]);

  if (!chips.length) { bar.classList.add("hidden"); return; }
  bar.classList.remove("hidden");
  bar.innerHTML = chips.map(([k, label, col]) =>
    `<span class="text-white/25 text-xs font-display">
       ${label}: <strong class="${col}">${counts[k]}</strong>
     </span>`
  ).join(`<span class="text-white/15">·</span>`);
}

// ── Pagination ────────────────────────────────────────────────────────────
function changeAuditPage(dir) {
  auditPage += dir;
  renderAuditLog();
  document.querySelector(".main-content").scrollTo({ top: 0, behavior: "smooth" });
}

// ── Sidebar badge ─────────────────────────────────────────────────────────
function updateAuditBadge(count) {
  const badge = document.getElementById("auditBadge");
  if (count > 0) {
    badge.textContent = count > 999 ? "999+" : count;
    badge.classList.remove("hidden");
  } else {
    badge.classList.add("hidden");
  }
}

// ── Export audit CSV ──────────────────────────────────────────────────────
function exportAuditCSV() {
  if (!allAuditLogs.length) { showToast("warning", "No audit entries to export."); return; }
  const headers = ["#","Action","Admin Email","Professor / Target","Room","Void Reason","Date","Time"];
  const lines   = allAuditLogs.map((e, i) => {
    const d = e.timestamp?.toDate ? e.timestamp.toDate() : new Date();
    const target = e.professorEmail || e.targetEmail || "";
    return [
      i + 1,
      e.action       || "",
      e.adminEmail   || "",
      target,
      e.roomNumber   || "",
      (e.voidReason  || "").replace(/,/g, ";"),
      d.toLocaleDateString(),
      d.toLocaleTimeString(),
    ].join(",");
  });
  const csv  = [headers.join(","), ...lines].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `neu-lab-audit-${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast("success", `Exported ${allAuditLogs.length} audit entr${allAuditLogs.length !== 1 ? "ies" : "y"}.`);
}