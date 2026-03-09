// 1. DADOS DE EXEMPLO (Tabela e Carteiras Iniciais)
const despesasExemplo = [
    { titulo: 'Supermercado', categoria: 'Alimentação', pagamento: 'Cartão de Crédito', valor: 'R$ 350,00', data: '04/03/2026' },
    { titulo: 'Uber', categoria: 'Transporte', pagamento: 'Cartão de Débito', valor: 'R$ 45,00', data: '04/03/2026' },
    { titulo: 'Netflix', categoria: 'Lazer', pagamento: 'Cartão de Crédito', valor: 'R$ 55,90', data: '03/03/2026' },
    { titulo: 'Farmácia', categoria: 'Saúde', pagamento: 'VR', valor: 'R$ 120,00', data: '02/03/2026' }
];

// 2. FUNÇÃO PARA RENDERIZAR AS 4 BOXES DE ESTATÍSTICAS DO PAINEL
function renderizarStats() {
    const statsGrid = document.querySelector('.stats-grid');
    if (!statsGrid) return;

    statsGrid.innerHTML = `
        <div class="stat-card">
            <div class="stat-info">
                <p>Total Gasto</p>
                <h3>R$ 4.250,00</h3>
                <span class="trend down">-12% vs mês anterior</span>
            </div>
            <div class="stat-icon">💰</div>
        </div>
        <div class="stat-card">
            <div class="stat-info">
                <p>Orçamento Mensal</p>
                <h3>R$ 6.000,00</h3>
            </div>
            <div class="stat-icon">📉</div>
        </div>
        <div class="stat-card">
            <div class="stat-info">
                <p>Saldo Restante</p>
                <h3>R$ 1.750,00</h3>
                <span class="trend up">+28% vs mês anterior</span>
            </div>
            <div class="stat-icon">💵</div>
        </div>
        <div class="stat-card">
            <div class="stat-info">
                <p>Mais Usado</p>
                <h3 id="mostUsedMethod">Cartão de Crédito</h3>
                <span class="trend">Últimos 30 dias</span>
            </div>
            <div class="stat-icon">💳</div>
        </div>
    `;
}

// 3. GERENCIAMENTO DE CARTEIRAS (CRIAÇÃO E EXCLUSÃO)
// dashboard.js

// dashboard.js

function criarCardCarteira(id, nome, tipo, limite) {
    const formatador = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
    const card = document.createElement('div');
    card.className = 'wallet-card';
    card.dataset.id = id;

    card.innerHTML = `
        <div class="wallet-top">
            <div style="display: flex; gap: 12px; align-items: center;">
                <div class="wallet-icon-bg">💳</div>
                <div class="wallet-details">
                    <h4>${nome}</h4>
                    <p style="font-size: 0.8rem; color: #94a3b8;">${tipo}</p>
                </div>
            </div>
            <button class="btn-delete-wallet-img" onclick="removerCarteira('${id}')" title="Excluir Carteira">
                <img src="lixeira.png" alt="Excluir" />
            </button>
        </div>
        <div class="wallet-stats" style="margin-top: 15px;">
            <div class="stat-row"><span>Limite</span> <span>${formatador.format(limite)}</span></div>
            <div class="stat-row"><span>Usado</span> <span>R$ 0,00</span></div>
            <div class="progress-bar"><div class="progress-fill" style="width: 0%;"></div></div>
            <div class="stat-row total"><span>Restante</span> <span class="highlight">${formatador.format(limite)}</span></div>
        </div>
    `;
    return card;
}

function removerCarteira(id) {
    const card = document.querySelector(`[data-id="${id}"]`);
    if (card && confirm('Deseja realmente excluir esta carteira?')) {
        card.remove();
    }
}

// 4. NAVEGAÇÃO ENTRE ABAS
function showSection(sectionId) {
    const sections = document.querySelectorAll('.content-section');
    sections.forEach(section => {
        section.style.display = 'none';
        section.classList.remove('active');
    });

    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => item.classList.remove('active'));

    const targetSection = document.getElementById('section-' + sectionId);
    if (targetSection) {
        targetSection.style.display = 'block';
        targetSection.classList.add('active');
        
        const tituloFormatado = sectionId === 'painel' ? 'Painel' : sectionId.charAt(0).toUpperCase() + sectionId.slice(1);
        document.getElementById('sectionTitle').innerText = tituloFormatado;
    }

    const activeNav = document.getElementById('nav-' + sectionId);
    if (activeNav) activeNav.classList.add('active');
}

// 5. INICIALIZAÇÃO AO CARREGAR
document.addEventListener('DOMContentLoaded', () => {
    renderizarStats();

    // Preencher Tabela
    const tableBody = document.getElementById('expenseTableBody');
    if (tableBody) {
        tableBody.innerHTML = despesasExemplo.map(item => `
            <tr>
                <td>${item.titulo}</td>
                <td><span class="tag ${item.categoria.toLowerCase()}">${item.categoria}</span></td>
                <td>${item.pagamento}</td>
                <td><strong>${item.valor}</strong></td>
                <td>${item.data}</td>
            </tr>
        `).join('');
    }

    // Gráfico de Categorias
    const ctxCat = document.getElementById('categoryChart');
    if (ctxCat) {
        new Chart(ctxCat, {
            type: 'doughnut',
            data: {
                labels: ['Alimentação', 'Transporte', 'Moradia', 'Lazer', 'Saúde'],
                datasets: [{
                    data: [1200, 450, 2000, 300, 300],
                    backgroundColor: ['#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899', '#3b82f6'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom', labels: { color: '#fff' } } }
            }
        });
    }

    // Gráfico de Métodos
    const ctxMet = document.getElementById('methodChart');
    if (ctxMet) {
        new Chart(ctxMet, {
            type: 'bar',
            data: {
                labels: ['Crédito', 'Débito', 'VR', 'VA', 'Dinheiro'],
                datasets: [{
                    label: 'Gasto por Método',
                    data: [2100, 1200, 500, 300, 150],
                    backgroundColor: '#22d3ee'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.1)' }, ticks: { color: '#fff' } },
                    x: { ticks: { color: '#fff' } }
                },
                plugins: { legend: { display: false } }
            }
        });
    }
});

// 6. MODAL E FORMULÁRIO DE CARTEIRAS
const modal = document.getElementById('walletModal');
const btnOpen = document.getElementById('btnNewWallet');
const btnClose = document.getElementById('closeWallet');

if (btnOpen) btnOpen.addEventListener('click', () => modal.classList.add('active'));
if (btnClose) btnClose.addEventListener('click', () => modal.classList.remove('active'));

window.onclick = (event) => {
    if (event.target == modal) modal.classList.remove('active');
};

const walletForm = document.getElementById('walletForm');
if (walletForm) {
    walletForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const name = document.getElementById('walletName').value;
        const type = document.getElementById('walletType').value;
        const limit = parseFloat(document.getElementById('walletLimit').value);
        const grid = document.getElementById('walletsGrid');

        if (grid) {
            const idUnico = 'wallet_' + Date.now();
            const novoCard = criarCardCarteira(idUnico, name, type, limit);
            grid.appendChild(novoCard);
        }

        modal.classList.remove('active');
        this.reset();
    });
}