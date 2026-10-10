const $ = id => document.getElementById(id);
const AC = window.AudioContext || window.webkitAudioContext;
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const noMedia = () => !(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
const kv = o => Object.entries(o).map(([k, v]) => `<li><span>${k}</span><span>${String(v).replace(/</g,'&lt;')}</span></li>`).join('');
const TESTS = [
  ['display','Display','#34d399','<rect x="3" y="4" width="18" height="12" rx="1.5"/><path d="M8 20h8M12 16v4"/>'],
  ['camera','Camera','#22d3ee','<rect x="3" y="7" width="13" height="10" rx="2"/><path d="M16 11l5-3v8l-5-3"/>'],
  ['mic','Microphone','#2dd4bf','<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0014 0M12 18v3"/>'],
  ['pointer','Touchpad & mouse','#a78bfa','<rect x="6" y="3" width="12" height="18" rx="6"/><path d="M12 3v7"/>'],
  ['keyboard','Keyboard','#f472b6','<rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10"/>'],
  ['speakers','Speakers','#fb923c','<path d="M4 9h4l5-4v14l-5-4H4zM17 8a5 5 0 010 8"/>'],
  ['battery','Battery','#facc15','<rect x="3" y="7" width="16" height="10" rx="2"/><path d="M21 11v2M7 10v4M11 10v4"/>'],
  ['system','System','#60a5fa','<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/>']
];
const CHECKS = TESTS.map(t => t[0]);
let R = {}; try{ R = JSON.parse(localStorage.getItem('ll-results') || '{}'); }catch(e){}
function mark(id, detail){ R[id] = { done: true, detail, at: new Date().toLocaleString() }; try{ localStorage.setItem('ll-results', JSON.stringify(R)); }catch(e){} paint(); }
function paint(){
  const d = id => !!(R[id] && R[id].done);
  document.querySelectorAll('[data-go]').forEach(b => { if(CHECKS.includes(b.dataset.go)) b.classList.toggle('done', d(b.dataset.go)); });
  const n = CHECKS.filter(d).length; $('progText').textContent = `${n} of ${CHECKS.length} checks done`; $('progBar').style.width = (n / CHECKS.length * 100) + '%';
}
const icon = (c, p) => `<svg viewBox="0 0 24 24" style="--c:${c}">${p}</svg>`;
$('nav').innerHTML = `<button data-go="home" style="--c:#34d399"><svg viewBox="0 0 24 24"><path d="M3 11l9-8 9 8v10H3zM9 21v-7h6v7"/></svg>Home<i>›</i></button>` +
  TESTS.map(([id, n, c, p]) => `<button data-go="${id}" style="--c:${c}">${icon(c, p).replace(' style="--c:'+c+'"','')}${n}<i>›</i></button>`).join('');
$('tiles').innerHTML = TESTS.map(([id, n, c, p]) => `<button data-go="${id}">${icon(c, p)}${n}</button>`).join('');

const pages = [...document.querySelectorAll('[data-page]')];
function go(name){
  pages.forEach(p => p.hidden = p.dataset.page !== name);
  document.querySelectorAll('[data-go]').forEach(b => b.classList.toggle('active', b.dataset.go === name));
  try{ history.replaceState(null, '', '#' + name); }catch(e){}
  if(name === 'display') screenInfo(); if(name === 'battery') battery().catch(e => $('batInfo').innerHTML = kv({ Status: 'Battery info is unavailable: ' + e.message }));
  if(name === 'speakers') listOutputs();
  if(name === 'system') system();
  if(name === 'report') report();
}
document.querySelectorAll('[data-go]').forEach(b => b.onclick = () => go(b.dataset.go));
$('bannerX').onclick = () => $('banner').remove();

// ---- Display ----
const COLORS = ['#000', '#fff', '#f00', '#0f0', '#00f', '#808080', 'linear-gradient(90deg,#000,#fff)'];
let fsIdx = -1; const fs = document.createElement('div'); fs.id = 'fs'; fs.innerHTML = '<span>Click: next color · Esc: exit</span>'; document.body.append(fs);
function showFs(){ if(fsIdx >= COLORS.length){ mark('display', 'Viewed all ' + COLORS.length + ' fills'); closeFs(); return; } fs.style.background = COLORS[fsIdx]; fs.style.display = 'block'; }
function closeFs(){ fs.style.display = 'none'; fsIdx = -1; const ex = document.exitFullscreen || document.webkitExitFullscreen; if((document.fullscreenElement || document.webkitFullscreenElement) && ex) ex.call(document); }
document.addEventListener('fullscreenchange', () => { if(!document.fullscreenElement && fsIdx >= 0) closeFs(); });
$('fsStart').onclick = () => { fsIdx = 0; showFs(); const req = fs.requestFullscreen || fs.webkitRequestFullscreen; if(req){ try{ Promise.resolve(req.call(fs)).catch(() => {}); }catch(e){} } };
fs.onclick = () => { fsIdx++; showFs(); };
document.addEventListener('keydown', e => { if(e.key === 'Escape' && fsIdx >= 0) closeFs(); });
function screenInfo(){
  $('screenInfo').innerHTML = kv({ Resolution: `${screen.width} × ${screen.height}`, 'Pixel ratio': devicePixelRatio, 'Color depth': screen.colorDepth + ' bit',
    'Window': `${innerWidth} × ${innerHeight}`, Orientation: (screen.orientation || {}).type || 'n/a', 'Touch points': navigator.maxTouchPoints });
}

// ---- Camera ----
let camStream;
$('camOn').onclick = async () => {
  try{
    if(noMedia()) throw new Error('Camera needs HTTPS or localhost and a modern browser.');
    camStream = await navigator.mediaDevices.getUserMedia({ video: true }); $('cam').srcObject = camStream;
    const t = camStream.getVideoTracks()[0], s = t.getSettings();
    $('camInfo').innerHTML = kv({ Name: t.label, Resolution: `${s.width} × ${s.height}`, 'Frame rate': (s.frameRate || 'n/a') + ' fps', 'Aspect ratio': s.aspectRatio ? s.aspectRatio.toFixed(3) : 'n/a', 'Device ID': s.deviceId });
    $('camOff').disabled = false; mark('camera', `${s.width}×${s.height} at ${s.frameRate || '?'} fps`);
  }catch(e){ $('camInfo').innerHTML = kv({ Error: e.name + ': ' + e.message }); }
};
$('camOff').onclick = () => { camStream.getTracks().forEach(t => t.stop()); $('cam').srcObject = null; $('camOff').disabled = true; };

// ---- Microphone ----
let micStream, micCtx, raf, peak = -100;
$('micOn').onclick = async () => {
  try{
    if(noMedia() || !AC) throw new Error('Microphone needs HTTPS or localhost and a modern browser.');
    micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    micCtx = new AC(); if(micCtx.state === 'suspended') micCtx.resume(); const an = micCtx.createAnalyser(); an.fftSize = 1024; micCtx.createMediaStreamSource(micStream).connect(an);
    const buf = new Float32Array(an.fftSize), s = micStream.getAudioTracks()[0].getSettings(); peak = -100;
    const loop = () => {
      an.getFloatTimeDomainData(buf); const rms = Math.sqrt(buf.reduce((a, b) => a + b * b, 0) / buf.length), db = 20 * Math.log10(rms || 1e-6);
      peak = Math.max(peak, db); if(peak > -40 && !(R.mic && R.mic.done)) mark('mic', 'Picked up sound, peak ' + peak.toFixed(0) + ' dB'); $('meter').style.width = Math.max(0, Math.min(100, (db + 60) / 60 * 100)) + '%';
      $('micInfo').innerHTML = kv({ Name: micStream.getAudioTracks()[0].label, Level: db.toFixed(1) + ' dB', Peak: peak.toFixed(1) + ' dB', 'Sample rate': micCtx.sampleRate + ' Hz', Channels: s.channelCount || 'n/a', 'Echo cancellation': s.echoCancellation });
      raf = requestAnimationFrame(loop);
    }; loop(); $('micOff').disabled = false;
  }catch(e){ $('micInfo').innerHTML = kv({ Error: e.name + ': ' + e.message }); }
};
$('micOff').onclick = () => { cancelAnimationFrame(raf); micStream.getTracks().forEach(t => t.stop()); micCtx.close(); $('meter').style.width = 0; $('micOff').disabled = true; };

// ---- Touchpad & mouse ----
const pad = $('pad'); let st, rate = 0, moves = 0;
const resetPad = () => st = { L: 0, M: 0, R: 0, dbl: 0, wx: 0, wy: 0, pinch: 0, x: '-', y: '-', type: '-', pressure: '-' };
function drawPad(){ if(st.L && st.R && (st.wx || st.wy) && !(R.pointer && R.pointer.done)) mark('pointer', 'Left click, right click and scroll registered');
  $('padInfo').innerHTML = kv({ Position: `${st.x}, ${st.y}`, 'Input type': st.type, Pressure: st.pressure, 'Left clicks': st.L, 'Middle clicks': st.M, 'Right clicks': st.R, 'Double clicks': st.dbl, 'Scroll X / Y': `${st.wx} / ${st.wy}`, 'Pinch events': st.pinch, 'Move events/sec': rate }); }
resetPad(); drawPad(); $('padReset').onclick = () => { resetPad(); drawPad(); };
pad.onpointermove = e => { moves++; Object.assign(st, { x: Math.round(e.offsetX), y: Math.round(e.offsetY), type: e.pointerType, pressure: e.pressure.toFixed(2) }); drawPad(); };
pad.onpointerdown = e => { st[['L', 'M', 'R'][e.button] || 'L']++; pad.classList.add('on'); drawPad(); };
pad.onpointerup = () => pad.classList.remove('on');
pad.ondblclick = () => { st.dbl++; drawPad(); };
pad.oncontextmenu = e => e.preventDefault();
pad.addEventListener('gesturechange', () => { st.pinch++; drawPad(); });
pad.addEventListener('wheel', e => { e.preventDefault(); if(e.ctrlKey) st.pinch++; else { st.wx += Math.round(e.deltaX); st.wy += Math.round(e.deltaY); } drawPad(); }, { passive: false });
setInterval(() => { rate = moves; moves = 0; }, 1000);

// ---- Speakers ----
let actx, cur; const spkHeard = new Set();
function audio(){
  if(!AC) throw new Error('Web Audio is not supported in this browser.');
  actx = actx || new AC(); if(actx.state === 'suspended') actx.resume(); return actx;
}
function stopTone(){ if(cur){ try{ cur.stop(); }catch(e){} cur = null; } }
function play(pan, sweep){
  try{
    const c = audio(); stopTone();
    const o = c.createOscillator(), g = c.createGain(), v = +$('vol').value, t = c.currentTime, d = sweep ? 4 : 1.2;
    if(sweep){ o.frequency.setValueAtTime(100, t); o.frequency.exponentialRampToValueAtTime(10000, t + d); } else o.frequency.value = +$('freq').value;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + .03); g.gain.setValueAtTime(v, t + d - .05); g.gain.linearRampToValueAtTime(0, t + d);
    o.connect(g);
    if(c.createStereoPanner){ const p = c.createStereoPanner(); p.pan.value = pan; g.connect(p); p.connect(c.destination); }
    else { const m = c.createChannelMerger(2); if(pan <= 0) g.connect(m, 0, 0); if(pan >= 0) g.connect(m, 0, 1); m.connect(c.destination); }
    o.start(t); o.stop(t + d); cur = o;
    spkHeard.add(sweep ? 'sweep' : pan); if(spkHeard.has(-1) && spkHeard.has(1)) mark('speakers', 'Left and right channels played' + (spkHeard.has('sweep') ? ', sweep run' : '')); o.onended = () => { if(cur === o) cur = null; };
    $('spkNote').textContent = sweep ? 'Sweeping 100 Hz to 10 kHz. Listen for rattles, buzzing or dropouts.' : '';
  }catch(e){ $('spkNote').textContent = 'Could not play sound: ' + e.message; }
}
document.querySelectorAll('[data-pan]').forEach(b => b.onclick = () => play(+b.dataset.pan, false));
$('sweep').onclick = () => play(0, true);
$('stopTone').onclick = stopTone;
async function listOutputs(){
  const sel = $('spkOut'), can = AC && 'setSinkId' in AC.prototype;
  sel.disabled = !can; $('spkList').disabled = !can;
  if(!can){ $('spkNote').textContent = 'Choosing an output device needs Chrome or Edge. Sound plays through the system default.'; return; }
  try{
    const outs = (await navigator.mediaDevices.enumerateDevices()).filter(d => d.kind === 'audiooutput' && d.deviceId !== 'default' && d.deviceId !== 'communications');
    const keep = sel.value;
    sel.innerHTML = '<option value="">System default</option>' + outs.map((d, i) => `<option value="${esc(d.deviceId)}">${esc(d.label || 'Output ' + (i + 1))}</option>`).join('');
    sel.value = keep;
  }catch(e){ $('spkNote').textContent = 'Could not list outputs: ' + e.message; }
}
$('spkList').onclick = listOutputs;
$('spkOut').onchange = async () => {
  try{ await audio().setSinkId($('spkOut').value); $('spkNote').textContent = 'Output changed.'; }
  catch(e){ $('spkNote').textContent = 'Could not switch output: ' + e.message; }
};

