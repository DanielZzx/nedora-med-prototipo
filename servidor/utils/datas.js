// Funções de data. A validade é guardada como texto AAAA-MM-DD, que pode ser comparado direto como texto.

// Converte um objeto Date para o texto AAAA-MM-DD usando a data local
function paraISO(data) {
  const ano = data.getFullYear(); // pega o ano com 4 dígitos
  const mes = String(data.getMonth() + 1).padStart(2, '0'); // mês começa em zero, então soma 1 e completa com zero
  const dia = String(data.getDate()).padStart(2, '0'); // pega o dia e completa com zero
  return `${ano}-${mes}-${dia}`; // junta no formato AAAA-MM-DD
}

// Devolve a data de hoje no formato AAAA-MM-DD
function hojeISO() {
  return paraISO(new Date()); // cria uma data agora e converte
}

// Soma uma quantidade de dias a uma data no formato AAAA-MM-DD
function somarDias(dataISO, dias) {
  const [ano, mes, dia] = dataISO.split('-').map(Number); // separa ano, mês e dia como números
  return paraISO(new Date(ano, mes - 1, dia + dias)); // o Date ajusta sozinho meses e anos
}

// Conta quantos dias existem entre duas datas AAAA-MM-DD (fim menos início)
function diasEntre(dataInicial, dataFinal) {
  const [a1, m1, d1] = dataInicial.split('-').map(Number); // separa a data inicial
  const [a2, m2, d2] = dataFinal.split('-').map(Number); // separa a data final
  const umDiaEmMs = 24 * 60 * 60 * 1000; // um dia em milissegundos
  return Math.round((Date.UTC(a2, m2 - 1, d2) - Date.UTC(a1, m1 - 1, d1)) / umDiaEmMs); // usa UTC para evitar erro de fuso
}

// Converte AAAA-MM-DD para DD/MM/AAAA, para mostrar ao usuário
function formatarBR(dataISO) {
  const [ano, mes, dia] = dataISO.split('-'); // separa as partes
  return `${dia}/${mes}/${ano}`; // monta no formato brasileiro
}

module.exports = { paraISO, hojeISO, somarDias, diasEntre, formatarBR }; // exporta as funções
