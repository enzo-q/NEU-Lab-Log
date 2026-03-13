// ═══ NEU Lab Log — Utility helpers (shared across dashboard modules) ═══
// formatTimestamp · truncateEmail · showToast

"use strict";

// ── Utilities ──────────────────────────────────────────────────────────────
function formatTimestamp(ts) {
  if (!ts?.toDate) return "—";
  return ts.toDate().toLocaleString("en-PH", { month:"short", day:"numeric", year:"numeric", hour:"2-digit", minute:"2-digit" });
}

function truncateEmail(email) {
  if (!email || email.length <= 28) return email;
  const [local, domain] = email.split("@");
  return `${local.slice(0,12)}…@${domain}`;
}

// ── Toast ───────────────────────────────────────────────────────────────────
let toastTimer = null;
function showToast(type, message) {
  const toast   = document.getElementById("toast");
  const content = document.getElementById("toastContent");

  const styles = {
    success: "bg-green-900/90 border border-green-500/30 text-green-200",
    error:   "bg-red-900/90 border border-red-500/30 text-red-200",
    warning: "bg-amber-900/90 border border-amber-500/30 text-amber-200",
  };
  const icons = {
    success: `<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>`,
    error:   `<path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>`,
    warning: `<path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>`,
  };

  content.className = `rounded-xl px-4 py-3 text-sm flex items-center gap-2.5 shadow-2xl min-w-[220px] backdrop-blur-md ${styles[type] || styles.success}`;
  content.innerHTML = `
    <svg class="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">${icons[type] || icons.success}</svg>
    <span>${message}</span>`;

  toast.classList.add("show");
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 3500);
}
