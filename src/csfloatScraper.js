// csfloatScraper.js
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs'); 
require('dotenv').config({ path: path.join(__dirname, '../globalVariables.env') });
//const PLAYWRIGHT_CHROME_PATH = 'C:\\Users\\Marcos\\AppData\\Local\\ms-playwright\\chromium-1187\\chrome-win\\chrome.exe'; // especificar caminho do executavel <-- SUBSTITUA COM SEU CAMINHO REAL!
const PLAYWRIGHT_CHROME_PATH = process.env.PLAYWRIGHT_CHROME_PATH

const PLAYWRIGHT_PERSISTENT_PROFILE_PATH = path.join(__dirname, 'playwright_profile_csfloat');
console.log(PLAYWRIGHT_PERSISTENT_PROFILE_PATH);
//const AUTH_FILE = path.join(__dirname, '../', 'auth.json'); 

// --- SELECTORES ESPECÍFICOS PARA O CSFLOAT ---
const LOGGED_IN_INDICATOR_SELECTOR = 'div.mat-badge'; 
// Usei o seu seletor. Se ele for alterado no site, precisará ser atualizado aqui.

const NO_THANKS_POPUP_BUTTON_SELECTOR = 'button:has-text("No Thanks")'; // Botão "No Thanks" do pop-up de feedback
const NOTIFICATION_OVERLAY_SELECTOR = 'div.cdk-overlay-backdrop'; // Overlay das notificações

/**
 * Tenta fechar o pop-up "Share Your Thoughts".
 */
async function handleOptionalPopup(page) {
    try {
        console.log('[SCRAPER] Verificando se o pop-up de feedback apareceu...'); // Log menos verboso
        const noThanksButton = page.locator(NO_THANKS_POPUP_BUTTON_SELECTOR);
        await noThanksButton.click({ timeout: 1000 }); // Ajustei para locator e timeout
        console.log('[SCRAPER] Pop-up "Share your thoughts" fechado com sucesso.');
    } catch (error) {
        console.log('[SCRAPER] Pop-up de feedback não apareceu, continuando normalmente.');
    }
}

/**
 * Tenta fechar o pop-up de notificações.
 */
async function handleNotificationDialog(page) {
    try {
        console.log('[SCRAPER] Verificando se o pop-up de notificações apareceu...'); // Log menos verboso
        // Usar page.locator para o overlay e esperar por ele
        const notificationOverlay = page.locator(NOTIFICATION_OVERLAY_SELECTOR);
        await notificationOverlay.waitFor({ state: 'visible', timeout: 1000 }); 
        console.log('[SCRAPER] Overlay de notificações encontrado. Forçando o clique...');

        // Clicar no overlay para fechar o pop-up
        await notificationOverlay.click({ timeout: 1000 }); // Clicar no overlay visível

        console.log('[SCRAPER] Pop-up de notificações fechado com sucesso via clique no overlay.');
        await page.waitForTimeout(500); // Pequena pausa para garantir que o pop-up sumiu
    } catch (error) {
       console.log('[SCRAPER] Pop-up de notificações não apareceu, continuando normalmente.');
    }
}

