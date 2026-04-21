const DESPESAS_STORAGE_KEY = 'despesas';
const METAS_STORAGE_KEY = 'metas';
const CARTEIRAS_STORAGE_KEY = 'carteiras';
const SETTINGS_STORAGE_KEY = 'visionFinance_settings';
const BUDGET_STORAGE_KEY = 'budget_total';
const BUDGET_HISTORY_STORAGE_KEY = 'visionFinance_budget_history';
export const TUTORIAL_STORAGE_KEY = 'visionFinance_tutorial';

export const TURN_DAY_OPTIONS = [1, 5, 10, 15, 20, 25];
export const COLOR_THEME_OPTIONS = ['azul', 'dourado', 'oceano', 'grafite', 'aurora', 'terracota'];

const DEFAULT_SETTINGS = {
    moeda: 'BRL',
    corTema: 'azul',
    corTemaClaro: 'azul',
    corTemaEscuro: 'dourado',
    temaEscuro: false,
    diaViradaMes: 1,
    notificacoes: {
        geral: false,
        orcamento: false,
        orcamentoMeta: false,
        metas: false
    },
    dataAtualizacao: null
};

const DESPESAS_FALLBACK = [
    { titulo: 'Supermercado', categoria: 'Alimentação', pagamento: 'Cartão de Crédito', valor: 350.0, data: '2026-03-25', observacao: '' },
    { titulo: 'Uber', categoria: 'Transporte', pagamento: 'Cartão de Débito', valor: 45.0, data: '2026-03-25', observacao: '' }
];

function lerJsonStorage(chave, fallback) {
    try {
        const raw = localStorage.getItem(chave);
        return raw ? JSON.parse(raw) : fallback;
    } catch {
        return fallback;
    }
}

function normalizarDiaVirada(valor) {
    const dia = Number(valor);
    return TURN_DAY_OPTIONS.includes(dia) ? dia : DEFAULT_SETTINGS.diaViradaMes;
}

function normalizarCorTema(valor, fallback = DEFAULT_SETTINGS.corTema) {
    return COLOR_THEME_OPTIONS.includes(valor) ? valor : fallback;
}

function normalizarSettings(settings = {}) {
    const temaEscuro = settings?.temaEscuro === true;
    const corTemaLegado = normalizarCorTema(settings?.corTema, DEFAULT_SETTINGS.corTema);
    const corTemaClaro = normalizarCorTema(settings?.corTemaClaro, settings?.corTema || DEFAULT_SETTINGS.corTemaClaro);
    const corTemaEscuro = normalizarCorTema(settings?.corTemaEscuro, settings?.corTema || DEFAULT_SETTINGS.corTemaEscuro);

    return {
        ...DEFAULT_SETTINGS,
        ...settings,
        corTema: temaEscuro ? corTemaEscuro : corTemaClaro,
        corTemaClaro,
        corTemaEscuro,
        temaEscuro,
        diaViradaMes: normalizarDiaVirada(settings?.diaViradaMes),
        notificacoes: {
            ...DEFAULT_SETTINGS.notificacoes,
            ...(settings?.notificacoes || {})
        }
    };
}

function normalizarTutorialState(state = {}) {
    const currentStep = Number(state?.currentStep);
    const safeStep = Number.isFinite(currentStep) ? Math.min(Math.max(currentStep, 0), 7) : 0;

    return {
        completed: state?.completed === true,
        currentStep: safeStep,
        skipped: state?.skipped === true,
        lastShownAt: state?.lastShownAt || null,
        completedAt: state?.completedAt || null,
        updatedAt: state?.updatedAt || null
    };
}

function formatIsoDate(date) {
    const current = new Date(date);
    current.setHours(12, 0, 0, 0);
    return `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`;
}

function parseFlexibleDate(dateInput) {
    if (dateInput instanceof Date) {
        const parsed = new Date(dateInput);
        parsed.setHours(12, 0, 0, 0);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
    }

    if (typeof dateInput !== 'string' || !dateInput.trim()) return null;

    const value = dateInput.trim();
    let parsed = null;

    if (value.includes('-')) {
        parsed = new Date(`${value}T12:00:00`);
    } else if (value.includes('/')) {
        const [day, month, year] = value.split('/').map(Number);
        parsed = new Date(year, month - 1, day, 12, 0, 0, 0);
    } else {
        parsed = new Date(value);
    }

    if (Number.isNaN(parsed.getTime())) return null;
    parsed.setHours(12, 0, 0, 0);
    return parsed;
}

