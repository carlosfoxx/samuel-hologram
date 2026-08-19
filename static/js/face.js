class FaceAvatar {
    constructor(canvas) {
        this.canvas = canvas;
        this.mode = "hologram";
        this.speaking = false;
        this.mouthOpen = 0;
        this.targetMouthOpen = 0;
        this.blinkTimer = 0;
        this.blinkAmount = 0;
        this.breathPhase = 0;
        this.headTiltX = 0;
        this.headTiltY = 0;
        this.targetTiltX = 0;
        this.targetTiltY = 0;
        this.audioCtx = null;
        this.analyser = null;
        this.audioData = null;
        this.photoTexture = null;
        this.holoMaterials = [];
        this.phase = 0;

        this._initThree();
        this._createFace();
        this._createLights();
        this._createParticles();
        this._loadPhoto();
        this._animate();
    }

    _initThree() {
        let w = this.canvas.clientWidth;
        let h = this.canvas.clientHeight;

        if (w < 10 || h < 10) {
            w = this.canvas.parentElement.clientWidth || 400;
            h = this.canvas.parentElement.clientHeight || 400;
        }

        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(35, w / h, 0.1, 100);
        this.camera.position.set(0, 0, 4);

        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            alpha: true,
            antialias: true,
        });
        this.renderer.setSize(w, h);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setClearColor(0x000000, 0);

        window.addEventListener("resize", () => {
            const w2 = this.canvas.clientWidth;
            const h2 = this.canvas.clientHeight;
            this.camera.aspect = w2 / h2;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(w2, h2);
        });
    }

    _createFace() {
        this.faceGroup = new THREE.Group();

        const headGeo = new THREE.SphereGeometry(1, 48, 48);
        headGeo.scale(1, 1.15, 0.95);

        this.headMaterial = new THREE.MeshPhongMaterial({
            color: 0x88ccff,
            emissive: 0x003366,
            transparent: true,
            opacity: 0.85,
            shininess: 80,
        });

        this.headMesh = new THREE.Mesh(headGeo, this.headMaterial);
        this.faceGroup.add(this.headMesh);

        this.headWireframe = new THREE.LineSegments(
            new THREE.WireframeGeometry(headGeo),
            new THREE.LineBasicMaterial({ color: 0x00ccff, transparent: true, opacity: 0.15 })
        );
        this.faceGroup.add(this.headWireframe);

        const eyeGeo = new THREE.SphereGeometry(0.08, 16, 16);
        const eyeMat = new THREE.MeshPhongMaterial({
            color: 0x00ffff,
            emissive: 0x006666,
            transparent: true,
            opacity: 0.9,
        });

        this.leftEye = new THREE.Mesh(eyeGeo, eyeMat);
        this.leftEye.position.set(-0.28, 0.15, 0.82);
        this.faceGroup.add(this.leftEye);

        this.rightEye = new THREE.Mesh(eyeGeo, eyeMat);
        this.rightEye.position.set(0.28, 0.15, 0.82);
        this.faceGroup.add(this.rightEye);

        const irisGeo = new THREE.SphereGeometry(0.04, 12, 12);
        const irisMat = new THREE.MeshPhongMaterial({
            color: 0x00ffff,
            emissive: 0x00ffff,
            transparent: true,
            opacity: 1,
        });

        this.leftIris = new THREE.Mesh(irisGeo, irisMat);
        this.leftIris.position.set(-0.28, 0.15, 0.89);
        this.faceGroup.add(this.leftIris);

        this.rightIris = new THREE.Mesh(irisGeo, irisMat);
        this.rightIris.position.set(0.28, 0.15, 0.89);
        this.faceGroup.add(this.rightIris);

        const eyelidGeo = new THREE.SphereGeometry(0.09, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.5);
        const eyelidMat = new THREE.MeshPhongMaterial({
            color: 0x88ccff,
            emissive: 0x003366,
            transparent: true,
            opacity: 0.85,
            side: THREE.DoubleSide,
        });

        this.leftEyelid = new THREE.Mesh(eyelidGeo, eyelidMat);
        this.leftEyelid.position.set(-0.28, 0.15, 0.82);
        this.leftEyelid.rotation.x = Math.PI;
        this.leftEyelid.scale.y = 0;
        this.faceGroup.add(this.leftEyelid);

        this.rightEyelid = new THREE.Mesh(eyelidGeo, eyelidMat);
        this.rightEyelid.position.set(0.28, 0.15, 0.82);
        this.rightEyelid.rotation.x = Math.PI;
        this.rightEyelid.scale.y = 0;
        this.faceGroup.add(this.rightEyelid);

        const browGeo = new THREE.BoxGeometry(0.15, 0.02, 0.05);
        const browMat = new THREE.MeshPhongMaterial({
            color: 0x00ccff,
            emissive: 0x004466,
            transparent: true,
            opacity: 0.7,
        });

        this.leftBrow = new THREE.Mesh(browGeo, browMat);
        this.leftBrow.position.set(-0.28, 0.32, 0.8);
        this.leftBrow.rotation.z = 0.1;
        this.faceGroup.add(this.leftBrow);

        this.rightBrow = new THREE.Mesh(browGeo, browMat);
        this.rightBrow.position.set(0.28, 0.32, 0.8);
        this.rightBrow.rotation.z = -0.1;
        this.faceGroup.add(this.rightBrow);

        const mouthShape = new THREE.Shape();
        mouthShape.moveTo(-0.12, 0);
        mouthShape.quadraticCurveTo(-0.06, -0.04, 0, -0.02);
        mouthShape.quadraticCurveTo(0.06, -0.04, 0.12, 0);
        mouthShape.quadraticCurveTo(0.06, 0.02, 0, 0.02);
        mouthShape.quadraticCurveTo(-0.06, 0.02, -0.12, 0);

        const mouthGeo = new THREE.ShapeGeometry(mouthShape);
        this.mouthMaterial = new THREE.MeshPhongMaterial({
            color: 0x00ffff,
            emissive: 0x006666,
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide,
        });

        this.mouth = new THREE.Mesh(mouthGeo, this.mouthMaterial);
        this.mouth.position.set(0, -0.25, 0.88);
        this.faceGroup.add(this.mouth);

        const mouthOpenGeo = new THREE.PlaneGeometry(0.18, 0.01);
        this.mouthOpenMat = new THREE.MeshPhongMaterial({
            color: 0x001122,
            emissive: 0x000011,
            transparent: true,
            opacity: 0,
            side: THREE.DoubleSide,
        });
        this.mouthOpen = new THREE.Mesh(mouthOpenGeo, this.mouthOpenMat);
        this.mouthOpen.position.set(0, -0.27, 0.87);
        this.faceGroup.add(this.mouthOpen);

        const noseGeo = new THREE.ConeGeometry(0.03, 0.1, 8);
        const noseMat = new THREE.MeshPhongMaterial({
            color: 0x88ccff,
            emissive: 0x003366,
            transparent: true,
            opacity: 0.6,
        });
        this.nose = new THREE.Mesh(noseGeo, noseMat);
        this.nose.position.set(0, -0.02, 0.9);
        this.nose.rotation.x = Math.PI * 0.4;
        this.faceGroup.add(this.nose);

        this.scene.add(this.faceGroup);
    }

    _createLights() {
        const ambient = new THREE.AmbientLight(0x003366, 0.5);
        this.scene.add(ambient);

        const mainLight = new THREE.DirectionalLight(0x00ccff, 1.2);
        mainLight.position.set(2, 3, 4);
        this.scene.add(mainLight);

        const rimLight = new THREE.DirectionalLight(0x0066ff, 0.6);
        rimLight.position.set(-2, 1, -2);
        this.scene.add(rimLight);

        const fillLight = new THREE.PointLight(0x0088ff, 0.4, 10);
        fillLight.position.set(0, -1, 2);
        this.scene.add(fillLight);
    }

    _createParticles() {
        const count = 200;
        const positions = new Float32Array(count * 3);
        const colors = new Float32Array(count * 3);

        for (let i = 0; i < count; i++) {
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            const r = 1.3 + Math.random() * 0.8;

            positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
            positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
            positions[i * 3 + 2] = r * Math.cos(phi);

            colors[i * 3] = 0;
            colors[i * 3 + 1] = 0.7 + Math.random() * 0.3;
            colors[i * 3 + 2] = 1;
        }

        const geo = new THREE.BufferGeometry();
        geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));

        this.particleMat = new THREE.PointsMaterial({
            size: 0.015,
            vertexColors: true,
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending,
        });

        this.particles = new THREE.Points(geo, this.particleMat);
        this.scene.add(this.particles);
    }

    _loadPhoto() {
        const texLoader = new THREE.TextureLoader();
        texLoader.load("/media/samuel-benchimol.webp", (texture) => {
            this.photoTexture = texture;
            this.photoTexture.colorSpace = THREE.SRGBColorSpace;
        });
    }

    setMode(mode) {
        this.mode = mode;
        if (mode === "hologram") {
            this.headMaterial.color.setHex(0x88ccff);
            this.headMaterial.emissive.setHex(0x003366);
            this.headMaterial.map = null;
            this.headMaterial.opacity = 0.85;
            this.headWireframe.visible = true;
            this.particleMat.opacity = 0.6;
        } else if (mode === "human") {
            if (this.photoTexture) {
                this.headMaterial.map = this.photoTexture;
                this.headMaterial.color.setHex(0xffffff);
                this.headMaterial.emissive.setHex(0x111111);
                this.headMaterial.opacity = 1;
            }
            this.headWireframe.visible = false;
            this.particleMat.opacity = 0.15;
        }
        this.headMaterial.needsUpdate = true;
    }

    setupAudio(audioCtx, analyser) {
        this.audioCtx = audioCtx;
        this.analyser = analyser;
        this.audioData = new Uint8Array(analyser.frequencyBinCount);
    }

    setSpeaking(val) {
        this.speaking = val;
    }

    setMouthOpen(val) {
        this.targetMouthOpen = Math.min(val, 1);
    }

    _animate() {
        requestAnimationFrame(() => this._animate());

        this.phase += 0.02;
        this.breathPhase += 0.03;

        this.blinkTimer++;
        if (this.blinkTimer > 180 + Math.random() * 120) {
            this.blinkTimer = 0;
            this.blinkAmount = 1;
        }
        if (this.blinkAmount > 0) {
            this.blinkAmount -= 0.08;
            if (this.blinkAmount < 0) this.blinkAmount = 0;
        }

        this.leftEyelid.scale.y = this.blinkAmount * 1.2;
        this.rightEyelid.scale.y = this.blinkAmount * 1.2;

        if (Math.random() < 0.01) {
            this.targetTiltX = (Math.random() - 0.5) * 0.1;
            this.targetTiltY = (Math.random() - 0.5) * 0.15;
        }
        this.headTiltX += (this.targetTiltX - this.headTiltX) * 0.03;
        this.headTiltY += (this.targetTiltY - this.headTiltY) * 0.03;

        if (this.speaking && this.analyser) {
            this.analyser.getByteFrequencyData(this.audioData);
            let sum = 0;
            for (let i = 0; i < 20; i++) sum += this.audioData[i];
            const avg = sum / 20 / 255;
            this.targetMouthOpen = avg * 1.5;
        }

        this.mouthOpen += (this.targetMouthOpen - this.mouthOpen) * 0.15;
        this.mouthOpenMat.opacity = this.mouthOpen * 0.9;
        this.mouthOpen.scale.y = 0.5 + this.mouthOpen * 2;

        const breath = Math.sin(this.breathPhase) * 0.005;
        this.faceGroup.rotation.x = this.headTiltX + breath;
        this.faceGroup.rotation.y = this.headTiltY;
        this.faceGroup.rotation.z = Math.sin(this.phase * 0.5) * 0.01;

        this.leftBrow.position.y = 0.32 + (this.speaking ? Math.sin(this.phase * 4) * 0.01 : 0);
        this.rightBrow.position.y = 0.32 + (this.speaking ? Math.sin(this.phase * 4 + 1) * 0.01 : 0);

        this.particles.rotation.y += 0.002;
        this.particles.rotation.x += 0.001;

        const pulse = 0.5 + Math.sin(this.phase * 2) * 0.1;
        this.particleMat.opacity = this.mode === "hologram" ? pulse : 0.15;

        if (!this.speaking) {
            this.targetMouthOpen *= 0.9;
        }

        this.renderer.render(this.scene, this.camera);
    }

    dispose() {
        this.renderer.dispose();
    }
}
