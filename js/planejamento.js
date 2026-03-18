import { formatarMoeda } from './common.js';

export const PlanejamentoModulo = {
    // Carrega metas ou usa exemplo da imagem se vazio
    listaMetas: JSON.parse(localStorage.getItem('metas')) || [
        { nome: 'Reserva de Emergência', alvo: 10000, prazo: '31/12/2026', guardado: 6500 },
        { nome: 'Notebook Novo', alvo: 5000, prazo: '30/06/2026', guardado: 2000 }
    ],

    init() {
        console.log("Iniciando Módulo de Planejamento...");
        this.atualizarInterfaceOrcamento();
        this.renderizarMetas();
    },

    atualizarInterfaceOrcamento() {
        const limite = parseFloat(localStorage.getItem('budget_total')) || 0;
        const display = document.getElementById('valor-limite-display');
        if (display) display.innerText = formatarMoeda(limite);
        // Barra de progresso do orçamento (para implementação futura)
    },

    salvarOrcamento() {
        const input = document.getElementById('orcamentoMensal');
        const novoValor = parseFloat(input.value);

        if (!isNaN(novoValor) && novoValor > 0) {
            localStorage.setItem('budget_total', novoValor);
            this.atualizarInterfaceOrcamento();
            input.value = '';
            alert("Orçamento mensal atualizado!");
        } else {
            alert("Por favor, insira um valor válido.");
        }
    },

    renderizarMetas() {
        const tbody = document.getElementById('goalsTableBody');
        if (!tbody) return;

        if (this.listaMetas.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:50px; color:#64748b; background: #0f172a;">Nenhuma meta financeira cadastrada.</td></tr>`;
            return;
        }

        tbody.innerHTML = this.listaMetas.map((meta, index) => {
            const porcentagem = Math.min((meta.guardado / meta.alvo) * 100, 100).toFixed(0);
            
            return `
                <tr style="border-bottom: 1px solid #1e293b; color: white;">
                    <td style="padding: 20px 15px 20px 25px; font-weight: 500;">${meta.nome}</td>
                    <td style="padding: 20px 15px;">${formatarMoeda(meta.alvo)}</td>
                    <td style="padding: 20px 15px;">${meta.prazo}</td>
                    <td style="padding: 20px 15px;">
                        <div style="display: flex; align-items: center; gap: 10px; color: #22d3ee; font-weight: 700;">
                            <div style="flex: 1; height: 6px; background: #1a253a; border-radius: 3px; overflow: hidden; position: relative;">
                                <div style="width: ${porcentagem}%; height: 100%; background: #22d3ee; border-radius: 3px; box-shadow: 0 0 10px rgba(34, 211, 238, 0.4);"></div>
                            </div>
                            <span style="font-size: 0.85rem; min-width: 40px;">${porcentagem}%</span>
                        </div>
                    </td>
                    <td style="padding: 20px 15px; text-align: center;">
                        <div style="display: flex; justify-content: center; gap: 18px;">
                            <button onclick="window.abrirModalAporte(${index})" style="background: transparent; border: none; cursor: pointer;">
                                <img src="../img/+.png" alt="Adicionar" style="width: 22px; height: 22px; object-fit: contain;">
                            </button>
                            <button onclick="window.excluirMeta(${index})" style="background: transparent; border: none; cursor: pointer;">
                                <img src="../img/lixeira.png" alt="Excluir" style="width: 20px; height: 20px; object-fit: contain;">
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    },

    // Lógica do Modal de Aporte (Imagem 2)
    confirmarAporte() {
        const index = document.getElementById('indexMetaAporte').value;
        const inputAporte = document.getElementById('valorAporteMeta');
        const valorAporte = parseFloat(inputAporte.value);

        if (!isNaN(valorAporte) && valorAporte > 0) {
            this.listaMetas[index].guardado = (parseFloat(this.listaMetas[index].guardado) || 0) + valorAporte;
            localStorage.setItem('metas', JSON.stringify(this.listaMetas));
            this.renderizarMetas();
            document.getElementById('modalAporteMeta').style.display = 'none';
            inputAporte.value = '';
        } else {
            alert("Insira um valor válido.");
        }
    }
};

// FUNÇÕES GLOBAIS (Obrigatório para o onclick do HTML dinâmico)
window.abrirModalAporte = (index) => {
    document.getElementById('indexMetaAporte').value = index;
    document.getElementById('modalAporteMeta').style.display = 'flex';
};

window.excluirMeta = (index) => {
    if (confirm("Tem certeza que deseja excluir esta meta?")) {
        PlanejamentoModulo.listaMetas.splice(index, 1);
        localStorage.setItem('metas', JSON.stringify(PlanejamentoModulo.listaMetas));
        PlanejamentoModulo.renderizarMetas();
    }
};