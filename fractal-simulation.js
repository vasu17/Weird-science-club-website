// ============================================================
// 3D Fractal Explorer & 2D Julia Playground — Script
// ============================================================

window.addEventListener('DOMContentLoaded', () => {
    init3DFractalExplorer();
    init2DJuliaPlayground();
});

/* ──────────────────────────────────────────────────────────
   1. 3D FRACTAL EXPLORER (WebGL Raymarching)
   ────────────────────────────────────────────────────────── */
function init3DFractalExplorer() {
    const canvas = document.getElementById('simCanvas');
    const viewport = document.getElementById('viewportContainer');
    if (!canvas || !viewport) return;

    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) {
        console.warn('WebGL not supported on this device.');
        return;
    }

    // --- DOM Elements ---
    const fractalTypeSelect = document.getElementById('fractalType');
    const zoomSlider = document.getElementById('zoomSlider');
    const zoomVal = document.getElementById('zoomVal');
    const speedSlider = document.getElementById('speedSlider');
    const speedVal = document.getElementById('speedVal');
    const iterSlider = document.getElementById('iterSlider');
    const iterVal = document.getElementById('iterVal');
    const stepsSlider = document.getElementById('stepsSlider');
    const stepsVal = document.getElementById('stepsVal');
    const themeSelector = document.getElementById('themeSelector');
    const playPauseBtn = document.getElementById('playPauseBtn');
    const playIcon = document.getElementById('playIcon');
    const resetParamsBtn = document.getElementById('resetParamsBtn');

    // Panel collapse DOMs
    const panelHeader = document.getElementById('panelHeader');
    const panelBody = document.getElementById('panelBody');
    const collapseChevron = document.getElementById('collapseChevron');
    const collapseBtn = document.getElementById('collapseBtn');
    const scrollArrow = document.getElementById('scrollArrow');

    // --- Collapsible panel interaction ---
    let panelCollapsed = true;
    function togglePanel() {
        panelCollapsed = !panelCollapsed;
        panelBody.classList.toggle('collapsed', panelCollapsed);
        collapseChevron.classList.toggle('collapsed', panelCollapsed);
        collapseBtn.setAttribute('aria-expanded', String(!panelCollapsed));
    }
    if (panelHeader) panelHeader.addEventListener('click', togglePanel);
    if (collapseBtn) collapseBtn.addEventListener('click', e => { e.stopPropagation(); togglePanel(); });
    if (scrollArrow) {
        scrollArrow.addEventListener('click', () => {
            document.getElementById('controlSection').scrollIntoView({ behavior: 'smooth' });
        });
    }

    // --- Shader sources ---
    const vsSource = `
        attribute vec2 position;
        void main() {
            gl_Position = vec4(position, 0.0, 1.0);
        }
    `;

    const fsSource = `
        precision highp float;
        uniform vec2 u_resolution;
        uniform float u_time;
        uniform float u_zoom;
        uniform int u_iterations;
        uniform int u_max_steps;
        uniform int u_fractal_type;
        uniform int u_color_theme;
        uniform vec2 u_camera_rot;

        // Box distance helper
        float sdBox(vec3 p, vec3 b) {
            vec3 q = abs(p) - b;
            return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
        }

        // Distance Estimator mapping
        float map(vec3 p) {
            if (u_fractal_type == 0) {
                // Mandelbulb
                vec3 w = p;
                float dr = 1.0;
                float r = 0.0;
                float power = 6.0 + 2.0 * sin(u_time * 0.15);
                for (int i = 0; i < 10; i++) {
                    if (i >= u_iterations) break;
                    r = length(w);
                    if (r > 2.0) break;
                    float theta = acos(clamp(w.z / r, -1.0, 1.0));
                    float phi = atan(w.y, w.x);
                    dr = pow(r, power - 1.0) * power * dr + 1.0;
                    float zr = pow(r, power);
                    theta = theta * power;
                    phi = phi * power;
                    w = zr * vec3(sin(theta)*cos(phi), sin(theta)*sin(phi), cos(theta)) + p;
                }
                return 0.5 * log(r) * r / dr;
            } 
            else if (u_fractal_type == 1) {
                // Menger Sponge
                float angle = u_time * 0.05;
                float c = cos(angle);
                float s = sin(angle);
                mat2 rot = mat2(c, -s, s, c);
                float d = sdBox(p, vec3(1.0));
                float scale = 1.0;
                for (int i = 0; i < 6; i++) {
                    if (i >= u_iterations) break;
                    p.xy = rot * p.xy;
                    p.xz = rot * p.xz;
                    vec3 a = mod(p * scale, 2.0) - 1.0;
                    scale *= 3.0;
                    vec3 rBox = abs(1.0 - 3.0 * abs(a));
                    float da = max(rBox.x, rBox.y);
                    float db = max(rBox.y, rBox.z);
                    float dc = max(rBox.z, rBox.x);
                    float c_val = (min(da, min(db, dc)) - 1.0) / scale;
                    d = max(d, c_val);
                }
                return d;
            } 
            else if (u_fractal_type == 2) {
                // Sierpinski IFS
                float scale = 2.0;
                float offset = 1.0;
                float angle = u_time * 0.04;
                float c = cos(angle);
                float s = sin(angle);
                mat2 rot = mat2(c, -s, s, c);
                for (int i = 0; i < 10; i++) {
                    if (i >= u_iterations) break;
                    p.xy = rot * p.xy;
                    p.xz = rot * p.xz;
                    if (p.x + p.y < 0.0) p.xy = -p.yx;
                    if (p.x + p.z < 0.0) p.xz = -p.zx;
                    if (p.y + p.z < 0.0) p.zy = -p.yz;
                    p = p * scale - offset * (scale - 1.0);
                }
                return length(p) * pow(scale, -float(u_iterations));
            } 
            else if (u_fractal_type == 3) {
                // Quaternion Julia Set
                vec4 z = vec4(p, 0.0);
                vec4 dz = vec4(1.0, 0.0, 0.0, 0.0);
                vec4 c_val = vec4(-0.15 + 0.1 * sin(u_time * 0.1), 0.55 + 0.05 * cos(u_time * 0.05), 0.2, 0.15);
                float r = 0.0;
                for (int i = 0; i < 10; i++) {
                    if (i >= u_iterations) break;
                    r = length(z);
                    if (r > 4.0) break;
                    dz = 2.0 * vec4(
                        z.x*dz.x - z.y*dz.y - z.z*dz.z - z.w*dz.w,
                        z.x*dz.y + z.y*dz.x + z.z*dz.w - z.w*dz.z,
                        z.x*dz.z - z.y*dz.w + z.z*dz.x + z.w*dz.y,
                        z.x*dz.w + z.y*dz.z - z.z*dz.y + z.w*dz.x
                    );
                    z = vec4(
                        z.x*z.x - z.y*z.y - z.z*z.z - z.w*z.w,
                        2.0*z.x*z.y,
                        2.0*z.x*z.z,
                        2.0*z.x*z.w
                    ) + c_val;
                }
                return 0.5 * log(r) * r / length(dz);
            } 
            else {
                // Space-Folding Cave
                p = abs(mod(p - 1.5, 3.0) - 1.5);
                float scale = 1.35 + 0.05 * sin(u_time * 0.05);
                for (int i = 0; i < 10; i++) {
                    if (i >= u_iterations) break;
                    p = abs(p) - 0.45;
                    float c = cos(0.35);
                    float s = sin(0.35);
                    p.xy = mat2(c, -s, s, c) * p.xy;
                    p.xz = mat2(c, -s, s, c) * p.xz;
                    p *= scale;
                }
                return (length(p) - 0.2) / pow(scale, float(u_iterations));
            }
        }

        // Normals calculation
        vec3 getNormal(vec3 p) {
            vec2 e = vec2(0.002, 0.0);
            return normalize(vec3(
                map(p + e.xyy) - map(p - e.xyy),
                map(p + e.yxy) - map(p - e.yxy),
                map(p + e.yyx) - map(p - e.yyx)
            ));
        }

        // Color theme helpers
        vec3 getBaseColor(vec3 p) {
            if (u_color_theme == 0) {
                return vec3(0.83, 0.68, 0.21) + 0.15 * sin(p.xyz * 2.0); // Gold
            } else if (u_color_theme == 1) {
                return vec3(0.35, 0.55, 0.85) + 0.15 * cos(p.zxy * 3.0); // Blue
            } else if (u_color_theme == 2) {
                return vec3(0.85, 0.35, 0.55) + 0.15 * sin(p.yzx * 4.0); // Pink
            } else if (u_color_theme == 3) {
                return vec3(0.25, 0.75, 0.65) + 0.15 * sin(p.xyz * 1.5); // Teal
            } else {
                return vec3(0.65, 0.35, 0.95) + 0.15 * cos(p.yyy * 5.0); // Violet
            }
        }

        vec3 getGlowColor() {
            if (u_color_theme == 0) return vec3(0.95, 0.85, 0.64);
            else if (u_color_theme == 1) return vec3(0.2, 0.45, 0.85);
            else if (u_color_theme == 2) return vec3(0.85, 0.25, 0.45);
            else if (u_color_theme == 3) return vec3(0.15, 0.75, 0.55);
            else return vec3(0.55, 0.15, 0.85);
        }

        void main() {
            vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / u_resolution.y;
            
            // Background gradient matching the CSS fixed background (#0f1523 top to #06080d bottom)
            float grad = gl_FragCoord.y / u_resolution.y;
            vec3 bgGradColor = mix(vec3(0.0235, 0.0314, 0.051), vec3(0.0588, 0.0824, 0.1373), grad);
            
            // Build camera matrix using horizontal/vertical rotation uniforms
            float theta = u_camera_rot.x;
            float phi = u_camera_rot.y;
            
            vec3 ro = vec3(
                u_zoom * cos(phi) * sin(theta),
                u_zoom * sin(phi),
                u_zoom * cos(phi) * cos(theta)
            );
            vec3 ta = vec3(0.0, 0.0, 0.0);
            
            vec3 ww = normalize(ta - ro);
            vec3 uu = normalize(cross(ww, vec3(0.0, 1.0, 0.0)));
            vec3 vv = normalize(cross(uu, ww));
            vec3 rd = normalize(uv.x * uu + uv.y * vv + 1.2 * ww);
            
            float t = 0.0;
            float max_d = 10.0;
            int steps = 0;
            float min_dist = 1e10;
            
            for (int i = 0; i < 80; i++) {
                if (i >= u_max_steps) break;
                vec3 p = ro + rd * t;
                float d = map(p);
                min_dist = min(min_dist, d);
                if (d < 0.002 || t > max_d) break;
                t += d;
                steps = i;
            }
            
            vec3 color = vec3(0.0);
            
            if (t < max_d) {
                vec3 p = ro + rd * t;
                vec3 normal = getNormal(p);
                vec3 lightDir = normalize(vec3(1.0, 1.0, 1.0));
                float diff = max(dot(normal, lightDir), 0.0);
                float ao = 1.0 - float(steps) / float(u_max_steps);
                
                vec3 baseColor = getBaseColor(p);
                color = baseColor * (diff + 0.1) * ao;
                
                // Add soft fog blending into the blue background gradient
                color = mix(color, bgGradColor, 1.0 - exp(-0.02 * t * t));
            } else {
                float glow = exp(-20.0 * min_dist);
                color = getGlowColor() * glow * 0.35;
                color += bgGradColor; // Blend glow with the background gradient
            }
            
            gl_FragColor = vec4(color, 1.0);
        }
    `;

    // Compile shaders
    function createShader(gl, type, source) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error('Shader compile error:', gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }
        return shader;
    }

    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vsSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fsSource);
    if (!vertexShader || !fragmentShader) return;

    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('Program linking failed:', gl.getProgramInfoLog(program));
        return;
    }

    // Full screen quad geometry
    const positionAttributeLocation = gl.getAttribLocation(program, 'position');
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    const positions = [
        -1, -1,
         1, -1,
        -1,  1,
        -1,  1,
         1, -1,
         1,  1,
    ];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    // Uniform locations
    const resolutionLoc = gl.getUniformLocation(program, 'u_resolution');
    const timeLoc = gl.getUniformLocation(program, 'u_time');
    const zoomLoc = gl.getUniformLocation(program, 'u_zoom');
    const iterLoc = gl.getUniformLocation(program, 'u_iterations');
    const stepsLoc = gl.getUniformLocation(program, 'u_max_steps');
    const typeLoc = gl.getUniformLocation(program, 'u_fractal_type');
    const themeLoc = gl.getUniformLocation(program, 'u_color_theme');
    const cameraLoc = gl.getUniformLocation(program, 'u_camera_rot');

    // --- State variables ---
    let cameraTheta = 0.5; // Yaw
    let cameraPhi = 0.3;   // Pitch
    let isDragging = false;
    let prevMouseX = 0;
    let prevMouseY = 0;

    let isMorphing = true;
    let currentMorphTime = 0.0;
    let lastTimeVal = Date.now();

    // Default presets
    const defaults = {
        mandelbulb: { type: 0, zoom: 2.5, iterations: 6, steps: 40, theme: 0 },
        menger:     { type: 1, zoom: 2.3, iterations: 4, steps: 35, theme: 1 },
        sierpinski: { type: 2, zoom: 2.4, iterations: 5, steps: 45, theme: 2 },
        julia:      { type: 3, zoom: 2.2, iterations: 6, steps: 40, theme: 3 },
        cave:       { type: 4, zoom: 2.6, iterations: 4, steps: 35, theme: 4 }
    };

    function getSelectedKey() {
        return fractalTypeSelect.value;
    }

    // Update preset values when switching fractal types
    fractalTypeSelect.addEventListener('change', () => {
        const key = getSelectedKey();
        const settings = defaults[key];
        
        zoomSlider.value = settings.zoom;
        zoomVal.textContent = settings.zoom;

        iterSlider.value = settings.iterations;
        iterVal.textContent = settings.iterations;

        stepsSlider.value = settings.steps;
        stepsVal.textContent = settings.steps;

        themeSelector.value = themeSelector.options[settings.theme].value;
    });

    // Handle slider updates
    zoomSlider.addEventListener('input', () => zoomVal.textContent = zoomSlider.value);
    speedSlider.addEventListener('input', () => speedVal.textContent = parseFloat(speedSlider.value).toFixed(1) + 'x');
    iterSlider.addEventListener('input', () => iterVal.textContent = iterSlider.value);
    stepsSlider.addEventListener('input', () => stepsVal.textContent = stepsSlider.value);

    // Play/Pause Morphing Animation
    playPauseBtn.addEventListener('click', () => {
        isMorphing = !isMorphing;
        if (isMorphing) {
            playPauseBtn.classList.add('btn-active');
            playIcon.textContent = '⏸';
        } else {
            playPauseBtn.classList.remove('btn-active');
            playIcon.textContent = '▶';
        }
    });

    // Reset controls
    resetParamsBtn.addEventListener('click', () => {
        const key = getSelectedKey();
        const settings = defaults[key];
        
        zoomSlider.value = settings.zoom;
        zoomVal.textContent = settings.zoom;

        iterSlider.value = settings.iterations;
        iterVal.textContent = settings.iterations;

        stepsSlider.value = settings.steps;
        stepsVal.textContent = settings.steps;

        themeSelector.value = themeSelector.options[settings.theme].value;
        speedSlider.value = 1.0;
        speedVal.textContent = '1.0x';

        cameraTheta = 0.5;
        cameraPhi = 0.3;
    });

    // --- Drag to Orbit camera ---
    viewport.addEventListener('mousedown', (e) => {
        isDragging = true;
        prevMouseX = e.clientX;
        prevMouseY = e.clientY;
    });

    window.addEventListener('mouseup', () => {
        isDragging = false;
    });

    window.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const dx = e.clientX - prevMouseX;
        const dy = e.clientY - prevMouseY;

        cameraTheta -= dx * 0.007;
        cameraPhi = Math.max(-1.4, Math.min(1.4, cameraPhi + dy * 0.007));

        prevMouseX = e.clientX;
        prevMouseY = e.clientY;
    });

    // Touch support
    viewport.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) {
            isDragging = true;
            prevMouseX = e.touches[0].clientX;
            prevMouseY = e.touches[0].clientY;
        }
    }, { passive: true });

    window.addEventListener('touchend', () => {
        isDragging = false;
    });

    window.addEventListener('touchmove', (e) => {
        if (!isDragging || e.touches.length !== 1) return;
        const dx = e.touches[0].clientX - prevMouseX;
        const dy = e.touches[0].clientY - prevMouseY;

        cameraTheta -= dx * 0.008;
        cameraPhi = Math.max(-1.4, Math.min(1.4, cameraPhi + dy * 0.008));

        prevMouseX = e.touches[0].clientX;
        prevMouseY = e.touches[0].clientY;
    });

    // Resize canvas: use full resolution for crisp rendering
    function resize() {
        canvas.width = viewport.clientWidth;
        canvas.height = viewport.clientHeight;
        gl.viewport(0, 0, canvas.width, canvas.height);
    }
    resize();
    window.addEventListener('resize', resize);

    // --- Render Loop ---
    function render() {
        const now = Date.now();
        const dt = (now - lastTimeVal) * 0.001;
        lastTimeVal = now;

        const speed = parseFloat(speedSlider.value);
        if (isMorphing) {
            currentMorphTime += dt * speed;
        }

        // Slow automatic orbit if camera is not dragged
        if (!isDragging && speed > 0.0) {
            cameraTheta += dt * 0.05 * speed;
        }

        gl.clearColor(0.04, 0.06, 0.1, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        gl.useProgram(program);

        gl.enableVertexAttribArray(positionAttributeLocation);
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);

        gl.uniform2f(resolutionLoc, canvas.width, canvas.height);
        gl.uniform1f(timeLoc, currentMorphTime);
        gl.uniform1f(zoomLoc, parseFloat(zoomSlider.value));
        gl.uniform1i(iterLoc, parseInt(iterSlider.value));
        gl.uniform1i(stepsLoc, parseInt(stepsSlider.value));

        // Get type index from dropdown value
        let fIndex = 0;
        const fKey = getSelectedKey();
        if (fKey === 'menger') fIndex = 1;
        else if (fKey === 'sierpinski') fIndex = 2;
        else if (fKey === 'julia') fIndex = 3;
        else if (fKey === 'cave') fIndex = 4;
        gl.uniform1i(typeLoc, fIndex);

        // Get color theme index from dropdown value
        let tIndex = 0;
        const tKey = themeSelector.value;
        if (tKey === 'blue') tIndex = 1;
        else if (tKey === 'pink') tIndex = 2;
        else if (tKey === 'teal') tIndex = 3;
        else if (tKey === 'violet') tIndex = 4;
        gl.uniform1i(themeLoc, tIndex);

        // Set camera rotation
        gl.uniform2f(cameraLoc, cameraTheta, cameraPhi);

        gl.drawArrays(gl.TRIANGLES, 0, 6);

        requestAnimationFrame(render);
    }

    requestAnimationFrame(render);
}