// ---- Battery ----
let batBound = false;
async function battery(){
  if(!navigator.getBattery){ $('batInfo').innerHTML = kv({ Status: 'Not supported in this browser. Use Chrome or Edge.' }); return; }
  const b = await navigator.getBattery();
  const draw = () => $('batInfo').innerHTML = kv({ Level: Math.round(b.level * 100) + '%', Charging: b.charging ? 'Yes' : 'No',
    'Time to full': b.charging && isFinite(b.chargingTime) ? Math.round(b.chargingTime / 60) + ' min' : '-', 'Time remaining': !b.charging && isFinite(b.dischargingTime) ? Math.round(b.dischargingTime / 60) + ' min' : '-' });
  draw(); mark('battery', Math.round(b.level * 100) + '% ' + (b.charging ? 'charging' : 'on battery')); if(!batBound){ ['levelchange', 'chargingchange', 'chargingtimechange', 'dischargingtimechange'].forEach(ev => b.addEventListener(ev, draw)); batBound = true; }
}
// ---- Keyboard ----
const LBL = {Escape:'Esc',Backquote:'`',Minus:'-',Equal:'=',Backspace:'⌫',BracketLeft:'[',BracketRight:']',Backslash:'\\',CapsLock:'Caps',Semicolon:';',Quote:"'",Comma:',',Period:'.',Slash:'/',ShiftLeft:'Shift',ShiftRight:'Shift',ControlLeft:'Ctrl',ControlRight:'Ctrl',MetaLeft:'Win',MetaRight:'Win',AltLeft:'Alt',AltRight:'Alt',Space:'',ContextMenu:'Menu',PrintScreen:'PrtSc',ScrollLock:'ScrLk',Insert:'Ins',Delete:'Del',PageUp:'PgUp',PageDown:'PgDn',ArrowUp:'↑',ArrowDown:'↓',ArrowLeft:'←',ArrowRight:'→'};
const lab = c => LBL[c] ?? (c.startsWith('Key') ? c[3] : c.startsWith('Digit') ? c[5] : c);
const KS = s => s.split('').map(x => 'Key' + x).join(' '), KD = [1,2,3,4,5,6,7,8,9,0].map(n => 'Digit' + n).join(' ');
const KF = (a, b) => Array.from({length: b - a + 1}, (_, i) => 'F' + (a + i)).join(' ');
const KROWS = [`Escape _1 ${KF(1,4)} _.5 ${KF(5,8)} _.5 ${KF(9,12)} _.5 PrintScreen ScrollLock Pause`,
  `Backquote ${KD} Minus Equal Backspace*2 _.5 Insert Home PageUp`, `Tab*1.5 ${KS('QWERTYUIOP')} BracketLeft BracketRight Backslash*1.5 _.5 Delete End PageDown`,
  `CapsLock*1.75 ${KS('ASDFGHJKL')} Semicolon Quote Enter*2.25 _3.5`, `ShiftLeft*2.25 ${KS('ZXCVBNM')} Comma Period Slash ShiftRight*2.75 _1.5 ArrowUp _1`,
  `ControlLeft*1.25 MetaLeft*1.25 AltLeft*1.25 Space*6.25 AltRight*1.25 MetaRight*1.25 ContextMenu*1.25 ControlRight*1.25 _.5 ArrowLeft ArrowDown ArrowRight`];
