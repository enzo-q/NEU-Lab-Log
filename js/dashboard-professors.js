// ═══ NEU Lab Log — Professor Access Tab: Whitelist + Block/Unblock ════════

"use strict";

// ══════════════════════════════════════════════════════════════════════════
// PROFESSOR ACCESS MANAGEMENT  (unified whitelist + block/unblock)
// ══════════════════════════════════════════════════════════════════════════

const ALLOWED_DOMAIN = "@neu.edu.ph";
function emailToKey(email) { return email.toLowerCase().trim().replace(/\./g, "_"); }
function keyToEmail(key)   { return key.replace(/_/g, "."); }

// ── Load both collections in parallel ────────────────────────────────────
async function loadProfessorsTab() {
  document.getElementById("professorsSpinner").classList.remove("hidden");
  try {
    const [wlSnap, profSnap, adminSnap] = await Promise.all([
      db.collection("allowedEmails").get(),
      db.collection("users").where("role","==","professor").get(),
      db.collection("users").where("role","==","admin").get(),
    ]);
    allWhitelist  = wlSnap.docs.map(d => ({ key: d.id, ...d.data() }));
    // Combine professors and admins — so promoted users still appear in the table
    allProfessors = [
      ...profSnap.docs.map(d => ({ uid: d.id, ...d.data() })),
      ...adminSnap.docs.map(d => ({ uid: d.id, ...d.data() })),
    ];
    updateProfessorsCountBadge();
    renderProfessorsTable();
  } catch(e) {
    console.error("Load professors tab error:", e);
    showToast("error", "Failed to load professor data. Please refresh.");
  }
  document.getElementById("professorsSpinner").classList.add("hidden");
}

// ── Render unified table ──────────────────────────────────────────────────
function renderProfessorsTable() {
  const query = (document.getElementById("profSearch")?.value || "").toLowerCase().trim();
  const label = document.getElementById("professorsCountLabel");
  if (label) label.textContent = `${allWhitelist.length} professor${allWhitelist.length !== 1 ? "s" : ""} whitelisted`;

  // Whitelist is the source of truth; enrich each entry with user-doc data
  let list = allWhitelist.map(w => {
    const prof = allProfessors.find(p => (p.email||"").toLowerCase() === (w.email||"").toLowerCase());
    return {
      key:         w.key,
      email:       w.email || keyToEmail(w.key),
      addedBy:     w.addedBy  || "",
      addedAt:     w.addedAt  || null,
      uid:         prof?.uid         || null,
      displayName: prof?.displayName || null,
      isBlocked:   prof?.isBlocked   === true,
      isAdmin:     prof?.role        === "admin",
      hasSignedIn: !!prof,
    };
  });

  if (query) list = list.filter(p =>
    (p.email||"").toLowerCase().includes(query) ||
    (p.displayName||"").toLowerCase().includes(query)
  );

  const tbody = document.getElementById("professorsTableBody");
  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="text-center py-10 text-white/25 text-sm">
      ${query ? "No professors match your search." : "No professors whitelisted yet. Add one above."}
    </td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(p => {
    const initials    = (p.email||"?")[0].toUpperCase();
    const displayName = p.displayName || p.email?.split("@")[0] || "Professor";
    const showEmail   = !!p.displayName;
    const addedAt = p.addedAt?.toDate
      ? p.addedAt.toDate().toLocaleString("en-PH", { month:"short", day:"numeric", year:"numeric", hour:"2-digit", minute:"2-digit" })
      : "—";

    // Status badge
    let statusBadge;
    if (!p.hasSignedIn) {
      statusBadge = `<span class="badge badge-blue" title="Whitelisted but has not signed in yet">Pending</span>`;
    } else if (p.isBlocked) {
      statusBadge = `<span id="badge-${p.uid}" class="badge badge-red">Blocked</span>`;
    } else {
      statusBadge = `<span id="badge-${p.uid}" class="badge badge-green">Active</span>`;
    }

    // Block / Unblock — only once the professor has signed in (uid exists)
    const blockBtn = p.hasSignedIn ? `
      <button id="toggle-btn-${p.uid}" onclick="toggleBlock('${p.uid}', ${p.isBlocked})"
        class="px-2.5 py-1.5 rounded-lg text-xs font-bold font-display transition-all whitespace-nowrap
          ${p.isBlocked
            ? 'bg-green-500/15 hover:bg-green-500/25 text-green-400 border border-green-500/30'
            : 'bg-amber-500/12 hover:bg-amber-500/22 text-amber-400/80 hover:text-amber-300 border border-amber-500/25'}">
        ${p.isBlocked ? "Unblock" : "Block"}
      </button>
      ${p.isAdmin
        ? `<span class="badge badge-blue" title="Already an admin">Admin</span>`
        : `<button onclick="promoteToAdmin('${p.uid}', '${p.email}')"
            class="px-2.5 py-1.5 rounded-lg text-xs font-bold font-display transition-all whitespace-nowrap bg-blue-500/10 hover:bg-blue-500/20 text-blue-300/70 hover:text-blue-300 border border-blue-500/20"
            title="Grant this professor admin access">
            Make Admin
          </button>`
      }` :
      `<span class="text-white/20 text-[10px] italic px-1">not signed in</span>`;

    return `
    <tr id="prof-row-${p.key}">
      <td>
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-full bg-navy-700 border border-white/10 flex items-center justify-center text-xs font-bold text-gold-400 font-display shrink-0">
            ${initials}
          </div>
          <div class="min-w-0">
            <p class="text-white/80 text-sm font-semibold leading-tight">${displayName}</p>
            ${showEmail ? `<p class="text-white/35 text-xs leading-tight truncate">${p.email}</p>` : ""}
          </div>
        </div>
      </td>
      <td>${statusBadge}</td>
      <td>
        <p class="text-white/40 text-xs">${addedAt}</p>
        ${p.addedBy ? `<p class="text-white/22 text-[10px] mt-0.5">by ${p.addedBy}</p>` : ""}
      </td>
      <td class="text-right">
        <div class="flex items-center justify-end gap-2">
          ${blockBtn}
          <button onclick="removeProfessor('${p.key}')"
            id="prof-remove-btn-${p.key}"
            class="px-2.5 py-1.5 rounded-lg text-xs font-bold font-display transition-all bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/25 whitespace-nowrap">
            Remove
          </button>
        </div>
      </td>
    </tr>`;
  }).join("");
}

