export const ConfiguracoesModulo = {
    init: function() {
        setTimeout(() => {
            this.cacheSelectors();
            if (this.form) {
                this.bindEvents();
                this.loadSettings();
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
        this.checkTemaEscuro = document.getElementById('checkTemaEscuro');
    },

    bindEvents: function() {
        this.form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveSettings();
        });

        this.checkNotificacoesGeral.addEventListener('change', (e) => {
            this.toggleSubNotifications(e.target.checked);
        });
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
            temaEscuro: this.checkTemaEscuro.checked,
            notificacoes: {
                geral: this.checkNotificacoesGeral.checked,
                orcamento: this.checkAlertaOrcamento.checked,
                orcamentoMeta: this.checkAlertaOrcamentoMeta.checked,
                metas: this.checkLembreteMetas.checked
            },
            dataAtualizacao: new Date().toISOString()
        };

        localStorage.setItem('visionFinance_settings', JSON.stringify(settings));
        this.mostrarFeedback();
        window.dispatchEvent(new CustomEvent('settingsUpdated', { detail: settings }));
    },

    loadSettings: function() {
        const saved = JSON.parse(localStorage.getItem('visionFinance_settings'));
        
        if (saved) {
            this.selectMoeda.value = saved.moeda || 'BRL';
            this.checkTemaEscuro.checked = saved.temaEscuro;
            this.checkNotificacoesGeral.checked = saved.notificacoes?.geral || false;
            this.checkAlertaOrcamento.checked = saved.notificacoes?.orcamento || false;
            this.checkAlertaOrcamentoMeta.checked = saved.notificacoes?.orcamentoMeta || false;
            this.checkLembreteMetas.checked = saved.notificacoes?.metas || false;

            this.toggleSubNotifications(this.checkNotificacoesGeral.checked);
        }
    },

    mostrarFeedback: function() {
        const btn = this.form.querySelector('.btn-accent-blue');
        const originalText = btn.innerText;
        
        btn.innerText = "✓ Configurações Salvas";
        const originalBg = btn.style.background;
        btn.style.background = "#22c55e"; 
        
        setTimeout(() => {
            btn.innerText = originalText;
            btn.style.background = originalBg;
        }, 2000);
    }
};

if (!window.location.href.includes('module')) {
    document.addEventListener('DOMContentLoaded', () => ConfiguracoesModulo.init());
}