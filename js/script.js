// --- SELETORES DOS MODAIS ---
const registerModal = document.getElementById('registerModal');
const loginModal = document.getElementById('loginModal');
const forgotPasswordModal = document.getElementById('forgotPasswordModal');

// --- SELETORES DE BOTÕES DE ABERTURA ---
const btnOpenRegisterNav = document.getElementById('openBtnNav');
const btnOpenRegisterHero = document.getElementById('openBtnHero');
const btnOpenRegisterShowcase = document.getElementById('openBtnShowcase');
const btnOpenRegisterFinal = document.getElementById('openBtnFinal');

// BOTÕES QUE ABREM O LOGIN
const btnOpenLoginNav = document.querySelector('.btn-login'); 
const btnSaibaMais = document.querySelector('.btn-secondary-large'); 
const footerInfoModal = document.getElementById('footerInfoModal');
const btnCloseFooterInfo = document.getElementById('closeFooterInfoBtn');
const footerInfoEyebrow = document.getElementById('footerInfoEyebrow');
const footerInfoTitle = document.getElementById('footerInfoTitle');
const footerInfoDescription = document.getElementById('footerInfoDescription');
const footerInfoBody = document.getElementById('footerInfoBody');

// --- SELETORES DE FECHAMENTO E ALTERNÂNCIA ---
const btnCloseRegister = document.getElementById('closeBtn');
const btnCloseLogin = document.getElementById('closeLoginBtn');
const btnCloseForgotPassword = document.getElementById('closeForgotPasswordBtn');
const linkToLogin = document.getElementById('switchToLogin');
const linkToRegister = document.getElementById('switchToRegister');
const forgotPasswordLink = document.getElementById('forgotPasswordLink');
const navToggle = document.getElementById('navToggle');
const siteNavLinks = document.getElementById('siteNavLinks');
const footerToggles = document.querySelectorAll('.footer-toggle');
const themeToggleLanding = document.getElementById('themeToggleLanding');
const registerForm = document.getElementById('registrationForm');
const loginForm = document.getElementById('loginForm');
const forgotPasswordForm = document.getElementById('forgotPasswordForm');
const registerPassword = document.getElementById('registerPassword');
const registerPasswordConfirm = document.getElementById('registerPasswordConfirm');
const forgotPasswordNew = document.getElementById('forgotPasswordNew');
const forgotPasswordConfirm = document.getElementById('forgotPasswordConfirm');
const registerPasswordFeedback = document.getElementById('registerPasswordFeedback');
const forgotPasswordFeedback = document.getElementById('forgotPasswordFeedback');
let lastModalTrigger = null;

const footerModalContent = {
    'sobre': {
        eyebrow: 'Sobre o site',
        title: 'Vision Finance',
        description: 'Uma plataforma pensada para facilitar sua organização financeira diária.',
        body: `
            <section class="footer-modal-section">
                <span class="footer-modal-section-title">Visão geral</span>
                <p class="footer-modal-copy">O Vision Finance centraliza informações importantes da sua rotina financeira em uma interface simples, direta e confortável de usar.</p>
            </section>
            <section class="footer-modal-section">
                <span class="footer-modal-section-title">Principais pontos</span>
                <ul class="footer-modal-list">
                    <li>Organização de despesas pessoais.</li>
                    <li>Leitura clara em qualquer dispositivo.</li>
                    <li>Visual alinhado aos modos claro e escuro.</li>
                </ul>
            </section>
        `
    },
    'como-funciona': {
        eyebrow: 'Como funciona',
        title: 'Uso rápido e objetivo',
        description: 'O fluxo foi pensado para ser simples desde o primeiro acesso.',
        body: `
            <section class="footer-modal-section">
                <span class="footer-modal-section-title">Funcionamento</span>
                <p class="footer-modal-copy">Você registra gastos, acompanha carteiras e consulta o painel para entender melhor sua movimentação financeira.</p>
            </section>
            <section class="footer-modal-section">
                <span class="footer-modal-section-title">Etapas</span>
                <ul class="footer-modal-list">
                    <li>Cadastre despesas e categorias.</li>
                    <li>Acompanhe dados no painel principal.</li>
                    <li>Use relatórios e metas para planejar melhor.</li>
                </ul>
            </section>
        `
    },
    'contato': {
        eyebrow: 'Contato',
        title: 'Fale com a Vision Finance',
        description: 'Canal principal para dúvidas, suporte e informações gerais.',
        body: `
            <section class="footer-modal-section">
                <span class="footer-modal-section-title">Atendimento</span>
                <p class="footer-modal-copy">Para atendimento e suporte, utilize os canais abaixo.</p>
            </section>
            <section class="footer-modal-section">
                <span class="footer-modal-section-title">Canais</span>
                <ul class="footer-modal-list">
                    <li>E-mail: contato@visionfinance.com</li>
                    <li>Suporte digital pela plataforma.</li>
                    <li>Atendimento para dúvidas sobre uso e acesso.</li>
                </ul>
            </section>
        `
    }
};

