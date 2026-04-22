import { applyStoredTheme, confirmarAcao, ensureFinancialDataIntegrity, formatarMoeda, getCurrentFinancialSnapshot, getThemeVar, getThemeSettings, getTutorialState, setThemeSettings, setTutorialState, toggleThemePreference } from './common.js';

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

const LOGIN_SESSION_KEY = 'visionFinance_justLoggedIn';
const TOTAL_TUTORIAL_STEPS = 7;
const NOTIFICATION_SEEN_STORAGE_KEY = 'visionFinance_notification_seen';
const NOTIFICATION_BROWSER_SENT_STORAGE_KEY = 'visionFinance_notification_browser_sent';
const NOTIFICATION_FEED_STORAGE_KEY = 'visionFinance_notification_feed';
const NOTIFICATION_BUDGET_MILESTONES = [
    { key: '100', ratio: 1, percentage: 100 },
    { key: '90', ratio: 0.9, percentage: 90 },
    { key: '75', ratio: 0.75, percentage: 75 },
    { key: '50', ratio: 0.5, percentage: 50 }
];
const NOTIFICATION_PROGRESS_MILESTONES = [
    { key: '100', ratio: 1, percentage: 100 },
    { key: '95', ratio: 0.95, percentage: 95 },
    { key: '75', ratio: 0.75, percentage: 75 },
    { key: '50', ratio: 0.5, percentage: 50 }
];
const NOTIFICATION_DEADLINE_MILESTONES = [
    { key: 'due-today', label: 'vence hoje', months: 0, severity: 'critical' },
    { key: '1-day', label: '1 dia', days: 1, severity: 'critical' },
    { key: '3-days', label: '3 dias', days: 3, severity: 'critical' },
    { key: '5-days', label: '5 dias', days: 5, severity: 'warning' },
    { key: '10-days', label: '10 dias', days: 10, severity: 'warning' },
    { key: '15-days', label: '15 dias', days: 15, severity: 'warning' },
    { key: '1-month', label: '1 mes', months: 1, severity: 'warning' },
    { key: '2-months', label: '2 meses', months: 2, severity: 'info' },
    { key: '3-months', label: '3 meses', months: 3, severity: 'info' },
    { key: '6-months', label: '6 meses', months: 6, severity: 'info' }
];
const notificationCenterState = {
    isOpen: false,
    currentIds: []
};
const TUTORIAL_SECTIONS = [
    {
        title: 'Painel',
        subtitle: 'Visão consolidada da sua vida financeira',
        description: 'Acompanhe saldo disponível, distribuição dos gastos, metas e os indicadores mais importantes logo no primeiro acesso.',
        badge: 'Resumo em tempo real',
        stat: 'Indicadores e atalhos',
        accent: '01',
        imageLight: './img/dashboard-modo.claro.jpeg',
        imageDark: './img/dashboard-modo.escuro.jpeg',
        imageAlt: 'Prévia da tela de painel do Vision Finance'
    },
    {
        title: 'Despesas',
        subtitle: 'Registro rápido dos seus lançamentos',
        description: 'Cadastre despesas com categoria, forma de pagamento, data e observações para manter o histórico sempre organizado.',
        badge: 'Controle diário',
        stat: 'Categorias e filtros',
        accent: '02',
        imageLight: './img/despesas-modo.claro.jfif',
        imageDark: './img/despesas-modo.escuro.jfif',
        imageAlt: 'Prévia da tela de despesas do Vision Finance'
    },
    {
        title: 'Carteiras',
        subtitle: 'Gerencie contas, cartões e saldos',
        description: 'Centralize suas carteiras para visualizar limites, gastos acumulados e distribuição entre meios de pagamento.',
        badge: 'Meios de pagamento',
        stat: 'Saldo por carteira',
        accent: '03',
        imageLight: './img/carteiras-modo.claro.jfif',
        imageDark: './img/carteiras-modo.escuro.jfif',
        imageAlt: 'Prévia da tela de carteiras do Vision Finance'
    },
    {
        title: 'Planejamento',
        subtitle: 'Defina metas e acompanhe evolução',
        description: 'Estabeleça objetivos financeiros, acompanhe aportes por ciclo e enxergue com clareza o que falta para cada meta.',
        badge: 'Objetivos mensais',
        stat: 'Metas por ciclo',
        accent: '04',
        imageLight: './img/planejamento-modo.claro.jfif',
        imageDark: './img/planejamento-modo.escuro.jfif',
        imageAlt: 'Prévia da tela de planejamento do Vision Finance'
    },
    {
        title: 'Relatórios',
        subtitle: 'Leitura analítica dos seus hábitos',
        description: 'Use gráficos, rankings e comparativos para entender tendências e tomar decisões melhores com base nos dados.',
        badge: 'Insights visuais',
        stat: 'Comparativos e tendências',
        accent: '05',
        imageLight: './img/relatorio-modo.claro.jfif',
        imageDark: './img/relatorio-modo.escuro.jfif',
        imageAlt: 'Prévia da tela de relatórios do Vision Finance'
    },
    {
        title: 'Perfil',
        subtitle: 'Identidade e informações da conta',
        description: 'Atualize seus dados pessoais, sua foto e os detalhes que personalizam a experiência do seu ambiente.',
        badge: 'Dados do usuário',
        stat: 'Personalização da conta',
        accent: '06',
        imageLight: './img/perfil-modo.claro.jfif',
        imageDark: './img/perfil-modo.escuro.jpeg',
        imageAlt: 'Prévia da tela de perfil do Vision Finance'
    }
];

const TUTORIAL_COLOR_LABELS = {
    azul: 'Azul',
    dourado: 'Dourado',
    oceano: 'Oceano',
    grafite: 'Grafite',
    aurora: 'Aurora',
    terracota: 'Terracota'
};

const TUTORIAL_CURRENCY_LABELS = {
    BRL: 'Real Brasileiro',
    USD: 'Dólar Americano',
    EUR: 'Euro',
    GBP: 'Libra Esterlina'
};

