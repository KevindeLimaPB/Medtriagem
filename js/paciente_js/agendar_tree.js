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
            console.error("Erro ao carregar dados da consulta:", erro);
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
    const pacienteCpf = localStorage.getItem("userCpf");

    if (!pacienteCpf || !token) {
        alert("Sessão expirada ou CPF não encontrado. Faça login novamente.");
        window.location.href = "../index.html";
        return;
    }

    elementos.paciente.textContent = pacienteCpf;

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
        if (!valor || !Number.isFinite(Number(valor))) return "Consulte o valor";
        return Number(valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    }

    function obterEndereco() {
        return [medico.rua, medico.bairro, medico.cidade].filter(Boolean).join(", ") || "Endereço não informado";
    }

    function preencherRevisao() {
        elementos.servico.textContent = "Consulta médica";
        elementos.medico.textContent = medico.nome || "Médico selecionado";
        elementos.crm.textContent = medico.crm || "Não informado";
        elementos.tipo.textContent = agendamento.primeiraVez === "Não" ? "Retorno" : "Primeiro atendimento";
        elementos.horario.textContent = formatarDataHora();
        elementos.endereco.textContent = obterEndereco();
        elementos.convenio.textContent = agendamento.convenio && agendamento.convenio !== "NOT_FOUND" ? agendamento.convenio : "Sem plano de saúde";
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
            elementos.botaoConfirmar.closest(".action-buttons").after(status);
        }
        status.className = "helper-text";
        status.textContent = mensagem;
        status.style.color = erro ? "#B91C1C" : "green";
    }

    function mapearEspecialidadeConsulta(valor) {
        if (!valor) return "CLINICA_GERAL";
        const normalizado = String(valor).normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toUpperCase();

        const mapa = {
            "CARDIOLOGISTA": "CARDIOLOGIA", "CARDIOLOGIA": "CARDIOLOGIA",
            "CLINICO_GERAL": "CLINICA_GERAL", "CLINICA GERAL": "CLINICA_GERAL",
            "PEDIATRA": "PEDIATRA", "PEDIATRIA": "PEDIATRA",
            "DERMATOLOGISTA": "DERMATOLOGIA", "DERMATOLOGIA": "DERMATOLOGIA",
            "ORTOPEDISTA": "ORTOPEDIA", "ORTOPEDIA": "ORTOPEDIA",
            "NEUROLOGISTA": "NEUROLOGIA", "NEUROLOGIA": "NEUROLOGIA",
            "GINECOLOGISTA": "GINECOLOGIA", "GINECOLOGIA": "GINECOLOGIA",
            "OFTALMOLOGISTA": "OFTALMOLOGIA", "OFTALMOLOGIA": "OFTALMOLOGIA",
            "PSIQUIATRA": "PSIQUIATRIA", "PSIQUIATRIA": "PSIQUIATRIA",
            "ENDOCRINOLOGISTA": "ENDOCRINOLOGIA", "ENDOCRINOLOGIA": "ENDOCRINOLOGIA"
        };
        return mapa[normalizado] || "CLINICA_GERAL";
    }

    async function obterPacienteId() {
        const cpfNormalizado = pacienteCpf.replace(/\D/g, "");
        const idSalvo = Number(localStorage.getItem("userId"));
        if (localStorage.getItem("userIdTipo") === "paciente"
            && localStorage.getItem("userIdCpf") === cpfNormalizado
            && Number.isInteger(idSalvo) && idSalvo > 0) {
            return idSalvo;
        }

        const resposta = await fetch(
            `${API_URL}/pac/buscar-por-cpf/${encodeURIComponent(pacienteCpf)}`,
            {
                headers: { Authorization: `Bearer ${token}` },
                cache: "no-store"
            }
        );

        if (!resposta.ok) {
            const detalhe = await resposta.text().catch(() => "");
            throw new Error(detalhe || `Não foi possível buscar o ID do paciente (HTTP ${resposta.status}).`);
        }

        const id = Number((await resposta.text()).trim());
        if (!Number.isInteger(id) || id <= 0) {
            throw new Error("A API retornou um ID de paciente inválido.");
        }

        localStorage.setItem("userId", String(id));
        localStorage.setItem("userIdTipo", "paciente");
        localStorage.setItem("userIdCpf", cpfNormalizado);
        return id;
    }

   async function confirmarAgendamento() {
    elementos.botaoConfirmar.disabled = true;
    elementos.botaoConfirmar.textContent = "Processando...";

    try {
        const convenio = agendamento.convenio && agendamento.convenio !== "NOT_FOUND"
            ? agendamento.convenio
            : null;

        const payload = {
            especialidadeConsulta: mapearEspecialidadeConsulta(medico.especialidade || agendamento.especialidade),
            planosSaude: convenio,
            medico: medico.crm || medico.nome,
            pacienteCpf: pacienteCpf.replace(/\D/g, ""),
            data_hora: `${agendamento.data}T${agendamento.horario}:00`
        };

        console.log("Enviando payload de agendamento:", payload);
        const resposta = await fetch(`${API_URL}/consulta`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        if (!resposta.ok) {
            const erroTexto = await resposta.text().catch(() => "");
            console.error("API recusou o agendamento:", {
                status: resposta.status,
                detalhe: erroTexto,
                payload
            });

            let mensagem = `Erro ao agendar (HTTP ${resposta.status}).`;
            try {
                mensagem = JSON.parse(erroTexto).response || mensagem;
            } catch (_) {
                if (erroTexto) mensagem = erroTexto;
            }
            throw new Error(mensagem);
        }

        sessionStorage.removeItem(STORAGE_KEY);
        sessionStorage.removeItem("medicoSelecionado");
        alert("Consulta agendada com sucesso!");
        window.location.href = "../paciente.html";

    } catch (erro) {
        console.error("Erro ao confirmar agendamento:", erro);
        mostrarStatus(erro.message || "Erro ao conectar com o servidor.", true);
        elementos.botaoConfirmar.disabled = false;
        elementos.botaoConfirmar.textContent = "Confirmar agendamento";
    }
}

    elementos.botaoConfirmar.addEventListener("click", confirmarAgendamento);
    preencherRevisao();
})();