criar arquivo abaixo na raiz do projeto com os conteúdos listados
# credentials.env

# api token csgoempire
EMPIRE_TOKEN= xxxxxx

# token csfloat
CSFLOAT_TOKEN= xxxxxxx

# token telegram bot
telegranBotToken='xxxxxx'

# Chat id telegram
telegram_chat_id=xxxxxx

# Funcionamento
# logar no csfloat
node .\src\csfloatLoginManager.js
# apagar baileys auth e csfloat profile(caso pre-existentes)
# rodar fetch geral
