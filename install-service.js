// install-service.js
const Service = require('node-windows').Service;
const path = require('path');

const svc = new Service({
  name: 'Apics',
  description: 'Serviço de API para CS:GO Empire e outros.',
  script: path.join(__dirname, 'fetch_geral.js'),
  // REMOVEMOS O BLOCO 'logOnAs' DAQUI, JÁ QUE ELE ESTÁ SENDO IGNORADO
});

// Apenas ouvimos o evento de instalação
svc.on('install', function(){
  console.log('Serviço "Apics" instalado com sucesso.');
  console.log('IMPORTANTE: Agora edite o arquivo .xml na pasta daemon e inicie o serviço manualmente.');
  // REMOVEMOS A LINHA svc.start();
});

console.log('Instalando o serviço "Apics" (sem iniciar)...');
svc.install();