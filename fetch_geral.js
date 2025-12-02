// No topo do seu arquivo principal (ex: fetch_geral.js)
//process.env.PLAYWRIGHT_BROWSERS_PATH = 'C:\\Users\\Marcos\\Downloads\\testeapics\\playwright-browsers'; 
// ^^^ Escolha um caminho DENTRO do seu projeto ou em um local conhecido.
// Certifique-se de que a conta "Marcos" tem permissão total para criar e escrever nesta pasta.


// server.js
const express = require("express");
const oracledb = require("oracledb");
const cors = require("cors");
const { analisarItemCSGOEmpire } = require("./src/analisarItem");
const { calcularCustoBeneficio } = require("./src/analisarItem");
const { enviarWhatsapp } = require('./src/notificarWhatsapp-wweb');
const { initializeWhatsApp } = require('./src/notificarWhatsapp-wweb');
const { calcularPrecoMaximo } = require("./src/analisarItem");
const {escapeMarkdownV2} = require('./src/utils.js');
require("dotenv").config({ path: 'credentials.env' });
const {rasparMelhorOrdemDeCompra} = require('./src/csfloatScraper.js');
const app = express();
app.use(express.json());
app.use(cors());
const csfloatService = require('./src/csfloatService.js');

const TelegramBot = require('node-telegram-bot-api');


// Chat ID
const chatId = '5175130296';
// Cria o bot
const bot = new TelegramBot(process.env.telegranBotToken, {polling: true});

// Inicializa o bot no modulo de WhatsApp
initializeWhatsApp(bot);
//comandos bot

bot.onText(/\/th/, async (msg) => {
  const chatId = msg.chat.id;

  try {
    const conn = await oracledb.getConnection(dbConfig);
    await conn.execute(`TRUNCATE TABLE melhor_historico_empire`);
    await conn.close();

    bot.sendMessage(chatId, '✅ Tabela `melhor_historico_empire` truncada com sucesso!');
  } catch (err) {
    console.error(err);
    bot.sendMessage(chatId, '❌ Erro ao truncar a tabela!');
  }
});

let botAtivo = true;

bot.onText(/\/pause/, async (msg) => {
  const chatId = msg.chat.id;
  botAtivo = false;
  bot.sendMessage(chatId, '🛑 Bot pausado com sucesso!');
});

bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  botAtivo = true;
  bot.sendMessage(chatId, '✅ Bot retomado com sucesso!');
});

app.get('/analisar', async (req, res) => {
  const url = req.query.url;

  if (!url) {
    return res.status(400).json({ erro: 'Parâmetro "url" é obrigatório.' });
  }
  try {
    const resultado = await analisarItemCSGOEmpire(url);
    res.json(resultado);
  } catch (erro) {
    console.error(`[${new Date().toLocaleString('pt-BR')}]❌ Erro na análise do item:`, erro);
    res.status(500).json({ erro: 'Erro ao analisar o item.' });
  }
});

const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  connectString: process.env.DB_CONNECT_STRING
};

async function testConnection() {
  let conn;
  try {
    conn = await oracledb.getConnection(dbConfig);
    console.log("✅ Conexão OK!");
    const result = await conn.execute("SELECT SYSDATE FROM DUAL");
    console.log("Data do Oracle:", result.rows[0][0]);
  } catch (err) {
    console.error("❌ Erro:", err);
    process.exit(1);
  } finally {
    if (conn) await conn.close();
  }
}
testConnection();
const options = {
  method: "GET",
  headers: {
    accept: "application/json",
    Authorization: `Bearer ${process.env.EMPIRE_TOKEN}`,
  },
};


let itensBanco = [];
let itensEmpire = [];

async function fetchItensBanco() {
  let connection;
  try {
    connection = await oracledb.getConnection(dbConfig);
    const sql = `
      SELECT a.nome || ' | ' || s.nome AS "Arma | Skin"
      FROM arma a
      INNER JOIN skin s ON a.id = s.arma_id
      ORDER BY a.nome ASC, s.nome ASC
    `;
    const result = await connection.execute(sql);
    itensBanco = result.rows.map((row) => row[0]);
    //console.log("✅ Itens do Banco foram carregados!");
    //console.log(itensBanco)
  } catch (err) {
    console.error(`[${new Date().toLocaleString('pt-BR')}]❌ Erro ao buscar itens do banco:`, err);
  } finally {
    if (connection) await connection.close();
  }
}
const coin = 0.6142808;

