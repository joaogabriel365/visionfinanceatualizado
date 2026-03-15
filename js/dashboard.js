// ==========================================================================
// 1. CONFIGURAÇÕES GLOBAIS E DADOS (LOCALSTORAGE)
// ==========================================================================

let despesasExemplo = JSON.parse(localStorage.getItem('despesas')) || [
    { titulo: 'Supermercado', categoria: 'Alimentação', pagamento: 'Cartão de Crédito', valor: 350.0, data: '10/03/2026', observacao: '' },
    { titulo: 'Uber', categoria: 'Transporte', pagamento: 'Cartão de Débito', valor: 45.0, data: '10/03/2026', observacao: '' },
    { titulo: 'Netflix', categoria: 'Lazer', pagamento: 'Cartão de Crédito', valor: 55.9, data: '09/03/2026', observacao: '' },
    { titulo: 'Farmácia', categoria: 'Saúde', pagamento: 'VR', valor: 120.0, data: '08/03/2026', observacao: '' }
];

let metas = JSON.parse(localStorage.getItem('metas')) || [
    { id: 1, nome: 'Reserva de Emergência', alvo: 10000, guardado: 6500, prazo: '31/12/2026' },
    { id: 2, nome: 'Notebook Novo', alvo: 5000, guardado: 2000, prazo: '30/06/2026' }
];

let limiteMensal = parseFloat(localStorage.getItem('budget_total')) || 0;

const formatarMoeda = (valor) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
const tratarClasseCategoria = (cat) => cat.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s/g, '-');
const getHojeFormatado = () => new Date().toLocaleDateString('pt-BR');
const truncarTexto = (texto, limite = 150) => (!texto ? '-' : (texto.length <= limite ? texto : texto.slice(0, limite) + '...'));

function salvarNoStorage() {
    localStorage.setItem('despesas', JSON.stringify(despesasExemplo));
}

function validarData(dataString) {
    const regex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
    if (!regex.test(dataString)) return false;
    const [d, m, a] = dataString.split("/").map(Number);
    if (m < 1 || m > 12) return false;
    const ultimoDia = new Date(a, m, 0).getDate();
    return d >= 1 && d <= ultimoDia && a >= 2000 && a <= 2100;
}

function aplicarMascaraValor(input) {
    let value = input.value.replace(/\D/g, '');
    if (value.length > 8) value = value.slice(0, 8);
    let valorFloat = (parseFloat(value) / 100).toFixed(2);
    input.value = isNaN(valorFloat) ? "" : new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(valorFloat);
}

function aplicarMascaraData(input) {
    let v = input.value.replace(/\D/g, '');
    if (v.length > 8) v = v.slice(0, 8);
    if (v.length >= 5) v = v.replace(/^(\d{2})(\d{2})(\d{0,4})/, "$1/$2/$3");
    else if (v.length >= 3) v = v.replace(/^(\d{2})(\d{0,2})/, "$1/$2");
    input.value = v;
}

// ==========================================================================
// 2. ÁREA: PAINEL (DASHBOARD)
// ==========================================================================

