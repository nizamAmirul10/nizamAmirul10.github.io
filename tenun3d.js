/* ============================================================
   TENUN 3D — the phones
   ------------------------------------------------------------
   Five phones, one WebGL context. The scene is drawn into a
   single offscreen buffer and copied out to each canvas, so the
   hero and the four project previews cost one context between
   them rather than five.

   The hero is woven. Gold weft flies across the loom row by row
   and lays down the songket back of a phone, a shuttle of light
   crossing ahead of each pick. When the cloth is finished the
   gold chassis closes around it, the whole thing turns over, and
   the screen comes up carrying the app. Cloth becomes device.

   Each project preview is calmer and deliberately different: the
   phone rises already facing you, its screen is laid in by a
   single gold pick, and one thread keeps winding around it.

   Local files: drawing an image off the filesystem taints a
   canvas, and a tainted canvas cannot become a WebGL texture.
   Every screenshot is probed first, and a phone that cannot have
   the real thing draws its own interface instead, so nothing is
   ever blank.
   ============================================================ */
(function tenun3d() {
    const nodes = Array.prototype.slice.call(document.querySelectorAll('[data-phone]'));
    if (!nodes.length || !window.THREE) return;
    const THREE = window.THREE;

    let gl;
    try {
        const probe = document.createElement('canvas');
        gl = probe.getContext('webgl2') || probe.getContext('webgl');
    } catch (e) { gl = null; }
    if (!gl) return;

    const tile = window.__tenunTile;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const canHover = window.matchMedia('(hover: hover)').matches;
    const PR = Math.min(window.devicePixelRatio || 1, 2);

    /* --- the shared renderer ------------------------------------ */
    const buffer = document.createElement('canvas');
    const renderer = new THREE.WebGLRenderer({
        canvas: buffer, antialias: true, alpha: true,
        preserveDrawingBuffer: true        // required: every frame is copied out
    });
    renderer.setPixelRatio(PR);
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.setClearColor(0x000000, 0);
    let bufW = 0, bufH = 0;

    /* --- the apps ------------------------------------------------ */
    const SHOTS = {
        skala: [
            { src: 'assets/skala 2.0/s1.png', label: 'Log masuk' },
            { src: 'assets/skala 2.0/s2.png', label: 'Laman utama' }
        ],
        myibjkm: [
            { src: 'assets/myibjkm/ib1.png', label: 'Log masuk' },
            { src: 'assets/myibjkm/ib2.png', label: 'Dashboard' }
        ],
        fertilemate: [
            { src: 'assets/fertilemate/f1.png', label: 'Cycle tracker' }
        ],
        mushroommate: [
            { src: 'assets/mushroommate/splash.jpg', label: 'Classifier' },
            { src: 'assets/mushroommate/landing.jpg', label: 'Splash' }
        ]
    };

    // the hero runs through all four, naming each as it arrives
    const META = {
        skala: ['SKALA 2.0', '2026 · Flutter · BLoC · Laravel API'],
        myibjkm: ['MyIBJKM', '2025 · Java · SwiftUI · PHP'],
        fertilemate: ['Fertilemate', '2024 · Flutter · AI health'],
        mushroommate: ['MushroomMate', '2023 · Flutter · CNN · 2× gold']
    };
    SHOTS.all = [];
    ['skala', 'myibjkm', 'fertilemate', 'mushroommate'].forEach(function (k) {
        SHOTS[k].forEach(function (shot) {
            SHOTS.all.push({ src: shot.src, label: shot.label, app: META[k][0], meta: META[k][1] });
        });
    });

    const loaded = Object.create(null);
    const waiting = [];
    let pending = 0;

    function untainted(img) {
        try {
            const t = document.createElement('canvas');
            t.width = t.height = 2;
            const g = t.getContext('2d');
            g.drawImage(img, 0, 0, 2, 2);
            g.getImageData(0, 0, 1, 1);
            return true;
        } catch (e) { return false; }
    }

    (function loadAll() {
        const srcs = [];
        for (const k in SHOTS) SHOTS[k].forEach(function (s) { srcs.push(s.src); });
        pending = srcs.length;
        srcs.forEach(function (src) {
            const img = new Image();
            img.onload = function () { loaded[src] = untainted(img) ? img : false; done(); };
            img.onerror = function () { loaded[src] = false; done(); };
            img.src = src;
        });
        function done() {
            if (--pending > 0) return;
            waiting.forEach(function (fn) { fn(); });
            waiting.length = 0;
        }
    })();

    /* --- shared shapes ------------------------------------------- */
    const SW = 440, SH = 950;

    function roundedRect(w, h, r) {
        const s = new THREE.Shape();
        const x = -w / 2, y = -h / 2;
        s.moveTo(x + r, y);
        s.lineTo(x + w - r, y);
        s.quadraticCurveTo(x + w, y, x + w, y + r);
        s.lineTo(x + w, y + h - r);
        s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        s.lineTo(x + r, y + h);
        s.quadraticCurveTo(x, y + h, x, y + h - r);
        s.lineTo(x, y + r);
        s.quadraticCurveTo(x, y, x + r, y);
        return s;
    }

    function planeUv(geo, w, h) {
        const uv = geo.attributes.uv;
        for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / w + 0.5, uv.getY(i) / h + 0.5);
        uv.needsUpdate = true;
    }

    const glowTex = (function () {
        const c = document.createElement('canvas');
        c.width = c.height = 64;
        const g = c.getContext('2d');
        const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
        grad.addColorStop(0, 'rgba(255,255,255,1)');
        grad.addColorStop(0.32, 'rgba(255,255,255,.5)');
        grad.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = grad;
        g.fillRect(0, 0, 64, 64);
        return new THREE.CanvasTexture(c);
    })();

    // the songket back, painted once from the same motif the page is woven from
    function clothTexture() {
        const T = tile ? tile.T : 24;
        const C = 14;
        const c = document.createElement('canvas');
        c.width = c.height = T * C;
        const g = c.getContext('2d');
        g.fillStyle = '#0b2419';
        g.fillRect(0, 0, c.width, c.height);
        g.strokeStyle = 'rgba(242,236,222,0.07)';
        g.lineWidth = 1;
        g.beginPath();
        for (let i = 0; i <= T; i++) {
            g.moveTo(i * C + 0.5, 0); g.lineTo(i * C + 0.5, c.height);
            g.moveTo(0, i * C + 0.5); g.lineTo(c.width, i * C + 0.5);
        }
        g.stroke();
        if (tile) {
            for (const cell of tile.cells) {
                const x = cell.i * C, y = cell.j * C;
                const grad = g.createLinearGradient(x, y, x + C, y + C);
                grad.addColorStop(0, cell.w === 2 ? '#f6dc8a' : '#e2c06a');
                grad.addColorStop(1, cell.w === 2 ? '#d8b45a' : '#b8963f');
                g.fillStyle = grad;
                g.fillRect(x + 1, y + 1.5, C - 2, C - 3);
                g.fillStyle = 'rgba(255,255,255,0.18)';
                g.fillRect(x + 1, y + 1.5, C - 2, 1.5);
            }
        }
        const tex = new THREE.CanvasTexture(c);
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.encoding = THREE.sRGBEncoding;
        tex.anisotropy = 4;
        return tex;
    }

    /* --- one phone ------------------------------------------------ */
    function Stage(el) {
        const canvas = el.querySelector('canvas');
        if (!canvas) return null;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;
        const box = canvas.parentElement || el;

        const key = el.getAttribute('data-phone');
        const hero = el.hasAttribute('data-phone-hero');
        const tint = new THREE.Color(el.getAttribute('data-tint') || '#d8b45a');
        const shots = SHOTS[key] || SHOTS.skala;
        const appOut = el.querySelector('[data-phone-app]');
        const metaOut = el.querySelector('[data-phone-meta]');
        const rowOut = el.querySelector('[data-phone-row]');

        /* the screen is a 2D canvas the phone displays */
        const sc = document.createElement('canvas');
        sc.width = SW;
        sc.height = SH;
        const sg = sc.getContext('2d');
        const screenTex = new THREE.CanvasTexture(sc);
        screenTex.encoding = THREE.sRGBEncoding;
        screenTex.anisotropy = 4;

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(hero ? 27 : 25, 1, 1.2, 16);

        scene.add(new THREE.AmbientLight(0xf2ecde, 0.46));
        const key1 = new THREE.DirectionalLight(0xfff4d6, 0.8);
        key1.position.set(-2, 3, 4);
        scene.add(key1);
        const rim = new THREE.DirectionalLight(0x8fd0a8, 0.34);
        rim.position.set(3, -1, -3);
        scene.add(rim);
        const lamp = new THREE.PointLight(0xf0d27a, 0.55, 9, 1.6);
        lamp.position.set(0, 0.8, 3);
        scene.add(lamp);

        const phone = new THREE.Group();
        scene.add(phone);

        const PW = 1.0, PH = 2.06, D = 0.085, R = 0.19;

        /* --- chassis, back and screen ---------------------------- */
        const chassisGeo = new THREE.ExtrudeGeometry(roundedRect(PW, PH, R), {
            depth: D, bevelEnabled: true, bevelThickness: 0.016,
            bevelSize: 0.016, bevelSegments: 4, curveSegments: 14
        });
        chassisGeo.translate(0, 0, -D / 2);
        const chassisMat = new THREE.MeshPhongMaterial({
            color: 0xb2903c, specular: 0xffe9a8, shininess: 110, transparent: true, opacity: 1
        });
        const chassis = new THREE.Mesh(chassisGeo, chassisMat);
        phone.add(chassis);

        const backMat = new THREE.MeshPhongMaterial({
            map: clothTexture(), specular: 0xd8b45a, shininess: 34,
            side: THREE.DoubleSide, transparent: true, opacity: 1
        });
        backMat.map.repeat.set(2, 2);
        const back = new THREE.Mesh(
            new THREE.ShapeGeometry(roundedRect(PW - 0.05, PH - 0.05, R - 0.02), 14), backMat);
        back.position.z = -D / 2 - 0.016;
        back.rotation.y = Math.PI;
        phone.add(back);

        const screenGeo = new THREE.ShapeGeometry(roundedRect(PW - 0.075, PH - 0.075, R - 0.03), 14);
        planeUv(screenGeo, PW - 0.075, PH - 0.075);
        const screen = new THREE.Mesh(screenGeo, new THREE.MeshBasicMaterial({ map: screenTex }));
        screen.position.z = D / 2 + 0.02;
        phone.add(screen);

        const glass = new THREE.Mesh(screenGeo, new THREE.MeshPhongMaterial({
            color: 0xffffff, transparent: true, opacity: 0.06,
            specular: 0xffffff, shininess: 170
        }));
        glass.position.z = D / 2 + 0.023;
        phone.add(glass);

        const screenLight = new THREE.PointLight(0xf0d27a, 0.3, 2.6, 2);
        screenLight.position.z = 0.7;
        phone.add(screenLight);

        for (const k of [{ y: 0.52, h: 0.16, x: -1 }, { y: 0.27, h: 0.16, x: -1 }, { y: 0.44, h: 0.26, x: 1 }]) {
            const b = new THREE.Mesh(new THREE.BoxGeometry(0.018, k.h, 0.032), chassisMat);
            b.position.set(k.x * (PW / 2 + 0.014), k.y, 0);
            phone.add(b);
        }

        /* --- the thread that winds around it ---------------------- */
        const pts = [];
        for (let i = 0; i <= 150; i++) {
            const t = i / 150;
            const a = t * Math.PI * 5;
            const r = 0.9 + 0.2 * Math.sin(t * Math.PI * 3);
            pts.push(new THREE.Vector3(Math.cos(a) * r, -1.45 + 2.9 * t, Math.sin(a) * r * 0.66));
        }
        const curve = new THREE.CatmullRomCurve3(pts);
        const threadGroup = new THREE.Group();
        const thread = new THREE.Mesh(
            new THREE.TubeGeometry(curve, 380, 0.0105, 7, false),
            new THREE.MeshPhongMaterial({
                color: 0xd8b45a, emissive: 0x2e2408, specular: 0xfff1c4,
                shininess: 90, transparent: true, opacity: 1
            })
        );
        threadGroup.add(thread);
        const bead = new THREE.Sprite(new THREE.SpriteMaterial({
            map: glowTex, color: 0xf0d27a, transparent: true,
            blending: THREE.AdditiveBlending, depthWrite: false
        }));
        bead.scale.set(0.3, 0.3, 1);
        threadGroup.add(bead);
        const beadLight = new THREE.PointLight(0xf0d27a, 1.0, 2.0, 2);
        threadGroup.add(beadLight);
        scene.add(threadGroup);

        /* --- the pad it stands on --------------------------------- */
        const padTex = (function () {
            const c = document.createElement('canvas');
            c.width = c.height = 128;
            const g = c.getContext('2d');
            const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
            grad.addColorStop(0, 'rgba(255,255,255,0.5)');
            grad.addColorStop(0.5, 'rgba(255,255,255,0.12)');
            grad.addColorStop(1, 'rgba(255,255,255,0)');
            g.fillStyle = grad;
            g.fillRect(0, 0, 128, 128);
            return new THREE.CanvasTexture(c);
        })();
        const pad = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 3.2),
            new THREE.MeshBasicMaterial({ map: padTex, color: tint, transparent: true, depthWrite: false, opacity: 0.5 }));
        pad.rotation.x = -Math.PI / 2;
        pad.position.y = -PH / 2 - 0.2;
        scene.add(pad);

        /* --- the hero's loom: cells that fly in row by row --------- */
        let weave = null;
        if (hero) {
            const COLS = 24;
            const CELL = PW / COLS;
            const ROWS = Math.round(PH / CELL);
            const inside = (x, y) => {
                const ax = Math.abs(x) - (PW / 2 - R), ay = Math.abs(y) - (PH / 2 - R);
                if (ax <= 0 || ay <= 0) return Math.abs(x) <= PW / 2 && Math.abs(y) <= PH / 2;
                return ax * ax + ay * ay <= R * R;
            };
            const T = tile ? tile.T : 24;
            const weight = new Uint8Array(T * T);
            if (tile) for (const c of tile.cells) weight[c.j * T + c.i] = c.w;

            const cells = [];
            for (let j = ROWS - 1; j >= 0; j--) {
                const y = PH / 2 - (j + 0.5) * CELL;
                for (let i = 0; i < COLS; i++) {
                    const x = -PW / 2 + (i + 0.5) * CELL;
                    if (!inside(x, y)) continue;
                    const w = weight[(((ROWS - 1 - j) % T) + T) % T * T + (i % T)];
                    cells.push({ x: x, y: y, row: ROWS - 1 - j, w: w });
                }
            }
            /* The renderer writes sRGB, but three r128 does not linearise a
               colour set straight from a hex literal. Left alone, the dark
               ground came out mint and the gold came out cream. Converting
               each colour first makes the cloth read as songket: dark cloth
               with gold lying on top of it. */
            const srgb = (hex) => new THREE.Color(hex).convertSRGBToLinear();
            const groundMat = new THREE.MeshPhongMaterial({
                color: srgb(0x0b2419), specular: srgb(0x16452f), shininess: 8,
                emissive: srgb(0x030f0a)
            });
            const goldMat = new THREE.MeshPhongMaterial({
                color: srgb(0xd8b45a), specular: srgb(0xfff1c4), shininess: 60,
                emissive: srgb(0x1a1408)
            });
            const ground = new THREE.InstancedMesh(
                new THREE.BoxGeometry(CELL * 0.94, CELL * 0.94, 0.02), groundMat, cells.length);
            const goldC = new THREE.InstancedMesh(
                new THREE.BoxGeometry(CELL * 0.96, CELL * 0.96, 0.03), goldMat, cells.length);
            ground.frustumCulled = goldC.frustumCulled = false;
            phone.add(ground, goldC);

            // the shuttle: a bar of light that runs ahead of each pick
            const shuttle = new THREE.Mesh(
                new THREE.PlaneGeometry(PW * 1.5, CELL * 1.6),
                new THREE.MeshBasicMaterial({
                    color: 0xc6e24a, transparent: true, opacity: 0.9,
                    blending: THREE.AdditiveBlending, depthWrite: false
                })
            );
            phone.add(shuttle);
            const shuttleLight = new THREE.PointLight(0xc6e24a, 1.4, 2.2, 1.8);
            phone.add(shuttleLight);

            weave = { cells, CELL, ROWS, COLS, ground, gold: goldC, shuttle, shuttleLight };
        }

        /* --- what the screen shows -------------------------------- */
        let slides = null;
        let cur = 0, hold = 0, fade = 0, announced = -1;
        const HOLD = hero ? 3.4 : 4.2, FADE = 0.8;

        function ready() {
            slides = shots.map(function (s) {
                return { img: loaded[s.src] || null, label: s.label, app: s.app, meta: s.meta };
            });
        }
        if (pending === 0) ready(); else waiting.push(ready);

        function cover(img) {
            const r = Math.max(SW / img.naturalWidth, SH / img.naturalHeight);
            const w = img.naturalWidth * r, h = img.naturalHeight * r;
            sg.drawImage(img, (SW - w) / 2, (SH - h) / 2, w, h);
        }

        const hex = '#' + tint.getHexString();
        function synthetic(t) {
            sg.fillStyle = '#0b2419';
            sg.fillRect(0, 0, SW, SH);
            sg.fillStyle = 'rgba(216,180,90,0.08)';
            for (let y = 110; y < SH; y += 26) sg.fillRect(0, y, SW, 1);
            sg.fillStyle = '#f2ecde';
            sg.font = '500 19px "JetBrains Mono", monospace';
            sg.fillText('9:41', 30, 60);
            sg.fillStyle = hex;
            sg.fillRect(30, 104, 168, 11);
            sg.fillStyle = 'rgba(242,236,222,0.24)';
            sg.fillRect(30, 134, 250, 8);
            for (let i = 0; i < 5; i++) {
                const y = 194 + i * 132;
                sg.fillStyle = 'rgba(242,236,222,0.05)';
                sg.fillRect(30, y, SW - 60, 108);
                sg.fillStyle = hex;
                sg.fillRect(46, y + 24, 118, 10);
                sg.fillStyle = 'rgba(242,236,222,0.22)';
                sg.fillRect(46, y + 50, 214, 8);
                const p = (Math.sin(t * 0.9 + i) + 1) / 2;
                sg.fillStyle = '#c6e24a';
                sg.fillRect(46, y + 78, (SW - 120) * p, 5);
            }
        }

        /* One app replaces another the way a pick replaces a row:
           the new screen is laid in from the foot, with a gold
           thread at the join. Crossfading two app screenshots just
           produced a ghost of both. */
        function drawScreen(t, dt, live) {
            if (!slides) { synthetic(t); }
            else {
                const n = slides.length;
                if (live && n > 1) {
                    hold += dt;
                    if (hold > HOLD) fade += dt / FADE;
                    if (fade >= 1) { cur = (cur + 1) % n; fade = 0; hold = 0; }
                }
                const a = slides[cur], b = slides[(cur + 1) % n];
                if (a.img) cover(a.img); else synthetic(t);
                if (fade > 0 && n > 1) {
                    const e = fade < 0.5 ? 2 * fade * fade : 1 - Math.pow(-2 * fade + 2, 2) / 2;
                    const yTop = SH * (1 - e);
                    sg.save();
                    sg.beginPath();
                    sg.rect(0, yTop, SW, SH - yTop);
                    sg.clip();
                    if (b.img) cover(b.img); else synthetic(t);
                    sg.restore();
                    const seam = sg.createLinearGradient(0, yTop - 10, 0, yTop + 10);
                    seam.addColorStop(0, 'rgba(240,210,122,0)');
                    seam.addColorStop(0.5, 'rgba(240,210,122,0.95)');
                    seam.addColorStop(1, 'rgba(240,210,122,0)');
                    sg.fillStyle = seam;
                    sg.fillRect(0, yTop - 10, SW, 20);
                }
                const shown = fade > 0.5 ? (cur + 1) % n : cur;
                if (shown !== announced) {
                    announced = shown;
                    const sl = slides[shown];
                    if (appOut) appOut.textContent = sl.app || sl.label;
                    if (metaOut && sl.meta) metaOut.textContent = sl.meta;
                }
            }
            const sweep = ((t * 0.28) % 1) * (SH + 340) - 170;
            const g = sg.createLinearGradient(0, sweep - 110, 0, sweep + 110);
            g.addColorStop(0, 'rgba(255,255,255,0)');
            g.addColorStop(0.5, 'rgba(255,255,255,0.08)');
            g.addColorStop(1, 'rgba(255,255,255,0)');
            sg.fillStyle = g;
            sg.fillRect(0, sweep - 110, SW, 220);
            sg.fillStyle = '#05100a';
            sg.beginPath();
            if (sg.roundRect) sg.roundRect(SW / 2 - 56, 18, 112, 29, 15);
            else sg.rect(SW / 2 - 56, 18, 112, 29);
            sg.fill();
            screenTex.needsUpdate = true;
        }

        /* --- the two performances --------------------------------- */
        const m4 = new THREE.Matrix4();
        const q = new THREE.Quaternion();
        const v3 = new THREE.Vector3();
        const s3 = new THREE.Vector3();

        const WEAVE = 2.7, CLOSE = 0.6, FLIP = 1.25;      // hero
        const RISE = 1.9;                                  // card
        const ease = (x) => 1 - Math.pow(1 - x, 3);

        let clock = 0;
        let px = 0, py = 0, tx = 0, ty = 0;
        let shownRow = -1;

        function poseHero() {
            const w = Math.min(1, clock / WEAVE);
            const closed = Math.min(1, Math.max(0, (clock - WEAVE) / CLOSE));
            const flip = Math.min(1, Math.max(0, (clock - WEAVE - CLOSE) / FLIP));
            const settled = Math.max(0, clock - WEAVE - CLOSE - FLIP);

            // the cloth is woven with its back to us, then turned over
            phone.rotation.y = Math.PI * (1 - ease(flip)) + Math.sin(clock * 0.45) * 0.08 * flip + px * 0.45;
            phone.rotation.x = -py * 0.24 + Math.sin(clock * 0.37) * 0.03 * flip;
            phone.rotation.z = Math.sin(clock * 0.31) * 0.03 * flip;
            phone.position.y = Math.sin(settled * 1.1) * 0.035 * Math.min(1, settled);

            // chassis and screen only exist once the cloth is finished
            chassisMat.opacity = closed;
            chassisMat.transparent = closed < 1;
            chassis.visible = closed > 0.02;
            backMat.opacity = closed;
            back.visible = closed > 0.02;
            screen.visible = glass.visible = flip > 0.25;
            screenLight.intensity = 0.3 * flip;

            const rows = weave.ROWS;
            const reached = (clock / WEAVE) * rows;
            let ng = 0, nd = 0;
            for (let i = 0; i < weave.cells.length; i++) {
                const c = weave.cells[i];
                const age = reached - c.row;
                if (age <= 0) continue;
                const t = Math.min(1, age / 1.5);
                const e = ease(t);
                // each pick flies in from alternating selvedges
                const side = (c.row % 2 === 0) ? -1 : 1;
                const x = c.x + side * (1 - e) * 1.5;
                const s = 0.4 + 0.6 * e;
                s3.set(s, s, 1);
                v3.set(x, c.y, -D / 2 - 0.012);
                m4.compose(v3, q, s3);
                if (c.w) { weave.gold.setMatrixAt(ng++, m4); }
                else { weave.ground.setMatrixAt(nd++, m4); }
            }
            weave.gold.count = ng;
            weave.ground.count = nd;
            weave.gold.instanceMatrix.needsUpdate = true;
            weave.ground.instanceMatrix.needsUpdate = true;

            // the cloth stays visible under the chassis, then hides on the turn
            const clothOn = flip < 0.5;
            weave.gold.visible = weave.ground.visible = clothOn;

            const picking = w < 1;
            weave.shuttle.visible = picking;
            weave.shuttleLight.visible = picking;
            if (picking) {
                const y = PH / 2 - (reached / rows) * PH;
                weave.shuttle.position.set(0, y, -D / 2 - 0.05);
                weave.shuttleLight.position.set(0, y, -D / 2 - 0.2);
                weave.shuttle.material.opacity = 0.55 + 0.45 * Math.abs(Math.sin(clock * 9));
            }

            if (rowOut) {
                const r = Math.min(rows, Math.floor(reached));
                if (r !== shownRow) {
                    shownRow = r;
                    rowOut.textContent = String(r).padStart(2, '0') + '/' + rows;
                }
            }
            return flip >= 1;
        }

        function poseCard() {
            const p = Math.min(1, clock / RISE);
            const e = ease(p);
            const settled = Math.max(0, clock - RISE);
            phone.rotation.y = Math.sin(clock * 0.5) * 0.2 * e + px * 0.5;
            phone.rotation.x = -py * 0.26 + Math.sin(clock * 0.4) * 0.035 * e;
            phone.rotation.z = Math.sin(clock * 0.33) * 0.03 * e;
            phone.position.y = -0.9 * (1 - e) + Math.sin(settled * 1.2) * 0.04 * Math.min(1, settled);
            const sc2 = 0.62 + 0.38 * e;
            phone.scale.set(sc2, sc2, sc2);
            // the screen is laid in by one gold pick as it arrives
            screen.visible = glass.visible = p > 0.25;
            screenLight.intensity = 0.3 * p;
            return p >= 1;
        }

        function common() {
            threadGroup.rotation.y = -clock * 0.3;
            threadGroup.position.y = phone.position.y * 0.55;
            const f = (clock * 0.12) % 1;
            const at = curve.getPointAt(f);
            bead.position.copy(at);
            beadLight.position.copy(at);
            lamp.position.set(px * 1.8, 0.8 - py * 1.4, 3);
            pad.material.opacity = 0.18 + 0.34 * Math.min(1, clock / 2);
        }

        function resize() {
            const w = Math.round(box.clientWidth);
            const h = Math.round(box.clientHeight);
            if (!w || !h) return false;
            if (canvas.width !== Math.round(w * PR) || canvas.height !== Math.round(h * PR)) {
                canvas.width = Math.round(w * PR);
                canvas.height = Math.round(h * PR);
            }
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
            const half = Math.tan((camera.fov * Math.PI / 180) / 2);
            const pad2 = hero ? 0.52 : 0.3;
            const zH = (PH / 2 + pad2) / half;
            const zW = (PW / 2 + pad2 + 0.08) / (half * camera.aspect);
            camera.position.set(0, 0.05, Math.max(zH, zW));
            camera.lookAt(0, 0, 0);
            return true;
        }

        return {
            el: el, canvas: canvas, ctx: ctx, scene: scene, camera: camera,
            hero: hero, visible: false,
            resize: resize,
            width: function () { return box.clientWidth; },
            height: function () { return box.clientHeight; },
            aim: function (nx, ny) { tx = nx; ty = ny; },
            step: function (dt) {
                clock += dt;
                px += (tx - px) * 0.07;
                py += (ty - py) * 0.07;
                const done = hero ? poseHero() : poseCard();
                common();
                drawScreen(clock, dt, done);
            },
            finish: function () {
                clock = (hero ? WEAVE + CLOSE + FLIP : RISE) + 4;
                if (hero) poseHero(); else poseCard();
                common();
                drawScreen(clock, 0, false);
            }
        };
    }

    const all = nodes.map(Stage).filter(Boolean);
    if (!all.length) return;

    function layout() {
        let w = 0, h = 0;
        all.forEach(function (s) {
            if (!s.resize()) return;
            w = Math.max(w, s.width());
            h = Math.max(h, s.height());
        });
        if (!w || !h) return;
        if (w !== bufW || h !== bufH) {
            bufW = w;
            bufH = h;
            renderer.setSize(w, h, false);
        }
    }

    function blit(s) {
        const w = s.width(), h = s.height();
        if (!w || !h) return;
        renderer.setViewport(0, bufH - h, w, h);
        renderer.setScissor(0, bufH - h, w, h);
        renderer.setScissorTest(true);
        renderer.clear();
        renderer.render(s.scene, s.camera);
        s.ctx.clearRect(0, 0, s.canvas.width, s.canvas.height);
        s.ctx.drawImage(buffer, 0, 0, Math.round(w * PR), Math.round(h * PR),
            0, 0, s.canvas.width, s.canvas.height);
    }

    if ('IntersectionObserver' in window) {
        const io = new IntersectionObserver(function (entries) {
            entries.forEach(function (e) {
                const s = all.find(function (x) { return x.el === e.target; });
                if (s) s.visible = e.isIntersecting;
            });
        }, { rootMargin: '140px' });
        all.forEach(function (s) { io.observe(s.el); });
    } else {
        all.forEach(function (s) { s.visible = true; });
    }

    if (canHover) {
        window.addEventListener('pointermove', function (e) {
            all.forEach(function (s) {
                if (!s.visible) return;
                const r = s.canvas.getBoundingClientRect();
                const reach = s.hero ? 240 : 120;
                if (e.clientX < r.left - reach || e.clientX > r.right + reach ||
                    e.clientY < r.top - reach || e.clientY > r.bottom + reach) { s.aim(0, 0); return; }
                s.aim(((e.clientX - r.left) / r.width) * 2 - 1,
                    ((e.clientY - r.top) / r.height) * 2 - 1);
            });
        }, { passive: true });
        window.addEventListener('pointerleave', function () {
            all.forEach(function (s) { s.aim(0, 0); });
        });
    }

    let rt;
    window.addEventListener('resize', function () {
        clearTimeout(rt);
        rt = setTimeout(layout, 140);
    });

    layout();
    all.forEach(function (s) {
        s.el.classList.add(s.hero ? 'telefon--live' : 'feat-stage--live');
    });
    // the 3D is up, so the plain screenshots are not needed after all
    clearTimeout(window.__tenunFallback);
    document.documentElement.classList.remove('no3d');

    if (reduced) {
        all.forEach(function (s) { s.finish(); blit(s); });
        return;
    }

    let last = 0;
    (function frame(now) {
        if (!last) last = now;
        const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
        last = now;
        if (!bufW) layout();
        for (let i = 0; i < all.length; i++) {
            if (!all[i].visible) continue;
            all[i].step(dt);
            blit(all[i]);
        }
        requestAnimationFrame(frame);
    })(0);
})();
