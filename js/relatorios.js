import { formatarMoeda } from './common.js';

export const RelatoriosModulo = {
    // Busca dados atualizados do localStorage
    get despesas() {
        return JSON.parse(localStorage.getItem('despesas')) || [];
    },

    monthNames: ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'],
    monthVisibilidade: Array(12).fill(true),

    isMobileViewport() {
        return window.innerWidth <= 640;
    },

    getMonthLabel(name) {
        if (!this.isMobileViewport()) return name;
        return name.slice(0, 3);
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
        this.bindResponsiveChart();

        const yearSelect = document.getElementById('reportYear');

        const refresh = () => {
            this.gerarGraficoComparativo();
            this.renderizarResumo();
            this.renderizarRanking();
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

        const selectedYear = this.getSelectedYear();
        const despesasAno = this.getDespesasPorAno(selectedYear);
        const limiteMensal = parseFloat(localStorage.getItem('budget_total')) || 0;
        const mesReferencia = this.getMesReferenciaResumo(selectedYear, despesasAno);
        const contextoResumo = this.getContextoResumo(selectedYear, mesReferencia);

        const despesasMes = despesasAno.filter((despesa) => {
            const parsed = this.parseDate(despesa.data);
            return parsed && parsed.month === mesReferencia;
        });

        const totalMes = despesasMes.reduce((acc, despesa) => acc + (parseFloat(despesa.valor) || 0), 0);
        const economiaMes = limiteMensal - totalMes;
        const percentualEconomia = limiteMensal > 0
            ? Math.round((Math.abs(economiaMes) / limiteMensal) * 100)
            : 0;

        const mediaDiariaDados = this.calcularMediaDiaria(selectedYear, despesasAno);
        const diaMaisGasto = this.calcularDiaMaisGasto(despesasAno);
        const categoriaEmAlta = this.calcularCategoriaEmAlta(selectedYear, mesReferencia);

        const economiaInfo = limiteMensal <= 0
            ? `Sem orçamento definido em ${contextoResumo.label}`
            : economiaMes >= 0
                ? `${percentualEconomia}% do orçamento livre em ${contextoResumo.label}`
                : `${percentualEconomia}% acima do orçamento em ${contextoResumo.label}`;

        const diaMaisGastoValor = diaMaisGasto ? formatarMoeda(diaMaisGasto.total) : 'R$ 0,00';
        const diaMaisGastoInfo = diaMaisGasto
            ? `${diaMaisGasto.dataLabel} - ${diaMaisGasto.weekday}`
            : `Sem despesas registradas em ${selectedYear}`;

        const categoriaAltaTitulo = categoriaEmAlta?.categoria || 'Sem dados';
        const categoriaAltaInfo = categoriaEmAlta?.descricao || `Sem comparação disponível em ${contextoResumo.label}`;

        container.innerHTML = `
            <div class="resumo-item">
                <span class="resumo-label">Economia do Mês</span>
                <h3 class="resumo-value">${formatarMoeda(economiaMes)}</h3>
                <p class="resumo-info">${economiaInfo}</p>
            </div>

            <div class="resumo-item">
                <span class="resumo-label">Média Diária</span>
                <h3 class="resumo-value">${formatarMoeda(mediaDiariaDados.media)}</h3>
                <p class="resumo-info">${mediaDiariaDados.descricao}</p>
            </div>

            <div class="resumo-item">
                <span class="resumo-label">Dia com Mais Gasto</span>
                <h3 class="resumo-value">${diaMaisGastoValor}</h3>
                <p class="resumo-info">${diaMaisGastoInfo}</p>
            </div>

            <div class="resumo-item">
                <span class="resumo-label">Categoria em Alta</span>
                <h3 class="resumo-value">${categoriaAltaTitulo}</h3>
                <p class="resumo-info ${categoriaEmAlta?.emAlta ? 'highlight' : ''}">${categoriaAltaInfo}</p>
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
        const isMobile = this.isMobileViewport();
        const chartLabels = monthNames.map((name) => this.getMonthLabel(name));

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
                labels: chartLabels,
                datasets: [{
                    label: 'Total de Despesas',
                    data: values,
                    backgroundColor: colors,
                    borderColor: monthColors,
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
                                if (!item) return '';
                                return monthNames[item.dataIndex] || item.label;
                            },
                            label: (ctx) => `${monthNames[ctx.dataIndex] || ctx.label}: ${formatarMoeda(isMobile ? (ctx.parsed.x || 0) : (ctx.parsed.y || 0))}`
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

        const ranking = [...this.getDespesasPorAno(this.getSelectedYear())]
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
    },

    getSelectedYear() {
        const yearSelect = document.getElementById('reportYear');
        return yearSelect ? Number(yearSelect.value) : new Date().getFullYear();
    },

    getDespesasPorAno(year) {
        return this.despesas.filter((despesa) => {
            const parsed = this.parseDate(despesa.data);
            return parsed && parsed.year === year;
        });
    },

    getMesReferenciaResumo(selectedYear, despesasAno) {
        const hoje = new Date();

        if (selectedYear === hoje.getFullYear()) {
            return hoje.getMonth() + 1;
        }

        const mesesComDados = despesasAno
            .map((despesa) => this.parseDate(despesa.data))
            .filter(Boolean)
            .map((parsed) => parsed.month);

        if (!mesesComDados.length) {
            return 1;
        }

        return Math.max(...mesesComDados);
    },

    getContextoResumo(year, month) {
        const monthName = this.monthNames[month - 1] || 'Mês';
        return {
            year,
            month,
            label: `${monthName} de ${year}`,
            shortMonth: monthName.slice(0, 3).toLowerCase()
        };
    },

    calcularMediaDiaria(selectedYear, despesasAno) {
        if (!despesasAno.length) {
            return {
                media: 0,
                descricao: `Sem despesas nos últimos 30 dias de ${selectedYear}`
            };
        }

        const datasOrdenadas = despesasAno
            .map((despesa) => this.parseDateToObject(despesa.data))
            .filter(Boolean)
            .sort((a, b) => a - b);

        const dataFinal = selectedYear === new Date().getFullYear()
            ? new Date()
            : datasOrdenadas[datasOrdenadas.length - 1];

        const inicioJanela = new Date(dataFinal);
        inicioJanela.setHours(0, 0, 0, 0);
        inicioJanela.setDate(inicioJanela.getDate() - 29);

        const totalJanela = despesasAno.reduce((acc, despesa) => {
            const data = this.parseDateToObject(despesa.data);
            if (!data) return acc;
            if (data < inicioJanela || data > dataFinal) return acc;
            return acc + (parseFloat(despesa.valor) || 0);
        }, 0);

        return {
            media: totalJanela / 30,
            descricao: `Últimos 30 dias até ${this.formatDate(dataFinal)}`
        };
    },

    calcularDiaMaisGasto(despesasAno) {
        if (!despesasAno.length) return null;

        const totaisPorDia = despesasAno.reduce((acc, despesa) => {
            const parsed = this.parseDate(despesa.data);
            if (!parsed) return acc;
            const chave = `${String(parsed.day).padStart(2, '0')}/${String(parsed.month).padStart(2, '0')}/${parsed.year}`;
            acc[chave] = (acc[chave] || 0) + (parseFloat(despesa.valor) || 0);
            return acc;
        }, {});

        const [dataLabel, total] = Object.entries(totaisPorDia)
            .sort((a, b) => b[1] - a[1])[0] || [];

        if (!dataLabel) return null;

        const data = this.parseDateToObject(dataLabel);

        return {
            dataLabel,
            total,
            weekday: data
                ? new Intl.DateTimeFormat('pt-BR', { weekday: 'long' }).format(data)
                    .replace(/^./, (char) => char.toUpperCase())
                : ''
        };
    },

    calcularCategoriaEmAlta(selectedYear, mesReferencia) {
        const contextoAtual = { year: selectedYear, month: mesReferencia };
        const contextoAnterior = mesReferencia === 1
            ? { year: selectedYear - 1, month: 12 }
            : { year: selectedYear, month: mesReferencia - 1 };

        const totaisAtuais = this.agruparTotaisCategoriaPorMes(contextoAtual.year, contextoAtual.month);
        const totaisAnteriores = this.agruparTotaisCategoriaPorMes(contextoAnterior.year, contextoAnterior.month);
        const categoriasAtuais = Object.entries(totaisAtuais);

        if (!categoriasAtuais.length) {
            return null;
        }

        const crescimento = categoriasAtuais
            .map(([categoria, totalAtual]) => {
                const totalAnterior = totaisAnteriores[categoria] || 0;
                if (totalAnterior <= 0 || totalAtual <= totalAnterior) return null;
                return {
                    categoria,
                    emAlta: true,
                    percentual: Math.round(((totalAtual - totalAnterior) / totalAnterior) * 100),
                    descricao: `↑ ${Math.round(((totalAtual - totalAnterior) / totalAnterior) * 100)}% em relação a ${this.monthNames[contextoAnterior.month - 1].slice(0, 3).toLowerCase()}`
                };
            })
            .filter(Boolean)
            .sort((a, b) => b.percentual - a.percentual);

        if (crescimento.length) {
            return crescimento[0];
        }

        const [categoriaTop] = categoriasAtuais.sort((a, b) => b[1] - a[1])[0];
        return {
            categoria: categoriaTop,
            emAlta: false,
            descricao: `Maior volume em ${this.monthNames[mesReferencia - 1].slice(0, 3).toLowerCase()}`
        };
    },

    agruparTotaisCategoriaPorMes(year, month) {
        return this.despesas.reduce((acc, despesa) => {
            const parsed = this.parseDate(despesa.data);
            if (!parsed || parsed.year !== year || parsed.month !== month) return acc;
            const categoria = despesa.categoria || 'Outros';
            acc[categoria] = (acc[categoria] || 0) + (parseFloat(despesa.valor) || 0);
            return acc;
        }, {});
    },

    parseDateToObject(dateString) {
        const parsed = this.parseDate(dateString);
        if (!parsed) return null;
        return new Date(parsed.year, parsed.month - 1, parsed.day, 12, 0, 0, 0);
    },

    formatDate(date) {
        if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '--/--/----';
        return new Intl.DateTimeFormat('pt-BR').format(date);
    }
};