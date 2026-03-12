// 1. DADOS DE EXEMPLO
const despesasExemplo = [
    { titulo: 'Supermercado', categoria: 'Alimentação', pagamento: 'Cartão de Crédito', valor: 350.0, data: '10/03/2026', observacao: '' },
    { titulo: 'Uber', categoria: 'Transporte', pagamento: 'Cartão de Débito', valor: 45.0, data: '10/03/2026', observacao: '' },
    { titulo: 'Netflix', categoria: 'Lazer', pagamento: 'Cartão de Crédito', valor: 55.9, data: '09/03/2026', observacao: '' },
    { titulo: 'Farmácia', categoria: 'Saúde', pagamento: 'VR', valor: 120.0, data: '08/03/2026', observacao: '' }
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

function truncarTexto(texto, limite = 150) {
    if (!texto) return '-';
    if (texto.length <= limite) return texto;
    return texto.slice(0, limite) + '...';
}

// --- VALIDAÇÃO E MÁSCARAS ---

function validarData(dataString) {
    const regex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
    if (!regex.test(dataString)) return false;

    const parts = dataString.split("/");
    const dia = parseInt(parts[0], 10);
    const mes = parseInt(parts[1], 10);
    const ano = parseInt(parts[2], 10);

    if (mes < 1 || mes > 12) return false;
    const ultimoDiaMes = new Date(ano, mes, 0).getDate();
    if (dia < 1 || dia > ultimoDiaMes) return false;
    if (ano < 2000 || ano > 2100) return false;

    return true;
}

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

    const orcamentoAtual = parseFloat(localStorage.getItem('budget_total')) || 0;

    statsGrid.innerHTML = `
        <div class="stat-card">
            <div class="stat-info"><p>Total Gasto</p><h3>R$ 4.250,00</h3><span class="trend down">-12% vs mês anterior</span></div>
        </div>
        <div class="stat-card">
            <div class="stat-info"><p>Orçamento Mensal</p><h3>${formatarMoeda(orcamentoAtual)}</h3></div>
        </div>
        <div class="stat-card">
            <div class="stat-info"><p>Saldo Restante</p><h3>R$ 1.750,00</h3><span class="trend up">+28% vs mês anterior</span></div>
        </div>
        <div class="stat-card">
            <div class="stat-info"><p>Mais Usado</p><h3>Cartão de Crédito</h3><span class="trend">Últimos 30 dias</span></div>
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
            tableBodyPainel.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:40px; color:#94a3b8;"><p>Nenhuma despesa registrada hoje!</p></td></tr>`;
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
    
    document.getElementById('editIndex').value = index;
    const tituloModal = document.getElementById('modalDespesaTituloPrincipal');
    if(tituloModal) tituloModal.innerText = "Editar Despesa";

    document.getElementById('despesaTitulo').value = d.titulo;
    document.getElementById('despesaCategoria').value = d.categoria;
    document.getElementById('despesaMetodo').value = d.pagamento;
    document.getElementById('despesaDescricao').value = d.observacao;
    document.getElementById('despesaData').value = d.data;
    
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
    if (sectionId === 'planejamento') renderizarMetas();
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
            <button class="btn-delete-wallet-img" onclick="openDeleteModal('${id}', '${nome}')" style="background:none;border:none;cursor:pointer; padding: 0;">
                <img src="./img/lixeira.png" alt="Excluir" style="width: 18px; height: 18px; object-fit: contain;"/>
            </button>
        </div>
        <div class="wallet-stats" style="margin-top:15px">
            <div class="stat-row"><span>Limite</span><span>${fmt.format(limite)}</span></div>
            <div class="progress-bar"><div class="progress-fill" style="width: 0%;"></div></div>
        </div>`;
    return card;
}

let walletIdToDelete = null;

function openDeleteModal(id, walletName) {
    walletIdToDelete = id;
    const deleteModal = document.getElementById('deleteWalletModal');
    const deleteDetails = document.getElementById('deleteDetails');
    
    if(deleteDetails) {
        deleteDetails.innerHTML = `
            <div class="detail-item-prof">
                <span class="detail-label-prof">Carteira selecionada</span>
                <span class="detail-value-prof">${walletName}</span>
            </div>
        `;
    }
    if(deleteModal) deleteModal.classList.add('active');
}

// 8. DADOS DE METAS
let limiteMensal = parseFloat(localStorage.getItem('budget_total')) || 0;
let valorAlocado = parseFloat(localStorage.getItem('valor_alocado')) || 0;
let metas = JSON.parse(localStorage.getItem('metas')) || [
    { id: 1, nome: 'Reserva de Emergência', alvo: 10000, guardado: 6500, prazo: '31/12/2026' },
    { id: 2, nome: 'Notebook Novo', alvo: 5000, guardado: 2000, prazo: '30/06/2026' }
];

// --- 7. INICIALIZAÇÃO E EVENTOS ---
document.addEventListener('DOMContentLoaded', () => {
    // Inicializações básicas
    renderizarStats(); // Garante que os cards apareçam ao carregar
    inicializarGraficos();
    renderizarTabelas();
    renderizarMetas(); 
    atualizarInterfaceOrcamento();

    // --- CORREÇÃO BUG: BOTÃO NOVA DESPESA ---
    const btnAbrirModalDespesa = document.getElementById('btnAbrirModalDespesa');
    if (btnAbrirModalDespesa) {
        btnAbrirModalDespesa.addEventListener('click', () => {
            const mDespesa = document.getElementById('modalDespesa');
            if (mDespesa) mDespesa.classList.add('active');
        });
    }

    // --- ORÇAMENTO (BOTÃO SALVAR) ---
    const btnSalvarOrcamento = document.getElementById('btnSalvarOrcamento') || document.querySelector('.btn-save-orcamento');
    const inputOrcamento = document.getElementById('orcamentoMensal');

    if (btnSalvarOrcamento) {
        btnSalvarOrcamento.removeAttribute('onclick'); // Limpa conflitos
        btnSalvarOrcamento.addEventListener('click', (e) => {
            e.preventDefault();
            abrirModalRevisaoOrcamento();
        });
    }

    document.getElementById('btnConfirmarOrcamentoFinal')?.addEventListener('click', confirmarEDefinirOrcamento);
    document.getElementById('btnCancelarRevisaoOrcamento')?.addEventListener('click', fecharModalRevisaoOrcamento);

    // --- METAS ---
    const btnNovaMeta = document.getElementById('btnNovaMeta') || document.querySelector('.btn-new-goal');
    if (btnNovaMeta) {
        btnNovaMeta.addEventListener('click', abrirModalMeta);
    }

    document.getElementById('btnFecharModalMeta')?.addEventListener('click', fecharModalMeta);
    document.querySelector('.btn-cancel-meta')?.addEventListener('click', fecharModalMeta);

    const formMeta = document.getElementById('formMeta');
    if (formMeta) {
        formMeta.addEventListener('submit', (e) => {
            e.preventDefault();
            salvarNovaMeta();
        });
    }

    // --- MÁSCARAS ---
    inputOrcamento?.addEventListener('input', (e) => aplicarMascaraValor(e.target));
    document.getElementById('metaValor')?.addEventListener('input', (e) => aplicarMascaraValor(e.target));
    document.getElementById('despesaValor')?.addEventListener('input', (e) => aplicarMascaraValor(e.target));
    
    // Máscaras de Data nos campos corretos
    document.getElementById('despesaData')?.addEventListener('input', (e) => aplicarMascaraData(e.target));
    document.getElementById('metaPrazo')?.addEventListener('input', (e) => aplicarMascaraData(e.target));
});

// --- FUNÇÕES DE APOIO ---

function abrirModalRevisaoOrcamento() {
    const input = document.getElementById('orcamentoMensal');
    if(!input) return;
    const valorDigitado = input.value;

    if (!valorDigitado || valorDigitado === "0,00") {
        alert("Por favor, insira um valor válido.");
        return;
    }

    const revisaoDetails = document.getElementById('revisaoOrcamentoDetails');
    if(revisaoDetails) {
        revisaoDetails.innerHTML = `
            <p style="color: #94a3b8; margin-bottom: 5px;">NOVO TETO MENSAL</p>
            <h2 style="color: #22d3ee;">R$ ${valorDigitado}</h2>
        `;
    }

    document.getElementById('modalRevisaoOrcamento')?.classList.add('active');
}

function confirmarEDefinirOrcamento() {
    const input = document.getElementById('orcamentoMensal');
    if(!input) return;
    const valorNumerico = parseFloat(input.value.replace(/\./g, '').replace(',', '.')) || 0;

    localStorage.setItem('budget_total', valorNumerico);
    limiteMensal = valorNumerico; 
    
    atualizarInterfaceOrcamento();
    renderizarStats(); // Atualiza os cards superiores
    fecharModalRevisaoOrcamento();
    input.value = ""; 
}

function fecharModalRevisaoOrcamento() {
    document.getElementById('modalRevisaoOrcamento')?.classList.remove('active');
}

function abrirModalMeta() {
    const modal = document.getElementById('modalMeta');
    if (modal) {
        modal.classList.add('active');
        modal.style.display = 'flex';
    }
}

function fecharModalMeta() {
    const modal = document.getElementById('modalMeta');
    if (modal) {
        modal.classList.remove('active');
        modal.style.display = 'none';
    }
}

function salvarNovaMeta() {
    const nome = document.getElementById('metaNome').value;
    const alvo = parseFloat(document.getElementById('metaValor').value.replace(/\./g, '').replace(',', '.')) || 0;
    const prazo = document.getElementById('metaPrazo').value;

    if (!nome || alvo <= 0) {
        alert("Preencha os campos corretamente.");
        return;
    }

    const novaMeta = { id: Date.now(), nome, alvo, guardado: 0, prazo };
    metas.push(novaMeta);
    localStorage.setItem('metas', JSON.stringify(metas));
    
    renderizarMetas();
    fecharModalMeta();
}

// Lógica Carteiras
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
    const fmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
    const confirmDetails = document.getElementById('confirmDetails');
    if(confirmDetails) {
        confirmDetails.innerHTML = `
            <div class="detail-item-prof"><span class="detail-label-prof">Nome</span><span class="detail-value-prof">${tempWallet.name}</span></div>
            <div class="detail-item-prof"><span class="detail-label-prof">Tipo</span><span class="detail-value-prof">${tempWallet.type}</span></div>
            <div class="detail-item-prof"><span class="detail-label-prof">Limite Mensal</span><span class="detail-value-prof highlight">${fmt.format(tempWallet.limit)}</span></div>`;
    }
    cModal.classList.add('active');
});

document.getElementById('btnConfirmFinal')?.addEventListener('click', () => {
    const grid = document.getElementById('walletsGrid');
    if(grid && tempWallet) {
        grid.appendChild(criarCardCarteira('w_'+Date.now(), tempWallet.name, tempWallet.type, tempWallet.limit));
    }
    wModal.classList.remove('active');
    cModal.classList.remove('active');
    verificarEstadoCarteiras();
});

document.getElementById('btnConfirmDelete')?.addEventListener('click', () => {
    if (walletIdToDelete !== null) {
        const item = document.querySelector(`[data-id="${walletIdToDelete}"]`);
        if(item) item.remove();
        verificarEstadoCarteiras();
        document.getElementById('deleteWalletModal').classList.remove('active');
        walletIdToDelete = null;
    }
});

document.getElementById('btnCancelDelete')?.addEventListener('click', () => {
    document.getElementById('deleteWalletModal').classList.remove('active');
    walletIdToDelete = null;
});

// Submit Aporte em Meta
document.getElementById('formAporteMeta')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = parseInt(document.getElementById('aporteMetaIndex').value);
    const valorAporte = parseFloat(document.getElementById('aporteValor').value.replace(/\./g, '').replace(',', '.'));
    
    const index = metas.findIndex(m => m.id === id);
    if (index !== -1 && !isNaN(valorAporte)) {
        metas[index].guardado += valorAporte;
        registrarAlocacao(valorAporte); 
        localStorage.setItem('metas', JSON.stringify(metas));
        renderizarMetas();
        fecharModalAporte();
    }
});

document.getElementById('btnConfirmarExclusaoMeta')?.addEventListener('click', () => {
    const id = parseInt(document.getElementById('excluirMetaIndex').value);
    metas = metas.filter(m => m.id !== id);
    localStorage.setItem('metas', JSON.stringify(metas));
    renderizarMetas();
    fecharModalExcluirMeta();
});

// --- FUNÇÕES DE METAS ---
function renderizarMetas() {
    const tableBody = document.getElementById('goalsTableBody');
    if (!tableBody) return;
    tableBody.innerHTML = metas.map(meta => {
        const percentual = Math.min(Math.round((meta.guardado / meta.alvo) * 100), 100);
        return `
            <tr>
                <td>${meta.nome}</td>
                <td><strong>${formatarMoeda(meta.alvo)}</strong></td>
                <td>${meta.prazo}</td>
                <td>
                    <div class="goal-progress-container">
                        <div class="progress-bar-goal"><div class="progress-fill-goal" style="width: ${percentual}%;"></div></div>
                        <span class="progress-text">${percentual}%</span>
                    </div>
                </td>
                <td style="text-align: center;">
                    <div style="display: flex; gap: 12px; justify-content: center;">
                        <button onclick="abrirModalAporte(${meta.id})" class="btn-action-add" title="Adicionar economia" style="background:none; border:none; cursor:pointer; font-size:1.2rem;">💰</button>
                        <button onclick="abrirModalExcluirMeta(${meta.id})" style="background:none; border:none; cursor:pointer;"><img src="./img/lixeira.png" width="16"></button>
                    </div>
                </td>
            </tr>`;
    }).join('');
}

function abrirModalAporte(id) {
    document.getElementById('aporteMetaIndex').value = id;
    document.getElementById('aporteValor').value = "";
    document.getElementById('modalAporteMeta').style.display = 'flex';
}

function fecharModalAporte() {
    document.getElementById('modalAporteMeta').style.display = 'none';
}

function abrirModalExcluirMeta(id) {
    document.getElementById('excluirMetaIndex').value = id;
    document.getElementById('modalExcluirMeta').style.display = 'flex';
}

function fecharModalExcluirMeta() {
    document.getElementById('modalExcluirMeta').style.display = 'none';
}

// --- 9. FUNÇÕES DE CÁLCULO FINANCEIRO E ORÇAMENTO ---

function registrarAlocacao(valor) {
    valorAlocado += valor;
    localStorage.setItem('valor_alocado', valorAlocado);
    atualizarInterfaceOrcamento();
}

function atualizarInterfaceOrcamento() {
    const displayLimite = document.getElementById('valor-limite-display');
    const progressBar = document.getElementById('budget-progress-fill');
    const percentText = document.getElementById('usage-percentage-text');
    const amountText = document.getElementById('usage-amount-text');
    const remainingText = document.getElementById('remaining-amount-text');

    if (displayLimite) displayLimite.innerText = formatarMoeda(limiteMensal);

    const porcentagem = limiteMensal > 0 ? (valorAlocado / limiteMensal) * 100 : 0;
    const saldoDisponivel = limiteMensal - valorAlocado;

    if (percentText) percentText.innerText = `${Math.round(porcentagem)}%`;
    if (amountText) amountText.innerText = `${formatarMoeda(valorAlocado)} alocados`;
    
    if (remainingText) {
        remainingText.innerText = `Disponível: ${formatarMoeda(saldoDisponivel)}`;
        if (porcentagem > 100) {
            remainingText.style.color = "#ef4444"; 
            if (progressBar) progressBar.classList.add('progress-fill-danger');
        } else if (porcentagem > 80) {
            remainingText.style.color = "#f59e0b"; 
            if (progressBar) progressBar.classList.add('progress-fill-warning');
        } else {
            remainingText.style.color = "#22d3ee"; 
            if (progressBar) progressBar.classList.remove('progress-fill-warning', 'progress-fill-danger');
        }
    }

    if (progressBar) progressBar.style.width = `${Math.min(porcentagem, 100)}%`;
}
