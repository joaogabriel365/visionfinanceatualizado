import { formatarMoeda } from './common.js';

export const RelatoriosModulo = {
    // Busca dados atualizados do localStorage
    get despesas() {
        return JSON.parse(localStorage.getItem('despesas')) || [];
    },

    monthVisibilidade: Array(12).fill(true),

    init() {
        this.renderizarResumo();
        this.gerarGraficoComparativo();
        this.renderizarRanking();

        const yearSelect = document.getElementById('reportYear');

        const refresh = () => {
            this.gerarGraficoComparativo();
            this.renderizarResumo();
        };

        if (yearSelect) {
            yearSelect.addEventListener('change', refresh);
        }
        // Botões de mostrar/ocultar todos os meses removidos
    },

    criarFiltroMeses() {
        const monthFilterContainer = document.getElementById('monthFilterContainer');
        if (!monthFilterContainer) return;

        const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

        monthFilterContainer.innerHTML = monthNames.map((name, index) => {
            return `
                <label style="cursor:pointer; display:flex; align-items:center; gap: 6px; border: 1px solid #d1d5db; border-radius: 8px; padding: 6px 8px; background: #f8fafc; color: #1f2937; font-size: 0.8rem;">
                    <input class="month-checkbox" type="checkbox" value="${index + 1}" checked style="accent-color: var(--accent);">
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

        const monthNames = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
        const monthColors = ['#ef4444','#3b82f6','#22c55e','#f59e0b','#8b5cf6','#ec4899','#10b981','#0284c7','#f97316','#14b8a6','#f43f5e','#0ea5e9'];

        const totalPorMes = Array(12).fill(0);
        this.despesas.forEach(d => {
            if (!d.data) return;
            const dateData = this.parseDate(d.data);
            if (!dateData) return;
            if (dateData.year !== selectedYear) return;
            const valor = parseFloat(d.valor) || 0;
            totalPorMes[dateData.month - 1] += valor;
        });

        const values = totalPorMes.map((valor, index) => this.monthVisibilidade[index] ? valor : null);
        const colors = monthNames.map((_, index) => (this.monthVisibilidade[index] ? monthColors[index] : 'rgba(203, 213, 225, 0.35)'));
        const visibleValues = values.filter((valor) => valor !== null);
        const maxValue = Math.max(...visibleValues, 0);
        const suggestedMax = this.calcularTetoEscala(maxValue);
        const stepSize = suggestedMax > 0 ? Math.max(1, suggestedMax / 5) : 20;

        window.myChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: monthNames,
                datasets: [{
                    label: 'Total de Despesas',
                    data: values,
                    backgroundColor: colors,
                    borderColor: monthColors,
                    borderWidth: 0,
                    borderRadius: 12,
                    borderSkipped: false,
                    hoverBorderWidth: 0,
                    maxBarThickness: 54,
                    categoryPercentage: 0.72,
                    barPercentage: 0.82
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                layout: {
                    padding: { top: 12, right: 10, bottom: 0, left: 6 }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: '#0f172a',
                        titleColor: '#ffffff',
                        bodyColor: '#e2e8f0',
                        padding: 12,
                        cornerRadius: 12,
                        displayColors: false,
                        callbacks: {
                            label: ctx => `${ctx.label}: ${formatarMoeda(ctx.parsed.y || 0)}`
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        suggestedMax,
                        grid: {
                            color: 'rgba(8, 76, 160, 0.12)',
                            drawBorder: false
                        },
                        border: { display: false },
                        ticks: {
                            stepSize,
                            padding: 10,
                            color: '#0b5fc2',
                            font: { weight: '800', size: 12 },
                            callback: (value) => this.formatarEixoValor(value)
                        }
                    },
                    x: {
                        grid: { display: false },
                        border: { display: false },
                        ticks: {
                            color: '#1f2937',
                            font: { weight: '700', size: 12 },
                            padding: 8
                        }
                    }
                }
            }
        });

        this.gerarControlesMeses();
    },

    gerarControlesMeses() {
        const container = document.getElementById('monthToggleButtons');
        if (!container) return;

        const monthNames = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

        container.innerHTML = monthNames.map((name, index) => {
            const active = this.monthVisibilidade[index];
            return `
                <button class="${active ? 'active' : ''}" data-month="${index}" aria-pressed="${active}">
                    <span>${name}</span>
                </button>
            `;
        }).join('');

        container.querySelectorAll('button').forEach(btn => {
            btn.addEventListener('click', (evt) => {
                const idx = Number(btn.getAttribute('data-month'));
                this.monthVisibilidade[idx] = !this.monthVisibilidade[idx];
                btn.classList.toggle('active', this.monthVisibilidade[idx]);
                btn.setAttribute('aria-pressed', this.monthVisibilidade[idx]);
                this.gerarGraficoComparativo();
                evt.preventDefault();
            });
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
    },

    calcularTetoEscala(maxValue) {
        if (maxValue <= 0) return 1000;

        const roughStep = maxValue / 5;
        const magnitude = 10 ** Math.floor(Math.log10(roughStep || 1));
        const normalized = roughStep / magnitude;

        let niceNormalized = 1;
        if (normalized > 1 && normalized <= 2) niceNormalized = 2;
        else if (normalized > 2 && normalized <= 5) niceNormalized = 5;
        else if (normalized > 5) niceNormalized = 10;

        const niceStep = niceNormalized * magnitude;
        return Math.ceil(maxValue / niceStep) * niceStep;
    },

    formatarEixoValor(value) {
        const numero = Number(value) || 0;
        return numero.toLocaleString('pt-BR', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        });
    }
};