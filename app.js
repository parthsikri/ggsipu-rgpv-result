/* ═══════════════════════════════════════════
   Apna Engineering – GGSIPU Result Analyzer
   app.js – Full Build v12
   ═══════════════════════════════════════════ */

const API = window.location.origin + '/api';
let currentData = null;

let dynamicCredits = {};
async function loadDynamicCredits() {
  try {
    const res = await fetch(`${API}/credits`);
    dynamicCredits = await res.json();
  } catch(e) {
    console.error('Failed to load dynamic credits:', e);
  }
}

// ─────────────────────────────────────────────
//  GRADE / GP HELPERS
// ─────────────────────────────────────────────
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

function gradeFromPct(pct) {
  for (const t of GRADE_THRESHOLDS) if (pct >= t.min) return t.grade;
  return 'F';
}
function gpFromPct(pct) {
  for (const t of GRADE_THRESHOLDS) if (pct >= t.min) return t.gp;
  return 0;
}

// ─────────────────────────────────────────────
//  SUBJECT CREDITS MAP
// ─────────────────────────────────────────────
const SUBJECT_CREDITS = {
  'BS101':4,'BS102':4,'BS103':4,'BS104':4,'BS105':4,'BS106':4,'BS107':4,'BS108':4,
  'BS109':3,'BS110':3,'BS111':4,'BS112':4,'BS113':3,'BS114':3,
  'ES101':4,'ES102':4,'ES103':4,'ES104':4,'ES105':4,'ES106':4,'ES107':4,'ES108':4,
  'ES109':4,'ES110':4,'ES111':4,'ES112':4,'ES113':4,'ES114':4,
  'ES151':1,'ES152':1,'ES153':1,'ES154':1,'ES155':1,'ES156':1,'ES157':1,'ES158':1,
  'HS101':3,'HS102':3,'HS103':3,'HS104':3,'HS105':3,'HS106':3,
  'HS107':3,'HS108':3,'HS109':3,'HS110':3,'HS111':3,'HS112':3,'HS113':3,'HS116':2,
  'CIC201':4,'CIC203':4,'CIC205':4,'CIC207':4,'CIC209':4,'CIC211':4,
  'CIC251':1,'CIC253':1,'CIC255':1,'CIC257':1,
  'ECC201':4,'ECC203':4,'ECC205':3,'ECC207':4,'ECC209':4,'ECC211':4,
  'ES201':4,'HS203':2,
};

// ─────────────────────────────────────────────
//  CAPTCHA
// ─────────────────────────────────────────────
// ─────────────────────────────────────────────
//  UNIVERSITY SELECT DYNAMICS
// ─────────────────────────────────────────────
function onUniversityChange() {
  const uni = document.getElementById('universitySelect').value;
  const passwordGroup = document.getElementById('passwordGroup');
  const passwordInput = document.getElementById('password');
  const semesterGroup = document.getElementById('semesterGroup');
  const rgpvOptsGroup = document.getElementById('rgpvOptsGroup');
  
  const logo = document.getElementById('uniLogo');
  const uniName = document.getElementById('uniName');
  const uniSub = document.getElementById('uniSub');
  const landingSub = document.getElementById('landingSub');

  if (uni === 'rgpv') {
    // RGPV config
    passwordGroup.style.display = 'none';
    passwordInput.required = false;
    semesterGroup.style.display = 'block';
    rgpvOptsGroup.style.display = 'flex';
    
    logo.src = 'rgpvlogo.png';
    logo.style.display = 'block';
    uniName.textContent = 'Rajiv Gandhi Proudyogiki Vishwavidyalaya';
    uniSub.textContent = 'RGPV Exam Portal — Results Verification';
    if (landingSub) landingSub.textContent = 'Enter your RGPV enrollment number and captcha below to fetch your marksheet instantly.';
  } else {
    // GGSIPU config
    passwordGroup.style.display = 'block';
    passwordInput.required = true;
    semesterGroup.style.display = 'none';
    rgpvOptsGroup.style.display = 'none';
    
    logo.src = 'ggsipulogo.png';
    logo.style.display = 'block';
    uniName.textContent = 'Guru Gobind Singh Indraprastha University';
    uniSub.textContent = 'Examination Portal — Secure Access';
    if (landingSub) landingSub.textContent = 'Enter your GGSIPU credentials below to fetch your marksheet instantly.';
  }
  
  loadCaptcha();
}

// Attach callback to window for global access
window.onUniversityChange = onUniversityChange;

// ─────────────────────────────────────────────
//  CAPTCHA
// ─────────────────────────────────────────────
async function loadCaptcha() {
  const img = document.getElementById('captchaImg');
  const loading = document.getElementById('captchaLoading');
  const refreshBtn = document.getElementById('refreshBtn');
  const uni = document.getElementById('universitySelect')?.value || 'ggsipu';
  
  if (!img) return;
  if (loading) loading.style.display = 'flex';
  if (img) img.style.display = 'none';
  if (refreshBtn) refreshBtn.disabled = true;
  
  try {
    let route;
    if (uni === 'rgpv') {
      const prog = document.getElementById('programSelect')?.value || '24';
      route = `rgpv/captcha?program=${prog}`;
    } else {
      route = 'captcha';
    }
    const r = await fetch(`${API}/${route}${route.includes('?') ? '&' : '?'}t=${Date.now()}`);
    const d = await r.json();
    if (d.sessionId) document.getElementById('sessionId').value = d.sessionId;
    if (d.captchaImage) {
      img.src = d.captchaImage;
      img.style.display = 'block';
    }
  } catch(e) {
    console.error('Captcha error:', e);
  } finally {
    if (loading) loading.style.display = 'none';
    if (refreshBtn) refreshBtn.disabled = false;
  }
}

