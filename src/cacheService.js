// src/cacheService.js
const cacheBuyOrders = new Map();
const TEMPO_EXPIRACAO_MS = 15 * 60 * 1000; // 15 minutos

function getPrecoCache(nomeItem) {
    if (cacheBuyOrders.has(nomeItem)) {
        const dados = cacheBuyOrders.get(nomeItem);
        // Verifica se o dado ainda é válido
        if (Date.now() - dados.timestamp < TEMPO_EXPIRACAO_MS) {
            return dados.preco;
        } else {
            cacheBuyOrders.delete(nomeItem); // Remove se venceu
        }
    }
    return null; // Não achou ou venceu
}

function salvarPrecoCache(nomeItem, preco) {
    // Se o preço for 0 ou null, não salvamos (para tentar de novo na próxima)
    if (!preco) return;

    cacheBuyOrders.set(nomeItem, {
        preco: preco,
        timestamp: Date.now()
    });

    // Limpeza de segurança para não estourar a memória se rodar por semanas
    if (cacheBuyOrders.size > 5000) {
        cacheBuyOrders.clear();
        console.log('[CACHE] Memória limpa automaticamente.');
    }
}

module.exports = { getPrecoCache, salvarPrecoCache };