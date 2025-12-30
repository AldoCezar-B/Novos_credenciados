from pydub import AudioSegment
from pathlib import Path

# Diretório base (pasta onde está este script)
base_dir = Path(__file__).resolve().parent

# Pastas de entrada e saída dentro do projeto
entrada_dir = base_dir / '_entrada_MP3'
saida_dir = base_dir / '_saida_WAV'

# Garante que as pastas existam
entrada_dir.mkdir(parents=True, exist_ok=True)
saida_dir.mkdir(parents=True, exist_ok=True)

# Procura por arquivos .mp3 na pasta de entrada (case-insensitive)
mp3_files = [p for p in entrada_dir.iterdir() if p.is_file() and p.suffix.lower() == '.mp3']

if not mp3_files:
    print(f"Nenhum arquivo .mp3 encontrado em: {entrada_dir}")
    print("Coloque arquivos .mp3 na pasta de entrada e execute o script novamente.")
else:
    for mp3_path in mp3_files:
        wav_filename = mp3_path.stem + '.wav'
        wav_path = saida_dir / wav_filename
        try:
            print(f"Convertendo: {mp3_path.name} -> {wav_path}")
            audio = AudioSegment.from_file(mp3_path, format='mp3')
            audio.export(wav_path, format='wav')
            print(f"Convertido com sucesso: {wav_path.name}")
        except Exception as e:
            print(f"Erro ao converter {mp3_path.name}: {e}")

# Fim do script