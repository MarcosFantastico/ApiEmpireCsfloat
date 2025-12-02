// csfloatService.js

require("dotenv").config({ path: 'credentials.env' });

//const PLAYWRIGHT_CHROME_PATH = 'C:\\Users\\Marcos\\AppData\\Local\\ms-playwright\\chromium-1187\\chrome-win\\chrome.exe'; // <-- SUBSTITUA COM SEU CAMINHO REAL!
//const PLAYWRIGHT_CHROME_PATH = process.env.PLAYWRIGHT_CHROME_PATH
// ... (suas constantes CSFLOAT_API_TOKEN, CSFLOAT_API_URL, OPTIONS não mudam) .....

const CSFLOAT_API_TOKEN = process.env.CSFLOAT_TOKEN;
if (!CSFLOAT_API_TOKEN) {
    throw new Error("Token da API do CSFloat não encontrado. Verifique seu arquivo .env");
}

const CSFLOAT_API_URL = "https://csfloat.com/api/v1/listings";
const OPTIONS = {
    method: "GET",
    headers: {
        "Accept": "application/json",
        "Authorization": CSFLOAT_API_TOKEN
    }
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function gerarLinkDeBusca(nomeDaSkin, floatDeEntrada) {
    const timestamp = new Date().toLocaleString('pt-BR');
    console.log(`[${timestamp}] [INFO] 1. Iniciando busca para: '${nomeDaSkin}'... Float: ${floatDeEntrada}`);

    const nomeCodificado = encodeURIComponent(nomeDaSkin);
    const urlApi = `${CSFLOAT_API_URL}?market_hash_name=${nomeCodificado}&limit=1`;

    const MAX_RETRIES = 3;
    const RETRY_DELAY = 2000; // 2 segundos de atraso entre as tentativas
    const REQUEST_TIMEOUT = 10000; // 10 segundos de timeout para a requisição

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            console.log(`[${new Date().toLocaleString('pt-BR')}] [INFO] Tentativa ${attempt}/${MAX_RETRIES} para ${nomeDaSkin}`);
            
            // --- Lógica de Timeout ---
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
            // -------------------------

            const response = await fetch(urlApi, {
                ...OPTIONS,
                signal: controller.signal // Adiciona o sinal do AbortController
            });
            
            // Limpa o timeout se a resposta chegar a tempo
            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorBody = await response.text();
                // Este é um erro HTTP, a conexão funcionou mas a resposta foi um erro
                throw new Error(`Resposta HTTP não foi OK. Status: ${response.status}. Body: ${errorBody}`);
            }

            const respostaCompleta = await response.json();
            const dados = respostaCompleta.data;

            if (dados && dados.length > 0) {
                const item = dados[0]?.item;
                const defIndex = item?.def_index;
                const paintIndex = item?.paint_index;

                if (defIndex !== undefined && paintIndex !== undefined) {
                    console.log(`[${new Date().toLocaleString('pt-BR')}] [SUCESSO] IDs encontrados na tentativa ${attempt}.`);
                    
                    // --- LÓGICA PARA DETECTAR STATTRAK™ ---
                    let categoryCode;
                    if (nomeDaSkin.startsWith('StatTrak™')) {
                        console.log(`[${new Date().toLocaleString('pt-BR')}] [INFO] Skin StatTrak™ detectada.`);
                        categoryCode = 2; // Código para StatTrak™
                    } else {
                        categoryCode = 1; // Código para Normal
                    }
                    // -----------------------------------------
                    
                    var float_considerado = parseFloat(floatDeEntrada) + 0.001;
                    const maxFloat = Math.ceil(float_considerado * 100) / 100;
                    
                    // --- PARÂMETROS DA URL ATUALIZADOS ---
                    const params = new URLSearchParams({
                        def_index: defIndex,
                        paint_index: paintIndex,
                        max_float: maxFloat.toFixed(2),
                        sort_by: 'highest_float',
                        category: categoryCode // Adiciona o parâmetro de categoria
                    });
                    // -------------------------------------

                    const linkFinal = `https://csfloat.com/search?${params.toString()}`;
                    return linkFinal;
                }
            }
            
            console.log(`[${new Date().toLocaleString('pt-BR')}] [AVISO] Nenhuma listagem encontrada na API para '${nomeDaSkin}'.`);
            return null;

        } catch (error) {
            const errorTimestamp = new Date().toLocaleString('pt-BR');
            console.log(`[${errorTimestamp}] [ERRO] Falha na tentativa ${attempt}: ${error.name} - ${error.message}`);
            
            // O objeto 'cause' pode dar mais detalhes sobre o erro de rede
            if (error.cause) {
                console.log(`[${errorTimestamp}] [DETALHE DO ERRO] Causa:`, error.cause);
            }

            if (attempt === MAX_RETRIES) {
                console.log(`[${errorTimestamp}] [ERRO GRAVE] Todas as ${MAX_RETRIES} tentativas falharam. Desistindo.`);
                return null; // Desiste após a última tentativa
            }

            console.log(`[${errorTimestamp}] [INFO] Aguardando ${RETRY_DELAY / 1000}s para a próxima tentativa...`);
            await sleep(RETRY_DELAY); // Espera antes da próxima tentativa
        }
    }
}

module.exports = {
    gerarLinkDeBusca
};