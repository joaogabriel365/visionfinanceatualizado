// 1. PRIMEIRO TODOS OS IMPORTS
import { Painel } from './painel.js';
import { DespesasModulo } from './despesas.js';
import { RelatoriosModulo } from './relatorios.js';
import { PlanejamentoModulo } from './planejamento.js';
import { CarteirasModulo } from './carteiras.js';

// --- A CORREÇÃO CHAVE ---
// Expõe os módulos para o escopo global (window)
// Sem isso, o HTML (onclick) nunca vai encontrar as funções!
window.DespesasModulo = DespesasModulo;
window.Painel = Painel;
window.CarteirasModulo = CarteirasModulo;

// 2. DEPOIS O MAPA DE MÓDULOS
const modulos = {
    'painel': Painel,
    'despesas': DespesasModulo,
    'relatorios': RelatoriosModulo,
    'planejamento': PlanejamentoModulo,
    'carteiras': CarteirasModulo
};

// 3. A FUNÇÃO DE NAVEGAÇÃO
async function navegar(sectionId) {
    try {
        console.log(`Navegando para: ${sectionId}`);
        
        // Ajuste o caminho conforme sua pasta (se os HTMLs estiverem na pasta 'HTML')
        const response = await fetch(`./HTML/${sectionId}.html`);
        
        if (!response.ok) throw new Error(`Não foi possível carregar ${sectionId}.html`);
        
        const html = await response.text();
        const container = document.getElementById('dynamic-content');
        
        if (container) {
            container.innerHTML = html;
        }

        // Atualiza Título
        const titulo = document.getElementById('sectionTitle');
        if (titulo) {
            const nomesTitulos = {
                'painel': 'Painel',
                'despesas': 'Despesas',
                'relatorios': 'Relatórios Mensais',
                'planejamento': 'Planejamento',
                'carteiras': 'Carteiras'
            };
            titulo.innerText = nomesTitulos[sectionId] || sectionId;
        }
        
        // Atualiza Menu Ativo
        document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
        const navItem = document.querySelector(`[data-section="${sectionId}"]`);
        if (navItem) navItem.classList.add('active');

        // Inicializa o módulo após o HTML estar no DOM
        setTimeout(() => {
            if (modulos[sectionId] && typeof modulos[sectionId].init === 'function') {
                console.log(`Iniciando JS de: ${sectionId}`);
                modulos[sectionId].init();
            }
        }, 150); // Aumentado um pouco para garantir a renderização

    } catch (err) {
        console.error("Erro na navegação:", err);
        const container = document.getElementById('dynamic-content');
        if (container) container.innerHTML = `<div style="color:white; padding:20px;"><h2>Erro ao carregar seção: ${sectionId}</h2><p>Verifique se o arquivo ./HTML/${sectionId}.html existe.</p></div>`;
    }
}

// 4. LISTENERS DE EVENTOS (Melhorado)
document.addEventListener('click', (e) => {
    const navItem = e.target.closest('[data-section]');
    if (navItem) {
        e.preventDefault();
        const section = navItem.getAttribute('data-section');
        navegar(section);
    }
});

// 5. INICIALIZAÇÃO
// Como é type="module", não precisa de DOMContentLoaded, mas mantemos por segurança
navegar('painel');