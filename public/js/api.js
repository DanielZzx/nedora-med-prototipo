// Comunicação com o back-end. Todas as chamadas à API passam por este arquivo.

const CHAVE_SESSAO = 'nedoraMed_sessao'; // nome da chave onde a sessão fica guardada no navegador

// Guarda token e usuário no sessionStorage (some quando a aba é fechada)
export function salvarSessao(sessao) {
  sessionStorage.setItem(CHAVE_SESSAO, JSON.stringify(sessao)); // transforma o objeto em texto e guarda
}

// Lê a sessão guardada; devolve null se não houver ou se estiver corrompida
export function lerSessao() {
  try {
    return JSON.parse(sessionStorage.getItem(CHAVE_SESSAO)); // lê e converte de texto para objeto
  } catch (erro) {
    return null; // texto inválido: trata como sem sessão
  }
}

// Apaga a sessão guardada
export function encerrarSessao() {
  sessionStorage.removeItem(CHAVE_SESSAO); // remove a chave
}

// Faz a chamada HTTP e devolve os dados em JSON. Lança erro com a mensagem do servidor se falhar.
export async function chamarApi(metodo, caminho, corpo) {
  const sessao = lerSessao(); // pega a sessão atual, se houver
  const cabecalhos = { 'Content-Type': 'application/json' }; // avisa que o corpo é JSON
  if (sessao) cabecalhos.Authorization = `Bearer ${sessao.token}`; // envia o token nas rotas protegidas

  const resposta = await fetch(caminho, { // faz a requisição
    method: metodo,
    headers: cabecalhos,
    body: corpo ? JSON.stringify(corpo) : undefined, // corpo só quando há dados
  });

  if (resposta.status === 401 && sessao) { // token vencido ou servidor reiniciado
    encerrarSessao(); // apaga a sessão antiga
    location.reload(); // recarrega para mostrar o login
    return new Promise(() => {}); // nunca resolve: a página já está recarregando
  }

  const dados = await resposta.json().catch(() => ({})); // lê o JSON; se falhar, usa objeto vazio
  if (!resposta.ok) throw new Error(dados.erro || 'Erro ao falar com o servidor.'); // erro vindo do servidor
  return dados; // sucesso: devolve os dados
}

// Atalhos para os métodos mais usados
export const api = {
  get: caminho => chamarApi('GET', caminho), // GET sem corpo
  post: (caminho, corpo = {}) => chamarApi('POST', caminho, corpo), // POST com corpo (vazio se não informado)
};
