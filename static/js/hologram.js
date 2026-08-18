class Hologram {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");
        this.phase = 0;
        this.speaking = false;
        this.image = null;
        this.imageLoaded = false;
        this.particles = [];
        this.dataStreams = [];
        this.scanY = 0;
        this.glitchTimer = 0;
        this.glitchActive = false;
        this.glitchOffset = 0;
        this.orbitAngle = 0;

        this._initParticles();
        this._initDataStreams();
        this._loadImage();
        this._resize();
        window.addEventListener("resize", () => this._resize());
        this._animate();
    }

    _initParticles() {
        for (let i = 0; i < 80; i++) {
            this.particles.push({
                x: Math.random(),
                y: Math.random(),
                speed: 0.001 + Math.random() * 0.005,
                size: 0.5 + Math.random() * 3,
                alpha: 30 + Math.random() * 150,
                type: Math.random() > 0.7 ? "orbit" : "float",
                orbitRadius: 80 + Math.random() * 150,
                orbitSpeed: 0.005 + Math.random() * 0.015,
                orbitOffset: Math.random() * Math.PI * 2,
            });
        }
    }

    _initDataStreams() {
        for (let i = 0; i < 12; i++) {
            this.dataStreams.push({
                x: Math.random(),
                y: Math.random(),
                speed: 0.003 + Math.random() * 0.008,
                chars: this._randomChars(),
                alpha: 20 + Math.random() * 60,
                size: 9 + Math.floor(Math.random() * 4),
            });
        }
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

    setSpeaking(val) {
        this.speaking = val;
    }

    _animate() {
        this.phase += 0.06;
        this.scanY = (this.scanY + 2) % this.h;
        this.orbitAngle += 0.008;

        if (Math.random() < 0.005) {
            this.glitchActive = true;
            this.glitchTimer = 5 + Math.floor(Math.random() * 10);
        }
        if (this.glitchActive) {
            this.glitchTimer--;
            this.glitchOffset = (Math.random() - 0.5) * 20;
            if (this.glitchTimer <= 0) {
                this.glitchActive = false;
                this.glitchOffset = 0;
            }
        }

        this._updateParticles();
        this._updateDataStreams();
        this._draw();
        requestAnimationFrame(() => this._animate());
    }

    _updateParticles() {
        for (const p of this.particles) {
            if (p.type === "orbit") {
                // orbiting particles handled in draw
            } else {
                p.y -= p.speed;
                if (p.y < -0.05) {
                    p.y = 1.05;
                    p.x = Math.random();
                }
            }
        }
    }

    _updateDataStreams() {
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
        this._drawHexGrid(ctx, w, h);
        this._drawProjectionBeam(ctx, w, h);
        this._drawBasePlatform(ctx, w, h);
        this._drawOrbitalRing(ctx, w, h);
        this._drawAvatar(ctx, w, h);
        this._drawDataStreams(ctx, w, h);
        this._drawScanLines(ctx, w, h);
        this._drawParticles(ctx, w, h);
        this._drawHUD(ctx, w, h);
        this._drawSpeakingWaves(ctx, w, h);
    }

    _drawHexGrid(ctx, w, h) {
        const size = 30;
        const hDist = size * 1.73;
        const vDist = size * 1.5;
        ctx.strokeStyle = `rgba(0, 120, 200, 0.04)`;
        ctx.lineWidth = 0.5;

        for (let row = -1; row < h / vDist + 1; row++) {
            for (let col = -1; col < w / hDist + 1; col++) {
                const x = col * hDist + (row % 2 ? hDist / 2 : 0);
                const y = row * vDist;
                this._drawHex(ctx, x, y, size);
            }
        }
    }

    _drawHex(ctx, cx, cy, size) {
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i - Math.PI / 6;
            const x = cx + size * Math.cos(angle);
            const y = cy + size * Math.sin(angle);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.stroke();
    }

    _drawProjectionBeam(ctx, w, h) {
        const cx = w / 2;
        const baseY = h - 55;
        const topY = h * 0.1;
        const beamWidth = w * 0.25;
        const intensity = this.speaking ? 0.12 : 0.06;

        const grad = ctx.createLinearGradient(cx, baseY, cx, topY);
        grad.addColorStop(0, `rgba(0, 200, 255, ${intensity * 1.5})`);
        grad.addColorStop(0.3, `rgba(0, 180, 255, ${intensity})`);
        grad.addColorStop(0.7, `rgba(0, 150, 255, ${intensity * 0.5})`);
        grad.addColorStop(1, "transparent");

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(cx - 25, baseY);
        ctx.lineTo(cx - beamWidth, topY);
        ctx.lineTo(cx + beamWidth, topY);
        ctx.lineTo(cx + 25, baseY);
        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.restore();

        ctx.strokeStyle = `rgba(0, 200, 255, ${intensity * 0.8})`;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(cx - 25, baseY);
        ctx.lineTo(cx - beamWidth, topY);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx + 25, baseY);
        ctx.lineTo(cx + beamWidth, topY);
        ctx.stroke();
    }

    _drawBasePlatform(ctx, w, h) {
        const cx = w / 2;
        const baseY = h - 50;
        const intensity = this.speaking ? 0.9 : 0.5;

        const grad = ctx.createRadialGradient(cx, baseY, 0, cx, baseY, 160);
        grad.addColorStop(0, `rgba(0, 220, 255, ${0.5 * intensity})`);
        grad.addColorStop(0.3, `rgba(0, 150, 255, ${0.2 * intensity})`);
        grad.addColorStop(0.7, `rgba(0, 80, 200, ${0.05 * intensity})`);
        grad.addColorStop(1, "transparent");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.ellipse(cx, baseY, 160, 25, 0, 0, Math.PI * 2);
        ctx.fill();

        for (let r = 0; r < 3; r++) {
            const radius = 40 + r * 40;
            const rot = this.phase * (r % 2 ? 1 : -1) * 0.5;
            ctx.save();
            ctx.translate(cx, baseY);
            ctx.rotate(rot);
            ctx.strokeStyle = `rgba(0, 200, 255, ${0.25 * intensity * (1 - r * 0.25)})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.ellipse(0, 0, radius, radius * 0.15, 0, 0, Math.PI * 2);
            ctx.stroke();

            const dotAngle = this.phase * (r % 2 ? 1.5 : -1.5);
            const dx = radius * Math.cos(dotAngle);
            const dy = radius * 0.15 * Math.sin(dotAngle);
            ctx.fillStyle = `rgba(0, 255, 255, ${0.8 * intensity})`;
            ctx.beginPath();
            ctx.arc(dx, dy, 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        ctx.strokeStyle = `rgba(0, 180, 255, ${0.3 * intensity})`;
        ctx.lineWidth = 1;
        for (let i = 0; i < 5; i++) {
            const offset = i * 14;
            ctx.beginPath();
            ctx.moveTo(cx - 130 + offset * 2, baseY - 4 - offset);
            ctx.lineTo(cx + 130 - offset * 2, baseY - 4 - offset);
            ctx.stroke();
        }
    }

    _drawOrbitalRing(ctx, w, h) {
        if (!this.imageLoaded) return;

        const cx = w / 2;
        const cy = h / 2 - 40;
        const rx = 160;
        const ry = 40;
        const intensity = this.speaking ? 0.6 : 0.3;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(this.orbitAngle);

        ctx.strokeStyle = `rgba(0, 200, 255, ${0.15 * intensity})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
        ctx.stroke();

        for (let i = 0; i < 3; i++) {
            const a = this.orbitAngle * 2 + (i * Math.PI * 2) / 3;
            const px = rx * Math.cos(a);
            const py = ry * Math.sin(a);
            ctx.fillStyle = `rgba(0, 255, 255, ${0.9 * intensity})`;
            ctx.beginPath();
            ctx.arc(px, py, 2.5, 0, Math.PI * 2);
            ctx.fill();

            const glow = ctx.createRadialGradient(px, py, 0, px, py, 8);
            glow.addColorStop(0, `rgba(0, 200, 255, ${0.4 * intensity})`);
            glow.addColorStop(1, "transparent");
            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.arc(px, py, 8, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }

    _drawAvatar(ctx, w, h) {
        const cx = w / 2;
        const cy = h / 2 - 40;
        const glowIntensity = this.speaking ? 0.9 : 0.55;

        if (this.imageLoaded) {
            const maxH = h * 0.55;
            const ratio = this.image.width / this.image.height;
            let imgW = maxH * ratio;
            let imgH = maxH;
            if (imgW > w * 0.6) {
                imgW = w * 0.6;
                imgH = imgW / ratio;
            }
            let x = (w - imgW) / 2;
            let y = h / 2 - imgH / 2 - 40;

            if (this.glitchActive) {
                x += this.glitchOffset;
            }

            ctx.save();
            ctx.globalAlpha = 0.25 + 0.35 * glowIntensity;
            ctx.drawImage(this.image, x, y, imgW, imgH);
            ctx.restore();

            ctx.save();
            ctx.globalAlpha = 0.12 + 0.18 * glowIntensity;
            ctx.filter = "hue-rotate(190deg) saturate(2.5) brightness(1.8)";
            ctx.drawImage(this.image, x, y, imgW, imgH);
            ctx.restore();

            if (this.glitchActive) {
                ctx.save();
                ctx.globalAlpha = 0.3;
                ctx.drawImage(this.image, x + 4, y, imgW, imgH);
                ctx.restore();
                ctx.save();
                ctx.globalAlpha = 0.2;
                ctx.drawImage(this.image, x - 4, y, imgW, imgH);
                ctx.restore();
            }

            const tintGrad = ctx.createLinearGradient(x, y, x, y + imgH);
            tintGrad.addColorStop(0, `rgba(0, 200, 255, ${0.12 * glowIntensity})`);
            tintGrad.addColorStop(0.4, `rgba(0, 240, 255, ${0.04 * glowIntensity})`);
            tintGrad.addColorStop(1, `rgba(0, 80, 200, ${0.18 * glowIntensity})`);
            ctx.save();
            ctx.globalCompositeOperation = "screen";
            ctx.fillStyle = tintGrad;
            ctx.fillRect(x, y, imgW, imgH);
            ctx.restore();

            ctx.strokeStyle = `rgba(0, 200, 255, ${0.08 * glowIntensity})`;
            ctx.lineWidth = 1;
            const lineSpacing = 4;
            for (let ly = y; ly < y + imgH; ly += lineSpacing) {
                ctx.beginPath();
                ctx.moveTo(x, ly);
                ctx.lineTo(x + imgW, ly);
                ctx.stroke();
            }

            const borderAlpha = 0.15 + 0.1 * Math.sin(this.phase * 2);
            ctx.strokeStyle = `rgba(0, 220, 255, ${borderAlpha})`;
            ctx.lineWidth = 1.5;
            ctx.strokeRect(x - 2, y - 2, imgW + 4, imgH + 4);

            const cornerSize = 12;
            ctx.strokeStyle = `rgba(0, 255, 255, ${0.5 * glowIntensity})`;
            ctx.lineWidth = 2;
            [[x, y], [x + imgW, y], [x, y + imgH], [x + imgW, y + imgH]].forEach(([px, py], i) => {
                const dx = i % 2 === 0 ? 1 : -1;
                const dy = i < 2 ? 1 : -1;
                ctx.beginPath();
                ctx.moveTo(px + dx * cornerSize, py);
                ctx.lineTo(px, py);
                ctx.lineTo(px, py + dy * cornerSize);
                ctx.stroke();
            });
        } else {
            const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 80);
            grad.addColorStop(0, `rgba(0, 200, 255, ${0.3 * glowIntensity})`);
            grad.addColorStop(1, "transparent");
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.ellipse(cx, cy - 20, 50, 60, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(cx, cy + 60, 70, 50, 0, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    _drawDataStreams(ctx, w, h) {
        ctx.save();
        for (const s of this.dataStreams) {
            const x = s.x * w;
            const startY = s.y * h;
            ctx.fillStyle = `rgba(0, 200, 255, ${s.alpha / 255})`;
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

    _drawScanLines(ctx, w, h) {
        ctx.save();
        for (let y = 0; y < h; y += 3) {
            ctx.fillStyle = "rgba(0, 150, 255, 0.025)";
            ctx.fillRect(0, y, w, 1);
        }

        const scanH = 40;
        const scanGrad = ctx.createLinearGradient(0, this.scanY - scanH / 2, 0, this.scanY + scanH / 2);
        scanGrad.addColorStop(0, "transparent");
        scanGrad.addColorStop(0.4, "rgba(0, 255, 255, 0.08)");
        scanGrad.addColorStop(0.5, "rgba(0, 255, 255, 0.18)");
        scanGrad.addColorStop(0.6, "rgba(0, 255, 255, 0.08)");
        scanGrad.addColorStop(1, "transparent");
        ctx.fillStyle = scanGrad;
        ctx.fillRect(0, this.scanY - scanH / 2, w, scanH);

        ctx.strokeStyle = `rgba(0, 255, 255, ${this.speaking ? 0.5 : 0.25})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, this.scanY);
        ctx.lineTo(w, this.scanY);
        ctx.stroke();
        ctx.restore();
    }

    _drawParticles(ctx, w, h) {
        const intensity = this.speaking ? 0.9 : 0.5;
        const cx = w / 2;
        const cy = h / 2 - 40;

        for (const p of this.particles) {
            let px, py;
            if (p.type === "orbit") {
                const angle = this.phase * p.orbitSpeed * 10 + p.orbitOffset;
                px = cx + p.orbitRadius * Math.cos(angle);
                py = cy + p.orbitRadius * 0.3 * Math.sin(angle);
            } else {
                px = p.x * w;
                py = p.y * h;
            }

            const alpha = (p.alpha / 255) * intensity;
            ctx.fillStyle = `rgba(0, 200, 255, ${alpha})`;
            ctx.beginPath();
            ctx.arc(px, py, p.size, 0, Math.PI * 2);
            ctx.fill();

            if (p.size > 2) {
                const glow = ctx.createRadialGradient(px, py, 0, px, py, p.size * 3);
                glow.addColorStop(0, `rgba(0, 200, 255, ${alpha * 0.4})`);
                glow.addColorStop(1, "transparent");
                ctx.fillStyle = glow;
                ctx.beginPath();
                ctx.arc(px, py, p.size * 3, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    _drawHUD(ctx, w, h) {
        const cx = w / 2;
        const cy = h / 2 - 40;
        const intensity = this.speaking ? 0.7 : 0.35;

        ctx.save();
        ctx.translate(cx, cy);

        for (let r = 0; r < 2; r++) {
            const radius = 120 + r * 50;
            const rot = this.phase * 0.3 * (r % 2 ? 1 : -1);
            ctx.strokeStyle = `rgba(0, 180, 255, ${0.12 * intensity})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.arc(0, 0, radius, rot, rot + Math.PI * 0.8);
            ctx.stroke();
        }

        const tickCount = 36;
        for (let i = 0; i < tickCount; i++) {
            const angle = (Math.PI * 2 * i) / tickCount;
            const inner = 105;
            const outer = i % 3 === 0 ? 115 : 110;
            ctx.strokeStyle = `rgba(0, 200, 255, ${0.2 * intensity})`;
            ctx.lineWidth = i % 3 === 0 ? 1.5 : 0.5;
            ctx.beginPath();
            ctx.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
            ctx.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
            ctx.stroke();
        }

        const textAngle = this.phase * 0.5;
        const tx = 135 * Math.cos(textAngle);
        const ty = 135 * Math.sin(textAngle);
        ctx.fillStyle = `rgba(0, 220, 255, ${0.5 * intensity})`;
        ctx.font = "9px monospace";
        ctx.fillText("BENCHIMOL", tx - 25, ty);

        ctx.restore();
    }

    _drawSpeakingWaves(ctx, w, h) {
        if (!this.speaking) return;

        const cx = w / 2;
        const cy = h / 2 - 40;
        const intensity = 0.2 + 0.15 * Math.sin(this.phase * 4);

        for (let i = 0; i < 7; i++) {
            const offset = 15 * Math.sin(this.phase * 2 + i * 0.7);
            const r = 100 + i * 35 + offset;
            const alpha = intensity * (1 - i * 0.12);
            ctx.strokeStyle = `rgba(0, 200, 255, ${Math.max(alpha, 0)})`;
            ctx.lineWidth = 1.5 - i * 0.15;
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.stroke();
        }

        for (let i = 0; i < 20; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = 80 + Math.random() * 120;
            const px = cx + Math.cos(angle) * dist;
            const py = cy + Math.sin(angle) * dist * 0.4;
            const size = 0.5 + Math.random() * 2;
            ctx.fillStyle = `rgba(0, 255, 255, ${0.3 + Math.random() * 0.5})`;
            ctx.beginPath();
            ctx.arc(px, py, size, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

const hologramCanvas = document.getElementById("hologram-canvas");
window.hologram = new Hologram(hologramCanvas);
