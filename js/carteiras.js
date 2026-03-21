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

        grid.innerHTML = ''; 

        if (this.lista.length === 0) {
            grid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 40px; border: 2px dashed #1e293b; border-radius: 20px;">
                    <p style="color: #94a3b8;">Nenhuma carteira cadastrada.</p>
                </div>
            `;
            return;
        }

        grid.innerHTML = this.lista.map((w, index) => `
            <div class="wallet-card" style="background: #111827; border: 1px solid #1f2937; border-radius: 16px; padding: 20px; display: flex; align-items: center; justify-content: space-between; position: relative;">
                
                <div style="display: flex; align-items: center; gap: 15px;">
                    <div style="font-size: 24px; background: #1f2937; width: 45px; height: 45px; display: flex; align-items: center; justify-content: center; border-radius: 10px;">
                        ${this.getIconePorTipo(w.tipo)}
                    </div>
                    
                    <div>
                        <h4 style="color: white; margin: 0; font-size: 16px; font-weight: 700;">${w.nome}</h4>
                        <p style="color: #94a3b8; margin: 2px 0; font-size: 13px;">${w.tipo}</p>
                        <span style="color: #22d3ee; font-weight: 800; font-size: 15px;">${formatarMoeda(w.limite)}</span>
                    </div>
                </div>

                <button onclick="confirmarExclusaoCarteira(${index})" style="background: rgba(239, 68, 68, 0.1); border: none; padding: 8px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center;">
                    <img src="./img/lixeira.png" alt="Excluir" style="width: 18px; height: 18px;">
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
        const modal = document.getElementById('walletModal');
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
            modal.style.display = 'none';
            form.reset();
        };
    }
};

// Função Global de Exclusão
window.confirmarExclusaoCarteira = (index) => {
    if (confirm("Deseja excluir esta carteira?")) {
        CarteirasModulo.lista.splice(index, 1);
        localStorage.setItem('carteiras', JSON.stringify(CarteirasModulo.lista));
        CarteirasModulo.renderizarWallets();
    }
};