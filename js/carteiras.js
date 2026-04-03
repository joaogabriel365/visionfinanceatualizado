import { formatarMoeda, getThemeVar } from './common.js';

export const CarteirasModulo = {
    lista: JSON.parse(localStorage.getItem('carteiras')) || [],
    coresPredefinidas: [
        '#1e293b', '#4c1d95', '#1e3a8a', '#14532d',
        '#7c2d12', '#701a75', '#450a0a', '#064e3b'
    ],

    init() {
        this.renderizarWallets();
        this.configurarFormulario();
        this.configurarMascara();
        this.configurarLogicaTipo();
        this.renderizarSeletorCores();
        this.configurarModal();
    },

    atualizarLabelLimite(tipo) {
        const labelLimit = document.getElementById('labelLimit');
        if (!labelLimit) return;

        const labels = {
            'Cartão de Crédito': 'Limite Total',
            'Cartão de Débito': 'Saldo Disponível',
            default: 'Valor/Saldo'
        };

        labelLimit.innerText = labels[tipo] || labels.default;
    },

    selecionarCor(cor) {
        const container = document.getElementById('colorPickerContainer');
        const inputColor = document.getElementById('walletColor');
        if (!container || !inputColor) return;

        container.querySelectorAll('.color-option').forEach((option) => {
            const selecionada = option.dataset.color === cor;
            option.style.borderColor = selecionada ? getThemeVar('--accent') : 'transparent';
            option.style.boxShadow = selecionada ? `0 0 0 3px ${getThemeVar('--accent-soft')}` : 'none';
        });

        inputColor.value = cor;
    },

    renderizarSeletorCores() {
        const container = document.getElementById('colorPickerContainer');
        if (!container) return;

        const inputColor = document.getElementById('walletColor');
        const corAtual = inputColor?.value || this.coresPredefinidas[0];

        container.innerHTML = this.coresPredefinidas.map((cor) => `
            <div class="color-option" data-color="${cor}" style="background: ${cor}; height: 35px; border-radius: 8px; cursor: pointer; border: 2px solid transparent; transition: 0.2s;"></div>
        `).join('');

        container.querySelectorAll('.color-option').forEach((opt) => {
            opt.onclick = () => {
                this.selecionarCor(opt.dataset.color);
            };
        });

        if (this.coresPredefinidas.includes(corAtual)) {
            this.selecionarCor(corAtual);
        } else if (container.firstElementChild) {
            container.firstElementChild.click();
        }
    },

    resetarFormularioCarteira() {
        const form = document.getElementById('walletForm');
        const modalTitle = document.getElementById('walletModalTitle');
        const editIndex = document.getElementById('editWalletIndex');
        const checkUnlimited = document.getElementById('isUnlimited');
        const inputLimit = document.getElementById('walletLimit');
        const selectType = document.getElementById('walletType');
        const corPadrao = this.coresPredefinidas[0];

        if (form) form.reset();
        if (modalTitle) modalTitle.innerText = 'Nova Carteira';
        if (editIndex) editIndex.value = '-1';
        if (checkUnlimited) checkUnlimited.checked = false;

        if (inputLimit) {
            inputLimit.disabled = false;
            inputLimit.style.opacity = '1';
            inputLimit.required = true;
            inputLimit.value = '';
        }

        if (selectType) {
            selectType.value = 'Cartão de Crédito';
            this.atualizarLabelLimite(selectType.value);
        }

        this.selecionarCor(corPadrao);
    },

    abrirModalNova() {
        const modal = document.getElementById('walletModal');
        this.resetarFormularioCarteira();
        if (modal) modal.style.display = 'flex';
    },

    fecharModal() {
        const modal = document.getElementById('walletModal');
        if (modal) modal.style.display = 'none';
        this.resetarFormularioCarteira();
    },

    configurarModal() {
        const modal = document.getElementById('walletModal');
        if (!modal || modal.dataset.bound === 'true') return;

        modal.dataset.bound = 'true';
        modal.addEventListener('click', (event) => {
            if (event.target === modal) {
                this.fecharModal();
            }
        });
    },

    configurarMascara() {
        const inputLimit = document.getElementById('walletLimit');
        if (!inputLimit) return;

        inputLimit.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length > 9) value = value.slice(0, 9);
            const valorFloat = parseFloat(value) / 100;
            e.target.value = Number.isNaN(valorFloat)
                ? ''
                : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorFloat);
        });
    },

    configurarLogicaTipo() {
        const selectType = document.getElementById('walletType');
        const labelLimit = document.getElementById('labelLimit');
        const checkUnlimited = document.getElementById('isUnlimited');
        const inputLimit = document.getElementById('walletLimit');

        if (selectType) {
            selectType.addEventListener('change', (e) => {
                this.atualizarLabelLimite(e.target.value);
            });
        }

        if (checkUnlimited) {
            checkUnlimited.addEventListener('change', (e) => {
                inputLimit.disabled = e.target.checked;
                inputLimit.style.opacity = e.target.checked ? '0.4' : '1';
                inputLimit.required = !e.target.checked;
                if (e.target.checked) inputLimit.value = 'R$ 0,00';
            });
        }
    },

    calcularGastoCartao(nomeCartao) {
        const despesas = JSON.parse(localStorage.getItem('despesas')) || [];
        return despesas
            .filter((despesa) => despesa.cartao === nomeCartao)
            .reduce((acc, despesa) => acc + (parseFloat(despesa.valor) || 0), 0);
    },

    abrirModalEdicao(index) {
        const wallet = this.lista[index];
        const modal = document.getElementById('walletModal');
        if (!wallet || !modal) return;

        document.getElementById('walletModalTitle').innerText = 'Editar Carteira';
        document.getElementById('editWalletIndex').value = index;
        document.getElementById('walletName').value = wallet.nome;
        document.getElementById('walletType').value = wallet.tipo;
        document.getElementById('isUnlimited').checked = wallet.ilimitado;
        document.getElementById('walletColor').value = wallet.cor || '#1e293b';
        this.atualizarLabelLimite(wallet.tipo);

        const inputLimit = document.getElementById('walletLimit');
        inputLimit.value = formatarMoeda(wallet.limite);
        inputLimit.disabled = wallet.ilimitado;
        inputLimit.style.opacity = wallet.ilimitado ? '0.4' : '1';
        inputLimit.required = !wallet.ilimitado;

        this.selecionarCor(wallet.cor || '#1e293b');

        modal.style.display = 'flex';
    },

    renderizarWallets() {
        const grid = document.getElementById('walletsGrid');
        if (!grid) return;

        if (this.lista.length === 0) {
            grid.innerHTML = `
                <div class="wallet-empty-state">
                    <div class="wallet-empty-card">
                        <div class="wallet-empty-icon">💳</div>
                        <h3>Nenhuma carteira cadastrada ainda</h3>
                        <p>Cadastre seu primeiro cartão, conta ou vale para acompanhar limites, visualizar gastos e manter seus meios de pagamento organizados com clareza.</p>
                        <div class="wallet-empty-actions">
                            <button class="btn btn-primary" type="button" onclick="window.CarteirasModulo.abrirModalNova()">
                                <i class="fas fa-plus"></i> Cadastrar Novo Cartão
                            </button>
                        </div>
                    </div>
                </div>
            `;
            return;
        }

        grid.innerHTML = this.lista.map((wallet, index) => {
            const gastoAtual = this.calcularGastoCartao(wallet.nome);
            const displayValue = wallet.ilimitado ? 'Sem Limite' : formatarMoeda(wallet.limite);
            const porcentagem = wallet.ilimitado ? 0 : Math.min((gastoAtual / wallet.limite) * 100, 100).toFixed(0);
            const corFundo = wallet.cor || '#1e293b';
            const isLight = document.body.classList.contains('light-theme');
            const darkColor = isLight ? '#425468' : '#0f172a';
            const borderColor = isLight ? 'rgba(167, 190, 217, 0.95)' : '#334155';
            const accentColor = getThemeVar('--accent');
            const accentSoft = getThemeVar('--accent-soft');

            return `
                <div class="wallet-card" style="background: linear-gradient(135deg, ${corFundo} 0%, ${darkColor} 100%); border: 1px solid ${borderColor};">
                    <div class="wallet-card-top">
                        <div class="wallet-card-icon">${this.getIconePorTipo(wallet.tipo)}</div>
                        <div class="wallet-card-actions">
                            <button class="btn-action btn-edit" onclick="window.CarteirasModulo.abrirModalEdicao(${index})">
                                <img src="./img/lapis.png" alt="Editar">
                            </button>
                            <button class="btn-action btn-delete" onclick="confirmarExclusaoCarteira(${index})">
                                <img src="./img/lixeira.png" alt="Excluir">
                            </button>
                        </div>
                    </div>

                    <div class="wallet-card-content">
                        <div>
                            <h4 class="wallet-name">${wallet.nome}</h4>
                            <span class="wallet-balance">${displayValue}</span>
                        </div>

                        ${!wallet.ilimitado ? `
                            <div class="wallet-progress-block">
                                <div class="wallet-progress-head">
                                    <span class="wallet-limit-label">Uso do limite</span>
                                    <span class="wallet-progress-value">${porcentagem}%</span>
                                </div>
                                <div class="wallet-progress-track">
                                    <div class="wallet-progress-fill" style="width: ${porcentagem}%; background: ${accentColor}; box-shadow: 0 0 12px ${accentSoft}; transition: width 0.5s ease;"></div>
                                </div>
                                <p class="wallet-spent">Gasto: ${formatarMoeda(gastoAtual)}</p>
                            </div>
                        ` : '<p class="wallet-unlimited">Uso sem limite</p>'}
                    </div>
                </div>
            `;
        }).join('');
    },

    getIconePorTipo(tipo) {
        const icones = {
            'Cartão de Crédito': '💳',
            'Cartão de Débito': '💳',
            'Conta Corrente': '💳',
            'Vale Refeição': '💳',
            'Vale Alimentação': '💳',
            'Vale Transporte': '💳'
        };
        return icones[tipo] || '💳';
    },

    configurarFormulario() {
        const form = document.getElementById('walletForm');
        if (!form) return;

        form.onsubmit = (e) => {
            e.preventDefault();
            const index = parseInt(document.getElementById('editWalletIndex').value, 10);
            const rawValue = document.getElementById('walletLimit').value.replace(/[^\d,]/g, '').replace(',', '.');

            const dados = {
                nome: document.getElementById('walletName').value,
                tipo: document.getElementById('walletType').value,
                limite: parseFloat(rawValue) || 0,
                ilimitado: document.getElementById('isUnlimited').checked,
                cor: document.getElementById('walletColor').value
            };

            if (index === -1) this.lista.push(dados);
            else this.lista[index] = dados;

            localStorage.setItem('carteiras', JSON.stringify(this.lista));
            this.renderizarWallets();
            this.fecharModal();
        };
    }
};

