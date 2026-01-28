// csfloatLoginManager.js - Este arquivo será o SEU SCRIPT DE LOGIN MANUAL

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../globalVariables.env') });

// Configurações do navegador e perfil
const PLAYWRIGHT_CHROME_PATH = process.env.PLAYWRIGHT_CHROME_PATH;
console.log(`[CSFLOAT-LOGIN] Usando o executável do Chrome em: ${PLAYWRIGHT_CHROME_PATH}`);
const PLAYWRIGHT_PERSISTENT_PROFILE_PATH = path.join(__dirname, 'playwright_profile_csfloat');
const LOCK_FILE_PATH = path.join(PLAYWRIGHT_PERSISTENT_PROFILE_PATH, 'LOCK'); 

// --- SELECTORES ESPECÍFICOS PARA O CSFLOAT ---
const LOGGED_IN_INDICATOR_SELECTOR = 'div.mat-badge'; 
const NO_THANKS_POPUP_BUTTON_SELECTOR = 'button:has-text("No Thanks")';
const NOTIFICATION_OVERLAY_SELECTOR = 'div.cdk-overlay-backdrop';

// Instância global do contexto do navegador para uso interno deste módulo
let browserContextInstance = null;

// Funções auxiliares
async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
async function handleOptionalPopup(page) {
    try {
        console.log('[CSFLOAT-LOGIN] Verificando se o pop-up de feedback apareceu...');
        const noThanksButton = page.locator(NO_THANKS_POPUP_BUTTON_SELECTOR);
        await noThanksButton.click({ timeout: 1000 });
        console.log('[CSFLOAT-LOGIN] Pop-up "Share your thoughts" fechado com sucesso.');
    } catch (error) {
        console.log('[CSFLOAT-LOGIN] Pop-up de feedback não apareceu, continuando.');
    }
}
async function handleNotificationDialog(page) {
    try {
        console.log('[CSFLOAT-LOGIN] Verificando se o pop-up de notificações apareceu...');
        const notificationOverlay = page.locator(NOTIFICATION_OVERLAY_SELECTOR);
        await notificationOverlay.waitFor({ state: 'visible', timeout: 1000 }); 
        console.log('[CSFLOAT-LOGIN] Overlay de notificações encontrado. Clicando...');
        await notificationOverlay.click({ timeout: 1000 });
        console.log('[CSFLOAT-LOGIN] Pop-up de notificações fechado com sucesso.');
        await page.waitForTimeout(500);
    } catch (error) {
        console.log('[CSFLOAT-LOGIN] Pop-up de notificações não apareceu, continuando.');
    }
}

async function clearLockFiles() {
    if (fs.existsSync(LOCK_FILE_PATH)) {
        try {
            fs.unlinkSync(LOCK_FILE_PATH);
            console.log(`[CSFLOAT-LOGIN] Arquivo de bloqueio removido: ${LOCK_FILE_PATH}`);
        } catch (error) {
            console.warn(`[CSFLOAT-LOGIN] Não foi possível remover arquivo de bloqueio (${LOCK_FILE_PATH}): ${error.message}`);
        }
    }
}

/**
 * Lança ou reutiliza um contexto persistente do navegador.
 * Este é o método principal para iniciar o navegador.
 * @param {boolean} forceNewProfile - Se true, deleta o perfil existente antes de lançar.
 * @param {boolean} headless - Se true, o navegador é iniciado sem interface gráfica.
 */
