document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("cadastro-medico-form");
    const inputCpf = document.getElementById("medico-cpf");

    // Aplica a máscara de CPF automaticamente enquanto o usuário digita
    if (inputCpf) {
        inputCpf.addEventListener("input", (e) => {
            let valor = e.target.value.replace(/\D/g, ""); // Remove tudo que não for número
            
            if (valor.length > 11) {
                valor = valor.substring(0, 11); // Limita a 11 dígitos
            }

            // Aplica os pontos e o traço conforme o usuário digita
            if (valor.length > 9) {
                valor = valor.replace(/^(\d{3})(\d{3})(\d{3})(\d{2}).*$/, "$1.$2.$3-$4");
            } else if (valor.length > 6) {
                valor = valor.replace(/^(\d{3})(\d{3})(\d{0,3}).*$/, "$1.$2.$3");
            } else if (valor.length > 3) {
                valor = valor.replace(/^(\d{3})(\d{0,3}).*$/, "$1.$2");
            }

            e.target.value = valor; // Devolve o valor formatado para o input
        });
    }

    if (form) {
        form.addEventListener("submit", async (event) => {
            event.preventDefault(); // Evita recarregar a página

            const senha = document.getElementById("medico-senha").value;
            const repetirSenha = document.getElementById("medico-repetir-senha").value;

            // Validação de senhas iguais
            if (senha !== repetirSenha) {
                alert("As senhas não coincidem!");
                return;
            }

            // Tratamento do preço da consulta (substitui vírgula por ponto para o Java entender como número decimal)
            let precoStr = document.getElementById("medico-preco").value.replace(",", ".");
            const precoConsulta = parseFloat(precoStr) || 0;

            // Monta o objeto DTO mapeando exatamente com o que o back-end espera
            const novoMedico = {
                nome: document.getElementById("medico-nome").value,
                cpf: inputCpf.value, // Pega o CPF formatado com pontos e traço
                matricula: document.getElementById("medico-matricula").value,
                crm: document.getElementById("medico-crm").value,
                especialidade: document.getElementById("medico-especialidade").value,
                email: document.getElementById("medico-email").value,
                precoConsulta: precoConsulta,
                senha: senha,
                role: "FUNCIONARIO",
                profissao: "MEDICO" 
            };

            try {
                const resposta = await fetch("https://triagemapi-production.up.railway.app/med", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(novoMedico)
                });

                if (resposta.ok) {
                    window.location.href = '../index.html'; // Redireciona para o login
                } else {
                    alert("Erro ao realizar o cadastro. Verifique se o CPF ou matrícula já existem.");
                }
            } catch (error) {
                console.error("Erro de conexão:", error);
                alert("Erro de conexão com o servidor.");
            }
        });
    }
});