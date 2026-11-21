// Leitura de receitas: a Google Cloud Vision lê o texto e este arquivo interpreta esse texto
// para sugerir itens e quantidades. A chave da API fica só no servidor (variável de ambiente).

const { ErroRegra } = require('../utils/erros'); // erro com status HTTP

const URL_VISION = 'https://vision.googleapis.com/v1/images:annotate'; // endereço do serviço de OCR

// Deixa o texto em minúsculas e sem acentos, para comparar sem erro por causa de acento
function normalizar(texto) {
  return String(texto)
    .normalize('NFD') // separa letra e acento
    .replace(/\p{Diacritic}/gu, '') // remove os acentos
    .toLowerCase() // tudo em minúsculas
    .replace(/\s+/g, ' ') // junta espaços repetidos
    .trim(); // tira espaços das pontas
}

// Quebra um nome de item em palavras úteis (ex.: "Dipirona 500 mg" -> ["dipirona", "500", "mg"])
function palavrasDoNome(nome) {
  return normalizar(nome)
    .split(/[^a-z0-9]+/) // separa em tudo que não é letra ou número
    .filter(palavra => palavra.length >= 2); // ignora pedaços muito curtos
}

// Calcula quanto uma linha combina com o nome do item (0 a 1)
function pontuarLinha(linhaNormalizada, palavras) {
  if (palavras.length === 0) return 0; // nome sem palavras não combina com nada
  const encontradas = palavras.filter(palavra => linhaNormalizada.includes(palavra)).length; // quantas palavras aparecem
  return encontradas / palavras.length; // proporção encontrada
}

// Procura quantidade na linha ou na linha seguinte (ex.: "Qtd: 20", "2 caixas", "20 comprimidos")
function acharQuantidade(linhas, indice) {
  const padroes = [
    /(?:qtd\.?|quant\.?|quantidade|cx\.?|caixas?|unid\.?)\s*:?\s*(\d{1,4})\b/, // "qtd: 20", "cx 2"
    /\b(\d{1,4})\s*(?:cx|caixas?|un|unid|unidades?|comprimidos?|comp|cp|ampolas?|frascos?|pacotes?)\b/, // "20 comprimidos"
  ];
  for (const deslocamento of [0, 1]) { // procura na linha e depois na seguinte
    const linha = linhas[indice + deslocamento];
    if (!linha) continue; // não existe essa linha
    for (const padrao of padroes) { // testa os dois formatos
      const achado = normalizar(linha).match(padrao);
      if (achado) return Number(achado[1]); // achou: devolve o número
    }
  }
  return null; // não achou quantidade
}

// Interpreta o texto da receita e devolve sugestões de itens do estoque
function interpretarReceita(texto, itens) {
  const linhas = String(texto || '').split('\n').map(l => l.trim()).filter(Boolean); // linhas úteis
  const sugestoes = []; // resultado final

  for (const item of itens) { // para cada item cadastrado...
    const palavras = palavrasDoNome(item.nome); // palavras do nome
    let melhor = null; // melhor linha encontrada para este item

    linhas.forEach((linha, indice) => { // testa cada linha da receita
      const pontos = pontuarLinha(normalizar(linha), palavras); // quanto combina
      const minimo = palavras.length === 1 ? 1 : 0.67; // nome de uma palavra precisa bater inteiro
      if (pontos >= minimo && (!melhor || pontos > melhor.pontos)) { // melhor até agora
        melhor = { pontos, indice, linha };
      }
    });

    if (melhor) { // o item apareceu na receita
      sugestoes.push({
        itemId: item.id,
        nome: item.nome,
        quantidade: acharQuantidade(linhas, melhor.indice), // pode ser null: o usuário preenche
        trecho: melhor.linha, // a linha original, para conferência
        confianca: melhor.pontos === 1 ? 'alta' : 'média', // grau de certeza
      });
    }
  }

  // Mostra primeiro as sugestões de maior confiança
  return sugestoes.sort((a, b) => (a.confianca === b.confianca ? 0 : a.confianca === 'alta' ? -1 : 1));
}

class OcrService { // serviço que conversa com a Google Vision
  async lerReceita(imagemBase64, itens) { // recebe a imagem em base64 e a lista de itens do estoque
    const chave = process.env.GOOGLE_VISION_API_KEY; // chave vem da variável de ambiente
    if (!chave) { // sem chave, o OCR não funciona
      throw new ErroRegra('Leitura automática não configurada. Você pode digitar os dados manualmente.', 503);
    }
    if (typeof imagemBase64 !== 'string' || imagemBase64.length === 0) { // confere se veio imagem
      throw new ErroRegra('Envie uma imagem da receita.');
    }

    const resposta = await fetch(URL_VISION, { // chama a API
      method: 'POST', // envia dados
      headers: {
        'Content-Type': 'application/json', // corpo em JSON
        'x-goog-api-key': chave, // chave no cabeçalho, não na URL
      },
      body: JSON.stringify({
        requests: [{
          image: { content: imagemBase64 }, // a imagem em base64
          features: [{ type: 'DOCUMENT_TEXT_DETECTION' }], // OCR pensado para documentos com texto
          imageContext: { languageHints: ['pt'] }, // dica de idioma: português
        }],
      }),
    });

    if (!resposta.ok) { // a Google respondeu com erro
      throw new ErroRegra('Não foi possível ler a receita agora. Tente de novo ou digite manualmente.', 502);
    }

    const dados = await resposta.json(); // transforma a resposta em objeto
    const texto = dados.responses?.[0]?.fullTextAnnotation?.text || ''; // texto completo, se houver
    return { texto, sugestoes: interpretarReceita(texto, itens) }; // devolve o texto e as sugestões
  }
}

module.exports = { OcrService, interpretarReceita }; // exporta o serviço e a função de interpretação
