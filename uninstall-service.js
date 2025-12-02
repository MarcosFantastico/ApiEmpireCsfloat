// uninstall-service.js
const Service = require('node-windows').Service;
const path = require('path');

const svc = new Service({
  name: 'Apics',
  script: path.join(__dirname, 'fetch_geral.js')
});

svc.on('uninstall', function(){
  console.log('Serviço "Apics" desinstalado.');
  console.log('O serviço não existe mais.');
});

console.log('Desinstalando o serviço "Apics"...');
svc.uninstall();