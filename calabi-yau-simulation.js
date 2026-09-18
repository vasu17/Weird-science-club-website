// 3D Calabi-Yau Manifold Explorer & Argand Complex Plane Playground — Script
// Axis Mundi Science Pub Talks

window.addEventListener('DOMContentLoaded', () => {
    init3DCalabiYauExplorer();
    initArgandExplorer();
    initCollapsiblePanel();
});

/* =========================================================================
   1. 3D CALABI-YAU EXPLORER (WebGL Multi-Sheet Fermat Hypersurface)
   ========================================================================= */

function init3DCalabiYauExplorer() {
    const canvas = document.getElementById('simCanvas');
    const viewport = document.getElementById('viewportContainer');
    if (!canvas || !viewport) return;

    const gl = canvas.getContext('webgl', { antialias: true, alpha: false, powerPreference: 'high-performance' }) ||
               canvas.getContext('experimental-webgl');
    if (!gl) {
        console.warn('WebGL not supported on this device.');
        return;
    }

    // --- State & Settings ---
    let state = {
        n: 5,
        density: 22,
        camDist: 3.4,
        targetCamDist: 3.4,
        rotSpeed: 0.18,
        alphaSpeed: 0.12,
        isAlphaPaused: false,
        theme: 'gold',
        renderMode: 'glass',
        rotX: 0.35,
        rotY: 0.45,
        targetRotX: 0.35,
        targetRotY: 0.45,
        scale: 0.85
    };

    const THEMES = {
        gold: {
            baseColor: [0.88, 0.72, 0.28],
            glowColor: [1.0, 0.88, 0.58],
            gridColor: [1.0, 0.94, 0.75]
        },
        sapphire: {
            baseColor: [0.22, 0.54, 0.92],
            glowColor: [0.38, 0.82, 1.0],
            gridColor: [0.65, 0.92, 1.0]
        },
        ruby: {
            baseColor: [0.88, 0.32, 0.54],
            glowColor: [1.0, 0.58, 0.78],
            gridColor: [1.0, 0.8, 0.9]
        },
        emerald: {
            baseColor: [0.18, 0.78, 0.62],
            glowColor: [0.35, 0.98, 0.84],
            gridColor: [0.72, 1.0, 0.92]
        },
        amethyst: {
            baseColor: [0.65, 0.32, 0.95],
            glowColor: [0.84, 0.58, 1.0],
            gridColor: [0.92, 0.78, 1.0]
        }
    };

    const MANIFOLD_TOPOLOGY = {
        2: { badge: 'Degree n = 2 · Elliptic Torus · χ = 0 · h¹´⁰ = 1' },
        3: { badge: 'Degree n = 3 · Fermat Cubic Triad · χ = -18 · 9 Sheets' },
        4: { badge: 'Degree n = 4 · Kummer Quartic (K3) · χ = 24 · h¹´¹ = 20' },
        5: { badge: 'Degree n = 5 · Quintic Threefold · χ = -200 · h²´¹ = 101' },
        6: { badge: 'Degree n = 6 · Hexagonal Orbifold (T⁶/ℤ₆) · χ = -168' },
        7: { badge: 'Degree n = 7 · Septic Moduli Cross-Section · χ = -588' },
        8: { badge: 'Degree n = 8 · Octic Vacuum Landscape · χ = -1152' }
    };

    // --- Minimal Matrix Utilities ---
    const Mat4 = {
        identity: function (out) {
            for (let i = 0; i < 16; i++) out[i] = (i % 5 === 0) ? 1.0 : 0.0;
            return out;
        },
        perspective: function (out, fovy, aspect, near, far) {
            const f = 1.0 / Math.tan(fovy / 2);
            const nf = 1.0 / (near - far);
            out[0] = f / aspect; out[1] = 0; out[2] = 0; out[3] = 0;
            out[4] = 0; out[5] = f; out[6] = 0; out[7] = 0;
            out[8] = 0; out[9] = 0; out[10] = (far + near) * nf; out[11] = -1;
            out[12] = 0; out[13] = 0; out[14] = (2 * far * near) * nf; out[15] = 0;
            return out;
        },
        lookAt: function (out, eye, center, up) {
            let x0, x1, x2, y0, y1, y2, z0, z1, z2, len;
            let eyex = eye[0], eyey = eye[1], eyez = eye[2];
            let upx = up[0], upy = up[1], upz = up[2];
            let centerx = center[0], centery = center[1], centerz = center[2];

            z0 = eyex - centerx; z1 = eyey - centery; z2 = eyez - centerz;
            len = 1 / Math.hypot(z0, z1, z2);
            z0 *= len; z1 *= len; z2 *= len;

            x0 = upy * z2 - upz * z1; x1 = upz * z0 - upx * z2; x2 = upx * z1 - upy * z0;
            len = Math.hypot(x0, x1, x2);
            if (!len) { x0 = 0; x1 = 0; x2 = 0; } else { len = 1 / len; x0 *= len; x1 *= len; x2 *= len; }

            y0 = z1 * x2 - z2 * x1; y1 = z2 * x0 - z0 * x2; y2 = z0 * x1 - z1 * x0;
            len = Math.hypot(y0, y1, y2);
            if (!len) { y0 = 0; y1 = 0; y2 = 0; } else { len = 1 / len; y0 *= len; y1 *= len; y2 *= len; }

            out[0] = x0; out[1] = y0; out[2] = z0; out[3] = 0;
            out[4] = x1; out[5] = y1; out[6] = z1; out[7] = 0;
            out[8] = x2; out[9] = y2; out[10] = z2; out[11] = 0;
            out[12] = -(x0 * eyex + x1 * eyey + x2 * eyez);
            out[13] = -(y0 * eyex + y1 * eyey + y2 * eyez);
            out[14] = -(z0 * eyex + z1 * eyey + z2 * eyez);
            out[15] = 1;
            return out;
        },
        multiply: function (out, a, b) {
            let a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
            let a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
            let a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
            let a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];

            let b0 = b[0], b1 = b[1], b2 = b[2], b3 = b[3];
            out[0] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
            out[1] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
            out[2] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
            out[3] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

            b0 = b[4]; b1 = b[5]; b2 = b[6]; b3 = b[7];
            out[4] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
            out[5] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
            out[6] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
            out[7] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

            b0 = b[8]; b1 = b[9]; b2 = b[10]; b3 = b[11];
            out[8] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
            out[9] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
            out[10] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
            out[11] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

            b0 = b[12]; b1 = b[13]; b2 = b[14]; b3 = b[15];
            out[12] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
            out[13] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
            out[14] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
            out[15] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
            return out;
        },
        rotateX: function (out, a, rad) {
            let s = Math.sin(rad), c = Math.cos(rad);
            let a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
            let a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
            if (a !== out) {
                out[0] = a[0]; out[1] = a[1]; out[2] = a[2]; out[3] = a[3];
                out[12] = a[12]; out[13] = a[13]; out[14] = a[14]; out[15] = a[15];
            }
            out[4] = a10 * c + a20 * s; out[5] = a11 * c + a21 * s;
            out[6] = a12 * c + a22 * s; out[7] = a13 * c + a23 * s;
            out[8] = a20 * c - a10 * s; out[9] = a21 * c - a11 * s;
            out[10] = a22 * c - a12 * s; out[11] = a23 * c - a13 * s;
            return out;
        },
        rotateY: function (out, a, rad) {
            let s = Math.sin(rad), c = Math.cos(rad);
            let a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
            let a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
            if (a !== out) {
                out[4] = a[4]; out[5] = a[5]; out[6] = a[6]; out[7] = a[7];
                out[12] = a[12]; out[13] = a[13]; out[14] = a[14]; out[15] = a[15];
            }
            out[0] = a00 * c - a20 * s; out[1] = a01 * c - a21 * s;
            out[2] = a02 * c - a22 * s; out[3] = a03 * c - a23 * s;
            out[8] = a00 * s + a20 * c; out[9] = a01 * s + a21 * c;
            out[10] = a02 * s + a22 * c; out[11] = a03 * s + a23 * c;
            return out;
        },
        rotateZ: function (out, a, rad) {
            let s = Math.sin(rad), c = Math.cos(rad);
            let a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
            let a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
            if (a !== out) {
                out[8] = a[8]; out[9] = a[9]; out[10] = a[10]; out[11] = a[11];
                out[12] = a[12]; out[13] = a[13]; out[14] = a[14]; out[15] = a[15];
            }
            out[0] = a00 * c + a10 * s; out[1] = a01 * c + a11 * s;
            out[2] = a02 * c + a12 * s; out[3] = a03 * c + a13 * s;
            out[4] = a10 * c - a00 * s; out[5] = a11 * c - a01 * s;
            out[6] = a12 * c - a02 * s; out[7] = a13 * c - a03 * s;
            return out;
        }
    };

    // --- Shaders ---
    const vsSource = `
        precision highp float;
        attribute vec2 a_coord;
        attribute vec2 a_sheet;

        uniform mat4 u_mvp;
        uniform mat4 u_model;
        uniform float u_n;
        uniform float u_alpha;
        uniform float u_scale;

        varying vec3 v_normal;
        varying vec3 v_worldPos;
        varying vec2 v_uv;
        varying vec2 v_sheet;

        float cosh_val(float val) {
            float e = exp(clamp(val, -10.0, 10.0));
            return 0.5 * (e + 1.0 / e);
        }

        float sinh_val(float val) {
            float e = exp(clamp(val, -10.0, 10.0));
            return 0.5 * (e - 1.0 / e);
        }

        vec3 evalCY(float x, float y, float k1, float k2, float n, float a) {
            float cy = cosh_val(y);
            float sy = sinh_val(y);

            float u1 = cos(x) * cy;
            float v1 = -sin(x) * sy;
            float r1 = sqrt(u1 * u1 + v1 * v1);
            float theta1 = atan(v1, u1);

            float u2 = sin(x) * cy;
            float v2 = cos(x) * sy;
            float r2 = sqrt(u2 * u2 + v2 * v2);
            float theta2 = atan(v2, u2);

            float p1 = pow(max(r1, 1e-5), 2.0 / n);
            float phi1 = (2.0 * theta1 + 6.28318530718 * k1) / n;
            float re_z1 = p1 * cos(phi1);
            float im_z1 = p1 * sin(phi1);

            float p2 = pow(max(r2, 1e-5), 2.0 / n);
            float phi2 = (2.0 * theta2 + 6.28318530718 * k2) / n;
            float re_z2 = p2 * cos(phi2);
            float im_z2 = p2 * sin(phi2);

            float X = re_z1;
            float Y = re_z2;
            float Z = im_z1 * cos(a) + im_z2 * sin(a);

            return vec3(X, Y, Z);
        }

        void main() {
            float x = a_coord.x;
            float y = a_coord.y;
            float k1 = a_sheet.x;
            float k2 = a_sheet.y;

            vec3 pos = evalCY(x, y, k1, k2, u_n, u_alpha);

            float eps = 0.015;
            float hx = (x + eps <= 1.5707963) ? eps : -eps;
            vec3 px = evalCY(x + hx, y, k1, k2, u_n, u_alpha);
            vec3 dX = (px - pos) / hx;

            float hy = (y + eps <= 1.15) ? eps : -eps;
            vec3 py = evalCY(x, y + hy, k1, k2, u_n, u_alpha);
            vec3 dY = (py - pos) / hy;

            vec3 localNorm = cross(dX, dY);
            float normLen = length(localNorm);
            vec3 N = (normLen > 1e-4) ? (localNorm / normLen) : vec3(0.0, 1.0, 0.0);

            vec4 worldPos = u_model * vec4(pos * u_scale, 1.0);
            v_worldPos = worldPos.xyz;
            v_normal = normalize(mat3(u_model[0].xyz, u_model[1].xyz, u_model[2].xyz) * N);
            v_uv = vec2(x / 1.57079632679, (y + 1.15) / 2.3);
            v_sheet = a_sheet;

            gl_Position = u_mvp * vec4(pos * u_scale, 1.0);
        }
    `;

    const fsSource = `
        precision highp float;

        varying vec3 v_normal;
        varying vec3 v_worldPos;
        varying vec2 v_uv;
        varying vec2 v_sheet;

        uniform vec3 u_baseColor;
        uniform vec3 u_glowColor;
        uniform vec3 u_gridColor;
        uniform vec3 u_camPos;
        uniform vec3 u_lightDir;
        uniform float u_n;
        uniform int u_mode; // 0: glass, 1: kahler, 2: solid

        void main() {
            vec3 N = normalize(v_normal);
            if (!gl_FrontFacing) {
                N = -N;
            }

            vec3 V = normalize(u_camPos - v_worldPos);
            vec3 L = normalize(u_lightDir);
            vec3 H = normalize(L + V);

            float NdotL = max(dot(N, L), 0.0);
            float diff = 0.35 + 0.65 * NdotL;

            float NdotH = max(dot(N, H), 0.0);
            float spec = pow(NdotH, 24.0) * 0.75;

            float NdotV = max(dot(N, V), 0.0);
            float fresnel = pow(1.0 - NdotV, 2.2);

            vec2 gridUV = fract(v_uv * 10.0);
            vec2 gridLines = smoothstep(0.43, 0.49, abs(gridUV - 0.5));
            float isGrid = max(gridLines.x, gridLines.y);

            float sheetPhase = (v_sheet.x + v_sheet.y) / (2.0 * u_n);
            vec3 sheetTint = 0.12 * sin(vec3(sheetPhase * 6.28, sheetPhase * 6.28 + 2.09, sheetPhase * 6.28 + 4.18));
            vec3 surfaceColor = u_baseColor + sheetTint;

            vec3 shaded = surfaceColor * diff + vec3(spec);
            vec3 finalColor = shaded;

            float alpha = 0.72;

            if (u_mode == 0) {
                // Glass mode
                finalColor = mix(shaded, u_gridColor, isGrid * 0.35);
                finalColor += u_glowColor * fresnel * 0.85;
                alpha = 0.68 + 0.3 * fresnel + 0.2 * isGrid;
            } else if (u_mode == 1) {
                // Kähler grid mode
                finalColor = mix(shaded * 0.4, u_gridColor * 1.3, isGrid);
                finalColor += u_glowColor * fresnel * 0.9;
                alpha = isGrid * 0.85 + fresnel * 0.45 + 0.25;
            } else {
                // Solid specular mode
                finalColor = mix(shaded, u_gridColor, isGrid * 0.2);
                finalColor += u_glowColor * fresnel * 0.5;
                alpha = 0.98;
            }

            float dist = length(u_camPos - v_worldPos);
            float fog = smoothstep(1.5, 8.0, dist);
            vec3 bgVoid = vec3(0.024, 0.032, 0.052);
            finalColor = mix(finalColor, bgVoid, fog * 0.65);

            gl_FragColor = vec4(finalColor, min(alpha, 0.98));
        }
    `;

    function createShader(gl, type, source) {
        const s = gl.createShader(type);
        gl.shaderSource(s, source);
        gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
            console.error(gl.getShaderInfoLog(s));
            gl.deleteShader(s);
            return null;
        }
        return s;
    }

    const vs = createShader(gl, gl.VERTEX_SHADER, vsSource);
    const fs = createShader(gl, gl.FRAGMENT_SHADER, fsSource);
    if (!vs || !fs) return;

    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        console.error(gl.getProgramInfoLog(prog));
        return;
    }

    // Mesh Buffers
    let coordBuffer = gl.createBuffer();
    let sheetBuffer = gl.createBuffer();
    let indexBuffer = gl.createBuffer();
    let totalIndices = 0;

    function buildMesh(n, density) {
        const numSheets = n * n;
        const vertsPerSheet = density * density;
        const totalVertices = numSheets * vertsPerSheet;

        const coordsArray = new Float32Array(totalVertices * 2);
        const sheetsArray = new Float32Array(totalVertices * 2);

        const piOver2 = Math.PI / 2.0;
        const yMin = -1.15;
        const yMax = 1.15;

        let vOffset = 0;
        for (let k1 = 0; k1 < n; k1++) {
            for (let k2 = 0; k2 < n; k2++) {
                for (let iy = 0; iy < density; iy++) {
                    const ty = iy / (density - 1);
                    const yVal = yMin + ty * (yMax - yMin);
                    for (let ix = 0; ix < density; ix++) {
                        const tx = ix / (density - 1);
                        const xVal = tx * piOver2;

                        const idx = vOffset * 2;
                        coordsArray[idx] = xVal;
                        coordsArray[idx + 1] = yVal;
                        sheetsArray[idx] = k1;
                        sheetsArray[idx + 1] = k2;
                        vOffset++;
                    }
                }
            }
        }

        const quadsPerSheet = (density - 1) * (density - 1);
        const indicesPerSheet = quadsPerSheet * 6;
        totalIndices = numSheets * indicesPerSheet;
        const indicesArray = new Uint16Array(totalIndices);

        let iOffset = 0;
        for (let s = 0; s < numSheets; s++) {
            const baseVert = s * vertsPerSheet;
            for (let iy = 0; iy < density - 1; iy++) {
                for (let ix = 0; ix < density - 1; ix++) {
                    const i0 = baseVert + iy * density + ix;
                    const i1 = i0 + 1;
                    const i2 = baseVert + (iy + 1) * density + ix;
                    const i3 = i2 + 1;

                    indicesArray[iOffset++] = i0;
                    indicesArray[iOffset++] = i2;
                    indicesArray[iOffset++] = i1;

                    indicesArray[iOffset++] = i1;
                    indicesArray[iOffset++] = i2;
                    indicesArray[iOffset++] = i3;
                }
            }
        }

        gl.bindBuffer(gl.ARRAY_BUFFER, coordBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, coordsArray, gl.STATIC_DRAW);

        gl.bindBuffer(gl.ARRAY_BUFFER, sheetBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, sheetsArray, gl.STATIC_DRAW);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indicesArray, gl.STATIC_DRAW);
    }

    buildMesh(state.n, state.density);

    // Uniform Locations
    const uMvpLoc = gl.getUniformLocation(prog, 'u_mvp');
    const uModelLoc = gl.getUniformLocation(prog, 'u_model');
    const uNLoc = gl.getUniformLocation(prog, 'u_n');
    const uAlphaLoc = gl.getUniformLocation(prog, 'u_alpha');
    const uScaleLoc = gl.getUniformLocation(prog, 'u_scale');
    const uBaseColorLoc = gl.getUniformLocation(prog, 'u_baseColor');
    const uGlowColorLoc = gl.getUniformLocation(prog, 'u_glowColor');
    const uGridColorLoc = gl.getUniformLocation(prog, 'u_gridColor');
    const uCamPosLoc = gl.getUniformLocation(prog, 'u_camPos');
    const uLightDirLoc = gl.getUniformLocation(prog, 'u_lightDir');
    const uModeLoc = gl.getUniformLocation(prog, 'u_mode');

    const aCoordLoc = gl.getAttribLocation(prog, 'a_coord');
    const aSheetLoc = gl.getAttribLocation(prog, 'a_sheet');

    // --- Orbit Controls ---
    let isMouseDown = false;
    let lastMouseX = 0, lastMouseY = 0;

    viewport.addEventListener('mousedown', (e) => {
        isMouseDown = true;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
    });

    window.addEventListener('mousemove', (e) => {
        if (!isMouseDown) return;
        const dx = e.clientX - lastMouseX;
        const dy = e.clientY - lastMouseY;
        state.targetRotY += dx * 0.008;
        state.targetRotX += dy * 0.008;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
    });

    window.addEventListener('mouseup', () => { isMouseDown = false; });

    // Touch Support
    let lastTouchDist = 0;
    viewport.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) {
            isMouseDown = true;
            lastMouseX = e.touches[0].clientX;
            lastMouseY = e.touches[0].clientY;
        } else if (e.touches.length === 2) {
            lastTouchDist = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
        }
    }, { passive: true });

    window.addEventListener('touchmove', (e) => {
        if (e.touches.length === 1 && isMouseDown) {
            const dx = e.touches[0].clientX - lastMouseX;
            const dy = e.touches[0].clientY - lastMouseY;
            state.targetRotY += dx * 0.01;
            state.targetRotX += dy * 0.01;
            lastMouseX = e.touches[0].clientX;
            lastMouseY = e.touches[0].clientY;
        } else if (e.touches.length === 2) {
            const dist = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
            const delta = lastTouchDist - dist;
            state.targetCamDist = Math.max(1.5, Math.min(6.5, state.targetCamDist + delta * 0.01));
            lastTouchDist = dist;
            updateZoomUI();
        }
    }, { passive: true });

    window.addEventListener('touchend', () => { isMouseDown = false; });

    viewport.addEventListener('wheel', (e) => {
        e.preventDefault();
        const delta = Math.sign(e.deltaY) * 0.25;
        state.targetCamDist = Math.max(1.5, Math.min(6.5, state.targetCamDist + delta));
        updateZoomUI();
    }, { passive: false });

    function updateZoomUI() {
        const zoomSlider = document.getElementById('zoomSlider');
        const zoomVal = document.getElementById('zoomVal');
        if (zoomSlider) zoomSlider.value = state.targetCamDist.toFixed(1);
        if (zoomVal) zoomVal.textContent = state.targetCamDist.toFixed(1);
    }

    // --- UI Controls Binding ---
    const manifoldSelect = document.getElementById('manifoldSelect');
    const activeBadge = document.getElementById('activeManifoldBadge');
    if (manifoldSelect) {
        manifoldSelect.addEventListener('change', () => {
            state.n = parseInt(manifoldSelect.value, 10);
            buildMesh(state.n, state.density);
            if (activeBadge && MANIFOLD_TOPOLOGY[state.n]) {
                activeBadge.textContent = MANIFOLD_TOPOLOGY[state.n].badge;
            }
            // Notify Argand diagram
            window.dispatchEvent(new CustomEvent('manifoldChange', { detail: { n: state.n } }));
        });
    }

    const zoomSlider = document.getElementById('zoomSlider');
    const zoomVal = document.getElementById('zoomVal');
    if (zoomSlider) {
        zoomSlider.addEventListener('input', (e) => {
            state.targetCamDist = parseFloat(e.target.value);
            if (zoomVal) zoomVal.textContent = state.targetCamDist.toFixed(1);
        });
    }

    const orbitSpeedSlider = document.getElementById('orbitSpeedSlider');
    const orbitSpeedVal = document.getElementById('orbitSpeedVal');
    if (orbitSpeedSlider) {
        orbitSpeedSlider.addEventListener('input', (e) => {
            state.rotSpeed = parseFloat(e.target.value) * 0.2;
            if (orbitSpeedVal) orbitSpeedVal.textContent = parseFloat(e.target.value).toFixed(1) + 'x';
        });
    }

    const alphaSpeedSlider = document.getElementById('alphaSpeedSlider');
    const alphaSpeedVal = document.getElementById('alphaSpeedVal');
    if (alphaSpeedSlider) {
        alphaSpeedSlider.addEventListener('input', (e) => {
            state.alphaSpeed = parseFloat(e.target.value) * 0.15;
            if (alphaSpeedVal) alphaSpeedVal.textContent = parseFloat(e.target.value).toFixed(1) + 'x';
        });
    }

    const colorThemeSelect = document.getElementById('colorThemeSelect');
    if (colorThemeSelect) {
        colorThemeSelect.addEventListener('change', (e) => {
            state.theme = e.target.value;
        });
    }

    const renderModeSelect = document.getElementById('renderModeSelect');
    if (renderModeSelect) {
        renderModeSelect.addEventListener('change', (e) => {
            state.renderMode = e.target.value;
        });
    }

    const densitySlider = document.getElementById('densitySlider');
    const densityVal = document.getElementById('densityVal');
    if (densitySlider) {
        densitySlider.addEventListener('input', (e) => {
            state.density = parseInt(e.target.value, 10);
            if (densityVal) densityVal.textContent = `Grid (${state.density})`;
            buildMesh(state.n, state.density);
        });
    }

    const resetViewBtn = document.getElementById('resetViewBtn');
    if (resetViewBtn) {
        resetViewBtn.addEventListener('click', () => {
            state.targetRotX = 0.35;
            state.targetRotY = 0.45;
            state.targetCamDist = 3.2;
            updateZoomUI();
        });
    }

    const pauseAlphaBtn = document.getElementById('pauseAlphaBtn');
    if (pauseAlphaBtn) {
        pauseAlphaBtn.addEventListener('click', () => {
            state.isAlphaPaused = !state.isAlphaPaused;
            pauseAlphaBtn.innerHTML = state.isAlphaPaused ? '<span>▶</span> Resume 4D' : '<span>⏸</span> Pause 4D';
            pauseAlphaBtn.classList.toggle('btn-active', state.isAlphaPaused);
        });
    }

    // --- Resize Canvas ---
    function resizeCanvas() {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const w = viewport.clientWidth;
        const h = viewport.clientHeight;
        canvas.width = Math.floor(w * dpr);
        canvas.height = Math.floor(h * dpr);
        canvas.style.width = w + 'px';
        canvas.style.height = h + 'px';
        gl.viewport(0, 0, canvas.width, canvas.height);
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Scroll Down Button
    const scrollArrow = document.getElementById('scrollArrow');
    if (scrollArrow) {
        scrollArrow.addEventListener('click', () => {
            const target = document.getElementById('controlSection');
            if (target) {
                target.scrollIntoView({ behavior: 'smooth' });
            }
        });
    }

    // --- Matrices ---
    const projMat = new Float32Array(16);
    const viewMat = new Float32Array(16);
    const modelMat = new Float32Array(16);
    const vpMat = new Float32Array(16);
    const mvpMat = new Float32Array(16);

    let alphaTime = 0;
    let lastTime = performance.now();

    // --- Main Render Loop ---
    function render(now) {
        const dt = (now - lastTime) * 0.001;
        lastTime = now;

        if (!state.isAlphaPaused) {
            alphaTime += dt * state.alphaSpeed;
        }

        // Auto Orbit & Drag Interpolation
        state.targetRotY += state.rotSpeed * dt;
        state.rotX += (state.targetRotX - state.rotX) * 0.1;
        state.rotY += (state.targetRotY - state.rotY) * 0.1;
        state.camDist += (state.targetCamDist - state.camDist) * 0.1;

        gl.clearColor(0.024, 0.032, 0.052, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LEQUAL);

        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.disable(gl.CULL_FACE);

        const aspect = canvas.width / canvas.height;
        Mat4.perspective(projMat, Math.PI / 4, aspect, 0.1, 50.0);

        const camPos = [0.0, 0.0, state.camDist];
        Mat4.lookAt(viewMat, camPos, [0.0, 0.0, 0.0], [0.0, 1.0, 0.0]);
        Mat4.multiply(vpMat, projMat, viewMat);

        Mat4.identity(modelMat);
        Mat4.rotateX(modelMat, modelMat, state.rotX);
        Mat4.rotateY(modelMat, modelMat, state.rotY);
        Mat4.multiply(mvpMat, vpMat, modelMat);

        gl.useProgram(prog);

        const currentTheme = THEMES[state.theme] || THEMES.gold;
        const modeInt = state.renderMode === 'kahler' ? 1 : (state.renderMode === 'solid' ? 2 : 0);

        gl.uniformMatrix4fv(uMvpLoc, false, mvpMat);
        gl.uniformMatrix4fv(uModelLoc, false, modelMat);
        gl.uniform1f(uNLoc, state.n);
        gl.uniform1f(uAlphaLoc, alphaTime);
        gl.uniform1f(uScaleLoc, state.scale);
        gl.uniform3fv(uBaseColorLoc, currentTheme.baseColor);
        gl.uniform3fv(uGlowColorLoc, currentTheme.glowColor);
        gl.uniform3fv(uGridColorLoc, currentTheme.gridColor);
        gl.uniform3fv(uCamPosLoc, camPos);
        gl.uniform3f(uLightDirLoc, 1.0, 1.2, 1.5);
        gl.uniform1i(uModeLoc, modeInt);

        gl.bindBuffer(gl.ARRAY_BUFFER, coordBuffer);
        gl.enableVertexAttribArray(aCoordLoc);
        gl.vertexAttribPointer(aCoordLoc, 2, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, sheetBuffer);
        gl.enableVertexAttribArray(aSheetLoc);
        gl.vertexAttribPointer(aSheetLoc, 2, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
        gl.drawElements(gl.TRIANGLES, totalIndices, gl.UNSIGNED_SHORT, 0);

        gl.disableVertexAttribArray(aCoordLoc);
        gl.disableVertexAttribArray(aSheetLoc);

        requestAnimationFrame(render);
    }

    requestAnimationFrame(render);
}

/* =========================================================================
   2. 2D COMPLEX ROOT & ARGAND PLANE PLAYGROUND
   ========================================================================= */

function initArgandExplorer() {
    const canvas = document.getElementById('gameCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let n = 5;
    let alpha = 0.785;
    let isLocked = false;
    let themeIndex = 0;

    const PALETTES = [
        { accent: '#f3d9a2', secondary: '#dfa648', bgGlow: 'rgba(243, 217, 162, 0.15)' },
        { accent: '#5eb3f6', secondary: '#2471d8', bgGlow: 'rgba(94, 179, 246, 0.15)' },
        { accent: '#f47094', secondary: '#d62458', bgGlow: 'rgba(244, 112, 148, 0.15)' },
        { accent: '#56e8b8', secondary: '#199d75', bgGlow: 'rgba(86, 232, 184, 0.15)' },
        { accent: '#ba77f8', secondary: '#7525d8', bgGlow: 'rgba(186, 119, 248, 0.15)' }
    ];

    const hudDegree = document.getElementById('argandDegree');
    const hudSheets = document.getElementById('argandSheets');
    const hudAlpha = document.getElementById('argandAlpha');
    const lockBtn = document.getElementById('lockArgandBtn');
    const cycleBtn = document.getElementById('cyclePaletteBtn');

    // Listen for degree updates from 3D visualizer
    window.addEventListener('manifoldChange', (e) => {
        if (e.detail && e.detail.n) {
            n = e.detail.n;
            updateHUD();
            draw();
        }
    });

    function updateHUD() {
        if (hudDegree) hudDegree.textContent = n;
        if (hudSheets) hudSheets.textContent = n * n;
        if (hudAlpha) hudAlpha.textContent = alpha.toFixed(2) + ' rad';
    }

    canvas.addEventListener('mousemove', (e) => {
        if (isLocked) return;
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left - canvas.width / 2;
        const my = e.clientY - rect.top - canvas.height / 2;
        alpha = Math.atan2(my, mx) + Math.PI;
        updateHUD();
        draw();
    });

    canvas.addEventListener('click', () => {
        isLocked = !isLocked;
        if (lockBtn) {
            lockBtn.innerHTML = isLocked ? '<span>🔓</span> Unlock Phase' : '<span>🔒</span> Lock Phase Angle';
            lockBtn.classList.toggle('btn-active', isLocked);
        }
    });

    if (lockBtn) {
        lockBtn.addEventListener('click', () => {
            isLocked = !isLocked;
            lockBtn.innerHTML = isLocked ? '<span>🔓</span> Unlock Phase' : '<span>🔒</span> Lock Phase Angle';
            lockBtn.classList.toggle('btn-active', isLocked);
        });
    }

    if (cycleBtn) {
        cycleBtn.addEventListener('click', () => {
            themeIndex = (themeIndex + 1) % PALETTES.length;
            draw();
        });
    }

    function draw() {
        const w = canvas.width;
        const h = canvas.height;
        const cx = w / 2;
        const cy = h / 2;
        const R = 135;
        const pal = PALETTES[themeIndex];

        // Background void
        ctx.fillStyle = '#04070e';
        ctx.fillRect(0, 0, w, h);

        // Ambient radial glow
        const radGrad = ctx.createRadialGradient(cx, cy, 10, cx, cy, R + 40);
        radGrad.addColorStop(0, pal.bgGlow);
        radGrad.addColorStop(1, 'rgba(4, 7, 14, 0)');
        ctx.fillStyle = radGrad;
        ctx.fillRect(0, 0, w, h);

        // Coordinate axes
        ctx.strokeStyle = 'rgba(169, 132, 77, 0.25)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(20, cy); ctx.lineTo(w - 20, cy);
        ctx.moveTo(cx, 20); ctx.lineTo(cx, h - 20);
        ctx.stroke();
        ctx.setLineDash([]);

        // Unit circle |z| = 1
        ctx.strokeStyle = 'rgba(169, 132, 77, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(cx, cy, R, 0, Math.PI * 2);
        ctx.stroke();

        // Secondary modulated circle for z2
        const r2 = R * Math.abs(Math.cos(alpha * 0.5));
        ctx.strokeStyle = 'rgba(169, 132, 77, 0.2)';
        ctx.beginPath();
        ctx.arc(cx, cy, r2, 0, Math.PI * 2);
        ctx.stroke();

        // Calculate roots: exp(i * 2*pi*k / n)
        const roots = [];
        for (let k = 0; k < n; k++) {
            const angle = (2 * Math.PI * k) / n;
            roots.push({
                x: cx + R * Math.cos(angle),
                y: cy + R * Math.sin(angle),
                angle: angle,
                k: k
            });
        }

        // Draw connecting 4D projection geodesics between roots
        for (let i = 0; i < n; i++) {
            for (let j = i + 1; j < n; j++) {
                const phaseDiff = (i - j) / n;
                const weight = Math.abs(Math.sin(alpha + phaseDiff * Math.PI));
                ctx.strokeStyle = pal.secondary;
                ctx.globalAlpha = 0.15 + 0.35 * weight;
                ctx.lineWidth = 1 + weight;
                ctx.beginPath();
                // Bézier curved path passing through complex center
                const midX = (roots[i].x + roots[j].x) / 2 + (cx - (roots[i].x + roots[j].x) / 2) * Math.cos(alpha);
                const midY = (roots[i].y + roots[j].y) / 2 + (cy - (roots[i].y + roots[j].y) / 2) * Math.sin(alpha);
                ctx.quadraticCurveTo(midX, midY, roots[j].x, roots[j].y);
                ctx.moveTo(roots[i].x, roots[i].y);
                ctx.quadraticCurveTo(midX, midY, roots[j].x, roots[j].y);
                ctx.stroke();
            }
        }
        ctx.globalAlpha = 1.0;

        // Draw Root Nodes
        roots.forEach((rt) => {
            // Glow
            ctx.fillStyle = pal.bgGlow;
            ctx.beginPath();
            ctx.arc(rt.x, rt.y, 10, 0, Math.PI * 2);
            ctx.fill();

            // Core node
            ctx.fillStyle = pal.accent;
            ctx.beginPath();
            ctx.arc(rt.x, rt.y, 4.5, 0, Math.PI * 2);
            ctx.fill();

            // Label
            ctx.font = '11px Outfit, sans-serif';
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const lx = cx + (R + 18) * Math.cos(rt.angle);
            const ly = cy + (R + 18) * Math.sin(rt.angle);
            ctx.fillText(`k=${rt.k}`, lx, ly);
        });

        // Phase Indicator line
        ctx.strokeStyle = pal.accent;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + R * Math.cos(alpha), cy + R * Math.sin(alpha));
        ctx.stroke();

        ctx.fillStyle = pal.accent;
        ctx.beginPath();
        ctx.arc(cx + R * Math.cos(alpha), cy + R * Math.sin(alpha), 3, 0, Math.PI * 2);
        ctx.fill();
    }

    updateHUD();
    draw();
}

/* =========================================================================
   3. COLLAPSIBLE PANEL CONTROLLER
   ========================================================================= */

function initCollapsiblePanel() {
    const collapseBtn = document.getElementById('collapseBtn');
    const panelHeader = document.getElementById('panelHeader');
    const panelBody = document.getElementById('panelBody');
    const collapseChevron = document.getElementById('collapseChevron');
    if (!collapseBtn || !panelBody) return;

    function toggle() {
        const isCollapsed = panelBody.classList.contains('collapsed');
        panelBody.classList.toggle('collapsed', !isCollapsed);
        if (collapseChevron) {
            collapseChevron.classList.toggle('collapsed', !isCollapsed);
        }
        collapseBtn.setAttribute('aria-expanded', String(isCollapsed));
    }

    collapseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggle();
    });

    if (panelHeader) {
        panelHeader.addEventListener('click', toggle);
    }
}
