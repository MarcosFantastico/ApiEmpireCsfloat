// teste_service.js
require('dotenv').config({ path: 'credentials.env' });

async function rodarTestes() {
    console.log("🧪 TESTE TIRA-TEIMA DA API (COM HEADERS) 🧪\n");

    const item = "AWP | The End (Field-Tested)";

    console.log(`🔎 Testando entrada do Empire: '${item}'`);
    const nomeCompletoLimpo = item.trim();

    const urlApi = `https://csfloat.com/api/v1/listings?market_hash_name=${encodeURIComponent(nomeCompletoLimpo)}&limit=1`;
    console.log(`\n🌐 URL que vai pro CSFloat: ${urlApi}`);

    // --- A CORREÇÃO ESTÁ AQUI: OS HEADERS PARA NÃO TOMAR BLOCK DO CLOUDFLARE ---
    const OPTIONS = {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json'
        }
    };

    try {
        const response = await fetch(urlApi, OPTIONS);
        
        if (!response.ok) {
            console.log(`\n❌ CSFloat respondeu com erro HTTP: ${response.status}`);
            return;
        }

        const dados = await response.json();

        if (dados.data && dados.data.length > 0) {
            const itemData = dados.data[0].item;
            console.log(`\n🎉 SUCESSO! O CSFloat achou o item!`);
            console.log(`🔫 Def Index capturado: ${itemData.def_index}`);
            console.log(`🎨 Paint Index capturado: ${itemData.paint_index}`);
        } else {
            console.log(`\n❌ CSFloat não achou (retornou vazio []). Isso significa que você buscou o nomeBase em vez do nomeCompleto!`);
        }
    } catch (e) {
        console.log(`\n❌ Erro de Fetch: ${e.message}`);
    }
}

rodarTestes();