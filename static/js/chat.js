const chatMessages = document.getElementById("chat-messages");
const chatInput = document.getElementById("chat-input");
const sendBtn = document.getElementById("send-btn");
const micBtn = document.getElementById("mic-btn");
const micBtnSmall = document.getElementById("mic-btn-small");
const ttsToggle = document.getElementById("tts-toggle");
const resetBtn = document.getElementById("reset-btn");
const modeVoice = document.getElementById("mode-voice");
const modeText = document.getElementById("mode-text");
const voiceMode = document.getElementById("voice-mode");
const textMode = document.getElementById("text-mode");
const voiceStatus = document.getElementById("voice-status");
const voiceStatusText = document.getElementById("voice-status-text");
const visualModeBtn = document.getElementById("visual-mode-btn");

let ttsEnabled = true;
let speaking = false;
let currentMode = "voice";
let recognition = null;
let isListening = false;
let lipSyncTimeout = null;

let faceAvatar = null;
let audioCtx = null;
let analyser = null;
let audioSource = null;
let visualMode = "hologram";

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const sttSupported = !!SpeechRecognition;

function initSpeechRecognition() {
    if (!sttSupported) {
        voiceStatusText.textContent = "Voz indisponível - use o modo texto";
        micBtn.disabled = true;
        micBtn.style.opacity = "0.3";
        switchMode("text");
        return;
    }

    recognition = new SpeechRecognition();
    recognition.lang = "pt-BR";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
        isListening = true;
        voiceStatus.classList.add("listening");
        micBtn.classList.add("active");
        voiceStatusText.textContent = "Ouvindo...";
    };

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        voiceStatusText.textContent = "Processando...";
        sendMessageText(transcript.trim());
    };

    recognition.onerror = (event) => {
        console.log("Speech error:", event.error);
        stopListening();

        if (event.error === "not-allowed") {
            voiceStatusText.textContent = "Permissão negada - ative o microfone";
        } else if (event.error === "no-speech") {
            voiceStatusText.textContent = "Nenhuma fala detectada. Tente novamente.";
        } else {
            voiceStatusText.textContent = "Erro. Toque para tentar novamente.";
        }
    };

    recognition.onend = () => {
        stopListening();
    };
}

function startListening() {
    if (!recognition || isListening) return;
    try {
        recognition.start();
    } catch (e) {
        console.log("Recognition already started");
    }
}

function stopListening() {
    isListening = false;
    voiceStatus.classList.remove("listening");
    micBtn.classList.remove("active");
    if (voiceStatusText.textContent === "Ouvindo..." ||
        voiceStatusText.textContent === "Processando...") {
        voiceStatusText.textContent = "Toque para falar";
    }
}

function switchMode(mode) {
    currentMode = mode;

    if (mode === "voice") {
        voiceMode.style.display = "flex";
        textMode.style.display = "none";
        modeVoice.classList.add("active");
        modeText.classList.remove("active");
        if (recognition) {
            voiceStatusText.textContent = "Toque para falar";
        }
    } else {
        voiceMode.style.display = "none";
        textMode.style.display = "flex";
        modeVoice.classList.remove("active");
        modeText.classList.add("active");
        if (isListening && recognition) {
            recognition.stop();
        }
        chatInput.focus();
    }
}

function addMessage(text, isUser) {
    const div = document.createElement("div");
    div.className = `message ${isUser ? "user" : "hologram"}`;

    const sender = document.createElement("div");
    sender.className = "sender";
    sender.textContent = isUser ? "Voce" : "Prof. Samuel Benchimol (Holograma)";

    const body = document.createElement("div");
    body.textContent = text;

    div.appendChild(sender);
    div.appendChild(body);
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    return div;
}

