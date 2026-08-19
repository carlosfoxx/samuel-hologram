"""
SadTalker API para Kaggle GPU
Execute este notebook no Kaggle com GPU T4 habilitada.

Passo a passo:
1. Criar novo notebook no Kaggle
2. Habilitar GPU: Settings → Accelerator → GPU T4 x2
3. Copiar este codigo para uma cell
4. Executar (vai demorar ~5 min na primeira vez)
5. Copiar a URL do ngrok que aparece no final
6. Colar a URL no Render como variavel de ambiente SADTALKER_API_URL
"""

import subprocess
import os

print("=== Instalando dependencias ===")
subprocess.run(["pip", "install", "-q", "fastapi", "uvicorn", "ngrok", "python-multipart"], check=True)

print("=== Clonando SadTalker ===")
if not os.path.exists("SadTalker"):
    subprocess.run(["git", "clone", "https://github.com/Winfredy/SadTalker.git"], check=True)

os.chdir("SadTalker")

print("=== Instalando dependencias do SadTalker ===")
subprocess.run(["pip", "install", "-q", "-r", "requirements.txt"], check=True)

print("=== Baixando modelos ===")
subprocess.run(["bash", "scripts/download_models.sh"], check=True)

print("=== Instalando FFmpeg ===")
subprocess.run(["apt-get", "install", "-y", "-qq", "ffmpeg"], check=True)

print("=== Configurando API ===")

api_code = '''
import os
import sys
import uuid
import shutil
import subprocess
import tempfile
from fastapi import FastAPI, UploadFile, File
from fastapi.responses import FileResponse
import uvicorn

sys.path.insert(0, os.getcwd())

app = FastAPI()

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/animate")
async def animate(audio: UploadFile = File(...), image: UploadFile = File(...)):
    job_id = str(uuid.uuid4())[:8]
    tmp_dir = tempfile.mkdtemp()
    
    audio_path = os.path.join(tmp_dir, f"audio{os.path.splitext(audio.filename)[1]}")
    image_path = os.path.join(tmp_dir, f"image{os.path.splitext(image.filename)[1]}")
    result_dir = os.path.join(tmp_dir, "results")
    os.makedirs(result_dir)
    
    with open(audio_path, "wb") as f:
        shutil.copyfileobj(audio.file, f)
    with open(image_path, "wb") as f:
        shutil.copyfileobj(image.file, f)
    
    try:
        cmd = [
            sys.executable, "inference.py",
            "--driven_audio", audio_path,
            "--source_image", image_path,
            "--result_dir", result_dir,
            "--still",
            "--preprocess", "full",
            "--enhancer", "gfpgan",
        ]
        subprocess.run(cmd, check=True, timeout=60)
        
        mp4_files = [f for f in os.listdir(result_dir) if f.endswith(".mp4")]
        if not mp4_files:
            return {"error": "Nenhum video gerado"}
        
        video_path = os.path.join(result_dir, mp4_files[0])
        return FileResponse(video_path, media_type="video/mp4", filename=f"samuel_{job_id}.mp4")
    
    except subprocess.TimeoutExpired:
        return {"error": "Timeout: audio muito longo"}
    except Exception as e:
        return {"error": str(e)}
    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=7860)
'''

with open("api_server.py", "w") as f:
    f.write(api_code)

print("=== Iniciando API com ngrok ===")
print("Aguarde ~30 segundos para o ngrok gerar a URL...")

from pyngrok import ngrok
port = 7860
public_url = ngrok.connect(port)
print(f"\\n{'='*50}")
print(f"API RODANDO EM: {public_url}")
print(f"{'='*50}")
print(f"\\nCopie esta URL e cole no Render como:")
print(f"  Variavel de ambiente: SADTALKER_API_URL={public_url}")
print(f"\\nMantenha este notebook aberto!")

subprocess.Popen([sys.executable, "api_server.py"])