function dispatchFinancialDataChanged(detail = {}) {
    if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') return;
    window.dispatchEvent(new CustomEvent('visionFinance:dataChanged', { detail }));
}

function buildCycleLabel(startDate, endDate) {
    const startLabel = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(startDate).replace('.', '');
    const endLabel = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(endDate).replace('.', '');
    return `${startLabel} - ${endLabel}`;
}

export function getMonthTurnDay(settings) {
    const resolvedSettings = settings || normalizarSettings(lerJsonStorage(SETTINGS_STORAGE_KEY, DEFAULT_SETTINGS));
    return normalizarDiaVirada(resolvedSettings?.diaViradaMes);
}

export function getCycleInfo(dateInput = new Date(), turnDay = getMonthTurnDay()) {
    const reference = parseFlexibleDate(dateInput) || new Date();
    const cycleStart = new Date(reference.getFullYear(), reference.getMonth(), turnDay, 12, 0, 0, 0);

    if (reference.getDate() < turnDay) {
        cycleStart.setMonth(cycleStart.getMonth() - 1);
    }

    const nextCycleStart = new Date(cycleStart.getFullYear(), cycleStart.getMonth() + 1, turnDay, 12, 0, 0, 0);
    const cycleEnd = new Date(nextCycleStart);
    cycleEnd.setDate(cycleEnd.getDate() - 1);
    cycleEnd.setHours(12, 0, 0, 0);

    return {
        id: formatIsoDate(cycleStart),
        turnDay,
        startDate: cycleStart,
        endDate: cycleEnd,
        startIso: formatIsoDate(cycleStart),
        endIso: formatIsoDate(cycleEnd),
        year: cycleStart.getFullYear(),
        monthIndex: cycleStart.getMonth(),
        month: cycleStart.getMonth() + 1,
        label: buildCycleLabel(cycleStart, cycleEnd),
        fullLabel: `${buildCycleLabel(cycleStart, cycleEnd)} ${cycleEnd.getFullYear()}`
    };
}

export function getCurrentCycleInfo(referenceDate = new Date()) {
    return getCycleInfo(referenceDate, getMonthTurnDay());
}

export function getCyclesForYear(year, turnDay = getMonthTurnDay()) {
    return Array.from({ length: 12 }, (_, monthIndex) => getCycleInfo(new Date(year, monthIndex, turnDay, 12, 0, 0, 0), turnDay));
}

export function isDateInCycle(dateInput, cycleInfo = getCurrentCycleInfo()) {
    const parsed = parseFlexibleDate(dateInput);
    if (!parsed) return false;
    return parsed >= cycleInfo.startDate && parsed <= cycleInfo.endDate;
}

function ordenarPorData(a, b) {
    return (parseFlexibleDate(a?.data)?.getTime() || 0) - (parseFlexibleDate(b?.data)?.getTime() || 0);
}

export function getDespesasData(options = {}) {
    const despesas = lerJsonStorage(DESPESAS_STORAGE_KEY, DESPESAS_FALLBACK);
    const cycleInfo = options.cycleInfo || null;

    const filtradas = cycleInfo
        ? despesas.filter((item) => item?.data && isDateInCycle(item.data, cycleInfo))
        : despesas.filter((item) => item?.data);

    return filtradas
        .map((item) => ({
            ...item,
            valor: parseFloat(item.valor) || 0,
            valorTotalOriginal: parseFloat(item.valorTotalOriginal) || parseFloat(item.valor) || 0,
            cycleId: item?.data ? getCycleInfo(item.data).id : null
        }))
        .sort(ordenarPorData);
}

export function setDespesasData(despesas = []) {
    despesasExemplo = despesas;
    localStorage.setItem(DESPESAS_STORAGE_KEY, JSON.stringify(despesas));
    dispatchFinancialDataChanged({ scope: 'despesas' });
    return despesasExemplo;
}

