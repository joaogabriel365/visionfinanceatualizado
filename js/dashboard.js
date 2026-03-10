// 1. DADOS DE EXEMPLO
const despesasExemplo = [
    { titulo: 'Supermercado', categoria: 'Alimentação', pagamento: 'Cartão de Crédito', valor: 350.00, data: '10/03/2026', observacao: '' },
    { titulo: 'Uber', categoria: 'Transporte', pagamento: 'Cartão de Débito', valor: 45.00, data: '10/03/2026', observacao: '' },
    { titulo: 'Netflix', categoria: 'Lazer', pagamento: 'Cartão de Crédito', valor: 55.90, data: '09/03/2026', observacao: '' },
    { titulo: 'Farmácia', categoria: 'Saúde', pagamento: 'VR', valor: 120.00, data: '08/03/2026', observacao: '' }
];

// Funções auxiliares
const formatarMoeda = (valor) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
};

const tratarClasseCategoria = (cat) => {
    return cat.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s/g, '-');
};

function getHojeFormatado() {
    const hoje = new Date();
    return hoje.toLocaleDateString('pt-BR');
}

// Limita o texto da observação
function truncarTexto(texto, limite = 150) {
    if (!texto) return '-';
    if (texto.length <= limite) return texto;
    return texto.slice(0, limite) + '...';
}

// --- FUNÇÕES DE MÁSCARA ---

function aplicarMascaraValor(input) {
    let value = input.value.replace(/\D/g, ''); 
    if (value.length > 8) value = value.slice(0, 8); 
    
    let valorFloat = (parseFloat(value) / 100).toFixed(2);
    
    if (isNaN(valorFloat)) {
        input.value = "";
    } else {
        input.value = new Intl.NumberFormat('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(valorFloat);
    }
}

function aplicarMascaraData(input) {
    let v = input.value.replace(/\D/g, ''); 
    if (v.length > 8) v = v.slice(0, 8); 
    
    if (v.length >= 5) {
        v = v.replace(/^(\d{2})(\d{2})(\d{0,4})/, "$1/$2/$3");
    } else if (v.length >= 3) {
        v = v.replace(/^(\d{2})(\d{0,2})/, "$1/$2");
    }
    input.value = v;
}

// 2. ESTATÍSTICAS E GRÁFICOS
function renderizarStats() {
    const statsGrid = document.querySelector('.stats-grid');
    if (!statsGrid) return;
    statsGrid.innerHTML = `
        <div class="stat-card">
            <div class="stat-info"><p>Total Gasto</p><h3>R$ 4.250,00</h3><span class="trend down">-12% vs mês anterior</span></div>
            <div class="stat-icon">💰</div>
        </div>
        <div class="stat-card">
            <div class="stat-info"><p>Orçamento Mensal</p><h3>R$ 6.000,00</h3></div>
            <div class="stat-icon">📉</div>
        </div>
        <div class="stat-card">
            <div class="stat-info"><p>Saldo Restante</p><h3>R$ 1.750,00</h3><span class="trend up">+28% vs mês anterior</span></div>
            <div class="stat-icon">💵</div>
        </div>
        <div class="stat-card">
            <div class="stat-info"><p>Mais Usado</p><h3>Cartão de Crédito</h3><span class="trend">Últimos 30 dias</span></div>
            <div class="stat-icon">💳</div>
        </div>`;
}

function inicializarGraficos() {
    const ctxCat = document.getElementById('categoryChart');
    if (ctxCat) {
        new Chart(ctxCat, {
            type: 'doughnut',
            data: {
                labels: ['Alimentação', 'Transporte', 'Moradia', 'Lazer', 'Saúde', 'Outros'],
                datasets: [{
                    data: [1200, 450, 2000, 300, 300, 100],
                    backgroundColor: ['#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899', '#3b82f6', '#94a3b8'],
                    borderWidth: 0
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: '#fff' } } } }
        });
    }

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
                responsive: true, maintainAspectRatio: false,
                scales: { 
                    y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.1)' }, ticks: { color: '#fff' } },
                    x: { ticks: { color: '#fff' } }
                },
                plugins: { legend: { display: false } }
            }
        });
    }
}

