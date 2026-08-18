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

let ttsEnabled = true;
let speaking = false;
let currentMode = "voice";
let recognition = null;
let isListening = false;

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
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
        isListening = true;
        voiceStatus.classList.add("listening");
        voiceStatusText.textContent = "Ouvindo...";
        micBtn.classList.add("active");
        if (window.hologram) window.hologram.setSpeaking(false);
    };

    recognition.onresult = (event) => {
        let transcript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
        }

        voiceStatusText.textContent = transcript || "Ouvindo...";

        if (event.results[event.resultIndex].isFinal) {
            voiceStatusText.textContent = "Processando...";
            sendMessageText(transcript.trim());
        }
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

function speak(text) {
    if (!ttsEnabled || !window.speechSynthesis) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "pt-BR";
    utterance.rate = 0.95;
    utterance.pitch = 0.9;

    const voices = window.speechSynthesis.getVoices();
    const ptVoice = voices.find(v => v.lang.startsWith("pt")) || voices[0];
    if (ptVoice) utterance.voice = ptVoice;

    utterance.onstart = () => {
        speaking = true;
        if (window.hologram) window.hologram.setSpeaking(true);
    };

    utterance.onend = () => {
        speaking = false;
        if (window.hologram) window.hologram.setSpeaking(false);
    };

    window.speechSynthesis.speak(utterance);
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
            speak(data.response);
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
        if (window.hologram) window.hologram.setSpeaking(false);
    }
});

resetBtn.addEventListener("click", async () => {
    window.speechSynthesis.cancel();
    speaking = false;
    if (window.hologram) window.hologram.setSpeaking(false);

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

initSpeechRecognition();
addMessage(GREETING, false);
speak(GREETING);