/* ------------------------------------- *
 * 1.  Config comum para TODAS as chamadas
 * ------------------------------------- */
const baseOptions = {
  method: "GET",
  headers: {
    Accept: "application/json",
    Authorization: `Bearer ${process.env.EMPIRE_TOKEN}`,
  
  }
};

/* ------------------------------------- *
 * 2.  Helper para buscar + parsear JSON
 * ------------------------------------- */
const fetchEmpire = (url) => fetch(url, baseOptions).then((r) => r.json());

/* ------------------------------------- *
 * 3.  Função principal (já enxuta)
 * ------------------------------------- */
async function fetchItensEmpire() {
  try {
    // URLs que você tinha, num array (mais fácil manter / trocar)
    const url = "https://csgoempire.com/api/v2/trading/items?page=1&per_page=600&auction=yes&price_min=200"

    /* ----- escolha o modo:
       (a) paralelo – bem mais rápido se a Empire não bloquear         */
    // const datasets = await Promise.all(urls.map(fetchEmpire));

    /*  (b) sequencial com pausa de 3 s entre chamadas (mantém o seu
           comportamento actual, útil se o site limitar req/segundo)  */
    const datasets = [];

      datasets.push(await fetchEmpire(url));
   
    // datasets[0] → Bowie Knife, datasets[1] → Huntsman… etc.
    const todosItens = datasets.flatMap((d) => d.data);

    itensEmpire = todosItens.map((item) => ({
      id: item.id,
      nome: item.market_name.includes("(")
        ? item.market_name.split("(")[0].trim()
        : item.market_name.trim(),
      float: item.wear,
      qualidade: item.wear_name,
      valor_mercado: (item.market_value / 100) * coin,
      lance_atual: (item.purchase_price / 100) * coin,
      preco_sugerido: (item.suggested_price / 100) * coin,
      desconto_overpay: item.above_recommended_price
    }));
  } catch (err) {
    console.error(`[${new Date().toLocaleString('pt-BR')}]❌ Erro ao buscar itens do Empire:`, err);
    await delay(3000);
  }
}



