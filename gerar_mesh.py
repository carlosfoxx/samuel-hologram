import cv2
import numpy as np
import os

# Caminhos
caminho_foto = os.path.join(os.path.dirname(__file__), "media", "samuel-benchimol.webp")
caminho_saida = os.path.join(os.path.dirname(__file__), "media", "samuel-mesh.png")

# Carregar foto
imagem = cv2.imread(caminho_foto)
if imagem is None:
    print(f"Erro ao carregar: {caminho_foto}")
    exit()

altura, largura, _ = imagem.shape
print(f"Imagem carregada: {largura}x{altura}")

# Converter para escala de cinza
cinza = cv2.cvtColor(imagem, cv2.COLOR_BGR2GRAY)

# Detectar bordas (Canny)
bordas = cv2.Canny(cinza, 50, 150)

# Dilatar bordas para conectar linhas
kernel = np.ones((2, 2), np.uint8)
bordas_dilatadas = cv2.dilate(bordas, kernel, iterations=1)

# Criar fundo preto
fundo = np.zeros((altura, largura, 3), dtype=np.uint8)

# Desenhar linhas horizontais (scan lines)
for y in range(0, altura, 3):
    fundo[y, :] = [40, 20, 0]  # Azul escuro

# Detectar contornos do rosto
contornos, _ = cv2.findContours(bordas_dilatadas, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

# Desenhar contornos em azul neon
for contorno in contornos:
    area = cv2.contourArea(contorno)
    if area > 100:  # Filtrar contornos pequenos
        cv2.drawContours(fundo, [contorno], -1, (255, 200, 0), 1)

# Criar pontos de rede (simulando mesh)
pontos = []
for y in range(0, altura, 8):
    for x in range(0, largura, 8):
        if bordas_dilatadas[y, x] > 0:
            pontos.append((x, y))

# Conectar pontos próximos
for i, p1 in enumerate(pontos):
    for j, p2 in enumerate(pontos):
        if i < j:
            dist = np.sqrt((p1[0]-p2[0])**2 + (p1[1]-p2[1])**2)
            if dist < 25 and dist > 5:
                cv2.line(fundo, p1, p2, (255, 220, 50), 1)

# Desenhar pontos/nós
for pt in pontos:
    cv2.circle(fundo, pt, 1, (255, 255, 150), -1)

# Adicionar glow
fundo_suave = cv2.GaussianBlur(fundo, (5, 5), 0)
fundo = cv2.addWeighted(fundo, 0.7, fundo_suave, 0.3, 0)

# Adicionar brilho central (gradiente radial)
centro_x, centro_y = largura // 2, altura // 3
for r in range(200, 0, -2):
    alpha = 0.02 * (r / 200)
    cv2.circle(fundo, (centro_x, centro_y), r, (0, int(100*alpha*10), int(200*alpha*10)), 1)

# Salvar resultado
cv2.imwrite(caminho_saida, fundo)
print(f"Sucesso! Mesh salvo em: {caminho_saida}")
print(f"Dimensoes: {largura}x{altura}")
