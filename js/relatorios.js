import { formatarMoeda, getCycleInfo, getCycleSummariesForYear, getCurrentCycleInfo, getDespesasData } from './common.js';

export const RelatoriosModulo = {
    monthNames: ['Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'],
    monthVisibilidade: Array(12).fill(true),

    init() {
        this.renderizarResumo();
        this.gerarGraficoComparativo();
        this.renderizarRanking();
        this.configurarControleOcultarMeses();
        this.bindResponsiveChart();

        const yearSelect = document.getElementById('reportYear');
        if (yearSelect) {
            yearSelect.onchange = () => {
                this.gerarGraficoComparativo();
                this.renderizarResumo();
                this.renderizarRanking();
                this.configurarControleOcultarMeses();
            };
        }
    },

    isMobileViewport() {
        return window.innerWidth <= 640;
    },

    getMonthLabel(name) {
        if (!this.isMobileViewport()) return name;
        return name.slice(0, 3);
    },

    getSelectedYear() {
        const yearSelect = document.getElementById('reportYear');
        return yearSelect ? Number(yearSelect.value) : new Date().getFullYear();
    },

    getCycleSummaries() {
        return getCycleSummariesForYear(this.getSelectedYear());
    },

    getCycleControlLabels() {
        return this.getCycleSummaries().map((summary) => summary.label);
    },

    getDespesasPorAnoCiclo(year = this.getSelectedYear()) {
        return getDespesasData().filter((despesa) => getCycleInfo(despesa.data).year === year);
    },

    getResumoReferencia(summaries) {
        const currentCycle = getCurrentCycleInfo();
        const selectedYear = this.getSelectedYear();

        if (selectedYear === currentCycle.year) {
            return summaries.find((summary) => summary.id === currentCycle.id) || summaries[0];
        }

        const withData = [...summaries].reverse().find((summary) => summary.totalUtilizado > 0);
        return withData || summaries[summaries.length - 1];
    },

    obterCoresGrafico() {
        const styles = getComputedStyle(document.body);
        const isDark = document.body.classList.contains('dark-theme');

        return {
            textPrimary: styles.getPropertyValue('--text-primary').trim() || (isDark ? '#f8fafc' : '#1f2937'),
            textSecondary: styles.getPropertyValue('--text-secondary').trim() || (isDark ? '#b6c2d0' : '#475569'),
            accent: styles.getPropertyValue('--accent').trim() || (isDark ? '#d4af37' : '#084ca0'),
            accentRgb: styles.getPropertyValue('--accent-rgb').trim() || (isDark ? '212, 175, 55' : '8, 76, 160'),
            xTickInactive: isDark ? 'rgba(182, 194, 208, 0.42)' : 'rgba(71, 85, 105, 0.42)',
            hiddenBar: isDark ? 'rgba(148, 163, 184, 0.18)' : 'rgba(203, 213, 225, 0.35)',
            tooltipBackground: '#0f172a'
        };
    },

    bindResponsiveChart() {
        if (this._responsiveChartBound) return;
        this._responsiveChartBound = true;

        let resizeTimer = null;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = window.setTimeout(() => {
                if (!document.getElementById('comparisonChart')) return;
                this.gerarGraficoComparativo();
                this.atualizarControleOcultarMeses();
            }, 140);
        });
    },

    configurarControleOcultarMeses() {
        const trigger = document.getElementById('monthVisibilityTrigger');
        const popover = document.getElementById('monthVisibilityPopover');
        const list = document.getElementById('monthVisibilityList');
        const control = document.getElementById('monthVisibilityControl');

        if (!trigger || !popover || !list || !control) return;

        const controlLabels = this.getCycleControlLabels();

        list.innerHTML = controlLabels.map((label, index) => `
            <label class="month-visibility-option ${!this.monthVisibilidade[index] ? 'is-hidden' : ''}" data-month-index="${index}">
                <input type="checkbox" class="month-visibility-checkbox" data-month-index="${index}" ${!this.monthVisibilidade[index] ? 'checked' : ''}>
                <span>${label}</span>
            </label>
        `).join('');

        trigger.onclick = (event) => {
            event.stopPropagation();
            if (popover.hasAttribute('hidden')) this.abrirControleOcultarMeses();
            else this.fecharControleOcultarMeses();
        };

        list.querySelectorAll('.month-visibility-checkbox').forEach((checkbox) => {
            checkbox.onchange = () => {
                const index = Number(checkbox.dataset.monthIndex);
                this.monthVisibilidade[index] = !checkbox.checked;
                if (window.myChart) this.atualizarVisibilidadeGrafico(window.myChart);
                else this.atualizarControleOcultarMeses();
            };
        });

        if (!this.handleClickForaControleMeses) {
            this.handleClickForaControleMeses = (event) => {
                const currentControl = document.getElementById('monthVisibilityControl');
                const currentPopover = document.getElementById('monthVisibilityPopover');
                if (!currentControl || !currentPopover || currentPopover.hasAttribute('hidden')) return;
                if (!currentControl.contains(event.target)) this.fecharControleOcultarMeses();
            };
            document.addEventListener('click', this.handleClickForaControleMeses);
        }

        if (!this.handleEscapeControleMeses) {
            this.handleEscapeControleMeses = (event) => {
                if (event.key === 'Escape') this.fecharControleOcultarMeses();
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

        if (count) count.textContent = String(this.monthVisibilidade.filter((visible) => !visible).length);
        if (!list) return;

        list.querySelectorAll('.month-visibility-option').forEach((option) => {
            const index = Number(option.dataset.monthIndex);
            const checkbox = option.querySelector('.month-visibility-checkbox');
            const hidden = !this.monthVisibilidade[index];
            option.classList.toggle('is-hidden', hidden);
            if (checkbox) checkbox.checked = hidden;
        });
    },

    atualizarVisibilidadeGrafico(chart) {
        if (!chart) return;

        const totals = chart.$cycleTotals || [];
        const labels = chart.$cycleLabels || [];
        const monthColors = chart.$monthColors || [];
        const theme = this.obterCoresGrafico();
        const isMobile = this.isMobileViewport();
        const values = totals.map((valor, index) => this.monthVisibilidade[index] ? valor : null);
        const colors = monthColors.map((cor, index) => this.monthVisibilidade[index] ? cor : theme.hiddenBar);
        const visibleValues = values.filter((valor) => valor !== null);
        const maxValue = Math.max(...visibleValues, 0);
        const suggestedMax = this.calcularTetoEscala(maxValue);
        const stepSize = suggestedMax > 0 ? Math.max(1, suggestedMax / 5) : 20;

        chart.data.labels = labels.map((label) => this.getMonthLabel(label));
        chart.data.datasets[0].data = values;
        chart.data.datasets[0].backgroundColor = colors;
        chart.options.scales[isMobile ? 'x' : 'y'].suggestedMax = suggestedMax;
        chart.options.scales[isMobile ? 'x' : 'y'].ticks.stepSize = stepSize;
        chart.update();
        this.atualizarControleOcultarMeses();
    },

    renderizarResumo() {
        const container = document.getElementById('resumoPeriodoContainer');
        if (!container) return;

        const summaries = this.getCycleSummaries();
        const referencia = this.getResumoReferencia(summaries);
        if (!referencia) {
            container.innerHTML = '<div class="empty-state">Nenhum ciclo encontrado.</div>';
            return;
        }

        const mediaDiaria = referencia.totalUtilizado / Math.max(1, this.getDuracaoCiclo(referencia));
        const maiorDespesa = [...referencia.despesas].sort((a, b) => (parseFloat(b.valor) || 0) - (parseFloat(a.valor) || 0))[0];
        const categoriaPrincipal = this.getCategoriaPrincipal(referencia.despesas);
        const saldoInfo = referencia.budget <= 0
            ? 'Sem orçamento definido.'
            : referencia.saldo >= 0
                ? 'Dentro do orçamento.'
                : 'Acima do orçamento.';

        container.innerHTML = `
            <div class="resumo-item">
                <span class="resumo-label">Ciclo</span>
                <h3 class="resumo-value">${referencia.label}</h3>
                <p class="resumo-info">Virada em ${String(referencia.turnDay).padStart(2, '0')}.</p>
            </div>

            <div class="resumo-item">
                <span class="resumo-label">Saldo</span>
                <h3 class="resumo-value">${formatarMoeda(referencia.saldo)}</h3>
                <p class="resumo-info">${saldoInfo}</p>
            </div>

            <div class="resumo-item">
                <span class="resumo-label">Media diaria</span>
                <h3 class="resumo-value">${formatarMoeda(mediaDiaria)}</h3>
                <p class="resumo-info">Uso medio do ciclo.</p>
            </div>

            <div class="resumo-item">
                <span class="resumo-label">Maior gasto</span>
                <h3 class="resumo-value">${maiorDespesa ? formatarMoeda(maiorDespesa.valor) : 'R$ 0,00'}</h3>
                <p class="resumo-info">${maiorDespesa ? maiorDespesa.titulo : 'Sem despesas.'}</p>
            </div>

            <div class="resumo-item">
                <span class="resumo-label">Categoria lider</span>
                <h3 class="resumo-value">${categoriaPrincipal.categoria}</h3>
                <p class="resumo-info">${formatarMoeda(categoriaPrincipal.total)}</p>
            </div>

            <div class="resumo-item">
                <span class="resumo-label">Metas no ciclo</span>
                <h3 class="resumo-value">${formatarMoeda(referencia.totalMetas)}</h3>
                <p class="resumo-info">Aportes registrados.</p>
            </div>
        `;
    },

    gerarGraficoComparativo() {
        const ctx = document.getElementById('comparisonChart');
        if (!ctx) return;
        if (window.myChart) window.myChart.destroy();

        const summaries = this.getCycleSummaries();
        const monthColors = ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#10b981', '#0284c7', '#f97316', '#14b8a6', '#f43f5e', '#0ea5e9'];
        const theme = this.obterCoresGrafico();
        const isMobile = this.isMobileViewport();
        const labels = summaries.map((summary, index) => this.monthNames[index]);
        const totals = summaries.map((summary) => summary.totalUtilizado);
        const visibleValues = totals.filter((_, index) => this.monthVisibilidade[index]);
        const maxValue = Math.max(...visibleValues, 0);
        const suggestedMax = this.calcularTetoEscala(maxValue);
        const stepSize = suggestedMax > 0 ? Math.max(1, suggestedMax / 5) : 20;

        window.myChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels.map((label) => this.getMonthLabel(label)),
                datasets: [{
                    label: 'Uso do ciclo',
                    data: totals.map((value, index) => this.monthVisibilidade[index] ? value : null),
                    backgroundColor: monthColors.map((color, index) => this.monthVisibilidade[index] ? color : theme.hiddenBar),
                    borderWidth: 0,
                    borderRadius: 0,
                    borderSkipped: false,
                    hoverBorderWidth: 0,
                    maxBarThickness: isMobile ? 28 : 54,
                    categoryPercentage: isMobile ? 0.9 : 0.72,
                    barPercentage: isMobile ? 0.72 : 0.82
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: isMobile ? 'y' : 'x',
                layout: {
                    padding: isMobile
                        ? { top: 8, right: 6, bottom: 4, left: 2 }
                        : { top: 12, right: 10, bottom: 0, left: 6 }
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
                            title: (items) => {
                                const item = items?.[0];
                                return item ? summaries[item.dataIndex]?.fullLabel || '' : '';
                            },
                            label: (ctxItem) => {
                                const summary = summaries[ctxItem.dataIndex];
                                return `${summary?.label || ''}: ${formatarMoeda(isMobile ? (ctxItem.parsed.x || 0) : (ctxItem.parsed.y || 0))}`;
                            }
                        }
                    }
                },
                scales: {
                    [isMobile ? 'x' : 'y']: {
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
                            font: { weight: '800', size: isMobile ? 11 : 12 },
                            callback: (value) => this.formatarEixoValor(value)
                        }
                    },
                    [isMobile ? 'y' : 'x']: {
                        grid: { display: false },
                        border: { display: false },
                        ticks: {
                            color: (tickContext) => this.monthVisibilidade[tickContext.index] ? theme.textPrimary : theme.xTickInactive,
                            font: { weight: '700', size: isMobile ? 11 : 12 },
                            padding: 8
                        }
                    }
                }
            }
        });

        window.myChart.$cycleTotals = totals;
        window.myChart.$cycleLabels = labels;
        window.myChart.$monthColors = monthColors;
        this.atualizarControleOcultarMeses();
    },

    renderizarRanking() {
        const container = document.getElementById('rankingGastosContainer');
        if (!container) return;

        const ranking = [...this.getDespesasPorAnoCiclo()]
            .sort((a, b) => (parseFloat(b.valor) || 0) - (parseFloat(a.valor) || 0))
            .slice(0, 5);

        if (!ranking.length) {
            container.innerHTML = '<div class="empty-state">Nenhuma despesa registrada para o periodo.</div>';
            return;
        }

        container.innerHTML = ranking.map((item, index) => {
            const parts = String(item.data || '--').split('-');
            const dataDisplay = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : item.data;

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

    getCategoriaPrincipal(despesas) {
        if (!despesas.length) return { categoria: 'Sem dados', total: 0 };

        return Object.entries(despesas.reduce((acc, despesa) => {
            const categoria = despesa.categoria || 'Outros';
            acc[categoria] = (acc[categoria] || 0) + (parseFloat(despesa.valor) || 0);
            return acc;
        }, {})).sort((left, right) => right[1] - left[1]).map(([categoria, total]) => ({ categoria, total }))[0];
    },

    getDuracaoCiclo(cycleSummary) {
        const diff = cycleSummary.endDate.getTime() - cycleSummary.startDate.getTime();
        return Math.max(1, Math.round(diff / 86400000) + 1);
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
        return (Number(value) || 0).toLocaleString('pt-BR', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        });
    }
};
