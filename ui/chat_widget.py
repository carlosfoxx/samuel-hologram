from PyQt6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QTextEdit,
    QLineEdit, QPushButton, QLabel, QScrollArea,
    QFrame, QSizePolicy,
)
from PyQt6.QtCore import Qt, pyqtSignal, QTimer
from PyQt6.QtGui import QFont, QColor, QPalette, QTextCursor


class ChatMessage(QFrame):
    def __init__(self, text: str, is_user: bool, parent=None):
        super().__init__(parent)
        self.is_user = is_user
        self._setup_ui(text)

    def _setup_ui(self, text: str):
        layout = QVBoxLayout(self)
        layout.setContentsMargins(10, 5, 10, 5)

        if self.is_user:
            self.setStyleSheet("""
                QFrame {
                    background-color: rgba(0, 100, 180, 40);
                    border-radius: 10px;
                    border: 1px solid rgba(0, 150, 255, 60);
                    margin-left: 60px;
                    margin-right: 10px;
                }
            """)
        else:
            self.setStyleSheet("""
                QFrame {
                    background-color: rgba(0, 60, 100, 40);
                    border-radius: 10px;
                    border: 1px solid rgba(0, 200, 255, 40);
                    margin-left: 10px;
                    margin-right: 60px;
                }
            """)

        header = QLabel()
        if self.is_user:
            header.setText("Voce")
            header.setStyleSheet("color: #66bbee; font-weight: bold; font-size: 11px; background: transparent; border: none;")
        else:
            header.setText("Prof. Samuel Benchimol (Holograma)")
            header.setStyleSheet("color: #00ccff; font-weight: bold; font-size: 11px; background: transparent; border: none;")
        layout.addWidget(header)

        msg = QLabel(text)
        msg.setWordWrap(True)
        msg.setTextInteractionFlags(Qt.TextInteractionFlag.TextSelectableByMouse)
        msg.setStyleSheet("color: #e0e0e0; font-size: 13px; background: transparent; border: none; padding: 2px;")
        layout.addWidget(msg)


class ChatWidget(QWidget):
    message_sent = pyqtSignal(str)

    def __init__(self, parent=None):
        super().__init__(parent)
        self._setup_ui()

    def _setup_ui(self):
        layout = QVBoxLayout(self)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.setSpacing(0)

        header = QLabel("  Chat com o Holograma")
        header.setFixedHeight(40)
        header.setStyleSheet("""
            QLabel {
                color: #00ccff;
                font-size: 14px;
                font-weight: bold;
                background-color: rgba(0, 40, 80, 150);
                border-bottom: 1px solid rgba(0, 150, 255, 80);
                padding: 8px;
            }
        """)
        layout.addWidget(header)

        self.scroll_area = QScrollArea()
        self.scroll_area.setWidgetResizable(True)
        self.scroll_area.setHorizontalScrollBarPolicy(Qt.ScrollBarPolicy.ScrollBarAlwaysOff)
        self.scroll_area.setStyleSheet("""
            QScrollArea {
                background-color: rgba(5, 10, 25, 200);
                border: none;
            }
            QScrollBar:vertical {
                background: rgba(0, 30, 60, 100);
                width: 8px;
                border-radius: 4px;
            }
            QScrollBar::handle:vertical {
                background: rgba(0, 150, 255, 80);
                border-radius: 4px;
                min-height: 30px;
            }
            QScrollBar::add-line:vertical, QScrollBar::sub-line:vertical {
                height: 0px;
            }
        """)

        self.messages_widget = QWidget()
        self.messages_layout = QVBoxLayout(self.messages_widget)
        self.messages_layout.setAlignment(Qt.AlignmentFlag.AlignTop)
        self.messages_layout.setSpacing(8)
        self.messages_layout.setContentsMargins(10, 10, 10, 10)

        self.scroll_area.setWidget(self.messages_widget)
        layout.addWidget(self.scroll_area, 1)

        input_frame = QFrame()
        input_frame.setStyleSheet("""
            QFrame {
                background-color: rgba(0, 30, 60, 200);
                border-top: 1px solid rgba(0, 150, 255, 60);
            }
        """)
        input_layout = QHBoxLayout(input_frame)
        input_layout.setContentsMargins(10, 8, 10, 8)

        self.input_field = QLineEdit()
        self.input_field.setPlaceholderText("Digite sua pergunta ao Professor Benchimol...")
        self.input_field.setStyleSheet("""
            QLineEdit {
                background-color: rgba(0, 20, 40, 150);
                color: #e0e0e0;
                border: 1px solid rgba(0, 150, 255, 80);
                border-radius: 15px;
                padding: 10px 16px;
                font-size: 13px;
            }
            QLineEdit:focus {
                border: 1px solid rgba(0, 200, 255, 150);
            }
        """)
        self.input_field.returnPressed.connect(self._on_send)
        input_layout.addWidget(self.input_field, 1)

        self.send_button = QPushButton("Enviar")
        self.send_button.setFixedWidth(80)
        self.send_button.setStyleSheet("""
            QPushButton {
                background-color: rgba(0, 150, 255, 150);
                color: white;
                border: 1px solid rgba(0, 200, 255, 100);
                border-radius: 15px;
                padding: 10px;
                font-weight: bold;
                font-size: 12px;
            }
            QPushButton:hover {
                background-color: rgba(0, 180, 255, 200);
            }
            QPushButton:pressed {
                background-color: rgba(0, 100, 200, 200);
            }
            QPushButton:disabled {
                background-color: rgba(50, 50, 50, 150);
                color: #888;
            }
        """)
        self.send_button.clicked.connect(self._on_send)
        input_layout.addWidget(self.send_button)

        layout.addWidget(input_frame)

    def _on_send(self):
        text = self.input_field.text().strip()
        if not text:
            return
        self.input_field.clear()
        self.add_message(text, is_user=True)
        self.message_sent.emit(text)

    def add_message(self, text: str, is_user: bool = False):
        msg = ChatMessage(text, is_user)
        self.messages_layout.addWidget(msg)

        QTimer.singleShot(50, self._scroll_to_bottom)

    def _scroll_to_bottom(self):
        sb = self.scroll_area.verticalScrollBar()
        sb.setValue(sb.maximum())

    def set_input_enabled(self, enabled: bool):
        self.input_field.setEnabled(enabled)
        self.send_button.setEnabled(enabled)
