(() => {
    const API_URL = "https://triagemapi-production.up.railway.app";
    const pacienteCpf = localStorage.getItem("userCpf");
    const token = localStorage.getItem("token");

    const cardComConsulta = document.getElementById("card-com-consulta");
    const multiplasConsultasContainer = document.getElementById("multiplas-consultas");
    const cardSemConsulta = document.getElementById("card-sem-consulta");
    const listaConsultasDashboard = document.getElementById("lista-consultas-dashboard");

    if (!pacienteCpf || !token) return;

    async function carregarConsultasDashboard() {
        try {
            // Corrigido para /consulta/{cpf} conforme o Controller
            const resposta = await fetch(`${API_URL}/consulta/${pacienteCpf}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!resposta.ok) {
                mostrarSemConsulta();
                return;
            }

            let consultas = await resposta.json();

            if (!consultas || consultas.length === 0) {
                mostrarSemConsulta();
                return;
            }

            consultas = await completarDadosDosMedicos(consultas);

            if (consultas.length === 1) {
                exibirUnicaConsulta(consultas[0]);
            } else {
                exibirMultiplasConsultas(consultas);
            }

        } catch (erro) {
            console.error("Erro ao carregar consultas do painel:", erro);
            mostrarSemConsulta();
        }
    }

    async function completarDadosDosMedicos(consultas) {
        let medicos = [];
        try {
            const resposta = await fetch(`${API_URL}/med/buscar`);
            if (!resposta.ok) throw new Error(`Busca de médicos falhou (HTTP ${resposta.status}).`);
            const resultado = await resposta.json();
            medicos = Array.isArray(resultado) ? resultado : resultado.medicos || resultado.content || [];
        } catch (erro) {
            console.warn("Não foi possível buscar os dados completos dos médicos:", erro);
            return consultas;
        }

        return consultas.map((consulta) => {
            const referencia = consulta.medico || consulta.profissional;
            if (!referencia) return consulta;

            const referenciaCrm = normalizarChave(
                typeof referencia === "string"
                    ? referencia
                    : referencia.crm || referencia.registro || referencia.numeroConselho
            );
            const referenciaId = normalizarChave(
                typeof referencia === "object"
                    ? referencia.id || referencia.idMedico || referencia.medicoId
                    : ""
            );
            const referenciaNome = normalizarChave(
                typeof referencia === "string"
                    ? referencia
                    : referencia.nome || referencia.nomeCompleto || referencia.name
            );

            const medicoEncontrado = medicos.find((medico) =>
                referenciaCrm && normalizarChave(medico.crm) === referenciaCrm
            ) || medicos.find((medico) =>
                referenciaId && normalizarChave(medico.id || medico.idMedico || medico.medicoId) === referenciaId
            ) || medicos.find((medico) =>
                referenciaNome && normalizarChave(medico.nome || medico.nomeCompleto || medico.name) === referenciaNome
            );

            if (!medicoEncontrado) return consulta;

            const dadosOriginais = typeof referencia === "object" ? referencia : {};
            return { ...consulta, medico: { ...medicoEncontrado, ...dadosOriginais } };
        });
    }

    function normalizarChave(valor) {
        return String(valor || "").replace(/[^a-z0-9]/gi, "").toUpperCase();
    }

    function mostrarSemConsulta() {
        cardComConsulta.style.display = "none";
        multiplasConsultasContainer.style.display = "none";
        cardSemConsulta.style.display = "flex";
    }

    function exibirUnicaConsulta(c) {
        cardSemConsulta.style.display = "none";
        multiplasConsultasContainer.style.display = "none";
        cardComConsulta.style.display = "flex";

        document.getElementById("appointment-date").textContent = formatarDataHora(obterDataConsulta(c));
        document.getElementById("appointment-doctor").textContent = formatarMedico(c);
        document.getElementById("appointment-location").textContent = obterLocal(c);
        atualizarStatus(cardComConsulta.querySelector(".badge-waiting"), c);

        const btnDetalhes = document.getElementById("btn-ver-detalhes");
        btnDetalhes.onclick = () => abrirDetalhes(c);
    }

    function exibirMultiplasConsultas(consultas) {
        cardComConsulta.style.display = "none";
        cardSemConsulta.style.display = "none";
        multiplasConsultasContainer.style.display = "block";

        listaConsultasDashboard.replaceChildren();
        consultas.forEach((c) => {
            const card = document.createElement("div");
            card.className = "next-appointment-card";
            card.style.cssText = "margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;";

            const info = document.createElement("div");
            info.className = "appointment-info";

            const status = document.createElement("span");
            status.className = "badge-waiting";
            atualizarStatus(status, c);

            const data = document.createElement("h2");
            data.textContent = formatarDataHora(obterDataConsulta(c));

            const medico = document.createElement("p");
            medico.textContent = formatarMedico(c);

            const local = document.createElement("p");
            local.className = "appointment-location";
            local.textContent = obterLocal(c);
            info.append(status, data, medico, local);

            const acoes = document.createElement("div");
            acoes.style.cssText = "display: flex; gap: 8px; flex-wrap: wrap;";

            const btnDetalhes = document.createElement("button");
            btnDetalhes.type = "button";
            btnDetalhes.className = "btn btn-primary";
            btnDetalhes.textContent = "Detalhes da consulta";
            btnDetalhes.addEventListener("click", () => abrirDetalhes(c));

            const btnReagendar = document.createElement("button");
            btnReagendar.type = "button";
            btnReagendar.className = "btn btn-outline";
            btnReagendar.textContent = "Reagendar";
            btnReagendar.addEventListener("click", () => window.reagendarConsulta(c.id));

            const btnCancelar = document.createElement("button");
            btnCancelar.type = "button";
            btnCancelar.className = "btn btn-danger";
            btnCancelar.style.cssText = "background-color: #B91C1C; color: white;";
            btnCancelar.textContent = "Cancelar";
            btnCancelar.addEventListener("click", () => window.cancelarConsulta(c.id));

            acoes.append(btnDetalhes, btnReagendar, btnCancelar);
            card.append(info, acoes);
            listaConsultasDashboard.appendChild(card);
        });
    }

    function abrirDetalhes(consulta) {
        sessionStorage.setItem("consultaSelecionada", JSON.stringify(consulta));
        const parametros = new URLSearchParams();
        if (consulta.id != null) parametros.set("id", consulta.id);
        const query = parametros.toString();
        window.location.href = `tela_paciente/detalhesConsulta.html${query ? `?${query}` : ""}`;
    }

    function formatarDataHora(dataStr) {
        if (!dataStr) return "Data não informada";
        const data = new Date(dataStr);
        if (Number.isNaN(data.getTime())) return String(dataStr);
        return new Intl.DateTimeFormat("pt-BR", {
            weekday: "long",
            day: "2-digit",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "America/Sao_Paulo"
        }).format(data);
    }

    function obterDataConsulta(consulta) {
        return consulta.dia_hora || consulta.data_hora || consulta.dataHora || consulta.data;
    }

    function obterValorTexto(valor, padrao = "") {
        if (valor == null || valor === "") return padrao;
        if (typeof valor !== "object") return String(valor);
        return valor.nome || valor.name || valor.descricao || valor.label || padrao;
    }

    function obterNomeMedico(medico) {
        if (typeof medico !== "object" || medico === null) {
            return obterValorTexto(medico, "Especialista não informado");
        }

        const chavesNome = ["nome", "name", "nomeCompleto", "fullName", "nomeMedico", "medicoNome", "nomeUsuario", "nome_medico"];
        for (const chave of chavesNome) {
            const nome = medico[chave];
            if (typeof nome === "string" && nome.trim()) return nome.trim();
            if (nome && typeof nome === "object") {
                const nomeAninhado = obterNomeMedico(nome);
                if (nomeAninhado !== "Especialista cadastrado") return nomeAninhado;
            }
        }

        for (const chave of ["usuario", "user", "medico", "profissional", "dadosMedico"]) {
            if (typeof medico[chave] === "string" && medico[chave].trim()) {
                return medico[chave].trim();
            }
            if (medico[chave] && typeof medico[chave] === "object") {
                const nomeAninhado = obterNomeMedico(medico[chave]);
                if (nomeAninhado !== "Especialista cadastrado") return nomeAninhado;
            }
        }

        const crm = medico.crm || medico.registro || medico.numeroConselho;
        if (!crm) return "Especialista cadastrado";
        const registro = String(crm).trim();
        const registroFormatado = /^CRM(?:[-\s]|$)/i.test(registro) ? registro : `CRM ${registro}`;
        return `Especialista (${registroFormatado})`;
    }

    function formatarMedico(consulta) {
        const medico = consulta.medico || consulta.profissional || consulta.medicoNome || consulta.nomeMedico;
        const nome = obterNomeMedico(medico);
        const especialidade = obterValorTexto(
            consulta.especialidade || consulta.especialidadeConsulta || medico?.especialidade
        );
        return `Dr(a). ${nome}${especialidade ? ` · ${especialidade}` : ""}`;
    }

    function obterLocal(consulta) {
        const medico = consulta.medico || consulta.profissional;
        const endereco = consulta.local || consulta.endereco || medico?.endereco || medico?.enderecoCompleto;
        const enderecoTexto = obterValorTexto(endereco);
        if (enderecoTexto) return enderecoTexto;

        if (endereco && typeof endereco === "object") {
            const partesEndereco = [endereco.rua, endereco.logradouro, endereco.numero,
                endereco.bairro, endereco.cidade, endereco.estado].filter(Boolean);
            if (partesEndereco.length) return partesEndereco.join(", ");
        }

        const partesMedico = [medico?.rua || medico?.logradouro, medico?.numero,
            medico?.bairro, medico?.cidade, medico?.estado].filter(Boolean);
        return partesMedico.length ? partesMedico.join(", ") : "Local não informado";
    }

    function atualizarStatus(elemento, consulta) {
        const status = obterValorTexto(consulta.status || consulta.estado || consulta.situacao);
        elemento.textContent = status
            ? status.replace(/_/g, " ").toLocaleLowerCase("pt-BR").replace(/^./, (letra) => letra.toLocaleUpperCase("pt-BR"))
            : "Em aguardo";
    }

    window.cancelarConsulta = async function(idConsulta) {
        if (!confirm("Deseja realmente cancelar esta consulta?")) return;

        try {
            const resposta = await fetch(`${API_URL}/consulta/${idConsulta}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!resposta.ok) throw new Error("Não foi possível cancelar.");

            alert("Consulta cancelada com sucesso.");
            carregarConsultasDashboard();
        } catch (erro) {
            console.error(erro);
            alert("Erro ao cancelar consulta.");
        }
    };

    window.reagendarConsulta = function(idConsulta) {
        alert("Funcionalidade de reagendamento em desenvolvimento.");
    };

    carregarConsultasDashboard();
})();