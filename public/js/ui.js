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
  if (situacao === 'Estornada') return 'alerta'; // entrada desfeita
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

// Abre um diálogo nativo para pedir um motivo e executar uma ação após a confirmação.
// Devolve true quando a ação termina com sucesso e false quando o usuário cancela.
export function pedirMotivo({ titulo, linhas = [], rotulo = 'Motivo', textoBotao = 'Confirmar', aviso = 'Esta ação não pode ser desfeita.', aoConfirmar }) {
  return new Promise(resolver => { // a promessa termina quando o diálogo fechar
    const dialogo = criarElemento('dialog', 'dialogo'); // elemento nativo de diálogo
    dialogo.setAttribute('aria-label', titulo); // nome acessível do diálogo
    const formulario = criarElemento('form', 'formulario'); // formulário dentro do diálogo
    dialogo.appendChild(formulario); // coloca o formulário no diálogo

    formulario.appendChild(criarElemento('h2', 'dialogo-titulo', titulo)); // título do diálogo

    if (linhas.length > 0) { // se veio um resumo para mostrar...
      const resumo = criarElemento('div', 'dialogo-resumo'); // área do resumo
      linhas.forEach(textoLinha => resumo.appendChild(criarElemento('p', '', textoLinha))); // uma linha por informação
      formulario.appendChild(resumo); // coloca o resumo no formulário
    }

    formulario.appendChild(criarElemento('p', 'dialogo-aviso', aviso)); // aviso fixo da ação

    const erro = criarElemento('p', 'aviso aviso-erro', ''); // área para erros do servidor
    erro.setAttribute('role', 'alert'); // avisa leitores de tela
    erro.hidden = true; // começa escondida
    formulario.appendChild(erro); // coloca a área de erro no formulário

    const rotuloCampo = criarElemento('label', '', rotulo); // rótulo do campo de motivo
    const campo = criarElemento('textarea'); // campo de texto livre
    campo.required = true; // motivo obrigatório
    campo.rows = 3; // altura inicial confortável
    campo.placeholder = 'Descreva o que aconteceu'; // dica dentro do campo
    rotuloCampo.appendChild(campo); // coloca o campo dentro do rótulo
    formulario.appendChild(rotuloCampo); // coloca o campo no formulário

    const acoes = criarElemento('div', 'botoes dialogo-acoes'); // área dos botões
    const cancelar = criarElemento('button', 'botao pequeno secundario', 'Cancelar'); // botão cancelar
    cancelar.type = 'button'; // não envia o formulário
    const confirmar = criarElemento('button', 'botao pequeno', textoBotao); // botão confirmar
    confirmar.type = 'submit'; // envia o formulário
    confirmar.disabled = true; // só libera quando houver motivo
    acoes.append(cancelar, confirmar); // junta os botões
    formulario.appendChild(acoes); // coloca os botões no formulário

    let enviando = false; // indica que a ação está em andamento
    let fechado = false; // evita fechar e resolver duas vezes

    function fechar(confirmou) { // fecha o diálogo e devolve o resultado
      if (fechado) return; // já fechou: não faz nada
      fechado = true; // marca como fechado
      dialogo.close(); // fecha o elemento nativo
      dialogo.remove(); // tira o diálogo da página
      resolver(confirmou); // devolve true (sucesso) ou false (cancelado)
    }

    campo.addEventListener('input', () => { // a cada alteração no motivo...
      confirmar.disabled = campo.value.trim() === ''; // libera o botão só com texto
      erro.hidden = true; // esconde o erro antigo
    });

    cancelar.addEventListener('click', () => { // ao clicar em cancelar...
      if (!enviando) fechar(false); // fecha sem enviar
    });

    formulario.addEventListener('submit', async evento => { // ao confirmar...
      evento.preventDefault(); // impede o envio padrão do formulário
      const motivo = campo.value.trim(); // lê o motivo sem espaços nas pontas
      if (!motivo || enviando) return; // sem motivo ou já enviando: não faz nada
      enviando = true; // marca o envio em andamento
      confirmar.disabled = true; // evita clique duplo
      cancelar.disabled = true; // evita cancelar durante o envio
      try {
        await aoConfirmar(motivo); // executa a ação passada pelo chamador
        fechar(true); // ação concluída: fecha com sucesso
      } catch (falha) {
        erro.textContent = falha?.message || 'Erro ao concluir a ação.'; // mostra a mensagem do servidor
        erro.hidden = false; // torna o erro visível
        enviando = false; // libera um novo envio
        confirmar.disabled = false; // reabilita o botão confirmar
        cancelar.disabled = false; // reabilita o botão cancelar
        campo.focus(); // devolve o foco ao motivo
      }
    });

    dialogo.addEventListener('cancel', evento => { // tecla Esc...
      evento.preventDefault(); // controla o fechamento pelo nosso código
      if (!enviando) fechar(false); // fecha sem enviar
    });

    dialogo.addEventListener('close', () => { // se o navegador fechar por outro motivo...
      if (!fechado) fechar(false); // resolve como cancelamento
    });

    document.body.appendChild(dialogo); // coloca o diálogo na página
    dialogo.showModal(); // abre como modal
    campo.focus(); // foco inicial no campo de motivo
  });
}
