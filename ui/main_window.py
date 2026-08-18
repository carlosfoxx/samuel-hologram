import os
import threading
from PyQt6.QtWidgets import (
    QMainWindow, QWidget, QHBoxLayout, QVBoxLayout,
    QLabel, QPushButton, QStatusBar, QSplitter,
)
from PyQt6.QtCore import Qt, pyqtSignal, QObject, QSize
from PyQt6.QtGui import QFont, QPixmap, QIcon

from ui.hologram_widget import HologramWidget
from ui.chat_widget import ChatWidget
from ai.gemini_client import GeminiClient
from ai.prompts import GREETING_MESSAGE
from knowledge.loader import KnowledgeLoader
from audio.tts_engine import TTSEngine
import config


class WorkerSignals(QObject):
    response_ready = pyqtSignal(str)


class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle(config.WINDOW_TITLE)
        self.setMinimumSize(1000, 700)
        self.resize(config.WINDOW_WIDTH, config.WINDOW_HEIGHT)

        self._signals = WorkerSignals()
        self._signals.response_ready.connect(self._on_response)

        self._init_knowledge()
        self._init_ai()
        self._init_tts()
        self._init_ui()
        self._load_avatar()

        self._show_greeting()

    def _init_knowledge(self):
        try:
            self.knowledge = KnowledgeLoader(config.KNOWLEDGE_PATH)
        except Exception as e:
            print(f"[Knowledge] Erro ao carregar base: {e}")
            self.knowledge = None

    def _init_ai(self):
        if not config.GEMINI_API_KEY:
            self.gemini = None
            return
        try:
            self.gemini = GeminiClient(
                api_key=config.GEMINI_API_KEY,
                model_name=config.GEMINI_MODEL,
            )
        except Exception as e:
            print(f"[AI] Erro ao inicializar Gemini: {e}")
            self.gemini = None

    def _init_tts(self):
        self.tts = TTSEngine(lang=config.TTS_LANG, slow=config.TTS_SLOW)
        self.tts.enabled = config.TTS_ENABLED

    def _init_ui(self):
        central = QWidget()
        self.setCentralWidget(central)

        main_layout = QHBoxLayout(central)
        main_layout.setContentsMargins(0, 0, 0, 0)
        main_layout.setSpacing(0)

        splitter = QSplitter(Qt.Orientation.Horizontal)
        splitter.setHandleWidth(2)

        self.hologram_widget = HologramWidget()
        self.chat_widget = ChatWidget()

        left_panel = QWidget()
        left_layout = QVBoxLayout(left_panel)
        left_layout.setContentsMargins(0, 0, 0, 0)

        toolbar = self._create_toolbar()
        left_layout.addWidget(toolbar)
        left_layout.addWidget(self.hologram_widget, 1)

        splitter.addWidget(left_panel)
        splitter.addWidget(self.chat_widget)

        splitter.setSizes([500, 500])

        main_layout.addWidget(splitter)

        self.chat_widget.message_sent.connect(self._on_user_message)
        self.hologram_widget.speaking_changed.connect(self._on_speaking_changed)

        self._setup_statusbar()
        self._apply_global_style()

    def _create_toolbar(self) -> QWidget:
        toolbar = QWidget()
        toolbar.setFixedHeight(50)
        toolbar.setStyleSheet("""
            QWidget {
                background-color: rgba(0, 20, 50, 220);
                border-bottom: 1px solid rgba(0, 150, 255, 60);
            }
        """)
        layout = QHBoxLayout(toolbar)
        layout.setContentsMargins(15, 5, 15, 5)

        title = QLabel("Holograma Interativo")
        title.setStyleSheet("color: #00ccff; font-size: 16px; font-weight: bold; background: transparent; border: none;")
        layout.addWidget(title)

        layout.addStretch()

        self.tts_button = QPushButton()
        self.tts_button.setText("Som: ON" if self.tts.enabled else "Som: OFF")
        self.tts_button.setFixedWidth(90)
        self.tts_button.setStyleSheet("""
            QPushButton {
                background-color: rgba(0, 100, 180, 150);
                color: #ccddff;
                border: 1px solid rgba(0, 150, 255, 80);
                border-radius: 12px;
                padding: 6px 12px;
                font-size: 11px;
            }
            QPushButton:hover {
                background-color: rgba(0, 130, 200, 200);
            }
        """)
        self.tts_button.clicked.connect(self._toggle_tts)
        layout.addWidget(self.tts_button)

        reset_button = QPushButton("Resetar")
        reset_button.setFixedWidth(80)
        reset_button.setStyleSheet("""
            QPushButton {
                background-color: rgba(100, 50, 50, 150);
                color: #ffaaaa;
                border: 1px solid rgba(200, 100, 100, 80);
                border-radius: 12px;
                padding: 6px 12px;
                font-size: 11px;
            }
            QPushButton:hover {
                background-color: rgba(150, 60, 60, 200);
            }
        """)
        reset_button.clicked.connect(self._reset_chat)
        layout.addWidget(reset_button)

        return toolbar

    def _setup_statusbar(self):
        self.status_bar = QStatusBar()
        self.setStatusBar(self.status_bar)

        status_label = QLabel()
        if self.gemini:
            status_label.setText(f"Conectado ao Gemini ({config.GEMINI_MODEL})")
            status_label.setStyleSheet("color: #44aa66; font-size: 11px;")
        else:
            status_label.setText("API Key nao configurada - coloque GEMINI_API_KEY no .env")
            status_label.setStyleSheet("color: #cc4444; font-size: 11px;")

        self.status_bar.addPermanentWidget(status_label)
        self.status_bar.setStyleSheet("""
            QStatusBar {
                background-color: rgba(0, 15, 35, 220);
                border-top: 1px solid rgba(0, 100, 200, 40);
                color: #88aacc;
                font-size: 11px;
            }
        """)

    def _apply_global_style(self):
        self.setStyleSheet("""
            QMainWindow {
                background-color: #050510;
            }
            QSplitter::handle {
                background-color: rgba(0, 100, 200, 40);
                width: 2px;
            }
        """)

    def _load_avatar(self):
        for ext in ("samuel.png", "samuel.jpg", "samuel-benchimol.webp", "samuel-benchimol.png"):
            avatar_path = os.path.join(config.MEDIA_PATH, ext)
            if os.path.exists(avatar_path):
            pixmap = QPixmap(avatar_path)
            self.hologram_widget.set_avatar(pixmap)

    def _show_greeting(self):
        self.chat_widget.add_message(GREETING_MESSAGE, is_user=False)
        if self.tts.enabled:
            self.hologram_widget.set_speaking(True)
            self.tts.speak(GREETING_MESSAGE, callback=self._on_tts_done)

    def _on_user_message(self, text: str):
        self.chat_widget.set_input_enabled(False)

        thread = threading.Thread(
            target=self._process_message,
            args=(text,),
            daemon=True,
        )
        thread.start()

    def _process_message(self, question: str):
        context = ""
        if self.knowledge:
            results = self.knowledge.search(question, top_k=5)
            context = self.knowledge.format_context(results)

        if self.gemini:
            response = self.gemini.ask(question, context)
        else:
            response = (
                "[Sistema] API do Google Gemini nao configurada. "
                "Por favor, adicione sua GEMINI_API_KEY no arquivo .env"
            )

        self._signals.response_ready.emit(response)

    def _on_response(self, response: str):
        self.chat_widget.add_message(response, is_user=False)
        self.chat_widget.set_input_enabled(True)

        if self.tts.enabled:
            self.hologram_widget.set_speaking(True)
            self.tts.speak(response, callback=self._on_tts_done)

    def _on_tts_done(self):
        self.hologram_widget.set_speaking(False)

    def _on_speaking_changed(self, speaking: bool):
        pass

    def _toggle_tts(self):
        enabled = self.tts.toggle()
        self.tts_button.setText("Som: ON" if enabled else "Som: OFF")

    def _reset_chat(self):
        if self.gemini:
            self.gemini.reset()

        for i in range(self.chat_widget.messages_layout.count()):
            widget = self.chat_widget.messages_layout.itemAt(0).widget()
            if widget:
                widget.setParent(None)

        self._show_greeting()

    def closeEvent(self, event):
        self.tts.stop()
        event.accept()
