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

    // 1. VERIFICA CACHE
    if (metadataCache.has(nomeBase)) {
        const cachedData = metadataCache.get(nomeBase);
        if (cachedData.ignore) return null;
        return construirLinkComIds(cachedData, nomeDaSkin, floatDeEntrada);
    }

    // --- CONSULTA API ---
    console.log(`[API] Descobrindo IDs para: '${nomeBase}'...`);
    const nomeCodificado = encodeURIComponent(nomeDaSkin);
    const urlApi = `${CSFLOAT_API_URL}?market_hash_name=${nomeCodificado}&limit=1`;

    try {
        // Delay para evitar Rate Limit
        await sleep(20000 + Math.random() * 20000);

        const response = await fetch(urlApi, OPTIONS);
        if (!response.ok) return null;

        const dados = await response.json();
        const itemData = dados.data?.[0]?.item;
if (itemData) {
    const infoParaCache = {
        def_index: itemData.def_index,
        paint_index: itemData.paint_index || 0
    };

    // VERIFICAÇÃO CRÍTICA: Se for sticker, OBRIGATORIAMENTE precisamos do sticker_id
    if (nomeBase.includes('Sticker |')) {
        if (itemData.sticker_id !== undefined) {
            infoParaCache.sticker_id = itemData.sticker_id;
        } else {
            // Se a API não retornou sticker_id, não salvamos para não viciar o cache com 0
            console.log(`[AVISO] API não retornou sticker_id para ${nomeBase}. Tentaremos novamente na próxima.`);
            return null;
        }
    }

    metadataCache.set(nomeBase, infoParaCache);
    salvarMetadataNoDisco();
    
    return construirLinkComIds(infoParaCache, nomeDaSkin, floatDeEntrada);
}
        
        metadataCache.set(nomeBase, { ignore: true });
        salvarMetadataNoDisco();
        return null;
    } catch (error) {
        console.error(`[API ERROR]: ${error.message}`);
        return null;
    }
}

function construirLinkComIds(cachedData, nomeCompleto, floatDeEntrada) {
    const params = new URLSearchParams();

    // 1. Identificação do Tipo de Item
    // Verificamos se é arma/faca/luva (whitelist)
    const eArmaOuFaca = [
        'AK-47', 'M4A4', 'M4A1-S', 'AWP', 'Desert Eagle', 'Glock-18', 'USP-S', 
        'P250', 'Five-SeveN', 'Tec-9', 'CZ75-Auto', 'Dual Berettas', 'P2000', 
        'R8 Revolver ', 'Galil AR', 'FAMAS', 'SG 553', 'AUG', 'SSG 08', 'G3SG1', 
        'SCAR-20', 'MP9', 'MAC-10', 'MP7', 'MP5-SD', 'UMP-45', 'P90', 'PP-Bizon', 
        'Nova', 'XM1014', 'MAG-7', 'Sawed-Off', 'M249', 'Negev', 'Knife', 'Bayonet', 
        'Karambit', 'Daggers', 'Gloves', 'Wraps', '★'
    ].some(tipo => nomeCompleto.includes(tipo));

    const eSticker = nomeCompleto.includes('Sticker |') || cachedData.sticker_id !== undefined;

    // 2. Montagem da URL Baseada no Tipo
    if (eSticker) {
        // STICKERS: Apenas o sticker_index (não aceita sort_by)
        params.append('sticker_index', cachedData.sticker_id || cachedData.paint_index);
    } 
    else if (!eArmaOuFaca) {
        // AGENTES E CAIXAS: Apenas o def_index (sort_by buga a busca aqui!)
        params.append('def_index', cachedData.def_index);
    } 
    else {
        // ARMAS: def + paint + category + sort + float
        params.append('def_index', cachedData.def_index);
        params.append('paint_index', cachedData.paint_index);
        
        let categoryCode = 1;
        if (nomeCompleto.startsWith('StatTrak™')) categoryCode = 2;
        else if (nomeCompleto.startsWith('Souvenir')) categoryCode = 3;
        params.append('category', categoryCode);
        
        // Ordenação por float só entra aqui
        params.append('sort_by', 'lowest_float');

        if (floatDeEntrada && floatDeEntrada > 0.000001) {
            const float_considerado = parseFloat(floatDeEntrada) + 0.00001;
            const maxFloat = Math.ceil(float_considerado * 10000) / 10000;
            params.append('min_float', maxFloat.toFixed(4));
        }
    }

    return `https://csfloat.com/search?${params.toString()}`;
}
module.exports = { gerarLinkDeBusca };