// Ponto de entrada do front-end: controla o login, o menu e a troca de telas.

import { api, lerSessao, salvarSessao, encerrarSessao } from './api.js'; // comunicação com o back-end
import { mostrarAviso } from './ui.js'; // mostra mensagens na tela
import desenharPainel from './telas/painel.js'; // tela do painel
import desenharItens from './telas/itens.js'; // tela de itens
import desenharEntrada from './telas/entrada.js'; // tela de entrada
import desenharSaida from './telas/saida.js'; // tela de saída (com leitura de receita)
import desenharPendencias from './telas/pendencias.js'; // tela de confirmação
import desenharHistorico from './telas/historico.js'; // tela de histórico
import desenharUsuarios from './telas/usuarios.js'; // tela de usuários (só Administrador)

// Lista das telas do menu: chave interna, texto do botão, função que desenha a tela
// e, se existir, os perfis que podem ver a tela (sem "perfis" todos veem)
const TELAS = [
  { chave: 'painel', rotulo: 'Painel', desenhar: desenharPainel },
  { chave: 'itens', rotulo: 'Itens e lotes', desenhar: desenharItens },
  { chave: 'entrada', rotulo: 'Entrada', desenhar: desenharEntrada },
  { chave: 'saida', rotulo: 'Saída', desenhar: desenharSaida },
  { chave: 'pendencias', rotulo: 'Pendências', desenhar: desenharPendencias },
  { chave: 'historico', rotulo: 'Histórico', desenhar: desenharHistorico },
  { chave: 'usuarios', rotulo: 'Usuários', desenhar: desenharUsuarios, perfis: ['Administrador'] },
];

// Diz se a pessoa logada pode ver a tela
function podeVer(tela) {
  return !tela.perfis || tela.perfis.includes(sessaoAtual.usuario.perfil); // sem restrição, ou perfil permitido
}

// ---------- Referências aos elementos da página ----------
const telaLogin = document.getElementById('tela-login'); // bloco do login
const areaSistema = document.getElementById('area-sistema'); // bloco do sistema
const formularioLogin = document.getElementById('formulario-login'); // formulário de login
const avisoLogin = document.getElementById('aviso-login'); // aviso de erro do login
const menuTelas = document.getElementById('menu-telas'); // onde ficam os botões do menu
const areaTela = document.getElementById('area-tela'); // onde a tela é desenhada
const tituloTela = document.getElementById('titulo-tela'); // título no topo
const usuarioLogado = document.getElementById('usuario-logado'); // nome de quem está logado
const botaoSair = document.getElementById('botao-sair'); // botão de sair

let sessaoAtual = null; // guarda token e usuário enquanto a página estiver aberta

// ---------- Menu ----------

// Cria um botão para cada tela
function montarMenu() {
  menuTelas.replaceChildren(); // apaga o menu anterior
  TELAS.filter(podeVer).forEach(tela => { // para cada tela que esta pessoa pode ver...
    const botao = document.createElement('button'); // cria o botão
    botao.type = 'button'; // não envia formulário
    botao.className = 'item-menu'; // classe de estilo
    botao.dataset.chave = tela.chave; // guarda a chave da tela no botão
    botao.textContent = tela.rotulo; // texto visível
    botao.addEventListener('click', () => abrirTela(tela.chave)); // ao clicar, abre a tela
    menuTelas.appendChild(botao); // coloca no menu
  });
}

// Marca o botão da tela aberta como ativo
function marcarBotaoAtivo(chave) {
  menuTelas.querySelectorAll('.item-menu').forEach(botao => { // percorre os botões
    botao.classList.toggle('ativo', botao.dataset.chave === chave); // liga só o da tela atual
  });
}

// ---------- Troca de telas ----------

// Abre uma tela: limpa a área, desenha a tela e mostra erro se algo falhar
async function abrirTela(chave) {
  const tela = TELAS.find(item => item.chave === chave); // acha a tela pela chave
  marcarBotaoAtivo(chave); // destaca o botão no menu
  tituloTela.textContent = tela.rotulo; // muda o título
  areaTela.replaceChildren(); // apaga o conteúdo anterior
  try {
    await tela.desenhar(areaTela, sessaoAtual.usuario); // desenha a tela nova
  } catch (erro) {
    mostrarAviso(areaTela, erro.message, 'erro'); // mostra o erro na própria área
  }
}

// ---------- Login e sessão ----------

// Mostra o sistema e abre o painel
function mostrarSistema(sessao) {
  sessaoAtual = sessao; // guarda a sessão em memória
  telaLogin.hidden = true; // esconde o login
  areaSistema.hidden = false; // mostra o sistema
  usuarioLogado.textContent = `${sessao.usuario.nome} · ${sessao.usuario.perfil}`; // mostra quem está logado
  montarMenu(); // cria os botões do menu
  abrirTela('painel'); // começa pelo painel
}

// Volta para a tela de login e apaga a sessão
function mostrarLogin() {
  encerrarSessao(); // apaga a sessão guardada
  sessaoAtual = null; // limpa a sessão em memória
  areaSistema.hidden = true; // esconde o sistema
  telaLogin.hidden = false; // mostra o login
}

// Envia usuário e senha para o back-end
formularioLogin.addEventListener('submit', async evento => {
  evento.preventDefault(); // impede o recarregamento da página
  avisoLogin.hidden = true; // esconde aviso antigo
  const usuario = document.getElementById('login-usuario').value.trim(); // pega o usuário sem espaços
  const senha = document.getElementById('login-senha').value; // pega a senha
  try {
    const sessao = await api.post('/api/login', { usuario, senha }); // pede o login à API
    salvarSessao(sessao); // guarda o token e o usuário
    mostrarSistema(sessao); // abre o sistema
  } catch (erro) {
    avisoLogin.textContent = erro.message; // mostra a mensagem de erro
    avisoLogin.hidden = false; // torna o aviso visível
  }
});

botaoSair.addEventListener('click', mostrarLogin); // o botão sair volta para o login

// Ao abrir a página: se já existe sessão, entra direto; senão, mostra o login
const sessaoSalva = lerSessao();
if (sessaoSalva) {
  mostrarSistema(sessaoSalva);
} else {
  mostrarLogin();
}
