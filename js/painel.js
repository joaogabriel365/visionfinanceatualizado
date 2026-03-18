import { formatarMoeda, tratarClasseCategoria } from './common.js';

export const Painel = {
    init() {
        const despesas = JSON.parse(localStorage.getItem('despesas')) || [];
        const limite = parseFloat(localStorage.getItem('budget_total')) || 0;

        this.renderizarCards(despesas, limite);
        this.renderizarTabela(despesas);
        this.gerarGraficoPizza(despesas);    
        this.gerarGraficoBarras(despesas);   
    },

    renderizarCards(despesas, limite) {
        const totalGasto = despesas.reduce((acc, d) => acc + d.valor, 0);
        const saldo = limite - totalGasto;

        document.getElementById('totalGastoText').innerText = formatarMoeda(totalGasto);
        document.getElementById('limiteText').innerText = formatarMoeda(limite);
        
        const saldoEl = document.getElementById('saldoText');
        saldoEl.innerText = formatarMoeda(saldo);
        saldoEl.style.color = saldo < 0 ? '#ef4444' : '#22d3ee';

        const categorias = {};
        despesas.forEach(d => categorias[d.categoria] = (categorias[d.categoria] || 0) + d.valor);
        const principal = Object.keys(categorias).reduce((a, b) => categorias[a] > categorias[b] ? a : b, '---');
        document.getElementById('categoriaPrincipalText').innerText = principal;
    },

    renderizarTabela(despesas) {
        const tbody = document.getElementById('expenseTableBody');
        const ultimas = [...despesas].reverse().slice(0, 5);

        if (ultimas.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 20px; color:#94a3b8;">Nenhuma transação recente.</td></tr>';
            return;
        }

        tbody.innerHTML = ultimas.map(d => `
            <tr>
                <td>${d.titulo}</td>
                <td><span class="category-tag ${tratarClasseCategoria(d.categoria)}">${d.categoria}</span></td>
                <td>${d.pagamento}</td>
                <td><strong style="color: white;">${formatarMoeda(d.valor)}</strong></td>
                <td>${d.data}</td>
            </tr>
        `).join('');
    },

    gerarGraficoPizza(despesas) {
        const instance = Chart.getChart("categoryChart");
        if (instance) instance.destroy();

        const canvas = document.getElementById('categoryChart');
        if (!canvas) return;

        const dadosCat = {};
        // CORREÇÃO AQUI: despesas.forEach em vez de categorias.forEach
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
                plugins: { legend: { position: 'bottom', labels: { color: '#94a3b8' } } }
            }
        });
    },

    gerarGraficoBarras(despesas) {
        const canvas = document.getElementById('paymentChart');
        if (!canvas) return;

        const instance = Chart.getChart("paymentChart");
        if (instance) instance.destroy();

        // 1. Criamos a estrutura padrão para o gráfico não nascer vazio
        const metodos = { 'Crédito': 0, 'Débito': 0, 'VR': 0, 'VA': 0, 'Dinheiro': 0 };
        
        // 2. Só preenchemos se houver despesas
        if (despesas && despesas.length > 0) {
            despesas.forEach(d => {
                // Remove "Cartão de " para bater com as chaves acima
                let chave = d.pagamento.replace('Cartão de ', '').trim();
                
                if (metodos.hasOwnProperty(chave)) {
                    metodos[chave] += d.valor;
                } else {
                    // Se for um método novo (ex: Pix), ele cria a barra na hora
                    metodos[chave] = d.valor;
                }
            });
        }

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
                plugins: { legend: { display: false } },
                scales: {
                    y: { 
                        beginAtZero: true, 
                        grid: { color: 'rgba(255,255,255,0.05)' },
                        ticks: { color: '#64748b' }
                    },
                    x: { 
                        grid: { display: false },
                        ticks: { color: '#64748b' }
                    }
                }
            }
        });
    }
}