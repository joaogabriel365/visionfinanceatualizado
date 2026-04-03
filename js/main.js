import { applyStoredTheme, getThemeVar } from './common.js';

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

function fecharSidebarMobile() {
    document.body.classList.remove('dashboard-sidebar-open');

    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebarBackdrop = document.getElementById('sidebarBackdrop');

    if (sidebarToggle) {
        sidebarToggle.setAttribute('aria-expanded', 'false');
    }

    if (sidebarBackdrop) {
        sidebarBackdrop.hidden = true;
    }
}

function abrirSidebarMobile() {
    document.body.classList.add('dashboard-sidebar-open');

    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebarBackdrop = document.getElementById('sidebarBackdrop');

    if (sidebarToggle) {
        sidebarToggle.setAttribute('aria-expanded', 'true');
    }

    if (sidebarBackdrop) {
        sidebarBackdrop.hidden = false;
    }
}

function alternarSidebarMobile() {
    if (document.body.classList.contains('dashboard-sidebar-open')) {
        fecharSidebarMobile();
        return;
    }

    abrirSidebarMobile();
}

function configurarSidebarMobile() {
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebarBackdrop = document.getElementById('sidebarBackdrop');

    if (sidebarToggle && !sidebarToggle.dataset.bound) {
        sidebarToggle.dataset.bound = 'true';
        sidebarToggle.addEventListener('click', alternarSidebarMobile);
    }

    if (sidebarBackdrop && !sidebarBackdrop.dataset.bound) {
        sidebarBackdrop.dataset.bound = 'true';
        sidebarBackdrop.addEventListener('click', fecharSidebarMobile);
    }

    if (!window.__visionFinanceSidebarResizeBound) {
        window.__visionFinanceSidebarResizeBound = true;
        window.addEventListener('resize', () => {
            if (window.innerWidth > 960) {
                fecharSidebarMobile();
            }
        });
    }
}

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

        if (window.innerWidth <= 960) {
            fecharSidebarMobile();
        }

    } catch (err) {
        console.error("Erro na navegação:", err);
    }
}

// === APLICAR TEMA GLOBAL ===
function aplicarTemaGlobal() {
    applyStoredTheme(document.body);
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

    const corOlho = getThemeVar('--accent') || '#0b63ce';
    btn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.8;">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
            <circle cx="12" cy="12" r="3"></circle>
        </svg>
    `;
    btn.style.color = corOlho;

    btn.onmouseover = () => btn.style.backgroundColor = getThemeVar('--accent-soft');
    btn.onmouseout = () => btn.style.backgroundColor = 'transparent';

    headerActions.prepend(btn);

    const atualizarEstadoBotao = () => {
        const ativo = localStorage.getItem('visionFinance_olhoOculto') === 'true';
        btn.style.color = ativo ? getThemeVar('--text-secondary') : (getThemeVar('--accent') || corOlho);
        btn.style.opacity = ativo ? '0.65' : '1';
        btn.title = ativo ? 'Mostrar valores' : 'Ocultar valores';
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
    aplicarTemaGlobal();
    gerenciarBotaoOlho();
    configurarSidebarMobile();
    navegar('painel');
});

// Listener para quando as configurações são atualizadas
window.addEventListener('settingsUpdated', () => {
    aplicarTemaGlobal();
    // Re-renderiza o módulo ativo para aplicar totalmente as cores atualizadas (ex: gráficos de relatórios)
    if (modulos[secaoAtiva] && typeof modulos[secaoAtiva].init === 'function') {
        modulos[secaoAtiva].init();
    }
});