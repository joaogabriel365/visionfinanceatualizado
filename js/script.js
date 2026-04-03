// --- SELETORES DOS MODAIS ---
const registerModal = document.getElementById('registerModal');
const loginModal = document.getElementById('loginModal');

// --- SELETORES DE BOTÕES DE ABERTURA ---
const btnOpenRegisterNav = document.getElementById('openBtnNav');
const btnOpenRegisterHero = document.getElementById('openBtnHero');
const btnOpenRegisterShowcase = document.getElementById('openBtnShowcase');
const btnOpenRegisterFinal = document.getElementById('openBtnFinal');

// BOTÕES QUE ABREM O LOGIN
const btnOpenLoginNav = document.querySelector('.btn-login'); 
const btnSaibaMais = document.querySelector('.btn-secondary-large'); 

// --- SELETORES DE FECHAMENTO E ALTERNÂNCIA ---
const btnCloseRegister = document.getElementById('closeBtn');
const btnCloseLogin = document.getElementById('closeLoginBtn');
const linkToLogin = document.getElementById('switchToLogin');
const linkToRegister = document.getElementById('switchToRegister');
const navToggle = document.getElementById('navToggle');
const siteNavLinks = document.getElementById('siteNavLinks');

// --- FUNÇÕES DE CONTROLE ---

function openModal(modal) {
    if(modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden'; 
    }
}

function closeModal(modal) {
    if(modal) {
        modal.classList.remove('active');
        document.body.style.overflow = 'auto'; 
    }
}

function setMobileNavState(isOpen) {
    if (!navToggle || !siteNavLinks) return;

    document.body.classList.toggle('nav-open', isOpen);
    navToggle.setAttribute('aria-expanded', String(isOpen));
    siteNavLinks.classList.toggle('is-open', isOpen);
}

if (navToggle) {
    navToggle.addEventListener('click', () => {
        const isOpen = navToggle.getAttribute('aria-expanded') === 'true';
        setMobileNavState(!isOpen);
    });
}

window.addEventListener('resize', () => {
    if (window.innerWidth > 768) {
        setMobileNavState(false);
    }
});

// --- EVENTOS DE CLIQUE ---

// Abrir Cadastro (vários botões)
[btnOpenRegisterNav, btnOpenRegisterHero, btnOpenRegisterShowcase, btnOpenRegisterFinal].forEach(btn => {
    if(btn) {
        btn.addEventListener('click', () => {
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
            setMobileNavState(false);
            openModal(loginModal);
        });
    }
});

// Fechar nos botões (X)
if(btnCloseRegister) btnCloseRegister.addEventListener('click', () => closeModal(registerModal));
if(btnCloseLogin) btnCloseLogin.addEventListener('click', () => closeModal(loginModal));

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

// Fechar ao clicar fora da caixa (no fundo escuro)
window.addEventListener('click', (e) => {
    if (e.target === registerModal) closeModal(registerModal);
    if (e.target === loginModal) closeModal(loginModal);

    if (siteNavLinks && navToggle && !siteNavLinks.contains(e.target) && !navToggle.contains(e.target)) {
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
const authForms = [document.getElementById('registrationForm'), document.getElementById('loginForm')];

authForms.forEach(form => {
    if(form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            
            // Pequena animação no botão dentro do formulário atual
            const btn = form.querySelector('button[type="submit"]');
            if(btn) {
                btn.innerText = "Acessando...";
                btn.style.opacity = "0.7";
                btn.disabled = true;
            }

            setTimeout(() => {
                // Redireciona para a página do painel
                // Certifique-se que o arquivo dashboard.html existe na mesma pasta
                window.location.href = "dashboard.html"; 
            }, 1000);
        });
    }
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