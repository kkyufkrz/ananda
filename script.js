/* ===========================
   script.js — Birthday Wrapped
   =========================== */

const TOTAL_SLIDES = 8;

let currentSlide = 0;
let isAnimating = false;
let autoPlayTimer = null;
let autoProgressTimer = null;
let progressValue = 0;
let isPaused = false;
let elapsedBeforePause = 0;   // ms elapsed before pause
let slideStartTime = 0;        // timestamp when current slide started / resumed
const AUTO_PLAY_DURATION = 7000; // ms per slide

// ===== DOM REFS =====
const slidesWrapper = document.getElementById('slidesWrapper');
const slides = document.querySelectorAll('.slide');
const progressSegmentsEl = document.getElementById('progressSegments');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const tapLeft = document.getElementById('tapLeft');
const tapRight = document.getElementById('tapRight');
const soundBtn = document.getElementById('soundBtn');
const pauseBtn = document.getElementById('pauseBtn');
const pauseOverlay = document.getElementById('pauseOverlay');
const startBtn = document.getElementById('startBtn');
const shareBtn = document.getElementById('shareBtn');
const restartBtn = document.getElementById('restartBtn');

// ===== INIT PROGRESS SEGMENTS =====
function buildProgressSegments() {
    progressSegmentsEl.innerHTML = '';
    for (let i = 0; i < TOTAL_SLIDES; i++) {
        const seg = document.createElement('div');
        seg.className = 'progress-seg';
        seg.id = `seg-${i}`;
        const fill = document.createElement('div');
        fill.className = 'progress-seg-fill';
        fill.id = `seg-fill-${i}`;
        seg.appendChild(fill);
        progressSegmentsEl.appendChild(seg);
    }
}

function updateProgressSegments(index) {
    for (let i = 0; i < TOTAL_SLIDES; i++) {
        const seg = document.getElementById(`seg-${i}`);
        const fill = document.getElementById(`seg-fill-${i}`);
        seg.classList.remove('done', 'active');
        fill.style.width = '0%';
        if (i < index) {
            seg.classList.add('done');
            fill.style.width = '100%';
        } else if (i === index) {
            seg.classList.add('active');
        }
    }
}

// ===== AUTO PROGRESS ANIMATION =====
function startAutoProgress(startFromMs = 0) {
    clearInterval(autoProgressTimer);
    progressValue = (startFromMs / AUTO_PLAY_DURATION) * 100;
    slideStartTime = Date.now();
    elapsedBeforePause = startFromMs;
    const fill = document.getElementById(`seg-fill-${currentSlide}`);
    if (!fill) return;
    const step = 100 / (AUTO_PLAY_DURATION / 50);
    autoProgressTimer = setInterval(() => {
        progressValue += step;
        if (fill) fill.style.width = Math.min(progressValue, 100) + '%';
        if (progressValue >= 100) clearInterval(autoProgressTimer);
    }, 50);
}

function stopAutoProgress() {
    clearInterval(autoProgressTimer);
    clearTimeout(autoPlayTimer);
    elapsedBeforePause = Date.now() - slideStartTime + elapsedBeforePause;
}

// ===== PAUSE / RESUME =====
function pauseAutoPlay() {
    if (isPaused) return;
    isPaused = true;
    stopAutoProgress();
    pauseBtn.textContent = '▶';
    pauseBtn.classList.add('paused');
    pauseOverlay.classList.add('visible');
    // freeze the progress bar fill
    const fill = document.getElementById(`seg-fill-${currentSlide}`);
    if (fill) fill.style.transition = 'none';
}

function resumeAutoPlay() {
    if (!isPaused) return;
    isPaused = false;
    pauseBtn.textContent = '⏸';
    pauseBtn.classList.remove('paused');
    pauseOverlay.classList.remove('visible');
    const remaining = AUTO_PLAY_DURATION - elapsedBeforePause;
    if (remaining <= 0) {
        goToSlide(currentSlide + 1, 'forward');
        return;
    }
    startAutoProgress(elapsedBeforePause);
    autoPlayTimer = setTimeout(() => {
        goToSlide(currentSlide + 1, 'forward');
    }, remaining);
}

function togglePause() {
    if (isPaused) resumeAutoPlay();
    else pauseAutoPlay();
}