function showTyping() {
    const div = document.createElement("div");
    div.className = "typing-indicator";
    div.id = "typing";
    div.innerHTML = "<span></span><span></span><span></span>";
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function hideTyping() {
    const el = document.getElementById("typing");
    if (el) el.remove();
}

function initAudio() {
    if (audioCtx) return;
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.5;

    if (faceAvatar) {
        faceAvatar.setupAudio(audioCtx, analyser);
    }
}

function speak(text) {
    if (!ttsEnabled || !window.speechSynthesis) return;

    window.speechSynthesis.cancel();

    const cleaned = text.replace(/\*[^*]+\*/g, "").replace(/\([^)]*\)/g, "").replace(/\s+/g, " ").trim();
    if (!cleaned) return;

    const utterance = new SpeechSynthesisUtterance(cleaned);
    utterance.lang = "pt-BR";
    utterance.rate = 1.1;
    utterance.pitch = 0.75;
    utterance.volume = 1.0;

    const voices = window.speechSynthesis.getVoices();

    const masculineNames = [
        "antonio", "daniel", "francisco", "ricardo", "fernando",
        "paulo", "joao", "carlos", "rodrigo", "andré",
        "male", "homme", "masculin",
    ];

    const feminineNames = [
        "francisca", "helena", "heloi", "maria", "ana", "julia",
        "female", "femme", "feminin",
    ];

    let chosen = null;

    const ptBRVoices = voices.filter(v => v.lang === "pt-BR");
    const ptVoices = voices.filter(v => v.lang.startsWith("pt") && v.lang !== "pt-BR");

    for (const v of ptBRVoices) {
        const name = v.name.toLowerCase();
        if (masculineNames.some(m => name.includes(m))) {
            chosen = v;
            break;
        }
    }

    if (!chosen) {
        for (const v of ptBRVoices) {
            const name = v.name.toLowerCase();
            if (!feminineNames.some(f => name.includes(f))) {
                chosen = v;
                break;
            }
        }
    }

    if (!chosen && ptBRVoices.length > 0) {
        chosen = ptBRVoices[0];
    }

    if (!chosen) {
        for (const v of ptVoices) {
            const name = v.name.toLowerCase();
            if (masculineNames.some(m => name.includes(m))) {
                chosen = v;
                break;
            }
        }
    }

    if (!chosen) chosen = ptVoices[0] || ptBRVoices[0] || voices.find(v => v.lang.startsWith("pt"));

    if (chosen) {
        utterance.voice = chosen;
        const name = chosen.name.toLowerCase();
        if (feminineNames.some(f => name.includes(f))) {
            utterance.pitch = 0.6;
            utterance.rate = 1.05;
        }
    }

    utterance.onstart = () => {
        speaking = true;
        if (faceAvatar) faceAvatar.setSpeaking(true);
        if (window.hologram) window.hologram.setSpeaking(true);
    };

    utterance.onend = () => {
        speaking = false;
        if (faceAvatar) {
            faceAvatar.setSpeaking(false);
            faceAvatar.setMouthOpen(0);
        }
        if (window.hologram) {
            window.hologram.setSpeaking(false);
            window.hologram.setMouthOpen(0);
        }
    };

    utterance.onerror = () => {
        speaking = false;
        if (faceAvatar) {
            faceAvatar.setSpeaking(false);
            faceAvatar.setMouthOpen(0);
        }
        if (window.hologram) {
            window.hologram.setSpeaking(false);
            window.hologram.setMouthOpen(0);
        }
    };

    window.speechSynthesis.speak(utterance);
}

async function speakWithVideo(text) {
    try {
        const res = await fetch("/api/speak", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text }),
        });

        if (res.ok) {
            const contentType = res.headers.get("content-type");
            if (contentType && contentType.includes("video")) {
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);

                const videoDiv = document.createElement("div");
                videoDiv.className = "message hologram";

                const sender = document.createElement("div");
                sender.className = "sender";
                sender.textContent = "Prof. Samuel Benchimol (Holograma)";

                const video = document.createElement("video");
                video.src = url;
                video.controls = true;
                video.autoplay = true;
                video.loop = false;
                video.style.maxWidth = "100%";
                video.style.borderRadius = "4px";

                video.onplay = () => {
                    speaking = true;
                    if (faceAvatar) faceAvatar.setSpeaking(true);
                    if (window.hologram) window.hologram.setSpeaking(true);
                };

                video.onended = () => {
                    speaking = false;
                    if (faceAvatar) {
                        faceAvatar.setSpeaking(false);
                        faceAvatar.setMouthOpen(0);
                    }
                    if (window.hologram) {
                        window.hologram.setSpeaking(false);
                        window.hologram.setMouthOpen(0);
                    }
                };

                videoDiv.appendChild(sender);
                videoDiv.appendChild(video);
                chatMessages.appendChild(videoDiv);
                chatMessages.scrollTop = chatMessages.scrollHeight;
                return true;
            }
        }
    } catch (err) {
        console.log("Video falhou, usando TTS:", err);
    }
    return false;
}

