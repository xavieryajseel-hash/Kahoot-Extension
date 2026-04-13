(function() {
    'use strict';

    // ======================
    // CONFIGURATION
    // ======================
    const VERSION = '3.0.0';
    const CREATOR = { name: 'xavieryajseel-hash', url: 'https://github.com/xavieryajseel-hash' };

    // Core Variables
    let questions = [];
    const info = {
        numQuestions: 0,
        questionNum: -1,
        lastAnsweredQuestion: -1,
        ILSetQuestion: -1
    };
    let autoAnswer = false;
    let showAnswers = false;

    // ======================
    // HELPERS
    // ======================

    function FindByAttributeValue(attribute, value, element_type) {
        element_type = element_type || "*";
        const all = document.getElementsByTagName(element_type);
        for (let i = 0; i < all.length; i++) {
            if (all[i].getAttribute(attribute) === value) return all[i];
        }
        return null;
    }

    // === CLICK SIMULATION (MAIN world - full access to React internals) ===

    // Create a fake event that passes isTrusted checks via Proxy
    function makeTrustedEvent(type, opts) {
        const real = new PointerEvent(type, Object.assign({ bubbles: true, cancelable: true, view: window }, opts));
        return new Proxy(real, {
            get(target, prop) {
                if (prop === 'isTrusted') return true;
                const val = target[prop];
                return typeof val === 'function' ? val.bind(target) : val;
            }
        });
    }

    function simulateClick(element) {
        if (!element) return false;
        const rect = element.getBoundingClientRect();
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;
        const evtOpts = { clientX: x, clientY: y, pointerId: 1, button: 0, buttons: 1 };

        // --- Strategy 1: Call React handler directly with trusted-proxy event ---
        const allHandlers = ['onClick', 'onPointerDown', 'onPointerUp', 'onMouseDown', 'onMouseUp', 'onTouchStart', 'onTouchEnd'];
        let reactHandled = false;

        // Check __reactProps$
        const propsKey = Object.keys(element).find(k => k.startsWith('__reactProps$'));
        if (propsKey && element[propsKey]) {
            const props = element[propsKey];
            console.log('[KahootExt] React props found:', Object.keys(props).filter(k => k.startsWith('on')));
            for (const h of allHandlers) {
                if (typeof props[h] === 'function') {
                    console.log('[KahootExt] Calling', h, 'from __reactProps$');
                    try { props[h](makeTrustedEvent('click', evtOpts)); } catch(e) { console.log('[KahootExt] Error:', e); }
                    reactHandled = true;
                    break;
                }
            }
        }

        // Check fiber tree (walk up to 30 levels)
        if (!reactHandled) {
            const fiberKey = Object.keys(element).find(k => k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$'));
            if (fiberKey) {
                let fiber = element[fiberKey];
                for (let d = 0; fiber && d < 30; d++, fiber = fiber.return) {
                    if (!fiber.memoizedProps) continue;
                    for (const h of allHandlers) {
                        if (typeof fiber.memoizedProps[h] === 'function') {
                            console.log('[KahootExt] Calling', h, 'from fiber depth', d);
                            try { fiber.memoizedProps[h](makeTrustedEvent('click', evtOpts)); } catch(e) {}
                            reactHandled = true;
                            break;
                        }
                    }
                    if (reactHandled) break;
                }
            }
        }

        // --- Strategy 2: Full DOM event sequence with coordinates ---
        element.dispatchEvent(new PointerEvent('pointerover', { bubbles: true, clientX: x, clientY: y, pointerId: 1 }));
        element.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true, clientX: x, clientY: y, pointerId: 1 }));
        element.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, clientX: x, clientY: y }));
        element.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, clientX: x, clientY: y, pointerId: 1, button: 0, buttons: 1 }));
        element.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0, buttons: 1 }));
        element.focus();
        element.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, cancelable: true, clientX: x, clientY: y, pointerId: 1, button: 0 }));
        element.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0 }));
        element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0 }));

        // --- Strategy 3: Native .click() ---
        element.click();

        console.log('[KahootExt] simulateClick done. reactHandled:', reactHandled);
        return true;
    }

    function clickAnswerButton(index) {
        const selectors = [
            `button[data-functional-selector="answer-${index}"]`,
            `button[data-functional-selector="multi-select-button-${index}"]`,
        ];
        let btn = null;
        for (const sel of selectors) {
            btn = document.querySelector(sel);
            if (btn) break;
        }
        console.log('[KahootExt] clickAnswerButton', index, 'found:', !!btn);
        if (!btn) return false;
        return simulateClick(btn);
    }

    // ======================
    // GAME FUNCTIONS
    // ======================

    function parseQuestions(questionsJson) {
        return questionsJson.map(question => {
            const q = { type: question.type, time: question.time };
            if (['quiz', 'multiple_select_quiz'].includes(question.type)) {
                q.answers = [];
                q.incorrectAnswers = [];
                question.choices.forEach((choice, i) => {
                    (choice.correct ? q.answers : q.incorrectAnswers).push(i);
                });
            }
            if (question.type === 'open_ended') {
                q.answers = question.choices.map(choice => choice.answer);
            }
            return q;
        });
    }

    function highlightAnswers(question) {
        if (!question) return;
        const answerButtons = document.querySelectorAll(
            'button[data-functional-selector^="answer-"], button[data-functional-selector^="multi-select-button-"]'
        );
        answerButtons.forEach(b => b.style.removeProperty('background-color'));

        if (question.answers) {
            question.answers.forEach(function(ans) {
                const btn = FindByAttributeValue("data-functional-selector", "answer-" + ans, "button") ||
                            FindByAttributeValue("data-functional-selector", "multi-select-button-" + ans, "button");
                if (btn) btn.style.setProperty('background-color', '#00e676', 'important');
            });
        }
        if (question.incorrectAnswers) {
            question.incorrectAnswers.forEach(function(ans) {
                const btn = FindByAttributeValue("data-functional-selector", "answer-" + ans, "button") ||
                            FindByAttributeValue("data-functional-selector", "multi-select-button-" + ans, "button");
                if (btn) btn.style.setProperty('background-color', '#ff1744', 'important');
            });
        }
    }

    function resetAnswerColors() {
        document.querySelectorAll(
            'button[data-functional-selector^="answer-"], button[data-functional-selector^="multi-select-button-"]'
        ).forEach(b => {
            b.style.removeProperty('background-color');
            b.style.removeProperty('transition');
        });
    }

    function answerQuestion(question) {
        console.log('[KahootExt] answerQuestion called, type:', question.type);

        // Retry mechanism - poll until buttons are interactive (up to 6 seconds)
        let attempts = 0;
        const maxAttempts = 30;

        function tryClick() {
            attempts++;
            console.log('[KahootExt] tryClick attempt', attempts);

            if (question.type === 'quiz') {
                const btn = document.querySelector(`button[data-functional-selector="answer-${question.answers[0]}"]`);
                if (btn) {
                    simulateClick(btn);
                    return;
                }
            }
            else if (question.type === 'multiple_select_quiz') {
                const firstBtn = document.querySelector(`button[data-functional-selector="multi-select-button-${question.answers[0]}"]`);
                if (firstBtn) {
                    question.answers.forEach((ans, i) => {
                        setTimeout(() => {
                            const b = document.querySelector(`button[data-functional-selector="multi-select-button-${ans}"]`);
                            if (b) simulateClick(b);
                        }, i * 200);
                    });
                    setTimeout(() => {
                        const submitBtn = document.querySelector('[data-functional-selector="multi-select-submit-button"]');
                        if (submitBtn) simulateClick(submitBtn);
                    }, question.answers.length * 200 + 300);
                    return;
                }
            }
            else if (question.type === 'open_ended' && question.answers && question.answers.length > 0) {
                const inp = document.querySelector('input[data-functional-selector="text-answer-input"]') ||
                            document.querySelector('input[type="text"]');
                if (inp) {
                    const nativeSet = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
                    nativeSet.call(inp, question.answers[0]);
                    inp.dispatchEvent(new Event('input', { bubbles: true }));
                    inp.dispatchEvent(new Event('change', { bubbles: true }));
                    setTimeout(() => {
                        const sb = document.querySelector('[data-functional-selector="submit-button"]') ||
                                   document.querySelector('button[type="submit"]');
                        if (sb) simulateClick(sb);
                    }, 300);
                    return;
                }
            }

            // Button not found yet, retry
            if (attempts < maxAttempts) {
                setTimeout(tryClick, 200);
            } else {
                console.log('[KahootExt] Max attempts reached, giving up');
            }
        }

        // Start trying after a small initial delay
        setTimeout(tryClick, 500);
    }

    function onQuestionStart() {
        const question = questions[info.questionNum];
        if (!question) return;
        console.log('[KahootExt] onQuestionStart', info.questionNum, question.type, 'autoAnswer:', autoAnswer, 'showAnswers:', showAnswers);
        if (showAnswers || autoAnswer) highlightAnswers(question);
        if (autoAnswer) {
            answerQuestion(question);
        }
    }

    // ======================
    // BUILD UI
    // ======================

    const font = "'Segoe UI', system-ui, -apple-system, sans-serif";

    // Main panel
    const panel = document.createElement('div');
    Object.assign(panel.style, {
        position: 'fixed', top: '20px', left: '20px', width: '340px',
        maxHeight: '80vh', backgroundColor: '#1a1a2e', borderRadius: '16px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(99,102,241,0.3)',
        zIndex: '9999', overflow: 'hidden', fontFamily: font,
        display: 'flex', flexDirection: 'column', color: '#e2e8f0'
    });

    // Header
    const hdr = document.createElement('div');
    Object.assign(hdr.style, {
        padding: '14px 16px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
        cursor: 'move', display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', userSelect: 'none', flexShrink: '0'
    });

    const titleEl = document.createElement('div');
    titleEl.textContent = 'Kahoot Extension';
    Object.assign(titleEl.style, { fontWeight: '700', fontSize: '16px', letterSpacing: '0.5px', color: '#fff' });

    const headerBtns = document.createElement('div');
    headerBtns.style.display = 'flex';
    headerBtns.style.gap = '6px';

    function mkHeaderBtn(text, bg) {
        const b = document.createElement('div');
        b.textContent = text;
        Object.assign(b.style, {
            width: '24px', height: '24px', background: bg, color: '#fff',
            display: 'grid', placeItems: 'center', borderRadius: '50%',
            cursor: 'pointer', fontSize: '12px', lineHeight: '1',
            transition: 'transform 0.15s', fontWeight: 'bold'
        });
        b.addEventListener('mouseenter', () => b.style.transform = 'scale(1.15)');
        b.addEventListener('mouseleave', () => b.style.transform = 'scale(1)');
        return b;
    }

    const minBtn = mkHeaderBtn('\u2500', 'rgba(255,255,255,0.2)');
    const clsBtn = mkHeaderBtn('\u2715', 'rgba(239,68,68,0.7)');
    headerBtns.append(minBtn, clsBtn);
    hdr.append(titleEl, headerBtns);
    panel.appendChild(hdr);

    // Content area
    const body = document.createElement('div');
    Object.assign(body.style, {
        padding: '12px', overflowY: 'auto', flexGrow: '1',
        display: 'flex', flexDirection: 'column', gap: '10px',
        scrollbarWidth: 'thin', scrollbarColor: '#6366f1 transparent'
    });

    // --- Section builder ---
    function mkSection(title) {
        const sec = document.createElement('div');
        Object.assign(sec.style, {
            background: '#16213e', borderRadius: '12px', padding: '14px',
            border: '1px solid rgba(99,102,241,0.2)'
        });
        const h = document.createElement('div');
        h.textContent = title;
        Object.assign(h.style, {
            fontSize: '11px', fontWeight: '700', textTransform: 'uppercase',
            letterSpacing: '1.2px', color: '#818cf8', marginBottom: '10px'
        });
        sec.appendChild(h);
        return sec;
    }

    // --- Toggle builder ---
    function mkToggle(label, initial, cb) {
        const row = document.createElement('div');
        Object.assign(row.style, {
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '6px 0'
        });
        const lbl = document.createElement('span');
        lbl.textContent = label;
        lbl.style.fontSize = '13px';

        const track = document.createElement('div');
        Object.assign(track.style, {
            width: '42px', height: '22px', borderRadius: '11px',
            background: initial ? '#6366f1' : '#374151', cursor: 'pointer',
            transition: 'background 0.25s', position: 'relative', flexShrink: '0'
        });
        const knob = document.createElement('div');
        Object.assign(knob.style, {
            width: '18px', height: '18px', borderRadius: '50%', background: '#fff',
            position: 'absolute', top: '2px', left: initial ? '22px' : '2px',
            transition: 'left 0.25s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
        });
        track.appendChild(knob);

        let on = initial;
        track.addEventListener('click', () => {
            on = !on;
            track.style.background = on ? '#6366f1' : '#374151';
            knob.style.left = on ? '22px' : '2px';
            cb(on);
        });

        row.append(lbl, track);
        return row;
    }

    // --- Slider builder ---
    function mkSlider(label, min, max, value, cb) {
        const wrap = document.createElement('div');
        const top = document.createElement('div');
        Object.assign(top.style, { display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px' });
        const lbl = document.createElement('span');
        lbl.textContent = label;
        const val = document.createElement('span');
        val.textContent = value;
        val.style.color = '#818cf8';
        val.style.fontWeight = '600';
        top.append(lbl, val);

        const slider = document.createElement('input');
        slider.type = 'range'; slider.min = min; slider.max = max; slider.value = value;
        Object.assign(slider.style, {
            width: '100%', height: '4px', WebkitAppearance: 'none', background: '#374151',
            borderRadius: '2px', outline: 'none', cursor: 'pointer'
        });
        slider.addEventListener('input', () => { val.textContent = slider.value; cb(+slider.value); });

        wrap.append(top, slider);
        return { wrap, slider, val };
    }

    // ====== QUIZ ID ======
    const quizSec = mkSection('Quiz ID');
    const quizInput = document.createElement('input');
    quizInput.placeholder = 'Paste Quiz ID here...';
    Object.assign(quizInput.style, {
        width: '100%', padding: '10px 12px', borderRadius: '8px',
        border: '1px solid #374151', background: '#0f172a', color: '#e2e8f0',
        fontSize: '13px', outline: 'none', boxSizing: 'border-box',
        transition: 'border-color 0.3s'
    });
    const quizStatus = document.createElement('div');
    Object.assign(quizStatus.style, { fontSize: '11px', marginTop: '6px', color: '#64748b' });
    quizStatus.textContent = 'Waiting for Quiz ID...';
    quizSec.append(quizInput, quizStatus);
    body.appendChild(quizSec);

    // ====== ANSWERING ======
    const ansSec = mkSection('Answering');
    ansSec.appendChild(mkToggle('Auto Answer', false, v => { autoAnswer = v; info.ILSetQuestion = info.questionNum; }));
    ansSec.appendChild(mkToggle('Show Answers', false, v => { showAnswers = v; if (!v) resetAnswerColors(); }));
    body.appendChild(ansSec);

    // ====== SHORTCUTS ======
    const kbSec = mkSection('Shortcuts');
    const shortcuts = [
        ['ALT + H', 'Toggle panel'],
        ['ALT + W', 'Answer correctly'],
        ['ALT + S', 'Show answers (hold)'],
        ['Shift', 'Quick hide']
    ];
    shortcuts.forEach(([key, desc]) => {
        const row = document.createElement('div');
        Object.assign(row.style, { display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: '12px' });
        const k = document.createElement('span');
        k.textContent = key;
        Object.assign(k.style, { color: '#818cf8', fontWeight: '600', fontFamily: 'monospace', fontSize: '11px' });
        const d = document.createElement('span');
        d.textContent = desc;
        d.style.color = '#94a3b8';
        row.append(k, d);
        kbSec.appendChild(row);
    });
    body.appendChild(kbSec);

    // ====== INFO ======
    const infoSec = mkSection('Info');
    const questionsLabel = document.createElement('div');
    questionsLabel.style.fontSize = '12px';
    questionsLabel.textContent = 'Question: 0 / 0';

    const versionLabel = document.createElement('div');
    versionLabel.style.fontSize = '12px';
    versionLabel.textContent = `Version: ${VERSION}`;

    infoSec.append(questionsLabel, versionLabel);
    body.appendChild(infoSec);

    // ====== CREDITS ======
    const creditsSec = mkSection('Credits');
    const creditLink = document.createElement('a');
    creditLink.href = CREATOR.url;
    creditLink.target = '_blank';
    creditLink.rel = 'noopener noreferrer';
    creditLink.textContent = CREATOR.name;
    Object.assign(creditLink.style, {
        color: '#818cf8', textDecoration: 'none', fontSize: '13px',
        display: 'flex', alignItems: 'center', gap: '6px', transition: 'color 0.2s'
    });
    creditLink.addEventListener('mouseenter', () => creditLink.style.color = '#a5b4fc');
    creditLink.addEventListener('mouseleave', () => creditLink.style.color = '#818cf8');

    // GitHub icon
    const ghIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    ghIcon.setAttribute('width', '16'); ghIcon.setAttribute('height', '16'); ghIcon.setAttribute('viewBox', '0 0 24 24');
    ghIcon.setAttribute('fill', 'currentColor');
    ghIcon.innerHTML = '<path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>';
    creditLink.prepend(ghIcon);

    const creatorLabel = document.createElement('div');
    creatorLabel.style.fontSize = '11px';
    creatorLabel.style.color = '#475569';
    creatorLabel.style.marginTop = '4px';
    creatorLabel.textContent = 'Creator & Developer';

    creditsSec.append(creditLink, creatorLabel);
    body.appendChild(creditsSec);

    // Assemble
    panel.appendChild(body);
    document.body.appendChild(panel);

    // ======================
    // DRAGGING
    // ======================
    let dragData = null;
    hdr.addEventListener('mousedown', e => {
        if (e.target.tagName === 'INPUT') return;
        dragData = { offsetX: e.clientX - panel.offsetLeft, offsetY: e.clientY - panel.offsetTop };
        e.preventDefault();
    });
    document.addEventListener('mousemove', e => {
        if (!dragData) return;
        const x = Math.max(0, Math.min(window.innerWidth - panel.offsetWidth, e.clientX - dragData.offsetX));
        const y = Math.max(0, Math.min(window.innerHeight - panel.offsetHeight, e.clientY - dragData.offsetY));
        panel.style.left = `${x}px`;
        panel.style.top = `${y}px`;
    });
    document.addEventListener('mouseup', () => { dragData = null; });

    // ======================
    // PANEL CONTROLS
    // ======================
    let isMinimized = false;
    minBtn.addEventListener('click', () => {
        isMinimized = !isMinimized;
        body.style.display = isMinimized ? 'none' : 'flex';
        minBtn.textContent = isMinimized ? '+' : '\u2500';
    });
    clsBtn.addEventListener('click', () => {
        panel.remove();
        autoAnswer = false;
        showAnswers = false;
    });

    // ======================
    // QUIZ ID FETCH
    // ======================
    let fetchTimeout = null;
    quizInput.addEventListener('input', () => {
        clearTimeout(fetchTimeout);
        const quizID = quizInput.value.trim();
        if (quizID === "") {
            quizInput.style.borderColor = '#374151';
            quizStatus.textContent = 'Waiting for Quiz ID...';
            quizStatus.style.color = '#64748b';
            questions = [];
            info.numQuestions = 0;
            questionsLabel.textContent = 'Question: 0 / 0';
            return;
        }
        quizStatus.textContent = 'Loading...';
        quizStatus.style.color = '#fbbf24';
        fetchTimeout = setTimeout(() => {
            fetch(`https://damp-leaf-16aa.johnwee.workers.dev/api-proxy/${encodeURIComponent(quizID)}`)
                .then(r => { if (!r.ok) throw new Error(); return r.json(); })
                .then(data => {
                    quizInput.style.borderColor = '#22c55e';
                    questions = parseQuestions(data.questions);
                    info.numQuestions = questions.length;
                    questionsLabel.textContent = `Question: 0 / ${info.numQuestions}`;
                    quizStatus.textContent = `Loaded ${info.numQuestions} questions`;
                    quizStatus.style.color = '#22c55e';
                })
                .catch(() => {
                    quizInput.style.borderColor = '#ef4444';
                    quizStatus.textContent = 'Invalid Quiz ID';
                    quizStatus.style.color = '#ef4444';
                    questions = [];
                    info.numQuestions = 0;
                    questionsLabel.textContent = 'Question: 0 / 0';
                });
        }, 500);
    });

    // ======================
    // KEYBOARD SHORTCUTS
    // ======================
    let isHidden = false;
    let isAltSPressed = false;

    document.addEventListener('keydown', e => {
        if (e.key.toLowerCase() === 'h' && e.altKey) {
            e.preventDefault();
            isHidden = !isHidden;
            panel.style.opacity = isHidden ? '0' : '1';
            panel.style.pointerEvents = isHidden ? 'none' : 'auto';
        }
        if (e.key === 'Shift' && !e.altKey) {
            panel.style.opacity = panel.style.opacity === '0' ? '1' : '0';
        }
        if (e.key.toLowerCase() === 'w' && e.altKey && info.questionNum !== -1) {
            e.preventDefault();
            const question = questions[info.questionNum];
            if (!question?.answers) return;
            if (question.type === 'quiz') {
                clickAnswerButton(question.answers[0]);
            } else if (question.type === 'multiple_select_quiz') {
                question.answers.forEach((ans, i) => { setTimeout(() => clickAnswerButton(ans), i * 150); });
                setTimeout(() => {
                    const sb = document.querySelector('[data-functional-selector="multi-select-submit-button"]');
                    if (sb) simulateClick(sb);
                }, question.answers.length * 150 + 200);
            } else if (question.type === 'open_ended' && question.answers && question.answers.length > 0) {
                const inp = document.querySelector('input[data-functional-selector="text-answer-input"]') ||
                            document.querySelector('input[type="text"]');
                if (inp) {
                    const nativeSet = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
                    nativeSet.call(inp, question.answers[0]);
                    inp.dispatchEvent(new Event('input', { bubbles: true }));
                    inp.dispatchEvent(new Event('change', { bubbles: true }));
                    setTimeout(() => {
                        const sb = document.querySelector('[data-functional-selector="submit-button"]') ||
                                   document.querySelector('button[type="submit"]');
                        if (sb) simulateClick(sb);
                    }, 200);
                }
            }
        }
        if (e.key.toLowerCase() === 's' && e.altKey && info.questionNum !== -1) {
            e.preventDefault();
            isAltSPressed = true;
            highlightAnswers(questions[info.questionNum]);
        }
    });

    document.addEventListener('keyup', e => {
        if (e.key.toLowerCase() === 's' && isAltSPressed) {
            isAltSPressed = false;
            if (!showAnswers) resetAnswerColors();
        }
    });

    // ======================
    // MAIN GAME LOOP
    // ======================
    setInterval(() => {
        const counter = document.querySelector('[data-functional-selector="question-index-counter"]');
        if (counter) {
            info.questionNum = parseInt(counter.textContent) - 1;
            questionsLabel.textContent = `Question: ${info.questionNum + 1} / ${info.numQuestions}`;
        }

        if (document.querySelector('[data-functional-selector^="answer-"]') &&
            info.lastAnsweredQuestion !== info.questionNum) {
            info.lastAnsweredQuestion = info.questionNum;
            onQuestionStart();
        }

    }, 50);

    // ======================
    // STYLES
    // ======================
    const style = document.createElement('style');
    style.textContent = `
        input[type="range"]::-webkit-slider-thumb {
            -webkit-appearance: none;
            width: 14px; height: 14px;
            background: #6366f1; border-radius: 50%;
            cursor: pointer; border: 2px solid #fff;
        }
        input[type="range"]::-moz-range-thumb {
            width: 14px; height: 14px;
            background: #6366f1; border-radius: 50%;
            cursor: pointer; border: 2px solid #fff;
        }
    `;
    document.head.appendChild(style);
})();
