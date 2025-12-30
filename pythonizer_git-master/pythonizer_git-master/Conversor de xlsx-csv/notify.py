from typing import Optional
import os
from threading import Thread

def play_sound_async(sound_path: Optional[str]):
    """Reproduz um arquivo de som em background.

    Tenta usar `playsound` (suporta MP3). Se falhar e o arquivo for WAV, tenta `winsound`.
    """
    if not sound_path:
        return
    if not os.path.exists(sound_path):
        print(f"Arquivo de som não encontrado: {sound_path}")
        return

    def _player():
        try:
            from playsound3 import playsound
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


def send_notification(title: str, message: str, icon: Optional[str] = None, duration: str = "short", sound_path: Optional[str] = None) -> None:
    """Exibe notificação do Windows usando winotify e (opcional) reproduz um som.

    Parâmetros:
    - sound_path: caminho para arquivo MP3/WAV a reproduzir (opcional).
    """

    # tenta tocar som (não bloqueante) mesmo que winotify não esteja disponível
    if sound_path:
        play_sound_async(sound_path)

    try:
        # importar o pacote winotify e procurar pela variável audio em ambas as formas
        import winotify
        from winotify import Notification
    except Exception as e:
        print(f"winotify não disponível: {e}. Notificação: {title} - {message}")
        return

    # tentar obter audio (pode ser 'audio' ou 'audio' dependendo da versão)
    audio = None
    try:
        from winotify import audio as audioClass
        audio = audioClass
    except Exception:
        try:
            from winotify import audio as audio_module
            audio = audio_module
        except Exception:
            audio = None

    try:
        toast = Notification(app_id="MeuAppPython", title=title, msg=message, icon=icon, duration=duration)
        if audio is not None:
            try:
                toast.set_audio(audio.Default, loop=False)
            except Exception:
                pass
        toast.show()
    except Exception as e:
        print(f"Falha ao enviar notificação via winotify: {e}. Notificação: {title} - {message}")


if __name__ == '__main__':
    # exemplo de uso rápido
    sound = r"C:\\_UTIL\\-Pythonizer\\itens\\notification.wav"  # altere para o nome do seu arquivo
    send_notification("Teste", "Esta é uma notificação de teste", icon=None, sound_path=sound)