const kels = {}, ktested = new Set(), kheld = new Set(); let kmax = 0, klast = 0;
KROWS.forEach(r => { const row = document.createElement('div'); row.className = 'krow';
  r.split(' ').forEach(t => { if(t[0] === '_'){ const g = document.createElement('i'); g.style.flex = `${t.slice(1)} 1 0`; row.append(g); return; }
    const [c, w = '1'] = t.split('*'), k = document.createElement('b'); k.style.flex = `${w} 1 0`; k.textContent = lab(c); kels[c] = k; row.append(k); });
  $('kbd').append(row); });
function kStats(){ const n = [...ktested].filter(c => kels[c]).length, tot = Object.keys(kels).length;
  $('kbTested').textContent = n + ' / ' + tot; $('kbHeld').textContent = kheld.size; $('kbMax').textContent = kmax;
  if(n === tot && !(R.keyboard && R.keyboard.done)) mark('keyboard', `All ${tot} keys registered`); }
const kbOn = e => !document.querySelector('[data-page="keyboard"]').hidden && !/INPUT|SELECT|TEXTAREA/.test(e.target.tagName);
document.addEventListener('keydown', e => {
  if(!kbOn(e)) return; e.preventDefault();
  if(kels[e.code]) kels[e.code].classList.add('down', 'tested'); ktested.add(e.code);
  const now = performance.now(), gap = klast ? Math.round(now - klast) + ' ms' : '-';
  if(!e.repeat){ kheld.add(e.code); kmax = Math.max(kmax, kheld.size); klast = now; }
  $('kbLast').innerHTML = kv({ Key: e.key, Code: e.code, Location: ['standard','left','right','numpad'][e.location], Repeat: e.repeat, 'Since last press': gap }); kStats();
});
document.addEventListener('keyup', e => { kheld.delete(e.code); if(kels[e.code]) kels[e.code].classList.remove('down'); kStats(); });
window.addEventListener('blur', () => { kheld.clear(); Object.values(kels).forEach(k => k.classList.remove('down')); });
$('kbReset').onclick = () => { ktested.clear(); kheld.clear(); kmax = 0; Object.values(kels).forEach(k => k.classList.remove('down', 'tested')); $('kbLast').innerHTML = ''; kStats(); };
kStats();

