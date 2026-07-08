/* ═══════════════════════════════════════════
   bheede.js — Aaja Bheede standalone page
   ═══════════════════════════════════════════ */

const GRADE_THRESHOLDS = [
  { min: 90, grade: 'O',  gp: 10 },
  { min: 75, grade: 'A+', gp: 9  },
  { min: 65, grade: 'A',  gp: 8  },
  { min: 55, grade: 'B+', gp: 7  },
  { min: 50, grade: 'B',  gp: 6  },
  { min: 45, grade: 'C',  gp: 5  },
  { min: 40, grade: 'P',  gp: 4  },
  { min: 0,  grade: 'F',  gp: 0  },
];

// ── Load saved result data ──
let savedData = null;
try {
  const raw = localStorage.getItem('ggsipu_result_data');
  if (raw) savedData = JSON.parse(raw);
} catch(e) {}

// ── Guard: show no-data state if not logged in ──
if (!savedData) {
  document.getElementById('no-data-state').style.display = 'block';
  document.getElementById('bheede-main-form').style.display = 'none';
} else {
  // Pre-fill my name from result
  const nameEl = document.getElementById('myNameInput');
  if (nameEl && savedData.studentInfo?.name) {
    nameEl.value = savedData.studentInfo.name.split(' ')[0]; // first name
  }
}

// Global variable to hold message templates for switching tones
let currentMessages = {};

window.switchTone = function(tone) {
  const msg = currentMessages[tone];
  if (!msg) return;
  
  // Highlight active button
  document.querySelectorAll('.tone-pill').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-tone') === tone);
  });
  
  // Update WhatsApp link
  const container = document.getElementById('wa-button-container');
  if (container) {
    container.innerHTML = buildWaButton(msg);
  }
};