async function launchBrowserContext(forceNewProfile = false, headless = false) { // trocar o headless para false para visualizar
    // Se já existe uma instância e não estamos forçando um novo perfil, reutilizamos
    if (browserContextInstance && !forceNewProfile) {
        console.log(`[CSFLOAT-LOGIN] Navegador já está ativo (headless: ${browserContextInstance._options.headless}), reutilizando contexto.`);
        return browserContextInstance;
    }

    if (forceNewProfile) {
        console.warn('[CSFLOAT-LOGIN] Forçando novo perfil: Fechando e deletando perfil existente...');
        await closeBrowserContext(); 
        if (fs.existsSync(PLAYWRIGHT_PERSISTENT_PROFILE_PATH)) {
            try {
                fs.rmSync(PLAYWRIGHT_PERSISTENT_PROFILE_PATH, { recursive: true, force: true });
                console.log('[CSFLOAT-LOGIN] Perfil antigo deletado.');
            } catch (error) {
                console.error(`[CSFLOAT-LOGIN] Erro ao deletar perfil antigo: ${error.message}`);
            }
        }
    }

    await clearLockFiles(); 

    console.log(`[CSFLOAT-LOGIN] Lançando novo contexto de navegador para CSFloat (headless: ${headless})...`);
    try {
        browserContextInstance = await chromium.launchPersistentContext(PLAYWRIGHT_PERSISTENT_PROFILE_PATH, {
            headless: headless, 
            executablePath: PLAYWRIGHT_CHROME_PATH, 
            args: [
                '--no-sandbox', 
                '--disable-setuid-sandbox',
                '--disable-gpu',
                '--no-zygote',
                '--single-process'
            ],
            timeout: 60000 
        });
        console.log('[CSFLOAT-LOGIN] Contexto de navegador lançado com sucesso.');
        return browserContextInstance;
    } catch (error) {
        console.error(`[CSFLOAT-LOGIN] FALHA CRÍTICA ao lançar contexto do navegador: ${error.message}`);
        browserContextInstance = null;
        throw error; 
    }
}

/**
 * Fecha o contexto persistente do navegador, se houver um ativo.
 */
async function closeBrowserContext() {
    if (browserContextInstance) {
        console.log('[CSFLOAT-LOGIN] Fechando contexto do navegador CSFloat...');
        try {
            await browserContextInstance.close();
            console.log('[CSFLOAT-LOGIN] Contexto do navegador fechado.');
        } catch (error) {
            console.warn(`[CSFLOAT-LOGIN] Erro ao fechar contexto do navegador (pode já estar fechado): ${error.message}`);
        } finally {
            browserContextInstance = null; 
        }
    }
}

// ==============================================================================
// Script de LOGIN MANUAL (será executado quando este arquivo for chamado diretamente)
// ==============================================================================
async function runManualLoginScript() {
    console.log('[CSFLOAT-LOGIN-MANUAL] Iniciando processo de login manual.');
    let context = null;
    let page = null;

    try {
        // Sempre abre em modo visível para o login, e força um novo perfil limpo.
        context = await launchBrowserContext(true, false); // forceNewProfile = true, headless = false
        page = await context.newPage();
        await page.setDefaultNavigationTimeout(180000); // 3 minutos para login

        await page.goto('https://csfloat.com/login');
        
        await handleOptionalPopup(page);
        await handleNotificationDialog(page);

        console.log('\n=============================================================');
        console.log('POR FAVOR, FAÇA O LOGIN NO CSFLOAT NESTA JANELA DO NAVEGADOR.');
        console.log('Você tem 3 minutos para completar o login.');
        console.log('=============================================================\n');

        // Espera pelo indicador de login bem-sucedido
        await page.waitForSelector(LOGGED_IN_INDICATOR_SELECTOR, { waitUntil: 'visible', timeout: 180000 }); 
        console.log('[CSFLOAT-LOGIN-MANUAL] Detectado login CSFloat bem-sucedido.');
        console.log('[CSFLOAT-LOGIN-MANUAL] Perfil salvo com o estado de login. Fechando navegador...');
        
    } catch (error) {
        console.error(`[CSFLOAT-LOGIN-MANUAL] [ERRO] Falha no processo de login manual: ${error.message}`);
        throw error; // Propaga o erro
    } finally {
        if (page && !page.isClosed()) {
            await page.close();
        }
        await closeBrowserContext(); // Garante que o navegador seja fechado após o login
        console.log('[CSFLOAT-LOGIN-MANUAL] Processo de login manual concluído.');
    }
}

module.exports = {
    launchBrowserContext, // Para o fetch_geral.js iniciar o navegador headless
    closeBrowserContext,  // Para o fetch_geral.js fechar o navegador
    getBrowserContext: () => browserContextInstance, // Para o fetch_geral.js obter a instância ativa
    PLAYWRIGHT_PERSISTENT_PROFILE_PATH // Exporta o caminho do perfil
};

// Se este arquivo for executado diretamente (ex: node src/csfloatLoginManager.js),
// ele iniciará o script de login manual.
if (require.main === module) {
    runManualLoginScript().catch(error => {
        console.error('Erro fatal no script de login manual:', error);
        process.exit(1);
    });
}