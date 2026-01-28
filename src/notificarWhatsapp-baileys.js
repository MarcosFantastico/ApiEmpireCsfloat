// src/notificarWhatsapp-baileys.js
const qrcode = require('qrcode-terminal');

const {
    default: makeWASocket,
    DisconnectReason,
    useMultiFileAuthState
} = require('@whiskeysockets/baileys');
const pino = require('pino');

const fs = require('fs');
const path = require('path');

let sock;
let isConnected = false;
const messageQueue = [];
let sending = false;

const AUTH_DIR = path.join(__dirname, '..', 'baileys_auth');

// ================= INIT =================
async function initializeWhatsApp() {
    if (!fs.existsSync(AUTH_DIR)) fs.mkdirSync(AUTH_DIR);

    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

   sock = makeWASocket({
    auth: state,
    printQRInTerminal: true,
    logger: pino({ level: 'silent' }), // <<< ISSO RESOLVE
    browser: ['Windows', 'Chrome', '120'],
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

setTimeout(() => {
    enviarWhatsapp('120363402483665337@g.us', '🧪 WhatsApp Baileys OK');
}, 5000);

}

// ================= FILA =================
async function processQueue() {
    if (!isConnected || sending) return;
    sending = true;

    while (messageQueue.length > 0) {
        const { chatId, mensagem } = messageQueue.shift();

        try {
            await sock.sendMessage(chatId, { text: mensagem });
            console.log('📤 [WHATSAPP] Mensagem enviada.');
        } catch (e) {
            console.error('❌ Erro envio Zap:', e.message);
            messageQueue.unshift({ chatId, mensagem });
            break;
        }

        await new Promise(r => setTimeout(r, 1200));
    }

    sending = false;
}

// ================= API =================
async function enviarWhatsapp(chatId, mensagem) {
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
