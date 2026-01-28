// src/csfloatService.js
const fs = require('fs');
const path = require('path');
require("dotenv").config({ path: 'credentials.env' });

const CSFLOAT_API_TOKEN = process.env.CSFLOAT_TOKEN;
const METADATA_FILE = path.join(__dirname, 'metadata.json');

// --- CARREGAR CACHE DO DISCO ---
let metadataCache = new Map();

if (fs.existsSync(METADATA_FILE)) {
    try {
        const rawData = fs.readFileSync(METADATA_FILE);
        const jsonCache = JSON.parse(rawData);
        metadataCache = new Map(Object.entries(jsonCache));
        console.log(`[INIT] Carregados ${metadataCache.size} itens do cache local de metadata.`);
    } catch (e) {
        console.error('[INIT] Erro ao ler metadata.json, iniciando vazio.');
    }
}

function salvarMetadataNoDisco() {
    try {
        const obj = Object.fromEntries(metadataCache);
        fs.writeFileSync(METADATA_FILE, JSON.stringify(obj, null, 2));
    } catch (e) {
        console.error('[CACHE] Erro ao salvar metadata:', e.message);
    }
}

function obterNomeLimpo(marketHashName) {
    if (!marketHashName) return '';
    let limpo = marketHashName;
    limpo = limpo.replace(/ \((Factory New|Minimal Wear|Field-Tested|Well-Worn|Battle-Scarred)\)$/, '');
    limpo = limpo.replace(/^StatTrak™ /, ''); 
    limpo = limpo.replace(/^Souvenir /, ''); 
    return limpo;
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
    const nomeBase = obterNomeLimpo(nomeDaSkin);

    let categoryCode = 1;
    if (nomeDaSkin.startsWith('StatTrak™')) {
        categoryCode = 2;
    } else if (nomeDaSkin.startsWith('Souvenir')) {
        categoryCode = 3;
    }

    // 1. VERIFICA CACHE
    if (metadataCache.has(nomeBase)) {
        const cachedData = metadataCache.get(nomeBase);
        if (cachedData.ignore) return null;

        return construirLinkComIds(cachedData.def_index, cachedData.paint_index, categoryCode, floatDeEntrada);
    }

    // --- CONSULTA API ---
    console.log(`[API] Descobrindo IDs para base: '${nomeBase}'...`);
    const nomeCodificado = encodeURIComponent(nomeDaSkin);
    const urlApi = `${CSFLOAT_API_URL}?market_hash_name=${nomeCodificado}&limit=1`;

    try {
        const delay = 20000 + Math.random() * 40000;
        console.log(`[API] Aguardando ${(delay/1000).toFixed(1)}s para segurança máxima...`);
        await sleep(delay);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000); 

        const response = await fetch(urlApi, { ...OPTIONS, signal: controller.signal });
        clearTimeout(timeoutId);

        if (response.status === 429) {
            console.error(`\x1b[31m[CRÍTICO] RATE LIMIT (429)! Pausando por 5 min.\x1b[0m`);
            await sleep(300000); 
            return null;
        }

        if (!response.ok) return null;

        const dados = await response.json();
        const itemData = dados.data?.[0]?.item;

        if (itemData?.def_index !== undefined && itemData?.paint_index !== undefined) {
            metadataCache.set(nomeBase, {
                def_index: itemData.def_index,
                paint_index: itemData.paint_index
            });
            salvarMetadataNoDisco();
            return construirLinkComIds(itemData.def_index, itemData.paint_index, categoryCode, floatDeEntrada);
        }
        
        console.log(`[API] Item não encontrado. Marcando base '${nomeBase}' para ignorar.`);
        metadataCache.set(nomeBase, { ignore: true });
        salvarMetadataNoDisco();
        return null;

    } catch (error) {
        console.error(`[API ERROR] Falha: ${error.message}`);
        return null;
    }
}

function construirLinkComIds(defIndex, paintIndex, categoryCode, floatDeEntrada) {
    let maxFloatStr = '';
    
    // --- LÓGICA DE PRECISÃO DE 4 CASAS ---
    if (floatDeEntrada && floatDeEntrada > 0.000001) {
        // Pequena margem para garantir que seu item entre no filtro
        var float_considerado = parseFloat(floatDeEntrada) + 0.00001;
        
        // Arredonda para cima na 4ª casa decimal
        const maxFloat = Math.ceil(float_considerado * 10000) / 10000;
        
        maxFloatStr = maxFloat.toFixed(4);
    }

    const params = new URLSearchParams({
        def_index: defIndex,
        paint_index: paintIndex,
        sort_by: 'lowest_float', // alteracao para pegar o item do menor float para o maior
        category: categoryCode
    });

    if (maxFloatStr) params.append('min_float', maxFloatStr);

    return `https://csfloat.com/search?${params.toString()}`;
}

module.exports = { gerarLinkDeBusca };