/* ──────────────────────────────────────────────────────────
   2. 2D JULIA PLAYGROUND (2D HTML Canvas)
   ────────────────────────────────────────────────────────── */
function init2DJuliaPlayground() {
    const canvas = document.getElementById('gameCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;

    // --- DOM Elements ---
    const juliaReal = document.getElementById('juliaReal');
    const juliaImag = document.getElementById('juliaImag');
    const lockJuliaBtn = document.getElementById('lockJuliaBtn');
    const colorJuliaBtn = document.getElementById('colorJuliaBtn');
    const juliaStatus = document.getElementById('juliaStatus');

    let cReal = -0.7;
    let cImag = 0.27015;
    let isLocked = false;
    let paletteIndex = 0;

    // Double buffer typed array to write pixels fast
    const imgData = ctx.createImageData(W, H);
    const buf = new ArrayBuffer(imgData.data.length);
    const buf8 = new Uint8ClampedArray(buf);
    const data32 = new Uint32Array(buf);

    // Color palettes (packed into 32-bit integer color bins in ABGR order)
    const palettes = [
        // Palette 0: Gold & Fire
        (val) => {
            const r = Math.floor(Math.sin(0.15 * val + 1.0) * 127 + 128);
            const g = Math.floor(Math.sin(0.12 * val + 0.2) * 100 + 100);
            const b = Math.floor(Math.sin(0.08 * val) * 50 + 50);
            return (255 << 24) | (b << 16) | (g << 8) | r;
        },
        // Palette 1: Electric Cyan & Blue
        (val) => {
            const r = Math.floor(Math.sin(0.08 * val) * 40 + 40);
            const g = Math.floor(Math.sin(0.14 * val + 0.8) * 127 + 128);
            const b = Math.floor(Math.sin(0.16 * val + 1.5) * 127 + 128);
            return (255 << 24) | (b << 16) | (g << 8) | r;
        },
        // Palette 2: Pink & Cosmic Magenta
        (val) => {
            const r = Math.floor(Math.sin(0.16 * val + 1.2) * 127 + 128);
            const g = Math.floor(Math.sin(0.08 * val) * 30 + 30);
            const b = Math.floor(Math.sin(0.14 * val + 0.5) * 127 + 128);
            return (255 << 24) | (b << 16) | (g << 8) | r;
        },
        // Palette 3: Acid Green & Emerald
        (val) => {
            const r = Math.floor(Math.sin(0.09 * val) * 50 + 50);
            const g = Math.floor(Math.sin(0.15 * val + 1.0) * 127 + 128);
            const b = Math.floor(Math.sin(0.11 * val + 0.3) * 80 + 80);
            return (255 << 24) | (b << 16) | (g << 8) | r;
        }
    ];

    function drawJulia() {
        const maxIter = 32;
        const colorFn = palettes[paletteIndex];

        // Draw pixel values
        for (let y = 0; y < H; y++) {
            const zImag = 1.5 * (y - H / 2) / (H / 2);
            for (let x = 0; x < W; x++) {
                let zReal = 1.5 * (x - W / 2) / (W / 2);
                let zi = zImag;
                let iter = 0;

                while (zReal * zReal + zi * zi < 4.0 && iter < maxIter) {
                    const temp = zReal * zReal - zi * zi + cReal;
                    zi = 2.0 * zReal * zi + cImag;
                    zReal = temp;
                    iter++;
                }

                // If inside Mandelbrot set, color black. Otherwise, dynamic color
                if (iter === maxIter) {
                    data32[y * W + x] = 0xFF000000; // Black (ARGB)
                } else {
                    data32[y * W + x] = colorFn(iter);
                }
            }
        }

        imgData.data.set(buf8);
        ctx.putImageData(imgData, 0, 0);
    }

    // --- Interactive Mouse tracking ---
    canvas.addEventListener('mousemove', (e) => {
        if (isLocked) return;
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;

        // Map mouse position to complex C coords
        cReal = 3.0 * (mx / W) - 1.5;
        cImag = 3.0 * (my / H) - 1.5;

        // Round for HUD display
        juliaReal.textContent = cReal.toFixed(3);
        juliaImag.textContent = cImag.toFixed(3);

        drawJulia();
    });

    // Touch support for 2D playground
    canvas.addEventListener('touchmove', (e) => {
        if (isLocked || e.touches.length !== 1) return;
        const rect = canvas.getBoundingClientRect();
        const mx = e.touches[0].clientX - rect.left;
        const my = e.touches[0].clientY - rect.top;

        cReal = 3.0 * (mx / W) - 1.5;
        cImag = 3.0 * (my / H) - 1.5;

        juliaReal.textContent = cReal.toFixed(3);
        juliaImag.textContent = cImag.toFixed(3);

        drawJulia();
    }, { passive: true });

    function toggleLock() {
        isLocked = !isLocked;
        if (isLocked) {
            lockJuliaBtn.classList.add('btn-active');
            lockJuliaBtn.innerHTML = '🔓 Unlock Constant';
            juliaStatus.textContent = 'Locked';
            juliaStatus.style.color = '#ff6b6b';
        } else {
            lockJuliaBtn.classList.remove('btn-active');
            lockJuliaBtn.innerHTML = '🔒 Lock Constant';
            juliaStatus.textContent = 'Active';
            juliaStatus.style.color = '#f3d9a2';
        }
    }

    // Toggle Lock button
    lockJuliaBtn.addEventListener('click', toggleLock);

    // Double click to lock/unlock morphing on canvas
    canvas.addEventListener('dblclick', (e) => {
        e.preventDefault();
        toggleLock();
    });

    // Cycle color palette
    colorJuliaBtn.addEventListener('click', () => {
        paletteIndex = (paletteIndex + 1) % palettes.length;
        drawJulia();
    });

    // Initial render
    drawJulia();
}
