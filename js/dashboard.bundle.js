(() => {
  // js/common.js
  var DESPESAS_STORAGE_KEY = "despesas";
  var METAS_STORAGE_KEY = "metas";
  var CARTEIRAS_STORAGE_KEY = "carteiras";
  var SETTINGS_STORAGE_KEY = "visionFinance_settings";
  var BUDGET_STORAGE_KEY = "budget_total";
  var BUDGET_HISTORY_STORAGE_KEY = "visionFinance_budget_history";
  var TUTORIAL_STORAGE_KEY = "visionFinance_tutorial";
  var TURN_DAY_OPTIONS = [1, 5, 10, 15, 20, 25];
  var COLOR_THEME_OPTIONS = ["azul", "dourado", "oceano", "grafite", "aurora", "terracota"];
  var DEFAULT_SETTINGS = {
    moeda: "BRL",
    corTema: "azul",
    corTemaClaro: "azul",
    corTemaEscuro: "dourado",
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
  var DESPESAS_FALLBACK = [
    { titulo: "Supermercado", categoria: "Alimenta\xE7\xE3o", pagamento: "Cart\xE3o de Cr\xE9dito", valor: 350, data: "2026-03-25", observacao: "" },
    { titulo: "Uber", categoria: "Transporte", pagamento: "Cart\xE3o de D\xE9bito", valor: 45, data: "2026-03-25", observacao: "" }
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
        ...settings?.notificacoes || {}
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
    return `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}-${String(current.getDate()).padStart(2, "0")}`;
  }
  function parseFlexibleDate(dateInput) {
    if (dateInput instanceof Date) {
      const parsed2 = new Date(dateInput);
      parsed2.setHours(12, 0, 0, 0);
      return Number.isNaN(parsed2.getTime()) ? null : parsed2;
    }
    if (typeof dateInput !== "string" || !dateInput.trim()) return null;
    const value = dateInput.trim();
    let parsed = null;
    if (value.includes("-")) {
      parsed = /* @__PURE__ */ new Date(`${value}T12:00:00`);
    } else if (value.includes("/")) {
      const [day, month, year] = value.split("/").map(Number);
      parsed = new Date(year, month - 1, day, 12, 0, 0, 0);
    } else {
      parsed = new Date(value);
    }
    if (Number.isNaN(parsed.getTime())) return null;
    parsed.setHours(12, 0, 0, 0);
    return parsed;
  }
  function dispatchFinancialDataChanged(detail = {}) {
    if (typeof window === "undefined" || typeof window.dispatchEvent !== "function") return;
    window.dispatchEvent(new CustomEvent("visionFinance:dataChanged", { detail }));
  }
  function buildCycleLabel(startDate, endDate) {
    const startLabel = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(startDate).replace(".", "");
    const endLabel = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(endDate).replace(".", "");
    return `${startLabel} - ${endLabel}`;
  }
  function getMonthTurnDay(settings) {
    const resolvedSettings = settings || normalizarSettings(lerJsonStorage(SETTINGS_STORAGE_KEY, DEFAULT_SETTINGS));
    return normalizarDiaVirada(resolvedSettings?.diaViradaMes);
  }
  function getCycleInfo(dateInput = /* @__PURE__ */ new Date(), turnDay = getMonthTurnDay()) {
    const reference = parseFlexibleDate(dateInput) || /* @__PURE__ */ new Date();
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
  function getCurrentCycleInfo(referenceDate = /* @__PURE__ */ new Date()) {
    return getCycleInfo(referenceDate, getMonthTurnDay());
  }
  function getCyclesForYear(year, turnDay = getMonthTurnDay()) {
    return Array.from({ length: 12 }, (_, monthIndex) => getCycleInfo(new Date(year, monthIndex, turnDay, 12, 0, 0, 0), turnDay));
  }
  function isDateInCycle(dateInput, cycleInfo = getCurrentCycleInfo()) {
    const parsed = parseFlexibleDate(dateInput);
    if (!parsed) return false;
    return parsed >= cycleInfo.startDate && parsed <= cycleInfo.endDate;
  }
  function ordenarPorData(a, b) {
    return (parseFlexibleDate(a?.data)?.getTime() || 0) - (parseFlexibleDate(b?.data)?.getTime() || 0);
  }
  function getDespesasData(options = {}) {
    const despesas = lerJsonStorage(DESPESAS_STORAGE_KEY, DESPESAS_FALLBACK);
    const cycleInfo = options.cycleInfo || null;
    const filtradas = cycleInfo ? despesas.filter((item) => item?.data && isDateInCycle(item.data, cycleInfo)) : despesas.filter((item) => item?.data);
    return filtradas.map((item) => ({
      ...item,
      valor: parseFloat(item.valor) || 0,
      valorTotalOriginal: parseFloat(item.valorTotalOriginal) || parseFloat(item.valor) || 0,
      cycleId: item?.data ? getCycleInfo(item.data).id : null
    })).sort(ordenarPorData);
  }
  function setDespesasData(despesas = []) {
    despesasExemplo = despesas;
    localStorage.setItem(DESPESAS_STORAGE_KEY, JSON.stringify(despesas));
    dispatchFinancialDataChanged({ scope: "despesas" });
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
    const aporteHistorico = aporteHistoricoBase.length ? aporteHistoricoBase.map((entry) => normalizarAporte(entry, cycleInfo)) : (parseFloat(meta?.guardado) || 0) > 0 ? [{ valor: parseFloat(meta.guardado) || 0, data: cycleInfo.startIso, cycleId: cycleInfo.id }] : [];
    const guardadoCiclo = aporteHistorico.filter((entry) => entry.cycleId === cycleInfo.id).reduce((acc, entry) => acc + (parseFloat(entry.valor) || 0), 0);
    return {
      ...meta,
      nome: meta?.nome || "Meta",
      prazo: meta?.prazo || "",
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
  function getMetasData(options = {}) {
    const cycleInfo = options.cycleInfo || getCurrentCycleInfo();
    return lerJsonStorage(METAS_STORAGE_KEY, []).map((meta) => normalizarMeta(meta, cycleInfo));
  }
  function setMetasData(metasList = [], options = {}) {
    const cycleInfo = options.cycleInfo || getCurrentCycleInfo();
    const serializadas = metasList.map((meta) => serializarMeta(meta, cycleInfo));
    metas = serializadas.map((meta) => normalizarMeta(meta, cycleInfo));
    localStorage.setItem(METAS_STORAGE_KEY, JSON.stringify(serializadas));
    dispatchFinancialDataChanged({ scope: "metas", cycleId: cycleInfo.id });
    return metas;
  }
  function addMetaContribution(metaIndex, valor, referenceDate = /* @__PURE__ */ new Date()) {
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
  function getCarteirasData() {
    return lerJsonStorage(CARTEIRAS_STORAGE_KEY, []);
  }
  function buildCarteiraReferenceKey(nome = "", tipo = "") {
    const normalizedName = String(nome || "").trim().toLowerCase();
    const normalizedType = String(tipo || "").trim().toLowerCase();
    if (!normalizedName || !normalizedType) return "";
    return `${normalizedName}::${normalizedType}`;
  }
  function getDespesaCarteiraTipo(despesa = {}) {
    if (despesa?.cartaoTipo) return despesa.cartaoTipo;
    const paymentTypeMap = {
      "Cart\xE3o de Cr\xE9dito": "Cart\xE3o de Cr\xE9dito",
      "Cart\xE3o de D\xE9bito": "Cart\xE3o de D\xE9bito",
      "VA": "Vale Alimenta\xE7\xE3o",
      "VR": "Vale Refei\xE7\xE3o",
      "VT": "Vale Transporte"
    };
    return paymentTypeMap[despesa?.pagamento] || "";
  }
  function doesDespesaMatchCarteira(despesa = {}, carteira = {}) {
    const despesaReference = despesa?.carteiraRef || buildCarteiraReferenceKey(despesa?.cartao, getDespesaCarteiraTipo(despesa));
    const carteiraReference = buildCarteiraReferenceKey(carteira?.nome, carteira?.tipo);
    if (despesaReference && carteiraReference) {
      return despesaReference === carteiraReference;
    }
    return Boolean(despesa?.cartao) && Boolean(carteira?.nome) && despesa.cartao === carteira.nome;
  }
  function setCarteirasData(carteiras = []) {
    localStorage.setItem(CARTEIRAS_STORAGE_KEY, JSON.stringify(carteiras));
    return carteiras;
  }
  function getBudgetHistorySorted() {
    const history = lerJsonStorage(BUDGET_HISTORY_STORAGE_KEY, []);
    return history.map((entry) => ({
      cycleId: entry?.cycleId || getCurrentCycleInfo().id,
      valor: parseFloat(entry?.valor) || 0,
      turnDay: normalizarDiaVirada(entry?.turnDay),
      updatedAt: entry?.updatedAt || (/* @__PURE__ */ new Date()).toISOString()
    })).sort((left, right) => (parseFlexibleDate(left.cycleId)?.getTime() || 0) - (parseFlexibleDate(right.cycleId)?.getTime() || 0));
  }
  function salvarBudgetHistory(history) {
    localStorage.setItem(BUDGET_HISTORY_STORAGE_KEY, JSON.stringify(history));
    return history;
  }
  function getBudgetHistory() {
    return getBudgetHistorySorted();
  }
  function getBudgetForCycle(cycleInfo = getCurrentCycleInfo()) {
    const history = getBudgetHistorySorted();
    const targetTime = cycleInfo.startDate.getTime();
    const candidate = history.filter((entry) => (parseFlexibleDate(entry.cycleId)?.getTime() || 0) <= targetTime).sort((left, right) => (parseFlexibleDate(right.cycleId)?.getTime() || 0) - (parseFlexibleDate(left.cycleId)?.getTime() || 0))[0];
    if (candidate) {
      return parseFloat(candidate.valor) || 0;
    }
    return parseFloat(localStorage.getItem(BUDGET_STORAGE_KEY)) || 0;
  }
  function setCurrentCycleBudget(valor, referenceDate = /* @__PURE__ */ new Date()) {
    const cycleInfo = getCycleInfo(referenceDate, getMonthTurnDay());
    const history = getBudgetHistorySorted();
    const normalizedValue = parseFloat(valor) || 0;
    const existingIndex = history.findIndex((entry) => entry.cycleId === cycleInfo.id);
    const payload = {
      cycleId: cycleInfo.id,
      valor: normalizedValue,
      turnDay: cycleInfo.turnDay,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    if (existingIndex >= 0) history[existingIndex] = payload;
    else history.push(payload);
    limiteMensal = normalizedValue;
    localStorage.setItem(BUDGET_STORAGE_KEY, String(normalizedValue));
    salvarBudgetHistory(history);
    dispatchFinancialDataChanged({ scope: "budget", cycleId: cycleInfo.id });
    return normalizedValue;
  }
  function syncCarteiraGastosDoCiclo(cycleInfo = getCurrentCycleInfo()) {
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
  function getCurrentFinancialSnapshot(referenceDate = /* @__PURE__ */ new Date()) {
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
  function getCycleSummariesForYear(year, turnDay = getMonthTurnDay()) {
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
  function ensureFinancialDataIntegrity(referenceDate = /* @__PURE__ */ new Date()) {
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
  var despesasExemplo = lerJsonStorage(DESPESAS_STORAGE_KEY, DESPESAS_FALLBACK);
  var metas = getMetasData();
  var limiteMensal = getBudgetForCycle(getCurrentCycleInfo());
  var formatarMoeda = (valor) => {
    const ocultarAtivo = localStorage.getItem("visionFinance_olhoOculto") === "true";
    const settings = JSON.parse(localStorage.getItem("visionFinance_settings")) || { moeda: "BRL" };
    if (ocultarAtivo) {
      const simbolos = { "BRL": "R$", "USD": "$", "EUR": "\u20AC", "GBP": "\xA3" };
      return `${simbolos[settings.moeda] || "R$"} *****`;
    }
    const moedasConfig = {
      "BRL": { locale: "pt-BR", currency: "BRL" },
      "USD": { locale: "en-US", currency: "USD" },
      "EUR": { locale: "de-DE", currency: "EUR" },
      "GBP": { locale: "en-GB", currency: "GBP" }
    };
    const config = moedasConfig[settings.moeda] || moedasConfig["BRL"];
    return new Intl.NumberFormat(config.locale, {
      style: "currency",
      currency: config.currency
    }).format(valor);
  };
  var tratarClasseCategoria = (cat) => {
    if (!cat) return "sem-categoria";
    return cat.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, "-");
  };
  var getThemeSettings = () => {
    return normalizarSettings(lerJsonStorage(SETTINGS_STORAGE_KEY, DEFAULT_SETTINGS));
  };
  var setThemeSettings = (settings) => {
    const normalized = normalizarSettings(settings);
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(normalized));
    return normalized;
  };
  var getTutorialState = () => {
    return normalizarTutorialState(lerJsonStorage(TUTORIAL_STORAGE_KEY, {}));
  };
  var setTutorialState = (state) => {
    const normalized = normalizarTutorialState({
      ...getTutorialState(),
      ...state,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    });
    localStorage.setItem(TUTORIAL_STORAGE_KEY, JSON.stringify(normalized));
    return normalized;
  };
  var setThemePreference = (isDark) => {
    const settings = getThemeSettings();
    settings.temaEscuro = isDark;
    setThemeSettings(settings);
    window.dispatchEvent(new Event("settingsUpdated"));
    return isDark;
  };
  var toggleThemePreference = () => {
    const isDark = getThemeSettings().temaEscuro === true;
    return setThemePreference(!isDark);
  };
  var getColorThemeForMode = (settings = getThemeSettings(), isDark = settings?.temaEscuro === true) => {
    const resolvedSettings = normalizarSettings(settings);
    return isDark ? resolvedSettings.corTemaEscuro : resolvedSettings.corTemaClaro;
  };
  var applyThemeClasses = (isDark, element = document.body, settingsOverride = null) => {
    if (!element) return isDark;
    const settings = normalizarSettings(settingsOverride || getThemeSettings());
    element.dataset.theme = isDark ? "dark" : "light";
    element.dataset.colorTheme = getColorThemeForMode(settings, isDark);
    element.classList.toggle("dark-theme", isDark);
    element.classList.toggle("light-theme", !isDark);
    const themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (themeColorMeta) {
      const accentColor = getComputedStyle(element).getPropertyValue("--accent").trim();
      themeColorMeta.setAttribute("content", accentColor || (isDark ? "#d4af37" : "#084ca0"));
    }
    return isDark;
  };
  var applyStoredTheme = (element = document.body) => {
    const settings = getThemeSettings();
    return applyThemeClasses(settings.temaEscuro === true, element);
  };
  var getThemeVar = (name, element = document.body) => {
    if (!element) return "";
    return getComputedStyle(element).getPropertyValue(name).trim();
  };
  var getCategoryBadgeStyle = (categoria, isDark = document.body.classList.contains("dark-theme")) => {
    const palette = {
      "Alimentacao": {
        light: { bg: "#f6b625", text: "#5c3600", border: "#d18f00" },
        dark: { bg: "rgba(245, 158, 11, 0.18)", text: "#fbbf24", border: "rgba(245, 158, 11, 0.32)" }
      },
      "Transporte": {
        light: { bg: "#57a0ff", text: "#0b3a73", border: "#2f78db" },
        dark: { bg: "rgba(59, 130, 246, 0.18)", text: "#60a5fa", border: "rgba(59, 130, 246, 0.32)" }
      },
      "Lazer": {
        light: { bg: "#ef5ba1", text: "#6f123d", border: "#d92d7e" },
        dark: { bg: "rgba(236, 72, 153, 0.18)", text: "#f472b6", border: "rgba(236, 72, 153, 0.32)" }
      },
      "Saude": {
        light: { bg: "#37c78b", text: "#0c5138", border: "#1fa66f" },
        dark: { bg: "rgba(16, 185, 129, 0.18)", text: "#34d399", border: "rgba(16, 185, 129, 0.32)" }
      },
      "Moradia": {
        light: { bg: "#9b73f3", text: "#41207d", border: "#7e56d8" },
        dark: { bg: "rgba(139, 92, 246, 0.18)", text: "#a78bfa", border: "rgba(139, 92, 246, 0.32)" }
      },
      "Moda": {
        light: { bg: "#b97dff", text: "#52208c", border: "#944ce6" },
        dark: { bg: "rgba(168, 85, 247, 0.18)", text: "#c084fc", border: "rgba(168, 85, 247, 0.32)" }
      },
      "Outros": {
        light: { bg: "#94a3b8", text: "#233044", border: "#64748b" },
        dark: { bg: "rgba(100, 116, 139, 0.18)", text: "#94a3b8", border: "rgba(100, 116, 139, 0.32)" }
      }
    };
    const key = tratarClasseCategoria(categoria).replace(/-/g, " ").split(" ").map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1)).join("");
    const fallback = isDark ? { bg: "rgba(148, 163, 184, 0.18)", text: "#cbd5e1", border: "rgba(148, 163, 184, 0.32)" } : { bg: "#b7c1cf", text: "#273444", border: "#8c99ab" };
    return palette[key]?.[isDark ? "dark" : "light"] || fallback;
  };
  var confirmarAcao = (titulo = "Confirmar Exclus\xE3o", mensagem = "Esta a\xE7\xE3o n\xE3o poder\xE1 ser desfeita. Deseja continuar?", options = {}) => {
    return new Promise((resolve) => {
      const modal = document.getElementById("confirmModal");
      if (!modal) {
        resolve(confirm(mensagem));
        return;
      }
      const txtTitulo = modal.querySelector("h3");
      const txtMensagem = modal.querySelector("p");
      const btnCancel = document.getElementById("btnConfirmCancel");
      const btnConfirm = document.getElementById("btnConfirmDelete");
      const iconWrap = document.getElementById("confirmModalIconWrap");
      const icon = document.getElementById("confirmModalIcon");
      const confirmText = options.confirmText || "Confirmar";
      const cancelText = options.cancelText || "Cancelar";
      const iconSrc = options.iconSrc || "./img/lixeira.png";
      const iconAlt = options.iconAlt || "Excluir";
      const iconWrapStyle = options.iconWrapStyle || "width: 72px; height: 72px; background: rgba(239, 68, 68, 0.14); border: 1px solid rgba(239, 68, 68, 0.32); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 22px; box-shadow: 0 12px 28px rgba(239, 68, 68, 0.18);";
      const iconStyle = options.iconStyle || "width: 28px; height: 28px; filter: brightness(0) saturate(100%) invert(27%) sepia(98%) saturate(3518%) hue-rotate(343deg) brightness(100%) contrast(101%);";
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
      modal.style.display = "flex";
      const fechar = (confirmado) => {
        modal.style.display = "none";
        if (btnCancel) btnCancel.onclick = null;
        if (btnConfirm) btnConfirm.onclick = null;
        modal.onclick = null;
        resolve(confirmado);
      };
      if (btnCancel) btnCancel.onclick = () => fechar(false);
      if (btnConfirm) btnConfirm.onclick = () => fechar(true);
      modal.onclick = (e) => {
        if (e.target === modal) fechar(false);
      };
    });
  };

  // js/painel.js
  var PAINEL_CYCLE_FILTER_STORAGE_KEY = "visionFinance_painel_cycle_filter";
  var Painel = {
    init() {
      const cycleOptions = this.obterCiclosDisponiveis();
      const cycleInfo = this.obterCicloSelecionado(cycleOptions);
      const snapshot = getCurrentFinancialSnapshot(cycleInfo.startDate);
      const despesas = snapshot.despesas;
      const metas2 = snapshot.metas;
      const limite = snapshot.budget;
      const ocultarAtivo = localStorage.getItem("visionFinance_olhoOculto") === "true";
      this.renderizarFiltroCiclos(cycleOptions, cycleInfo.id);
      const badge = document.getElementById("dataAtualBadge");
      if (badge) badge.innerText = `Ciclo ${snapshot.cycleInfo.label}`;
      this.renderizarCards(despesas, metas2, limite);
      this.renderizarTabelaCiclo(despesas, snapshot.cycleInfo);
      this.gerarGraficoPizza(despesas, ocultarAtivo);
      this.gerarGraficoBarras(despesas, ocultarAtivo);
      this.melhorarBotaoOlho();
    },
    atualizarEstadoVazioGrafico({ canvasId, emptyStateId, hasData }) {
      const canvas = document.getElementById(canvasId);
      const emptyState = document.getElementById(emptyStateId);
      const container = canvas?.closest(".chart-container");
      if (container) {
        container.classList.toggle("is-empty", !hasData);
      }
      if (canvas) {
        canvas.setAttribute("aria-hidden", hasData ? "false" : "true");
      }
      if (emptyState) {
        emptyState.hidden = hasData;
      }
    },
    obterCiclosDisponiveis() {
      const cycleIds = /* @__PURE__ */ new Set([getCurrentCycleInfo().id]);
      getDespesasData().forEach((despesa) => {
        if (despesa?.cycleId) cycleIds.add(despesa.cycleId);
      });
      getBudgetHistory().forEach((entry) => {
        if (entry?.cycleId) cycleIds.add(entry.cycleId);
      });
      this.obterCiclosHistoricosMetas().forEach((cycleId) => cycleIds.add(cycleId));
      return Array.from(cycleIds).map((cycleId) => getCycleInfo(cycleId)).sort((left, right) => right.startDate.getTime() - left.startDate.getTime());
    },
    obterCiclosHistoricosMetas() {
      try {
        const metas2 = JSON.parse(localStorage.getItem("visionFinance_metas") || "[]");
        return metas2.flatMap((meta) => Array.isArray(meta?.aporteHistorico) ? meta.aporteHistorico.map((entry) => entry?.cycleId).filter(Boolean) : []);
      } catch {
        return [];
      }
    },
    obterCicloSelecionado(cycleOptions = []) {
      const currentCycle = getCurrentCycleInfo();
      const storedCycleId = localStorage.getItem(PAINEL_CYCLE_FILTER_STORAGE_KEY);
      const selectedCycle = cycleOptions.find((cycle) => cycle.id === storedCycleId);
      if (selectedCycle) {
        return selectedCycle;
      }
      localStorage.setItem(PAINEL_CYCLE_FILTER_STORAGE_KEY, currentCycle.id);
      return cycleOptions.find((cycle) => cycle.id === currentCycle.id) || currentCycle;
    },
    renderizarFiltroCiclos(cycleOptions, selectedCycleId) {
      const select = document.getElementById("painelCycleFilter");
      if (!select) return;
      select.innerHTML = cycleOptions.map((cycle) => `
            <option value="${cycle.id}" ${cycle.id === selectedCycleId ? "selected" : ""}>${cycle.fullLabel}</option>
        `).join("");
      select.onchange = (event) => {
        const nextCycleId = event.target.value;
        localStorage.setItem(PAINEL_CYCLE_FILTER_STORAGE_KEY, nextCycleId);
        this.init();
      };
    },
    renderizarCards(despesas, metas2, limite) {
      const totalDespesas = despesas.reduce((acc, d) => acc + d.valor, 0);
      const totalMetas = metas2.reduce((acc, m) => acc + (parseFloat(m.guardado) || 0), 0);
      const totalGasto = totalDespesas + totalMetas;
      const saldo = limite - totalGasto;
      const totalEl = document.getElementById("totalGastoText");
      const limiteEl = document.getElementById("limiteText");
      const saldoEl = document.getElementById("saldoText");
      const metodoEl = document.getElementById("metodoPrincipalText");
      if (totalEl) totalEl.innerText = formatarMoeda(totalGasto);
      if (limiteEl) limiteEl.innerText = formatarMoeda(limite);
      if (saldoEl) {
        saldoEl.innerText = formatarMoeda(saldo);
        saldoEl.style.color = saldo < 0 ? "#ef4444" : getThemeVar("--accent");
      }
      if (metodoEl) {
        if (despesas.length > 0) {
          const contagem = {};
          despesas.forEach((d) => contagem[d.pagamento] = (contagem[d.pagamento] || 0) + 1);
          metodoEl.innerText = Object.keys(contagem).reduce((a, b) => contagem[a] > contagem[b] ? a : b);
        } else {
          metodoEl.innerText = "---";
        }
      }
    },
    renderizarTabelaCiclo(despesas, cycleInfo) {
      const tbody = document.getElementById("expenseTableBody");
      if (!tbody) return;
      const despesasCiclo = [...despesas].sort((left, right) => (/* @__PURE__ */ new Date(`${right.data}T00:00:00`)).getTime() - (/* @__PURE__ */ new Date(`${left.data}T00:00:00`)).getTime()).slice(0, 6);
      if (despesasCiclo.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 30px; color:#94a3b8;">Nenhuma despesa registrada no ciclo ${cycleInfo.label}.</td></tr>`;
        return;
      }
      tbody.innerHTML = despesasCiclo.map((d) => {
        const cor = getCategoryBadgeStyle(d.categoria);
        return `
            <tr>
                <td class="expense-col-title">${d.titulo}</td>
                <td class="expense-col-category">
                    <span class="category-tag category-tag-strong" style="--tag-bg:${cor.bg}; --tag-text:${cor.text}; --tag-border:${cor.border};">
                        ${d.categoria}
                    </span>
                </td>
                <td class="expense-col-payment">${d.pagamento}</td>
                <td class="expense-col-value"><strong>${formatarMoeda(d.valor)}</strong></td>
                <td class="expense-col-date">${d.data.includes("-") ? d.data.split("-").reverse().join("/") : d.data}</td>
            </tr>`;
      }).join("");
    },
    melhorarBotaoOlho() {
      const btn = document.getElementById("btnToggleOlho");
      if (!btn) return;
      const atualizarIcone = () => {
        const ativo = localStorage.getItem("visionFinance_olhoOculto") === "true";
        btn.style.color = ativo ? getThemeVar("--text-secondary") : getThemeVar("--accent");
        btn.innerHTML = ativo ? `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>` : `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
      };
      btn.addEventListener("click", () => {
        setTimeout(atualizarIcone, 50);
      });
      atualizarIcone();
    },
    gerarGraficoPizza(despesas, ocultarAtivo) {
      const canvas = document.getElementById("categoryChart");
      if (!canvas) return;
      const instance = Chart.getChart("categoryChart");
      if (instance) instance.destroy();
      const dadosCat = {};
      despesas.forEach((d) => dadosCat[d.categoria] = (dadosCat[d.categoria] || 0) + d.valor);
      const coresCategoria = {
        "Alimenta\xE7\xE3o": "#f59e0b",
        "Transporte": "#3b82f6",
        "Lazer": "#ec4899",
        "Sa\xFAde": "#10b981",
        "Moradia": "#8b5cf6",
        "Moda": "#c084fc",
        "Outros": "#94a3b8"
      };
      const categories = Object.keys(dadosCat);
      const values = Object.values(dadosCat);
      const backgroundColor = categories.map((cat) => coresCategoria[cat] || "#c9aa6a");
      if (!categories.length || values.every((value) => value <= 0)) {
        this.atualizarEstadoVazioGrafico({
          canvasId: "categoryChart",
          emptyStateId: "categoryChartEmpty",
          hasData: false
        });
        return;
      }
      this.atualizarEstadoVazioGrafico({
        canvasId: "categoryChart",
        emptyStateId: "categoryChartEmpty",
        hasData: true
      });
      new Chart(canvas, {
        type: "doughnut",
        data: {
          labels: categories,
          datasets: [{
            data: values,
            backgroundColor,
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: "70%",
          plugins: {
            legend: { position: "bottom", labels: { color: "#bfa877" } },
            tooltip: { enabled: !ocultarAtivo }
          }
        }
      });
    },
    gerarGraficoBarras(despesas, ocultarAtivo) {
      const canvas = document.getElementById("paymentChart");
      if (!canvas) return;
      const instance = Chart.getChart("paymentChart");
      if (instance) instance.destroy();
      const accentColor = getThemeVar("--accent") || "#0b63ce";
      const accentSoft = getThemeVar("--accent-soft") || "rgba(11, 99, 206, 0.12)";
      const textSecondary = getThemeVar("--text-secondary") || "#475569";
      const borderColor = getThemeVar("--border-color") || "#d6e2ef";
      const metodos = { "Cr\xE9dito": 0, "D\xE9bito": 0, "Pix": 0, "VR": 0, "VA": 0, "Dinheiro": 0 };
      despesas.forEach((d) => {
        let chave = d.pagamento.replace("Cart\xE3o de ", "").trim();
        if (chave.toLowerCase() === "pix") chave = "Pix";
        if (metodos.hasOwnProperty(chave)) metodos[chave] += d.valor;
      });
      const paymentValues = Object.values(metodos);
      if (paymentValues.every((value) => value <= 0)) {
        this.atualizarEstadoVazioGrafico({
          canvasId: "paymentChart",
          emptyStateId: "paymentChartEmpty",
          hasData: false
        });
        return;
      }
      this.atualizarEstadoVazioGrafico({
        canvasId: "paymentChart",
        emptyStateId: "paymentChartEmpty",
        hasData: true
      });
      new Chart(canvas, {
        type: "bar",
        data: {
          labels: Object.keys(metodos),
          datasets: [{
            label: "Total por M\xE9todo",
            data: paymentValues,
            backgroundColor: accentColor,
            borderColor: accentColor,
            borderWidth: 1,
            borderRadius: 4,
            barPercentage: 0.72,
            categoryPercentage: 0.85,
            borderSkipped: false
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: { enabled: !ocultarAtivo }
          },
          scales: {
            y: {
              beginAtZero: true,
              grid: { color: accentSoft },
              ticks: { display: !ocultarAtivo, color: textSecondary }
            },
            x: { grid: { display: false }, ticks: { color: textSecondary }, border: { display: true, color: borderColor } }
          },
          layout: {
            padding: { left: 6, right: 6, top: 8, bottom: 6 }
          }
        }
      });
    }
  };

  // js/despesas.js
  var editIconUrl = "./img/lapis.png";
  var deleteIconUrl = "./img/lixeira.png";
  var commentIconUrl = "./img/comentario.png";
  var DespesasModulo = {
    init() {
      this.configurarFiltros();
      this.configurarFormulario();
      this.aplicarMascaras();
      this.configurarModalDescricao();
      this.renderizarTabelaCompleta();
      window.DespesasModulo = this;
    },
    getDespesas() {
      return getDespesasData();
    },
    // Obtém as carteiras (contas/cartões) cadastradas no sistema
    getCarteiras() {
      return getCarteirasData();
    },
    obterEstiloCategoria(categoria) {
      return getCategoryBadgeStyle(categoria);
    },
    verificarMetodoPagamento() {
      const textPrimary = getThemeVar("--text-primary") || "#0f172a";
      const accent = getThemeVar("--accent") || "#0b63ce";
      const metodo = document.getElementById("metodo").value;
      const containerParcelamento = document.getElementById("containerParcelamento");
      const containerCartao = document.getElementById("containerCartao");
      const avisoInexistente = document.getElementById("avisoCartaoInexistente");
      const selectCartao = document.getElementById("cartaoSelecionado");
      const tipoMsg = document.getElementById("tipoCartaoMsg");
      containerParcelamento.style.display = "none";
      containerCartao.style.display = "none";
      avisoInexistente.style.display = "none";
      selectCartao.innerHTML = "";
      if (!metodo) return;
      const carteiras = this.getCarteiras();
      const mapeamentoTipos = {
        "Cart\xE3o de Cr\xE9dito": "Cart\xE3o de Cr\xE9dito",
        "Cart\xE3o de D\xE9bito": "Cart\xE3o de D\xE9bito",
        "VA": "Vale Alimenta\xE7\xE3o",
        "VR": "Vale Refei\xE7\xE3o",
        "VT": "Vale Transporte"
      };
      const tipoBusca = mapeamentoTipos[metodo];
      if (tipoBusca) {
        const cartoesDisponiveis = carteiras.filter((c) => c.tipo === tipoBusca);
        if (cartoesDisponiveis.length > 0) {
          containerCartao.style.display = "block";
          const optDefault = document.createElement("option");
          optDefault.value = "";
          optDefault.textContent = "Selecionar...";
          optDefault.style.color = textPrimary;
          selectCartao.appendChild(optDefault);
          cartoesDisponiveis.forEach((c) => {
            const option = document.createElement("option");
            option.value = buildCarteiraReferenceKey(c.nome, c.tipo);
            option.dataset.walletName = c.nome;
            option.dataset.walletType = c.tipo;
            option.textContent = c.bandeira ? `${c.nome} (${c.bandeira})` : c.nome;
            option.style.color = textPrimary;
            selectCartao.appendChild(option);
          });
          const separator = document.createElement("option");
          separator.disabled = true;
          separator.textContent = "\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500";
          separator.style.color = textPrimary;
          selectCartao.appendChild(separator);
          const optNovo = document.createElement("option");
          optNovo.value = "ADICIONAR_NOVO_ACAO";
          optNovo.textContent = "+ Adicionar novo cart\xE3o";
          optNovo.style.fontWeight = "bold";
          optNovo.style.color = accent;
          selectCartao.appendChild(optNovo);
          if (metodo === "Cart\xE3o de Cr\xE9dito") {
            containerParcelamento.style.display = "block";
          }
        } else {
          avisoInexistente.style.display = "block";
          tipoMsg.textContent = metodo.toLowerCase();
        }
      } else {
        document.getElementById("foiParcelado").value = "nao";
        this.toggleSeletorParcelas();
      }
    },
    redirecionarParaCarteira() {
      this.fecharModal();
      if (window.navegar) {
        window.navegar("carteiras");
      } else {
        const linkCarteira = document.querySelector('[data-section="carteiras"]');
        if (linkCarteira) linkCarteira.click();
      }
    },
    toggleSeletorParcelas() {
      const foiParcelado = document.getElementById("foiParcelado").value;
      const seletor = document.getElementById("numParcelas");
      seletor.style.display = foiParcelado === "sim" ? "block" : "none";
    },
    aplicarMascaras() {
      const valorInput = document.getElementById("valor");
      const dataInput = document.getElementById("data");
      const observacaoInput = document.getElementById("observacao");
      if (valorInput) {
        valorInput.addEventListener("input", (e) => {
          let value = e.target.value.replace(/\D/g, "");
          if (value.length > 10) value = value.slice(0, 10);
          if (value === "") {
            e.target.value = "";
            return;
          }
          const valorFloat = parseFloat(value) / 100;
          e.target.value = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valorFloat);
        });
      }
      if (dataInput) {
        dataInput.addEventListener("input", (e) => {
          let value = e.target.value.replace(/\D/g, "");
          if (value.length > 8) value = value.slice(0, 8);
          if (value.length >= 5) value = `${value.slice(0, 2)}/${value.slice(2, 4)}/${value.slice(4)}`;
          else if (value.length >= 3) value = `${value.slice(0, 2)}/${value.slice(2)}`;
          e.target.value = value;
          this.limparErroData();
        });
      }
      if (observacaoInput) {
        observacaoInput.maxLength = 500;
        observacaoInput.addEventListener("input", (e) => {
          if (e.target.value.length > 500) {
            e.target.value = e.target.value.slice(0, 500);
          }
        });
      }
    },
    configurarModalDescricao() {
      const modal = document.getElementById("expenseDescriptionModal");
      const closeButton = document.getElementById("expenseDescriptionClose");
      if (!modal || modal.dataset.bound === "true") return;
      modal.dataset.bound = "true";
      closeButton?.addEventListener("click", () => this.fecharModalDescricao());
      modal.addEventListener("click", (event) => {
        if (event.target === modal) {
          this.fecharModalDescricao();
        }
      });
      document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && modal.style.display === "flex") {
          this.fecharModalDescricao();
        }
      });
    },
    abrirModalDescricao(titulo, descricao) {
      const modal = document.getElementById("expenseDescriptionModal");
      const title = document.getElementById("expenseDescriptionTitle");
      const body = document.getElementById("expenseDescriptionBody");
      if (!modal || !title || !body) return;
      title.textContent = titulo ? `Descri\xE7\xE3o de ${titulo}` : "Descri\xE7\xE3o da despesa";
      body.textContent = descricao || "Nenhuma descri\xE7\xE3o informada.";
      modal.style.display = "flex";
    },
    fecharModalDescricao() {
      const modal = document.getElementById("expenseDescriptionModal");
      if (modal) modal.style.display = "none";
    },
    validarData(dataString) {
      const regex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
      if (!regex.test(dataString)) return false;
      const [_, dia, mes, ano] = dataString.match(regex).map(Number);
      if (ano < 1900 || ano > 2100 || mes < 1 || mes > 12) return false;
      const diasNoMes = [31, ano % 4 === 0 && (ano % 100 !== 0 || ano % 400 === 0) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
      return dia > 0 && dia <= diasNoMes[mes - 1];
    },
    exibirErroData(mensagem) {
      this.limparErroData();
      const dataInput = document.getElementById("data");
      const erroSpan = document.createElement("span");
      erroSpan.id = "error-data-msg";
      erroSpan.style.cssText = "color: #ff4d4d; font-size: 12px; margin-top: 5px; display: block; font-weight: 600;";
      erroSpan.innerText = mensagem;
      dataInput.parentNode.appendChild(erroSpan);
      dataInput.style.borderColor = "#ff4d4d";
    },
    limparErroData() {
      const msg = document.getElementById("error-data-msg");
      if (msg) msg.remove();
      const dataInput = document.getElementById("data");
      if (dataInput) dataInput.style.borderColor = "";
    },
    abrirModal(index = -1) {
      const modal = document.getElementById("modalDespesa");
      const form = document.getElementById("formDespesa");
      if (!modal || !form) return;
      form.reset();
      this.limparErroData();
      document.getElementById("editIndex").value = index;
      document.getElementById("containerParcelamento").style.display = "none";
      document.getElementById("containerCartao").style.display = "none";
      document.getElementById("avisoCartaoInexistente").style.display = "none";
      document.getElementById("numParcelas").style.display = "none";
      const textPrimary = getThemeVar("--text-primary") || "#0f172a";
      form.querySelectorAll("select, input, textarea").forEach((el) => el.style.color = textPrimary);
      if (index !== -1) {
        document.getElementById("modalTitle").innerText = "Editar Despesa";
        const despesa = this.getDespesas()[index];
        document.getElementById("titulo").value = despesa.titulo;
        const valorParaEdicao = despesa.valorTotalOriginal || despesa.valor;
        document.getElementById("valor").value = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valorParaEdicao);
        document.getElementById("categoria").value = despesa.categoria;
        document.getElementById("metodo").value = despesa.pagamento;
        this.verificarMetodoPagamento();
        if (despesa.cartao) {
          const selectCartao = document.getElementById("cartaoSelecionado");
          const carteiraRef = despesa.carteiraRef || buildCarteiraReferenceKey(despesa.cartao, getDespesaCarteiraTipo(despesa));
          selectCartao.value = carteiraRef;
          if (!selectCartao.value) {
            const legacyOption = Array.from(selectCartao.options).find((option) => option.dataset.walletName === despesa.cartao);
            if (legacyOption) selectCartao.value = legacyOption.value;
          }
        }
        if (despesa.pagamento === "Cart\xE3o de Cr\xE9dito" && despesa.parcelas) {
          document.getElementById("foiParcelado").value = "sim";
          document.getElementById("numParcelas").value = despesa.parcelas;
          document.getElementById("numParcelas").style.display = "block";
        }
        const partes = despesa.data.split("-");
        document.getElementById("data").value = `${partes[2]}/${partes[1]}/${partes[0]}`;
        document.getElementById("observacao").value = despesa.observacao || "";
      } else {
        document.getElementById("modalTitle").innerText = "Nova Despesa";
        const h = /* @__PURE__ */ new Date();
        document.getElementById("data").value = `${String(h.getDate()).padStart(2, "0")}/${String(h.getMonth() + 1).padStart(2, "0")}/${h.getFullYear()}`;
      }
      modal.style.display = "flex";
    },
    fecharModal() {
      const modal = document.getElementById("modalDespesa");
      if (modal) modal.style.display = "none";
    },
    formatarDataExibicao(dataIso) {
      if (!dataIso || typeof dataIso !== "string") return "Data Inv\xE1lida";
      const partes = dataIso.split("-");
      if (partes.length !== 3) return dataIso;
      const dataFormatada = `${partes[2]}/${partes[1]}/${partes[0]}`;
      const hoje = (/* @__PURE__ */ new Date()).toLocaleDateString("pt-BR");
      return hoje === dataFormatada ? `\u{1F4C5} HOJE - ${dataFormatada}` : dataFormatada;
    },
    obterAnosDisponiveis() {
      return [...new Set(
        this.getDespesas().map((item) => String(item?.data || "").split("-")[0]).filter((ano) => /^\d{4}$/.test(ano))
      )].sort((a, b) => Number(b) - Number(a));
    },
    popularFiltroAnos(anoSelecionado = "todos") {
      const selectAno = document.getElementById("filterYear");
      if (!selectAno) return;
      const anosDisponiveis = this.obterAnosDisponiveis();
      const valorAtual = anosDisponiveis.includes(anoSelecionado) ? anoSelecionado : "todos";
      selectAno.innerHTML = [
        '<option value="todos">Ano</option>',
        ...anosDisponiveis.map((ano) => `<option value="${ano}">${ano}</option>`)
      ].join("");
      selectAno.value = valorAtual;
    },
    obterResumoCiclo(cycleInfo, despesasDoCiclo) {
      const quantidade = despesasDoCiclo.length;
      return {
        titulo: cycleInfo?.fullLabel || cycleInfo?.label || "Ciclo financeiro",
        meta: `${quantidade} ${quantidade === 1 ? "despesa" : "despesas"}`
      };
    },
    renderizarTabelaCompleta(dadosFiltrados = null) {
      const tbody = document.getElementById("fullExpenseTableBody");
      const totalElement = document.getElementById("totalFiltrado");
      if (!tbody) return;
      this.popularFiltroAnos(document.getElementById("filterYear")?.value || "todos");
      const isLightTheme = document.body.classList.contains("light-theme");
      const sectionRowBackground = isLightTheme ? getThemeVar("--accent") || "#0b63ce" : "rgba(30, 41, 59, 0.5)";
      const sectionRowText = isLightTheme ? "#ffffff" : getThemeVar("--accent") || "#d4af37";
      const sectionRowBorder = isLightTheme ? getThemeVar("--accent-hover") || "#084da0" : getThemeVar("--border-color") || "#2a3948";
      let despesas = dadosFiltrados || this.getDespesas();
      if (totalElement) {
        const totalSoma = despesas.reduce((acc, d) => acc + d.valor, 0);
        totalElement.innerText = formatarMoeda(totalSoma);
      }
      if (despesas.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="expense-empty-state">Nenhuma despesa encontrada.</td></tr>';
        return;
      }
      despesas.sort((a, b) => new Date(b.data) - new Date(a.data));
      const gruposPorCiclo = despesas.reduce((acc, d) => {
        const cycleInfo = getCycleInfo(d.data);
        const cycleId = cycleInfo.id;
        if (!acc[cycleId]) {
          acc[cycleId] = {
            cycleInfo,
            despesas: []
          };
        }
        acc[cycleId].despesas.push(d);
        return acc;
      }, {});
      const ciclosOrdenados = Object.values(gruposPorCiclo).sort((a, b) => b.cycleInfo.startDate - a.cycleInfo.startDate);
      let htmlFinal = "";
      const getPaymentIcon = (metodo) => {
        const icons = {
          "Cart\xE3o de Cr\xE9dito": "fa-credit-card",
          "Cart\xE3o de D\xE9bito": "fa-credit-card",
          "Pix": "fa-bolt",
          "Dinheiro": "fa-money-bill-wave",
          "VR": "fa-utensils",
          "VA": "fa-basket-shopping",
          "VT": "fa-bus"
        };
        return icons[metodo] || "fa-wallet";
      };
      ciclosOrdenados.forEach(({ cycleInfo, despesas: despesasDoCiclo }) => {
        const resumoCiclo = this.obterResumoCiclo(cycleInfo, despesasDoCiclo);
        htmlFinal += `
                <tr class="expense-cycle-group-row">
                    <td colspan="7">
                        <div class="expense-cycle-group-badge">
                            <div class="expense-cycle-group-copy">
                                <span class="expense-cycle-group-eyebrow">Ciclo financeiro</span>
                                <span class="expense-cycle-group-title">${resumoCiclo.titulo}</span>
                            </div>
                            <span class="expense-cycle-group-meta">${resumoCiclo.meta}</span>
                        </div>
                    </td>
                </tr>`;
        const gruposPorData = despesasDoCiclo.reduce((acc, d) => {
          acc[d.data] = acc[d.data] || [];
          acc[d.data].push(d);
          return acc;
        }, {});
        const datasOrdenadas = Object.keys(gruposPorData).sort((a, b) => new Date(b) - new Date(a));
        datasOrdenadas.forEach((dataKey) => {
          htmlFinal += `
                    <tr class="expense-date-group-row">
                        <td colspan="7">
                            <span class="expense-date-group-badge" style="background: ${sectionRowBackground}; color: ${sectionRowText}; border-bottom: 1px solid ${sectionRowBorder};">
                                ${this.formatarDataExibicao(dataKey)}
                            </span>
                        </td>
                    </tr>`;
          gruposPorData[dataKey].forEach((item) => {
            const globalIndex = this.getDespesas().findIndex((d) => JSON.stringify(d) === JSON.stringify(item));
            const estilo = this.obterEstiloCategoria(item.categoria);
            let infoExtra = "";
            if (item.parcelas || item.cartao) {
              infoExtra += `<div class="expense-payment-extra">`;
              if (item.parcelas) {
                infoExtra += `<span class="expense-payment-chip expense-payment-chip-installments">${item.parcelas}</span>`;
              }
              if (item.cartao) {
                infoExtra += `<span class="expense-payment-chip expense-payment-chip-card">${item.cartao}</span>`;
              }
              infoExtra += `</div>`;
            }
            const tituloSeguro = JSON.stringify(item.titulo || "Despesa");
            const observacaoSegura = JSON.stringify(item.observacao || "");
            const textoObs = item.observacao ? `<button type="button" class="expense-description-trigger" onclick='window.DespesasModulo.abrirModalDescricao(${tituloSeguro}, ${observacaoSegura})' aria-label="Abrir descri\xE7\xE3o da despesa ${item.titulo}" title="Abrir descri\xE7\xE3o">
                            <img src="${commentIconUrl}" alt="" class="expense-description-icon">
                       </button>` : `<div class="expense-description-empty">-</div>`;
            const valorExibicao = item.valorTotalOriginal || item.valor;
            htmlFinal += `
                        <tr class="expense-row">
                            <td class="expense-cell-title" data-label="Titulo">
                                <div class="expense-title-block">
                                    <strong class="expense-title-main">${item.titulo}</strong>
                                </div>
                            </td>
                            <td class="expense-cell-category" data-label="Categoria">
                                <div class="expense-field-stack">
                                    <span class="expense-field-label"><i class="fas fa-tags"></i><span>Categoria</span></span>
                                    <span class="category-tag category-tag-strong" style="--tag-bg: ${estilo.bg}; --tag-text: ${estilo.text}; --tag-border: ${estilo.border}; min-width: 110px;">
                                        ${item.categoria}
                                    </span>
                                </div>
                            </td>
                            <td class="expense-cell-payment" data-label="Pagamento">
                                <div class="expense-field-stack">
                                    <span class="expense-field-label"><i class="fas ${getPaymentIcon(item.pagamento)}"></i><span>Pagamento</span></span>
                                    <span class="expense-payment-main">${item.pagamento}</span>
                                    ${infoExtra}
                                </div>
                            </td>
                            <td class="expense-cell-value" data-label="Valor">
                                <div class="expense-field-stack">
                                    <span class="expense-field-label"><i class="fas fa-money-bill-wave"></i><span>Valor</span></span>
                                    <strong class="expense-value-strong">${formatarMoeda(valorExibicao)}</strong>
                                </div>
                            </td>
                            <td class="expense-cell-date" data-label="Data">
                                <div class="expense-field-stack">
                                    <span class="expense-field-label"><i class="fas fa-calendar-days"></i><span>Data</span></span>
                                    <span class="expense-date-text">${this.formatarDataExibicao(item.data).replace("\u{1F4C5} HOJE - ", "")}</span>
                                </div>
                            </td>
                            <td class="expense-cell-description${item.observacao ? "" : " expense-cell-description-empty-row"}" data-label="Descricao">
                                <div class="expense-field-stack">
                                    <span class="expense-field-label"><i class="fas fa-align-left"></i><span>Descri\xE7\xE3o</span></span>
                                    ${textoObs}
                                </div>
                            </td>
                            <td class="expense-cell-actions" data-label="Acoes">
                                <div class="expense-actions">
                                    <button class="btn-action btn-edit" onclick="window.editarDespesa(${globalIndex})" title="Editar despesa" aria-label="Editar despesa ${item.titulo}">
                                        <img src="${editIconUrl}" alt="Editar" class="expense-action-image">
                                    </button>
                                    <button class="btn-action btn-delete" onclick="window.deletarDespesa(${globalIndex})" title="Excluir despesa" aria-label="Excluir despesa ${item.titulo}">
                                        <img src="${deleteIconUrl}" alt="Excluir" class="expense-action-image">
                                    </button>
                                </div>
                            </td>
                        </tr>`;
          });
        });
      });
      tbody.innerHTML = htmlFinal;
    },
    configurarFormulario() {
      const form = document.getElementById("formDespesa");
      if (!form) return;
      const getFormTextColor = () => getThemeVar("--text-primary") || "#0f172a";
      const selectCartao = document.getElementById("cartaoSelecionado");
      if (selectCartao) {
        selectCartao.addEventListener("change", (e) => {
          e.target.style.color = getFormTextColor();
          if (e.target.value === "ADICIONAR_NOVO_ACAO") {
            this.redirecionarParaCarteira();
          }
        });
      }
      form.querySelectorAll("select, input, textarea").forEach((campo) => {
        campo.addEventListener("change", (e) => e.target.style.color = getFormTextColor());
        campo.style.color = getFormTextColor();
      });
      form.onsubmit = (e) => {
        e.preventDefault();
        const dataRaw = document.getElementById("data").value;
        if (!this.validarData(dataRaw)) {
          this.exibirErroData("Por favor, insira uma data v\xE1lida.");
          return;
        }
        const index = parseInt(document.getElementById("editIndex").value);
        let valorTexto = document.getElementById("valor").value;
        const valorLimpo = valorTexto.replace(/[^\d,]/g, "").replace(",", ".");
        const [d, m, a] = dataRaw.split("/");
        const metodo = document.getElementById("metodo").value;
        const foiParcelado = document.getElementById("foiParcelado").value;
        const cartaoSel = document.getElementById("cartaoSelecionado").value;
        const cartaoSelecionadoOption = document.getElementById("cartaoSelecionado").selectedOptions?.[0] || null;
        const parcelasInput = metodo === "Cart\xE3o de Cr\xE9dito" && foiParcelado === "sim" ? document.getElementById("numParcelas").value : null;
        const valorTotalOriginal = parseFloat(valorLimpo);
        let valorFinalParaCalculo = valorTotalOriginal;
        if (parcelasInput) {
          const numParcelasMatch = parcelasInput.match(/\d+/);
          const numParcelas = numParcelasMatch ? parseInt(numParcelasMatch[0]) : 1;
          valorFinalParaCalculo = valorTotalOriginal / numParcelas;
        }
        const novaDespesa = {
          titulo: document.getElementById("titulo").value,
          valor: valorFinalParaCalculo,
          // Valor da parcela para somas/limites
          valorTotalOriginal,
          // Valor cheio para exibição
          categoria: document.getElementById("categoria").value,
          pagamento: metodo,
          cartao: cartaoSel && cartaoSel !== "ADICIONAR_NOVO_ACAO" ? cartaoSelecionadoOption?.dataset.walletName || null : null,
          cartaoTipo: cartaoSel && cartaoSel !== "ADICIONAR_NOVO_ACAO" ? cartaoSelecionadoOption?.dataset.walletType || metodo : null,
          carteiraRef: cartaoSel && cartaoSel !== "ADICIONAR_NOVO_ACAO" ? cartaoSel : null,
          parcelas: parcelasInput,
          data: `${a}-${m}-${d}`,
          observacao: document.getElementById("observacao").value
        };
        let despesas = this.getDespesas();
        if (index === -1) despesas.push(novaDespesa);
        else despesas[index] = novaDespesa;
        setDespesasData(despesas);
        this.sincronizarGastoCarteiras();
        if (typeof this.aplicarFiltrosAtuais === "function") this.aplicarFiltrosAtuais();
        else this.renderizarTabelaCompleta();
        this.fecharModal();
      };
    },
    // Garante que o gasto nas carteiras reflita a soma das parcelas (125)
    sincronizarGastoCarteiras() {
      syncCarteiraGastosDoCiclo();
    },
    configurarFiltros() {
      const filters = ["filterYear", "filterMonth", "filterCategory", "filterPayment", "filterPeriod"].map((id) => document.getElementById(id));
      const searchInput = document.getElementById("searchExpense");
      const btnLimpar = document.getElementById("btnClearFilters");
      this.popularFiltroAnos(document.getElementById("filterYear")?.value || "todos");
      const aplicar = () => {
        this.popularFiltroAnos(document.getElementById("filterYear")?.value || "todos");
        const [ano, m, c, p, period] = filters.map((f) => f ? f.value : "todos");
        const termoBusca = searchInput ? searchInput.value.toLowerCase() : "";
        const hoje = /* @__PURE__ */ new Date();
        hoje.setHours(23, 59, 59, 999);
        const filtradas = this.getDespesas().filter((d) => {
          const dataDespesa = new Date(d.data);
          dataDespesa.setHours(0, 0, 0, 0);
          let atendePeriodo = true;
          if (period !== "todos") {
            const diffTempo = Math.abs(hoje - dataDespesa);
            const diffDias = Math.ceil(diffTempo / (1e3 * 60 * 60 * 24));
            atendePeriodo = diffDias <= parseInt(period);
          }
          const mesD = d.data.split("-")[1];
          const anoD = d.data.split("-")[0];
          const atendeBusca = d.titulo.toLowerCase().includes(termoBusca) || d.observacao && d.observacao.toLowerCase().includes(termoBusca);
          return (ano === "todos" || anoD === ano) && (m === "todos" || mesD === m) && (c === "todos" || d.categoria === c) && (p === "todos" || d.pagamento === p) && atendePeriodo && atendeBusca;
        });
        this.renderizarTabelaCompleta(filtradas);
      };
      this.aplicarFiltrosAtuais = aplicar;
      filters.forEach((f) => {
        if (f) f.addEventListener("change", aplicar);
      });
      if (searchInput) {
        searchInput.addEventListener("input", aplicar);
      }
      if (btnLimpar) {
        btnLimpar.onclick = () => {
          filters.forEach((f) => {
            if (f) f.value = "todos";
          });
          if (searchInput) searchInput.value = "";
          aplicar();
        };
      }
    }
  };
  window.deletarDespesa = async (index) => {
    const confirmado = await confirmarAcao(
      "Confirmar Exclus\xE3o",
      "Voc\xEA tem certeza que deseja remover esta despesa? Esta a\xE7\xE3o n\xE3o pode ser desfeita."
    );
    if (confirmado) {
      let despesas = DespesasModulo.getDespesas();
      despesas.splice(index, 1);
      setDespesasData(despesas);
      DespesasModulo.sincronizarGastoCarteiras();
      if (typeof DespesasModulo.aplicarFiltrosAtuais === "function") DespesasModulo.aplicarFiltrosAtuais();
      else DespesasModulo.renderizarTabelaCompleta();
    }
  };
  window.editarDespesa = (index) => DespesasModulo.abrirModal(index);

  // js/relatorios.js
  var RelatoriosModulo = {
    monthNames: ["Janeiro", "Fevereiro", "Marco", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"],
    monthVisibilidade: Array(12).fill(true),
    init() {
      this.popularFiltroAnos();
      this.renderizarOverview();
      this.renderizarResumo();
      this.updateChartContainerMetrics();
      this.gerarGraficoComparativo();
      this.renderizarInsights();
      this.renderizarRanking();
      this.configurarControleOcultarMeses();
      this.bindResponsiveChart();
      this.scheduleChartResize();
      const yearSelect = document.getElementById("reportYear");
      if (yearSelect) {
        yearSelect.onchange = () => {
          this.renderizarOverview();
          this.gerarGraficoComparativo();
          this.renderizarInsights();
          this.renderizarResumo();
          this.renderizarRanking();
          this.configurarControleOcultarMeses();
        };
      }
    },
    obterAnosDisponiveis() {
      return [...new Set(
        this.getDespesasPorAnoCicloTodos().map((despesa) => this.getAnoDespesa(despesa)).filter((ano) => Number.isInteger(ano) && ano >= 1900 && ano <= 2100).map((ano) => String(ano))
      )].sort((left, right) => Number(right) - Number(left));
    },
    getAnoDespesa(despesa) {
      if (!despesa?.data) return null;
      try {
        return getCycleInfo(despesa.data).year;
      } catch {
        return null;
      }
    },
    popularFiltroAnos(anoSelecionado = null) {
      const yearSelect = document.getElementById("reportYear");
      if (!yearSelect) return;
      const anosDisponiveis = this.obterAnosDisponiveis();
      const valorAtual = String(anoSelecionado || yearSelect.value || "");
      const fallbackYear = anosDisponiveis[0] || String((/* @__PURE__ */ new Date()).getFullYear());
      const valorSelecionado = anosDisponiveis.includes(valorAtual) ? valorAtual : fallbackYear;
      yearSelect.innerHTML = anosDisponiveis.length ? anosDisponiveis.map((ano) => `<option value="${ano}">${ano}</option>`).join("") : `<option value="${fallbackYear}">${fallbackYear}</option>`;
      yearSelect.value = valorSelecionado;
      yearSelect.disabled = anosDisponiveis.length <= 1;
    },
    isMobileViewport() {
      return window.innerWidth <= 640;
    },
    getChartViewportProfile() {
      const container = document.querySelector(".reports-chart-container");
      const width = container?.clientWidth || window.innerWidth;
      return {
        width,
        isCompact: width <= 420,
        isNarrow: width <= 640,
        isMedium: width <= 920,
        useHorizontalBars: width <= 760,
        labelFontSize: width <= 420 ? 10 : width <= 640 ? 11 : 12,
        valueFontSize: width <= 420 ? 10 : width <= 760 ? 11 : 12,
        maxBarThickness: width <= 420 ? 18 : width <= 640 ? 22 : width <= 760 ? 26 : width <= 1100 ? 38 : 52,
        categoryPercentage: width <= 420 ? 0.86 : width <= 760 ? 0.82 : 0.72,
        barPercentage: width <= 420 ? 0.66 : width <= 760 ? 0.72 : 0.82,
        layoutPadding: width <= 420 ? { top: 6, right: 4, bottom: 2, left: 0 } : width <= 760 ? { top: 8, right: 8, bottom: 4, left: 2 } : { top: 12, right: 12, bottom: 2, left: 8 }
      };
    },
    updateChartContainerMetrics(profile = this.getChartViewportProfile()) {
      const container = document.querySelector(".reports-chart-container");
      if (!container) return profile;
      const cycleCount = Math.max(this.getCycleSummaries().length, 1);
      let nextHeight = 380;
      if (profile.useHorizontalBars) {
        const rowHeight = profile.isCompact ? 28 : profile.isNarrow ? 30 : 32;
        const baseHeight = profile.isCompact ? 124 : 132;
        nextHeight = baseHeight + cycleCount * rowHeight;
        nextHeight = Math.max(profile.isCompact ? 336 : 360, Math.min(nextHeight, profile.isCompact ? 520 : 540));
      } else if (profile.isMedium) {
        nextHeight = 360;
      } else {
        nextHeight = 400;
      }
      container.style.setProperty("--reports-chart-height", `${nextHeight}px`);
      return profile;
    },
    refreshResponsiveChartLayout(forceRegenerate = false) {
      const profile = this.updateChartContainerMetrics();
      const layoutKey = [
        profile.useHorizontalBars ? "horizontal" : "vertical",
        profile.labelFontSize,
        profile.valueFontSize,
        profile.maxBarThickness,
        profile.categoryPercentage,
        profile.barPercentage,
        profile.width <= 420 ? "compact" : profile.width <= 760 ? "narrow" : profile.width <= 920 ? "medium" : "wide"
      ].join(":");
      if (forceRegenerate || this._lastChartLayoutKey !== layoutKey) {
        this._lastChartLayoutKey = layoutKey;
        this.gerarGraficoComparativo();
        return;
      }
      if (!window.myChart) return;
      window.myChart.resize();
      window.myChart.update("none");
      this.atualizarControleOcultarMeses();
    },
    getMonthLabel(name) {
      if (!this.isMobileViewport()) return name;
      return name.slice(0, 3);
    },
    getSelectedYear() {
      const yearSelect = document.getElementById("reportYear");
      return yearSelect ? Number(yearSelect.value) : (/* @__PURE__ */ new Date()).getFullYear();
    },
    getDespesasPorAnoCicloTodos() {
      return getDespesasData();
    },
    getCycleSummaries() {
      return getCycleSummariesForYear(this.getSelectedYear());
    },
    getCycleControlLabels() {
      return this.getCycleSummaries().map((summary) => summary.label);
    },
    getDespesasPorAnoCiclo(year = this.getSelectedYear()) {
      return this.getDespesasPorAnoCicloTodos().filter((despesa) => getCycleInfo(despesa.data).year === year);
    },
    getResumoReferencia(summaries) {
      const currentCycle = getCurrentCycleInfo();
      const selectedYear = this.getSelectedYear();
      if (selectedYear === currentCycle.year) {
        return summaries.find((summary) => summary.id === currentCycle.id) || summaries[0];
      }
      const withData = [...summaries].reverse().find((summary) => summary.totalUtilizado > 0);
      return withData || summaries[summaries.length - 1];
    },
    obterCoresGrafico() {
      const styles = getComputedStyle(document.body);
      const isDark = document.body.classList.contains("dark-theme");
      return {
        textPrimary: styles.getPropertyValue("--text-primary").trim() || (isDark ? "#f8fafc" : "#1f2937"),
        textSecondary: styles.getPropertyValue("--text-secondary").trim() || (isDark ? "#b6c2d0" : "#475569"),
        accent: styles.getPropertyValue("--accent").trim() || (isDark ? "#d4af37" : "#084ca0"),
        accentRgb: styles.getPropertyValue("--accent-rgb").trim() || (isDark ? "212, 175, 55" : "8, 76, 160"),
        xTickInactive: isDark ? "rgba(182, 194, 208, 0.42)" : "rgba(71, 85, 105, 0.42)",
        hiddenBar: isDark ? "rgba(148, 163, 184, 0.18)" : "rgba(203, 213, 225, 0.35)",
        tooltipBackground: styles.getPropertyValue("--bg-surface").trim() || (isDark ? "#0b1118" : "#f8f4ee"),
        tooltipTitle: styles.getPropertyValue("--text-primary").trim() || (isDark ? "#f8fafc" : "#0f172a"),
        tooltipBody: styles.getPropertyValue("--text-secondary").trim() || (isDark ? "#b6c2d0" : "#475569"),
        tooltipBorder: `rgba(${styles.getPropertyValue("--accent-rgb").trim() || (isDark ? "212, 175, 55" : "8, 76, 160")}, 0.24)`
      };
    },
    bindResponsiveChart() {
      if (!this._scheduleResponsiveRefresh) {
        let resizeTimer = null;
        this._scheduleResponsiveRefresh = (forceRegenerate = false) => {
          clearTimeout(resizeTimer);
          resizeTimer = window.setTimeout(() => {
            if (!document.getElementById("comparisonChart")) return;
            this.refreshResponsiveChartLayout(forceRegenerate);
          }, 140);
        };
      }
      if (!this._responsiveChartBound) {
        this._responsiveChartBound = true;
        window.addEventListener("resize", () => this._scheduleResponsiveRefresh(false));
        window.addEventListener("orientationchange", () => this._scheduleResponsiveRefresh(true));
        if (window.visualViewport) {
          window.visualViewport.addEventListener("resize", () => this._scheduleResponsiveRefresh(true));
        }
      }
      if (this._reportsResizeObserver) {
        this._reportsResizeObserver.disconnect();
        this._reportsResizeObserver = null;
      }
      if ("ResizeObserver" in window) {
        const observedCard = document.querySelector(".chart-card-large");
        if (observedCard) {
          this._reportsResizeObserver = new ResizeObserver(() => this._scheduleResponsiveRefresh(false));
          this._reportsResizeObserver.observe(observedCard);
        }
      }
    },
    scheduleChartResize() {
      if (this._chartResizeFrame) {
        window.cancelAnimationFrame(this._chartResizeFrame);
      }
      this._chartResizeFrame = window.requestAnimationFrame(() => {
        this._chartResizeFrame = window.requestAnimationFrame(() => {
          const chart = window.myChart;
          if (!chart) return;
          chart.resize();
          chart.update("none");
        });
      });
    },
    configurarControleOcultarMeses() {
      const trigger = document.getElementById("monthVisibilityTrigger");
      const popover = document.getElementById("monthVisibilityPopover");
      const list = document.getElementById("monthVisibilityList");
      const control = document.getElementById("monthVisibilityControl");
      if (!trigger || !popover || !list || !control) return;
      const controlLabels = this.getCycleControlLabels();
      list.innerHTML = controlLabels.map((label, index) => `
            <label class="month-visibility-option ${!this.monthVisibilidade[index] ? "is-hidden" : ""}" data-month-index="${index}">
                <input type="checkbox" class="month-visibility-checkbox" data-month-index="${index}" ${!this.monthVisibilidade[index] ? "checked" : ""}>
                <span>${label}</span>
            </label>
        `).join("");
      trigger.onclick = (event) => {
        event.stopPropagation();
        if (popover.hasAttribute("hidden")) this.abrirControleOcultarMeses();
        else this.fecharControleOcultarMeses();
      };
      list.querySelectorAll(".month-visibility-checkbox").forEach((checkbox) => {
        checkbox.onchange = () => {
          const index = Number(checkbox.dataset.monthIndex);
          this.monthVisibilidade[index] = !checkbox.checked;
          if (window.myChart) this.atualizarVisibilidadeGrafico(window.myChart);
          else this.atualizarControleOcultarMeses();
        };
      });
      if (!this.handleClickForaControleMeses) {
        this.handleClickForaControleMeses = (event) => {
          const currentControl = document.getElementById("monthVisibilityControl");
          const currentPopover = document.getElementById("monthVisibilityPopover");
          if (!currentControl || !currentPopover || currentPopover.hasAttribute("hidden")) return;
          if (!currentControl.contains(event.target)) this.fecharControleOcultarMeses();
        };
        document.addEventListener("click", this.handleClickForaControleMeses);
      }
      if (!this.handleEscapeControleMeses) {
        this.handleEscapeControleMeses = (event) => {
          if (event.key === "Escape") this.fecharControleOcultarMeses();
        };
        document.addEventListener("keydown", this.handleEscapeControleMeses);
      }
      this.atualizarControleOcultarMeses();
    },
    abrirControleOcultarMeses() {
      const trigger = document.getElementById("monthVisibilityTrigger");
      const popover = document.getElementById("monthVisibilityPopover");
      if (!trigger || !popover) return;
      popover.removeAttribute("hidden");
      trigger.setAttribute("aria-expanded", "true");
    },
    fecharControleOcultarMeses() {
      const trigger = document.getElementById("monthVisibilityTrigger");
      const popover = document.getElementById("monthVisibilityPopover");
      if (!trigger || !popover) return;
      popover.setAttribute("hidden", "");
      trigger.setAttribute("aria-expanded", "false");
    },
    atualizarControleOcultarMeses() {
      const count = document.getElementById("monthVisibilityCount");
      const list = document.getElementById("monthVisibilityList");
      if (count) count.textContent = String(this.monthVisibilidade.filter((visible) => !visible).length);
      if (!list) return;
      list.querySelectorAll(".month-visibility-option").forEach((option) => {
        const index = Number(option.dataset.monthIndex);
        const checkbox = option.querySelector(".month-visibility-checkbox");
        const hidden = !this.monthVisibilidade[index];
        option.classList.toggle("is-hidden", hidden);
        if (checkbox) checkbox.checked = hidden;
      });
    },
    atualizarVisibilidadeGrafico(chart) {
      if (!chart) return;
      const profile = this.updateChartContainerMetrics();
      const totals = chart.$cycleTotals || [];
      const labels = chart.$cycleLabels || [];
      const monthColors = chart.$monthColors || [];
      const theme = this.obterCoresGrafico();
      const isHorizontal = profile.useHorizontalBars;
      const values = totals.map((valor, index) => this.monthVisibilidade[index] ? valor : null);
      const colors = monthColors.map((cor, index) => this.monthVisibilidade[index] ? cor : theme.hiddenBar);
      const visibleValues = values.filter((valor) => valor !== null);
      const maxValue = Math.max(...visibleValues, 0);
      const suggestedMax = this.calcularTetoEscala(maxValue);
      const stepSize = suggestedMax > 0 ? Math.max(1, suggestedMax / 5) : 20;
      chart.data.labels = labels.map((label) => this.getMonthLabel(label));
      chart.data.datasets[0].data = values;
      chart.data.datasets[0].backgroundColor = colors;
      chart.options.scales[isHorizontal ? "x" : "y"].suggestedMax = suggestedMax;
      chart.options.scales[isHorizontal ? "x" : "y"].ticks.stepSize = stepSize;
      chart.update();
      this.atualizarControleOcultarMeses();
      this.renderizarOverview();
      this.renderizarInsights();
    },
    getVisibleCycleSummaries() {
      return this.getCycleSummaries().filter((_, index) => this.monthVisibilidade[index]);
    },
    updateReportCycleChip(visibleCount = this.getVisibleCycleSummaries().length, totalCount = this.getCycleSummaries().length) {
      const chip = document.getElementById("reportCycleCountChip");
      if (!chip) return;
      chip.textContent = `${visibleCount}/${totalCount} ciclos vis\xEDveis`;
    },
    renderizarOverview() {
      const container = document.getElementById("reportsOverviewMetrics");
      if (!container) return;
      const summaries = this.getCycleSummaries();
      const visibleSummaries = this.getVisibleCycleSummaries();
      if (!summaries.length) {
        container.innerHTML = '<div class="empty-state">Nenhum dado dispon\xEDvel para compor a vis\xE3o executiva.</div>';
        this.updateReportCycleChip(0, 0);
        return;
      }
      const effectiveSummaries = visibleSummaries.length ? visibleSummaries : summaries;
      const totalUtilizado = effectiveSummaries.reduce((acc, summary) => acc + (Number(summary.totalUtilizado) || 0), 0);
      const totalMetas = effectiveSummaries.reduce((acc, summary) => acc + (Number(summary.totalMetas) || 0), 0);
      const mediaPorCiclo = totalUtilizado / Math.max(effectiveSummaries.length, 1);
      const peakCycle = effectiveSummaries.reduce((highest, summary) => summary.totalUtilizado > highest.totalUtilizado ? summary : highest, effectiveSummaries[0]);
      const latestSummary = effectiveSummaries[effectiveSummaries.length - 1];
      const previousSummary = effectiveSummaries[effectiveSummaries.length - 2];
      const trendLabel = this.getTrendLabel(latestSummary?.totalUtilizado || 0, previousSummary?.totalUtilizado || 0);
      const hiddenCount = summaries.length - visibleSummaries.length;
      const cards = [
        {
          label: "Volume anual",
          value: formatarMoeda(totalUtilizado),
          meta: hiddenCount > 0 ? `${hiddenCount} ciclo(s) oculto(s)` : "Leitura completa do ano"
        },
        {
          label: "M\xE9dia por ciclo",
          value: formatarMoeda(mediaPorCiclo),
          meta: `${effectiveSummaries.length} ciclo(s) considerados`
        },
        {
          label: "Maior concentra\xE7\xE3o",
          value: peakCycle?.label || "Sem dados",
          meta: peakCycle ? formatarMoeda(peakCycle.totalUtilizado) : "Sem movimenta\xE7\xE3o"
        },
        {
          label: "Metas registradas",
          value: formatarMoeda(totalMetas),
          meta: trendLabel
        }
      ];
      container.innerHTML = cards.map((card) => `
            <article class="reports-overview-card">
                <span class="reports-overview-label">${card.label}</span>
                <strong class="reports-overview-value">${card.value}</strong>
                <span class="reports-overview-meta">${card.meta}</span>
            </article>
        `).join("");
      this.updateReportCycleChip(visibleSummaries.length || summaries.length, summaries.length);
    },
    getTrendLabel(currentValue, previousValue) {
      if (!previousValue && !currentValue) return "Sem movimento relevante";
      if (!previousValue && currentValue > 0) return "Primeiro ciclo com movimenta\xE7\xE3o";
      const diff = currentValue - previousValue;
      const ratio = previousValue > 0 ? diff / previousValue * 100 : 100;
      if (Math.abs(diff) < 0.01) return "Est\xE1vel em rela\xE7\xE3o ao ciclo anterior";
      if (diff > 0) return `${ratio.toFixed(0)}% acima do ciclo anterior`;
      return `${Math.abs(ratio).toFixed(0)}% abaixo do ciclo anterior`;
    },
    buildMotionLinePath(points) {
      if (!points.length) return "";
      if (points.length === 1) return `M${points[0].x} ${points[0].y}`;
      let path = `M${points[0].x} ${points[0].y}`;
      for (let index = 0; index < points.length - 1; index += 1) {
        const previous = points[index - 1] || points[index];
        const current = points[index];
        const next = points[index + 1];
        const afterNext = points[index + 2] || next;
        const controlPointOneX = current.x + (next.x - previous.x) / 6;
        const controlPointOneY = current.y + (next.y - previous.y) / 6;
        const controlPointTwoX = next.x - (afterNext.x - current.x) / 6;
        const controlPointTwoY = next.y - (afterNext.y - current.y) / 6;
        path += ` C${controlPointOneX.toFixed(2)} ${controlPointOneY.toFixed(2)} ${controlPointTwoX.toFixed(2)} ${controlPointTwoY.toFixed(2)} ${next.x} ${next.y}`;
      }
      return path;
    },
    buildMotionAreaPath(points, baseline) {
      if (!points.length) return "";
      const linePath = this.buildMotionLinePath(points);
      const first = points[0];
      const last = points[points.length - 1];
      return `${linePath} L${last.x} ${baseline} L${first.x} ${baseline} Z`;
    },
    buildMotionVisualData(visibleSummaries) {
      const width = 760;
      const height = 240;
      const frame = {
        x: 24,
        y: 18,
        width: 712,
        height: 198
      };
      const orbitRadius = 24;
      const orbitNodeRadius = 5;
      const pulseRadiusX = 28;
      const pulseRadiusY = 14;
      const latestPulseRadiusX = 24;
      const latestPulseRadiusY = 12;
      const pointMaxRadius = 4.5;
      const pointScaleMax = 1.18;
      const orbitScaleMax = 1.12;
      const pulseScaleMax = 1.18;
      const maxOrbitReachX = orbitRadius + orbitNodeRadius * orbitScaleMax + 4;
      const maxOrbitReachY = orbitRadius + orbitNodeRadius * orbitScaleMax + 4;
      const maxPeakReachX = Math.max(maxOrbitReachX, pulseRadiusX * pulseScaleMax);
      const maxPeakReachY = Math.max(maxOrbitReachY, pulseRadiusY * pulseScaleMax);
      const maxLatestReachX = latestPulseRadiusX * pulseScaleMax;
      const maxLatestReachY = latestPulseRadiusY * pulseScaleMax;
      const maxPointReach = pointMaxRadius * pointScaleMax + 4;
      const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
      const left = frame.x + maxPeakReachX + 10;
      const right = frame.x + frame.width - Math.max(maxPeakReachX, maxLatestReachX, maxPointReach) - 10;
      const top = frame.y + maxPeakReachY + 10;
      const baseline = frame.y + frame.height - Math.max(maxLatestReachY, maxPointReach) - 10;
      const usableHeight = baseline - top;
      const summaries = visibleSummaries.length ? visibleSummaries : [{ label: "Sem dados", totalUtilizado: 0 }];
      const values = summaries.map((summary) => Number(summary.totalUtilizado) || 0);
      const maxValue = Math.max(...values, 1);
      const segment = (right - left) / Math.max(summaries.length, 1);
      const barWidth = Math.max(14, Math.min(28, segment * 0.42));
      const pointMinY = top + maxPointReach;
      const pointMaxY = baseline - maxPointReach;
      const points = summaries.map((summary, index) => {
        const value = Number(summary.totalUtilizado) || 0;
        const rawX = left + segment * index + segment / 2;
        const normalized = maxValue > 0 ? value / maxValue : 0;
        const rawY = baseline - normalized * usableHeight;
        const x = clamp(rawX, left + maxPointReach, right - maxPointReach);
        const y = clamp(rawY, pointMinY, pointMaxY);
        return {
          label: summary.label,
          value,
          x: Number(x.toFixed(2)),
          y: Number(y.toFixed(2))
        };
      });
      const bars = points.map((point, index) => {
        const heightValue = Math.max(6, baseline - point.y);
        return {
          x: Number((point.x - barWidth / 2).toFixed(2)),
          y: Number((baseline - heightValue).toFixed(2)),
          width: Number(barWidth.toFixed(2)),
          height: Number(heightValue.toFixed(2)),
          delay: `${(index * 0.12).toFixed(2)}s`
        };
      });
      const peakPoint = points.reduce((highest, point) => point.value > highest.value ? point : highest, points[0]);
      const latestPoint = points[points.length - 1];
      const peakAnchor = {
        x: Number(clamp(peakPoint.x, frame.x + maxPeakReachX + 8, frame.x + frame.width - maxPeakReachX - 8).toFixed(2)),
        y: Number(clamp(peakPoint.y, frame.y + maxPeakReachY + 8, frame.y + frame.height - maxPeakReachY - 8).toFixed(2))
      };
      const latestAnchor = {
        x: Number(clamp(latestPoint.x, frame.x + maxLatestReachX + 8, frame.x + frame.width - maxLatestReachX - 8).toFixed(2)),
        y: Number(clamp(latestPoint.y, frame.y + maxLatestReachY + 8, frame.y + frame.height - maxLatestReachY - 8).toFixed(2))
      };
      const hazeCenterY = Number(clamp(latestAnchor.y + 32, frame.y + 24, frame.y + frame.height - 20).toFixed(2));
      return {
        width,
        height,
        frame,
        left,
        right,
        top,
        baseline,
        orbitRadius,
        orbitNodeRadius,
        pulseRadiusX,
        pulseRadiusY,
        latestPulseRadiusX,
        latestPulseRadiusY,
        points,
        bars,
        linePath: this.buildMotionLinePath(points),
        areaPath: this.buildMotionAreaPath(points, baseline),
        peakPoint,
        latestPoint,
        peakAnchor,
        latestAnchor,
        hazeCenterY
      };
    },
    renderizarInsights() {
      const container = document.getElementById("reportsInsightsContainer");
      if (!container) return;
      const year = this.getSelectedYear();
      const visibleSummaries = this.getVisibleCycleSummaries();
      if (!visibleSummaries.length) {
        container.innerHTML = '<div class="empty-state">Todos os ciclos estao ocultos. Reative pelo menos um para visualizar o painel animado.</div>';
        return;
      }
      const motion = this.buildMotionVisualData(visibleSummaries);
      const gridLines = Array.from({ length: 4 }, (_, index) => Number((motion.top + (motion.baseline - motion.top) / 3 * index).toFixed(2)));
      container.innerHTML = `
            <section class="reports-motion-panel" aria-label="Painel visual animado dos relat\xF3rios de ${year}">
                <div class="reports-motion-header">
                    <div>
                        <span class="reports-motion-kicker">Visual em movimento</span>
                        <h4>Ritmo financeiro do ano</h4>
                    </div>
                    <div class="reports-motion-year-badge">${year}</div>
                </div>

                <div class="reports-motion-scene">
                    <div class="reports-motion-glow reports-motion-glow-a" aria-hidden="true"></div>
                    <div class="reports-motion-glow reports-motion-glow-b" aria-hidden="true"></div>

                    <svg class="reports-motion-svg" viewBox="0 0 760 240" role="img" aria-label="Composi\xE7\xE3o visual animada representando a evolu\xE7\xE3o financeira do per\xEDodo">
                        <defs>
                            <clipPath id="reportsMotionFrameClip">
                                <rect x="${motion.frame.x}" y="${motion.frame.y}" width="${motion.frame.width}" height="${motion.frame.height}" rx="20"></rect>
                            </clipPath>
                            <linearGradient id="reportsMotionStroke" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stop-color="rgba(255,255,255,0.14)" />
                                <stop offset="42%" stop-color="var(--accent)" />
                                <stop offset="100%" stop-color="rgba(255,255,255,0.28)" />
                            </linearGradient>
                            <linearGradient id="reportsMotionFill" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stop-color="rgba(var(--accent-rgb), 0.26)" />
                                <stop offset="100%" stop-color="rgba(var(--accent-rgb), 0.02)" />
                            </linearGradient>
                            <filter id="reportsMotionLineGlow" x="-10%" y="-20%" width="120%" height="140%">
                                <feGaussianBlur stdDeviation="3.6" result="blur"></feGaussianBlur>
                                <feMerge>
                                    <feMergeNode in="blur"></feMergeNode>
                                    <feMergeNode in="SourceGraphic"></feMergeNode>
                                </feMerge>
                            </filter>
                            <filter id="reportsMotionBlur">
                                <feGaussianBlur stdDeviation="12" />
                            </filter>
                        </defs>

                        <g clip-path="url(#reportsMotionFrameClip)">
                            <g class="reports-motion-grid" aria-hidden="true">
                                ${gridLines.map((y) => `<line x1="${motion.left}" y1="${y}" x2="${motion.right}" y2="${y}"></line>`).join("")}
                                <line class="reports-motion-baseline" x1="${motion.left}" y1="${motion.baseline}" x2="${motion.right}" y2="${motion.baseline}"></line>
                            </g>

                            <path class="reports-motion-area" d="${motion.areaPath}"></path>
                            <path class="reports-motion-line-shadow" d="${motion.linePath}"></path>
                            <path class="reports-motion-line" d="${motion.linePath}" filter="url(#reportsMotionLineGlow)"></path>

                            <g class="reports-motion-bars" aria-hidden="true">
                                ${motion.bars.map((bar) => `<rect class="bar" x="${bar.x}" y="${bar.y}" width="${bar.width}" height="${bar.height}" rx="10" style="animation-delay:${bar.delay}"></rect>`).join("")}
                            </g>

                            <g class="reports-motion-orbit" aria-hidden="true">
                                <circle class="orbit-path" cx="${motion.peakAnchor.x}" cy="${motion.peakAnchor.y}" r="${motion.orbitRadius}"></circle>
                                <circle class="orbit-node orbit-node-a" cx="${motion.peakAnchor.x + motion.orbitRadius}" cy="${motion.peakAnchor.y}" r="${motion.orbitNodeRadius}"></circle>
                                <circle class="orbit-node orbit-node-b" cx="${motion.peakAnchor.x}" cy="${motion.peakAnchor.y - motion.orbitRadius}" r="${motion.orbitNodeRadius}"></circle>
                            </g>

                            <g class="reports-motion-points" aria-hidden="true">
                                ${motion.points.map((point) => `<circle cx="${point.x}" cy="${point.y}" r="${point.value === motion.peakPoint.value ? 4.5 : 3.5}"></circle>`).join("")}
                            </g>

                            <ellipse class="reports-motion-pulse" cx="${motion.peakAnchor.x}" cy="${motion.peakAnchor.y}" rx="${motion.pulseRadiusX}" ry="${motion.pulseRadiusY}"></ellipse>
                            <ellipse class="reports-motion-pulse reports-motion-pulse-delay" cx="${motion.latestAnchor.x}" cy="${motion.latestAnchor.y}" rx="${motion.latestPulseRadiusX}" ry="${motion.latestPulseRadiusY}"></ellipse>
                            <ellipse class="reports-motion-haze" cx="${motion.latestAnchor.x}" cy="${motion.hazeCenterY}" rx="62" ry="14" filter="url(#reportsMotionBlur)"></ellipse>
                        </g>
                    </svg>

                    <div class="reports-motion-floating-card reports-motion-floating-card-a" aria-hidden="true">
                        <span></span>
                        <span></span>
                        <span></span>
                    </div>
                    <div class="reports-motion-floating-card reports-motion-floating-card-b" aria-hidden="true">
                        <span></span>
                        <span></span>
                    </div>
                </div>
            </section>
        `;
    },
    renderizarResumo() {
      const container = document.getElementById("resumoPeriodoContainer");
      if (!container) return;
      const summaries = this.getCycleSummaries();
      const referencia = this.getResumoReferencia(summaries);
      if (!referencia) {
        container.innerHTML = '<div class="empty-state">Nenhum ciclo encontrado.</div>';
        return;
      }
      const mediaDiaria = referencia.totalUtilizado / Math.max(1, this.getDuracaoCiclo(referencia));
      const maiorDespesa = [...referencia.despesas].sort((a, b) => (parseFloat(b.valor) || 0) - (parseFloat(a.valor) || 0))[0];
      const categoriaPrincipal = this.getCategoriaPrincipal(referencia.despesas);
      const saldoInfo = referencia.budget <= 0 ? "Sem or\xE7amento definido." : referencia.saldo >= 0 ? "Dentro do or\xE7amento." : "Acima do or\xE7amento.";
      container.innerHTML = `
            <div class="resumo-item">
                <span class="resumo-label">Ciclo</span>
                <h3 class="resumo-value">${referencia.label}</h3>
                <p class="resumo-info">Virada em ${String(referencia.turnDay).padStart(2, "0")}.</p>
            </div>

            <div class="resumo-item">
                <span class="resumo-label">Saldo</span>
                <h3 class="resumo-value">${formatarMoeda(referencia.saldo)}</h3>
                <p class="resumo-info">${saldoInfo}</p>
            </div>

            <div class="resumo-item">
                <span class="resumo-label">Media diaria</span>
                <h3 class="resumo-value">${formatarMoeda(mediaDiaria)}</h3>
                <p class="resumo-info">Uso medio do ciclo.</p>
            </div>

            <div class="resumo-item">
                <span class="resumo-label">Maior gasto</span>
                <h3 class="resumo-value">${maiorDespesa ? formatarMoeda(maiorDespesa.valor) : "R$ 0,00"}</h3>
                <p class="resumo-info">${maiorDespesa ? maiorDespesa.titulo : "Sem despesas."}</p>
            </div>

            <div class="resumo-item">
                <span class="resumo-label">Categoria lider</span>
                <h3 class="resumo-value">${categoriaPrincipal.categoria}</h3>
                <p class="resumo-info">${formatarMoeda(categoriaPrincipal.total)}</p>
            </div>

            <div class="resumo-item">
                <span class="resumo-label">Metas no ciclo</span>
                <h3 class="resumo-value">${formatarMoeda(referencia.totalMetas)}</h3>
                <p class="resumo-info">Aportes registrados.</p>
            </div>
        `;
    },
    gerarGraficoComparativo() {
      const ctx = document.getElementById("comparisonChart");
      if (!ctx) return;
      if (window.myChart) window.myChart.destroy();
      const summaries = this.getCycleSummaries();
      const monthColors = ["#ef4444", "#3b82f6", "#22c55e", "#f59e0b", "#8b5cf6", "#ec4899", "#10b981", "#0284c7", "#f97316", "#14b8a6", "#f43f5e", "#0ea5e9"];
      const theme = this.obterCoresGrafico();
      const profile = this.updateChartContainerMetrics();
      const isHorizontal = profile.useHorizontalBars;
      const labels = summaries.map((summary, index) => this.monthNames[index]);
      const totals = summaries.map((summary) => summary.totalUtilizado);
      const visibleValues = totals.filter((_, index) => this.monthVisibilidade[index]);
      const maxValue = Math.max(...visibleValues, 0);
      const suggestedMax = this.calcularTetoEscala(maxValue);
      const stepSize = suggestedMax > 0 ? Math.max(1, suggestedMax / 5) : 20;
      window.myChart = new Chart(ctx, {
        type: "bar",
        data: {
          labels: labels.map((label) => this.getMonthLabel(label)),
          datasets: [{
            label: "Uso do ciclo",
            data: totals.map((value, index) => this.monthVisibilidade[index] ? value : null),
            backgroundColor: monthColors.map((color, index) => this.monthVisibilidade[index] ? color : theme.hiddenBar),
            borderWidth: 0,
            borderRadius: 0,
            borderSkipped: false,
            hoverBorderWidth: 0,
            maxBarThickness: profile.maxBarThickness,
            categoryPercentage: profile.categoryPercentage,
            barPercentage: profile.barPercentage
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          indexAxis: isHorizontal ? "y" : "x",
          layout: {
            padding: profile.layoutPadding
          },
          animation: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: theme.tooltipBackground,
              titleColor: theme.tooltipTitle,
              bodyColor: theme.tooltipBody,
              borderColor: theme.tooltipBorder,
              borderWidth: 1,
              padding: 12,
              cornerRadius: 12,
              displayColors: false,
              callbacks: {
                title: (items) => {
                  const item = items?.[0];
                  return item ? summaries[item.dataIndex]?.fullLabel || "" : "";
                },
                label: (ctxItem) => {
                  const summary = summaries[ctxItem.dataIndex];
                  return `${summary?.label || ""}: ${formatarMoeda(isHorizontal ? ctxItem.parsed.x || 0 : ctxItem.parsed.y || 0)}`;
                }
              }
            }
          },
          scales: {
            [isHorizontal ? "x" : "y"]: {
              beginAtZero: true,
              suggestedMax,
              grid: {
                color: `rgba(${theme.accentRgb}, 0.12)`,
                drawBorder: false
              },
              border: { display: false },
              ticks: {
                stepSize,
                maxTicksLimit: profile.isCompact ? 4 : 6,
                padding: profile.isCompact ? 6 : 10,
                color: theme.accent,
                font: { weight: "800", size: profile.valueFontSize },
                callback: (value) => this.formatarEixoValor(value)
              }
            },
            [isHorizontal ? "y" : "x"]: {
              grid: { display: false },
              border: { display: false },
              ticks: {
                autoSkip: false,
                color: (tickContext) => this.monthVisibilidade[tickContext.index] ? theme.textPrimary : theme.xTickInactive,
                font: { weight: "700", size: profile.labelFontSize },
                padding: profile.isCompact ? 6 : 8,
                maxRotation: 0,
                minRotation: 0
              }
            }
          }
        }
      });
      window.myChart.$cycleTotals = totals;
      window.myChart.$cycleLabels = labels;
      window.myChart.$monthColors = monthColors;
      this.updateReportCycleChip(visibleValues.length, totals.length);
      this.atualizarControleOcultarMeses();
      this.scheduleChartResize();
    },
    renderizarRanking() {
      const container = document.getElementById("rankingGastosContainer");
      if (!container) return;
      const ranking = [...this.getDespesasPorAnoCiclo()].sort((a, b) => (parseFloat(b.valor) || 0) - (parseFloat(a.valor) || 0)).slice(0, 5);
      if (!ranking.length) {
        container.innerHTML = '<div class="empty-state">Nenhuma despesa registrada para o periodo.</div>';
        return;
      }
      container.innerHTML = ranking.map((item, index) => {
        const parts = String(item.data || "--").split("-");
        const dataDisplay = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : item.data;
        return `
                <div class="ranking-row ${index === 0 ? "is-primary" : index < 3 ? "is-featured" : ""}">
                    <div class="row-left">
                        <div class="rank-number">${String(index + 1).padStart(2, "0")}</div>
                        <div class="item-details">
                            <span class="item-date">${dataDisplay}</span>
                            <h4 class="item-title">${item.titulo}</h4>
                        </div>
                    </div>
                    <div class="row-right">
                        <div class="item-financial">
                            <span class="item-value">${formatarMoeda(item.valor)}</span>
                            <span class="item-category">${item.categoria}</span>
                        </div>
                    </div>
                </div>
            `;
      }).join("");
    },
    getCategoriaPrincipal(despesas) {
      if (!despesas.length) return { categoria: "Sem dados", total: 0 };
      return Object.entries(despesas.reduce((acc, despesa) => {
        const categoria = despesa.categoria || "Outros";
        acc[categoria] = (acc[categoria] || 0) + (parseFloat(despesa.valor) || 0);
        return acc;
      }, {})).sort((left, right) => right[1] - left[1]).map(([categoria, total]) => ({ categoria, total }))[0];
    },
    getDuracaoCiclo(cycleSummary) {
      const diff = cycleSummary.endDate.getTime() - cycleSummary.startDate.getTime();
      return Math.max(1, Math.round(diff / 864e5) + 1);
    },
    calcularTetoEscala(maxValue) {
      if (maxValue <= 0) return 1e3;
      const roughStep = maxValue / 5;
      const magnitude = 10 ** Math.floor(Math.log10(roughStep || 1));
      const normalized = roughStep / magnitude;
      let niceNormalized = 1;
      if (normalized > 1 && normalized <= 2) niceNormalized = 2;
      else if (normalized > 2 && normalized <= 5) niceNormalized = 5;
      else if (normalized > 5) niceNormalized = 10;
      const niceStep = niceNormalized * magnitude;
      return Math.ceil(maxValue / niceStep) * niceStep;
    },
    formatarEixoValor(value) {
      return (Number(value) || 0).toLocaleString("pt-BR", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      });
    }
  };

  // js/planejamento.js
  var planningAddIconUrl = "./img/+.png";
  var planningEditIconUrl = "./img/lapis.png";
  var planningDeleteIconUrl = "./img/lixeira.png";
  var PlanejamentoModulo = {
    init() {
      this.atualizarInterfaceOrcamento();
      this.renderizarMetas();
      this.atualizarProgressoGlobal();
      this.configurarMascaras();
    },
    getMetasAtuais() {
      return getMetasData({ cycleInfo: getCurrentCycleInfo() });
    },
    getBudgetAtual() {
      return getBudgetForCycle(getCurrentCycleInfo());
    },
    // --- MÁSCARAS E VALIDAÇÃO ---
    configurarMascaras() {
      const inputsMoeda = ["orcamentoMensalInput", "valorAlvoMeta", "valorAporteMetaInput", "valorAdicionalInput"];
      inputsMoeda.forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.addEventListener("input", (e) => this.aplicarMascaraMoeda(e));
      });
      const inputData = document.getElementById("prazoMeta");
      if (inputData) {
        inputData.addEventListener("input", (e) => {
          this.aplicarMascaraData(e);
          inputData.style.borderColor = "";
        });
      }
    },
    aplicarMascaraMoeda(e) {
      let v = e.target.value.replace(/\D/g, "");
      if (v.length > 10) v = v.slice(0, 10);
      v = (Number(v) / 100).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
      });
      e.target.value = v;
    },
    aplicarMascaraData(e) {
      let v = e.target.value.replace(/\D/g, "").slice(0, 8);
      if (v.length >= 5) {
        v = v.replace(/^(\d{2})(\d{2})(\d{0,4})/, "$1/$2/$3");
      } else if (v.length >= 3) {
        v = v.replace(/^(\d{2})(\d{0,2})/, "$1/$2");
      }
      e.target.value = v;
    },
    validarData(dataString) {
      if (!/^\d{2}\/\d{2}\/\d{4}$/.test(dataString)) return false;
      const partes = dataString.split("/");
      const dia = parseInt(partes[0], 10);
      const mes = parseInt(partes[1], 10) - 1;
      const ano = parseInt(partes[2], 10);
      const dataTeste = new Date(ano, mes, dia);
      return dataTeste.getFullYear() === ano && dataTeste.getMonth() === mes && dataTeste.getDate() === dia;
    },
    parseMoedaParaFloat(v) {
      if (!v) return 0;
      return parseFloat(v.replace(/[^\d,]/g, "").replace(",", "."));
    },
    // --- MODAL DE CONFIRMAÇÃO ---
    exibirConfirmacao(titulo, texto, onConfirm, options = {}) {
      const modal = document.getElementById("modalConfirmacaoSistema");
      const btnSim = document.getElementById("btn-confirm-yes");
      const btnNao = document.getElementById("btn-confirm-no");
      const icon = document.getElementById("confirmModalIcon");
      const iconWrap = document.getElementById("confirmModalIconWrap");
      const iconStage = document.getElementById("confirmModalIconStage");
      const card = document.getElementById("confirmModalCard");
      const valueHighlight = document.getElementById("confirmValueHighlight");
      const variant = options.variant === "accent" ? "accent" : "danger";
      const iconSrc = options.iconSrc || (variant === "accent" ? "./img/moedas.png" : "./img/lixeira.png");
      const iconAlt = options.iconAlt || (variant === "accent" ? "Confirmar orcamento" : "Excluir item");
      const highlightValue = options.highlightValue || "";
      document.getElementById("confirm-title").innerText = titulo;
      document.getElementById("confirm-text").innerText = texto;
      if (icon) {
        icon.src = iconSrc;
        icon.alt = iconAlt;
        icon.className = `planning-confirm-icon-image planning-confirm-icon-image-${variant}`;
      }
      if (iconWrap) {
        iconWrap.className = `planning-confirm-icon-wrap planning-confirm-icon-wrap-${variant}`;
      }
      if (iconStage) {
        iconStage.className = `planning-confirm-icon-stage planning-confirm-icon-stage-${variant}`;
      }
      if (card) {
        card.className = `planning-confirm-card planning-confirm-card-${variant}`;
      }
      if (btnSim) {
        btnSim.className = `planning-confirm-button planning-confirm-button-${variant}`;
      }
      if (btnNao) {
        btnNao.className = "planning-confirm-button planning-confirm-button-secondary";
      }
      if (valueHighlight) {
        if (highlightValue) {
          valueHighlight.hidden = false;
          valueHighlight.textContent = highlightValue;
        } else {
          valueHighlight.hidden = true;
          valueHighlight.textContent = "";
        }
      }
      modal.style.display = "flex";
      const fechar = () => modal.style.display = "none";
      btnSim.onclick = () => {
        onConfirm();
        fechar();
      };
      btnNao.onclick = fechar;
    },
    // --- LÓGICA DO MÓDULO ---
    atualizarInterfaceOrcamento() {
      const limite = this.getBudgetAtual();
      const display = document.getElementById("valor-limite-display");
      if (display) display.innerText = formatarMoeda(limite);
    },
    salvarOrcamento() {
      const input = document.getElementById("orcamentoMensalInput");
      const novoValor = this.parseMoedaParaFloat(input.value);
      if (novoValor > 0) {
        this.exibirConfirmacao(
          "Salvar Or\xE7amento",
          `Deseja definir o limite mensal como ${formatarMoeda(novoValor)}?`,
          () => {
            setCurrentCycleBudget(novoValor);
            this.atualizarInterfaceOrcamento();
            this.atualizarProgressoGlobal();
            input.value = "";
          },
          {
            variant: "accent",
            iconSrc: "./img/moedas.png",
            iconAlt: "Salvar orcamento",
            highlightValue: formatarMoeda(novoValor)
          }
        );
      } else {
        alert("Por favor, insira um valor v\xE1lido.");
      }
    },
    abrirModalAdicionarValor() {
      const modal = document.getElementById("modalAdicionarLimite");
      if (modal) {
        modal.style.display = "flex";
        document.getElementById("valorAdicionalInput").value = "";
        this.configurarMascaras();
      }
    },
    fecharModalAdicionarLimite() {
      const modal = document.getElementById("modalAdicionarLimite");
      if (modal) modal.style.display = "none";
    },
    confirmarSomaLimite() {
      const input = document.getElementById("valorAdicionalInput");
      const valorAdicional = this.parseMoedaParaFloat(input.value);
      const limiteAtual = this.getBudgetAtual();
      if (valorAdicional > 0) {
        const novoLimite = limiteAtual + valorAdicional;
        setCurrentCycleBudget(novoLimite);
        this.atualizarInterfaceOrcamento();
        this.atualizarProgressoGlobal();
        this.fecharModalAdicionarLimite();
      } else {
        alert("Insira um valor v\xE1lido para adicionar.");
      }
    },
    // --- LÓGICA DE METAS ---
    abrirModalNovaMeta() {
      document.getElementById("tituloModalMeta").innerText = "Nova Meta";
      document.getElementById("indexMetaEdicao").value = "";
      document.getElementById("modalNovaMeta").style.display = "flex";
      const inputData = document.getElementById("prazoMeta");
      if (inputData) inputData.style.borderColor = "";
      const erroMsg = document.getElementById("erro-data-meta");
      if (erroMsg) erroMsg.style.display = "none";
    },
    abrirModalEditarMeta(index) {
      const meta = this.getMetasAtuais()[index];
      if (!meta) return;
      document.getElementById("tituloModalMeta").innerText = "Editar Meta";
      document.getElementById("indexMetaEdicao").value = index;
      document.getElementById("nomeMeta").value = meta.nome;
      document.getElementById("valorAlvoMeta").value = formatarMoeda(meta.alvo);
      document.getElementById("prazoMeta").value = meta.prazo;
      document.getElementById("modalNovaMeta").style.display = "flex";
      const inputData = document.getElementById("prazoMeta");
      if (inputData) inputData.style.borderColor = "";
      const erroMsg = document.getElementById("erro-data-meta");
      if (erroMsg) erroMsg.style.display = "none";
    },
    fecharModalNovaMeta() {
      document.getElementById("modalNovaMeta").style.display = "none";
      document.getElementById("nomeMeta").value = "";
      document.getElementById("prazoMeta").value = "";
      document.getElementById("valorAlvoMeta").value = "";
      document.getElementById("indexMetaEdicao").value = "";
      const inputData = document.getElementById("prazoMeta");
      if (inputData) inputData.style.borderColor = "";
      const erroMsg = document.getElementById("erro-data-meta");
      if (erroMsg) erroMsg.style.display = "none";
    },
    criarNovaMeta() {
      const indexEdicao = document.getElementById("indexMetaEdicao").value;
      const nome = document.getElementById("nomeMeta").value;
      const inputData = document.getElementById("prazoMeta");
      const prazo = inputData.value;
      const alvo = this.parseMoedaParaFloat(document.getElementById("valorAlvoMeta").value);
      const erroMsg = document.getElementById("erro-data-meta");
      if (!this.validarData(prazo)) {
        if (inputData) inputData.style.borderColor = "#ef4444";
        if (erroMsg) {
          erroMsg.innerText = "Por favor, insira uma data v\xE1lida.";
          erroMsg.style.display = "block";
        }
        return;
      }
      if (nome && alvo > 0) {
        if (inputData) inputData.style.borderColor = "";
        if (erroMsg) erroMsg.style.display = "none";
        const metasAtuais = this.getMetasAtuais();
        if (indexEdicao !== "") {
          metasAtuais[indexEdicao].nome = nome;
          metasAtuais[indexEdicao].prazo = prazo;
          metasAtuais[indexEdicao].alvo = alvo;
        } else {
          const novaMeta = {
            nome,
            prazo,
            alvo,
            aporteHistorico: [],
            guardado: 0
          };
          metasAtuais.push(novaMeta);
        }
        setMetasData(metasAtuais);
        this.renderizarMetas();
        this.atualizarProgressoGlobal();
        this.fecharModalNovaMeta();
      } else {
        alert("Preencha todos os campos corretamente.");
      }
    },
    removerMeta(index) {
      this.exibirConfirmacao(
        "Excluir Meta",
        "Deseja realmente remover esta meta financeira?",
        () => {
          const metasAtuais = this.getMetasAtuais();
          metasAtuais.splice(index, 1);
          setMetasData(metasAtuais);
          this.renderizarMetas();
          this.atualizarProgressoGlobal();
        },
        {
          variant: "danger",
          iconSrc: "./img/lixeira.png",
          iconAlt: "Excluir meta"
        }
      );
    },
    confirmarAporte() {
      const index = Number(document.getElementById("indexMetaAporte").value);
      const valInput = document.getElementById("valorAporteMetaInput");
      const valorAporte = this.parseMoedaParaFloat(valInput.value);
      if (valorAporte > 0) {
        addMetaContribution(index, valorAporte);
        this.renderizarMetas();
        this.atualizarProgressoGlobal();
        this.fecharModalAporte();
      }
    },
    fecharModalAporte() {
      const modal = document.getElementById("modalAporteMeta");
      if (modal) modal.style.display = "none";
      const input = document.getElementById("valorAporteMetaInput");
      if (input) input.value = "";
    },
    renderizarMetas() {
      const tbody = document.getElementById("goalsTableBody");
      const table = document.querySelector(".planning-goals-table");
      const emptyState = document.getElementById("planningGoalsEmptyState");
      if (!tbody || !table || !emptyState) return;
      const metasAtuais = this.getMetasAtuais();
      if (metasAtuais.length === 0) {
        tbody.innerHTML = "";
        table.hidden = true;
        emptyState.hidden = false;
        return;
      }
      table.hidden = false;
      emptyState.hidden = true;
      tbody.innerHTML = metasAtuais.map((meta, index) => {
        const guardado = parseFloat(meta.guardado) || 0;
        const alvo = parseFloat(meta.alvo) || 1;
        const porcentagem = Math.min(guardado / alvo * 100, 100).toFixed(0);
        return `
                <tr class="planning-goal-row">
                    <td class="planning-goal-name" data-label="Meta">
                        <div class="planning-goal-main">
                            <span class="planning-goal-title">${meta.nome}</span>
                            <span class="planning-goal-caption">${formatarMoeda(guardado)} acumulados ate agora</span>
                        </div>
                    </td>
                    <td class="planning-goal-target" data-label="Valor Alvo">
                        <span class="planning-goal-target-amount">${formatarMoeda(meta.alvo)}</span>
                        <span class="planning-goal-target-caption">Valor objetivo</span>
                    </td>
                    <td class="planning-goal-deadline" data-label="Prazo">
                        <span class="planning-goal-deadline-badge">${meta.prazo}</span>
                    </td>
                    <td class="planning-goal-progress-cell" data-label="Progresso">
                        <div class="planning-goal-progress">
                            <div class="planning-goal-progress-track">
                                <div class="planning-goal-progress-fill" style="width: ${porcentagem}%;"></div>
                            </div>
                            <span class="planning-goal-progress-value">${porcentagem}%</span>
                        </div>
                        <div class="planning-goal-progress-meta">${formatarMoeda(guardado)} de ${formatarMoeda(meta.alvo)}</div>
                    </td>
                    <td class="planning-goal-actions-cell" data-label="A\xE7\xF5es">
                        <div class="planning-goal-actions">
                               <button class="btn-action btn-add" onclick="window.abrirModalAporte(${index})">
                                   <img src="${planningAddIconUrl}" class="planning-action-icon planning-action-icon-add" alt="Adicionar valor" title="Adicionar valor">
                            </button>
                               <button class="btn-action btn-edit" onclick="PlanejamentoModulo.abrirModalEditarMeta(${index})">
                                   <img src="${planningEditIconUrl}" class="planning-action-icon planning-action-icon-edit" alt="Editar meta" title="Editar meta">
                            </button>
                               <button class="btn-action btn-delete" onclick="PlanejamentoModulo.removerMeta(${index})">
                                   <img src="${planningDeleteIconUrl}" class="planning-action-icon planning-action-icon-delete" alt="Excluir meta" title="Excluir meta">
                            </button>
                        </div>
                    </td>
                </tr>`;
      }).join("");
    },
    atualizarProgressoGlobal() {
      const cicloAtual = getCurrentCycleInfo();
      const limite = this.getBudgetAtual();
      const despesas = getDespesasData({ cycleInfo: cicloAtual });
      const metasAtuais = this.getMetasAtuais();
      const totalDespesas = despesas.reduce((sum, item) => sum + (parseFloat(item.valor) || 0), 0);
      const totalAlocadoMetas = metasAtuais.reduce((sum, item) => sum + (parseFloat(item.guardado) || 0), 0);
      const utilizado = totalDespesas + totalAlocadoMetas;
      const saldo = limite - utilizado;
      const porcentagemValor = limite > 0 ? utilizado / limite * 100 : 0;
      const porcentagemDisplay = Math.min(porcentagemValor, 100).toFixed(0);
      const corStatus = porcentagemValor >= 100 ? "#ef4444" : getThemeVar("--accent");
      const sombraStatus = porcentagemValor >= 100 ? "0 0 15px rgba(239, 68, 68, 0.5)" : `0 0 15px ${getThemeVar("--accent-soft")}`;
      const fill = document.getElementById("progressBudgetFill");
      if (fill) {
        requestAnimationFrame(() => {
          fill.style.width = `${porcentagemDisplay}%`;
          fill.style.background = corStatus;
          fill.style.boxShadow = sombraStatus;
        });
      }
      const percText = document.getElementById("progresso-porcentagem-text");
      if (percText) {
        percText.innerText = `${porcentagemDisplay}%`;
        percText.style.color = document.body.classList.contains("light-theme") ? getThemeVar("--text-primary") || "#0f172a" : corStatus;
      }
      const gastoText = document.getElementById("gasto-total-text");
      if (gastoText) {
        const textPrimary = getThemeVar("--text-primary") || "#0f172a";
        gastoText.innerHTML = `<span style="font-weight: 700; color: ${textPrimary};">${formatarMoeda(utilizado)}</span>`;
      }
      const dispText = document.getElementById("disponivel-text");
      if (dispText) {
        dispText.innerText = saldo < 0 ? `Excedido: - ${formatarMoeda(Math.abs(saldo))}` : `Dispon\xEDvel: ${formatarMoeda(saldo)}`;
        dispText.style.color = document.body.classList.contains("light-theme") ? getThemeVar("--text-primary") || "#0f172a" : saldo < 0 ? "#ef4444" : getThemeVar("--accent");
      }
    }
  };
  window.abrirModalAporte = (index) => {
    const inputIndex = document.getElementById("indexMetaAporte");
    const modal = document.getElementById("modalAporteMeta");
    if (inputIndex && modal) {
      inputIndex.value = index;
      modal.style.display = "flex";
      PlanejamentoModulo.configurarMascaras();
    }
  };

  // js/carteiras.js
  var walletCommentIconUrl = "./img/comentario.png";
  var walletEditIconUrl = "./img/lapis.png";
  var walletDeleteIconUrl = "./img/lixeira.png";
  var walletInfoIconUrl = "./img/informacoes.png";
  var walletLogoUrl = "./img/logo.png";
  var walletMonthLabels = ["Janeiro", "Fevereiro", "Marco", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  var CarteirasModulo = {
    lista: [],
    carteiraInfoAtualIndex: -1,
    coresPredefinidas: [
      "#1e293b",
      "#4c1d95",
      "#1e3a8a",
      "#14532d",
      "#7c2d12",
      "#701a75",
      "#450a0a",
      "#064e3b"
    ],
    init() {
      syncCarteiraGastosDoCiclo();
      this.lista = getCarteirasData();
      this.renderizarWallets();
      this.configurarFormulario();
      this.configurarMascara();
      this.configurarLogicaTipo();
      this.renderizarSeletorCores();
      this.configurarModal();
      this.configurarModalInformacoes();
      this.configurarModalDescricao();
    },
    getDespesas() {
      return getDespesasData();
    },
    atualizarLabelLimite(tipo) {
      const labelLimit = document.getElementById("labelLimit");
      if (!labelLimit) return;
      const labels = {
        "Cart\xE3o de Cr\xE9dito": "Limite Total",
        "Cart\xE3o de D\xE9bito": "Saldo Dispon\xEDvel",
        default: "Valor/Saldo"
      };
      labelLimit.innerText = labels[tipo] || labels.default;
    },
    selecionarCor(cor) {
      const container = document.getElementById("colorPickerContainer");
      const inputColor = document.getElementById("walletColor");
      if (!container || !inputColor) return;
      container.querySelectorAll(".color-option").forEach((option) => {
        const selecionada = option.dataset.color === cor;
        option.style.borderColor = selecionada ? getThemeVar("--accent") : "transparent";
        option.style.boxShadow = selecionada ? `0 0 0 3px ${getThemeVar("--accent-soft")}` : "none";
      });
      inputColor.value = cor;
    },
    renderizarSeletorCores() {
      const container = document.getElementById("colorPickerContainer");
      if (!container) return;
      const inputColor = document.getElementById("walletColor");
      const corAtual = inputColor?.value || this.coresPredefinidas[0];
      container.innerHTML = this.coresPredefinidas.map((cor) => `
            <div class="color-option" data-color="${cor}" style="background: ${cor}; height: 35px; border-radius: 8px; cursor: pointer; border: 2px solid transparent; transition: 0.2s;"></div>
        `).join("");
      container.querySelectorAll(".color-option").forEach((opt) => {
        opt.onclick = () => {
          this.selecionarCor(opt.dataset.color);
        };
      });
      if (this.coresPredefinidas.includes(corAtual)) {
        this.selecionarCor(corAtual);
      } else if (container.firstElementChild) {
        container.firstElementChild.click();
      }
    },
    resetarFormularioCarteira() {
      const form = document.getElementById("walletForm");
      const modalTitle = document.getElementById("walletModalTitle");
      const editIndex = document.getElementById("editWalletIndex");
      const checkUnlimited = document.getElementById("isUnlimited");
      const inputLimit = document.getElementById("walletLimit");
      const selectType = document.getElementById("walletType");
      const corPadrao = this.coresPredefinidas[0];
      if (form) form.reset();
      if (modalTitle) modalTitle.innerText = "Nova Carteira";
      if (editIndex) editIndex.value = "-1";
      if (checkUnlimited) checkUnlimited.checked = false;
      if (inputLimit) {
        inputLimit.disabled = false;
        inputLimit.style.opacity = "1";
        inputLimit.required = true;
        inputLimit.value = "";
      }
      if (selectType) {
        selectType.value = "Cart\xE3o de Cr\xE9dito";
        this.atualizarLabelLimite(selectType.value);
      }
      this.selecionarCor(corPadrao);
    },
    abrirModalNova() {
      const modal = document.getElementById("walletModal");
      this.resetarFormularioCarteira();
      if (modal) modal.style.display = "flex";
    },
    fecharModal() {
      const modal = document.getElementById("walletModal");
      if (modal) modal.style.display = "none";
      this.resetarFormularioCarteira();
    },
    configurarModal() {
      const modal = document.getElementById("walletModal");
      if (!modal || modal.dataset.bound === "true") return;
      modal.dataset.bound = "true";
      modal.addEventListener("click", (event) => {
        if (event.target === modal) {
          this.fecharModal();
        }
      });
    },
    configurarModalInformacoes() {
      const modal = document.getElementById("walletInfoModal");
      const closeButton = document.getElementById("walletInfoClose");
      const monthFilter = document.getElementById("walletExpenseMonthFilter");
      if (!modal || modal.dataset.bound === "true") return;
      modal.dataset.bound = "true";
      closeButton?.addEventListener("click", () => this.fecharModalInformacoes());
      modal.addEventListener("click", (event) => {
        if (event.target === modal) {
          this.fecharModalInformacoes();
        }
      });
      monthFilter?.addEventListener("change", () => {
        this.renderizarDetalhesCarteira();
      });
      document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && modal.style.display === "flex") {
          this.fecharModalInformacoes();
        }
      });
    },
    configurarModalDescricao() {
      const modal = document.getElementById("walletDescriptionModal");
      const closeButton = document.getElementById("walletDescriptionClose");
      if (!modal || modal.dataset.bound === "true") return;
      modal.dataset.bound = "true";
      closeButton?.addEventListener("click", () => this.fecharModalDescricao());
      modal.addEventListener("click", (event) => {
        if (event.target === modal) {
          this.fecharModalDescricao();
        }
      });
      document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && modal.style.display === "flex") {
          this.fecharModalDescricao();
        }
      });
    },
    abrirModalDescricao(titulo, descricao) {
      const modal = document.getElementById("walletDescriptionModal");
      const title = document.getElementById("walletDescriptionTitle");
      const body = document.getElementById("walletDescriptionBody");
      if (!modal || !title || !body) return;
      title.textContent = titulo ? `Descri\xE7\xE3o de ${titulo}` : "Descri\xE7\xE3o da despesa";
      body.textContent = descricao || "Nenhuma descri\xE7\xE3o informada.";
      modal.style.display = "flex";
    },
    fecharModalDescricao() {
      const modal = document.getElementById("walletDescriptionModal");
      if (modal) modal.style.display = "none";
    },
    obterDespesasDaCarteira(nomeCarteira, tipoCarteira = "") {
      return this.getDespesas().filter((despesa) => doesDespesaMatchCarteira(despesa, { nome: nomeCarteira, tipo: tipoCarteira }));
    },
    obterDataDespesa(dataString) {
      if (!dataString || typeof dataString !== "string") return null;
      const [ano, mes, dia] = dataString.split("-").map(Number);
      if (!ano || !mes || !dia) return null;
      return new Date(ano, mes - 1, dia);
    },
    formatarDataCarteira(dataString) {
      const data = this.obterDataDespesa(dataString);
      if (!data) return "Data nao informada";
      return new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "long",
        year: "numeric"
      }).format(data);
    },
    abrirModalInformacoes(index) {
      const wallet = this.lista[index];
      const modal = document.getElementById("walletInfoModal");
      const monthFilter = document.getElementById("walletExpenseMonthFilter");
      if (!wallet || !modal || !monthFilter) return;
      this.carteiraInfoAtualIndex = index;
      monthFilter.value = "all";
      this.renderizarDetalhesCarteira();
      modal.style.display = "flex";
    },
    fecharModalInformacoes() {
      const modal = document.getElementById("walletInfoModal");
      const summary = document.getElementById("walletInfoSummary");
      const list = document.getElementById("walletExpenseList");
      const monthFilter = document.getElementById("walletExpenseMonthFilter");
      this.carteiraInfoAtualIndex = -1;
      if (monthFilter) monthFilter.value = "all";
      if (summary) summary.innerHTML = "";
      if (list) list.innerHTML = "";
      if (modal) modal.style.display = "none";
    },
    renderizarDetalhesCarteira() {
      const wallet = this.lista[this.carteiraInfoAtualIndex];
      const title = document.getElementById("walletInfoTitle");
      const subtitle = document.getElementById("walletInfoSubtitle");
      const summary = document.getElementById("walletInfoSummary");
      const list = document.getElementById("walletExpenseList");
      const monthFilter = document.getElementById("walletExpenseMonthFilter");
      if (!wallet || !title || !subtitle || !summary || !list || !monthFilter) return;
      const selectedMonth = monthFilter.value;
      const allExpenses = this.obterDespesasDaCarteira(wallet.nome, wallet.tipo).sort((a, b) => new Date(b.data) - new Date(a.data));
      const filteredExpenses = allExpenses.filter((despesa) => {
        if (selectedMonth === "all") return true;
        const data = this.obterDataDespesa(despesa.data);
        return data && data.getMonth() === Number(selectedMonth);
      });
      const totalGasto = filteredExpenses.reduce((acc, despesa) => acc + (parseFloat(despesa.valor) || 0), 0);
      const ultimaDespesa = filteredExpenses[0];
      const periodoSelecionado = selectedMonth === "all" ? "Todos os meses" : walletMonthLabels[Number(selectedMonth)];
      title.textContent = wallet.nome;
      subtitle.textContent = `Despesas pagas com ${wallet.nome} em ${periodoSelecionado.toLowerCase()}.`;
      summary.innerHTML = `
            <article class="wallet-info-summary-card">
                <span class="wallet-info-summary-label">Periodo</span>
                <strong class="wallet-info-summary-value">${periodoSelecionado}</strong>
            </article>
            <article class="wallet-info-summary-card">
                <span class="wallet-info-summary-label">Total gasto</span>
                <strong class="wallet-info-summary-value">${formatarMoeda(totalGasto)}</strong>
            </article>
            <article class="wallet-info-summary-card">
                <span class="wallet-info-summary-label">Quantidade</span>
                <strong class="wallet-info-summary-value">${filteredExpenses.length} despesa${filteredExpenses.length === 1 ? "" : "s"}</strong>
            </article>
            <article class="wallet-info-summary-card">
                <span class="wallet-info-summary-label">Ultimo lancamento</span>
                <strong class="wallet-info-summary-value">${ultimaDespesa ? this.formatarDataCarteira(ultimaDespesa.data) : "Sem lancamentos"}</strong>
            </article>
        `;
      if (filteredExpenses.length === 0) {
        list.innerHTML = `
                <div class="wallet-info-empty-state">
                    <div class="wallet-info-empty-icon">
                        <img src="${walletInfoIconUrl}" alt="Informacoes da carteira">
                    </div>
                    <h4>Nenhuma despesa encontrada</h4>
                    <p>N\xE3o h\xE1 lan\xE7amentos vinculados a esta carteira no per\xEDodo selecionado.</p>
                </div>
            `;
        return;
      }
      list.innerHTML = filteredExpenses.map((despesa) => {
        const tituloSeguro = JSON.stringify(despesa.titulo || "Despesa");
        const observacaoSegura = JSON.stringify(despesa.observacao || "");
        const comentarioHtml = despesa.observacao ? `<button type="button" class="wallet-expense-comment-trigger" onclick='window.CarteirasModulo.abrirModalDescricao(${tituloSeguro}, ${observacaoSegura})' aria-label="Abrir descri\xE7\xE3o da despesa ${despesa.titulo || "Despesa"}" title="Abrir descri\xE7\xE3o">
                        <img src="${walletCommentIconUrl}" class="wallet-expense-comment-icon" alt="Coment\xE1rio">
                   </button>` : `<span class="wallet-expense-no-comment">Sem descri\xE7\xE3o</span>`;
        return `
                <article class="wallet-expense-item">
                    <div class="wallet-expense-main">
                        <div class="wallet-expense-heading">
                            <h4>${despesa.titulo || "Despesa sem titulo"}</h4>
                            <span class="wallet-expense-value">${formatarMoeda(parseFloat(despesa.valor) || 0)}</span>
                        </div>
                        <div class="wallet-expense-meta-row">
                            <span class="wallet-expense-chip">${despesa.categoria || "Sem categoria"}</span>
                            <span class="wallet-expense-chip">${despesa.pagamento || wallet.tipo}</span>
                            <span class="wallet-expense-chip">${this.formatarDataCarteira(despesa.data)}</span>
                        </div>
                    </div>
                    <div class="wallet-expense-side">
                        <span class="wallet-expense-side-label">Descri\xE7\xE3o</span>
                        <div class="wallet-expense-comment-wrap">
                            ${comentarioHtml}
                        </div>
                    </div>
                </article>
            `;
      }).join("");
    },
    configurarMascara() {
      const inputLimit = document.getElementById("walletLimit");
      if (!inputLimit) return;
      inputLimit.addEventListener("input", (e) => {
        let value = e.target.value.replace(/\D/g, "");
        if (value.length > 9) value = value.slice(0, 9);
        const valorFloat = parseFloat(value) / 100;
        e.target.value = Number.isNaN(valorFloat) ? "" : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valorFloat);
      });
    },
    configurarLogicaTipo() {
      const selectType = document.getElementById("walletType");
      const labelLimit = document.getElementById("labelLimit");
      const checkUnlimited = document.getElementById("isUnlimited");
      const inputLimit = document.getElementById("walletLimit");
      if (selectType) {
        selectType.addEventListener("change", (e) => {
          this.atualizarLabelLimite(e.target.value);
        });
      }
      if (checkUnlimited) {
        checkUnlimited.addEventListener("change", (e) => {
          inputLimit.disabled = e.target.checked;
          inputLimit.style.opacity = e.target.checked ? "0.4" : "1";
          inputLimit.required = !e.target.checked;
          if (e.target.checked) inputLimit.value = "R$ 0,00";
        });
      }
    },
    calcularGastoCartao(nomeCartao, tipoCartao = "") {
      const despesas = getDespesasData({ cycleInfo: getCurrentCycleInfo() });
      return despesas.filter((despesa) => doesDespesaMatchCarteira(despesa, { nome: nomeCartao, tipo: tipoCartao })).reduce((acc, despesa) => acc + (parseFloat(despesa.valor) || 0), 0);
    },
    abrirModalEdicao(index) {
      const wallet = this.lista[index];
      const modal = document.getElementById("walletModal");
      if (!wallet || !modal) return;
      document.getElementById("walletModalTitle").innerText = "Editar Carteira";
      document.getElementById("editWalletIndex").value = index;
      document.getElementById("walletName").value = wallet.nome;
      document.getElementById("walletType").value = wallet.tipo;
      document.getElementById("isUnlimited").checked = wallet.ilimitado;
      document.getElementById("walletColor").value = wallet.cor || "#1e293b";
      this.atualizarLabelLimite(wallet.tipo);
      const inputLimit = document.getElementById("walletLimit");
      inputLimit.value = formatarMoeda(wallet.limite);
      inputLimit.disabled = wallet.ilimitado;
      inputLimit.style.opacity = wallet.ilimitado ? "0.4" : "1";
      inputLimit.required = !wallet.ilimitado;
      this.selecionarCor(wallet.cor || "#1e293b");
      modal.style.display = "flex";
    },
    renderizarWallets() {
      const grid = document.getElementById("walletsGrid");
      if (!grid) return;
      if (this.lista.length === 0) {
        grid.classList.add("wallets-grid-empty");
        grid.innerHTML = `
                <div class="wallet-empty-state">
                    <div class="wallet-empty-card">
                        <div class="wallet-empty-icon">\u{1F4B3}</div>
                        <h3>Nenhuma carteira cadastrada ainda</h3>
                        <p>Cadastre seu primeiro cart\xE3o, conta ou vale para acompanhar limites, visualizar gastos e manter seus meios de pagamento organizados com clareza.</p>
                        <div class="wallet-empty-actions">
                            <button class="btn btn-primary" type="button" onclick="window.CarteirasModulo.abrirModalNova()">
                                <i class="fas fa-plus"></i> Cadastrar Novo Cart\xE3o
                            </button>
                        </div>
                    </div>
                </div>
            `;
        return;
      }
      grid.classList.remove("wallets-grid-empty");
      grid.innerHTML = this.lista.map((wallet, index) => {
        const gastoAtual = this.calcularGastoCartao(wallet.nome, wallet.tipo);
        const displayValue = wallet.ilimitado ? "Sem Limite" : formatarMoeda(wallet.limite);
        const porcentagem = wallet.ilimitado ? 0 : Math.min(gastoAtual / wallet.limite * 100, 100).toFixed(0);
        const corFundo = wallet.cor || "#1e293b";
        const isLight = document.body.classList.contains("light-theme");
        const darkColor = isLight ? "#425468" : "#0f172a";
        const borderColor = isLight ? "rgba(167, 190, 217, 0.95)" : "#334155";
        const accentColor = getThemeVar("--accent");
        const accentSoft = getThemeVar("--accent-soft");
        const walletSeed = `${wallet.nome}${wallet.tipo}${index}`.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const walletDigits = String(walletSeed).slice(-4).padStart(4, "0");
        const walletAlias = wallet.tipo.includes("Vale") ? "Beneficio" : wallet.tipo.includes("Cr\xE9dito") ? "Credit" : wallet.tipo.includes("D\xE9bito") ? "Debit" : "Wallet";
        return `
                <div class="wallet-card" style="background: linear-gradient(135deg, ${corFundo} 0%, ${darkColor} 100%); border: 1px solid ${borderColor};">
                    <div class="wallet-card-top">
                        <div class="wallet-card-brand">
                            <span class="wallet-brand-logo" aria-hidden="true">
                                <img src="${walletLogoUrl}" alt="">
                            </span>
                            <span class="wallet-network">${walletAlias}</span>
                        </div>
                        <div class="wallet-card-actions">
                            <button class="btn-action btn-info" onclick="window.CarteirasModulo.abrirModalInformacoes(${index})" aria-label="Ver despesas da carteira ${wallet.nome}" title="Ver despesas da carteira">
                                <img src="${walletInfoIconUrl}" alt="Informacoes">
                            </button>
                            <button class="btn-action btn-edit" onclick="window.CarteirasModulo.abrirModalEdicao(${index})" aria-label="Editar carteira ${wallet.nome}" title="Editar carteira">
                                <img src="${walletEditIconUrl}" alt="Editar">
                            </button>
                            <button class="btn-action btn-delete" onclick="confirmarExclusaoCarteira(${index})" aria-label="Excluir carteira ${wallet.nome}" title="Excluir carteira">
                                <img src="${walletDeleteIconUrl}" alt="Excluir">
                            </button>
                        </div>
                    </div>

                    <div class="wallet-card-content">
                        <div class="wallet-card-copy">
                            <span class="wallet-name-label">Carteira</span>
                            <h4 class="wallet-name">${wallet.nome}</h4>
                            <span class="wallet-card-number">\u2022\u2022\u2022\u2022 ${walletDigits}</span>
                            <span class="wallet-balance">${displayValue}</span>
                        </div>

                        ${!wallet.ilimitado ? `
                            <div class="wallet-progress-block">
                                <div class="wallet-progress-head">
                                    <span class="wallet-limit-label">Uso do limite</span>
                                    <span class="wallet-progress-value">${porcentagem}%</span>
                                </div>
                                <div class="wallet-progress-track">
                                    <div class="wallet-progress-fill" style="width: ${porcentagem}%; background: ${accentColor}; box-shadow: 0 0 12px ${accentSoft}; transition: width 0.5s ease;"></div>
                                </div>
                                <p class="wallet-spent">Gasto: ${formatarMoeda(gastoAtual)}</p>
                            </div>
                        ` : '<p class="wallet-unlimited">Uso sem limite</p>'}

                        <div class="wallet-card-footer">
                            <div class="wallet-meta-item">
                                <span class="wallet-meta-label">Categoria</span>
                                <strong class="wallet-meta-value">${wallet.tipo}</strong>
                            </div>
                            <div class="wallet-meta-item">
                                <span class="wallet-meta-label">Status</span>
                                <strong class="wallet-meta-value">${wallet.ilimitado ? "Sem teto" : `${porcentagem}% usado`}</strong>
                            </div>
                        </div>

                        <div class="wallet-card-signature">
                            <span class="wallet-signature-label">Carteira digital</span>
                            <span class="wallet-signature-value">Vision Finance</span>
                        </div>
                    </div>
                </div>
            `;
      }).join("");
    },
    configurarFormulario() {
      const form = document.getElementById("walletForm");
      if (!form) return;
      form.onsubmit = (e) => {
        e.preventDefault();
        const index = parseInt(document.getElementById("editWalletIndex").value, 10);
        const rawValue = document.getElementById("walletLimit").value.replace(/[^\d,]/g, "").replace(",", ".");
        const dados = {
          nome: document.getElementById("walletName").value,
          tipo: document.getElementById("walletType").value,
          limite: parseFloat(rawValue) || 0,
          ilimitado: document.getElementById("isUnlimited").checked,
          cor: document.getElementById("walletColor").value
        };
        if (index === -1) this.lista.push(dados);
        else this.lista[index] = dados;
        localStorage.setItem("carteiras", JSON.stringify(this.lista));
        this.renderizarWallets();
        this.fecharModal();
      };
    }
  };
  window.CarteirasModulo = CarteirasModulo;
  window.confirmarExclusaoCarteira = (index) => {
    const modalConfirm = document.getElementById("confirmModal");
    if (!modalConfirm) {
      if (confirm("Deseja excluir esta carteira?")) {
        executarExclusao(index);
      }
      return;
    }
    modalConfirm.style.display = "flex";
    const wallet = CarteirasModulo.lista[index];
    const confirmTitle = document.getElementById("confirmModalTitle");
    const confirmMessage = document.getElementById("confirmModalMessage");
    const btnConfirmar = document.getElementById("btnConfirmDelete");
    const btnCancelar = document.getElementById("btnConfirmCancel");
    if (confirmTitle) {
      confirmTitle.innerText = "Excluir carteira";
    }
    if (confirmMessage) {
      confirmMessage.innerText = wallet ? `Tem certeza que deseja excluir a carteira ${wallet.nome}? Esta a\xE7\xE3o n\xE3o poder\xE1 ser desfeita.` : "Tem certeza que deseja excluir esta carteira? Esta a\xE7\xE3o n\xE3o poder\xE1 ser desfeita.";
    }
    btnConfirmar.onclick = () => {
      executarExclusao(index);
      modalConfirm.style.display = "none";
    };
    btnCancelar.onclick = () => {
      modalConfirm.style.display = "none";
    };
  };
  function executarExclusao(index) {
    CarteirasModulo.lista.splice(index, 1);
    localStorage.setItem("carteiras", JSON.stringify(CarteirasModulo.lista));
    CarteirasModulo.renderizarWallets();
  }

  // js/perfil.js
  var PerfilModulo = {
    tipoAtivo: "",
    dadosOriginais: {},
    storageKey: "visionFinance_profile",
    fotoTemporaria: null,
    fotoOriginalTemporaria: null,
    fotoCropTemporario: null,
    editorFotoSrc: "",
    editorFotoImagem: null,
    editorFotoEstado: {
      zoom: 1,
      offsetX: 0,
      offsetY: 0
    },
    detalhamentoFiltro: {
      escopo: "atual",
      periodo: "30"
    },
    init() {
      this.aplicarDadosPerfilSalvos();
      this.dadosOriginais = {
        nome: document.getElementById("perfilNome").value,
        sobrenome: document.getElementById("perfilSobrenome").value,
        email: document.getElementById("perfilEmail").value,
        foto: this.getProfileData().foto || ""
      };
      this.configurarListeners();
      this.renderizarTotaisResumo();
      this.renderizarAvatar();
      window.PerfilModulo = this;
    },
    configurarListeners() {
      const formPerfil = document.getElementById("formPerfil");
      const btnSalvar = document.getElementById("btnSalvarPerfil");
      const inputs = formPerfil.querySelectorAll("input");
      const formSenha = document.getElementById("formSenha");
      const passwordFeedback = document.getElementById("perfilPasswordFeedback");
      const uploadTrigger = document.getElementById("avatarUploadTrigger");
      const changePhotoButton = document.getElementById("avatarChangeBtn");
      const photoInput = document.getElementById("perfilFotoInput");
      const removePhotoButton = document.getElementById("avatarRemoveBtn");
      const editFrameButton = document.getElementById("avatarEditFrameBtn");
      const editorZoom = document.getElementById("avatarEditorZoom");
      const editorOffsetX = document.getElementById("avatarEditorOffsetX");
      const editorOffsetY = document.getElementById("avatarEditorOffsetY");
      const applyEditorButton = document.getElementById("avatarEditorApplyBtn");
      const editorModal = document.getElementById("modalAvatarEditor");
      const detailModal = document.getElementById("modalDetalhamento");
      const filterScope = document.getElementById("filtroEscopo");
      const filterPeriod = document.getElementById("filtroPeriodo");
      const getPasswordValidationMessages = (password) => {
        const messages = [];
        if (password.length < 8) messages.push("Use no m\xEDnimo 8 caracteres.");
        if (!/[A-Z]/.test(password)) messages.push("Adicione pelo menos 1 letra mai\xFAscula.");
        if (!/[a-z]/.test(password)) messages.push("Adicione pelo menos 1 letra min\xFAscula.");
        if (!/[^A-Za-z0-9]/.test(password)) messages.push("Adicione pelo menos 1 caractere especial.");
        return messages;
      };
      const limparFeedbackSenha = () => {
        if (!passwordFeedback) return;
        passwordFeedback.hidden = true;
        passwordFeedback.classList.remove("is-error", "is-success");
        passwordFeedback.innerHTML = "";
      };
      const exibirFeedbackSenha = (tipo, titulo, mensagens = []) => {
        if (!passwordFeedback) return;
        passwordFeedback.hidden = false;
        passwordFeedback.classList.remove("is-error", "is-success");
        passwordFeedback.classList.add(tipo === "success" ? "is-success" : "is-error");
        passwordFeedback.innerHTML = mensagens.length ? `<p>${titulo}</p><ul>${mensagens.map((mensagem) => `<li>${mensagem}</li>`).join("")}</ul>` : `<p>${titulo}</p>`;
      };
      inputs.forEach((input) => {
        input.addEventListener("input", () => {
          this.atualizarBotaoSalvar();
        });
      });
      if (uploadTrigger && photoInput && !uploadTrigger.dataset.bound) {
        uploadTrigger.dataset.bound = "true";
        uploadTrigger.addEventListener("click", () => photoInput.click());
      }
      if (changePhotoButton && photoInput && !changePhotoButton.dataset.bound) {
        changePhotoButton.dataset.bound = "true";
        changePhotoButton.addEventListener("click", () => photoInput.click());
      }
      if (photoInput && !photoInput.dataset.bound) {
        photoInput.dataset.bound = "true";
        photoInput.addEventListener("change", async (event) => {
          const [file] = event.target.files || [];
          if (!file) return;
          try {
            const fotoSrc = await this.lerArquivoImagem(file);
            await this.abrirEditorFoto(fotoSrc);
          } catch (error) {
            this.exibirFeedbackFoto("error", error.message || "Nao foi possivel carregar a foto selecionada.");
          } finally {
            event.target.value = "";
          }
        });
      }
      if (removePhotoButton && !removePhotoButton.dataset.bound) {
        removePhotoButton.dataset.bound = "true";
        removePhotoButton.addEventListener("click", async () => {
          const confirmado = await confirmarAcao(
            "Remover foto de perfil",
            "A foto ser\xE1 removida da pr\xE9-visualiza\xE7\xE3o. Para concluir a altera\xE7\xE3o, voc\xEA ainda precisar\xE1 salvar o perfil.",
            {
              confirmText: "Remover foto",
              cancelText: "Manter foto",
              iconAlt: "Remover foto"
            }
          );
          if (!confirmado) return;
          this.fotoTemporaria = "";
          this.fotoOriginalTemporaria = "";
          this.fotoCropTemporario = null;
          this.renderizarAvatar();
          this.atualizarBotaoSalvar();
          this.exibirFeedbackFoto("info", "Foto removida da pr\xE9-visualiza\xE7\xE3o. Clique em Salvar Altera\xE7\xF5es para aplicar a mudan\xE7a.");
        });
      }
      if (editFrameButton && !editFrameButton.dataset.bound) {
        editFrameButton.dataset.bound = "true";
        editFrameButton.addEventListener("click", async () => {
          try {
            await this.abrirEditorFotoAtual();
          } catch (error) {
            this.exibirFeedbackFoto("error", error.message || "Nao foi possivel abrir o editor da foto atual.");
          }
        });
      }
      [editorZoom, editorOffsetX, editorOffsetY].forEach((control) => {
        if (control && !control.dataset.bound) {
          control.dataset.bound = "true";
          control.addEventListener("input", () => {
            this.editorFotoEstado.zoom = Number(editorZoom?.value || 100) / 100;
            this.editorFotoEstado.offsetX = Number(editorOffsetX?.value || 0) / 100;
            this.editorFotoEstado.offsetY = Number(editorOffsetY?.value || 0) / 100;
            this.atualizarPreviewEditorFoto();
          });
        }
      });
      if (applyEditorButton && !applyEditorButton.dataset.bound) {
        applyEditorButton.dataset.bound = "true";
        applyEditorButton.addEventListener("click", () => this.aplicarEnquadramentoFoto());
      }
      if (editorModal && !editorModal.dataset.bound) {
        editorModal.dataset.bound = "true";
        editorModal.addEventListener("click", (event) => {
          if (event.target === editorModal) {
            this.cancelarEdicaoFoto();
          }
        });
      }
      if (detailModal && !detailModal.dataset.bound) {
        detailModal.dataset.bound = "true";
        detailModal.addEventListener("click", (event) => {
          if (event.target === detailModal) {
            this.fecharModal("modalDetalhamento");
          }
        });
      }
      if (filterScope && !filterScope.dataset.bound) {
        filterScope.dataset.bound = "true";
        filterScope.addEventListener("change", (event) => {
          this.detalhamentoFiltro.escopo = event.target.value;
          this.detalhamentoFiltro.periodo = "";
          this.resetarScrollDetalhamento();
          this.sincronizarFiltrosDetalhamento();
          this.atualizarListaDetalhada();
        });
      }
      if (filterPeriod && !filterPeriod.dataset.bound) {
        filterPeriod.dataset.bound = "true";
        filterPeriod.addEventListener("change", (event) => {
          this.detalhamentoFiltro.periodo = event.target.value;
          this.resetarScrollDetalhamento();
          this.atualizarListaDetalhada();
        });
      }
      formPerfil.onsubmit = (e) => {
        e.preventDefault();
        const nome = document.getElementById("perfilNome").value;
        const sobrenome = document.getElementById("perfilSobrenome").value;
        const email = document.getElementById("perfilEmail").value;
        const perfil = this.getProfileData();
        const fotoFinal = this.getFotoAtualEdicao();
        const houveMudancaFoto = fotoFinal !== this.dadosOriginais.foto;
        perfil.nome = nome;
        perfil.sobrenome = sobrenome;
        perfil.email = email;
        perfil.foto = fotoFinal;
        perfil.fotoOriginal = this.getFotoOriginalAtualEdicao();
        perfil.fotoCrop = this.getFotoCropAtualEdicao();
        this.setProfileData(perfil);
        this.fotoTemporaria = null;
        this.fotoOriginalTemporaria = null;
        this.fotoCropTemporario = null;
        document.getElementById("userNameDisplay").innerText = `${nome} ${sobrenome}`;
        document.getElementById("userEmailDisplay").innerText = email;
        this.renderizarAvatar();
        this.dadosOriginais = {
          nome,
          sobrenome,
          email,
          foto: fotoFinal || ""
        };
        btnSalvar.disabled = true;
        btnSalvar.classList.remove("active");
        window.dispatchEvent(new Event("profileUpdated"));
        this.exibirFeedbackFoto(
          "success",
          houveMudancaFoto ? "Perfil atualizado com sucesso. Sua foto j\xE1 est\xE1 salva e sincronizada com o dashboard." : "Perfil atualizado com sucesso."
        );
      };
      if (formSenha) {
        formSenha.onsubmit = (e) => {
          e.preventDefault();
          const nova = document.getElementById("novaSenha").value;
          const confirma = document.getElementById("confirmaSenha").value;
          const mensagens = getPasswordValidationMessages(nova);
          limparFeedbackSenha();
          if (nova !== confirma) {
            mensagens.push("A confirma\xE7\xE3o da senha deve ser igual \xE0 nova senha digitada.");
          }
          if (mensagens.length) {
            exibirFeedbackSenha("error", "A nova senha ainda n\xE3o atende aos crit\xE9rios exigidos:", mensagens);
            return;
          }
          exibirFeedbackSenha("success", "Senha alterada com sucesso.");
          setTimeout(() => {
            this.fecharModal("modalSenha");
            e.target.reset();
            limparFeedbackSenha();
          }, 1200);
        };
      }
      ["novaSenha", "confirmaSenha"].forEach((id) => {
        const field = document.getElementById(id);
        if (field) {
          field.addEventListener("input", limparFeedbackSenha);
        }
      });
    },
    getProfileData() {
      return JSON.parse(localStorage.getItem(this.storageKey)) || {};
    },
    setProfileData(profile) {
      localStorage.setItem(this.storageKey, JSON.stringify(profile));
      return profile;
    },
    aplicarDadosPerfilSalvos() {
      const profile = this.getProfileData();
      const nome = profile.nome || document.getElementById("perfilNome")?.value || "Joao";
      const sobrenome = profile.sobrenome || document.getElementById("perfilSobrenome")?.value || "Silva";
      const email = profile.email || document.getElementById("perfilEmail")?.value || "joao@exemplo.com";
      const nomeInput = document.getElementById("perfilNome");
      const sobrenomeInput = document.getElementById("perfilSobrenome");
      const emailInput = document.getElementById("perfilEmail");
      const nomeDisplay = document.getElementById("userNameDisplay");
      const emailDisplay = document.getElementById("userEmailDisplay");
      if (nomeInput) nomeInput.value = nome;
      if (sobrenomeInput) sobrenomeInput.value = sobrenome;
      if (emailInput) emailInput.value = email;
      if (nomeDisplay) nomeDisplay.innerText = `${nome} ${sobrenome}`;
      if (emailDisplay) emailDisplay.innerText = email;
    },
    getInitials() {
      const nome = document.getElementById("perfilNome")?.value?.trim() || "Joao";
      const sobrenome = document.getElementById("perfilSobrenome")?.value?.trim() || "Silva";
      return `${nome.charAt(0)}${sobrenome.charAt(0)}`.toUpperCase();
    },
    renderizarAvatar() {
      const avatar = document.getElementById("avatarIcon");
      const removePhotoButton = document.getElementById("avatarRemoveBtn");
      const editFrameButton = document.getElementById("avatarEditFrameBtn");
      if (!avatar) return;
      const initials = this.getInitials();
      const fotoAtual = this.getFotoAtualEdicao();
      if (fotoAtual) {
        avatar.classList.add("has-photo");
        avatar.innerHTML = `<img src="${fotoAtual}" alt="Foto de perfil">`;
        if (removePhotoButton) removePhotoButton.hidden = false;
        if (editFrameButton) editFrameButton.hidden = false;
      } else {
        avatar.classList.remove("has-photo");
        avatar.innerHTML = `<span>${initials}</span>`;
        if (removePhotoButton) removePhotoButton.hidden = !this.dadosOriginais.foto && this.fotoTemporaria === null;
        if (editFrameButton) editFrameButton.hidden = true;
      }
    },
    atualizarBotaoSalvar() {
      const btnSalvar = document.getElementById("btnSalvarPerfil");
      if (!btnSalvar) return;
      const alterado = document.getElementById("perfilNome").value !== this.dadosOriginais.nome || document.getElementById("perfilSobrenome").value !== this.dadosOriginais.sobrenome || document.getElementById("perfilEmail").value !== this.dadosOriginais.email || this.getFotoAtualEdicao() !== this.dadosOriginais.foto;
      btnSalvar.disabled = !alterado;
      btnSalvar.classList.toggle("active", alterado);
    },
    getFotoAtualEdicao() {
      if (this.fotoTemporaria !== null) {
        return this.fotoTemporaria;
      }
      return this.getProfileData().foto || "";
    },
    getFotoOriginalAtualEdicao() {
      if (this.fotoOriginalTemporaria !== null) {
        return this.fotoOriginalTemporaria;
      }
      const profile = this.getProfileData();
      return profile.fotoOriginal || profile.foto || "";
    },
    getFotoCropAtualEdicao() {
      if (this.fotoCropTemporario !== null) {
        return this.fotoCropTemporario;
      }
      const profile = this.getProfileData();
      return profile.fotoCrop || null;
    },
    exibirFeedbackFoto(tipo, mensagem) {
      const feedback = document.getElementById("avatarFeedback");
      if (!feedback) return;
      feedback.hidden = false;
      feedback.className = `avatar-feedback is-${tipo}`;
      feedback.textContent = mensagem;
    },
    lerArquivoImagem(file) {
      return new Promise((resolve, reject) => {
        if (!file.type.startsWith("image/")) {
          reject(new Error("Selecione um arquivo de imagem valido."));
          return;
        }
        if (file.size > 8 * 1024 * 1024) {
          reject(new Error("A imagem deve ter no maximo 8 MB."));
          return;
        }
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error("Nao foi possivel carregar o arquivo selecionado."));
        reader.readAsDataURL(file);
      });
    },
    carregarImagem(src) {
      return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error("A imagem selecionada nao pode ser lida."));
        image.src = src;
      });
    },
    async abrirEditorFoto(src, cropState = null) {
      const editorImage = document.getElementById("avatarEditorImage");
      const editorZoom = document.getElementById("avatarEditorZoom");
      const editorOffsetX = document.getElementById("avatarEditorOffsetX");
      const editorOffsetY = document.getElementById("avatarEditorOffsetY");
      const modal = document.getElementById("modalAvatarEditor");
      this.editorFotoImagem = await this.carregarImagem(src);
      this.editorFotoSrc = src;
      this.editorFotoEstado = cropState ? {
        zoom: Number(cropState.zoom) || 1,
        offsetX: Number(cropState.offsetX) || 0,
        offsetY: Number(cropState.offsetY) || 0
      } : {
        zoom: 1,
        offsetX: 0,
        offsetY: 0
      };
      if (editorImage) {
        editorImage.src = src;
      }
      if (editorZoom) editorZoom.value = String(Math.round(this.editorFotoEstado.zoom * 100));
      if (editorOffsetX) editorOffsetX.value = String(Math.round(this.editorFotoEstado.offsetX * 100));
      if (editorOffsetY) editorOffsetY.value = String(Math.round(this.editorFotoEstado.offsetY * 100));
      if (modal) {
        modal.style.display = "flex";
      }
      this.atualizarPreviewEditorFoto();
    },
    async abrirEditorFotoAtual() {
      const fotoAtual = this.getFotoAtualEdicao();
      if (!fotoAtual) {
        throw new Error("Nenhuma foto atual dispon\xEDvel para editar.");
      }
      const source = this.getFotoOriginalAtualEdicao() || fotoAtual;
      const cropState = this.getFotoCropAtualEdicao();
      await this.abrirEditorFoto(source, cropState);
    },
    atualizarPreviewEditorFoto() {
      const frame = document.getElementById("avatarEditorFrame");
      const image = document.getElementById("avatarEditorImage");
      if (!frame || !image || !this.editorFotoImagem) return;
      const frameSize = frame.clientWidth || 280;
      const baseScale = Math.max(
        frameSize / this.editorFotoImagem.width,
        frameSize / this.editorFotoImagem.height
      );
      const scale = baseScale * this.editorFotoEstado.zoom;
      const renderedWidth = this.editorFotoImagem.width * scale;
      const renderedHeight = this.editorFotoImagem.height * scale;
      const maxOffsetX = Math.max(0, (renderedWidth - frameSize) / 2);
      const maxOffsetY = Math.max(0, (renderedHeight - frameSize) / 2);
      const offsetXPx = maxOffsetX * this.editorFotoEstado.offsetX;
      const offsetYPx = maxOffsetY * this.editorFotoEstado.offsetY;
      image.style.width = `${renderedWidth}px`;
      image.style.height = `${renderedHeight}px`;
      image.style.left = `calc(50% + ${offsetXPx}px)`;
      image.style.top = `calc(50% + ${offsetYPx}px)`;
      image.style.transform = "translate(-50%, -50%)";
    },
    aplicarEnquadramentoFoto() {
      try {
        const foto = this.gerarFotoRecortada();
        this.fotoTemporaria = foto;
        this.fotoOriginalTemporaria = this.editorFotoSrc;
        this.fotoCropTemporario = {
          zoom: this.editorFotoEstado.zoom,
          offsetX: this.editorFotoEstado.offsetX,
          offsetY: this.editorFotoEstado.offsetY
        };
        this.renderizarAvatar();
        this.atualizarBotaoSalvar();
        this.cancelarEdicaoFoto();
        this.exibirFeedbackFoto("info", "Enquadramento atualizado. Clique em Salvar Altera\xE7\xF5es para confirmar a nova foto de perfil.");
      } catch (error) {
        this.exibirFeedbackFoto("error", error.message || "Nao foi possivel aplicar o enquadramento da foto.");
      }
    },
    gerarFotoRecortada() {
      if (!this.editorFotoImagem) {
        throw new Error("Nenhuma imagem foi carregada para edicao.");
      }
      const frame = document.getElementById("avatarEditorFrame");
      const frameSize = frame?.clientWidth || 280;
      const baseScale = Math.max(
        frameSize / this.editorFotoImagem.width,
        frameSize / this.editorFotoImagem.height
      );
      const scale = baseScale * this.editorFotoEstado.zoom;
      const renderedWidth = this.editorFotoImagem.width * scale;
      const renderedHeight = this.editorFotoImagem.height * scale;
      const maxOffsetX = Math.max(0, (renderedWidth - frameSize) / 2);
      const maxOffsetY = Math.max(0, (renderedHeight - frameSize) / 2);
      const offsetXPx = maxOffsetX * this.editorFotoEstado.offsetX;
      const offsetYPx = maxOffsetY * this.editorFotoEstado.offsetY;
      const cropSize = frameSize / scale;
      const centerX = this.editorFotoImagem.width / 2 - offsetXPx / scale;
      const centerY = this.editorFotoImagem.height / 2 - offsetYPx / scale;
      const maxStartX = this.editorFotoImagem.width - cropSize;
      const maxStartY = this.editorFotoImagem.height - cropSize;
      const startX = Math.min(Math.max(0, centerX - cropSize / 2), Math.max(0, maxStartX));
      const startY = Math.min(Math.max(0, centerY - cropSize / 2), Math.max(0, maxStartY));
      const canvas = document.createElement("canvas");
      const targetSize = 320;
      canvas.width = targetSize;
      canvas.height = targetSize;
      const context = canvas.getContext("2d");
      if (!context) {
        throw new Error("Nao foi possivel processar a imagem.");
      }
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      context.drawImage(
        this.editorFotoImagem,
        startX,
        startY,
        cropSize,
        cropSize,
        0,
        0,
        targetSize,
        targetSize
      );
      return canvas.toDataURL("image/jpeg", 0.9);
    },
    cancelarEdicaoFoto() {
      const modal = document.getElementById("modalAvatarEditor");
      const editorImage = document.getElementById("avatarEditorImage");
      if (modal) {
        modal.style.display = "none";
      }
      this.editorFotoSrc = "";
      this.editorFotoImagem = null;
      this.editorFotoEstado = {
        zoom: 1,
        offsetX: 0,
        offsetY: 0
      };
      if (editorImage) {
        editorImage.removeAttribute("src");
        editorImage.removeAttribute("style");
      }
    },
    processarFotoPerfil() {
      return this.gerarFotoRecortada();
    },
    getDespesasRegistradas() {
      return getDespesasData();
    },
    getMetasRegistradas(cycleInfo = getCurrentCycleInfo()) {
      return getMetasData({ cycleInfo });
    },
    getBudgetTotal(cycleInfo = getCurrentCycleInfo()) {
      return getBudgetForCycle(cycleInfo);
    },
    parseDate(dateString) {
      if (!dateString || typeof dateString !== "string") return null;
      const parsedDate = /* @__PURE__ */ new Date(`${dateString}T00:00:00`);
      if (Number.isNaN(parsedDate.getTime())) return null;
      parsedDate.setHours(0, 0, 0, 0);
      return parsedDate;
    },
    formatarDataDetalhe(dateString) {
      const parsedDate = this.parseDate(dateString);
      if (!parsedDate) return "Data inv\xE1lida";
      const hoje = /* @__PURE__ */ new Date();
      hoje.setHours(0, 0, 0, 0);
      const ontem = new Date(hoje);
      ontem.setDate(hoje.getDate() - 1);
      const base = parsedDate.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "long",
        year: "numeric"
      });
      if (parsedDate.getTime() === hoje.getTime()) return `Hoje, ${base}`;
      if (parsedDate.getTime() === ontem.getTime()) return `Ontem, ${base}`;
      return base.charAt(0).toUpperCase() + base.slice(1);
    },
    getCiclosDetalhamentoAno() {
      const cicloAtual = getCurrentCycleInfo();
      return getCyclesForYear(cicloAtual.year);
    },
    getCicloDetalhamentoSelecionado() {
      const ciclos = this.getCiclosDetalhamentoAno();
      const cicloAtual = getCurrentCycleInfo();
      if (this.detalhamentoFiltro.escopo === "atual") {
        return cicloAtual;
      }
      return ciclos.find((ciclo) => ciclo.id === this.detalhamentoFiltro.periodo) || ciclos[0] || cicloAtual;
    },
    getOpcoesPeriodoDetalhamento() {
      const cicloAtual = getCurrentCycleInfo();
      const ciclos = this.getCiclosDetalhamentoAno();
      if (this.detalhamentoFiltro.escopo === "mes") {
        return ciclos.filter((ciclo) => ciclo.id !== cicloAtual.id).map((ciclo) => ({
          value: ciclo.id,
          label: ciclo.fullLabel
        }));
      }
      return [{ value: cicloAtual.id, label: cicloAtual.fullLabel }];
    },
    sincronizarFiltrosDetalhamento() {
      const filterScope = document.getElementById("filtroEscopo");
      const filterPeriod = document.getElementById("filtroPeriodo");
      const filterPeriodLabel = document.getElementById("filtroPeriodoLabel");
      if (!filterScope || !filterPeriod) return;
      filterScope.value = this.detalhamentoFiltro.escopo;
      const opcoes = this.getOpcoesPeriodoDetalhamento();
      filterPeriod.innerHTML = opcoes.map((opcao) => `<option value="${opcao.value}">${opcao.label}</option>`).join("");
      if (!opcoes.some((opcao) => opcao.value === this.detalhamentoFiltro.periodo)) {
        this.detalhamentoFiltro.periodo = opcoes[0]?.value || "";
      }
      filterPeriod.value = this.detalhamentoFiltro.periodo;
      if (filterPeriodLabel) {
        filterPeriodLabel.textContent = this.detalhamentoFiltro.escopo === "mes" ? "Ciclo do ano" : "Ciclo ativo";
      }
    },
    getDescricaoFiltroDetalhamento() {
      return this.getCicloDetalhamentoSelecionado().fullLabel;
    },
    resetarScrollDetalhamento() {
      const container = document.getElementById("listaDetalhada");
      if (!container) return;
      container.scrollTop = 0;
      container.scrollLeft = 0;
    },
    filtrarDespesasDetalhamento() {
      const despesas = this.getDespesasRegistradas();
      const cicloSelecionado = this.getCicloDetalhamentoSelecionado();
      return despesas.filter((item) => {
        const parsedDate = this.parseDate(item.data);
        if (!parsedDate) return false;
        return parsedDate >= cicloSelecionado.startDate && parsedDate <= cicloSelecionado.endDate;
      }).sort((left, right) => /* @__PURE__ */ new Date(`${right.data}T00:00:00`) - /* @__PURE__ */ new Date(`${left.data}T00:00:00`));
    },
    getCategoriaPrincipal(items) {
      if (!items.length) return "Sem registros";
      const categoryTotals = items.reduce((accumulator, item) => {
        const category = item.categoria || "Outros";
        accumulator[category] = (accumulator[category] || 0) + (parseFloat(item.valor) || 0);
        return accumulator;
      }, {});
      return Object.entries(categoryTotals).sort((left, right) => right[1] - left[1])[0]?.[0] || "Sem registros";
    },
    getResumoDetalhamento(items) {
      const cicloSelecionado = this.getCicloDetalhamentoSelecionado();
      const totalDespesas = items.reduce((accumulator, item) => accumulator + (parseFloat(item.valor) || 0), 0);
      const totalOriginal = items.reduce((accumulator, item) => accumulator + (parseFloat(item.valorTotalOriginal) || parseFloat(item.valor) || 0), 0);
      const budget = this.getBudgetTotal(cicloSelecionado);
      const totalMetas = this.getMetasRegistradas(cicloSelecionado).reduce((accumulator, meta) => accumulator + (parseFloat(meta.guardado) || 0), 0);
      const averageTicket = items.length ? totalDespesas / items.length : 0;
      return {
        budget,
        totalDespesas,
        totalOriginal,
        totalMetas,
        averageTicket,
        count: items.length,
        saldo: budget - totalDespesas,
        percentualConsumido: budget > 0 ? Math.min(totalDespesas / budget * 100, 999) : 0,
        categoriaPrincipal: this.getCategoriaPrincipal(items)
      };
    },
    escapeHtml(value) {
      return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
    },
    renderizarResumoDetalhamento(items) {
      const summary = document.getElementById("detalhamentoResumo");
      if (!summary) return;
      const filtroDescricao = this.getDescricaoFiltroDetalhamento();
      const resumo = this.getResumoDetalhamento(items);
      const saldoClass = resumo.saldo >= 0 ? "is-positive" : "is-negative";
      if (this.tipoAtivo === "receitas") {
        summary.innerHTML = `
                <article class="detail-summary-card detail-summary-card-hero">
                    <span class="detail-summary-label">Or\xE7amento</span>
                    <strong class="detail-summary-value">${formatarMoeda(resumo.budget)}</strong>
                    <span class="detail-summary-meta">Base de ${this.escapeHtml(filtroDescricao)}.</span>
                </article>
                <article class="detail-summary-card">
                    <span class="detail-summary-label">Despesas</span>
                    <strong class="detail-summary-value">${formatarMoeda(resumo.totalDespesas)}</strong>
                    <span class="detail-summary-meta">${resumo.count} item${resumo.count === 1 ? "" : "s"}.</span>
                </article>
                <article class="detail-summary-card ${saldoClass}">
                    <span class="detail-summary-label">Saldo</span>
                    <strong class="detail-summary-value">${formatarMoeda(resumo.saldo)}</strong>
                    <span class="detail-summary-meta">${resumo.percentualConsumido.toFixed(0)}% usado.</span>
                </article>
                <article class="detail-summary-card">
                    <span class="detail-summary-label">Metas</span>
                    <strong class="detail-summary-value">${formatarMoeda(resumo.totalMetas)}</strong>
                    <span class="detail-summary-meta">Total reservado.</span>
                </article>`;
        return;
      }
      summary.innerHTML = `
            <article class="detail-summary-card detail-summary-card-hero">
                <span class="detail-summary-label">Total do per\xEDodo</span>
                <strong class="detail-summary-value">${formatarMoeda(resumo.totalDespesas)}</strong>
                <span class="detail-summary-meta">Filtro: ${this.escapeHtml(filtroDescricao)}.</span>
            </article>
            <article class="detail-summary-card">
                <span class="detail-summary-label">Lan\xE7amentos</span>
                <strong class="detail-summary-value">${resumo.count}</strong>
                <span class="detail-summary-meta">M\xE9dia: ${formatarMoeda(resumo.averageTicket)}.</span>
            </article>
            <article class="detail-summary-card">
                <span class="detail-summary-label">Categoria principal</span>
                <strong class="detail-summary-value detail-summary-text">${this.escapeHtml(resumo.categoriaPrincipal)}</strong>
                <span class="detail-summary-meta">Maior peso.</span>
            </article>
            <article class="detail-summary-card">
                <span class="detail-summary-label">Valor bruto</span>
                <strong class="detail-summary-value">${formatarMoeda(resumo.totalOriginal)}</strong>
                <span class="detail-summary-meta">Sem rateio.</span>
            </article>`;
    },
    renderizarListaReceitas(items) {
      const container = document.getElementById("listaDetalhada");
      if (!container) return;
      const filtroDescricao = this.getDescricaoFiltroDetalhamento();
      const resumo = this.getResumoDetalhamento(items);
      const saldoClass = resumo.saldo >= 0 ? "is-positive" : "is-negative";
      container.innerHTML = `
            <section class="detail-section-block">
                <header class="detail-section-header">
                    <div>
                        <h3>Leitura do or\xE7amento</h3>
                        <p>Compara\xE7\xE3o r\xE1pida.</p>
                    </div>
                    <span class="detail-section-pill">${this.escapeHtml(filtroDescricao)}</span>
                </header>
                <div class="budget-insight-list">
                    <article class="budget-insight-row">
                        <div>
                            <span class="budget-insight-label">Or\xE7amento</span>
                            <p>Valor base.</p>
                        </div>
                        <strong>${formatarMoeda(resumo.budget)}</strong>
                    </article>
                    <article class="budget-insight-row">
                        <div>
                            <span class="budget-insight-label">Despesas</span>
                            <p>Total filtrado.</p>
                        </div>
                        <strong>${formatarMoeda(resumo.totalDespesas)}</strong>
                    </article>
                    <article class="budget-insight-row ${saldoClass}">
                        <div>
                            <span class="budget-insight-label">Saldo</span>
                            <p>Diferen\xE7a atual.</p>
                        </div>
                        <strong>${formatarMoeda(resumo.saldo)}</strong>
                    </article>
                    <article class="budget-insight-row">
                        <div>
                            <span class="budget-insight-label">Metas</span>
                            <p>Total alocado.</p>
                        </div>
                        <strong>${formatarMoeda(resumo.totalMetas)}</strong>
                    </article>
                </div>
            </section>`;
    },
    renderizarListaDespesas(items) {
      const container = document.getElementById("listaDetalhada");
      if (!container) return;
      if (!items.length) {
        container.innerHTML = `
                <section class="detail-empty-state">
                    <h3>Sem despesas</h3>
                    <p>Troque o filtro.</p>
                </section>`;
        return;
      }
      const groups = items.reduce((accumulator, item) => {
        const groupKey = item.data;
        accumulator[groupKey] = accumulator[groupKey] || [];
        accumulator[groupKey].push(item);
        return accumulator;
      }, {});
      const groupedHtml = Object.keys(groups).sort((left, right) => /* @__PURE__ */ new Date(`${right}T00:00:00`) - /* @__PURE__ */ new Date(`${left}T00:00:00`)).map((groupKey) => {
        const cards = groups[groupKey].map((item) => {
          const estiloCategoria = getCategoryBadgeStyle(item.categoria);
          const valorImpacto = parseFloat(item.valor) || 0;
          const valorExibicao = parseFloat(item.valorTotalOriginal) || valorImpacto;
          const observacao = (item.observacao || "").trim();
          const pagamento = this.escapeHtml(item.pagamento || "Sem m\xE9todo");
          const categoria = this.escapeHtml(item.categoria || "Outros");
          const titulo = this.escapeHtml(item.titulo || "Despesa");
          const parcelas = item.parcelas ? `<span class="detail-chip detail-chip-muted">${this.escapeHtml(item.parcelas)}</span>` : "";
          const cartao = item.cartao ? `<span class="detail-chip detail-chip-muted">${this.escapeHtml(item.cartao)}</span>` : "";
          const impactoMensal = valorExibicao !== valorImpacto ? `<span class="detail-inline-note">Impacto: ${formatarMoeda(valorImpacto)}</span>` : "";
          return `
                        <article class="expense-detail-card">
                            <div class="expense-detail-main">
                                <div class="expense-detail-topline">
                                    <h4>${titulo}</h4>
                                    <strong class="expense-detail-value">${formatarMoeda(valorExibicao)}</strong>
                                </div>
                                <div class="expense-detail-meta">
                                    <span class="detail-chip detail-chip-category" style="--detail-chip-bg:${estiloCategoria.bg}; --detail-chip-text:${estiloCategoria.text}; --detail-chip-border:${estiloCategoria.border};">${categoria}</span>
                                    <span class="detail-chip">${pagamento}</span>
                                    ${parcelas}
                                    ${cartao}
                                </div>
                                ${impactoMensal}
                                ${observacao ? `<p class="expense-detail-description">${this.escapeHtml(observacao)}</p>` : ""}
                            </div>
                        </article>`;
        }).join("");
        return `
                    <section class="expense-detail-group">
                        <header class="expense-detail-group-header">
                            <h3>${this.escapeHtml(this.formatarDataDetalhe(groupKey))}</h3>
                            <span>${groups[groupKey].length} item${groups[groupKey].length === 1 ? "" : "s"}</span>
                        </header>
                        <div class="expense-detail-group-list">${cards}</div>
                    </section>`;
      }).join("");
      container.innerHTML = groupedHtml;
    },
    renderizarTotaisResumo() {
      const snapshot = getCurrentFinancialSnapshot();
      const totalD = snapshot.totalDespesas;
      const totalR = snapshot.budget;
      document.getElementById("totalDespesas").innerText = formatarMoeda(totalD);
      document.getElementById("totalReceitas").innerText = formatarMoeda(totalR);
    },
    abrirDetalhamento(tipo) {
      this.tipoAtivo = tipo;
      const cicloAtual = getCurrentCycleInfo();
      this.detalhamentoFiltro = {
        escopo: "atual",
        periodo: cicloAtual.id
      };
      const modal = document.getElementById("modalDetalhamento");
      const title = document.getElementById("modalDetalhamentoTitulo");
      const kicker = document.getElementById("modalDetalhamentoKicker");
      const description = document.getElementById("modalDetalhamentoDescricao");
      if (title) {
        title.innerText = tipo === "receitas" ? "Or\xE7amento Mensal (Receita)" : "Detalhamento de Gastos";
      }
      if (kicker) {
        kicker.innerText = tipo === "receitas" ? "Or\xE7amento" : "Despesas";
      }
      if (description) {
        description.innerText = tipo === "receitas" ? "Comparativo do ciclo." : "Itens do ciclo.";
      }
      this.sincronizarFiltrosDetalhamento();
      if (modal) modal.style.display = "flex";
      this.resetarScrollDetalhamento();
      this.atualizarListaDetalhada();
    },
    abrirModalSenha() {
      document.getElementById("modalSenha").style.display = "flex";
    },
    fecharModal(id) {
      document.getElementById(id).style.display = "none";
    },
    atualizarListaDetalhada() {
      const container = document.getElementById("listaDetalhada");
      if (!container) return;
      container.innerHTML = "";
      const itensFiltrados = this.filtrarDespesasDetalhamento();
      this.renderizarResumoDetalhamento(itensFiltrados);
      if (this.tipoAtivo === "receitas") {
        this.renderizarListaReceitas(itensFiltrados);
        return;
      }
      this.renderizarListaDespesas(itensFiltrados);
    }
  };

  // js/configuracoes.js
  var ConfiguracoesModulo = {
    init: function() {
      setTimeout(() => {
        this.cacheSelectors();
        if (this.form) {
          this.bindEvents();
          this.loadSettings();
          this.applyTheme();
        }
      }, 100);
    },
    cacheSelectors: function() {
      this.form = document.getElementById("formConfiguracoes");
      this.checkNotificacoesGeral = document.getElementById("checkNotificacoesGeral");
      this.checkAlertaOrcamento = document.getElementById("checkAlertaOrcamento");
      this.checkAlertaOrcamentoMeta = document.getElementById("checkAlertaOrcamentoMeta");
      this.checkLembreteMetas = document.getElementById("checkLembreteMetas");
      this.selectMoeda = document.getElementById("selectMoeda");
      this.selectCorTemaClaro = document.getElementById("selectCorTemaClaro");
      this.selectCorTemaEscuro = document.getElementById("selectCorTemaEscuro");
      this.selectDiaVirada = document.getElementById("selectDiaVirada");
      this.checkTemaEscuro = document.getElementById("checkTemaEscuro");
      this.btnAbrirTutorial = document.getElementById("btnAbrirTutorial");
    },
    bindEvents: function() {
      this.form.addEventListener("submit", (e) => {
        e.preventDefault();
        this.saveSettings();
      });
      this.checkNotificacoesGeral.addEventListener("change", (e) => {
        this.toggleSubNotifications(e.target.checked);
        this.toggleNotificacoes(e.target.checked);
      });
      [this.selectCorTemaClaro, this.selectCorTemaEscuro].forEach((select) => {
        select?.addEventListener("change", () => {
          this.applyTheme(this.buildThemePreviewSettings());
        });
      });
      this.checkTemaEscuro.addEventListener("change", (e) => {
        this.toggleTheme(e.target.checked);
      });
      if (this.btnAbrirTutorial) {
        this.btnAbrirTutorial.addEventListener("click", () => {
          window.dispatchEvent(new CustomEvent("visionFinance:openTutorial", {
            detail: { startStep: 0 }
          }));
        });
      }
    },
    toggleNotificacoes: function(isEnabled) {
      if (isEnabled) {
        this.solicitarPermissaoNotificacoes();
      } else {
        console.log("Notifica\xE7\xF5es desabilitadas");
      }
    },
    solicitarPermissaoNotificacoes: function() {
      if ("Notification" in window) {
        Notification.requestPermission().then((permission) => {
          if (permission === "granted") {
            console.log("Permiss\xE3o para notifica\xE7\xF5es concedida");
            this.mostrarNotificacaoTeste();
          } else {
            console.log("Permiss\xE3o para notifica\xE7\xF5es negada");
            this.checkNotificacoesGeral.checked = false;
            alert("Permiss\xE3o para notifica\xE7\xF5es foi negada. Para ativar, permita notifica\xE7\xF5es no navegador.");
          }
        });
      } else {
        alert("Este navegador n\xE3o suporta notifica\xE7\xF5es.");
        this.checkNotificacoesGeral.checked = false;
      }
    },
    mostrarNotificacaoTeste: function() {
      const notificacao = new Notification("Vision Finance", {
        body: "Notifica\xE7\xF5es ativadas com sucesso!",
        icon: "./img/logo.png"
      });
      setTimeout(() => {
        notificacao.close();
      }, 3e3);
    },
    toggleTheme: function(isDark) {
      applyThemeClasses(isDark, document.body, this.buildThemePreviewSettings(isDark));
    },
    buildThemePreviewSettings: function(isDark = this.checkTemaEscuro.checked) {
      const saved = getThemeSettings();
      return {
        ...saved,
        corTemaClaro: this.selectCorTemaClaro?.value || saved.corTemaClaro || saved.corTema || "azul",
        corTemaEscuro: this.selectCorTemaEscuro?.value || saved.corTemaEscuro || saved.corTema || "dourado",
        temaEscuro: isDark === true
      };
    },
    applyTheme: function(settingsOverride = null) {
      const settings = settingsOverride || getThemeSettings();
      const isDark = settings.temaEscuro === true;
      this.checkTemaEscuro.checked = isDark;
      applyThemeClasses(isDark, document.body, settings);
    },
    toggleSubNotifications: function(isEnabled) {
      const dependents = [
        this.checkAlertaOrcamento,
        this.checkAlertaOrcamentoMeta,
        this.checkLembreteMetas
      ];
      dependents.forEach((el) => {
        if (el) {
          el.disabled = !isEnabled;
          if (!isEnabled) el.checked = false;
        }
      });
      const subItems = document.querySelectorAll(".sub-item");
      subItems.forEach((item) => {
        item.style.opacity = isEnabled ? "1" : "0.5";
      });
    },
    saveSettings: function() {
      const settings = {
        moeda: this.selectMoeda.value,
        corTemaClaro: this.selectCorTemaClaro?.value || "azul",
        corTemaEscuro: this.selectCorTemaEscuro?.value || "dourado",
        diaViradaMes: Number(this.selectDiaVirada?.value || 1),
        temaEscuro: this.checkTemaEscuro.checked,
        notificacoes: {
          geral: this.checkNotificacoesGeral.checked,
          orcamento: this.checkAlertaOrcamento.checked,
          orcamentoMeta: this.checkAlertaOrcamentoMeta.checked,
          metas: this.checkLembreteMetas.checked
        },
        dataAtualizacao: (/* @__PURE__ */ new Date()).toISOString()
      };
      const savedSettings = setThemeSettings(settings);
      ensureFinancialDataIntegrity();
      this.mostrarFeedback();
      window.dispatchEvent(new CustomEvent("settingsUpdated", { detail: savedSettings }));
      this.applyTheme(savedSettings);
    },
    loadSettings: function() {
      const saved = getThemeSettings();
      if (saved) {
        this.selectMoeda.value = saved.moeda || "BRL";
        if (this.selectCorTemaClaro) this.selectCorTemaClaro.value = saved.corTemaClaro || saved.corTema || "azul";
        if (this.selectCorTemaEscuro) this.selectCorTemaEscuro.value = saved.corTemaEscuro || saved.corTema || "dourado";
        if (this.selectDiaVirada) this.selectDiaVirada.value = String(saved.diaViradaMes || 1);
        this.checkTemaEscuro.checked = saved.temaEscuro === true;
        this.checkNotificacoesGeral.checked = saved.notificacoes?.geral || false;
        this.checkAlertaOrcamento.checked = saved.notificacoes?.orcamento || false;
        this.checkAlertaOrcamentoMeta.checked = saved.notificacoes?.orcamentoMeta || false;
        this.checkLembreteMetas.checked = saved.notificacoes?.metas || false;
        this.toggleSubNotifications(this.checkNotificacoesGeral.checked);
      }
      this.applyTheme(saved);
    },
    mostrarFeedback: function() {
      const btn = this.form.querySelector(".btn-primary");
      if (!btn) return;
      const originalText = btn.innerText;
      btn.innerText = "\u2713 Configura\xE7\xF5es Salvas";
      const originalBg = btn.style.background;
      btn.style.background = "var(--success)";
      setTimeout(() => {
        btn.innerText = originalText;
        btn.style.background = originalBg;
      }, 2e3);
    }
  };
  if (!window.location.href.includes("module")) {
    document.addEventListener("DOMContentLoaded", () => ConfiguracoesModulo.init());
  }

  // HTML/painel.html
  var painel_default = `<script>\r
if (window.top === window.self) {\r
    window.location.replace('../dashboard.html?section=painel#painel');\r
}\r
<\/script>\r
\r
<div class="painel-cycle-bar" data-animate>\r
    <div class="painel-cycle-copy">\r
        <span class="painel-cycle-label">Filtro do painel</span>\r
        <h3>Visualize os indicadores por ciclo financeiro</h3>\r
    </div>\r
    <div class="painel-cycle-control">\r
        <label for="painelCycleFilter">Ciclo</label>\r
        <select id="painelCycleFilter" class="painel-cycle-select" aria-label="Filtrar painel por ciclo financeiro"></select>\r
    </div>\r
</div>\r
\r
<div class="dashboard-top-cards">\r
    <div class="stat-card small-card" data-animate>\r
        <div class="stat-info">\r
            <p>Total Gasto</p>\r
            <h3 id="totalGastoText">R$ 0,00</h3>\r
        </div>\r
    </div>\r
    <div class="stat-card small-card" data-animate>\r
        <div class="stat-info">\r
            <p>Limite Mensal</p>\r
            <h3 id="limiteText">R$ 0,00</h3>\r
        </div>\r
    </div>\r
    <div class="stat-card small-card" data-animate>\r
        <div class="stat-info">\r
            <p>Saldo Restante</p>\r
            <h3 id="saldoText">R$ 0,00</h3>\r
        </div>\r
    </div>\r
    <div class="stat-card small-card" data-animate>\r
        <div class="stat-info">\r
            <p>Pagamento mais usado</p>\r
            <h3 id="metodoPrincipalText">---</h3>\r
        </div>\r
    </div>\r
</div>\r
\r
<div class="charts-grid">\r
    <div class="chart-card" data-animate>\r
        <h3>Gastos por Categoria</h3>\r
        <div class="chart-container">\r
            <canvas id="categoryChart"></canvas>\r
            <div id="categoryChartEmpty" class="chart-empty-state" hidden>\r
                <span class="chart-empty-icon" aria-hidden="true"></span>\r
                <strong>Nenhuma despesa no ciclo selecionado</strong>\r
                <p>Cadastre despesas para visualizar como seus gastos se distribuem por categoria.</p>\r
            </div>\r
        </div>\r
    </div>\r
    <div class="chart-card" data-animate>\r
        <h3>Gastos por M\xE9todo de Pagamento</h3>\r
        <div class="chart-container">\r
            <canvas id="paymentChart"></canvas>\r
            <div id="paymentChartEmpty" class="chart-empty-state" hidden>\r
                <span class="chart-empty-icon" aria-hidden="true"></span>\r
                <strong>Sem movimenta\xE7\xF5es para comparar</strong>\r
                <p>Assim que houver lan\xE7amentos, o painel mostrar\xE1 os m\xE9todos de pagamento mais usados.</p>\r
            </div>\r
        </div>\r
    </div>\r
</div>\r
\r
<div class="table-card recent-expenses-card" data-animate>\r
    <div class="table-header-flex">\r
        <h3>Despesas Recentes</h3>\r
        <span id="dataAtualBadge" class="date-badge"></span>\r
    </div>\r
    <table class="dash-table recent-expenses-table">\r
        <thead>\r
            <tr>\r
                <th>T\xEDtulo</th>\r
                <th>Categoria</th>\r
                <th>Pagamento</th>\r
                <th>Valor</th>\r
                <th>Data</th>\r
            </tr>\r
        </thead>\r
        <tbody id="expenseTableBody"></tbody>\r
    </table>\r
</div>\r
`;

  // HTML/despesas.html
  var despesas_default = `<script>\r
if (window.top === window.self) {\r
    window.location.replace('../dashboard.html?section=despesas#despesas');\r
}\r
<\/script>\r
\r
<div class="section-header-row section-header-row-stacked">\r
    <div class="section-title-block expense-section-title">\r
        <h2 style="color: var(--text-primary); font-size: 24px; font-weight: 700;">Gerenciar Despesas</h2>\r
        <p class="section-support-text">Organize seus lan\xE7amentos, revise categorias e acompanhe cada pagamento com clareza.</p>\r
    </div>\r
    <button class="btn btn-primary expense-primary-action" onclick="DespesasModulo.abrirModal()">\r
        <i class="fas fa-plus"></i>\r
        <span>Nova Despesa</span>\r
    </button>\r
</div>\r
\r
<div class="filters-bar">\r
    <div class="filter-field">\r
        <span class="filter-field-icon"><i class="fas fa-calendar"></i></span>\r
        <select id="filterYear" class="filter-select">\r
            <option value="todos">Ano</option>\r
        </select>\r
    </div>\r
\r
    <div class="filter-field">\r
        <span class="filter-field-icon"><i class="fas fa-calendar-alt"></i></span>\r
        <select id="filterMonth" class="filter-select">\r
            <option value="todos">M\xEAs</option>\r
            <option value="01">Janeiro</option>\r
            <option value="02">Fevereiro</option>\r
            <option value="03">Mar\xE7o</option>\r
            <option value="04">Abril</option>\r
            <option value="05">Maio</option>\r
            <option value="06">Junho</option>\r
            <option value="07">Julho</option>\r
            <option value="08">Agosto</option>\r
            <option value="09">Setembro</option>\r
            <option value="10">Outubro</option>\r
            <option value="11">Novembro</option>\r
            <option value="12">Dezembro</option>\r
        </select>\r
    </div>\r
    \r
    <div class="filter-field">\r
        <span class="filter-field-icon"><i class="fas fa-tags"></i></span>\r
        <select id="filterCategory" class="filter-select">\r
        <option value="todos">Categoria</option>\r
        <option value="Alimenta\xE7\xE3o">Alimenta\xE7\xE3o</option>\r
        <option value="Transporte">Transporte</option>\r
        <option value="Lazer">Lazer</option>\r
        <option value="Sa\xFAde">Sa\xFAde</option>\r
        <option value="Moradia">Moradia</option>\r
        <option value="Moda">Moda</option> <option value="Outros">Outros</option> </select>\r
    </div>\r
\r
    <div class="filter-field">\r
        <span class="filter-field-icon"><i class="fas fa-wallet"></i></span>\r
        <select id="filterPayment" class="filter-select">\r
            <option value="todos">Pagamento</option>\r
            <option value="Cart\xE3o de Cr\xE9dito">Cr\xE9dito</option>\r
            <option value="Cart\xE3o de D\xE9bito">D\xE9bito</option>\r
            <option value="Pix">Pix</option>\r
            <option value="Dinheiro">Dinheiro</option>\r
            <option value="VR">VR</option>\r
            <option value="VA">VA</option>\r
            <option value="VT">VT</option>\r
        </select>\r
    </div>\r
\r
    <div class="filter-field">\r
        <span class="filter-field-icon"><i class="fas fa-clock"></i></span>\r
        <select id="filterPeriod" class="filter-select">\r
            <option value="todos">Per\xEDodo (Dias)</option>\r
            <option value="5">\xDAltimos 5 dias</option>\r
            <option value="10">\xDAltimos 10 dias</option>\r
            <option value="15">\xDAltimos 15 dias</option>\r
            <option value="20">\xDAltimos 20 dias</option>\r
            <option value="30">\xDAltimos 30 dias</option>\r
        </select>\r
    </div>\r
</div>\r
\r
<div class="table-card expense-table-card">\r
    <table class="expense-table">\r
        <thead>\r
            <tr class="expense-table-head-row" style="border-bottom: 1px solid var(--border-color);">\r
                <th class="expense-head expense-head-title" style="padding: 20px; color: var(--text-primary); font-weight: 600;">T\xEDtulo</th>\r
                <th class="expense-head expense-head-category categoria-header" style="padding: 20px; color: var(--text-primary); font-weight: 600;">Categoria</th>\r
                <th class="expense-head expense-head-payment" style="padding: 20px; color: var(--text-primary); font-weight: 600;">Pagamento</th>\r
                <th class="expense-head expense-head-value" style="padding: 20px; color: var(--text-primary); font-weight: 600;">Valor</th>\r
                <th class="expense-head expense-head-date" style="padding: 20px; color: var(--text-primary); font-weight: 600;">Data</th>\r
                <th class="expense-head expense-head-description" style="padding: 20px; color: var(--text-primary); font-weight: 600; text-align: center;">Descri\xE7\xE3o</th>\r
                <th class="expense-head expense-head-actions" style="padding: 20px; color: var(--text-primary); font-weight: 600; text-align: center;">A\xE7\xF5es</th>\r
            </tr>\r
        </thead>\r
        <tbody id="fullExpenseTableBody"></tbody>\r
    </table>\r
</div>\r
\r
<div id="modalDespesa" class="modal-overlay" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: var(--modal-overlay); z-index: 1000; align-items: center; justify-content: center; backdrop-filter: blur(4px);">\r
    <div class="modal-content-card expense-modal-card" style="background: var(--modal-bg); border: 1px solid var(--border-color); border-radius: 20px; padding: 30px; width: 100%; max-width: 450px; box-shadow: 0 20px 40px rgba(0,0,0,0.18);">\r
        <h3 id="modalTitle" style="color: var(--text-primary); text-align: center; margin-bottom: 25px; font-size: 22px; font-weight: 700;">Nova Despesa</h3>\r
        <form id="formDespesa">\r
            <input type="hidden" id="editIndex" value="-1">\r
            <div class="form-group" style="margin-bottom: 15px;">\r
                <label style="color: var(--text-secondary); display: block; margin-bottom: 8px; font-size: 14px;">T\xEDtulo da despesa</label>\r
                <input type="text" id="titulo" placeholder="Ex: Supermercado" required class="dark-input" style="color: var(--text-primary);">\r
            </div>\r
            <div class="form-group" style="margin-bottom: 15px;">\r
                <label style="color: var(--text-secondary); display: block; margin-bottom: 8px; font-size: 14px;">Valor</label>\r
                <input type="text" id="valor" placeholder="R$ 0,00" required class="dark-input" style="color: var(--text-primary);">\r
            </div>\r
            <div class="form-row" style="display: flex; gap: 15px; margin-bottom: 15px;">\r
                <div style="flex: 1;">\r
                    <label style="color: var(--text-secondary); display: block; margin-bottom: 8px; font-size: 14px;">Categoria</label>\r
                    <select id="categoria" required class="dark-input dark-select" style="color: var(--text-primary);">\r
                        <option value="">Selecione</option>\r
                        <option value="Alimenta\xE7\xE3o">Alimenta\xE7\xE3o</option>\r
                        <option value="Transporte">Transporte</option>\r
                        <option value="Lazer">Lazer</option>\r
                        <option value="Sa\xFAde">Sa\xFAde</option>\r
                        <option value="Moradia">Moradia</option>\r
                        <option value="Moda">Moda</option>\r
                        <option value="Outros">Outros</option>\r
                    </select>\r
                </div>\r
                <div style="flex: 1;">\r
                    <label style="color: var(--text-secondary); display: block; margin-bottom: 8px; font-size: 14px;">M\xE9todo</label>\r
                    <select id="metodo" required class="dark-input dark-select" onchange="DespesasModulo.verificarMetodoPagamento()" style="color: var(--text-primary);">\r
                        <option value="">Selecione</option>\r
                        <option value="Cart\xE3o de Cr\xE9dito">Cr\xE9dito</option>\r
                        <option value="Cart\xE3o de D\xE9bito">D\xE9bito</option>\r
                        <option value="Pix">Pix</option>\r
                        <option value="Dinheiro">Dinheiro</option>\r
                        <option value="VR">VR</option>\r
                        <option value="VA">VA</option>\r
                        <option value="VT">VT</option>\r
                    </select>\r
                </div>\r
            </div>\r
\r
            <div id="containerCartao" class="expense-card-selector" style="display: none; margin-bottom: 15px; background: var(--bg-surface); padding: 15px; border-radius: 12px; border: 1px solid var(--border-color);">\r
                <div style="display: flex; gap: 12px; align-items: flex-end;">\r
                    <div style="flex: 1.5;">\r
                        <label style="color: var(--text-secondary); display: block; margin-bottom: 6px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Cart\xE3o</label>\r
                        <select id="cartaoSelecionado" class="dark-input dark-select" style="font-weight: 700; color: var(--accent); border-color: var(--border-color);">\r
                        </select>\r
                    </div>\r
                    \r
                    <div id="containerParcelamento" style="display: none; flex: 1; border-left: 1px solid var(--border-color); padding-left: 12px;">\r
                        <label style="color: var(--text-secondary); display: block; margin-bottom: 6px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Parcelas</label>\r
                        <div style="display: flex; gap: 8px;">\r
                            <select id="foiParcelado" class="dark-input dark-select" style="font-size: 12px; padding: 8px; color: var(--text-primary);" onchange="DespesasModulo.toggleSeletorParcelas()">\r
                                <option value="nao">1x</option>\r
                                <option value="sim">Parc.</option>\r
                            </select>\r
                            <select id="numParcelas" class="dark-input dark-select" style="display: none; font-size: 12px; padding: 8px; color: var(--accent);">\r
                                <option value="2x">2x</option><option value="3x">3x</option><option value="4x">4x</option><option value="5x">5x</option><option value="6x">6x</option><option value="7x">7x</option><option value="8x">8x</option><option value="9x">9x</option><option value="10x">10x</option><option value="11x">11x</option><option value="12x">12x</option>\r
                            </select>\r
                        </div>\r
                    </div>\r
                </div>\r
            </div>\r
\r
            <div id="avisoCartaoInexistente" style="display: none; margin-bottom: 15px; padding: 15px; background: rgba(239, 68, 68, 0.1); border-radius: 12px; border: 1px solid rgba(239, 68, 68, 0.2);">\r
                <p style="color: #f87171; font-size: 13px; margin-bottom: 10px; line-height: 1.4;">\r
                    Voc\xEA n\xE3o possui um cart\xE3o <span id="tipoCartaoMsg" style="font-weight: 800;"></span> cadastrado. Deseja cadastrar agora?\r
                </p>\r
                <div style="display: flex; gap: 10px;">\r
                    <button type="button" onclick="DespesasModulo.redirecionarParaCarteira()" class="btn btn-success">Sim</button>\r
                    <button type="button" onclick="document.getElementById('avisoCartaoInexistente').style.display='none'" class="btn btn-secondary">N\xE3o</button>\r
                </div>\r
            </div>\r
\r
            <div class="form-group" style="margin-bottom: 15px;">\r
                <label style="color: var(--text-secondary); display: block; margin-bottom: 8px; font-size: 14px;">Data</label>\r
                <input type="text" id="data" placeholder="dd/mm/aaaa" required class="dark-input" style="color: var(--text-primary);">\r
            </div>\r
            <div class="form-group" style="margin-bottom: 25px;">\r
                <label style="color: var(--text-secondary); display: block; margin-bottom: 8px; font-size: 14px;">Descri\xE7\xE3o</label>\r
                <textarea id="observacao" placeholder="Observa\xE7\xF5es adicionais..." rows="3" maxlength="500" class="dark-input expense-description-field" style="resize: none; color: var(--text-primary);"></textarea>\r
            </div>\r
            <div style="display: flex; flex-direction: column; gap: 10px;">\r
                <button type="submit" class="btn btn-primary">Salvar Despesa</button>\r
                <button type="button" onclick="DespesasModulo.fecharModal()" class="btn btn-secondary">Cancelar</button>\r
            </div>\r
        </form>\r
    </div>\r
</div>\r
\r
<div id="modalConfirmacao" class="modal-overlay" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: var(--modal-overlay); z-index: 1100; align-items: center; justify-content: center; backdrop-filter: blur(4px);">\r
    <div style="background: var(--modal-bg); border: 1px solid var(--border-color); border-radius: 20px; padding: 35px; width: 100%; max-width: 340px; text-align: center;">\r
        <div style="font-size: 48px; margin-bottom: 15px;">\u26A0\uFE0F</div>\r
        <h3 style="color: var(--text-primary); margin-bottom: 10px; font-size: 20px; font-weight: 700;">Excluir Despesa?</h3>\r
        <p style="color: var(--text-secondary); font-size: 14px; margin-bottom: 25px; line-height: 1.5;">Esta a\xE7\xE3o n\xE3o pode ser desfeita. Deseja continuar?</p>\r
        <div style="display: flex; gap: 12px;">\r
            <button id="btnConfirmarExclusao" class="btn btn-danger">Excluir</button>\r
            <button onclick="document.getElementById('modalConfirmacao').style.display='none'" class="btn btn-secondary">Voltar</button>\r
        </div>\r
    </div>\r
</div>\r
\r
<div id="expenseDescriptionModal" class="modal-overlay expense-description-modal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: var(--modal-overlay); z-index: 1150; align-items: center; justify-content: center; backdrop-filter: blur(4px);">\r
    <div class="expense-description-modal-card" role="dialog" aria-modal="true" aria-labelledby="expenseDescriptionTitle">\r
        <div class="expense-description-modal-head">\r
            <div>\r
                <span class="expense-description-modal-eyebrow">Coment\xE1rio</span>\r
                <h3 id="expenseDescriptionTitle">Descri\xE7\xE3o da despesa</h3>\r
            </div>\r
            <button type="button" id="expenseDescriptionClose" class="expense-description-close" aria-label="Fechar descri\xE7\xE3o">\xD7</button>\r
        </div>\r
        <div id="expenseDescriptionBody" class="expense-description-modal-body"></div>\r
    </div>\r
</div>`;

  // HTML/carteiras.html
  var carteiras_default = `<script>\r
if (window.top === window.self) {\r
    window.location.replace('../dashboard.html?section=carteiras#carteiras');\r
}\r
<\/script>\r
\r
<div class="section-header-row section-header-row-stacked">\r
    <div class="section-title-block wallet-section-title">\r
        <h2 style="color: var(--text-primary); font-size: 24px; font-weight: 700; margin: 0;">Carteiras e M\xE9todos de Pagamento</h2>\r
        <p class="section-support-text">Gerencie seus cart\xF5es, contas e vales em um s\xF3 lugar.</p>\r
    </div>\r
    <button class="btn btn-primary wallet-primary-action" id="btnNewWallet" onclick="window.CarteirasModulo.abrirModalNova()">\r
        <i class="fas fa-plus"></i>\r
        <span>Nova Carteira</span>\r
    </button>\r
</div>\r
\r
<div id="walletsGrid" class="wallets-grid">\r
</div>\r
\r
<div id="walletModal" class="modal-overlay" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: var(--modal-overlay); z-index: 1000; align-items: center; justify-content: center; backdrop-filter: blur(5px);">\r
    <div class="modal-content-card wallet-modal-card" style="background: var(--modal-bg); border: 1px solid var(--border-color); border-radius: 20px; padding: 35px; width: 100%; max-width: 400px;">\r
        <h3 id="walletModalTitle" style="color: var(--text-primary); text-align: center; margin-bottom: 25px; font-size: 22px; font-weight: 700;">Nova Carteira</h3>\r
        <form id="walletForm" class="wallet-modal-form">\r
            <input type="hidden" id="editWalletIndex" value="-1">\r
            <input type="hidden" id="walletColor" value="#1e293b">\r
\r
            <div class="wallet-form-group" style="margin-bottom: 15px;">\r
                <label style="color: var(--text-secondary); display: block; margin-bottom: 8px; font-size: 14px;">Nome da carteira</label>\r
                <input type="text" id="walletName" placeholder="Ex: Nubank" required class="input">\r
            </div>\r
            \r
            <div class="wallet-form-group" style="margin-bottom: 15px;">\r
                <label style="color: var(--text-secondary); display: block; margin-bottom: 8px; font-size: 14px;">Tipo</label>\r
                <select id="walletType" required class="select">\r
                    <option value="Cart\xE3o de Cr\xE9dito">Cart\xE3o de Cr\xE9dito</option>\r
                    <option value="Cart\xE3o de D\xE9bito">Cart\xE3o de D\xE9bito</option>\r
                    <option value="Vale Alimenta\xE7\xE3o">VA</option>\r
                    <option value="Vale Refei\xE7\xE3o">VR</option>\r
                    <option value="Vale Transporte">VT</option>\r
                </select>\r
            </div>\r
\r
            <div id="limitContainer" class="wallet-form-group" style="margin-bottom: 15px;">\r
                <label id="labelLimit" style="color: var(--text-secondary); display: block; margin-bottom: 8px; font-size: 14px;">Limite</label>\r
                <input type="text" id="walletLimit" placeholder="R$ 0,00" required class="input">\r
                \r
                <div id="unlimitedBox" class="wallet-limit-toggle" style="display: flex; align-items: center; gap: 10px; margin-top: 10px;">\r
                    <input type="checkbox" id="isUnlimited" style="width: 18px; height: 18px; cursor: pointer;">\r
                    <label for="isUnlimited" style="color: var(--text-secondary); font-size: 13px; cursor: pointer;">Cart\xE3o sem limite / Sem Limite</label>\r
                </div>\r
            </div>\r
\r
            <div class="wallet-form-group" style="margin-bottom: 25px;">\r
                <label style="color: var(--text-secondary); display: block; margin-bottom: 10px; font-size: 14px;">Cor do Cart\xE3o</label>\r
                <div id="colorPickerContainer" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px;">\r
                </div>\r
            </div>\r
\r
            <div class="wallet-form-actions" style="display: flex; flex-direction: column; gap: 10px;">\r
                <button type="submit" class="btn btn-primary">Salvar Carteira</button>\r
                <button type="button" onclick="window.CarteirasModulo.fecharModal()" class="btn btn-secondary">Cancelar</button>\r
            </div>\r
        </form>\r
    </div>\r
</div>\r
\r
<div id="walletInfoModal" class="modal-overlay" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: var(--modal-overlay); z-index: 1100; align-items: flex-start; justify-content: center; backdrop-filter: blur(5px); overflow-y: auto; padding: 16px 12px;">\r
    <div class="modal-content-card wallet-info-modal-card" style="background: var(--modal-bg); border: 1px solid var(--border-color); border-radius: 20px; width: 100%; max-width: 980px;">\r
        <button type="button" class="wallet-info-close" id="walletInfoClose" aria-label="Fechar detalhes da carteira">&times;</button>\r
        <div class="wallet-info-header">\r
            <div class="wallet-info-title-group">\r
                <span class="wallet-info-eyebrow">Detalhes da carteira</span>\r
                <h3 id="walletInfoTitle">Carteira</h3>\r
                <p id="walletInfoSubtitle">Veja as despesas pagas com este cart\xE3o ao longo dos meses.</p>\r
            </div>\r
            <div class="wallet-info-filter-group">\r
                <label for="walletExpenseMonthFilter">Filtrar por m\xEAs</label>\r
                <select id="walletExpenseMonthFilter" class="wallet-info-filter-select">\r
                    <option value="all">Todos os meses</option>\r
                    <option value="0">Janeiro</option>\r
                    <option value="1">Fevereiro</option>\r
                    <option value="2">Mar\xE7o</option>\r
                    <option value="3">Abril</option>\r
                    <option value="4">Maio</option>\r
                    <option value="5">Junho</option>\r
                    <option value="6">Julho</option>\r
                    <option value="7">Agosto</option>\r
                    <option value="8">Setembro</option>\r
                    <option value="9">Outubro</option>\r
                    <option value="10">Novembro</option>\r
                    <option value="11">Dezembro</option>\r
                </select>\r
            </div>\r
        </div>\r
\r
        <div class="wallet-info-summary" id="walletInfoSummary"></div>\r
        <div class="wallet-info-list" id="walletExpenseList"></div>\r
    </div>\r
</div>\r
\r
<div id="walletDescriptionModal" class="modal-overlay wallet-description-modal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: var(--modal-overlay); z-index: 1200; align-items: center; justify-content: center; backdrop-filter: blur(4px);">\r
    <div class="wallet-description-modal-card" role="dialog" aria-modal="true" aria-labelledby="walletDescriptionTitle">\r
        <div class="wallet-description-modal-head">\r
            <div>\r
                <span class="wallet-description-modal-eyebrow">Coment\xE1rio</span>\r
                <h3 id="walletDescriptionTitle">Descri\xE7\xE3o da despesa</h3>\r
            </div>\r
            <button type="button" id="walletDescriptionClose" class="wallet-description-close" aria-label="Fechar descri\xE7\xE3o">&times;</button>\r
        </div>\r
        <div id="walletDescriptionBody" class="wallet-description-modal-body"></div>\r
    </div>\r
</div>`;

  // HTML/planejamento.html
  var planejamento_default = `<script>
if (window.top === window.self) {
    window.location.replace('../dashboard.html?section=planejamento#planejamento');
}
<\/script>

<div class="planning-card-prof planning-budget-card">
    <div class="planning-summary-head">
        <div class="planning-summary-copy">
            <h3 style="color: var(--text-primary); margin: 0; font-size: 1.2rem; font-weight: 700;">Or\xE7amento Mensal</h3>
            <p style="color: var(--text-secondary); font-size: 0.85rem; margin: 5px 0 0 0;">Defina seu teto de gastos e monitore a aloca\xE7\xE3o em metas.</p>
        </div>
        <div class="planning-limit-panel">
            <p style="color: var(--text-secondary); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 1px; margin: 0;">LIMITE ESTABELECIDO:</p>
            <div class="planning-limit-display">
                <button class="budget-limit-add-btn" onclick="PlanejamentoModulo.abrirModalAdicionarValor()" 
                        style="background: transparent; border: none; cursor: pointer; padding: 0; display: flex; align-items: center;" 
                        title="Somar ao limite atual">
                    <img src="img/+.png" alt="Adicionar" class="budget-limit-add-icon" style="width: 20px; height: 20px;">
                </button>
                <h3 id="valor-limite-display" style="color: var(--text-primary); margin: 0; font-size: 1.6rem; font-weight: bold;">R$ 0,00</h3>
            </div>
        </div>
    </div>

    <div class="planning-budget-form" style="display: flex; gap: 14px; align-items: center; flex-wrap: wrap;">
        <input type="text" id="orcamentoMensalInput" placeholder="R$ 0,00" 
               class="planning-budget-input"
               style="flex: 1; background: var(--input-bg); border: 1px solid var(--input-border); border-radius: 8px; padding: 12px; color: var(--text-primary); outline: none;">
        <button onclick="PlanejamentoModulo.salvarOrcamento()" class="planning-budget-save"
            style="margin-left: 2px; background: var(--accent); color: var(--text-on-accent); border: none; padding: 12px 30px; border-radius: 8px; font-weight: 800; cursor: pointer;">
            SALVAR
        </button>
    </div>

    <div class="planning-progress-summary">
        <div class="planning-progress-top">
            <span style="color: var(--text-primary); font-size: 0.85rem; font-weight: 600;">Uso do Or\xE7amento <span style="color:var(--text-secondary)">(Alocado em Metas)</span></span>
            <span id="progresso-porcentagem-text" style="color: var(--text-primary); font-size: 0.85rem; font-weight: bold;">0%</span>
        </div>
        <div style="height: 10px; background: var(--border-color); border-radius: 5px; overflow: hidden;">
            <div id="progressBudgetFill" style="width: 0%; height: 100%; background: var(--accent); transition: width 0.3s;"></div>
        </div>
        <div class="planning-progress-bottom">
            <span id="gasto-total-text" style="color: var(--text-primary); font-size: 0.8rem;">R$ 0,00 gastos/alocados</span>
            <span id="disponivel-text" style="color: var(--text-primary); font-size: 0.8rem; font-weight: 600;">Dispon\xEDvel: R$ 0,00</span>
        </div>
    </div>
</div>

<div class="planning-card-prof planning-goals-card" style="margin-top: 2rem;">
    <div class="planning-goals-head">
        <div class="planning-goals-copy">
            <span class="planning-goals-eyebrow">Planejamento de objetivos</span>
            <h3 style="color: var(--text-primary); margin: 0; font-size: 1.2rem; font-weight: 700;">Metas Financeiras</h3>
            <p style="color: var(--text-secondary); font-size: 0.85rem; margin: 5px 0 0 0;">Acompanhe seus objetivos de medio e longo prazo com mais clareza sobre prazo, progresso e valor acumulado.</p>
        </div>
        <button onclick="PlanejamentoModulo.abrirModalNovaMeta()" class="planning-goals-cta"
                style="background: var(--accent); color: var(--text-on-accent); border: none; padding: 12px 24px; border-radius: 10px; font-weight: 800; cursor: pointer;">
            + NOVA META
        </button>
    </div>

    <div class="planning-table-wrap">
    <table class="planning-goals-table" style="width: 100%; border-collapse: collapse;">
        <thead>
            <tr>
                <th>Meta</th>
                <th>Valor Alvo</th>
                <th>Prazo</th>
                <th>Progresso</th>
                <th class="planning-goals-actions-head">A\xE7\xF5es</th>
            </tr>
        </thead>
        <tbody id="goalsTableBody"></tbody>
    </table>
    <div class="planning-goals-empty-state" id="planningGoalsEmptyState" hidden>
        <div class="planning-goals-empty-card">
            <div class="planning-goals-empty-icon" aria-hidden="true"></div>
            <span class="planning-goals-empty-eyebrow">Seu proximo avancao comeca aqui</span>
            <h4 class="planning-goals-empty-title">Nenhuma meta financeira cadastrada.</h4>
            <p class="planning-goals-empty-text">Organize reservas, viagens ou compras futuras com uma meta clara, prazo definido e acompanhamento visual do progresso.</p>
            <button onclick="PlanejamentoModulo.abrirModalNovaMeta()" class="planning-goals-empty-action">Criar primeira meta</button>
        </div>
    </div>
    </div>
</div>

<div id="modalAdicionarLimite" class="planning-modal-overlay" style="display: none;">
    <div class="planning-modal-card planning-limit-modal-card">
        <div class="planning-modal-hero">
            <div class="planning-modal-icon-wrap planning-modal-icon-wrap-money">
                <div class="planning-modal-icon-stage">
                    <img src="./img/moedas.png" alt="Ajustar or\xE7amento" class="planning-modal-icon-image planning-modal-icon-image-money">
                </div>
            </div>
            <div class="planning-modal-copy">
                <span class="planning-modal-eyebrow">Limite estabelecido</span>
                <h3 class="planning-modal-title">Ajustar Or\xE7amento</h3>
                <p class="planning-modal-text">Insira o valor que deseja somar ao seu limite atual e mantenha seu planejamento alinhado ao tema ativo do painel.</p>
            </div>
        </div>

        <div class="planning-modal-field">
            <label class="planning-modal-label" for="valorAdicionalInput">Valor a adicionar (R$)</label>
            <input type="text" id="valorAdicionalInput" placeholder="R$ 0,00" class="planning-modal-input">
            <p class="planning-modal-field-help">O valor informado sera somado ao limite atual do ciclo selecionado.</p>
        </div>

        <div class="planning-modal-actions">
            <button onclick="PlanejamentoModulo.confirmarSomaLimite()" class="planning-modal-confirm">Confirmar</button>
            <button onclick="PlanejamentoModulo.fecharModalAdicionarLimite()" class="planning-modal-cancel">Cancelar</button>
        </div>
    </div>
</div>

<div id="modalNovaMeta" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: var(--modal-overlay); z-index: 1100; align-items: center; justify-content: center; backdrop-filter: blur(4px);">
    <div style="background: var(--modal-bg); border: 1px solid var(--border-color); border-radius: 16px; padding: 30px; width: 100%; max-width: 400px; color: var(--text-primary); box-shadow: 0 24px 48px rgba(15, 23, 42, 0.18);">
        <h3 id="tituloModalMeta" style="margin-top: 0; color: var(--text-primary);">Nova Meta</h3>
        <input type="hidden" id="indexMetaEdicao">
        
        <label style="font-size: 0.8rem; color: var(--text-secondary);">Nome da meta</label>
        <input type="text" id="nomeMeta" placeholder="Ex: Reserva de Emerg\xEAncia" style="width: 100%; background: var(--input-bg); border: 1px solid var(--input-border); padding: 12px; border-radius: 8px; color: var(--text-primary); margin: 8px 0 20px 0; outline: none;">
        
        <label style="font-size: 0.8rem; color: var(--text-secondary);">Valor alvo (R$)</label>
        <input type="text" id="valorAlvoMeta" placeholder="R$ 0,00" style="width: 100%; background: var(--input-bg); border: 1px solid var(--input-border); padding: 12px; border-radius: 8px; color: var(--text-primary); margin: 8px 0 20px 0; outline: none;">
        
        <label style="font-size: 0.8rem; color: var(--text-secondary);">Data limite </label>
        <input type="text" id="prazoMeta" placeholder="00/00/0000" maxlength="10" style="width: 100%; background: var(--input-bg); border: 1px solid var(--input-border); padding: 12px; border-radius: 8px; color: var(--text-primary); margin: 8px 0 5px 0; outline: none;">
        
        <p id="erro-data-meta" style="color: #ef4444; font-size: 0.75rem; margin: 0 0 20px 0; display: none;">Por favor, insira uma data v\xE1lida.</p>

        <div style="display: flex; gap: 10px; margin-top: 15px;">
            <button id="btnSalvarMeta" onclick="PlanejamentoModulo.criarNovaMeta()" style="flex: 1; background: var(--accent); color: var(--text-on-accent); border: none; padding: 12px; border-radius: 8px; font-weight: bold; cursor: pointer;">SALVAR</button>
            <button onclick="PlanejamentoModulo.fecharModalNovaMeta()" style="flex: 1; background: transparent; color: var(--text-secondary); border: 1px solid var(--border-color); padding: 12px; border-radius: 8px; cursor: pointer;">CANCELAR</button>
        </div>
    </div>
</div>

<div id="modalAporteMeta" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: var(--modal-overlay); z-index: 1100; align-items: center; justify-content: center; backdrop-filter: blur(4px);">
    <div style="background: var(--modal-bg); border: 1px solid var(--border-color); border-radius: 16px; padding: 35px; width: 100%; max-width: 400px; box-shadow: 0 24px 48px rgba(15, 23, 42, 0.18);">
        <h3 style="color: var(--text-primary); margin-top: 0;">Adicionar Economia</h3>
        <p style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 25px;">Quanto voc\xEA deseja poupar para esta meta?</p>
        <input type="hidden" id="indexMetaAporte">
        <input type="text" id="valorAporteMetaInput" placeholder="R$ 0,00" 
               style="width: 100%; background: var(--input-bg); border: 1px solid var(--input-border); border-radius: 10px; padding: 15px; color: var(--text-primary); font-size: 1.2rem; margin-bottom: 25px; outline: none;">
        <div style="display: flex; gap: 12px;">
            <button onclick="PlanejamentoModulo.confirmarAporte()" 
                        style="flex: 1; background: var(--accent); color: var(--text-on-accent); border: none; padding: 14px; border-radius: 10px; font-weight: 800; cursor: pointer;">CONFIRMAR</button>
            <button onclick="PlanejamentoModulo.fecharModalAporte()" 
                        style="flex: 1; background: transparent; color: var(--text-secondary); border: 1px solid var(--border-color); padding: 14px; border-radius: 10px; cursor: pointer;">CANCELAR</button>
        </div>
    </div>
</div>

<div id="modalConfirmacaoSistema" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: var(--modal-overlay); z-index: 2000; align-items: center; justify-content: center; backdrop-filter: blur(6px);">
    <div id="confirmModalCard" class="planning-confirm-card planning-confirm-card-danger" style="background: var(--modal-bg); border: 1px solid var(--border-color); border-radius: 16px; padding: 30px; width: 90%; max-width: 350px; text-align: center; box-shadow: 0 24px 48px rgba(15, 23, 42, 0.18);">
        <div id="confirmModalIconWrap" class="planning-confirm-icon-wrap planning-confirm-icon-wrap-danger">
            <div id="confirmModalIconStage" class="planning-confirm-icon-stage planning-confirm-icon-stage-danger">
                <img id="confirmModalIcon" src="./img/lixeira.png" alt="Excluir meta" class="planning-confirm-icon-image planning-confirm-icon-image-danger">
            </div>
        </div>
        <h3 id="confirm-title" class="planning-confirm-title" style="color: var(--text-primary); margin: 0 0 10px 0;">Confirmar</h3>
        <p id="confirm-text" class="planning-confirm-text" style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 25px;">Deseja realizar esta a\xE7\xE3o?</p>
        <div id="confirmValueHighlight" class="planning-confirm-value-highlight" hidden></div>
        <div class="planning-confirm-actions" style="display: flex; gap: 10px;">
            <button id="btn-confirm-yes" class="planning-confirm-button planning-confirm-button-danger" style="flex: 1; background: #ef4444; color: #ffffff; border: none; padding: 12px; border-radius: 8px; font-weight: bold; cursor: pointer;">Confirmar</button>
            <button id="btn-confirm-no" class="planning-confirm-button planning-confirm-button-secondary" style="flex: 1; background: transparent; color: var(--text-secondary); border: 1px solid var(--border-color); padding: 12px; border-radius: 8px; cursor: pointer;">Cancelar</button>
        </div>
    </div>
</div>
`;

  // HTML/relatorios.html
  var relatorios_default = `<script>
if (window.top === window.self) {
    window.location.replace('../dashboard.html?section=relatorios#relatorios');
}
<\/script>

<div class="filter-container reports-toolbar-card">
    <div class="reports-toolbar-main">
        <div class="reports-toolbar-intro">
            <p class="report-eyebrow">Vis\xE3o executiva</p>
            <h2 class="reports-toolbar-title">Relat\xF3rios financeiros</h2>
            <p class="reports-toolbar-description">Uma leitura mais clara do ritmo anual, com foco em varia\xE7\xE3o por ciclo, concentra\xE7\xE3o de despesas e comportamento geral do per\xEDodo.</p>
        </div>

        <div class="reports-year-field">
            <label for="reportYear">Ano</label>
            <select id="reportYear" class="custom-select">
                <option value="2024">2024</option>
                <option value="2025">2025</option>
                <option value="2026" selected>2026</option>
                <option value="2027">2027</option>
            </select>
        </div>
    </div>

    <div id="reportsOverviewMetrics" class="reports-overview-metrics" aria-live="polite"></div>
</div>

<div class="reports-main-layout">
    <div class="chart-card-large">
        <div class="reports-chart-head">
            <div class="reports-title-block">
                <p class="report-eyebrow">An\xE1lise visual</p>
                <h3 class="report-main-title">Comparativo por Ciclo Financeiro</h3>
                <p class="report-subtitle">Acompanhe a distribui\xE7\xE3o dos gastos por ciclo e ajuste a leitura ocultando per\xEDodos espec\xEDficos quando necess\xE1rio.</p>
            </div>
            <div class="report-header-chip" id="reportCycleCountChip">12 ciclos vis\xEDveis</div>
        </div>
        <div class="reports-chart-tools">
            <div class="month-visibility-control" id="monthVisibilityControl">
                <button type="button" class="month-visibility-trigger" id="monthVisibilityTrigger" aria-expanded="false" aria-controls="monthVisibilityPopover">
                    <span>Gerenciar ciclos</span>
                    <span class="month-visibility-count" id="monthVisibilityCount">0</span>
                </button>
                <div class="month-visibility-popover" id="monthVisibilityPopover" hidden>
                    <p class="month-visibility-title">Selecione os ciclos para ocultar</p>
                    <div class="month-visibility-list" id="monthVisibilityList"></div>
                </div>
            </div>
        </div>
        <div class="reports-chart-container">
            <canvas id="comparisonChart"></canvas>
        </div>
        <div id="reportsInsightsContainer" class="reports-insights-grid" aria-live="polite"></div>
    </div>

    <aside class="reports-sidebar">
        <div class="report-card-header">
            <div>
                <p class="report-eyebrow">Leitura r\xE1pida</p>
                <h3>Resumo do Per\xEDodo</h3>
                <p class="report-subtitle">Indicadores-chave do ciclo de refer\xEAncia para leitura r\xE1pida e tomada de decis\xE3o.</p>
            </div>
        </div>
        <div id="resumoPeriodoContainer" class="resumo-list"></div>
    </aside>
</div>

<div class="ranking-card-premium">
    <div class="ranking-header">
        <div class="header-info">
            <h3>Ranking de Maiores Gastos</h3>
            <p>Os lan\xE7amentos de maior peso dentro do ano filtrado, ordenados por impacto financeiro.</p>
        </div>
        <div class="header-badge">Top 5</div>
    </div>

    <div id="rankingGastosContainer" class="ranking-list-container">
        </div>
</div>
`;

  // HTML/perfil.html
  var perfil_default = `<script>
if (window.top === window.self) {
    window.location.replace('../dashboard.html?section=perfil#perfil');
}
<\/script>

<div class="perfil-container">
    <div class="perfil-card main-info">
        <div class="profile-header">
            <div class="avatar-upload-group">
                <div class="avatar-shell">
                    <button type="button" class="avatar-upload-trigger" id="avatarUploadTrigger" aria-label="Selecionar foto de perfil">
                        <div class="avatar-large" id="avatarIcon">
                            <span>JS</span>
                        </div>
                    </button>
                    <button type="button" class="avatar-edit-floating" id="avatarEditFrameBtn" aria-label="Editar enquadramento da foto" hidden>
                        <img src="./img/lapis-clean.png" alt="Editar enquadramento">
                    </button>
                </div>
                <div class="avatar-actions-row">
                    <button type="button" class="btn-primary-perfil avatar-change-btn" id="avatarChangeBtn">Escolher foto</button>
                    <button type="button" class="btn-link-sm avatar-remove-btn" id="avatarRemoveBtn" hidden>Remover foto</button>
                </div>
                <input type="file" id="perfilFotoInput" accept="image/*" hidden>
            </div>
            <div class="profile-details">
                <span class="profile-eyebrow">Perfil</span>
                <h2 id="userNameDisplay">Jo\xE3o Silva</h2>
                <p id="userEmailDisplay">joao@exemplo.com</p>
                <div class="profile-inline-actions">
                    <button class="btn-outline-sm" onclick="PerfilModulo.abrirModalSenha()">Alterar Senha</button>
                </div>
                <div class="avatar-feedback" id="avatarFeedback" hidden></div>
            </div>
        </div>

        <div class="stats-grid">
            <div class="stat-box income-box" onclick="PerfilModulo.abrirDetalhamento('receitas')">
                <div class="stat-icon-circle">\u2191</div>
                <div class="stat-content">
                    <span>Or\xE7amento Mensal (Receita)</span>
                    <h3 id="totalReceitas">R$ 0,00</h3>
                    <small>Clique para detalhes</small>
                </div>
            </div>
            <div class="stat-box expense-box" onclick="PerfilModulo.abrirDetalhamento('despesas')">
                <div class="stat-icon-circle">\u2193</div>
                <div class="stat-content">
                    <span>Total de Despesas</span>
                    <h3 id="totalDespesas">R$ 0,00</h3>
                    <small>Clique para detalhes</small>
                </div>
            </div>
        </div>
    </div>

    <div class="perfil-card edit-info">
        <h3 class="card-subtitle">Dados Pessoais</h3>
        <form id="formPerfil">
            <div class="form-row-2col">
                <div class="form-group">
                    <label>Nome</label>
                    <input type="text" id="perfilNome" value="Jo\xE3o">
                </div>
                <div class="form-group">
                    <label>Sobrenome</label>
                    <input type="text" id="perfilSobrenome" value="Silva">
                </div>
            </div>
            <div class="form-group">
                <label>E-mail</label>
                <input type="email" id="perfilEmail" value="joao@exemplo.com">
            </div>
            <div class="form-group">
            <label>CPF</label>
            <input type="text" class="input-readonly" value="384.XXX.XXX-06" readonly>
        </div>
        <div class="form-row-2col">
            <div class="form-group">
                <label>Estado</label>
                <input type="text" class="input-readonly" value="S\xE3o Paulo" readonly>
            </div>
            <div class="form-group">
                <label>Cidade</label>
                <input type="text" class="input-readonly" value="S\xE3o Paulo" readonly>
            </div>
        </div>
            <div class="form-actions">
                <button type="submit" id="btnSalvarPerfil" class="btn-primary-perfil" disabled>Salvar Altera\xE7\xF5es</button>
            </div>
        </form>
    </div>
</div>

<div id="modalDetalhamento" class="modal-overlay" style="display:none;">
    <div class="modal-card detail-modal-card">
        <div class="modal-header detail-modal-header">
            <div class="detail-title-block">
                <span class="detail-kicker" id="modalDetalhamentoKicker">Resumo financeiro</span>
                <h2 id="modalDetalhamentoTitulo">Detalhamento</h2>
                <p class="detail-description" id="modalDetalhamentoDescricao">Resumo por per\xEDodo.</p>
            </div>
            <button type="button" class="btn-close-x" onclick="PerfilModulo.fecharModal('modalDetalhamento')" aria-label="Fechar detalhamento">&times;</button>
        </div>
        <div class="modal-body detail-modal-body">
            <div class="detail-filter-shell">
                <div class="detail-filter-grid">
                    <div class="detail-filter-group">
                        <label for="filtroEscopo">Base do filtro</label>
                        <select id="filtroEscopo" class="perfil-select-modern">
                            <option value="atual">Ciclo atual</option>
                            <option value="mes">Outros ciclos do ano</option>
                        </select>
                    </div>
                    <div class="detail-filter-group">
                        <label for="filtroPeriodo" id="filtroPeriodoLabel">Janela de an\xE1lise</label>
                        <select id="filtroPeriodo" class="perfil-select-modern"></select>
                    </div>
                </div>
            </div>
            <div id="detalhamentoResumo" class="detail-summary-grid" aria-live="polite"></div>
            <div id="listaDetalhada" class="perfil-scroll-container detail-scroll-panel" aria-live="polite"></div>
        </div>
        <div class="modal-footer detail-modal-footer">
            <button type="button" class="btn-primary-full" onclick="PerfilModulo.fecharModal('modalDetalhamento')">Fechar</button>
        </div>
    </div>
</div>

<div id="modalSenha" class="modal-overlay" style="display:none;">
    <div class="modal-card">
        <div class="modal-header">
            <h2>Seguran\xE7a da Conta</h2>
            <button class="btn-close-x" onclick="PerfilModulo.fecharModal('modalSenha')">&times;</button>
        </div>
        <form id="formSenha" class="modal-body">
            <p class="modal-instruction">Para sua seguran\xE7a, digite a senha atual e defina uma nova com pelo menos 8 caracteres.</p>
            <div class="form-group">
                <label>Senha Atual</label>
                <input type="password" id="senhaAtual" placeholder="\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" required>
            </div>
            <div class="form-group">
                <label>Nova Senha</label>
                <input type="password" id="novaSenha" placeholder="M\xEDnimo 8 caracteres" required>
            </div>
            <div class="form-group">
                <label>Confirmar Nova Senha</label>
                <input type="password" id="confirmaSenha" placeholder="\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" required>
            </div>
            <div class="password-rules-card" aria-label="Regras de senha">
                <p class="password-rules-title">A senha deve conter:</p>
                <ul class="password-rules-list">
                    <li>No m\xEDnimo 8 caracteres</li>
                    <li>No m\xEDnimo 1 letra mai\xFAscula</li>
                    <li>No m\xEDnimo 1 letra min\xFAscula</li>
                    <li>No m\xEDnimo 1 caractere especial</li>
                </ul>
            </div>
            <div class="form-feedback" id="perfilPasswordFeedback" role="alert" aria-live="polite" hidden></div>
            <div class="modal-footer-actions">
                <button type="button" class="btn-link-sm">Esqueceu a senha?</button>
                <button type="submit" class="btn-accent-blue">Confirmar Altera\xE7\xE3o</button>
            </div>
        </form>
    </div>
</div>

<div id="modalAvatarEditor" class="modal-overlay" style="display:none;">
    <div class="modal-card avatar-editor-card">
        <div class="modal-header avatar-editor-header">
            <div>
                <h2>Ajustar enquadramento</h2>
                <p class="avatar-editor-subtitle">Posicione a foto como quiser antes de aplicar ao perfil.</p>
            </div>
            <button class="btn-close-x" type="button" onclick="PerfilModulo.cancelarEdicaoFoto()">&times;</button>
        </div>
        <div class="modal-body avatar-editor-body">
            <div class="avatar-editor-preview-wrap">
                <div class="avatar-editor-preview-frame" id="avatarEditorFrame">
                    <img id="avatarEditorImage" alt="Pr\xE9-visualiza\xE7\xE3o do enquadramento da foto">
                </div>
            </div>
            <div class="avatar-editor-controls">
                <div class="avatar-editor-control">
                    <label for="avatarEditorZoom">Zoom</label>
                    <input type="range" id="avatarEditorZoom" min="100" max="300" value="100">
                </div>
                <div class="avatar-editor-control">
                    <label for="avatarEditorOffsetX">Horizontal</label>
                    <input type="range" id="avatarEditorOffsetX" min="-100" max="100" value="0">
                </div>
                <div class="avatar-editor-control">
                    <label for="avatarEditorOffsetY">Vertical</label>
                    <input type="range" id="avatarEditorOffsetY" min="-100" max="100" value="0">
                </div>
            </div>
        </div>
        <div class="modal-footer avatar-editor-footer">
            <button type="button" class="btn-link-sm avatar-editor-cancel" onclick="PerfilModulo.cancelarEdicaoFoto()">Cancelar</button>
            <button type="button" class="btn-primary-perfil" id="avatarEditorApplyBtn">Aplicar enquadramento</button>
        </div>
    </div>
</div>
`;

  // HTML/configuracoes.html
  var configuracoes_default = `<script>
if (window.top === window.self) {
    window.location.replace('../dashboard.html?section=configuracoes#configuracoes');
}
<\/script>

<div class="config-container">

    <div class="config-card">
        <h3 class="card-subtitle">Prefer\xEAncias do Sistema</h3>
        
        <form id="formConfiguracoes">
            <div class="form-group">
                <label for="selectMoeda" class="form-label">Moeda Principal</label>
                <select id="selectMoeda" class="select">
                    <option value="BRL">R$ - Real Brasileiro</option>
                    <option value="USD">$ - D\xF3lar Americano</option>
                    <option value="EUR">\u20AC - Euro</option>
                    <option value="GBP">\xA3 - Libra Esterlina</option>
                </select>
            </div>

            <div class="form-group">
                <label class="form-label">Temas por modo</label>
                <div class="theme-select-grid">
                    <div class="theme-select-card">
                        <label for="selectCorTemaClaro" class="form-label form-label-inline">Tema do modo claro</label>
                        <select id="selectCorTemaClaro" class="select">
                            <option value="azul">azul (padr\xE3o)</option>
                            <option value="dourado">Dourado</option>
                            <option value="oceano">Oceano</option>
                            <option value="grafite">Grafite</option>
                            <option value="aurora">Aurora</option>
                            <option value="terracota">Terracota</option>
                        </select>
                    </div>
                    <div class="theme-select-card">
                        <label for="selectCorTemaEscuro" class="form-label form-label-inline">Tema do modo escuro</label>
                        <select id="selectCorTemaEscuro" class="select">
                            <option value="dourado">dourado (padr\xE3o)</option>
                            <option value="azul">Azul</option>
                            <option value="oceano">Oceano</option>
                            <option value="grafite">Grafite</option>
                            <option value="aurora">Aurora</option>
                            <option value="terracota">Terracota</option>
                        </select>
                    </div>
                </div>
                <p class="theme-helper-text">Defina uma cor para cada modo. Ao alternar claro e escuro, o sistema usa automaticamente a cor correspondente.</p>
            </div>

            <div class="form-group">
                <label for="selectDiaVirada" class="form-label">Dia da virada do ciclo</label>
                <select id="selectDiaVirada" class="select">
                    <option value="1">Dia 1</option>
                    <option value="5">Dia 5</option>
                    <option value="10">Dia 10</option>
                    <option value="15">Dia 15</option>
                    <option value="20">Dia 20</option>
                    <option value="25">Dia 25</option>
                </select>
            </div>

            <hr class="config-divider">

            <div class="config-section">
                <div class="config-item">
                    <div class="config-info">
                        <strong>Modo Escuro</strong>
                        <p>Usar tema escuro como padr\xE3o</p>
                    </div>
                    <label class="switch">
                        <input type="checkbox" id="checkTemaEscuro" checked>
                        <span class="slider"></span>
                    </label>
                </div>
            </div>

            <hr class="config-divider">

            <div class="config-section">
                <h4 class="section-inner-title">Notifica\xE7\xF5es</h4>
                
                <div class="config-item">
                    <div class="config-info">
                        <strong>Ativar Notifica\xE7\xF5es</strong>
                        <p>Permitir alertas do sistema no navegador</p>
                    </div>
                    <label class="switch">
                        <input type="checkbox" id="checkNotificacoesGeral">
                        <span class="slider"></span>
                    </label>
                </div>

                <div class="config-item sub-item">
                    <div class="config-info">
                        <strong>Alertas de Or\xE7amento</strong>
                        <p>Notificar ao se aproximar do limite</p>
                    </div>
                    <label class="switch">
                        <input type="checkbox" id="checkAlertaOrcamento">
                        <span class="slider"></span>
                    </label>
                </div>

                <div class="config-item sub-item">
                    <div class="config-info">
                        <strong>Alertas de Or\xE7amento (Meta)</strong>
                        <p>Notificar ao se aproximar do limite estabelecido</p>
                    </div>
                    <label class="switch">
                        <input type="checkbox" id="checkAlertaOrcamentoMeta">
                        <span class="slider"></span>
                    </label>
                </div>

                <div class="config-item sub-item">
                    <div class="config-info">
                        <strong>Lembretes de Metas</strong>
                        <p>Ser notificado sobre prazos das metas</p>
                    </div>
                    <label class="switch">
                        <input type="checkbox" id="checkLembreteMetas">
                        <span class="slider"></span>
                    </label>
                </div>
            </div>

            <div class="form-actions">
                <button type="button" class="btn btn-secondary" id="btnAbrirTutorial">Ver tutorial novamente</button>
                <button type="submit" class="btn btn-primary">Salvar Configura\xE7\xF5es</button>
            </div>
        </form>
    </div>
</div>
`;

  // js/main.js
  window.Painel = Painel;
  window.DespesasModulo = DespesasModulo;
  window.RelatoriosModulo = RelatoriosModulo;
  window.PlanejamentoModulo = PlanejamentoModulo;
  window.CarteirasModulo = CarteirasModulo;
  window.PerfilModulo = PerfilModulo;
  window.ConfiguracoesModulo = ConfiguracoesModulo;
  var modulos = {
    "painel": Painel,
    "despesas": DespesasModulo,
    "relatorios": RelatoriosModulo,
    "planejamento": PlanejamentoModulo,
    "carteiras": CarteirasModulo,
    "perfil": PerfilModulo,
    "configuracoes": ConfiguracoesModulo
  };
  var secoesHtml = {
    "painel": painel_default,
    "despesas": despesas_default,
    "carteiras": carteiras_default,
    "planejamento": planejamento_default,
    "relatorios": relatorios_default,
    "perfil": perfil_default,
    "configuracoes": configuracoes_default
  };
  var secaoAtiva = "painel";
  var LOGIN_SESSION_KEY = "visionFinance_justLoggedIn";
  var TOTAL_TUTORIAL_STEPS = 7;
  var NOTIFICATION_SEEN_STORAGE_KEY = "visionFinance_notification_seen";
  var NOTIFICATION_BROWSER_SENT_STORAGE_KEY = "visionFinance_notification_browser_sent";
  var NOTIFICATION_FEED_STORAGE_KEY = "visionFinance_notification_feed";
  var NOTIFICATION_BUDGET_MILESTONES = [
    { key: "100", ratio: 1, percentage: 100 },
    { key: "90", ratio: 0.9, percentage: 90 },
    { key: "75", ratio: 0.75, percentage: 75 },
    { key: "50", ratio: 0.5, percentage: 50 }
  ];
  var NOTIFICATION_PROGRESS_MILESTONES = [
    { key: "100", ratio: 1, percentage: 100 },
    { key: "95", ratio: 0.95, percentage: 95 },
    { key: "75", ratio: 0.75, percentage: 75 },
    { key: "50", ratio: 0.5, percentage: 50 }
  ];
  var NOTIFICATION_DEADLINE_MILESTONES = [
    { key: "due-today", label: "vence hoje", months: 0, severity: "critical" },
    { key: "1-day", label: "1 dia", days: 1, severity: "critical" },
    { key: "3-days", label: "3 dias", days: 3, severity: "critical" },
    { key: "5-days", label: "5 dias", days: 5, severity: "warning" },
    { key: "10-days", label: "10 dias", days: 10, severity: "warning" },
    { key: "15-days", label: "15 dias", days: 15, severity: "warning" },
    { key: "1-month", label: "1 mes", months: 1, severity: "warning" },
    { key: "2-months", label: "2 meses", months: 2, severity: "info" },
    { key: "3-months", label: "3 meses", months: 3, severity: "info" },
    { key: "6-months", label: "6 meses", months: 6, severity: "info" }
  ];
  var notificationCenterState = {
    isOpen: false,
    currentIds: []
  };
  var TUTORIAL_SECTIONS = [
    {
      title: "Painel",
      subtitle: "Vis\xE3o consolidada da sua vida financeira",
      description: "Acompanhe saldo dispon\xEDvel, distribui\xE7\xE3o dos gastos, metas e os indicadores mais importantes logo no primeiro acesso.",
      badge: "Resumo em tempo real",
      stat: "Indicadores e atalhos",
      accent: "01",
      imageLight: "./img/dashboard-modo.claro.jpeg",
      imageDark: "./img/dashboard-modo.escuro.jpeg",
      imageAlt: "Pr\xE9via da tela de painel do Vision Finance"
    },
    {
      title: "Despesas",
      subtitle: "Registro r\xE1pido dos seus lan\xE7amentos",
      description: "Cadastre despesas com categoria, forma de pagamento, data e observa\xE7\xF5es para manter o hist\xF3rico sempre organizado.",
      badge: "Controle di\xE1rio",
      stat: "Categorias e filtros",
      accent: "02",
      imageLight: "./img/despesas-modo.claro.jfif",
      imageDark: "./img/despesas-modo.escuro.jfif",
      imageAlt: "Pr\xE9via da tela de despesas do Vision Finance"
    },
    {
      title: "Carteiras",
      subtitle: "Gerencie contas, cart\xF5es e saldos",
      description: "Centralize suas carteiras para visualizar limites, gastos acumulados e distribui\xE7\xE3o entre meios de pagamento.",
      badge: "Meios de pagamento",
      stat: "Saldo por carteira",
      accent: "03",
      imageLight: "./img/carteiras-modo.claro.jfif",
      imageDark: "./img/carteiras-modo.escuro.jfif",
      imageAlt: "Pr\xE9via da tela de carteiras do Vision Finance"
    },
    {
      title: "Planejamento",
      subtitle: "Defina metas e acompanhe evolu\xE7\xE3o",
      description: "Estabele\xE7a objetivos financeiros, acompanhe aportes por ciclo e enxergue com clareza o que falta para cada meta.",
      badge: "Objetivos mensais",
      stat: "Metas por ciclo",
      accent: "04",
      imageLight: "./img/planejamento-modo.claro.jfif",
      imageDark: "./img/planejamento-modo.escuro.jfif",
      imageAlt: "Pr\xE9via da tela de planejamento do Vision Finance"
    },
    {
      title: "Relat\xF3rios",
      subtitle: "Leitura anal\xEDtica dos seus h\xE1bitos",
      description: "Use gr\xE1ficos, rankings e comparativos para entender tend\xEAncias e tomar decis\xF5es melhores com base nos dados.",
      badge: "Insights visuais",
      stat: "Comparativos e tend\xEAncias",
      accent: "05",
      imageLight: "./img/relatorio-modo.claro.jfif",
      imageDark: "./img/relatorio-modo.escuro.jfif",
      imageAlt: "Pr\xE9via da tela de relat\xF3rios do Vision Finance"
    },
    {
      title: "Perfil",
      subtitle: "Identidade e informa\xE7\xF5es da conta",
      description: "Atualize seus dados pessoais, sua foto e os detalhes que personalizam a experi\xEAncia do seu ambiente.",
      badge: "Dados do usu\xE1rio",
      stat: "Personaliza\xE7\xE3o da conta",
      accent: "06",
      imageLight: "./img/perfil-modo.claro.jfif",
      imageDark: "./img/perfil-modo.escuro.jpeg",
      imageAlt: "Pr\xE9via da tela de perfil do Vision Finance"
    }
  ];
  var TUTORIAL_COLOR_LABELS = {
    azul: "Azul",
    dourado: "Dourado",
    oceano: "Oceano",
    grafite: "Grafite",
    aurora: "Aurora",
    terracota: "Terracota"
  };
  var TUTORIAL_CURRENCY_LABELS = {
    BRL: "Real Brasileiro",
    USD: "D\xF3lar Americano",
    EUR: "Euro",
    GBP: "Libra Esterlina"
  };
  function renderTutorialColorChoices(setting, selectedValue) {
    return Object.entries(TUTORIAL_COLOR_LABELS).map(([value, label]) => `<button type="button" class="tutorial-choice-btn ${selectedValue === value ? "is-active" : ""}" data-setting="${setting}" data-value="${value}">${label}</button>`).join("");
  }
  var tutorialElements = null;
  var tutorialDraftSettings = null;
  function animarEntradaSecao(container) {
    if (!container) return;
    const explicitItems = Array.from(container.querySelectorAll("[data-animate]"));
    const animatedItems = explicitItems.length ? explicitItems : Array.from(container.children).filter((element) => element instanceof HTMLElement);
    if (!explicitItems.length) {
      animatedItems.forEach((element) => element.classList.add("section-animate"));
    }
    if (!animatedItems.length) return;
    animatedItems.forEach((element, index) => {
      element.classList.remove("is-visible");
      element.style.transitionDelay = `${Math.min(index * 55, 260)}ms`;
    });
    requestAnimationFrame(() => {
      animatedItems.forEach((element) => element.classList.add("is-visible"));
    });
  }
  function getTutorialCurrentStep() {
    return getTutorialState().currentStep ?? 0;
  }
  function escapeHtml(value = "") {
    return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
  }
  function getTutorialDraftSettings() {
    if (tutorialDraftSettings) return tutorialDraftSettings;
    const settings = getThemeSettings();
    tutorialDraftSettings = {
      moeda: settings.moeda || "BRL",
      corTemaClaro: settings.corTemaClaro || settings.corTema || "azul",
      corTemaEscuro: settings.corTemaEscuro || settings.corTema || "dourado",
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
    return isDark ? "Escuro" : "Claro";
  }
  function getNotificationSummary(notificacoes = {}) {
    const activeItems = [
      notificacoes.geral ? "Geral" : null,
      notificacoes.orcamento ? "Or\xE7amento" : null,
      notificacoes.orcamentoMeta ? "Meta de or\xE7amento" : null,
      notificacoes.metas ? "Metas" : null
    ].filter(Boolean);
    return activeItems.length ? activeItems.join(", ") : "Desativadas";
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
      dataAtualizacao: (/* @__PURE__ */ new Date()).toISOString()
    };
    const saved = setThemeSettings(nextSettings);
    ensureFinancialDataIntegrity();
    window.dispatchEvent(new CustomEvent("settingsUpdated", { detail: saved }));
    return saved;
  }
  function cacheTutorialElements() {
    if (tutorialElements) return tutorialElements;
    tutorialElements = {
      overlay: document.getElementById("tutorialOverlay"),
      content: document.getElementById("tutorialContent"),
      title: document.getElementById("tutorialTitle"),
      description: document.getElementById("tutorialDescription"),
      counter: document.getElementById("tutorialStepCounter"),
      progressFill: document.getElementById("tutorialProgressFill"),
      previousButton: document.getElementById("tutorialPrevBtn"),
      nextButton: document.getElementById("tutorialNextBtn"),
      laterButton: document.getElementById("tutorialLaterBtn")
    };
    return tutorialElements;
  }
  function renderTutorialIntroPage() {
    return `
        <div class="tutorial-intro-page">
            <section class="tutorial-intro-card">
                <span class="tutorial-eyebrow">Boas-vindas</span>
                <h3>Vamos come\xE7ar o tutorial?</h3>
                <p>Conhe\xE7a rapidamente as \xE1reas principais do Vision Finance e finalize suas prefer\xEAncias iniciais antes do primeiro uso.</p>
                <div class="tutorial-intro-points">
                    <div class="tutorial-intro-point">
                        <strong>Vis\xE3o r\xE1pida do sistema</strong>
                        <span>Painel, despesas, carteiras, planejamento, relat\xF3rios e perfil.</span>
                    </div>
                    <div class="tutorial-intro-point">
                        <strong>Configura\xE7\xE3o inicial guiada</strong>
                        <span>Ao final, voc\xEA define ciclo, moeda, tema, modo visual e notifica\xE7\xF5es.</span>
                    </div>
                    <div class="tutorial-intro-point">
                        <strong>Voc\xEA pode retomar depois</strong>
                        <span>Se preferir, escolha Talvez mais tarde e volte no pr\xF3ximo login.</span>
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
    const sectionVisual = imageSource ? `
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
                        alt="${escapeHtml(section.imageAlt)} no modo ${isDark ? "escuro" : "claro"}"
                        class="tutorial-panel-image"
                    >
                </div>
            </div>
        ` : `
            <div class="tutorial-placeholder">
                <div class="tutorial-icon-badge">${escapeHtml(section.accent)}</div>
                <div>
                    <p class="tutorial-eyebrow">Imagem da tela</p>
                    <h3>${escapeHtml(section.title)}</h3>
                    <p>Placeholder pronto para receber uma captura ou ilustra\xE7\xE3o dessa \xE1rea futuramente.</p>
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
                    <span class="tutorial-eyebrow">Se\xE7\xE3o ${step}</span>
                    <h3>${escapeHtml(section.subtitle)}</h3>
                </div>
                <p>${escapeHtml(section.description)}</p>
                <div class="tutorial-feature-list">
                    <div class="tutorial-feature-item">
                        <span class="tutorial-feature-dot" aria-hidden="true"></span>
                        <div>
                            <strong>Navega\xE7\xE3o dedicada</strong>
                            <span>Acesse ${escapeHtml(section.title.toLowerCase())} pela barra lateral quando precisar.</span>
                        </div>
                    </div>
                    <div class="tutorial-feature-item">
                        <span class="tutorial-feature-dot" aria-hidden="true"></span>
                        <div>
                            <strong>Leitura consistente</strong>
                            <span>Essa \xE1rea segue tema, moeda e ciclo definidos por voc\xEA.</span>
                        </div>
                    </div>
                </div>
            </article>
            <article class="tutorial-visual" aria-label="Pr\xE9via da se\xE7\xE3o ${escapeHtml(section.title)}">
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
                                <span>Ciclo e moeda padr\xE3o</span>
                            </div>
                            <div class="tutorial-form-grid tutorial-form-grid-basic">
                                <div class="tutorial-field">
                                    <label for="tutorialTurnDay">Virada do ciclo</label>
                                    <select id="tutorialTurnDay" data-setting="diaViradaMes">
                                        <option value="1" ${draft.diaViradaMes === 1 ? "selected" : ""}>Dia 1</option>
                                        <option value="5" ${draft.diaViradaMes === 5 ? "selected" : ""}>Dia 5</option>
                                        <option value="10" ${draft.diaViradaMes === 10 ? "selected" : ""}>Dia 10</option>
                                        <option value="15" ${draft.diaViradaMes === 15 ? "selected" : ""}>Dia 15</option>
                                        <option value="20" ${draft.diaViradaMes === 20 ? "selected" : ""}>Dia 20</option>
                                        <option value="25" ${draft.diaViradaMes === 25 ? "selected" : ""}>Dia 25</option>
                                    </select>
                                </div>
                                <div class="tutorial-field">
                                    <label for="tutorialCurrency">Moeda</label>
                                    <select id="tutorialCurrency" data-setting="moeda">
                                        <option value="BRL" ${draft.moeda === "BRL" ? "selected" : ""}>R$ - Real Brasileiro</option>
                                        <option value="USD" ${draft.moeda === "USD" ? "selected" : ""}>$ - D\xF3lar Americano</option>
                                        <option value="EUR" ${draft.moeda === "EUR" ? "selected" : ""}>\u20AC - Euro</option>
                                        <option value="GBP" ${draft.moeda === "GBP" ? "selected" : ""}>\xA3 - Libra Esterlina</option>
                                    </select>
                                </div>
                            </div>
                        </section>

                        <section class="tutorial-config-card">
                            <div class="tutorial-config-card-header">
                                <strong>Apar\xEAncia</strong>
                                <span>Escolha o estilo visual ideal</span>
                            </div>
                            <div class="tutorial-field tutorial-field-full">
                                <label>Tema do modo claro</label>
                                <div class="tutorial-choice-grid" data-setting-group="corTemaClaro">
                                    ${renderTutorialColorChoices("corTemaClaro", draft.corTemaClaro)}
                                </div>
                            </div>
                            <div class="tutorial-field tutorial-field-full">
                                <label>Tema do modo escuro</label>
                                <div class="tutorial-choice-grid" data-setting-group="corTemaEscuro">
                                    ${renderTutorialColorChoices("corTemaEscuro", draft.corTemaEscuro)}
                                </div>
                            </div>
                            <div class="tutorial-field tutorial-field-full">
                                <label>Modo visual</label>
                                <div class="tutorial-choice-grid tutorial-choice-grid-compact" data-setting-group="temaEscuro">
                                    <button type="button" class="tutorial-choice-btn ${draft.temaEscuro ? "" : "is-active"}" data-setting="temaEscuro" data-value="false">Claro</button>
                                    <button type="button" class="tutorial-choice-btn ${draft.temaEscuro ? "is-active" : ""}" data-setting="temaEscuro" data-value="true">Escuro</button>
                                </div>
                            </div>
                        </section>

                        <section class="tutorial-config-card">
                            <div class="tutorial-config-card-header">
                                <strong>Notifica\xE7\xF5es</strong>
                                <span>Defina quais alertas permanecem ativos</span>
                            </div>
                            <div class="tutorial-toggle-list tutorial-toggle-list-rich">
                                <label class="tutorial-toggle tutorial-toggle-rich">
                                    <input type="checkbox" data-setting="notificacoes.geral" ${notificationGeneral ? "checked" : ""}>
                                    <span>
                                        <strong>Geral</strong>
                                        <small>Ativa os demais alertas</small>
                                    </span>
                                </label>
                                <label class="tutorial-toggle tutorial-toggle-rich">
                                    <input type="checkbox" data-setting="notificacoes.orcamento" ${draft.notificacoes.orcamento ? "checked" : ""} ${notificationGeneral ? "" : "disabled"}>
                                    <span>
                                        <strong>Or\xE7amento</strong>
                                        <small>Limites do m\xEAs</small>
                                    </span>
                                </label>
                                <label class="tutorial-toggle tutorial-toggle-rich">
                                    <input type="checkbox" data-setting="notificacoes.orcamentoMeta" ${draft.notificacoes.orcamentoMeta ? "checked" : ""} ${notificationGeneral ? "" : "disabled"}>
                                    <span>
                                        <strong>Meta</strong>
                                        <small>Avisos de or\xE7amento-meta</small>
                                    </span>
                                </label>
                                <label class="tutorial-toggle tutorial-toggle-rich">
                                    <input type="checkbox" data-setting="notificacoes.metas" ${draft.notificacoes.metas ? "checked" : ""} ${notificationGeneral ? "" : "disabled"}>
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
                            <h4>Como seu ambiente ficar\xE1</h4>
                            <p>Essas escolhas ser\xE3o usadas nas pr\xF3ximas sess\xF5es e podem ser alteradas depois em Configura\xE7\xF5es.</p>
                            <div class="tutorial-summary-list tutorial-summary-list-professional">
                                <div class="tutorial-summary-item"><span>Ciclo financeiro</span><strong>Dia ${draft.diaViradaMes}</strong></div>
                                <div class="tutorial-summary-item"><span>Moeda principal</span><strong>${escapeHtml(TUTORIAL_CURRENCY_LABELS[draft.moeda] || draft.moeda)}</strong></div>
                                <div class="tutorial-summary-item"><span>Tema modo claro</span><strong>${escapeHtml(TUTORIAL_COLOR_LABELS[draft.corTemaClaro] || draft.corTemaClaro)}</strong></div>
                                <div class="tutorial-summary-item"><span>Tema modo escuro</span><strong>${escapeHtml(TUTORIAL_COLOR_LABELS[draft.corTemaEscuro] || draft.corTemaEscuro)}</strong></div>
                                <div class="tutorial-summary-item"><span>Modo visual</span><strong>${escapeHtml(getThemeModeLabel(draft.temaEscuro))}</strong></div>
                                <div class="tutorial-summary-item tutorial-summary-item-stack"><span>Notifica\xE7\xF5es ativas</span><strong>${escapeHtml(getNotificationSummary(draft.notificacoes))}</strong></div>
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
    elements.title.textContent = isIntroStep ? "Vamos come\xE7ar o tutorial" : isSetupStep ? "Finalize sua configura\xE7\xE3o inicial" : `Conhe\xE7a a se\xE7\xE3o ${TUTORIAL_SECTIONS[step - 1].title}`;
    elements.description.textContent = isIntroStep ? "Veja um guia curto antes de acessar o sistema pela primeira vez." : isSetupStep ? "Defina suas prefer\xEAncias principais antes de come\xE7ar a usar o painel." : "Cada etapa resume uma \xE1rea principal do Vision Finance antes do primeiro uso.";
    elements.counter.textContent = isIntroStep ? "Introdu\xE7\xE3o" : `Passo ${step} de ${TOTAL_TUTORIAL_STEPS}`;
    elements.progressFill.style.width = `${isIntroStep ? 0 : step / TOTAL_TUTORIAL_STEPS * 100}%`;
    elements.nextButton.textContent = isIntroStep ? "Vamos!" : isSetupStep ? "Concluir tutorial" : "Pr\xF3ximo";
    elements.previousButton.hidden = isIntroStep;
    elements.laterButton.hidden = !isIntroStep;
  }
  function bindTutorialSetupEvents() {
    const elements = cacheTutorialElements();
    if (!elements.content) return;
    elements.content.querySelectorAll('[data-setting="corTemaClaro"], [data-setting="corTemaEscuro"], [data-setting="temaEscuro"]').forEach((button) => {
      button.addEventListener("click", () => {
        const setting = button.dataset.setting;
        const rawValue = button.dataset.value;
        const parsedValue = rawValue === "true" ? true : rawValue === "false" ? false : rawValue;
        getTutorialDraftSettings()[setting] = parsedValue;
        persistTutorialPreferences();
        renderTutorialStep(TOTAL_TUTORIAL_STEPS);
      });
    });
    elements.content.querySelectorAll("select[data-setting]").forEach((select) => {
      select.addEventListener("change", () => {
        const setting = select.dataset.setting;
        getTutorialDraftSettings()[setting] = setting === "diaViradaMes" ? Number(select.value) : select.value;
        persistTutorialPreferences();
        renderTutorialStep(TOTAL_TUTORIAL_STEPS);
      });
    });
    elements.content.querySelectorAll('input[type="checkbox"][data-setting]').forEach((input) => {
      input.addEventListener("change", () => {
        const path = input.dataset.setting;
        if (path === "notificacoes.geral") {
          getTutorialDraftSettings().notificacoes.geral = input.checked;
          if (!input.checked) {
            getTutorialDraftSettings().notificacoes.orcamento = false;
            getTutorialDraftSettings().notificacoes.orcamentoMeta = false;
            getTutorialDraftSettings().notificacoes.metas = false;
          }
        } else {
          const key = path.split(".")[1];
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
    elements.content.innerHTML = normalizedStep === 0 ? renderTutorialIntroPage() : normalizedStep === TOTAL_TUTORIAL_STEPS ? renderTutorialSetupPage() : renderTutorialSectionPage(normalizedStep);
    if (normalizedStep === TOTAL_TUTORIAL_STEPS) {
      bindTutorialSetupEvents();
    }
  }
  function openTutorial(options = {}) {
    const elements = cacheTutorialElements();
    if (!elements.overlay) return;
    const startStep = Number(options.startStep);
    const resolvedStep = Number.isFinite(startStep) ? Math.min(Math.max(startStep, 0), TOTAL_TUTORIAL_STEPS) : getTutorialCurrentStep();
    document.body.classList.add("dashboard-tutorial-open");
    elements.overlay.hidden = false;
    elements.overlay.setAttribute("aria-hidden", "false");
    setTutorialState({
      currentStep: resolvedStep,
      skipped: false,
      lastShownAt: (/* @__PURE__ */ new Date()).toISOString()
    });
    renderTutorialStep(resolvedStep);
  }
  function closeTutorial() {
    const elements = cacheTutorialElements();
    if (!elements.overlay) return;
    document.body.classList.remove("dashboard-tutorial-open");
    elements.overlay.hidden = true;
    elements.overlay.setAttribute("aria-hidden", "true");
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
        completedAt: (/* @__PURE__ */ new Date()).toISOString()
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
    if (!elements.nextButton || elements.nextButton.dataset.bound === "true") return;
    elements.previousButton.dataset.bound = "true";
    elements.nextButton.dataset.bound = "true";
    elements.laterButton.dataset.bound = "true";
    elements.previousButton.addEventListener("click", handleTutorialPrevious);
    elements.nextButton.addEventListener("click", handleTutorialNext);
    elements.laterButton.addEventListener("click", handleTutorialLater);
  }
  function maybeOpenTutorialOnLogin() {
    const justLoggedIn = sessionStorage.getItem(LOGIN_SESSION_KEY) === "true";
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
      throw new Error(`Arquivo ${sectionId}.html n\xE3o encontrado.`);
    }
    return html;
  }
  function isSecaoValida(sectionId) {
    return Object.prototype.hasOwnProperty.call(modulos, sectionId);
  }
  function getSecaoInicial() {
    const params = new URLSearchParams(window.location.search);
    const querySection = params.get("section");
    const hashSection = window.location.hash.replace("#", "").trim();
    if (isSecaoValida(querySection)) {
      return querySection;
    }
    if (isSecaoValida(hashSection)) {
      return hashSection;
    }
    return "painel";
  }
  function atualizarUrlSecao(sectionId) {
    const url = new URL(window.location.href);
    url.searchParams.set("section", sectionId);
    url.hash = sectionId;
    window.history.replaceState({ section: sectionId }, "", url);
  }
  function getProfileData() {
    return JSON.parse(localStorage.getItem("visionFinance_profile")) || {};
  }
  function getProfileInitials(profile = getProfileData()) {
    const nome = (profile.nome || "Joao").trim();
    const sobrenome = (profile.sobrenome || "Silva").trim();
    return `${nome.charAt(0)}${sobrenome.charAt(0)}`.toUpperCase();
  }
  function aplicarAvatarPerfil() {
    const avatar = document.querySelector(".avatar-circle");
    if (!avatar) return;
    const profile = getProfileData();
    if (profile.foto) {
      avatar.innerHTML = `<img src="${profile.foto}" alt="Foto de perfil">`;
      avatar.classList.add("has-photo");
    } else {
      avatar.textContent = getProfileInitials(profile);
      avatar.classList.remove("has-photo");
    }
  }
  function fecharSidebarMobile() {
    document.body.classList.remove("dashboard-sidebar-open");
    const sidebarToggle = document.getElementById("sidebarToggle");
    const sidebarBackdrop = document.getElementById("sidebarBackdrop");
    if (sidebarToggle) {
      sidebarToggle.setAttribute("aria-expanded", "false");
    }
    if (sidebarBackdrop) {
      sidebarBackdrop.hidden = true;
    }
  }
  function abrirSidebarMobile() {
    document.body.classList.add("dashboard-sidebar-open");
    const sidebarToggle = document.getElementById("sidebarToggle");
    const sidebarBackdrop = document.getElementById("sidebarBackdrop");
    if (sidebarToggle) {
      sidebarToggle.setAttribute("aria-expanded", "true");
    }
    if (sidebarBackdrop) {
      sidebarBackdrop.hidden = false;
    }
  }
  function alternarSidebarMobile() {
    if (document.body.classList.contains("dashboard-sidebar-open")) {
      fecharSidebarMobile();
      return;
    }
    abrirSidebarMobile();
  }
  function configurarSidebarMobile() {
    const sidebarToggle = document.getElementById("sidebarToggle");
    const sidebarBackdrop = document.getElementById("sidebarBackdrop");
    if (sidebarToggle && !sidebarToggle.dataset.bound) {
      sidebarToggle.dataset.bound = "true";
      sidebarToggle.addEventListener("click", alternarSidebarMobile);
    }
    if (sidebarBackdrop && !sidebarBackdrop.dataset.bound) {
      sidebarBackdrop.dataset.bound = "true";
      sidebarBackdrop.addEventListener("click", fecharSidebarMobile);
    }
    if (!window.__visionFinanceSidebarResizeBound) {
      window.__visionFinanceSidebarResizeBound = true;
      window.addEventListener("resize", () => {
        if (window.innerWidth > 960) {
          fecharSidebarMobile();
        }
      });
    }
  }
  function configurarSaidaDashboard() {
    const logoutLink = document.querySelector(".sidebar-footer .logout");
    if (!logoutLink || logoutLink.dataset.bound === "true") return;
    logoutLink.dataset.bound = "true";
    logoutLink.addEventListener("click", async (event) => {
      event.preventDefault();
      const isDark = getThemeSettings().temaEscuro === true;
      const deveSair = await confirmarAcao(
        "Sair do painel",
        "Voc\xEA est\xE1 prestes a sair do dashboard e voltar para a tela inicial. Deseja continuar?",
        {
          confirmText: "Sair",
          cancelText: "Cancelar",
          iconSrc: "./img/pessoa-correndo.png",
          iconAlt: "Sair do painel",
          iconWrapStyle: "width: 72px; height: 72px; background: rgba(var(--accent-rgb), 0.14); border: 1px solid rgba(var(--accent-rgb), 0.26); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 22px; box-shadow: 0 12px 28px rgba(15, 23, 42, 0.14);",
          iconStyle: `width: 30px; height: 30px; object-fit: contain; filter: ${isDark ? "brightness(0) invert(1)" : "none"};`
        }
      );
      if (deveSair) {
        window.location.href = logoutLink.href;
      }
    });
  }
  async function navegar(sectionId) {
    try {
      if (!isSecaoValida(sectionId)) {
        throw new Error(`Secao inv\xE1lida: ${sectionId}`);
      }
      secaoAtiva = sectionId;
      const html = await carregarHtmlSecao(sectionId);
      const container = document.getElementById("dynamic-content");
      if (container) {
        container.innerHTML = html;
        animarEntradaSecao(container);
      }
      const titulo = document.getElementById("sectionTitle");
      if (titulo) {
        const nomesTitulos = {
          "painel": "Painel Geral",
          "despesas": "Minhas Despesas",
          "relatorios": "Relat\xF3rios Mensais",
          "planejamento": "Planejamento e Metas",
          "carteiras": "Minhas Carteiras",
          "perfil": "Meu Perfil",
          "configuracoes": "Configura\xE7\xF5es do Sistema"
        };
        titulo.innerText = nomesTitulos[sectionId] || sectionId;
      }
      document.querySelectorAll(".nav-item").forEach((el) => el.classList.remove("active"));
      const navItem = document.querySelector(`[data-section="${sectionId}"]`);
      if (navItem) navItem.classList.add("active");
      atualizarUrlSecao(sectionId);
      requestAnimationFrame(() => {
        setTimeout(() => {
          if (modulos[sectionId] && typeof modulos[sectionId].init === "function") {
            modulos[sectionId].init();
          }
          refreshNotificationCenter(true);
        }, 50);
      });
      if (window.innerWidth <= 960) {
        fecharSidebarMobile();
      }
    } catch (err) {
      console.error("Erro na navega\xE7\xE3o:", err);
    }
  }
  function aplicarTemaGlobal() {
    applyStoredTheme(document.body);
  }
  function gerenciarBotaoModo() {
    const headerActions = document.querySelector(".user-info");
    if (!headerActions) return;
    let quickActions = document.getElementById("headerQuickActions");
    if (!quickActions) {
      quickActions = document.createElement("div");
      quickActions.id = "headerQuickActions";
      quickActions.className = "header-quick-actions";
      headerActions.prepend(quickActions);
    }
    let btn = document.getElementById("btnToggleModo");
    if (!btn) {
      btn = document.createElement("button");
      btn.id = "btnToggleModo";
      btn.type = "button";
      btn.className = "theme-toggle-btn theme-toggle-btn-dashboard header-icon-btn";
      btn.setAttribute("aria-label", "Alternar modo claro e escuro");
      btn.innerHTML = '<span aria-hidden="true" class="dashboard-theme-toggle-icon"></span>';
      quickActions.append(btn);
      btn.addEventListener("click", () => {
        toggleThemePreference();
      });
    }
    const isDark = getThemeSettings().temaEscuro === true;
    btn.setAttribute("aria-pressed", String(isDark));
    btn.title = isDark ? "Ativar modo claro" : "Ativar modo escuro";
  }
  function gerenciarBotaoOlho() {
    const headerActions = document.querySelector(".user-info");
    if (!headerActions) return;
    let quickActions = document.getElementById("headerQuickActions");
    if (!quickActions) {
      quickActions = document.createElement("div");
      quickActions.id = "headerQuickActions";
      quickActions.className = "header-quick-actions";
      headerActions.prepend(quickActions);
    }
    if (document.getElementById("btnToggleOlho")) return;
    const btn = document.createElement("button");
    btn.id = "btnToggleOlho";
    btn.type = "button";
    btn.className = "header-icon-btn";
    btn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.8;">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
            <circle cx="12" cy="12" r="3"></circle>
        </svg>
    `;
    quickActions.append(btn);
    const atualizarEstadoBotao = () => {
      const ativo = localStorage.getItem("visionFinance_olhoOculto") === "true";
      btn.style.opacity = ativo ? "0.65" : "1";
      btn.setAttribute("aria-pressed", String(!ativo));
      btn.title = ativo ? "Mostrar valores" : "Ocultar valores";
    };
    atualizarEstadoBotao();
    btn.addEventListener("click", () => {
      const atual = localStorage.getItem("visionFinance_olhoOculto") === "true";
      localStorage.setItem("visionFinance_olhoOculto", !atual);
      atualizarEstadoBotao();
      if (modulos[secaoAtiva] && typeof modulos[secaoAtiva].init === "function") {
        modulos[secaoAtiva].init();
      }
    });
  }
  function readNotificationIdStore(storageKey) {
    try {
      const parsed = JSON.parse(localStorage.getItem(storageKey) || "[]");
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
    if (typeof id !== "string") return false;
    const parts = id.split(":");
    const hasLegacyCycleKey = /^\d{4}-\d{2}-\d{2}$/.test(parts[1] || "");
    return id.startsWith("goal-progress:") && hasLegacyCycleKey || id.startsWith("goal-deadline:") && hasLegacyCycleKey;
  }
  function isLegacyBudgetNotificationId(id) {
    if (typeof id !== "string") return false;
    return /^budget-expense:\d{4}-\d{2}-\d{2}:95$/.test(id);
  }
  function readNotificationFeedStore() {
    try {
      const parsed = JSON.parse(localStorage.getItem(NOTIFICATION_FEED_STORAGE_KEY) || "[]");
      return Array.isArray(parsed) ? parsed.filter((item) => !isLegacyGoalNotificationId(item?.id) && !isLegacyBudgetNotificationId(item?.id)) : [];
    } catch {
      return [];
    }
  }
  function writeNotificationFeedStore(items = []) {
    const normalizedItems = items.filter((item) => item && item.id).sort((left, right) => {
      const severityDiff = getNotificationSeverityWeight(right.severity) - getNotificationSeverityWeight(left.severity);
      if (severityDiff !== 0) return severityDiff;
      return new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime();
    }).slice(0, 180);
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
        ...current || {},
        ...item,
        createdAt: current?.createdAt || item.createdAt || (/* @__PURE__ */ new Date()).toISOString()
      });
    });
    return writeNotificationFeedStore([...feedMap.values()]);
  }
  function parseMetaDeadline(dateString) {
    if (typeof dateString !== "string" || !/^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) return null;
    const [day, month, year] = dateString.split("/").map(Number);
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
    if (unit === "days") {
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
    return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "").toLowerCase();
  }
  function getReachedProgressMilestones(ratio) {
    if (!Number.isFinite(ratio)) return [];
    return [...NOTIFICATION_PROGRESS_MILESTONES].filter((milestone) => ratio >= milestone.ratio).sort((left, right) => left.ratio - right.ratio);
  }
  function getReachedBudgetMilestones(ratio) {
    if (!Number.isFinite(ratio)) return [];
    return [...NOTIFICATION_BUDGET_MILESTONES].filter((milestone) => ratio >= milestone.ratio).sort((left, right) => left.ratio - right.ratio);
  }
  function getBudgetMilestoneDescriptor(milestone) {
    if (!milestone) return null;
    if (milestone.percentage >= 100) {
      return {
        severity: "critical",
        title: "Limite do or\xE7amento atingido",
        message: "As despesas do ciclo atual chegaram a 100% do limite estabelecido."
      };
    }
    return {
      severity: milestone.percentage >= 75 ? "warning" : "info",
      title: `Orcamento em ${milestone.percentage}%`,
      message: `As despesas do ciclo atual chegaram a ${milestone.percentage}% do limite estabelecido.`
    };
  }
  function getGoalProgressMilestoneDescriptor(milestone, goalName) {
    if (!milestone) return null;
    if (milestone.percentage >= 100) {
      return {
        severity: "success",
        title: `Meta concluida: ${goalName}`,
        message: `Parabens, a meta ${goalName} chegou a 100% e foi concluida.`
      };
    }
    return {
      severity: milestone.percentage >= 75 ? "warning" : "info",
      title: `Meta em ${milestone.percentage}%: ${goalName}`,
      message: `A meta ${goalName} atingiu ${milestone.percentage}% do valor planejado.`
    };
  }
  function getReachedDeadlineMilestones(deadline, today) {
    if (!deadline || !today) return [];
    if (today.getTime() > deadline.getTime()) {
      return [{
        key: "overdue",
        severity: "critical",
        label: "prazo vencido"
      }];
    }
    return NOTIFICATION_DEADLINE_MILESTONES.filter((milestone) => {
      const triggerDate = typeof milestone.days === "number" ? shiftNotificationDate(deadline, -milestone.days, "days") : shiftNotificationDate(deadline, -milestone.months, "months");
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
    if (days < 0) return `${Math.abs(days)} ${Math.abs(days) === 1 ? "dia de atraso" : "dias de atraso"}`;
    if (days === 0) return "vence hoje";
    return `${days} ${days === 1 ? "dia restante" : "dias restantes"}`;
  }
  function formatNotificationTimestamp(timestamp) {
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }).format(date);
  }
  function buildNotificationItem({ id, severity, title, message, category, targetSection, meta, settingKey = "geral" }) {
    return {
      id,
      severity,
      title,
      message,
      category,
      targetSection,
      meta,
      settingKey,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
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
        category: "Or\xE7amento",
        targetSection: "planejamento",
        title: descriptor.title,
        message: `${descriptor.message} Ciclo ${cycleInfo.label}.`,
        meta: `${formatarMoeda(totalUtilizado)} de ${formatarMoeda(budget)}`,
        settingKey: "orcamento"
      });
    });
  }
  function buildGoalProgressNotificationItems(snapshot) {
    const { metas: metas2 } = snapshot;
    return metas2.flatMap((meta) => {
      const targetValue = parseFloat(meta.alvo) || 0;
      const savedValue = parseFloat(meta.totalHistorico) || parseFloat(meta.guardado) || 0;
      const progressRatio = targetValue > 0 ? savedValue / targetValue : 0;
      return getReachedProgressMilestones(progressRatio).map((milestone) => {
        const descriptor = getGoalProgressMilestoneDescriptor(milestone, meta.nome);
        return buildNotificationItem({
          id: `goal-progress:${slugifyNotificationPart(meta.nome)}:${meta.prazo}:${milestone.key}`,
          severity: descriptor.severity,
          category: "Meta",
          targetSection: "planejamento",
          title: descriptor.title,
          message: descriptor.message,
          meta: `${formatarMoeda(savedValue)} de ${formatarMoeda(targetValue)}`,
          settingKey: "orcamentoMeta"
        });
      });
    });
  }
  function buildGoalDeadlineNotificationItems(snapshot, today = normalizeNotificationDate(/* @__PURE__ */ new Date())) {
    const { metas: metas2 } = snapshot;
    return metas2.flatMap((meta) => {
      const deadline = parseMetaDeadline(meta.prazo);
      const savedValue = parseFloat(meta.totalHistorico) || parseFloat(meta.guardado) || 0;
      const progressRatio = meta.alvo > 0 ? savedValue / meta.alvo : 0;
      if (!deadline || progressRatio >= 1) return [];
      const remainingValue = Math.max(meta.alvo - savedValue, 0);
      const diffDays = Math.ceil((deadline.getTime() - today.getTime()) / (1e3 * 60 * 60 * 24));
      return getReachedDeadlineMilestones(deadline, today).map((milestone) => {
        if (milestone.key === "overdue") {
          return buildNotificationItem({
            id: `goal-deadline:${slugifyNotificationPart(meta.nome)}:${meta.prazo}:overdue`,
            severity: "critical",
            category: "Prazos de metas",
            targetSection: "planejamento",
            title: `Meta atrasada: ${meta.nome}`,
            message: `O prazo da meta venceu e ainda faltam ${formatarMoeda(remainingValue)} para concluir.`,
            meta: formatNotificationRelativeDays(diffDays),
            settingKey: "metas"
          });
        }
        return buildNotificationItem({
          id: `goal-deadline:${slugifyNotificationPart(meta.nome)}:${meta.prazo}:${milestone.key}`,
          severity: milestone.severity,
          category: "Prazos de metas",
          targetSection: "planejamento",
          title: milestone.key === "due-today" ? `Meta vence hoje: ${meta.nome}` : `Prazo da meta: ${meta.nome}`,
          message: milestone.key === "due-today" ? `Hoje e o ultimo dia da meta ${meta.nome}. Ainda faltam ${formatarMoeda(remainingValue)} para concluir.` : `Faltam ${milestone.label} para a meta ${meta.nome}. Ainda faltam ${formatarMoeda(remainingValue)} para atingir o objetivo.`,
          meta: formatNotificationRelativeDays(diffDays),
          settingKey: "metas"
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
      return left.title.localeCompare(right.title, "pt-BR");
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
      ...settings.notificacoes?.orcamento ? buildBudgetNotificationItems(snapshot) : [],
      ...settings.notificacoes?.orcamentoMeta ? buildGoalProgressNotificationItems(snapshot) : [],
      ...settings.notificacoes?.metas ? buildGoalDeadlineNotificationItems(snapshot) : []
    ];
    const activeSettingKeys = ["orcamento", "orcamentoMeta", "metas"].filter((key) => settings.notificacoes?.[key]);
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
                    <span class="notification-popover-eyebrow">Central de notifica\xE7\xF5es</span>
                    <h3>Notifica\xE7\xF5es desativadas</h3>
                </div>
            </div>
            <div class="notification-empty-state">
                <strong>Ative as notifica\xE7\xF5es nas configura\xE7\xF5es</strong>
                <p>Quando os alertas estiverem habilitados, o sino mostrar\xE1 avisos sobre or\xE7amento e metas em tempo real.</p>
                <button type="button" class="notification-action-btn" data-notification-target="configuracoes">Abrir configura\xE7\xF5es</button>
            </div>
        `;
      return;
    }
    if (!data.items.length) {
      panel.innerHTML = `
            <div class="notification-popover-head">
                <div>
                    <span class="notification-popover-eyebrow">Central de notifica\xE7\xF5es</span>
                    <h3>Tudo em dia</h3>
                </div>
                <span class="notification-summary-chip notification-summary-chip-success">Sem alertas</span>
            </div>
            <div class="notification-empty-state">
                <strong>Nenhuma a\xE7\xE3o pendente no momento</strong>
                <p>O sistema vai destacar aqui qualquer aviso relevante sobre or\xE7amento, metas e limites do ciclo atual.</p>
            </div>
        `;
      return;
    }
    panel.innerHTML = `
        <div class="notification-popover-head">
            <div>
                <span class="notification-popover-eyebrow">Central de notifica\xE7\xF5es</span>
                <h3>${data.unreadCount > 0 ? `${data.unreadCount} ${data.unreadCount === 1 ? "novo alerta" : "novos alertas"}` : "Alertas recentes"}</h3>
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
            `).join("")}
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
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    const sentIds = readNotificationIdStore(NOTIFICATION_BROWSER_SENT_STORAGE_KEY);
    const candidates = data.items.filter((item) => !sentIds.includes(item.id));
    if (!candidates.length) return;
    candidates.slice(0, 3).forEach((item) => {
      const notification = new Notification("Vision Finance", {
        body: `${item.title} \u2022 ${item.message}`,
        icon: "./img/logo.png",
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
    const btn = document.querySelector(".notification-btn");
    if (!btn) return null;
    btn.id = "dashboardNotificationBtn";
    btn.type = "button";
    btn.setAttribute("aria-label", "Abrir central de notifica\xE7\xF5es");
    btn.setAttribute("aria-haspopup", "dialog");
    btn.setAttribute("aria-expanded", String(notificationCenterState.isOpen));
    let wrap = document.getElementById("notificationCenterWrap");
    if (!wrap) {
      wrap = document.createElement("div");
      wrap.id = "notificationCenterWrap";
      wrap.className = "notification-center-wrap";
      btn.parentNode.insertBefore(wrap, btn);
      wrap.appendChild(btn);
    }
    if (!btn.dataset.enhanced) {
      btn.dataset.enhanced = "true";
      btn.innerHTML = getNotificationBellIcon();
    }
    let panel = document.getElementById("notificationPopover");
    if (!panel) {
      panel = document.createElement("section");
      panel.id = "notificationPopover";
      panel.className = "notification-popover";
      panel.hidden = true;
      panel.setAttribute("role", "dialog");
      panel.setAttribute("aria-label", "Central de notifica\xE7\xF5es");
      wrap.appendChild(panel);
    }
    if (!btn.dataset.bound) {
      btn.dataset.bound = "true";
      btn.addEventListener("click", (event) => {
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
    const badge = btn.querySelector(".notification-btn-badge");
    const data = getNotificationCenterData();
    notificationCenterState.currentIds = data.items.map((item) => item.id);
    maybeSendBrowserNotifications(data);
    renderNotificationPanel(panel, data);
    const isOpen = preserveOpen ? notificationCenterState.isOpen : false;
    notificationCenterState.isOpen = isOpen;
    panel.hidden = !isOpen;
    btn.setAttribute("aria-expanded", String(isOpen));
    btn.classList.toggle("has-unread", data.unreadCount > 0);
    if (badge) {
      badge.hidden = data.unreadCount <= 0;
      badge.textContent = data.unreadCount > 9 ? "9+" : String(data.unreadCount);
    }
    btn.title = data.enabled ? data.unreadCount > 0 ? `${data.unreadCount} alertas pendentes` : "Central de notifica\xE7\xF5es" : "Notifica\xE7\xF5es desativadas";
  }
  document.addEventListener("click", (event) => {
    const panel = document.getElementById("notificationPopover");
    const wrap = document.getElementById("notificationCenterWrap");
    if (event.target.closest(".notification-action-btn")) {
      const targetSection = event.target.closest(".notification-action-btn")?.dataset.notificationTarget;
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
  document.addEventListener("click", (e) => {
    const navItem = e.target.closest("[data-section]");
    if (navItem) {
      e.preventDefault();
      const section = navItem.getAttribute("data-section");
      navegar(section);
    }
  });
  document.addEventListener("DOMContentLoaded", () => {
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
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && notificationCenterState.isOpen) {
      notificationCenterState.isOpen = false;
      refreshNotificationCenter(true);
    }
    if (e.key === "Escape" && document.body.classList.contains("dashboard-sidebar-open")) {
      fecharSidebarMobile();
    }
  });
  window.addEventListener("settingsUpdated", () => {
    ensureFinancialDataIntegrity();
    aplicarTemaGlobal();
    gerenciarBotaoModo();
    refreshNotificationCenter(true);
    if (getTutorialState().currentStep === TOTAL_TUTORIAL_STEPS && !cacheTutorialElements().overlay?.hidden) {
      renderTutorialStep(TOTAL_TUTORIAL_STEPS);
    }
    if (modulos[secaoAtiva] && typeof modulos[secaoAtiva].init === "function") {
      modulos[secaoAtiva].init();
    }
  });
  window.navegar = navegar;
  window.addEventListener("profileUpdated", () => {
    aplicarAvatarPerfil();
  });
  window.addEventListener("visionFinance:dataChanged", () => {
    refreshNotificationCenter(true);
  });
  window.addEventListener("focus", () => {
    refreshNotificationCenter(true);
  });
  window.addEventListener("visionFinance:openTutorial", handleTutorialOpenRequest);
})();
