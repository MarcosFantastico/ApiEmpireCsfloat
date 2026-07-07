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

    // 1. VERIFICAÇÃO DE CACHE
    if (metadataCache.has(nomeBase)) {
        const cachedData = metadataCache.get(nomeBase);
        if (cachedData.ignore) return null;
        return construirLinkComIds(cachedData, nomeDaSkin, floatDeEntrada);
    }

    // --- A CORREÇÃO ESTÁ AQUI ---
    // Limpamos o nome original completo (com desgaste) tirando espaços duplos
    const nomeCompletoLimpo = nomeDaSkin.trim().replace(/\s{2,}/g, ' ');
    
    // Codificamos o NOME COMPLETO para a API, não o nomeBase!
    const nomeCodificado = encodeURIComponent(nomeCompletoLimpo);
    
    console.log(`[API] Buscando IDs para: '${nomeCompletoLimpo}'...`);
    
    // Rota de Listings com o nome completo exigido pela Valve/CSFloat
    const urlApi = `https://csfloat.com/api/v1/listings?market_hash_name=${nomeCodificado}&limit=1`;

try {
        await sleep(15000 + Math.random() * 10000);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000);

        const response = await fetch(urlApi, { ...OPTIONS, signal: controller.signal });
        clearTimeout(timeoutId);

        if (!response.ok) {
            console.log(`[API AVISO] CSFloat respondeu com status ${response.status} para '${nomeCompletoLimpo}'. Pulando por enquanto.`);
            // REMOVIDO: Não salvamos mais ignore: true aqui para não envenenar o cache por causa de lag!
            return null;
        }

        const dados = await response.json();
        const listing = dados.data?.[0];

        if (listing && listing.item) {
            const itemData = listing.item;
            
            const infoParaCache = {
                def_index: itemData.def_index,
                paint_index: itemData.paint_index || 0
            };

            if (nomeBase.includes('Sticker |')) {
                const sId = itemData.sticker_index || itemData.sticker_id || itemData.stickerId || listing.sticker_details?.sticker_id;
                if (sId) infoParaCache.sticker_id = sId;
                else return null;
            }
            else if (nomeBase.includes('Charm |')) {
                const cId = itemData.keychain_index || itemData.keychain_id;
                if (cId) infoParaCache.keychain_id = cId;
                else return null;
            }
            else if (nomeBase.includes('Music Kit |')) {
                const mId = itemData.music_kit_index || itemData.music_kit_id;
                if (mId) infoParaCache.music_kit_id = mId;
                else return null;
            }
            else if (nomeBase.includes('Patch |')) {
                const pId = itemData.sticker_index || itemData.sticker_id || itemData.patch_index;
                if (pId) infoParaCache.patch_id = pId;
                else return null;
            }

            // SALVA NO CACHE APENAS QUANDO DER SUCESSO ABSOLUTO!
            metadataCache.set(nomeBase, infoParaCache);
            salvarMetadataNoDisco();
            
            return construirLinkComIds(infoParaCache, nomeDaSkin, floatDeEntrada);
        }

        // Se chegou aqui, a API retornou 200 OK mas array vazio [] (Estoque zerado naquele minuto)
        console.log(`[API] '${nomeCompletoLimpo}' sem listagens no momento. Retentaremos na próxima vez.`);
        // REMOVIDO: Não salvamos ignore: true. Pode ser que falte só a Factory New, mas a Field-Tested exista!
        return null; 

    } catch (error) {
        console.error(`[API ERROR] Falha de rede ao buscar '${nomeCompletoLimpo}': ${error.message}`);
        // REMOVIDO: Não salvamos ignore: true por causa de queda de internet!
        return null;
    }

}

function construirLinkComIds(cachedData, nomeCompleto, floatDeEntrada) {
    const params = new URLSearchParams();

    // Identificação dos Tipos baseada no Cache
    const eSticker = cachedData.sticker_id !== undefined;
    const eCharm = cachedData.keychain_id !== undefined;
    const eMusicKit = cachedData.music_kit_id !== undefined;
    const ePatch = cachedData.patch_id !== undefined;

    // 1. STICKERS
    if (eSticker) {
        params.append('sticker_index', cachedData.sticker_id);
    } 
    // 2. CHARMS (CHAVEIROS)
    else if (eCharm) {
        params.append('keychain_index', cachedData.keychain_id);
    }

// 3. MUSIC KITS (COM SUPORTE A STATTRAK E NORMAL)
    else if (eMusicKit) {
        params.append('music_kit_index', cachedData.music_kit_id);
        
        // Assim como nas armas, FORÇAMOS a categoria para não misturar
        let categoryCode = 1; // 1 = Normal
        if (nomeCompleto.includes('StatTrak™')) {
            categoryCode = 2; // 2 = StatTrak
        }
        params.append('category', categoryCode);
    }

    // 4. PATCHES
    else if (ePatch) {
        params.append('sticker_index', cachedData.patch_id);
    }
   // 5. ARMAS, AGENTES, CAIXAS (PADRÃO)
   else {
        params.append('def_index', cachedData.def_index);
        
        const temPaintIndex = cachedData.paint_index && cachedData.paint_index !== 0;
        
        if (temPaintIndex || nomeCompleto.includes('Medusa') || nomeCompleto.includes('Dragon Lore')) {
             params.append('paint_index', cachedData.paint_index);
             
             let categoryCode = 1; // 1 = Normal
             if (nomeCompleto.includes('StatTrak™')) categoryCode = 2;
             else if (nomeCompleto.includes('Souvenir')) categoryCode = 3;
             
             params.append('category', categoryCode);
             
             // --- AQUI COMEÇA A MUDANÇA DA ORDENAÇÃO ---
             const floatValido = floatDeEntrada && !isNaN(parseFloat(floatDeEntrada));

             if (floatValido && parseFloat(floatDeEntrada) > 0.000001) {
                // TEM FLOAT EXATO: Compara com itens levemente piores (Ordena do menor pro maior)
                params.append('sort_by', 'lowest_float');
                
                const float_considerado = parseFloat(floatDeEntrada) + 0.00001;
                const maxFloat = Math.ceil(float_considerado * 10000) / 10000;
                params.append('min_float', maxFloat.toFixed(4));
            } else {
                // FLOAT N/A: Assume que é a pior skin possível dentro daquele desgaste
                params.append('sort_by', 'highest_float'); // Inverte a ordem no CSFloat!

                if (nomeCompleto.includes('(Factory New)')) {
                    params.append('min_float', '0');
                    params.append('max_float', '0.07');
                } else if (nomeCompleto.includes('(Minimal Wear)')) {
                    params.append('min_float', '0.07');
                    params.append('max_float', '0.15');
                } else if (nomeCompleto.includes('(Field-Tested)')) {
                    params.append('min_float', '0.15');
                    params.append('max_float', '0.38');
                } else if (nomeCompleto.includes('(Well-Worn)')) {
                    params.append('min_float', '0.38');
                    params.append('max_float', '0.45');
                } else if (nomeCompleto.includes('(Battle-Scarred)')) {
                    params.append('min_float', '0.45');
                    params.append('max_float', '1');
                }
            }
        }
    }

    return `https://csfloat.com/search?${params.toString()}`;
}

module.exports = { gerarLinkDeBusca };