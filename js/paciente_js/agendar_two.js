(() => {
  const STORAGE_KEY = "agendamentoPendente";
  const elementos = {
    nome: document.getElementById("resumo-nome"),
    especialidade: document.getElementById("resumo-especialidade"),
    tipo: document.getElementById("resumo-tipo"),
    horario: document.getElementById("resumo-horario"),
    valor: document.getElementById("resumo-valor"),
    convenio: document.getElementById("etapa2-convenio"),
    formulario: document.getElementById("form-etapa2"),
    botaoAvancar: document.getElementById("btn-avancar-etapa2"),
    condicoes: document.getElementById("etapa2-condicao"),
    motivo: document.getElementById("etapa2-motivo"),
    radios: document.querySelectorAll('input[name="primeira-vez"]'),
    cards: document.querySelectorAll("#card-primeira-sim, #card-primeira-nao")
  };

  function lerAgendamento() {
    try {
      return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "null");
    } catch (erro) {
      console.error("Não foi possível ler os dados da consulta:", erro);
      return null;
    }
  }

  const agendamento = lerAgendamento();
  if (!agendamento?.medico || !agendamento.data || !agendamento.horario) {
    window.location.replace("agendar_one.html");
    return;
  }

  function formatarData(dataIso) {
    const data = new Date(`${dataIso}T00:00:00`);
    return new Intl.DateTimeFormat("pt-BR", {
      weekday: "long",
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    }).format(data);
  }

  function formatarPreco(preco) {
    if (preco === "" || preco == null || !Number.isFinite(Number(preco))) {
      return "Consulte o valor";
    }
    return Number(preco).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    });
  }

  function atualizarTipo() {
    const selecionado = document.querySelector('input[name="primeira-vez"]:checked');
    if (!selecionado) return;

    elementos.cards.forEach((card) => {
      card.classList.toggle(
        "selected",
        card.querySelector('input[name="primeira-vez"]') === selecionado
      );
    });
    elementos.tipo.textContent = selecionado.value === "Sim"
      ? "Primeiro atendimento"
      : "Retorno";
  }

  function renderizarResumo() {
    elementos.nome.textContent = agendamento.medico.nome || "Médico selecionado";
    elementos.especialidade.textContent = agendamento.medico.especialidade || "";
    elementos.horario.textContent = `${formatarData(agendamento.data)} às ${agendamento.horario}`;
    elementos.valor.textContent = formatarPreco(agendamento.medico.preco);
    atualizarTipo();
  }

  function restaurarFormulario() {
    if (agendamento.convenio) elementos.convenio.value = agendamento.convenio;
    elementos.condicoes.value = agendamento.condicoesSaude || "";
    elementos.motivo.value = agendamento.motivo || "";

    if (agendamento.primeiraVez) {
      const radioSalvo = [...elementos.radios]
        .find((radio) => radio.value === agendamento.primeiraVez);
      if (radioSalvo) radioSalvo.checked = true;
    }
  }

  function salvarEAvancar(evento) {
    evento.preventDefault();
    if (!elementos.formulario.reportValidity()) return;

    const dadosAtualizados = {
      ...agendamento,
      convenio: elementos.convenio.value,
      primeiraVez: document.querySelector('input[name="primeira-vez"]:checked')?.value || "Sim",
      condicoesSaude: elementos.condicoes.value.trim(),
      motivo: elementos.motivo.value.trim()
    };

    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(dadosAtualizados));
    elementos.botaoAvancar.disabled = true;
    elementos.botaoAvancar.textContent = "Avançando...";
    window.location.href = "agendar_tree.html";
  }

  elementos.radios.forEach((radio) => radio.addEventListener("change", atualizarTipo));
  elementos.formulario.addEventListener("submit", salvarEAvancar);
  elementos.botaoAvancar.addEventListener("click", salvarEAvancar);

  restaurarFormulario();
  renderizarResumo();
})();