let ids_percorridos = [];
let i;
async function compararItens() {

  //console.log("\n🔎 Comparando itens do banco com os do Empire...");
  const normalize = str => str.normalize("NFD").replace(/[^\w\s|]/g, "").toLowerCase();

  for (const itemBanco of itensBanco) {
    const matches = itensEmpire.filter(itemEmpire =>
      normalize(itemEmpire.nome) === normalize(itemBanco)
    );
  
    for (const match of matches) {

    const isAgente = match.nome.toLowerCase().includes('agent') || match.nome.toLowerCase().includes('guerrilla') || match.nome.toLowerCase().includes('elite crew') || match.nome.toLowerCase().includes('fbi');

if ((!isAgente && (match.float === null || match.float === undefined)) || ids_percorridos.includes(match.id)) {
  continue;
}
  
      ids_percorridos.push(match.id);
      console.log(`id ${match.id} adicionado ao array e nao deve ser mais percorrido!`);
      console.log(`\n[${new Date().toLocaleString('pt-BR')}]🎯Item Encontrado: ${match.nome}`);
      console.log(`Float: ${match.float}`);
      console.log(`Qualidade: ${match.qualidade}`);
      console.log(`Valor de Mercado: $${match.valor_mercado.toFixed(2)}`);
      console.log(`Lance atual: $${match.lance_atual.toFixed(2)}`);
      console.log(`Preço Sugerido: $${match.preco_sugerido.toFixed(2)}`);
      console.log(`Desconto / Overpay: ${match.desconto_overpay}%`);
      const url = `https://csgoempire.com/item/${match.id}`;
      console.log("🔗 URL do Item:", url);
  
      const conn = await oracledb.getConnection({
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        connectString: process.env.DB_CONNECT_STRING
      });
  
      const checkExistingQuery = await conn.execute(
        `SELECT 
            mhe.id, 
            mhe.preco,
            mhe.skin_float,
            ar.nome || ' | ' || sk.nome as nome_completo,
            mhe.qualidade,
            mhe.data_registro,
            mhe.cb
          FROM 
            melhor_historico_empire mhe 
            JOIN skin sk ON sk.id = mhe.skin_id 
            JOIN arma ar ON ar.id = mhe.arma_id
          WHERE LOWER(qualidade) = LOWER(:qualidade)
            AND lower(ar.nome || ' | ' || sk.nome) LIKE lower(:nome)`,
        {
          nome: match.nome,
          qualidade: match.qualidade
        },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
  
      const row = checkExistingQuery.rows?.[0];
      const melhorItem = row ? {
        precoUSD: row.PRECO,
        float: row.SKIN_FLOAT,
        custoBeneficio: row.CB
      } : null;
  
      const precoMaximo_t = melhorItem
        ? +calcularPrecoMaximo(melhorItem.custoBeneficio, match.float).toFixed(2)
        : null;
      const diferencaPreco_t = melhorItem
        ? +(precoMaximo_t - match.lance_atual).toFixed(2)
        : null;
  
      let resultado = null;
        if (melhorItem) {
            console.log("Match Banco:");
            resultado = {
              precoAtual: match.lance_atual,
              floatAtual: match.float,
              custoBeneficioAtual: Number(calcularCustoBeneficio(match.lance_atual, match.float)),
              melhorItem: {
                precoUSD: melhorItem.precoUSD,
                float: melhorItem.float,
                custoBeneficio: Number(calcularCustoBeneficio(melhorItem.precoUSD, melhorItem.float))
              },
              precoMaximo: precoMaximo_t,
              diferencaPreco: diferencaPreco_t
            };
          } else {
            resultado = await analisarItemCSGOEmpire(url);
          }
      





          console.log("Análise Result:", resultado);

          if (resultado?.precoAtual !== undefined && resultado?.melhorItem) {
            console.log(`\n📊 Resultado da Análise: ${match.nome} (${match.qualidade})`);
            console.log(`Preço lance leilão: $${resultado.precoAtual.toFixed(2)} | Float: ${resultado.floatAtual != null ? resultado.floatAtual.toFixed(3) : 'N/A'} | CB: ${resultado.custoBeneficioAtual.toFixed(2)}`);
            console.log(`Preço Melhor histórico: $${resultado.melhorItem.precoUSD.toFixed(2)} | Float: ${resultado.melhorItem.float != null ? resultado.melhorItem.float.toFixed(3) : 'N/A' } | CB: ${resultado.melhorItem.custoBeneficio.toFixed(2)}`);
      
            const alertaCB = `Preço Máximo aceitável: $${resultado.precoMaximo.toFixed(2)} para o CB ${resultado.melhorItem.custoBeneficio.toFixed(2)} (${resultado.diferencaPreco.toFixed(2)} vs atual)`;
      
            if (resultado.precoMaximo < match.lance_atual) {
              console.log(`\x1b[31m${alertaCB}\x1b[0m`);
            } else if(resultado.precoMaximo != Infinity) {

// coisas do csfloat
let nome_cs_float = `${match.nome} (${match.qualidade})`;
    let float_cs_float = resultado.floatAtual != null ? resultado.floatAtual.toFixed(3) : 'N/A';
    console.log("--- INICIANDO GERAÇÃO DE LINK ---");
    
    // Chama a nova função para obter o link
    const linkGerado_cs_float = await csfloatService.gerarLinkDeBusca(nome_cs_float, float_cs_float);

    console.log("\n--- RESULTADO FINAL ---");
        console.log("Link para busca manual no CSFloat:");
        console.log(linkGerado_cs_float);
    let melhor_ordem = await rasparMelhorOrdemDeCompra(linkGerado_cs_float);
   // fim coisas do csfloat
              console.log(`\x1b[32m${alertaCB}\x1b[0m`);


// Primeiro, escape TODAS as variáveis que irão para a mensagem
const nomeSeguro = escapeMarkdownV2(match.nome);
const qualidadeSegura = escapeMarkdownV2(match.qualidade);
const precoAtualSeguro = escapeMarkdownV2(resultado.precoAtual.toFixed(2));
const floatAtualSeguro = resultado.floatAtual != null ? escapeMarkdownV2(resultado.floatAtual.toFixed(3)) : 'N/A';
const cbAtualSeguro = escapeMarkdownV2(resultado.custoBeneficioAtual.toFixed(2));
const melhorPrecoSeguro = escapeMarkdownV2(resultado.melhorItem.precoUSD.toFixed(2));
const melhorFloatSeguro = resultado.melhorItem.float != null ? escapeMarkdownV2(resultado.melhorItem.float.toFixed(3)) : 'N/A';
const melhorCbSeguro = escapeMarkdownV2(resultado.melhorItem.custoBeneficio.toFixed(2));
const precoMaximoSeguro = escapeMarkdownV2(resultado.precoMaximo.toFixed(2));
const precoOrdem = melhor_ordem != null ? escapeMarkdownV2(melhor_ordem.price.toFixed(2)) : 'N/A';
const quantidadeOrdem = melhor_ordem != null ? escapeMarkdownV2(melhor_ordem.quantity) : 'N/A';
const diferencaPrecoSeguro = escapeMarkdownV2(resultado.diferencaPreco.toFixed(2));

// Agora, monte a mensagem
await bot.sendMessage(chatId,
  `🚨 *ITEM ENCONTRADO\\!* 🚨
  *${nomeSeguro} \\(${qualidadeSegura}\\)*
  
  *🔷 ATUAL*
  💰Preço: $${precoAtualSeguro}
  🎚️ Float: ${floatAtualSeguro}
  📊CB: ${cbAtualSeguro}
  
  *🔷 MELHOR*
  💰 Preço: $${melhorPrecoSeguro}
  🎚️ Float: ${melhorFloatSeguro}
  📊 CB: ${melhorCbSeguro}
  
  ✅ *Preço Máximo:* $${precoMaximoSeguro}
  📌 *Diferença:* ${diferencaPrecoSeguro}
  
  ✅Preço Máximo CsFloat: $${precoOrdem}
  🔢Quantidade: ${quantidadeOrdem}

  [Ver no Empire](${url})
  [Ver no CSFloat](${linkGerado_cs_float})`,
  { 
    parse_mode: 'MarkdownV2' // <-- MODO CORRETO
  }
);

await enviarWhatsapp('120363402483665337@g.us', `
🚨*ITEM ENCONTRADO!*🚨
${match.nome} (${match.qualidade})

🔷*ATUAL*
💰Preço: $${resultado.melhorItem.precoUSD.toFixed(2)}
🎚️Float: ${resultado.floatAtual.toFixed(3)}
📊CB: ${resultado.custoBeneficioAtual.toFixed(2)}

🔷*MELHOR*
💰Preço: $${resultado.melhorItem.precoUSD.toFixed(2)}
🎚️Float: ${resultado.melhorItem.float.toFixed(3)}
📊CB: ${resultado.melhorItem.custoBeneficio.toFixed(2)}

✅Preço Máximo: $${resultado.precoMaximo.toFixed(2)}
📌Diferença: $${resultado.diferencaPreco.toFixed(2)}

✅Preço Máximo CsFloat: $${melhor_ordem.price.toFixed(2)}
🔢Quantidade: ${melhor_ordem.quantity}

🔗${url}
🔗${linkGerado_cs_float}`
); // <-- Sem o terceiro parâmetro
    
            }
          } else {
            console.log("⚠️ Nenhum item histórico encontrado.");
          }
      
          await conn.close();
        }
      }
    }
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function executarProcesso() {
  while(true) {

    // verificação comando /start /pause
    if(!botAtivo ){
      await delay(1000);
      continue;
      }

    try {
      await fetchItensBanco();
      await fetchItensEmpire();
      await compararItens();
      await delay(3000)
    } catch (err) {
      console.error(`[${new Date().toLocaleString('pt-BR')}]❌ Erro no loop principal:`, err.message);
    }
 //console.log('volta loop')
  }
}
executarProcesso();
app.listen(3003, () => console.log("🚀 Servidor rodando na porta 3003"));