// ─────────────────────────────────────────────
//  LOGIN / SEARCH
// ─────────────────────────────────────────────
document.getElementById('loginForm')?.addEventListener('submit', async function(e) {
  e.preventDefault();
  const btn      = document.getElementById('loginBtn');
  const spinner  = document.getElementById('loginSpinner');
  const btnText  = document.getElementById('loginBtnText');
  const errEl    = document.getElementById('loginError');
  
  const uni          = document.getElementById('universitySelect').value;
  const enrollmentNo = document.getElementById('enrollNo').value.trim();
  const captcha      = document.getElementById('captchaInput').value.trim();
  const sessionId    = document.getElementById('sessionId').value;

  errEl.style.display = 'none';
  btn.disabled = true;
  spinner.style.display = 'block';
  btnText.textContent = 'Fetching...';

  try {
    let response;
    if (uni === 'rgpv') {
      const semester = document.getElementById('semesterSelect').value;
      const program = document.getElementById('programSelect').value;
      const scheme = document.getElementById('schemeSelect').value;
      response = await fetch(`${API}/rgpv/result`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enrollmentNo, semester, program, scheme, captcha, sessionId }),
      });
    } else {
      const password = document.getElementById('password').value.trim();
      response = await fetch(`${API}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enrollmentNo, username: enrollmentNo, password, captcha, sessionId }),
      });
    }
    
    const d = await response.json();
    if (!d.success) {
      errEl.innerHTML = `
        ⚠️ ${d.error || 'Fetch failed. Please try again.'}<br/>
        <a href="#" onclick="loadCaptcha();this.closest('.error-msg').style.display='none';return false;"
           style="color:#a78bfa;text-decoration:underline;">Click here to try again</a>
      `;
      errEl.style.display = 'block';
      loadCaptcha();
      return;
    }
    parseAndRender(d, enrollmentNo);
  } catch(err) {
    errEl.innerHTML = `
      ⚠️ Could not connect to the server. Make sure the server is running.<br/>
      <a href="#" onclick="loadCaptcha();this.closest('.error-msg').style.display='none';return false;"
         style="color:#a78bfa;text-decoration:underline;">Click here to try again</a>
    `;
    errEl.style.display = 'block';
  } finally {
    btn.disabled = false;
    spinner.style.display = 'none';
    btnText.textContent = 'Fetch My Results';
  }
});

// ─────────────────────────────────────────────
//  PARSE RESULT
// ─────────────────────────────────────────────
// Grade to GP mapping for RGPV grading system (10-point scale)
const RGPV_GRADE_GP  = { 'O': 10, 'A+': 9, 'A': 8, 'B+': 7, 'B': 6, 'C+': 5.5, 'C': 5, 'D': 4, 'F': 0, 'I': 0, 'W': 0 };
// Grade to approximate percentage (midpoint of range)
const RGPV_GRADE_PCT = { 'O': 92, 'A+': 82, 'A': 72, 'B+': 62, 'B': 56, 'C+': 52, 'C': 48, 'D': 45, 'F': 30, 'I': 0, 'W': 0 };

function parseAndRender(d, enrollmentNo) {
  const resultJson = d.resultJson || d.data || d.result || d;

  // ── RGPV format detection ──────────────────────────────────────────
  // RGPV returns allSemesters[] with grade-based subjects (no stresult)
  if (resultJson && resultJson.allSemesters && Array.isArray(resultJson.allSemesters)) {
    const p = resultJson.stprofile || {};
    const studentInfo = {
      name:       p.stname || 'Student',
      enrollment: p.nrollno || enrollmentNo,
      programme:  p.prgname || 'B.Tech',
      college:    p.iname   || 'RGPV Affiliated College',
    };

    // Map RGPV subjects to the internal format (credit/gp/pct/result etc.)
    const allSemesters = resultJson.allSemesters.map(sd => {
      const subjects = (sd.subjects || []).map(s => {
        const gradeKey = (s.grade || '').toUpperCase().trim();
        const credit   = parseInt(s.credits) || parseInt(s.credit) || 3;
        const gp       = RGPV_GRADE_GP[gradeKey] !== undefined ? RGPV_GRADE_GP[gradeKey] : 0;
        const pct      = RGPV_GRADE_PCT[gradeKey] !== undefined ? RGPV_GRADE_PCT[gradeKey] : 0;
        const isFail   = gradeKey === 'F' || gradeKey === 'I' || gradeKey === 'W';
        return {
          code:     s.code || '',
          name:     s.name || s.code || 'Subject',
          credit,
          grade:    gradeKey,
          gp,
          pct,
          result:   isFail ? 'F' : 'P',
          // RGPV doesn't split marks; synthesise internal/external for display
          internal: Math.round(pct * 0.4),
          external: Math.round(pct * 0.6),
          total:    pct,
          max:      100,
        };
      });

      // Re-compute SGPA from credits & grade points (use server value as fallback)
      let tc = 0, wp = 0;
      for (const s of subjects) { tc += s.credit; wp += s.credit * s.gp; }
      const sgpa = tc > 0 ? Math.round((wp / tc) * 100) / 100 : (parseFloat(sd.sgpa) || 0);

      return { semester: parseInt(sd.semester), subjects, sgpa };
    });

    // Overall CGPA
    let totalCGPACredits = 0, totalCGPAPoints = 0;
    for (const sd of allSemesters) {
      for (const s of sd.subjects) {
        totalCGPACredits += s.credit;
        totalCGPAPoints  += s.credit * s.gp;
      }
    }
    const cgpa = totalCGPACredits > 0
      ? Math.round((totalCGPAPoints / totalCGPACredits) * 100) / 100
      : (parseFloat(resultJson.cgpa) || 0);

    const latest = allSemesters[allSemesters.length - 1] || { semester: 1, subjects: [], sgpa: 0 };
    // Use the server-provided SGPA/CGPA as the authoritative values for RGPV
    const serverSgpa = parseFloat(resultJson.allSemesters[resultJson.allSemesters.length - 1]?.sgpa) || latest.sgpa;
    const serverCgpa = parseFloat(resultJson.cgpa) || cgpa;
    currentData = {
      studentInfo,
      subjects: latest.subjects,
      sgpa: serverSgpa,
      cgpa: serverCgpa,
      allSemesters,
      isRGPV: true,
    };
    try { localStorage.setItem('ggsipu_result_data', JSON.stringify(currentData)); } catch(e) {}
    renderDashboard(currentData);
    return;
  }

  // ── GGSIPU format (stresult row-based) ────────────────────────────
  if (!resultJson || (!resultJson.stresult && !resultJson.stprofile)) {
    const errEl = document.getElementById('loginError');
    errEl.innerHTML = `
      ⚠️ Result data could not be fetched. The portal may be down or your session expired.<br/>
      <a href="#" onclick="loadCaptcha();this.closest('.error-msg').style.display='none';return false;"
         style="color:#a78bfa;text-decoration:underline;">Click here to try again</a>
    `;
    errEl.style.display = 'block';
    return;
  }

  const p = resultJson.stprofile || {};
  const studentInfo = {
    name:       p.stname || 'Student',
    enrollment: p.nrollno || enrollmentNo,
    programme:  p.prgname ? p.prgname.replace('BACHELOR OF TECHNOLOGY', 'B.Tech') : 'B.Tech',
    college:    p.iname   || 'GGSIPU Affiliated College',
  };

  // Group by semester
  const semMap = {};
  for (const row of (resultJson.stresult || [])) {
    const sem = parseInt(row[0]) || 1;
    const total    = parseInt(row[5]) || 0;
    const max      = 100;
    const pct      = Math.round((total / max) * 100);
    const grade    = gradeFromPct(pct);
    const gp       = gpFromPct(pct);
    const result   = gp > 0 ? 'P' : 'F';

    const codeKey  = String(row[1]).trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    let credit     = dynamicCredits[codeKey] !== undefined ? dynamicCredits[codeKey] : SUBJECT_CREDITS[codeKey];
    if (credit === undefined) {
      const nl = String(row[2]).toLowerCase();
      credit = (nl.includes('lab') || nl.includes('practical') || nl.includes('nues')) ? 1 : 3;
    }

    if (!semMap[sem]) semMap[sem] = [];
    semMap[sem].push({
      code: row[1], name: row[2],
      credit, internal: parseInt(row[3]) || 0, external: parseInt(row[4]) || 0,
      total, max, grade, gp, result, pct,
    });
  }

  // Calculate SGPA per semester & overall CGPA
  let totalCGPACredits = 0, totalCGPAPoints = 0;
  const allSemesters = Object.keys(semMap).sort((a,b)=>+a-+b).map(semStr => {
    const sem      = +semStr;
    const subjects = semMap[sem];
    let tc = 0, wp = 0;
    for (const s of subjects) { tc += s.credit; wp += s.credit * s.gp; }
    totalCGPACredits += tc;
    totalCGPAPoints  += wp;
    const sgpa = tc > 0 ? Math.round((wp/tc)*100)/100 : 0;
    return { semester: sem, subjects, sgpa };
  });

  const cgpa = totalCGPACredits > 0
    ? Math.round((totalCGPAPoints/totalCGPACredits)*100)/100
    : 0;

  const latest = allSemesters[allSemesters.length - 1] || { semester:1, subjects:[], sgpa:0 };

  currentData = { studentInfo, subjects: latest.subjects, sgpa: latest.sgpa, cgpa, allSemesters };

  // Save to localStorage for bheede.html
  try { localStorage.setItem('ggsipu_result_data', JSON.stringify(currentData)); } catch(e) {}

  renderDashboard(currentData);
}

// ─────────────────────────────────────────────
//  RENDER DASHBOARD
// ─────────────────────────────────────────────
function renderDashboard(data) {
  const { studentInfo, subjects, sgpa, cgpa, isRGPV } = data;

  document.getElementById('results-section').style.display  = 'block';
  document.getElementById('insights-section').style.display = 'block';
  setTimeout(() => document.getElementById('results-section').scrollIntoView({ behavior:'smooth' }), 100);

  // Student info
  const initials = studentInfo.name.split(' ').slice(0,2).map(w=>w[0]).join('');
  document.getElementById('studentAvatar').textContent = initials || '?';
  document.getElementById('studentName').textContent   = studentInfo.name;
  document.getElementById('studentMeta').textContent   = `Enrollment: ${studentInfo.enrollment} | Branch: ${studentInfo.programme}`;
  document.getElementById('studentBatch').textContent  = `College: ${studentInfo.college}`;

  // KPIs — RGPV uses grade-point system; no raw marks
  const failCount  = subjects.filter(s => s.result === 'F' || s.gp === 0).length;
  const passCount  = subjects.filter(s => s.result === 'P' && s.gp > 0).length;

  document.getElementById('kpiSgpa').textContent = sgpa ? sgpa.toFixed(2) : '—';
  document.getElementById('kpiCgpa').textContent = cgpa ? cgpa.toFixed(2) : '—';

  if (isRGPV) {
    // RGPV percentage = CGPA * 10 (standard RGPV formula)
    const rgpvPct = cgpa ? Math.round(cgpa * 10) + '%' : '—';
    document.getElementById('kpiPercent').textContent = rgpvPct;
  } else {
    const totalMarks = subjects.reduce((a,s)=>a+s.total,0);
    const maxMarks   = subjects.reduce((a,s)=>a+s.max,0);
    document.getElementById('kpiPercent').textContent = maxMarks > 0 ? Math.round((totalMarks/maxMarks)*100)+'%' : '—';
  }

  const statusEl = document.getElementById('kpiStatus');
  if (statusEl) {
    if (failCount === 0 && passCount > 0) {
      statusEl.innerHTML = '<span style="color:#22c55e;">PASS ✅</span>';
    } else if (failCount > 0) {
      statusEl.innerHTML = `<span style="color:#ef4444; font-weight: 700;">${failCount} BACK ⚠️</span>`;
    } else {
      statusEl.textContent = '—';
    }
  }
  document.getElementById('kpiSubjects').textContent = subjects.length || '—';

  // Semester tabs
  if (data.allSemesters && data.allSemesters.length > 1) {
    document.getElementById('semSelector').style.display = 'flex';
    document.getElementById('semTabs').innerHTML = data.allSemesters.map(sd => {
      const isActive = sd.subjects === data.subjects ? 'active' : '';
      return `<button class="sem-tab ${isActive}" onclick="loadSem(${sd.semester})">
        Sem ${sd.semester} <span style="opacity:.6;font-size:.7rem;">(${sd.sgpa.toFixed(2)})</span>
      </button>`;
    }).join('');
  } else {
    document.getElementById('semSelector').style.display = 'none';
  }

  if (isRGPV) {
    // RGPV: render grade-based cards; no near-miss (no raw marks available)
    renderRGPVSubjectCards(subjects);
    renderRGPVInsights(subjects, sgpa, cgpa);
  } else {
    // GGSIPU: full near-miss + insights pipeline
    const { cwSum, tcred, nearMisses } = computeNearMisses(subjects);
    renderSubjectCards(subjects, nearMisses);
    renderInsights(subjects, sgpa, cwSum, tcred, nearMisses);
  }

  // Next-semester recommendations (both universities)
  const latestSem = Math.max(...data.allSemesters.map(s => s.semester));
  renderRecommendations(data.allSemesters, data.cgpa, data.studentInfo.programme, latestSem);

  // Initialize Comeback Planner
  initComebackPlanner(data);
}

// ─────────────────────────────────────────────
//  LOAD SEM
// ─────────────────────────────────────────────
window.loadSem = function(semNum) {
  if (!currentData) return;
  const sd = currentData.allSemesters.find(s => s.semester === semNum);
  if (!sd) return;
  currentData.subjects = sd.subjects;
  currentData.sgpa     = sd.sgpa;

  document.querySelectorAll('.sem-tab').forEach(t => {
    t.classList.toggle('active', t.textContent.trim().startsWith('Sem '+semNum));
  });

  // Calculate cumulative CGPA up to this semester semNum
  let cgpaUpTo = currentData.cgpa; // Fallback
  const semsUpTo = currentData.allSemesters.filter(s => s.semester <= semNum);
  
  let totalCredits = 0;
  let totalPoints = 0;
  
  semsUpTo.forEach(sem => {
    let semCredits = 0;
    let semPoints = 0;
    sem.subjects.forEach(sub => {
      const cr = sub.credit || sub.credits || 3;
      semCredits += cr;
      semPoints += cr * (sub.gp || 0);
    });
    if (semCredits > 0) {
      totalCredits += semCredits;
      totalPoints += semPoints;
    } else {
      totalCredits += 1;
      totalPoints += sem.sgpa;
    }
  });

  if (totalCredits > 0) {
    if (currentData.isRGPV) {
      cgpaUpTo = sd.cgpa || (totalPoints / totalCredits);
    } else {
      cgpaUpTo = Math.round((totalPoints / totalCredits) * 100) / 100;
    }
  }

  // Update SGPA and CGPA KPIs on top
  document.getElementById('kpiSgpa').textContent = sd.sgpa ? sd.sgpa.toFixed(2) : '—';
  document.getElementById('kpiCgpa').textContent = cgpaUpTo ? cgpaUpTo.toFixed(2) : '—';

  // Update Percentage KPI
  if (currentData.isRGPV) {
    const rgpvPct = sd.sgpa ? Math.round(sd.sgpa * 10) + '%' : '—';
    document.getElementById('kpiPercent').textContent = rgpvPct;
  } else {
    const totalMarks = sd.subjects.reduce((a,s)=>a+s.total,0);
    const maxMarks   = sd.subjects.reduce((a,s)=>a+s.max,0);
    document.getElementById('kpiPercent').textContent = maxMarks > 0 ? Math.round((totalMarks/maxMarks)*100)+'%' : '—';
  }

  // Update Status KPI (semester-specific)
  const failCount  = sd.subjects.filter(s => s.result === 'F' || s.gp === 0).length;
  const passCount  = sd.subjects.filter(s => s.result === 'P' && s.gp > 0).length;
  const statusEl = document.getElementById('kpiStatus');
  if (statusEl) {
    if (failCount === 0 && passCount > 0) {
      statusEl.innerHTML = '<span style="color:#22c55e;">PASS ✅</span>';
    } else if (failCount > 0) {
      statusEl.innerHTML = `<span style="color:#ef4444; font-weight: 700;">${failCount} BACK ⚠️</span>`;
    } else {
      statusEl.textContent = '—';
    }
  }

  // Update Subjects KPI
  document.getElementById('kpiSubjects').textContent = sd.subjects.length || '—';

  if (currentData.isRGPV) {
    renderRGPVSubjectCards(sd.subjects);
    renderRGPVInsights(sd.subjects, sd.sgpa, cgpaUpTo);
  } else {
    const { cwSum, tcred, nearMisses } = computeNearMisses(sd.subjects);
    renderSubjectCards(sd.subjects, nearMisses);
    renderInsights(sd.subjects, sd.sgpa, cwSum, tcred, nearMisses);
  }

  // Update recommendations dynamically for the next semester of selected semester
  renderRecommendations(currentData.allSemesters, cgpaUpTo, currentData.studentInfo.programme, semNum);
};

// ─────────────────────────────────────────────
//  NEAR MISS CORE
// ─────────────────────────────────────────────
function computeNearMisses(subjects) {
  let cwSum = 0, tcred = 0;
  for (const s of subjects) { tcred += s.credit; cwSum += s.credit * s.gp; }

  const nearMisses = [];
  for (const s of subjects) {
    if (s.credit < 2 || s.pct >= 90) continue;

    // Find the NEAREST grade boundary just above the student's score.
    // GRADE_THRESHOLDS is sorted highest→lowest [90,75,65,55,50,45,40,0]
    // Iterate in REVERSE (lowest→highest) to find the first t.min > s.pct
    let nearest = null;
    for (let i = GRADE_THRESHOLDS.length - 1; i >= 0; i--) {
      if (GRADE_THRESHOLDS[i].min > s.pct) {
        nearest = GRADE_THRESHOLDS[i];
        break;
      }
    }
    if (!nearest) continue;

    const missedMarks   = nearest.min - s.pct;
    const pages         = +(missedMarks / 2).toFixed(1);
    const potentialSgpa = +((cwSum + (nearest.gp - s.gp) * s.credit) / tcred).toFixed(3);
    const boost         = +(potentialSgpa - (cwSum / tcred)).toFixed(3);

    if (boost > 0 && missedMarks <= 4) {
      nearMisses.push({ s, nextGrade: nearest.grade, missedMarks, pages, boost, potentialSgpa });
    }
  }

  nearMisses.sort((a, b) => a.pages - b.pages);
  return { cwSum, tcred, nearMisses };
}


// ─────────────────────────────────────────────
//  SUBJECT CARDS
// ─────────────────────────────────────────────
const INTERNAL_REMARKS = [
  'teacher se banake rakho 🙏',
  'assignments never hurt 😅',
  'internals can save you fr',
  'bhaiya/didi se notes le lo 😭',
  'attendance bhi count hoti hai bro',
  'practical file on time dena 💀',
];

// Low-internal specific remarks
const LOW_EXT_REMARKS = [
  'externals ne le li 😑',
  'exam hall mein thoda aur likhte',
  'bhai externals dekh ke dil dukha 💔',
  'theory thoda aur padh lena next sem',
];

// High internals matrix arrays (85%+)
const HIGH_INT_EXC_EXT = [
  'absolute topper behavior! cooked in both internals & externals 🌟',
  'sheet check karne wala bhi hairaan ho gaya! clean sweep 💯',
  'outstanding score, bhaiya is proud of you! 🔥',
];
const HIGH_INT_AVG_EXT = [
  'internals ne bacha liya, decent performance! 📈',
  'teacher ke solid support + average externals prep = saved!',
  'internals safe early game built, externals stable.',
];
const HIGH_INT_LOW_EXT = [
  'internals safe parts, par externals ne game kharab kar diya 💔',
  'internals aag the, externals paani ho gaya! next sem theory lock in 🔒',
  'clutch internally, choked in externals. brush up theory!',
];

// Average internals matrix arrays (70% - 84.9%)
const AVG_INT_EXC_EXT = [
  'clutch in externals! end-term mein aag laga di 🔥',
  'exam hall mein topper mode activate ho gaya tha kya? 🚀',
  'internals average the par externals mein full back up!',
];
const AVG_INT_AVG_EXT = [
  'decent performance across the board. thoda aur consistent raho bhai 🧑‍🏫',
  'safe play, par potential bohot zyada hai next sem lock-in!',
  'steady prep, stable score. room for growth!',
];
const AVG_INT_LOW_EXT = [
  'externals ne le li, average internals se kaam nahi chala 😑',
  'bhai externals dekh ke dil dukha, target theory next sem!',
  'shaky externals performance. focus on bhaiya\'s topics early!',
];

function getInternalRemark(s, isBestTheory) {
  if (s.credit < 2) return null;
  if (isBestTheory) {
    return 'teacher se toh dost banliye 🤝';
  }
  
  const intMax = s.max === 100 ? 40 : 30;
  const intPct = (s.internal / intMax) * 100;
  
  // 1. Low internals (< 60%)
  if (intPct < 60) {
    const idx = Math.abs(s.name.charCodeAt(0) + s.name.length) % INTERNAL_REMARKS.length;
    return INTERNAL_REMARKS[idx];
  }
  
  const extMax = s.max === 100 ? 60 : 70;
  const extPct = (s.external / extMax) * 100;
  const hashVal = Math.abs(s.name.charCodeAt(0) + s.name.length);

  // 2. High internals (>= 85%)
  if (intPct >= 85) {
    if (extPct >= 80) {
      return HIGH_INT_EXC_EXT[hashVal % HIGH_INT_EXC_EXT.length];
    } else if (extPct >= 55) {
      return HIGH_INT_AVG_EXT[hashVal % HIGH_INT_AVG_EXT.length];
    } else {
      return HIGH_INT_LOW_EXT[hashVal % HIGH_INT_LOW_EXT.length];
    }
  }
  
  // 3. Average internals (70% to 84.9%)
  if (intPct >= 70) {
    if (extPct >= 80) {
      return AVG_INT_EXC_EXT[hashVal % AVG_INT_EXC_EXT.length];
    } else if (extPct >= 55) {
      return AVG_INT_AVG_EXT[hashVal % AVG_INT_AVG_EXT.length];
    } else {
      return AVG_INT_LOW_EXT[hashVal % AVG_INT_LOW_EXT.length];
    }
  }

  // 4. Low externals fallback for remaining internals range (60% to 69.9%)
  if (extPct < 55) {
    const idx = Math.abs(s.name.charCodeAt(0)) % LOW_EXT_REMARKS.length;
    return LOW_EXT_REMARKS[idx];
  }
  
  return null;
}

// Grade → accent color
const GRADE_COLORS = {
  'O':  '#22c55e',
  'A+': '#818cf8',
  'A':  '#60a5fa',
  'B+': '#f59e0b',
  'B':  '#f97316',
  'C':  '#ef4444',
  'P':  '#dc2626',
  'F':  '#dc2626',
};

// Progress bar color based on %
function barColor(pct) {
  if (pct >= 75) return '#22c55e';
  if (pct >= 60) return '#f59e0b';
  return '#ef4444';
}

// ─────────────────────────────────────────────
//  RGPV SUBJECT CARDS (grade-based, no marks)
// ─────────────────────────────────────────────
const RGPV_GRADE_COLORS = {
  'O':  '#22c55e',  // Outstanding
  'A+': '#818cf8',  // Excellent
  'A':  '#60a5fa',  // Very Good
  'B+': '#f59e0b',  // Good
  'B':  '#f97316',  // Above Average
  'C+': '#fb8c00',  // Fair
  'C':  '#fb923c',  // Average
  'D':  '#facc15',  // Pass
  'F':  '#ef4444',  // Fail
  'I':  '#6b7280',  // Incomplete
  'W':  '#6b7280',  // Withheld
};

const RGPV_GRADE_LABELS = {
  'O':  'Outstanding',
  'A+': 'Excellent',
  'A':  'Very Good',
  'B+': 'Good',
  'B':  'Above Average',
  'C+': 'Fair',
  'C':  'Average',
  'D':  'Pass',
  'F':  'Fail',
  'I':  'Incomplete',
  'W':  'Withheld',
};

const RGPV_GP_FULL = { 'O':10,'A+':9,'A':8,'B+':7,'B':6,'C+':5.5,'C':5,'D':4,'F':0,'I':0,'W':0 };

function rgpvGradeBarWidth(grade) {
  const gp = RGPV_GP_FULL[grade] || 0;
  return Math.round((gp / 10) * 100);
}

function renderRGPVSubjectCards(subjects) {
  const grid = document.getElementById('subjectCardsGrid');
  if (!grid) return;

  grid.innerHTML = subjects.map(s => {
    const gradeKey    = (s.grade || '').toUpperCase();
    const accentColor = RGPV_GRADE_COLORS[gradeKey] || '#6366f1';
    const gradeLabel  = RGPV_GRADE_LABELS[gradeKey] || gradeKey;
    const gp          = RGPV_GP_FULL[gradeKey] !== undefined ? RGPV_GP_FULL[gradeKey] : 0;
    const barWidth    = rgpvGradeBarWidth(gradeKey);
    const isFail      = gradeKey === 'F' || gradeKey === 'I' || gradeKey === 'W';
    const statusColor = isFail ? '#ef4444' : '#22c55e';
    const credits     = s.credits || s.credit || 3;

    // Clean display name — the server sends full name like "Engineering Mathematics-II (Theory)"
    // or a fallback like "BT201 Theory". Either way, show it.
    const displayName = s.name || s.code;
    // Type pill colour
    const typeColor   = (s.type === 'Practical' || s.type === 'Lab') ? '#818cf8' : '#6366f1';
    const typeLabel   = s.type || 'Theory';
    // Code without [T]/[P] suffix for display
    const baseCode    = s.baseCode || s.code.replace(/-?\[.*?\]/g, '').trim();

    return `
    <div class="sc-card rgpv-card" data-name="${displayName.toLowerCase()}" style="--accent:${accentColor};">
      <div class="sc-top">
        <div class="sc-title-block">
          <div class="sc-name" style="font-size:.95rem;line-height:1.3;">${displayName}</div>
          <div class="sc-meta" style="display:flex;gap:.4rem;align-items:center;flex-wrap:wrap;margin-top:.25rem;">
            <span>${baseCode}</span>
            <span style="opacity:.4;">•</span>
            <span>${credits} cr</span>
            <span style="opacity:.4;">•</span>
            <span style="padding:.1rem .45rem;border-radius:3px;font-size:.68rem;font-weight:700;
                         background:${typeColor}22;color:${typeColor};border:1px solid ${typeColor}44;">
              ${typeLabel}
            </span>
          </div>
        </div>
        <div class="sc-grade-badge" style="background:${accentColor}22;color:${accentColor};
             border-color:${accentColor}55;font-size:1.2rem;font-weight:900;min-width:2.4rem;text-align:center;">
          ${gradeKey || '?'}
        </div>
      </div>

      <div class="sc-marks-row" style="justify-content:space-between;">
        <span style="color:var(--text-muted);font-size:.78rem;">${gradeLabel}</span>
        <span style="color:${accentColor};font-weight:700;font-size:.85rem;">GP: ${gp}/10</span>
      </div>

      <div class="sc-bar-wrap" title="Grade point: ${gp}/10">
        <div class="sc-bar-fill" style="width:${barWidth}%;background:${accentColor};"></div>
      </div>

      <div class="sc-pct-row">
        <span class="sc-pct" style="color:${accentColor};">${gp * 10}%<span style="font-size:.7rem;opacity:.6;"> est.</span></span>
        <span class="sc-status" style="color:${statusColor};">${isFail ? 'FAIL ❌' : 'PASS ✅'}</span>
      </div>
    </div>`;
  }).join('');
}

// ─────────────────────────────────────────────
//  RGPV INSIGHTS (grade breakdown, no near-miss)
// ─────────────────────────────────────────────
function renderRGPVInsights(subjects, sgpa, cgpa) {
  const titleEl = document.getElementById('verdictTitle');
  const subEl   = document.getElementById('verdictSub');
  const ptContainer = document.getElementById('pageTrackerContainer');
  if (!titleEl) return;

  const fails = subjects.filter(s => s.result === 'F' || s.gp === 0).length;
  const outstanding = subjects.filter(s => s.grade === 'O').length;

  if (fails > 0) {
    titleEl.textContent = `${fails} subject${fails > 1 ? 's' : ''} need attention 🔴`;
    subEl.textContent   = "You've got backs this semester. Don't ignore them — sort it out early.";
  } else if (sgpa >= 9) {
    titleEl.textContent = 'Absolutely cooking 🔥';
    subEl.textContent   = 'Top tier RGPV performance. You are genuinely built different this sem.';
  } else if (sgpa >= 7.5) {
    titleEl.textContent = 'Solid semester 💪';
    subEl.textContent   = 'You are doing well. A few tweaks and you could be at the top.';
  } else if (sgpa >= 6) {
    titleEl.textContent = 'Room to grow 📈';
    subEl.textContent   = 'Decent start. But the gap between you and the top is closable.';
  } else {
    titleEl.textContent = 'Time to lock in 🔒';
    subEl.textContent   = 'This semester is a wake-up call. Next sem is a fresh start — make it count.';
  }

  if (!ptContainer) return;

  // Grade distribution breakdown for RGPV
  const gradeCounts = {};
  for (const s of subjects) {
    const g = s.grade || 'F';
    gradeCounts[g] = (gradeCounts[g] || 0) + 1;
  }

  const gradeOrder = ['O','A+','A','B+','B','C+','C','D','F','I','W'];
  const gradeRows = gradeOrder
    .filter(g => gradeCounts[g])
    .map(g => {
      const cnt   = gradeCounts[g];
      const color = RGPV_GRADE_COLORS[g] || '#6366f1';
      const label = RGPV_GRADE_LABELS[g] || g;
      const barW  = Math.round((cnt / subjects.length) * 100);
      return `
      <div style="display:flex;align-items:center;gap:.75rem;margin-bottom:.6rem;">
        <div style="width:2.2rem;text-align:center;font-weight:800;font-size:.95rem;color:${color};">${g}</div>
        <div style="flex:1;background:var(--surface2);border-radius:4px;height:10px;overflow:hidden;">
          <div style="width:${barW}%;height:100%;background:${color};border-radius:4px;"></div>
        </div>
        <div style="width:1.5rem;text-align:right;font-size:.82rem;color:var(--text-muted);">${cnt}</div>
        <div style="width:7rem;font-size:.75rem;color:var(--text-muted);">${label}</div>
      </div>`;
    }).join('');

  const percentage = cgpa ? Math.round(cgpa * 10) : 0;

  ptContainer.innerHTML = `
    <div style="color:var(--text-muted);font-size:.8rem;margin-bottom:1rem;">
      RGPV uses a 10-point grading system. Estimated percentage: <strong style="color:var(--accent)">${percentage}%</strong>
      (CGPA × 10 formula)
    </div>
    <div style="margin-bottom:.5rem;font-weight:600;font-size:.9rem;">Grade Distribution</div>
    ${gradeRows || '<div style="color:var(--text-muted);font-size:.85rem;">No grade data available.</div>'}
    <div style="margin-top:1.2rem;padding:.75rem;background:var(--surface2);border-radius:.6rem;font-size:.82rem;color:var(--text-muted);">
      💡 RGPV grading: O=10 | A+=9 | A=8 | B+=7 | B=6 | C+=5.5 | C=5 | D=4 | F=0
    </div>
  `;
}

// ─────────────────────────────────────────────
//  GGSIPU SUBJECT CARDS (marks-based)
// ─────────────────────────────────────────────
function renderSubjectCards(subjects, nearMisses) {
  const grid = document.getElementById('subjectCardsGrid');
  if (!grid) return;

  const nmMap = {};
  for (const nm of nearMisses) nmMap[nm.s.code] = nm;

  // Check if maths is difficult for next sem (profile index < 65)
  let isMathDiff = false;
  let mathScore = 60;
  if (currentData && currentData.allSemesters) {
    const profile = analyzeStudentProfile(currentData.allSemesters);
    mathScore = profile.math;
    isMathDiff = profile.math < 65;
  }

  // Find the single theory subject with the absolute best internals
  let bestTheorySub = null;
  let highestInternal = -1;
  for (const s of subjects) {
    const isTheory = s.credit > 1 && !s.name.toLowerCase().includes('lab') && !s.name.toLowerCase().includes('practical') && !s.name.toLowerCase().includes('nues');
    if (isTheory) {
      if (s.internal > highestInternal) {
        highestInternal = s.internal;
        bestTheorySub = s.code;
      }
    }
  }

  grid.innerHTML = subjects.map(s => {
    const isBestTheory = (s.code === bestTheorySub);
    const remark       = getInternalRemark(s, isBestTheory);
    const nm           = nmMap[s.code];
    const accentColor  = GRADE_COLORS[s.grade] || '#6366f1';
    const progressClr  = barColor(s.pct);
    const isFail       = s.result === 'F' || s.gp === 0;
    const statusColor  = isFail ? '#ef4444' : '#22c55e';
    const pctColor     = barColor(s.pct);
    const nmHtml       = nm
      ? `<div class="sc-nearmiss">✏️ <strong>${nm.pages} more page${nm.pages!==1?'s':''}</strong> → could've been <strong>${nm.nextGrade}</strong> (+${nm.boost} SGPA)</div>`
      : '';

    // Next sem math difficulty warning
    const isMathSubject = s.name.toLowerCase().includes('math');
    const mathWarningHtml = (isMathSubject && isMathDiff)
      ? `<div class="sc-math-warning">⚠️ warning: next sem maths is gonna be a grind for you (maths index: ${mathScore}%)</div>`
      : '';

    return `
    <div class="sc-card" data-name="${s.name.toLowerCase()}" style="--accent:${accentColor};">
      <div class="sc-top">
        <div class="sc-title-block">
          <div class="sc-name">${s.name}</div>
          <div class="sc-meta">${s.code} &bull; ${s.credit} cr</div>
        </div>
        <div class="sc-grade-badge" style="background:${accentColor}22;color:${accentColor};border-color:${accentColor}55;">${s.grade}</div>
      </div>

      <div class="sc-marks-row">
        <span class="sc-mark-lbl">Int</span><span class="sc-mark-val">${s.internal}</span>
        <span class="sc-mark-sep"></span>
        <span class="sc-mark-lbl">Ext</span><span class="sc-mark-val">${s.external}</span>
        <span class="sc-mark-sep"></span>
        <span class="sc-mark-lbl">Total</span><span class="sc-mark-val">${s.total}/100</span>
      </div>

      <div class="sc-bar-wrap">
        <div class="sc-bar-fill" style="width:${s.pct}%;background:${progressClr};"></div>
      </div>

      <div class="sc-pct-row">
        <span class="sc-pct" style="color:${pctColor};">${s.pct}%</span>
        <span class="sc-status" style="color:${statusColor};">${isFail ? 'FAIL' : 'PASS'}</span>
      </div>

      ${remark ? `<div class="sc-remark">${remark}</div>` : ''}
      ${nmHtml}
      ${mathWarningHtml}
    </div>`;
  }).join('');
}