async function rasparMelhorOrdemDeCompra(url) {
    console.log(`[SCRAPER-PLAYWRIGHT] Iniciando raspagem da URL: ${url}`);
    let context = null;

    try {
        context = await chromium.launchPersistentContext(PLAYWRIGHT_PERSISTENT_PROFILE_PATH, {
            headless: false, // Mantenha false para o login manual
            executablePath: PLAYWRIGHT_CHROME_PATH 
        });
        
        const page = await context.newPage(); 
        await page.setDefaultNavigationTimeout(60000);
        
        // --- Lógica para Login Manual via Steam ---
        /*
        console.log('[SCRAPER] Verificando status do login no CSFloat...');
        await page.goto('https://csfloat.com/', { waitUntil: 'domcontentloaded' }); // Vá para a página inicial

        let isLoggedIn = false;
        try {
            // Tenta verificar se já está logado usando o seletor específico
            await page.waitForSelector(LOGGED_IN_INDICATOR_SELECTOR, { timeout: 7000 }); // Mais tempo para a página carregar
            isLoggedIn = true;
            console.log('[SCRAPER] Login já ativo no perfil persistente.');
        } catch (e) {
            console.warn('[SCRAPER] Login NÃO está ativo. Preparando para login manual...');
            isLoggedIn = false;
        }

        // --- TRATAMENTO DOS POP-UPS AQUI, APÓS A VERIFICAÇÃO DE LOGIN INICIAL ---
        // Eles podem aparecer mesmo antes do login, ou logo depois.
        await handleOptionalPopup(page);
        await handleNotificationDialog(page);
        
        if (!isLoggedIn) {
            console.log('\n=============================================================');
            console.log('POR FAVOR, FAÇA O LOGIN NO CSFLOAT NESTA JANELA DO NAVEGADOR.');
            console.log('Você tem 2 minutos (ou até o indicador de login aparecer).');
            console.log('=============================================================\n');

            // Navega para a página de login se ainda não estiver logado
            await page.goto('https://csfloat.com/login'); 

            // Espera até que o indicador de login apareça (indicando login bem-sucedido)
            // ou até que o tempo limite de 2 minutos se esgote.
            try {
                await page.waitForSelector(LOGGED_IN_INDICATOR_SELECTOR, { waitUntil: 'visible', timeout: 120000 }); // 2 minutos
                console.log('[SCRAPER] Detectado login bem-sucedido (indicador de login apareceu).');
                console.log('Pasta playwright_profile_csfloat atualizada com o novo estado de login.');
                isLoggedIn = true;
            } catch (error) {
                console.error('[SCRAPER] [ERRO] Tempo limite para login manual excedido ou indicador de login não apareceu.');
                throw new Error('Falha no login manual: tempo esgotado ou indicador de login ausente.');
            }
        }

        if (!isLoggedIn) {
            throw new Error('Login manual não foi bem-sucedido após espera.');
        }
*/
        // --- TRATAMENTO DOS POP-UPS NOVAMENTE, CASO APAREÇAM APÓS O LOGIN ---
        // É uma boa prática verificar novamente, pois a navegação de login pode ter fechado e reaberto pop-ups.
        //await handleOptionalPopup(page);
        //await handleNotificationDialog(page);

        // Agora que o login está garantido, vá para a URL de raspagem
        await page.goto(url, { waitUntil: 'networkidle' });
        console.log('[SCRAPER-PLAYWRIGHT] Página de busca carregada.');
        
        // --- TRATAMENTO DOS POP-UPS UMA ÚLTIMA VEZ, CASO A NAVEGAÇÃO ACIONE NOVAMENTE ---
        await handleOptionalPopup(page);
        await handleNotificationDialog(page);

        // O restante do seu código para raspar permanece o mesmo.
        const PRIMEIRO_ITEM_SELECTOR = 'div.content div.header';
        await page.waitForSelector(PRIMEIRO_ITEM_SELECTOR, { timeout: 30000 });
        console.log('[SCRAPER-PLAYWRIGHT] Item encontrado. Clicando...');
        await page.click(PRIMEIRO_ITEM_SELECTOR);

        const DADOS_DA_TABELA_SELECTOR = 'div.order-container td.cdk-column-price';
        await page.waitForSelector(DADOS_DA_TABELA_SELECTOR, { timeout: 10000 });
        console.log('[SCRAPER-PLAYWRIGHT] Conteúdo da tabela carregado.');

        const LINHA_BUY_ORDER_SELECTOR = 'div.order-container tr.mat-mdc-row';
        const primeiraLinha = page.locator(LINHA_BUY_ORDER_SELECTOR).first();
        const text = await primeiraLinha.innerText();
        
        if (text && text.includes('$')) {
            const parts = text.replace('$', '').trim().split('\t');
            if (parts.length === 2) {
                const price = parseFloat(parts[0]);
                const quantity = parseInt(parts[1]);
                if (!isNaN(price) && !isNaN(quantity)) {
                    console.log(`[SCRAPER-PLAYWRIGHT] Melhor ordem de compra encontrada: Price ${price}, Quantity ${quantity}.`);
                    return { price, quantity };
                }
            }
        }
        
        console.log('[SCRAPER-PLAYWRIGHT] Não foi possível processar a primeira linha da tabela.');
        return null;

    } catch (error) {
        console.log(`[SCRAPER-PLAYWRIGHT] [ERRO] Falha ao raspar a página: ${error.message}`);
        return null;
    } finally {
        if (context) {
            await context.close();
            console.log('[SCRAPER-PLAYWRIGHT] Contexto do navegador fechado.');
        }
    }
}

module.exports = {
    rasparMelhorOrdemDeCompra
};