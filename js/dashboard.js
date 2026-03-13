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

                    <button onclick="abrirModalExcluirDespesa(${indexOriginal})" style="background:none; border:none; cursor:pointer; padding: 0;">

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

let indexDespesaParaExcluir = null;



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



function abrirModalExcluirDespesa(index) {

    indexDespesaParaExcluir = index;

    const modal = document.getElementById('deleteWalletModal'); // Reutilizando estrutura de modal de exclusão

    const titulo = document.getElementById('confirmarTitulo');

    if(titulo) titulo.innerText = "Excluir Despesa?";

   

    const details = document.getElementById('deleteDetails');

    if(details) details.innerHTML = `<p style="color: #94a3b8">Deseja realmente remover esta despesa?</p>`;

   

    if(modal) modal.classList.add('active');

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

    indexDespesaParaExcluir = null; // Garante que não há conflito

    const deleteModal = document.getElementById('deleteWalletModal');

    const deleteDetails = document.getElementById('deleteDetails');

    const titulo = document.getElementById('confirmarTitulo');

   

    if(titulo) titulo.innerText = "Excluir Carteira?";

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



// 8. DADOS DE METAS E ORÇAMENTO

let metas = JSON.parse(localStorage.getItem('metas')) || [

    { id: 1, nome: 'Reserva de Emergência', alvo: 10000, guardado: 6500, prazo: '31/12/2026' },

    { id: 2, nome: 'Notebook Novo', alvo: 5000, guardado: 2000, prazo: '30/06/2026' }

];

let limiteMensal = parseFloat(localStorage.getItem('budget_total')) || 0;

let valorAlocado = parseFloat(localStorage.getItem('valor_alocado')) || 0;



// --- 7. INICIALIZAÇÃO E EVENTOS ---

document.addEventListener('DOMContentLoaded', () => {
    // Inicializações
    renderizarStats();
    inicializarGraficos();
    renderizarTabelas();
    renderizarMetas();
    atualizarInterfaceOrcamento();
    verificarEstadoCarteiras();

    // --- LÓGICA DE SALVAR CARTEIRA ---
    const walletForm = document.getElementById('walletForm');
    if (walletForm) {
        walletForm.addEventListener('submit', function(e) {
            e.preventDefault(); // OBRIGATÓRIO: Impede a página de recarregar

            const nome = document.getElementById('walletName').value;
            const tipo = document.getElementById('walletType').value;
            const limiteRaw = document.getElementById('walletLimit').value;
            
            // Converte "1.234,56" para número 1234.56 para o código entender
            const limite = parseFloat(limiteRaw.replace(/\./g, '').replace(',', '.')) || 0;

            if (nome.trim() === "" || limite <= 0) {
                alert("Preencha o nome e o limite!");
                return;
            }

            // Cria o card e coloca no grid
            const id = "wallet-" + Date.now();
            const grid = document.getElementById('walletsGrid');
            if (grid) {
                const novoCard = criarCardCarteira(id, nome, tipo, limite);
                grid.appendChild(novoCard);
            }

            // Fecha o modal e limpa o formulário
            document.getElementById('walletModal').classList.remove('active');
            this.reset();
            verificarEstadoCarteiras();
        });
    }

    // --- MÁSCARAS ---
    document.getElementById('walletLimit')?.addEventListener('input', (e) => aplicarMascaraValor(e.target));
    document.getElementById('orcamentoMensal')?.addEventListener('input', (e) => aplicarMascaraValor(e.target));
    document.getElementById('despesaValor')?.addEventListener('input', (e) => aplicarMascaraValor(e.target));
    document.getElementById('despesaData')?.addEventListener('input', (e) => aplicarMascaraData(e.target));
});

// Função auxiliar para fechar o modal de carteira (certifique-se de que não esteja duplicada no arquivo)
function fecharModalCarteira() {
    document.getElementById('walletModal')?.classList.remove('active');
}


function confirmarEDefinirOrcamento() {

    const input = document.getElementById('orcamentoMensal');

    if(!input) return;

    const valorNumerico = parseFloat(input.value.replace(/\./g, '').replace(',', '.')) || 0;



    localStorage.setItem('budget_total', valorNumerico);

    limiteMensal = valorNumerico;

   

    atualizarInterfaceOrcamento();

    renderizarStats();

    fecharModalRevisaoOrcamento();

    input.value = "";

}



function fecharModalRevisaoOrcamento() {

    document.getElementById('modalRevisaoOrcamento')?.classList.remove('active');

}



function abrirModalRevisaoOrcamento() {

    const input = document.getElementById('orcamentoMensal');

    const valorDigitado = input.value;



    if (!valorDigitado || valorDigitado === "0,00") {

        alert("Insira um valor válido.");

        return;

    }



    const revisaoDetails = document.getElementById('revisaoOrcamentoDetails');

    if(revisaoDetails) {

        revisaoDetails.innerHTML = `<p style="color: #94a3b8;">NOVO TETO MENSAL</p><h2 style="color: #22d3ee;">R$ ${valorDigitado}</h2>`;

    }

    document.getElementById('modalRevisaoOrcamento')?.classList.add('active');

}



function salvarDespesa() {

    const index = document.getElementById('editIndex').value;

    const titulo = document.getElementById('despesaTitulo').value;

    const valorRaw = document.getElementById('despesaValor').value;

    const categoria = document.getElementById('despesaCategoria').value;

    const metodo = document.getElementById('despesaMetodo').value;

    const data = document.getElementById('despesaData').value;

    const obs = document.getElementById('despesaDescricao').value;



    const valor = parseFloat(valorRaw.replace(/\./g, '').replace(',', '.')) || 0;



    if (!titulo || valor <= 0 || !validarData(data)) {

        alert("Preencha corretamente.");

        return;

    }



    const novaDespesa = { titulo, categoria, pagamento: metodo, valor, data, observacao: obs };



    if (index === "" || index === undefined) {

        despesasExemplo.push(novaDespesa);

    } else {

        despesasExemplo[parseInt(index)] = novaDespesa;

    }



    fecharModalDespesa();

    renderizarTabelas();

    renderizarStats();

}



function fecharModalDespesa() {

    const mDespesa = document.getElementById('modalDespesa');

    if (mDespesa) {

        mDespesa.classList.remove('active');

        document.getElementById('editIndex').value = "";

        document.getElementById('formDespesa').reset();

    }

}



// --- LÓGICA DE EXCLUSÃO (CORRIGIDA) ---

document.getElementById('btnConfirmDelete')?.addEventListener('click', () => {
    // Lógica para excluir Despesa
    if (indexDespesaParaExcluir !== null) {
        despesasExemplo.splice(indexDespesaParaExcluir, 1);
        indexDespesaParaExcluir = null;
    } 
    // Lógica para excluir Carteira
    else if (walletIdToDelete !== null) {
        const item = document.querySelector(`[data-id="${walletIdToDelete}"]`);
        if (item) item.remove();
        walletIdToDelete = null;
    }

    // Atualizações de interface após excluir
    verificarEstadoCarteiras();
    renderizarTabelas();
    renderizarStats();
    
    // Fecha o modal
    document.getElementById('deleteWalletModal')?.classList.remove('active');
});

document.getElementById('btnCancelDelete')?.addEventListener('click', () => {
    document.getElementById('deleteWalletModal')?.classList.remove('active');
    // Limpa os IDs para evitar exclusões acidentais ao reabrir
    walletIdToDelete = null;
    indexDespesaParaExcluir = null;
});
