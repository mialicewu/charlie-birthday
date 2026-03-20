(() => {
    'use strict';

    const EMOJIS = ['🍓', '🍋', '🍵', '🧋', '🍠', '🍫', '🍪', '🫐', '🍊', '🥥', '🍰', '🍜', '🍦', '🧁'];
    const _r = new Uint8Array([240,159,141,160,240,159,141,181]);
    const CORRECT = new Set(Array.from(new TextDecoder().decode(_r)));
    const _h = 'f7b12dc05d0507eb5a01e394098706025b9126f38982df1d1f98172640d0da10';
    const CONFETTI_EMOJIS = ['🎉', '🎂', '🎾', '🎈', '✨', '🌟', '💛', '🥳'];
    const LIGHT_COLORS = ['#F5C518', '#FFE066', '#ff9f43', '#ff6b6b', '#ee5a24', '#ffeaa7', '#fdcb6e', '#f8c291'];

    const $ = s => document.querySelector(s);
    const $$ = s => document.querySelectorAll(s);

    const lockScreen = $('#lock-screen');
    const mainContent = $('#main-content');
    const emojiField = $('#emoji-field');
    const cup = $('#cup');
    const cupContents = $('#cup-contents');
    const cupPlaceholder = $('#cup-placeholder');
    const orderBtn = $('#order-btn');
    const errorMsg = $('#error-msg');
    const successMsg = $('#success-msg');
    const forgotLink = $('#forgot-link');
    const backupWrap = $('#backup-wrap');
    const backupInput = $('#backup-input');
    const backupBtn = $('#backup-btn');
    const customCursor = $('#custom-cursor');
    const fairyLightsContainer = $('#fairy-lights');
    const confettiContainer = $('#confetti-container');

    let cupEmojis = [];
    let dragState = null;

    async function _sha(s) {
        const d = new TextEncoder().encode(s);
        const b = await crypto.subtle.digest('SHA-256', d);
        return Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2, '0')).join('');
    }

    document.addEventListener('contextmenu', e => e.preventDefault());
    document.addEventListener('keydown', e => {
        if ((e.ctrlKey || e.metaKey) && (e.key === 'u' || e.key === 'U')) e.preventDefault();
        if (e.key === 'F12') e.preventDefault();
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && ['i','I','j','J','c','C'].includes(e.key)) e.preventDefault();
    });

    function createEmojis() {
        const shuffled = [...EMOJIS].sort(() => Math.random() - 0.5);
        shuffled.forEach(emoji => {
            const el = document.createElement('div');
            el.className = 'emoji-item';
            el.textContent = emoji;
            el.dataset.emoji = emoji;
            emojiField.appendChild(el);
            initDrag(el);
        });
    }

    function initDrag(el) {
        let startX, startY, moved, clone;

        function onStart(e) {
            if (el.classList.contains('in-cup')) return;
            e.preventDefault();
            const pos = getPos(e);
            startX = pos.x;
            startY = pos.y;
            moved = false;

            clone = el.cloneNode(true);
            clone.className = 'emoji-item dragging';
            clone.style.position = 'fixed';
            clone.style.left = (pos.x - 24) + 'px';
            clone.style.top = (pos.y - 24) + 'px';
            clone.style.margin = '0';
            clone.style.zIndex = '9999';
            document.body.appendChild(clone);

            el.style.opacity = '0.3';
            dragState = { el, clone, startX, startY };
        }

        el.addEventListener('mousedown', onStart);
        el.addEventListener('touchstart', onStart, { passive: false });

        el.addEventListener('click', e => {
            if (moved) return;
            if (!el.classList.contains('in-cup')) {
                addToCup(el.dataset.emoji, el);
            }
        });
    }

    document.addEventListener('mousemove', onDragMove);
    document.addEventListener('touchmove', onDragMove, { passive: false });
    document.addEventListener('mouseup', onDragEnd);
    document.addEventListener('touchend', onDragEnd);

    function onDragMove(e) {
        if (!dragState) return;
        e.preventDefault();
        const pos = getPos(e);
        dragState.clone.style.left = (pos.x - 24) + 'px';
        dragState.clone.style.top = (pos.y - 24) + 'px';

        const dx = pos.x - dragState.startX;
        const dy = pos.y - dragState.startY;
        if (Math.abs(dx) > 5 || Math.abs(dy) > 5) dragState.moved = true;

        const cupRect = cup.getBoundingClientRect();
        cup.classList.toggle('hover', isInside(pos.x, pos.y, cupRect));
    }

    function onDragEnd(e) {
        if (!dragState) return;
        const { el, clone } = dragState;
        const pos = getPos(e.changedTouches ? e.changedTouches[0] : e);
        const cupRect = cup.getBoundingClientRect();

        clone.remove();
        cup.classList.remove('hover');

        if (isInside(pos.x, pos.y, cupRect)) {
            addToCup(el.dataset.emoji, el);
        } else {
            el.style.opacity = '1';
        }

        const wasMoved = dragState.moved;
        dragState = null;
        if (wasMoved && el._clickHandler) return;
    }

    function getPos(e) {
        if (e.touches && e.touches.length > 0) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
        if (e.changedTouches && e.changedTouches.length > 0) return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
        return { x: e.clientX, y: e.clientY };
    }

    function isInside(x, y, rect) {
        return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
    }

    function addToCup(emoji, sourceEl) {
        if (cupEmojis.includes(emoji)) return;
        cupEmojis.push(emoji);
        sourceEl.classList.add('in-cup');
        sourceEl.style.opacity = '0';

        const span = document.createElement('span');
        span.className = 'cup-emoji';
        span.textContent = emoji;
        span.dataset.emoji = emoji;
        span.addEventListener('click', () => removeFromCup(emoji, sourceEl, span));
        cupContents.appendChild(span);

        updateCupUI();
    }

    function removeFromCup(emoji, sourceEl, span) {
        cupEmojis = cupEmojis.filter(e => e !== emoji);
        span.remove();
        sourceEl.classList.remove('in-cup');
        sourceEl.style.opacity = '1';
        updateCupUI();
    }

    function updateCupUI() {
        if (cupEmojis.length > 0) {
            cupPlaceholder.classList.add('hidden');
            orderBtn.classList.add('active');
        } else {
            cupPlaceholder.classList.remove('hidden');
            orderBtn.classList.remove('active');
        }
    }

    function resetCup() {
        cupEmojis = [];
        cupContents.innerHTML = '';
        cupPlaceholder.classList.remove('hidden');
        orderBtn.classList.remove('active');
        $$('.emoji-item.in-cup').forEach(el => {
            el.classList.remove('in-cup');
            el.style.opacity = '1';
        });
    }

    orderBtn.addEventListener('click', () => {
        const selected = new Set(cupEmojis);
        if (selected.size === CORRECT.size && [...CORRECT].every(e => selected.has(e))) {
            unlock();
        } else {
            showError();
        }
    });

    function showError() {
        cup.classList.add('shake');
        errorMsg.classList.add('show');
        setTimeout(() => {
            cup.classList.remove('shake');
            errorMsg.classList.remove('show');
            resetCup();
        }, 1500);
    }

    forgotLink.addEventListener('click', () => {
        backupWrap.classList.toggle('visible');
        if (backupWrap.classList.contains('visible')) backupInput.focus();
    });

    async function checkBackup() {
        const hash = await _sha(backupInput.value.trim());
        if (hash === _h) {
            unlock();
        } else {
            backupInput.style.borderColor = '#ff6b6b';
            backupInput.value = '';
            backupInput.placeholder = 'wrong password...';
            setTimeout(() => {
                backupInput.style.borderColor = '';
                backupInput.placeholder = 'secret password...';
            }, 1500);
        }
    }

    backupBtn.addEventListener('click', checkBackup);
    backupInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') checkBackup();
    });

    function unlock() {
        successMsg.classList.add('show');
        cup.style.animation = 'unlockGlow 1s ease';
        launchConfetti();

        setTimeout(() => {
            lockScreen.classList.add('unlocked');
            mainContent.classList.add('visible');

            requestAnimationFrame(() => {
                mainContent.classList.add('show');
                initMainContent();
            });
        }, 1500);

        setTimeout(() => {
            lockScreen.style.display = 'none';
        }, 2500);
    }

    function launchConfetti() {
        for (let i = 0; i < 40; i++) {
            const piece = document.createElement('div');
            piece.className = 'confetti-piece';
            piece.textContent = CONFETTI_EMOJIS[Math.floor(Math.random() * CONFETTI_EMOJIS.length)];
            piece.style.left = Math.random() * 100 + 'vw';
            piece.style.setProperty('--fall-dur', (2 + Math.random() * 2) + 's');
            piece.style.setProperty('--fall-delay', (Math.random() * 0.8) + 's');
            piece.style.setProperty('--spin', (360 + Math.random() * 720) + 'deg');
            confettiContainer.appendChild(piece);
        }
        setTimeout(() => { confettiContainer.innerHTML = ''; }, 5000);
    }

    function initMainContent() {
        initFairyLights();
        initFadeIn();
        initCustomCursor();
        initPolaroids();
    }

    function initFairyLights() {
        const wire = document.createElement('div');
        wire.className = 'fairy-wire';
        fairyLightsContainer.appendChild(wire);

        const count = Math.floor(window.innerWidth / 35);
        for (let i = 0; i < count; i++) {
            const light = document.createElement('div');
            light.className = 'fairy-light';
            const color = LIGHT_COLORS[i % LIGHT_COLORS.length];
            light.style.setProperty('--color', color);
            light.style.backgroundColor = color;
            light.style.left = (i / count * 100) + '%';
            light.style.setProperty('--dur', (1.5 + Math.random() * 2) + 's');
            light.style.setProperty('--delay', (Math.random() * 3) + 's');
            const yOffset = Math.sin(i * 0.4) * 10 + 15;
            light.style.top = yOffset + 'px';
            fairyLightsContainer.appendChild(light);
        }
    }

    function initFadeIn() {
        const observer = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting) entry.target.classList.add('visible');
            });
        }, { threshold: 0.15, rootMargin: '0px 0px -50px 0px' });

        $$('#main-content .fade-in').forEach((el, i) => {
            el.style.transitionDelay = (i < 4 ? i * 0.15 : 0) + 's';
            observer.observe(el);
        });
    }

    function initCustomCursor() {
        if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return;

        mainContent.addEventListener('mousemove', e => {
            customCursor.style.left = e.clientX + 'px';
            customCursor.style.top = e.clientY + 'px';
            customCursor.style.opacity = '1';
        });

        mainContent.addEventListener('mouseleave', () => {
            customCursor.style.opacity = '0';
        });
    }

    function initPolaroids() {
        $$('.polaroid').forEach(p => {
            p.addEventListener('click', () => p.classList.toggle('flipped'));
        });
    }

    createEmojis();
})();