window.filterCards = function(q) {
  document.querySelectorAll('.sc-card').forEach(card => {
    const n = card.getAttribute('data-name') || '';
    card.style.display = n.includes(q.toLowerCase()) ? '' : 'none';
  });
};




// ─────────────────────────────────────────────
//  INSIGHTS
// ─────────────────────────────────────────────
function renderInsights(subjects, sgpa, cwSum, tcred, nearMisses) {
  // Verdict
  const titleEl = document.getElementById('verdictTitle');
  const subEl   = document.getElementById('verdictSub');
  if (!titleEl) return;
  const fails = subjects.filter(s => s.result === 'F').length;
  if (fails > 0) {
    titleEl.textContent = `${fails} subject${fails>1?'s':''} need attention 🔴`;
    subEl.textContent   = "You've got backs this semester. Don't ignore them — sort it out early.";
  } else if (sgpa >= 9) {
    titleEl.textContent = 'Absolutely cooking 🔥';
    subEl.textContent   = 'Top tier performance. You are genuinely built different this sem.';
  } else if (sgpa >= 7.5) {
    titleEl.textContent = 'Solid semester 💪';
    subEl.textContent   = 'You are doing well. A few tweaks and you could be at the top.';
  } else if (sgpa >= 6) {
    titleEl.textContent = 'Room to grow 📈';
    subEl.textContent   = 'Decent start. But the gap between you and the top is closable.';
  } else {
    titleEl.textContent = 'Time to lock in 🔒';
    subEl.textContent   = 'This semester is a wake-up call. Next sem is a fresh start — make it count.';
  }

  // Near miss tracker
  const ptContainer = document.getElementById('pageTrackerContainer');
  if (!ptContainer) return;
  if (nearMisses.length === 0) {
    ptContainer.innerHTML = `<div style="color:var(--text-muted);font-size:.85rem;padding:.5rem 0;">No near-misses this sem — you either maxed out or were far off. Keep grinding 💪</div>`;
    return;
  }

  // Sort near-misses by efficiency (most SGPA boost per page) for combo
  const nmByEfficiency = [...nearMisses].sort((a, b) => {
    const ea = a.boost / a.pages;
    const eb = b.boost / b.pages;
    return eb - ea;
  });

  // Summary banner
  const totalPages = nearMisses.reduce((a,n)=>a+n.pages,0);
  const totalBoost = nearMisses.reduce((a,n)=>a+n.boost,0);
  const newSgpa    = Math.min(10, +(sgpa + totalBoost).toFixed(2));
  let html = `
  <div class="pt-summary-banner">
    <div class="pt-summary-left">
      <div class="pt-summary-pages">${totalPages.toFixed(1)}</div>
      <div class="pt-summary-label">total extra pages across all near-miss subjects</div>
    </div>
    <div class="pt-summary-right">
      <div class="pt-summary-boost">${sgpa.toFixed(2)} → ${newSgpa}</div>
      <div class="pt-summary-label">potential SGPA if all near-misses converted</div>
    </div>
  </div>`;

  html += `<div class="pt-cards-grid">` + nearMisses.map(nm => {
    const pStr = nm.pages % 1 === 0 ? nm.pages : nm.pages.toFixed(1);
    return `
  <div class="pt-card">
    <div class="pt-sub-name">${nm.s.name}</div>
    <div class="pt-score-miss">Scored ${nm.s.pct}% &bull; Missed ${nm.nextGrade} by ${nm.missedMarks} mark${nm.missedMarks!==1?'s':''}</div>
    <div class="pt-pages-box">
      <span class="pt-pages-big">${pStr}</span>
      <span class="pt-pages-label">more page${nm.pages!==1?'s':''} and you would've gotten <strong>${nm.nextGrade}</strong></span>
    </div>
    <div class="pt-sgpa-line">↑ SGPA would've been ${nm.potentialSgpa.toFixed(2)} (+${nm.boost})</div>
  </div>`}).join('') + `</div>`;



  ptContainer.innerHTML = html;
}


