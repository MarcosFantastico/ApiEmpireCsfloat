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


# grupo do whatsapp
whatsapp_group='120363402483665337@g.us'


# Funcionamento
# logar no csfloat
node .\src\csfloatLoginManager.js
# apagar baileys auth e csfloat profile(caso pre-existentes)
# rodar fetch geral

# regex de remoçao do metadata
"Patch[^}]*\},