// --- FUNÇÕES DE CONTROLE ---

function openModal(modal) {
    if(modal) {
        modal.classList.add('active');
        modal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden'; 

        const firstFocusable = modal.querySelector('button, a, input, select, textarea');
        if (firstFocusable) {
            requestAnimationFrame(() => firstFocusable.focus());
        }
    }
}

function closeModal(modal) {
    if(modal) {
        modal.classList.remove('active');
        modal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = 'auto'; 

        if (lastModalTrigger instanceof HTMLElement) {
            lastModalTrigger.focus();
            lastModalTrigger = null;
        }
    }
}

function setMobileNavState(isOpen) {
    if (!navToggle || !siteNavLinks) return;

    document.body.classList.toggle('nav-open', isOpen);
    navToggle.setAttribute('aria-expanded', String(isOpen));
    siteNavLinks.classList.toggle('is-open', isOpen);
}

function getPasswordValidationMessages(password) {
    const messages = [];

    if (password.length < 8) messages.push('Use no mínimo 8 caracteres.');
    if (!/[A-Z]/.test(password)) messages.push('Adicione pelo menos 1 letra maiúscula.');
    if (!/[a-z]/.test(password)) messages.push('Adicione pelo menos 1 letra minúscula.');
    if (!/[^A-Za-z0-9]/.test(password)) messages.push('Adicione pelo menos 1 caractere especial.');

    return messages;
}

function setFormFeedback(element, type, title, messages = []) {
    if (!element) return;

    element.classList.remove('is-error', 'is-success');
    element.classList.add(type === 'success' ? 'is-success' : 'is-error');
    element.hidden = false;
    element.innerHTML = messages.length
        ? `<p>${title}</p><ul>${messages.map(message => `<li>${message}</li>`).join('')}</ul>`
        : `<p>${title}</p>`;
}

function clearFormFeedback(element) {
    if (!element) return;

    element.hidden = true;
    element.classList.remove('is-error', 'is-success');
    element.innerHTML = '';
}

function validatePasswordFlow(password, confirmPassword) {
    const messages = getPasswordValidationMessages(password);

    if (password !== confirmPassword) {
        messages.push('A confirmação da senha deve ser igual à senha digitada.');
    }

    return messages;
}

function handleAuthRedirect(form) {
    const btn = form.querySelector('button[type="submit"]');
    if(btn) {
        btn.innerText = 'Acessando...';
        btn.style.opacity = '0.7';
        btn.disabled = true;
    }

    setTimeout(() => {
        window.location.href = 'dashboard.html';
    }, 1000);
}

function getStoredThemeSettings() {
    return JSON.parse(localStorage.getItem('visionFinance_settings')) || {};
}

