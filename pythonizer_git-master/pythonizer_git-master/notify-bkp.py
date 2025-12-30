from typing import Optional
import os
from threading import Thread

def send_notification(title: str, message: str, icon: Optional[str] = None, duration: str = "short") -> None:
    """Exibe notificação do Windows usando winotify, com fallback para print.

    Se houver um arquivo de áudio (MP3/WAV) e o pacote `playsound` estiver instalado,
    ele será reproduzido em segundo plano. Para WAV sem playsound, usa winsound.
    """

    try:
        from winotify import Notification, Audio
    except Exception as e:
        print(f"winotify não disponível: {e}. Notificação: {title} - {message}")
        return

    try:
        toast = Notification(app_id="MeuAppPython", title=title, msg=message, icon=icon, duration=duration)
        try:
            toast.set_audio(Audio.Default, loop=False)
        except Exception:
            # se a configuração do audio falhar, não interrompe a notificação
            pass
        toast.show()
    except Exception as e:
        print(f"Falha ao enviar notificação via winotify: {e}. Notificação: {title} - {message}")


def play_sound_async(sound_path: Optional[str]):
    """Tenta reproduzir um arquivo de som em background.

    Usa `playsound` (suporta MP3) se disponível; se for WAV e não houver playsound,
    usa winsound como fallback.
    """
    if not sound_path:
        return
    if not os.path.exists(sound_path):
        print(f"Arquivo de som não encontrado: {sound_path}")
        return

    def _player():
        try:
            from playsound import playsound
            playsound(sound_path)
            return
        except Exception:
            # fallback para wav com winsound
            try:
                import winsound
                winsound.PlaySound(sound_path, winsound.SND_FILENAME | winsound.SND_ASYNC)
            except Exception as e:
                print(f"Falha ao reproduzir som {sound_path}: {e}")

    Thread(target=_player, daemon=True).start()


if __name__ == '__main__':
    # exemplo de uso rápido
    # caminho para seu MP3 (ajuste conforme necessário)
    sound = r"C:\_UTIL\-Pythonizer\itens\seu_som.mp3"
    # reproduz som (se possível) e mostra a notificação
    play_sound_async(sound)
    send_notification("Teste", "Esta é uma notificação de teste", icon=None, duration='short')