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

    console.log(`[API] Buscando IDs para: '${nomeBase}'...`);
    const nomeCodificado = encodeURIComponent(nomeBase);
    
    // Rota de Listings (Funciona para 99% dos casos com estoque)
    const urlApi = `https://csfloat.com/api/v1/listings?market_hash_name=${nomeCodificado}&limit=1`;

    try {
        // Delay de segurança
        await sleep(15000 + Math.random() * 10000);

        const response = await fetch(urlApi, OPTIONS);
        if (!response.ok) return null;

        const dados = await response.json();
        const listing = dados.data?.[0];

        // Se houver listagem e item válido
        if (listing && listing.item) {
            const itemData = listing.item;
            
            // Objeto base (todo item tem isso)
            const infoParaCache = {
                def_index: itemData.def_index,
                paint_index: itemData.paint_index || 0
            };

            // --- LÓGICA ESPECIAL POR TIPO DE ITEM ---

            // A. STICKERS (Adesivos)
            if (nomeBase.includes('Sticker |')) {
                const sId = itemData.sticker_index ||  // Prioridade 1 (Vem na raiz do item)
                            itemData.sticker_id ||     // Prioridade 2 (Vem em outras rotas)
                            itemData.stickerId ||      // Prioridade 3 (As vezes vem assim)
                            listing.sticker_details?.sticker_id;

                if (sId) {
                    infoParaCache.sticker_id = sId;
                    console.log(`[API] Sticker Index capturado: ${sId}`);
                } else {
                    console.log(`[AVISO] Sticker encontrado, mas sem ID compatível.`);
                    return null; // Não salva cache errado
                }
            }

            // B. CHARMS (Chaveiros)
            else if (nomeBase.includes('Charm |')) {
                const cId = itemData.keychain_index || // Prioridade 1
                            itemData.keychain_id;      // Prioridade 2

                if (cId) {
                    infoParaCache.keychain_id = cId;
                    console.log(`[API] Keychain Index capturado: ${cId}`);
                } else {
                    console.log(`[AVISO] Charm encontrado, mas sem ID compatível.`);
                    return null;
                }
            }

            // C. MUSIC KITS (Trilhas Sonoras)
            else if (nomeBase.includes('Music Kit |')) {
                const mId = itemData.music_kit_index || // Prioridade 1
                            itemData.music_kit_id;      // Prioridade 2

                if (mId) {
                    infoParaCache.music_kit_id = mId;
                    console.log(`[API] Music Kit Index capturado: ${mId}`);
                } else {
                    console.log(`[AVISO] Music Kit encontrado, mas sem ID compatível.`);
                    return null;
                }
            }

            // --- SALVAMENTO ---
            metadataCache.set(nomeBase, infoParaCache);
            salvarMetadataNoDisco();
            
            return construirLinkComIds(infoParaCache, nomeDaSkin, floatDeEntrada);
        }

        // Se chegou aqui, não achou listagem (Array vazio)
        return null; 

    } catch (error) {
        console.error(`[API ERROR]: ${error.message}`);
        return null;
    }
}

function construirLinkComIds(cachedData, nomeCompleto, floatDeEntrada) {
    const params = new URLSearchParams();

    // Identificação dos Tipos baseada no Cache
    const eSticker = cachedData.sticker_id !== undefined;
    const eCharm = cachedData.keychain_id !== undefined;
    const eMusicKit = cachedData.music_kit_id !== undefined;

    // 1. STICKERS
    if (eSticker) {
        params.append('sticker_index', cachedData.sticker_id);
    } 
    // 2. CHARMS (CHAVEIROS)
    else if (eCharm) {
        params.append('keychain_index', cachedData.keychain_id);
    }
    // 3. MUSIC KITS (COM SUPORTE A STATTRAK)
    else if (eMusicKit) {
        params.append('music_kit_index', cachedData.music_kit_id);
        
        // Verifica se o nome original contém StatTrak™
        if (nomeCompleto.includes('StatTrak™')) {
            params.append('category', '2'); // 2 é o código para StatTrak no CSFloat
        }
        else{
             params.append('category', '1');
        }
    }
    // 4. ARMAS, AGENTES, CAIXAS (PADRÃO)
    else {
        params.append('def_index', cachedData.def_index);
        
        // Se for arma (tem paint_index), aplicamos filtros avançados
        const temPaintIndex = cachedData.paint_index && cachedData.paint_index !== 0;
        
        // REMOVIDO o "Music Kit" daqui para não dar conflito!
        if (temPaintIndex || nomeCompleto.includes('Medusa') || nomeCompleto.includes('Dragon Lore')) {
             params.append('paint_index', cachedData.paint_index);
             
             // Categoria (StatTrak / Souvenir) para Armas
             let categoryCode = 1; // Normal
             if (nomeCompleto.includes('StatTrak™')) categoryCode = 2;
             else if (nomeCompleto.includes('Souvenir')) categoryCode = 3;
             
             // Adiciona category apenas se não for a normal, deixando URL mais limpa
            params.append('category', categoryCode);
             
             // Ordenação e Float
             params.append('sort_by', 'lowest_float');
             if (floatDeEntrada && floatDeEntrada > 0.000001) {
                const float_considerado = parseFloat(floatDeEntrada) + 0.00001;
                const maxFloat = Math.ceil(float_considerado * 10000) / 10000;
                params.append('min_float', maxFloat.toFixed(4));
            }
        }
    }

    return `https://csfloat.com/search?${params.toString()}`;
}

module.exports = { gerarLinkDeBusca };