function normalizarAporte(entry, fallbackCycle) {
    const parsedDate = parseFlexibleDate(entry?.data) || fallbackCycle.startDate;
    const cycleInfo = entry?.cycleId ? { ...fallbackCycle, id: entry.cycleId } : getCycleInfo(parsedDate, fallbackCycle.turnDay);
    return {
        valor: parseFloat(entry?.valor) || 0,
        data: formatIsoDate(parsedDate),
        cycleId: entry?.cycleId || cycleInfo.id
    };
}

function normalizarMeta(meta, cycleInfo = getCurrentCycleInfo()) {
    const aporteHistoricoBase = Array.isArray(meta?.aporteHistorico) ? meta.aporteHistorico : [];
    const aporteHistorico = aporteHistoricoBase.length
        ? aporteHistoricoBase.map((entry) => normalizarAporte(entry, cycleInfo))
        : (parseFloat(meta?.guardado) || 0) > 0
            ? [{ valor: parseFloat(meta.guardado) || 0, data: cycleInfo.startIso, cycleId: cycleInfo.id }]
            : [];

    const guardadoCiclo = aporteHistorico
        .filter((entry) => entry.cycleId === cycleInfo.id)
        .reduce((acc, entry) => acc + (parseFloat(entry.valor) || 0), 0);

    return {
        ...meta,
        nome: meta?.nome || 'Meta',
        prazo: meta?.prazo || '',
        alvo: parseFloat(meta?.alvo) || 0,
        guardado: guardadoCiclo,
        aporteHistorico,
        totalHistorico: aporteHistorico.reduce((acc, entry) => acc + (parseFloat(entry.valor) || 0), 0)
    };
}

function serializarMeta(meta, cycleInfo = getCurrentCycleInfo()) {
    const metaNormalizada = normalizarMeta(meta, cycleInfo);
    return {
        nome: metaNormalizada.nome,
        prazo: metaNormalizada.prazo,
        alvo: metaNormalizada.alvo,
        guardado: metaNormalizada.guardado,
        aporteHistorico: metaNormalizada.aporteHistorico
    };
}

export function getMetasData(options = {}) {
    const cycleInfo = options.cycleInfo || getCurrentCycleInfo();
    return lerJsonStorage(METAS_STORAGE_KEY, []).map((meta) => normalizarMeta(meta, cycleInfo));
}

export function setMetasData(metasList = [], options = {}) {
    const cycleInfo = options.cycleInfo || getCurrentCycleInfo();
    const serializadas = metasList.map((meta) => serializarMeta(meta, cycleInfo));
    metas = serializadas.map((meta) => normalizarMeta(meta, cycleInfo));
    localStorage.setItem(METAS_STORAGE_KEY, JSON.stringify(serializadas));
    dispatchFinancialDataChanged({ scope: 'metas', cycleId: cycleInfo.id });
    return metas;
}

export function getMetaTotalForCycle(meta, cycleInfo = getCurrentCycleInfo()) {
    return normalizarMeta(meta, cycleInfo).guardado;
}

export function addMetaContribution(metaIndex, valor, referenceDate = new Date()) {
    const currentCycle = getCycleInfo(referenceDate, getMonthTurnDay());
    const metasAtuais = getMetasData({ cycleInfo: currentCycle });
    const meta = metasAtuais[metaIndex];
    if (!meta) return metasAtuais;

    meta.aporteHistorico = Array.isArray(meta.aporteHistorico) ? meta.aporteHistorico : [];
    meta.aporteHistorico.push({
        valor: parseFloat(valor) || 0,
        data: formatIsoDate(referenceDate),
        cycleId: currentCycle.id
    });

    setMetasData(metasAtuais, { cycleInfo: currentCycle });
    return getMetasData({ cycleInfo: currentCycle });
}

export function getCarteirasData() {
    return lerJsonStorage(CARTEIRAS_STORAGE_KEY, []);
}

export function buildCarteiraReferenceKey(nome = '', tipo = '') {
    const normalizedName = String(nome || '').trim().toLowerCase();
    const normalizedType = String(tipo || '').trim().toLowerCase();

    if (!normalizedName || !normalizedType) return '';
    return `${normalizedName}::${normalizedType}`;
}

