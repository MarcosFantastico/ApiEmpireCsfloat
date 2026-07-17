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
    // Remove o desgaste de qualquer lugar do nome (ex: antes de " - Phase X")
    limpo = limpo.replace(/ \((Factory New|Minimal Wear|Field-Tested|Well-Worn|Battle-Scarred)\)/g, '');
    limpo = limpo.replace(/^StatTrak™ /, ''); 
    limpo = limpo.replace(/^Souvenir /, ''); 
    return limpo.trim();
}

function ehArmaOuFaca(nomeCompleto) {
    if (nomeCompleto.includes('★') && !nomeCompleto.includes('Gloves') && !nomeCompleto.includes('Wraps') && !nomeCompleto.includes('Hand Wraps')) {
        return true;
    }
    const categoriasArmas = [
        'AK-47', 'M4A4', 'M4A1-S', 'AWP', 'Desert Eagle', 'Glock-18', 'USP-S', 
        'P250', 'Five-SeveN', 'Tec-9', 'CZ75-Auto', 'Dual Berettas', 'P2000', 
        'R8 Revolver', 'Galil AR', 'FAMAS', 'SG 553', 'AUG', 'SSG 08', 'G3SG1', 
        'SCAR-20', 'MP9', 'MAC-10', 'MP7', 'MP5-SD', 'UMP-45', 'P90', 'PP-Bizon', 
        'Nova', 'XM1014', 'MAG-7', 'Sawed-Off', 'M249', 'Negev'
    ];
    return categoriasArmas.some(tipo => nomeCompleto.includes(tipo));
}

function obterDopplerPaintIndex(nomeDaSkin) {
    const isGamma = nomeDaSkin.toLowerCase().includes('gamma doppler');
    const nomeLower = nomeDaSkin.toLowerCase();

    if (isGamma) {
        if (nomeLower.includes('phase 1')) return 569;
        if (nomeLower.includes('phase 2')) return 570;
        if (nomeLower.includes('phase 3')) return 571;
        if (nomeLower.includes('phase 4')) return 572;
        if (nomeLower.includes('emerald')) return 568;
    } else if (nomeLower.includes('doppler')) {
        if (nomeLower.includes('ruby')) return 415;
        if (nomeLower.includes('sapphire')) return 416;
        if (nomeLower.includes('black pearl')) return 417;
        if (nomeLower.includes('phase 1')) return 418;
        if (nomeLower.includes('phase 2')) return 419;
        if (nomeLower.includes('phase 3')) return 420;
        if (nomeLower.includes('phase 4')) return 421;
    }
    return null;
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
        
        // Se estiver como ignore, mas for Doppler, removemos do cache para re-testar com as novas regras
        if (cachedData.ignore && nomeDaSkin.toLowerCase().includes('doppler')) {
            metadataCache.delete(nomeBase);
            salvarMetadataNoDisco();
        } else {
            if (cachedData.ignore) return null;
            return construirLinkComIds(cachedData, nomeDaSkin, floatDeEntrada);
        }
    }

    // --- A CORREÇÃO ESTÁ AQUI ---
    // Limpamos o nome original completo (com desgaste) tirando espaços duplos
    const nomeCompletoLimpo = nomeDaSkin.trim().replace(/\s{2,}/g, ' ');
    
    // CORREÇÃO: O CSFloat/Steam não tem o sufixo " - Phase X" no market_hash_name.
    // Removemos esse sufixo para fazer a chamada de API da Steam/CSFloat correta.
    const nomeSteam = nomeCompletoLimpo.replace(/ - (Phase \d|Emerald|Ruby|Sapphire|Black Pearl)/i, '').trim();
    const nomeCodificado = encodeURIComponent(nomeSteam);
    
    console.log(`[API] Buscando IDs para: '${nomeSteam}'...`);
    
    // Rota de Listings com o nome completo sem a fase exigido pela Valve/CSFloat
    const urlApi = `https://csfloat.com/api/v1/listings?market_hash_name=${nomeCodificado}&limit=1`;

    try {
        await sleep(15000 + Math.random() * 10000);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000);

        const response = await fetch(urlApi, { ...OPTIONS, signal: controller.signal });
        clearTimeout(timeoutId);

        if (!response.ok) {
            console.log(`[API AVISO] CSFloat respondeu com status ${response.status} para '${nomeSteam}'. Pulando por enquanto.`);
            return null;
        }

        const dados = await response.json();
        const listing = dados.data?.[0];

        if (listing && listing.item) {
            const itemData = listing.item;
            
            // Define o paint_index correto de acordo com a fase do Doppler/Gamma Doppler
            let paintIndex = itemData.paint_index || 0;
            const dopplerPaintIndex = obterDopplerPaintIndex(nomeDaSkin);
            if (dopplerPaintIndex !== null) {
                paintIndex = dopplerPaintIndex;
            }
            
            const infoParaCache = {
                def_index: itemData.def_index,
                paint_index: paintIndex
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
        
        // O CSFloat buga se enviarmos category=1 para Music Kits normais, 
        // então deixamos sem filtro de categoria e o Scraper filtra na tela.
        if (nomeCompleto.includes('StatTrak™')) {
            params.append('category', 2); // 2 = StatTrak
        }
    }

    // 4. PATCHES
    else if (ePatch) {
        params.append('sticker_index', cachedData.patch_id);
    }
   // 5. ARMAS, AGENTES, CAIXAS (PADRÃO)
   else {
        params.append('def_index', cachedData.def_index);
        
        // Só aplicamos o filtro de categoria para Armas e Facas!
        // Caixas, Agentes, etc. não usam esse filtro.
        if (ehArmaOuFaca(nomeCompleto)) {
             let categoryCode = 1; // 1 = Normal
             if (nomeCompleto.includes('StatTrak™')) categoryCode = 2;
             else if (nomeCompleto.includes('Souvenir')) categoryCode = 3;
             params.append('category', categoryCode);
        }
        
        const temPaintIndex = cachedData.paint_index && cachedData.paint_index !== 0;
        
        if (temPaintIndex || nomeCompleto.includes('Medusa') || nomeCompleto.includes('Dragon Lore')) {
             params.append('paint_index', cachedData.paint_index);
             
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