// ─────────────────────────────────────────────
//  RECOMMENDATION ENGINE — NEXT SEMESTER
// ─────────────────────────────────────────────

const NEXT_SEM_SUBJECTS = [
  {
    code: 'ES-201', name: 'Computational Methods', credits: 4,
    subtitle: 'Numerical Analysis — solving equations algorithmically',
    skills: { math: 0.65, code: 0.35 },
    whyWeak: {
      math: "Numerical methods is applied maths — bisection, Newton-Raphson, Gaussian elimination. If Maths was shaky, this needs early prep.",
      code: "You'll implement these algorithms in code. If Programming in C needed effort, brush up before sem starts.",
    },
    tip: "Start with <strong>Newton-Raphson</strong> and <strong>Bisection method</strong>. Understand the math first, code second.",
  },
  {
    code: 'CIC-205', name: 'Discrete Mathematics', credits: 4,
    subtitle: 'Sets, Group Theory, Functions & Graph Theory',
    skills: { math: 0.3, logic: 0.7 },
    whyWeak: {
      math: "Discrete maths is logic-based set theory and graphs, not calculus. Since your previous maths was shaky, this is actually a fresh start for you, but the proof-writing will still need focus!",
      logic: "Graph theory and relations require sharp logical thinking. Memory alone won't cut it here.",
    },
    tip: "Practice <strong>writing proofs</strong>, not just reading them. Do 5 problems daily and never skip graph theory.",
  },
  {
    code: 'ECC-207', name: 'Digital Logic and Computer Design', credits: 4,
    subtitle: 'Gates, K-maps, Flip-flops & Computer Architecture',
    skills: { logic: 0.55, concept: 0.45 },
    baseBoost: 0.22,
    whyWeak: {
      logic: "Boolean algebra and K-map simplification are pure logic exercises. If logical subjects haven't been strong, this needs consistent practice.",
      concept: "Computer architecture is conceptual — you need to understand HOW a CPU works, not just memorize it.",
    },
    tip: "Use <strong>Logisim</strong> to simulate circuits visually. Simulate before you memorize — it makes everything click.",
  },
  {
    code: 'CIC-209', name: 'Data Structures', credits: 4,
    subtitle: 'Arrays, Linked Lists, Trees, Graphs — in C',
    skills: { code: 0.6, logic: 0.4 },
    whyWeak: {
      code: "Data Structures in C means pointers, structs, and dynamic memory. If C felt heavy, this is C on a harder difficulty.",
      logic: "Choosing the right DS for a problem is about logical thinking. Weak logic score means this needs deliberate practice.",
    },
    tip: "Implement <strong>every data structure from scratch</strong> — no copy-paste. Understand why before moving to next.",
  },
  {
    code: 'CIC-211', name: 'OOP using C++', credits: 4,
    subtitle: 'Classes, Inheritance, Polymorphism & Templates',
    skills: { code: 0.8, logic: 0.2 },
    whyWeak: {
      code: "C++ has a steeper syntax curve than C — if coding was your weak area, OOP concepts on top of new syntax can pile up fast.",
      logic: "Designing class hierarchies requires structural thinking. Practice OOP design before diving into syntax.",
    },
    tip: "Learn in order: <strong>Classes → Inheritance → Polymorphism → STL</strong>. Don't jump around.",
  },
  {
    code: 'HS-203', name: 'Indian Knowledge System', credits: 2,
    subtitle: 'Culture, Philosophy & Indian Science Heritage',
    skills: { rote: 1.0 },
    whyWeak: {
      rote: "Memory-based subject — if rote learning isn't your strength, structured notes matter more here than for other subjects.",
    },
    tip: "Make <strong>chapter-wise bullet notes</strong> early and revise weekly. That's literally all it takes.",
    isEasy: true,
  },
];