export function getDespesaCarteiraTipo(despesa = {}) {
    if (despesa?.cartaoTipo) return despesa.cartaoTipo;

    const paymentTypeMap = {
        'Cartão de Crédito': 'Cartão de Crédito',
        'Cartão de Débito': 'Cartão de Débito',
        'VA': 'Vale Alimentação',
        'VR': 'Vale Refeição',
        'VT': 'Vale Transporte'
    };

    return paymentTypeMap[despesa?.pagamento] || '';
}

export function doesDespesaMatchCarteira(despesa = {}, carteira = {}) {
    const despesaReference = despesa?.carteiraRef || buildCarteiraReferenceKey(despesa?.cartao, getDespesaCarteiraTipo(despesa));
    const carteiraReference = buildCarteiraReferenceKey(carteira?.nome, carteira?.tipo);

    if (despesaReference && carteiraReference) {
        return despesaReference === carteiraReference;
    }

    return Boolean(despesa?.cartao) && Boolean(carteira?.nome) && despesa.cartao === carteira.nome;
}

export function setCarteirasData(carteiras = []) {
    localStorage.setItem(CARTEIRAS_STORAGE_KEY, JSON.stringify(carteiras));
    return carteiras;
}

function getBudgetHistorySorted() {
    const history = lerJsonStorage(BUDGET_HISTORY_STORAGE_KEY, []);
    return history
        .map((entry) => ({
            cycleId: entry?.cycleId || getCurrentCycleInfo().id,
            valor: parseFloat(entry?.valor) || 0,
            turnDay: normalizarDiaVirada(entry?.turnDay),
            updatedAt: entry?.updatedAt || new Date().toISOString()
        }))
        .sort((left, right) => (parseFlexibleDate(left.cycleId)?.getTime() || 0) - (parseFlexibleDate(right.cycleId)?.getTime() || 0));
}

function salvarBudgetHistory(history) {
    localStorage.setItem(BUDGET_HISTORY_STORAGE_KEY, JSON.stringify(history));
    return history;
}

export function getBudgetHistory() {
    return getBudgetHistorySorted();
}

export function getBudgetForCycle(cycleInfo = getCurrentCycleInfo()) {
    const history = getBudgetHistorySorted();
    const targetTime = cycleInfo.startDate.getTime();
    const candidate = history
        .filter((entry) => (parseFlexibleDate(entry.cycleId)?.getTime() || 0) <= targetTime)
        .sort((left, right) => (parseFlexibleDate(right.cycleId)?.getTime() || 0) - (parseFlexibleDate(left.cycleId)?.getTime() || 0))[0];

    if (candidate) {
        return parseFloat(candidate.valor) || 0;
    }

    return parseFloat(localStorage.getItem(BUDGET_STORAGE_KEY)) || 0;
}

export function setCurrentCycleBudget(valor, referenceDate = new Date()) {
    const cycleInfo = getCycleInfo(referenceDate, getMonthTurnDay());
    const history = getBudgetHistorySorted();
    const normalizedValue = parseFloat(valor) || 0;
    const existingIndex = history.findIndex((entry) => entry.cycleId === cycleInfo.id);
    const payload = {
        cycleId: cycleInfo.id,
        valor: normalizedValue,
        turnDay: cycleInfo.turnDay,
        updatedAt: new Date().toISOString()
    };

    if (existingIndex >= 0) history[existingIndex] = payload;
    else history.push(payload);

    limiteMensal = normalizedValue;
    localStorage.setItem(BUDGET_STORAGE_KEY, String(normalizedValue));
    salvarBudgetHistory(history);
    dispatchFinancialDataChanged({ scope: 'budget', cycleId: cycleInfo.id });
    return normalizedValue;
}

export function syncCarteiraGastosDoCiclo(cycleInfo = getCurrentCycleInfo()) {
    const despesas = getDespesasData({ cycleInfo });
    const carteiras = getCarteirasData().map((carteira) => ({ ...carteira, gasto: 0 }));

    despesas.forEach((despesa) => {
        if (!despesa.cartao) return;
        const carteira = carteiras.find((item) => doesDespesaMatchCarteira(despesa, item));
        if (carteira) {
            carteira.gasto += parseFloat(despesa.valor) || 0;
        }
    });

    setCarteirasData(carteiras);
    return carteiras;
}

