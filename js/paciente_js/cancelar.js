(() => {
    const API_URL = "https://triagemapi-production.up.railway.app";
    const token = localStorage.getItem("token");
    const cpf = localStorage.getItem("userCpf");
    const consultaId = new URLSearchParams(window.location.search).get("id");
    const campos = {
        data: document.getElementById("cancel-data"),
        medico: document.getElementById("cancel-medico"),
        servico: document.getElementById("cancel-servico"),
        local: document.getElementById("cancel-local"),
        botao: document.getElementById("btn-confirmar-cancelamento"),
        aviso: document.getElementById("aviso-pagina")
    };
    let consultaSelecionadaId = null;

    campos.botao.addEventListener("click", () => confirmarCancelamento(consultaSelecionadaId));
    if (consultaId) {
        const urlDetalhes = `detalhesConsulta.html?id=${encodeURIComponent(consultaId)}`;
        document.getElementById("btn-voltar")?.setAttribute("href", urlDetalhes);
        document.getElementById("link-voltar-detalhes")?.setAttribute("href", urlDetalhes);
    }

    function lerConsultaSalva() {
        try {
            return JSON.parse(sessionStorage.getItem("consultaSelecionada") || "null");
        } catch (erro) {
            console.error("Não foi possível ler a consulta selecionada:", erro);
            return null;
        }
    }

    function salvarConsultaCancelada(consulta) {
        if (!consulta?.id) return;
        try {
            const canceladas = JSON.parse(localStorage.getItem("medtriageConsultasCanceladas") || "{}");
            canceladas[String(consulta.id)] = {
                ...consulta,
                status: "Cancelada",
                canceladaEm: new Date().toISOString()
            };
            localStorage.setItem("medtriageConsultasCanceladas", JSON.stringify(canceladas));
        } catch (erro) {
            console.error("Não foi possível salvar o status local da consulta:", erro);
        }
    }

    function salvarIdPaciente(consulta) {
        const idPaciente = consulta?.paciente?.id || consulta?.pacienteId || consulta?.idPaciente;
        if (idPaciente != null) {
            localStorage.setItem("userId", String(idPaciente));
            localStorage.setItem("userIdTipo", "paciente");
            localStorage.setItem("userIdCpf", (cpf || "").replace(/\D/g, ""));
        }
    }

    function texto(valor, padrao = "Não informado") {
        if (valor == null || valor === "") return padrao;
        if (typeof valor === "object") return valor.nome || valor.name || valor.descricao || padrao;
        return String(valor);
    }

    function formatarData(valor) {
        if (!valor) return "Data e horário não informados";
        const data = new Date(valor);
        if (Number.isNaN(data.getTime())) return String(valor);
        return new Intl.DateTimeFormat("pt-BR", {
            weekday: "long", day: "2-digit", month: "long", year: "numeric",
            hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo"
        }).format(data);
    }

    function localMedico(medico) {
        if (!medico || typeof medico !== "object") return texto(medico, "Local não informado");
        const endereco = medico.endereco || medico.enderecoCompleto;
        if (typeof endereco === "string" && endereco.trim()) return endereco;
        const partes = [medico.rua || medico.logradouro, medico.numero, medico.bairro, medico.cidade, medico.estado]
            .filter(Boolean);
        return partes.length ? partes.join(", ") : "Local não informado";
    }

    function mostrarAviso(mensagem, erro = false) {
        campos.aviso.textContent = mensagem;
        campos.aviso.style.display = "block";
        campos.aviso.style.color = erro ? "#B91C1C" : "";
    }

    function preencher(consulta) {
        salvarIdPaciente(consulta);
        const medico = consulta.medico || consulta.profissional;
        const nomeMedico = medico && typeof medico === "object"
            ? medico.nome || medico.name || medico.nomeCompleto || medico.crm
            : medico;
        campos.data.textContent = formatarData(consulta.dia_hora || consulta.data_hora || consulta.dataHora || consulta.data);
        campos.medico.textContent = texto(nomeMedico, "Especialista não informado");
        campos.servico.textContent = texto(consulta.servico || consulta.especialidade || consulta.especialidadeConsulta, "Consulta médica");
        campos.local.textContent = localMedico(medico);
        consultaSelecionadaId = consulta.id || null;
        campos.botao.disabled = !consultaSelecionadaId;
        if (!consultaSelecionadaId) mostrarAviso("Não foi possível identificar esta consulta para cancelar.", true);
    }

    async function carregarConsulta() {
        const salva = lerConsultaSalva();
        if (!token || !cpf) {
            window.location.replace("../index.html");
            return;
        }
        if (salva && (!consultaId || String(salva.id) === String(consultaId))) {
            preencher(salva);
        }
        if (!consultaId) {
            if (!salva) mostrarAviso("Não foi possível localizar os dados da consulta.", true);
            return;
        }

        try {
            const resposta = await fetch(`${API_URL}/consulta/${encodeURIComponent(cpf)}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!resposta.ok) throw new Error(`Falha ao buscar consulta (HTTP ${resposta.status}).`);
            const resultado = await resposta.json();
            const consultas = Array.isArray(resultado) ? resultado : resultado.consultas || resultado.content || [];
            const consulta = consultas.find((item) => String(item.id) === String(consultaId));
            if (consulta) {
                salvarIdPaciente(consulta);
                const medicoSalvo = salva?.medico && typeof salva.medico === "object" ? salva.medico : {};
                const medicoApi = consulta.medico && typeof consulta.medico === "object" ? consulta.medico : {};
                const consultaCompleta = { ...consulta, ...(salva || {}), medico: { ...medicoApi, ...medicoSalvo } };
                preencher(consultaCompleta);
                sessionStorage.setItem("consultaSelecionada", JSON.stringify(consultaCompleta));
                return;
            }
            if (!salva) mostrarAviso("Não foi possível encontrar esta consulta.", true);
        } catch (erro) {
            console.error("Erro ao carregar a consulta para cancelamento:", erro);
            if (!salva) mostrarAviso("Não foi possível carregar os dados. Confira sua conexão.", true);
        }
    }

    async function confirmarCancelamento(id) {
        if (!id) return;
        campos.botao.disabled = true;
        campos.botao.textContent = "Cancelando...";
        try {
            const resposta = await fetch(`${API_URL}/consulta/${encodeURIComponent(id)}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!resposta.ok) throw new Error(`Não foi possível cancelar (HTTP ${resposta.status}).`);
            salvarConsultaCancelada(lerConsultaSalva() || { id });
            sessionStorage.removeItem("consultaSelecionada");
            mostrarAviso("Consulta cancelada com sucesso.");
            campos.botao.textContent = "Consulta cancelada";
            window.setTimeout(() => { window.location.href = "../paciente.html"; }, 1200);
        } catch (erro) {
            console.error("Erro ao cancelar consulta:", erro);
            mostrarAviso(erro.message || "Erro ao cancelar a consulta. Tente novamente.", true);
            campos.botao.disabled = false;
            campos.botao.textContent = "Sim, cancelar consulta";
        }
    }

    carregarConsulta();
})();