(() => {
    const API_URL = "https://triagemapi-production.up.railway.app";
    const token = localStorage.getItem("token");
    const cpf = localStorage.getItem("userCpf");
    const consultaId = new URLSearchParams(window.location.search).get("id");
    const campos = {
        status: document.getElementById("detalhe-status"),
        data: document.getElementById("detalhe-data"),
        medico: document.getElementById("detalhe-medico"),
        servico: document.getElementById("detalhe-servico"),
        local: document.getElementById("detalhe-local"),
        tipo: document.getElementById("detalhe-tipo"),
        valor: document.getElementById("detalhe-valor"),
        convenio: document.getElementById("detalhe-convenio"),
        confirmacao: document.getElementById("detalhe-confirmacao")
    };

    function lerConsultaSalva() {
        try {
            return JSON.parse(sessionStorage.getItem("consultaSelecionada") || "null");
        } catch (erro) {
            console.error("Não foi possível ler a consulta selecionada:", erro);
            return null;
        }
    }

    function mostrarAviso(mensagem) {
        let aviso = document.getElementById("aviso-detalhes-consulta");
        if (!aviso) {
            aviso = document.createElement("p");
            aviso.id = "aviso-detalhes-consulta";
            aviso.setAttribute("role", "status");
            aviso.setAttribute("aria-live", "polite");
            aviso.className = "helper-text";
            document.querySelector(".detalhes-card").prepend(aviso);
        }
        aviso.textContent = mensagem;
    }

    function valorTexto(valor, padrao = "Não informado") {
        if (valor == null || valor === "") return padrao;
        if (typeof valor === "object") return valor.nome || valor.name || valor.descricao || valor.label || padrao;
        return String(valor);
    }

    function formatarDataHora(valor) {
        if (!valor) return "Data e horário não informados";
        const data = new Date(valor);
        if (Number.isNaN(data.getTime())) return String(valor);
        return new Intl.DateTimeFormat("pt-BR", {
            weekday: "long",
            day: "2-digit",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        }).format(data);
    }

    function obterLocal(medico) {
        if (!medico || typeof medico !== "object") return "Endereço não informado";
        const endereco = medico.endereco || medico.enderecoCompleto;
        if (typeof endereco === "string" && endereco.trim()) return endereco;
        if (endereco && typeof endereco === "object") {
            const enderecoDireto = endereco.nome || endereco.descricao || endereco.label;
            if (enderecoDireto) return enderecoDireto;
            const partesEndereco = [endereco.rua, endereco.logradouro, endereco.numero,
                endereco.bairro, endereco.cidade, endereco.estado].filter(Boolean);
            if (partesEndereco.length) return partesEndereco.join(", ");
        }
        const partes = [medico.rua, medico.numero, medico.bairro, medico.cidade, medico.estado]
            .filter(Boolean);
        return partes.length ? partes.join(", ") : "Endereço não informado";
    }

    function normalizarChave(valor) {
        return String(valor || "").replace(/[^a-z0-9]/gi, "").toUpperCase();
    }

    async function completarDadosMedico(consulta) {
        const referencia = consulta.medico || consulta.profissional;
        if (!referencia) return consulta;

        try {
            const resposta = await fetch(`${API_URL}/med/buscar`);
            if (!resposta.ok) return consulta;
            const resultado = await resposta.json();
            const medicos = Array.isArray(resultado) ? resultado : resultado.medicos || resultado.content || [];

            const crm = normalizarChave(
                typeof referencia === "string"
                    ? referencia
                    : referencia.crm || referencia.registro || referencia.numeroConselho
            );
            const id = normalizarChave(
                typeof referencia === "object"
                    ? referencia.id || referencia.idMedico || referencia.medicoId
                    : ""
            );
            const nome = normalizarChave(
                typeof referencia === "string"
                    ? referencia
                    : referencia.nome || referencia.nomeCompleto || referencia.name
            );
            const cadastro = medicos.find((item) => crm && normalizarChave(item.crm) === crm)
                || medicos.find((item) => id && normalizarChave(item.id || item.idMedico || item.medicoId) === id)
                || medicos.find((item) => nome && normalizarChave(item.nome || item.nomeCompleto || item.name) === nome);

            if (!cadastro) return consulta;
            const dadosReferencia = typeof referencia === "object" ? referencia : {};
            return { ...consulta, medico: { ...cadastro, ...dadosReferencia } };
        } catch (erro) {
            console.warn("Não foi possível complementar os dados do médico:", erro);
            return consulta;
        }
    }

    function combinarConsulta(consultaApi, consultaSalva) {
        if (!consultaSalva) return consultaApi;
        const medicoApi = consultaApi.medico || consultaApi.profissional;
        const medicoSalvo = consultaSalva.medico || consultaSalva.profissional;
        const medico = medicoApi && typeof medicoApi === "object"
            ? { ...medicoApi, ...(medicoSalvo && typeof medicoSalvo === "object" ? medicoSalvo : {}) }
            : medicoSalvo || medicoApi;
        return { ...consultaApi, ...consultaSalva, medico };
    }

    function preencher(consulta) {
        const medico = consulta.medico;
        const nomeMedico = medico && typeof medico === "object"
            ? medico.nome || medico.name
            : medico;
        const especialidade = consulta.especialidade || consulta.especialidadeConsulta;
        const status = consulta.status || consulta.estado || "Em aguardo";
        const preco = consulta.valor ?? consulta.preco ?? consulta.precoConsulta ?? medico?.precoConsulta;

        campos.status.textContent = valorTexto(status, "Em aguardo");
        campos.data.textContent = formatarDataHora(consulta.dia_hora || consulta.data_hora || consulta.dataHora);
        campos.medico.textContent = valorTexto(nomeMedico, "Especialista não informado");
        campos.servico.textContent = valorTexto(consulta.servico || especialidade, "Consulta médica");
        campos.local.textContent = obterLocal(medico);
        campos.tipo.textContent = valorTexto(consulta.tipo || consulta.tipoConsulta || consulta.primeiraVez);
        campos.valor.textContent = preco == null || preco === ""
            ? "Não informado"
            : Number.isFinite(Number(preco))
                ? Number(preco).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
                : String(preco);
        campos.convenio.textContent = valorTexto(consulta.convenio);
        campos.confirmacao.textContent = valorTexto(
            consulta.confirmacao || consulta.confirmado,
            "Consulta registrada"
        );
    }

    async function carregarDetalhes() {
        if (!token || !cpf) {
            window.location.replace("../index.html");
            return;
        }

        const consultaSalva = lerConsultaSalva();
        try {
            const resposta = await fetch(`${API_URL}/consulta/${encodeURIComponent(cpf)}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!resposta.ok) throw new Error(`Falha ao carregar consulta (HTTP ${resposta.status}).`);

            const resultado = await resposta.json();
            const consultas = Array.isArray(resultado)
                ? resultado
                : resultado.consultas || resultado.content || [];
            const consultaApi = consultas.find((item) => String(item.id) === String(consultaId))
                || (!consultaId ? consultaSalva : null);
            const cacheValido = consultaSalva
                && (!consultaId || String(consultaSalva.id) === String(consultaId))
                ? consultaSalva
                : null;
            const consulta = consultaApi
                ? await completarDadosMedico(combinarConsulta(consultaApi, cacheValido))
                : null;

            if (consulta) {
                preencher(consulta);
                return;
            }
            if (cacheValido) {
                preencher(await completarDadosMedico(cacheValido));
                mostrarAviso("Exibindo os dados salvos desta consulta. Alguns dados podem não estar disponíveis na API.");
                return;
            }
            mostrarAviso("Não foi possível encontrar os dados desta consulta.");
        } catch (erro) {
            console.error("Erro ao carregar detalhes da consulta:", erro);
            if (consultaSalva && (!consultaId || String(consultaSalva.id) === String(consultaId))) {
                preencher(await completarDadosMedico(consultaSalva));
                mostrarAviso("Sem conexão com a API. Exibindo os dados recebidos pelo painel.");
                return;
            }
            mostrarAviso("Não foi possível carregar os detalhes. Verifique sua conexão e tente novamente.");
        }
    }

    carregarDetalhes();
})();
