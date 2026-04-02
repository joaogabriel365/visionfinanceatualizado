import { formatarMoeda } from './common.js';

export const RelatoriosModulo = {
    // Busca dados atualizados do localStorage
    get despesas() {
        return JSON.parse(localStorage.getItem('despesas')) || [];
    },

    init() {
        this.renderizarResumo();
        this.criarFiltroMeses();
        this.gerarGraficoComparativo();
        this.renderizarRanking();

        const yearSelect = document.getElementById('reportYear');
        const checkboxes = document.querySelectorAll('.month-checkbox');
        const toggleAllButton = document.getElementById('toggleAllMonths');
        const clearAllButton = document.getElementById('clearAllMonths');

        const refresh = () => {
            this.gerarGraficoComparativo();
            this.renderizarResumo();
        };

        if (yearSelect) {
            yearSelect.addEventListener('change', refresh);
        }

        if (toggleAllButton) {
            toggleAllButton.addEventListener('click', () => {
                document.querySelectorAll('.month-checkbox').forEach(chk => chk.checked = true);
                refresh();
            });
        }

        if (clearAllButton) {
            clearAllButton.addEventListener('click', () => {
                document.querySelectorAll('.month-checkbox').forEach(chk => chk.checked = false);
                refresh();
            });
        }

        document.getElementById('monthFilterContainer')?.addEventListener('change', refresh);
    },

    criarFiltroMeses() {
        const monthFilterContainer = document.getElementById('monthFilterContainer');
        if (!monthFilterContainer) return;

        const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

        monthFilterContainer.innerHTML = monthNames.map((name, index) => {
            return `
                <label style="cursor:pointer; display:flex; align-items:center; gap: 6px; border: 1px solid #d1d5db; border-radius: 8px; padding: 6px 8px; background: #f8fafc; color: #1f2937; font-size: 0.8rem;">
                    <input class="month-checkbox" type="checkbox" value="${index + 1}" checked style="accent-color: #22d3ee;">
                    ${name}
                </label>
            `;
        }).join('');
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

        const yearSelect = document.getElementById('reportYear');
        const selectedYear = yearSelect ? Number(yearSelect.value) : new Date().getFullYear();

        const selectedMonthInputs = Array.from(document.querySelectorAll('.month-checkbox'));
        const selectedMonths = selectedMonthInputs.filter(chk => chk.checked).map(chk => Number(chk.value));

        const allMonths = [1,2,3,4,5,6,7,8,9,10,11,12];
        const activeMonths = selectedMonths.length > 0 ? selectedMonths : allMonths;

        const monthNames = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
        const monthColors = ['#ef4444','#3b82f6','#22c55e','#f59e0b','#8b5cf6','#ec4899','#10b981','#0284c7','#f97316','#14b8a6','#f43f5e','#0ea5e9'];

        const isLight = document.body.classList.contains('light-theme');
        const gridColor = isLight ? '#d0d0d0' : '#1e293b';
        const textColor = isLight ? '#1f2937' : '#94a3b8';

        const totalPorMes = Array(12).fill(0);
        this.despesas.forEach(d => {
            if (!d.data) return;
            const dateData = this.parseDate(d.data);
            if (!dateData) return;
            if (dateData.year !== selectedYear) return;
            const valor = parseFloat(d.valor) || 0;
            totalPorMes[dateData.month - 1] += valor;
        });

        const labels = activeMonths.map(m => monthNames[m - 1]);
        const values = activeMonths.map(m => totalPorMes[m - 1]);
        const colors = activeMonths.map(m => monthColors[m - 1]);

        const monthLabelText = activeMonths.length === 12 ? 'Todos os meses' : `Meses selecionados: ${labels.join(', ')}`;
        const titleEl = document.querySelector('.chart-card-large h3');
        const subtitleEl = document.querySelector('.chart-card-large p');
        if (titleEl) titleEl.innerText = 'Comparativo Mensal por Categoria';
        if (subtitleEl) subtitleEl.innerText = `${monthLabelText} | ${selectedYear}`;

        window.myChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: 'Total de Despesas',
                    data: values,
                    backgroundColor: colors,
                    borderColor: colors.map(c => c),
                    borderWidth: 1,
                    borderRadius: 6,
                    maxBarThickness: 48
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: ctx => `${ctx.label}: ${formatarMoeda(ctx.parsed.y)}`
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: gridColor },
                        ticks: { color: textColor, font: { weight: '700' } }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { color: textColor, font: { weight: '700' } }
                    }
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
    },

    parseDate(dateString) {
        if (!dateString) return null;
        dateString = dateString.trim();

        if (dateString.includes('/')) {
            const parts = dateString.split('/');
            if (parts.length === 3) {
                const dia = Number(parts[0]);
                const mes = Number(parts[1]);
                const ano = Number(parts[2]);
                if (!isNaN(dia) && !isNaN(mes) && !isNaN(ano)) {
                    return { day: dia, month: mes, year: ano };
                }
            }
        }

        if (dateString.includes('-')) {
            const parts = dateString.split('-');
            if (parts.length === 3) {
                const ano = Number(parts[0]);
                const mes = Number(parts[1]);
                const dia = Number(parts[2]);
                if (!isNaN(dia) && !isNaN(mes) && !isNaN(ano)) {
                    return { day: dia, month: mes, year: ano };
                }
            }
        }

        const parsed = new Date(dateString);
        if (!isNaN(parsed.getTime())) {
            return { day: parsed.getDate(), month: parsed.getMonth() + 1, year: parsed.getFullYear() };
        }

        return null;
    }
};