(() => {
  'use strict';

  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  const overlay = document.getElementById('gameOverlay');
  const startButton = document.getElementById('startButton');
  const pauseButton = document.getElementById('pauseButton');
  const soundButton = document.getElementById('soundButton');
  const bestScoreEl = document.getElementById('bestScore');
  const lastScoreEl = document.getElementById('lastScore');
  const overlayKicker = document.getElementById('overlayKicker');
  const overlayTitle = document.getElementById('overlayTitle');
  const overlayCopy = document.getElementById('overlayCopy');

  const W = canvas.width, H = canvas.height, groundY = 579;
  let state = 'ready', score = 0, lastTime = 0, pipeTimer = 0, muted = false, audio;
  let best = Number(localStorage.getItem('featherbound-best')) || 0;
  let pipes = [], motes = [];
  const bird = { x: 135, y: 295, vy: 0, rotation: 0, wing: 0 };
  bestScoreEl.textContent = String(best).padStart(2, '0');

  function reset() {
    score = 0; pipeTimer = 700; pipes = [];
    bird.y = 295; bird.vy = 0; bird.rotation = 0;
    motes = Array.from({length: 16}, (_, i) => ({ x:(i * 83) % W, y:60 + (i * 137) % 480, r:1 + i % 2, speed:5 + i % 7 }));
  }

  function tone(frequency, duration, type = 'sine') {
    if (muted) return;
    audio ||= new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audio.createOscillator(), gain = audio.createGain();
    oscillator.type = type; oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(.055, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(.001, audio.currentTime + duration);
    oscillator.connect(gain).connect(audio.destination); oscillator.start(); oscillator.stop(audio.currentTime + duration);
  }

  function start() {
    reset(); state = 'playing'; overlay.classList.add('hidden'); pauseButton.classList.add('visible');
    lastTime = performance.now(); tone(520, .08); requestAnimationFrame(loop);
  }

  function flap() {
    if (state === 'ready' || state === 'over') return start();
    if (state !== 'playing') return;
    bird.vy = -370; bird.wing = 1; tone(650, .06, 'triangle');
  }

  function finish() {
    state = 'over'; tone(130, .3, 'sawtooth');
    best = Math.max(best, score); localStorage.setItem('featherbound-best', best);
    bestScoreEl.textContent = String(best).padStart(2, '0'); lastScoreEl.textContent = String(score).padStart(2, '0');
    overlayKicker.textContent = 'FLIGHT ENDED'; overlayTitle.textContent = score ? `${score} ${score === 1 ? 'opening' : 'openings'}` : 'Almost airborne';
    overlayCopy.innerHTML = score >= best && score > 0 ? 'A new best flight.<br>The sky remembers.' : 'The sky is still there.<br>Try once more.';
    startButton.innerHTML = 'FLY AGAIN <span>→</span>'; pauseButton.classList.remove('visible'); overlay.classList.remove('hidden');
  }

  function update(dt) {
    bird.vy += 1050 * dt; bird.y += bird.vy * dt; bird.rotation = Math.min(.95, bird.rotation + 1.8 * dt); bird.wing = Math.max(0, bird.wing - 4 * dt);
    pipeTimer += dt * 1000;
    if (pipeTimer > 1450) { const gap = 156, top = 90 + Math.random() * 270; pipes.push({x:W + 25, top, gap, scored:false}); pipeTimer = 0; }
    pipes.forEach(p => { p.x -= 145 * dt; if (!p.scored && p.x + 64 < bird.x) { p.scored = true; score++; tone(880, .08); } });
    pipes = pipes.filter(p => p.x > -90); motes.forEach(m => { m.x -= m.speed * dt; if(m.x < 0) m.x = W; });
    const bx = bird.x, by = bird.y, radius = 17;
    if (by + radius > groundY || by - radius < 0 || pipes.some(p => bx + radius > p.x && bx - radius < p.x + 66 && (by - radius < p.top || by + radius > p.top + p.gap))) finish();
  }

  function drawPipe(p) {
    ctx.fillStyle = '#225653'; ctx.fillRect(p.x, 0, 66, p.top); ctx.fillRect(p.x, p.top + p.gap, 66, groundY - p.top - p.gap);
    ctx.fillStyle = '#3f817c'; ctx.fillRect(p.x + 8, 0, 10, p.top); ctx.fillRect(p.x + 8, p.top + p.gap, 10, groundY - p.top - p.gap);
    ctx.fillStyle = '#183b3a'; ctx.fillRect(p.x - 5, p.top - 18, 76, 18); ctx.fillRect(p.x - 5, p.top + p.gap, 76, 18);
    ctx.fillStyle = '#5b9993'; ctx.fillRect(p.x + 5, p.top - 14, 10, 10); ctx.fillRect(p.x + 5, p.top + p.gap + 4, 10, 10);
  }

  function drawBird() {
    ctx.save(); ctx.translate(bird.x, bird.y); ctx.rotate(bird.rotation);
    ctx.fillStyle='#183234'; ctx.beginPath(); ctx.ellipse(0,0,24,18,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#efad45'; ctx.beginPath(); ctx.ellipse(-2,-2,19,14,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#f8dfaa'; ctx.beginPath(); ctx.ellipse(-6, bird.wing ? 7 : 2, 13,7,-.4,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#d85b43'; ctx.beginPath(); ctx.moveTo(17,-3); ctx.lineTo(34,2); ctx.lineTo(17,7); ctx.closePath(); ctx.fill();
    ctx.fillStyle='white'; ctx.beginPath(); ctx.arc(9,-7,5,0,Math.PI*2); ctx.fill(); ctx.fillStyle='#183234'; ctx.beginPath(); ctx.arc(11,-7,2,0,Math.PI*2); ctx.fill(); ctx.restore();
  }

  function draw() {
    ctx.fillStyle='#83cfca'; ctx.fillRect(0,0,W,H);
    const gradient=ctx.createLinearGradient(0,0,0,H); gradient.addColorStop(0,'rgba(255,255,255,.18)'); gradient.addColorStop(1,'rgba(36,116,112,.12)'); ctx.fillStyle=gradient; ctx.fillRect(0,0,W,H);
    ctx.fillStyle='rgba(255,255,255,.55)'; motes.forEach(m => ctx.fillRect(m.x,m.y,m.r,m.r));
    ctx.fillStyle='rgba(245,240,229,.48)'; [[45,110,42],[345,165,55],[210,75,30]].forEach(([x,y,s]) => { ctx.beginPath(); ctx.ellipse(x,y,s,9,0,0,Math.PI*2); ctx.fill(); });
    pipes.forEach(drawPipe); drawBird();
    ctx.fillStyle='#e6b652'; ctx.fillRect(0,groundY,W,H-groundY); ctx.fillStyle='#183b3a'; ctx.fillRect(0,groundY,W,7);
    ctx.fillStyle='#ca9241'; for(let x=0;x<W;x+=24) ctx.fillRect(x,groundY+17+(x%48?8:0),13,3);
    if (state === 'playing' || state === 'paused') { ctx.textAlign='center'; ctx.fillStyle='rgba(24,50,52,.22)'; ctx.font='700 58px Fraunces'; ctx.fillText(String(score).padStart(2,'0'), W/2+2,74); ctx.fillStyle='#f5f0e5'; ctx.fillText(String(score).padStart(2,'0'),W/2,72); }
  }

  function loop(now) {
    if (state !== 'playing') return;
    const dt = Math.min((now-lastTime)/1000,.025); lastTime=now; update(dt); draw();
    if(state==='playing') requestAnimationFrame(loop);
  }

  startButton.addEventListener('click', e => { e.stopPropagation(); start(); });
  canvas.addEventListener('pointerdown', flap);
  document.addEventListener('keydown', e => { if(e.code==='Space' || e.code==='ArrowUp') { e.preventDefault(); flap(); } if(e.code==='KeyP' || e.code==='Escape') togglePause(); });
  function togglePause() { if(state==='playing') { state='paused'; pauseButton.textContent='▶'; overlayKicker.textContent='A BREATH'; overlayTitle.textContent='Paused'; overlayCopy.innerHTML='The wind can wait.<br>Return when you are ready.'; startButton.innerHTML='CONTINUE <span>→</span>'; overlay.classList.remove('hidden'); } else if(state==='paused') { state='playing'; pauseButton.textContent='Ⅱ'; overlay.classList.add('hidden'); lastTime=performance.now(); requestAnimationFrame(loop); } }
  pauseButton.addEventListener('click', togglePause);
  startButton.addEventListener('click', e => { if(state==='paused') { e.stopImmediatePropagation(); togglePause(); } }, true);
  soundButton.addEventListener('click', () => { muted=!muted; soundButton.setAttribute('aria-pressed',muted); soundButton.setAttribute('aria-label',muted?'Unmute sound':'Mute sound'); document.getElementById('soundIcon').textContent=muted?'×':'♪'; });
  reset(); draw();
})();
