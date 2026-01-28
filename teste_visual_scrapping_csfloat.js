// teste_visual.js
const csfloatLoginManager = require('./src/csfloatLoginManager.js');
const { chromium } = require('playwright');
require('dotenv').config({ path: 'globalVariables.env' }); // Garante carregar variáveis se precisar

// URL do caso que você mandou (P250 Wingshot com ordens mistas)
const URL_TESTE = "https://csfloat.com/search?def_index=13&paint_index=1038&sort_by=highest_float&category=2&max_float=0.068";

async function rodarTesteVisual() {
    console.log("👀 INICIANDO MODO DEBUG VISUAL (LÓGICA CORRIGIDA) 👀");
    console.log("O navegador vai abrir e se mover lentamente para você acompanhar.");

    // 1. Abrir Navegador VISÍVEL
    // Parâmetros: forceNewProfile=false, headless=false
    let context = await csfloatLoginManager.launchBrowserContext(false, false);
    
    // Fechar e reabrir com Slow Motion para visualização
    await context.close();
    
    console.log("Reabrindo com Slow Motion (1s)...");
    context = await chromium.launchPersistentContext(csfloatLoginManager.PLAYWRIGHT_PERSISTENT_PROFILE_PATH, {
        headless: false, // VISÍVEL
        executablePath: process.env.PLAYWRIGHT_CHROME_PATH,
        slowMo: 1000, // Espera 1 segundo entre ações
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await context.newPage();
    
    try {
        console.log(`Navegando para: ${URL_TESTE}`);
        await page.goto(URL_TESTE, { waitUntil: 'domcontentloaded' });

        // Lida com Popups
        try {
            const btnNoThanks = page.locator('button:has-text("No Thanks")');
            if (await btnNoThanks.isVisible()) await btnNoThanks.click();
            const overlay = page.locator('div.cdk-overlay-backdrop');
            if (await overlay.isVisible()) await overlay.click();
        } catch (e) {}

        // Abre o Header do Item
        console.log("Clicando no header do item...");
        const PRIMEIRO_ITEM = 'div.content div.header';
        await page.waitForSelector(PRIMEIRO_ITEM);
        await page.click(PRIMEIRO_ITEM);

        // Espera tabela
        const PRECO_SELECTOR = 'div.order-container td.cdk-column-price';
        await page.waitForSelector(PRECO_SELECTOR);

        console.log("📋 Tabela carregada. Iniciando análise linha por linha...");

        // Pega todas as linhas
        const rows = await page.locator('div.order-container tr.mat-mdc-row').all();
        let contador = 1;

        for (const row of rows) {
            console.log(`\n--- Analisando Linha ${contador} ---`);
            
            // Marca a linha atual em AZUL para saber qual está sendo analisada
            await row.evaluate(node => node.style.border = '3px solid blue');

            // 1. Filtro Rápido (Ícones visíveis)
            const countIcons = await row.locator('img.sticker-image').count();
            if (countIcons > 0) {
                console.log(`❌ [VISUAL] Imagem de Sticker VISÍVEL detectada. Pulando.`);
                await row.evaluate(node => node.style.border = '3px solid orange'); 
                contador++;
                continue;
            }

            // 2. HOVER (Simulação do Mouse)
            // Limpa mouse anterior
            await page.mouse.move(0, 0); 
            await page.waitForTimeout(100); 

            console.log("🖱️  Passando o mouse (Hover)...");
            await row.hover();
            
            // Espera tooltip renderizar
            await page.waitForTimeout(500); 

            // Tenta ler o tooltip
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
            
            console.log(`💬 Tooltip: "${tooltipText.replace(/\n/g, ' ').substring(0, 80)}..."`);

            // --- LÓGICA ATUALIZADA ---
            // Só bloqueia se tiver Sticker, Seed ou Pattern.
            // ACEITA: Float, Paint, StatTrak, Rank.
            const restricaoDetectada = [
                'Sticker', 'HasSticker', 
                'Seed', 'Pattern'
            ].some(term => tooltipText.includes(term));

            if (restricaoDetectada) {
                console.log(`⛔ [VISUAL] RESTRIÇÃO DE STICKER/PATTERN DETECTADA! Ignorando.`);
                await row.evaluate(node => node.style.border = '3px solid red'); // Vermelho = Bloqueado
                
                // Tira o mouse
                await page.mouse.move(0, 0);
            } else {
                console.log(`✅ [VISUAL] LINHA VÁLIDA! (Genérica ou Float Específico)`);
                await row.evaluate(node => node.style.border = '5px solid green'); // Verde = Aceita
                
                const texto = await row.innerText();
                console.log(`💰 PREÇO CAPTURADO: ${texto.replace(/\n/g, ' ')}`);
                console.log("🏆 SUCESSO! O script pararia aqui e pegaria esse preço.");
                
                // Para o teste aqui se achou uma boa
                break; 
            }
            
            contador++;
        }

        console.log("\n🏁 Teste finalizado. O navegador fechará em 10 segundos...");
        await page.waitForTimeout(10000);

    } catch (error) {
        console.error("ERRO NO TESTE:", error);
    } finally {
        await context.close();
    }
}

rodarTesteVisual();