export function getCurrentFinancialSnapshot(referenceDate = new Date()) {
    const cycleInfo = getCycleInfo(referenceDate, getMonthTurnDay());
    const despesas = getDespesasData({ cycleInfo });
    const metasCiclo = getMetasData({ cycleInfo });
    const budget = getBudgetForCycle(cycleInfo);
    const totalDespesas = despesas.reduce((acc, item) => acc + (parseFloat(item.valor) || 0), 0);
    const totalMetas = metasCiclo.reduce((acc, item) => acc + (parseFloat(item.guardado) || 0), 0);
    const totalUtilizado = totalDespesas + totalMetas;

    return {
        cycleInfo,
        despesas,
        metas: metasCiclo,
        budget,
        totalDespesas,
        totalMetas,
        totalUtilizado,
        saldo: budget - totalUtilizado
    };
}

export function getCycleSummariesForYear(year, turnDay = getMonthTurnDay()) {
    return getCyclesForYear(year, turnDay).map((cycleInfo) => {
        const despesas = getDespesasData({ cycleInfo });
        const metasCiclo = getMetasData({ cycleInfo });
        const totalDespesas = despesas.reduce((acc, item) => acc + (parseFloat(item.valor) || 0), 0);
        const totalMetas = metasCiclo.reduce((acc, item) => acc + (parseFloat(item.guardado) || 0), 0);
        const budget = getBudgetForCycle(cycleInfo);
        return {
            ...cycleInfo,
            despesas,
            totalDespesas,
            totalMetas,
            totalUtilizado: totalDespesas + totalMetas,
            budget,
            saldo: budget - (totalDespesas + totalMetas),
            quantidadeDespesas: despesas.length
        };
    });
}

export function ensureFinancialDataIntegrity(referenceDate = new Date()) {
    const cycleInfo = getCycleInfo(referenceDate, getMonthTurnDay());
    const metasNormalizadas = getMetasData({ cycleInfo });
    setMetasData(metasNormalizadas, { cycleInfo });
    setCurrentCycleBudget(getBudgetForCycle(cycleInfo), referenceDate);
    syncCarteiraGastosDoCiclo(cycleInfo);
    despesasExemplo = getDespesasData();
    metas = metasNormalizadas;
    limiteMensal = getBudgetForCycle(cycleInfo);
    return cycleInfo;
}

// Dados Globais
export let despesasExemplo = lerJsonStorage(DESPESAS_STORAGE_KEY, DESPESAS_FALLBACK);
export let metas = getMetasData();
export let limiteMensal = getBudgetForCycle(getCurrentCycleInfo());

// Utilitários de Formatação
export const formatarMoeda = (valor) => {
    const ocultarAtivo = localStorage.getItem('visionFinance_olhoOculto') === 'true';
    const settings = JSON.parse(localStorage.getItem('visionFinance_settings')) || { moeda: 'BRL' };
    
    if (ocultarAtivo) {
        const simbolos = { 'BRL': 'R$', 'USD': '$', 'EUR': '€', 'GBP': '£' };
        return `${simbolos[settings.moeda] || 'R$'} *****`;
    }

    const moedasConfig = {
        'BRL': { locale: 'pt-BR', currency: 'BRL' },
        'USD': { locale: 'en-US', currency: 'USD' },
        'EUR': { locale: 'de-DE', currency: 'EUR' },
        'GBP': { locale: 'en-GB', currency: 'GBP' }
    };
    
    const config = moedasConfig[settings.moeda] || moedasConfig['BRL'];
    return new Intl.NumberFormat(config.locale, { 
        style: 'currency', 
        currency: config.currency 
    }).format(valor);
}

export const tratarClasseCategoria = (cat) => {
    if (!cat) return 'sem-categoria';
    return cat.normalize("NFD")
              .replace(/[\u0300-\u036f]/g, "")
              .toLowerCase()
              .replace(/\s+/g, '-');
};

export const getHojeFormatado = () => {
    const d = new Date();
    const dia = String(d.getDate()).padStart(2, '0');
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const ano = d.getFullYear();
    return `${dia}/${mes}/${ano}`;
};