// 3. RENDERIZAÇÃO DE TABELAS
function renderizarTabelas() {
    const tableBodyPainel = document.getElementById('expenseTableBody');
    const tableBodyCompleta = document.getElementById('fullExpenseTableBody');
    const hoje = getHojeFormatado();

    despesasExemplo.sort((a, b) => {
        const dataA = new Date(a.data.split('/').reverse().join('-'));
        const dataB = new Date(b.data.split('/').reverse().join('-'));
        return dataB - dataA;
    });

    const gerarLinha = (item, indexOriginal) => `
        <tr>
            <td>${item.titulo}</td>
            <td><span class="tag ${tratarClasseCategoria(item.categoria)}">${item.categoria}</span></td>
            <td>${item.pagamento}</td>
            <td><strong>${formatarMoeda(item.valor)}</strong></td>
            <td>${item.data}</td>
            <td style="text-align: center; color: #94a3b8; max-width: 200px; vertical-align: middle;">${truncarTexto(item.observacao)}</td>
            ${indexOriginal !== undefined ? `
            <td style="vertical-align: middle;">
                <div style="display: flex; gap: 10px; justify-content: center; align-items: center;">
                    <button onclick="editarDespesa(${indexOriginal})" style="background:none; border:none; cursor:pointer; padding: 0;">
                        <img src="./img/lapis.png" alt="Editar" style="width: 18px; height: 18px; object-fit: contain;"/>
                    </button>
                    <button onclick="removerDespesa(${indexOriginal})" style="background:none; border:none; cursor:pointer; padding: 0;">
                        <img src="./img/lixeira.png" alt="Excluir" style="width: 18px; height: 18px; object-fit: contain;"/>
                    </button>
                </div>
            </td>` : ''}
        </tr>`;

    if (tableBodyPainel) {
        const despesasHoje = despesasExemplo.filter(d => d.data === hoje);
        if (despesasHoje.length === 0) {
            tableBodyPainel.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:40px; color:#94a3b8;"><div style="font-size:2rem;">☕</div><p>Tudo tranquilo por aqui.<br>Nenhuma despesa registrada hoje!</p></td></tr>`;
        } else {
            tableBodyPainel.innerHTML = despesasHoje.map(item => gerarLinha(item)).join('');
        }
    }

    if (tableBodyCompleta) {
        const grupos = {};
        despesasExemplo.forEach(d => {
            if (!grupos[d.data]) grupos[d.data] = [];
            grupos[d.data].push(d);
        });

        const datasOrdenadas = Object.keys(grupos).sort((a, b) => new Date(b.split('/').reverse().join('-')) - new Date(a.split('/').reverse().join('-')));

        tableBodyCompleta.innerHTML = datasOrdenadas.map(data => `
            <tr class="date-divider"><td colspan="7" style="background:rgba(255,255,255,0.05); font-weight:bold; color:#22d3ee; padding:10px 15px;">📅 ${data === hoje ? 'HOJE - ' + data : data}</td></tr>
            ${grupos[data].map(item => gerarLinha(item, despesasExemplo.indexOf(item))).join('')}
        `).join('');
    }
}

// 4. SISTEMA DE EDIÇÃO E REMOÇÃO
function editarDespesa(index) {
    const d = despesasExemplo[index];
    const mDespesa = document.getElementById('modalDespesa');
    
    // Preenche os campos
    document.getElementById('editIndex').value = index;
    document.getElementById('modalDespesaTituloPrincipal').innerText = "Editar Despesa";
    document.getElementById('despesaTitulo').value = d.titulo;
    document.getElementById('despesaCategoria').value = d.categoria;
    document.getElementById('despesaMetodo').value = d.pagamento;
    document.getElementById('despesaDescricao').value = d.observacao;
    document.getElementById('despesaData').value = d.data;
    
    // Converte o valor numérico para o formato da máscara
    const valorFormatado = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(d.valor);
    document.getElementById('despesaValor').value = valorFormatado;

    mDespesa.classList.add('active');
}

function removerDespesa(index) {
    if (confirm("Deseja excluir esta despesa?")) {
        despesasExemplo.splice(index, 1);
        renderizarTabelas();
    }
}

// 5. NAVEGAÇÃO
function showSection(sectionId) {
    document.querySelectorAll('.content-section').forEach(s => {
        s.style.display = 'none';
        s.classList.remove('active');
    });
    document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));

    const target = document.getElementById('section-' + sectionId);
    if (target) {
        target.style.display = 'block';
        target.classList.add('active');
        const tituloFinal = sectionId === 'painel' ? 'Despesas Diárias' : sectionId.charAt(0).toUpperCase() + sectionId.slice(1);
        document.getElementById('sectionTitle').innerText = tituloFinal;
    }
    const navActive = document.getElementById('nav-' + sectionId);
    if (navActive) navActive.classList.add('active');

    if (sectionId === 'despesas' || sectionId === 'painel') renderizarTabelas();
}

// 6. CARTEIRAS
function verificarEstadoCarteiras() {
    const grid = document.getElementById('walletsGrid');
    const empty = document.getElementById('empty-wallet-state');
    if (grid && empty) {
        const hasWallets = grid.querySelectorAll('.wallet-card').length > 0;
        empty.style.display = hasWallets ? 'none' : 'flex';
    }
}

