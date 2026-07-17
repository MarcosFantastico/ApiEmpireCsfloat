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

async function salvarScreenshot(page, tipo) {
    if (!page) return;
    try {
        const fs = require('fs');
        const path = require('path');
        const dir = path.join(__dirname, '../logs/screenshots');
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        const filename = `${tipo}_${Date.now()}.png`;
        await page.screenshot({ path: path.join(dir, filename) });
        console.log(`[SCRAPER] 📸 Screenshot (${tipo}) salvo em: logs/screenshots/${filename}`);
    } catch (e) {
        console.error(`[SCRAPER ERROR] Falha ao salvar screenshot (${tipo}): ${e.message}`);
    }
}

async function rasparMelhorOrdemDeCompra(context, url) {
    let page = null;
    try {
        page = await context.newPage();
        await page.setDefaultTimeout(25000); 

        // Bloqueia mídias pesadas para maximizar velocidade
        await page.route('**/*.{png,jpg,jpeg,gif,css,font}', route => route.abort());

        // Usa 'networkidle' para garantir que os cards já carregaram antes de tentar interagir
        await page.goto(url, { waitUntil: 'networkidle', timeout: 20000 }).catch(() => null);
        await handlePopups(page);

        // 1. CLIQUE PARA ABRIR O NOVO MODAL
        const CARD_SELECTOR = '.item-card, mat-card, cdk-row';
        
        // Espera que apareçam cards OU a mensagem de "sem resultados"
        const foundNoItemsLocator = page.locator(':text("Found No Items")');
        await Promise.race([
            page.waitForSelector(CARD_SELECTOR, { timeout: 12000 }).catch(() => null),
            foundNoItemsLocator.waitFor({ state: 'visible', timeout: 12000 }).catch(() => null)
        ]);
        
        // Se a página não tem resultados, retorna silenciosamente (sem salvar print de erro)
        if (await foundNoItemsLocator.count() > 0) {
            console.log('[SCRAPER] ℹ️ "Found No Items" — sem listings no CSFloat para este item no momento.');
            return null;
        }
        
        // Aguarda mais 1.5s para os cards renderizarem completamente (Angular é lazy)
        await page.waitForTimeout(1500); 
        
        const cards = await page.locator(CARD_SELECTOR).all();
        let selectedCard = null;
        
        const querStatTrak = url.includes('category=2');
        const querSouvenir = url.includes('category=3');
        
        for (const card of cards) {
            const text = await card.innerText();
            const textLower = text.toLowerCase();
            
            // Se NÃO queremos StatTrak, mas o card é StatTrak, pula
            if (!querStatTrak && textLower.includes('stattrak')) {
                continue;
            }
            
            // Filtra Souvenir apenas em SKINS (NÃO em Souvenir Packages/caixas do tipo torneio)
            // O card de uma CAIXA souvenir contém "container" ou "package" no texto dele
            // O card de uma SKIN souvenir contém o wear ("minimal wear", "field-tested", etc.)
            if (!querSouvenir && textLower.includes('souvenir')) {
                const isSouvenirContainer = 
                    textLower.includes('container') || 
                    textLower.includes('package') ||
                    textLower.includes('souvenir package');
                if (!isSouvenirContainer) {
                    // É skin souvenir de arma, não queremos — pula
                    continue;
                }
                // É uma caixa/package souvenir — aceita normalmente
            }
            
            selectedCard = card;
            break;
        }
        
        if (!selectedCard) {
            console.log('[SCRAPER] Nenhum card correspondente aos filtros encontrado.');
            await salvarScreenshot(page, 'sem_card_valido');
            return null;
        }
        
        // Clica no cabeçalho do título dentro do card para garantir que o modal abra
        const header = selectedCard.locator('div.content div.header, .header, h2, h3');
        if (await header.count() > 0) {
            await header.first().click();
        } else {
            await selectedCard.click();
        }

        // 2. ESPERA OS DADOS REAIS CARREGAREM (OU MENSAGENS DE AVISO/SEM ORDENS)
        const ROW_SELECTOR = '.buy-orders-container tr.mat-mdc-row, table tr.mat-mdc-row';
        
        // Seletores de mensagens que indicam ausência de ordens (sem timeout error)
        const noOrdersLocator = page.locator(':text("Found No Buy Orders")');
        const notAuthLocator = page.locator(':text("not authorized for this endpoint")');
        
        await Promise.race([
            page.waitForSelector(ROW_SELECTOR, { timeout: 10000 }).catch(() => null),
            noOrdersLocator.waitFor({ state: 'visible', timeout: 10000 }).catch(() => null),
            notAuthLocator.waitFor({ state: 'visible', timeout: 10000 }).catch(() => null)
        ]);
        
        if (await noOrdersLocator.count() > 0) {
            console.log('[SCRAPER] ℹ️ "Found No Buy Orders" — sem ordens ativas para este item.');
            return null;
        }
        if (await notAuthLocator.count() > 0) {
            console.log('[SCRAPER] ℹ️ "not authorized for this endpoint" — sessão com limitação temporária.');
            return null;
        }
        
        // Se a tabela não carregou, dispara a exceção de timeout normal para salvar o print do erro real
        await page.waitForSelector(ROW_SELECTOR, { timeout: 2000 });
        
        // Aguarda os preços serem preenchidos nas linhas (o CSFloat preenche via API após o DOM nascer)
        // Usamos um retry simples: aguarda até 10s e verifica de 500ms em 500ms
        let precoCarregado = false;
        for (let tentativa = 0; tentativa < 20; tentativa++) {
            await page.waitForTimeout(500);
            precoCarregado = await page.evaluate(() => {
                const rows = document.querySelectorAll('.buy-orders-container tr.mat-mdc-row, table tr.mat-mdc-row');
                if (rows.length === 0) return false;
                for (const row of rows) {
                    if (row.innerText && row.innerText.includes('$')) return true;
                }
                return false;
            });
            if (precoCarregado) break;
        }

        const rows = await page.locator(ROW_SELECTOR).all();
        
        if (rows.length === 0) {
            console.log('[SCRAPER] Nenhuma linha de Buy Order identificada no modal.');
            await salvarScreenshot(page, 'sem_ordens');
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
        await salvarScreenshot(page, 'erro');
        return null;
    } finally {
        if (page) await page.close(); 
    }
}
module.exports = { rasparMelhorOrdemDeCompra };