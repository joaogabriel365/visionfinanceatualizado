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

export const applyThemeClasses = (isDark, element = document.body) => {
    if (!element) return isDark;

    element.dataset.theme = isDark ? 'dark' : 'light';
    element.classList.toggle('dark-theme', isDark);
    element.classList.toggle('light-theme', !isDark);
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
export const confirmarAcao = (titulo = "Confirmar Exclusão", mensagem = "Esta ação não poderá ser desfeita. Deseja continuar?") => {
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

        // Atualiza textos se fornecidos
        if (txtTitulo) txtTitulo.innerText = titulo;
        if (txtMensagem) txtMensagem.innerText = mensagem;

        modal.style.display = 'flex';

        const fechar = (confirmado) => {
            modal.style.display = 'none';
            // Remove os listeners para evitar execuções duplicadas no futuro
            btnCancel.onclick = null;
            btnConfirm.onclick = null;
            resolve(confirmado);
        };

        btnCancel.onclick = () => fechar(false);
        btnConfirm.onclick = () => fechar(true);
        
        // Fechar ao clicar fora do card (opcional para UX)
        modal.onclick = (e) => {
            if (e.target === modal) fechar(false);
        };
    });
};