import { formatarMoeda, tratarClasseCategoria, getHojeFormatado } from './common.js';

export const Painel = {
    init() {
        const despesas = JSON.parse(localStorage.getItem('despesas')) || [];
        const limite = parseFloat(localStorage.getItem('budget_total')) || 0;
        const hoje = getHojeFormatado();
        const ocultarAtivo = localStorage.getItem('visionFinance_olhoOculto') === 'true';

        const badge = document.getElementById('dataAtualBadge');
        if (badge) badge.innerText = hoje;

        this.renderizarCards(despesas, limite);
        this.renderizarTabelaHoje(despesas, hoje);
        this.gerarGraficoPizza(despesas, ocultarAtivo);    
        this.gerarGraficoBarras(despesas, ocultarAtivo);   
    },

    renderizarCards(despesas, limite) {
        const totalGasto = despesas.reduce((acc, d) => acc + d.valor, 0);
        const saldo = limite - totalGasto;

        const totalEl = document.getElementById('totalGastoText');
        const limiteEl = document.getElementById('limiteText');
        const saldoEl = document.getElementById('saldoText');
        const metodoEl = document.getElementById('metodoPrincipalText');

        if (totalEl) totalEl.innerText = formatarMoeda(totalGasto);
        if (limiteEl) limiteEl.innerText = formatarMoeda(limite);
        
        if (saldoEl) {
            saldoEl.innerText = formatarMoeda(saldo);
            saldoEl.style.color = saldo < 0 ? '#ef4444' : '#22d3ee';
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

    renderizarTabelaHoje(despesas, hoje) {
        const tbody = document.getElementById('expenseTableBody');
        if (!tbody) return;
        
        const despesasHoje = despesas.filter(d => {
            if (!d.data) return false;
            let dataFormatada = d.data.includes('-') ? d.data.split('-').reverse().join('/') : d.data;
            return dataFormatada === hoje;
        }).reverse();

        if (despesasHoje.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 30px; color:#94a3b8;">Nenhuma despesa para hoje.</td></tr>`;
            return;
        }

        tbody.innerHTML = despesasHoje.map(d => `
            <tr>
                <td>${d.titulo}</td>
                <td><span class="category-tag ${tratarClasseCategoria(d.categoria)}">${d.categoria}</span></td>
                <td>${d.pagamento}</td>
                <td><strong style="color: white;">${formatarMoeda(d.valor)}</strong></td>
                <td>${d.data.includes('-') ? d.data.split('-').reverse().join('/') : d.data}</td>
            </tr>`).join('');
    },

    gerarGraficoPizza(despesas, ocultarAtivo) {
        const canvas = document.getElementById('categoryChart');
        if (!canvas) return;

        const instance = Chart.getChart("categoryChart");
        if (instance) instance.destroy();

        const dadosCat = {};
        despesas.forEach(d => dadosCat[d.categoria] = (dadosCat[d.categoria] || 0) + d.valor);

        new Chart(canvas, {
            type: 'doughnut',
            data: {
                labels: Object.keys(dadosCat),
                datasets: [{
                    data: Object.values(dadosCat),
                    backgroundColor: ['#f59e0b', '#8b5cf6', '#22d3ee', '#ec4899', '#3b82f6'],
                    borderWidth: 0
                }]
            },
            options: { 
                responsive: true, 
                maintainAspectRatio: false,
                cutout: '70%',
                plugins: { 
                    legend: { position: 'bottom', labels: { color: '#94a3b8' } },
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

        const metodos = { 'Crédito': 0, 'Débito': 0, 'VR': 0, 'VA': 0, 'Dinheiro': 0 };
        despesas.forEach(d => {
            let chave = d.pagamento.replace('Cartão de ', '').trim();
            if (metodos.hasOwnProperty(chave)) metodos[chave] += d.valor;
        });

        new Chart(canvas, {
            type: 'bar',
            data: {
                labels: Object.keys(metodos),
                datasets: [{
                    label: 'Total por Método',
                    data: Object.values(metodos),
                    backgroundColor: '#22d3ee',
                    borderRadius: 4
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
                        grid: { color: 'rgba(255,255,255,0.05)' },
                        ticks: { display: !ocultarAtivo, color: '#64748b' }
                    },
                    x: { grid: { display: false }, ticks: { color: '#64748b' } }
                }
            }
        });
    }
};