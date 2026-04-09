import { confirmarAcao } from './common.js';

export const PerfilModulo = {
    tipoAtivo: '',
    dadosOriginais: {},
    storageKey: 'visionFinance_profile',
    fotoTemporaria: null,
    fotoOriginalTemporaria: null,
    fotoCropTemporario: null,
    editorFotoSrc: '',
    editorFotoImagem: null,
    editorFotoEstado: {
        zoom: 1,
        offsetX: 0,
        offsetY: 0
    },

    init() {
        this.aplicarDadosPerfilSalvos();
        this.dadosOriginais = {
            nome: document.getElementById('perfilNome').value,
            sobrenome: document.getElementById('perfilSobrenome').value,
            email: document.getElementById('perfilEmail').value,
            foto: this.getProfileData().foto || ''
        };

        this.configurarListeners();
        this.renderizarTotaisResumo();
        this.renderizarAvatar();
        window.PerfilModulo = this;
    },

    configurarListeners() {
        const formPerfil = document.getElementById('formPerfil');
        const btnSalvar = document.getElementById('btnSalvarPerfil');
        const inputs = formPerfil.querySelectorAll('input');
        const formSenha = document.getElementById('formSenha');
        const passwordFeedback = document.getElementById('perfilPasswordFeedback');
        const uploadTrigger = document.getElementById('avatarUploadTrigger');
        const changePhotoButton = document.getElementById('avatarChangeBtn');
        const photoInput = document.getElementById('perfilFotoInput');
        const removePhotoButton = document.getElementById('avatarRemoveBtn');
        const editFrameButton = document.getElementById('avatarEditFrameBtn');
        const editorZoom = document.getElementById('avatarEditorZoom');
        const editorOffsetX = document.getElementById('avatarEditorOffsetX');
        const editorOffsetY = document.getElementById('avatarEditorOffsetY');
        const applyEditorButton = document.getElementById('avatarEditorApplyBtn');
        const editorModal = document.getElementById('modalAvatarEditor');

        const getPasswordValidationMessages = (password) => {
            const messages = [];

            if (password.length < 8) messages.push('Use no mínimo 8 caracteres.');
            if (!/[A-Z]/.test(password)) messages.push('Adicione pelo menos 1 letra maiúscula.');
            if (!/[a-z]/.test(password)) messages.push('Adicione pelo menos 1 letra minúscula.');
            if (!/[^A-Za-z0-9]/.test(password)) messages.push('Adicione pelo menos 1 caractere especial.');

            return messages;
        };

        const limparFeedbackSenha = () => {
            if (!passwordFeedback) return;
            passwordFeedback.hidden = true;
            passwordFeedback.classList.remove('is-error', 'is-success');
            passwordFeedback.innerHTML = '';
        };

        const exibirFeedbackSenha = (tipo, titulo, mensagens = []) => {
            if (!passwordFeedback) return;
            passwordFeedback.hidden = false;
            passwordFeedback.classList.remove('is-error', 'is-success');
            passwordFeedback.classList.add(tipo === 'success' ? 'is-success' : 'is-error');
            passwordFeedback.innerHTML = mensagens.length
                ? `<p>${titulo}</p><ul>${mensagens.map((mensagem) => `<li>${mensagem}</li>`).join('')}</ul>`
                : `<p>${titulo}</p>`;
        };

        inputs.forEach((input) => {
            input.addEventListener('input', () => {
                this.atualizarBotaoSalvar();
            });
        });

        if (uploadTrigger && photoInput && !uploadTrigger.dataset.bound) {
            uploadTrigger.dataset.bound = 'true';
            uploadTrigger.addEventListener('click', () => photoInput.click());
        }

        if (changePhotoButton && photoInput && !changePhotoButton.dataset.bound) {
            changePhotoButton.dataset.bound = 'true';
            changePhotoButton.addEventListener('click', () => photoInput.click());
        }

        if (photoInput && !photoInput.dataset.bound) {
            photoInput.dataset.bound = 'true';
            photoInput.addEventListener('change', async (event) => {
                const [file] = event.target.files || [];
                if (!file) return;

                try {
                    const fotoSrc = await this.lerArquivoImagem(file);
                    await this.abrirEditorFoto(fotoSrc);
                } catch (error) {
                    this.exibirFeedbackFoto('error', error.message || 'Nao foi possivel carregar a foto selecionada.');
                } finally {
                    event.target.value = '';
                }
            });
        }

        if (removePhotoButton && !removePhotoButton.dataset.bound) {
            removePhotoButton.dataset.bound = 'true';
            removePhotoButton.addEventListener('click', async () => {
                const confirmado = await confirmarAcao(
                    'Remover foto de perfil',
                    'A foto será removida da pré-visualização. Para concluir a alteração, você ainda precisará salvar o perfil.',
                    {
                        confirmText: 'Remover foto',
                        cancelText: 'Manter foto',
                        iconAlt: 'Remover foto'
                    }
                );

                if (!confirmado) return;

                this.fotoTemporaria = '';
                this.fotoOriginalTemporaria = '';
                this.fotoCropTemporario = null;
                this.renderizarAvatar();
                this.atualizarBotaoSalvar();
                this.exibirFeedbackFoto('info', 'Foto removida da pré-visualização. Clique em Salvar Alterações para aplicar a mudança.');
            });
        }

        if (editFrameButton && !editFrameButton.dataset.bound) {
            editFrameButton.dataset.bound = 'true';
            editFrameButton.addEventListener('click', async () => {
                try {
                    await this.abrirEditorFotoAtual();
                } catch (error) {
                    this.exibirFeedbackFoto('error', error.message || 'Nao foi possivel abrir o editor da foto atual.');
                }
            });
        }

        [editorZoom, editorOffsetX, editorOffsetY].forEach((control) => {
            if (control && !control.dataset.bound) {
                control.dataset.bound = 'true';
                control.addEventListener('input', () => {
                    this.editorFotoEstado.zoom = Number(editorZoom?.value || 100) / 100;
                    this.editorFotoEstado.offsetX = Number(editorOffsetX?.value || 0) / 100;
                    this.editorFotoEstado.offsetY = Number(editorOffsetY?.value || 0) / 100;
                    this.atualizarPreviewEditorFoto();
                });
            }
        });

        if (applyEditorButton && !applyEditorButton.dataset.bound) {
            applyEditorButton.dataset.bound = 'true';
            applyEditorButton.addEventListener('click', () => this.aplicarEnquadramentoFoto());
        }

        if (editorModal && !editorModal.dataset.bound) {
            editorModal.dataset.bound = 'true';
            editorModal.addEventListener('click', (event) => {
                if (event.target === editorModal) {
                    this.cancelarEdicaoFoto();
                }
            });
        }

        formPerfil.onsubmit = (e) => {
            e.preventDefault();
            const nome = document.getElementById('perfilNome').value;
            const sobrenome = document.getElementById('perfilSobrenome').value;
            const email = document.getElementById('perfilEmail').value;
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

            document.getElementById('userNameDisplay').innerText = `${nome} ${sobrenome}`;
            document.getElementById('userEmailDisplay').innerText = email;
            this.renderizarAvatar();
            this.dadosOriginais = {
                nome,
                sobrenome,
                email,
                foto: fotoFinal || ''
            };

            btnSalvar.disabled = true;
            btnSalvar.classList.remove('active');
            window.dispatchEvent(new Event('profileUpdated'));
            this.exibirFeedbackFoto(
                'success',
                houveMudancaFoto
                    ? 'Perfil atualizado com sucesso. Sua foto já está salva e sincronizada com o dashboard.'
                    : 'Perfil atualizado com sucesso.'
            );
        };

        if (formSenha) {
            formSenha.onsubmit = (e) => {
                e.preventDefault();
                const nova = document.getElementById('novaSenha').value;
                const confirma = document.getElementById('confirmaSenha').value;
                const mensagens = getPasswordValidationMessages(nova);

                limparFeedbackSenha();

                if (nova !== confirma) {
                    mensagens.push('A confirmação da senha deve ser igual à nova senha digitada.');
                }

                if (mensagens.length) {
                    exibirFeedbackSenha('error', 'A nova senha ainda não atende aos critérios exigidos:', mensagens);
                    return;
                }

                exibirFeedbackSenha('success', 'Senha alterada com sucesso.');
                setTimeout(() => {
                    this.fecharModal('modalSenha');
                    e.target.reset();
                    limparFeedbackSenha();
                }, 1200);
            };
        }

        ['novaSenha', 'confirmaSenha'].forEach((id) => {
            const field = document.getElementById(id);
            if (field) {
                field.addEventListener('input', limparFeedbackSenha);
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
        const nome = profile.nome || document.getElementById('perfilNome')?.value || 'Joao';
        const sobrenome = profile.sobrenome || document.getElementById('perfilSobrenome')?.value || 'Silva';
        const email = profile.email || document.getElementById('perfilEmail')?.value || 'joao@exemplo.com';

        const nomeInput = document.getElementById('perfilNome');
        const sobrenomeInput = document.getElementById('perfilSobrenome');
        const emailInput = document.getElementById('perfilEmail');
        const nomeDisplay = document.getElementById('userNameDisplay');
        const emailDisplay = document.getElementById('userEmailDisplay');

        if (nomeInput) nomeInput.value = nome;
        if (sobrenomeInput) sobrenomeInput.value = sobrenome;
        if (emailInput) emailInput.value = email;
        if (nomeDisplay) nomeDisplay.innerText = `${nome} ${sobrenome}`;
        if (emailDisplay) emailDisplay.innerText = email;
    },

    getInitials() {
        const nome = document.getElementById('perfilNome')?.value?.trim() || 'Joao';
        const sobrenome = document.getElementById('perfilSobrenome')?.value?.trim() || 'Silva';
        return `${nome.charAt(0)}${sobrenome.charAt(0)}`.toUpperCase();
    },

    renderizarAvatar() {
        const avatar = document.getElementById('avatarIcon');
        const removePhotoButton = document.getElementById('avatarRemoveBtn');
        const editFrameButton = document.getElementById('avatarEditFrameBtn');
        if (!avatar) return;

        const initials = this.getInitials();
        const fotoAtual = this.getFotoAtualEdicao();

        if (fotoAtual) {
            avatar.classList.add('has-photo');
            avatar.innerHTML = `<img src="${fotoAtual}" alt="Foto de perfil">`;
            if (removePhotoButton) removePhotoButton.hidden = false;
            if (editFrameButton) editFrameButton.hidden = false;
        } else {
            avatar.classList.remove('has-photo');
            avatar.innerHTML = `<span>${initials}</span>`;
            if (removePhotoButton) removePhotoButton.hidden = !this.dadosOriginais.foto && this.fotoTemporaria === null;
            if (editFrameButton) editFrameButton.hidden = true;
        }
    },

    atualizarBotaoSalvar() {
        const btnSalvar = document.getElementById('btnSalvarPerfil');
        if (!btnSalvar) return;

        const alterado =
            document.getElementById('perfilNome').value !== this.dadosOriginais.nome ||
            document.getElementById('perfilSobrenome').value !== this.dadosOriginais.sobrenome ||
            document.getElementById('perfilEmail').value !== this.dadosOriginais.email ||
            this.getFotoAtualEdicao() !== this.dadosOriginais.foto;

        btnSalvar.disabled = !alterado;
        btnSalvar.classList.toggle('active', alterado);
    },

    getFotoAtualEdicao() {
        if (this.fotoTemporaria !== null) {
            return this.fotoTemporaria;
        }

        return this.getProfileData().foto || '';
    },

    getFotoOriginalAtualEdicao() {
        if (this.fotoOriginalTemporaria !== null) {
            return this.fotoOriginalTemporaria;
        }

        const profile = this.getProfileData();
        return profile.fotoOriginal || profile.foto || '';
    },

    getFotoCropAtualEdicao() {
        if (this.fotoCropTemporario !== null) {
            return this.fotoCropTemporario;
        }

        const profile = this.getProfileData();
        return profile.fotoCrop || null;
    },

    exibirFeedbackFoto(tipo, mensagem) {
        const feedback = document.getElementById('avatarFeedback');
        if (!feedback) return;

        feedback.hidden = false;
        feedback.className = `avatar-feedback is-${tipo}`;
        feedback.textContent = mensagem;
    },

    lerArquivoImagem(file) {
        return new Promise((resolve, reject) => {
            if (!file.type.startsWith('image/')) {
                reject(new Error('Selecione um arquivo de imagem valido.'));
                return;
            }

            if (file.size > 8 * 1024 * 1024) {
                reject(new Error('A imagem deve ter no maximo 8 MB.'));
                return;
            }

            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(new Error('Nao foi possivel carregar o arquivo selecionado.'));
            reader.readAsDataURL(file);
        });
    },

    carregarImagem(src) {
        return new Promise((resolve, reject) => {
            const image = new Image();
            image.onload = () => resolve(image);
            image.onerror = () => reject(new Error('A imagem selecionada nao pode ser lida.'));
            image.src = src;
        });
    },

    async abrirEditorFoto(src, cropState = null) {
        const editorImage = document.getElementById('avatarEditorImage');
        const editorZoom = document.getElementById('avatarEditorZoom');
        const editorOffsetX = document.getElementById('avatarEditorOffsetX');
        const editorOffsetY = document.getElementById('avatarEditorOffsetY');
        const modal = document.getElementById('modalAvatarEditor');

        this.editorFotoImagem = await this.carregarImagem(src);
        this.editorFotoSrc = src;
        this.editorFotoEstado = cropState
            ? {
                zoom: Number(cropState.zoom) || 1,
                offsetX: Number(cropState.offsetX) || 0,
                offsetY: Number(cropState.offsetY) || 0
            }
            : {
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
            modal.style.display = 'flex';
        }

        this.atualizarPreviewEditorFoto();
    },

    async abrirEditorFotoAtual() {
        const fotoAtual = this.getFotoAtualEdicao();
        if (!fotoAtual) {
            throw new Error('Nenhuma foto atual disponível para editar.');
        }

        const source = this.getFotoOriginalAtualEdicao() || fotoAtual;
        const cropState = this.getFotoCropAtualEdicao();
        await this.abrirEditorFoto(source, cropState);
    },

    atualizarPreviewEditorFoto() {
        const frame = document.getElementById('avatarEditorFrame');
        const image = document.getElementById('avatarEditorImage');

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
        image.style.transform = 'translate(-50%, -50%)';
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
            this.exibirFeedbackFoto('info', 'Enquadramento atualizado. Clique em Salvar Alterações para confirmar a nova foto de perfil.');
        } catch (error) {
            this.exibirFeedbackFoto('error', error.message || 'Nao foi possivel aplicar o enquadramento da foto.');
        }
    },

    gerarFotoRecortada() {
        if (!this.editorFotoImagem) {
            throw new Error('Nenhuma imagem foi carregada para edicao.');
        }

        const frame = document.getElementById('avatarEditorFrame');
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
        const centerX = (this.editorFotoImagem.width / 2) - (offsetXPx / scale);
        const centerY = (this.editorFotoImagem.height / 2) - (offsetYPx / scale);
        const maxStartX = this.editorFotoImagem.width - cropSize;
        const maxStartY = this.editorFotoImagem.height - cropSize;
        const startX = Math.min(Math.max(0, centerX - (cropSize / 2)), Math.max(0, maxStartX));
        const startY = Math.min(Math.max(0, centerY - (cropSize / 2)), Math.max(0, maxStartY));
        const canvas = document.createElement('canvas');
        const targetSize = 320;
        canvas.width = targetSize;
        canvas.height = targetSize;

        const context = canvas.getContext('2d');
        if (!context) {
            throw new Error('Nao foi possivel processar a imagem.');
        }

        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = 'high';
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

        return canvas.toDataURL('image/jpeg', 0.9);
    },

    cancelarEdicaoFoto() {
        const modal = document.getElementById('modalAvatarEditor');
        const editorImage = document.getElementById('avatarEditorImage');

        if (modal) {
            modal.style.display = 'none';
        }

        this.editorFotoSrc = '';
        this.editorFotoImagem = null;
        this.editorFotoEstado = {
            zoom: 1,
            offsetX: 0,
            offsetY: 0
        };

        if (editorImage) {
            editorImage.removeAttribute('src');
            editorImage.removeAttribute('style');
        }
    },

    processarFotoPerfil() {
        return this.gerarFotoRecortada();
    },

    obterDadosConsolidados() {
        const despesasGerais = JSON.parse(localStorage.getItem('despesas')) || [];
        const metas = JSON.parse(localStorage.getItem('metas')) || [];

        const despesasMetas = metas.map((m) => ({
            titulo: `Meta: ${m.nome}`,
            valor: parseFloat(m.guardado) || 0,
            data: new Date().toISOString().split('T')[0],
            categoria: 'Planejamento'
        }));

        return [...despesasGerais, ...despesasMetas];
    },

    renderizarTotaisResumo() {
        const hoje = new Date();
        const dados = this.obterDadosConsolidados();

        const totalD = dados.reduce((acc, item) => {
            const dataItem = new Date(item.data + 'T00:00:00');
            if (dataItem.getMonth() === hoje.getMonth()) return acc + item.valor;
            return acc;
        }, 0);

        const totalR = parseFloat(localStorage.getItem('budget_total')) || 0;

        document.getElementById('totalDespesas').innerText = `R$ ${totalD.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
        document.getElementById('totalReceitas').innerText = `R$ ${totalR.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    },

    abrirDetalhamento(tipo) {
        this.tipoAtivo = tipo;
        document.getElementById('modalDetalhamento').style.display = 'flex';
        document.getElementById('modalDetalhamentoTitulo').innerText = tipo === 'receitas' ? 'Orçamento Mensal' : 'Detalhamento de Gastos';
        this.atualizarListaDetalhada();
    },

    abrirModalSenha() {
        document.getElementById('modalSenha').style.display = 'flex';
    },

    fecharModal(id) {
        document.getElementById(id).style.display = 'none';
    },

    atualizarListaDetalhada() {
        const container = document.getElementById('listaDetalhada');
        container.innerHTML = '';

        if (this.tipoAtivo === 'receitas') {
            const valor = localStorage.getItem('budget_total') || '0';
            container.innerHTML = `
                <div class="perfil-item income-border">
                    <div class="item-info">
                        <span>Teto de Gastos Definido</span>
                        <small>Mensal</small>
                    </div>
                    <strong class="text-success">R$ ${parseFloat(valor).toFixed(2)}</strong>
                </div>`;
            return;
        }

        const filtradas = this.obterDadosConsolidados();
        filtradas.forEach((item) => {
            const isMeta = item.titulo.includes('Meta:');
            container.innerHTML += `
                <div class="perfil-item ${isMeta ? 'meta-border' : ''}">
                    <div class="item-info">
                        <span class="${isMeta ? 'text-highlight' : ''}">${item.titulo}</span>
                        <small class="perfil-tag">${item.categoria}</small>
                    </div>
                    <strong class="text-danger">R$ ${item.valor.toFixed(2)}</strong>
                </div>`;
        });
    }
};
