// ============================================================
// 2D Pixelated Random Walk Game  +  Three.js Tetrahedron Die
// Axis Mundi Science Pub Talks
// ============================================================

window.addEventListener('DOMContentLoaded', () => {
    initPixelGame();
});

function initPixelGame() {

    // ─── Park Canvas ─────────────────────────────────────────────────────────
    const canvas = document.getElementById('gameCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    const stepsVal = document.getElementById('gameSteps');
    const posVal = document.getElementById('gamePos');
    const distVal = document.getElementById('gameDist');
    const rollBtn = document.getElementById('rollBtn');
    const autoBtn = document.getElementById('autoWalkBtn');
    const resetBtn = document.getElementById('resetGameBtn');
    const autoIcon = document.getElementById('autoWalkIcon');
    const resultText = document.getElementById('rollResultText');
    const dieCanvas = document.getElementById('dieCanvas');

    // ─── Game Constants ───────────────────────────────────────────────────────
    const GRID_SIZE = 20;
    const CELL_SIZE = 400 / GRID_SIZE;
    const CENTER = Math.floor(GRID_SIZE / 2);
    const MOVE_DURATION = 180; // ms for player slide

    // ─── Game State ───────────────────────────────────────────────────────────
    let playerX = CENTER, playerY = CENTER;
    let prevX = CENTER, prevY = CENTER;
    let isMoving = false, moveStartTime = 0;
    let path = [{ x: CENTER, y: CENTER }];
    let trees = [], grassDetail = [];
    let isRolling = false, isAutoWalking = false;
    let autoWalkIntervalId = null;
    let audioCtx = null;

    const DIRS = {
        N: { dx: 0, dy: -1, label: 'North' },
        S: { dx: 0, dy: 1, label: 'South' },
        E: { dx: 1, dy: 0, label: 'East' },
        W: { dx: -1, dy: 0, label: 'West' }
    };
    const CARDINALS = ['N', 'E', 'S', 'W'];

    // 16×16 Explorer Sprite colour map
    const SPRITE_COLORS = { b: '#0c121d', d: '#a94d4dff', g: '#f3d9a2', w: '#ffffff', r: '#705530' };
    const PLAYER_SPRITE = [
        '....bbbbbbbb....',
        '...bddddddddb...',
        '..bddddddddddb..',
        '..bdggggggggdb..',
        '..bdgwwgwwgddb..',
        '..bdgbbgbbgddb..',
        '...bdwwwwwwdb...',
        '..bggddddddggb..',
        '.bgddggggggddgb.',
        '.bggggggggggggb.',
        '.bggddddddddggb.',
        '..brrddddddrrb..',
        '...bddddddddb...',
        '...bdd....ddb...',
        '...bbb....bbb...',
        '................'
    ];

    // =========================================================================
    // Three.js Tetrahedron Die
    // =========================================================================

    const DIE_W = 160, DIE_H = 155;

    // Three.js objects
    let threeRenderer = null;
    let threeScene = null;
    let threeCamera = null;
    let tetraMesh = null;

    // Die animation state machine
    // States: 'idle' | 'rolling' | 'settling' | 'paused' | 'returning'
    let dieState = 'idle';
    let dieAnimStart = 0;
    let dieLastTime = 0;
    let pauseUntil = 0;

    // 2-D physics offset of the canvas element within screen space
    let dieOffX = 0, dieOffY = 0;
    let dieVelX = 0, dieVelY = 0;
    let baseX = 0, baseY = 0;

    // Resting (idle) rotation target
    const REST = { x: 0.45, y: 0.60, z: 0.10 };

    let faceData = [];
    let dieEdges = [];
    let resultFace = null;
    let chaosQuat = new THREE.Quaternion();
    let startQuat = new THREE.Quaternion();

    // ── Initialise Three.js scene ─────────────────────────────────────────────
    function initDie() {
        if (!dieCanvas || !window.THREE) {
            console.warn('walk-game: Three.js not loaded – die disabled');
            return;
        }

        dieCanvas.width = DIE_W;
        dieCanvas.height = DIE_H;

        // Renderer with transparent background so the dark card shows through
        threeRenderer = new THREE.WebGLRenderer({ canvas: dieCanvas, alpha: true, antialias: true });
        threeRenderer.setSize(DIE_W, DIE_H);
        threeRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        threeRenderer.setClearColor(0x000000, 0);

        threeScene = new THREE.Scene();
        threeCamera = new THREE.PerspectiveCamera(42, DIE_W / DIE_H, 0.1, 50);
        threeCamera.position.set(0, 0, 4.6);

        // Lighting — gold-tinted theme
        threeScene.add(new THREE.AmbientLight(0x8a6820, 0.55));

        const mainLight = new THREE.DirectionalLight(0xf3d9a2, 1.7);
        mainLight.position.set(3, 4, 5);
        threeScene.add(mainLight);

        const rimLight = new THREE.DirectionalLight(0x0c1a44, 0.55);
        rimLight.position.set(-4, -2, -3);
        threeScene.add(rimLight);

        const topLight = new THREE.DirectionalLight(0xa98440, 0.4);
        topLight.position.set(0, 5, 0);
        threeScene.add(topLight);

        // ── Tetrahedron (d4 die) ──────────────────────────────────────────────
        // Using Three.js built-in TetrahedronGeometry
        const geo = new THREE.TetrahedronGeometry(1.18, 0);

        const mat = new THREE.MeshPhongMaterial({
            color: 0x080d1a,
            emissive: 0x060911,
            specular: 0xb89040,
            shininess: 100,
        });

        tetraMesh = new THREE.Mesh(geo, mat);
        threeScene.add(tetraMesh);

        // N / S / E / W labels and edges per face
        attachFaces(geo);

        // Set initial rotation to the first corner's target quaternion (North) so it looks beautiful on load
        if (faceData && faceData.length > 0) {
            tetraMesh.quaternion.copy(faceData[0].targetQuat);
        }

        // Kick off Three.js render loop
        dieLastTime = performance.now() * 0.001;
        requestAnimationFrame(dieTick);
    }

    // Attach planes with text to corners, and draw the 6 edges
    function attachFaces(geo) {
        faceData = [];
        dieEdges = [];
        const pos = geo.getAttribute('position');

        // 1. Extract 4 unique vertices (corners)
        const vertices = [];
        for (let i = 0; i < pos.count; i++) {
            const v = new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i));
            let dup = false;
            for (let uv of vertices) {
                if (uv.distanceTo(v) < 0.01) { dup = true; break; }
            }
            if (!dup) vertices.push(v);
        }

        // 2. Draw 6 edge lines of the tetrahedron
        const edgePairs = [[0, 1], [0, 2], [0, 3], [1, 2], [1, 3], [2, 3]];
        edgePairs.forEach(([idx1, idx2]) => {
            const lineGeo = new THREE.BufferGeometry().setFromPoints([vertices[idx1], vertices[idx2]]);
            const lineMat = new THREE.LineBasicMaterial({ color: 0xa98440 });
            const line = new THREE.Line(lineGeo, lineMat);
            tetraMesh.add(line);
            dieEdges.push({ indices: [idx1, idx2], mat: lineMat });
        });

        // 3. Create the 4 corner text planes
        for (let j = 0; j < 4; j++) {
            const v = vertices[j];
            const normal = v.clone().normalize();

            // Find the other 3 vertices
            const others = vertices.filter((_, idx) => idx !== j);
            const vUp = others[0]; // Pick one as the "up" reference
            
            // Project vUp onto the plane perpendicular to the corner normal to find the upright local axis.
            // We multiply by -1 so the base vertex points straight DOWN (world -Y) instead of UP,
            // making the outer outline a downward-pointing triangle just like the North roll.
            const upLocal = vUp.clone().projectOnPlane(normal).normalize().multiplyScalar(-1);
            const rightLocal = upLocal.clone().cross(normal).normalize();

            // Text plane canvas
            const cv = document.createElement('canvas');
            cv.width = cv.height = 128;
            const c = cv.getContext('2d');
            c.clearRect(0, 0, 128, 128);
            c.font = 'bold 74px Cinzel, Georgia, serif';
            c.textAlign = 'center';
            c.textBaseline = 'middle';
            c.shadowColor = 'rgba(0,0,0,0.9)';
            c.shadowBlur = 10;
            c.fillStyle = '#f3d9a2';
            c.fillText(CARDINALS[j], 64, 64);

            const tex = new THREE.CanvasTexture(cv);
            const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthTest: false, side: THREE.DoubleSide });
            const planeGeo = new THREE.PlaneGeometry(0.7, 0.7);
            const plane = new THREE.Mesh(planeGeo, mat);

            // Position slightly pushed outward from the vertex corner
            const planePos = v.clone().add(normal.clone().multiplyScalar(0.18));
            plane.position.copy(planePos);
            
            // Align plane using the symmetric basis
            plane.up.copy(upLocal);
            plane.lookAt(planePos.clone().add(normal));
            tetraMesh.add(plane);

            // Calculate target quaternion to make this corner point at the camera symmetrically
            const m = new THREE.Matrix4().makeBasis(rightLocal, upLocal, normal);
            const q = new THREE.Quaternion().setFromRotationMatrix(m).invert();
            
            const tilt = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), 0.25);
            q.premultiply(tilt);

            faceData.push({
                dir: CARDINALS[j],
                normal: normal,
                plane: plane,
                lineMat: null,
                targetQuat: q
            });
        }
    }

    // ── Die animation tick (runs at rAF) ──────────────────────────────────────
    function dieTick() {
        requestAnimationFrame(dieTick);

        const now = performance.now() * 0.001;
        const dt = Math.min(now - dieLastTime, 0.05);
        dieLastTime = now;

        if (!tetraMesh) {
            threeRenderer.render(threeScene, threeCamera);
            return;
        }

        switch (dieState) {

            // ── Idle: stay perfectly still on the landed face ─────────────
            case 'idle':
                // no physics or rotation updates needed
                break;

            // ── Rolling: chaotic tumble + physics translation ─────────────────
            case 'rolling': {
                const elapsed = now - dieAnimStart;

                // Physics: integrate velocity (in pixels now)
                dieOffX += dieVelX * dt;
                dieOffY += dieVelY * dt;

                // Bounce off window boundaries
                if (baseX + dieOffX < 0) {
                    dieVelX *= -0.7;
                    dieOffX = -baseX;
                } else if (baseX + dieOffX + DIE_W > window.innerWidth) {
                    dieVelX *= -0.7;
                    dieOffX = window.innerWidth - baseX - DIE_W;
                }
                
                if (baseY + dieOffY < 0) {
                    dieVelY *= -0.7;
                    dieOffY = -baseY;
                } else if (baseY + dieOffY + DIE_H > window.innerHeight) {
                    dieVelY *= -0.7;
                    dieOffY = window.innerHeight - baseY - DIE_H;
                }

                // Rolling friction
                const friction = Math.pow(0.35, dt);
                dieVelX *= friction;
                dieVelY *= friction;

                dieCanvas.style.transform = `translate(${dieOffX}px, ${dieOffY}px)`;

                // Tumble rotation: integrate chaotic spin into chaosQuat
                const spinX = dt * (11 + Math.sin(elapsed * 7.1) * 6);
                const spinY = dt * (9 + Math.cos(elapsed * 5.3) * 7);
                const spinZ = dt * (6 + Math.sin(elapsed * 9.9) * 4);
                const stepQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(spinX, spinY, spinZ));
                chaosQuat.multiply(stepQuat);

                // Blend from chaosQuat to resultFace.targetQuat smoothly
                // Rolling starts fully chaotic (0.0 to 0.4s), then blends (0.4s to 1.0s)
                if (elapsed < 0.4) {
                    tetraMesh.quaternion.copy(chaosQuat);
                } else {
                    const t = Math.min((elapsed - 0.4) / 0.6, 1);
                    const ease = t * t * (3 - 2 * t); // smoothstep
                    tetraMesh.quaternion.slerpQuaternions(chaosQuat, resultFace.targetQuat, ease);
                }

                // After 1.0 s of rolling, begin to settle
                if (elapsed > 1.00) {
                    dieState = 'settling';
                    dieAnimStart = now;

                    // Highlight the chosen corner plane and its connected edges
                    faceData.forEach(f => {
                        const isWin = (f === resultFace);
                        f.plane.material.color.setHex(isWin ? 0xffffff : 0x554433);
                    });

                    const winIdx = CARDINALS.indexOf(resultFace.dir);
                    dieEdges.forEach(e => {
                        const isConnected = e.indices.includes(winIdx);
                        e.mat.color.setHex(isConnected ? 0xffea99 : 0x332211);
                    });
                }
                break;
            }

            // ── Settling: rotate to face camera while staying where it landed ──
            case 'settling': {
                const elapsed = now - dieAnimStart;
                const t = Math.min(elapsed / 0.25, 1); // very quick 0.25s stop

                // Ensure it is perfectly aligned at the target
                tetraMesh.quaternion.copy(resultFace.targetQuat);

                if (t >= 1) {
                    // ── Result is decided here ────────────────────────────────
                    const dirLabel = DIRS[resultFace.dir].label;
                    resultText.textContent = `↳ ${dirLabel}`;

                    playChimeSound(resultFace.dir);
                    stepCharacter(resultFace.dir);

                    dieState = 'paused';
                    pauseUntil = now + 1.8; // rest where it landed for ~1.8s
                }
                break;
            }

            // ── Paused: hold perfectly still so player reads the result ─────────
            case 'paused':
                if (now >= pauseUntil) {
                    dieState = 'returning';
                    dieAnimStart = now;
                }
                break;

            // ── Returning: glide back to original container ───────────────────
            case 'returning': {
                const elapsed = now - dieAnimStart;
                const t = Math.min(elapsed / 0.8, 1); // 0.8s to return

                dieOffX += (0 - dieOffX) * Math.min(dt * 6, 1);
                dieOffY += (0 - dieOffY) * Math.min(dt * 6, 1);
                dieCanvas.style.transform = `translate(${dieOffX}px, ${dieOffY}px)`;

                if (t >= 1) {
                    dieOffX = 0;
                    dieOffY = 0;
                    dieCanvas.style.transform = `translate(0px, 0px)`;
                    dieState = 'idle';
                    isRolling = false; // allow next roll
                }
                break;
            }
        }

        threeRenderer.render(threeScene, threeCamera);
    }

    // ── Public roll trigger ───────────────────────────────────────────────────
    function rollDie() {
        if (isRolling || isMoving || dieState !== 'idle') return;
        isRolling = true;

        // Bring canvas to front during roll
        dieCanvas.style.position = 'relative';
        dieCanvas.style.zIndex = '9999';

        // Capture starting position relative to viewport
        const rect = dieCanvas.getBoundingClientRect();
        baseX = rect.left - dieOffX;
        baseY = rect.top - dieOffY;

        // Launch die with a random direction & fast pixel speed
        const angle = Math.random() * Math.PI * 2;
        const speed = 700 + Math.random() * 800; // px/sec
        dieVelX = Math.cos(angle) * speed;
        dieVelY = Math.sin(angle) * speed;
        dieOffX = 0;
        dieOffY = 0;

        dieState = 'rolling';
        dieAnimStart = performance.now() * 0.001;

        // Reset face and edge colors
        faceData.forEach(f => {
            f.plane.material.color.setHex(0xffffff);
        });
        dieEdges.forEach(e => {
            e.mat.color.setHex(0xa98440);
        });

        // Pre-select the result face uniformly at random to ensure true randomness
        resultFace = faceData[Math.floor(Math.random() * 4)];
        chaosQuat.copy(tetraMesh.quaternion);

        resultText.textContent = 'Rolling…';
        initAudio();
        playRattleSound();
    }

    // =========================================================================
    // Audio Synthesis
    // =========================================================================

    function initAudio() {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === 'suspended') audioCtx.resume();
    }

    function playRattleSound() {
        if (!audioCtx) return;
        const now = audioCtx.currentTime;
        const duration = isAutoWalking ? 0.28 : 0.52;
        for (let t = 0; t < duration; t += 0.05) {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(90 + Math.random() * 160, now + t);
            gain.gain.setValueAtTime(0.07, now + t);
            gain.gain.exponentialRampToValueAtTime(0.001, now + t + 0.04);
            osc.connect(gain); gain.connect(audioCtx.destination);
            osc.start(now + t); osc.stop(now + t + 0.04);
        }
    }

    function playChimeSound(dir) {
        if (!audioCtx) return;
        const now = audioCtx.currentTime;
        const freqs = {
            N: [523.25, 659.25],
            S: [392.00, 329.63],
            E: [440.00, 554.37],
            W: [587.33, 493.88]
        };
        const notes = freqs[dir] || [440, 554];
        [[notes[0], 0], [notes[1], 0.09]].forEach(([freq, delay]) => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + delay);
            gain.gain.setValueAtTime(0.12, now + delay);
            gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.22);
            osc.connect(gain); gain.connect(audioCtx.destination);
            osc.start(now + delay); osc.stop(now + delay + 0.24);
        });
    }

    // =========================================================================
    // Park World Generation
    // =========================================================================

    function generateWorld() {
        trees = []; grassDetail = [];
        while (trees.length < 12) {
            const tx = Math.floor(Math.random() * GRID_SIZE);
            const ty = Math.floor(Math.random() * GRID_SIZE);
            const isCenter = Math.abs(tx - CENTER) <= 1 && Math.abs(ty - CENTER) <= 1;
            const dup = trees.some(t => t.x === tx && t.y === ty);
            if (!isCenter && !dup) trees.push({ x: tx, y: ty });
        }
        for (let i = 0; i < 60; i++) {
            grassDetail.push({
                x: Math.floor(Math.random() * 400),
                y: Math.floor(Math.random() * 400)
            });
        }
    }
    generateWorld();

    // =========================================================================
    // Park Canvas Rendering
    // =========================================================================

    function drawPlayer(px, py) {
        const scale = CELL_SIZE / 16;
        for (let row = 0; row < 16; row++) {
            for (let col = 0; col < 16; col++) {
                const ch = PLAYER_SPRITE[row][col];
                if (ch === '.') continue;
                ctx.fillStyle = SPRITE_COLORS[ch];
                ctx.fillRect(
                    px + col * scale, py + row * scale,
                    Math.ceil(scale), Math.ceil(scale)
                );
            }
        }
    }

    function drawTree(tx, ty) {
        const x = tx * CELL_SIZE, y = ty * CELL_SIZE;
        ctx.fillStyle = '#4c3417'; ctx.fillRect(x + 8, y + 10, 4, 10);
        ctx.fillStyle = '#101c0c';
        ctx.fillRect(x + 2, y + 4, 16, 7);
        ctx.fillRect(x + 4, y + 1, 12, 3);
        ctx.fillRect(x + 7, y, 6, 1);
        ctx.fillStyle = '#1c3416';
        ctx.fillRect(x + 4, y + 5, 12, 5);
        ctx.fillRect(x + 5, y + 2, 10, 3);
        ctx.fillRect(x + 8, y + 1, 4, 1);
        ctx.fillStyle = '#a9844d';
        ctx.fillRect(x + 7, y + 3, 2, 2);
        ctx.fillRect(x + 11, y + 4, 2, 2);
        ctx.fillStyle = '#f3d9a2';
        ctx.fillRect(x + 9, y + 2, 2, 1);
    }

    function render() {
        ctx.clearRect(0, 0, 400, 400);

        // Background grass
        ctx.fillStyle = '#14200e';
        ctx.fillRect(0, 0, 400, 400);

        // Grass blade details
        ctx.fillStyle = '#21311b';
        grassDetail.forEach(g => {
            ctx.fillRect(g.x, g.y, 2, 3);
            ctx.fillRect(g.x + 2, g.y + 1, 1, 2);
        });

        // Subtle grid lines
        ctx.strokeStyle = 'rgba(169,132,77,0.03)';
        ctx.lineWidth = 0.5;
        for (let i = 0; i <= GRID_SIZE; i++) {
            ctx.beginPath(); ctx.moveTo(i * CELL_SIZE, 0); ctx.lineTo(i * CELL_SIZE, 400); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(0, i * CELL_SIZE); ctx.lineTo(400, i * CELL_SIZE); ctx.stroke();
        }

        // Fading gold trail
        const maxTrail = 60;
        const startIdx = Math.max(0, path.length - maxTrail);
        ctx.save();
        ctx.shadowBlur = 4;
        ctx.shadowColor = '#f3d9a2';
        for (let i = startIdx; i < path.length - 1; i++) {
            const p1 = path[i], p2 = path[i + 1];
            if (Math.abs(p1.x - p2.x) > 1 || Math.abs(p1.y - p2.y) > 1) continue;
            const progress = (i - startIdx) / Math.max(1, path.length - 1 - startIdx);
            const alpha = 0.05 + Math.pow(progress, 1.8) * 0.55;
            ctx.strokeStyle = `rgba(243,217,162,${alpha})`;
            ctx.lineWidth = 1.5 + progress * 1.5;
            ctx.beginPath();
            ctx.moveTo(p1.x * CELL_SIZE + CELL_SIZE / 2, p1.y * CELL_SIZE + CELL_SIZE / 2);
            ctx.lineTo(p2.x * CELL_SIZE + CELL_SIZE / 2, p2.y * CELL_SIZE + CELL_SIZE / 2);
            ctx.stroke();
            ctx.fillStyle = `rgba(243,217,162,${alpha + 0.15})`;
            ctx.fillRect(p2.x * CELL_SIZE + 9, p2.y * CELL_SIZE + 9, 2, 2);
        }
        ctx.restore();

        // Trees
        trees.forEach(t => drawTree(t.x, t.y));

        // Player (interpolated)
        let renderX = playerX * CELL_SIZE;
        let renderY = playerY * CELL_SIZE;
        if (isMoving) {
            const elapsed = Date.now() - moveStartTime;
            const t = Math.min(elapsed / MOVE_DURATION, 1);
            const ease = t * (2 - t);
            const wX = Math.abs(playerX - prevX) > 1;
            const wY = Math.abs(playerY - prevY) > 1;
            if (!wX && !wY) {
                renderX = (prevX + (playerX - prevX) * ease) * CELL_SIZE;
                renderY = (prevY + (playerY - prevY) * ease) * CELL_SIZE;
            }
            if (t >= 1) isMoving = false;
        }
        drawPlayer(renderX, renderY);

        requestAnimationFrame(render);
    }

    // =========================================================================
    // Game Logic
    // =========================================================================

    function stepCharacter(dir) {
        prevX = playerX; prevY = playerY;
        const d = DIRS[dir];
        playerX = (playerX + d.dx + GRID_SIZE) % GRID_SIZE;
        playerY = (playerY + d.dy + GRID_SIZE) % GRID_SIZE;
        isMoving = true;
        moveStartTime = Date.now();
        path.push({ x: playerX, y: playerY });
        updateHUD();
    }

    function updateHUD() {
        stepsVal.textContent = path.length - 1;
        const relX = playerX - CENTER;
        const relY = CENTER - playerY;
        posVal.textContent = `(${relX}, ${relY})`;
        distVal.textContent = Math.sqrt(relX * relX + relY * relY).toFixed(1);
    }

    // =========================================================================
    // Event Listeners
    // =========================================================================

    // Die canvas — click to roll
    if (dieCanvas) {
        dieCanvas.addEventListener('click', () => { if (!isAutoWalking) rollDie(); });
    }

    // Roll button
    if (rollBtn) {
        rollBtn.addEventListener('click', () => { if (!isAutoWalking) rollDie(); });
    }

    // Auto-walk toggle
    if (autoBtn) {
        autoBtn.addEventListener('click', () => {
            initAudio();
            isAutoWalking = !isAutoWalking;
            if (isAutoWalking) {
                autoIcon.textContent = '⏸';
                autoBtn.classList.add('active');
                autoBtn.title = 'Pause Auto-Walk';
                rollBtn.disabled = true;
                rollDie(); // first roll immediately
                autoWalkIntervalId = setInterval(() => {
                    if (dieState === 'idle' && !isMoving) rollDie();
                }, 1000);
            } else {
                autoIcon.textContent = '▶';
                autoBtn.classList.remove('active');
                autoBtn.title = 'Start Auto-Walk';
                rollBtn.disabled = false;
                clearInterval(autoWalkIntervalId);
                autoWalkIntervalId = null;
            }
        });
    }

    // Reset
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            if (isAutoWalking) autoBtn.click();
            playerX = CENTER; playerY = CENTER;
            prevX = CENTER; prevY = CENTER;
            isMoving = false;
            isRolling = false;
            path = [{ x: CENTER, y: CENTER }];
            generateWorld();
            resultText.textContent = 'Ready';
            updateHUD();
        });
    }

    // =========================================================================
    // Boot
    // =========================================================================
    initDie();
    render();
}
