import { salvarNoStorage, formatarMoeda, tratarClasseCategoria, confirmarAcao, getCategoryBadgeStyle, getThemeVar } from './common.js';

const editIconUrl = new URL('../img/lapis.png', import.meta.url).href;
const deleteIconUrl = new URL('../img/lixeira.png', import.meta.url).href;
const commentIconUrl = new URL('../img/comentario.png', import.meta.url).href;

export const DespesasModulo = {
    init() {
        this.configurarFiltros();
        this.configurarFormulario();
        this.aplicarMascaras();
        this.configurarModalDescricao();
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
        return getCategoryBadgeStyle(categoria);
    },

    verificarMetodoPagamento() {
        const textPrimary = getThemeVar('--text-primary') || '#0f172a';
        const accent = getThemeVar('--accent') || '#0b63ce';
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
        
        // Mapeamento que define quais métodos exigem seleção de uma "carteira/cartão"
        const mapeamentoTipos = {
            'Cartão de Crédito': 'Cartão de Crédito',
            'Cartão de Débito': 'Cartão de Débito',
            'VA': 'Vale Alimentação',
            'VR': 'Vale Refeição'
        };

        const tipoBusca = mapeamentoTipos[metodo];

        if (tipoBusca) {
            const cartoesDisponiveis = carteiras.filter(c => c.tipo === tipoBusca);

            if (cartoesDisponiveis.length > 0) {
                containerCartao.style.display = 'block';
                
                const optDefault = document.createElement('option');
                optDefault.value = "";
                optDefault.textContent = "Selecionar...";
                optDefault.style.color = textPrimary;
                selectCartao.appendChild(optDefault);

                cartoesDisponiveis.forEach(c => {
                    const option = document.createElement('option');
                    option.value = c.nome;
                    option.textContent = c.bandeira ? `${c.nome} (${c.bandeira})` : c.nome;
                    option.style.color = textPrimary;
                    selectCartao.appendChild(option);
                });

                const separator = document.createElement('option');
                separator.disabled = true;
                separator.textContent = "──────────────────";
                separator.style.color = textPrimary;
                selectCartao.appendChild(separator);

                const optNovo = document.createElement('option');
                optNovo.value = "ADICIONAR_NOVO_ACAO";
                optNovo.textContent = "+ Adicionar novo cartão"; 
                optNovo.style.fontWeight = "bold";
                optNovo.style.color = accent;
                selectCartao.appendChild(optNovo);

                if (metodo === 'Cartão de Crédito') {
                    containerParcelamento.style.display = 'block';
                }
            } else {
                avisoInexistente.style.display = 'block';
                tipoMsg.textContent = metodo.toLowerCase();
            }
        } else {
            // Se for Pix ou Dinheiro, garante que parcelamento e cartões fiquem ocultos
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
            observacaoInput.maxLength = 500;
            observacaoInput.addEventListener('input', (e) => {
                if (e.target.value.length > 500) {
                    e.target.value = e.target.value.slice(0, 500);
                }
            });
        }
    },

    configurarModalDescricao() {
        const modal = document.getElementById('expenseDescriptionModal');
        const closeButton = document.getElementById('expenseDescriptionClose');

        if (!modal || modal.dataset.bound === 'true') return;

        modal.dataset.bound = 'true';

        closeButton?.addEventListener('click', () => this.fecharModalDescricao());

        modal.addEventListener('click', (event) => {
            if (event.target === modal) {
                this.fecharModalDescricao();
            }
        });

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && modal.style.display === 'flex') {
                this.fecharModalDescricao();
            }
        });
    },

    abrirModalDescricao(titulo, descricao) {
        const modal = document.getElementById('expenseDescriptionModal');
        const title = document.getElementById('expenseDescriptionTitle');
        const body = document.getElementById('expenseDescriptionBody');

        if (!modal || !title || !body) return;

        title.textContent = titulo ? `Descrição de ${titulo}` : 'Descrição da despesa';
        body.textContent = descricao || 'Nenhuma descrição informada.';
        modal.style.display = 'flex';
    },

    fecharModalDescricao() {
        const modal = document.getElementById('expenseDescriptionModal');
        if (modal) modal.style.display = 'none';
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

        const textPrimary = getThemeVar('--text-primary') || '#0f172a';
        form.querySelectorAll('select, input, textarea').forEach(el => el.style.color = textPrimary);

        if (index !== -1) {
            document.getElementById('modalTitle').innerText = "Editar Despesa";
            const despesa = this.getDespesas()[index];
            document.getElementById('titulo').value = despesa.titulo;
            
            // Reconstituir o valor total para edição
            const valorParaEdicao = despesa.valorTotalOriginal || despesa.valor;
            document.getElementById('valor').value = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorParaEdicao);
            
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
        const isLightTheme = document.body.classList.contains('light-theme');
        const sectionRowBackground = isLightTheme ? (getThemeVar('--accent') || '#0b63ce') : 'rgba(30, 41, 59, 0.5)';
        const sectionRowText = isLightTheme ? '#ffffff' : (getThemeVar('--accent') || '#d4af37');
        const sectionRowBorder = isLightTheme ? (getThemeVar('--accent-hover') || '#084da0') : (getThemeVar('--border-color') || '#2a3948');

        let despesas = dadosFiltrados || this.getDespesas();
        
        if (totalElement) {
            const totalSoma = despesas.reduce((acc, d) => acc + d.valor, 0);
            totalElement.innerText = formatarMoeda(totalSoma);
        }

        if (despesas.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="expense-empty-state">Nenhuma despesa encontrada.</td></tr>';
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

        const getPaymentIcon = (metodo) => {
            const icons = {
                'Cartão de Crédito': 'fa-credit-card',
                'Cartão de Débito': 'fa-credit-card',
                'Pix': 'fa-bolt',
                'Dinheiro': 'fa-money-bill-wave',
                'VR': 'fa-utensils',
                'VA': 'fa-basket-shopping'
            };

            return icons[metodo] || 'fa-wallet';
        };

        datasOrdenadas.forEach(dataKey => {
            htmlFinal += `
                <tr class="expense-date-group-row">
                    <td colspan="7">
                        <span class="expense-date-group-badge" style="background: ${sectionRowBackground}; color: ${sectionRowText}; border-bottom: 1px solid ${sectionRowBorder};">
                            ${this.formatarDataExibicao(dataKey)}
                        </span>
                    </td>
                </tr>`;

            grupos[dataKey].forEach((item) => {
                const globalIndex = this.getDespesas().findIndex(d => JSON.stringify(d) === JSON.stringify(item));
                const estilo = this.obterEstiloCategoria(item.categoria);
                
                let infoExtra = '';
                if (item.parcelas || item.cartao) {
                    infoExtra += `<div class="expense-payment-extra">`;
                    if (item.parcelas) {
                        infoExtra += `<span class="expense-payment-chip expense-payment-chip-installments">${item.parcelas}</span>`;
                    }
                    if (item.cartao) {
                        infoExtra += `<span class="expense-payment-chip expense-payment-chip-card">${item.cartao}</span>`;
                    }
                    infoExtra += `</div>`;
                }

                const tituloSeguro = JSON.stringify(item.titulo || 'Despesa');
                const observacaoSegura = JSON.stringify(item.observacao || '');
                const textoObs = item.observacao
                    ? `<button type="button" class="expense-description-trigger" onclick='window.DespesasModulo.abrirModalDescricao(${tituloSeguro}, ${observacaoSegura})' aria-label="Abrir descrição da despesa ${item.titulo}" title="Abrir descrição">
                            <img src="${commentIconUrl}" alt="" class="expense-description-icon">
                       </button>`
                    : `<div class="expense-description-empty">-</div>`;

                // Alteração Solicitada: Mostrar valor cheio na tabela (usando o valorTotalOriginal)
                const valorExibicao = item.valorTotalOriginal || item.valor;

                htmlFinal += `
                    <tr class="expense-row">
                        <td class="expense-cell-title" data-label="Titulo">
                            <div class="expense-title-block">
                                <strong class="expense-title-main">${item.titulo}</strong>
                            </div>
                        </td>
                        <td class="expense-cell-category" data-label="Categoria">
                            <div class="expense-field-stack">
                                <span class="expense-field-label"><i class="fas fa-tags"></i><span>Categoria</span></span>
                                <span class="category-tag category-tag-strong" style="--tag-bg: ${estilo.bg}; --tag-text: ${estilo.text}; --tag-border: ${estilo.border}; min-width: 110px;">
                                    ${item.categoria}
                                </span>
                            </div>
                        </td>
                        <td class="expense-cell-payment" data-label="Pagamento">
                            <div class="expense-field-stack">
                                <span class="expense-field-label"><i class="fas ${getPaymentIcon(item.pagamento)}"></i><span>Pagamento</span></span>
                                <span class="expense-payment-main">${item.pagamento}</span>
                                ${infoExtra}
                            </div>
                        </td>
                        <td class="expense-cell-value" data-label="Valor">
                            <div class="expense-field-stack">
                                <span class="expense-field-label"><i class="fas fa-money-bill-wave"></i><span>Valor</span></span>
                                <strong class="expense-value-strong">${formatarMoeda(valorExibicao)}</strong>
                            </div>
                        </td>
                        <td class="expense-cell-date" data-label="Data">
                            <div class="expense-field-stack">
                                <span class="expense-field-label"><i class="fas fa-calendar-days"></i><span>Data</span></span>
                                <span class="expense-date-text">${this.formatarDataExibicao(item.data).replace('📅 HOJE - ', '')}</span>
                            </div>
                        </td>
                        <td class="expense-cell-description${item.observacao ? '' : ' expense-cell-description-empty-row'}" data-label="Descricao">
                            <div class="expense-field-stack">
                                <span class="expense-field-label"><i class="fas fa-align-left"></i><span>Descrição</span></span>
                                ${textoObs}
                            </div>
                        </td>
                        <td class="expense-cell-actions" data-label="Acoes">
                            <div class="expense-actions">
                                <button class="btn-action btn-edit" onclick="window.editarDespesa(${globalIndex})" title="Editar despesa" aria-label="Editar despesa ${item.titulo}">
                                    <img src="${editIconUrl}" alt="Editar" class="expense-action-image">
                                </button>
                                <button class="btn-action btn-delete" onclick="window.deletarDespesa(${globalIndex})" title="Excluir despesa" aria-label="Excluir despesa ${item.titulo}">
                                    <img src="${deleteIconUrl}" alt="Excluir" class="expense-action-image">
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
        const getFormTextColor = () => getThemeVar('--text-primary') || '#0f172a';

        const selectCartao = document.getElementById('cartaoSelecionado');
        if (selectCartao) {
            selectCartao.addEventListener('change', (e) => {
                e.target.style.color = getFormTextColor();
                if (e.target.value === "ADICIONAR_NOVO_ACAO") {
                    this.redirecionarParaCarteira();
                }
            });
        }

        form.querySelectorAll('select, input, textarea').forEach(campo => {
            campo.addEventListener('change', (e) => e.target.style.color = getFormTextColor());
            campo.style.color = getFormTextColor();
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
            const parcelasInput = (metodo === 'Cartão de Crédito' && foiParcelado === 'sim') ? document.getElementById('numParcelas').value : null;

            const valorTotalOriginal = parseFloat(valorLimpo);
            let valorFinalParaCalculo = valorTotalOriginal;

            // Lógica de Parcelamento: O valor real da despesa vira o valor da parcela (ex: 125)
            if (parcelasInput) {
                const numParcelasMatch = parcelasInput.match(/\d+/);
                const numParcelas = numParcelasMatch ? parseInt(numParcelasMatch[0]) : 1;
                valorFinalParaCalculo = valorTotalOriginal / numParcelas;
            }

            const novaDespesa = {
                titulo: document.getElementById('titulo').value,
                valor: valorFinalParaCalculo, // Valor da parcela para somas/limites
                valorTotalOriginal: valorTotalOriginal, // Valor cheio para exibição
                categoria: document.getElementById('categoria').value,
                pagamento: metodo,
                cartao: (cartaoSel && cartaoSel !== "ADICIONAR_NOVO_ACAO") ? cartaoSel : null,
                parcelas: parcelasInput,
                data: `${a}-${m}-${d}`,
                observacao: document.getElementById('observacao').value
            };

            let despesas = this.getDespesas();
            if (index === -1) despesas.push(novaDespesa);
            else despesas[index] = novaDespesa;

            localStorage.setItem('despesas', JSON.stringify(despesas));
            
            // Forçar atualização das carteiras (limite) imediatamente após salvar
            this.sincronizarGastoCarteiras();

            this.renderizarTabelaCompleta();
            this.fecharModal();
        };
    },

    // Garante que o gasto nas carteiras reflita a soma das parcelas (125)
    sincronizarGastoCarteiras() {
        const despesas = this.getDespesas();
        const carteiras = this.getCarteiras();

        // Zerar gastos para recalcular
        carteiras.forEach(c => c.gasto = 0);

        despesas.forEach(d => {
            if (d.cartao) {
                const carteira = carteiras.find(c => c.nome === d.cartao);
                if (carteira) {
                    carteira.gasto += d.valor; // d.valor já é o valor da parcela (125)
                }
            }
        });

        localStorage.setItem('carteiras', JSON.stringify(carteiras));
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

window.deletarDespesa = async (index) => {
    const confirmado = await confirmarAcao(
        "Confirmar Exclusão", 
        "Você tem certeza que deseja remover esta despesa? Esta ação não pode ser desfeita."
    );
    
    if (confirmado) {
        let despesas = DespesasModulo.getDespesas();
        despesas.splice(index, 1);
        localStorage.setItem('despesas', JSON.stringify(despesas));
        DespesasModulo.sincronizarGastoCarteiras();
        DespesasModulo.renderizarTabelaCompleta();
    }
};

window.editarDespesa = (index) => DespesasModulo.abrirModal(index);