const NEXT_SEM_SUBJECTS_ECE = [
  {
    code: 'ES-201', name: 'Computational Methods', credits: 4,
    subtitle: 'Numerical Analysis — solving equations algorithmically',
    skills: { math: 0.65, code: 0.35 },
    whyWeak: {
      math: 'Numerical methods needs solid applied maths — bisection, Newton-Raphson. If Maths was your weak spot, start this early.',
      code: 'You will code these algorithms. If C programming was a struggle, brush up before the sem.',
    },
    tip: 'Start with <strong>Newton-Raphson</strong> and <strong>Bisection method</strong>. Understand the maths first, code second.',
  },
  {
    code: 'ECC-205', name: 'Signals and Systems', credits: 3,
    subtitle: 'Fourier, Laplace & Z-Transforms — the core of ECE',
    skills: { math: 0.6, concept: 0.4 },
    baseBoost: 0.25,
    whyWeak: {
      math: 'Signals & Systems is transform maths on steroids — Fourier, Laplace, Z-transform. If maths externals were rough, this will need serious early prep.',
      concept: 'You need to intuitively understand what a signal IS before you manipulate it. Purely conceptual clarity matters here.',
    },
    tip: 'Start with <strong>convolution</strong>, then Fourier series, then Laplace. Do NOT skip the basics — everything builds on them.',
  },
  {
    code: 'ECC-207', name: 'Digital Logic and Computer Design', credits: 4,
    subtitle: 'Gates, K-maps, Flip-flops & Computer Architecture',
    skills: { logic: 0.55, concept: 0.45 },
    whyWeak: {
      logic: 'Boolean algebra and K-map simplification are pure logic exercises. Consistent practice is key.',
      concept: 'Computer architecture needs conceptual understanding — memorizing circuits is not enough.',
    },
    tip: 'Use <strong>Logisim</strong> to simulate circuits visually. Simulate before you memorize.',
  },
  {
    code: 'ECC-209', name: 'Analog Communications', credits: 4,
    subtitle: 'AM, FM, PM modulation — noise, bandwidth & demodulation',
    skills: { math: 0.4, concept: 0.6 },
    whyWeak: {
      math: 'Modulation index calculations and SNR analysis need applied maths. If maths is weak, the numerical problems hit hard.',
      concept: 'Understanding WHY AM/FM differ and how noise affects signals is purely conceptual. Rote learning breaks down here.',
    },
    tip: 'Visualize every modulation scheme with a <strong>waveform diagram</strong> before doing math. Always draw before you calculate.',
  },
  {
    code: 'ECC-211', name: 'Analog Electronics-I', credits: 4,
    subtitle: 'BJT, MOSFET, Op-Amps — device physics & amplifier analysis',
    skills: { concept: 0.65, math: 0.35 },
    baseBoost: 0.12,
    whyWeak: {
      concept: 'Device physics (BJT bias, MOSFET characteristics) requires deep conceptual understanding — the hardest part for most students.',
      math: 'Small-signal analysis and gain calculations need solid maths. If physics externals were low, give this extra time.',
    },
    tip: 'Master <strong>DC biasing first</strong>, then AC small-signal analysis. The sequence matters — skip DC and AC becomes impossible.',
  },
  {
    code: 'HS-203', name: 'Indian Knowledge System', credits: 2,
    subtitle: 'Culture, Philosophy & Indian Science Heritage',
    skills: { rote: 1.0 },
    whyWeak: { rote: "Memory-based subject — structured notes early is all you need." },
    tip: 'Make <strong>chapter-wise bullet notes</strong> early and revise weekly.',
    isEasy: true,
  },
];

