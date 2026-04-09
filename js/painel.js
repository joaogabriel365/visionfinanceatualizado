import { formatarMoeda, getCategoryBadgeStyle, getCurrentFinancialSnapshot, getThemeVar } from './common.js';

export const Painel = {
    init() {
        const snapshot = getCurrentFinancialSnapshot();
        const despesas = snapshot.despesas;
        const metas = snapshot.metas;
        const limite = snapshot.budget;
        const ocultarAtivo = localStorage.getItem('visionFinance_olhoOculto') === 'true';

        const badge = document.getElementById('dataAtualBadge');
        if (badge) badge.innerText = `Ciclo ${snapshot.cycleInfo.label}`;

        this.renderizarCards(despesas, metas, limite);
        this.renderizarTabelaHoje(despesas);
        this.gerarGraficoPizza(despesas, ocultarAtivo);    
        this.gerarGraficoBarras(despesas, ocultarAtivo);
        this.melhorarBotaoOlho();
    },

    renderizarCards(despesas, metas, limite) {
        // CORREÇÃO CÁLCULO: Soma despesas + total guardado em metas
        const totalDespesas = despesas.reduce((acc, d) => acc + d.valor, 0);
        const totalMetas = metas.reduce((acc, m) => acc + (parseFloat(m.guardado) || 0), 0);
        
        const totalGasto = totalDespesas + totalMetas;
        const saldo = limite - totalGasto;

        const totalEl = document.getElementById('totalGastoText');
        const limiteEl = document.getElementById('limiteText');
        const saldoEl = document.getElementById('saldoText');
        const metodoEl = document.getElementById('metodoPrincipalText');

        if (totalEl) totalEl.innerText = formatarMoeda(totalGasto);
        if (limiteEl) limiteEl.innerText = formatarMoeda(limite);
        
        if (saldoEl) {
            saldoEl.innerText = formatarMoeda(saldo);
            saldoEl.style.color = saldo < 0 ? '#ef4444' : getThemeVar('--accent');
        }

        if (metodoEl) {
            if (despesas.length > 0) {
                const contagem = {};
                despesas.forEach(d => contagem[d.pagamento] = (contagem[d.pagamento] || 0) + 1);
                metodoEl.innerText = Object.keys(contagem).reduce((a, b) => contagem[a] > contagem[b] ? a : b);
            } else {
                metodoEl.innerText = "---";
            }
        }
    },

    renderizarTabelaHoje(despesas) {
        const tbody = document.getElementById('expenseTableBody');
        if (!tbody) return;

        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);

        const despesasHoje = despesas.filter(d => {
            if (!d.data) return false;
            const data = new Date(`${d.data}T00:00:00`);
            data.setHours(0, 0, 0, 0);
            return data.getTime() === hoje.getTime();
        }).reverse();

        if (despesasHoje.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 30px; color:#94a3b8;">Nenhuma despesa para hoje.</td></tr>`;
            return;
        }

        tbody.innerHTML = despesasHoje.map(d => {
            const cor = getCategoryBadgeStyle(d.categoria);
            return `
            <tr>
                <td class="expense-col-title">${d.titulo}</td>
                <td class="expense-col-category">
                    <span class="category-tag category-tag-strong" style="--tag-bg:${cor.bg}; --tag-text:${cor.text}; --tag-border:${cor.border};">
                        ${d.categoria}
                    </span>
                </td>
                <td class="expense-col-payment">${d.pagamento}</td>
                <td class="expense-col-value"><strong>${formatarMoeda(d.valor)}</strong></td>
                <td class="expense-col-date">${d.data.includes('-') ? d.data.split('-').reverse().join('/') : d.data}</td>
            </tr>`;
        }).join('');
    },

    melhorarBotaoOlho() {
        const btn = document.getElementById('btnToggleOlho');
        if (!btn) return;

        const atualizarIcone = () => {
            const ativo = localStorage.getItem('visionFinance_olhoOculto') === 'true';
            btn.style.color = ativo ? getThemeVar('--text-secondary') : getThemeVar('--accent');
            btn.innerHTML = ativo ? 
                `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>` : 
                `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
        };

        btn.addEventListener('click', () => {
            setTimeout(atualizarIcone, 50); // Delay para garantir o localStorage
        });
        atualizarIcone();
    },

    gerarGraficoPizza(despesas, ocultarAtivo) {
        const canvas = document.getElementById('categoryChart');
        if (!canvas) return;
        const instance = Chart.getChart("categoryChart");
        if (instance) instance.destroy();
        const dadosCat = {};
        despesas.forEach(d => dadosCat[d.categoria] = (dadosCat[d.categoria] || 0) + d.valor);

        const coresCategoria = {
            'Alimentação': '#f59e0b',
            'Transporte': '#3b82f6',
            'Lazer': '#ec4899',
            'Saúde': '#10b981',
            'Moradia': '#8b5cf6',
            'Moda': '#c084fc',
            'Outros': '#94a3b8'
        };

        const categories = Object.keys(dadosCat);
        const values = Object.values(dadosCat);
        const backgroundColor = categories.map(cat => coresCategoria[cat] || '#c9aa6a');

        new Chart(canvas, {
            type: 'doughnut',
            data: {
                labels: categories,
                datasets: [{
                    data: values,
                    backgroundColor: backgroundColor,
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%',
                plugins: {
                    legend: { position: 'bottom', labels: { color: '#bfa877' } },
                    tooltip: { enabled: !ocultarAtivo }
                }
            }
        });
    },

    gerarGraficoBarras(despesas, ocultarAtivo) {
        const canvas = document.getElementById('paymentChart');
        if (!canvas) return;
        const instance = Chart.getChart("paymentChart");
        if (instance) instance.destroy();
        const accentColor = getThemeVar('--accent') || '#0b63ce';
        const accentSoft = getThemeVar('--accent-soft') || 'rgba(11, 99, 206, 0.12)';
        const textSecondary = getThemeVar('--text-secondary') || '#475569';
        const borderColor = getThemeVar('--border-color') || '#d6e2ef';
        const metodos = { 'Crédito': 0, 'Débito': 0, 'Pix': 0, 'VR': 0, 'VA': 0, 'Dinheiro': 0 };   
        despesas.forEach(d => {
            let chave = d.pagamento.replace('Cartão de ', '').trim();
            if (chave.toLowerCase() === 'pix') chave = 'Pix';
            if (metodos.hasOwnProperty(chave)) metodos[chave] += d.valor;
        });
        new Chart(canvas, {
            type: 'bar',
            data: {
                labels: Object.keys(metodos),
                datasets: [{
                    label: 'Total por Método',
                    data: Object.values(metodos),
                    backgroundColor: accentColor,
                    borderColor: accentColor,
                    borderWidth: 1,
                    borderRadius: 4,
                    barPercentage: 0.72,
                    categoryPercentage: 0.85,
                    borderSkipped: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { 
                    legend: { display: false },
                    tooltip: { enabled: !ocultarAtivo }
                },
                scales: {
                    y: { 
                        beginAtZero: true, 
                        grid: { color: accentSoft },
                        ticks: { display: !ocultarAtivo, color: textSecondary }
                    },
                    x: { grid: { display: false }, ticks: { color: textSecondary }, border: { display: true, color: borderColor } }
                },
                layout: {
                    padding: { left: 6, right: 6, top: 8, bottom: 6 }
                }
            }
        });
    }
};