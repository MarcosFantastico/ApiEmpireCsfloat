// Função para escapar caracteres (a mesma de antes)
function escapeMarkdownV2(text) {
  // Converte para string antes de escapar, para garantir que números e outros tipos funcionem
  const textAsString = String(text); 
  return textAsString.replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');
}

module.exports = { escapeMarkdownV2 };