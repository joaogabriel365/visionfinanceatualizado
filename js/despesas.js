import { salvarNoStorage, formatarMoeda, tratarClasseCategoria } from './common.js';

export const DespesasModulo = {
    init() {
        this.configurarFiltros();
        this.configurarFormulario();
        this.renderizarTabelaCompleta();
    },

    getDespesas() {
        return JSON.parse(localStorage.getItem('despesas')) || [];
    },

    abrirModal(index = -1) {
        const modal = document.getElementById('modalDespesa');
        const form = document.getElementById('formDespesa');
        const title = document.getElementById('modalTitle');
        const editIndex = document.getElementById('editIndex');

        form.reset();
        editIndex.value = index;

        if (index !== -1) {
            title.innerText = "Editar Despesa";
            const despesa = this.getDespesas()[index];
            document.getElementById('titulo').value = despesa.titulo;
            document.getElementById('valor').value = despesa.valor;
            document.getElementById('categoria').value = despesa.categoria;
            document.getElementById('metodo').value = despesa.pagamento;
            document.getElementById('data').value = despesa.data;
            document.getElementById('observacao').value = despesa.observacao || '';
        } else {
            title.innerText = "Nova Despesa";
        }

        modal.style.display = 'flex';
    },

    fecharModal() {
        document.getElementById('modalDespesa').style.display = 'none';
    },

    configurarFormulario() {
        const form = document.getElementById('formDespesa');
        if (!form) return;

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const index = parseInt(document.getElementById('editIndex').value);
            const novaDespesa = {
                titulo: document.getElementById('titulo').value,
                valor: parseFloat(document.getElementById('valor').value),
                categoria: document.getElementById('categoria').value,
                pagamento: document.getElementById('metodo').value,
                data: document.getElementById('data').value,
                observacao: document.getElementById('observacao').value
            };

            let despesas = this.getDespesas();

            if (index === -1) {
                despesas.push(novaDespesa);
            } else {
                despesas[index] = novaDespesa;
            }

            localStorage.setItem('despesas', JSON.stringify(despesas));
            this.renderizarTabelaCompleta();
            this.fecharModal();
        });
    },

    renderizarTabelaCompleta(dadosFiltrados = null) {
        const tbody = document.getElementById('fullExpenseTableBody');
        if (!tbody) return;

        const despesas = dadosFiltrados || this.getDespesas();

        if (despesas.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:30px; color:#64748b;">Nenhuma despesa encontrada.</td></tr>';
            return;
        }

        tbody.innerHTML = despesas.map((item, index) => `
            <tr>
                <td>${item.titulo}</td>
                <td><span class="category-tag ${tratarClasseCategoria(item.categoria)}">${item.categoria}</span></td>
                <td>${item.pagamento}</td>
                <td><strong style="color: white;">${formatarMoeda(item.valor)}</strong></td>
                <td>${item.data}</td>
                <td style="color: #94a3b8; font-size: 0.9em;">${item.observacao || '-'}</td>
                <td style="text-align: center; display: flex; justify-content: center; gap: 12px;">
                    <button class="btn-action" onclick="window.editarDespesa(${index})" title="Editar">
                        <img src="img/lapis.png" alt="Editar" style="width: 18px; cursor: pointer;">
                    </button>
                    <button class="btn-action" onclick="window.deletarDespesa(${index})" title="Excluir">
                        <img src="img/lixeira.png" alt="Excluir" style="width: 18px; cursor: pointer;">
                    </button>
                </td>
            </tr>
        `).join('');
    },

    configurarFiltros() {
        const fMonth = document.getElementById('filterMonth');
        const fCat = document.getElementById('filterCategory');
        const fPay = document.getElementById('filterPayment');

        const aplicarFiltros = () => {
            let despesas = this.getDespesas();
            const mesSel = fMonth.value;
            const catSel = fCat.value;
            const paySel = fPay.value;

            const filtradas = despesas.filter(d => {
                const mesData = d.data.split('-')[1] || d.data.split('/')[1];
                const bateMes = mesSel === 'todos' || mesData === mesSel;
                const bateCat = catSel === 'todos' || d.categoria === catSel;
                const batePay = paySel === 'todos' || d.pagamento === paySel;
                return bateMes && bateCat && batePay;
            });

            this.renderizarTabelaCompleta(filtradas);
        };

        fMonth.addEventListener('change', aplicarFiltros);
        fCat.addEventListener('change', aplicarFiltros);
        fPay.addEventListener('change', aplicarFiltros);
    }
};

// Funções globais expondo os métodos do módulo
window.deletarDespesa = (index) => {
    if (confirm('Deseja realmente excluir esta despesa?')) {
        let despesas = DespesasModulo.getDespesas();
        despesas.splice(index, 1);
        localStorage.setItem('despesas', JSON.stringify(despesas));
        DespesasModulo.renderizarTabelaCompleta();
    }
};

window.editarDespesa = (index) => {
    DespesasModulo.abrirModal(index);
};