function updateLandingThemeToggle() {
    if (!themeToggleLanding) return;

    const isDark = getStoredThemeSettings().temaEscuro === true;
    themeToggleLanding.setAttribute('aria-pressed', String(isDark));
    themeToggleLanding.title = isDark ? 'Ativar modo claro' : 'Ativar modo escuro';
}

function toggleLandingTheme() {
    const settings = getStoredThemeSettings();
    settings.temaEscuro = settings.temaEscuro !== true;
    localStorage.setItem('visionFinance_settings', JSON.stringify(settings));
    window.dispatchEvent(new Event('settingsUpdated'));
}

if (navToggle) {
    navToggle.addEventListener('click', () => {
        const isOpen = navToggle.getAttribute('aria-expanded') === 'true';
        setMobileNavState(!isOpen);
    });
}

if (themeToggleLanding) {
    themeToggleLanding.addEventListener('click', () => {
        toggleLandingTheme();
        updateLandingThemeToggle();
    });
}

footerToggles.forEach(toggle => {
    toggle.addEventListener('click', () => {
        const topic = toggle.dataset.footerTopic;
        const content = topic ? footerModalContent[topic] : null;

        if (!content || !footerInfoModal || !footerInfoEyebrow || !footerInfoTitle || !footerInfoDescription || !footerInfoBody) return;

        footerInfoEyebrow.textContent = content.eyebrow;
        footerInfoTitle.textContent = content.title;
        footerInfoDescription.textContent = content.description;
        footerInfoBody.innerHTML = content.body;
        lastModalTrigger = toggle;
        openModal(footerInfoModal);
    });
});

window.addEventListener('resize', () => {
    if (window.innerWidth > 768) {
        setMobileNavState(false);
    }
});

window.addEventListener('settingsUpdated', () => {
    updateLandingThemeToggle();
});

updateLandingThemeToggle();

// --- EVENTOS DE CLIQUE ---

// Abrir Cadastro (vários botões)
[btnOpenRegisterNav, btnOpenRegisterHero, btnOpenRegisterShowcase, btnOpenRegisterFinal].forEach(btn => {
    if(btn) {
        btn.addEventListener('click', () => {
            lastModalTrigger = btn;
            setMobileNavState(false);
            openModal(registerModal);
        });
    }
});

// Abrir Login (Pelo link da Navbar e pelo botão Saiba Mais)
[btnOpenLoginNav, btnSaibaMais].forEach(btn => {
    if(btn) {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            lastModalTrigger = btn;
            setMobileNavState(false);
            openModal(loginModal);
        });
    }
});

// Fechar nos botões (X)
if(btnCloseRegister) btnCloseRegister.addEventListener('click', () => closeModal(registerModal));
if(btnCloseLogin) btnCloseLogin.addEventListener('click', () => closeModal(loginModal));
if(btnCloseFooterInfo) btnCloseFooterInfo.addEventListener('click', () => closeModal(footerInfoModal));
if(btnCloseForgotPassword) btnCloseForgotPassword.addEventListener('click', () => closeModal(forgotPasswordModal));

// Alternar entre telas (dentro dos modais)
if(linkToLogin) {
    linkToLogin.addEventListener('click', (e) => {
        e.preventDefault();
        closeModal(registerModal);
        setTimeout(() => openModal(loginModal), 200);
    });
}

if(linkToRegister) {
    linkToRegister.addEventListener('click', (e) => {
        e.preventDefault();
        closeModal(loginModal);
        setTimeout(() => openModal(registerModal), 200);
    });
}

if (forgotPasswordLink) {
    forgotPasswordLink.addEventListener('click', (e) => {
        e.preventDefault();
        closeModal(loginModal);
        lastModalTrigger = forgotPasswordLink;
        setTimeout(() => openModal(forgotPasswordModal), 200);
    });
}

// Fechar ao clicar fora da caixa (no fundo escuro)
window.addEventListener('click', (e) => {
    if (e.target === registerModal) closeModal(registerModal);
    if (e.target === loginModal) closeModal(loginModal);
    if (e.target === footerInfoModal) closeModal(footerInfoModal);
    if (e.target === forgotPasswordModal) closeModal(forgotPasswordModal);

    if (siteNavLinks && navToggle && !siteNavLinks.contains(e.target) && !navToggle.contains(e.target)) {
        setMobileNavState(false);
    }
});

