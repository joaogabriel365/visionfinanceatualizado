// Dados Globais
export let despesasExemplo = JSON.parse(localStorage.getItem('despesas')) || [
    { titulo: 'Supermercado', categoria: 'Alimentação', pagamento: 'Cartão de Crédito', valor: 350.0, data: '2026-03-25', observacao: '' },
    { titulo: 'Uber', categoria: 'Transporte', pagamento: 'Cartão de Débito', valor: 45.0, data: '2026-03-25', observacao: '' }
];

export let metas = JSON.parse(localStorage.getItem('metas')) || [];
export let limiteMensal = parseFloat(localStorage.getItem('budget_total')) || 0;

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
    return JSON.parse(localStorage.getItem('visionFinance_settings')) || {};
};

export const setThemeSettings = (settings) => {
    localStorage.setItem('visionFinance_settings', JSON.stringify(settings));
    return settings;
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

export const applyThemeClasses = (isDark, element = document.body) => {
    if (!element) return isDark;

    element.dataset.theme = isDark ? 'dark' : 'light';
    element.classList.toggle('dark-theme', isDark);
    element.classList.toggle('light-theme', !isDark);

    const themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (themeColorMeta) {
        themeColorMeta.setAttribute('content', isDark ? '#050a0f' : '#084ca0');
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
    localStorage.setItem('despesas', JSON.stringify(despesasExemplo));
    localStorage.setItem('metas', JSON.stringify(metas));
    localStorage.setItem('budget_total', localStorage.getItem('budget_total') || "0");
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