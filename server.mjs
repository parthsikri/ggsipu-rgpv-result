import http from 'http';
import https from 'https';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 5000;

// Session store: sessionId → { jsessionid, timestamp }
const sessions = new Map();

function mergeCookies(oldCookieStr, newCookiesArr) {
  if (!newCookiesArr || newCookiesArr.length === 0) return oldCookieStr;
  const oldCookies = (oldCookieStr || '').split(';').map(c => c.trim()).filter(c => c);
  const cookieMap = {};
  for (const c of oldCookies) {
    if (!c.includes('=')) continue;
    const idx = c.indexOf('=');
    cookieMap[c.substring(0, idx)] = c.substring(idx + 1);
  }
  for (const c of newCookiesArr) {
    const main = c.split(';')[0]; // get the Key=Value part
    if (!main.includes('=')) continue;
    const idx = main.indexOf('=');
    cookieMap[main.substring(0, idx)] = main.substring(idx + 1);
  }
  return Object.entries(cookieMap).map(([k, v]) => `${k}=${v}`).join('; ');
}

function ggsipuRequest(urlPath, options = {}, body = null) {
  return new Promise((resolve, reject) => {
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      reject(new Error('GGSIPU server timed out. Please try again.'));
    }, 20000);

    const reqOptions = {
      hostname: 'examweb.ggsipu.ac.in',
      path: urlPath,
      method: options.method || 'GET',
      port: 443,
      rejectUnauthorized: false,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'identity',
        'Connection': 'keep-alive',
        ...(options.cookie ? { 'Cookie': options.cookie } : {}),
        ...(options.headers || {}),
      },
    };

    const req = https.request(reqOptions, res => {
      if (timedOut) return;
      clearTimeout(timer);
      const sc = res.headers['set-cookie'];
      const cookie = sc ? mergeCookies(options.cookie, sc) : options.cookie;
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({
        status: res.statusCode,
        headers: res.headers,
        location: res.headers['location'] || null,
        cookie,
        buf: Buffer.concat(chunks),
        text: Buffer.concat(chunks).toString('utf-8'),
      }));
      res.on('error', reject);
    });

    req.on('error', e => { clearTimeout(timer); if (!timedOut) reject(e); });
    if (body) req.write(body);
    req.end();
  });
}

function rgpvRequest(urlPath, options = {}, body = null) {
  return new Promise((resolve, reject) => {
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      reject(new Error('RGPV server timed out. Please try again.'));
    }, 25000);

    const reqOptions = {
      hostname: 'result.rgpv.ac.in',
      path: urlPath.startsWith('/') ? urlPath : '/result/' + urlPath,
      method: options.method || 'GET',
      port: 443,
      rejectUnauthorized: false,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Connection': 'keep-alive',
        ...(options.cookie ? { 'Cookie': options.cookie } : {}),
        ...(options.headers || {}),
      },
    };

    if (body) {
      reqOptions.headers['Content-Length'] = Buffer.byteLength(body);
    }

    const req = https.request(reqOptions, res => {
      if (timedOut) return;
      clearTimeout(timer);
      const sc = res.headers['set-cookie'];
      const cookie = sc ? mergeCookies(options.cookie, sc) : options.cookie;
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({
        status: res.statusCode,
        headers: res.headers,
        cookie,
        buf: Buffer.concat(chunks),
        text: Buffer.concat(chunks).toString('utf-8'),
      }));
      res.on('error', reject);
    });

    req.on('error', e => { clearTimeout(timer); if (!timedOut) reject(e); });
    if (body) req.write(body);
    req.end();
  });
}


