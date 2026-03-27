import { formatarMoeda, tratarClasseCategoria, getHojeFormatado } from './common.js';

export const Painel = {
    init() {
        const despesas = JSON.parse(localStorage.getItem('despesas')) || [];
        const metas = JSON.parse(localStorage.getItem('metas')) || []; // Puxar metas para o cálculo
        const limite = parseFloat(localStorage.getItem('budget_total')) || 0;
        const hoje = getHojeFormatado();
        const ocultarAtivo = localStorage.getItem('visionFinance_olhoOculto') === 'true';

        const badge = document.getElementById('dataAtualBadge');
        if (badge) badge.innerText = hoje;

        this.renderizarCards(despesas, metas, limite); // Passando metas agora
        this.renderizarTabelaHoje(despesas, hoje);
        this.gerarGraficoPizza(despesas, ocultarAtivo);    
        this.gerarGraficoBarras(despesas, ocultarAtivo);
        this.melhorarBotaoOlho(); // Adicionado para nitidez
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
        
        // Cores padrões usadas no módulo de despesas
        // Dentro de renderizarTabelaHoje(despesas, hoje)
const coresFixo = {
    'Alimentação': { bg: 'rgba(245, 158, 11, 0.15)', text: '#fbbf24' },
    'Transporte': { bg: 'rgba(59, 130, 246, 0.15)', text: '#60a5fa' },
    'Lazer': { bg: 'rgba(236, 72, 153, 0.15)', text: '#f472b6' },
    'Saúde': { bg: 'rgba(16, 185, 129, 0.15)', text: '#34d399' },
    'Moradia': { bg: 'rgba(139, 92, 246, 0.15)', text: '#a78bfa' },
    'Moda': { bg: 'rgba(168, 85, 247, 0.15)', text: '#c084fc' }, // Adicionado
    'Outros': { bg: 'rgba(100, 116, 139, 0.15)', text: '#94a3b8' }  // Adicionado
};

        const despesasHoje = despesas.filter(d => {
            if (!d.data) return false;
            let dataFormatada = d.data.includes('-') ? d.data.split('-').reverse().join('/') : d.data;
            return dataFormatada === hoje;
        }).reverse();

        if (despesasHoje.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 30px; color:#94a3b8;">Nenhuma despesa para hoje.</td></tr>`;
            return;
        }

        tbody.innerHTML = despesasHoje.map(d => {
            const cor = coresFixo[d.categoria] || { bg: 'rgba(148, 163, 184, 0.1)', text: '#94a3b8' };
            return `
            <tr>
                <td>${d.titulo}</td>
                <td>
                    <span style="background:${cor.bg}; color:${cor.text}; padding: 4px 10px; border-radius: 6px; font-size: 10px; font-weight: 700; text-transform: uppercase;">
                        ${d.categoria}
                    </span>
                </td>
                <td>${d.pagamento}</td>
                <td><strong style="color: white;">${formatarMoeda(d.valor)}</strong></td>
                <td>${d.data.includes('-') ? d.data.split('-').reverse().join('/') : d.data}</td>
            </tr>`;
        }).join('');
    },

    melhorarBotaoOlho() {
        const btn = document.getElementById('btnToggleOlho');
        if (!btn) return;

        const atualizarIcone = () => {
            const ativo = localStorage.getItem('visionFinance_olhoOculto') === 'true';
            // SVG em alta resolução substituindo a imagem de baixa qualidade
            btn.innerHTML = ativo ? 
                `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>` : 
                `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
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
        new Chart(canvas, {
            type: 'doughnut',
            data: {
                labels: Object.keys(dadosCat),
                datasets: [{
    data: Object.values(dadosCat),
    // Adicionei #c084fc (Moda) e #64748b (Outros) ao final da lista
    backgroundColor: ['#f59e0b', '#8b5cf6', '#22d3ee', '#ec4899', '#3b82f6', '#c084fc', '#64748b'],
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