import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from PyQt6.QtWidgets import QApplication
from PyQt6.QtGui import QFont

from ui.main_window import MainWindow


def main():
    app = QApplication(sys.argv)

    app.setFont(QFont("Segoe UI", 10))

    app.setStyle("Fusion")

    from PyQt6.QtGui import QPalette, QColor
    palette = QPalette()
    palette.setColor(QPalette.ColorRole.Window, QColor(5, 5, 15))
    palette.setColor(QPalette.ColorRole.WindowText, QColor(200, 220, 240))
    palette.setColor(QPalette.ColorRole.Base, QColor(10, 15, 30))
    palette.setColor(QPalette.ColorRole.AlternateBase, QColor(15, 20, 40))
    palette.setColor(QPalette.ColorRole.Text, QColor(200, 220, 240))
    palette.setColor(QPalette.ColorRole.Button, QColor(20, 40, 70))
    palette.setColor(QPalette.ColorRole.ButtonText, QColor(200, 220, 240))
    palette.setColor(QPalette.ColorRole.Highlight, QColor(0, 120, 200))
    palette.setColor(QPalette.ColorRole.HighlightedText, QColor(255, 255, 255))
    app.setPalette(palette)

    window = MainWindow()
    window.show()

    sys.exit(app.exec())


if __name__ == "__main__":
    main()
