(() => {
    const API_URL = "https://triagemapi-production.up.railway.app";
    const token = localStorage.getItem("token");
    const idUrl = new URLSearchParams(window.location.search).get("id");

    const ids = {
        status: "detalhe-status",
        data: "detalhe-data",
        medico: "detalhe-medico",
        servico: "detalhe-servico",
        local: "detalhe-local",
        tipo: "detalhe-tipo",
        valor: "detalhe-valor",
        convenio: "detalhe-convenio",
        confirmacao: "detalhe-confirmacao"
    };

    // Adicione aqui os outros planos do enum Planos_Saude
    const nomesPlanos = {
        BRADESCO_SAUDE: "Bradesco Saúde"
    };

    function setTexto(chave, texto) {
        const el = document.getElementById(ids[chave]);
        if (!el) {
            console.warn(`Elemento #${ids[chave]} não existe no HTML.`);
            return;
        }
        el.textContent = texto;
    }

    function lerConsultaSalva() {
        try {
            const consulta = JSON.parse(sessionStorage.getItem("consultaSelecionada") || "null");
            if (!consulta) return null;
            if (idUrl && String(consulta.id) !== String(idUrl)) return null;
            return consulta;
        } catch (erro) {
            console.error("Não foi possível ler a consulta salva:", erro);
            return null;
        }
    }

    async function buscarConsultaNaApi() {
        if (!idUrl) return null;
        try {
            const resposta = await fetch(`${API_URL}/consulta/detalhes/${encodeURIComponent(idUrl)}`, {
                headers: { Authorization: `Bearer ${token}` },
                cache: "no-store"
            });
            if (!resposta.ok) {
                console.error("Falha ao buscar a consulta:", resposta.status);
                return null;
            }
            const consulta = await resposta.json();
            sessionStorage.setItem("consultaSelecionada", JSON.stringify(consulta));
            return consulta;
        } catch (erro) {
            console.error("Erro ao buscar a consulta:", erro);
            return null;
        }
    }

    function formatarDataHora(valor) {
        if (!valor) return "Data não informada";
        const data = new Date(valor);
        if (Number.isNaN(data.getTime())) return String(valor);
        return new Intl.DateTimeFormat("pt-BR", {
            weekday: "long", day: "2-digit", month: "long", year: "numeric",
            hour: "2-digit", minute: "2-digit"
        }).format(data);
    }

    function formatarPreco(valor) {
        if (valor === "" || valor == null || !Number.isFinite(Number(valor))) return "Consulte o valor";
        return Number(valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    }

    function obterPreco(medico) {
        return medico?.preco_consulta
            ?? medico?.precoConsulta
            ?? medico?.preco
            ?? medico?.valorConsulta
            ?? medico?.valor;
    }

    function humanizar(texto) {
        return String(texto || "")
            .replace(/_/g, " ")
            .toLocaleLowerCase("pt-BR")
            .replace(/(^|\s)\S/g, (letra) => letra.toLocaleUpperCase("pt-BR"));
    }

    function nomeMedico(medico) {
        if (!medico) return "Médico não informado";
        if (typeof medico === "string") return medico;
        return medico.nome || medico.usuario?.nome || (medico.crm ? `CRM ${medico.crm}` : "Médico não informado");
    }

    function localMedico(medico) {
        const partes = [medico?.rua, medico?.numero, medico?.bairro, medico?.cidade, medico?.estado].filter(Boolean);
        return partes.length ? partes.join(", ") : "Local não informado";
    }

    function textoStatus(status) {
        const mapa = {
            EM_AGUARDO: "Aguardando confirmação",
            CONFIRMADA: "Confirmada",
            CANCELADA: "Cancelada"
        };
        return mapa[status] || humanizar(status) || "Em aguardo";
    }

    function estaCancelada(c) {
        return /cancelad/i.test(String(c.status || "")) || Boolean(c.canceladaEm);
    }

    function preencher(c) {
        const medico = typeof c.medico === "object" ? c.medico : null;
        const especialidade = c.especialidade || c.especialidadeConsulta || medico?.especialidade || "";

        console.log("Médico da consulta:", c.medico);

        setTexto("status", humanizar(c.status) || "Em aguardo");
        setTexto("data", formatarDataHora(c.dia_hora || c.data_hora || c.dataHora));
        setTexto("medico", `Dr(a). ${nomeMedico(c.medico)}${especialidade ? ` · ${humanizar(especialidade)}` : ""}`);
        setTexto("servico", "Consulta médica");
        setTexto("local", localMedico(medico));
        setTexto("valor", formatarPreco(obterPreco(medico)));
        setTexto("convenio", c.planosSaude
            ? (nomesPlanos[c.planosSaude] || humanizar(c.planosSaude))
            : "Sem plano de saúde");
        setTexto("confirmacao", textoStatus(c.status));

        // "Tipo de atendimento" só aparece se a API trouxer esse dado
        const tipo = c.tipoAtendimento || c.tipo;
        if (tipo) {
            setTexto("tipo", humanizar(tipo));
            const itemTipo = document.getElementById("detalhe-tipo-item");
            if (itemTipo) itemTipo.hidden = false;
        }

        const badge = document.getElementById(ids.status);
        if (badge) badge.classList.toggle("badge-cancelled", estaCancelada(c));
    }

    function configurarBotoes(c) {
        const btnReagendar = document.getElementById("btn-reagendar");
        const btnCancelar = document.getElementById("btn-cancelar");

        if (estaCancelada(c)) {
            if (btnReagendar) btnReagendar.disabled = true;
            if (btnCancelar) btnCancelar.disabled = true;
            return;
        }

        if (btnReagendar) {
            btnReagendar.addEventListener("click", () => {
                alert("Funcionalidade de reagendamento em desenvolvimento.");
            });
        }

        if (btnCancelar) {
            btnCancelar.addEventListener("click", () => {
                sessionStorage.setItem("consultaSelecionada", JSON.stringify(c));
                const query = c.id != null ? `?id=${encodeURIComponent(c.id)}` : "";
                window.location.href = `cancelarConsulta.html${query}`;
            });
        }
    }

    function desativarBotoes() {
        ["btn-reagendar", "btn-cancelar"].forEach((id) => {
            const botao = document.getElementById(id);
            if (botao) botao.disabled = true;
        });
    }

    async function carregar() {
        const consulta = lerConsultaSalva() || await buscarConsultaNaApi();
        if (!consulta) {
            setTexto("status", "Consulta não encontrada");
            desativarBotoes();
            return;
        }
        preencher(consulta);
        configurarBotoes(consulta);
    }

    carregar();
})();