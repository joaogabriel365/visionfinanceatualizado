import { applyStoredTheme, confirmarAcao, ensureFinancialDataIntegrity, getThemeVar, getThemeSettings, getTutorialState, setThemeSettings, setTutorialState, toggleThemePreference } from './common.js';

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
        corTemaEscuro: settings.corTemaEscuro || settings.corTema || 'azul',
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
    maybeOpenTutorialOnLogin();
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

window.addEventListener('visionFinance:openTutorial', handleTutorialOpenRequest);