const ECE_BRANCHES = ['ECE','EEE','ECT'];
function getSubjectsForBranch(branch) {
  return ECE_BRANCHES.includes(branch) ? NEXT_SEM_SUBJECTS_ECE : NEXT_SEM_SUBJECTS;
}

function detectBranch(programmeName) {
  const p = (programmeName || '').toLowerCase().trim();

  // ── Non-CS branches FIRST — before IT/DS/CS/ECE substring traps ──
  // MAE = Mechanical & Automation Engineering (has 'automation' or 'mae')
  if (p.includes('mechanical') && (p.includes('automation') || p.includes('mae'))) return 'MAE';
  // ME  = plain Mechanical Engineering
  if (p.includes('mechanical')) return 'ME';
  if (p.includes('civil engineering') || /\bcivil\b/.test(p)) return 'CIVIL';

  // ── Electronics ──
  if (p.includes('electronics and communication') || p.includes('ece')) return 'ECE';
  if (p.includes('electronics and electrical')    || p.includes('eee')) return 'EEE';
  if (p.includes('electronics and computer')      || p.includes('ect')) return 'ECT';

  // ── AI / ML variants (cover typos + shortcuts used by GGSIPU) ──
  const hasAI = p.includes('artificial intel') // artificial intelligence / inteligence
              || p.includes('ai/')              // ai/ml, ai/ds
              || p.includes('ai-')             // ai-ds, ai-ml
              || p.includes('ai &')            // ai & ds
              || p.includes('ai and')          // ai and ml
              || p.includes('aiml')            // aiml
              || p.includes('aids');            // aids (abbreviation)

  if (hasAI && p.includes('machine learning')) {
    if (p.includes('computer science') || p.includes('cse')) return 'CSE-AIML';
    return 'AIML';
  }
  if (hasAI && (p.includes('data science') || p.includes('aids'))) {
    if (p.includes('computer science') || p.includes('cse')) return 'CSE-DS';
    return 'AIDS';
  }
  if (hasAI) {
    if (p.includes('computer science') || p.includes('cse')) return 'CSE-AI';
    return 'AIDS';
  }

  // ── CSE specialisations ──
  if (p.includes('computer science') && p.includes('data science')) return 'CSE-DS';
  if (p.includes('internet of things') && p.includes('cyber'))      return 'CSE-ICB';
  if (p.includes('internet of things') || p.includes('iot'))        return 'CSE-IoT';
  if (p.includes('cyber security')     || p.includes('cyber'))      return 'CSE-CS';
  if (p.includes('networks'))                                        return 'CSE-Net';

  // ── Core branches ──
  if (p.includes('computer science') || p.includes('cse')) return 'CSE';
  if (p.includes('data science'))                           return 'DS';
  if (p.includes('information technology'))                 return 'IT';
  if (p.includes('instrumentation'))                        return 'ICE';

  return 'CSE'; // safe fallback
}

