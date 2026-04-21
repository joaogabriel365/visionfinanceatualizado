import { formatarMoeda, getCycleInfo, getCycleSummariesForYear, getCurrentCycleInfo, getDespesasData } from './common.js';

export const RelatoriosModulo = {
    monthNames: ['Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'],
    monthVisibilidade: Array(12).fill(true),

    init() {
        this.popularFiltroAnos();
        this.renderizarOverview();
        this.renderizarResumo();
        this.updateChartContainerMetrics();
        this.gerarGraficoComparativo();
        this.renderizarInsights();
        this.renderizarRanking();
        this.configurarControleOcultarMeses();
        this.bindResponsiveChart();
        this.scheduleChartResize();

        const yearSelect = document.getElementById('reportYear');
        if (yearSelect) {
            yearSelect.onchange = () => {
                this.renderizarOverview();
                this.gerarGraficoComparativo();
                this.renderizarInsights();
                this.renderizarResumo();
                this.renderizarRanking();
                this.configurarControleOcultarMeses();
            };
        }
    },

    obterAnosDisponiveis() {
        return [...new Set(
            this.getDespesasPorAnoCicloTodos()
                .map((despesa) => this.getAnoDespesa(despesa))
                .filter((ano) => Number.isInteger(ano) && ano >= 1900 && ano <= 2100)
                .map((ano) => String(ano))
        )].sort((left, right) => Number(right) - Number(left));
    },

    getAnoDespesa(despesa) {
        if (!despesa?.data) return null;

        try {
            return getCycleInfo(despesa.data).year;
        } catch {
            return null;
        }
    },

    popularFiltroAnos(anoSelecionado = null) {
        const yearSelect = document.getElementById('reportYear');
        if (!yearSelect) return;

        const anosDisponiveis = this.obterAnosDisponiveis();
        const valorAtual = String(anoSelecionado || yearSelect.value || '');
        const fallbackYear = anosDisponiveis[0] || String(new Date().getFullYear());
        const valorSelecionado = anosDisponiveis.includes(valorAtual) ? valorAtual : fallbackYear;

        yearSelect.innerHTML = anosDisponiveis.length
            ? anosDisponiveis.map((ano) => `<option value="${ano}">${ano}</option>`).join('')
            : `<option value="${fallbackYear}">${fallbackYear}</option>`;

        yearSelect.value = valorSelecionado;
        yearSelect.disabled = anosDisponiveis.length <= 1;
    },

    isMobileViewport() {
        return window.innerWidth <= 640;
    },

    getChartViewportProfile() {
        const container = document.querySelector('.reports-chart-container');
        const width = container?.clientWidth || window.innerWidth;

        return {
            width,
            isCompact: width <= 420,
            isNarrow: width <= 640,
            isMedium: width <= 920,
            useHorizontalBars: width <= 760,
            labelFontSize: width <= 420 ? 10 : width <= 640 ? 11 : 12,
            valueFontSize: width <= 420 ? 10 : width <= 760 ? 11 : 12,
            maxBarThickness: width <= 420 ? 18 : width <= 640 ? 22 : width <= 760 ? 26 : width <= 1100 ? 38 : 52,
            categoryPercentage: width <= 420 ? 0.86 : width <= 760 ? 0.82 : 0.72,
            barPercentage: width <= 420 ? 0.66 : width <= 760 ? 0.72 : 0.82,
            layoutPadding: width <= 420
                ? { top: 6, right: 4, bottom: 2, left: 0 }
                : width <= 760
                    ? { top: 8, right: 8, bottom: 4, left: 2 }
                    : { top: 12, right: 12, bottom: 2, left: 8 }
        };
    },

    updateChartContainerMetrics(profile = this.getChartViewportProfile()) {
        const container = document.querySelector('.reports-chart-container');
        if (!container) return profile;

        const cycleCount = Math.max(this.getCycleSummaries().length, 1);
        let nextHeight = 380;

        if (profile.useHorizontalBars) {
            const rowHeight = profile.isCompact ? 28 : profile.isNarrow ? 30 : 32;
            const baseHeight = profile.isCompact ? 124 : 132;
            nextHeight = baseHeight + (cycleCount * rowHeight);
            nextHeight = Math.max(profile.isCompact ? 336 : 360, Math.min(nextHeight, profile.isCompact ? 520 : 540));
        } else if (profile.isMedium) {
            nextHeight = 360;
        } else {
            nextHeight = 400;
        }

        container.style.setProperty('--reports-chart-height', `${nextHeight}px`);
        return profile;
    },

    refreshResponsiveChartLayout(forceRegenerate = false) {
        const profile = this.updateChartContainerMetrics();
        const layoutKey = [
            profile.useHorizontalBars ? 'horizontal' : 'vertical',
            profile.labelFontSize,
            profile.valueFontSize,
            profile.maxBarThickness,
            profile.categoryPercentage,
            profile.barPercentage,
            profile.width <= 420 ? 'compact' : profile.width <= 760 ? 'narrow' : profile.width <= 920 ? 'medium' : 'wide'
        ].join(':');

        if (forceRegenerate || this._lastChartLayoutKey !== layoutKey) {
            this._lastChartLayoutKey = layoutKey;
            this.gerarGraficoComparativo();
            return;
        }

        if (!window.myChart) return;
        window.myChart.resize();
        window.myChart.update('none');
        this.atualizarControleOcultarMeses();
    },

    getMonthLabel(name) {
        if (!this.isMobileViewport()) return name;
        return name.slice(0, 3);
    },

    getSelectedYear() {
        const yearSelect = document.getElementById('reportYear');
        return yearSelect ? Number(yearSelect.value) : new Date().getFullYear();
    },

    getDespesasPorAnoCicloTodos() {
        return getDespesasData();
    },

    getCycleSummaries() {
        return getCycleSummariesForYear(this.getSelectedYear());
    },

    getCycleControlLabels() {
        return this.getCycleSummaries().map((summary) => summary.label);
    },

    getDespesasPorAnoCiclo(year = this.getSelectedYear()) {
        return this.getDespesasPorAnoCicloTodos().filter((despesa) => getCycleInfo(despesa.data).year === year);
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
            tooltipBackground: styles.getPropertyValue('--bg-surface').trim() || (isDark ? '#0b1118' : '#f8f4ee'),
            tooltipTitle: styles.getPropertyValue('--text-primary').trim() || (isDark ? '#f8fafc' : '#0f172a'),
            tooltipBody: styles.getPropertyValue('--text-secondary').trim() || (isDark ? '#b6c2d0' : '#475569'),
            tooltipBorder: `rgba(${styles.getPropertyValue('--accent-rgb').trim() || (isDark ? '212, 175, 55' : '8, 76, 160')}, 0.24)`
        };
    },

    bindResponsiveChart() {
        if (!this._scheduleResponsiveRefresh) {
            let resizeTimer = null;
            this._scheduleResponsiveRefresh = (forceRegenerate = false) => {
                clearTimeout(resizeTimer);
                resizeTimer = window.setTimeout(() => {
                    if (!document.getElementById('comparisonChart')) return;
                    this.refreshResponsiveChartLayout(forceRegenerate);
                }, 140);
            };
        }

        if (!this._responsiveChartBound) {
            this._responsiveChartBound = true;
            window.addEventListener('resize', () => this._scheduleResponsiveRefresh(false));
            window.addEventListener('orientationchange', () => this._scheduleResponsiveRefresh(true));

            if (window.visualViewport) {
                window.visualViewport.addEventListener('resize', () => this._scheduleResponsiveRefresh(true));
            }
        }

        if (this._reportsResizeObserver) {
            this._reportsResizeObserver.disconnect();
            this._reportsResizeObserver = null;
        }

        if ('ResizeObserver' in window) {
            const observedCard = document.querySelector('.chart-card-large');
            if (observedCard) {
                this._reportsResizeObserver = new ResizeObserver(() => this._scheduleResponsiveRefresh(false));
                this._reportsResizeObserver.observe(observedCard);
            }
        }
    },

    scheduleChartResize() {
        if (this._chartResizeFrame) {
            window.cancelAnimationFrame(this._chartResizeFrame);
        }

        this._chartResizeFrame = window.requestAnimationFrame(() => {
            this._chartResizeFrame = window.requestAnimationFrame(() => {
                const chart = window.myChart;
                if (!chart) return;
                chart.resize();
                chart.update('none');
            });
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

        const profile = this.updateChartContainerMetrics();
        const totals = chart.$cycleTotals || [];
        const labels = chart.$cycleLabels || [];
        const monthColors = chart.$monthColors || [];
        const theme = this.obterCoresGrafico();
        const isHorizontal = profile.useHorizontalBars;
        const values = totals.map((valor, index) => this.monthVisibilidade[index] ? valor : null);
        const colors = monthColors.map((cor, index) => this.monthVisibilidade[index] ? cor : theme.hiddenBar);
        const visibleValues = values.filter((valor) => valor !== null);
        const maxValue = Math.max(...visibleValues, 0);
        const suggestedMax = this.calcularTetoEscala(maxValue);
        const stepSize = suggestedMax > 0 ? Math.max(1, suggestedMax / 5) : 20;

        chart.data.labels = labels.map((label) => this.getMonthLabel(label));
        chart.data.datasets[0].data = values;
        chart.data.datasets[0].backgroundColor = colors;
        chart.options.scales[isHorizontal ? 'x' : 'y'].suggestedMax = suggestedMax;
        chart.options.scales[isHorizontal ? 'x' : 'y'].ticks.stepSize = stepSize;
        chart.update();
        this.atualizarControleOcultarMeses();
        this.renderizarOverview();
        this.renderizarInsights();
    },

    getVisibleCycleSummaries() {
        return this.getCycleSummaries().filter((_, index) => this.monthVisibilidade[index]);
    },

    updateReportCycleChip(visibleCount = this.getVisibleCycleSummaries().length, totalCount = this.getCycleSummaries().length) {
        const chip = document.getElementById('reportCycleCountChip');
        if (!chip) return;
        chip.textContent = `${visibleCount}/${totalCount} ciclos visíveis`;
    },

    renderizarOverview() {
        const container = document.getElementById('reportsOverviewMetrics');
        if (!container) return;

        const summaries = this.getCycleSummaries();
        const visibleSummaries = this.getVisibleCycleSummaries();

        if (!summaries.length) {
            container.innerHTML = '<div class="empty-state">Nenhum dado disponível para compor a visão executiva.</div>';
            this.updateReportCycleChip(0, 0);
            return;
        }

        const effectiveSummaries = visibleSummaries.length ? visibleSummaries : summaries;
        const totalUtilizado = effectiveSummaries.reduce((acc, summary) => acc + (Number(summary.totalUtilizado) || 0), 0);
        const totalMetas = effectiveSummaries.reduce((acc, summary) => acc + (Number(summary.totalMetas) || 0), 0);
        const mediaPorCiclo = totalUtilizado / Math.max(effectiveSummaries.length, 1);
        const peakCycle = effectiveSummaries.reduce((highest, summary) => (summary.totalUtilizado > highest.totalUtilizado ? summary : highest), effectiveSummaries[0]);
        const latestSummary = effectiveSummaries[effectiveSummaries.length - 1];
        const previousSummary = effectiveSummaries[effectiveSummaries.length - 2];
        const trendLabel = this.getTrendLabel(latestSummary?.totalUtilizado || 0, previousSummary?.totalUtilizado || 0);
        const hiddenCount = summaries.length - visibleSummaries.length;
        const cards = [
            {
                label: 'Volume anual',
                value: formatarMoeda(totalUtilizado),
                meta: hiddenCount > 0 ? `${hiddenCount} ciclo(s) oculto(s)` : 'Leitura completa do ano'
            },
            {
                label: 'Média por ciclo',
                value: formatarMoeda(mediaPorCiclo),
                meta: `${effectiveSummaries.length} ciclo(s) considerados`
            },
            {
                label: 'Maior concentração',
                value: peakCycle?.label || 'Sem dados',
                meta: peakCycle ? formatarMoeda(peakCycle.totalUtilizado) : 'Sem movimentação'
            },
            {
                label: 'Metas registradas',
                value: formatarMoeda(totalMetas),
                meta: trendLabel
            }
        ];

        container.innerHTML = cards.map((card) => `
            <article class="reports-overview-card">
                <span class="reports-overview-label">${card.label}</span>
                <strong class="reports-overview-value">${card.value}</strong>
                <span class="reports-overview-meta">${card.meta}</span>
            </article>
        `).join('');

        this.updateReportCycleChip(visibleSummaries.length || summaries.length, summaries.length);
    },

    getTrendLabel(currentValue, previousValue) {
        if (!previousValue && !currentValue) return 'Sem movimento relevante';
        if (!previousValue && currentValue > 0) return 'Primeiro ciclo com movimentação';

        const diff = currentValue - previousValue;
        const ratio = previousValue > 0 ? (diff / previousValue) * 100 : 100;

        if (Math.abs(diff) < 0.01) return 'Estável em relação ao ciclo anterior';
        if (diff > 0) return `${ratio.toFixed(0)}% acima do ciclo anterior`;
        return `${Math.abs(ratio).toFixed(0)}% abaixo do ciclo anterior`;
    },

    buildMotionLinePath(points) {
        if (!points.length) return '';
        if (points.length === 1) return `M${points[0].x} ${points[0].y}`;

        let path = `M${points[0].x} ${points[0].y}`;

        for (let index = 0; index < points.length - 1; index += 1) {
            const previous = points[index - 1] || points[index];
            const current = points[index];
            const next = points[index + 1];
            const afterNext = points[index + 2] || next;
            const controlPointOneX = current.x + ((next.x - previous.x) / 6);
            const controlPointOneY = current.y + ((next.y - previous.y) / 6);
            const controlPointTwoX = next.x - ((afterNext.x - current.x) / 6);
            const controlPointTwoY = next.y - ((afterNext.y - current.y) / 6);

            path += ` C${controlPointOneX.toFixed(2)} ${controlPointOneY.toFixed(2)} ${controlPointTwoX.toFixed(2)} ${controlPointTwoY.toFixed(2)} ${next.x} ${next.y}`;
        }

        return path;
    },

    buildMotionAreaPath(points, baseline) {
        if (!points.length) return '';
        const linePath = this.buildMotionLinePath(points);
        const first = points[0];
        const last = points[points.length - 1];
        return `${linePath} L${last.x} ${baseline} L${first.x} ${baseline} Z`;
    },

    buildMotionVisualData(visibleSummaries) {
        const width = 760;
        const height = 240;
        const frame = {
            x: 24,
            y: 18,
            width: 712,
            height: 198
        };
        const orbitRadius = 24;
        const orbitNodeRadius = 5;
        const pulseRadiusX = 28;
        const pulseRadiusY = 14;
        const latestPulseRadiusX = 24;
        const latestPulseRadiusY = 12;
        const pointMaxRadius = 4.5;
        const pointScaleMax = 1.18;
        const orbitScaleMax = 1.12;
        const pulseScaleMax = 1.18;
        const maxOrbitReachX = orbitRadius + (orbitNodeRadius * orbitScaleMax) + 4;
        const maxOrbitReachY = orbitRadius + (orbitNodeRadius * orbitScaleMax) + 4;
        const maxPeakReachX = Math.max(maxOrbitReachX, pulseRadiusX * pulseScaleMax);
        const maxPeakReachY = Math.max(maxOrbitReachY, pulseRadiusY * pulseScaleMax);
        const maxLatestReachX = latestPulseRadiusX * pulseScaleMax;
        const maxLatestReachY = latestPulseRadiusY * pulseScaleMax;
        const maxPointReach = (pointMaxRadius * pointScaleMax) + 4;
        const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
        const left = frame.x + maxPeakReachX + 10;
        const right = (frame.x + frame.width) - Math.max(maxPeakReachX, maxLatestReachX, maxPointReach) - 10;
        const top = frame.y + maxPeakReachY + 10;
        const baseline = (frame.y + frame.height) - Math.max(maxLatestReachY, maxPointReach) - 10;
        const usableHeight = baseline - top;
        const summaries = visibleSummaries.length ? visibleSummaries : [{ label: 'Sem dados', totalUtilizado: 0 }];
        const values = summaries.map((summary) => Number(summary.totalUtilizado) || 0);
        const maxValue = Math.max(...values, 1);
        const segment = (right - left) / Math.max(summaries.length, 1);
        const barWidth = Math.max(14, Math.min(28, segment * 0.42));
        const pointMinY = top + maxPointReach;
        const pointMaxY = baseline - maxPointReach;

        const points = summaries.map((summary, index) => {
            const value = Number(summary.totalUtilizado) || 0;
            const rawX = left + (segment * index) + (segment / 2);
            const normalized = maxValue > 0 ? value / maxValue : 0;
            const rawY = baseline - (normalized * usableHeight);
            const x = clamp(rawX, left + maxPointReach, right - maxPointReach);
            const y = clamp(rawY, pointMinY, pointMaxY);

            return {
                label: summary.label,
                value,
                x: Number(x.toFixed(2)),
                y: Number(y.toFixed(2))
            };
        });

        const bars = points.map((point, index) => {
            const heightValue = Math.max(6, baseline - point.y);
            return {
                x: Number((point.x - (barWidth / 2)).toFixed(2)),
                y: Number((baseline - heightValue).toFixed(2)),
                width: Number(barWidth.toFixed(2)),
                height: Number(heightValue.toFixed(2)),
                delay: `${(index * 0.12).toFixed(2)}s`
            };
        });

        const peakPoint = points.reduce((highest, point) => point.value > highest.value ? point : highest, points[0]);
        const latestPoint = points[points.length - 1];
        const peakAnchor = {
            x: Number(clamp(peakPoint.x, frame.x + maxPeakReachX + 8, frame.x + frame.width - maxPeakReachX - 8).toFixed(2)),
            y: Number(clamp(peakPoint.y, frame.y + maxPeakReachY + 8, frame.y + frame.height - maxPeakReachY - 8).toFixed(2))
        };
        const latestAnchor = {
            x: Number(clamp(latestPoint.x, frame.x + maxLatestReachX + 8, frame.x + frame.width - maxLatestReachX - 8).toFixed(2)),
            y: Number(clamp(latestPoint.y, frame.y + maxLatestReachY + 8, frame.y + frame.height - maxLatestReachY - 8).toFixed(2))
        };
        const hazeCenterY = Number(clamp(latestAnchor.y + 32, frame.y + 24, frame.y + frame.height - 20).toFixed(2));

        return {
            width,
            height,
            frame,
            left,
            right,
            top,
            baseline,
            orbitRadius,
            orbitNodeRadius,
            pulseRadiusX,
            pulseRadiusY,
            latestPulseRadiusX,
            latestPulseRadiusY,
            points,
            bars,
            linePath: this.buildMotionLinePath(points),
            areaPath: this.buildMotionAreaPath(points, baseline),
            peakPoint,
            latestPoint,
            peakAnchor,
            latestAnchor,
            hazeCenterY
        };
    },

    renderizarInsights() {
        const container = document.getElementById('reportsInsightsContainer');
        if (!container) return;
        const year = this.getSelectedYear();
        const visibleSummaries = this.getVisibleCycleSummaries();

        if (!visibleSummaries.length) {
            container.innerHTML = '<div class="empty-state">Todos os ciclos estao ocultos. Reative pelo menos um para visualizar o painel animado.</div>';
            return;
        }

        const motion = this.buildMotionVisualData(visibleSummaries);
        const gridLines = Array.from({ length: 4 }, (_, index) => Number((motion.top + (((motion.baseline - motion.top) / 3) * index)).toFixed(2)));

        container.innerHTML = `
            <section class="reports-motion-panel" aria-label="Painel visual animado dos relatórios de ${year}">
                <div class="reports-motion-header">
                    <div>
                        <span class="reports-motion-kicker">Visual em movimento</span>
                        <h4>Ritmo financeiro do ano</h4>
                    </div>
                    <div class="reports-motion-year-badge">${year}</div>
                </div>

                <div class="reports-motion-scene">
                    <div class="reports-motion-glow reports-motion-glow-a" aria-hidden="true"></div>
                    <div class="reports-motion-glow reports-motion-glow-b" aria-hidden="true"></div>

                    <svg class="reports-motion-svg" viewBox="0 0 760 240" role="img" aria-label="Composição visual animada representando a evolução financeira do período">
                        <defs>
                            <clipPath id="reportsMotionFrameClip">
                                <rect x="${motion.frame.x}" y="${motion.frame.y}" width="${motion.frame.width}" height="${motion.frame.height}" rx="20"></rect>
                            </clipPath>
                            <linearGradient id="reportsMotionStroke" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stop-color="rgba(255,255,255,0.14)" />
                                <stop offset="42%" stop-color="var(--accent)" />
                                <stop offset="100%" stop-color="rgba(255,255,255,0.28)" />
                            </linearGradient>
                            <linearGradient id="reportsMotionFill" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stop-color="rgba(var(--accent-rgb), 0.26)" />
                                <stop offset="100%" stop-color="rgba(var(--accent-rgb), 0.02)" />
                            </linearGradient>
                            <filter id="reportsMotionLineGlow" x="-10%" y="-20%" width="120%" height="140%">
                                <feGaussianBlur stdDeviation="3.6" result="blur"></feGaussianBlur>
                                <feMerge>
                                    <feMergeNode in="blur"></feMergeNode>
                                    <feMergeNode in="SourceGraphic"></feMergeNode>
                                </feMerge>
                            </filter>
                            <filter id="reportsMotionBlur">
                                <feGaussianBlur stdDeviation="12" />
                            </filter>
                        </defs>

                        <g clip-path="url(#reportsMotionFrameClip)">
                            <g class="reports-motion-grid" aria-hidden="true">
                                ${gridLines.map((y) => `<line x1="${motion.left}" y1="${y}" x2="${motion.right}" y2="${y}"></line>`).join('')}
                                <line class="reports-motion-baseline" x1="${motion.left}" y1="${motion.baseline}" x2="${motion.right}" y2="${motion.baseline}"></line>
                            </g>

                            <path class="reports-motion-area" d="${motion.areaPath}"></path>
                            <path class="reports-motion-line-shadow" d="${motion.linePath}"></path>
                            <path class="reports-motion-line" d="${motion.linePath}" filter="url(#reportsMotionLineGlow)"></path>

                            <g class="reports-motion-bars" aria-hidden="true">
                                ${motion.bars.map((bar) => `<rect class="bar" x="${bar.x}" y="${bar.y}" width="${bar.width}" height="${bar.height}" rx="10" style="animation-delay:${bar.delay}"></rect>`).join('')}
                            </g>

                            <g class="reports-motion-orbit" aria-hidden="true">
                                <circle class="orbit-path" cx="${motion.peakAnchor.x}" cy="${motion.peakAnchor.y}" r="${motion.orbitRadius}"></circle>
                                <circle class="orbit-node orbit-node-a" cx="${motion.peakAnchor.x + motion.orbitRadius}" cy="${motion.peakAnchor.y}" r="${motion.orbitNodeRadius}"></circle>
                                <circle class="orbit-node orbit-node-b" cx="${motion.peakAnchor.x}" cy="${motion.peakAnchor.y - motion.orbitRadius}" r="${motion.orbitNodeRadius}"></circle>
                            </g>

                            <g class="reports-motion-points" aria-hidden="true">
                                ${motion.points.map((point) => `<circle cx="${point.x}" cy="${point.y}" r="${point.value === motion.peakPoint.value ? 4.5 : 3.5}"></circle>`).join('')}
                            </g>

                            <ellipse class="reports-motion-pulse" cx="${motion.peakAnchor.x}" cy="${motion.peakAnchor.y}" rx="${motion.pulseRadiusX}" ry="${motion.pulseRadiusY}"></ellipse>
                            <ellipse class="reports-motion-pulse reports-motion-pulse-delay" cx="${motion.latestAnchor.x}" cy="${motion.latestAnchor.y}" rx="${motion.latestPulseRadiusX}" ry="${motion.latestPulseRadiusY}"></ellipse>
                            <ellipse class="reports-motion-haze" cx="${motion.latestAnchor.x}" cy="${motion.hazeCenterY}" rx="62" ry="14" filter="url(#reportsMotionBlur)"></ellipse>
                        </g>
                    </svg>

                    <div class="reports-motion-floating-card reports-motion-floating-card-a" aria-hidden="true">
                        <span></span>
                        <span></span>
                        <span></span>
                    </div>
                    <div class="reports-motion-floating-card reports-motion-floating-card-b" aria-hidden="true">
                        <span></span>
                        <span></span>
                    </div>
                </div>
            </section>
        `;
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
        const profile = this.updateChartContainerMetrics();
        const isHorizontal = profile.useHorizontalBars;
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
                    maxBarThickness: profile.maxBarThickness,
                    categoryPercentage: profile.categoryPercentage,
                    barPercentage: profile.barPercentage
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: isHorizontal ? 'y' : 'x',
                layout: {
                    padding: profile.layoutPadding
                },
                animation: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: theme.tooltipBackground,
                        titleColor: theme.tooltipTitle,
                        bodyColor: theme.tooltipBody,
                        borderColor: theme.tooltipBorder,
                        borderWidth: 1,
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
                                return `${summary?.label || ''}: ${formatarMoeda(isHorizontal ? (ctxItem.parsed.x || 0) : (ctxItem.parsed.y || 0))}`;
                            }
                        }
                    }
                },
                scales: {
                    [isHorizontal ? 'x' : 'y']: {
                        beginAtZero: true,
                        suggestedMax,
                        grid: {
                            color: `rgba(${theme.accentRgb}, 0.12)`,
                            drawBorder: false
                        },
                        border: { display: false },
                        ticks: {
                            stepSize,
                            maxTicksLimit: profile.isCompact ? 4 : 6,
                            padding: profile.isCompact ? 6 : 10,
                            color: theme.accent,
                            font: { weight: '800', size: profile.valueFontSize },
                            callback: (value) => this.formatarEixoValor(value)
                        }
                    },
                    [isHorizontal ? 'y' : 'x']: {
                        grid: { display: false },
                        border: { display: false },
                        ticks: {
                            autoSkip: false,
                            color: (tickContext) => this.monthVisibilidade[tickContext.index] ? theme.textPrimary : theme.xTickInactive,
                            font: { weight: '700', size: profile.labelFontSize },
                            padding: profile.isCompact ? 6 : 8,
                            maxRotation: 0,
                            minRotation: 0
                        }
                    }
                }
            }
        });

        window.myChart.$cycleTotals = totals;
        window.myChart.$cycleLabels = labels;
        window.myChart.$monthColors = monthColors;
        this.updateReportCycleChip(visibleValues.length, totals.length);
        this.atualizarControleOcultarMeses();
        this.scheduleChartResize();
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
                <div class="ranking-row ${index === 0 ? 'is-primary' : index < 3 ? 'is-featured' : ''}">
                    <div class="row-left">
                        <div class="rank-number">${String(index + 1).padStart(2, '0')}</div>
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