// ===== SLIDE TRANSITION =====
function goToSlide(index, direction = 'forward') {
    if (isAnimating || index < 0 || index >= TOTAL_SLIDES) return;
    if (index === currentSlide) return;

    isAnimating = true;
    isPaused = false;  // reset pause on slide change
    elapsedBeforePause = 0;
    pauseBtn.textContent = '⏸';
    pauseBtn.classList.remove('paused');
    pauseOverlay.classList.remove('visible');
    stopAutoProgress();

    const current = slides[currentSlide];
    const next = slides[index];

    const exitClass = direction === 'forward' ? 'slide-exit' : 'slide-exit-back';
    const enterClass = direction === 'forward' ? 'slide-enter' : 'slide-enter-back';

    current.classList.add(exitClass);
    next.style.opacity = '0';
    next.classList.remove('active');

    setTimeout(() => {
        current.classList.remove('active', exitClass);
        next.classList.add(enterClass);
        next.classList.add('active');
        next.style.opacity = '';

        setTimeout(() => {
            next.classList.remove(enterClass);
            isAnimating = false;
        }, 500);
    }, 100);

    currentSlide = index;
    updateProgressSegments(currentSlide);
    updateNavBtns();
    triggerSlideAnimations(currentSlide);

    // Auto play next
    if (currentSlide < TOTAL_SLIDES - 1) {
        startAutoProgress(0);
        slideStartTime = Date.now();
        autoPlayTimer = setTimeout(() => {
            if (!isPaused) goToSlide(currentSlide + 1, 'forward');
        }, AUTO_PLAY_DURATION);
    }
}

function nextSlide() { goToSlide(currentSlide + 1, 'forward'); }
function prevSlide() { goToSlide(currentSlide - 1, 'backward'); }

// ===== UPDATE NAV BUTTONS =====
function updateNavBtns() {
    prevBtn.classList.toggle('hidden', currentSlide === 0);
    nextBtn.classList.toggle('hidden', currentSlide === TOTAL_SLIDES - 1);
}

// ===== SLIDE SPECIFIC ANIMATIONS =====
function triggerSlideAnimations(index) {
    const slide = slides[index];

    // Reset animatable elements
    const animatables = slide.querySelectorAll('[data-animate]');
    animatables.forEach(el => {
        el.classList.remove('animated');
        void el.offsetWidth; // reflow
    });

    // Trigger with delays
    animatables.forEach(el => {
        const delay = parseInt(el.dataset.delay || 0);
        setTimeout(() => el.classList.add('animated'), delay);
    });

    // Slide-specific logic
    if (index === 1) animateCountUp(); // Age slide
    if (index === 2) animateStats();    // Stats slide
    if (index === 7) launchConfetti();  // Final slide
}

// ===== COUNT UP: AGE =====
function animateCountUp() {
    const el = document.getElementById('countNum');
    if (!el) return;
    let count = 0;
    const target = 22;
    const duration = 1200;
    const step = target / (duration / 16);
    el.textContent = '0';
    const interval = setInterval(() => {
        count = Math.min(count + step, target);
        el.textContent = Math.floor(count);
        if (count >= target) clearInterval(interval);
    }, 16);
}

// ===== ANIMATE STAT NUMBERS =====
function animateStats() {
    const statEls = document.querySelectorAll('.stat-number[data-count]');
    statEls.forEach(el => {
        const target = parseInt(el.dataset.count);
        const duration = 1500;
        const step = target / (duration / 16);
        let count = 0;
        const interval = setInterval(() => {
            count = Math.min(count + step, target);
            el.textContent = Math.floor(count).toLocaleString('id-ID');
            if (count >= target) clearInterval(interval);
        }, 16);
    });
}

// ===== CONFETTI =====
function launchConfetti() {
    const container = document.getElementById('confettiContainer');
    if (!container) return;
    container.innerHTML = '';
    const colors = ['#1db954', '#f472b6', '#60a5fa', '#fbbf24', '#a78bfa', '#34d399', '#f87171', '#fff'];
    const count = 120;
    for (let i = 0; i < count; i++) {
        const piece = document.createElement('div');
        piece.className = 'confetti-piece';
        const x = Math.random() * 100;
        const delay = Math.random() * 3;
        const duration = 2.5 + Math.random() * 3;
        const size = 6 + Math.random() * 10;
        const color = colors[Math.floor(Math.random() * colors.length)];
        const shape = Math.random() > 0.5 ? '50%' : '2px';
        piece.style.cssText = `
      left: ${x}%;
      top: -20px;
      width: ${size}px;
      height: ${size}px;
      background: ${color};
      border-radius: ${shape};
      animation-delay: ${delay}s;
      animation-duration: ${duration}s;
    `;
        container.appendChild(piece);
    }
}

// ===== PARTICLES =====
function createParticles(containerId, count = 20) {
    const container = document.getElementById(containerId);
    if (!container) return;
    for (let i = 0; i < count; i++) {
        const p = document.createElement('div');
        p.className = 'particle';
        const size = 2 + Math.random() * 4;
        const x = Math.random() * 100;
        const duration = 6 + Math.random() * 10;
        const delay = Math.random() * -15;
        const opacity = 0.3 + Math.random() * 0.5;
        p.style.cssText = `
      width: ${size}px;
      height: ${size}px;
      left: ${x}%;
      animation-duration: ${duration}s;
      animation-delay: ${delay}s;
      opacity: ${opacity};
    `;
        container.appendChild(p);
    }
}

