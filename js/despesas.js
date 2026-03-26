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

    // Obtém as carteiras (contas/cartões) cadastradas no sistema
    getCarteiras() {
        return JSON.parse(localStorage.getItem('carteiras')) || [];
    },

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

    verificarMetodoPagamento() {
        const metodo = document.getElementById('metodo').value;
        const containerParcelamento = document.getElementById('containerParcelamento');
        const containerCartao = document.getElementById('containerCartao');
        const avisoInexistente = document.getElementById('avisoCartaoInexistente');
        const selectCartao = document.getElementById('cartaoSelecionado');
        const tipoMsg = document.getElementById('tipoCartaoMsg');

        // Reset inicial
        containerParcelamento.style.display = 'none';
        containerCartao.style.display = 'none';
        avisoInexistente.style.display = 'none';
        selectCartao.innerHTML = '';

        if (!metodo) return;

        const carteiras = this.getCarteiras();
        
        const mapeamentoTipos = {
            'Cartão de Crédito': 'Cartão de Crédito',
            'Cartão de Débito': 'Cartão de Débito',
            'VA': 'VA',
            'VR': 'VR'
        };

        const tipoBusca = mapeamentoTipos[metodo];

        if (tipoBusca) {
            const cartoesDisponiveis = carteiras.filter(c => c.tipo === tipoBusca);

            if (cartoesDisponiveis.length > 0) {
                containerCartao.style.display = 'block';
                
                const optDefault = document.createElement('option');
                optDefault.value = "";
                optDefault.textContent = "Selecionar...";
                optDefault.style.color = "#FFFFFF"; // Garante texto branco
                selectCartao.appendChild(optDefault);

                cartoesDisponiveis.forEach(c => {
                    const option = document.createElement('option');
                    option.value = c.nome;
                    option.textContent = c.bandeira ? `${c.nome} (${c.bandeira})` : c.nome;
                    option.style.color = "#FFFFFF"; // Garante texto branco
                    selectCartao.appendChild(option);
                });

                const separator = document.createElement('option');
                separator.disabled = true;
                separator.textContent = "──────────────────";
                separator.style.color = "#FFFFFF";
                selectCartao.appendChild(separator);

                const optNovo = document.createElement('option');
                optNovo.value = "ADICIONAR_NOVO_ACAO";
                optNovo.textContent = "+ Adicionar novo cartão"; 
                optNovo.style.fontWeight = "bold";
                optNovo.style.color = "#FFFFFF"; // Garante texto branco
                selectCartao.appendChild(optNovo);

                if (metodo === 'Cartão de Crédito') {
                    containerParcelamento.style.display = 'block';
                }
            } else {
                avisoInexistente.style.display = 'block';
                tipoMsg.textContent = metodo.toLowerCase();
            }
        } else {
            document.getElementById('foiParcelado').value = 'nao';
            this.toggleSeletorParcelas();
        }
    },

    redirecionarParaCarteira() {
        this.fecharModal();
        
        if (window.navegar) {
            window.navegar('carteiras');
        } else {
            const linkCarteira = document.querySelector('[data-section="carteiras"]');
            if (linkCarteira) linkCarteira.click();
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
        document.getElementById('containerCartao').style.display = 'none';
        document.getElementById('avisoCartaoInexistente').style.display = 'none';
        document.getElementById('numParcelas').style.display = 'none';

        form.querySelectorAll('select, input').forEach(el => el.style.color = "#FFFFFF");

        if (index !== -1) {
            document.getElementById('modalTitle').innerText = "Editar Despesa";
            const despesa = this.getDespesas()[index];
            document.getElementById('titulo').value = despesa.titulo;
            document.getElementById('valor').value = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(despesa.valor);
            document.getElementById('categoria').value = despesa.categoria;
            document.getElementById('metodo').value = despesa.pagamento;
            
            this.verificarMetodoPagamento();
            
            if (despesa.cartao) {
                document.getElementById('cartaoSelecionado').value = despesa.cartao;
            }

            if (despesa.pagamento === 'Cartão de Crédito' && despesa.parcelas) {
                document.getElementById('foiParcelado').value = 'sim';
                document.getElementById('numParcelas').value = despesa.parcelas;
                document.getElementById('numParcelas').style.display = 'block';
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
        const totalElement = document.getElementById('totalFiltrado');
        if (!tbody) return;

        let despesas = dadosFiltrados || this.getDespesas();
        
        if (totalElement) {
            const totalSoma = despesas.reduce((acc, d) => acc + d.valor, 0);
            totalElement.innerText = formatarMoeda(totalSoma);
        }

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
                
                // Alteração solicitada: Nome do cartão ao lado das parcelas
                let infoExtra = '';
                if (item.parcelas || item.cartao) {
                    infoExtra += `<div style="display: flex; gap: 5px; align-items: center; margin-top: 4px;">`;
                    if (item.parcelas) {
                        infoExtra += `<span style="color: #22d3ee; font-size: 11px; font-weight: 700;">${item.parcelas}</span>`;
                    }
                    if (item.cartao) {
                        infoExtra += `<span style="color: #FFFFFF; font-size: 10px; font-weight: 700;">${item.cartao}</span>`;
                    }
                    infoExtra += `</div>`;
                }

                const textoObs = item.observacao ? item.observacao : `<div style="text-align: center; width: 100%; opacity: 0.5;">-</div>`;

                htmlFinal += `
                    <tr style="border-bottom: 1px solid rgba(30, 41, 59, 0.3);">
                        <td style="padding: 15px 20px; color: white;">${item.titulo}</td>
                        <td style="padding: 15px 20px; text-align: center;">
                            <span style="background: ${estilo.bg}; color: ${estilo.text}; padding: 6px 0; border-radius: 8px; font-size: 10px; font-weight: 800; text-transform: uppercase; border: 1px solid ${estilo.text}33; display: inline-block; width: 110px; text-align: center;">
                                ${item.categoria}
                            </span>
                        </td>
                        <td style="padding: 15px 20px; color: white;">
                            ${item.pagamento}
                            ${infoExtra}
                        </td>
                        <td style="padding: 15px 20px;"><strong style="color: white;">${formatarMoeda(item.valor)}</strong></td>
                        <td style="padding: 15px 20px; color: white;">${this.formatarDataExibicao(item.data).replace('📅 HOJE - ', '')}</td>
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

        const selectCartao = document.getElementById('cartaoSelecionado');
        if (selectCartao) {
            selectCartao.addEventListener('change', (e) => {
                e.target.style.color = "#FFFFFF";
                if (e.target.value === "ADICIONAR_NOVO_ACAO") {
                    this.redirecionarParaCarteira();
                }
            });
        }

        form.querySelectorAll('select, input').forEach(campo => {
            campo.addEventListener('change', (e) => e.target.style.color = "#FFFFFF");
            campo.style.color = "#FFFFFF";
        });

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
            const cartaoSel = document.getElementById('cartaoSelecionado').value;
            const parcelas = (metodo === 'Cartão de Crédito' && foiParcelado === 'sim') ? document.getElementById('numParcelas').value : null;

            const novaDespesa = {
                titulo: document.getElementById('titulo').value,
                valor: parseFloat(valorLimpo),
                categoria: document.getElementById('categoria').value,
                pagamento: metodo,
                cartao: (cartaoSel && cartaoSel !== "ADICIONAR_NOVO_ACAO") ? cartaoSel : null,
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
        const filters = ['filterMonth', 'filterCategory', 'filterPayment', 'filterPeriod'].map(id => document.getElementById(id));
        const searchInput = document.getElementById('searchExpense');
        const btnLimpar = document.getElementById('btnClearFilters');

        const aplicar = () => {
            const [m, c, p, period] = filters.map(f => f ? f.value : 'todos');
            const termoBusca = searchInput ? searchInput.value.toLowerCase() : '';
            const hoje = new Date();
            hoje.setHours(23, 59, 59, 999);

            const filtradas = this.getDespesas().filter(d => {
                const dataDespesa = new Date(d.data);
                dataDespesa.setHours(0,0,0,0);
                
                let atendePeriodo = true;
                if (period !== 'todos') {
                    const diffTempo = Math.abs(hoje - dataDespesa);
                    const diffDias = Math.ceil(diffTempo / (1000 * 60 * 60 * 24));
                    atendePeriodo = diffDias <= parseInt(period);
                }

                const mesD = d.data.split('-')[1];
                const atendeBusca = d.titulo.toLowerCase().includes(termoBusca) || 
                                   (d.observacao && d.observacao.toLowerCase().includes(termoBusca));

                return (m === 'todos' || mesD === m) && 
                       (c === 'todos' || d.categoria === c) && 
                       (p === 'todos' || d.pagamento === p) &&
                       atendePeriodo && atendeBusca;
            });
            this.renderizarTabelaCompleta(filtradas);
        };

        filters.forEach(f => { if(f) f.addEventListener('change', aplicar); });
        
        if (searchInput) {
            searchInput.addEventListener('input', aplicar);
        }

        if (btnLimpar) {
            btnLimpar.onclick = () => {
                filters.forEach(f => { if(f) f.value = 'todos'; });
                if (searchInput) searchInput.value = '';
                aplicar();
            };
        }
    }
};

window.deletarDespesa = (index) => {
    const modal = document.getElementById('modalConfirmacao');
    const btnConfirmar = document.getElementById('btnConfirmarExclusao');
    if(modal) modal.style.display = 'flex';
    
    btnConfirmar.onclick = () => {
        let despesas = DespesasModulo.getDespesas();
        despesas.splice(index, 1);
        localStorage.setItem('despesas', JSON.stringify(despesas));
        DespesasModulo.renderizarTabelaCompleta();
        modal.style.display = 'none';
    };
};

window.editarDespesa = (index) => DespesasModulo.abrirModal(index);