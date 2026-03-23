import { salvarNoStorage, formatarMoeda, tratarClasseCategoria } from './common.js';

export const DespesasModulo = {
    init() {
        this.configurarFiltros();
        this.configurarFormulario();
        this.aplicarMascaras();
        this.renderizarTabelaCompleta();
        window.DespesasModulo = this;
    },

    getDespesas() {
        return JSON.parse(localStorage.getItem('despesas')) || [];
    },

    // 1. Definição de cores fixas por categoria
    obterEstiloCategoria(categoria) {
        const cores = {
            'Alimentação': { bg: 'rgba(245, 158, 11, 0.15)', text: '#fbbf24' },
            'Transporte': { bg: 'rgba(59, 130, 246, 0.15)', text: '#60a5fa' },
            'Lazer': { bg: 'rgba(236, 72, 153, 0.15)', text: '#f472b6' },
            'Saúde': { bg: 'rgba(16, 185, 129, 0.15)', text: '#34d399' },
            'Moradia': { bg: 'rgba(139, 92, 246, 0.15)', text: '#a78bfa' }
        };
        return cores[categoria] || { bg: 'rgba(148, 163, 184, 0.1)', text: '#94a3b8' };
    },

    // 2. Lógica de Parcelamento
    verificarMetodoPagamento() {
        const metodo = document.getElementById('metodo').value;
        const container = document.getElementById('containerParcelamento');
        if (metodo === 'Cartão de Crédito') {
            container.style.display = 'block';
        } else {
            container.style.display = 'none';
            document.getElementById('foiParcelado').value = 'nao';
            this.toggleSeletorParcelas();
        }
    },

    toggleSeletorParcelas() {
        const foiParcelado = document.getElementById('foiParcelado').value;
        const seletor = document.getElementById('numParcelas');
        seletor.style.display = (foiParcelado === 'sim') ? 'block' : 'none';
    },

    aplicarMascaras() {
        const valorInput = document.getElementById('valor');
        const dataInput = document.getElementById('data');
        const observacaoInput = document.getElementById('observacao');

        if (valorInput) {
            valorInput.addEventListener('input', (e) => {
                let value = e.target.value.replace(/\D/g, '');
                if (value.length > 10) value = value.slice(0, 10);
                if (value === "") { e.target.value = ""; return; }
                const valorFloat = parseFloat(value) / 100;
                e.target.value = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorFloat);
            });
        }

        if (dataInput) {
            dataInput.addEventListener('input', (e) => {
                let value = e.target.value.replace(/\D/g, '');
                if (value.length > 8) value = value.slice(0, 8);
                if (value.length >= 5) value = `${value.slice(0, 2)}/${value.slice(2, 4)}/${value.slice(4)}`;
                else if (value.length >= 3) value = `${value.slice(0, 2)}/${value.slice(2)}`;
                e.target.value = value;
                this.limparErroData();
            });
        }

        if (observacaoInput) {
            observacaoInput.addEventListener('input', (e) => {
                if (e.target.value.length > 40) e.target.value = e.target.value.slice(0, 40);
            });
        }
    },

    validarData(dataString) {
        const regex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
        if (!regex.test(dataString)) return false;
        const [_, dia, mes, ano] = dataString.match(regex).map(Number);
        if (ano < 1900 || ano > 2100 || mes < 1 || mes > 12) return false;
        const diasNoMes = [31, (ano % 4 === 0 && (ano % 100 !== 0 || ano % 400 === 0)) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
        return dia > 0 && dia <= diasNoMes[mes - 1];
    },

    exibirErroData(mensagem) {
        this.limparErroData();
        const dataInput = document.getElementById('data');
        const erroSpan = document.createElement('span');
        erroSpan.id = 'error-data-msg';
        erroSpan.style.cssText = 'color: #ff4d4d; font-size: 12px; margin-top: 5px; display: block; font-weight: 600;';
        erroSpan.innerText = mensagem;
        dataInput.parentNode.appendChild(erroSpan);
        dataInput.style.borderColor = '#ff4d4d';
    },

    limparErroData() {
        const msg = document.getElementById('error-data-msg');
        if (msg) msg.remove();
        const dataInput = document.getElementById('data');
        if (dataInput) dataInput.style.borderColor = '';
    },

    abrirModal(index = -1) {
        const modal = document.getElementById('modalDespesa');
        const form = document.getElementById('formDespesa');
        if (!modal || !form) return;

        form.reset();
        this.limparErroData();
        document.getElementById('editIndex').value = index;
        document.getElementById('containerParcelamento').style.display = 'none';
        document.getElementById('numParcelas').style.display = 'none';

        if (index !== -1) {
            document.getElementById('modalTitle').innerText = "Editar Despesa";
            const despesa = this.getDespesas()[index];
            document.getElementById('titulo').value = despesa.titulo;
            document.getElementById('valor').value = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(despesa.valor);
            document.getElementById('categoria').value = despesa.categoria;
            document.getElementById('metodo').value = despesa.pagamento;
            
            if (despesa.pagamento === 'Cartão de Crédito') {
                document.getElementById('containerParcelamento').style.display = 'block';
                if (despesa.parcelas) {
                    document.getElementById('foiParcelado').value = 'sim';
                    document.getElementById('numParcelas').value = despesa.parcelas;
                    document.getElementById('numParcelas').style.display = 'block';
                }
            }

            const partes = despesa.data.split('-');
            document.getElementById('data').value = `${partes[2]}/${partes[1]}/${partes[0]}`;
            document.getElementById('observacao').value = despesa.observacao || '';
        } else {
            document.getElementById('modalTitle').innerText = "Nova Despesa";
            const h = new Date();
            document.getElementById('data').value = `${String(h.getDate()).padStart(2, '0')}/${String(h.getMonth() + 1).padStart(2, '0')}/${h.getFullYear()}`;
        }
        modal.style.display = 'flex';
    },

    fecharModal() {
        const modal = document.getElementById('modalDespesa');
        if (modal) modal.style.display = 'none';
    },

    formatarDataExibicao(dataIso) {
        if (!dataIso || typeof dataIso !== 'string') return "Data Inválida";
        const partes = dataIso.split('-');
        if (partes.length !== 3) return dataIso;
        const dataFormatada = `${partes[2]}/${partes[1]}/${partes[0]}`;
        const hoje = new Date().toLocaleDateString('pt-BR');
        return (hoje === dataFormatada) ? `📅 HOJE - ${dataFormatada}` : dataFormatada;
    },

    renderizarTabelaCompleta(dadosFiltrados = null) {
        const tbody = document.getElementById('fullExpenseTableBody');
        if (!tbody) return;

        let despesas = dadosFiltrados || this.getDespesas();
        if (despesas.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:30px; color:#64748b;">Nenhuma despesa encontrada.</td></tr>';
            return;
        }

        despesas.sort((a, b) => new Date(b.data) - new Date(a.data));

        const grupos = despesas.reduce((acc, d) => {
            acc[d.data] = acc[d.data] || [];
            acc[d.data].push(d);
            return acc;
        }, {});

        const datasOrdenadas = Object.keys(grupos).sort((a, b) => new Date(b) - new Date(a));
        let htmlFinal = '';

        datasOrdenadas.forEach(dataKey => {
            htmlFinal += `
                <tr style="background: rgba(30, 41, 59, 0.5);">
                    <td colspan="7" style="padding: 12px 20px; color: #22d3ee; font-weight: 700; font-size: 13px; border-bottom: 1px solid #1e293b;">
                        ${this.formatarDataExibicao(dataKey)}
                    </td>
                </tr>`;

            grupos[dataKey].forEach((item) => {
                const globalIndex = this.getDespesas().findIndex(d => JSON.stringify(d) === JSON.stringify(item));
                const estilo = this.obterEstiloCategoria(item.categoria);
                
                // Exibição do parcelamento na coluna Pagamento
                const infoParcela = item.parcelas ? `<span style="color: #22d3ee; font-size: 11px; display: block; font-weight: 700;">💳 ${item.parcelas}</span>` : '';
                
                // Alinhamento centralizado do "-" na descrição
                const textoObs = item.observacao ? item.observacao : `<div style="text-align: center; width: 100%; opacity: 0.5;">-</div>`;

                htmlFinal += `
                    <tr style="border-bottom: 1px solid rgba(30, 41, 59, 0.3);">
                        <td style="padding: 15px 20px; color: white;">${item.titulo}</td>
                        <td style="padding: 15px 20px;">
                            <span style="background: ${estilo.bg}; color: ${estilo.text}; padding: 5px 12px; border-radius: 8px; font-size: 11px; font-weight: 800; text-transform: uppercase; border: 1px solid ${estilo.text}33;">
                                ${item.categoria}
                            </span>
                        </td>
                        <td style="padding: 15px 20px;">
                            ${item.pagamento}
                            ${infoParcela}
                        </td>
                        <td style="padding: 15px 20px;"><strong style="color: white;">${formatarMoeda(item.valor)}</strong></td>
                        <td style="padding: 15px 20px;">${this.formatarDataExibicao(item.data).replace('📅 HOJE - ', '')}</td>
                        <td style="padding: 15px 20px; color: #94a3b8; font-size: 0.9em; vertical-align: middle;">${textoObs}</td>
                        <td style="padding: 15px 20px; text-align: center;">
                            <div style="display: flex; justify-content: center; gap: 15px;">
                                <button class="btn-action" onclick="window.editarDespesa(${globalIndex})">
                                    <img src="img/lapis.png" style="width: 16px; opacity: 0.7;">
                                </button>
                                <button class="btn-action" onclick="window.deletarDespesa(${globalIndex})">
                                    <img src="img/lixeira.png" style="width: 16px; opacity: 0.7;">
                                </button>
                            </div>
                        </td>
                    </tr>`;
            });
        });
        tbody.innerHTML = htmlFinal;
    },

    configurarFormulario() {
        const form = document.getElementById('formDespesa');
        if (!form) return;
        form.onsubmit = (e) => {
            e.preventDefault();
            const dataRaw = document.getElementById('data').value;
            if (!this.validarData(dataRaw)) {
                this.exibirErroData("Por favor, insira uma data válida.");
                return;
            }

            const index = parseInt(document.getElementById('editIndex').value);
            let valorTexto = document.getElementById('valor').value;
            const valorLimpo = valorTexto.replace(/[^\d,]/g, '').replace(',', '.');
            const [d, m, a] = dataRaw.split('/');
            
            const metodo = document.getElementById('metodo').value;
            const foiParcelado = document.getElementById('foiParcelado').value;
            const parcelas = (metodo === 'Cartão de Crédito' && foiParcelado === 'sim') ? document.getElementById('numParcelas').value : null;

            const novaDespesa = {
                titulo: document.getElementById('titulo').value,
                valor: parseFloat(valorLimpo),
                categoria: document.getElementById('categoria').value,
                pagamento: metodo,
                parcelas: parcelas,
                data: `${a}-${m}-${d}`,
                observacao: document.getElementById('observacao').value
            };

            let despesas = this.getDespesas();
            if (index === -1) despesas.push(novaDespesa);
            else despesas[index] = novaDespesa;

            localStorage.setItem('despesas', JSON.stringify(despesas));
            this.renderizarTabelaCompleta();
            this.fecharModal();
        };
    },

    configurarFiltros() {
        const filters = ['filterMonth', 'filterCategory', 'filterPayment'].map(id => document.getElementById(id));
        if (filters.some(f => !f)) return;
        const aplicar = () => {
            const [m, c, p] = filters.map(f => f.value);
            const filtradas = this.getDespesas().filter(d => {
                const mesD = d.data.split('-')[1];
                return (m === 'todos' || mesD === m) && (c === 'todos' || d.categoria === c) && (p === 'todos' || d.pagamento === p);
            });
            this.renderizarTabelaCompleta(filtradas);
        };
        filters.forEach(f => f.addEventListener('change', aplicar));
    }
};

window.deletarDespesa = (index) => {
    const modal = document.getElementById('modalConfirmacao');
    const btnConfirmar = document.getElementById('btnConfirmarExclusao');
    
    modal.style.display = 'flex';
    
    btnConfirmar.onclick = () => {
        let despesas = DespesasModulo.getDespesas();
        despesas.splice(index, 1);
        localStorage.setItem('despesas', JSON.stringify(despesas));
        DespesasModulo.renderizarTabelaCompleta();
        modal.style.display = 'none';
    };
};

window.editarDespesa = (index) => DespesasModulo.abrirModal(index);