(() => {
    const API_URL = "https://triagemapi-production.up.railway.app";
    const STORAGE_KEY = "agendamentoPendente";

    const elementos = {
        paciente: document.getElementById("revisao-paciente"),
        servico: document.getElementById("revisao-servico"),
        medico: document.getElementById("revisao-medico"),
        crm: document.getElementById("revisao-crm"),
        tipo: document.getElementById("revisao-tipo"),
        horario: document.getElementById("revisao-horario"),
        endereco: document.getElementById("revisao-endereco"),
        convenio: document.getElementById("revisao-convenio"),
        paraQuem: document.getElementById("revisao-para-quem"),
        motivo: document.getElementById("revisao-motivo"),
        condicao: document.getElementById("revisao-condicao"),
        valor: document.getElementById("revisao-valor"),
        botaoConfirmar: document.getElementById("btn-confirmar")
    };

    function lerAgendamento() {
        try {
            return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "null");
        } catch (erro) {
            console.error("Não foi possível carregar os dados da consulta:", erro);
            return null;
        }
    }

    const agendamento = lerAgendamento();
    if (!agendamento?.medico || !agendamento.data || !agendamento.horario) {
        window.location.replace("agendar_one.html");
        return;
    }

    const medico = agendamento.medico;
    const token = localStorage.getItem("token");
    const cpfPaciente = localStorage.getItem("userCpf") || "";
    let nomePacienteAtual = cpfPaciente || "Paciente logado";
    elementos.paciente.textContent = nomePacienteAtual;

    function formatarDataHora() {
        const data = new Date(`${agendamento.data}T00:00:00`);
        const dataFormatada = new Intl.DateTimeFormat("pt-BR", {
            weekday: "long",
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        }).format(data);
        return `${dataFormatada} às ${agendamento.horario}`;
    }

    function formatarPreco(valor) {
        if (valor === "" || valor == null || !Number.isFinite(Number(valor))) {
            return "Consulte o valor";
        }
        return Number(valor).toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL"
        });
    }

    function obterEndereco() {
        return [medico.rua, medico.bairro, medico.cidade].filter(Boolean).join(", ")
            || "Endereço não informado";
    }

    async function obterNomePaciente() {
        if (!cpfPaciente || !token) return nomePacienteAtual;

        try {
            const parametros = new URLSearchParams({ cpf: cpfPaciente });
            const resposta = await fetch(`${API_URL}/users/find?${parametros}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!resposta.ok) return nomePacienteAtual;

            const conteudo = (await resposta.text()).trim();
            try {
                const dados = JSON.parse(conteudo);
                if (typeof dados === "string") return dados || nomePacienteAtual;
                return dados.nome ?? dados.name ?? dados.nomeCompleto ?? dados.fullName ?? nomePacienteAtual;
            } catch {
                return conteudo || nomePacienteAtual;
            }
        } catch (erro) {
            console.error("Não foi possível carregar o nome do paciente:", erro);
            return nomePacienteAtual;
        }
    }

    function formatarTipoConsulta() {
        return agendamento.primeiraVez === "Não" ? "Retorno" : "Primeiro atendimento";
    }

    function preencherRevisao(nomePaciente) {
        elementos.paciente.textContent = nomePaciente;
        elementos.servico.textContent = "Consulta médica";
        elementos.medico.textContent = medico.nome || "Médico selecionado";
        elementos.crm.textContent = medico.crm || "Não informado";
        elementos.tipo.textContent = formatarTipoConsulta();
        elementos.horario.textContent = formatarDataHora();
        elementos.endereco.textContent = obterEndereco();
        elementos.convenio.textContent = agendamento.convenio || "Sem plano de saúde";
        elementos.paraQuem.textContent = agendamento.paraQuem || "Para mim";
        elementos.motivo.textContent = agendamento.motivo?.trim() || "Não informado";
        elementos.condicao.textContent = agendamento.condicoesSaude?.trim() || "Não informado";
        elementos.valor.textContent = formatarPreco(medico.preco);
    }

    function mostrarStatus(mensagem, erro = false) {
        let status = document.getElementById("status-agendamento");
        if (!status) {
            status = document.createElement("p");
            status.id = "status-agendamento";
            status.setAttribute("role", "status");
            status.setAttribute("aria-live", "polite");
            elementos.botaoConfirmar.closest(".action-buttons").after(status);
        }
        status.className = "helper-text";
        status.textContent = mensagem;
        status.style.color = erro ? "#B91C1C" : "";
    }

    function mapearEspecialidadeConsulta(valor) {
        if (!valor) return "CLINICA_GERAL";
        const normalizado = String(valor)
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .trim()
            .toUpperCase();

        const mapa = {
            "CARDIOLOGISTA": "CARDIOLOGIA",
            "CARDIOLOGIA": "CARDIOLOGIA",
            "CLINICO_GERAL": "CLINICA_GERAL",
            "CLINICA GERAL": "CLINICA_GERAL",
            "PEDIATRA": "PEDIATRA",
            "PEDIATRIA": "PEDIATRA",
            "DERMANTOLOGISTA": "DERMATOLOGIA",
            "DERMATOLOGISTA": "DERMATOLOGIA",
            "DERMATOLOGIA": "DERMATOLOGIA",
            "ORTOPEDISTA": "ORTOPEDIA",
            "ORTOPEDIA": "ORTOPEDIA",
            "NEUROLOGISTA": "NEUROLOGIA",
            "NEUROLOGIA": "NEUROLOGIA",
            "GINECOLOGISTA": "GINECOLOGIA",
            "GINECOLOGIA": "GINECOLOGIA",
            "OFTALMOLOGISTA": "OFTALMOLOGIA",
            "OFTALMOLOGIA": "OFTALMOLOGIA",
            "PSIQUIATRA": "PSIQUIATRIA",
            "PSIQUIATRIA": "PSIQUIATRIA",
            "ENDOCRINOLOGISTA": "ENDOCRINOLOGIA",
            "ENDOCRINOLOGIA": "ENDOCRINOLOGIA"
        };

        return mapa[normalizado] || "CLINICA_GERAL";
    }

    function criarPayload() {
        const pacienteId = parseInt(localStorage.getItem("userId") || "1", 10);
        const dataHoraIso = `${agendamento.data}T${agendamento.horario}:00`;

        return {
            especialidadeConsulta: mapearEspecialidadeConsulta(medico.especialidade || agendamento.especialidade),
            medico: medico.nome || medico.crm || "Médico selecionado",
            paciente: pacienteId,
            data_hora: dataHoraIso
        };
    }

    async function confirmarAgendamento() {
        if (!token) {
            mostrarStatus("Sua sessão expirou. Entre novamente para confirmar a consulta.", true);
            return;
        }

        elementos.botaoConfirmar.disabled = true;
        elementos.botaoConfirmar.textContent = "Processando...";

        try {
            const resposta = await fetch(`${API_URL}/consulta`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(criarPayload())
            });

            if (!resposta.ok) {
                const detalhe = await resposta.text().catch(() => "");
                throw new Error(detalhe || `Falha ao agendar (HTTP ${resposta.status}).`);
            }

            sessionStorage.removeItem(STORAGE_KEY);
            sessionStorage.removeItem("medicoSelecionado");
            alert("Consulta agendada com sucesso!");
            window.location.href = "lados.html";
        } catch (erro) {
            console.error("Erro ao confirmar o agendamento:", erro);
            mostrarStatus(erro.message || "Não foi possível conectar ao servidor. Tente novamente.", true);
            elementos.botaoConfirmar.disabled = false;
            elementos.botaoConfirmar.textContent = "Confirmar agendamento";
        }
    }

    elementos.botaoConfirmar.addEventListener("click", confirmarAgendamento);
    obterNomePaciente().then((nome) => {
        nomePacienteAtual = String(nome || nomePacienteAtual).trim();
        preencherRevisao(nomePacienteAtual);
    });
})();