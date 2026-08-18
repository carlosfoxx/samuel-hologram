import math
import random
from PyQt6.QtWidgets import QWidget, QLabel, QVBoxLayout
from PyQt6.QtCore import Qt, QTimer, pyqtSignal, QPointF
from PyQt6.QtGui import (
    QPainter, QColor, QLinearGradient, QRadialGradient,
    QFont, QPen, QBrush, QPixmap, QImage,
)


class HologramWidget(QWidget):
    speaking_changed = pyqtSignal(bool)

    def __init__(self, parent=None):
        super().__init__(parent)
        self.setMinimumSize(400, 500)
        self._speaking = False
        self._phase = 0
        self._scan_line = 0
        self._glow_intensity = 0.6
        self._particles = []
        self._avatar_pixmap = None
        self._init_particles()

        self._timer = QTimer(self)
        self._timer.timeout.connect(self._animate)
        self._timer.start(50)

    def _init_particles(self):
        for _ in range(30):
            self._particles.append({
                "x": random.uniform(0.1, 0.9),
                "y": random.uniform(0.1, 0.9),
                "speed": random.uniform(0.002, 0.008),
                "size": random.uniform(1.0, 3.0),
                "alpha": random.uniform(50, 150),
            })

    def set_avatar(self, pixmap: QPixmap):
        self._avatar_pixmap = pixmap
        self.update()

    def set_speaking(self, speaking: bool):
        self._speaking = speaking
        self.speaking_changed.emit(speaking)

    def _animate(self):
        self._phase += 0.1
        self._scan_line = (self._scan_line + 2) % self.height()

        for p in self._particles:
            p["y"] -= p["speed"]
            if p["y"] < 0:
                p["y"] = 1.0
                p["x"] = random.uniform(0.1, 0.9)

        if self._speaking:
            self._glow_intensity = 0.7 + 0.3 * math.sin(self._phase * 3)
        else:
            self._glow_intensity = 0.5 + 0.1 * math.sin(self._phase)

        self.update()

    def paintEvent(self, event):
        painter = QPainter(self)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing)

        self._draw_background(painter)
        self._draw_hologram_base(painter)
        self._draw_avatar(painter)
        self._draw_scan_lines(painter)
        self._draw_particles(painter)
        self._draw_glow(painter)
        self._draw_name_plate(painter)

    def _draw_background(self, painter: QPainter):
        gradient = QLinearGradient(0, 0, 0, self.height())
        gradient.setColorAt(0.0, QColor(5, 5, 20))
        gradient.setColorAt(0.5, QColor(10, 10, 30))
        gradient.setColorAt(1.0, QColor(5, 5, 15))
        painter.fillRect(self.rect(), gradient)

    def _draw_hologram_base(self, painter: QPainter):
        w, h = self.width(), self.height()
        center_x = w // 2
        base_y = h - 60

        gradient = QRadialGradient(QPointF(center_x, base_y), 120)
        alpha = int(100 * self._glow_intensity)
        gradient.setColorAt(0.0, QColor(0, 200, 255, alpha))
        gradient.setColorAt(0.5, QColor(0, 100, 200, alpha // 2))
        gradient.setColorAt(1.0, QColor(0, 50, 100, 0))

        painter.setBrush(QBrush(gradient))
        painter.setPen(Qt.PenStyle.NoPen)

        from PyQt6.QtCore import QRectF
        painter.drawEllipse(QRectF(center_x - 120, base_y - 15, 240, 30))

        painter.setPen(QPen(QColor(0, 180, 255, 60), 1))
        for i in range(3):
            offset = i * 20
            y = base_y - 5 - offset
            painter.drawLine(center_x - 100 + offset * 2, y, center_x + 100 - offset * 2, y)

    def _draw_avatar(self, painter: QPainter):
        w, h = self.width(), self.height()
        center_x = w // 2

        if self._avatar_pixmap:
            avatar_h = int(h * 0.55)
            avatar_w = int(avatar_h * self._avatar_pixmap.width() / self._avatar_pixmap.height())
            x = center_x - avatar_w // 2
            y = h // 2 - avatar_h // 2 - 40

            scaled = self._avatar_pixmap.scaled(
                avatar_w, avatar_h,
                Qt.AspectRatioMode.KeepAspectRatio,
                Qt.TransformationMode.SmoothTransformation,
            )

            tinted = QImage(scaled.size(), QImage.Format.Format_ARGB32)
            tinted.fill(QColor(0, 0, 0, 0))

            tint_painter = QPainter(tinted)
            tint_painter.drawPixmap(0, 0, scaled)
            tint_painter.setCompositionMode(QPainter.CompositionMode.CompositionMode_SourceIn)

            blue_alpha = int(40 + 30 * self._glow_intensity)
            tint_painter.fillRect(tinted.rect(), QColor(0, 180, 255, blue_alpha))
            tint_painter.end()

            painter.drawImage(x, y, tinted)

            painter.setOpacity(0.3 + 0.2 * self._glow_intensity)
            painter.drawPixmap(x, y, scaled)
            painter.setOpacity(1.0)
        else:
            self._draw_silhouette(painter, center_x, h)

    def _draw_silhouette(self, painter: QPainter, cx: int, h: int):
        painter.setPen(Qt.PenStyle.NoPen)

        gradient = QRadialGradient(QPointF(cx, h // 2 - 40), 100)
        gradient.setColorAt(0.0, QColor(0, 200, 255, int(60 * self._glow_intensity)))
        gradient.setColorAt(1.0, QColor(0, 80, 160, 0))
        painter.setBrush(QBrush(gradient))

        from PyQt6.QtCore import QRectF
        painter.drawEllipse(QRectF(cx - 60, h // 2 - 160, 120, 140))
        painter.drawEllipse(QRectF(cx - 80, h // 2 - 20, 160, 120))

    def _draw_scan_lines(self, painter: QPainter):
        w, h = self.width(), self.height()

        painter.setPen(QPen(QColor(0, 200, 255, 15), 1))
        for y in range(0, h, 3):
            painter.drawLine(0, y, w, y)

        scan_y = self._scan_line
        painter.setPen(QPen(QColor(0, 255, 255, 80), 2))
        painter.drawLine(0, scan_y, w, scan_y)

        gradient = QLinearGradient(0, scan_y - 20, 0, scan_y + 20)
        gradient.setColorAt(0.0, QColor(0, 200, 255, 0))
        gradient.setColorAt(0.5, QColor(0, 200, 255, 30))
        gradient.setColorAt(1.0, QColor(0, 200, 255, 0))
        painter.fillRect(0, scan_y - 20, w, 40, gradient)

    def _draw_particles(self, painter: QPainter):
        w, h = self.width(), self.height()
        for p in self._particles:
            x = p["x"] * w
            y = p["y"] * h
            size = p["size"]
            alpha = int(p["alpha"] * self._glow_intensity)

            painter.setPen(Qt.PenStyle.NoPen)
            painter.setBrush(QBrush(QColor(0, 200, 255, alpha)))
            painter.drawEllipse(QPointF(x, y), size, size)

    def _draw_glow(self, painter: QPainter):
        w, h = self.width(), self.height()
        center_x = w // 2

        glow = QRadialGradient(QPointF(center_x, h // 2 - 40), 200)
        alpha = int(20 * self._glow_intensity)
        glow.setColorAt(0.0, QColor(0, 150, 255, alpha))
        glow.setColorAt(1.0, QColor(0, 50, 100, 0))
        painter.setBrush(QBrush(glow))
        painter.setPen(Qt.PenStyle.NoPen)

        from PyQt6.QtCore import QRectF
        painter.drawRect(QRectF(0, 0, w, h))

        if self._speaking:
            wave_alpha = int(15 * self._glow_intensity)
            painter.setPen(QPen(QColor(0, 200, 255, wave_alpha), 1))
            for i in range(5):
                offset = int(30 * math.sin(self._phase + i * 0.5))
                painter.drawEllipse(
                    QPointF(center_x, h // 2 - 40),
                    80 + i * 40 + offset,
                    60 + i * 30 + offset,
                )

    def _draw_name_plate(self, painter: QPainter):
        w, h = self.width(), self.height()

        painter.setPen(QColor(0, 200, 255, 200))
        font = QFont("Segoe UI", 14, QFont.Weight.Bold)
        painter.setFont(font)
        painter.drawText(
            0, h - 40, w, 30,
            Qt.AlignmentFlag.AlignCenter,
            "Prof. Samuel Isaac Benchimol",
        )

        painter.setPen(QColor(0, 150, 200, 120))
        font_small = QFont("Segoe UI", 9)
        painter.setFont(font_small)
        painter.drawText(
            0, h - 22, w, 20,
            Qt.AlignmentFlag.AlignCenter,
            "Fundador da Bemol  |  Professor Emérito da UFAM",
        )