function hashPassword(password, captcha) {
  const hash = crypto.createHash('sha256').update(password + captcha).digest();
  return Buffer.from(hash).toString('base64');
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

function sendJSON(res, code, data) {
  res.writeHead(code, { 'Content-Type': 'application/json', ...corsHeaders() });
  res.end(JSON.stringify(data));
}

function mime(ext) {
  return { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'application/javascript', '.png': 'image/png', '.ico': 'image/x-icon', '.bat': 'text/plain' }[ext] || 'text/plain';
}

function resolveGgsipuPath(location) {
  if (!location) return '/web/student/studenthome.jsp';
  if (location.startsWith('http')) return new URL(location).pathname;
  if (location.startsWith('/')) return location;
  return '/web/' + location;
}

// Clean old sessions
setInterval(() => {
  const cutoff = Date.now() - 3600000;
  for (const [id, s] of sessions) if (s.timestamp < cutoff) sessions.delete(id);
}, 300000);

// Leaderboard Persistence Helpers (Firebase REST API with local file fallback)
async function getLeaderboardData() {
  const dbUrl = process.env.FIREBASE_DB_URL;
  if (dbUrl) {
    try {
      const res = await fetch(`${dbUrl.replace(/\/$/, '')}/leaderboard.json`);
      if (res.ok) {
        const data = await res.json();
        // Firebase database will return an array, object, or null
        return Array.isArray(data) ? data : (data ? Object.values(data) : []);
      }
    } catch (e) {
      console.error('Firebase read error:', e);
    }
  }
  
  // Fallback to local file
  const dbPath = path.join(__dirname, 'leaderboard.json');
  let data = [];
  if (fs.existsSync(dbPath)) {
    try { data = JSON.parse(fs.readFileSync(dbPath, 'utf8')); } catch(_) {}
  }
  return data;
}

async function saveLeaderboardData(data) {
  const dbUrl = process.env.FIREBASE_DB_URL;
  if (dbUrl) {
    try {
      const res = await fetch(`${dbUrl.replace(/\/$/, '')}/leaderboard.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) return true;
    } catch (e) {
      console.error('Firebase write error:', e);
    }
  }
  
  // Fallback to local file
  const dbPath = path.join(__dirname, 'leaderboard.json');
  try {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error('Local write error:', e);
    return false;
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (req.method === 'OPTIONS') { res.writeHead(204, corsHeaders()); res.end(); return; }

  try {
    // ── GET /api/rgpv/captcha ──────────────────────────────────────────
    if (url.pathname === '/api/rgpv/captcha' && req.method === 'GET') {
      try {
        const program = url.searchParams.get('program') || '24'; // default: B.Tech (24)

        // 1. Fetch ProgramSelect page to start session
        const initRes = await rgpvRequest('/result/ProgramSelect.aspx');
        let cookie = initRes.cookie || '';

        const initVs = initRes.text.match(/id="__VIEWSTATE" value="([^"]+)"/);
        const initVsg = initRes.text.match(/id="__VIEWSTATEGENERATOR" value="([^"]+)"/);
        const initEv = initRes.text.match(/id="__EVENTVALIDATION" value="([^"]+)"/);

        // 2. Select program and post back
        const targetTarget = program === '24' ? 'radlstProgram$1' : 'radlstProgram$0'; // 1=B.Tech, 0=B.E.
        const postSelect = new URLSearchParams({
          '__EVENTTARGET': targetTarget,
          '__EVENTARGUMENT': '',
          '__LASTFOCUS': '',
          '__VIEWSTATE': initVs ? initVs[1] : '',
          '__VIEWSTATEGENERATOR': initVsg ? initVsg[1] : '',
          '__EVENTVALIDATION': initEv ? initEv[1] : '',
          'radlstProgram': program
        }).toString();

        const selectRes = await rgpvRequest('/result/ProgramSelect.aspx', {
          method: 'POST',
          cookie,
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Referer': 'https://result.rgpv.ac.in/result/ProgramSelect.aspx'
          }
        }, postSelect);

        if (selectRes.cookie) cookie = selectRes.cookie;

        // 3. Now load BErslt.aspx which is now initialized for the chosen program
        const pageRes = await rgpvRequest('/result/BErslt.aspx', { cookie });
        if (pageRes.cookie) cookie = pageRes.cookie;

        // Parse ASP.NET fields
        const vsMatch = pageRes.text.match(/id="__VIEWSTATE" value="([^"]+)"/);
        const vsgMatch = pageRes.text.match(/id="__VIEWSTATEGENERATOR" value="([^"]+)"/);
        const evMatch = pageRes.text.match(/id="__EVENTVALIDATION" value="([^"]+)"/);
        const capMatch = pageRes.text.match(/src="(CaptchaImage\.axd\?guid=[^"]+)"/);

        if (!capMatch) {
          sendJSON(res, 500, { error: 'Failed to locate RGPV captcha image.' });
          return;
        }

        const sid = crypto.randomBytes(16).toString('hex');
        sessions.set(sid, {
          type: 'rgpv',
          cookie,
          viewstate: vsMatch ? vsMatch[1] : '',
          viewstategenerator: vsgMatch ? vsgMatch[1] : '',
          eventvalidation: evMatch ? evMatch[1] : '',
          timestamp: Date.now()
        });

        // Download captcha image bytes
        const capUrl = `/result/${capMatch[1]}`;
        const capRes = await rgpvRequest(capUrl, {
          cookie,
          headers: { 'Referer': 'https://result.rgpv.ac.in/result/BErslt.aspx' }
        });

        sendJSON(res, 200, {
          sessionId: sid,
          captchaImage: `data:image/jpeg;base64,${capRes.buf.toString('base64')}`,
        });
      } catch(err) {
        console.error('RGPV captcha error:', err);
        sendJSON(res, 500, { error: 'Could not fetch RGPV captcha. Server may be down.' });
      }
      return;
    }

function getMatch(html, ids) {
  for (const id of ids) {
    const escapedId = id.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    // Try span/element innerHTML
    const spanRegex = new RegExp(`id="${escapedId}"[^>]*>([^<]+)<`, 'i');
    let m = html.match(spanRegex);
    if (m) return m[1].trim();
    
    // Try input value
    const inputRegex = new RegExp(`id="${escapedId}"[^>]+value="([^"]*)"`, 'i');
    m = html.match(inputRegex);
    if (m) return m[1].trim();
  }
  return null;
}

function findSubjectNameInSyllabus(code, syllabusData) {
  const cleanCode = code.toUpperCase().replace(/[^A-Z0-9]/g, '');
  for (const stream in syllabusData) {
    for (const sem in syllabusData[stream]) {
      const list = syllabusData[stream][sem];
      for (const s of list) {
        const sClean = s.code.toUpperCase().replace(/[^A-Z0-9]/g, '');
        if (sClean === cleanCode || cleanCode.startsWith(sClean) || sClean.startsWith(cleanCode)) {
          return s.name;
        }
      }
    }
  }
  let name = code;
  if (code.includes('[T]')) name = code.replace('- [T]', ' (Theory)').replace('-[T]', ' (Theory)');
  if (code.includes('[P]')) name = code.replace('- [P]', ' (Practical)').replace('-[P]', ' (Practical)');
  return name;
}

    // ── POST /api/rgpv/result ──────────────────────────────────────────
    if (url.pathname === '/api/rgpv/result' && req.method === 'POST') {
      const chunks = [];
      for await (const c of req) chunks.push(c);
      const { sessionId, enrollmentNo, semester, program, scheme, captcha } = JSON.parse(Buffer.concat(chunks).toString());

      const session = sessions.get(sessionId);
      if (!session || session.type !== 'rgpv') {
        sendJSON(res, 400, { error: 'Session expired. Please refresh the captcha.' });
        return;
      }

      try {
        const postParams = new URLSearchParams({
          '__EVENTTARGET': 'ctl00$ContentPlaceHolder1$btnviewresult',
          '__EVENTARGUMENT': '',
          '__VIEWSTATE': session.viewstate,
          '__VIEWSTATEGENERATOR': session.viewstategenerator,
          '__EVENTVALIDATION': session.eventvalidation,
          'ctl00$ContentPlaceHolder1$txtrollno': enrollmentNo.toUpperCase(),
          'ctl00$ContentPlaceHolder1$drpSemester': semester,
          'ctl00$ContentPlaceHolder1$rbtnlstSType': scheme || 'G', // 'G' for Grading, 'M' for Non-Grading
          'ctl00$ContentPlaceHolder1$TextBox1': captcha,
          'ctl00$ContentPlaceHolder1$btnviewresult': 'View Result'
        }).toString();

        const resultRes = await rgpvRequest('/result/BErslt.aspx', {
          method: 'POST',
          cookie: session.cookie,
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Referer': 'https://result.rgpv.ac.in/result/BErslt.aspx',
            'Origin': 'https://result.rgpv.ac.in'
          }
        }, postParams);

        const html = resultRes.text;

        // Check for common error messages in the returned javascript alerts
        if (html.includes('you have entered a wrong text')) {
          sendJSON(res, 400, { error: 'Incorrect captcha. Please try again.' });
          return;
        }
        if (html.includes('Result for this Enrollment No. not Found')) {
          sendJSON(res, 404, { error: 'Result for this Enrollment No. not found.' });
          return;
        }

        // Parse student info using helper
        const name = getMatch(html, [
          'ctl00_ContentPlaceHolder1_lblNameGrading',
          'ctl00_ContentPlaceHolder1_lblName'
        ]) || 'Student';

        const enrollment = getMatch(html, [
          'ctl00_ContentPlaceHolder1_lblRollNoGrading',
          'ctl00_ContentPlaceHolder1_txtrollno',
          'ctl00_ContentPlaceHolder1_lblEnrollNo'
        ]) || enrollmentNo;

        const rawBranch = getMatch(html, [
          'ctl00_ContentPlaceHolder1_lblBranchGrading',
          'ctl00_ContentPlaceHolder1_lblBranch'
        ]) || 'B.Tech';

        const college = getMatch(html, [
          'ctl00_ContentPlaceHolder1_lblCollegeGrading',
          'ctl00_ContentPlaceHolder1_lblCollege'
        ]) || 'RGPV Affiliated College';

        const sgpaStr = getMatch(html, ['ctl00_ContentPlaceHolder1_lblSGPA', 'ctl00_ContentPlaceHolder1_lblsgpa']) || '0';
        const cgpaStr = getMatch(html, ['ctl00_ContentPlaceHolder1_lblcgpa', 'ctl00_ContentPlaceHolder1_lblCGPA']) || '0';
        const sgpa = parseFloat(sgpaStr) || 0;
        const cgpa = parseFloat(cgpaStr) || 0;

        // Debug: log key parsed fields
        console.log('[RGPV] name:', name, '| enrollment:', enrollment, '| sgpa:', sgpa, '| cgpa:', cgpa);
        console.log('[RGPV] HTML (chars 2000-6000):', html.substring(2000, 6000));

        // Load RGPV subject names database
        const rgpvDbPath = path.join(__dirname, 'rgpv_subjects.json');
        let rgpvSubjects = {};
        if (fs.existsSync(rgpvDbPath)) {
          try { rgpvSubjects = JSON.parse(fs.readFileSync(rgpvDbPath, 'utf8')); } catch(_) {}
        }

        // Helper: strip [T]/[P] suffix and look up subject name
        function getRGPVSubjectName(rawCode) {
          // rawCode e.g. "BT102-[T]" or "BT201-[P]"
          const baseCode = rawCode.replace(/-?\s*\[(T|P|L)\]/gi, '').replace(/[-\s]+$/, '').trim().toUpperCase();
          const type = /\[P\]/i.test(rawCode) ? 'Practical' : /\[L\]/i.test(rawCode) ? 'Lab' : 'Theory';
          const name = rgpvSubjects[baseCode];
          if (name) return { name: `${name} (${type})`, baseCode, type };
          // Readable fallback: "BT102 Theory"
          return { name: `${baseCode} ${type}`, baseCode, type };
        }

        // Parse subjects — try dedicated panel first, fall back to full HTML
        let searchHtml = html;
        const panelIdMatch = html.match(/id="(ctl00_ContentPlaceHolder1_pnl(?:Grading|OldFormat|Result)[^"]*)"/i);
        if (panelIdMatch) {
          const pid = panelIdMatch[1];
          const startIdx = html.indexOf(`id="${pid}"`);
          if (startIdx !== -1) searchHtml = html.substring(startIdx);
        }

        const subjects = [];
        // RGPV table row format: code | credits | credits | grade  (4 cols, no name column)
        const rows = searchHtml.split(/<\/tr>/i);
        for (const row of rows) {
          const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
          let tdMatch;
          const tds = [];
          while ((tdMatch = tdRegex.exec(row)) !== null) {
            const val = tdMatch[1].replace(/<[^>]*>/g, '').trim();
            if (val) tds.push(val);
          }

          if (tds.length < 3) continue;

          let code, creditsStr, grade;
          if (tds.length === 3) {
            // code | credits | grade
            [code, creditsStr, grade] = tds;
          } else if (tds.length === 4) {
            // RGPV format: code | credits | credits | grade  (two identical credit fields)
            // But could also be code | name | credits | grade — detect by checking if tds[1] is numeric
            code = tds[0];
            if (/^\d+$/.test(tds[1])) {
              // tds[1] is numeric → it's the duplicate credits field
              creditsStr = tds[1];
              grade = tds[3];
            } else {
              // tds[1] is text → it's a subject name (some RGPV pages include it)
              creditsStr = tds[2];
              grade = tds[3];
            }
          } else {
            // 5+ cells: take last 3 reliably
            grade      = tds[tds.length - 1];
            creditsStr = tds[tds.length - 2];
            code       = tds[tds.length - 4] || tds[0];
          }

          const isCode  = /^[A-Z]{2,6}[\s-]?\d{3,4}/i.test((code || '').trim());
          const isGrade = /^(O|A\+|A|B\+|B|C\+|C|D|F|I|W)$/i.test((grade || '').trim());

          if (isCode && isGrade) {
            const rawCode = code.trim();
            const { name: subjName, baseCode, type } = getRGPVSubjectName(rawCode);
            const cleanCode = rawCode.toUpperCase().replace(/\s+/g, '');
            const credits   = parseInt(creditsStr) || (type === 'Theory' ? 3 : 1);
            const alreadyExists = subjects.some(s => s.code === cleanCode);
            if (!alreadyExists) {
              subjects.push({
                code:    cleanCode,
                name:    subjName,
                baseCode,
                type,
                credits,
                grade:   grade.trim().toUpperCase(),
                status:  grade.trim().toUpperCase() === 'F' ? 'FAIL' : 'PASS'
              });
            }
          }
        }

        console.log('[RGPV] Parsed subjects count:', subjects.length, subjects.map(s => s.code + ':' + s.grade + ':' + s.name).join(', '));

        // Structure into standard response shape
        const responseData = {
          success: true,
          resultJson: {
            stprofile: {
              nrollno: enrollment,
              stname: name,
              prgname: rawBranch,
              iname: college
            },
            allSemesters: [
              {
                semester: parseInt(semester),
                sgpa: sgpa,
                subjects: subjects
              }
            ],
            cgpa: cgpa
          }
        };

        sendJSON(res, 200, responseData);
      } catch(err) {
        console.error('RGPV result POST error:', err);
        sendJSON(res, 500, { error: 'Error connecting to RGPV portal: ' + err.message });
      }
      return;
    }

    // ── GET /api/captcha ──────────────────────────────────────────────
    if (url.pathname === '/api/captcha' && req.method === 'GET') {
      const loginPage = await ggsipuRequest('/web/login.jsp');
      let cookie = loginPage.cookie || '';
      const capRes = await ggsipuRequest('/web/CaptchaServlet', { cookie });
      if (capRes.cookie) cookie = capRes.cookie;
      const sid = crypto.randomBytes(16).toString('hex');
      sessions.set(sid, { jsessionid: cookie, timestamp: Date.now() });
      sendJSON(res, 200, {
        sessionId: sid,
        captchaImage: `data:image/png;base64,${capRes.buf.toString('base64')}`,
      });
      return;
    }

    // ── POST /api/login ───────────────────────────────────────────────
    if (url.pathname === '/api/login' && req.method === 'POST') {
      const chunks = [];
      for await (const c of req) chunks.push(c);
      const { sessionId, username, password, captcha } = JSON.parse(Buffer.concat(chunks).toString());

      const session = sessions.get(sessionId);
      if (!session) { sendJSON(res, 400, { error: 'Session expired. Please refresh the captcha.' }); return; }

      const hashedPw = hashPassword(password, captcha);
      const formBody = `username=${encodeURIComponent(username)}&passwd=${encodeURIComponent(hashedPw)}&captcha=${encodeURIComponent(captcha)}`;

      const loginRes = await ggsipuRequest('/web/Login', {
        method: 'POST',
        cookie: session.jsessionid,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(formBody),
          'Referer': 'https://examweb.ggsipu.ac.in/web/login.jsp',
          'Origin': 'https://examweb.ggsipu.ac.in',
        },
      }, formBody);

      if (loginRes.cookie) session.jsessionid = loginRes.cookie;
      console.log('After login POST, cookie:', session.jsessionid?.substring(0,80));

      const ltext = loginRes.text.toLowerCase();
      if (ltext.includes('captcha validation fails') || (loginRes.status === 200 && ltext.includes('captcha'))) {
        sendJSON(res, 200, { success: false, error: 'Captcha validation failed. Please refresh & try again.' }); return;
      }
      if (ltext.includes('invalid') && ltext.includes('password')) {
        sendJSON(res, 200, { success: false, error: 'Invalid enrollment number or password.' }); return;
      }

      // Follow ALL redirects (up to 6 hops), accumulating cookies at each step
      let lastRes = loginRes;
      let visitedPaths = new Set();
      for (let hop = 0; hop < 6; hop++) {
        const loc = lastRes.location;
        if (!loc) break; // no more redirects
        const nextPath = resolveGgsipuPath(loc);
        if (visitedPaths.has(nextPath)) break; // loop guard
        visitedPaths.add(nextPath);
        console.log(`Redirect hop ${hop+1}: ${nextPath} | cookie len=${session.jsessionid?.length}`);
        const r = await ggsipuRequest(nextPath, { cookie: session.jsessionid });
        if (r.cookie) session.jsessionid = r.cookie;
        lastRes = r;
      }

      const homeRes = lastRes;
      console.log('Final cookie after all redirects:', session.jsessionid?.substring(0,80));


      // Check if still on login page
      if (homeRes.text.toLowerCase().includes('captcha') && homeRes.text.includes('loginForm')) {
        sendJSON(res, 200, { success: false, error: 'Login failed. Please check credentials & captcha.' }); return;
      }

      const pages = { home: homeRes.text };
      session.loggedIn = true;
      session.username = username; // save for result fetch

      // Fetch result data
      // NOTE: euno=100 was the originally working value (session cookie identifies the user, not euno)
      let resultJson = null;
      const endpoints = [
        `/web/StudentSearchProcess?flag=2&euno=100`,
        `/web/StudentSearchProcess?flag=3&euno=100`,
        `/web/StudentSearchProcess?flag=1&euno=100`,
        `/web/StudentSearchProcess?flag=2&euno=0`,
        `/web/StudentSearchProcess?flag=2`,
      ];

      for (const endpoint of endpoints) {
        try {
          const r = await ggsipuRequest(endpoint, { cookie: session.jsessionid });
          console.log(`[${endpoint}] status=${r.status} => ${r.text.substring(0,80)}`);
          if (r.status === 200 && r.text.trim().startsWith('{')) {
            const parsed = JSON.parse(r.text);
            if (parsed && (parsed.stresult || parsed.stprofile)) {
              resultJson = parsed;
              console.log('Result fetched OK from:', endpoint);
              break;
            }
          }
        } catch (e) {
          console.error(`[${endpoint}] error:`, e.message);
        }
      }

      // Fallback: try fetching student result JSP pages
      if (!resultJson) {
        const fallbackPages = [
          '/web/student/studentresult.jsp',
          '/web/student/examresult.jsp',
          '/web/StudentSearchProcess?flag=2&euno=100&type=json',
        ];
        for (const pg of fallbackPages) {
          try {
            const r = await ggsipuRequest(pg, { cookie: session.jsessionid });
            console.log(`[fallback ${pg}] status=${r.status} => ${r.text.substring(0,80)}`);
            if (r.status === 200) {
              // Try to find embedded JSON
              const m = r.text.match(/\{[^<]*"stresult"[^<]*\}/s);
              if (m) { try { resultJson = JSON.parse(m[0]); break; } catch(_) {} }
            }
          } catch(e) {}
        }
      }

      if (!resultJson) console.warn('All result fetch attempts failed');

      sendJSON(res, 200, { success: true, pages, resultJson, sessionId });
      return;
    }

    // ── GET /api/page?sessionId=...&path=... ──────────────────────────
    if (url.pathname === '/api/page' && req.method === 'GET') {
      const sid = url.searchParams.get('sessionId');
      const pagePath = url.searchParams.get('path');
      const session = sessions.get(sid);
      if (!session) { sendJSON(res, 400, { error: 'Session expired.' }); return; }
      const r = await ggsipuRequest(pagePath, { cookie: session.jsessionid });
      if (r.cookie) session.jsessionid = r.cookie;
      sendJSON(res, 200, { html: r.text, status: r.status });
      return;
    }

    // ── GET /api/syllabus ─────────────────────────────────────────────
    if (url.pathname === '/api/syllabus' && req.method === 'GET') {
      const stream = url.searchParams.get('stream');
      const semester = url.searchParams.get('semester');
      const dbPath = path.join(__dirname, 'syllabus.json');
      let data = {};
      if (fs.existsSync(dbPath)) {
        try { data = JSON.parse(fs.readFileSync(dbPath, 'utf8')); } catch(_) {}
      }
      // If no query parameters, return union of all streams (keys) and defaults
      if (!stream && !semester) {
        const keys = Object.keys(data);
        const defaults = ['CSE', 'ECE', 'IT', 'EEE', 'MAE', 'AIDS', 'AIML', 'CSE-DS', 'CSE-AIML', 'CSE-AI', 'DS', 'ICE', 'ME', 'CIVIL', 'IIOT', 'CSE-ICB', 'CSE-IoT', 'CSE-Net', 'CSE-CS'];
        const union = Array.from(new Set([...defaults, ...keys]));
        sendJSON(res, 200, union);
        return;
      }
      
      const normStream = stream.toUpperCase().replace(/[^A-Z0-9]/g, '');
      let streamData = {};
      for (const k in data) {
        if (k.toUpperCase().replace(/[^A-Z0-9]/g, '') === normStream) {
          streamData = data[k];
          break;
        }
      }
      const semSubjects = streamData[semester] || [];
      sendJSON(res, 200, semSubjects);
      return;
    }

    // ── GET /api/credits ──────────────────────────────────────────────
    if (url.pathname === '/api/credits' && req.method === 'GET') {
      const dbPath = path.join(__dirname, 'syllabus.json');
      let data = {};
      if (fs.existsSync(dbPath)) {
        try { data = JSON.parse(fs.readFileSync(dbPath, 'utf8')); } catch(_) {}
      }
      const creditsMap = {};
      for (const stream in data) {
        for (const semester in data[stream]) {
          const subjects = data[stream][semester] || [];
          for (const s of subjects) {
            if (s && s.code) {
              const normCode = s.code.toUpperCase().replace(/[^A-Z0-9]/g, '');
              if (normCode) {
                creditsMap[normCode] = parseInt(s.credits) || parseInt(s.credit) || 3;
              }
            }
          }
        }
      }
      sendJSON(res, 200, creditsMap);
      return;
    }

    // ── POST /api/admin/syllabus ──────────────────────────────────────
    if (url.pathname === '/api/admin/syllabus' && req.method === 'POST') {
      const chunks = [];
      for await (const c of req) chunks.push(c);
      const { stream, semester, subjects } = JSON.parse(Buffer.concat(chunks).toString());

      if (!stream || !semester || !Array.isArray(subjects)) {
        sendJSON(res, 400, { error: 'Invalid syllabus payload.' });
        return;
      }

      // Normalise semester to a plain number string ("3rd semester" → "3")
      const semMatch = String(semester).match(/\d+/);
      const normSemester = semMatch ? semMatch[0] : String(semester);

      const dbPath = path.join(__dirname, 'syllabus.json');
      let data = {};
      if (fs.existsSync(dbPath)) {
        try { data = JSON.parse(fs.readFileSync(dbPath, 'utf8')); } catch(_) {}
      }

      if (!data[stream]) data[stream] = {};
      data[stream][normSemester] = subjects;

      // Duplicate general subjects and multi-branch subjects separated by /
      const keys = Object.keys(data);
      const defaults = ['CSE', 'ECE', 'IT', 'EEE', 'MAE', 'AIDS', 'AIML', 'CSE-DS', 'CSE-AIML', 'CSE-AI', 'DS', 'ICE', 'ME', 'CIVIL', 'IIOT', 'CSE-ICB', 'CSE-IoT', 'CSE-Net', 'CSE-CS'];
      const allStreams = Array.from(new Set([...defaults, ...keys]));
      
      for (const sub of subjects) {
        if (!sub) continue;
        let copyBranches = [];

        if ((sub.name && sub.name.toLowerCase().includes('general')) || (sub.branch && sub.branch.toLowerCase().includes('general'))) {
          copyBranches = allStreams.filter(b => b !== stream);
        } else if (sub.branch) {
          copyBranches = sub.branch.split('/').map(b => b.trim().toUpperCase()).filter(b => b && b !== stream);
        }

        for (const targetStr of copyBranches) {
          if (!data[targetStr]) data[targetStr] = {};
          if (!data[targetStr][normSemester]) data[targetStr][normSemester] = [];

          const idx = data[targetStr][normSemester].findIndex(s => s.code === sub.code);
          if (idx > -1) {
            data[targetStr][normSemester][idx] = sub;
          } else {
            data[targetStr][normSemester].push(sub);
          }
        }
      }

      fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf8');
      sendJSON(res, 200, { success: true });
      return;
    }

    // ── DELETE /api/admin/syllabus ────────────────────────────────────
    if (url.pathname === '/api/admin/syllabus' && req.method === 'DELETE') {
      const stream   = url.searchParams.get('stream');
      const semester = url.searchParams.get('semester');
      if (!semester) {
        sendJSON(res, 400, { error: 'semester query param required.' });
        return;
      }
      const semMatch    = String(semester).match(/\d+/);
      const normSem     = semMatch ? semMatch[0] : semester;

      const dbPath = path.join(__dirname, 'syllabus.json');
      let data = {};
      if (fs.existsSync(dbPath)) {
        try { data = JSON.parse(fs.readFileSync(dbPath, 'utf8')); } catch(_) {}
      }

      let deletedCount = 0;
      const branchesAffected = [];

      if (!stream || stream.toLowerCase() === 'all' || stream === '*') {
        // Delete this semester from ALL branches
        for (const k in data) {
          if (data[k] && data[k][normSem]) {
            deletedCount += (data[k][normSem] || []).length;
            delete data[k][normSem];
            branchesAffected.push(k);
            if (Object.keys(data[k]).length === 0) {
              delete data[k];
            }
          }
        }
      } else {
        // Delete from a specific branch
        const normStream = stream.toUpperCase().replace(/[^A-Z0-9\-]/g, '');
        let matchedKey = null;
        for (const k in data) {
          if (k.toUpperCase().replace(/[^A-Z0-9\-]/g, '') === normStream) { matchedKey = k; break; }
        }

        if (matchedKey && data[matchedKey] && data[matchedKey][normSem]) {
          deletedCount = (data[matchedKey][normSem] || []).length;
          delete data[matchedKey][normSem];
          branchesAffected.push(matchedKey);
          if (Object.keys(data[matchedKey]).length === 0) delete data[matchedKey];
        } else {
          sendJSON(res, 404, { error: `No subjects found for ${stream} semester ${semester}.` });
          return;
        }
      }

      fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf8');
      sendJSON(res, 200, { success: true, deletedCount, branchesAffected });
      return;
    }


    if (url.pathname === '/api/leaderboard' && req.method === 'GET') {
      const data = await getLeaderboardData();
      // Only return approved entries to public leaderboard
      const approvedOnly = data.filter(item => item.approved === true);
      sendJSON(res, 200, approvedOnly);
      return;
    }

    // ── GET /api/admin/entries ────────────────────────────────────────
    if (url.pathname === '/api/admin/entries' && req.method === 'GET') {
      const data = await getLeaderboardData();
      sendJSON(res, 200, data);
      return;
    }

    // ── POST /api/admin/approve ───────────────────────────────────────
    if (url.pathname === '/api/admin/approve' && req.method === 'POST') {
      const chunks = [];
      for await (const c of req) chunks.push(c);
      const { rollno, timestamp, approved } = JSON.parse(Buffer.concat(chunks).toString());

      const data = await getLeaderboardData();

      const idx = data.findIndex(item => (rollno && item.rollno === rollno) || (timestamp && item.timestamp === timestamp));
      if (idx > -1) {
        data[idx].approved = !!approved;
        await saveLeaderboardData(data);
        sendJSON(res, 200, { success: true, entry: data[idx] });
      } else {
        sendJSON(res, 404, { error: 'Entry not found' });
      }
      return;
    }

    // ── POST /api/certificate ─────────────────────────────────────────
    if (url.pathname === '/api/certificate' && req.method === 'POST') {
      const chunks = [];
      for await (const c of req) chunks.push(c);
      const payload = JSON.parse(Buffer.concat(chunks).toString());
      
      const { name, rollno, college, branch, cgpa, experience, source } = payload;
      if (!name || !rollno || !cgpa || !experience || !source) {
        sendJSON(res, 400, { error: 'Missing required certificate details.' });
        return;
      }

      const data = await getLeaderboardData();

      const newEntry = {
        name,
        rollno,
        college: college || 'Other',
        branch: branch || 'General',
        cgpa: parseFloat(cgpa) || 0,
        sgpa: parseFloat(cgpa) || 0, // backwards compatibility
        experience,
        source,
        approved: false, // requires admin approval
        timestamp: Date.now()
      };

      // Limit 1 review per ID (rollno): Find if already exists
      const existingIdx = data.findIndex(item => item.rollno === rollno);
      if (existingIdx > -1) {
        // preserve approval if it wasn't edited, but since they submitted a new review, reset to false
        data[existingIdx] = newEntry; // update review
      } else {
        data.push(newEntry); // insert new review
      }
      
      // Sort leaderboard: highest CGPA first
      data.sort((a, b) => b.cgpa - a.cgpa);

      await saveLeaderboardData(data);
      sendJSON(res, 200, { success: true, leaderboard: data });
      return;
    }

    // ── Static file serving ───────────────────────────────────────────
    const filePath = url.pathname === '/' ? '/index.html' : url.pathname;
    const full = path.join(__dirname, filePath);
    if (fs.existsSync(full) && fs.statSync(full).isFile()) {
      const ext = path.extname(full);
      res.writeHead(200, { 'Content-Type': mime(ext) });
      res.end(fs.readFileSync(full));
    } else {
      res.writeHead(404); res.end('Not Found');
    }

  } catch (e) {
    console.error('Error:', e.message);
    if (url.pathname.startsWith('/api/')) {
      sendJSON(res, 500, { error: e.message });
    } else {
      res.writeHead(500); res.end('Server Error');
    }
  }
});

server.listen(PORT, 'localhost', () => {
  console.log('\n╔═══════════════════════════════════════════╗');
  console.log('║  🎓 Apna Engineering Result Server        ║');
  console.log(`║  🌐 http://localhost:${PORT}               ║`);
  console.log('║  Press Ctrl+C to stop                     ║');
  console.log('╚═══════════════════════════════════════════╝\n');
});
