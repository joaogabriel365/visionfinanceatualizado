import { formatarMoeda } from './common.js';

export const PerfilModulo = {
    tipoAtivo: '', // 'receitas' ou 'despesas'

    init() {
        this.renderizarTotaisIniciais();
        this.configurarFormulario();
        
        // Listener para o filtro do modal
        const filtro = document.getElementById('filtroPeriodo');
        if (filtro) {
            filtro.addEventListener('change', () => this.atualizarListaDetalhada());
        }
    },

    // 1. Renderiza o que aparece nos cards assim que abre a tela (Mês Atual)
    renderizarTotaisIniciais() {
        const hoje = new Date();
        const mesAtual = hoje.getMonth();
        const anoAtual = hoje.getFullYear();

        // Receitas (Vem do Planejamento - Orçamento Mensal)
        const orcamento = parseFloat(localStorage.getItem('budget_total')) || 0;

        // Despesas (Apenas do mês atual)
        const despesas = JSON.parse(localStorage.getItem('despesas')) || [];
        const totalD = despesas.reduce((acc, d) => {
            const dataD = new Date(d.data + 'T00:00:00'); // Garante leitura correta da data
            if (dataD.getMonth() === mesAtual && dataD.getFullYear() === anoAtual) {
                return acc + (parseFloat(d.valor) || 0);
            }
            return acc;
        }, 0);
        
        const elDespesas = document.getElementById('totalDespesas');
        const elReceitas = document.getElementById('totalReceitas');

        if (elDespesas) elDespesas.innerText = formatarMoeda(totalD);
        if (elReceitas) elReceitas.innerText = formatarMoeda(orcamento);
    },

    abrirDetalhamento(tipo) {
        this.tipoAtivo = tipo;
        const modal = document.getElementById('modalDetalhamento');
        if (modal) {
            modal.style.display = 'flex';
        }
        
        const titulo = document.getElementById('modalDetalhamentoTitulo');
        if (titulo) {
            titulo.innerText = tipo === 'receitas' ? 'Detalhamento de Receitas' : 'Detalhamento de Despesas';
        }
        
        this.atualizarListaDetalhada();
    },

    fecharModal() {
        const modal = document.getElementById('modalDetalhamento');
        if (modal) modal.style.display = 'none';
    },

    // 2. Lógica rigorosa de filtros de período
    atualizarListaDetalhada() {
        const filtroEl = document.getElementById('filtroPeriodo');
        const container = document.getElementById('listaDetalhada');
        
        if (!filtroEl || !container) return;

        const periodo = filtroEl.value;
        const hoje = new Date();
        hoje.setHours(23, 59, 59, 999); // Final do dia de hoje

        if (this.tipoAtivo === 'receitas') {
            const valor = parseFloat(localStorage.getItem('budget_total')) || 0;
            container.innerHTML = `
                <div class="detail-item" style="padding: 20px; border-bottom: 1px solid #1e293b; display: flex; justify-content: space-between;">
                    <div>
                        <span style="display: block; color: white;">Orçamento Mensal Definido</span>
                        <small style="color: #64748b;">Fonte: Planejamento Financeiro</small>
                    </div>
                    <strong style="color: #22d3ee; font-size: 1.2rem;">${formatarMoeda(valor)}</strong>
                </div>`;
        } else {
            const despesas = JSON.parse(localStorage.getItem('despesas')) || [];
            
            const filtradas = despesas.filter(d => {
                const dataD = new Date(d.data + 'T00:00:00');
                
                // Cálculo de diferença de dias
                const diffTime = hoje - dataD;
                const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

                switch (periodo) {
                    case 'mes': 
                        return dataD.getMonth() === hoje.getMonth() && dataD.getFullYear() === hoje.getFullYear();
                    case '7': return diffDays >= 0 && diffDays <= 7;
                    case '15': return diffDays >= 0 && diffDays <= 15;
                    case '30': return diffDays >= 0 && diffDays <= 30;
                    case '90': return diffDays >= 0 && diffDays <= 90;
                    case '180': return diffDays >= 0 && diffDays <= 180;
                    case '365': return diffDays >= 0 && diffDays <= 365;
                    default: return true;
                }
            });

            // Ordenar por data (mais recente primeiro)
            filtradas.sort((a, b) => new Date(b.data) - new Date(a.data));

            container.innerHTML = filtradas.map(d => `
                <div class="detail-item" style="padding: 15px; border-bottom: 1px solid #1e293b; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <span style="display: block; color: white; font-weight: 500;">${d.titulo}</span>
                        <small style="color: #64748b;">${d.data.split('-').reverse().join('/')} • ${d.categoria}</small>
                    </div>
                    <strong style="color: white;">${formatarMoeda(d.valor)}</strong>
                </div>
            `).join('') || '<p style="color:#94a3b8; text-align:center; padding: 20px;">Nenhum gasto encontrado neste período.</p>';
        }
    },

    configurarFormulario() {
        const form = document.getElementById('formPerfil');
        if (form) {
            form.onsubmit = (e) => {
                e.preventDefault();
                const nome = document.getElementById('perfilNome').value;
                const email = document.getElementById('perfilEmail').value;
                
                // Atualiza displays se existirem
                if(document.getElementById('userNameDisplay')) document.getElementById('userNameDisplay').innerText = nome;
                if(document.getElementById('userEmailDisplay')) document.getElementById('userEmailDisplay').innerText = email;
                
                alert("Alterações salvas com sucesso!");
            };
        }
    }
};

// Torna o módulo visível para o HTML (onclick)
window.PerfilModulo = PerfilModulo;

// Inicialização automática ao carregar o script
document.addEventListener('DOMContentLoaded', () => {
    PerfilModulo.init();
});