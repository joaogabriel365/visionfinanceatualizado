export const ConfiguracoesModulo = {
    init: function() {
        // Pequeno delay para garantir que o DOM injetado pelo fetch já esteja disponível
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
        this.checkLembreteMetas = document.getElementById('checkLembreteMetas');
        this.selectMoeda = document.getElementById('selectMoeda');
        this.checkTemaEscuro = document.getElementById('checkTemaEscuro');
    },

    bindEvents: function() {
        // Salvar ao submeter o formulário
        this.form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveSettings();
        });

        // Lógica de dependência das notificações
        this.checkNotificacoesGeral.addEventListener('change', (e) => {
            this.toggleSubNotifications(e.target.checked);
        });
    },

    // Ativa ou desativa os switches filhos baseados no switch pai
    toggleSubNotifications: function(isEnabled) {
        this.checkAlertaOrcamento.disabled = !isEnabled;
        this.checkLembreteMetas.disabled = !isEnabled;
        
        // Estilização visual para indicar bloqueio
        const subItems = document.querySelectorAll('.sub-item');
        subItems.forEach(item => {
            item.style.opacity = isEnabled ? "1" : "0.5";
        });

        if (!isEnabled) {
            this.checkAlertaOrcamento.checked = false;
            this.checkLembreteMetas.checked = false;
        }
    },

    saveSettings: function() {
        const settings = {
            moeda: this.selectMoeda.value,
            temaEscuro: this.checkTemaEscuro.checked,
            notificacoes: {
                geral: this.checkNotificacoesGeral.checked,
                orcamento: this.checkAlertaOrcamento.checked,
                metas: this.checkLembreteMetas.checked
            },
            dataAtualizacao: new Date().toISOString()
        };

        localStorage.setItem('visionFinance_settings', JSON.stringify(settings));
        
        // Feedback visual profissional (em vez de alert)
        this.mostrarFeedback();
        
        // Disparar evento customizado para outros módulos (como o Painel) saberem que a moeda mudou
        window.dispatchEvent(new CustomEvent('settingsUpdated', { detail: settings }));
    },

    loadSettings: function() {
        const saved = JSON.parse(localStorage.getItem('visionFinance_settings'));
        
        if (saved) {
            this.selectMoeda.value = saved.moeda || 'BRL';
            this.checkTemaEscuro.checked = saved.temaEscuro;
            this.checkNotificacoesGeral.checked = saved.notificacoes.geral;
            this.checkAlertaOrcamento.checked = saved.notificacoes.orcamento;
            this.checkLembreteMetas.checked = saved.notificacoes.metas;

            // Aplica o estado de habilitado/desabilitado nos filhos
            this.toggleSubNotifications(saved.notificacoes.geral);
        }
    },

    mostrarFeedback: function() {
        const btn = this.form.querySelector('.btn-accent-blue');
        const originalText = btn.innerText;
        
        btn.innerText = "✓ Configurações Salvas";
        btn.style.background = "#22c55e"; // Verde sucesso
        
        setTimeout(() => {
            btn.innerText = originalText;
            btn.style.background = ""; // Volta ao ciano original do CSS
        }, 2000);
    }
};

// Inicialização automática se não for importado como módulo
if (!window.location.href.includes('module')) {
    document.addEventListener('DOMContentLoaded', () => ConfiguracoesModulo.init());
}