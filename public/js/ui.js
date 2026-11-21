// Funções pequenas que criam elementos da tela e mostram mensagens.

// Cria um elemento com classe e texto. Usa textContent, então o texto nunca é lido como HTML (evita injeção de código).
export function criarElemento(tag, classe = '', texto = '') {
  const elemento = document.createElement(tag); // cria o elemento pelo nome da tag
  if (classe) elemento.className = classe; // aplica a classe, se houver
  if (texto !== '') elemento.textContent = texto; // coloca o texto, se houver
  return elemento; // devolve o elemento pronto
}

// Mostra uma mensagem no topo da área indicada e a remove sozinha depois de 6 segundos
export function mostrarAviso(area, texto, tipo = 'ok') {
  const aviso = criarElemento('p', `aviso aviso-${tipo}`, texto); // cria o parágrafo do aviso
  area.prepend(aviso); // coloca no começo da área
  setTimeout(() => aviso.remove(), 6000); // apaga depois de 6 segundos
}

// Cria uma tabela com cabeçalho e linhas. Cada valor pode ser um texto ou um elemento.
export function criarTabela(colunas, linhas) {
  const area = criarElemento('div', 'tabela-area'); // área com rolagem horizontal
  const tabela = criarElemento('table', 'tabela'); // a tabela em si
  const cabeca = document.createElement('thead'); // cabeçalho
  const linhaCabeca = document.createElement('tr'); // linha do cabeçalho
  colunas.forEach(nome => linhaCabeca.appendChild(criarElemento('th', '', nome))); // uma célula por coluna
  cabeca.appendChild(linhaCabeca); // junta a linha ao cabeçalho

  const corpo = document.createElement('tbody'); // corpo com os dados
  if (linhas.length === 0) { // não há dados
    const linha = document.createElement('tr'); // linha de aviso
    const celula = criarElemento('td', 'vazio', 'Nenhum registro encontrado.'); // célula de aviso
    celula.colSpan = colunas.length; // ocupa a largura toda
    linha.appendChild(celula); // coloca a célula na linha
    corpo.appendChild(linha); // coloca a linha no corpo
  }

  linhas.forEach(valores => { // para cada linha de dados...
    const linha = document.createElement('tr'); // cria a linha
    valores.forEach(valor => { // para cada valor da linha...
      const celula = document.createElement('td'); // cria a célula
      if (valor instanceof Node) celula.appendChild(valor); // se for elemento (etiqueta, botão), coloca dentro
      else celula.textContent = valor ?? '—'; // se for texto, coloca; vazio vira traço
      linha.appendChild(celula); // coloca a célula na linha
    });
    corpo.appendChild(linha); // coloca a linha no corpo
  });

  tabela.append(cabeca, corpo); // junta cabeçalho e corpo na tabela
  area.appendChild(tabela); // coloca a tabela na área com rolagem
  return area; // devolve a área pronta
}

// Cria uma etiqueta com texto e cor (o texto é o sinal principal, a cor é reforço)
export function criarEtiqueta(texto, tipo = 'ok') {
  return criarElemento('span', `etiqueta etiqueta-${tipo}`, texto);
}

// Diz qual cor usar para a situação de uma movimentação
export function tipoDaSituacao(situacao) {
  if (situacao === 'Pendente') return 'alerta'; // aguardando decisão
  if (situacao === 'Recusada') return 'critico'; // recusada
  return 'ok'; // concluída ou confirmada
}

// Converte uma data AAAA-MM-DD para DD/MM/AAAA
export function formatarData(iso) {
  if (!iso) return '—'; // sem data
  const [ano, mes, dia] = iso.slice(0, 10).split('-'); // separa as partes
  return `${dia}/${mes}/${ano}`; // monta no formato brasileiro
}

// Converte data e hora ISO para o padrão brasileiro
export function formatarDataHora(iso) {
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }); // ex.: 10/11/26, 09:42
}

// Preenche um select com as opções { valor, texto }. A primeira opção é o texto padrão, sem valor.
export function preencherSelect(select, opcoes, textoPadrao) {
  select.replaceChildren(); // apaga as opções antigas
  select.appendChild(new Option(textoPadrao, '')); // opção padrão vazia
  opcoes.forEach(opcao => select.appendChild(new Option(opcao.texto, opcao.valor))); // uma opção por item
}

// Cria uma caixa com título para agrupar um bloco da tela
export function criarCaixa(titulo) {
  const caixa = criarElemento('section', 'caixa'); // a caixa
  caixa.appendChild(criarElemento('h2', '', titulo)); // o título dentro dela
  return caixa; // devolve a caixa
}
