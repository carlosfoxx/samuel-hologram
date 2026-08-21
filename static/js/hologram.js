class Hologram {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");
        this.phase = 0;
        this.speaking = false;
        this.scanY = 0;
        this.glitchTimer = 0;
        this.glitchActive = false;
        this.glitchOffset = 0;
        this.glitchRGB = 0;
        this.mouseX = 0;
        this.mouseY = 0;
        this.targetMouseX = 0;
        this.targetMouseY = 0;
        this.breathPhase = 0;
        this.speakingIntensity = 0;
        this.energyBurst = 0;
        this.mouthOpen = 0;
        this.targetMouthOpen = 0;
        this.lipSyncPhase = 0;
        this.blinkTimer = 0;
        this.blinkAmount = 0;
        this.headTilt = 0;
        this.targetHeadTilt = 0;
        this.headNod = 0;
        this.idlePhase = 0;
        this.noiseCanvas = null;
        this.quoteIndex = 0;
        this.quoteTimer = 0;
        this.quoteAlpha = 0;

        this.quotes = [
            "O Amazonas e o futuro do Brasil",
            "Eduacao e a chave para a liberdade",
            "Pensar grande, comecar pequeno",
            "O comercio e missao de servir",
            "A Zona Franca mudou Manaus",
        ];

        this.particles = this._initParticles();
        this.orbParticles = this._initOrbParticles();
        this.dataStreams = this._initDataStreams();
        this.godRays = this._initGodRays();
        this.riverWaves = this._initRiverWaves();

        this._initNoise();
        this._resize();
        this._initMouse();
        window.addEventListener("resize", () => this._resize());
        this._animate();
    }

    _initRiverWaves() {
        const arr = [];
        for (let i = 0; i < 5; i++) {
            arr.push({
                y: 0,
                amplitude: 3 + Math.random() * 5,
                frequency: 0.02 + Math.random() * 0.02,
                speed: 0.02 + Math.random() * 0.03,
                phase: Math.random() * Math.PI * 2,
                alpha: 0.08 + Math.random() * 0.12,
            });
        }
        return arr;
    }

    _initNoise() {
        this.noiseCanvas = document.createElement("canvas");
        this.noiseCanvas.width = 128;
        this.noiseCanvas.height = 128;
        const nctx = this.noiseCanvas.getContext("2d");
        const imgData = nctx.createImageData(128, 128);
        for (let i = 0; i < imgData.data.length; i += 4) {
            const v = Math.random() * 255;
            imgData.data[i] = v;
            imgData.data[i + 1] = v;
            imgData.data[i + 2] = v;
            imgData.data[i + 3] = 12;
        }
        nctx.putImageData(imgData, 0, 0);
    }

    _initParticles() {
        const arr = [];
        for (let i = 0; i < 150; i++) {
            arr.push({
                x: Math.random(),
                y: Math.random(),
                z: Math.random(),
                speed: 0.0008 + Math.random() * 0.005,
                size: 0.3 + Math.random() * 2.8,
                alpha: 30 + Math.random() * 180,
                drift: (Math.random() - 0.5) * 0.002,
                trail: [],
            });
        }
        return arr;
    }

    _initOrbParticles() {
        const arr = [];
        for (let i = 0; i < 50; i++) {
            arr.push({
                radius: 60 + Math.random() * 200,
                speed: 0.003 + Math.random() * 0.012,
                angle: Math.random() * Math.PI * 2,
                tilt: (Math.random() - 0.5) * 0.8,
                size: 0.5 + Math.random() * 3,
                alpha: 40 + Math.random() * 160,
            });
        }
        return arr;
    }

    _initDataStreams() {
        const arr = [];
        for (let i = 0; i < 12; i++) {
            arr.push({
                x: Math.random(),
                y: Math.random(),
                speed: 0.004 + Math.random() * 0.008,
                chars: this._randomChars(),
                alpha: 15 + Math.random() * 50,
                size: 8 + Math.floor(Math.random() * 4),
            });
        }
        return arr;
    }

    _initGodRays() {
        const arr = [];
        for (let i = 0; i < 8; i++) {
            arr.push({
                angle: (Math.PI / 4) * i,
                width: 0.015 + Math.random() * 0.035,
                alpha: 0.02 + Math.random() * 0.04,
                speed: 0.002 + Math.random() * 0.005,
            });
        }
        return arr;
    }

    _randomChars() {
        const chars = "01アイウエオカキクケコ>/*+{}[]#@&";
        let s = "";
        const len = 3 + Math.floor(Math.random() * 8);
        for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
        return s;
    }

    _resize() {
        const rect = this.canvas.parentElement.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        this.canvas.style.width = rect.width + "px";
        this.canvas.style.height = rect.height + "px";
        this.ctx.scale(dpr, dpr);
        this.w = rect.width;
        this.h = rect.height;
    }

    _initMouse() {
        const panel = this.canvas.parentElement;
        panel.addEventListener("mousemove", (e) => {
            const rect = panel.getBoundingClientRect();
            this.targetMouseX = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
            this.targetMouseY = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
        });
        panel.addEventListener("mouseleave", () => {
            this.targetMouseX = 0;
            this.targetMouseY = 0;
        });
    }

    setSpeaking(val) {
        this.speaking = val;
    }

    setMouthOpen(val) {
        this.targetMouthOpen = val;
    }

    _animate() {
        this.phase += 0.05;
        this.breathPhase += 0.03;
        this.idlePhase += 0.015;
        this.scanY = (this.scanY + 1.8) % this.h;

        this.mouseX += (this.targetMouseX - this.mouseX) * 0.06;
        this.mouseY += (this.targetMouseY - this.mouseY) * 0.06;

        if (this.speaking) {
            this.speakingIntensity = Math.min(this.speakingIntensity + 0.03, 1);
        } else {
            this.speakingIntensity = Math.max(this.speakingIntensity - 0.02, 0);
        }

        if (this.speakingIntensity > 0.8 && Math.random() < 0.05) {
            this.energyBurst = 1;
        }
        this.energyBurst *= 0.92;

        this.mouthOpen += (this.targetMouthOpen - this.mouthOpen) * 0.3;
        this.lipSyncPhase += 0.15;

        this.blinkTimer++;
        if (this.blinkTimer > 180 + Math.random() * 120) {
            this.blinkTimer = 0;
            this.blinkAmount = 1;
        }
        if (this.blinkAmount > 0) {
            this.blinkAmount -= 0.12;
            if (this.blinkAmount < 0) this.blinkAmount = 0;
        }

        if (this.speaking) {
            this.targetHeadTilt = Math.sin(this.phase * 0.8) * 0.015;
            this.headNod = Math.sin(this.phase * 2) * 0.008;
        } else {
            this.targetHeadTilt = Math.sin(this.idlePhase * 0.4) * 0.008;
            this.headNod = Math.sin(this.idlePhase * 0.6) * 0.003;
        }
        this.headTilt += (this.targetHeadTilt - this.headTilt) * 0.08;

        this.quoteTimer++;
        if (this.quoteTimer > 300) {
            this.quoteTimer = 0;
            this.quoteIndex = (this.quoteIndex + 1) % this.quotes.length;
        }
        this.quoteAlpha = this.quoteTimer < 240
            ? Math.min(this.quoteAlpha + 0.01, 1)
            : Math.max(this.quoteAlpha - 0.02, 0);

        if (Math.random() < 0.004) {
            this.glitchActive = true;
            this.glitchTimer = 3 + Math.floor(Math.random() * 8);
            this.glitchRGB = 1;
        }
        if (this.glitchActive) {
            this.glitchTimer--;
            this.glitchOffset = (Math.random() - 0.5) * 25;
            this.glitchRGB *= 0.9;
            if (this.glitchTimer <= 0) {
                this.glitchActive = false;
                this.glitchOffset = 0;
                this.glitchRGB = 0;
            }
        }

        this._updateParticles();
        this._draw();
        requestAnimationFrame(() => this._animate());
    }

    _updateParticles() {
        for (const p of this.particles) {
            p.y -= p.speed;
            p.x += p.drift;
            if (p.y < -0.05) { p.y = 1.05; p.x = Math.random(); }
            if (p.x < -0.05) p.x = 1.05;
            if (p.x > 1.05) p.x = -0.05;
        }
        for (const s of this.dataStreams) {
            s.y -= s.speed;
            if (s.y < -0.3) {
                s.y = 1.2;
                s.x = Math.random();
                s.chars = this._randomChars();
            }
        }
    }

    _draw() {
        const ctx = this.ctx;
        const w = this.w;
        const h = this.h;
        ctx.clearRect(0, 0, w, h);

        const px = this.mouseX;
        const py = this.mouseY;
        const breath = Math.sin(this.breathPhase) * 0.008;
        const si = this.speakingIntensity;

        this._drawNoise(ctx, w, h);
        this._drawRiverWaves(ctx, w, h, px, si);
        this._drawFloorReflection(ctx, w, h, px, py, breath);
        this._drawHexGrid(ctx, w, h, px);
        this._drawVolumetricCone(ctx, w, h, px, si);
        this._drawProjectionBeam(ctx, w, h, px, si);
        this._drawGodRays(ctx, w, h, px, si);
        this._drawBasePlatform(ctx, w, h, px, si);
        this._drawAvatar3D(ctx, w, h, px, py, breath, si);
        this._drawOrbitalRings3D(ctx, w, h, px, py, si);
        this._drawDataStreams(ctx, w, h, px);
        this._drawDepthParticles(ctx, w, h, px, py, si);
        this._drawScanLines(ctx, w, h, si);
        this._drawHUD(ctx, w, h, px, py, si);
        this._drawEnergyBurst(ctx, w, h, si);
        this._drawInfoPanel(ctx, w, h, px, py, si);
        this._drawVoiceWave(ctx, w, h, si);
    }

    _drawNoise(ctx, w, h) {
        if (!this.noiseCanvas) return;
        ctx.save();
        ctx.globalAlpha = 0.04 + this.speakingIntensity * 0.02;
        ctx.globalCompositeOperation = "screen";
        const pattern = ctx.createPattern(this.noiseCanvas, "repeat");
        ctx.fillStyle = pattern;
        ctx.fillRect(0, 0, w, h);
        ctx.restore();
    }

    _drawRiverWaves(ctx, w, h, px, si) {
        const intensity = 0.3 + si * 0.5;
        for (const wave of this.riverWaves) {
            wave.phase += wave.speed;
            const baseY = h - 55 + wave.y;
            ctx.save();
            ctx.globalAlpha = wave.alpha * intensity;
            ctx.strokeStyle = `rgba(0, 180, 255, 0.6)`;
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            for (let x = 0; x < w; x += 3) {
                const y = baseY + Math.sin(x * wave.frequency + wave.phase) * wave.amplitude;
                if (x === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();
            ctx.restore();
        }
    }

    _drawHexGrid(ctx, w, h, px) {
        const size = 28;
        const hDist = size * 1.73;
        const vDist = size * 1.5;
        ctx.lineWidth = 0.5;

        for (let row = -1; row < h / vDist + 1; row++) {
            for (let col = -1; col < w / hDist + 1; col++) {
                const bx = col * hDist + (row % 2 ? hDist / 2 : 0);
                const by = row * vDist;
                const parallax = (by / h - 0.5) * px * 12;
                const x = bx + parallax;
                const distFromCenter = Math.sqrt(Math.pow((x - w / 2) / w, 2) + Math.pow((by - h / 2) / h, 2));
                const alpha = Math.max(0.01, 0.04 - distFromCenter * 0.04);
                ctx.strokeStyle = `rgba(0, 100, 180, ${alpha})`;
                ctx.beginPath();
                for (let i = 0; i < 6; i++) {
                    const angle = (Math.PI / 3) * i - Math.PI / 6;
                    const hx = x + size * Math.cos(angle);
                    const hy = by + size * Math.sin(angle);
                    if (i === 0) ctx.moveTo(hx, hy);
                    else ctx.lineTo(hx, hy);
                }
                ctx.closePath();
                ctx.stroke();
            }
        }
    }

    _drawVolumetricCone(ctx, w, h, px, si) {
        const cx = w / 2;
        const baseY = h - 50;
        const topY = h * 0.08;
        const baseW = w * 0.03;
        const topW = w * 0.28;
        const intensity = 0.04 + si * 0.06;

        for (let i = 0; i < 5; i++) {
            const spread = 1 + i * 0.15;
            const alpha = intensity * (1 - i * 0.18);
            const grad = ctx.createLinearGradient(cx + px * 30, baseY, cx + px * 15, topY);
            grad.addColorStop(0, `rgba(0, 200, 255, ${alpha * 1.2})`);
            grad.addColorStop(0.3, `rgba(0, 180, 255, ${alpha})`);
            grad.addColorStop(0.7, `rgba(0, 140, 255, ${alpha * 0.4})`);
            grad.addColorStop(1, "transparent");

            ctx.save();
            ctx.beginPath();
            ctx.moveTo(cx - baseW, baseY);
            ctx.lineTo(cx - topW * spread + px * 20, topY);
            ctx.lineTo(cx + topW * spread + px * 20, topY);
            ctx.lineTo(cx + baseW, baseY);
            ctx.closePath();
            ctx.fillStyle = grad;
            ctx.globalCompositeOperation = "screen";
            ctx.fill();
            ctx.restore();
        }
    }

    _drawGodRays(ctx, w, h, px, si) {
        const cx = w / 2;
        const baseY = h - 50;
        const intensity = 0.5 + si * 0.5;

        for (const ray of this.godRays) {
            const angle = ray.angle + this.phase * ray.speed + px * 0.3;
            const len = h * 0.6;
            const startX = cx + px * 20;
            const endX = startX + Math.cos(angle) * len * 0.3;
            const endY = baseY - len;

            const grad = ctx.createLinearGradient(startX, baseY, endX, endY);
            grad.addColorStop(0, `rgba(0, 220, 255, ${ray.alpha * intensity})`);
            grad.addColorStop(0.5, `rgba(0, 180, 255, ${ray.alpha * intensity * 0.4})`);
            grad.addColorStop(1, "transparent");

            ctx.save();
            ctx.globalCompositeOperation = "screen";
            ctx.beginPath();
            ctx.moveTo(startX - ray.width * w, baseY);
            ctx.lineTo(endX - ray.width * w * 0.3, endY);
            ctx.lineTo(endX + ray.width * w * 0.3, endY);
            ctx.lineTo(startX + ray.width * w, baseY);
            ctx.closePath();
            ctx.fillStyle = grad;
            ctx.fill();
            ctx.restore();
        }
    }

    _drawProjectionBeam(ctx, w, h, px, si) {
        const cx = w / 2;
        const baseY = h - 50;
        const topY = h * 0.1;
        const beamWidth = w * 0.25;
        const intensity = 0.05 + si * 0.08;

        const grad = ctx.createLinearGradient(cx, baseY, cx, topY);
        grad.addColorStop(0, `rgba(0, 200, 255, ${intensity * 1.5})`);
        grad.addColorStop(0.3, `rgba(0, 180, 255, ${intensity})`);
        grad.addColorStop(0.7, `rgba(0, 150, 255, ${intensity * 0.4})`);
        grad.addColorStop(1, "transparent");

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(cx - 20, baseY);
        ctx.lineTo(cx - beamWidth + px * 15, topY);
        ctx.lineTo(cx + beamWidth + px * 15, topY);
        ctx.lineTo(cx + 20, baseY);
        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.restore();

        ctx.strokeStyle = `rgba(0, 200, 255, ${intensity * 0.6})`;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(cx - 20, baseY);
        ctx.lineTo(cx - beamWidth + px * 15, topY);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx + 20, baseY);
        ctx.lineTo(cx + beamWidth + px * 15, topY);
        ctx.stroke();
    }

    _drawBasePlatform(ctx, w, h, px, si) {
        const cx = w / 2;
        const baseY = h - 50;
        const intensity = 0.4 + si * 0.6;

        const grad = ctx.createRadialGradient(cx + px * 15, baseY, 0, cx + px * 15, baseY, 180);
        grad.addColorStop(0, `rgba(0, 220, 255, ${0.5 * intensity})`);
        grad.addColorStop(0.2, `rgba(0, 180, 255, ${0.25 * intensity})`);
        grad.addColorStop(0.5, `rgba(0, 100, 255, ${0.08 * intensity})`);
        grad.addColorStop(1, "transparent");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.ellipse(cx + px * 15, baseY, 180, 30, 0, 0, Math.PI * 2);
        ctx.fill();

        for (let r = 0; r < 4; r++) {
            const radius = 30 + r * 38;
            const rot = this.phase * (r % 2 ? 0.8 : -0.8);
            ctx.save();
            ctx.translate(cx + px * 10, baseY);
            ctx.rotate(rot);
            ctx.strokeStyle = `rgba(0, 200, 255, ${0.2 * intensity * (1 - r * 0.2)})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.ellipse(0, 0, radius, radius * 0.12, 0, 0, Math.PI * 2);
            ctx.stroke();

            const dotA = this.phase * 2 + r;
            const dx = radius * Math.cos(dotA);
            const dy = radius * 0.12 * Math.sin(dotA);
            ctx.fillStyle = `rgba(0, 255, 255, ${0.8 * intensity})`;
            ctx.beginPath();
            ctx.arc(dx, dy, 1.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        ctx.strokeStyle = `rgba(0, 180, 255, ${0.25 * intensity})`;
        ctx.lineWidth = 1;
        for (let i = 0; i < 6; i++) {
            const offset = i * 12;
            ctx.beginPath();
            ctx.moveTo(cx - 140 + offset * 2, baseY - 3 - offset);
            ctx.lineTo(cx + 140 - offset * 2, baseY - 3 - offset);
            ctx.stroke();
        }
    }

    _drawFloorReflection(ctx, w, h, px, py, breath) {

    _drawAvatar3D(ctx, w, h, px, py, breath, si) {
        const cx = w / 2;
        const glowIntensity = 0.4 + si * 0.6;

        const grad = ctx.createRadialGradient(cx, h / 2 - 40, 0, cx, h / 2 - 40, 80);
        grad.addColorStop(0, `rgba(0, 200, 255, ${0.3 * glowIntensity})`);
        grad.addColorStop(1, "transparent");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.ellipse(cx, h / 2 - 60, 50, 60, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    _drawOrbitalRings3D(ctx, w, h, px, py, si) {
        const cx = w / 2;
        const cy = h / 2 - 40;
        const intensity = 0.25 + si * 0.55;

        const rings = [
            { rx: 170, ry: 45, speed: 0.006, tiltX: 0, tiltY: 0.15 },
            { rx: 140, ry: 35, speed: -0.009, tiltX: 0.2, tiltY: -0.1 },
            { rx: 200, ry: 55, speed: 0.004, tiltX: -0.15, tiltY: 0.2 },
        ];

        for (const ring of rings) {
            ctx.save();
            ctx.translate(cx + px * 12, cy + py * 6);
            ctx.rotate(this.phase * ring.speed);

            const tiltAngle = this.phase * 0.3;
            ctx.scale(1, 0.3 + Math.sin(tiltAngle + ring.tiltX) * 0.15);

            ctx.strokeStyle = `rgba(0, 200, 255, ${0.12 * intensity})`;
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.ellipse(0, 0, ring.rx, ring.ry, 0, 0, Math.PI * 2);
            ctx.stroke();

            for (let i = 0; i < 4; i++) {
                const a = this.phase * 1.5 + (i * Math.PI * 2) / 4;
                const dx = ring.rx * Math.cos(a);
                const dy = ring.ry * Math.sin(a);

                const depth = Math.sin(a);
                const alpha2 = (0.4 + depth * 0.3) * intensity;
                const size = 1.5 + depth * 0.8;

                ctx.fillStyle = `rgba(0, 255, 255, ${alpha2})`;
                ctx.beginPath();
                ctx.arc(dx, dy, size, 0, Math.PI * 2);
                ctx.fill();

                if (size > 1.8) {
                    const glow = ctx.createRadialGradient(dx, dy, 0, dx, dy, size * 4);
                    glow.addColorStop(0, `rgba(0, 200, 255, ${alpha2 * 0.3})`);
                    glow.addColorStop(1, "transparent");
                    ctx.fillStyle = glow;
                    ctx.beginPath();
                    ctx.arc(dx, dy, size * 4, 0, Math.PI * 2);
                    ctx.fill();
                }
            }

            ctx.restore();
        }
    }

    _drawDataStreams(ctx, w, h, px) {
        ctx.save();
        for (const s of this.dataStreams) {
            const x = s.x * w + px * 8;
            const startY = s.y * h;
            ctx.font = `${s.size}px monospace`;
            const lines = s.chars.split("");
            lines.forEach((ch, i) => {
                const alpha = (1 - i / lines.length) * (s.alpha / 255);
                ctx.fillStyle = `rgba(0, 220, 255, ${alpha})`;
                ctx.fillText(ch, x, startY + i * (s.size + 2));
            });
        }
        ctx.restore();
    }

    _drawDepthParticles(ctx, w, h, px, py, si) {
        const cx = w / 2;
        const cy = h / 2 - 40;
        const intensity = 0.4 + si * 0.6;

        for (const p of this.particles) {
            const depthScale = 0.3 + p.z * 0.7;
            const px2 = p.x * w + px * (15 * depthScale);
            const py2 = p.y * h + py * (8 * depthScale);
            const size = p.size * depthScale;
            const alpha = (p.alpha / 255) * intensity * (0.3 + depthScale * 0.7);

            ctx.fillStyle = `rgba(0, 200, 255, ${alpha})`;
            ctx.beginPath();
            ctx.arc(px2, py2, size, 0, Math.PI * 2);
            ctx.fill();

            if (size > 1.8) {
                const glow = ctx.createRadialGradient(px2, py2, 0, px2, py2, size * 3);
                glow.addColorStop(0, `rgba(0, 200, 255, ${alpha * 0.3})`);
                glow.addColorStop(1, "transparent");
                ctx.fillStyle = glow;
                ctx.beginPath();
                ctx.arc(px2, py2, size * 3, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        for (const op of this.orbParticles) {
            op.angle += op.speed;
            const orbX = Math.cos(op.angle) * op.radius;
            const orbY = Math.sin(op.angle) * op.radius * (0.25 + op.tilt * 0.2);
            const depth = Math.sin(op.angle);
            const depthScale = 0.5 + depth * 0.5;
            const alpha = (op.alpha / 255) * intensity * depthScale;
            const size = op.size * depthScale;

            const drawX = cx + orbX + px * 12;
            const drawY = cy + orbY + py * 5;

            ctx.fillStyle = `rgba(0, 220, 255, ${alpha})`;
            ctx.beginPath();
            ctx.arc(drawX, drawY, size, 0, Math.PI * 2);
            ctx.fill();

            if (size > 1.5) {
                const glow = ctx.createRadialGradient(drawX, drawY, 0, drawX, drawY, size * 4);
                glow.addColorStop(0, `rgba(0, 200, 255, ${alpha * 0.25})`);
                glow.addColorStop(1, "transparent");
                ctx.fillStyle = glow;
                ctx.beginPath();
                ctx.arc(drawX, drawY, size * 4, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    _drawScanLines(ctx, w, h, si) {
        ctx.save();
        for (let y = 0; y < h; y += 3) {
            ctx.fillStyle = "rgba(0, 150, 255, 0.02)";
            ctx.fillRect(0, y, w, 1);
        }

        const scanH = 35;
        const scanGrad = ctx.createLinearGradient(0, this.scanY - scanH / 2, 0, this.scanY + scanH / 2);
        scanGrad.addColorStop(0, "transparent");
        scanGrad.addColorStop(0.4, `rgba(0, 255, 255, ${0.06 + si * 0.04})`);
        scanGrad.addColorStop(0.5, `rgba(0, 255, 255, ${0.14 + si * 0.08})`);
        scanGrad.addColorStop(0.6, `rgba(0, 255, 255, ${0.06 + si * 0.04})`);
        scanGrad.addColorStop(1, "transparent");
        ctx.fillStyle = scanGrad;
        ctx.fillRect(0, this.scanY - scanH / 2, w, scanH);

        ctx.strokeStyle = `rgba(0, 255, 255, ${0.2 + si * 0.25})`;
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(0, this.scanY);
        ctx.lineTo(w, this.scanY);
        ctx.stroke();
        ctx.restore();
    }

    _drawHUD(ctx, w, h, px, py, si) {
        const cx = w / 2;
        const cy = h / 2 - 40;
        const intensity = 0.3 + si * 0.5;

        ctx.save();
        ctx.translate(cx + px * 10, cy + py * 5);

        for (let r = 0; r < 3; r++) {
            const radius = 110 + r * 45;
            const rot = this.phase * 0.3 * (r % 2 ? 1 : -1);
            ctx.strokeStyle = `rgba(0, 180, 255, ${0.08 * intensity * (1 - r * 0.2)})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.arc(0, 0, radius, rot, rot + Math.PI * (0.6 + r * 0.1));
            ctx.stroke();
        }

        const tickCount = 36;
        for (let i = 0; i < tickCount; i++) {
            const angle = (Math.PI * 2 * i) / tickCount;
            const inner = 95;
            const outer = i % 3 === 0 ? 108 : 101;
            ctx.strokeStyle = `rgba(0, 200, 255, ${0.15 * intensity})`;
            ctx.lineWidth = i % 3 === 0 ? 1.2 : 0.4;
            ctx.beginPath();
            ctx.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
            ctx.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
            ctx.stroke();
        }

        const textAngle = this.phase * 0.5;
        const tx = 125 * Math.cos(textAngle);
        const ty = 125 * Math.sin(textAngle);
        ctx.fillStyle = `rgba(0, 220, 255, ${0.4 * intensity})`;
        ctx.font = "9px monospace";
        ctx.fillText("BENCHIMOL", tx - 25, ty);

        ctx.restore();

        if (this.quoteAlpha > 0.01) {
            ctx.save();
            ctx.globalAlpha = this.quoteAlpha * 0.5 * intensity;
            ctx.fillStyle = "rgba(0, 220, 255, 0.7)";
            ctx.font = "italic 11px monospace";
            ctx.textAlign = "center";
            ctx.fillText(`"${this.quotes[this.quoteIndex]}"`, cx + px * 5, 30);
            ctx.textAlign = "left";
            ctx.restore();
        }
    }

    _drawInfoPanel(ctx, w, h, px, py, si) {
        const cx = w / 2;
        const panelY = h - 40;
        const intensity = 0.4 + si * 0.4;
        const breathe = Math.sin(this.idlePhase * 0.8) * 0.05;

        ctx.save();
        ctx.globalAlpha = (0.6 + breathe) * intensity;

        ctx.strokeStyle = `rgba(0, 220, 255, 0.3)`;
        ctx.lineWidth = 0.5;
        const panelW = 280;
        const panelH = 35;
        const px2 = cx - panelW / 2 + px * 5;
        const py2 = panelY - panelH / 2;
        ctx.strokeRect(px2, py2, panelW, panelH);

        ctx.fillStyle = `rgba(0, 20, 40, 0.5)`;
        ctx.fillRect(px2, py2, panelW, panelH);

        ctx.fillStyle = `rgba(0, 220, 255, ${0.8 * intensity})`;
        ctx.font = "bold 12px monospace";
        ctx.textAlign = "center";
        ctx.fillText("PROF. SAMUEL BENCHIMOL", cx + px * 5, py2 + 13);

        ctx.fillStyle = `rgba(0, 180, 255, ${0.5 * intensity})`;
        ctx.font = "9px monospace";
        ctx.fillText("1923 — 2002  |  MANAUS  |  AMAZONAS", cx + px * 5, py2 + 24);

        const dotPulse = 0.3 + Math.sin(this.phase * 3) * 0.2;
        ctx.fillStyle = `rgba(0, 255, 200, ${dotPulse * intensity})`;
        ctx.beginPath();
        ctx.arc(px2 + 8, py2 + panelH / 2, 2.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = `rgba(0, 255, 200, ${0.4 * intensity})`;
        ctx.font = "8px monospace";
        ctx.textAlign = "left";
        ctx.fillText("HOLOGRAMA ATIVO", px2 + 16, py2 + panelH / 2 + 3);

        ctx.textAlign = "left";
        ctx.restore();
    }

    _drawVoiceWave(ctx, w, h, si) {
        if (si < 0.05) return;

        const cx = w / 2;
        const baseY = h - 75;
        const waveW = 200;
        const waveH = 10 * si;

        ctx.save();
        ctx.globalAlpha = si * 0.6;

        ctx.strokeStyle = `rgba(0, 255, 255, ${0.5 + si * 0.3})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let i = 0; i <= waveW; i++) {
            const x = cx - waveW / 2 + i;
            const t = i / waveW;
            const envelope = Math.sin(t * Math.PI);
            const wave = Math.sin(t * 20 + this.phase * 3) * waveH * envelope;
            const noise = (Math.random() - 0.5) * waveH * 0.3;
            if (i === 0) ctx.moveTo(x, baseY + wave + noise);
            else ctx.lineTo(x, baseY + wave + noise);
        }
        ctx.stroke();

        ctx.strokeStyle = `rgba(0, 200, 255, ${0.3 * si})`;
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        for (let i = 0; i <= waveW; i++) {
            const x = cx - waveW / 2 + i;
            const t = i / waveW;
            const envelope = Math.sin(t * Math.PI);
            const wave = Math.sin(t * 15 + this.phase * 2) * waveH * 0.6 * envelope;
            if (i === 0) ctx.moveTo(x, baseY + wave + 4);
            else ctx.lineTo(x, baseY + wave + 4);
        }
        ctx.stroke();

        ctx.restore();
    }

    _drawEnergyBurst(ctx, w, h, si) {
        if (this.energyBurst < 0.05) return;

        const cx = w / 2;
        const cy = h / 2 - 40;
        const burstSize = 150 * this.energyBurst;

        ctx.save();
        ctx.globalCompositeOperation = "screen";

        for (let i = 0; i < 16; i++) {
            const angle = (Math.PI * 2 * i) / 16 + this.phase;
            const len = burstSize * (0.5 + Math.random() * 0.5);
            const endX = cx + Math.cos(angle) * len;
            const endY = cy + Math.sin(angle) * len;

            const grad = ctx.createLinearGradient(cx, cy, endX, endY);
            grad.addColorStop(0, `rgba(0, 255, 255, ${0.5 * this.energyBurst})`);
            grad.addColorStop(0.3, `rgba(0, 220, 255, ${0.25 * this.energyBurst})`);
            grad.addColorStop(0.7, `rgba(0, 180, 255, ${0.1 * this.energyBurst})`);
            grad.addColorStop(1, "transparent");

            ctx.strokeStyle = grad;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(endX, endY);
            ctx.stroke();
        }

        const ringGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, burstSize);
        ringGrad.addColorStop(0, `rgba(0, 255, 255, ${0.3 * this.energyBurst})`);
        ringGrad.addColorStop(0.3, `rgba(0, 200, 255, ${0.15 * this.energyBurst})`);
        ringGrad.addColorStop(0.7, `rgba(0, 150, 255, ${0.05 * this.energyBurst})`);
        ringGrad.addColorStop(1, "transparent");
        ctx.fillStyle = ringGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, burstSize, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = `rgba(0, 255, 255, ${0.4 * this.energyBurst})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(cx, cy, burstSize * 0.8, 0, Math.PI * 2);
        ctx.stroke();

        ctx.restore();
    }
}

const SplashHologram = class {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");
        this.phase = 0;
        this.mouseX = 0;
        this.targetMouseX = 0;
        this.particles = [];
        this.scanY = 0;

        for (let i = 0; i < 80; i++) {
            this.particles.push({
                x: Math.random(),
                y: Math.random(),
                z: Math.random(),
                speed: 0.001 + Math.random() * 0.005,
                size: 0.3 + Math.random() * 2.5,
                alpha: 20 + Math.random() * 120,
                drift: (Math.random() - 0.5) * 0.001,
            });
        }

        this._resize();
        this._initMouse();
        window.addEventListener("resize", () => this._resize());
        this._animate();
    }

    _resize() {
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = window.innerWidth * dpr;
        this.canvas.height = window.innerHeight * dpr;
        this.canvas.style.width = window.innerWidth + "px";
        this.canvas.style.height = window.innerHeight + "px";
        this.ctx.scale(dpr, dpr);
        this.w = window.innerWidth;
        this.h = window.innerHeight;
    }

    _initMouse() {
        window.addEventListener("mousemove", (e) => {
            this.targetMouseX = (e.clientX / window.innerWidth - 0.5) * 2;
        });
    }

    _animate() {
        this.phase += 0.04;
        this.scanY = (this.scanY + 1.2) % this.h;
        this.mouseX += (this.targetMouseX - this.mouseX) * 0.05;

        for (const p of this.particles) {
            p.y -= p.speed;
            p.x += p.drift;
            if (p.y < -0.05) { p.y = 1.05; p.x = Math.random(); }
            if (p.x < -0.05) p.x = 1.05;
            if (p.x > 1.05) p.x = -0.05;
        }

        this._draw();
        requestAnimationFrame(() => this._animate());
    }

    _draw() {
        const ctx = this.ctx;
        const w = this.w;
        const h = this.h;
        const cx = w / 2;
        const px = this.mouseX;

        ctx.clearRect(0, 0, w, h);

        const size = 26;
        const hDist = size * 1.73;
        const vDist = size * 1.5;
        for (let row = -1; row < h / vDist + 1; row++) {
            for (let col = -1; col < w / hDist + 1; col++) {
                const bx = col * hDist + (row % 2 ? hDist / 2 : 0);
                const by = row * vDist;
                const parallax = (by / h - 0.5) * px * 10;
                const x = bx + parallax;
                const distFromCenter = Math.sqrt(Math.pow((x - cx) / w, 2) + Math.pow((by - h / 2) / h, 2));
                const alpha = Math.max(0.008, 0.035 - distFromCenter * 0.03);
                ctx.strokeStyle = `rgba(0, 100, 180, ${alpha})`;
                ctx.lineWidth = 0.5;
                ctx.beginPath();
                for (let i = 0; i < 6; i++) {
                    const angle = (Math.PI / 3) * i - Math.PI / 6;
                    const hx = x + size * Math.cos(angle);
                    const hy = by + size * Math.sin(angle);
                    if (i === 0) ctx.moveTo(hx, hy);
                    else ctx.lineTo(hx, hy);
                }
                ctx.closePath();
                ctx.stroke();
            }
        }

        const beamTopY = h * 0.1;
        const beamBaseY = h * 0.92;
        const beamW = w * 0.22;
        const grad = ctx.createLinearGradient(cx, beamBaseY, cx, beamTopY);
        grad.addColorStop(0, "rgba(0, 200, 255, 0.06)");
        grad.addColorStop(0.5, "rgba(0, 160, 255, 0.025)");
        grad.addColorStop(1, "transparent");
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(cx - 15, beamBaseY);
        ctx.lineTo(cx - beamW + px * 12, beamTopY);
        ctx.lineTo(cx + beamW + px * 12, beamTopY);
        ctx.lineTo(cx + 15, beamBaseY);
        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.restore();

        for (let r = 0; r < 3; r++) {
            const radius = 100 + r * 60;
            const rot = this.phase * 0.35 * (r % 2 ? 1 : -1);
            ctx.save();
            ctx.translate(cx, h / 2);
            ctx.rotate(rot);
            ctx.strokeStyle = `rgba(0, 180, 255, ${0.08 * (1 - r * 0.2)})`;
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.ellipse(0, 0, radius, radius * 0.28, 0, 0, Math.PI * 2);
            ctx.stroke();

            const dotA = this.phase * 1.8;
            const dx = radius * Math.cos(dotA);
            const dy = radius * 0.28 * Math.sin(dotA);
            ctx.fillStyle = "rgba(0, 255, 255, 0.7)";
            ctx.beginPath();
            ctx.arc(dx, dy, 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        for (const p of this.particles) {
            const depthScale = 0.3 + p.z * 0.7;
            const px2 = p.x * w + px * (10 * depthScale);
            const py2 = p.y * h;
            const size2 = p.size * depthScale;
            const alpha = (p.alpha / 255) * (0.3 + depthScale * 0.7);
            ctx.fillStyle = `rgba(0, 200, 255, ${alpha})`;
            ctx.beginPath();
            ctx.arc(px2, py2, size2, 0, Math.PI * 2);
            ctx.fill();
            if (size2 > 1.5) {
                const glow = ctx.createRadialGradient(px2, py2, 0, px2, py2, size2 * 3);
                glow.addColorStop(0, `rgba(0, 200, 255, ${alpha * 0.25})`);
                glow.addColorStop(1, "transparent");
                ctx.fillStyle = glow;
                ctx.beginPath();
                ctx.arc(px2, py2, size2 * 3, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        const scanH = 45;
        const scanGrad = ctx.createLinearGradient(0, this.scanY - scanH / 2, 0, this.scanY + scanH / 2);
        scanGrad.addColorStop(0, "transparent");
        scanGrad.addColorStop(0.5, "rgba(0, 255, 255, 0.05)");
        scanGrad.addColorStop(1, "transparent");
        ctx.fillStyle = scanGrad;
        ctx.fillRect(0, this.scanY - scanH / 2, w, scanH);

        for (let y = 0; y < h; y += 3) {
            ctx.fillStyle = "rgba(0, 150, 255, 0.012)";
            ctx.fillRect(0, y, w, 1);
        }
    }
};

const splashCanvas = document.getElementById("splash-canvas");
if (splashCanvas) new SplashHologram(splashCanvas);