window.CarteirasModulo = CarteirasModulo;

window.confirmarExclusaoCarteira = (index) => {
    const modalConfirm = document.getElementById('confirmModal');
    if (!modalConfirm) {
        if (confirm('Deseja excluir esta carteira?')) {
            executarExclusao(index);
        }
        return;
    }

    modalConfirm.style.display = 'flex';

    const wallet = CarteirasModulo.lista[index];
    const confirmTitle = document.getElementById('confirmModalTitle');
    const confirmMessage = document.getElementById('confirmModalMessage');
    const btnConfirmar = document.getElementById('btnConfirmDelete');
    const btnCancelar = document.getElementById('btnConfirmCancel');

    if (confirmTitle) {
        confirmTitle.innerText = 'Excluir carteira';
    }

    if (confirmMessage) {
        confirmMessage.innerText = wallet
            ? `Tem certeza que deseja excluir a carteira ${wallet.nome}? Esta ação não poderá ser desfeita.`
            : 'Tem certeza que deseja excluir esta carteira? Esta ação não poderá ser desfeita.';
    }

    btnConfirmar.onclick = () => {
        executarExclusao(index);
        modalConfirm.style.display = 'none';
    };

    btnCancelar.onclick = () => {
        modalConfirm.style.display = 'none';
    };
};

function executarExclusao(index) {
    CarteirasModulo.lista.splice(index, 1);
    localStorage.setItem('carteiras', JSON.stringify(CarteirasModulo.lista));
    CarteirasModulo.renderizarWallets();
}