function renderTutorialColorChoices(setting, selectedValue) {
    return Object.entries(TUTORIAL_COLOR_LABELS)
        .map(([value, label]) => `<button type="button" class="tutorial-choice-btn ${selectedValue === value ? 'is-active' : ''}" data-setting="${setting}" data-value="${value}">${label}</button>`)
        .join('');
}

let tutorialElements = null;
let tutorialDraftSettings = null;

function animarEntradaSecao(container) {
    if (!container) return;

    const explicitItems = Array.from(container.querySelectorAll('[data-animate]'));
    const animatedItems = explicitItems.length
        ? explicitItems
        : Array.from(container.children).filter((element) => element instanceof HTMLElement);

    if (!explicitItems.length) {
        animatedItems.forEach((element) => element.classList.add('section-animate'));
    }

    if (!animatedItems.length) return;

    animatedItems.forEach((element, index) => {
        element.classList.remove('is-visible');
        element.style.transitionDelay = `${Math.min(index * 55, 260)}ms`;
    });

    requestAnimationFrame(() => {
        animatedItems.forEach((element) => element.classList.add('is-visible'));
    });
}

function getTutorialCurrentStep() {
    return getTutorialState().currentStep ?? 0;
}

function escapeHtml(value = '') {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

function getTutorialDraftSettings() {
    if (tutorialDraftSettings) return tutorialDraftSettings;

    const settings = getThemeSettings();
    tutorialDraftSettings = {
        moeda: settings.moeda || 'BRL',
        corTemaClaro: settings.corTemaClaro || settings.corTema || 'azul',
        corTemaEscuro: settings.corTemaEscuro || settings.corTema || 'dourado',
        diaViradaMes: Number(settings.diaViradaMes || 1),
        temaEscuro: settings.temaEscuro === true,
        notificacoes: {
            geral: settings.notificacoes?.geral === true,
            orcamento: settings.notificacoes?.orcamento === true,
            orcamentoMeta: settings.notificacoes?.orcamentoMeta === true,
            metas: settings.notificacoes?.metas === true
        }
    };

    return tutorialDraftSettings;
}

function getThemeModeLabel(isDark) {
    return isDark ? 'Escuro' : 'Claro';
}

function getNotificationSummary(notificacoes = {}) {
    const activeItems = [
        notificacoes.geral ? 'Geral' : null,
        notificacoes.orcamento ? 'Orçamento' : null,
        notificacoes.orcamentoMeta ? 'Meta de orçamento' : null,
        notificacoes.metas ? 'Metas' : null
    ].filter(Boolean);

    return activeItems.length ? activeItems.join(', ') : 'Desativadas';
}

function persistTutorialPreferences() {
    const currentSettings = getThemeSettings();
    const nextSettings = {
        ...currentSettings,
        ...getTutorialDraftSettings(),
        notificacoes: {
            ...currentSettings.notificacoes,
            ...getTutorialDraftSettings().notificacoes
        },
        dataAtualizacao: new Date().toISOString()
    };

    const saved = setThemeSettings(nextSettings);
    ensureFinancialDataIntegrity();
    window.dispatchEvent(new CustomEvent('settingsUpdated', { detail: saved }));
    return saved;
}

function cacheTutorialElements() {
    if (tutorialElements) return tutorialElements;

    tutorialElements = {
        overlay: document.getElementById('tutorialOverlay'),
        content: document.getElementById('tutorialContent'),
        title: document.getElementById('tutorialTitle'),
        description: document.getElementById('tutorialDescription'),
        counter: document.getElementById('tutorialStepCounter'),
        progressFill: document.getElementById('tutorialProgressFill'),
        previousButton: document.getElementById('tutorialPrevBtn'),
        nextButton: document.getElementById('tutorialNextBtn'),
        laterButton: document.getElementById('tutorialLaterBtn')
    };

    return tutorialElements;
}

function renderTutorialIntroPage() {
    return `
        <div class="tutorial-intro-page">
            <section class="tutorial-intro-card">
                <span class="tutorial-eyebrow">Boas-vindas</span>
                <h3>Vamos começar o tutorial?</h3>
                <p>Conheça rapidamente as áreas principais do Vision Finance e finalize suas preferências iniciais antes do primeiro uso.</p>
                <div class="tutorial-intro-points">
                    <div class="tutorial-intro-point">
                        <strong>Visão rápida do sistema</strong>
                        <span>Painel, despesas, carteiras, planejamento, relatórios e perfil.</span>
                    </div>
                    <div class="tutorial-intro-point">
                        <strong>Configuração inicial guiada</strong>
                        <span>Ao final, você define ciclo, moeda, tema, modo visual e notificações.</span>
                    </div>
                    <div class="tutorial-intro-point">
                        <strong>Você pode retomar depois</strong>
                        <span>Se preferir, escolha Talvez mais tarde e volte no próximo login.</span>
                    </div>
                </div>
            </section>
        </div>
    `;
}

function renderTutorialSectionPage(step) {
    const section = TUTORIAL_SECTIONS[step - 1];
    const isDark = getThemeSettings().temaEscuro === true;
    const imageSource = isDark ? section.imageDark : section.imageLight;
    const sectionVisual = imageSource
        ? `
            <div class="tutorial-panel-frame">
                <div class="tutorial-panel-toolbar" aria-hidden="true">
                    <div class="tutorial-panel-dots">
                        <span></span>
                        <span></span>
                        <span></span>
                    </div>
                    <div class="tutorial-panel-toolbar-label">${escapeHtml(section.title)} Vision Finance</div>
                </div>
                <div class="tutorial-panel-media">
                    <img
                        src="${imageSource}"
                        alt="${escapeHtml(section.imageAlt)} no modo ${isDark ? 'escuro' : 'claro'}"
                        class="tutorial-panel-image"
                    >
                </div>
            </div>
        `
        : `
            <div class="tutorial-placeholder">
                <div class="tutorial-icon-badge">${escapeHtml(section.accent)}</div>
                <div>
                    <p class="tutorial-eyebrow">Imagem da tela</p>
                    <h3>${escapeHtml(section.title)}</h3>
                    <p>Placeholder pronto para receber uma captura ou ilustração dessa área futuramente.</p>
                </div>
                <div class="tutorial-placeholder-meta">
                    <span>${escapeHtml(section.badge)}</span>
                    <span>${escapeHtml(section.stat)}</span>
                </div>
            </div>
        `;

    return `
        <div class="tutorial-page">
            <article class="tutorial-copy">
                <div>
                    <span class="tutorial-eyebrow">Seção ${step}</span>
                    <h3>${escapeHtml(section.subtitle)}</h3>
                </div>
                <p>${escapeHtml(section.description)}</p>
                <div class="tutorial-feature-list">
                    <div class="tutorial-feature-item">
                        <span class="tutorial-feature-dot" aria-hidden="true"></span>
                        <div>
                            <strong>Navegação dedicada</strong>
                            <span>Acesse ${escapeHtml(section.title.toLowerCase())} pela barra lateral quando precisar.</span>
                        </div>
                    </div>
                    <div class="tutorial-feature-item">
                        <span class="tutorial-feature-dot" aria-hidden="true"></span>
                        <div>
                            <strong>Leitura consistente</strong>
                            <span>Essa área segue tema, moeda e ciclo definidos por você.</span>
                        </div>
                    </div>
                </div>
            </article>
            <article class="tutorial-visual" aria-label="Prévia da seção ${escapeHtml(section.title)}">
                ${sectionVisual}
            </article>
        </div>
    `;
}

function renderTutorialSetupPage() {
    const draft = getTutorialDraftSettings();
    const notificationGeneral = draft.notificacoes.geral === true;

    return `
        <div class="tutorial-config-page">
            <section class="tutorial-config-panel tutorial-config-panel-full">
                <span class="tutorial-eyebrow">Passo final</span>

                <div class="tutorial-config-layout">
                    <div class="tutorial-config-stack">
                        <section class="tutorial-config-card">
                            <div class="tutorial-config-card-header">
                                <strong>Base do sistema</strong>
                                <span>Ciclo e moeda padrão</span>
                            </div>
                            <div class="tutorial-form-grid tutorial-form-grid-basic">
                                <div class="tutorial-field">
                                    <label for="tutorialTurnDay">Virada do ciclo</label>
                                    <select id="tutorialTurnDay" data-setting="diaViradaMes">
                                        <option value="1" ${draft.diaViradaMes === 1 ? 'selected' : ''}>Dia 1</option>
                                        <option value="5" ${draft.diaViradaMes === 5 ? 'selected' : ''}>Dia 5</option>
                                        <option value="10" ${draft.diaViradaMes === 10 ? 'selected' : ''}>Dia 10</option>
                                        <option value="15" ${draft.diaViradaMes === 15 ? 'selected' : ''}>Dia 15</option>
                                        <option value="20" ${draft.diaViradaMes === 20 ? 'selected' : ''}>Dia 20</option>
                                        <option value="25" ${draft.diaViradaMes === 25 ? 'selected' : ''}>Dia 25</option>
                                    </select>
                                </div>
                                <div class="tutorial-field">
                                    <label for="tutorialCurrency">Moeda</label>
                                    <select id="tutorialCurrency" data-setting="moeda">
                                        <option value="BRL" ${draft.moeda === 'BRL' ? 'selected' : ''}>R$ - Real Brasileiro</option>
                                        <option value="USD" ${draft.moeda === 'USD' ? 'selected' : ''}>$ - Dólar Americano</option>
                                        <option value="EUR" ${draft.moeda === 'EUR' ? 'selected' : ''}>€ - Euro</option>
                                        <option value="GBP" ${draft.moeda === 'GBP' ? 'selected' : ''}>£ - Libra Esterlina</option>
                                    </select>
                                </div>
                            </div>
                        </section>

                        <section class="tutorial-config-card">
                            <div class="tutorial-config-card-header">
                                <strong>Aparência</strong>
                                <span>Escolha o estilo visual ideal</span>
                            </div>
                            <div class="tutorial-field tutorial-field-full">
                                <label>Tema do modo claro</label>
                                <div class="tutorial-choice-grid" data-setting-group="corTemaClaro">
                                    ${renderTutorialColorChoices('corTemaClaro', draft.corTemaClaro)}
                                </div>
                            </div>
                            <div class="tutorial-field tutorial-field-full">
                                <label>Tema do modo escuro</label>
                                <div class="tutorial-choice-grid" data-setting-group="corTemaEscuro">
                                    ${renderTutorialColorChoices('corTemaEscuro', draft.corTemaEscuro)}
                                </div>
                            </div>
                            <div class="tutorial-field tutorial-field-full">
                                <label>Modo visual</label>
                                <div class="tutorial-choice-grid tutorial-choice-grid-compact" data-setting-group="temaEscuro">
                                    <button type="button" class="tutorial-choice-btn ${draft.temaEscuro ? '' : 'is-active'}" data-setting="temaEscuro" data-value="false">Claro</button>
                                    <button type="button" class="tutorial-choice-btn ${draft.temaEscuro ? 'is-active' : ''}" data-setting="temaEscuro" data-value="true">Escuro</button>
                                </div>
                            </div>
                        </section>

                        <section class="tutorial-config-card">
                            <div class="tutorial-config-card-header">
                                <strong>Notificações</strong>
                                <span>Defina quais alertas permanecem ativos</span>
                            </div>
                            <div class="tutorial-toggle-list tutorial-toggle-list-rich">
                                <label class="tutorial-toggle tutorial-toggle-rich">
                                    <input type="checkbox" data-setting="notificacoes.geral" ${notificationGeneral ? 'checked' : ''}>
                                    <span>
                                        <strong>Geral</strong>
                                        <small>Ativa os demais alertas</small>
                                    </span>
                                </label>
                                <label class="tutorial-toggle tutorial-toggle-rich">
                                    <input type="checkbox" data-setting="notificacoes.orcamento" ${draft.notificacoes.orcamento ? 'checked' : ''} ${notificationGeneral ? '' : 'disabled'}>
                                    <span>
                                        <strong>Orçamento</strong>
                                        <small>Limites do mês</small>
                                    </span>
                                </label>
                                <label class="tutorial-toggle tutorial-toggle-rich">
                                    <input type="checkbox" data-setting="notificacoes.orcamentoMeta" ${draft.notificacoes.orcamentoMeta ? 'checked' : ''} ${notificationGeneral ? '' : 'disabled'}>
                                    <span>
                                        <strong>Meta</strong>
                                        <small>Avisos de orçamento-meta</small>
                                    </span>
                                </label>
                                <label class="tutorial-toggle tutorial-toggle-rich">
                                    <input type="checkbox" data-setting="notificacoes.metas" ${draft.notificacoes.metas ? 'checked' : ''} ${notificationGeneral ? '' : 'disabled'}>
                                    <span>
                                        <strong>Metas</strong>
                                        <small>Lembretes de objetivos</small>
                                    </span>
                                </label>
                            </div>
                        </section>
                    </div>

                    <aside class="tutorial-config-aside">
                        <div class="tutorial-config-summary-card">
                            <span class="tutorial-eyebrow">Resumo aplicado</span>
                            <h4>Como seu ambiente ficará</h4>
                            <p>Essas escolhas serão usadas nas próximas sessões e podem ser alteradas depois em Configurações.</p>
                            <div class="tutorial-summary-list tutorial-summary-list-professional">
                                <div class="tutorial-summary-item"><span>Ciclo financeiro</span><strong>Dia ${draft.diaViradaMes}</strong></div>
                                <div class="tutorial-summary-item"><span>Moeda principal</span><strong>${escapeHtml(TUTORIAL_CURRENCY_LABELS[draft.moeda] || draft.moeda)}</strong></div>
                                <div class="tutorial-summary-item"><span>Tema modo claro</span><strong>${escapeHtml(TUTORIAL_COLOR_LABELS[draft.corTemaClaro] || draft.corTemaClaro)}</strong></div>
                                <div class="tutorial-summary-item"><span>Tema modo escuro</span><strong>${escapeHtml(TUTORIAL_COLOR_LABELS[draft.corTemaEscuro] || draft.corTemaEscuro)}</strong></div>
                                <div class="tutorial-summary-item"><span>Modo visual</span><strong>${escapeHtml(getThemeModeLabel(draft.temaEscuro))}</strong></div>
                                <div class="tutorial-summary-item tutorial-summary-item-stack"><span>Notificações ativas</span><strong>${escapeHtml(getNotificationSummary(draft.notificacoes))}</strong></div>
                            </div>
                        </div>
                    </aside>
                </div>
            </section>
        </div>
    `;
}

function updateTutorialHeader(step) {
    const elements = cacheTutorialElements();
    const isIntroStep = step === 0;
    const isSetupStep = step === TOTAL_TUTORIAL_STEPS;

    elements.title.textContent = isIntroStep
        ? 'Vamos começar o tutorial'
        : isSetupStep
            ? 'Finalize sua configuração inicial'
            : `Conheça a seção ${TUTORIAL_SECTIONS[step - 1].title}`;
    elements.description.textContent = isIntroStep
        ? 'Veja um guia curto antes de acessar o sistema pela primeira vez.'
        : isSetupStep
        ? 'Defina suas preferências principais antes de começar a usar o painel.'
        : 'Cada etapa resume uma área principal do Vision Finance antes do primeiro uso.';
    elements.counter.textContent = isIntroStep ? 'Introdução' : `Passo ${step} de ${TOTAL_TUTORIAL_STEPS}`;
    elements.progressFill.style.width = `${isIntroStep ? 0 : (step / TOTAL_TUTORIAL_STEPS) * 100}%`;
    elements.nextButton.textContent = isIntroStep ? 'Vamos!' : isSetupStep ? 'Concluir tutorial' : 'Próximo';
    elements.previousButton.hidden = isIntroStep;
    elements.laterButton.hidden = !isIntroStep;
}

function bindTutorialSetupEvents() {
    const elements = cacheTutorialElements();
    if (!elements.content) return;

    elements.content.querySelectorAll('[data-setting="corTemaClaro"], [data-setting="corTemaEscuro"], [data-setting="temaEscuro"]').forEach((button) => {
        button.addEventListener('click', () => {
            const setting = button.dataset.setting;
            const rawValue = button.dataset.value;
            const parsedValue = rawValue === 'true' ? true : rawValue === 'false' ? false : rawValue;

            getTutorialDraftSettings()[setting] = parsedValue;
            persistTutorialPreferences();
            renderTutorialStep(TOTAL_TUTORIAL_STEPS);
        });
    });

    elements.content.querySelectorAll('select[data-setting]').forEach((select) => {
        select.addEventListener('change', () => {
            const setting = select.dataset.setting;
            getTutorialDraftSettings()[setting] = setting === 'diaViradaMes' ? Number(select.value) : select.value;
            persistTutorialPreferences();
            renderTutorialStep(TOTAL_TUTORIAL_STEPS);
        });
    });

    elements.content.querySelectorAll('input[type="checkbox"][data-setting]').forEach((input) => {
        input.addEventListener('change', () => {
            const path = input.dataset.setting;

            if (path === 'notificacoes.geral') {
                getTutorialDraftSettings().notificacoes.geral = input.checked;
                if (!input.checked) {
                    getTutorialDraftSettings().notificacoes.orcamento = false;
                    getTutorialDraftSettings().notificacoes.orcamentoMeta = false;
                    getTutorialDraftSettings().notificacoes.metas = false;
                }
            } else {
                const key = path.split('.')[1];
                getTutorialDraftSettings().notificacoes[key] = input.checked;
            }

            persistTutorialPreferences();
            renderTutorialStep(TOTAL_TUTORIAL_STEPS);
        });
    });
}

function renderTutorialStep(step = getTutorialCurrentStep()) {
    const elements = cacheTutorialElements();
    if (!elements.overlay || !elements.content) return;

    const normalizedStep = Math.min(Math.max(step, 0), TOTAL_TUTORIAL_STEPS);
    setTutorialState({ currentStep: normalizedStep });
    updateTutorialHeader(normalizedStep);

    elements.content.innerHTML = normalizedStep === 0
        ? renderTutorialIntroPage()
        : normalizedStep === TOTAL_TUTORIAL_STEPS
            ? renderTutorialSetupPage()
            : renderTutorialSectionPage(normalizedStep);

    if (normalizedStep === TOTAL_TUTORIAL_STEPS) {
        bindTutorialSetupEvents();
    }
}

function openTutorial(options = {}) {
    const elements = cacheTutorialElements();
    if (!elements.overlay) return;

    const startStep = Number(options.startStep);
    const resolvedStep = Number.isFinite(startStep)
        ? Math.min(Math.max(startStep, 0), TOTAL_TUTORIAL_STEPS)
        : getTutorialCurrentStep();

    document.body.classList.add('dashboard-tutorial-open');
    elements.overlay.hidden = false;
    elements.overlay.setAttribute('aria-hidden', 'false');

    setTutorialState({
        currentStep: resolvedStep,
        skipped: false,
        lastShownAt: new Date().toISOString()
    });

    renderTutorialStep(resolvedStep);
}

function closeTutorial() {
    const elements = cacheTutorialElements();
    if (!elements.overlay) return;

    document.body.classList.remove('dashboard-tutorial-open');
    elements.overlay.hidden = true;
    elements.overlay.setAttribute('aria-hidden', 'true');
    sessionStorage.removeItem(LOGIN_SESSION_KEY);
}

function handleTutorialNext() {
    const currentState = getTutorialState();
    const currentStep = currentState.currentStep ?? 0;

    if (currentStep >= TOTAL_TUTORIAL_STEPS) {
        persistTutorialPreferences();
        setTutorialState({
            completed: true,
            skipped: false,
            currentStep: TOTAL_TUTORIAL_STEPS,
            completedAt: new Date().toISOString()
        });
        closeTutorial();
        return;
    }

    const nextStep = currentStep + 1;
    setTutorialState({ completed: false, skipped: false, currentStep: nextStep });
    renderTutorialStep(nextStep);
}

function handleTutorialPrevious() {
    const currentStep = getTutorialCurrentStep();
    const previousStep = Math.max(currentStep - 1, 0);

    setTutorialState({ completed: false, skipped: false, currentStep: previousStep });
    renderTutorialStep(previousStep);
}

function handleTutorialLater() {
    const currentState = getTutorialState();
    setTutorialState({
        completed: false,
        skipped: true,
        currentStep: currentState.currentStep ?? 0
    });
    closeTutorial();
}

function bindTutorialEvents() {
    const elements = cacheTutorialElements();
    if (!elements.nextButton || elements.nextButton.dataset.bound === 'true') return;

    elements.previousButton.dataset.bound = 'true';
    elements.nextButton.dataset.bound = 'true';
    elements.laterButton.dataset.bound = 'true';
    elements.previousButton.addEventListener('click', handleTutorialPrevious);
    elements.nextButton.addEventListener('click', handleTutorialNext);
    elements.laterButton.addEventListener('click', handleTutorialLater);
}

function maybeOpenTutorialOnLogin() {
    const justLoggedIn = sessionStorage.getItem(LOGIN_SESSION_KEY) === 'true';
    const tutorialState = getTutorialState();

    if (!justLoggedIn || tutorialState.completed) {
        return;
    }

    bindTutorialEvents();
    openTutorial();
}

function handleTutorialOpenRequest(event) {
    bindTutorialEvents();
    openTutorial({ startStep: event.detail?.startStep ?? 0 });
}

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
        if (container) {
            container.innerHTML = html;
            animarEntradaSecao(container);
        }

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
                refreshNotificationCenter(true);
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
        btn.innerHTML = '<span aria-hidden="true" class="dashboard-theme-toggle-icon"></span>';
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

function readNotificationIdStore(storageKey) {
    try {
        const parsed = JSON.parse(localStorage.getItem(storageKey) || '[]');
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function writeNotificationIdStore(storageKey, ids = []) {
    const uniqueIds = [...new Set(ids)].slice(-120);
    localStorage.setItem(storageKey, JSON.stringify(uniqueIds));
    return uniqueIds;
}

function isLegacyGoalNotificationId(id) {
    if (typeof id !== 'string') return false;

    const parts = id.split(':');
    const hasLegacyCycleKey = /^\d{4}-\d{2}-\d{2}$/.test(parts[1] || '');
    return (
        (id.startsWith('goal-progress:') && hasLegacyCycleKey) ||
        (id.startsWith('goal-deadline:') && hasLegacyCycleKey)
    );
}

function isLegacyBudgetNotificationId(id) {
    if (typeof id !== 'string') return false;
    return /^budget-expense:\d{4}-\d{2}-\d{2}:95$/.test(id);
}

function readNotificationFeedStore() {
    try {
        const parsed = JSON.parse(localStorage.getItem(NOTIFICATION_FEED_STORAGE_KEY) || '[]');
        return Array.isArray(parsed)
            ? parsed.filter((item) => !isLegacyGoalNotificationId(item?.id) && !isLegacyBudgetNotificationId(item?.id))
            : [];
    } catch {
        return [];
    }
}

function writeNotificationFeedStore(items = []) {
    const normalizedItems = items
        .filter((item) => item && item.id)
        .sort((left, right) => {
            const severityDiff = getNotificationSeverityWeight(right.severity) - getNotificationSeverityWeight(left.severity);
            if (severityDiff !== 0) return severityDiff;
            return new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime();
        })
        .slice(0, 180);

    localStorage.setItem(NOTIFICATION_FEED_STORAGE_KEY, JSON.stringify(normalizedItems));
    return normalizedItems;
}

function upsertNotificationFeed(items = []) {
    const currentFeed = readNotificationFeedStore();
    const feedMap = new Map(currentFeed.map((item) => [item.id, item]));

    items.forEach((item) => {
        if (!item?.id) return;
        const current = feedMap.get(item.id);
        feedMap.set(item.id, {
            ...(current || {}),
            ...item,
            createdAt: current?.createdAt || item.createdAt || new Date().toISOString()
        });
    });

    return writeNotificationFeedStore([...feedMap.values()]);
}

function parseMetaDeadline(dateString) {
    if (typeof dateString !== 'string' || !/^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) return null;

    const [day, month, year] = dateString.split('/').map(Number);
    const parsed = new Date(year, month - 1, day, 12, 0, 0, 0);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function normalizeNotificationDate(date) {
    const normalized = new Date(date);
    normalized.setHours(12, 0, 0, 0);
    return normalized;
}

function shiftNotificationDate(date, amount, unit) {
    const shifted = new Date(date);

    if (unit === 'days') {
        shifted.setDate(shifted.getDate() + amount);
        return normalizeNotificationDate(shifted);
    }

    const originalDay = shifted.getDate();
    shifted.setMonth(shifted.getMonth() + amount);
    if (shifted.getDate() !== originalDay) {
        shifted.setDate(0);
    }

    return normalizeNotificationDate(shifted);
}

function slugifyNotificationPart(value) {
    return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .toLowerCase();
}

function getReachedProgressMilestones(ratio) {
    if (!Number.isFinite(ratio)) return [];

    return [...NOTIFICATION_PROGRESS_MILESTONES]
        .filter((milestone) => ratio >= milestone.ratio)
        .sort((left, right) => left.ratio - right.ratio);
}

    function getReachedBudgetMilestones(ratio) {
        if (!Number.isFinite(ratio)) return [];

        return [...NOTIFICATION_BUDGET_MILESTONES]
        .filter((milestone) => ratio >= milestone.ratio)
        .sort((left, right) => left.ratio - right.ratio);
    }

function getBudgetMilestoneDescriptor(milestone) {
    if (!milestone) return null;

    if (milestone.percentage >= 100) {
        return {
            severity: 'critical',
            title: 'Limite do orçamento atingido',
            message: 'As despesas do ciclo atual chegaram a 100% do limite estabelecido.'
        };
    }

    return {
        severity: milestone.percentage >= 75 ? 'warning' : 'info',
        title: `Orcamento em ${milestone.percentage}%`,
        message: `As despesas do ciclo atual chegaram a ${milestone.percentage}% do limite estabelecido.`
    };
}

function getGoalProgressMilestoneDescriptor(milestone, goalName) {
    if (!milestone) return null;

    if (milestone.percentage >= 100) {
        return {
            severity: 'success',
            title: `Meta concluida: ${goalName}`,
            message: `Parabens, a meta ${goalName} chegou a 100% e foi concluida.`
        };
    }

    return {
        severity: milestone.percentage >= 75 ? 'warning' : 'info',
        title: `Meta em ${milestone.percentage}%: ${goalName}`,
        message: `A meta ${goalName} atingiu ${milestone.percentage}% do valor planejado.`
    };
}

function getReachedDeadlineMilestones(deadline, today) {
    if (!deadline || !today) return [];

    if (today.getTime() > deadline.getTime()) {
        return [{
            key: 'overdue',
            severity: 'critical',
            label: 'prazo vencido'
        }];
    }

    return NOTIFICATION_DEADLINE_MILESTONES.filter((milestone) => {
        const triggerDate = typeof milestone.days === 'number'
            ? shiftNotificationDate(deadline, -milestone.days, 'days')
            : shiftNotificationDate(deadline, -milestone.months, 'months');

        return today.getTime() >= triggerDate.getTime() && today.getTime() <= deadline.getTime();
    });
}

function getNotificationSeverityWeight(severity) {
    return {
        critical: 3,
        warning: 2,
        info: 1,
        success: 0
    }[severity] ?? 0;
}

function formatNotificationRelativeDays(days) {
    if (days < 0) return `${Math.abs(days)} ${Math.abs(days) === 1 ? 'dia de atraso' : 'dias de atraso'}`;
    if (days === 0) return 'vence hoje';
    return `${days} ${days === 1 ? 'dia restante' : 'dias restantes'}`;
}

function formatNotificationTimestamp(timestamp) {
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return '';

    return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(date);
}

function buildNotificationItem({ id, severity, title, message, category, targetSection, meta, settingKey = 'geral' }) {
    return {
        id,
        severity,
        title,
        message,
        category,
        targetSection,
        meta,
        settingKey,
        createdAt: new Date().toISOString()
    };
}

function buildBudgetNotificationItems(snapshot) {
    const { cycleInfo, budget, totalUtilizado } = snapshot;
    if (!(budget > 0)) return [];

    const usageRatio = totalUtilizado / budget;
    return getReachedBudgetMilestones(usageRatio).map((milestone) => {
        const descriptor = getBudgetMilestoneDescriptor(milestone);
        return buildNotificationItem({
            id: `budget-expense:${cycleInfo.id}:${milestone.key}`,
            severity: descriptor.severity,
            category: 'Orçamento',
            targetSection: 'planejamento',
            title: descriptor.title,
            message: `${descriptor.message} Ciclo ${cycleInfo.label}.`,
            meta: `${formatarMoeda(totalUtilizado)} de ${formatarMoeda(budget)}`,
            settingKey: 'orcamento'
        });
    });
}

function buildGoalProgressNotificationItems(snapshot) {
    const { metas } = snapshot;

    return metas.flatMap((meta) => {
        const targetValue = parseFloat(meta.alvo) || 0;
        const savedValue = parseFloat(meta.totalHistorico) || parseFloat(meta.guardado) || 0;
        const progressRatio = targetValue > 0 ? savedValue / targetValue : 0;

        return getReachedProgressMilestones(progressRatio).map((milestone) => {
            const descriptor = getGoalProgressMilestoneDescriptor(milestone, meta.nome);
            return buildNotificationItem({
                id: `goal-progress:${slugifyNotificationPart(meta.nome)}:${meta.prazo}:${milestone.key}`,
                severity: descriptor.severity,
                category: 'Meta',
                targetSection: 'planejamento',
                title: descriptor.title,
                message: descriptor.message,
                meta: `${formatarMoeda(savedValue)} de ${formatarMoeda(targetValue)}`,
                settingKey: 'orcamentoMeta'
            });
        });
    });
}

function buildGoalDeadlineNotificationItems(snapshot, today = normalizeNotificationDate(new Date())) {
    const { metas } = snapshot;

    return metas.flatMap((meta) => {
        const deadline = parseMetaDeadline(meta.prazo);
        const savedValue = parseFloat(meta.totalHistorico) || parseFloat(meta.guardado) || 0;
        const progressRatio = meta.alvo > 0 ? savedValue / meta.alvo : 0;
        if (!deadline || progressRatio >= 1) return [];

        const remainingValue = Math.max(meta.alvo - savedValue, 0);
        const diffDays = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        return getReachedDeadlineMilestones(deadline, today).map((milestone) => {
            if (milestone.key === 'overdue') {
                return buildNotificationItem({
                    id: `goal-deadline:${slugifyNotificationPart(meta.nome)}:${meta.prazo}:overdue`,
                    severity: 'critical',
                    category: 'Prazos de metas',
                    targetSection: 'planejamento',
                    title: `Meta atrasada: ${meta.nome}`,
                    message: `O prazo da meta venceu e ainda faltam ${formatarMoeda(remainingValue)} para concluir.`,
                    meta: formatNotificationRelativeDays(diffDays),
                    settingKey: 'metas'
                });
            }

            return buildNotificationItem({
                id: `goal-deadline:${slugifyNotificationPart(meta.nome)}:${meta.prazo}:${milestone.key}`,
                severity: milestone.severity,
                category: 'Prazos de metas',
                targetSection: 'planejamento',
                title: milestone.key === 'due-today' ? `Meta vence hoje: ${meta.nome}` : `Prazo da meta: ${meta.nome}`,
                message: milestone.key === 'due-today'
                    ? `Hoje e o ultimo dia da meta ${meta.nome}. Ainda faltam ${formatarMoeda(remainingValue)} para concluir.`
                    : `Faltam ${milestone.label} para a meta ${meta.nome}. Ainda faltam ${formatarMoeda(remainingValue)} para atingir o objetivo.`,
                meta: formatNotificationRelativeDays(diffDays),
                settingKey: 'metas'
            });
        });
    });
}

function sortNotificationItems(items = []) {
    return [...items].sort((left, right) => {
        const severityDiff = getNotificationSeverityWeight(right.severity) - getNotificationSeverityWeight(left.severity);
        if (severityDiff !== 0) return severityDiff;

        const createdDiff = new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime();
        if (createdDiff !== 0) return createdDiff;

        return left.title.localeCompare(right.title, 'pt-BR');
    });
}

function getNotificationCenterData() {
    const settings = getThemeSettings();
    const notificationsEnabled = settings.notificacoes?.geral === true;

    if (!notificationsEnabled) {
        return {
            enabled: false,
            items: [],
            unreadCount: 0
        };
    }

    const snapshot = getCurrentFinancialSnapshot();
    const candidateItems = [
        ...(settings.notificacoes?.orcamento ? buildBudgetNotificationItems(snapshot) : []),
        ...(settings.notificacoes?.orcamentoMeta ? buildGoalProgressNotificationItems(snapshot) : []),
        ...(settings.notificacoes?.metas ? buildGoalDeadlineNotificationItems(snapshot) : [])
    ];

    const activeSettingKeys = ['orcamento', 'orcamentoMeta', 'metas'].filter((key) => settings.notificacoes?.[key]);
    const items = sortNotificationItems(
        upsertNotificationFeed(candidateItems).filter((item) => activeSettingKeys.includes(item.settingKey))
    );

    const seenIds = readNotificationIdStore(NOTIFICATION_SEEN_STORAGE_KEY);
    const unreadCount = items.filter((item) => !seenIds.includes(item.id)).length;

    return {
        enabled: true,
        items,
        unreadCount
    };
}

function getNotificationBellIcon() {
    return `
        <span aria-hidden="true" class="dashboard-notification-icon"></span>
        <span class="notification-btn-badge" hidden>0</span>
    `;
}

function renderNotificationPanel(panel, data) {
    if (!panel) return;

    if (!data.enabled) {
        panel.innerHTML = `
            <div class="notification-popover-head">
                <div>
                    <span class="notification-popover-eyebrow">Central de notificações</span>
                    <h3>Notificações desativadas</h3>
                </div>
            </div>
            <div class="notification-empty-state">
                <strong>Ative as notificações nas configurações</strong>
                <p>Quando os alertas estiverem habilitados, o sino mostrará avisos sobre orçamento e metas em tempo real.</p>
                <button type="button" class="notification-action-btn" data-notification-target="configuracoes">Abrir configurações</button>
            </div>
        `;
        return;
    }

    if (!data.items.length) {
        panel.innerHTML = `
            <div class="notification-popover-head">
                <div>
                    <span class="notification-popover-eyebrow">Central de notificações</span>
                    <h3>Tudo em dia</h3>
                </div>
                <span class="notification-summary-chip notification-summary-chip-success">Sem alertas</span>
            </div>
            <div class="notification-empty-state">
                <strong>Nenhuma ação pendente no momento</strong>
                <p>O sistema vai destacar aqui qualquer aviso relevante sobre orçamento, metas e limites do ciclo atual.</p>
            </div>
        `;
        return;
    }

    panel.innerHTML = `
        <div class="notification-popover-head">
            <div>
                <span class="notification-popover-eyebrow">Central de notificações</span>
                <h3>${data.unreadCount > 0 ? `${data.unreadCount} ${data.unreadCount === 1 ? 'novo alerta' : 'novos alertas'}` : 'Alertas recentes'}</h3>
            </div>
            <span class="notification-summary-chip">${data.items.length} itens</span>
        </div>
        <div class="notification-list">
            ${data.items.map((item) => `
                <article class="notification-card notification-card-${item.severity}">
                    <div class="notification-card-top">
                        <span class="notification-card-category">${item.category}</span>
                        <span class="notification-card-meta">${item.meta}</span>
                    </div>
                    <h4>${item.title}</h4>
                    <p>${item.message}</p>
                    <span class="notification-card-timestamp">Notificado em ${formatNotificationTimestamp(item.createdAt)}</span>
                    <div class="notification-card-actions">
                        <button type="button" class="notification-action-btn" data-notification-target="${item.targetSection}">Ver detalhes</button>
                    </div>
                </article>
            `).join('')}
        </div>
    `;
}

function markCurrentNotificationsAsSeen(ids = []) {
    if (!ids.length) return;
    const seenIds = readNotificationIdStore(NOTIFICATION_SEEN_STORAGE_KEY);
    writeNotificationIdStore(NOTIFICATION_SEEN_STORAGE_KEY, [...seenIds, ...ids]);
}

function maybeSendBrowserNotifications(data) {
    if (!data.enabled || !data.items.length) return;
    if (!('Notification' in window) || Notification.permission !== 'granted') return;

    const sentIds = readNotificationIdStore(NOTIFICATION_BROWSER_SENT_STORAGE_KEY);
    const candidates = data.items.filter((item) => (
        !sentIds.includes(item.id)
    ));

    if (!candidates.length) return;

    candidates.slice(0, 3).forEach((item) => {
        const notification = new Notification('Vision Finance', {
            body: `${item.title} • ${item.message}`,
            icon: './img/logo.png',
            tag: item.id
        });

        notification.onclick = () => {
            window.focus();
            notification.close();
            if (item.targetSection) navegar(item.targetSection);
        };
    });

    writeNotificationIdStore(NOTIFICATION_BROWSER_SENT_STORAGE_KEY, [...sentIds, ...candidates.map((item) => item.id)]);
}

function ensureNotificationCenter() {
    const btn = document.querySelector('.notification-btn');
    if (!btn) return null;

    btn.id = 'dashboardNotificationBtn';
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Abrir central de notificações');
    btn.setAttribute('aria-haspopup', 'dialog');
    btn.setAttribute('aria-expanded', String(notificationCenterState.isOpen));

    let wrap = document.getElementById('notificationCenterWrap');
    if (!wrap) {
        wrap = document.createElement('div');
        wrap.id = 'notificationCenterWrap';
        wrap.className = 'notification-center-wrap';
        btn.parentNode.insertBefore(wrap, btn);
        wrap.appendChild(btn);
    }

    if (!btn.dataset.enhanced) {
        btn.dataset.enhanced = 'true';
        btn.innerHTML = getNotificationBellIcon();
    }

    let panel = document.getElementById('notificationPopover');
    if (!panel) {
        panel = document.createElement('section');
        panel.id = 'notificationPopover';
        panel.className = 'notification-popover';
        panel.hidden = true;
        panel.setAttribute('role', 'dialog');
        panel.setAttribute('aria-label', 'Central de notificações');
        wrap.appendChild(panel);
    }

    if (!btn.dataset.bound) {
        btn.dataset.bound = 'true';
        btn.addEventListener('click', (event) => {
            event.stopPropagation();
            notificationCenterState.isOpen = !notificationCenterState.isOpen;
            if (notificationCenterState.isOpen) {
                markCurrentNotificationsAsSeen(notificationCenterState.currentIds);
            }
            refreshNotificationCenter(true);
        });
    }

    return { btn, panel };
}

function refreshNotificationCenter(preserveOpen = false) {
    const elements = ensureNotificationCenter();
    if (!elements) return;

    const { btn, panel } = elements;
    const badge = btn.querySelector('.notification-btn-badge');
    const data = getNotificationCenterData();
    notificationCenterState.currentIds = data.items.map((item) => item.id);

    maybeSendBrowserNotifications(data);
    renderNotificationPanel(panel, data);

    const isOpen = preserveOpen ? notificationCenterState.isOpen : false;
    notificationCenterState.isOpen = isOpen;
    panel.hidden = !isOpen;
    btn.setAttribute('aria-expanded', String(isOpen));
    btn.classList.toggle('has-unread', data.unreadCount > 0);

    if (badge) {
        badge.hidden = data.unreadCount <= 0;
        badge.textContent = data.unreadCount > 9 ? '9+' : String(data.unreadCount);
    }

    btn.title = data.enabled
        ? (data.unreadCount > 0 ? `${data.unreadCount} alertas pendentes` : 'Central de notificações')
        : 'Notificações desativadas';
}

document.addEventListener('click', (event) => {
    const panel = document.getElementById('notificationPopover');
    const wrap = document.getElementById('notificationCenterWrap');

    if (event.target.closest('.notification-action-btn')) {
        const targetSection = event.target.closest('.notification-action-btn')?.dataset.notificationTarget;
        notificationCenterState.isOpen = false;
        refreshNotificationCenter(true);
        if (targetSection) navegar(targetSection);
        return;
    }

    if (!notificationCenterState.isOpen || !wrap || !panel) return;
    if (!wrap.contains(event.target)) {
        notificationCenterState.isOpen = false;
        refreshNotificationCenter(true);
    }
});

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
    ensureNotificationCenter();
    refreshNotificationCenter();
    configurarSidebarMobile();
    configurarSaidaDashboard();
    navegar(getSecaoInicial());
    maybeOpenTutorialOnLogin();
});

window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && notificationCenterState.isOpen) {
        notificationCenterState.isOpen = false;
        refreshNotificationCenter(true);
    }

    if (e.key === 'Escape' && document.body.classList.contains('dashboard-sidebar-open')) {
        fecharSidebarMobile();
    }
});

// Listener para quando as configurações são atualizadas
window.addEventListener('settingsUpdated', () => {
    ensureFinancialDataIntegrity();
    aplicarTemaGlobal();
    gerenciarBotaoModo();
    refreshNotificationCenter(true);
    if (getTutorialState().currentStep === TOTAL_TUTORIAL_STEPS && !cacheTutorialElements().overlay?.hidden) {
        renderTutorialStep(TOTAL_TUTORIAL_STEPS);
    }
    // Re-renderiza o módulo ativo para aplicar totalmente as cores atualizadas (ex: gráficos de relatórios)
    if (modulos[secaoAtiva] && typeof modulos[secaoAtiva].init === 'function') {
        modulos[secaoAtiva].init();
    }
});

window.navegar = navegar;

window.addEventListener('profileUpdated', () => {
    aplicarAvatarPerfil();
});

window.addEventListener('visionFinance:dataChanged', () => {
    refreshNotificationCenter(true);
});

window.addEventListener('focus', () => {
    refreshNotificationCenter(true);
});

window.addEventListener('visionFinance:openTutorial', handleTutorialOpenRequest);