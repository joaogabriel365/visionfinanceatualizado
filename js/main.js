import { applyStoredTheme, confirmarAcao, ensureFinancialDataIntegrity, getThemeVar, getThemeSettings, toggleThemePreference } from './common.js';

// 1. IMPORTS DOS MÓDULOS
import { Painel } from './painel.js';
import { DespesasModulo } from './despesas.js';
import { RelatoriosModulo } from './relatorios.js';
import { PlanejamentoModulo } from './planejamento.js';
import { CarteirasModulo } from './carteiras.js';
import { PerfilModulo } from './perfil.js'; 
import { ConfiguracoesModulo } from './configuracoes.js';
import painelTemplate from '../HTML/painel.html';
import despesasTemplate from '../HTML/despesas.html';
import carteirasTemplate from '../HTML/carteiras.html';
import planejamentoTemplate from '../HTML/planejamento.html';
import relatoriosTemplate from '../HTML/relatorios.html';
import perfilTemplate from '../HTML/perfil.html';
import configuracoesTemplate from '../HTML/configuracoes.html';

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

const secoesHtml = {
    'painel': painelTemplate,
    'despesas': despesasTemplate,
    'carteiras': carteirasTemplate,
    'planejamento': planejamentoTemplate,
    'relatorios': relatoriosTemplate,
    'perfil': perfilTemplate,
    'configuracoes': configuracoesTemplate
};

let secaoAtiva = 'painel';

async function carregarHtmlSecao(sectionId) {
    const html = secoesHtml[sectionId];
    if (!html) {
        throw new Error(`Arquivo ${sectionId}.html não encontrado.`);
    }

    return html;
}

function isSecaoValida(sectionId) {
    return Object.prototype.hasOwnProperty.call(modulos, sectionId);
}

function getSecaoInicial() {
    const params = new URLSearchParams(window.location.search);
    const querySection = params.get('section');
    const hashSection = window.location.hash.replace('#', '').trim();

    if (isSecaoValida(querySection)) {
        return querySection;
    }

    if (isSecaoValida(hashSection)) {
        return hashSection;
    }

    return 'painel';
}

function atualizarUrlSecao(sectionId) {
    const url = new URL(window.location.href);
    url.searchParams.set('section', sectionId);
    url.hash = sectionId;
    window.history.replaceState({ section: sectionId }, '', url);
}

function getProfileData() {
    return JSON.parse(localStorage.getItem('visionFinance_profile')) || {};
}

function getProfileInitials(profile = getProfileData()) {
    const nome = (profile.nome || 'Joao').trim();
    const sobrenome = (profile.sobrenome || 'Silva').trim();
    return `${nome.charAt(0)}${sobrenome.charAt(0)}`.toUpperCase();
}

function aplicarAvatarPerfil() {
    const avatar = document.querySelector('.avatar-circle');
    if (!avatar) return;

    const profile = getProfileData();

    if (profile.foto) {
        avatar.innerHTML = `<img src="${profile.foto}" alt="Foto de perfil">`;
        avatar.classList.add('has-photo');
    } else {
        avatar.textContent = getProfileInitials(profile);
        avatar.classList.remove('has-photo');
    }
}

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

function configurarSaidaDashboard() {
    const logoutLink = document.querySelector('.sidebar-footer .logout');
    if (!logoutLink || logoutLink.dataset.bound === 'true') return;

    logoutLink.dataset.bound = 'true';
    logoutLink.addEventListener('click', async (event) => {
        event.preventDefault();
        const isDark = getThemeSettings().temaEscuro === true;

        const deveSair = await confirmarAcao(
            'Sair do painel',
            'Você está prestes a sair do dashboard e voltar para a tela inicial. Deseja continuar?',
            {
                confirmText: 'Sair',
                cancelText: 'Cancelar',
                iconSrc: './img/pessoa-correndo.png',
                iconAlt: 'Sair do painel',
                iconWrapStyle: 'width: 72px; height: 72px; background: rgba(var(--accent-rgb), 0.14); border: 1px solid rgba(var(--accent-rgb), 0.26); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 22px; box-shadow: 0 12px 28px rgba(15, 23, 42, 0.14);',
                iconStyle: `width: 30px; height: 30px; object-fit: contain; filter: ${isDark ? 'brightness(0) invert(1)' : 'none'};`
            }
        );

        if (deveSair) {
            window.location.href = logoutLink.href;
        }
    });
}

