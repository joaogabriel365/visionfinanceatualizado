import { formatarMoeda } from './common.js';

export const CarteirasModulo = {
    lista: JSON.parse(localStorage.getItem('carteiras')) || [],

    init() {
        this.renderizarWallets();
        this.configurarFormulario();
        this.configurarMascara();
        this.configurarLogicaTipo();
    },

    configurarMascara() {
        const inputLimit = document.getElementById('walletLimit');
        if (!inputLimit) return;

        inputLimit.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            
            // Regra: Máximo 9 dígitos
            if (value.length > 9) value = value.slice(0, 9);
            
            // Formatação R$ automática
            const valorFloat = parseFloat(value) / 100;
            if (isNaN(valorFloat)) {
                e.target.value = "";
                return;
            }
            
            e.target.value = new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL'
            }).format(valorFloat);
        });
    },

    // ... (dentro do objeto CarteirasModulo)

    configurarLogicaTipo() {
        const selectType = document.getElementById('walletType');
        const labelLimit = document.getElementById('labelLimit');
        const inputLimit = document.getElementById('walletLimit');
        const checkUnlimited = document.getElementById('isUnlimited');

        // Agora apenas altera o texto do label conforme o tipo, sem esconder o checkbox
        selectType.addEventListener('change', (e) => {
            const tipo = e.target.value;
            if (tipo === 'Cartão de Débito' || tipo === 'Conta Corrente') {
                labelLimit.innerText = 'Saldo Disponível';
            } else if (tipo === 'Cartão de Crédito') {
                labelLimit.innerText = 'Limite Total';
            } else {
                labelLimit.innerText = 'Valor/Saldo';
            }
        });

        // Lógica de desativar input continua global
        checkUnlimited.addEventListener('change', (e) => {
            if (e.target.checked) {
                inputLimit.value = "R$ 0,00";
                inputLimit.disabled = true;
                inputLimit.style.opacity = "0.4";
                inputLimit.required = false;
            } else {
                inputLimit.disabled = false;
                inputLimit.style.opacity = "1";
                inputLimit.required = true;
            }
        });
    },

    renderizarWallets() {
        const grid = document.getElementById('walletsGrid');
        if (!grid) return;

        if (this.lista.length === 0) {
            grid.innerHTML = `
                <div style="grid-column: 1 / -1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 100px 20px; border: 2px dashed #1e293b; border-radius: 24px; background: rgba(15, 23, 42, 0.5);">
                    <div style="font-size: 48px; margin-bottom: 20px; opacity: 0.5;">💳</div>
                    <h3 style="color: white; margin: 0; font-size: 20px;">Comece sua organização</h3>
                    <p style="color: #94a3b8; margin: 10px 0 25px 0; text-align: center; max-width: 300px;">Você ainda não possui carteiras cadastradas. Adicione uma para gerenciar seus gastos.</p>
                    <button onclick="document.getElementById('walletModal').style.display = 'flex'" style="background: transparent; border: 1px solid #22d3ee; color: #22d3ee; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-weight: 600;">
                        + Cadastrar primeira carteira
                    </button>
                </div>
            `;
            return;
        }
            
        grid.innerHTML = this.lista.length === 0 ? 
            `<div style="grid-column: 1 / -1; text-align: center; padding: 40px; border: 2px dashed #1e293b; border-radius: 20px;"><p style="color: #94a3b8;">Nenhuma carteira cadastrada.</p></div>` 
            : this.lista.map((w, index) => {
                const displayValor = w.ilimitado ? "Ilimitado" : formatarMoeda(w.limite);
                
                return `
                <div class="wallet-card" style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border: 1px solid #334155; border-radius: 20px; padding: 25px; min-height: 180px; display: flex; flex-direction: column; justify-content: space-between; position: relative; overflow: hidden; transition: transform 0.3s ease; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);">
                    
                    <div style="position: absolute; top: -20px; right: -20px; width: 100px; height: 100px; background: #22d3ee; opacity: 0.05; border-radius: 50%;"></div>

                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <div style="font-size: 28px;">${this.getIconePorTipo(w.tipo)}</div>
                        <button onclick="confirmarExclusaoCarteira(${index})" style="background: rgba(239, 68, 68, 0.1); border: none; padding: 8px; border-radius: 8px; cursor: pointer; z-index: 2;">
                             <img src="./img/lixeira.png" alt="Excluir" style="width: 16px; height: 16px; filter: invert(37%) sepia(93%) saturate(3734%) hue-rotate(346deg) brightness(101%) contrast(87%);">
                        </button>
                    </div>

                    <div>
                        <h4 style="color: white; margin: 0; font-size: 14px; font-weight: 400; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8;">${w.nome}</h4>
                        <div style="display: flex; align-items: baseline; gap: 8px; margin-top: 5px;">
                            <span style="color: #22d3ee; font-weight: 800; font-size: 22px; font-family: 'Inter', sans-serif;">${displayValor}</span>
                        </div>
                        <p style="color: #475569; margin: 5px 0 0 0; font-size: 11px; font-weight: 700;">${w.tipo.toUpperCase()}</p>
                    </div>
                </div>
            `}).join('');
    },

    getIconePorTipo(tipo) {
        const icones = {
            'Cartão de Crédito': '💳',
            'Cartão de Débito': '🏦',
            'Conta Corrente': '💰',
            'Dinheiro': '💵',
            'VR': '🍴', // Padronizado para o filtro
            'VA': '🛒'  // Padronizado para o filtro
        };
        return icones[tipo] || '💳';
    },

    configurarFormulario() {
        const form = document.getElementById('walletForm');
        const modal = document.getElementById('walletModal');
        if (!form) return;

        form.onsubmit = (e) => {
            e.preventDefault();
            
            const rawValue = document.getElementById('walletLimit').value
                .replace("R$", "")
                .replace(/\./g, "")
                .replace(",", ".");

            const nova = {
                nome: document.getElementById('walletName').value,
                tipo: document.getElementById('walletType').value,
                limite: parseFloat(rawValue) || 0,
                ilimitado: document.getElementById('isUnlimited').checked
            };

            this.lista.push(nova);
            localStorage.setItem('carteiras', JSON.stringify(this.lista));
            
            this.renderizarWallets();
            modal.style.display = 'none';
            form.reset();
            // Reset do estado do input ao fechar
            document.getElementById('walletLimit').disabled = false;
            document.getElementById('walletLimit').style.opacity = "1";
        };
    }
};

window.confirmarExclusaoCarteira = (index) => {
    if (confirm("Deseja excluir esta carteira?")) {
        CarteirasModulo.lista.splice(index, 1);
        localStorage.setItem('carteiras', JSON.stringify(CarteirasModulo.lista));
        CarteirasModulo.renderizarWallets();
    }
};