const { chromium } = require('playwright');
const path = require('path');

(async () => {
    try {
        console.log("Conectando ao Chrome na porta 9222 via CDP...");
        const browser = await chromium.connectOverCDP('http://localhost:9222');
        console.log("✅ Conectado com sucesso!");
        
        const contexts = browser.contexts();
        for (const context of contexts) {
            const pages = context.pages();
            console.log(`Encontradas ${pages.length} páginas abertas.`);
            for (let i = 0; i < pages.length; i++) {
                const page = pages[i];
                const url = page.url();
                const title = await page.title();
                console.log(`[Página ${i}] Título: "${title}" | URL: "${url}"`);
                
                // Se for a página do CSFloat, tira um print para provar que conseguimos ver/manipular
                if (url.includes('csfloat.com')) {
                    const screenshotPath = path.join(__dirname, 'csfloat_monitor.png');
                    await page.screenshot({ path: screenshotPath });
                    console.log(`📸 Screenshot salvo com sucesso em: ${screenshotPath}`);
                }
            }
        }
        
        console.log("Fechando conexão...");
        await browser.close();
        console.log("Conexão fechada.");
    } catch (e) {
        console.error("❌ Erro ao conectar ou manipular o navegador:", e);
    }
})();
