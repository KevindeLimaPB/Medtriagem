const API_BASE = 'https://triagemapi-production.up.railway.app';

document.addEventListener('DOMContentLoaded', async () => {
  const form = document.getElementById('form-perfil-medico') || document.querySelector('form');
  const inputNome = document.getElementById('perfil-nome');
  const inputMatricula = document.getElementById('perfil-matricula');
  const inputCrm = document.getElementById('perfil-crm');
  const inputEspecialidade = document.getElementById('perfil-especialidade');
  const inputCidade = document.getElementById('perfil-cidade');
  const inputEndereco = document.getElementById('perfil-rua');
  const inputPreco = document.getElementById('perfil-preco');
  const btnSalvar = document.getElementById('btn-salvar') || document.querySelector('button[type="submit"]');
  const aviso = document.getElementById('aviso-pagina') || criarElementoAviso();

  // Pega direto a matrícula do médico salva no navegador durante o login
  const matriculaMedico = localStorage.getItem('matriculaMedico') || '';

  if (!matriculaMedico) {
    mostrarAviso('Nenhuma sessão de médico encontrada. Faça o login novamente.', 'error');
    return;
  }

  // --- 1. BUSCAR OS DADOS DO PERFIL (GET) ---
  try {
    const resposta = await fetch(`${API_BASE}/med/perfil?matricula=${encodeURIComponent(matriculaMedico)}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      }
    });

    if (resposta.ok) {
      const dados = await resposta.json();
      
      if (inputNome) inputNome.value = dados.nome || '';
      if (inputMatricula) {
        inputMatricula.value = dados.matricula || matriculaMedico;
        inputMatricula.disabled = true; // Mantém a matrícula travada para identificação
      }
      if (inputCrm) inputCrm.value = dados.crm || '';
      if (inputEspecialidade) inputEspecialidade.value = dados.especialidade || '';
      if (inputCidade) inputCidade.value = dados.cidade || '';
      if (inputEndereco) inputEndereco.value = dados.rua || dados.endereco || '';
      if (inputPreco) inputPreco.value = dados.precoConsulta ?? dados.preco_consulta ?? '';
    } else {
      const detalhe = await resposta.text().catch(() => '');
      console.error('[perfil] Falha ao buscar perfil:', resposta.status, detalhe);
      mostrarAviso(
        resposta.status === 401 || resposta.status === 403
          ? 'Sua sessão expirou ou não tem permissão. Entre novamente.'
          : resposta.status === 404
            ? 'Perfil não encontrado para esta matrícula.'
            : `Não foi possível carregar o perfil (erro ${resposta.status}).`,
        'error'
      );
    }
  } catch (err) {
    console.error('[perfil] Erro de conexão ao buscar dados:', err);
    mostrarAviso('Erro de conexão ao buscar os dados do perfil.', 'error');
  }

  // --- 2. ENVIAR OS DADOS ATUALIZADOS PARA O JAVA (PUT) ---
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const dadosAtualizados = {
        nome: inputNome ? inputNome.value.trim() : '',
        matricula: matriculaMedico, // Usa a matrícula correta da sessão
        crm: inputCrm ? inputCrm.value.trim() : '',
        especialidade: inputEspecialidade ? inputEspecialidade.value.trim() : '',
        cidade: inputCidade ? inputCidade.value.trim() : '',
        rua: inputEndereco ? inputEndereco.value.trim() : '',
        precoConsulta: inputPreco ? parseFloat(inputPreco.value.replace(',', '.')) || 0 : 0
      };

      if (btnSalvar) {
        btnSalvar.disabled = true;
        btnSalvar.textContent = 'Salvando...';
      }

      try {
        const resposta = await fetch(`${API_BASE}/med/perfil`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(dadosAtualizados)
        });

        if (resposta.ok) {
          mostrarAviso('Alterações salvas com sucesso no sistema!', 'success');
        } else {
          const erroJson = await resposta.json().catch(() => ({}));
          mostrarAviso(erroJson.message || 'Erro ao atualizar os dados no servidor.', 'error');
        }
      } catch (err) {
        console.error('[perfil] Erro de conexão:', err);
        mostrarAviso('Não foi possível conectar ao servidor Java.', 'error');
      } finally {
        if (btnSalvar) {
          btnSalvar.disabled = false;
          btnSalvar.textContent = 'Salvar Alterações';
        }
      }
    });
  }

  function mostrarAviso(msg, tipo) {
    if (!aviso) return;
    const cores = {
      error:   { bg: '#FEE2E2', fg: '#B91C1C' },
      success: { bg: '#DCFCE7', fg: '#15803D' }
    };
    const c = cores[tipo] || cores.success;

    aviso.style.display = 'block';
    aviso.style.background = c.bg;
    aviso.style.color = c.fg;
    aviso.textContent = msg;
    aviso.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function criarElementoAviso() {
    const p = document.createElement('p');
    p.id = 'aviso-pagina';
    p.style.cssText = 'display:none; margin-top:16px; padding:12px 16px; border-radius:8px; font-size:14px;';
    (form || document.querySelector('main') || document.body).prepend(p);
    return p;
  }
});