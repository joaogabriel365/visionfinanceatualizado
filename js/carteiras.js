import { formatarMoeda } from './common.js';

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
    },

    renderizarSeletorCores() {
        const container = document.getElementById('colorPickerContainer');
        if (!container) return;
        
        container.innerHTML = this.coresPredefinidas.map(cor => `
            <div class="color-option" data-color="${cor}" style="background: ${cor}; height: 35px; border-radius: 8px; cursor: pointer; border: 2px solid transparent; transition: 0.2s;"></div>
        `).join('');

        container.querySelectorAll('.color-option').forEach(opt => {
            opt.onclick = () => {
                container.querySelectorAll('.color-option').forEach(o => o.style.borderColor = 'transparent');
                opt.style.borderColor = '#22d3ee';
                document.getElementById('walletColor').value = opt.dataset.color;
            };
        });
        // Selecionar primeira por padrão
        if (container.firstElementChild) container.firstElementChild.click();
    },

    configurarMascara() {
        const inputLimit = document.getElementById('walletLimit');
        if (!inputLimit) return;
        inputLimit.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length > 9) value = value.slice(0, 9);
            const valorFloat = parseFloat(value) / 100;
            e.target.value = isNaN(valorFloat) ? "" : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorFloat);
        });
    },

    configurarLogicaTipo() {
        const selectType = document.getElementById('walletType');
        const labelLimit = document.getElementById('labelLimit');
        const checkUnlimited = document.getElementById('isUnlimited');
        const inputLimit = document.getElementById('walletLimit');

        if (selectType) {
            selectType.addEventListener('change', (e) => {
                const labels = {
                    'Cartão de Crédito': 'Limite Total',
                    'Cartão de Débito': 'Saldo Disponível',
                    'default': 'Valor/Saldo'
                };
                if (labelLimit) labelLimit.innerText = labels[e.target.value] || labels['default'];
            });
        }

        if (checkUnlimited) {
            checkUnlimited.addEventListener('change', (e) => {
                inputLimit.disabled = e.target.checked;
                inputLimit.style.opacity = e.target.checked ? "0.4" : "1";
                inputLimit.required = !e.target.checked;
                if(e.target.checked) inputLimit.value = "R$ 0,00";
            });
        }
    },

    calcularGastoCartao(nomeCartao) {
        const despesas = JSON.parse(localStorage.getItem('despesas')) || [];
        return despesas
            .filter(d => d.cartao === nomeCartao)
            .reduce((acc, d) => acc + (parseFloat(d.valor) || 0), 0);
    },

    abrirModalEdicao(index) {
        const w = this.lista[index];
        const modal = document.getElementById('walletModal');
        document.getElementById('walletModalTitle').innerText = "Editar Carteira";
        document.getElementById('editWalletIndex').value = index;
        document.getElementById('walletName').value = w.nome;
        document.getElementById('walletType').value = w.tipo;
        document.getElementById('isUnlimited').checked = w.ilimitado;
        document.getElementById('walletColor').value = w.cor || '#1e293b';
        
        const inputLimit = document.getElementById('walletLimit');
        inputLimit.value = formatarMoeda(w.limite);
        inputLimit.disabled = w.ilimitado;
        inputLimit.style.opacity = w.ilimitado ? "0.4" : "1";

        const corOpt = document.querySelector(`[data-color="${w.cor || '#1e293b'}"]`);
        if(corOpt) corOpt.click();

        modal.style.display = 'flex';
    },

    renderizarWallets() {
        const grid = document.getElementById('walletsGrid');
        if (!grid) return;

        grid.innerHTML = this.lista.map((w, index) => {
            const gastoAtual = this.calcularGastoCartao(w.nome);
            // Alteração 2: Ajuste de texto para "Sem Limite"
            const dispValor = w.ilimitado ? "Sem Limite" : formatarMoeda(w.limite);
            const porcentagem = w.ilimitado ? 0 : Math.min((gastoAtual / w.limite) * 100, 100).toFixed(0);
            const corFundo = w.cor || '#1e293b';
            const isLight = document.body.classList.contains('light-theme');
            const darkColor = isLight ? '#f0f0f0' : '#0f172a';
            const borderColor = isLight ? '#d0d0d0' : '#334155';

            return `
            <div class="wallet-card" style="background: linear-gradient(135deg, ${corFundo} 0%, ${darkColor} 100%); border: 1px solid ${borderColor}; border-radius: 20px; padding: 25px; min-height: 200px; display: flex; flex-direction: column; justify-content: space-between; position: relative; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3);">
                
                <div style="display: flex; justify-content: space-between; align-items: flex-start; z-index: 2;">
                    <div style="font-size: 28px;">${this.getIconePorTipo(w.tipo)}</div>
                    <div style="display: flex; gap: 10px;">
                        <button onclick="window.CarteirasModulo.abrirModalEdicao(${index})" style="background: rgba(255,255,255,0.1); border: none; padding: 8px; border-radius: 8px; cursor: pointer;">
                            <img src="./img/lapis.png" style="width: 16px; opacity: 0.8;">
                        </button>
                        <button onclick="confirmarExclusaoCarteira(${index})" style="background: rgba(239, 68, 68, 0.1); border: none; padding: 8px; border-radius: 8px; cursor: pointer;">
                            <img src="./img/lixeira.png" style="width: 16px; filter: invert(37%) sepia(93%) saturate(3734%) hue-rotate(346deg);">
                        </button>
                    </div>
                </div>

                <div style="z-index: 2; margin-top: 15px;">
                    <h4 style="color: #94a3b8; margin: 0; font-size: 12px; text-transform: uppercase; letter-spacing: 1.5px;">${w.nome}</h4>
                    <span style="color: #1f2937; font-weight: 800; font-size: 24px; display: block; margin-top: 4px;">${dispValor}</span>
                    
                    ${!w.ilimitado ? `
                        <div style="margin-top: 15px;">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 11px;">
                                <span style="color: #94a3b8;">Uso do limite</span>
                                <span style="color: #22d3ee; font-weight: bold;">${porcentagem}%</span>
                            </div>
                            <div style="height: 6px; background: rgba(0,0,0,0.3); border-radius: 10px; overflow: hidden;">
                                <div style="width: ${porcentagem}%; height: 100%; background: #22d3ee; box-shadow: 0 0 10px rgba(34, 211, 238, 0.5); transition: width 0.5s ease;"></div>
                            </div>
                            <p style="color: #64748b; font-size: 10px; margin-top: 6px; font-weight: 600;">Gasto: ${formatarMoeda(gastoAtual)}</p>
                        </div>
                    ` : `<p style="color: #475569; margin: 15px 0 0 0; font-size: 11px; font-weight: 700;">USO SEM LIMITE</p>`}
                </div>
            </div>`;
        }).join('');
    },

    getIconePorTipo(tipo) {
        const icones = { 'Cartão de Crédito': '💳', 'Cartão de Débito': '💳', 'Conta Corrente': '💳', 'Vale Refeição': '💳', 'Vale Alimentação': '💳', 'Vale Transporte': '💳' };
        return icones[tipo] || '💳';
    },

    configurarFormulario() {
        const form = document.getElementById('walletForm');
        if (!form) return;

        form.onsubmit = (e) => {
            e.preventDefault();
            const index = parseInt(document.getElementById('editWalletIndex').value);
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
            document.getElementById('walletModal').style.display = 'none';
            form.reset();
            document.getElementById('editWalletIndex').value = "-1";
            document.getElementById('walletModalTitle').innerText = "Nova Carteira";
        };
    }
};

window.CarteirasModulo = CarteirasModulo;

// Alteração 1: Mensagem de confirmação customizada e profissional
window.confirmarExclusaoCarteira = (index) => {
    const modalConfirm = document.getElementById('confirmModal');
    if (!modalConfirm) {
        // Fallback caso o elemento HTML do modal ainda não exista
        if (confirm("Deseja excluir esta carteira?")) {
            executarExclusao(index);
        }
        return;
    }

    modalConfirm.style.display = 'flex';
    
    // Configura os botões do modal de confirmação
    const btnConfirmar = document.getElementById('btnConfirmDelete');
    const btnCancelar = document.getElementById('btnConfirmCancel');

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