export const getThemeSettings = () => {
    return normalizarSettings(lerJsonStorage(SETTINGS_STORAGE_KEY, DEFAULT_SETTINGS));
};

export const setThemeSettings = (settings) => {
    const normalized = normalizarSettings(settings);
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(normalized));
    return normalized;
};

export const getTutorialState = () => {
    return normalizarTutorialState(lerJsonStorage(TUTORIAL_STORAGE_KEY, {}));
};

export const setTutorialState = (state) => {
    const normalized = normalizarTutorialState({
        ...getTutorialState(),
        ...state,
        updatedAt: new Date().toISOString()
    });

    localStorage.setItem(TUTORIAL_STORAGE_KEY, JSON.stringify(normalized));
    return normalized;
};

export const setThemePreference = (isDark) => {
    const settings = getThemeSettings();
    settings.temaEscuro = isDark;
    setThemeSettings(settings);
    window.dispatchEvent(new Event('settingsUpdated'));
    return isDark;
};

export const toggleThemePreference = () => {
    const isDark = getThemeSettings().temaEscuro === true;
    return setThemePreference(!isDark);
};

export const getColorThemeForMode = (settings = getThemeSettings(), isDark = settings?.temaEscuro === true) => {
    const resolvedSettings = normalizarSettings(settings);
    return isDark ? resolvedSettings.corTemaEscuro : resolvedSettings.corTemaClaro;
};

export const applyThemeClasses = (isDark, element = document.body, settingsOverride = null) => {
    if (!element) return isDark;

    const settings = normalizarSettings(settingsOverride || getThemeSettings());

    element.dataset.theme = isDark ? 'dark' : 'light';
    element.dataset.colorTheme = getColorThemeForMode(settings, isDark);
    element.classList.toggle('dark-theme', isDark);
    element.classList.toggle('light-theme', !isDark);

    const themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (themeColorMeta) {
        const accentColor = getComputedStyle(element).getPropertyValue('--accent').trim();
        themeColorMeta.setAttribute('content', accentColor || (isDark ? '#d4af37' : '#084ca0'));
    }

    return isDark;
};

export const applyStoredTheme = (element = document.body) => {
    const settings = getThemeSettings();
    return applyThemeClasses(settings.temaEscuro === true, element);
};

export const getThemeVar = (name, element = document.body) => {
    if (!element) return '';
    return getComputedStyle(element).getPropertyValue(name).trim();
};

export const getCategoryBadgeStyle = (categoria, isDark = document.body.classList.contains('dark-theme')) => {
    const palette = {
        'Alimentacao': {
            light: { bg: '#f6b625', text: '#5c3600', border: '#d18f00' },
            dark: { bg: 'rgba(245, 158, 11, 0.18)', text: '#fbbf24', border: 'rgba(245, 158, 11, 0.32)' }
        },
        'Transporte': {
            light: { bg: '#57a0ff', text: '#0b3a73', border: '#2f78db' },
            dark: { bg: 'rgba(59, 130, 246, 0.18)', text: '#60a5fa', border: 'rgba(59, 130, 246, 0.32)' }
        },
        'Lazer': {
            light: { bg: '#ef5ba1', text: '#6f123d', border: '#d92d7e' },
            dark: { bg: 'rgba(236, 72, 153, 0.18)', text: '#f472b6', border: 'rgba(236, 72, 153, 0.32)' }
        },
        'Saude': {
            light: { bg: '#37c78b', text: '#0c5138', border: '#1fa66f' },
            dark: { bg: 'rgba(16, 185, 129, 0.18)', text: '#34d399', border: 'rgba(16, 185, 129, 0.32)' }
        },
        'Moradia': {
            light: { bg: '#9b73f3', text: '#41207d', border: '#7e56d8' },
            dark: { bg: 'rgba(139, 92, 246, 0.18)', text: '#a78bfa', border: 'rgba(139, 92, 246, 0.32)' }
        },
        'Moda': {
            light: { bg: '#b97dff', text: '#52208c', border: '#944ce6' },
            dark: { bg: 'rgba(168, 85, 247, 0.18)', text: '#c084fc', border: 'rgba(168, 85, 247, 0.32)' }
        },
        'Outros': {
            light: { bg: '#94a3b8', text: '#233044', border: '#64748b' },
            dark: { bg: 'rgba(100, 116, 139, 0.18)', text: '#94a3b8', border: 'rgba(100, 116, 139, 0.32)' }
        }
    };

    const key = tratarClasseCategoria(categoria)
        .replace(/-/g, ' ')
        .split(' ')
        .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
        .join('');

    const fallback = isDark
        ? { bg: 'rgba(148, 163, 184, 0.18)', text: '#cbd5e1', border: 'rgba(148, 163, 184, 0.32)' }
        : { bg: '#b7c1cf', text: '#273444', border: '#8c99ab' };

    return palette[key]?.[isDark ? 'dark' : 'light'] || fallback;
};

