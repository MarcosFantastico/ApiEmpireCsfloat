// teste_service.js
const csfloatService = require('./src/csfloatService.js');

async function rodarTestes() {
    console.log("🧪 INICIANDO TESTE DO SERVICE DE LINKS 🧪\n");

    // Lista de itens extremos para testar todas as lógicas do código
    const itensParaTestar = [
        "StatTrak™ Music Kit | Knock2, dashstar*", // Deve ter music_kit_index e category=2
        "Music Kit | Knock2, dashstar*",           // Deve ter apenas music_kit_index
        "Charm | Pocket Pop",                      // Deve ter keychain_index
        "Sticker | zont1x (Gold) | Budapest 2025", // Deve ter sticker_index
        "StatTrak™ AK-47 | Redline (Field-Tested)" // Deve ter def, paint, category=2 e float
    ];

    for (const item of itensParaTestar) {
        console.log(`\x1b[33m🔎 Testando:\x1b[0m ${item}`);
        
        // Simulando um float arbitrário (0.15) para ver como a arma reage
        const link = await csfloatService.gerarLinkDeBusca(item, 0.15);
        
        if (link) {
            console.log(`\x1b[32m🔗 Link Gerado:\x1b[0m ${link}\n`);
        } else {
            console.log(`\x1b[31m❌ Falha ao gerar link.\x1b[0m\n`);
        }
    }
}

rodarTestes();