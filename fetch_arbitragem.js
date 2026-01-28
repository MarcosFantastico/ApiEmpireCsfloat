// fetch_arbitragem.js
require("dotenv").config({ path: 'credentials.env' });

const { enviarWhatsapp, initializeWhatsApp, desligarWhatsapp } =
    require('./src/notificarWhatsapp-baileys.js');
const csfloatLoginManager = require('./src/csfloatLoginManager.js');
const csfloatService = require('./src/csfloatService.js');
const scraper = require('./src/csfloatScraper.js');
const cacheService = require('./src/cacheService.js');
const TelegramBot = require('node-telegram-bot-api');

// --- CONFIGURAÇÕES ---
const SALDO_MAXIMO_USD = 100.00; 
const MARGEM_LUCRO_MINIMA_USD = 1.00; 
const TAXA_CSFLOAT = 0.98; 
const COIN_EMPIRE = 0.6142808; 
const CHAT_ID_TELEGRAM = '5175130296'; 
const ZAP_ID = '120363402483665337@g.us'; 

const TERMOS_IGNORADOS = [
    'Sticker |', 'Graffiti |', 'Patch |', 'Music Kit |', 'Case', 
    'Capsule', 'Package', 'Charm |', 'Pin', 'Sir ', 'The ', 'Agent', 
    'Cmdr.', 'Lt. Commander', 'Officer', 'Osiris', 'Prof.', 'Rezan', 
    'Getaway', 'Number K', 'Little Kev', 'Dragomir', 'Maximus', 'Enforcer', 
    'Slingshot', 'Soldier'
];

const bot = new TelegramBot(process.env.telegranBotToken, { polling: true });

bot.on('polling_error', (error) => {
  if (error.code === 'EFATAL' || error.code === 'ETIMEDOUT') return; 
  console.log(`[TELEGRAM POLLING] Erro: ${error.code}`);
});

// Inicializa o Zap
initializeWhatsApp();

const processedIds = new Set();
let globalBrowser = null;
let isShuttingDown = false; // Controle para parar o loop suavemente

