import { formatarMoeda } from './common.js';

export const RelatoriosModulo = {
    // Busca dados atualizados do localStorage
    get despesas() {
        return JSON.parse(localStorage.getItem('despesas')) || [];
    },

    init() {
        this.renderizarResumo();
        this.gerarGraficoComparativo();
        this.renderizarRanking();
    },

    renderizarResumo() {
        const container = document.getElementById('resumoPeriodoContainer');
        if (!container) return;

        const totalGeral = this.despesas.reduce((acc, d) => acc + parseFloat(d.valor), 0);
        const mediaDiaria = totalGeral > 0 ? totalGeral / 30 : 0;
        
        const economiaSimulada = 1750.00; 
        const porcentagemEconomia = 29;

        // Limpo de estilos inline, usando agora as classes resumo-item, resumo-label, etc.
        container.innerHTML = `
            <div class="resumo-item">
                <span class="resumo-label">Economia do Mês</span>
                <h3 class="resumo-value">${formatarMoeda(economiaSimulada)}</h3>
                <p class="resumo-info">${porcentagemEconomia}% do orçamento</p>
            </div>

            <div class="resumo-item">
                <span class="resumo-label">Média Diária</span>
                <h3 class="resumo-value">${formatarMoeda(mediaDiaria)}</h3>
                <p class="resumo-info">Últimos 30 dias</p>
            </div>

            <div class="resumo-item">
                <span class="resumo-label">Dia com Mais Gasto</span>
                <h3 class="resumo-value">R$ 620,00</h3>
                <p class="resumo-info">12/03 - Sexta-feira</p>
            </div>

            <div class="resumo-item">
                <span class="resumo-label">Categoria em Alta</span>
                <h3 class="resumo-value">Transporte</h3>
                <p class="resumo-info highlight">↑ 34% em relação a fev</p>
            </div>
        `;
    },

    gerarGraficoComparativo() {
        const ctx = document.getElementById('comparisonChart');
        if (!ctx) return;
        if (window.myChart) window.myChart.destroy();

        const categoriasMap = {};
        this.despesas.forEach(d => {
            categoriasMap[d.categoria] = (categoriasMap[d.categoria] || 0) + parseFloat(d.valor);
        });

        const labels = Object.keys(categoriasMap).length ? Object.keys(categoriasMap) : ['Alimentação', 'Transporte', 'Lazer', 'Saúde', 'Outros'];
        const valoresAtuais = Object.values(categoriasMap).length ? Object.values(categoriasMap) : [0, 0, 0, 0, 0];
        const valoresAnteriores = [1050, 600, 520, 280, 200]; 

        window.myChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Março',
                        data: valoresAtuais,
                        backgroundColor: '#22d3ee',
                        borderRadius: 5,
                        barPercentage: 0.6
                    },
                    {
                        label: 'Fevereiro',
                        data: valoresAnteriores,
                        backgroundColor: '#1e293b',
                        borderRadius: 5,
                        barPercentage: 0.6
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom', labels: { color: '#94a3b8', padding: 20, usePointStyle: true } }
                },
                scales: {
                    y: { beginAtZero: true, grid: { color: '#1e293b' }, ticks: { color: '#94a3b8' } },
                    x: { grid: { display: false }, ticks: { color: '#94a3b8' } }
                }
            }
        });
    },

    renderizarRanking() {
        const container = document.getElementById('rankingGastosContainer');
        if (!container) return;

        const ranking = [...this.despesas]
            .sort((a, b) => parseFloat(b.valor) - parseFloat(a.valor))
            .slice(0, 5);

        if (ranking.length === 0) {
            container.innerHTML = `<div class="empty-state">Nenhuma despesa registrada para o período.</div>`;
            return;
        }

        container.innerHTML = ranking.map((item, index) => {
            let dataDisplay = item.data || '--/--/----';
            if (dataDisplay.includes('-')) {
                const parts = dataDisplay.split('-');
                dataDisplay = `${parts[2]}/${parts[1]}/${parts[0]}`;
            }

            return `
                <div class="ranking-row">
                    <div class="row-left">
                        <div class="rank-number">${index + 1}º</div>
                        <div class="item-details">
                            <span class="item-date">${dataDisplay}</span>
                            <h4 class="item-title">${item.titulo}</h4>
                        </div>
                    </div>
                    
                    <div class="row-right">
                        <div class="item-financial">
                            <span class="item-value">${formatarMoeda(item.valor)}</span>
                            <span class="item-category">${item.categoria}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }
};