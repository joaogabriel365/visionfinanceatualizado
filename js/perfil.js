export const PerfilModulo = {
    tipoAtivo: '',
    dadosOriginais: {},

    init() {
        // Salva estado inicial para controle do botão 'Salvar'
        this.dadosOriginais = {
            nome: document.getElementById('perfilNome').value,
            sobrenome: document.getElementById('perfilSobrenome').value,
            email: document.getElementById('perfilEmail').value
        };
        
        this.configurarListeners();
        this.renderizarTotaisResumo();
        window.PerfilModulo = this; // Garante acesso global para os 'onclick' do HTML
    },

    configurarListeners() {
        const formPerfil = document.getElementById('formPerfil');
        const btnSalvar = document.getElementById('btnSalvarPerfil');
        const inputs = formPerfil.querySelectorAll('input');
        const formSenha = document.getElementById('formSenha');
        const passwordFeedback = document.getElementById('perfilPasswordFeedback');

        const getPasswordValidationMessages = (password) => {
            const messages = [];

            if (password.length < 8) messages.push('Use no mínimo 8 caracteres.');
            if (!/[A-Z]/.test(password)) messages.push('Adicione pelo menos 1 letra maiúscula.');
            if (!/[a-z]/.test(password)) messages.push('Adicione pelo menos 1 letra minúscula.');
            if (!/[^A-Za-z0-9]/.test(password)) messages.push('Adicione pelo menos 1 caractere especial.');

            return messages;
        };

        const limparFeedbackSenha = () => {
            if (!passwordFeedback) return;
            passwordFeedback.hidden = true;
            passwordFeedback.classList.remove('is-error', 'is-success');
            passwordFeedback.innerHTML = '';
        };

        const exibirFeedbackSenha = (tipo, titulo, mensagens = []) => {
            if (!passwordFeedback) return;
            passwordFeedback.hidden = false;
            passwordFeedback.classList.remove('is-error', 'is-success');
            passwordFeedback.classList.add(tipo === 'success' ? 'is-success' : 'is-error');
            passwordFeedback.innerHTML = mensagens.length
                ? `<p>${titulo}</p><ul>${mensagens.map((mensagem) => `<li>${mensagem}</li>`).join('')}</ul>`
                : `<p>${titulo}</p>`;
        };

        // Ativa botão salvar apenas se houver mudanças
        inputs.forEach(input => {
            input.addEventListener('input', () => {
                const alterado = 
                    document.getElementById('perfilNome').value !== this.dadosOriginais.nome ||
                    document.getElementById('perfilSobrenome').value !== this.dadosOriginais.sobrenome ||
                    document.getElementById('perfilEmail').value !== this.dadosOriginais.email;
                
                btnSalvar.disabled = !alterado;
                btnSalvar.classList.toggle('active', alterado);
            });
        });

        formPerfil.onsubmit = (e) => {
            e.preventDefault();
            const nome = document.getElementById('perfilNome').value;
            const sobrenome = document.getElementById('perfilSobrenome').value;
            
            document.getElementById('userNameDisplay').innerText = `${nome} ${sobrenome}`;
            this.dadosOriginais = { 
                nome, 
                sobrenome, 
                email: document.getElementById('perfilEmail').value 
            };
            
            btnSalvar.disabled = true;
            btnSalvar.classList.remove('active');
            alert("Alterações salvas com sucesso!");
        };

        // Validação de Senha
        if (formSenha) {
            formSenha.onsubmit = (e) => {
                e.preventDefault();
                const nova = document.getElementById('novaSenha').value;
                const confirma = document.getElementById('confirmaSenha').value;
                const mensagens = getPasswordValidationMessages(nova);

                limparFeedbackSenha();

                if (nova !== confirma) {
                    mensagens.push('A confirmação da senha deve ser igual à nova senha digitada.');
                }

                if (mensagens.length) {
                    exibirFeedbackSenha('error', 'A nova senha ainda não atende aos critérios exigidos:', mensagens);
                    return;
                }

                exibirFeedbackSenha('success', 'Senha alterada com sucesso.');
                setTimeout(() => {
                    this.fecharModal('modalSenha');
                    e.target.reset();
                    limparFeedbackSenha();
                }, 1200);
            };
        }

        ['novaSenha', 'confirmaSenha'].forEach((id) => {
            const field = document.getElementById(id);
            if (field) {
                field.addEventListener('input', limparFeedbackSenha);
            }
        });
    },

    obterDadosConsolidados() {
        const despesasGerais = JSON.parse(localStorage.getItem('despesas')) || [];
        const metas = JSON.parse(localStorage.getItem('metas')) || [];
        
        const despesasMetas = metas.map(m => ({
            titulo: `Meta: ${m.nome}`,
            valor: parseFloat(m.guardado) || 0,
            data: new Date().toISOString().split('T')[0],
            categoria: 'Planejamento'
        }));

        return [...despesasGerais, ...despesasMetas];
    },

    renderizarTotaisResumo() {
        const hoje = new Date();
        const dados = this.obterDadosConsolidados();
        
        const totalD = dados.reduce((acc, item) => {
            const dataItem = new Date(item.data + 'T00:00:00');
            if (dataItem.getMonth() === hoje.getMonth()) return acc + item.valor;
            return acc;
        }, 0);

        const totalR = parseFloat(localStorage.getItem('budget_total')) || 0;

        document.getElementById('totalDespesas').innerText = `R$ ${totalD.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
        document.getElementById('totalReceitas').innerText = `R$ ${totalR.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
    },

    abrirDetalhamento(tipo) {
        this.tipoAtivo = tipo;
        document.getElementById('modalDetalhamento').style.display = 'flex';
        document.getElementById('modalDetalhamentoTitulo').innerText = tipo === 'receitas' ? 'Orçamento Mensal' : 'Detalhamento de Gastos';
        this.atualizarListaDetalhada();
    },

    abrirModalSenha() {
        document.getElementById('modalSenha').style.display = 'flex';
    },

    fecharModal(id) {
        document.getElementById(id).style.display = 'none';
    },

    atualizarListaDetalhada() {
        const container = document.getElementById('listaDetalhada');
        container.innerHTML = '';

        if (this.tipoAtivo === 'receitas') {
            const valor = localStorage.getItem('budget_total') || '0';
            container.innerHTML = `
                <div class="perfil-item income-border">
                    <div class="item-info">
                        <span>Teto de Gastos Definido</span>
                        <small>Mensal</small>
                    </div>
                    <strong class="text-success">R$ ${parseFloat(valor).toFixed(2)}</strong>
                </div>`;
        } else {
            const filtradas = this.obterDadosConsolidados();
            filtradas.forEach(item => {
                const isMeta = item.titulo.includes("Meta:");
                container.innerHTML += `
                    <div class="perfil-item ${isMeta ? 'meta-border' : ''}">
                        <div class="item-info">
                            <span class="${isMeta ? 'text-highlight' : ''}">${item.titulo}</span>
                            <small class="perfil-tag">${item.categoria}</small>
                        </div>
                        <strong class="text-danger">R$ ${item.valor.toFixed(2)}</strong>
                    </div>`;
            });
        }
    }
};