const qrcodeTerminal = require('qrcode-terminal');
const qrcode = require('qrcode');
const { Client, LocalAuth } = require('whatsapp-web.js');
const { escapeMarkdownV2 } = require('./utils.js');

let client; // Mova a declaração do client para fora para que a função `enviarWhatsapp` possa acessá-lo
let clientReady = false;
let telegramBotInstance; // Variável para armazenar a instância do bot do Telegram

const TELEGRAM_QR_CODE_RECEIVER_CHAT_ID = '5175130296'; // Seu Chat ID para receber o QR Code
const WHATSAPP_TEST_CHAT_ID = '120363402483665337@g.us'; // ID do grupo do WhatsApp para teste e notificações

function initializeWhatsApp(bot) {
  telegramBotInstance = bot;

  console.log('🟡 Inicializando cliente WhatsApp...');

  client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    }
  });

  client.on('qr', async (qr) => {
    console.log('🔐 QR Code recebido! Tentando enviar para o Telegram...');
    qrcodeTerminal.generate(qr, { small: true });

    if (!telegramBotInstance) {
      console.error('❌ Instância do bot do Telegram não foi fornecida. Não é possível enviar o QR Code.');
      return;
    }
    
    try {
      const qrCodeBuffer = await qrcode.toBuffer(qr, { scale: 10 });
      const captionText = '🚨 *NOVO QR Code do WhatsApp!*\nPor favor, escaneie para reautenticar o bot.';
      const escapedCaption = escapeMarkdownV2(captionText);
      await telegramBotInstance.sendPhoto(TELEGRAM_QR_CODE_RECEIVER_CHAT_ID, qrCodeBuffer, {
        caption: escapedCaption,
        parse_mode: 'MarkdownV2'
      });
      console.log('✅ QR Code enviado com sucesso para o Telegram.');
    } catch (error) {
      console.error('❌ Erro ao enviar QR Code para o Telegram:', error.message);
    }
  });

  client.on('authenticated', () => {
    console.log('🔑 Autenticado com sucesso!');
  });

  // --- ALTERAÇÕES APLICADAS AQUI ---
  client.on('ready', async () => { // 1. Função transformada em 'async'
    console.log('✅ Cliente WhatsApp pronto!');
    clientReady = true;

    // 2. Pequeno delay para garantir que o cliente está 100% pronto para enviar
    await new Promise(resolve => setTimeout(resolve, 3000)); 

    try {
      // 3. Enviando a mensagem para o ID de grupo do WhatsApp e não do Telegram
      await client.sendMessage(WHATSAPP_TEST_CHAT_ID, '🤖 Bot do WhatsApp conectado com sucesso!');
      console.log(`✅ Mensagem de teste enviada para o grupo do WhatsApp: ${WHATSAPP_TEST_CHAT_ID}`);
    } catch (error) {
      // 4. Tratamento de erro para a mensagem de teste
      console.error('❌ Erro ao enviar mensagem de teste do WhatsApp:', error.message);
    }
  });

  client.on('disconnected', (reason) => {
    console.log('🔌 Cliente desconectado. Motivo:', reason);
    clientReady = false;
  });

  client.initialize();
}

async function enviarWhatsapp(chatId, mensagem) {
  if (!clientReady) {
    console.warn('⚠️ Cliente WhatsApp ainda não está pronto. Mensagem não enviada.');
    return;
  }
  try {
    await client.sendMessage(chatId, mensagem);
    // console.log('📲 Mensagem enviada para o grupo do WhatsApp', chatId); // Log menos verboso, boa prática
  } catch (err) {
    console.error(`❌ Erro ao enviar para o grupo do WhatsApp (${chatId}):`, err.message);
  }
}

module.exports = { initializeWhatsApp, enviarWhatsapp };