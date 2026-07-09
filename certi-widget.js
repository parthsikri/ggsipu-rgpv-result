/* ═══════════════════════════════════════════
   Apna Engineering – Certi Chamkao Widget script
   certi-widget.js – Unified Sticky Overlay
   ═══════════════════════════════════════════ */

(function() {
  // Get script source origin dynamically
  const scriptEl = document.currentScript || document.querySelector('script[src*="certi-widget.js"]');
  const scriptUrl = scriptEl ? new URL(scriptEl.src) : new URL(window.location.href);
  const WIDGET_API_BASE = scriptUrl.origin;

  // Inject CSS
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = WIDGET_API_BASE + '/certi-widget.css?v=' + Date.now();
  document.head.appendChild(link);

  // Inject Handwriting Fonts (Caveat + Alex Brush for calligraphic signature)
  const fontLink = document.createElement('link');
  fontLink.rel = 'stylesheet';
  fontLink.href = 'https://fonts.googleapis.com/css2?family=Alex+Brush&family=Caveat:wght@700&display=swap';
  document.head.appendChild(fontLink);

  // Inject html2canvas library for high-resolution image snapshots
  const html2canvasScript = document.createElement('script');
  html2canvasScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
  document.head.appendChild(html2canvasScript);

  // Inject DOM Elements
  const container = document.createElement('div');
  container.id = 'certi-widget-container';
  container.innerHTML = `
    <!-- Trigger Button -->
    <button id="certi-widget-trigger">
      <span>🏆 certi chamkao</span>
    </button>

    <!-- Modal Overlay -->
    <div id="certi-modal-overlay">
      <div id="certi-modal-content">
        <button id="certi-modal-close">&times;</button>
        
        <div class="wm-title">bhaiya ke imp topics se top kiya?</div>
        <div class="wm-sub">apna engineering lectures se concept chamkaya ya last-minute bhaiya ke topics ne bachaya? let us know how we helped & claim your official certificate!</div>

        <!-- Form -->
        <form class="wm-form" id="wmForm">
          <div class="wm-row">
            <div class="wm-item">
              <div class="wm-label">your name</div>
              <input class="wm-input" id="wmNameInput" type="text" placeholder="Name" required maxlength="30" readonly style="opacity:0.75;cursor:not-allowed;" />
            </div>
            <div class="wm-item">
              <div class="wm-label">enrollment number</div>
              <input class="wm-input" id="wmRollInput" type="text" placeholder="e.g. 01414803125" required maxlength="20" />
            </div>
          </div>

          <div class="wm-row">
            <div class="wm-item">
              <div class="wm-label">college name</div>
              <input class="wm-input" id="wmCollegeInput" type="text" placeholder="College name" required />
            </div>
            <div class="wm-item">
              <div class="wm-label">branch / programme</div>
              <input class="wm-input" id="wmBranchInput" type="text" placeholder="e.g. CSE, IT..." required />
            </div>
          </div>

          <div class="wm-row">
            <div class="wm-item" style="grid-column: span 2;">
              <div class="wm-label">cgpa secured</div>
              <input class="wm-input" id="wmCgpaInput" type="number" placeholder="CGPA" step="0.01" min="0" max="10" required readonly style="opacity:0.75;cursor:not-allowed;" />
            </div>
          </div>

          <div class="wm-item">
            <div class="wm-label">preparation source</div>
            <div class="wm-opt-grid">
              <div class="wm-opt-card selected" id="wm-opt-wallah">
                <div class="wm-opt-title">apna engineering wallah</div>
                <div class="wm-opt-desc">regular video lectures and updates.</div>
              </div>
              <div class="wm-opt-card" id="wm-opt-topics">
                <div class="wm-opt-title">bhaiya's imp topics</div>
                <div class="wm-opt-desc">last-minute important topics lists.</div>
              </div>
            </div>
          </div>

          <div class="wm-item">
            <div class="wm-label" style="line-height: 1.45;">how did we help? (min 50 chars — jitna jyaada likhoge bhaiya ko utni khushi milegi)</div>
            <textarea class="wm-input" id="wmExpInput" rows="2" placeholder="Tell us how we helped you prepare (minimum 50 characters)..." required minlength="50" style="resize:none;"></textarea>
          </div>

          <button class="wm-btn" type="submit">claim certificate</button>
        </form>

        <!-- Certificate Container -->
        <div class="wm-cert-box" id="wmCertDisplay">
          <img src="aew_logo.png" alt="Apna Engineering" style="width: 140px; height: auto; margin: 0 auto 1.25rem; display: block; border-radius: 8px;" />
          <div class="wm-cert-watermark">apna engineering</div>
          <div class="wm-cert-decor">official token of hustle</div>
          <div class="wm-cert-title">certificate of academic hustle</div>
          
          <div class="cert-presented" style="font-size:.78rem;color:#71717a;margin-bottom:.5rem;">this token is proudly presented to</div>
          <div class="wm-cert-name" id="wmCertName">vartika</div>
          
          <div class="wm-cert-desc">
            for securing a brilliant grade of <strong id="wmCertCgpa">9.14</strong> <strong>CGPA</strong> in <strong id="wmCertSem">sem-2 end term exams ipu</strong>.
          </div>

          <div id="wmCertCustomMsg" style="font-size:0.8rem;color:#f59e0b;font-style:italic;margin:-1rem auto 1.5rem;font-weight:700;letter-spacing:0.02em;text-transform:lowercase;line-height:1.4;max-width:440px;"></div>

          <div class="wm-cert-sigs">
            <div class="wm-cert-sig-block">
              <div class="wm-cert-sig-handwritten" style="color: #a5b4fc; transform: rotate(-1.5deg); font-size: 1.8rem; font-family: 'Alex Brush', cursive;">Verified</div>
              <div class="wm-cert-sig-line"></div>
              <div class="wm-cert-sig-name">apna engineering</div>
              <div class="wm-cert-sig-title">verification team</div>
            </div>
            <div class="wm-cert-sig-block">
              <div class="wm-cert-sig-handwritten" style="color: #818cf8; transform: rotate(-4deg); font-size: 2rem; font-family: 'Alex Brush', cursive;">Parth Sikri</div>
              <div class="wm-cert-sig-line"></div>
              <div class="wm-cert-sig-name">parth sikri</div>
              <div class="wm-cert-sig-title">founder, apna engineering</div>
            </div>
          </div>

          <div class="wm-cert-aewian">proud to be AEWian 💙</div>

          <div class="wm-cert-actions">
            <button class="wm-cert-action-btn primary" id="wmPrintBtn">Download Certificate (PNG)</button>
            <a class="wm-cert-action-btn" id="wmWaBtn" href="#" target="_blank">Share on WhatsApp</a>
          </div>
        </div>

        <!-- Leaderboard -->
        <div class="wm-lead-title">certified hustlers leaderboard</div>
        <div style="overflow-x:auto;">
          <table class="wm-lead-table">
            <thead>
              <tr>
                <th style="width: 60px;">rank</th>
                <th>name</th>
                <th style="width: 70px;">cgpa</th>
                <th>branch</th>
                <th>college</th>
                <th style="width: 140px;">prep source</th>
              </tr>
            </thead>
            <tbody id="wmLeadBody">
              <!-- Dynamically populated -->
            </tbody>
          </table>
        </div>

      </div>
    </div>
  `;
  document.body.appendChild(container);

  // References
  const trigger = document.getElementById('certi-widget-trigger');
  const overlay = document.getElementById('certi-modal-overlay');
  const closeBtn = document.getElementById('certi-modal-close');
  const form = document.getElementById('wmForm');
  const optWallah = document.getElementById('wm-opt-wallah');
  const optTopics = document.getElementById('wm-opt-topics');

  let activeSource = 'Apna Engineering Wallah';

  // Toggle Source Options
  optWallah.addEventListener('click', () => {
    activeSource = 'Apna Engineering Wallah';
    optWallah.classList.add('selected');
    optTopics.classList.remove('selected');
  });
  optTopics.addEventListener('click', () => {
    activeSource = "Bhaiya's Important Topics";
    optTopics.classList.add('selected');
    optWallah.classList.remove('selected');
  });

  // Show/Hide Modal
  trigger.addEventListener('click', () => {
    overlay.style.display = 'flex';
    document.body.classList.add('certi-modal-open');
    prefillForm();
    loadLeaderboard();
  });
  closeBtn.addEventListener('click', () => {
    overlay.style.display = 'none';
    document.body.classList.remove('certi-modal-open');
  });
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      overlay.style.display = 'none';
      document.body.classList.remove('certi-modal-open');
    }
  });

  // Pre-fill Logic
  function prefillForm() {
    try {
      const raw = localStorage.getItem('ggsipu_result_data');
      if (raw) {
        const data = JSON.parse(raw);
        if (data.studentInfo?.name) {
          document.getElementById('wmNameInput').value = data.studentInfo.name.toLowerCase();
        }
        if (data.studentInfo?.enrollment) {
          document.getElementById('wmRollInput').value = data.studentInfo.enrollment;
        }
        if (data.studentInfo?.college) {
          document.getElementById('wmCollegeInput').value = data.studentInfo.college.toLowerCase();
        }
        if (data.studentInfo?.programme) {
          document.getElementById('wmBranchInput').value = data.studentInfo.programme.toLowerCase();
        }
        if (data.cgpa) {
          document.getElementById('wmCgpaInput').value = data.cgpa;
        } else if (data.sgpa) {
          document.getElementById('wmCgpaInput').value = data.sgpa;
        }
      }
    } catch(e) {}
  }

  // Load Leaderboard
  async function loadLeaderboard() {
    try {
      const r = await fetch(WIDGET_API_BASE + '/api/leaderboard');
      const list = await r.json();
      const tbody = document.getElementById('wmLeadBody');
      tbody.innerHTML = list.map((student, i) => {
        let rankBadge = `#${i+1}`;
        if (i === 0) rankBadge = `<span style="color:#fbbf24;font-weight:900;">🥇 #1</span>`;
        if (i === 1) rankBadge = `<span style="color:#cbd5e1;font-weight:900;">🥈 #2</span>`;
        if (i === 2) rankBadge = `<span style="color:#cd7f32;font-weight:900;">🥉 #3</span>`;
        
        return `
          <tr>
            <td style="color:#6366f1;font-weight:800;vertical-align:top;padding-top:1rem;">${rankBadge}</td>
            <td style="text-transform:lowercase;font-weight:700;vertical-align:top;">
              <div style="font-size:0.85rem;color:#fff;">${student.name}</div>
              <div style="font-style:italic;color:#a1a1aa;font-size:0.72rem;font-weight:500;margin-top:4px;max-width:280px;white-space:normal;line-height:1.4;word-break:break-word;">"${student.experience}"</div>
            </td>
            <td style="font-family:monospace;font-weight:800;vertical-align:top;padding-top:1rem;">${(student.cgpa || student.sgpa || 0).toFixed(2)}</td>
            <td style="text-transform:lowercase;color:#a1a1aa;font-size:0.75rem;vertical-align:top;padding-top:1rem;">${student.branch || 'General'}</td>
            <td style="text-transform:lowercase;color:#a1a1aa;font-size:0.75rem;max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;vertical-align:top;padding-top:1rem;" title="${student.college || ''}">${student.college || 'Other'}</td>
            <td style="vertical-align:top;padding-top:1rem;"><span style="display:inline-block;padding:2px 6px;border-radius:4px;font-size:0.7rem;font-weight:700;background:#27272a;color:#a1a1aa;text-transform:lowercase;">${student.source}</span></td>
          </tr>
        `;
      }).join('');
      if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:#71717a;font-size:0.75rem;">no certified hustlers yet.</td></tr>`;
      }
    } catch(e) {
      console.error('Leaderboard fetch error:', e);
    }
  }

  // Handle Form Submit
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('wmNameInput').value.trim();
    const rollno = document.getElementById('wmRollInput').value.trim();
    const college = document.getElementById('wmCollegeInput').value.trim();
    const branch = document.getElementById('wmBranchInput').value.trim();
    const cgpa = parseFloat(document.getElementById('wmCgpaInput').value);
    const experience = document.getElementById('wmExpInput').value.trim();

    const payload = { name, rollno, college, branch, cgpa, experience, source: activeSource };

    try {
      const r = await fetch(WIDGET_API_BASE + '/api/certificate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const res = await r.json();
      if (res.success) {
        // Display Certificate card
        document.getElementById('wmCertName').textContent = name;
        document.getElementById('wmCertCgpa').textContent = cgpa.toFixed(2);

        // 1. Dynamic Semester Detection
        let semNum = 1;
        try {
          const raw = localStorage.getItem('ggsipu_result_data');
          if (raw) {
            const data = JSON.parse(raw);
            const activeSemObj = data.allSemesters.find(s => s.subjects[0]?.code === data.subjects[0]?.code);
            semNum = activeSemObj ? activeSemObj.semester : (data.allSemesters[data.allSemesters.length - 1]?.semester || 1);
          }
        } catch(err) {}
        document.getElementById('wmCertSem').textContent = `sem-${semNum} end term exams ipu`;

        // 2. Dynamic Classification (Gold, Silver, Normal)
        const wordCount = experience.split(/\s+/).filter(w => w.length > 0).length;
        
        let certType = 'normal';
        let customMsg = '';
        let decorText = 'official token of hustle';
        
        if (wordCount >= 100 || cgpa >= 9.5) {
          certType = 'gold';
          decorText = 'true loyal supporter & academic elite';
          customMsg = '"you are truely a loyal supporter. academic absolute beast. you are genuinely built different. keep cooking!"';
        } else if (wordCount >= 70 || cgpa >= 9.2) {
          certType = 'silver';
          decorText = 'outstanding contributor & academic star';
          customMsg = '"outstanding contributor & academic star. solid prep. clean execution. you are locking in and moving up."';
        } else {
          decorText = 'official token of hustle';
          if (cgpa >= 9.0) {
            customMsg = '"academic absolute beast. you are genuinely built different. keep cooking!"';
          } else if (cgpa >= 7.5) {
            customMsg = '"solid prep. clean execution. you are locking in and moving up."';
          } else {
            customMsg = '"saved by bhaiya\'s topics this time. next sem is a fresh start — let\'s lock in early!"';
          }
        }

        const certBox = document.getElementById('wmCertDisplay');
        certBox.className = 'wm-cert-box ' + (certType === 'gold' ? 'gold-cert' : (certType === 'silver' ? 'silver-cert' : ''));
        certBox.querySelector('.wm-cert-decor').textContent = decorText;
        document.getElementById('wmCertCustomMsg').textContent = customMsg;
        
        certBox.style.display = 'block';

        // Bind WhatsApp links
        const waMsg = `🎓 *Apna Engineering Hustle Certificate* 🎓\n\nMujhe mil gaya Apna Engineering Hustle Certificate *${cgpa.toFixed(2)}* CGPA secure karne ke liye, powered by *${activeSource}*! \n\nCheck yours here:\n${window.location.origin}/`;
        document.getElementById('wmWaBtn').href = `https://wa.me/?text=${encodeURIComponent(waMsg)}`;
        
        // Bind Exporter button
        document.getElementById('wmPrintBtn').onclick = () => {
          if (typeof html2canvas === 'undefined') {
            alert('Loading certificate exporter... please wait a second and try again.');
            return;
          }
          
          const certBox = document.getElementById('wmCertDisplay');
          const actions = certBox.querySelector('.wm-cert-actions');
          
          // Hide actions to prevent buttons in output image
          if (actions) actions.style.display = 'none';

          // Set temporary styles to avoid rounded-corner clipping or double borders
          const originalShadow = certBox.style.boxShadow;
          certBox.style.boxShadow = 'none';

          html2canvas(certBox, {
            backgroundColor: '#09090b',
            scale: 3, // Ultra-sharp 3x resolution for high-definition sharing!
            useCORS: true,
            logging: false,
            allowTaint: true
          }).then(canvas => {
            // Restore actions and shadow style
            if (actions) actions.style.display = 'flex';
            certBox.style.boxShadow = originalShadow;

            // Trigger direct PNG image file download
            const link = document.createElement('a');
            link.download = `${name.toLowerCase().replace(/\s+/g, '_')}_hustle_certificate.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
          }).catch(err => {
            console.error('Failed to export certificate image:', err);
            // Fallback to simple print
            if (actions) actions.style.display = 'flex';
            window.print();
          });
        };

        // Reload leaderboard list
        loadLeaderboard();
        
        // Scroll inside modal to certificate
        certBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    } catch(err) {
      alert('Could not submit. Ensure server is running.');
    }
  });

})();
