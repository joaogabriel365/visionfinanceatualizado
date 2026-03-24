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
        document.getElementById('formSenha').onsubmit = (e) => {
            e.preventDefault();
            const nova = document.getElementById('novaSenha').value;
            const confirma = document.getElementById('confirmaSenha').value;

            if (nova !== confirma) {
                alert("Erro: A nova senha e a confirmação não coincidem.");
                return;
            }
            alert("Senha alterada com sucesso!");
            this.fecharModal('modalSenha');
            e.target.reset();
        };
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