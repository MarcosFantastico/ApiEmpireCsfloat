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

/**
 * Raspa a ordem de compra.
 * REGRAS ATUAIS:
 * - IGNORA: Stickers específicos e Seeds/Patterns (Gemas, etc).
 * - ACEITA: Restrições de Float, StatTrak e ordens genéricas.
 */
async function rasparMelhorOrdemDeCompra(context, url) {
    let page = null;
    try {
        page = await context.newPage();
        await page.setDefaultTimeout(25000); 

        // Bloqueia imagens/fontes para velocidade
        await page.route('**/*.{png,jpg,jpeg,gif,css,font}', route => route.abort());

        await page.goto(url, { waitUntil: 'domcontentloaded' });
        
        await handlePopups(page);

        // Abre a lista de Buy Orders
        const PRIMEIRO_ITEM = 'div.content div.header';
        await page.waitForSelector(PRIMEIRO_ITEM);
       // await page.click(PRIMEIRO_ITEM);
       await page.waitForTimeout(2000);  // Pequena pausa para garantir que o clique seja registrado
       await page.click(PRIMEIRO_ITEM);


        


        const PRECO_SELECTOR = 'div.order-container td.cdk-column-price';
        await page.waitForSelector(PRECO_SELECTOR);

        // Pega todas as linhas
        const rows = await page.locator('div.order-container tr.mat-mdc-row').all();

        for (const row of rows) {
            // --- 1. FILTRO RÁPIDO (Ícones Visíveis) ---
            // Se tiver imagem de sticker explícita na linha, pula.
            // (As vezes o CSFloat mostra o ícone do sticker direto na linha)
            const countIcons = await row.locator('img.sticker-image').count(); 
            if (countIcons > 0) continue;

            // --- 2. FILTRO PROFUNDO (HOVER CHECK) ---
            
            // Limpa mouse anterior
            await page.mouse.move(0, 0); 
            await page.waitForTimeout(100); 

            // Passa o mouse na linha atual
            await row.hover();
            await page.waitForTimeout(300); // Espera renderizar tooltip

            // Busca o texto do tooltip
            const overlayContainer = page.locator('.cdk-overlay-container');
            let tooltipText = '';
            
            if (await overlayContainer.isVisible()) {
                 const tooltips = overlayContainer.locator('.mat-mdc-tooltip-surface');
                 if (await tooltips.count() > 0) {
                     tooltipText = await tooltips.last().innerText();
                 } else {
                     tooltipText = await overlayContainer.innerText();
                 }
            }
            
            // --- LISTA DE PALAVRAS QUE INDICAM "ITEM ESPECÍFICO DEMAIS" ---
            // Se tiver isso, a gente PULA a linha.
            // REMOVIDOS: 'Float', 'Paint', 'Rank' (Agora aceitamos float específico)
            const restricaoDetectada = [
                'Sticker', 
                'HasSticker', 
                'Seed', 
                'Pattern'
            ].some(term => tooltipText.includes(term));

            if (restricaoDetectada) {
                // Se pede sticker ou pattern, pula.
                continue; 
            }

            // --- 3. SUCESSO (LINHA VÁLIDA) ---
            // Se chegou aqui, é uma ordem limpa OU uma ordem com restrição de Float (que aceitamos)
            const texto = await row.innerText();
            if (texto && texto.includes('$')) {
                const parts = texto.replace('$', '').trim().split('\t');
                if (parts.length >= 2) {
                    const price = parseFloat(parts[0]);
                    const quantity = parseInt(parts[1]);
                    
                    if (!isNaN(price) && !isNaN(quantity)) {
                        console.log(`[SCRAPER] Melhor ordem VÁLIDA encontrada: $${price} (Qtd: ${quantity})`);
                        return { price, quantity };
                    }
                }
            }
        }
        
        console.log('[SCRAPER] Nenhuma ordem de compra compatível encontrada.');
        return null;

    } catch (error) {
        console.error(`[SCRAPER] Erro na URL ${url}: ${error.message}`);
        return null;
    } finally {
        if (page) await page.close(); 
    }
}

module.exports = { rasparMelhorOrdemDeCompra };