// ===== TOUCH / SWIPE =====
let touchStartX = 0;
let touchStartY = 0;
let touchStartTime = 0;

document.addEventListener('touchstart', e => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    touchStartTime = Date.now();
}, { passive: true });

document.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;
    const dt = Date.now() - touchStartTime;
    if (Math.abs(dx) < 10 && Math.abs(dy) < 10 && dt < 250) {
        // Tap logic handled by tap zones
        return;
    }
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
        if (dx < 0) nextSlide();
        else prevSlide();
    }
}, { passive: true });

// ===== KEYBOARD =====
document.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight') nextSlide();
    if (e.key === 'ArrowLeft') prevSlide();
    if (e.key === ' ') { e.preventDefault(); togglePause(); }
});

// ===== BACKGROUND MUSIC =====
const bgMusic = document.getElementById('bgMusic');
let musicStarted = false;

bgMusic.volume = 0.6;

function startMusic() {
    if (musicStarted) return;
    musicStarted = true;
    bgMusic.play().then(() => {
        soundBtn.textContent = '🔊';
    }).catch(() => {
        // Autoplay blocked — keep muted state
        soundBtn.textContent = '🔇';
    });
}

function toggleSound() {
    if (!musicStarted) {
        startMusic();
        return;
    }
    if (bgMusic.paused) {
        bgMusic.play();
        soundBtn.textContent = '🔊';
    } else {
        bgMusic.pause();
        soundBtn.textContent = '🔇';
    }
}

function playClickTone() { } // no-op, beep removed


// ===== SHARE =====
function shareWebsite() {
    const url = window.location.href;
    if (navigator.share) {
        navigator.share({
            title: '🎂 Happy Birthday Ananda Salsabila!',
            text: 'Ucapan ulang tahun spesial untuk Ananda Salsabila yang ke-23! 🌟',
            url: url
        }).catch(() => copyToClipboard(url));
    } else {
        copyToClipboard(url);
    }
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        if (shareBtn) {
            const orig = shareBtn.textContent;
            shareBtn.textContent = '✅ Link Disalin!';
            setTimeout(() => { shareBtn.textContent = orig; }, 2000);
        }
    }).catch(() => {
        alert('Salin URL ini: ' + text);
    });
}

// ===== RESTART =====
function restart() {
    stopAutoProgress();
    slides.forEach(s => { s.classList.remove('active', 'slide-exit', 'slide-enter', 'slide-exit-back', 'slide-enter-back'); });
    currentSlide = 0;
    slides[0].classList.add('active');
    updateProgressSegments(0);
    updateNavBtns();
    triggerSlideAnimations(0);
}

// ===== INIT =====
function init() {
    buildProgressSegments();

    // Create particles for all slides
    for (let i = 0; i < TOTAL_SLIDES; i++) {
        createParticles(`particles-${i}`, 18);
    }

    // Set first slide
    slides[0].classList.add('active');
    updateProgressSegments(0);
    updateNavBtns();
    triggerSlideAnimations(0);

    // Buttons
    prevBtn.addEventListener('click', () => { playClickTone(660); prevSlide(); });
    nextBtn.addEventListener('click', () => { playClickTone(880); nextSlide(); });
    tapLeft.addEventListener('click', () => { playClickTone(660); prevSlide(); });
    tapRight.addEventListener('click', () => { playClickTone(880); nextSlide(); });
    soundBtn.addEventListener('click', toggleSound);
    if (startBtn) startBtn.addEventListener('click', () => {
        startMusic();  // start background music on first interaction
        nextSlide();
    });
    if (shareBtn) shareBtn.addEventListener('click', shareWebsite);
    if (restartBtn) restartBtn.addEventListener('click', () => {
        playClickTone(660);
        restart();
    });

    if (pauseBtn) pauseBtn.addEventListener('click', togglePause);

    // Long-press anywhere on slide to pause (mobile)
    let longPressTimer = null;
    document.addEventListener('touchstart', () => {
        longPressTimer = setTimeout(() => { pauseAutoPlay(); }, 500);
    }, { passive: true });
    document.addEventListener('touchend', () => {
        clearTimeout(longPressTimer);
    }, { passive: true });

    // Start auto-play from slide 0
    startAutoProgress();
    autoPlayTimer = setTimeout(() => {
        goToSlide(1, 'forward');
    }, AUTO_PLAY_DURATION);
}

document.addEventListener('DOMContentLoaded', init);
