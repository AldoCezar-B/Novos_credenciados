import pandas as pd 
import time 
import os 
import shutil
from watchdog.observers import Observer 
from watchdog.events import FileSystemEventHandler
import numpy as np

# tentar importar winotify (opcional) — se não estiver instalado, segue sem notificação
try:
    from winotify import Notification, audio
    WINOTIFY_AVAILABLE = True
except Exception:
    WINOTIFY_AVAILABLE = False

# tentar importar função de notificação do módulo notify.py
try:
    import sys
    # adiciona a pasta pai ao sys.path para permitir importar notify.py quando o script está em uma subpasta
    sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
    from notify import send_notification
    NOTIFY_FUNC_AVAILABLE = True
except Exception as e:
    print(f"Não foi possível importar notify.py: {e}")
    NOTIFY_FUNC_AVAILABLE = False

# --- CONFIGURAÇÕES DAS PASTAS  ---
PASTA_ORIGEM = r'C:\Users\T066208021\OneDrive - CASSI\Docs\12 - Dezembro\Dados novos credenciados\_origem'
PASTA_DESTINO = r'C:\Users\T066208021\OneDrive - CASSI\Docs\12 - Dezembro\Dados novos credenciados\_destino'
# ---------------------------------

def _wait_until_file_ready(path, timeout=30, poll_interval=0.5):
    """Aguarda até que o arquivo exista e possa ser aberto para leitura.
    Retorna True se o arquivo ficar pronto antes do timeout, caso contrário False."""
    start = time.time()
    while time.time() - start < timeout:
        try:
            # tenta abrir em modo binário; se conseguir, presume-se que a gravação terminou
            with open(path, 'rb'):
                return True
        except Exception:
            time.sleep(poll_interval)
    return False

class ManipuladorDeArquivo(FileSystemEventHandler):
    def on_created(self, event):
        """Chamado quando um novo arquivo é criado na pasta de origem."""
        if event.is_directory:
            return

        caminho_arquivo = event.src_path
        # separa nome e extensão corretamente
        nome_arquivo, extensao = os.path.splitext(os.path.basename(caminho_arquivo))

        if extensao.lower() == '.xlsx':
            print(f"Novo arquivo XLSX detectado: {caminho_arquivo}")
            try:
                # espera o arquivo ficar pronto (evita ler enquanto outra aplicação ainda grava)
                if not _wait_until_file_ready(caminho_arquivo, timeout=30):
                    print(f"Arquivo {caminho_arquivo} não ficou pronto para leitura dentro do tempo esperado.")
                    return

                # 1. ler o arquivo xlsx
                df = pd.read_excel(caminho_arquivo)

                # --- normalizar colunas numéricas ---
                # Converter colunas float que possuem apenas valores inteiros (ex.: 1.0, 2.0)
                # para inteiros, assim não aparecem como '1.0' no CSV.
                for col in df.select_dtypes(include=[np.floating]).columns:
                    s = df[col]
                    non_null = s.dropna()
                    # verificar se todos os valores não-nulos são inteiros (sem parte fracionária)
                    if not non_null.empty and np.all(np.modf(non_null.values)[0] == 0):
                        try:
                            # se houver NaNs, usa o tipo inteiro 'Int64' que aceita NA; caso contrário, int64
                            if s.isnull().any():
                                df[col] = s.astype('Int64')
                            else:
                                df[col] = s.astype('int64')
                        except Exception:
                            # se falhar, ignora e mantém como float
                            pass
                
                # 2. definir o nome do arquivo csv de saida
                nome_csv = nome_arquivo + '.csv'
                # garantir que a pasta de destino existe (em caso de execução isolada)
                os.makedirs(PASTA_DESTINO, exist_ok=True)
                caminho_csv_destino = os.path.join(PASTA_DESTINO, nome_csv)

                # 3. salvar como csv, separado por ponto e virgula
                # Use 'utf-8-sig' para incluir BOM — o Excel no Windows abrirá corretamente caracteres acentuados.
                # Se preferir gerar um arquivo no encoding Windows-1252 (ANSI), troque para encoding='cp1252'.
                df.to_csv(caminho_csv_destino, sep=';', index=False, encoding='utf-8-sig')

                print(f"Arquivo convertido para CSV com sucesso: {caminho_csv_destino}")

                # enviar notificação usando notify.send_notification se disponível
                if NOTIFY_FUNC_AVAILABLE:
                    try:
                        icon_path = r"C:\Users\T066208021\OneDrive - CASSI\Docs\12 - Dezembro\Dados novos credenciados\outros\icone.png"
                        send_notification(
                            title="Conversão concluída",
                            message=f"{nome_csv} salvo em _destino",
                            icon=icon_path,
                            duration="short",
                        )
                    except Exception as e:
                        print(f"Erro ao chamar send_notification: {e}")
                else:
                    # fallback: se notify.py não estiver disponível, tenta winotify diretamente
                    if WINOTIFY_AVAILABLE:
                        try:
                            icon_path = r"C:\Users\T066208021\OneDrive - CASSI\Docs\12 - Dezembro\Dados novos credenciados\outros\icone.png"
                            toast = Notification(
                                app_id="ConversorXLSXtoCSV",
                                title="Conversão concluída",
                                msg=f"{nome_csv} salvo em _destino",
                                icon=icon_path,
                                duration="short",
                            )
                            toast.set_audio(audio.Default, loop=False)
                            toast.show()
                        except Exception as notif_err:
                            print(f"Falha ao enviar notificação diretamente via winotify: {notif_err}")
                    else:
                        print("Notificação não disponível — instale winotify ou verifique o módulo notify.py")

                # opcional: mover ou deletar o arquivo original apos a conversao
                # por segurança deixei comentado; descomente se realmente quiser remover automaticamente
                # os.remove(caminho_arquivo)
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


