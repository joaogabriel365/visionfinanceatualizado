import { formatarMoeda } from './common.js';

export const CarteirasModulo = {
    lista: JSON.parse(localStorage.getItem('carteiras')) || [],

    init() {
        this.renderizarWallets();
        this.configurarFormulario();
    },

    renderizarWallets() {
        const grid = document.getElementById('walletsGrid');
        if (!grid) return;

        // Se não houver carteiras, exibe o estado vazio (Baseado na imagem 3)
        if (this.lista.length === 0) {
            grid.innerHTML = `
                <div id="empty-wallet-state" style="grid-column: 1/-1; text-align: center; padding: 60px; border: 2px dashed #1e293b; border-radius: 20px; width: 100%;">
                    <div style="font-size: 40px; margin-bottom: 15px;">💳</div>
                    <h3 style="color: white; margin-bottom: 10px;">Nenhuma carteira por aqui... ainda!</h3>
                    <p style="color: #94a3b8;">Adicione um cartão ou carteira para assumir o controle dos seus gastos.</p>
                </div>
            `;
            return;
        }

        // Renderiza os cards se houver itens
        grid.innerHTML = this.lista.map((w, index) => `
            <div class="wallet-card-prof" style="background: #111827; border: 1px solid #1e293b; border-radius: 15px; padding: 20px; display: flex; align-items: center; justify-content: space-between;">
                <div style="display: flex; align-items: center; gap: 15px;">
                    <div class="wallet-icon" style="font-size: 28px; background: #1a253a; width: 50px; height: 50px; display: flex; align-items: center; justify-content: center; border-radius: 12px;">
                        ${this.getIconePorTipo(w.tipo)}
                    </div>
                    <div class="wallet-details">
                        <h4 style="color: white; margin: 0; font-size: 16px;">${w.nome}</h4>
                        <p style="color: #94a3b8; margin: 2px 0; font-size: 13px;">${w.tipo}</p>
                        <div style="color: #22d3ee; font-weight: 700; font-size: 14px; margin-top: 5px;">
                            ${formatarMoeda(w.limite)}
                        </div>
                    </div>
                </div>
                <button class="btn-delete-wallet" onclick="confirmarExclusaoCarteira(${index})" style="background: transparent; border: none; cursor: pointer; padding: 5px;">
                    <img src="../img/lixeira.png" alt="Excluir" style="width: 20px; height: 20px; object-fit: contain;">
                </button>
            </div>
        `).join('');
    },

    getIconePorTipo(tipo) {
        const icones = {
            'Cartão de Crédito': '💳',
            'Cartão de Débito': '🏦',
            'Conta Corrente': '💰',
            'Dinheiro': '💵',
            'Vale Refeição': '🍴'
        };
        return icones[tipo] || '💳';
    },

    configurarFormulario() {
        const form = document.getElementById('walletForm');
        if (!form) return;

        form.onsubmit = (e) => {
            e.preventDefault();
            const nova = {
                nome: document.getElementById('walletName').value,
                tipo: document.getElementById('walletType').value,
                limite: parseFloat(document.getElementById('walletLimit').value) || 0
            };

            this.lista.push(nova);
            localStorage.setItem('carteiras', JSON.stringify(this.lista));
            this.renderizarWallets();
            
            document.getElementById('walletModal').style.display = 'none';
            form.reset();
        };
    }
};

window.confirmarExclusaoCarteira = (index) => {
    if (confirm("Deseja realmente excluir esta carteira?")) {
        CarteirasModulo.lista.splice(index, 1);
        localStorage.setItem('carteiras', JSON.stringify(CarteirasModulo.lista));
        CarteirasModulo.renderizarWallets();
    }
};