function renderizarStats() {
    const statsGrid = document.querySelector('.stats-grid');
    if (!statsGrid) return;

    const totalGasto = despesasExemplo.reduce((acc, d) => acc + d.valor, 0);
    const orcamentoAtual = parseFloat(localStorage.getItem('budget_total')) || 0;
    const saldoRestante = orcamentoAtual - totalGasto;

    statsGrid.innerHTML = `
        <div class="stat-card">
            <div class="stat-info"><p>Total Gasto</p><h3>${formatarMoeda(totalGasto)}</h3></div>
        </div>
        <div class="stat-card">
            <div class="stat-info"><p>Limite Estabelecido</p><h3>${formatarMoeda(orcamentoAtual)}</h3></div>
        </div>
        <div class="stat-card">
            <div class="stat-info"><p>Saldo Restante</p><h3 style="color: ${saldoRestante < 0 ? '#ef4444' : '#22d3ee'}">${formatarMoeda(saldoRestante)}</h3></div>
        </div>
        <div class="stat-card">
            <div class="stat-info"><p>Principal Categoria</p><h3>${despesasExemplo[0]?.categoria || '-'}</h3></div>
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

// ==========================================================================
// 3. ÁREA: DESPESAS (TABELAS E CRUD COM FILTROS)
// ==========================================================================

function renderizarTabelas() {
    const tableBodyCompleta = document.getElementById('fullExpenseTableBody');
    const tableBodyPainel = document.getElementById('expenseTableBody');
    const hoje = getHojeFormatado();

    // --- LÓGICA PARA A TABELA DO PAINEL (DESPESAS RECENTES - APENAS HOJE) ---
    if (tableBodyPainel) {
        const despesasDeHoje = despesasExemplo.filter(d => d.data === hoje);
        
        if (despesasDeHoje.length === 0) {
            tableBodyPainel.innerHTML = `<tr><td colspan="6"><div style="text-align: center; padding: 20px; color: #94a3b8;"><p>Nenhuma despesa hoje</p></div></td></tr>`;
        } else {
            tableBodyPainel.innerHTML = despesasDeHoje.map(item => `
                <tr>
                    <td>${item.titulo}</td>
                    <td><span class="tag ${tratarClasseCategoria(item.categoria)}">${item.categoria}</span></td>
                    <td>${item.pagamento}</td>
                    <td><strong>${formatarMoeda(item.valor)}</strong></td>
                    <td>${item.data}</td>
                    <td style="text-align: center; color: #94a3b8;">${truncarTexto(item.observacao)}</td>
                </tr>
            `).join('');
        }
    }

    // --- LÓGICA PARA A TABELA COMPLETA (COM FILTROS) ---
    if (!tableBodyCompleta) return;

    const fMes = document.getElementById('filterMonth')?.value || 'todos';
    const fCat = document.getElementById('filterCategory')?.value || 'todos';
    const fPag = document.getElementById('filterPayment')?.value || 'todos';

    const despesasFiltradas = despesasExemplo.filter(d => {
        const mesDespesa = d.data.split('/')[1]; 
        const bateMes = (fMes === 'todos' || mesDespesa === fMes);
        const bateCat = (fCat === 'todos' || d.categoria === fCat);
        const batePag = (fPag === 'todos' || d.pagamento.trim().toLowerCase() === fPag.trim().toLowerCase());
        return bateMes && bateCat && batePag;
    });

    despesasFiltradas.sort((a, b) => new Date(b.data.split('/').reverse().join('-')) - new Date(a.data.split('/').reverse().join('-')));

    if (despesasFiltradas.length === 0) {
        tableBodyCompleta.innerHTML = `<tr><td colspan="7"><div style="text-align: center; padding: 60px 20px; color: #94a3b8;"><p>Nenhuma despesa encontrada</p></div></td></tr>`;
    } else {
        const grupos = {};
        despesasFiltradas.forEach(d => {
            if (!grupos[d.data]) grupos[d.data] = [];
            grupos[d.data].push(d);
        });

        const datasOrdenadas = Object.keys(grupos).sort((a, b) => new Date(b.split('/').reverse().join('-')) - new Date(a.split('/').reverse().join('-')));

        tableBodyCompleta.innerHTML = datasOrdenadas.map(data => `
            <tr class="date-divider"><td colspan="7" style="background:rgba(255,255,255,0.05); font-weight:bold; color:#22d3ee; padding:10px 15px;">📅 ${data === hoje ? 'HOJE - ' + data : data}</td></tr>
            ${grupos[data].map(item => `
                <tr>
                    <td>${item.titulo}</td>
                    <td><span class="tag ${tratarClasseCategoria(item.categoria)}">${item.categoria}</span></td>
                    <td>${item.pagamento}</td>
                    <td><strong>${formatarMoeda(item.valor)}</strong></td>
                    <td>${item.data}</td>
                    <td style="text-align: center; color: #94a3b8;">${truncarTexto(item.observacao)}</td>
                    <td>
                        <div style="display: flex; gap: 10px; justify-content: center;">
                            <button onclick="editarDespesa(${despesasExemplo.indexOf(item)})" style="background:none; border:none; cursor:pointer;">
                                <img src="./img/lapis.png" style="width: 18px;"/>
                            </button>
                            <button onclick="abrirModalExcluirDespesa(${despesasExemplo.indexOf(item)})" style="background:none; border:none; cursor:pointer;">
                                <img src="./img/lixeira.png" style="width: 18px;"/>
                            </button>
                        </div>
                    </td>
                </tr>
            `).join('')}
        `).join('');
    }
}

function configurarEventosFiltros() {
    const filtros = ['filterMonth', 'filterCategory', 'filterPayment'];
    filtros.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('change', renderizarTabelas);
    });
}

function salvarDespesa() {
    const indexStr = document.getElementById('editIndex').value;
    const titulo = document.getElementById('despesaTitulo').value;
    const valorRaw = document.getElementById('despesaValor').value;
    const categoria = document.getElementById('despesaCategoria').value;
    const metodo = document.getElementById('despesaMetodo').value;
    const data = document.getElementById('despesaData').value;
    const obs = document.getElementById('despesaDescricao').value;

    const valor = parseFloat(valorRaw.replace(/\./g, '').replace(',', '.')) || 0;

    if (!titulo || valor <= 0 || !validarData(data)) {
        alert("Preencha todos os campos corretamente.");
        return;
    }

    const novaDespesa = { titulo, categoria, pagamento: metodo, valor, data, observacao: obs };

    if (indexStr === "" || indexStr === undefined) {
        despesasExemplo.push(novaDespesa);
    } else {
        despesasExemplo[parseInt(indexStr)] = novaDespesa;
    }

    salvarNoStorage();
    fecharModalDespesa();
    renderizarTabelas();
    renderizarStats();
}

function editarDespesa(index) {
    const d = despesasExemplo[index];
    document.getElementById('editIndex').value = index;
    document.getElementById('modalDespesaTituloPrincipal').innerText = "Editar Despesa";
    document.getElementById('despesaTitulo').value = d.titulo;
    document.getElementById('despesaCategoria').value = d.categoria;
    document.getElementById('despesaMetodo').value = d.pagamento;
    document.getElementById('despesaDescricao').value = d.observacao;
    document.getElementById('despesaData').value = d.data;
    document.getElementById('despesaValor').value = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(d.valor);
    document.getElementById('modalDespesa').classList.add('active');
}

function fecharModalDespesa() {
    const mDespesa = document.getElementById('modalDespesa');
    if (mDespesa) {
        mDespesa.classList.remove('active');
        document.getElementById('editIndex').value = "";
        document.getElementById('formDespesa').reset();
    }
}

// ==========================================================================
// 4. ÁREA: CARTEIRAS
// ==========================================================================

function verificarEstadoCarteiras() {
    const grid = document.getElementById('walletsGrid');
    const empty = document.getElementById('empty-wallet-state');
    if (grid && empty) {
        const hasWallets = grid.querySelectorAll('.wallet-card').length > 0;
        empty.style.display = hasWallets ? 'none' : 'flex';
    }
}

function calcularProgressoCarteira(limite) {
    const totalGasto = despesasExemplo.reduce((acc, d) => acc + d.valor, 0);
    const percentual = (totalGasto / limite) * 100;
    return Math.min(percentual, 100).toFixed(0);
}

function criarCardCarteira(id, nome, tipo, limite) {
    const fmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
    const progresso = calcularProgressoCarteira(limite);
    const card = document.createElement('div');
    card.className = 'wallet-card';
    card.dataset.id = id;
    card.innerHTML = `
        <div class="wallet-top">
            <div style="display: flex; gap: 12px; align-items: center;">
                <div class="wallet-icon-bg">💳</div>
                <div><h4>${nome}</h4><p style="font-size:0.8rem;color:#94a3b8">${tipo}</p></div>
            </div>
            <button class="btn-delete-wallet-img" onclick="openDeleteModal('${id}', '${nome}')">
                <img src="./img/lixeira.png" style="width: 18px;"/>
            </button>
        </div>
        <div class="wallet-stats" style="margin-top:15px">
            <div class="stat-row"><span>Limite</span><span>${fmt.format(limite)}</span></div>
            <div class="progress-bar"><div class="progress-fill" style="width: ${progresso}%;"></div></div>
        </div>`;
    return card;
}

let walletIdToDelete = null;
let indexDespesaParaExcluir = null;

function openDeleteModal(id, walletName) {
    walletIdToDelete = id;
    indexDespesaParaExcluir = null;
    document.getElementById('confirmarTitulo').innerText = "Excluir Carteira?";
    document.getElementById('deleteDetails').innerHTML = `<div class="detail-item-prof"><span class="detail-label-prof">Carteira</span><span class="detail-value-prof">${walletName}</span></div>`;
    document.getElementById('deleteWalletModal').classList.add('active');
}

function abrirModalExcluirDespesa(index) {
    indexDespesaParaExcluir = index;
    walletIdToDelete = null;
    document.getElementById('confirmarTitulo').innerText = "Excluir Despesa?";
    document.getElementById('deleteDetails').innerHTML = `<p style="color: #94a3b8">Deseja realmente remover esta despesa?</p>`;
    document.getElementById('deleteWalletModal').classList.add('active');
}

// ==========================================================================
// 5. ÁREA: PLANEJAMENTO E ORÇAMENTO
// ==========================================================================

function atualizarInterfaceOrcamento() {
    const display = document.getElementById('valor-limite-display');
    if (display) display.innerText = formatarMoeda(limiteMensal);
}

function confirmarEDefinirOrcamento() {
    const input = document.getElementById('orcamentoMensal');
    if(!input) return;
    const valorNumerico = parseFloat(input.value.replace(/\./g, '').replace(',', '.')) || 0;
    localStorage.setItem('budget_total', valorNumerico);
    limiteMensal = valorNumerico;
    atualizarInterfaceOrcamento();
    renderizarStats();
    input.value = "";
}

function renderizarMetas() {
    console.log("Metas carregadas:", metas);
}

// ==========================================================================
// 6. NAVEGAÇÃO E INICIALIZAÇÃO
// ==========================================================================

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
        document.getElementById('sectionTitle').innerText = sectionId === 'painel' ? 'Despesas Diárias' : sectionId.charAt(0).toUpperCase() + sectionId.slice(1);
    }
    const navActive = document.getElementById('nav-' + sectionId);
    if (navActive) navActive.classList.add('active');

    if (sectionId === 'despesas' || sectionId === 'painel') renderizarTabelas();
}

document.addEventListener('DOMContentLoaded', () => {
    renderizarStats();
    inicializarGraficos();
    renderizarTabelas();
    renderizarMetas();
    atualizarInterfaceOrcamento();
    verificarEstadoCarteiras();
    configurarEventosFiltros();

    document.getElementById('btnSalvarDespesa')?.addEventListener('click', salvarDespesa);

    document.getElementById('walletForm')?.addEventListener('submit', function(e) {
        e.preventDefault();
        const nome = document.getElementById('walletName').value;
        const tipo = document.getElementById('walletType').value;
        const limite = parseFloat(document.getElementById('walletLimit').value.replace(/\./g, '').replace(',', '.')) || 0;
        
        if (nome.trim() !== "" && limite > 0) {
            const id = "wallet-" + Date.now();
            document.getElementById('walletsGrid').appendChild(criarCardCarteira(id, nome, tipo, limite));
            document.getElementById('walletModal').classList.remove('active');
            this.reset();
            verificarEstadoCarteiras();
        }
    });

    document.getElementById('walletLimit')?.addEventListener('input', (e) => aplicarMascaraValor(e.target));
    document.getElementById('orcamentoMensal')?.addEventListener('input', (e) => aplicarMascaraValor(e.target));
    document.getElementById('despesaValor')?.addEventListener('input', (e) => aplicarMascaraValor(e.target));
    document.getElementById('despesaData')?.addEventListener('input', (e) => aplicarMascaraData(e.target));

    document.getElementById('btnConfirmDelete')?.addEventListener('click', () => {
        if (indexDespesaParaExcluir !== null) {
            despesasExemplo.splice(indexDespesaParaExcluir, 1);
            salvarNoStorage();
            indexDespesaParaExcluir = null;
        } else if (walletIdToDelete !== null) {
            document.querySelector(`[data-id="${walletIdToDelete}"]`)?.remove();
            walletIdToDelete = null;
        }
        verificarEstadoCarteiras();
        renderizarTabelas();
        renderizarStats();
        document.getElementById('deleteWalletModal').classList.remove('active');
    });

    document.getElementById('btnCancelDelete')?.addEventListener('click', () => {
        document.getElementById('deleteWalletModal').classList.remove('active');
    });
});
