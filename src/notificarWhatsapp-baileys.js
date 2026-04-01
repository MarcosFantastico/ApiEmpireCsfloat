const qrcode = require('qrcode-terminal');
const {
    default: makeWASocket,
    DisconnectReason,
    useMultiFileAuthState,
    fetchLatestBaileysVersion // <<< IMPORTAÇÃO NOVA AQUI
} = require('@whiskeysockets/baileys');
const pino = require('pino');

const fs = require('fs');
const path = require('path');

let sock;
let isConnected = false;
const messageQueue = [];
let sending = false;

const MAX_QUEUE_SIZE = 5; 
const AUTH_DIR = path.join(__dirname, '..', 'baileys_auth');

// ================= INIT =================
async function initializeWhatsApp() {
    if (!fs.existsSync(AUTH_DIR)) fs.mkdirSync(AUTH_DIR);

    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

    // 🔥 O SEGREDO: Busca a versão mais recente do WA Web antes de conectar
    const { version, isLatest } = await fetchLatestBaileysVersion();
    console.log(`[WHATSAPP] Usando versão do WA Web: v${version.join('.')} (Mais recente: ${isLatest})`);

    sock = makeWASocket({
        version, // <<< PASSA A VERSÃO AQUI
        auth: state,
        logger: pino({ level: 'silent' }),
        browser: ['Windows', 'Chrome', '120.0.0.0'], // Pode voltar ao normal
        markOnlineOnConnect: false,
        syncFullHistory: false
    });

    sock.ev.on('creds.update', saveCreds);
    
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            console.log('\n📲 ESCANEIE O QR CODE ABAIXO:\n');
            qrcode.generate(qr, { small: true });
        }

        if (connection === 'open') {
            console.log('✅ [WHATSAPP] Conectado (Baileys)');
            isConnected = true;
            
            if (messageQueue.length > 0) {
                console.log('🧹 [WHATSAPP] Limpando fila de mensagens antigas pós-reconexão...');
                messageQueue.length = 0; 
            }

            enviarWhatsapp('120363402483665337@g.us', '✅ Bot conectado e fila limpa!');
            processQueue();
        }

        if (connection === 'close') {
            isConnected = false;
            const reason = lastDisconnect?.error?.output?.statusCode;
            console.log('🔌 [WHATSAPP] Desconectado:', reason);

            if (reason !== DisconnectReason.loggedOut) {
                setTimeout(initializeWhatsApp, 5000);
            } else {
                console.log('⚠️ Sessão expirada. Escaneie o QR novamente.');
            }
        }
    });
}

// ================= FILA =================
async function processQueue() {
    if (!isConnected || sending) return;
    sending = true;

    while (messageQueue.length > 0) {
        // Tira a primeira mensagem da fila
        const { chatId, mensagem } = messageQueue.shift();

        try {
            await sock.sendMessage(chatId, { text: mensagem });
            console.log('📤 [WHATSAPP] Mensagem enviada.');
        } catch (e) {
            console.error('❌ Erro envio Zap:', e.message);
            // Se der erro de rede, devolve pro começo da fila
            messageQueue.unshift({ chatId, mensagem });
            break;
        }

        await new Promise(r => setTimeout(r, 1200));
    }

    sending = false;
}

// ================= API =================
async function enviarWhatsapp(chatId, mensagem) {
    // 3. Trava de Segurança da Fila
    if (messageQueue.length >= MAX_QUEUE_SIZE) {
        console.log(`⚠️ [WHATSAPP] Fila cheia (${MAX_QUEUE_SIZE}). Descartando a notificação mais antiga...`);
        // Remove o item mais velho (índice 0) para abrir espaço para o novo
        messageQueue.shift(); 
    }

    messageQueue.push({ chatId, mensagem });
    processQueue();
    return 'QUEUED';
}

// ================= SHUTDOWN =================
async function desligarWhatsapp() {
    try {
        if (sock) {
            console.log('🛑 [WHATSAPP] Encerrando conexão...');
            sock.end();
        }
    } catch {}
}

module.exports = {
    initializeWhatsApp,
    enviarWhatsapp,
    desligarWhatsapp
};