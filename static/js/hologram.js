class Hologram {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");
        this.phase = 0;
        this.speaking = false;
        this.image = null;
        this.imageLoaded = false;
        this.particles = [];
        this.scanY = 0;

        this._initParticles();
        this._loadImage();
        this._resize();
        window.addEventListener("resize", () => this._resize());
        this._animate();
    }

    _initParticles() {
        for (let i = 0; i < 40; i++) {
            this.particles.push({
                x: Math.random(),
                y: Math.random(),
                speed: 0.002 + Math.random() * 0.006,
                size: 1 + Math.random() * 2.5,
                alpha: 40 + Math.random() * 120,
            });
        }
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
        this.phase += 0.08;
        this.scanY = (this.scanY + 1.5) % this.h;

        this._updateParticles();
        this._draw();
        requestAnimationFrame(() => this._animate());
    }

    _updateParticles() {
        for (const p of this.particles) {
            p.y -= p.speed;
            if (p.y < -0.05) {
                p.y = 1.05;
                p.x = Math.random();
            }
        }
    }

    _draw() {
        const ctx = this.ctx;
        const w = this.w;
        const h = this.h;

        ctx.clearRect(0, 0, w, h);
        this._drawBackground(ctx, w, h);
        this._drawBaseGlow(ctx, w, h);
        this._drawAvatar(ctx, w, h);
        this._drawScanLines(ctx, w, h);
        this._drawParticles(ctx, w, h);
        this._drawSpeakingWaves(ctx, w, h);
    }

    _drawBackground(ctx, w, h) {
        const grad = ctx.createRadialGradient(w / 2, h * 0.6, 0, w / 2, h * 0.6, w * 0.8);
        grad.addColorStop(0, "rgba(0, 40, 80, 0.12)");
        grad.addColorStop(1, "transparent");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
    }

    _drawBaseGlow(ctx, w, h) {
        const intensity = this.speaking ? 0.8 : 0.5;
        const baseY = h - 50;

        const grad = ctx.createRadialGradient(w / 2, baseY, 0, w / 2, baseY, 140);
        grad.addColorStop(0, `rgba(0, 200, 255, ${0.4 * intensity})`);
        grad.addColorStop(0.5, `rgba(0, 100, 200, ${0.15 * intensity})`);
        grad.addColorStop(1, "transparent");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.ellipse(w / 2, baseY, 140, 20, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = `rgba(0, 180, 255, ${0.3 * intensity})`;
        ctx.lineWidth = 1;
        for (let i = 0; i < 4; i++) {
            const offset = i * 18;
            ctx.beginPath();
            ctx.moveTo(w / 2 - 110 + offset * 2, baseY - 8 - offset);
            ctx.lineTo(w / 2 + 110 - offset * 2, baseY - 8 - offset);
            ctx.stroke();
        }
    }

    _drawAvatar(ctx, w, h) {
        const glowIntensity = this.speaking ? 0.8 : 0.5;

        if (this.imageLoaded) {
            const maxH = h * 0.6;
            const ratio = this.image.width / this.image.height;
            let imgW = maxH * ratio;
            let imgH = maxH;
            if (imgW > w * 0.7) {
                imgW = w * 0.7;
                imgH = imgW / ratio;
            }
            const x = (w - imgW) / 2;
            const y = h / 2 - imgH / 2 - 30;

            ctx.save();
            ctx.globalAlpha = 0.3 + 0.3 * glowIntensity;
            ctx.drawImage(this.image, x, y, imgW, imgH);
            ctx.restore();

            ctx.save();
            ctx.globalAlpha = 0.15 + 0.15 * glowIntensity;
            ctx.filter = `hue-rotate(190deg) saturate(2) brightness(1.5)`;
            ctx.drawImage(this.image, x, y, imgW, imgH);
            ctx.restore();

            const tintGrad = ctx.createLinearGradient(x, y, x, y + imgH);
            tintGrad.addColorStop(0, `rgba(0, 180, 255, ${0.1 * glowIntensity})`);
            tintGrad.addColorStop(0.5, `rgba(0, 220, 255, ${0.05 * glowIntensity})`);
            tintGrad.addColorStop(1, `rgba(0, 100, 200, ${0.15 * glowIntensity})`);
            ctx.save();
            ctx.globalCompositeOperation = "screen";
            ctx.fillStyle = tintGrad;
            ctx.fillRect(x, y, imgW, imgH);
            ctx.restore();
        } else {
            const cx = w / 2;
            const cy = h / 2 - 30;
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

    _drawScanLines(ctx, w, h) {
        ctx.strokeStyle = "rgba(0, 200, 255, 0.06)";
        ctx.lineWidth = 1;
        for (let y = 0; y < h; y += 3) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
            ctx.stroke();
        }

        const scanGrad = ctx.createLinearGradient(0, this.scanY - 15, 0, this.scanY + 15);
        scanGrad.addColorStop(0, "transparent");
        scanGrad.addColorStop(0.5, "rgba(0, 255, 255, 0.15)");
        scanGrad.addColorStop(1, "transparent");
        ctx.fillStyle = scanGrad;
        ctx.fillRect(0, this.scanY - 15, w, 30);

        ctx.strokeStyle = `rgba(0, 255, 255, ${this.speaking ? 0.4 : 0.2})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, this.scanY);
        ctx.lineTo(w, this.scanY);
        ctx.stroke();
    }

    _drawParticles(ctx, w, h) {
        const intensity = this.speaking ? 0.8 : 0.5;
        for (const p of this.particles) {
            const x = p.x * w;
            const y = p.y * h;
            const alpha = (p.alpha / 255) * intensity;
            ctx.fillStyle = `rgba(0, 200, 255, ${alpha})`;
            ctx.beginPath();
            ctx.arc(x, y, p.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    _drawSpeakingWaves(ctx, w, h) {
        if (!this.speaking) return;

        const cx = w / 2;
        const cy = h / 2 - 30;
        const intensity = 0.15 + 0.1 * Math.sin(this.phase * 3);

        ctx.strokeStyle = `rgba(0, 200, 255, ${intensity})`;
        ctx.lineWidth = 1;
        for (let i = 0; i < 5; i++) {
            const offset = 20 * Math.sin(this.phase + i * 0.6);
            const r = 90 + i * 45 + offset;
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.stroke();
        }
    }
}

const hologramCanvas = document.getElementById("hologram-canvas");
window.hologram = new Hologram(hologramCanvas);
