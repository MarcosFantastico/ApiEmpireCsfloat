// src/csfloatScraper.js
// ATENÇÃO: Este scraper espera receber um contexto de navegador JÁ ABERTO.

const NO_THANKS_POPUP_BUTTON_SELECTOR = 'button:has-text("No Thanks")';
const NOTIFICATION_OVERLAY_SELECTOR = 'div.cdk-overlay-backdrop';

async function handlePopups(page) {
    try {
        const noThanksButton = page.locator(NO_THANKS_POPUP_BUTTON_SELECTOR);
        if (await noThanksButton.isVisible({ timeout: 500 })) {
            await noThanksButton.click();
        }
        
        const notificationOverlay = page.locator(NOTIFICATION_OVERLAY_SELECTOR);
        if (await notificationOverlay.isVisible({ timeout: 500 })) {
            await notificationOverlay.click();
        }
    } catch (e) {
        // Ignora erros de popup
    }
}


async function rasparMelhorOrdemDeCompra(context, url) {
    let page = null;
    try {
        page = await context.newPage();
        await page.setDefaultTimeout(25000); 

        // Bloqueia mídias pesadas para maximizar velocidade
        await page.route('**/*.{png,jpg,jpeg,gif,css,font}', route => route.abort());

        await page.goto(url, { waitUntil: 'domcontentloaded' });
        await handlePopups(page);

        // 1. CLIQUE PARA ABRIR O NOVO MODAL
        const PRIMEIRO_ITEM_CARD = 'div.content div.header, .item-card'; 
        await page.waitForSelector(PRIMEIRO_ITEM_CARD);
        await page.waitForTimeout(1000); 
        await page.click(PRIMEIRO_ITEM_CARD);

        // 2. ESPERA OS DADOS REAIS CARREGAREM
        // Em vez de esperar só o container, esperamos a linha da tabela nascer
        const ROW_SELECTOR = '.buy-orders-container tr.mat-mdc-row, table tr.mat-mdc-row';
        await page.waitForSelector(ROW_SELECTOR, { timeout: 10000 });
        
        // O SEGREDO CONTRA A "RAPIDEZ": Aguarda mais 1 segundo para garantir 
        // que o "loading" sumiu e os preços reais (da API deles) foram injetados na tabela.
        await page.waitForTimeout(1200); 

        const rows = await page.locator(ROW_SELECTOR).all();
        
        if (rows.length === 0) {
            console.log('[SCRAPER] Nenhuma linha de Buy Order identificada no modal.');
            return null;
        }

        const isStandardSkin = url.includes('paint_index');

        for (const row of rows) {
            const isHeader = await row.locator('th').count() > 0;
            if (isHeader) continue;

            // --- FILTROS DE RESTRIÇÃO (Apenas para Armas/Facas) ---
            if (isStandardSkin) {
                await page.mouse.move(0, 0); 
                const priceCell = row.locator('.cdk-column-price'); 
                
                // Se a célula não estiver visível (pode ser um erro de renderização do site), pula
                if (!(await priceCell.isVisible())) continue;

                await priceCell.hover(); 
                await page.waitForTimeout(400); 

                const popover = page.locator('.cdk-overlay-popover[popover="manual"]').last();
                
               if (await popover.isVisible()) {
                    // 1. Verificação Visual (Para quando o CSFloat renderiza a imagem do adesivo)
                    const requiredStickerLocator = popover.locator('img[alt="STICKER"], img[alt^="STICKER"], img[alt*="Sticker"], .required-sticker-image');

                    if (await requiredStickerLocator.count() > 0) {
                        console.log(`[SCRAPER] Ignorando Buy Order com restrição de ADESIVO COLADO (Imagem detectada).`);
                        continue; 
                    }
                    
                    // 2. Verificação por Texto (Para quando usam código como "HasSticker(...)" ou exigem Seed/Pattern)
                    const popoverText = await popover.innerText();
                    
                    const restricaoTextoDetectada = [
                        'Sticker', 'HasSticker', // Pega adesivos por texto
                        'Seed', 'Pattern',       // Pega exigências de desenho (Blue Gem, Fade)
                        'Charm', 'Keychain'      // Pega exigências de chaveiro
                    ].some(term => popoverText.toLowerCase().includes(term.toLowerCase()));
                    
                    if (restricaoTextoDetectada) {
                        console.log(`[SCRAPER] ⛔ Ignorando Buy Order com restrição via TEXTO: ${popoverText.replace(/\n/g, ' ')}`);
     continue;
                    }
                }
            }

            // --- EXTRAÇÃO DO PREÇO BLINDADA (Regex) ---
            const texto = await row.innerText();
            
            // Procura exatamente pelo $ seguido de números e pontos/vírgulas (Ignora a % do CSFloat)
            const priceMatch = texto.match(/\$\s*([\d,.]+)/);
            
            if (priceMatch) {
                const price = parseFloat(priceMatch[1].replace(',', ''));
                
                // O CSFloat coloca a quantidade na última coluna da tabela. 
                // Essa regex pega o último número inteiro da linha toda.
                const qtyMatch = texto.match(/(\d+)\s*$/);
                const quantity = qtyMatch ? parseInt(qtyMatch[1]) : 1;
                
                if (!isNaN(price) && !isNaN(quantity) && price > 0) {
                    console.log(`[SCRAPER] Melhor ordem GENÉRICA e VÁLIDA encontrada: $${price} (Qtd: ${quantity})`);
                    return { price, quantity };
                }
            }
        }
        
        console.log('[SCRAPER] Nenhuma ordem de compra genérica disponível.');
        return null;

    } catch (error) {
        console.error(`[SCRAPER ERROR] Falha ao analisar o novo layout: ${error.message}`);
        return null;
    } finally {
        if (page) await page.close(); 
    }
}
module.exports = { rasparMelhorOrdemDeCompra };