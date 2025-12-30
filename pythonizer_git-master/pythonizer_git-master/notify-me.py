from winotify import Notification, audio

titulo = "Macaco diz:"
mensagem = "Seu teste esta funcionando chefe"

icon = r"C:\Users\T066208021\OneDrive - CASSI\Docs\12 - Dezembro\Dados novos credenciados\outros\icone.png"

notificacao = Notification(
    app_id="Conversor do mamaco",
    title=titulo,
    msg=mensagem,
    icon=icon,
    duration="short",  # "short" ou "long"
)

# opcional: adicionar áudio
notificacao.set_audio(audio.Default, loop=False)

notificacao.show()