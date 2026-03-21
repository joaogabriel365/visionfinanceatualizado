// 1. IMPORTS DOS MÓDULOS
import { Painel } from './painel.js';
import { DespesasModulo } from './despesas.js';
import { RelatoriosModulo } from './relatorios.js';
import { PlanejamentoModulo } from './planejamento.js';
import { CarteirasModulo } from './carteiras.js';

// 2. EXPOSIÇÃO GLOBAL
// Essencial para que os atributos 'onclick' no seu HTML funcionem com módulos
window.Painel = Painel;
window.DespesasModulo = DespesasModulo;
window.RelatoriosModulo = RelatoriosModulo;
window.PlanejamentoModulo = PlanejamentoModulo;
window.CarteirasModulo = CarteirasModulo;

// 3. MAPA DE MÓDULOS PARA INICIALIZAÇÃO
const modulos = {
    'painel': Painel,
    'despesas': DespesasModulo,
    'relatorios': RelatoriosModulo,
    'planejamento': PlanejamentoModulo,
    'carteiras': CarteirasModulo
};

// 4. MOTOR DE NAVEGAÇÃO SPA (Single Page Application)
async function navegar(sectionId) {
    try {
        console.log(`Carregando seção: ${sectionId}`);
        
        // Busca o conteúdo HTML na pasta /HTML/
        const response = await fetch(`./HTML/${sectionId}.html`);
        
        if (!response.ok) throw new Error(`Arquivo ${sectionId}.html não encontrado.`);
        
        const html = await response.text();
        const container = document.getElementById('dynamic-content');
        
        if (container) {
            container.innerHTML = html;
        }

        // Atualização do Título da Página
        const titulo = document.getElementById('sectionTitle');
        if (titulo) {
            const nomesTitulos = {
                'painel': 'Painel Geral',
                'despesas': 'Minhas Despesas',
                'relatorios': 'Relatórios Mensais',
                'planejamento': 'Planejamento e Metas',
                'carteiras': 'Minhas Carteiras'
            };
            titulo.innerText = nomesTitulos[sectionId] || sectionId;
        }
        
        // Controle visual do menu (Active state)
        document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
        const navItem = document.querySelector(`[data-section="${sectionId}"]`);
        if (navItem) navItem.classList.add('active');

        // Inicialização do JavaScript específico do módulo
        // O timeout garante que o HTML já foi renderizado pelo navegador
        setTimeout(() => {
            if (modulos[sectionId] && typeof modulos[sectionId].init === 'function') {
                modulos[sectionId].init();
            }
        }, 100); 

    } catch (err) {
        console.error("Erro na navegação:", err);
        const container = document.getElementById('dynamic-content');
        if (container) {
            container.innerHTML = `<div style="color:white; padding:20px;"><h2>Erro 404</h2><p>A seção <b>${sectionId}</b> não pôde ser carregada.</p></div>`;
        }
    }
}

// 5. EVENT LISTENERS
document.addEventListener('click', (e) => {
    // Verifica se o clique foi em um item do menu lateral
    const navItem = e.target.closest('[data-section]');
    if (navItem) {
        e.preventDefault();
        const section = navItem.getAttribute('data-section');
        navegar(section);
    }
});

// 6. START DA APLICAÇÃO
// Carrega o painel automaticamente ao abrir o site
navegar('painel');