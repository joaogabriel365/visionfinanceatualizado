import { formatarMoeda } from './common.js';

export const RelatoriosModulo = {
    // Busca dados atualizados do localStorage
    get despesas() {
        return JSON.parse(localStorage.getItem('despesas')) || [];
    },

    monthNames: ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'],
    monthVisibilidade: Array(12).fill(true),

    obterCoresGrafico() {
        const styles = getComputedStyle(document.body);
        const isDark = document.body.classList.contains('dark-theme');

        return {
            textPrimary: styles.getPropertyValue('--text-primary').trim() || (isDark ? '#f8fafc' : '#1f2937'),
            textSecondary: styles.getPropertyValue('--text-secondary').trim() || (isDark ? '#b6c2d0' : '#475569'),
            accent: styles.getPropertyValue('--accent').trim() || (isDark ? '#d4af37' : '#084ca0'),
            accentRgb: styles.getPropertyValue('--accent-rgb').trim() || (isDark ? '212, 175, 55' : '8, 76, 160'),
            xTickInactive: isDark ? 'rgba(182, 194, 208, 0.42)' : 'rgba(71, 85, 105, 0.42)',
            xTickHover: isDark ? 'rgba(212, 175, 55, 0.95)' : 'rgba(8, 76, 160, 0.92)',
            hiddenBar: isDark ? 'rgba(148, 163, 184, 0.18)' : 'rgba(203, 213, 225, 0.35)',
            tooltipBackground: isDark ? '#0f172a' : '#0f172a'
        };
    },

    atualizarVisibilidadeGrafico(chart) {
        if (!chart) return;

        const totais = chart.$monthlyTotals || [];
        const monthColors = chart.$monthColors || [];
        const theme = this.obterCoresGrafico();
        const values = totais.map((valor, index) => this.monthVisibilidade[index] ? valor : null);
        const colors = monthColors.map((cor, index) => this.monthVisibilidade[index] ? cor : theme.hiddenBar);
        const visibleValues = values.filter((valor) => valor !== null);
        const maxValue = Math.max(...visibleValues, 0);
        const suggestedMax = this.calcularTetoEscala(maxValue);
        const stepSize = suggestedMax > 0 ? Math.max(1, suggestedMax / 5) : 20;

        chart.data.datasets[0].data = values;
        chart.data.datasets[0].backgroundColor = colors;
        chart.options.scales.y.suggestedMax = suggestedMax;
        chart.options.scales.y.ticks.stepSize = stepSize;
        chart.update();
        this.atualizarControleOcultarMeses();
    },

    alternarVisibilidadeMes(index, chart) {
        this.monthVisibilidade[index] = !this.monthVisibilidade[index];
        this.atualizarVisibilidadeGrafico(chart);
    },

    init() {
        this.renderizarResumo();
        this.gerarGraficoComparativo();
        this.renderizarRanking();
        this.configurarControleOcultarMeses();

        const yearSelect = document.getElementById('reportYear');

        const refresh = () => {
            this.gerarGraficoComparativo();
            this.renderizarResumo();
            this.atualizarControleOcultarMeses();
        };

        if (yearSelect) {
            yearSelect.onchange = refresh;
        }
    },

    configurarControleOcultarMeses() {
        const trigger = document.getElementById('monthVisibilityTrigger');
        const popover = document.getElementById('monthVisibilityPopover');
        const list = document.getElementById('monthVisibilityList');
        const control = document.getElementById('monthVisibilityControl');

        if (!trigger || !popover || !list || !control) return;

        list.innerHTML = this.monthNames.map((name, index) => `
            <label class="month-visibility-option ${!this.monthVisibilidade[index] ? 'is-hidden' : ''}" data-month-index="${index}">
                <input type="checkbox" class="month-visibility-checkbox" data-month-index="${index}" ${!this.monthVisibilidade[index] ? 'checked' : ''}>
                <span>${name}</span>
            </label>
        `).join('');

        trigger.onclick = (event) => {
            event.stopPropagation();
            const isOpen = !popover.hasAttribute('hidden');
            if (isOpen) this.fecharControleOcultarMeses();
            else this.abrirControleOcultarMeses();
        };

        list.querySelectorAll('.month-visibility-checkbox').forEach((checkbox) => {
            checkbox.onchange = () => {
                const index = Number(checkbox.dataset.monthIndex);
                this.monthVisibilidade[index] = !checkbox.checked;
                const chart = window.myChart;
                if (chart) {
                    this.atualizarVisibilidadeGrafico(chart);
                } else {
                    this.atualizarControleOcultarMeses();
                }
            };
        });

        if (!this.handleClickForaControleMeses) {
            this.handleClickForaControleMeses = (event) => {
                const currentControl = document.getElementById('monthVisibilityControl');
                const currentPopover = document.getElementById('monthVisibilityPopover');
                if (!currentControl || !currentPopover || currentPopover.hasAttribute('hidden')) return;
                if (!currentControl.contains(event.target)) {
                    this.fecharControleOcultarMeses();
                }
            };
            document.addEventListener('click', this.handleClickForaControleMeses);
        }

        if (!this.handleEscapeControleMeses) {
            this.handleEscapeControleMeses = (event) => {
                if (event.key === 'Escape') {
                    this.fecharControleOcultarMeses();
                }
            };
            document.addEventListener('keydown', this.handleEscapeControleMeses);
        }

        this.atualizarControleOcultarMeses();
    },

    abrirControleOcultarMeses() {
        const trigger = document.getElementById('monthVisibilityTrigger');
        const popover = document.getElementById('monthVisibilityPopover');
        if (!trigger || !popover) return;

        popover.removeAttribute('hidden');
        trigger.setAttribute('aria-expanded', 'true');
    },

    fecharControleOcultarMeses() {
        const trigger = document.getElementById('monthVisibilityTrigger');
        const popover = document.getElementById('monthVisibilityPopover');
        if (!trigger || !popover) return;

        popover.setAttribute('hidden', '');
        trigger.setAttribute('aria-expanded', 'false');
    },

    atualizarControleOcultarMeses() {
        const count = document.getElementById('monthVisibilityCount');
        const list = document.getElementById('monthVisibilityList');
        if (count) {
            count.textContent = String(this.monthVisibilidade.filter((visible) => !visible).length);
        }

        if (!list) return;

        list.querySelectorAll('.month-visibility-option').forEach((option) => {
            const index = Number(option.dataset.monthIndex);
            const checkbox = option.querySelector('.month-visibility-checkbox');
            const hidden = !this.monthVisibilidade[index];
            option.classList.toggle('is-hidden', hidden);
            if (checkbox) checkbox.checked = hidden;
        });
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

        const monthNames = this.monthNames;
        const monthColors = ['#ef4444','#3b82f6','#22c55e','#f59e0b','#8b5cf6','#ec4899','#10b981','#0284c7','#f97316','#14b8a6','#f43f5e','#0ea5e9'];
        const theme = this.obterCoresGrafico();

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
        const colors = monthNames.map((_, index) => (this.monthVisibilidade[index] ? monthColors[index] : theme.hiddenBar));
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
                    borderRadius: 0,
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
                        backgroundColor: theme.tooltipBackground,
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
                            color: `rgba(${theme.accentRgb}, 0.12)`,
                            drawBorder: false
                        },
                        border: { display: false },
                        ticks: {
                            stepSize,
                            padding: 10,
                            color: theme.accent,
                            font: { weight: '800', size: 12 },
                            callback: (value) => this.formatarEixoValor(value)
                        }
                    },
                    x: {
                        grid: { display: false },
                        border: { display: false },
                        ticks: {
                            color: (tickContext) => this.monthVisibilidade[tickContext.index] ? theme.textPrimary : theme.xTickInactive,
                            font: { weight: '700', size: 12 },
                            padding: 8
                        }
                    }
                }
            }
        });

        window.myChart.$monthlyTotals = totalPorMes;
        window.myChart.$monthColors = monthColors;
        this.atualizarControleOcultarMeses();
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