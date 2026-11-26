const API_BASE = 'https://triagemapi-production.up.railway.app';

// Mesmo valor do cooldown do back-end (app.reset.cooldown-seconds)
const COOLDOWN_SEGUNDOS = 60;

const CHAVE_EMAIL = '@medtriage/reset_email';
const CHAVE_INICIO = '@medtriage/reset_started_at';
const CHAVE_TOKEN = '@medtriage/reset_token';

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('codigo-form');
  const inputCodigo = document.getElementById('input-codigo');
  const btnVerificar = document.getElementById('btn-verificar');
  const btnReenviar = document.getElementById('btn-reenviar');
  const textoEmail = document.getElementById('email-destino');
  const linkOutroEmail = document.getElementById('link-outro-email');
  const aviso = document.getElementById('aviso-codigo');

  if (!form) return;

  // Sem e-mail guardado = a pessoa não passou pelo passo 1
  const email = sessionStorage.getItem(CHAVE_EMAIL);
  if (!email) {
    window.location.href = '../password.html';
    return;
  }

  textoEmail.textContent = mascararEmail(email);
  setTimeout(() => inputCodigo.focus(), 100);

  // "Usar outro e-mail" limpa o que foi guardado, quando o link existir
  if (linkOutroEmail) {
    linkOutroEmail.addEventListener('click', () => limparSessao());
  }

  // Só aceita números, até 6 (vale também para colar o código)
  inputCodigo.addEventListener('input', () => {
    inputCodigo.value = inputCodigo.value.replace(/\D/g, '').slice(0, 6);
  });

  // ---------- Contagem para reenviar ----------
  let timer = null;

  function atualizarBotaoReenviar(restante) {
    if (restante > 0) {
      btnReenviar.disabled = true;
      btnReenviar.innerHTML = `Reenviar em <span id="contador-reenvio">${restante}</span>s`;
    } else {
      btnReenviar.disabled = false;
      btnReenviar.textContent = 'Reenviar código';
    }
  }

  function iniciarContagem(segundos) {
    clearInterval(timer);
    let restante = Math.max(0, Math.ceil(segundos));
    atualizarBotaoReenviar(restante);
    if (restante <= 0) return;

    timer = setInterval(() => {
      restante -= 1;
      atualizarBotaoReenviar(restante);
      if (restante <= 0) clearInterval(timer);
    }, 1000);
  }

  // Quando chegou do passo 1, o tempo já começou a correr
  const inicio = Number(sessionStorage.getItem(CHAVE_INICIO)) || 0;
  const decorrido = inicio ? (Date.now() - inicio) / 1000 : COOLDOWN_SEGUNDOS;
  iniciarContagem(COOLDOWN_SEGUNDOS - decorrido);

  // ---------- Reenviar código ----------
  btnReenviar.addEventListener('click', async () => {
    btnReenviar.disabled = true;
    btnReenviar.textContent = 'Enviando…';

    try {
      const resp = await fetch(`${API_BASE}/auth/recuperar-senha`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      if (resp.ok) {
        sessionStorage.setItem(CHAVE_INICIO, String(Date.now()));
        iniciarContagem(COOLDOWN_SEGUNDOS);
        inputCodigo.value = '';
        inputCodigo.focus();
        mostrarAviso(
          'Se o e-mail estiver cadastrado, enviamos um novo código. Verifique também o spam.',
          'info'
        );
        return;
      }

      const dados = await resp.json().catch(() => ({}));
      mostrarAviso(dados.message || 'Não foi possível reenviar o código. Tente novamente.', 'error');
      atualizarBotaoReenviar(0);
    } catch (err) {
      console.error('[verificar_codigo] erro de conexão:', err);
      mostrarAviso('Erro de conexão. Verifique sua internet e tente novamente.', 'error');
      atualizarBotaoReenviar(0);
    }
  });

  // ---------- Verificar código ----------
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const codigo = inputCodigo.value.replace(/\D/g, '').trim();

    if (codigo.length === 0) {
      return mostrarAviso('Digite o código que você recebeu por e-mail.', 'error');
    }
    if (codigo.length !== 6) {
      return mostrarAviso('O código tem 6 números. Confira e tente de novo.', 'error');
    }

    btnVerificar.disabled = true;
    const textoOriginal = btnVerificar.textContent;
    btnVerificar.textContent = 'Verificando…';

    try {
      const resp = await fetch(`${API_BASE}/auth/validar-codigo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          codigo
        })
      });

      const dados = await resp.json().catch(() => ({}));
      console.log('[validar-codigo]', resp.status, dados);

      if (resp.ok) {
        const resetToken = dados.resetToken;

        if (!resetToken) {
          return mostrarAviso('A API não retornou o resetToken.', 'error');
        }

        sessionStorage.setItem(CHAVE_TOKEN, resetToken);
        sessionStorage.removeItem(CHAVE_EMAIL);
        sessionStorage.removeItem(CHAVE_INICIO);
        window.location.assign('redefinir_senha.html');
        return;
      }

      if (resp.status === 400 || resp.status === 429) {
        mostrarAviso(dados.message || dados.detail || 'Código inválido ou expirado. Tente novamente.', 'error');
        inputCodigo.select();
        return;
      }

      mostrarAviso(dados.message || 'Não foi possível verificar o código.', 'error');
    } catch (err) {
      console.error('[verificar_codigo] erro de conexão:', err);
      mostrarAviso('Erro de conexão com a API. Verifique sua internet.', 'error');
    } finally {
      btnVerificar.disabled = false;
      btnVerificar.textContent = textoOriginal;
    }
  });

  // ---------- utilitários ----------
  function mostrarAviso(msg, tipo) {
    const cores = {
      error:   { bg: '#FEE2E2', fg: '#B91C1C' },
      success: { bg: '#DCFCE7', fg: '#15803D' },
      info:    { bg: '#E0F2FE', fg: '#075985' }
    };
    const c = cores[tipo] || cores.info;

    aviso.style.display = '';
    aviso.style.background = c.bg;
    aviso.style.color = c.fg;
    aviso.textContent = msg;
    aviso.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
});

// jo***@gmail.com
function mascararEmail(email) {
  const partes = email.split('@');
  if (partes.length !== 2 || !partes[0]) return email;
  const [usuario, dominio] = partes;
  return `${usuario.slice(0, 2)}${'*'.repeat(Math.min(Math.max(usuario.length - 2, 1), 4))}@${dominio}`;
}

function limparSessao() {
  sessionStorage.removeItem(CHAVE_EMAIL);
  sessionStorage.removeItem(CHAVE_INICIO);
  sessionStorage.removeItem(CHAVE_TOKEN);
}