import pandas as pd 
import time 
import os 
import shutil
from watchdog.observers import Observer 
from watchdog.events import FileSystemEventHandler

# --- CONFIGURAÇÕES DAS PASTAS  ---
PASTA_ORIGEM = r'C:\Users\T066208021\OneDrive - CASSI\Docs\12 - Dezembro\Dados novos credenciados\_origem'
PASTA_DESTINO = r'C:\Users\T066208021\OneDrive - CASSI\Docs\12 - Dezembro\Dados novos credenciados\_destino'
# ---------------------------------

class ManipuladorDeArquivo(FileSystemEventHandler):
    def on_created(self, event):
        """Chamado quando um novo arquivo é criado na pasta de origem."""
        if event.is_directory:
            return

        caminho_arquivo = event.src_path
        # separa nome e extensão corretamente   a
        nome_arquivo, extensao = os.path.splitext(os.path.basename(caminho_arquivo))

        if extensao.lower() == '.xlsx':
            print(f"Novo arquivo XLSX detectado: {caminho_arquivo}")
            try:
                # 1. ler o arquivo xlsx COMO TEXTO
                df = pd.read_excel(caminho_arquivo, dtype=str)  # <-- SOLUÇÃO AQUI
                
                # 2. Opcional: remover .0 de valores que foram convertidos de float
                df = df.replace('\.0$', '', regex=True)

                # 3. definir o nome do arquivo csv de saida
                nome_csv = nome_arquivo + '.csv'
                caminho_csv_destino = os.path.join(PASTA_DESTINO, nome_csv)

                # 4. salvar como csv, separado por ponto e virgula
                df.to_csv(caminho_csv_destino, sep=';' , index=False, encoding='utf-8')

                print(f"Arquivo convertido para CSV com sucesso: {caminho_csv_destino}")

                # opcional: mover ou deletar o arquivo original apos a conversao
                os.remove(caminho_arquivo) # descomente para deletar o original
                # shutil.move(caminho_arquivo, PASTA_DESTINO) # descomentar para mover

            except Exception as e:
                print(f"Erro ao processar {caminho_arquivo}: {e}")
            
if __name__ == "__main__":
    # certifique-se de que as pastas de origem e destino existem
    os.makedirs(PASTA_ORIGEM, exist_ok=True)
    os.makedirs(PASTA_DESTINO, exist_ok=True)
    
    evento_handler = ManipuladorDeArquivo()
    observador = Observer()
    observador.schedule(evento_handler, PASTA_ORIGEM, recursive=False)
    observador.start()
    
    print(f"Monitorando a pasta: {PASTA_ORIGEM}")
    print("Pressione Ctrl+C para parar.")
    
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        observador.stop()
    observador.join()