from pathlib import Path
from pydub import AudioSegment
import time
import os
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

# Caminhos de origem e destino
INPUT_DIR = Path(r"C:\_UTIL\-Pythonizer\conversor-mp3_wav\_entrada_MP3")
OUTPUT_DIR = Path(r"C:\_UTIL\-Pythonizer\conversor-mp3_wav\_saida_WAV")

# Garante que as pastas existam
INPUT_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


def convert_file(mp3_path: Path):
    """Converte um arquivo MP3 para WAV com mesmo nome na pasta de saída."""
    try:
        audio = AudioSegment.from_file(mp3_path, format="mp3")
        out_path = OUTPUT_DIR / (mp3_path.stem + ".wav")
        audio.export(out_path, format="wav")
        print(f"Convertido: {mp3_path.name} -> {out_path}")
    except Exception as e:
        print(f"Erro convertendo {mp3_path}: {e}")


def _wait_until_file_ready(path, timeout=30, poll_interval=0.5):
    """Aguarda até que o arquivo exista e tenha tamanho estável (evita ler enquanto ainda está sendo gravado)."""
    start = time.time()
    last_size = -1
    while time.time() - start < timeout:
        try:
            size = path.stat().st_size
        except FileNotFoundError:
            time.sleep(poll_interval)
            continue
        if size == last_size:
            # tamanho estável
            return True
        last_size = size
        time.sleep(poll_interval)
    return False


class MP3Handler(FileSystemEventHandler):
    def on_created(self, event):
        if event.is_directory:
            return
        src = Path(event.src_path)
        if src.suffix.lower() != ".mp3":
            return
        print(f"Arquivo MP3 detectado: {src}")
        # espera arquivo ficar pronto
        if not _wait_until_file_ready(src, timeout=60, poll_interval=0.5):
            print(f"Arquivo {src} não ficou pronto dentro do tempo limite.")
            return
        out_file = OUTPUT_DIR / (src.stem + ".wav")
        if out_file.exists():
            print(f"Arquivo de saída já existe, pulando: {out_file}")
            return
        convert_file(src)


if __name__ == "__main__":
    # Inicia watchdog observer para monitorar a pasta de entrada
    os.makedirs(INPUT_DIR, exist_ok=True)
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    handler = MP3Handler()
    observer = Observer()
    observer.schedule(handler, str(INPUT_DIR), recursive=False)
    observer.start()

    print(f"Monitorando (watchdog): {INPUT_DIR} -> {OUTPUT_DIR}")
    print("Pressione Ctrl+C para sair.")
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        observer.stop()
    observer.join()