function criarCardCarteira(id, nome, tipo, limite) {
    const fmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
    const card = document.createElement('div');
    card.className = 'wallet-card';
    card.dataset.id = id;
    card.innerHTML = `
        <div class="wallet-top">
            <div style="display: flex; gap: 12px; align-items: center;">
                <div class="wallet-icon-bg">💳</div>
                <div><h4>${nome}</h4><p style="font-size:0.8rem;color:#94a3b8">${tipo}</p></div>
            </div>
            <button class="btn-delete-wallet-img" onclick="removerCarteira('${id}')" style="background:none;border:none;cursor:pointer; padding: 0;">
                <img src="lixeira.png" alt="Excluir" style="width: 18px; height: 18px; object-fit: contain;"/>
            </button>
        </div>
        <div class="wallet-stats" style="margin-top:15px">
            <div class="stat-row"><span>Limite</span><span>${fmt.format(limite)}</span></div>
            <div class="progress-bar"><div class="progress-fill" style="width: 0%;"></div></div>
        </div>`;
    return card;
}

function removerCarteira(id) {
    if (confirm('Excluir carteira?')) {
        const item = document.querySelector(`[data-id="${id}"]`);
        if(item) item.remove();
        verificarEstadoCarteiras();
    }
}

// 7. INICIALIZAÇÃO
document.addEventListener('DOMContentLoaded', () => {
    renderizarStats();
    inicializarGraficos();
    renderizarTabelas();
    verificarEstadoCarteiras();

    const inputValor = document.getElementById('despesaValor');
    const inputData = document.getElementById('despesaData');
    const mDespesa = document.getElementById('modalDespesa');
    const formDespesa = document.getElementById('formDespesa');

    inputValor?.addEventListener('input', (e) => aplicarMascaraValor(e.target));
    inputData?.addEventListener('input', (e) => aplicarMascaraData(e.target));

    // Abrir modal para nova despesa
    document.getElementById('btnNewExpense')?.addEventListener('click', () => {
        formDespesa.reset();
        document.getElementById('editIndex').value = "";
        document.getElementById('modalDespesaTituloPrincipal').innerText = "Nova Despesa";
        mDespesa.classList.add('active');
    });

    document.getElementById('btnFecharModalDespesa')?.addEventListener('click', () => mDespesa.classList.remove('active'));

    formDespesa?.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const valorPuro = parseFloat(inputValor.value.replace(/\./g, '').replace(',', '.'));
        const indexParaEditar = document.getElementById('editIndex').value;

        const dadosDespesa = {
            titulo: document.getElementById('despesaTitulo').value,
            categoria: document.getElementById('despesaCategoria').value,
            pagamento: document.getElementById('despesaMetodo').value,
            valor: valorPuro,
            data: inputData.value,
            observacao: document.getElementById('despesaDescricao').value
        };

        if (indexParaEditar !== "") {
            // Modo Edição
            despesasExemplo[indexParaEditar] = dadosDespesa;
        } else {
            // Modo Criação
            despesasExemplo.unshift(dadosDespesa);
        }

        renderizarTabelas();
        mDespesa.classList.remove('active');
        formDespesa.reset();
    });

    // Lógica das Carteiras
    const wModal = document.getElementById('walletModal');
    const cModal = document.getElementById('confirmModal');
    let tempWallet = null;

    document.getElementById('btnNewWallet')?.addEventListener('click', () => wModal.classList.add('active'));
    document.getElementById('closeWallet')?.addEventListener('click', () => wModal.classList.remove('active'));

    document.getElementById('walletForm')?.addEventListener('submit', (e) => {
        e.preventDefault();
        tempWallet = {
            name: document.getElementById('walletName').value,
            type: document.getElementById('walletType').value,
            limit: parseFloat(document.getElementById('walletLimit').value)
        };
        document.getElementById('confirmDetails').innerHTML = `📌 ${tempWallet.name} | 💰 ${tempWallet.limit}`;
        cModal.classList.add('active');
    });

    document.getElementById('btnConfirmFinal')?.addEventListener('click', () => {
        const grid = document.getElementById('walletsGrid');
        grid.appendChild(criarCardCarteira('w_'+Date.now(), tempWallet.name, tempWallet.type, tempWallet.limit));
        wModal.classList.remove('active');
        cModal.classList.remove('active');
        verificarEstadoCarteiras();
    });

    document.getElementById('btnCancelFinal')?.addEventListener('click', () => cModal.classList.remove('active'));
});
