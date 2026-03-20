(() => {
    'use strict';

    const EMOJIS = ['🍓', '🍋', '🍵', '🧋', '🍠', '🍫', '🍪', '🫐', '🍊', '🥥', '🍰', '🍜', '🍦', '🧁'];
    const _r = new Uint8Array([240,159,141,160,240,159,141,181]);
    const CORRECT = new Set(Array.from(new TextDecoder().decode(_r)));
    const _h = 'f7b12dc05d0507eb5a01e394098706025b9126f38982df1d1f98172640d0da10';
    const CONFETTI_EMOJIS = ['🎉', '🎂', '🎾', '✨', '🌟', '🥳'];

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
    const confettiContainer = $('#confetti-container');
    const bgRing = $('#bg-ring');

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

    // ── Lock screen emoji logic ──

    function createEmojis() {
        const shuffled = [...EMOJIS].sort(() => Math.random() - 0.5);
        shuffled.forEach(emoji => {
            const el = document.createElement('div');
            el.className = 'emoji-item';
            el.textContent = emoji;
            el.dataset.emoji = emoji;
            emojiField.appendChild(el);
            initLockDrag(el);
        });
    }

    function initLockDrag(el) {
        let clone, moved = false;

        function onStart(e) {
            if (el.classList.contains('in-cup')) return;
            e.preventDefault();
            const pos = getPos(e);
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
            dragState = { el, clone, startX: pos.x, startY: pos.y };
        }

        el.addEventListener('mousedown', onStart);
        el.addEventListener('touchstart', onStart, { passive: false });

        el.addEventListener('click', () => {
            if (moved) return;
            if (!el.classList.contains('in-cup')) addToCup(el.dataset.emoji, el);
        });
    }

    document.addEventListener('mousemove', onLockDragMove);
    document.addEventListener('touchmove', onLockDragMove, { passive: false });
    document.addEventListener('mouseup', onLockDragEnd);
    document.addEventListener('touchend', onLockDragEnd);

    function onLockDragMove(e) {
        if (!dragState || !dragState.clone) return;
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

    function onLockDragEnd(e) {
        if (!dragState || !dragState.clone) return;
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
        dragState = null;
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
        cupPlaceholder.classList.toggle('hidden', cupEmojis.length > 0);
        orderBtn.classList.toggle('active', cupEmojis.length > 0);
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
            backupInput.style.borderColor = '#e85d5d';
            backupInput.value = '';
            backupInput.placeholder = 'wrong password...';
            setTimeout(() => {
                backupInput.style.borderColor = '';
                backupInput.placeholder = 'secret password...';
            }, 1500);
        }
    }

    backupBtn.addEventListener('click', checkBackup);
    backupInput.addEventListener('keydown', e => { if (e.key === 'Enter') checkBackup(); });

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

        setTimeout(() => { lockScreen.style.display = 'none'; }, 2500);
    }

    function launchConfetti() {
        for (let i = 0; i < 30; i++) {
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

    // ── Main content ──

    function initMainContent() {
        initPolaroidDrag();
        initBgRingScroll();
    }

    // ── Draggable polaroids (pointer events, like alicewu.me) ──

    function initPolaroidDrag() {
        let maxZ = 10;

        $$('.polaroid').forEach(card => {
            let dragging = false, moved = false, startX, startY, origX, origY;

            card.addEventListener('pointerdown', e => {
                dragging = true;
                moved = false;
                card.setPointerCapture(e.pointerId);
                maxZ++;
                card.style.zIndex = maxZ;
                startX = e.clientX;
                startY = e.clientY;
                origX = card.offsetLeft;
                origY = card.offsetTop;
                card.style.transition = 'box-shadow 0.3s ease';
                card.style.transform = 'scale(1.06) rotate(0deg)';
                card.classList.add('dragging');
                if (navigator.vibrate) navigator.vibrate(8);
            });

            card.addEventListener('pointermove', e => {
                if (!dragging) return;
                const dx = e.clientX - startX;
                const dy = e.clientY - startY;
                if (!moved && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) {
                    moved = true;
                    card.style.transition = 'none';
                }
                if (moved) {
                    e.preventDefault();
                    card.style.left = origX + dx + 'px';
                    card.style.top = origY + dy + 'px';
                    card.style.transform = 'scale(1.06) rotate(' + Math.max(-8, Math.min(8, dx * 0.04)) + 'deg)';
                }
            });

            card.addEventListener('pointerup', () => {
                if (!dragging) return;
                dragging = false;
                card.classList.remove('dragging');
                const endRot = moved ? ((Math.random() - 0.5) * 6).toFixed(1) : 0;
                card.style.transition = 'box-shadow 0.3s ease, transform 0.35s cubic-bezier(0.22, 1, 0.36, 1)';
                card.style.transform = 'scale(1) rotate(' + endRot + 'deg)';
                moved = false;
            });

            card.addEventListener('pointercancel', () => {
                dragging = false;
                moved = false;
                card.classList.remove('dragging');
                card.style.transition = 'box-shadow 0.3s ease, transform 0.3s ease';
                card.style.transform = 'scale(1) rotate(0deg)';
            });
        });
    }

    // ── Background ring parallax on scroll ──

    function initBgRingScroll() {
        if (!bgRing) return;
        let ticking = false;

        window.addEventListener('scroll', () => {
            if (!ticking) {
                requestAnimationFrame(() => {
                    const scrollY = window.scrollY;
                    const translateY = -(scrollY * 0.3);
                    const translateX = Math.sin(scrollY * 0.002) * 20;
                    bgRing.style.transform = 'translate(' + translateX + 'px, ' + translateY + 'px)';
                    ticking = false;
                });
                ticking = true;
            }
        });
    }

    createEmojis();
})();