window.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;

    if (registerModal?.classList.contains('active')) closeModal(registerModal);
    if (loginModal?.classList.contains('active')) closeModal(loginModal);
    if (footerInfoModal?.classList.contains('active')) closeModal(footerInfoModal);
    if (forgotPasswordModal?.classList.contains('active')) closeModal(forgotPasswordModal);

    if (siteNavLinks?.classList.contains('is-open')) {
        setMobileNavState(false);
    }
});

// --- MÁSCARA DE CPF ---
const cpfInput = document.getElementById('cpfInput');
if(cpfInput) {
    cpfInput.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, ''); 
        if (value.length <= 11) {
            value = value.replace(/(\d{3})(\d)/, "$1.$2");
            value = value.replace(/(\d{3})(\d)/, "$1.$2");
            value = value.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
            e.target.value = value;
        }
    });
}

// --- REDIRECIONAMENTO APÓS LOGIN/CADASTRO (CORRIGIDO) ---
if (registerForm) {
    registerForm.addEventListener('submit', (e) => {
        e.preventDefault();

        clearFormFeedback(registerPasswordFeedback);
        const messages = validatePasswordFlow(registerPassword?.value || '', registerPasswordConfirm?.value || '');

        if (messages.length) {
            setFormFeedback(registerPasswordFeedback, 'error', 'Sua senha precisa seguir os critérios abaixo:', messages);
            return;
        }

        handleAuthRedirect(registerForm);
    });
}

if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        handleAuthRedirect(loginForm);
    });
}

if (forgotPasswordForm) {
    forgotPasswordForm.addEventListener('submit', (e) => {
        e.preventDefault();

        clearFormFeedback(forgotPasswordFeedback);
        const messages = validatePasswordFlow(forgotPasswordNew?.value || '', forgotPasswordConfirm?.value || '');

        if (messages.length) {
            setFormFeedback(forgotPasswordFeedback, 'error', 'A nova senha ainda não atende aos requisitos:', messages);
            return;
        }

        setFormFeedback(forgotPasswordFeedback, 'success', 'Senha redefinida com sucesso. Agora você já pode entrar com a nova senha.');

        setTimeout(() => {
            closeModal(forgotPasswordModal);
            openModal(loginModal);
            forgotPasswordForm.reset();
            clearFormFeedback(forgotPasswordFeedback);
        }, 1200);
    });
}

[registerPassword, registerPasswordConfirm].forEach((field) => {
    if (field) field.addEventListener('input', () => clearFormFeedback(registerPasswordFeedback));
});

[forgotPasswordNew, forgotPasswordConfirm].forEach((field) => {
    if (field) field.addEventListener('input', () => clearFormFeedback(forgotPasswordFeedback));
});

// Gerenciamento de Abas
const navPainel = document.getElementById('nav-painel');
const navCarteiras = document.getElementById('nav-carteiras');
const contentPainel = document.getElementById('content-painel');
const contentCarteiras = document.getElementById('content-carteiras');
const mainTitle = document.getElementById('mainTitle');

navCarteiras.addEventListener('click', (e) => {
    e.preventDefault();
    // Atualiza classes ativas
    navPainel.classList.remove('active');
    navCarteiras.classList.add('active');
    // Alterna visibilidade
    contentPainel.style.display = 'none';
    contentCarteiras.style.display = 'block';
    mainTitle.innerText = "Carteiras";
});

navPainel.addEventListener('click', (e) => {
    e.preventDefault();
    navCarteiras.classList.remove('active');
    navPainel.classList.add('active');
    contentCarteiras.style.display = 'none';
    contentPainel.style.display = 'block';
    mainTitle.innerText = "Painel";
});