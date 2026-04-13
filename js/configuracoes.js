import { applyThemeClasses, ensureFinancialDataIntegrity, getThemeSettings, setThemeSettings } from './common.js';

export const ConfiguracoesModulo = {
    init: function() {
        setTimeout(() => {
            this.cacheSelectors();
            if (this.form) {
                this.bindEvents();
                this.loadSettings();
                this.applyTheme(); // Aplicar tema ao inicializar
            }
        }, 100);
    },

    cacheSelectors: function() {
        this.form = document.getElementById('formConfiguracoes');
        this.checkNotificacoesGeral = document.getElementById('checkNotificacoesGeral');
        this.checkAlertaOrcamento = document.getElementById('checkAlertaOrcamento');
        this.checkAlertaOrcamentoMeta = document.getElementById('checkAlertaOrcamentoMeta');
        this.checkLembreteMetas = document.getElementById('checkLembreteMetas');
        this.selectMoeda = document.getElementById('selectMoeda');
        this.selectCorTemaClaro = document.getElementById('selectCorTemaClaro');
        this.selectCorTemaEscuro = document.getElementById('selectCorTemaEscuro');
        this.selectDiaVirada = document.getElementById('selectDiaVirada');
        this.checkTemaEscuro = document.getElementById('checkTemaEscuro');
        this.btnAbrirTutorial = document.getElementById('btnAbrirTutorial');
    },

    bindEvents: function() {
        this.form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveSettings();
        });

        this.checkNotificacoesGeral.addEventListener('change', (e) => {
            this.toggleSubNotifications(e.target.checked);
            this.toggleNotificacoes(e.target.checked);
        });

        [this.selectCorTemaClaro, this.selectCorTemaEscuro].forEach((select) => {
            select?.addEventListener('change', () => {
                this.applyTheme(this.buildThemePreviewSettings());
            });
        });

        this.checkTemaEscuro.addEventListener('change', (e) => {
            this.toggleTheme(e.target.checked);
        });

        if (this.btnAbrirTutorial) {
            this.btnAbrirTutorial.addEventListener('click', () => {
                window.dispatchEvent(new CustomEvent('visionFinance:openTutorial', {
                    detail: { startStep: 0 }
                }));
            });
        }
    },

    toggleNotificacoes: function(isEnabled) {
        if (isEnabled) {
            this.solicitarPermissaoNotificacoes();
        } else {
            // Desabilitar notificações - não há método direto, mas podemos armazenar o estado
            console.log('Notificações desabilitadas');
        }
    },

    solicitarPermissaoNotificacoes: function() {
        if ('Notification' in window) {
            Notification.requestPermission().then((permission) => {
                if (permission === 'granted') {
                    console.log('Permissão para notificações concedida');
                    // Mostrar notificação de teste
                    this.mostrarNotificacaoTeste();
                } else {
                    console.log('Permissão para notificações negada');
                    // Desmarcar o checkbox se permissão negada
                    this.checkNotificacoesGeral.checked = false;
                    alert('Permissão para notificações foi negada. Para ativar, permita notificações no navegador.');
                }
            });
        } else {
            alert('Este navegador não suporta notificações.');
            this.checkNotificacoesGeral.checked = false;
        }
    },

    mostrarNotificacaoTeste: function() {
        const notificacao = new Notification('Vision Finance', {
            body: 'Notificações ativadas com sucesso!',
            icon: './img/logo.png'
        });

        // Fechar automaticamente após 3 segundos
        setTimeout(() => {
            notificacao.close();
        }, 3000);
    },

    toggleTheme: function(isDark) {
        applyThemeClasses(isDark, document.body, this.buildThemePreviewSettings(isDark));
    },

    buildThemePreviewSettings: function(isDark = this.checkTemaEscuro.checked) {
        const saved = getThemeSettings();

        return {
            ...saved,
            corTemaClaro: this.selectCorTemaClaro?.value || saved.corTemaClaro || saved.corTema || 'azul',
            corTemaEscuro: this.selectCorTemaEscuro?.value || saved.corTemaEscuro || saved.corTema || 'dourado',
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
        // Lista de todos os switches dependentes
        const dependents = [
            this.checkAlertaOrcamento, 
            this.checkAlertaOrcamentoMeta, 
            this.checkLembreteMetas
        ];

        dependents.forEach(el => {
            if (el) {
                el.disabled = !isEnabled;
                if (!isEnabled) el.checked = false;
            }
        });
        
        const subItems = document.querySelectorAll('.sub-item');
        subItems.forEach(item => {
            item.style.opacity = isEnabled ? "1" : "0.5";
        });
    },

    saveSettings: function() {
        const settings = {
            moeda: this.selectMoeda.value,
            corTemaClaro: this.selectCorTemaClaro?.value || 'azul',
            corTemaEscuro: this.selectCorTemaEscuro?.value || 'dourado',
            diaViradaMes: Number(this.selectDiaVirada?.value || 1),
            temaEscuro: this.checkTemaEscuro.checked,
            notificacoes: {
                geral: this.checkNotificacoesGeral.checked,
                orcamento: this.checkAlertaOrcamento.checked,
                orcamentoMeta: this.checkAlertaOrcamentoMeta.checked,
                metas: this.checkLembreteMetas.checked
            },
            dataAtualizacao: new Date().toISOString()
        };

        const savedSettings = setThemeSettings(settings);
        ensureFinancialDataIntegrity();
        this.mostrarFeedback();
        window.dispatchEvent(new CustomEvent('settingsUpdated', { detail: savedSettings }));

        this.applyTheme(savedSettings);
    },

    loadSettings: function() {
        const saved = getThemeSettings();

        if (saved) {
            this.selectMoeda.value = saved.moeda || 'BRL';
            if (this.selectCorTemaClaro) this.selectCorTemaClaro.value = saved.corTemaClaro || saved.corTema || 'azul';
            if (this.selectCorTemaEscuro) this.selectCorTemaEscuro.value = saved.corTemaEscuro || saved.corTema || 'dourado';
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
        const btn = this.form.querySelector('.btn-primary');
        if (!btn) return; // Verificar se o botão existe

        const originalText = btn.innerText;

        btn.innerText = "✓ Configurações Salvas";
        const originalBg = btn.style.background;
        btn.style.background = "var(--success)";

        setTimeout(() => {
            btn.innerText = originalText;
            btn.style.background = originalBg;
        }, 2000);
    }
};

if (!window.location.href.includes('module')) {
    document.addEventListener('DOMContentLoaded', () => ConfiguracoesModulo.init());
}