// 4. MOTOR DE NAVEGAÇÃO SPA
async function navegar(sectionId) {
    try {
        if (!isSecaoValida(sectionId)) {
            throw new Error(`Secao inválida: ${sectionId}`);
        }

        secaoAtiva = sectionId;
        const html = await carregarHtmlSecao(sectionId);
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

        atualizarUrlSecao(sectionId);

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

function gerenciarBotaoModo() {
    const headerActions = document.querySelector('.user-info');
    if (!headerActions) return;

    let quickActions = document.getElementById('headerQuickActions');
    if (!quickActions) {
        quickActions = document.createElement('div');
        quickActions.id = 'headerQuickActions';
        quickActions.className = 'header-quick-actions';
        headerActions.prepend(quickActions);
    }

    let btn = document.getElementById('btnToggleModo');
    if (!btn) {
        btn = document.createElement('button');
        btn.id = 'btnToggleModo';
        btn.type = 'button';
        btn.className = 'theme-toggle-btn theme-toggle-btn-dashboard header-icon-btn';
        btn.setAttribute('aria-label', 'Alternar modo claro e escuro');
        btn.innerHTML = '<img src="./img/modo.png" alt="Alternar modo" class="theme-toggle-icon">';
        quickActions.append(btn);

        btn.addEventListener('click', () => {
            toggleThemePreference();
        });
    }

    const isDark = getThemeSettings().temaEscuro === true;
    btn.setAttribute('aria-pressed', String(isDark));
    btn.title = isDark ? 'Ativar modo claro' : 'Ativar modo escuro';
}

// === FUNCIONALIDADE OCULTAR VALORES ===
function gerenciarBotaoOlho() {
    const headerActions = document.querySelector('.user-info'); 
    if (!headerActions) return;

    let quickActions = document.getElementById('headerQuickActions');
    if (!quickActions) {
        quickActions = document.createElement('div');
        quickActions.id = 'headerQuickActions';
        quickActions.className = 'header-quick-actions';
        headerActions.prepend(quickActions);
    }

    if (document.getElementById('btnToggleOlho')) return;

    const btn = document.createElement('button');
    btn.id = 'btnToggleOlho';
    btn.type = 'button';
    btn.className = 'header-icon-btn';

    btn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.8;">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
            <circle cx="12" cy="12" r="3"></circle>
        </svg>
    `;

    quickActions.append(btn);

    const atualizarEstadoBotao = () => {
        const ativo = localStorage.getItem('visionFinance_olhoOculto') === 'true';
        btn.style.opacity = ativo ? '0.65' : '1';
        btn.setAttribute('aria-pressed', String(!ativo));
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
    ensureFinancialDataIntegrity();
    aplicarTemaGlobal();
    aplicarAvatarPerfil();
    gerenciarBotaoModo();
    gerenciarBotaoOlho();
    configurarSidebarMobile();
    configurarSaidaDashboard();
    navegar(getSecaoInicial());
});

window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.body.classList.contains('dashboard-sidebar-open')) {
        fecharSidebarMobile();
    }
});

// Listener para quando as configurações são atualizadas
window.addEventListener('settingsUpdated', () => {
    ensureFinancialDataIntegrity();
    aplicarTemaGlobal();
    gerenciarBotaoModo();
    // Re-renderiza o módulo ativo para aplicar totalmente as cores atualizadas (ex: gráficos de relatórios)
    if (modulos[secaoAtiva] && typeof modulos[secaoAtiva].init === 'function') {
        modulos[secaoAtiva].init();
    }
});

window.navegar = navegar;

window.addEventListener('profileUpdated', () => {
    aplicarAvatarPerfil();
});