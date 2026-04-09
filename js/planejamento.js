import { addMetaContribution, formatarMoeda, getBudgetForCycle, getCurrentCycleInfo, getDespesasData, getMetasData, getThemeVar, setCurrentCycleBudget, setMetasData } from './common.js';

const planningAddIconUrl = './img/+.png';
const planningEditIconUrl = './img/lapis.png';
const planningDeleteIconUrl = './img/lixeira.png';

export const PlanejamentoModulo = {
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
        const inputsMoeda = ['orcamentoMensalInput', 'valorAlvoMeta', 'valorAporteMetaInput', 'valorAdicionalInput'];
        inputsMoeda.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('input', (e) => this.aplicarMascaraMoeda(e));
        });

        const inputData = document.getElementById('prazoMeta');
        if (inputData) {
            inputData.addEventListener('input', (e) => {
                this.aplicarMascaraData(e);
                // Remove a borda de erro ao começar a digitar novamente
                inputData.style.borderColor = "";
            });
        }
    },

    aplicarMascaraMoeda(e) {
        let v = e.target.value.replace(/\D/g, "");
        if (v.length > 10) v = v.slice(0, 10); // Limite de 10 dígitos
        v = (Number(v) / 100).toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
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
        
        const partes = dataString.split('/');
        const dia = parseInt(partes[0], 10);
        const mes = parseInt(partes[1], 10) - 1;
        const ano = parseInt(partes[2], 10);
        
        const dataTeste = new Date(ano, mes, dia);
        
        return dataTeste.getFullYear() === ano && 
               dataTeste.getMonth() === mes && 
               dataTeste.getDate() === dia;
    },

    parseMoedaParaFloat(v) {
        if (!v) return 0;
        return parseFloat(v.replace(/[^\d,]/g, "").replace(",", "."));
    },

    // --- MODAL DE CONFIRMAÇÃO ---
    exibirConfirmacao(titulo, texto, onConfirm) {
        const modal = document.getElementById('modalConfirmacaoSistema');
        const btnSim = document.getElementById('btn-confirm-yes');
        const btnNao = document.getElementById('btn-confirm-no');
        
        document.getElementById('confirm-title').innerText = titulo;
        document.getElementById('confirm-text').innerText = texto;
        
        modal.style.display = 'flex';

        const fechar = () => modal.style.display = 'none';

        btnSim.onclick = () => { onConfirm(); fechar(); };
        btnNao.onclick = fechar;
    },

    // --- LÓGICA DO MÓDULO ---
    atualizarInterfaceOrcamento() {
        const limite = this.getBudgetAtual();
        const display = document.getElementById('valor-limite-display');
        if (display) display.innerText = formatarMoeda(limite);
    },

    salvarOrcamento() {
        const input = document.getElementById('orcamentoMensalInput');
        const novoValor = this.parseMoedaParaFloat(input.value);

        if (novoValor > 0) {
            this.exibirConfirmacao(
                "Salvar Orçamento",
                `Deseja definir o limite mensal como ${formatarMoeda(novoValor)}?`,
                () => {
                    setCurrentCycleBudget(novoValor);
                    this.atualizarInterfaceOrcamento();
                    this.atualizarProgressoGlobal();
                    input.value = '';
                }
            );
        } else {
            alert("Por favor, insira um valor válido.");
        }
    },

    abrirModalAdicionarValor() {
        const modal = document.getElementById('modalAdicionarLimite');
        if (modal) {
            modal.style.display = 'flex';
            document.getElementById('valorAdicionalInput').value = '';
            this.configurarMascaras();
        }
    },

    fecharModalAdicionarLimite() {
        const modal = document.getElementById('modalAdicionarLimite');
        if (modal) modal.style.display = 'none';
    },

    confirmarSomaLimite() {
        const input = document.getElementById('valorAdicionalInput');
        const valorAdicional = this.parseMoedaParaFloat(input.value);
        const limiteAtual = this.getBudgetAtual();

        if (valorAdicional > 0) {
            const novoLimite = limiteAtual + valorAdicional;
            setCurrentCycleBudget(novoLimite);
            this.atualizarInterfaceOrcamento();
            this.atualizarProgressoGlobal();
            this.fecharModalAdicionarLimite();
        } else {
            alert("Insira um valor válido para adicionar.");
        }
    },

    // --- LÓGICA DE METAS ---
    abrirModalNovaMeta() {
        document.getElementById('tituloModalMeta').innerText = "Nova Meta";
        document.getElementById('indexMetaEdicao').value = "";
        document.getElementById('modalNovaMeta').style.display = 'flex';
        
        const inputData = document.getElementById('prazoMeta');
        if (inputData) inputData.style.borderColor = "";

        const erroMsg = document.getElementById('erro-data-meta');
        if (erroMsg) erroMsg.style.display = 'none';
    },

    abrirModalEditarMeta(index) {
        const meta = this.getMetasAtuais()[index];
        if (!meta) return;
        document.getElementById('tituloModalMeta').innerText = "Editar Meta";
        document.getElementById('indexMetaEdicao').value = index;
        
        document.getElementById('nomeMeta').value = meta.nome;
        document.getElementById('valorAlvoMeta').value = formatarMoeda(meta.alvo);
        document.getElementById('prazoMeta').value = meta.prazo;
        
        document.getElementById('modalNovaMeta').style.display = 'flex';

        const inputData = document.getElementById('prazoMeta');
        if (inputData) inputData.style.borderColor = "";

        const erroMsg = document.getElementById('erro-data-meta');
        if (erroMsg) erroMsg.style.display = 'none';
    },

    fecharModalNovaMeta() {
        document.getElementById('modalNovaMeta').style.display = 'none';
        document.getElementById('nomeMeta').value = '';
        document.getElementById('prazoMeta').value = '';
        document.getElementById('valorAlvoMeta').value = '';
        document.getElementById('indexMetaEdicao').value = '';
        
        const inputData = document.getElementById('prazoMeta');
        if (inputData) inputData.style.borderColor = "";

        const erroMsg = document.getElementById('erro-data-meta');
        if (erroMsg) erroMsg.style.display = 'none';
    },

    criarNovaMeta() {
        const indexEdicao = document.getElementById('indexMetaEdicao').value;
        const nome = document.getElementById('nomeMeta').value;
        const inputData = document.getElementById('prazoMeta');
        const prazo = inputData.value;
        const alvo = this.parseMoedaParaFloat(document.getElementById('valorAlvoMeta').value);
        const erroMsg = document.getElementById('erro-data-meta');

        // Validação de data com feedback visual de borda
        if (!this.validarData(prazo)) {
            if (inputData) inputData.style.borderColor = "#ef4444";
            if (erroMsg) {
                erroMsg.innerText = "Por favor, insira uma data válida.";
                erroMsg.style.display = "block";
            }
            return;
        }

        if (nome && alvo > 0) {
            if (inputData) inputData.style.borderColor = "";
            if (erroMsg) erroMsg.style.display = 'none';
            const metasAtuais = this.getMetasAtuais();
            
            if (indexEdicao !== "") {
                metasAtuais[indexEdicao].nome = nome;
                metasAtuais[indexEdicao].prazo = prazo;
                metasAtuais[indexEdicao].alvo = alvo;
            } else {
                const novaMeta = {
                    nome: nome,
                    prazo: prazo,
                    alvo: alvo,
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
            }
        );
    },

    confirmarAporte() {
        const index = Number(document.getElementById('indexMetaAporte').value);
        const valInput = document.getElementById('valorAporteMetaInput');
        const valorAporte = this.parseMoedaParaFloat(valInput.value);

        if (valorAporte > 0) {
            addMetaContribution(index, valorAporte);
            this.renderizarMetas();
            this.atualizarProgressoGlobal();
            this.fecharModalAporte();
        }
    },

    fecharModalAporte() {
        const modal = document.getElementById('modalAporteMeta');
        if (modal) modal.style.display = 'none';
        const input = document.getElementById('valorAporteMetaInput');
        if (input) input.value = '';
    },

    renderizarMetas() {
        const tbody = document.getElementById('goalsTableBody');
        const table = document.querySelector('.planning-goals-table');
        const emptyState = document.getElementById('planningGoalsEmptyState');
        if (!tbody || !table || !emptyState) return;

        const metasAtuais = this.getMetasAtuais();

        if (metasAtuais.length === 0) {
            tbody.innerHTML = '';
            table.hidden = true;
            emptyState.hidden = false;
            return;
        }

        table.hidden = false;
        emptyState.hidden = true;

        const isLight = document.body.classList.contains('light-theme');
        const progressBg = isLight ? (getThemeVar('--border-color') || '#dccdb9') : '#1a253a';
        const rowBorder = isLight ? '#cbd5e1' : '#1e293b';
        const rowText = isLight ? (getThemeVar('--text-primary') || '#0f172a') : '#ffffff';
        const percentageColor = isLight ? (getThemeVar('--text-primary') || '#0f172a') : '#ffffff';
        const actionButtonStyle = isLight
            ? 'border: none;'
            : 'background: var(--bg-surface);';

        tbody.innerHTML = metasAtuais.map((meta, index) => {
            const guardado = parseFloat(meta.guardado) || 0;
            const alvo = parseFloat(meta.alvo) || 1;
            const porcentagem = Math.min((guardado / alvo) * 100, 100).toFixed(0);
            return `
                <tr class="planning-goal-row" style="border-bottom: 1px solid ${rowBorder}; color: ${rowText};">
                    <td class="planning-goal-name" data-label="Meta" style="padding: 20px 15px 20px 25px;">${meta.nome}</td>
                    <td class="planning-goal-target" data-label="Valor Alvo" style="padding: 20px 15px; font-weight: bold;">${formatarMoeda(meta.alvo)}</td>
                    <td class="planning-goal-deadline" data-label="Prazo" style="padding: 20px 15px;">${meta.prazo}</td>
                    <td class="planning-goal-progress-cell" data-label="Progresso" style="padding: 20px 15px;">
                        <div class="planning-goal-progress">
                            <div class="planning-goal-progress-track" style="flex: 1; height: 8px; background: ${progressBg}; border-radius: 4px; overflow: hidden;">
                                <div class="planning-goal-progress-fill" style="width: ${porcentagem}%; height: 100%; background: ${getThemeVar('--accent')}; box-shadow: 0 0 10px ${getThemeVar('--accent-soft')};"></div>
                            </div>
                            <span class="planning-goal-progress-value" style="font-size: 0.8rem; min-width: 35px; color: ${percentageColor}; font-weight: 700;">${porcentagem}%</span>
                        </div>
                    </td>
                    <td class="planning-goal-actions-cell" data-label="Ações" style="padding: 20px 15px; text-align: center;">
                        <div class="planning-goal-actions">
                               <button class="btn-action btn-add" onclick="window.abrirModalAporte(${index})" style="${actionButtonStyle}">
                                   <img src="${planningAddIconUrl}" class="planning-action-icon planning-action-icon-add" alt="Adicionar valor" title="Adicionar valor">
                            </button>
                               <button class="btn-action btn-edit" onclick="PlanejamentoModulo.abrirModalEditarMeta(${index})" style="${actionButtonStyle}">
                                   <img src="${planningEditIconUrl}" class="planning-action-icon planning-action-icon-edit" alt="Editar meta" title="Editar meta">
                            </button>
                               <button class="btn-action btn-delete" onclick="PlanejamentoModulo.removerMeta(${index})" style="${actionButtonStyle}">
                                   <img src="${planningDeleteIconUrl}" class="planning-action-icon planning-action-icon-delete" alt="Excluir meta" title="Excluir meta">
                            </button>
                        </div>
                    </td>
                </tr>`;
        }).join('');
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
        const porcentagemValor = limite > 0 ? (utilizado / limite) * 100 : 0;
        const porcentagemDisplay = Math.min(porcentagemValor, 100).toFixed(0);
        const corStatus = porcentagemValor >= 100 ? '#ef4444' : getThemeVar('--accent');
        const sombraStatus = porcentagemValor >= 100 ? '0 0 15px rgba(239, 68, 68, 0.5)' : `0 0 15px ${getThemeVar('--accent-soft')}`;

        const fill = document.getElementById('progressBudgetFill');
        if (fill) {
            requestAnimationFrame(() => {
                fill.style.width = `${porcentagemDisplay}%`;
                fill.style.background = corStatus;
                fill.style.boxShadow = sombraStatus;
            });
        }

        const percText = document.getElementById('progresso-porcentagem-text');
        if (percText) {
            percText.innerText = `${porcentagemDisplay}%`;
            percText.style.color = document.body.classList.contains('light-theme')
                ? (getThemeVar('--text-primary') || '#0f172a')
                : corStatus;
        }

        const gastoText = document.getElementById('gasto-total-text');
        if (gastoText) {
            const textPrimary = getThemeVar('--text-primary') || '#0f172a';
            // Alterado para exibir apenas o valor de gastos conforme solicitado
            gastoText.innerHTML = `<span style="font-weight: 700; color: ${textPrimary};">${formatarMoeda(utilizado)}</span>`;
        }

        const dispText = document.getElementById('disponivel-text');
        if (dispText) {
            dispText.innerText = saldo < 0 ? `Excedido: - ${formatarMoeda(Math.abs(saldo))}` : `Disponível: ${formatarMoeda(saldo)}`;
            dispText.style.color = document.body.classList.contains('light-theme')
                ? (getThemeVar('--text-primary') || '#0f172a')
                : (saldo < 0 ? '#ef4444' : getThemeVar('--accent'));
        }
    }
};

window.abrirModalAporte = (index) => {
    const inputIndex = document.getElementById('indexMetaAporte');
    const modal = document.getElementById('modalAporteMeta');
    if (inputIndex && modal) {
        inputIndex.value = index;
        modal.style.display = 'flex';
        PlanejamentoModulo.configurarMascaras();
    }
};