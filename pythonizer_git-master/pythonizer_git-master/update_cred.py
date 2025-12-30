import pandas as pd
import requests 
import json

# 1. Configurações
URL_WP = 'https://www.cassi.com.br/wp-json/wp/v2/posts' # url para criar o post
USUARIO_WP = 't066208021@cassi.com.br'
SENHA_WP ='Kaz4002!1'

# 2. LEr o arquivo CSV
df =pd.read_csv('C:\\Users\\T066208021\\OneDrive - CASSI\\Docs\\12 - Dezembro\\Dados novos credenciados\\_destino', encoding='utf-8', sep=';') # Ajuste 'encoding' e 'sep' se necessário

# 3. Iterar pelas linhas e enviar para o WP
for index, row in df.iterrows():
    # Mapear dos dados do csv para o formato da API
    # Ajuste 'titulo_coluna_csv' e 'conteudo_coluna_csv' para os nomes das suas colunas
    dados_post = {
        'title': row['titulo_coluna_csv'],
        'content':row['conteudo_coluna_csv'],
        'status': 'publish' # 'publish', 'draft', 'pending'
    }
    
    # enviar a requisição POST
    resposta = requests.post(
        URL_WP,
        headers={'Content-Type': 'application/json'},
        data=json.dumps(dados_post)
    )
    
    if resposta.status_code == 201:
        print(f"Post criado com sucesso: {['titulo_coluna_csv']}")
    else:
        print(f"Erro ao criar post: {resposta.text}")