function analyzeStudentProfile(allSemesters) {
  const all = allSemesters.flatMap(s => s.subjects);

  function extScore(s) {
    if (s.credit > 1 && s.max >= 90 && s.external != null)
      return Math.min(Math.round((s.external / 60) * 100), 100);
    return s.pct;
  }

  function avg(patterns) {
    const matched = all.filter(s =>
      patterns.some(p => s.name.toLowerCase().includes(p) || s.code.toLowerCase().includes(p))
    );
    if (!matched.length) return null;
    return Math.round(matched.reduce((a, s) => a + extScore(s), 0) / matched.length);
  }

  const mathRaw    = avg(['math', 'bs111', 'bs112']);
  const codeRaw    = avg(['programming', 'es101', 'es153', 'cic-2']);
  const physicsRaw = avg(['physics', 'bs105', 'bs106']);
  const elecRaw    = avg(['electrical', 'es108', 'mechanics', 'es114']);
  const roteRaw    = avg(['environmental', 'communication skills', 'human values', 'hs113', 'hs116']);

  const conceptRaw = elecRaw !== null && physicsRaw !== null
    ? Math.round((physicsRaw + elecRaw) / 2)
    : (physicsRaw ?? elecRaw ?? 60);

  const logicRaw = mathRaw !== null && elecRaw !== null
    ? Math.round((mathRaw * 0.6 + elecRaw * 0.4))
    : (mathRaw ?? 60);

  return {
    math:    mathRaw    ?? 60,
    code:    codeRaw    ?? 65,
    concept: conceptRaw ?? 60,
    rote:    roteRaw    ?? 70,
    logic:   logicRaw   ?? 60,
  };
}

function computeSubjectDifficulty(profile, subjects) {
  return subjects.map(subj => {
    let score = 0, worstSkill = null, worstGap = -1;
    for (const [skill, weight] of Object.entries(subj.skills)) {
      const studentPct = profile[skill] ?? 60;
      const gap = (100 - studentPct) / 100;
      score += weight * gap;
      if (gap * weight > worstGap) { worstGap = gap * weight; worstSkill = skill; }
    }
    score += subj.baseBoost ?? 0;
    const personalWhy = (worstSkill && subj.whyWeak[worstSkill]) ? subj.whyWeak[worstSkill] : '';
    return { ...subj, diffScore: score, personalWhy, worstSkill };
  }).sort((a, b) => b.diffScore - a.diffScore);
}

async function renderRecommendations(allSemesters, cgpa, programmeName, activeSemNum) {
  const recSection = document.getElementById('rec-section');
  if (!recSection || !allSemesters || allSemesters.length === 0) return;

  const branch   = detectBranch(programmeName);
  const referenceSem = activeSemNum || Math.max(...allSemesters.map(s => s.semester));
  const nextSem = referenceSem + 1;

  let subjects = [];
  let noSyllabusFound = false;

  if (referenceSem >= 8) {
    // Student has completed their 8 semesters
    document.getElementById('skillProfileRow').innerHTML = '';
    document.getElementById('recCardsGrid').innerHTML = `
      <div class="empty-state" style="padding: 2.5rem 1.5rem; background: rgba(255,255,255,0.02); border-radius: 12px; border: 1px dashed var(--border); text-align: center; grid-column: 1 / -1;">
        <span style="font-size: 3rem; display: block; margin-bottom: 0.75rem;">🎓</span>
        <strong style="color: var(--indigo); font-size: 1.2rem; display: block; margin-bottom: 0.25rem;">graduation achieved!</strong>
        <p style="color: var(--text-muted); font-size: 0.85rem; max-width: 400px; margin: 0 auto;">you have completed all 8 semesters of your degree syllabus.</p>
      </div>
    `;
    const recSubEl = recSection.querySelector('.section-sub');
    if (recSubEl) recSubEl.textContent = 'degree successfully completed! you are ready for the industry.';
    recSection.style.display = 'block';
    return;
  }

  try {
    const res = await fetch(`${API}/syllabus?stream=${branch}&semester=${nextSem}`);
    const data = await res.json();
    if (data && Array.isArray(data) && data.length > 0) {
      subjects = data;
    } else {
      if (nextSem === 3) {
        subjects = getSubjectsForBranch(branch);
      } else {
        noSyllabusFound = true;
      }
    }
  } catch(e) {
    if (nextSem === 3) {
      subjects = getSubjectsForBranch(branch);
    } else {
      noSyllabusFound = true;
    }
  }

  const recSubEl = recSection.querySelector('.section-sub');
  if (recSubEl) {
    const isFallback = (nextSem === 3 && subjects === getSubjectsForBranch(branch));
    recSubEl.textContent = `Based on your actual results across all sems — here's what's gonna need your real attention in Semester ${nextSem}. [Branch: ${branch} | Source: ${isFallback ? 'fallback' : 'database'}]`;
  }

  if (noSyllabusFound || subjects.length === 0) {
    document.getElementById('skillProfileRow').innerHTML = '';
    document.getElementById('recCardsGrid').innerHTML = `
      <div class="empty-state" style="padding: 2.5rem 1.5rem; background: rgba(255,255,255,0.02); border-radius: 12px; border: 1px dashed var(--border); text-align: center; grid-column: 1 / -1;">
        <span style="font-size: 3rem; display: block; margin-bottom: 0.75rem;">📚</span>
        <strong style="color: var(--indigo); font-size: 1.2rem; display: block; margin-bottom: 0.25rem;">semester ${nextSem} syllabus pending</strong>
        <p style="color: var(--text-muted); font-size: 0.85rem; max-width: 400px; margin: 0 auto;">the admin has not configured the subjects catalog for semester ${nextSem} yet.</p>
      </div>
    `;
    recSection.style.display = 'block';
    return;
  }

  const profile  = analyzeStudentProfile(allSemesters);

  const skillLabels = {
    math:    { label: 'Maths',      icon: '📐' },
    code:    { label: 'Coding',     icon: '💻' },
    logic:   { label: 'Logic',      icon: '🧩' },
    concept: { label: 'Conceptual', icon: '⚛️' },
    rote:    { label: 'Memory',     icon: '📖' },
  };
  const pillsHtml = Object.entries(skillLabels).map(([key, {label, icon}]) => {
    const val = profile[key];
    const cls = val >= 75 ? 'skill-strong' : val >= 55 ? 'skill-mid' : 'skill-weak';
    const fillColor = val >= 75 ? '#22c55e' : val >= 55 ? '#f59e0b' : '#ef4444';
    return `
    <div class="skill-pill ${cls}">
      <span>${icon} ${label}</span>
      <div class="skill-pill-bar"><div class="skill-pill-fill" style="width:${val}%;background:${fillColor};"></div></div>
      <span style="font-size:.72rem;opacity:.8;">${val}%</span>
    </div>`;
  }).join('');
  document.getElementById('skillProfileRow').innerHTML = pillsHtml;

  const scored = computeSubjectDifficulty(profile, subjects);
  const hard   = scored.filter(s => !s.isEasy);
  const isAllRounder = cgpa >= 9;
  const picks  = hard.slice(0, isAllRounder ? 1 : 2);

  const diffLabel = s => s.diffScore > 0.45 ? 'High Priority' : s.diffScore > 0.32 ? 'Watch Out' : 'Heads Up';
  const diffCls   = s => s.diffScore > 0.45 ? 'diff-hard' : 'diff-medium';
  const diffPct   = s => Math.min(Math.round(s.diffScore * 180), 100);

  let cardsHtml = '';
  if (isAllRounder) {
    cardsHtml += `
    <div class="rec-allrounder">
      <div class="rec-allrounder-title">CGPA ${cgpa.toFixed(2)} — You're built different 🔥</div>
      <div class="rec-allrounder-sub">You're performing at a high level. Even for you, one subject deserves extra attention:</div>
    </div>`;
  }

  cardsHtml += picks.map((s, i) => `
  <div class="rec-card ${diffCls(s)}">
    <div class="rec-rank">${isAllRounder ? 'Watch Closest' : i === 0 ? '#1 Priority' : '#2 Priority'} · ${diffLabel(s)}</div>
    <div class="rec-subject-name">${s.name}</div>
    <div class="rec-subject-sub">${s.subtitle}</div>
    <div class="rec-diff-bar-wrap">
      <div class="rec-diff-bar-label"><span>Difficulty for you</span><span>${diffPct(s)}%</span></div>
      <div class="rec-diff-bar"><div class="rec-diff-fill" style="width:${diffPct(s)}%;"></div></div>
    </div>
    <div class="rec-why">
      <div class="rec-why-label">Why this hits different for you</div>
      ${s.personalWhy || 'This subject challenges multiple skill areas simultaneously.'}
    </div>
    <div class="rec-tip">💡 ${s.tip}</div>
  </div>`).join('');

  document.getElementById('recCardsGrid').innerHTML = cardsHtml;
  recSection.style.display = 'block';
}

// ─────────────────────────────────────────────
//  UI HELPERS
// ─────────────────────────────────────────────
window.togglePw = function() {
  const inp = document.getElementById('password');
  inp.type = inp.type === 'password' ? 'text' : 'password';
};

window.resetDashboard = function() {
  document.getElementById('results-section').style.display  = 'none';
  document.getElementById('insights-section').style.display = 'none';
  document.getElementById('rec-section').style.display      = 'none';
  document.getElementById('comeback-section').style.display = 'none';
  document.getElementById('loginForm').reset();
  currentData = null;
  document.getElementById('login-section').scrollIntoView({ behavior:'smooth' });
  loadCaptcha();
};

