const API_BASE = 'https://triagemapi-production.up.railway.app';
const CHAVE_TOKEN = '@medtriage/reset_token';

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('form-redefinir');
  const novaSenha = document.getElementById('nova-senha');
  const confirmarSenha = document.getElementById('confirmar-senha');
  const botaoSalvar = document.getElementById('btn-salvar');
  const aviso = document.getElementById('aviso-redefinir');

  if (!form) return;

  const resetToken = sessionStorage.getItem(CHAVE_TOKEN);
  if (!resetToken) {
    window.location.href = '../password.html';
    return;
  }

  setTimeout(() => novaSenha.focus(), 100);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const senha = novaSenha.value;
    const confirmacao = confirmarSenha.value;

    if (senha.length < 6) {
      mostrarAviso('A nova senha deve ter pelo menos 6 caracteres.', 'error');
      novaSenha.focus();
      return;
    }

    if (senha !== confirmacao) {
      mostrarAviso('As duas senhas não são iguais.', 'error');
      confirmarSenha.select();
      return;
    }

    botaoSalvar.disabled = true;
    const textoOriginal = botaoSalvar.textContent;
    botaoSalvar.textContent = 'Salvando…';

    try {
      const resposta = await fetch(`${API_BASE}/auth/redefinir-senha`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resetToken, novaSenha: senha })
      });

      if (resposta.ok) {
        sessionStorage.removeItem(CHAVE_TOKEN);
        mostrarAviso('Senha redefinida com sucesso!', 'success');

        setTimeout(() => {
          window.location.href = '../index.html';
        }, 1000);
        return;
      }

      const dados = await resposta.json().catch(() => ({}));

      if (resposta.status === 400 || resposta.status === 410) {
        mostrarAviso(dados.message || 'O código expirou. Solicite outro código.', 'error');
        return;
      }

      mostrarAviso(dados.message || 'Não foi possível redefinir a senha. Tente novamente.', 'error');
    } catch (erro) {
      console.error('[redefinir_senha] erro de conexão:', erro);
      mostrarAviso('Erro de conexão. Verifique sua internet e tente novamente.', 'error');
    } finally {
      botaoSalvar.disabled = false;
      botaoSalvar.textContent = textoOriginal;
    }
  });

  document.querySelectorAll('.toggle-password').forEach((botao) => {
    botao.addEventListener('click', () => {
      const campo = botao.parentElement.querySelector('input');
      campo.type = campo.type === 'password' ? 'text' : 'password';
      campo.focus();
    });
  });

  function mostrarAviso(mensagem, tipo) {
    const cores = {
      error: { bg: '#FEE2E2', fg: '#B91C1C' },
      success: { bg: '#DCFCE7', fg: '#15803D' },
      info: { bg: '#E0F2FE', fg: '#075985' }
    };
    const coresAviso = cores[tipo] || cores.info;

    aviso.style.display = '';
    aviso.style.background = coresAviso.bg;
    aviso.style.color = coresAviso.fg;
    aviso.textContent = mensagem;
  }
});
