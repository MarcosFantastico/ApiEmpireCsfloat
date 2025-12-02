// testScraper.js

// 1. Importa o nosso módulo scraper
const csfloatScraper = require('./src/csfloatScraper.js');

// 2. Define a URL de teste que você forneceu
const URL_PARA_TESTAR = 'https://csfloat.com/search?def_index=36&paint_index=1153&max_float=0.15&sort_by=highest_float&category=1';

// 3. Cria uma função principal "async" para poder usar "await"
async function executarTeste() {
    console.log("=====================================");
    console.log("🚀 INICIANDO TESTE DO SCRAPER 🚀");
    console.log("=====================================");

    // Chama a função importada e aguarda o resultado
    const ordensDeCompra = await csfloatScraper.rasparMelhorOrdemDeCompra(URL_PARA_TESTAR);

    console.log("\n=====================================");
    console.log("✅ TESTE CONCLUÍDO ✅");
    console.log("=====================================");

    // 4. Exibe o resultado final
    if (ordensDeCompra) {
        console.log("\nResultado da Raspagem (Ordens de Compra):");
        // console.log(ordensDeCompra);
        
        // Usar console.table para uma visualização mais bonita se for um array de objetos
        if (ordensDeCompra.length > 0) {
            console.table(ordensDeCompra);
        } else {
            console.log("Nenhuma ordem de compra encontrada na página.");
        }

    } else {
        console.log("\nA raspagem falhou ou não retornou dados. Verifique os logs de erro acima.");
    }
}

// 5. Executa a função de teste
executarTeste();