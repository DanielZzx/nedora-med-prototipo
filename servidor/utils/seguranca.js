// Funções de segurança: senhas com hash, tokens de sessão e ids únicos.

const crypto = require('crypto'); // módulo nativo do Node para criptografia e números aleatórios

// Gera um sal aleatório (texto único que é misturado à senha)
function gerarSal() {
  return crypto.randomBytes(16).toString('hex'); // 16 bytes aleatórios em hexadecimal
}

// Transforma a senha em um hash usando o sal. Nunca guardamos a senha pura.
function gerarHash(senha, sal) {
  return crypto.scryptSync(senha, sal, 64).toString('hex'); // scrypt gera 64 bytes em hexadecimal
}

// Confere se a senha digitada gera o mesmo hash guardado
function conferirSenha(senha, sal, hashGuardado) {
  const hashDigitado = Buffer.from(gerarHash(senha, sal), 'hex'); // hash da senha digitada
  const hashOriginal = Buffer.from(hashGuardado, 'hex'); // hash que está no banco
  if (hashDigitado.length !== hashOriginal.length) return false; // tamanhos diferentes: não bate
  return crypto.timingSafeEqual(hashDigitado, hashOriginal); // compara sem revelar diferenças pelo tempo
}

// Cria um token de sessão aleatório
function gerarToken() {
  return crypto.randomBytes(24).toString('hex'); // 24 bytes aleatórios em hexadecimal
}

// Cria um id único para cada registro
function gerarId() {
  return crypto.randomUUID(); // id no formato UUID
}

module.exports = { gerarSal, gerarHash, conferirSenha, gerarToken, gerarId }; // exporta as funções