// ---- System ----
function system(){
  let gpu = 'n/a'; try{ const gl = document.createElement('canvas').getContext('webgl'), x = gl.getExtension('WEBGL_debug_renderer_info'); gpu = x ? gl.getParameter(x.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER); }catch(e){}
  const c = navigator.connection || {}, m = navigator.userAgent.match(/(Edg|Chrome|Firefox|Version)\/[\d.]+/);
  const o = { Platform: (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || 'n/a', Browser: m ? m[0].replace('Edg', 'Edge').replace('Version', 'Safari') : 'n/a',
    'CPU threads': navigator.hardwareConcurrency || 'n/a', 'Memory (rounded)': navigator.deviceMemory ? 'at least ' + navigator.deviceMemory + ' GB' : 'n/a (Chrome and Edge only)', Graphics: gpu,
    Language: navigator.language, 'Time zone': Intl.DateTimeFormat().resolvedOptions().timeZone, Online: navigator.onLine ? 'Yes' : 'No',
    Connection: c.effectiveType ? `${c.effectiveType}, ${c.downlink} Mbps, ${c.rtt} ms` : 'n/a (Chrome and Edge only)', 'Dark mode': matchMedia('(prefers-color-scheme: dark)').matches ? 'On' : 'Off' };
  $('sysInfo').innerHTML = kv(o); mark('system', `${o.Platform}, ${o['CPU threads']} threads, ${gpu}`);
}

// ---- Field report ----
function report(){
  $('repList').innerHTML = TESTS.map(([id, n]) => { const r = R[id], ok = r && r.done;
    return `<li><span>${n}</span><span class="chip ${ok ? 'ok' : 'no'}">${ok ? 'Done' : 'Not run'}</span><span>${ok ? esc(r.detail) : ''}</span></li>`; }).join('');
}
const repText = () => ['Laptop Lab field report', new Date().toLocaleString(), ''].concat(TESTS.map(([id, n]) => `${n}: ${R[id] && R[id].done ? 'Done - ' + R[id].detail : 'Not run'}`)).join('\n');
function save(name, type, text){ const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; a.click(); }
$('repTxt').onclick = () => save('field-report.txt', 'text/plain', repText());
$('repJson').onclick = () => save('field-report.json', 'application/json', JSON.stringify({ date: new Date().toISOString(), results: R }, null, 2));
$('repPrint').onclick = () => window.print();
$('repClear').onclick = () => { R = {}; try{ localStorage.removeItem('ll-results'); }catch(e){} paint(); report(); };

// ---- Compatibility ----
(function(){
  const t = (k, v) => `<li><span>${k}</span><span class="${v ? 'ok' : 'no'}">${v ? 'Supported' : 'Not available'}</span></li>`;
  $('compat').innerHTML = t('Secure page (HTTPS/localhost)', window.isSecureContext) + t('Camera and microphone', !noMedia()) + t('Sound (Web Audio)', !!AC) +
    t('Speaker selection', !!AC && 'setSinkId' in AC.prototype) + t('Battery info', !!navigator.getBattery) + t('Full screen', !!(document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen)) + t('Touchpad pointer events', !!window.PointerEvent);
})();
paint();
go(pages.some(p => p.dataset.page === location.hash.slice(1)) ? location.hash.slice(1) : 'home');