// ── Add single email ──────────────────────────────────────────────────────
async function addToWhitelist() {
  const input = document.getElementById("whitelistEmailInput");
  const email = input.value.trim().toLowerCase();
  if (!email) { showToast("warning", "Please enter an email address."); return; }
  if (!email.endsWith(ALLOWED_DOMAIN)) { showToast("error", `Only ${ALLOWED_DOMAIN} emails can be added.`); return; }
  const key = emailToKey(email);
  if (allWhitelist.some(w => w.key === key)) { showToast("warning", "This email is already on the whitelist."); return; }
  try {
    const entry = { email, addedBy: currentUser.email, addedAt: firebase.firestore.FieldValue.serverTimestamp() };
    await db.collection("allowedEmails").doc(key).set(entry);
    allWhitelist.unshift({ key, ...entry, addedAt: { toDate: () => new Date() } });
    renderProfessorsTable();
    updateProfessorsCountBadge();
    input.value = "";
    showToast("success", `${email} added to whitelist.`);
    writeAudit("wl_add", { targetEmail: email });
  } catch(e) {
    console.error("Add whitelist error:", e);
    showToast("error", "Failed to add email. Please try again.");
  }
}

// ── Bulk add ──────────────────────────────────────────────────────────────
async function bulkAddToWhitelist() {
  const raw    = document.getElementById("bulkEmailInput").value;
  const emails = raw.split(/[\n,]+/).map(e => e.trim().toLowerCase()).filter(e => e.length > 0);
  if (emails.length === 0) { showToast("warning", "No emails found. Paste emails separated by commas or new lines."); return; }
  const invalid = emails.filter(e => !e.endsWith(ALLOWED_DOMAIN));
  const valid   = emails.filter(e =>  e.endsWith(ALLOWED_DOMAIN));
  const newOnes = valid.filter(e => !allWhitelist.some(w => w.key === emailToKey(e)));
  if (invalid.length > 0) showToast("warning", `${invalid.length} email(s) skipped — not @neu.edu.ph addresses.`);
  if (newOnes.length === 0) { showToast("warning", "All valid emails are already on the whitelist."); return; }
  try {
    const batch = db.batch();
    const now   = firebase.firestore.FieldValue.serverTimestamp();
    newOnes.forEach(email => {
      batch.set(db.collection("allowedEmails").doc(emailToKey(email)), { email, addedBy: currentUser.email, addedAt: now });
    });
    await batch.commit();
    newOnes.forEach(email => {
      allWhitelist.unshift({ key: emailToKey(email), email, addedBy: currentUser.email, addedAt: { toDate: () => new Date() } });
    });
    renderProfessorsTable();
    updateProfessorsCountBadge();
    document.getElementById("bulkEmailInput").value = "";
    showToast("success", `${newOnes.length} email${newOnes.length > 1 ? "s" : ""} added to whitelist.`);
    writeAudit("wl_bulk", { count: newOnes.length, emails: newOnes.join(", ").slice(0, 500) });
  } catch(e) {
    console.error("Bulk add error:", e);
    showToast("error", "Bulk add failed. Please try again.");
  }
}

