const diasGrid = document.getElementById("dias-grid");
const horariosContainer = document.getElementById("horarios-container");
const resumoNome = document.getElementById("resumo-nome");
const resumoEspecialidade = document.getElementById("resumo-especialidade");
const resumoValor = document.getElementById("resumo-valor");
const resumoHorario = document.getElementById("resumo-horario");
const btnAvancar = document.getElementById("btn-avancar");
const avisoAgendamento = document.getElementById("aviso-agendamento");

let medico = null;
try {
    medico = JSON.parse(sessionStorage.getItem("medicoSelecionado") || "null");
} catch (error) {
    console.error("Não foi possível ler o médico selecionado:", error);
}
const medicoSelecionado = Boolean(medico && medico.nome);
medico = medico || { id: "", nome: "Nenhum médico selecionado", especialidade: "", preco: "" };

let diaSelecionado = null;
let horarioSelecionado = null;

function formatarPreco(valor) {
    if (valor === "" || valor == null) return "Consulte o valor";
    const preco = Number(valor);
    return Number.isFinite(preco)
        ? preco.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
        : "Consulte o valor";
}

function formatarData(data) {
    return new Intl.DateTimeFormat("pt-BR", {
        weekday: "long",
        day: "2-digit",
        month: "2-digit"
    }).format(data);
}

function renderizarDias() {
    const dias = [];
    const dataAtual = new Date();
    dataAtual.setHours(0, 0, 0, 0);
    dataAtual.setDate(dataAtual.getDate() + 1);

    for (let incremento = 0; dias.length < 7; incremento += 1) {
        const data = new Date(dataAtual);
        data.setDate(dataAtual.getDate() + incremento);
        dias.push(data);
    }

    diasGrid.replaceChildren();
    dias.forEach((data) => {
        const botao = document.createElement("button");
        botao.type = "button";
        botao.className = "dia-item";
        botao.setAttribute("aria-pressed", "false");
        const diaSemana = new Intl.DateTimeFormat("pt-BR", { weekday: "long" }).format(data);
        const diaMes = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(data);
        botao.innerHTML = `<span class="dia-semana">${diaSemana}</span><span class="dia-data">${diaMes}</span>`;
        botao.addEventListener("click", () => selecionarDia(data, botao));
        diasGrid.appendChild(botao);
    });
}

function selecionarDia(data, botaoSelecionado) {
    diaSelecionado = data;
    horarioSelecionado = null;
    document.querySelectorAll(".dia-item").forEach((botao) => {
        const selecionado = botao === botaoSelecionado;
        botao.classList.toggle("selected", selecionado);
        botao.setAttribute("aria-pressed", String(selecionado));
    });
    resumoHorario.textContent = "Nenhum";
    btnAvancar.disabled = true;
    avisoAgendamento.textContent = "";
    renderizarHorarios();
}

function renderizarHorarios() {
    horariosContainer.replaceChildren();
    const titulo = document.createElement("h3");
    titulo.className = "section-title";
    titulo.textContent = `Horários para ${formatarData(diaSelecionado)}`;

    const grade = document.createElement("div");
    grade.className = "horarios-grid";

    // Horários de exemplo; a disponibilidade real precisa ser consultada na API.
    const horarios = diaSelecionado.getDay() === 6
        ? ["09:00", "10:00", "11:00"]
        : ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00"];

    horarios.forEach((horario) => {
        const botao = document.createElement("button");
        botao.type = "button";
        botao.className = "btn-horario";
        botao.textContent = horario;
        botao.setAttribute("aria-pressed", "false");
        botao.addEventListener("click", () => selecionarHorario(horario, botao));
        grade.appendChild(botao);
    });

    horariosContainer.append(titulo, grade);
}

function selecionarHorario(horario, botaoSelecionado) {
    horarioSelecionado = horario;
    document.querySelectorAll(".btn-horario").forEach((botao) => {
        const selecionado = botao === botaoSelecionado;
        botao.classList.toggle("selected", selecionado);
        botao.setAttribute("aria-pressed", String(selecionado));
    });

    resumoHorario.textContent = `${formatarData(diaSelecionado)} às ${horario}`;
    btnAvancar.disabled = !medicoSelecionado;
    avisoAgendamento.textContent = "";
}

function salvarSelecao() {
    if (!medicoSelecionado) {
        avisoAgendamento.textContent = "Volte para a busca e selecione um médico antes de continuar.";
        return;
    }
    if (!diaSelecionado || !horarioSelecionado) return;

    const agendamentoPendente = {
        medico,
        data: `${diaSelecionado.getFullYear()}-${String(diaSelecionado.getMonth() + 1).padStart(2, "0")}-${String(diaSelecionado.getDate()).padStart(2, "0")}`,
        horario: horarioSelecionado,
        criadoEm: new Date().toISOString()
    };

    sessionStorage.setItem("agendamentoPendente", JSON.stringify(agendamentoPendente));
    window.location.href = "agendar_two.html";
}

resumoNome.textContent = medico.nome;
resumoEspecialidade.textContent = medico.especialidade;
resumoValor.textContent = formatarPreco(medico.preco);
if (!medicoSelecionado) {
    avisoAgendamento.textContent = "Selecione um médico na busca para iniciar o agendamento.";
}
btnAvancar.addEventListener("click", salvarSelecao);
renderizarDias();