async function sendMessageText(text) {
    if (!text) return;

    addMessage(text, true);
    showTyping();

    try {
        const res = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: text }),
        });

        const data = await res.json();
        hideTyping();

        if (data.response) {
            addMessage(data.response, false);
            const usedVideo = await speakWithVideo(data.response);
            if (!usedVideo) {
                speak(data.response);
            }
        } else if (data.error) {
            addMessage(`Erro: ${data.error}`, false);
        }
    } catch (err) {
        hideTyping();
        addMessage("Erro ao conectar com o servidor.", false);
    }

    voiceStatusText.textContent = "Toque para falar";
}

async function sendMessageFromInput() {
    const text = chatInput.value.trim();
    if (!text) return;

    chatInput.value = "";
    sendBtn.disabled = true;
    await sendMessageText(text);
    sendBtn.disabled = false;
    chatInput.focus();
}

micBtn.addEventListener("click", () => {
    initAudio();
    if (isListening) {
        recognition.stop();
    } else {
        startListening();
    }
});

micBtnSmall.addEventListener("click", () => {
    switchMode("voice");
});

sendBtn.addEventListener("click", sendMessageFromInput);
chatInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessageFromInput();
    }
});

modeVoice.addEventListener("click", () => switchMode("voice"));
modeText.addEventListener("click", () => switchMode("text"));

ttsToggle.addEventListener("click", () => {
    ttsEnabled = !ttsEnabled;
    ttsToggle.innerHTML = ttsEnabled ? "&#9835; Som: ON" : "&#9835; Som: OFF";

    if (!ttsEnabled) {
        window.speechSynthesis.cancel();
        speaking = false;
        if (faceAvatar) {
            faceAvatar.setSpeaking(false);
            faceAvatar.setMouthOpen(0);
        }
        if (window.hologram) {
            window.hologram.setSpeaking(false);
            window.hologram.setMouthOpen(0);
        }
    }
});

visualModeBtn.addEventListener("click", () => {
    initAudio();
    visualMode = visualMode === "hologram" ? "human" : "hologram";

    if (faceAvatar) {
        faceAvatar.setMode(visualMode);
    }

    if (visualMode === "human") {
        visualModeBtn.innerHTML = "&#9788; Humano";
    } else {
        visualModeBtn.innerHTML = "&#9788; Holograma";
    }
});

resetBtn.addEventListener("click", async () => {
    window.speechSynthesis.cancel();
    speaking = false;
    if (faceAvatar) {
        faceAvatar.setSpeaking(false);
        faceAvatar.setMouthOpen(0);
    }
    if (window.hologram) {
        window.hologram.setSpeaking(false);
        window.hologram.setMouthOpen(0);
    }

    if (isListening && recognition) recognition.stop();

    chatMessages.innerHTML = "";

    try {
        await fetch("/api/reset", { method: "POST" });
    } catch (err) {}

    addMessage(GREETING, false);
    speak(GREETING);
    voiceStatusText.textContent = "Toque para falar";
});

window.speechSynthesis.onvoiceschanged = () => {};

const splash = document.getElementById("splash");
const splashStart = document.getElementById("splash-start");

function initFace() {
    const canvas = document.getElementById("hologram-canvas");
    if (!canvas) return;

    if (typeof THREE !== "undefined" && typeof FaceAvatar !== "undefined") {
        faceAvatar = new FaceAvatar(canvas);
        window.faceAvatar = faceAvatar;
        initAudio();
    } else if (typeof Hologram !== "undefined") {
        window.hologram = new Hologram(canvas);
    }
}

async function startApp() {
    splash.classList.add("hidden");
    initFace();
    showTyping();

    try {
        const res = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: "__greeting__" }),
        });
        const data = await res.json();
        hideTyping();
        if (data.response) {
            addMessage(data.response, false);
            const usedVideo = await speakWithVideo(data.response);
            if (!usedVideo) {
                speak(data.response);
            }
        }
    } catch (err) {
        hideTyping();
        addMessage(GREETING, false);
        speak(GREETING);
    }
    voiceStatusText.textContent = "Toque para falar";
}

splashStart.addEventListener("click", () => {
    initAudio();
    startApp();
});

initSpeechRecognition();
