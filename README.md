# Nedora Med · Protótipo

Protótipo de controle de estoque e rastreabilidade de medicamentos e materiais para clínicas.

Projeto desenvolvido como Trabalho de Conclusão de Curso (TCC) na Etec.

## Estrutura

```
nedora-med-prototipo/
├── package.json
├── dados/                  → banco.json (criado sozinho na primeira execução)
├── servidor/               → back-end em Node.js com Express
│   ├── servidor.js         → sobe o servidor Express e entrega o front-end
│   ├── rotas/rotas.js      → tabela de rotas da API
│   ├── servicos/           → regras: login, estoque e OCR
│   ├── banco/              → banco simulado em arquivo JSON e dados iniciais
│   └── utils/              → datas, segurança (hash de senha) e erros
└── public/                 → front-end em HTML, CSS e JavaScript
    ├── index.html          → única página (login + sistema)
    ├── css/estilo.css
    └── js/
        ├── app.js          → login, menu e troca de telas
        ├── api.js          → chamadas à API
        ├── ui.js           → funções para criar tabelas, etiquetas e avisos
        └── telas/          → uma tela por arquivo
```

## Como rodar

Precisa de Node.js 18 ou mais novo (testado com Node 22).

```bash
cd nedora-med-prototipo
npm install   # instala o Express (só na primeira vez)
npm start
```

O Express é a única dependência externa do projeto.

Depois abra **http://localhost:3000** no navegador.

Usuários de teste (senha `123` para todos). O login é feito com **nome de usuário**, não com e-mail:

| Usuário | Perfil |
|---|---|
| admin | Administrador |
| enfermeira | Enfermeiro |
| tecnico | Técnico de enfermagem |
| medico | Médico |
| auxiliar | Auxiliar |

O **Administrador** cria os demais usuários pela tela **Usuários**, informando nome, nome de usuário, perfil e uma senha provisória. Não há cadastro público.

Para zerar os dados, apague o arquivo `dados/banco.json` e reinicie o servidor. **Atenção:** um `banco.json` antigo, criado antes desta versão, tem usuários com e-mail e não entra no novo login. Apague-o antes de rodar.

## Regras implementadas

- **FEFO:** a saída sem lote escolhido usa primeiro o lote que vence antes.
- **Vencido bloqueado:** lote vencido não entra em entrada nem sai.
- **Saldo nunca negativo:** saída acima do saldo é recusada.
- **Saída pendente:** toda saída fica aguardando confirmação.
- **Confirmação por perfil:** medicamento só o Médico confirma; material, Técnico de enfermagem ou Enfermeiro.
- **Recusa:** exige motivo e devolve a quantidade ao lote.
- **Termolábil:** só entra e só é guardado em local refrigerado.
- **Histórico:** nenhuma movimentação é apagada pelas operações normais (entrada, saída, recusa, estorno); quem fez e quem confirmou ficam registrados. A única exceção é a exclusão de um item pelo Administrador, que remove o histórico daquele item.
- **Estorno de entrada:** uma entrada lançada por engano pode ser estornada pelo Administrador, sempre pelo total e com motivo; a entrada original fica marcada como estornada e nada é apagado.
- **Exclusão de item:** o Administrador pode excluir qualquer item, informando a própria senha; a exclusão também apaga os lotes e as movimentações daquele item do histórico.

## Leitura de receita com a Google Cloud Vision API

O OCR usa a **Vision API** do Google Cloud, que tem uma faixa gratuita mensal para detecção de texto. Confira os valores atuais na página de preços do Google antes de contar com a faixa gratuita, porque ela pode mudar.

Passos para ativar:

1. No console do Google Cloud, crie um projeto.
2. Ative a **Cloud Vision API** para o projeto.
3. Crie uma **chave de API** e restrinja a chave à Cloud Vision API.
4. Rode o servidor com a chave em uma variável de ambiente:

```bash
GOOGLE_VISION_API_KEY="sua-chave-aqui" npm start
```

Sem a chave, o sistema continua funcionando e a tela de saída mostra que o OCR não está configurado. A chave fica só no servidor e nunca vai para o navegador.

**Atenção:** a leitura de receita não foi testada com a API real neste protótipo. Os testes feitos foram sem chave.

## Limitações do protótipo

- O banco é um arquivo JSON, não um PostgreSQL.
- As sessões ficam em memória: ao reiniciar o servidor, é preciso entrar de novo.
- As senhas são protegidas com hash (scrypt), mas não há recuperação de senha nem cadastro de usuário na interface.
- A tela de transferência entre locais não foi incluída nesta versão.
- Não há HTTPS nem controle de tentativas de login.