// ── Remove professor — deletes from whitelist, removes from local caches ──
async function removeProfessor(key) {
  const btn = document.getElementById(`prof-remove-btn-${key}`);
  if (btn) { btn.innerHTML = `<div class="spinner spinner-sm mx-auto"></div>`; btn.disabled = true; }
  try {
    const entry        = allWhitelist.find(w => w.key === key);
    const removedEmail = entry?.email || keyToEmail(key);
    await db.collection("allowedEmails").doc(key).delete();
    // Remove from both local caches — the merged row vanishes immediately
    allWhitelist  = allWhitelist.filter(w => w.key !== key);
    allProfessors = allProfessors.filter(p => (p.email||"").toLowerCase() !== removedEmail.toLowerCase());
    renderProfessorsTable();
    updateProfessorsCountBadge();
    showToast("success", `${removedEmail} removed. They can no longer sign in.`);
    writeAudit("wl_remove", { targetEmail: removedEmail });
  } catch(e) {
    console.error("Remove professor error:", e);
    showToast("error", "Failed to remove professor. Please try again.");
    if (btn) { btn.innerHTML = "Remove"; btn.disabled = false; }
  }
}

// ── Block / Unblock ───────────────────────────────────────────────────────
async function toggleBlock(uid, currentlyBlocked) {
  const newBlocked   = !currentlyBlocked;
  const btn          = document.getElementById(`toggle-btn-${uid}`);
  const originalHTML = btn.innerHTML;
  btn.innerHTML = `<div class="spinner spinner-sm mx-auto"></div>`;
  btn.disabled  = true;
  try {
    await db.collection("users").doc(uid).update({ isBlocked: newBlocked });
    const idx = allProfessors.findIndex(u => u.uid === uid);
    if (idx !== -1) allProfessors[idx].isBlocked = newBlocked;
    const badge = document.getElementById(`badge-${uid}`);
    if (badge) { badge.className = `badge ${newBlocked ? "badge-red" : "badge-green"}`; badge.textContent = newBlocked ? "Blocked" : "Active"; }
    btn.innerHTML = newBlocked ? "Unblock" : "Block";
    btn.className = `px-2.5 py-1.5 rounded-lg text-xs font-bold font-display transition-all whitespace-nowrap ${
      newBlocked
        ? "bg-green-500/15 hover:bg-green-500/25 text-green-400 border border-green-500/30"
        : "bg-amber-500/12 hover:bg-amber-500/22 text-amber-400/80 hover:text-amber-300 border border-amber-500/25"}`;
    btn.onclick  = () => toggleBlock(uid, newBlocked);
    btn.disabled = false;
    showToast("success", `Professor has been ${newBlocked ? "blocked" : "unblocked"} successfully.`);
    const profEmail = allProfessors.find(u => u.uid === uid)?.email || uid;
    writeAudit(newBlocked ? "block" : "unblock", { professorUid: uid, professorEmail: profEmail });
  } catch(e) {
    console.error("Toggle block error:", e);
    btn.innerHTML = originalHTML;
    btn.disabled  = false;
    showToast("error", "Failed to update user status. Please try again.");
  }
}

// ── Sidebar badge ─────────────────────────────────────────────────────────
function updateProfessorsCountBadge() {
  const badge = document.getElementById("professorsCountBadge");
  if (!badge) return;
  badge.textContent = allWhitelist.length;
  badge.classList.toggle("hidden", allWhitelist.length === 0);
}

// ── Promote professor to Admin ────────────────────────────────────────────
async function promoteToAdmin(uid, email) {
  if (!confirm(`Grant admin access to ${email}?\n\nThey will be able to access the admin dashboard on their next sign-in. This cannot be undone from this panel.`)) return;
  try {
    // Set role: 'admin' and isAdmin: true on the professor's doc.
    // Admin writing ANOTHER user's doc — not a circular read, works fine.
    await db.collection("users").doc(uid).update({
      role:    "admin",
      isAdmin: true,
    });

    // Remove from local allProfessors so they disappear from the table
    allProfessors = allProfessors.filter(p => p.uid !== uid);
    renderProfessorsTable();

    showToast("success", `${email} has been granted admin access.`);
    writeAudit("promote_admin", { professorUid: uid, professorEmail: email });
  } catch(e) {
    console.error("promoteToAdmin error:", e);
    showToast("error", "Failed to promote user. Please try again.");
  }
}