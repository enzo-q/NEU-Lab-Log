// ═══ NEU Lab Log — QR Scanner: auth · camera · scan · cooldown · confetti ══

"use strict";


    // ── State ───────────────────────────────────────────────────
    let currentUser      = null;
    let html5QrCode      = null;
    let scanCooldown     = false;
    const COOLDOWN_MS    = 5000;
    let todayScans       = [];

    // ── DOM refs ────────────────────────────────────────────────
    const authGuard        = document.getElementById("authGuard");
    const signOutBtn       = document.getElementById("signOutBtn");
    const startBtn         = document.getElementById("startBtn");
    const stopBtn          = document.getElementById("stopBtn");
    const qrReader         = document.getElementById("qr-reader");
    const cameraPlaceholder= document.getElementById("cameraPlaceholder");
    const scanFrame        = document.getElementById("scanFrame");
    const successOverlay   = document.getElementById("successOverlay");
    const resultCard       = document.getElementById("resultCard");
    const liveIndicator    = document.getElementById("liveIndicator");
    const statusLabel      = document.getElementById("statusLabel");
    const cooldownSection  = document.getElementById("cooldownSection");
    const cooldownBar      = document.getElementById("cooldownBar");
    const cooldownCount    = document.getElementById("cooldownCount");
    const todayLogs        = document.getElementById("todayLogs");
    const confettiContainer= document.getElementById("confettiContainer");

    // ── Auth Guard ───────────────────────────────────────────────
    auth.onAuthStateChanged(async (user) => {
      if (!user) {
        window.location.href = "index.html";
        return;
      }

      try {
        const doc  = await db.collection("users").doc(user.uid).get();
        const data = doc.exists ? doc.data() : null;
        const allowed = data?.role === "professor" || data?.role === "admin";

        if (!data || !allowed || data.isBlocked === true) {
          await auth.signOut();
          window.location.href = "index.html";
          return;
        }
        currentUser = user;
        // Show "Switch to Admin" button for admins visiting the professor panel
        if (data.role === "admin") {
          const btn = document.getElementById("switchAdminBtn");
          if (btn) btn.classList.remove("hidden");
          const btnBottom = document.getElementById("switchAdminBtnBottom");
          if (btnBottom) btnBottom.style.display = "flex";
        }
        populateUserUI(user);
        loadTodayScans();
        authGuard.style.opacity = "0";
        setTimeout(() => authGuard.style.display = "none", 300);
      } catch (e) {
        console.error(e);
        window.location.href = "index.html";
      }
    });

    function populateUserUI(user) {
      document.getElementById("userName").textContent  = user.displayName || "Professor";
      document.getElementById("userEmail").textContent = user.email;
      const avatar = document.getElementById("userAvatar");
      if (user.photoURL) { avatar.src = user.photoURL; avatar.classList.remove("hidden"); }
    }

    // ── Sign Out ─────────────────────────────────────────────────
    signOutBtn.addEventListener("click", async () => {
      await stopScanner();

      // Auto-checkout any active session before signing out
      // so the room is freed and the session is properly closed
      try {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const snap = await db.collection("logs")
          .where("professorUid", "==", currentUser.uid)
          .get();
        const activeLog = snap.docs.find(doc => {
          const d  = doc.data();
          const ts = d.timestamp?.toDate ? d.timestamp.toDate() : null;
          return ts && ts >= todayStart && !d.logoutAt && d.isVoided !== true && d.invalid !== true;
        });
        if (activeLog) {
          const d = activeLog.data();
          await db.collection("logs").doc(activeLog.id).update({
            logoutAt: firebase.firestore.FieldValue.serverTimestamp(),
          });
          await db.collection("activeRooms").doc(d.roomNumber).delete().catch(() => {});
        }
      } catch(_) {}

      await auth.signOut();
      window.location.href = "index.html";
    });

    // ── Switch back to Admin ─────────────────────────────────────
    async function switchToAdmin() {
      await stopScanner();
      window.location.href = "dashboard.html";
    }

    // ── QR Scanner ───────────────────────────────────────────────
    startBtn.addEventListener("click", startScanner);
    stopBtn.addEventListener("click", stopScanner);

    async function startScanner() {
      if (html5QrCode) return;

      cameraPlaceholder.style.display = "none";
      scanFrame.classList.remove("hidden");
      startBtn.classList.add("hidden");
      stopBtn.classList.remove("hidden");
      updateStatus("scanning", "Scanning…");

      html5QrCode = new Html5Qrcode("qr-reader");

      try {
        await html5QrCode.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 220, height: 220 },
            aspectRatio: 1.333,
          },
          onScanSuccess,
          /* onScanFailure — fires on every failed frame, suppress */ () => {}
        );
      } catch (err) {
        console.error("Camera error:", err);
        showResultCard("error", "Camera Error", "Could not access camera. Please allow camera permissions and try again.");
        resetScanner();
      }
    }

    async function stopScanner() {
      if (!html5QrCode) return;
      try {
        await html5QrCode.stop();
        html5QrCode.clear();
      } catch (_) {}
      html5QrCode = null;
      resetScannerUI();
    }

    function resetScanner() {
      html5QrCode = null;
      resetScannerUI();
    }

    function resetScannerUI() {
      cameraPlaceholder.style.display = "";
      scanFrame.classList.add("hidden");
      startBtn.classList.remove("hidden");
      stopBtn.classList.add("hidden");
      updateStatus("ready", "Ready to Scan");
    }

    // ── On Scan Success ──────────────────────────────────────────
    async function onScanSuccess(decodedText) {
      if (scanCooldown) return;
      scanCooldown = true;

      const roomNumber = decodedText.trim();

      // Pause the scanner temporarily
      try { await html5QrCode.pause(); } catch(_) {}

      updateStatus("logging", "Checking room…");

      try {
        // ── Check if THIS professor already has any active session ──
        // Query their own logs (allowed by security rules) for today.
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const myLogsSnap = await db.collection("logs")
          .where("professorUid", "==", currentUser.uid)
          .get();

        const myActiveSession = myLogsSnap.docs.find(doc => {
          const d  = doc.data();
          const ts = d.timestamp?.toDate ? d.timestamp.toDate() : null;
          return ts && ts >= todayStart && !d.logoutAt && d.isVoided !== true && d.invalid !== true;
        });

        if (myActiveSession) {
          const occupiedRoom = myActiveSession.data().roomNumber;
          showResultCard("error",
            "Already Checked In",
            `You already have an active session in <strong>${occupiedRoom}</strong>. ` +
            `Please <a href="professor-dashboard.html" class="underline text-green-300">check out</a> first before scanning another room.`
          );
          updateStatus("ready", "Ready to Scan");
          scanCooldown = false;
          try { html5QrCode.resume(); } catch(_) {}
          return;
        }

        // ── Room occupancy check + atomic claim ─────────────────
        //
        // WHY A TRANSACTION:
        // A Firestore transaction reads a document, then writes atomically
        // only if the read data hasn't changed. If two professors scan the
        // same room at the same instant, Firestore detects the contention
        // and retries — only one will ultimately succeed.
        //
        // WHY RETURN-VALUE (not throw):
        // Throwing inside a transaction callback causes the Firestore SDK to
        // retry the callback. After max retries the SDK wraps the error in a
        // FirebaseError, losing our custom .message property. Using a return
        // value avoids retries for business-logic "occupied" results while
        // still letting real Firestore errors propagate normally.
        const activeRoomRef = db.collection("activeRooms").doc(roomNumber);
        let logDocId = null;

        // txnResult shape: { ok: true } | { ok: false, self: bool }
        let txnResult;
        try {
          txnResult = await db.runTransaction(async (txn) => {
            const activeRoomDoc = await txn.get(activeRoomRef);

            if (activeRoomDoc.exists) {
              // Room is occupied — return WITHOUT throwing so the SDK does
              // not retry this as an error. The transaction aborts cleanly.
              const occupant = activeRoomDoc.data();
              return { ok: false, self: occupant.professorUid === currentUser.uid };
            }

            // Room is free — atomically write the log and claim the room.
            const logRef = db.collection("logs").doc();
            logDocId = logRef.id;

            txn.set(logRef, {
              professorUid:   currentUser.uid,
              professorEmail: currentUser.email,
              roomNumber:     roomNumber,
              timestamp:      firebase.firestore.FieldValue.serverTimestamp(),
            });

            txn.set(activeRoomRef, {
              professorUid:   currentUser.uid,
              professorEmail: currentUser.email,
              logDocId:       logDocId,
              roomNumber:     roomNumber,
              timestamp:      firebase.firestore.FieldValue.serverTimestamp(),
            });

            return { ok: true };
          });

        } catch (txnErr) {
          // Only real Firestore errors (network, permissions, etc.) reach here.
          throw txnErr;
        }

        // ── Handle transaction result ─────────────────────────────
        if (!txnResult.ok) {
          if (txnResult.self) {
            showResultCard("error",
              "Already Checked In",
              `You already have an active session in <strong>${roomNumber}</strong>. ` +
              `Please <a href="professor-dashboard.html" class="underline text-green-300">check out</a> first before scanning again.`
            );
          } else {
            showResultCard("error",
              "Room Occupied",
              `<strong>${roomNumber}</strong> is currently occupied by another professor. ` +
              `Please wait until they check out or choose a different room.`
            );
          }
          updateStatus("ready", "Ready to Scan");
          scanCooldown = false;
          try { html5QrCode.resume(); } catch(_) {}
          return;
        }

        // ── Transaction succeeded — room claimed ────────────────
        updateStatus("logging", "Logged!");

        // Show success UI
        triggerSuccess(roomNumber, logDocId);

        // Log QR scan activity to audit (fire-and-forget)
        db.collection("auditLogs").add({
          action: "prof_scan", professorEmail: currentUser.email, professorUid: currentUser.uid,
          roomNumber, logDocId,
          timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        }).catch(e => console.error("[Audit] prof_scan write failed:", e.message));

        // Add to local today's log view
        addToTodayLogs(roomNumber);

      } catch (err) {
        console.error("Firestore write error:", err);
        showResultCard("error", "Log Failed", "Could not save your usage record. Please check your connection and try again.");
        updateStatus("ready", "Ready to Scan");
        scanCooldown = false;
        try { html5QrCode.resume(); } catch(_) {}
        return;
      }

      // ── Cooldown ─────────────────────────────────────────────
      startCooldown();
    }

    // ── Success UI ───────────────────────────────────────────────
    function triggerSuccess(roomNumber, logId) {
      successOverlay.classList.remove("hidden");
      spawnConfetti();
      updateStatus("success", "Logged!");

      showResultCard("success", `Checked in to Room ${roomNumber}`,
        `Your check-in to <strong>${roomNumber}</strong> has been recorded. <br/>
         <span class="text-green-300/70 text-xs">${new Date().toLocaleTimeString()}</span>`,
        logId, roomNumber
      );

      // Hide success overlay after 1.5s, then resume scanner after cooldown
      setTimeout(() => {
        successOverlay.classList.add("hidden");
      }, 1500);
    }

    function showResultCard(type, title, body, logId, roomNumber) {
      resultCard.classList.remove("hidden");
      resultCard.classList.add("slide-up");

      const colors = {
        success: { bg:"bg-green-500/10", border:"border-green-500/20", icon:"text-green-400", title:"text-green-300" },
        error:   { bg:"bg-red-500/10",   border:"border-red-500/20",   icon:"text-red-400",   title:"text-red-300"   },
      };
      const c = colors[type] || colors.success;

      const iconPath = type === "success"
        ? `<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>`
        : `<path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>`;

      const sessionLink = (type === "success" && logId)
        ? `<a href="professor-dashboard.html" class="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-green-500/15 hover:bg-green-500/25 text-green-300 text-xs font-bold font-display transition-colors border border-green-500/25 hover:border-green-500/40">
             <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
               <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
             </svg>
             View My Session &amp; Check Out →
           </a>`
        : "";

      resultCard.className = `glass-card rounded-2xl p-5 slide-up border ${c.border} ${c.bg}`;
      resultCard.innerHTML = `
        <div class="flex items-start gap-3">
          <svg class="w-5 h-5 mt-0.5 shrink-0 ${c.icon}" fill="currentColor" viewBox="0 0 20 20">${iconPath}</svg>
          <div class="flex-1">
            <p class="font-display font-semibold text-sm ${c.title}">${title}</p>
            <p class="text-white/50 text-xs mt-1 leading-relaxed">${body}</p>
            ${sessionLink}
          </div>
        </div>`;

      // Animate in freshly
      void resultCard.offsetWidth;
    }

    // ── Cooldown Bar ─────────────────────────────────────────────
    function startCooldown() {
      cooldownSection.classList.remove("hidden");
      cooldownBar.style.width = "100%";
      let remaining = COOLDOWN_MS / 1000;
      cooldownCount.textContent = `${remaining}s`;

      const interval = setInterval(() => {
        remaining -= 1;
        cooldownCount.textContent = `${remaining}s`;
        cooldownBar.style.width = `${(remaining / (COOLDOWN_MS / 1000)) * 100}%`;
        if (remaining <= 0) {
          clearInterval(interval);
          cooldownSection.classList.add("hidden");
          cooldownBar.style.width = "100%";
          scanCooldown = false;
          updateStatus("scanning", "Scanning…");
          try { html5QrCode && html5QrCode.resume(); } catch(_) {}
        }
      }, 1000);
    }

    // ── Status UI ────────────────────────────────────────────────
    function updateStatus(state, label) {
      statusLabel.textContent = label;
      const colors = {
        ready:   "bg-white/40",
        scanning:"bg-green-400",
        logging: "bg-amber-400",
        success: "bg-green-400",
      };
      liveIndicator.className = `w-2 h-2 rounded-full live-pulse ${colors[state] || colors.ready}`;
    }

    // ── Today's Log Display ──────────────────────────────────────
    function loadTodayScans() {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      // Single equality filter only — no composite index required.
      // Date filtering and sorting are handled client-side.
      db.collection("logs")
        .where("professorUid", "==", currentUser?.uid || "__none__")
        .onSnapshot((snap) => {
          const all = snap.docs.map(d => d.data());
          todayScans = all
            .filter(s => {
              const ts = s.timestamp?.toDate ? s.timestamp.toDate() : null;
              return ts && ts >= todayStart;
            })
            .sort((a, b) => {
              const ta = a.timestamp?.toDate ? a.timestamp.toDate().getTime() : 0;
              const tb = b.timestamp?.toDate ? b.timestamp.toDate().getTime() : 0;
              return tb - ta;
            })
            .slice(0, 5);
          renderTodayLogs();
        }, () => {});
    }

    function addToTodayLogs(roomNumber) {
      todayScans.unshift({ roomNumber, timestamp: { toDate: () => new Date() } });
      if (todayScans.length > 5) todayScans.pop();
      renderTodayLogs();
    }

    function renderTodayLogs() {
      if (todayScans.length === 0) {
        todayLogs.innerHTML = `<p class="text-white/25 text-xs text-center py-4">No scans yet today.</p>`;
        return;
      }
      todayLogs.innerHTML = todayScans.map(s => {
        const time = s.timestamp?.toDate ? s.timestamp.toDate().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) : "Just now";
        return `
          <div class="flex items-center justify-between py-2 border-b border-white/05 last:border-0">
            <div class="flex items-center gap-2">
              <div class="w-1.5 h-1.5 rounded-full bg-gold-400 shrink-0"></div>
              <span class="text-white/80 text-xs font-semibold">${s.roomNumber}</span>
            </div>
            <span class="text-white/30 text-xs">${time}</span>
          </div>`;
      }).join("");
    }

    // ── Confetti ──────────────────────────────────────────────────
    function spawnConfetti() {
      confettiContainer.innerHTML = "";
      const colors = ["#D4A820","#E8BC30","#10B981","#ffffff","#1B4F9E"];
      for (let i = 0; i < 24; i++) {
        const el = document.createElement("div");
        el.className = "confetti-piece";
        const x = (Math.random() - 0.5) * 300;
        const y = -(Math.random() * 200 + 50);
        el.style.cssText = `
          left: 50%; top: 50%;
          background: ${colors[Math.floor(Math.random() * colors.length)]};
          --end-pos: translate(${x}px, ${y}px);
          animation-delay: ${Math.random() * 0.3}s;
          animation-duration: ${0.8 + Math.random() * 0.6}s;
          width: ${4 + Math.random() * 8}px;
          height: ${4 + Math.random() * 8}px;
        `;
        confettiContainer.appendChild(el);
      }
    }
    // ── PWA: Register Service Worker ────────────────────────────
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("sw.js").catch(() => {});
    }