require('dotenv').config({ path: './credentials.env' });

const puppeteer = require('puppeteer-core');
const { JSDOM } = require('jsdom');
const oracledb = require('oracledb');

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const EMPIRE_TO_USD = 0.6142808;
const FORCA_FLOAT = 1.8;
const PESO_PRECO = 1.5;

function calcularCustoBeneficio(preco, float) {
  

 if (float === null || float === undefined) {
    // CB simplificado para agentes
    return 100 / (preco ** PESO_PRECO);
  }

const valorFloat = Math.exp(-FORCA_FLOAT * float);
  return (valorFloat * 100) / Math.pow(preco, PESO_PRECO);
}

function calcularPrecoMaximo(custoBeneficioAlvo, floatAtual) {

  if (floatAtual === 0) return Infinity;

  if (floatAtual === null || floatAtual === undefined) {
    // Inverter a fórmula simplificada para preço ideal de agentes
    return Math.pow(100 / custoBeneficioAlvo, 1 / PESO_PRECO);
  }

  return (
    (Math.exp(-FORCA_FLOAT * floatAtual) * 100) / custoBeneficioAlvo
  ) ** (1 / PESO_PRECO);

}

async function analisarItemCSGOEmpire(url) {
  const browser = await puppeteer.launch({
    headless: false, // true desabilita a abertura false habilita
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  } catch (error) {
    await browser.close(); // Fecha o browser se falhou antes do finally
    console.error('❌ Erro ao acessar a URL do item:', url);
    throw new Error(`Falha ao acessar a URL do item: ${url}\nMotivo: ${error.message}`);
  }

  // Bloco para lidar com o botão de cookie de forma segura
    try {
      const seletorDoBotaoCookie = 'a.c-button.c-button-primary';
      
      // Espera o botão aparecer na tela por até 5 segundos
      await page.waitForSelector(seletorDoBotaoCookie, { visible: true, timeout: 5000 });
      
      // Clica no botão
      await page.click(seletorDoBotaoCookie);
      
      console.log('✅ Botão do cookie clicado com sucesso!');
    } catch (error) {
      // Se o botão não for encontrado, apenas avisa no console e continua.
      console.warn('⚠️  O pop-up de cookie não apareceu ou não foi encontrado.');
    }

  console.log('⏳ Esperando o botão "Recently Sold"...');
  let connection;

  try {
    const maxRetries = 5;
    let buttonFound = false;

    for (let i = 0; i < maxRetries; i++) {
      buttonFound = await page.evaluate(() => {
        //const buttons = Array.from(document.querySelectorAll("button"));
        //const target = buttons.find(b => b.textContent.trim().toLowerCase().includes("recently sold"));
        target = document.querySelector('div>div.flex.w-full>button:nth-child(2)');
        
        if (target) {
          target.click();
          return true;
        }
        return false;
      });

      if (buttonFound) break;
      await delay(500);

  // Se não foi encontrado, aguarda e recarrega a página para a próxima tentativa
  console.log(`Tentativa ${i + 1} de ${maxRetries}: botão não encontrado. Recarregando a página...`);
 
  await page.reload(); // <--- COMANDO DE REFRESH AQUI
await delay(8000);

    }




    if (!buttonFound) throw new Error("Botão 'Recently sold' não encontrado.");

    await delay(3000);

    const html = await page.content();
    const dom = new JSDOM(html);
    const document = dom.window.document;
    const linhas = [...document.querySelectorAll('table tr')];



  const meta = await page.evaluate(() => {


  const titulo = document.querySelector('h2.pb-md.text-light-1')?.textContent || '';
  const [arma, ...rest] = titulo.split(' | ');
  const resto = rest.join(' | ').trim();

  let nomeSkin = resto;
  let qualidade = null;

  if (resto.includes('(')) {
    const partes = resto.split(' (');
    nomeSkin = partes[0].trim();
    qualidade = partes[1]?.replace(')', '').trim();
  }

  return {
    arma: arma?.trim(),
    nomeSkin,
    qualidade: qualidade != null ? qualidade : 'N/A'
  };
});

console.log('qualidade')

const isAgente = /special agent|fbi|guerrilla|phoenix|swat|crew|seal|gendarmerie|tzar|professor/i.test(meta.arma);





  

   const historico = linhas
  .map((linha, i) => {
    const colunas = linha.querySelectorAll('td');
    const floatRaw = colunas[1]?.textContent || '';
    const precoRaw = colunas[2]?.textContent || '';

    const precoEC = parseFloat(precoRaw.replace(/[^\d.]/g, '')) || 0;
    const precoUSD = +(precoEC * EMPIRE_TO_USD).toFixed(2);

    const float = parseFloat((floatRaw.split('~')[1] || '').match(/\d+\.\d+/)?.[0]);

    if (!precoUSD || precoUSD === 0) return null;

    if (!float && !isAgente) return null; // só permite float ausente se for agente

    return {
      precoUSD,
      float: isNaN(float) ? null : float
    };
  })
  .filter(Boolean);

    if (historico.length === 0) {
      await browser.close();
      return [];
    }

    const melhorItem = historico
  .map(item => ({
    ...item,
    custoBeneficioReal: calcularCustoBeneficio(item.precoUSD, item.float),
    custoBeneficio: parseFloat(calcularCustoBeneficio(item.precoUSD, item.float).toFixed(2))
  }))
  .sort((a, b) => {
    if (b.custoBeneficioReal !== a.custoBeneficioReal) return b.custoBeneficioReal - a.custoBeneficioReal;
    if (a.precoUSD !== b.precoUSD) return a.precoUSD - b.precoUSD;
   return (a.float ?? Infinity) - (b.float ?? Infinity);
  })[0];

    const itemAtual = {
      float: parseFloat(
        document.querySelector('p.size-medium.ml-lg.text-light-1')?.textContent.trim().replace('~', '') || '0'
      ),
      precoUSD: parseFloat(
        (parseFloat(
          document.querySelectorAll('div.inner>div.flex.items-center.justify-between.pb-xs>div.flex.items-center>span.font-numeric.inline-flex.items-baseline.justify-center.font-bold.text-light-1>div[data-testid="currency-value"]')[0]?.textContent.trim().replace(',', '.') || '0'
        ) * EMPIRE_TO_USD).toFixed(2)
      )
    };

    const custoBeneficioAtual = calcularCustoBeneficio(itemAtual.precoUSD, itemAtual.float);
    const precoMaximo = +calcularPrecoMaximo(melhorItem.custoBeneficioReal, itemAtual.float);
    const diferencaPreco = +(itemAtual.precoUSD - precoMaximo);




    console.log('🔍 Dados extraídos do título:', meta);
   
    await browser.close();


    // 📦 Conecta ao banco usando .env
    connection = await oracledb.getConnection({
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      connectString: process.env.DB_CONNECT_STRING
    });

    const armaQuery = await connection.execute(
      `SELECT id FROM arma WHERE LOWER(nome) = :arma`,
      [meta.arma.toLowerCase()],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    const arma_id = armaQuery.rows?.[0]?.ID;

    const skinQuery = await connection.execute(
      `SELECT id FROM skin WHERE LOWER(nome) = :nomeSkin`,
      [meta.nomeSkin.toLowerCase()],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    const skin_id = skinQuery.rows?.[0]?.ID;

    // Pesquisa qualidades da arma analizada no banco
    const qualidadeQuery = await connection.execute(
      `SELECT qualidade 
       FROM melhor_historico_empire 
       WHERE skin_id = :skin_id AND arma_id = :arma_id
       ORDER BY qualidade`,  // Ordena as qualidades alfabeticamente
      [skin_id, arma_id],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    
    // Extrai todas as qualidades disponíveis da arma em um array
    const qualidades_arma = qualidadeQuery.rows?.map(row => row.QUALIDADE) || [];
    
   // console.log('Qualidades disponíveis para a arma: '+ qualidades_arma);
    qualidades_arma.forEach((qualidade, index) => {
      console.log(`${index + 1}. ${qualidade}`);
    });


console.log('log melhor item: ')
    console.log({
      preco: parseFloat(melhorItem.precoUSD),
      skin_float: melhorItem.float,
      skin_id,
      arma_id
    });

    const checkExistingQuery = await connection.execute(
      `SELECT id, qualidade 
       FROM melhor_historico_empire 
       WHERE skin_id = :skin_id 
       AND arma_id = :arma_id
       AND LOWER(qualidade) = LOWER(:qualidade)`,  // Verifica qualidade específica
      {
        skin_id: Number(skin_id),
        arma_id: Number(arma_id),
        qualidade: meta.qualidade  // Qualidade que você está tentando inserir
      },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    
    // Verifica se já existe um registro com a mesma qualidade no banco
    if (checkExistingQuery.rows && checkExistingQuery.rows.length > 0) {
      const existingQualities = checkExistingQuery.rows.map(row => row.QUALIDADE);
      console.log(`⚠️ Já existe histórico para ${meta.arma} ${meta.nomeSkin} ${meta.qualidade}. Qualidades existentes dessa skin no banco: ${existingQualities.join(', ')}`);
    } 
    else if (!arma_id || !skin_id) {
      console.warn(`⚠️ IDs não encontrados: arma_id=${arma_id}, skin_id=${skin_id}`);
    } 
    else {
      // Só insere se não existir
      await connection.execute(
        `INSERT INTO melhor_historico_empire (preco, skin_float, skin_id, arma_id, qualidade, cb)
         VALUES (:preco, :skin_float, :skin_id, :arma_id, :qualidade, :cb)`,
        {
          preco: parseFloat(melhorItem.precoUSD),
          skin_float: melhorItem.float,
          skin_id: Number(skin_id),
          arma_id: Number(arma_id),
          qualidade: meta.qualidade,
          cb: calcularCustoBeneficio(melhorItem.precoUSD,melhorItem.float)
        },
        { autoCommit: true }
      );
      console.log(`✅ Novo histórico inserido para ${meta.arma} ${meta.nomeSkin} ${meta.qualidade}`);
    }

    return {
      precoAtual: parseFloat(itemAtual.precoUSD),
      floatAtual: itemAtual.float,
      custoBeneficioAtual: +custoBeneficioAtual.toFixed(2),
      melhorItem,
      precoMaximo,
      diferencaPreco
    };

  } catch (erro) {
    console.error('❌ Erro ao analisar item:', erro);
    return [];
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (e) {
        console.error('Erro ao fechar a conexão:', e);
      }
    }
  }
}

module.exports = { analisarItemCSGOEmpire, calcularCustoBeneficio, calcularPrecoMaximo};