// ── Core compute ──
window.computeBheede = function() {
  if (!savedData) return;

  const myName     = document.getElementById('myNameInput').value.trim() || 'You';
  const friendName = document.getElementById('friendNameInput').value.trim() || 'friend';
  const friendSgpa = parseFloat(document.getElementById('friendSgpaInput').value);

  if (isNaN(friendSgpa) || friendSgpa < 0 || friendSgpa > 10) {
    document.getElementById('friendSgpaInput').focus();
    return;
  }

  const { subjects, sgpa: mySgpa } = savedData;
  const gap = +(friendSgpa - mySgpa).toFixed(2);

  // Pre-compute SGPA base
  let cwSum = 0, tcred = 0;
  for (const s of subjects) { tcred += s.credit; cwSum += s.credit * s.gp; }

  // ── For every theory subject find: next grade, pages needed, boost, efficiency ──
  const candidates = [];
  for (const s of subjects.filter(s => s.credit > 2)) {
    if (s.pct >= 90) continue;
    for (const t of GRADE_THRESHOLDS) {
      if (s.pct < t.min) {
        const missedMarks   = t.min - s.pct;
        const pages         = +(missedMarks / 2).toFixed(1);
        const potentialSgpa = +((cwSum + (t.gp - s.gp) * s.credit) / tcred).toFixed(3);
        const boost         = +(potentialSgpa - mySgpa).toFixed(3);
        if (boost <= 0) break;
        const efficiency    = boost / pages;
        candidates.push({ s, nextGrade: t.grade, missedMarks, pages, boost, potentialSgpa, efficiency });
        break;
      }
    }
  }

  // Sort by efficiency (most SGPA gain per page)
  candidates.sort((a, b) => b.efficiency - a.efficiency);
  const best = candidates[0];

  const resultEl = document.getElementById('bheede-page-result');
  resultEl.innerHTML = '';

  const cardEl = document.querySelector('.bheede-page-card');
  if (cardEl) cardEl.classList.add('comparison-active');

  // Get dynamic rivalry details
  const rivalry = getRivalryDetails(mySgpa, friendSgpa, gap);

  // Render comparative metrics panel
  const comparativePanelHtml = buildComparisonPanel(myName, friendName, mySgpa, friendSgpa, rivalry);

  // Build greedy combo logic
  let comboHtml = '';
  let totalPgs = 0;
  let comboLength = 0;
  let reached = false;
  let running = +mySgpa.toFixed(2);

  if (gap > 0 && candidates.length > 0) {
    const combo = [];
    const used  = new Set();

    for (const c of candidates) {
      if (running >= friendSgpa) break;
      if (used.has(c.s.code)) continue;
      const before = +running.toFixed(2);
      running      = +(running + c.boost).toFixed(2);
      combo.push({ ...c, before, after: running });
      used.add(c.s.code);
    }

    reached   = running >= friendSgpa;
    totalPgs  = +combo.reduce((a,c) => a + c.pages, 0).toFixed(1);
    comboLength = combo.length;

    const chainParts = [mySgpa.toFixed(2), ...combo.map(c => c.after.toFixed(2))];
    const chainStr   = chainParts.join(' → ');

    const stepCards = combo.map((c, i) => {
      const pStr  = c.pages % 1 === 0 ? c.pages : c.pages.toFixed(1);
      const arrow = i === 0 ? '' : `<div class="combo-arrow">↓</div>`;
      return `
      ${arrow}
      <div class="combo-step">
        <div class="combo-step-num">Step ${i+1}</div>
        <div class="combo-step-name">${c.s.name}</div>
        
        <div class="combo-step-instruction">
          Write <strong>${pStr} extra page${c.pages !== 1 ? 's' : ''}</strong> (need <strong>${c.missedMarks} mark${c.missedMarks !== 1 ? 's' : ''}</strong> more) to flip your grade from <strong>Grade ${c.s.grade}</strong> to <strong>Grade ${c.nextGrade}</strong>.
        </div>

        <div class="combo-sgpa-impact">
          <span>SGPA jumps:</span>
          <span class="combo-before">${c.before.toFixed(2)}</span>
          <span class="combo-arrow-inline"> → </span>
          <span class="combo-after">${c.after.toFixed(2)}</span>
          <span class="combo-boost-tag">+${c.boost}</span>
        </div>
      </div>`;
    }).join('');

    const tooMany = totalPgs > 15;

    comboHtml = `
    <div class="combo-section">
      <div class="combo-header">
        <div class="combo-header-title">Best Combination to ${reached ? 'Beat' : 'Close Gap with'} ${friendName}</div>
        <div class="combo-header-sub">${combo.length} subject${combo.length !== 1 ? 's' : ''} · ${totalPgs} pages total · ${reached ? 'Reaches target' : `Gets to ${running.toFixed(2)} (${(friendSgpa - running).toFixed(2)} short)`}</div>
      </div>
      <div class="combo-chain-bar">${chainStr}</div>

      ${tooMany ? `
        <div class="combo-too-many-card" id="combo-warning-box">
          <div class="combo-too-many-msg">bohot jyaada pages key/write karne padenge bhai (${totalPgs} pages total)</div>
          <button class="combo-reveal-btn" onclick="document.getElementById('combo-steps-wrapper').style.display='block'; document.getElementById('combo-warning-box').style.display='none';">still want to see the details?</button>
        </div>
      ` : ''}

      <div class="combo-steps" id="combo-steps-wrapper" style="${tooMany ? 'display: none;' : ''}">
        ${stepCards}
      </div>

      ${reached
        ? `<div class="combo-win-banner" style="margin-top: 1rem;">Write ${totalPgs} pages across these ${combo.length} subjects and you'd be at <strong>${running.toFixed(2)}</strong> — beating ${friendName}'s ${friendSgpa.toFixed(2)}</div>`
        : `<div class="combo-short-banner" style="margin-top: 1rem;">Even maxing all near-misses gets you to <strong>${running.toFixed(2)}</strong> — ${(friendSgpa - running).toFixed(2)} still short.</div>`
      }
    </div>`;
  }

  // Setup WhatsApp messaging templates for multiple tones
  currentMessages = getToneMessages(myName, friendName, mySgpa, friendSgpa, gap, best, totalPgs, reached, running);

  const toneSelectorHtml = `
    <div class="tone-selector-container">
      <div class="tone-selector-label">Choose WhatsApp message tone style:</div>
      <div class="tone-pills">
        <button class="tone-pill active" data-tone="default" onclick="switchTone('default')">Default</button>
        <button class="tone-pill" data-tone="toxic" onclick="switchTone('toxic')">Toxic Roast</button>
        <button class="tone-pill" data-tone="humble" onclick="switchTone('humble')">Fake Humility</button>
        <button class="tone-pill" data-tone="copium" onclick="switchTone('copium')">Pure Copium</button>
      </div>
    </div>
  `;

  const snakeCalloutHtml = `
    <div class="snake-callout-card" style="
      margin-top: 1.5rem;
      border: 2px solid #6366f1;
      background: linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(99, 102, 241, 0.02) 100%);
      padding: 1.5rem;
      border-radius: 12px;
      text-align: center;
      box-shadow: 0 10px 30px rgba(99, 102, 241, 0.15);
      position: relative;
      overflow: hidden;
    ">
      <div style="font-size: 1.8rem; margin-bottom: 0.5rem;">🐍</div>
      <div style="font-size: 1.05rem; font-weight: 900; color: #fff; margin-bottom: 0.4rem; text-transform: lowercase; letter-spacing: -0.02em;">expose your "snake" friend</div>
      <div style="font-size: 0.82rem; color: #a1a1aa; line-height: 1.5; margin-bottom: 1.25rem; text-transform: lowercase;">
        know that one friend who said "kuch nahi padha bro" but ended up topping? show them you're not lagging behind. choose a tone and drop the stats on them now!
      </div>
      <button onclick="document.querySelector('.wa-share-btn').click()" style="
        background: #fff;
        color: #000;
        border: none;
        padding: 10px 22px;
        border-radius: 8px;
        font-size: 0.82rem;
        font-weight: 900;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        transition: all 0.2s ease;
        text-transform: lowercase;
      " onmouseover="this.style.background='#e4e4e7'; this.style.transform='translateY(-1px)'" onmouseout="this.style.background='#fff'; this.style.transform='none'">
        share comparison roast 📲
      </button>
    </div>
  `;

  resultEl.innerHTML = `
    <div class="bheede-verdict-box ${rivalry.boxClass}">
      <div class="verdict-headline">${rivalry.title}</div>
      <div class="verdict-detail">${rivalry.summary}</div>
    </div>
    ${comparativePanelHtml}
    ${comboHtml}
    ${snakeCalloutHtml}
    ${toneSelectorHtml}
    <div id="wa-button-container" style="margin-top:0.75rem;">
      ${buildWaButton(currentMessages.default)}
    </div>
    <a class="back-link" href="index.html">← Back to my results</a>`;

  // Scroll to result
  resultEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

// ── Rivalry & Title Engine ──
function getRivalryDetails(mySgpa, friendSgpa, gap) {
  if (gap < 0) {
    const absMargin = Math.abs(gap).toFixed(2);
    if (absMargin >= 1.5) {
      return {
        title: "Absolute Sigma",
        boxClass: "verdict-win",
        summary: `You finished <strong>${absMargin}</strong> SGPA points ahead. Clear differential.`,
        funFact: "You are playing in a different league."
      };
    } else if (absMargin >= 0.5) {
      return {
        title: "Clean Win",
        boxClass: "verdict-win",
        summary: `You won by <strong>${absMargin}</strong> SGPA points. Victory achieved.`,
        funFact: "A solid margin."
      };
    } else {
      return {
        title: "Slim Victory",
        boxClass: "verdict-win",
        summary: `You won by <strong>${absMargin}</strong> SGPA points.`,
        funFact: "A win is a win."
      };
    }
  } else if (Math.abs(gap) < 0.05) {
    return {
      title: "Twin Energy",
      boxClass: "verdict-draw",
      summary: `Identical performance. You both scored with a mere <strong>${Math.abs(gap).toFixed(2)}</strong> gap.`,
      funFact: "Practically symmetric results."
    };
  } else {
    // Lose conditions
    if (gap >= 2.0) {
      return {
        title: "Skill Gap Identified",
        boxClass: "verdict-lose",
        summary: `They finished <strong>${gap.toFixed(2)}</strong> SGPA points ahead.`,
        funFact: "Work needed to close this difference next semester."
      };
    } else if (gap >= 0.8) {
      return {
        title: "Behind Target",
        boxClass: "verdict-lose",
        summary: `You are behind by <strong>${gap.toFixed(2)}</strong> SGPA points.`,
        funFact: "Time to lock in."
      };
    } else {
      return {
        title: "Close Margin",
        boxClass: "verdict-lose",
        summary: `You missed their SGPA by only <strong>${gap.toFixed(2)}</strong> points.`,
        funFact: "A minor margin of difference."
      };
    }
  }
}

// ── Build Comparison Dashboard HTML ──
function buildComparisonPanel(myName, friendName, mySgpa, friendSgpa, rivalry) {
  const max = Math.max(mySgpa, friendSgpa, 1);
  const myPct = (mySgpa / max) * 100;
  const friendPct = (friendSgpa / max) * 100;
  
  return `
    <div class="comp-panel">
      <div class="comp-title-bar">
        <span class="comp-title-label">HEAD-TO-HEAD COMPARISON</span>
        <span class="comp-rivalry-badge">${rivalry.title}</span>
      </div>
      
      <div class="comp-bars-container">
        <!-- Me bar -->
        <div class="comp-row">
          <div class="comp-row-header">
            <span class="comp-name" style="color: #fff; font-weight: 700;">${myName} (You)</span>
            <span class="comp-sgpa-val" style="color: #818cf8;">${mySgpa.toFixed(2)}</span>
          </div>
          <div class="comp-bar-bg" style="height: 8px; border-radius: 4px; background: rgba(0,0,0,0.3);">
            <div class="comp-bar-fill me-bar" style="width: ${myPct}%; height: 100%; border-radius: 4px; background: linear-gradient(90deg, #6366f1, #4f46e5); box-shadow: 0 0 8px rgba(99, 102, 241, 0.4);"></div>
          </div>
        </div>
        
        <!-- Friend bar -->
        <div class="comp-row">
          <div class="comp-row-header">
            <span class="comp-name">${friendName}</span>
            <span class="comp-sgpa-val">${friendSgpa.toFixed(2)}</span>
          </div>
          <div class="comp-bar-bg" style="height: 8px; border-radius: 4px; background: rgba(0,0,0,0.3);">
            <div class="comp-bar-fill friend-bar" style="width: ${friendPct}%; height: 100%; border-radius: 4px; background: linear-gradient(90deg, #52525b, #3f3f46);"></div>
          </div>
        </div>
      </div>
      
      <div class="comp-footer-fact">
        Analysis: <em>${rivalry.funFact}</em>
      </div>
    </div>
  `;
}

// ── Multi-tone Whatsapp Messaging System ──
function getToneMessages(me, friend, mySgpa, theirSgpa, gap, best, totalPgs, reached, running) {
  const win = mySgpa >= theirSgpa;
  const absGap = Math.abs(gap).toFixed(2);
  const bestPageStr = best ? (best.pages % 1 === 0 ? best.pages : best.pages.toFixed(1)) : '0';

  if (win) {
    return {
      default: `Aaja Bheede Result\n\nBhai sunle ${friend} 🐍, bolra tha fail ho jaega aur khud top karne chala tha? Mera SGPA *${mySgpa.toFixed(2)}* aur tera *${theirSgpa.toFixed(2)}* hai. That's +${absGap} in my favour.\n\nW is W. Clear victory fr fr.\n\nCompare yours here:\nhttp://localhost:5000/bheede.html`,
      toxic: `GET COOKED SAANP 🐍\n\nBhai ${friend}, scale check kar, 'kuch nahi padha' bolke top karne chale the? Mera SGPA *${mySgpa.toFixed(2)}* hai aur tera *${theirSgpa.toFixed(2)}*. \n\nGap is literally *${absGap}*. Next sem cheat sheets thoda aur details ke saath banana padega tereko.\n\nCheck stats:\nhttp://localhost:5000/bheede.html`,
      humble: `Humble Flex 🐍\n\nHey ${friend}, just checked the results. Mera SGPA *${mySgpa.toFixed(2)}* aaya and tera *${theirSgpa.toFixed(2)}*.\n\nSach bolu toh bilkul nahi padha tha, pure semester games khele. God's grace ig.\n\nCompare details:\nhttp://localhost:5000/bheede.html`,
      copium: `W is W 🐍\n\nBhai ${friend}, SGPA checking done. \nMera: *${mySgpa.toFixed(2)}*\nTera: *${theirSgpa.toFixed(2)}*\n\nSaanp ban ke chupke se padha fir bhi aage nahi nikal paya na. Best of luck for next sem! 👍\n\nhttp://localhost:5000/bheede.html`
    };
  } else if (Math.abs(gap) < 0.05) {
    return {
      default: `Aaja Bheede Result\n\n${me} vs ${friend} 🐍\nSGPA: *${mySgpa.toFixed(2)}* vs *${theirSgpa.toFixed(2)}*\n\nBhai hum basically twins hain. Bol rha tha kuch nahi padha, saari snake energy barabar ho gyi.\n\nCheck details:\nhttp://localhost:5000/bheede.html`,
      toxic: `Perfect Mirror 🐍\n\nOye ${friend}, SGPA score matches: *${mySgpa.toFixed(2)}* vs *${theirSgpa.toFixed(2)}*.\n\nBasically zero difference. Chalo dono saanp barabar scale pe hain.\n\nhttp://localhost:5000/bheede.html`,
      humble: `Close Match 🐍\n\nMera SGPA *${mySgpa.toFixed(2)}* and tera *${theirSgpa.toFixed(2)}*. We are on the same page bro. Let's study together next sem so we can both score higher!\n\nhttp://localhost:5000/bheede.html`,
      copium: `Twins Copium 🐍\n\nMera *${mySgpa.toFixed(2)}* aur tera *${theirSgpa.toFixed(2)}*. Honestly, rounding difference holds us back, otherwise I was clearly ahead. Accept it.\n\nhttp://localhost:5000/bheede.html`
    };
  } else {
    // Lose messages
    return {
      default: `Bhai tu itna bada saanp nikla ki National Geographic wale bhi documentary bana dein 🐍😭\n\nHar baar bolta tha "bhai lag gaye, fail ho jaunga"\n\nAur result ke baad pata chala banda chupke se top kar gaya 💀\n\nIdhar ${best ? best.s.name : 'one subject'} mein bas ${bestPageStr} pages aur likh deta toh SGPA ${best ? best.potentialSgpa.toFixed(2) : '9.18'} ho jaati 😭\n\nKoi na, agle sem tu topper nahi rahega... competition officially activate ho chuka hai 😈🔥\n\nCompare yours:\nhttp://localhost:5000/bheede.html`,
      toxic: `Bhai tu toh professional scammer nikla 😭🐍\n\nExam ke pehle:\n"bhai pakka fail"\n\nResult ke baad:\n*tops the class*\n\nYe wahi baat ho gayi ki aadmi lottery jeet ke bole "thoda sa profit hua hai" 💀\n\nWaise ${best ? best.s.name : 'one subject'} mein ${bestPageStr} pages aur likh deta toh SGPA ${best ? best.potentialSgpa.toFixed(2) : '9.18'} touch kar leti 😭\n\nAgle sem answer sheet bharne ki machine banke aaunga 😤🔥\n\nhttp://localhost:5000/bheede.html`,
      humble: `Bhai tera "fail ho jaunga" aur mera "kal se padhunga" dono ek hi category ke jhooth hain 😭💀\n\nHar baar rona-dhona karta tha aur chupke se topper nikla 🐍\n\nIdhar ${bestPageStr} pages ki kami ne ${best ? best.potentialSgpa.toFixed(2) : '9.18'} SGPA uda di 😭\n\nKoi na, agle sem comeback nahi... direct revenge arc shuru hoga 😈🔥\n\nhttp://localhost:5000/bheede.html`,
      copium: `Bhai tere "fail ho jaunga" wale statements par ab consumer court mein case hona chahiye 😭🐍\n\nFalse advertising ke charges lagenge 💀\n\nPoore sem tension di aur end mein topper nikla banda 📈\n\nBhai tu padhai ka Rohit Sharma nikla 😭\nPoora sem lagta hai out ho jayega...\nAur result ke time century thok deta hai 💀🔥\n\nhttp://localhost:5000/bheede.html`
    };
  }
}

function buildWaButton(msg) {
  const encoded = encodeURIComponent(msg);
  return `
  <a class="wa-share-btn" href="https://wa.me/?text=${encoded}" target="_blank">
    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.126 1.533 5.861L.057 23.625a.75.75 0 0 0 .916.917l5.814-1.484A11.945 11.945 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75a9.75 9.75 0 0 1-4.964-1.358l-.355-.212-3.681.940.957-3.593-.231-.372A9.75 9.75 0 1 1 12 21.75z"/></svg>
    Share on WhatsApp
  </a>`;
}
