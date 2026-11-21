// Tela de usuários (só Administrador): lista quem tem acesso e cria novos usuários com senha provisória.

import { chamarApi } from '../api.js'; // chamadas à API
import { criarCaixa, criarElemento, criarTabela, criarEtiqueta, mostrarAviso, preencherSelect } from '../ui.js'; // ajudantes de tela

// Desenha a tela de usuários dentro da área recebida
export default async function desenharUsuarios(area) {
  const { usuarios, perfis } = await chamarApi('GET', '/api/usuarios'); // lista atual e perfis aceitos

  const caixaLista = criarCaixa('Quem tem acesso'); // caixa com a tabela
  const caixaNovo = criarCaixa('Criar novo usuário'); // caixa com o formulário
  area.append(caixaLista, caixaNovo); // mostra as duas caixas

  // Desenha a tabela de usuários (também usada depois de criar alguém)
  function desenharLista(lista) {
    caixaLista.querySelector('.tabela-area')?.remove(); // apaga a tabela antiga, se houver
    caixaLista.appendChild(criarTabela(
      ['Nome', 'Usuário', 'Perfil'],
      lista.map(pessoa => [
        pessoa.nome,
        pessoa.usuario,
        criarEtiqueta(pessoa.perfil, pessoa.perfil === 'Administrador' ? 'alerta' : 'ok'),
      ]),
    ));
  }
  desenharLista(usuarios);

  // ---------- Formulário de novo usuário ----------
  caixaNovo.appendChild(criarElemento('p', 'nota', 'O usuário é um nome curto para entrar (ex.: enfermeira, joao.silva). Ele não usa e-mail. Entregue a senha provisória e peça para a pessoa trocar.'));
  const formulario = criarElemento('form', 'formulario');
  formulario.innerHTML = `
    <div class="duas-colunas">
      <label>Nome da pessoa <input name="nome" required></label>
      <label>Usuário <input name="usuario" required minlength="3" maxlength="20" pattern="[a-z0-9._-]+" autocapitalize="none"></label>
    </div>
    <div class="duas-colunas">
      <label>Perfil <select name="perfil" required></select></label>
      <label>Senha provisória <input name="senha" type="password" required minlength="4"></label>
    </div>
    <div class="botoes"><button class="botao" type="submit">Criar usuário</button></div>`;
  caixaNovo.appendChild(formulario); // coloca o formulário na caixa

  preencherSelect(formulario.querySelector('[name="perfil"]'), perfis.map(perfil => ({ valor: perfil, texto: perfil })), 'Escolha o perfil');

  // Ao enviar: cria o usuário e atualiza a lista
  formulario.addEventListener('submit', async evento => {
    evento.preventDefault(); // impede o recarregamento
    const dados = Object.fromEntries(new FormData(formulario)); // lê os campos
    try {
      const novo = await chamarApi('POST', '/api/usuarios', dados); // cria o usuário na API
      formulario.reset(); // limpa o formulário
      const lista = await chamarApi('GET', '/api/usuarios'); // busca a lista atualizada
      desenharLista(lista.usuarios); // redesenha a tabela
      mostrarAviso(caixaNovo, `Usuário ${novo.usuario} criado para ${novo.nome}.`, 'ok');
    } catch (erro) {
      mostrarAviso(caixaNovo, erro.message, 'erro'); // mostra a mensagem do servidor (ex.: nome já usado)
    }
  });
}