export function salvarNoStorage() {
    setDespesasData(despesasExemplo);
    setMetasData(metas);
    setCurrentCycleBudget(localStorage.getItem(BUDGET_STORAGE_KEY) || '0');
}

export function aplicarMascaraValor(input) {
    let value = input.value.replace(/\D/g, '');
    if (value === "") {
        input.value = "";
        return;
    }
    let valorFloat = (parseFloat(value) / 100).toFixed(2);
    input.value = new Intl.NumberFormat('pt-BR', { 
        minimumFractionDigits: 2 
    }).format(valorFloat);
}

/**
 * Sistema de Confirmação Profissional
 * Substitui o confirm() nativo por um modal alinhado ao design do sistema.
 */
export const confirmarAcao = (
    titulo = "Confirmar Exclusão",
    mensagem = "Esta ação não poderá ser desfeita. Deseja continuar?",
    options = {}
) => {
    return new Promise((resolve) => {
        const modal = document.getElementById('confirmModal');
        if (!modal) {
            // Fallback caso o modal não esteja no DOM
            resolve(confirm(mensagem));
            return;
        }

        const txtTitulo = modal.querySelector('h3');
        const txtMensagem = modal.querySelector('p');
        const btnCancel = document.getElementById('btnConfirmCancel');
        const btnConfirm = document.getElementById('btnConfirmDelete');
        const iconWrap = document.getElementById('confirmModalIconWrap');
        const icon = document.getElementById('confirmModalIcon');
        const confirmText = options.confirmText || 'Confirmar';
        const cancelText = options.cancelText || 'Cancelar';
        const iconSrc = options.iconSrc || './img/lixeira.png';
        const iconAlt = options.iconAlt || 'Excluir';
        const iconWrapStyle = options.iconWrapStyle || 'width: 72px; height: 72px; background: rgba(239, 68, 68, 0.14); border: 1px solid rgba(239, 68, 68, 0.32); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 22px; box-shadow: 0 12px 28px rgba(239, 68, 68, 0.18);';
        const iconStyle = options.iconStyle || 'width: 28px; height: 28px; filter: brightness(0) saturate(100%) invert(27%) sepia(98%) saturate(3518%) hue-rotate(343deg) brightness(100%) contrast(101%);';

        // Atualiza textos se fornecidos
        if (txtTitulo) txtTitulo.innerText = titulo;
        if (txtMensagem) txtMensagem.innerText = mensagem;
        if (btnCancel) btnCancel.innerText = cancelText;
        if (btnConfirm) btnConfirm.innerText = confirmText;
        if (iconWrap) iconWrap.style.cssText = iconWrapStyle;
        if (icon) {
            icon.src = iconSrc;
            icon.alt = iconAlt;
            icon.style.cssText = iconStyle;
        }

        modal.style.display = 'flex';

        const fechar = (confirmado) => {
            modal.style.display = 'none';
            // Remove os listeners para evitar execuções duplicadas no futuro
            if (btnCancel) btnCancel.onclick = null;
            if (btnConfirm) btnConfirm.onclick = null;
            modal.onclick = null;
            resolve(confirmado);
        };

        if (btnCancel) btnCancel.onclick = () => fechar(false);
        if (btnConfirm) btnConfirm.onclick = () => fechar(true);
        
        // Fechar ao clicar fora do card (opcional para UX)
        modal.onclick = (e) => {
            if (e.target === modal) fechar(false);
        };
    });
};