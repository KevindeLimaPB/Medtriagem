const API_URL = 'https://triagemapi-production.up.railway.app/users';
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Regras do formulário. Devolve um objeto { campo: 'mensagem' } só com os campos que têm erro,
 * na mesma ordem em que aparecem na tela.
 */
function validarCampos({ nome, cpf, senha, repetirSenha, email, aceitouTermos }) {
  const erros = {};

  if (!nome) {
    erros.nome = 'Informe seu nome completo.';
  } else if (nome.split(/\s+/).filter(Boolean).length < 2) {
    erros.nome = 'Informe nome e sobrenome.';
  }

  const cpfNumeros = cpf.replace(/\D/g, '');
  if (!cpfNumeros) {
    erros.cpf = 'Informe o CPF.';
  } else if (cpfNumeros.length !== 11) {
    erros.cpf = 'CPF incompleto. Digite os 11 números.';
  }

  if (!senha) {
    erros.senha = 'Crie uma senha.';
  } else if (senha.length < 6) {
    erros.senha = 'A senha deve ter pelo menos 6 caracteres.';
  }

  if (!repetirSenha) {
    erros.repetirSenha = 'Repita a senha.';
  } else if (senha !== repetirSenha) {
    erros.repetirSenha = 'As senhas não coincidem. Digite novamente.';
  }

  if (!email) {
    erros.email = 'Informe o e-mail. Ele é usado para recuperar a senha.';
  } else if (!EMAIL_REGEX.test(email)) {
    erros.email = 'E-mail inválido. Ex: nome@exemplo.com';
  }

  if (!aceitouTermos) {
    erros.termos = 'Você precisa aceitar os termos de uso para continuar.';
  }

  return erros;
}

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('cadastro-form');
  if (!form) {
    console.error('[cadastro] formulário #cadastro-form não encontrado na página.');
    return;
  }

  const campos = {
    nome: document.getElementById('nome-cadastro'),
    cpf: document.getElementById('input-cadastro-id'),
    senha: document.getElementById('nova-senha'),
    repetirSenha: document.getElementById('repetir-senha'),
    email: document.getElementById('email-cadastro')
  };

  // O checkbox dos termos é injetado pelo termos-medtriage.js, então é procurado na hora do envio
  const acharCheckTermos = () =>
    document.getElementById('termos') || form.querySelector('input[type="checkbox"]');

  // ---------- Estilo das mensagens de erro ----------
  const estilo = document.createElement('style');
  estilo.textContent = `
    .field-error { display: block; color: #c62828; font-size: 0.8rem; margin-top: 4px; }
    .input-invalid { border-color: #c62828 !important; }
  `;
  document.head.appendChild(estilo);

  // ---------- 1. Máscara de CPF (000.000.000-00) ----------
  if (campos.cpf) {
    campos.cpf.addEventListener('input', (e) => {
      let valor = e.target.value.replace(/\D/g, '');
      if (valor.length > 11) valor = valor.slice(0, 11);

      valor = valor
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2');

      e.target.value = valor;
    });
  }

  // ---------- 2. Mostrar / ocultar senha ----------
  document.querySelectorAll('.toggle-password').forEach((btn) => {
    btn.addEventListener('click', () => {
      const input = btn.previousElementSibling;
      if (!input) return;

      const isPassword = input.type === 'password';
      input.type = isPassword ? 'text' : 'password';

      btn.innerHTML = isPassword
        ? `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`
        : `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
    });
  });

  // ---------- Erro embaixo de cada campo ----------
  function elementoDoCampo(nomeCampo) {
    return nomeCampo === 'termos' ? acharCheckTermos() : campos[nomeCampo];
  }

  function mostrarErro(nomeCampo, mensagem) {
    const el = elementoDoCampo(nomeCampo);
    if (!el) {
      alert(mensagem); // se o campo não existir na página, ao menos a pessoa vê o motivo
      return;
    }

    const grupo = el.closest('.input-group') || el.closest('label') || el.parentElement;
    let span = grupo.querySelector(`.field-error[data-campo="${nomeCampo}"]`);
    if (!span) {
      span = document.createElement('span');
      span.className = 'field-error';
      span.dataset.campo = nomeCampo;
      span.setAttribute('role', 'alert');
      grupo.appendChild(span);
    }

    span.textContent = mensagem;
    if (nomeCampo !== 'termos') el.classList.add('input-invalid');
  }

  function limparErros() {
    form.querySelectorAll('.field-error').forEach((s) => s.remove());
    form.querySelectorAll('.input-invalid').forEach((i) => i.classList.remove('input-invalid'));
  }

  function limparErroDoCampo(nomeCampo) {
    const el = elementoDoCampo(nomeCampo);
    if (!el) return;
    const grupo = el.closest('.input-group') || el.closest('label') || el.parentElement;
    const span = grupo.querySelector(`.field-error[data-campo="${nomeCampo}"]`);
    if (span) span.remove();
    el.classList.remove('input-invalid');
  }

  // O erro some assim que a pessoa começa a corrigir
  Object.keys(campos).forEach((nomeCampo) => {
    if (campos[nomeCampo]) {
      campos[nomeCampo].addEventListener('input', () => limparErroDoCampo(nomeCampo));
    }
  });
  form.addEventListener('change', (e) => {
    if (e.target && e.target.type === 'checkbox') limparErroDoCampo('termos');
  });

  // ---------- Erros que vêm do servidor, no campo certo ----------
  function campoDoErroDoServidor(mensagem) {
    const m = mensagem.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    if (m.includes('cpf')) return 'cpf';
    if (m.includes('e-mail') || m.includes('email') || m.includes('login')) return 'email';
    return null;
  }

  // ---------- 3. Envio ----------
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    limparErros();

    const checkTermos = acharCheckTermos();

    const valores = {
      nome: campos.nome.value.trim(),
      cpf: campos.cpf.value.trim(),
      senha: campos.senha.value,
      repetirSenha: campos.repetirSenha.value,
      email: campos.email.value.trim(),
      aceitouTermos: checkTermos ? checkTermos.checked : false
    };

    const erros = validarCampos(valores);
    const camposComErro = Object.keys(erros);

    if (camposComErro.length > 0) {
      camposComErro.forEach((nomeCampo) => mostrarErro(nomeCampo, erros[nomeCampo]));
      const primeiro = elementoDoCampo(camposComErro[0]);
      if (primeiro) primeiro.focus();
      return;
    }

    // Formato que o back-end espera. "login" continua igual ao que já funcionava;
    // "email" vai separado para a recuperação de senha.
    const dadosUsuario = {
      nome: valores.nome,
      cpf: valores.cpf, // "000.000.000-00"
      senha: valores.senha,
      login: valores.email,
      email: valores.email.toLowerCase(),
      role: 'CLIENTE'
    };

    const botao = form.querySelector('button[type="submit"]');
    if (botao) botao.disabled = true;

    try {
      const resposta = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dadosUsuario)
      });

      if (resposta.ok) {
        window.location.href = 'index.html';
        return;
      }

      // Lê o que o servidor respondeu (e deixa no console para facilitar a depuração)
      const texto = await resposta.text().catch(() => '');
      console.error('[cadastro] servidor respondeu', resposta.status, texto);

      let mensagem = '';
      try {
        const dados = JSON.parse(texto);
        mensagem = dados.message || dados.mensagem || dados.error || '';
      } catch {
        mensagem = texto && texto.length < 200 ? texto : '';
      }

      const campo = mensagem ? campoDoErroDoServidor(mensagem) : null;
      if (campo === 'cpf') {
        mostrarErro('cpf', 'Já existe um usuário cadastrado com este CPF.');
        campos.cpf.focus();
      } else if (campo === 'email') {
        mostrarErro('email', 'Este e-mail já está cadastrado.');
        campos.email.focus();
      } else if (mensagem) {
        alert(mensagem);
      } else if (resposta.status === 403) {
        alert('O servidor recusou o cadastro (403). Verifique a liberação da rota /users no back-end.');
      } else if (resposta.status >= 500) {
        alert('Erro no servidor ao criar o acesso. Tente novamente em instantes.');
      } else {
        alert(`Erro ao criar acesso (Código ${resposta.status}).`);
      }
    } catch (erro) {
      console.error('[cadastro] erro de conexão:', erro);
      alert('Não foi possível conectar ao servidor. Verifique sua conexão.');
    } finally {
      if (botao) botao.disabled = false;
    }
  });
});
