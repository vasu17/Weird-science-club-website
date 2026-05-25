// ============================================================
// 3D Lattice Random Walk — Interactive Simulator Page Logic
// ============================================================
window.addEventListener('DOMContentLoaded', () => {
    initInteractiveSimulator();
});

function initInteractiveSimulator() {
    const canvas   = document.getElementById('simCanvas');
    const viewport = document.getElementById('viewportContainer');
    if (!canvas || !viewport) return;

    const ctx = canvas.getContext('2d');

    // --- DOM references ---
    const historySlider = document.getElementById('historySlider');
    const historyVal    = document.getElementById('historyVal');
    const speedSlider   = document.getElementById('speedSlider');
    const speedVal      = document.getElementById('speedVal');
    const scrollArrow   = document.getElementById('scrollArrow');
    const couplingBtn   = document.getElementById('couplingBtn');
    const couplingLabel = document.getElementById('couplingLabel');
    const couplingDesc  = document.getElementById('couplingDesc');

    const KEYS = ['PX', 'MX', 'PY', 'MY', 'PZ', 'MZ'];
    const weightSliders = {};
    const pctBadges     = {};
    KEYS.forEach(k => {
        weightSliders[k] = document.getElementById('weight' + k);
        pctBadges[k]     = document.getElementById('pct'    + k);
    });

    // ── Axis pairs for "Fix Axis Pair" mode ───────────────
    const AXIS_PAIRS = { PX:'MX', MX:'PX', PY:'MY', MY:'PY', PZ:'MZ', MZ:'PZ' };

    // ── Internal weight state ─────────────────────────────
    // Always maintained so that SUM of all 6 === 100.
    // This is the source of truth; sliders are kept in sync.
    let W = { PX: 100/6, MX: 100/6, PY: 100/6, MY: 100/6, PZ: 100/6, MZ: 100/6 };

    function syncSlidersFromW() {
        KEYS.forEach(k => {
            weightSliders[k].value = Math.round(W[k]);
            pctBadges[k].textContent = W[k].toFixed(1) + '%';
        });
    }
    syncSlidersFromW();

    // ── Coupling mode ──────────────────────────────────────
    let couplingMode = 'pair'; // 'pair' | 'global'

    couplingBtn.addEventListener('click', () => {
        couplingMode = (couplingMode === 'pair') ? 'global' : 'pair';
        if (couplingMode === 'pair') {
            couplingLabel.textContent = 'Fix Axis Pair';
            couplingDesc.textContent  = 'Moving one slider adjusts its axis partner (e.g. +X↔−X). Total always sums to 100%.';
        } else {
            couplingLabel.textContent = 'Distribute All';
            couplingDesc.textContent  = 'Moving one slider scales all 5 others proportionally so total always sums to 100%.';
        }
        // Re-sync sliders so mode switch starts from consistent state
        syncSlidersFromW();
    });

    // ── Weight change handler ─────────────────────────────
    // The slider fires with a raw 0-100 "desired" value.
    // We apply the coupling rule and rebuild W so it always sums to 100.
    function onWeightChanged(key) {
        const desired = parseFloat(weightSliders[key].value); // 0-100 desired %

        if (couplingMode === 'pair') {
            const partner = AXIS_PAIRS[key];
            // Pair must sum to W[key]+W[partner] (their current combined share)
            const pairBudget = W[key] + W[partner];
            // New key value clamped so partner ≥ 0
            const newKey     = Math.min(desired, pairBudget);
            const newPartner = pairBudget - newKey;
            W[key]     = newKey;
            W[partner] = newPartner;
            // All other directions stay unchanged → sum preserved automatically

        } else {
            // Global mode: fix the changed key, scale all others proportionally
            const clamped = Math.min(Math.max(desired, 0), 100);
            const others  = KEYS.filter(k => k !== key);
            const othersCurrentSum = others.reduce((a, k) => a + W[k], 0);
            const remainder = 100 - clamped;

            W[key] = clamped;
            if (othersCurrentSum <= 0) {
                // All others are zero; share remainder equally
                others.forEach(k => { W[k] = remainder / others.length; });
            } else {
                others.forEach(k => {
                    W[k] = (W[k] / othersCurrentSum) * remainder;
                });
            }
        }

        syncSlidersFromW();
    }

    KEYS.forEach(k => {
        weightSliders[k].addEventListener('input', () => onWeightChanged(k));
    });

    // ── Lattice / walk state ───────────────────────────────
    const L      = 25;
    const bounds = 250;

    function wrap(val) {
        const min = -250, max = 250, range = max - min + 1;
        let s = val - min;
        s = ((s % range) + range) % range;
        return s + min;
    }

    const dirVectors = {
        PX: { x:  L, y:  0, z:  0 },
        MX: { x: -L, y:  0, z:  0 },
        PY: { x:  0, y: -L, z:  0 }, // screen −Y = world +Y (Up)
        MY: { x:  0, y:  L, z:  0 },
        PZ: { x:  0, y:  0, z:  L },
        MZ: { x:  0, y:  0, z: -L }
    };

    const maxSteps    = 10000;
    let targetHistory = parseInt(historySlider.value);
    let stepSpeed     = parseFloat(speedSlider.value) * 1000;
    let history       = [{ x: 0, y: 0, z: 0 }];

    function getNextBiasedStep(current) {
        const totalW = KEYS.reduce((a, k) => a + W[k], 0);
        let r = Math.random() * totalW, cum = 0;
        for (const k of KEYS) {
            cum += W[k];
            if (r < cum) {
                const d = dirVectors[k];
                return {
                    x: wrap(current.x + d.x),
                    y: wrap(current.y + d.y),
                    z: wrap(current.z + d.z)
                };
            }
        }
        // fallback (floating-point edge)
        const d = dirVectors[KEYS[KEYS.length - 1]];
        return { x: wrap(current.x + d.x), y: wrap(current.y + d.y), z: wrap(current.z + d.z) };
    }

    function generateInitialWalk(count) {
        history = [{ x: 0, y: 0, z: 0 }];
        for (let i = 0; i < count; i++) {
            history.push(getNextBiasedStep(history[history.length - 1]));
        }
    }
    generateInitialWalk(maxSteps);

    // ── Canvas sizing ──────────────────────────────────────
    let cachedSizeScale = 1; // recomputed on resize

    function resizeCanvas() {
        const dpr = window.devicePixelRatio || 1;
        canvas.width  = viewport.clientWidth  * dpr;
        canvas.height = viewport.clientHeight * dpr;
        ctx.scale(dpr, dpr);

        const vw = viewport.clientWidth;
        const vh = viewport.clientHeight;
        const aspect = vw / vh;
        cachedSizeScale = aspect > 1 ? vh * (1 + (aspect - 1) * 0.6) : Math.min(vw, vh);
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // ── Drag-to-orbit (mouse) ──────────────────────────────
    let isDragging = false;
    let prevMouse  = { x: 0, y: 0 };
    let theta      = 0.5; // initial angle so lattice is visible diagonally
    let phi        = Math.PI / 6;

    viewport.addEventListener('mousedown', e => {
        isDragging = true;
        prevMouse  = { x: e.clientX, y: e.clientY };
    });
    window.addEventListener('mousemove', e => {
        if (!isDragging) return;
        theta -= (e.clientX - prevMouse.x) * 0.005;
        phi    = Math.max(-Math.PI / 2.5, Math.min(Math.PI / 2.5,
                           phi - (e.clientY - prevMouse.y) * 0.005));
        prevMouse = { x: e.clientX, y: e.clientY };
    });
    window.addEventListener('mouseup', () => { isDragging = false; });

    // ── Drag-to-orbit (touch) ──────────────────────────────
    // Determines swipe intent from first motion: horizontal → rotate, vertical → scroll.
    let touchStartX  = 0, touchStartY  = 0;
    let touchIntent  = null; // 'rotate' | 'scroll' | null

    viewport.addEventListener('touchstart', e => {
        if (e.touches.length !== 1) return;
        touchStartX  = e.touches[0].clientX;
        touchStartY  = e.touches[0].clientY;
        touchIntent  = null;
        isDragging   = false;
        prevMouse    = { x: touchStartX, y: touchStartY };
    }, { passive: true });

    viewport.addEventListener('touchmove', e => {
        if (e.touches.length !== 1) return;
        const tx = e.touches[0].clientX;
        const ty = e.touches[0].clientY;

        // First motion: determine intent once
        if (touchIntent === null) {
            const absDx = Math.abs(tx - touchStartX);
            const absDy = Math.abs(ty - touchStartY);
            if (absDx < 6 && absDy < 6) return; // not enough movement yet
            touchIntent = absDx > absDy ? 'rotate' : 'scroll';
            if (touchIntent === 'rotate') isDragging = true;
        }

        if (touchIntent === 'rotate') {
            // Prevent page scroll while orbiting
            e.preventDefault();
            theta -= (tx - prevMouse.x) * 0.007;
            phi    = Math.max(-Math.PI / 2.5, Math.min(Math.PI / 2.5,
                               phi - (ty - prevMouse.y) * 0.007));
            prevMouse = { x: tx, y: ty };
        }
        // If intent is 'scroll', do nothing — browser handles the scroll naturally
    }, { passive: false }); // non-passive so we can call preventDefault for rotate

    viewport.addEventListener('touchend', () => {
        isDragging  = false;
        touchIntent = null;
    });

    // ── Step interval ──────────────────────────────────────
    let prevPos             = history[history.length - 2] || history[0];
    let targetPos           = history[history.length - 1];
    let transitionStartTime = Date.now() - 10000;
    let glowStartTime       = Date.now() - 10000;
    const transitionDuration = 300; // ms
    let stepIntervalId = null;
    let needsRedraw    = true; // dirty flag

    function startInterval() {
        if (stepIntervalId) clearInterval(stepIntervalId);
        stepIntervalId = setInterval(() => {
            const next = getNextBiasedStep(history[history.length - 1]);
            history.push(next);
            while (history.length > maxSteps + 1) history.shift();

            prevPos             = history[history.length - 2];
            targetPos           = history[history.length - 1];
            transitionStartTime = Date.now();
            glowStartTime       = Date.now();
            needsRedraw         = true;
        }, stepSpeed);
    }
    startInterval();

    // ── Deck slider listeners ──────────────────────────────
    historySlider.addEventListener('input', e => {
        targetHistory = parseInt(e.target.value);
        historyVal.textContent = targetHistory;
        needsRedraw = true;
    });

    speedSlider.addEventListener('input', e => {
        const val = parseFloat(e.target.value);
        speedVal.textContent = val.toFixed(2) + 's';
        stepSpeed = val * 1000;
        startInterval();
    });

    if (scrollArrow) {
        scrollArrow.addEventListener('click', () => {
            document.getElementById('education-section')?.scrollIntoView({ behavior: 'smooth' });
        });
    }

    // ── 3D Projection ──────────────────────────────────────
    let cameraCenter = { x: 0, y: 0, z: 0 };

    function project(x, y, z, thetaA, phiA) {
        const dx = x - cameraCenter.x;
        const dy = y - cameraCenter.y;
        const dz = z - cameraCenter.z;

        const x1 = dx * Math.cos(thetaA) - dz * Math.sin(thetaA);
        const z1 = dx * Math.sin(thetaA) + dz * Math.cos(thetaA);
        const y2 = dy * Math.cos(phiA)   - z1 * Math.sin(phiA);
        const z2 = dy * Math.sin(phiA)   + z1 * Math.cos(phiA);

        const F = 500, D = 600;
        const scale = F / (F + z2 + D);

        const dpr = window.devicePixelRatio || 1;
        const cx  = canvas.width  / (2 * dpr);
        const cy  = canvas.height / (2 * dpr);
        const projectedScale = scale * (cachedSizeScale / 420);

        return {
            x: cx + x1 * projectedScale,
            y: cy + y2 * projectedScale,
            z: z2,
            visible: (z2 + D > 0)
        };
    }

    // ── GPU-friendly 30 fps throttle ──────────────────────
    // Canvas only redraws when something changes (step, drag, transition).
    const TARGET_FPS = 30;
    const FRAME_MS   = 1000 / TARGET_FPS;
    let lastFrameTime = 0;

    // ── Animation draw loop ────────────────────────────────
    function draw(timestamp) {
        requestAnimationFrame(draw); // always schedule next

        // Throttle to ~30 fps
        if (timestamp - lastFrameTime < FRAME_MS) return;
        lastFrameTime = timestamp;

        const now = Date.now();

        // Camera still needs to glide even when no step fired → always dirty during transition
        const transElapsed = now - transitionStartTime;
        const inTransition  = transElapsed < transitionDuration + 500; // extra for camera glide
        if (!needsRedraw && !isDragging && !inTransition) return; // nothing changed

        needsRedraw = false;

        const dpr = window.devicePixelRatio || 1;
        const w   = canvas.width  / dpr;
        const h   = canvas.height / dpr;
        ctx.clearRect(0, 0, w, h);

        // Active particle position (smooth glide, or snap on wrap)
        const tElapsed = now - transitionStartTime;
        let activePos  = targetPos;

        const dxStep = Math.abs(targetPos.x - prevPos.x);
        const dyStep = Math.abs(targetPos.y - prevPos.y);
        const dzStep = Math.abs(targetPos.z - prevPos.z);
        const isWrap = (dxStep > 2 * L || dyStep > 2 * L || dzStep > 2 * L);

        if (tElapsed < transitionDuration) {
            if (isWrap) {
                activePos = prevPos;
            } else {
                const u    = tElapsed / transitionDuration;
                const ease = 1 - Math.pow(1 - u, 3); // easeOutCubic
                activePos  = {
                    x: prevPos.x + (targetPos.x - prevPos.x) * ease,
                    y: prevPos.y + (targetPos.y - prevPos.y) * ease,
                    z: prevPos.z + (targetPos.z - prevPos.z) * ease
                };
            }
        }

        // Camera remains fixed at the origin (0, 0, 0) so the orbit rotation is stable and centered
        cameraCenter.x = 0;
        cameraCenter.y = 0;
        cameraCenter.z = 0;

        // Keep dirty while dragging
        if (isDragging) needsRedraw = true;

        const tR = theta, pR = phi;

        // ── Ground grid (slightly more visible) ───────────
        ctx.save();
        ctx.strokeStyle = 'rgba(55, 40, 15, 0.65)';
        ctx.lineWidth   = 0.7;
        const gridIntervals = [-200, -100, 0, 100, 200];

        for (const gz of gridIntervals) {
            const p1 = project(-bounds, 0, gz, tR, pR);
            const p2 = project( bounds, 0, gz, tR, pR);
            if (p1.visible && p2.visible) {
                ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
            }
        }
        for (const gx of gridIntervals) {
            const p1 = project(gx, 0, -bounds, tR, pR);
            const p2 = project(gx, 0,  bounds, tR, pR);
            if (p1.visible && p2.visible) {
                ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
            }
        }

        // ── Coordinate axes (more prominent) ─────────────
        ctx.strokeStyle = 'rgba(100, 75, 30, 0.7)';
        ctx.lineWidth   = 1.0;

        const axisEndpoints = [
            { neg: project(-bounds, 0, 0, tR, pR), pos: project(bounds, 0, 0, tR, pR), labelNeg: '−X', labelPos: '+X' },
            { neg: project(0, bounds, 0, tR, pR),  pos: project(0, -bounds, 0, tR, pR), labelNeg: '−Y', labelPos: '+Y' },
            { neg: project(0, 0, -bounds, tR, pR), pos: project(0, 0, bounds, tR, pR), labelNeg: '−Z', labelPos: '+Z' }
        ];

        axisEndpoints.forEach(({ neg, pos }) => {
            if (neg.visible && pos.visible) {
                ctx.beginPath(); ctx.moveTo(neg.x, neg.y); ctx.lineTo(pos.x, pos.y); ctx.stroke();
            }
        });

        // ── Axis labels ───────────────────────────────────
        ctx.font         = '600 11px "Outfit", sans-serif';
        ctx.textBaseline = 'middle';
        ctx.fillStyle    = 'rgba(169, 132, 77, 0.85)';
        const labelOffset = bounds + 20;
        const axisLabels = [
            { pt: project( labelOffset, 0, 0, tR, pR), text: '+X' },
            { pt: project(-labelOffset, 0, 0, tR, pR), text: '−X' },
            { pt: project(0, -labelOffset, 0, tR, pR), text: '+Y' },
            { pt: project(0,  labelOffset, 0, tR, pR), text: '−Y' },
            { pt: project(0, 0,  labelOffset, tR, pR), text: '+Z' },
            { pt: project(0, 0, -labelOffset, tR, pR), text: '−Z' }
        ];
        axisLabels.forEach(({ pt, text }) => {
            if (pt.visible) {
                ctx.textAlign = pt.x < w / 2 ? 'right' : 'left';
                ctx.fillText(text, pt.x + (pt.x < w / 2 ? -6 : 6), pt.y);
            }
        });
        ctx.restore();

        // ── Bounding cage (dashed, faint gold) ───────────
        ctx.save();
        ctx.strokeStyle = 'rgba(169, 132, 77, 0.06)';
        ctx.lineWidth   = 0.6;
        ctx.setLineDash([4, 6]);
        const corners = [
            {x:-bounds,y:-bounds,z:-bounds},{x:bounds,y:-bounds,z:-bounds},
            {x:bounds, y:bounds, z:-bounds},{x:-bounds,y:bounds, z:-bounds},
            {x:-bounds,y:-bounds,z: bounds},{x:bounds,y:-bounds,z: bounds},
            {x:bounds, y:bounds, z: bounds},{x:-bounds,y:bounds, z: bounds}
        ];
        const pc = corners.map(c => project(c.x, c.y, c.z, tR, pR));
        [[0,1,2,3],[4,5,6,7]].forEach(face => {
            ctx.beginPath();
            ctx.moveTo(pc[face[0]].x, pc[face[0]].y);
            face.slice(1).forEach(i => ctx.lineTo(pc[i].x, pc[i].y));
            ctx.closePath();
            ctx.stroke();
        });
        for (let i = 0; i < 4; i++) {
            ctx.beginPath();
            ctx.moveTo(pc[i].x, pc[i].y);
            ctx.lineTo(pc[i+4].x, pc[i+4].y);
            ctx.stroke();
        }
        ctx.restore();

        // ── Walk path (no shadow — cheaper GPU) ───────────
        ctx.save();
        const pathLen = history.length;
        const startIdx = Math.max(0, pathLen - targetHistory - 1);
        for (let i = startIdx; i < pathLen - 2; i++) {
            const dx = Math.abs(history[i].x - history[i+1].x);
            const dy = Math.abs(history[i].y - history[i+1].y);
            const dz = Math.abs(history[i].z - history[i+1].z);
            if (dx > 2*L || dy > 2*L || dz > 2*L) continue; // skip wrap-around lines

            const p1 = project(history[i].x,   history[i].y,   history[i].z,   tR, pR);
            const p2 = project(history[i+1].x, history[i+1].y, history[i+1].z, tR, pR);
            if (p1.visible && p2.visible) {
                // map progress strictly to the visible targetHistory window for smooth fading
                const progress = (i - startIdx) / (pathLen - startIdx);
                const alpha = 0.002 + Math.pow(progress, 3) * 0.38;
                ctx.strokeStyle = `rgba(169, 132, 77, ${alpha})`;
                ctx.lineWidth   = 0.3 + Math.pow(progress, 3) * 1.5;
                ctx.beginPath();
                ctx.moveTo(p1.x, p1.y);
                ctx.lineTo(p2.x, p2.y);
                ctx.stroke();
            }
        }

        // ── Latest segment glow (single shadow pass) ──────
        const secLast = history[pathLen - 2];
        const dxL = Math.abs(secLast.x - activePos.x);
        const dyL = Math.abs(secLast.y - activePos.y);
        const dzL = Math.abs(secLast.z - activePos.z);
        const pActive = project(activePos.x, activePos.y, activePos.z, tR, pR);

        if (dxL <= 2*L && dyL <= 2*L && dzL <= 2*L) {
            const pSecLast = project(secLast.x, secLast.y, secLast.z, tR, pR);
            if (pSecLast.visible && pActive.visible) {
                const glowElapsed = now - glowStartTime;
                const glowFactor  = Math.max(0, 1 - glowElapsed / Math.max(stepSpeed * 0.7, 800));

                ctx.strokeStyle = 'rgba(243, 217, 162, 0.75)';
                ctx.lineWidth   = 1.8;
                ctx.beginPath();
                ctx.moveTo(pSecLast.x, pSecLast.y);
                ctx.lineTo(pActive.x,  pActive.y);
                ctx.stroke();

                if (glowFactor > 0.01) {
                    ctx.shadowColor = '#f3d9a2';
                    ctx.shadowBlur  = 14 * glowFactor;
                    ctx.strokeStyle = `rgba(243, 217, 162, ${0.35 + 0.55 * glowFactor})`;
                    ctx.lineWidth   = 2 + 2 * glowFactor;
                    ctx.beginPath();
                    ctx.moveTo(pSecLast.x, pSecLast.y);
                    ctx.lineTo(pActive.x,  pActive.y);
                    ctx.stroke();
                    ctx.shadowBlur = 0; // reset immediately
                }
            }
        }
        ctx.restore();

        // ── Glowing particle dot ──────────────────────────
        if (pActive.visible) {
            const glowElapsed = now - glowStartTime;
            const glowFactor  = Math.max(0, 1 - glowElapsed / Math.max(stepSpeed * 0.7, 800));
            ctx.save();
            const pulse  = 1.2 * Math.sin(now / 200);
            const radius = 5.5 + pulse + 3.5 * glowFactor;
            ctx.shadowColor = '#f3d9a2';
            ctx.shadowBlur  = 10 + 12 * glowFactor;
            const rg = ctx.createRadialGradient(pActive.x, pActive.y, 0, pActive.x, pActive.y, radius);
            rg.addColorStop(0,   '#ffffff');
            rg.addColorStop(0.3, 'rgba(243,217,162,0.9)');
            rg.addColorStop(0.8, 'rgba(169,132,77,0.45)');
            rg.addColorStop(1,   'rgba(169,132,77,0)');
            ctx.fillStyle = rg;
            ctx.beginPath();
            ctx.arc(pActive.x, pActive.y, radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0; // reset
            ctx.restore();
        }

        // Keep dirty during particle pulse animation
        needsRedraw = true; // pulse is always animating; accept ~30fps cost
    }

    requestAnimationFrame(draw);
}
