import { formatarMoeda, metas, salvarNoStorage } from './common.js';

export const PlanejamentoModulo = {
    init() {
        console.log("Iniciando Módulo de Planejamento...");
        this.atualizarInterfaceOrcamento();
        this.renderizarMetas();
        this.atualizarProgressoGlobal();
    },

    // 1. ORÇAMENTO MENSAL
    atualizarInterfaceOrcamento() {
        const limite = parseFloat(localStorage.getItem('budget_total')) || 0;
        const display = document.getElementById('valor-limite-display');
        if (display) display.innerText = formatarMoeda(limite);
    },

    salvarOrcamento() {
        const input = document.getElementById('orcamentoMensalInput');
        if (!input) return;
        
        const novoValor = parseFloat(input.value);

        if (!isNaN(novoValor) && novoValor > 0) {
            localStorage.setItem('budget_total', novoValor);
            this.atualizarInterfaceOrcamento();
            this.atualizarProgressoGlobal();
            input.value = '';
        } else {
            alert("Por favor, insira um valor válido.");
        }
    },

    // 2. GESTÃO DE METAS (CRIAR E EXCLUIR)
    abrirModalNovaMeta() {
        document.getElementById('modalNovaMeta').style.display = 'flex';
    },

    fecharModalNovaMeta() {
        document.getElementById('modalNovaMeta').style.display = 'none';
        document.getElementById('nomeMeta').value = '';
        document.getElementById('prazoMeta').value = '';
        document.getElementById('valorAlvoMeta').value = '';
    },

    criarNovaMeta() {
        const nome = document.getElementById('nomeMeta').value;
        const prazo = document.getElementById('prazoMeta').value;
        const alvo = parseFloat(document.getElementById('valorAlvoMeta').value);

        if (nome && prazo && alvo > 0) {
            const novaMeta = {
                nome: nome,
                prazo: prazo.split('-').reverse().join('/'),
                alvo: alvo,
                guardado: 0
            };

            metas.push(novaMeta);
            salvarNoStorage();
            
            this.renderizarMetas();
            this.atualizarProgressoGlobal();
            this.fecharModalNovaMeta();
        } else {
            alert("Preencha todos os campos corretamente.");
        }
    },

    removerMeta(index) {
        if (confirm("Tem certeza que deseja excluir esta meta?")) {
            metas.splice(index, 1);
            salvarNoStorage();
            this.renderizarMetas();
            this.atualizarProgressoGlobal();
        }
    },

    // 3. APORTES (ADICIONAR DINHEIRO NA META)
    confirmarAporte() {
        const index = document.getElementById('indexMetaAporte').value;
        const valInput = document.getElementById('valorAporteMetaInput');
        const valorAporte = parseFloat(valInput.value);

        if (!isNaN(valorAporte) && valorAporte > 0) {
            const atual = parseFloat(metas[index].guardado) || 0;
            metas[index].guardado = atual + valorAporte;
            
            salvarNoStorage();
            this.renderizarMetas();
            this.atualizarProgressoGlobal();
            this.fecharModalAporte();
        }
    },

    fecharModalAporte() {
        const modal = document.getElementById('modalAporteMeta');
        if (modal) modal.style.display = 'none';
        const input = document.getElementById('valorAporteMetaInput');
        if (input) input.value = '';
    },

    // 4. RENDERIZAÇÃO E PROGRESSO
    renderizarMetas() {
        const tbody = document.getElementById('goalsTableBody');
        if (!tbody) return;

        if (metas.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:50px; color:#94a3b8;">Nenhuma meta financeira cadastrada.</td></tr>`;
            return;
        }

        tbody.innerHTML = metas.map((meta, index) => {
            const guardado = parseFloat(meta.guardado) || 0;
            const alvo = parseFloat(meta.alvo) || 1;
            const porcentagem = Math.min((guardado / alvo) * 100, 100).toFixed(0);
            
            return `
                <tr style="border-bottom: 1px solid #1e293b; color: white;">
                    <td style="padding: 20px 15px 20px 25px;">${meta.nome}</td>
                    <td style="padding: 20px 15px; font-weight: bold;">${formatarMoeda(meta.alvo)}</td>
                    <td style="padding: 20px 15px;">${meta.prazo}</td>
                    <td style="padding: 20px 15px;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <div style="flex: 1; height: 8px; background: #1a253a; border-radius: 4px; overflow: hidden;">
                                <div style="width: ${porcentagem}%; height: 100%; background: #22d3ee; box-shadow: 0 0 10px rgba(34, 211, 238, 0.3);"></div>
                            </div>
                            <span style="font-size: 0.8rem; min-width: 35px;">${porcentagem}%</span>
                        </div>
                    </td>
                    <td style="padding: 20px 15px; text-align: center;">
                        <div style="display: flex; justify-content: center; gap: 15px;">
                            <button onclick="window.abrirModalAporte(${index})" style="background:transparent; border:none; cursor:pointer;">
                                 <img src="./img/+.png" style="width:18px;" title="Adicionar valor">
                            </button>
                            <button onclick="PlanejamentoModulo.removerMeta(${index})" style="background:transparent; border:none; cursor:pointer;">
                                 <img src="./img/lixeira.png" style="width:18px;" title="Excluir meta">
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    },

    atualizarProgressoGlobal() {
        // CORREÇÃO: Ler direto do storage para ignorar a variável 'limiteMensal' desatualizada
        const limite = parseFloat(localStorage.getItem('budget_total')) || 0;
        
        const despesas = JSON.parse(localStorage.getItem('despesas')) || [];
        const totalDespesas = despesas.reduce((sum, item) => sum + (parseFloat(item.valor) || 0), 0);
        const totalAlocadoMetas = metas.reduce((sum, item) => sum + (parseFloat(item.guardado) || 0), 0);

        const utilizado = totalDespesas + totalAlocadoMetas;
        const saldo = limite - utilizado;
        
        const porcentagemValor = limite > 0 ? (utilizado / limite) * 100 : 0;
        const porcentagemDisplay = Math.min(porcentagemValor, 100).toFixed(0);

        const corStatus = porcentagemValor >= 100 ? '#ef4444' : '#22d3ee';
        const sombraStatus = porcentagemValor >= 100 ? '0 0 15px rgba(239, 68, 68, 0.5)' : '0 0 15px rgba(34, 211, 238, 0.5)';

        const fill = document.getElementById('progressBudgetFill');
        if (fill) {
            // Garante que o CSS renderize a transição de largura
            requestAnimationFrame(() => {
                fill.style.width = `${porcentagemDisplay}%`;
                fill.style.background = corStatus;
                fill.style.boxShadow = sombraStatus;
            });
        }

        const percText = document.getElementById('progresso-porcentagem-text');
        if (percText) {
            percText.innerText = `${porcentagemDisplay}%`;
            percText.style.color = corStatus;
        }

        const gastoText = document.getElementById('gasto-total-text');
        if (gastoText) {
            gastoText.innerHTML = `
                <span style="font-weight: 700; color: white;">${formatarMoeda(utilizado)}</span> 
                <span style="color: #94a3b8; font-size: 0.75rem;"> utilizados de </span>
                <span style="font-weight: 600; color: #94a3b8;">${formatarMoeda(limite)}</span>
            `;
        }

        const dispText = document.getElementById('disponivel-text');
        if (dispText) {
            dispText.innerText = saldo < 0 
                ? `Excedido: - ${formatarMoeda(Math.abs(saldo))}` 
                : `Disponível: ${formatarMoeda(saldo)}`;
            dispText.style.color = saldo < 0 ? '#ef4444' : '#22d3ee';
        }
    }
};

window.abrirModalAporte = (index) => {
    const inputIndex = document.getElementById('indexMetaAporte');
    const modal = document.getElementById('modalAporteMeta');
    if (inputIndex && modal) {
        inputIndex.value = index;
        modal.style.display = 'flex';
    }
};