// ─────────────────────────────────────────────
//  COMEBACK PLANNER
// ─────────────────────────────────────────────
const SCHEME_SEMS_CREDITS = {
  'before_2025': [25, 25, 26, 26, 26, 26, 26, 20],
  'after_2025':  [22, 22, 26, 26, 26, 26, 26, 20]
};

window.initComebackPlanner = function(data) {
  const isRealData = !!data;
  
  const completedInput = document.getElementById('cbCompletedSems');
  const currentInput = document.getElementById('cbCurrentCgpa');
  const schemeSelect = document.getElementById('cbSchemeSelect');
  
  if (completedInput && currentInput && schemeSelect) {
    if (isRealData) {
      completedInput.value = data.allSemesters.length;
      completedInput.readOnly = true;
      completedInput.style.opacity = '0.7';
      completedInput.style.cursor = 'not-allowed';
      
      currentInput.value = data.cgpa.toFixed(2);
      currentInput.readOnly = true;
      currentInput.style.opacity = '0.7';
      currentInput.style.cursor = 'not-allowed';

      // Detect and lock scheme based on GGSIPU enrollment year (last 2 digits)
      let detectedScheme = 'before_2025';
      if (data.stprofile && data.stprofile.nrollno) {
        const roll = String(data.stprofile.nrollno).trim();
        const yearStr = roll.slice(-2);
        const year = parseInt(yearStr);
        if (!isNaN(year) && year >= 25 && year < 90) {
          detectedScheme = 'after_2025';
        }
      }
      schemeSelect.value = detectedScheme;
      schemeSelect.disabled = true;
      schemeSelect.style.opacity = '0.7';
      schemeSelect.style.cursor = 'not-allowed';
    } else {
      completedInput.value = 2;
      completedInput.readOnly = false;
      completedInput.style.opacity = '1';
      completedInput.style.cursor = 'auto';
      
      currentInput.value = '7.50';
      currentInput.readOnly = false;
      currentInput.style.opacity = '1';
      currentInput.style.cursor = 'auto';

      schemeSelect.value = 'before_2025';
      schemeSelect.disabled = false;
      schemeSelect.style.opacity = '1';
      schemeSelect.style.cursor = 'auto';
    }
  }

  // Trigger rebuild of dropdown based on current completed sems value
  onCompletedSemsChange();
};

window.onCompletedSemsChange = function() {
  const completedInput = document.getElementById('cbCompletedSems');
  if (!completedInput) return;
  
  // Allow empty input value while typing/backspacing
  if (completedInput.value === '') return;
  
  let completedSems = parseInt(completedInput.value);
  if (isNaN(completedSems)) return;

  if (completedSems < 1) {
    completedSems = 1;
    completedInput.value = 1;
  } else if (completedSems > 7) {
    completedSems = 7;
    completedInput.value = 7;
  }
  
  const maxSems = 8;
  const remSems = Math.max(1, maxSems - completedSems);

  // Build target sems dropdown (values are the target end semester numbers, e.g. 3, 4, 8)
  const select = document.getElementById('cbTargetSems');
  if (select) {
    let optionsHtml = '';
    for (let i = 1; i <= remSems; i++) {
      const targetSem = completedSems + i;
      const isLast = (i === remSems);
      
      let suffix = 'th';
      if (targetSem === 1) suffix = 'st';
      else if (targetSem === 2) suffix = 'nd';
      else if (targetSem === 3) suffix = 'rd';

      optionsHtml += `<option value="${targetSem}" ${isLast ? 'selected' : ''}>
        By ${targetSem}${suffix} Semester ${isLast ? '(Graduation)' : ''}
      </option>`;
    }
    select.innerHTML = optionsHtml;
  }
  
  calculateComeback();
};

window.calculateComeback = function() {
  const completedInput = document.getElementById('cbCompletedSems');
  const currentInput = document.getElementById('cbCurrentCgpa');
  const targetInput = document.getElementById('cbTargetCgpa');
  const schemeSelect = document.getElementById('cbSchemeSelect');
  
  if (!completedInput || !currentInput || !targetInput || !schemeSelect) return;

  // Let inputs be empty while user is typing
  if (completedInput.value === '' || currentInput.value === '' || targetInput.value === '') {
    return;
  }

  const completedSems = parseInt(completedInput.value) || 2;
  const currentCgpa = parseFloat(currentInput.value) || 7.50;
  const targetCgpa = parseFloat(targetInput.value) || 8.50;
  const scheme = schemeSelect.value || 'before_2025';
  
  const targetEndSem = parseInt(document.getElementById('cbTargetSems').value) || (completedSems + 1);

  const valEl = document.getElementById('cbResultValue');
  const feedEl = document.getElementById('cbResultFeedback');

  if (targetCgpa > 10.0 || targetCgpa < 1.0) {
    valEl.textContent = '❌';
    feedEl.innerHTML = '<span style="color:#ef4444;font-weight:700;">Bhai, target CGPA 1.0 se 10.0 ke beech mein rakho!</span>';
    return;
  }

  // Get credits arrays for the selected scheme
  const creditsList = SCHEME_SEMS_CREDITS[scheme] || SCHEME_SEMS_CREDITS['before_2025'];

  // Sum credits up to completed semesters
  let completedCredits = 0;
  for (let i = 0; i < completedSems; i++) {
    completedCredits += creditsList[i] || 25;
  }

  // Sum credits up to target end semester
  let totalCredits = 0;
  for (let i = 0; i < targetEndSem; i++) {
    totalCredits += creditsList[i] || 25;
  }

  const plannedCredits = totalCredits - completedCredits;
  const reqTotalPoints = targetCgpa * totalCredits;
  const currentPoints = currentCgpa * completedCredits;
  const reqPoints = reqTotalPoints - currentPoints;
  
  // Weighted SGPA calculation
  const reqSgpa = reqPoints / plannedCredits;

  const detailHtml = `<div style="font-size:0.76rem;margin-bottom:0.6rem;opacity:0.75;line-height:1.4;">
    To hit <strong>${targetCgpa.toFixed(2)} CGPA</strong> by <strong>Sem ${targetEndSem}</strong> (Scheme: <strong>${scheme === 'before_2025' ? 'Before 2025' : 'In/After 2025'}</strong>, requiring <strong>${plannedCredits} credits</strong> in upcoming semesters, starting from current <strong>${currentCgpa.toFixed(2)} CGPA</strong> over <strong>${completedCredits} credits</strong>):
  </div>`;

  if (reqSgpa > 10.0) {
    valEl.textContent = '☠️';
    valEl.style.color = '#ef4444';
    feedEl.innerHTML = `${detailHtml}Required Average: <strong style="color:#ef4444;font-size:1.1rem;">${reqSgpa.toFixed(2)} SGPA</strong>/sem.<br/>
      <span style="color:#ef4444;font-weight:700;">bhai, drop out plan ready karo or target CGPA change karo, 10+ SGPA is not possible in this universe 😭</span>`;
  } else if (reqSgpa > 9.5) {
    valEl.textContent = reqSgpa.toFixed(2);
    valEl.style.color = '#fb923c';
    feedEl.innerHTML = `${detailHtml}Required Average: <strong style="color:#fb923c;font-size:1.1rem;">${reqSgpa.toFixed(2)} SGPA</strong>/sem.<br/>
      <span style="color:#fb923c;font-weight:700;">pure semester lock-in krna padega 🔒. library mein hi tent lagalo, continuous 9.5+ is extreme grind mode!</span>`;
  } else if (reqSgpa > 8.0) {
    valEl.textContent = reqSgpa.toFixed(2);
    valEl.style.color = '#60a5fa';
    feedEl.innerHTML = `${detailHtml}Required Average: <strong style="color:#60a5fa;font-size:1.1rem;">${reqSgpa.toFixed(2)} SGPA</strong>/sem.<br/>
      doable but effort lagana padega. regular classes attend karo aur exam sheets fully bharo! 📈`;
  } else if (reqSgpa > 5.0) {
    valEl.textContent = reqSgpa.toFixed(2);
    valEl.style.color = '#22c55e';
    feedEl.innerHTML = `${detailHtml}Required Average: <strong style="color:#22c55e;font-size:1.1rem;">${reqSgpa.toFixed(2)} SGPA</strong>/sem.<br/>
      araam se ho jaega. last night study and bhaiya ke imp topics read karlo. secure status. 😎`;
  } else if (reqSgpa > 0) {
    const displaySgpa = Math.max(4.0, reqSgpa);
    valEl.textContent = displaySgpa.toFixed(2);
    valEl.style.color = '#10b981';
    feedEl.innerHTML = `${detailHtml}Required Average: <strong style="color:#10b981;font-size:1.1rem;">${displaySgpa.toFixed(2)} SGPA</strong>/sem.<br/>
      bhai, target set kiya ya mazak? bas exam hall mein attendance lagani hai, pass ho jaoge!`;
  } else {
    valEl.textContent = '0.00';
    valEl.style.color = '#34d399';
    feedEl.innerHTML = `${detailHtml}Already Achieved! 🎉<br/>
      agle sems mein zero SGPA le aao toh bhi target reach ho jayega. relax and chill! 🏝️`;
  }
};

// ─────────────────────────────────────────────
//  INIT
// ─────────────────────────────────────────────
loadCaptcha();
loadDynamicCredits();
initComebackPlanner(null); // Init with manual mode by default on page load