function escapeTelegram(text) {
    if (!text) return '';
    return String(text).replace(/[_*[\]()~>#\+\-=|{}.!]/g, '\\$&');
}

async function fetchEmpireItens() {
    try {
        const maxPriceApi = Math.floor((SALDO_MAXIMO_USD / COIN_EMPIRE) * 100);
        const url = `https://csgoempire.com/api/v2/trading/items?page=1&per_page=100&auction=yes&price_min=100&price_max=${maxPriceApi}`;
        
        const response = await fetch(url, {
            headers: { "Authorization": `Bearer ${process.env.EMPIRE_TOKEN}` }
        });
        const json = await response.json();
        return json.data || [];
    } catch (e) {
        console.error(`[EMPIRE] Erro ao buscar itens: ${e.message}`);
        return [];
    }
}

async function processarItens() {
    if (isShuttingDown) return;

    if (!globalBrowser) {
        console.error('[ERRO CRÍTICO] Navegador não inicializado! Tentando reconectar...');
        try {
             globalBrowser = await csfloatLoginManager.launchBrowserContext(false, true);
        } catch(e) { return; }
    }

    console.log(`[${new Date().toLocaleTimeString()}] Buscando itens no Empire...`);
    const itens = await fetchEmpireItens();

    for (const item of itens) {
        if (isShuttingDown) break; // Para o loop se estiver desligando
        if (processedIds.has(item.id)) continue;
        
        const nomeItem = item.market_name;
        const floatItem = item.wear || 0; 

        if (floatItem <= 0.000001) { processedIds.add(item.id); continue; }
        if (TERMOS_IGNORADOS.some(termo => nomeItem.includes(termo))) { processedIds.add(item.id); continue; }

        const precoEmpire = (item.purchase_price / 100) * COIN_EMPIRE;
        let precoBuyOrder = cacheService.getPrecoCache(nomeItem);
        let origemPreco = "CACHE";
        let linkCsFloat = null;

        if (!precoBuyOrder) {
            origemPreco = "LIVE SCRAP";
            linkCsFloat = await csfloatService.gerarLinkDeBusca(nomeItem, floatItem);
            
            if (!linkCsFloat) continue; 

            try {
                const resultado = await scraper.rasparMelhorOrdemDeCompra(globalBrowser, linkCsFloat);
                if (resultado) {
                    precoBuyOrder = resultado.price;
                    cacheService.salvarPrecoCache(nomeItem, precoBuyOrder);
                } else {
                    console.log(`[SCRAPER] Sem Buy Order para: ${nomeItem}`);
                    processedIds.add(item.id); 
                    continue;
                }
            } catch (scraperError) {
                console.error(`[SCRAPER] Erro ao raspar ${nomeItem}: ${scraperError.message}`);
                continue; 
            }
        }

        const receboLiquido = precoBuyOrder * TAXA_CSFLOAT;
        const lucro = receboLiquido - precoEmpire;

        if (lucro >= MARGEM_LUCRO_MINIMA_USD) {
            console.log(`\x1b[32m[OPORTUNIDADE] ${nomeItem} | Lucro: $${lucro.toFixed(2)}\x1b[0m`);
            if (!linkCsFloat) linkCsFloat = await csfloatService.gerarLinkDeBusca(nomeItem, floatItem);
            if (linkCsFloat) await notificar(item, precoEmpire, precoBuyOrder, lucro, floatItem, linkCsFloat);
        }

        processedIds.add(item.id);
        if (origemPreco === "LIVE SCRAP") await new Promise(r => setTimeout(r, 2000));
        else await new Promise(r => setTimeout(r, 50));
    }
    if (processedIds.size > 5000) processedIds.clear();
}

async function notificar(item, precoEmp, precoBO, lucro, floatVal, linkCsFloat) {
    const nomeSafe = escapeTelegram(item.market_name);
    let floatDisplay = floatVal > 0.000001 ? floatVal.toFixed(5) : "N/A";
    const floatSafe = escapeTelegram(floatDisplay);
    
    const precoEmpSafe = escapeTelegram(precoEmp.toFixed(2));
    const precoBOSafe = escapeTelegram(precoBO.toFixed(2));
    const lucroSafe = escapeTelegram(lucro.toFixed(2));
    
    const margemNum = (lucro / precoEmp) * 100;
    const margemSafe = escapeTelegram(margemNum.toFixed(1));

    // Link do Empire
    const linkEmpire = `https://csgoempire.com/item/${item.id}`;

    // MENSAGEM TELEGRAM (Com os dois links separados)
    const msgTelegram = `🚨 *ARBITRAGEM DETECTADA\\!* 🚨
    
📦 *${nomeSafe}*
🎚️ Float: ${floatSafe}

🏛️ *Empire*: $${precoEmpSafe}
🛒 *CSFloat*: $${precoBOSafe}

💰 *Lucro*: $${lucroSafe}
📉 *Margem*: ${margemSafe}%

[🔗 Ver no Empire](${linkEmpire})
[🔗 Ver no CSFloat](${linkCsFloat})`;
    
    // MENSAGEM WHATSAPP (Links visíveis)
    const msgZap = `🚨 ARBITRAGEM DETECTADA!

📦 ${item.market_name}
🎚️ Float: ${floatDisplay}

🏛️ Empire: $${precoEmp.toFixed(2)}
🛒 CSFloat BO: $${precoBO.toFixed(2)}

💰 Lucro: $${lucro.toFixed(2)}
📉 Margem: ${margemNum.toFixed(1)}%

👇 Links Rápidos:
🏛️ Empire: ${linkEmpire}
🛒 CSFloat: ${linkCsFloat}`;

    // ENVIO TELEGRAM
    try { 
        await bot.sendMessage(CHAT_ID_TELEGRAM, msgTelegram, { 
            parse_mode: 'MarkdownV2', 
            disable_web_page_preview: true 
        }); 
    } catch (e) { console.error(e); }

    // ENVIO WHATSAPP
    try {
        const status = await enviarWhatsapp(ZAP_ID, msgZap);
        if (status === 'SENT') console.log(`✅ [WHATSAPP] Notificação enviada.`);
        else console.log(`⏳ [WHATSAPP] Mensagem na FILA.`);
    } catch (e) { console.error(e); }
}

// --- CONTROLE DE DESLIGAMENTO GRACIOSO (Graceful Shutdown) ---
async function encerrarBot(sinal) {
    if (isShuttingDown) return;
    isShuttingDown = true;
    console.log(`\n🛑 Sinal ${sinal} recebido. Encerrando bot e liberando memória...`);

    // 1. Fecha o navegador do Empire
    if (globalBrowser) {
        console.log('🛑 Fechando Scraper...');
        await globalBrowser.close().catch(() => {});
    }

    // 2. Fecha o WhatsApp Corretamente (IMPORTANTE PARA NÃO CORROMPER)
    await desligarWhatsapp();

    console.log('✅ Tudo limpo. Encerrando processo.');
    process.exit(0);
}

// Ouve os sinais de parada do Windows/Service
process.on('SIGINT', () => encerrarBot('SIGINT'));
process.on('SIGTERM', () => encerrarBot('SIGTERM'));

(async () => {
    console.log("🚀 Iniciando Bot de Arbitragem...");
    
    try {
        globalBrowser = await csfloatLoginManager.launchBrowserContext(false, true);
        console.log('✅ Navegador inicializado.');
    } catch (e) {
        console.error('❌ Falha ao abrir navegador:', e);
        process.exit(1);
    }

    while (!isShuttingDown) {
        try {
            await processarItens();
        } catch (e) {
            console.error("Erro no loop principal:", e);
            await new Promise(r => setTimeout(r, 5000));
        }
        await new Promise(r => setTimeout(r, 3000));
    }
})();