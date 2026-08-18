class Hologram {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");
        this.phase = 0;
        this.speaking = false;
        this.image = null;
        this.imageLoaded = false;
        this.scanY = 0;
        this.glitchTimer = 0;
        this.glitchActive = false;
        this.glitchOffset = 0;
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

        this.particles = this._initParticles();
        this.orbParticles = this._initOrbParticles();
        this.dataStreams = this._initDataStreams();
        this.godRays = this._initGodRays();

        this._loadImage();
        this._resize();
        this._initMouse();
        window.addEventListener("resize", () => this._resize());
        this._animate();
    }

    _initParticles() {
        const arr = [];
        for (let i = 0; i < 120; i++) {
            arr.push({
                x: Math.random(),
                y: Math.random(),
                z: Math.random(),
                speed: 0.001 + Math.random() * 0.006,
                size: 0.3 + Math.random() * 2.5,
                alpha: 30 + Math.random() * 180,
                drift: (Math.random() - 0.5) * 0.002,
            });
        }
        return arr;
    }

    _initOrbParticles() {
        const arr = [];
        for (let i = 0; i < 40; i++) {
            arr.push({
                radius: 60 + Math.random() * 180,
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
        for (let i = 0; i < 10; i++) {
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
        for (let i = 0; i < 6; i++) {
            arr.push({
                angle: (Math.PI / 3) * i,
                width: 0.02 + Math.random() * 0.04,
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

    _loadImage() {
        this.image = new Image();
        this.image.onload = () => { this.imageLoaded = true; };
        this.image.src = "/media/samuel-benchimol.webp";
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

        if (Math.random() < 0.004) {
            this.glitchActive = true;
            this.glitchTimer = 3 + Math.floor(Math.random() * 8);
        }
        if (this.glitchActive) {
            this.glitchTimer--;
            this.glitchOffset = (Math.random() - 0.5) * 25;
            if (this.glitchTimer <= 0) {
                this.glitchActive = false;
                this.glitchOffset = 0;
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
    }

    _drawHexGrid(ctx, w, h, px) {
        const size = 28;
        const hDist = size * 1.73;
        const vDist = size * 1.5;
        ctx.strokeStyle = "rgba(0, 100, 180, 0.035)";
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
        if (!this.imageLoaded) return;

        const cx = w / 2;
        const baseY = h - 50;
        const reflectY = baseY + 10;
        const maxH = h * 0.2;
        const ratio = this.image.width / this.image.height;
        let imgW = maxH * ratio;
        let imgH = maxH;
        if (imgW > w * 0.35) { imgW = w * 0.35; imgH = imgW / ratio; }
        const x = cx - imgW / 2 + px * 8;
        const y = reflectY;

        ctx.save();
        ctx.globalAlpha = 0.08 + this.speakingIntensity * 0.05;
        ctx.translate(x + imgW / 2, y);
        ctx.scale(1, -0.6);
        ctx.translate(-(x + imgW / 2), -y);
        ctx.filter = "blur(3px) hue-rotate(190deg) saturate(2)";
        ctx.drawImage(this.image, x, y, imgW, imgH);
        ctx.restore();

        const fadeGrad = ctx.createLinearGradient(0, reflectY, 0, reflectY + imgH * 0.6);
        fadeGrad.addColorStop(0, "rgba(2, 8, 20, 0.3)");
        fadeGrad.addColorStop(1, "rgba(2, 8, 20, 1)");
        ctx.fillStyle = fadeGrad;
        ctx.fillRect(x, reflectY, imgW, imgH * 0.6);
    }

    _drawAvatar3D(ctx, w, h, px, py, breath, si) {
        const cx = w / 2;
        const cy = h / 2 - 40;
        const glowIntensity = 0.4 + si * 0.6;

        if (this.imageLoaded) {
            const maxH = h * 0.55;
            const ratio = this.image.width / this.image.height;
            let imgW = maxH * ratio;
            let imgH = maxH;
            if (imgW > w * 0.6) { imgW = w * 0.6; imgH = imgW / ratio; }

            const scale = 1 + breath;
            const offsetX = px * 18;
            const offsetY = py * 8;
            let x = cx - imgW * scale / 2 + offsetX;
            let y = h / 2 - imgH * scale / 2 - 40 + offsetY;

            if (this.glitchActive) x += this.glitchOffset;

            ctx.save();
            ctx.translate(cx + offsetX, h / 2 - imgH * scale / 2 - 40 + offsetY);
            ctx.scale(scale, scale);
            ctx.translate(-(cx + offsetX), -(h / 2 - imgH * scale / 2 - 40 + offsetY));

            const mouthAmount = this.mouthOpen;
            const jawShift = mouthAmount * 3 * Math.sin(this.lipSyncPhase * 8);
            const mouthStretch = 1 + mouthAmount * 0.015;

            const drawImageSliced = (img, dx, dy, dw, dh, alpha, extraFilter) => {
                ctx.save();
                ctx.globalAlpha = alpha;
                if (extraFilter) ctx.filter = extraFilter;

                const mouthY = dy + dh * 0.72;
                const mouthH = dh * 0.18;
                const topH = mouthY - dy;
                const botY = mouthY + mouthH;
                const botH = dh - topH - mouthH;

                ctx.drawImage(img, dx, dy, dw, topH);
                ctx.drawImage(img, dx, mouthY, dw, mouthH, dx, mouthY + jawShift, dw, mouthH * mouthStretch);
                ctx.drawImage(img, dx, botY, dw, botH, dx, botY + jawShift * 0.3, dw, botH);

                ctx.restore();
            };

            drawImageSliced(this.image, x, y, imgW, imgH, 0.15 + 0.25 * glowIntensity, null);

            drawImageSliced(this.image, x, y, imgW, imgH, 0.1 + 0.15 * glowIntensity, "hue-rotate(190deg) saturate(3) brightness(2)");

            ctx.save();
            ctx.globalCompositeOperation = "screen";
            ctx.globalAlpha = 0.06 + 0.1 * glowIntensity;
            ctx.filter = "blur(8px)";
            ctx.drawImage(this.image, x - 10, y - 10, imgW + 20, imgH + 20);
            ctx.restore();

            if (this.glitchActive) {
                const sliceH = imgH * (0.05 + Math.random() * 0.15);
                const sliceY = y + Math.random() * (imgH - sliceH);
                ctx.save();
                ctx.globalAlpha = 0.4;
                ctx.drawImage(this.image, x + 5, sliceY, imgW, sliceH, x + 5, sliceY, imgW, sliceH);
                ctx.restore();
                ctx.save();
                ctx.globalAlpha = 0.25;
                ctx.drawImage(this.image, x - 3, y, imgW, imgH);
                ctx.restore();
            }

            const tintGrad = ctx.createLinearGradient(x, y, x, y + imgH);
            tintGrad.addColorStop(0, `rgba(0, 200, 255, ${0.1 * glowIntensity})`);
            tintGrad.addColorStop(0.3, `rgba(0, 240, 255, ${0.03 * glowIntensity})`);
            tintGrad.addColorStop(0.7, `rgba(0, 180, 255, ${0.02 * glowIntensity})`);
            tintGrad.addColorStop(1, `rgba(0, 80, 200, ${0.15 * glowIntensity})`);
            ctx.save();
            ctx.globalCompositeOperation = "screen";
            ctx.fillStyle = tintGrad;
            ctx.fillRect(x, y, imgW, imgH);
            ctx.restore();

            ctx.save();
            ctx.strokeStyle = `rgba(0, 200, 255, ${0.06 + si * 0.04})`;
            ctx.lineWidth = 0.5;
            for (let ly = y; ly < y + imgH; ly += 3) {
                ctx.beginPath();
                ctx.moveTo(x, ly);
                ctx.lineTo(x + imgW, ly);
                ctx.stroke();
            }
            ctx.restore();

            const edgeGlow = 0.12 + 0.1 * Math.sin(this.phase * 2.5);
            ctx.strokeStyle = `rgba(0, 220, 255, ${edgeGlow})`;
            ctx.lineWidth = 1.5;
            ctx.strokeRect(x - 1, y - 1, imgW + 2, imgH + 2);

            ctx.strokeStyle = `rgba(0, 255, 255, ${glowIntensity * 0.4})`;
            ctx.lineWidth = 2;
            const cs = 14;
            [[x, y], [x + imgW, y], [x, y + imgH], [x + imgW, y + imgH]].forEach(([px2, py2], i) => {
                const dx = i % 2 === 0 ? 1 : -1;
                const dy = i < 2 ? 1 : -1;
                ctx.beginPath();
                ctx.moveTo(px2 + dx * cs, py2);
                ctx.lineTo(px2, py2);
                ctx.lineTo(px2, py2 + dy * cs);
                ctx.stroke();
            });

            ctx.restore();
        } else {
            const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 80);
            grad.addColorStop(0, `rgba(0, 200, 255, ${0.3 * glowIntensity})`);
            grad.addColorStop(1, "transparent");
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.ellipse(cx, cy - 20, 50, 60, 0, 0, Math.PI * 2);
            ctx.fill();
        }
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
    }

    _drawEnergyBurst(ctx, w, h, si) {
        if (this.energyBurst < 0.05) return;

        const cx = w / 2;
        const cy = h / 2 - 40;
        const burstSize = 150 * this.energyBurst;

        ctx.save();
        ctx.globalCompositeOperation = "screen";

        for (let i = 0; i < 12; i++) {
            const angle = (Math.PI * 2 * i) / 12 + this.phase;
            const len = burstSize * (0.5 + Math.random() * 0.5);
            const endX = cx + Math.cos(angle) * len;
            const endY = cy + Math.sin(angle) * len;

            const grad = ctx.createLinearGradient(cx, cy, endX, endY);
            grad.addColorStop(0, `rgba(0, 255, 255, ${0.4 * this.energyBurst})`);
            grad.addColorStop(0.5, `rgba(0, 200, 255, ${0.15 * this.energyBurst})`);
            grad.addColorStop(1, "transparent");

            ctx.strokeStyle = grad;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(endX, endY);
            ctx.stroke();
        }

        const ringGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, burstSize);
        ringGrad.addColorStop(0, `rgba(0, 255, 255, ${0.2 * this.energyBurst})`);
        ringGrad.addColorStop(0.5, `rgba(0, 200, 255, ${0.08 * this.energyBurst})`);
        ringGrad.addColorStop(1, "transparent");
        ctx.fillStyle = ringGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, burstSize, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}

const hologramCanvas = document.getElementById("hologram-canvas");
window.hologram = new Hologram(hologramCanvas);

class SplashHologram {
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
}

const splashCanvas = document.getElementById("splash-canvas");
if (splashCanvas) new SplashHologram(splashCanvas);