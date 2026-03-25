// 1. IMPORTS DOS MÓDULOS
import { Painel } from './painel.js';
import { DespesasModulo } from './despesas.js';
import { RelatoriosModulo } from './relatorios.js';
import { PlanejamentoModulo } from './planejamento.js';
import { CarteirasModulo } from './carteiras.js';
import { PerfilModulo } from './perfil.js'; 
import { ConfiguracoesModulo } from './configuracoes.js';

// 2. EXPOSIÇÃO GLOBAL
window.Painel = Painel;
window.DespesasModulo = DespesasModulo;
window.RelatoriosModulo = RelatoriosModulo;
window.PlanejamentoModulo = PlanejamentoModulo;
window.CarteirasModulo = CarteirasModulo;
window.PerfilModulo = PerfilModulo; 
window.ConfiguracoesModulo = ConfiguracoesModulo;

const modulos = {
    'painel': Painel,
    'despesas': DespesasModulo,
    'relatorios': RelatoriosModulo,
    'planejamento': PlanejamentoModulo,
    'carteiras': CarteirasModulo,
    'perfil': PerfilModulo,
    'configuracoes': ConfiguracoesModulo
};

let secaoAtiva = 'painel';

// 4. MOTOR DE NAVEGAÇÃO SPA
async function navegar(sectionId) {
    try {
        secaoAtiva = sectionId;
        const response = await fetch(`./HTML/${sectionId}.html`);
        if (!response.ok) throw new Error(`Arquivo ${sectionId}.html não encontrado.`);
        
        const html = await response.text();
        const container = document.getElementById('dynamic-content');
        if (container) container.innerHTML = html;

        const titulo = document.getElementById('sectionTitle');
        if (titulo) {
            const nomesTitulos = {
                'painel': 'Painel Geral',
                'despesas': 'Minhas Despesas',
                'relatorios': 'Relatórios Mensais',
                'planejamento': 'Planejamento e Metas',
                'carteiras': 'Minhas Carteiras',
                'perfil': 'Meu Perfil',
                'configuracoes': 'Configurações do Sistema'
            };
            titulo.innerText = nomesTitulos[sectionId] || sectionId;
        }
        
        document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
        const navItem = document.querySelector(`[data-section="${sectionId}"]`);
        if (navItem) navItem.classList.add('active');

        requestAnimationFrame(() => {
            setTimeout(() => {
                if (modulos[sectionId] && typeof modulos[sectionId].init === 'function') {
                    modulos[sectionId].init();
                }
            }, 50);
        });

    } catch (err) {
        console.error("Erro na navegação:", err);
    }
}

// === FUNCIONALIDADE OCULTAR VALORES ===
function gerenciarBotaoOlho() {
    const headerActions = document.querySelector('.user-info'); 
    if (!headerActions || document.getElementById('btnToggleOlho')) return;

    const btn = document.createElement('button');
    btn.id = 'btnToggleOlho';
    
    // Aplicando classes e estilos para ficar proporcional ao sino
    btn.style.background = 'none';
    btn.style.border = 'none';
    btn.style.padding = '8px';
    btn.style.marginRight = '12px';
    btn.style.display = 'flex';
    btn.style.alignItems = 'center';
    btn.style.justifyContent = 'center';
    btn.style.cursor = 'pointer';
    btn.style.borderRadius = '8px';
    btn.style.transition = 'all 0.3s ease';

    // SVG interno para garantir nitidez e controle de cor
    btn.innerHTML = `
        <img src="./img/olho.png" alt="Ocultar" 
             style="width: 22px; height: 22px; object-fit: contain; filter: brightness(0) invert(1); opacity: 0.8;">
    `;

    // Efeito de hover simples
    btn.onmouseover = () => btn.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
    btn.onmouseout = () => btn.style.backgroundColor = 'transparent';

    headerActions.prepend(btn);

    const atualizarEstadoBotao = () => {
        const ativo = localStorage.getItem('visionFinance_olhoOculto') === 'true';
        const img = btn.querySelector('img');
        if (img) {
            // Se estiver oculto, o ícone fica mais apagado (opacidade 0.3)
            img.style.opacity = ativo ? '0.3' : '0.8';
            btn.title = ativo ? 'Mostrar valores' : 'Ocultar valores';
        }
    };

    atualizarEstadoBotao();

    btn.addEventListener('click', () => {
        const atual = localStorage.getItem('visionFinance_olhoOculto') === 'true';
        localStorage.setItem('visionFinance_olhoOculto', !atual);
        
        atualizarEstadoBotao();

        if (modulos[secaoAtiva] && typeof modulos[secaoAtiva].init === 'function') {
            modulos[secaoAtiva].init();
        }
    });
}

// 5. EVENT LISTENERS
document.addEventListener('click', (e) => {
    const navItem = e.target.closest('[data-section]');
    if (navItem) {
        e.preventDefault();
        const section = navItem.getAttribute('data-section');
        navegar(section);
    }
});

document.addEventListener('DOMContentLoaded', () => {
    gerenciarBotaoOlho();
    navegar('painel');
});