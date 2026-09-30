/* ==========================================================================
   KY WIFI TELECOM - SCRIPT PRINCIPAL (CORRIGIDO)
   ========================================================================== */

const NUMERO_WHATSAPP = "5561982031828";
const COOKIE_NAME = "ky_telecom_lgpd_consent";
const FIREBASE_DB_URL = "https://ky-wi-fi-telecom-default-rtdb.firebaseio.com/feedbacks.json";

let notaSelecionada = 5;
let feedbackIndex = 0;
let totalFeedbacks = 0;
let autoPlayTimer = null;
let carregandoFeedbacks = false;
let enviandoFeedback = false;

/* --- UTILITÁRIOS --- */
function escapeHTML(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function showToast(mensagem, tipo = 'success') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `custom-toast toast-${tipo}`;
    const icone = tipo === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle';
    toast.innerHTML = `<i class="fas ${icone}"></i><span>${escapeHTML(mensagem)}</span>`;

    container.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

/* --- COOKIES E LGPD --- */
function setCookie(name, value, days) {
    let expires = "";
    if (days) {
        const date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = `${name}=${encodeURIComponent(value)}${expires}; path=/; SameSite=Lax`;
}

function getCookie(name) {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i].trim();
        if (c.indexOf(nameEQ) === 0) {
            return decodeURIComponent(c.substring(nameEQ.length, c.length));
        }
    }
    return null;
}

function initLGPD() {
    const lgpdBanner = document.getElementById('lgpd-banner');
    const acceptBtn = document.getElementById('lgpd-accept');
    const rejectBtn = document.getElementById('lgpd-reject');

    if (!lgpdBanner) return;

    const consent = getCookie(COOKIE_NAME) || localStorage.getItem(COOKIE_NAME);

    if (!consent) {
        setTimeout(() => {
            lgpdBanner.classList.add('active');
        }, 500);
    } else if (consent === 'all') {
        initTrackingScripts();
    }

    if (acceptBtn) {
        acceptBtn.addEventListener('click', () => registrarConsentimento('all'));
    }

    if (rejectBtn) {
        rejectBtn.addEventListener('click', () => registrarConsentimento('essential'));
    }
}

function registrarConsentimento(tipo) {
    const lgpdBanner = document.getElementById('lgpd-banner');
    setCookie(COOKIE_NAME, tipo, 365);
    localStorage.setItem(COOKIE_NAME, tipo);

    if (lgpdBanner) {
        lgpdBanner.classList.remove('active');
    }

    if (tipo === 'all') {
        initTrackingScripts();
    }
}

function initTrackingScripts() {
    console.log('LGPD: Consentimento total concedido.');
}

/* --- NAVEGAÇÃO E MÁSCARAS --- */
function falarComAtendente(event, planoNome = "", planoVelocidade = "") {
    if (event) event.preventDefault();
    let textoBase = "Olá! Estou acessando o site e gostaria de saber mais informações sobre a Ky WIFI.";
    if (planoNome && planoVelocidade) {
        textoBase = `Olá! Gostaria de contratar o Plano ${planoNome} de ${planoVelocidade} MEGA com Instalação Grátis e Wi-Fi 6!`;
    }
    const mensagem = encodeURIComponent(textoBase);
    window.open(`https://wa.me/${NUMERO_WHATSAPP}?text=${mensagem}`, '_blank', 'noopener,noreferrer');
}

function toggleMenu() {
    const navMenu = document.getElementById('navMenu');
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    if (navMenu) {
        const isActive = navMenu.classList.toggle('active');
        if (hamburgerBtn) {
            hamburgerBtn.setAttribute('aria-expanded', isActive ? 'true' : 'false');
        }
    }
}

function closeMenu() {
    const navMenu = document.getElementById('navMenu');
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    if (navMenu) {
        navMenu.classList.remove('active');
        if (hamburgerBtn) {
            hamburgerBtn.setAttribute('aria-expanded', 'false');
        }
    }
}

function aplicarMascaraCPF(input) {
    let value = input.value.replace(/\D/g, "");
    if (value.length > 11) value = value.slice(0, 11);
    value = value.replace(/(\d{3})(\d)/, "$1.$2");
    value = value.replace(/(\d{3})(\d)/, "$1.$2");
    value = value.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    input.value = value;
}

function aplicarMascaraTelefone(input) {
    let value = input.value.replace(/\D/g, "");
    if (value.length > 11) value = value.slice(0, 11);

    if (value.length > 10) {
        value = value.replace(/^(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
    } else if (value.length > 5) {
        value = value.replace(/^(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3");
    } else if (value.length > 2) {
        value = value.replace(/^(\d{2})(\d{0,5})/, "($1) $2");
    } else {
        value = value.replace(/^(\d*)/, "($1");
    }

    input.value = value;
}

/* --- RENDERIZAÇÃO DE PLANOS --- */
function renderizarPlanos() {
    const containerPlanos = document.getElementById('plans-container');
    if (!containerPlanos) return;

    const planos = [
        { nome: 'Básico', velocidade: '400', preco: '79,90', destaque: false },
        { nome: 'Família', velocidade: '700', preco: '99,90', destaque: true },
        { nome: 'Gamer Ultra', velocidade: '1000', preco: '139,90', destaque: false }
    ];

    containerPlanos.innerHTML = '';
    planos.forEach((plano, index) => {
        const delay = index * 0.2;
        const cardHTML = `
            <div class="plan-card ${plano.destaque ? 'highlight' : ''}" style="animation-delay: ${delay}s">
                ${plano.destaque ? '<div class="plan-badge">Mais Vendido</div>' : ''}
                <div class="plan-name">${plano.nome}</div>
                <div class="plan-speed">${plano.velocidade}<small> MEGA</small></div>
                <div class="plan-price"><span class="currency">R$</span> ${plano.preco} <span class="period">/mês</span></div>
                <ul class="plan-features">
                    <li><i class="fas fa-check-circle" aria-hidden="true"></i> Instalação Grátis</li>
                    <li><i class="fas fa-check-circle" aria-hidden="true"></i> Roteador Wi-Fi 6</li>
                    <li><i class="fas fa-check-circle" aria-hidden="true"></i> Suporte 24/7</li>
                </ul>
                <a href="contratar.html?plano=${plano.velocidade}" class="btn-contract" aria-label="Assinar Plano ${plano.nome} de ${plano.velocidade} Mega">Assinar Plano</a>
            </div>
        `;
        containerPlanos.innerHTML += cardHTML;
    });
}

function initObserver() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                if (entry.target.id === 'planos') {
                    document.querySelectorAll('.plan-card').forEach(card => {
                        card.classList.add('active-reveal');
                    });
                }
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
    const sectionPlanos = document.getElementById('planos');
    if (sectionPlanos) observer.observe(sectionPlanos);
}

function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js', { scope: './' })
                .then(() => console.log('Service Worker registrado.'))
                .catch(err => console.error('Erro ao registrar SW:', err));
        });
    }
}

/* --- DEPOIMENTOS E CARROSSEL --- */
function definirNota(valor) {
    notaSelecionada = valor;
    const inputNota = document.getElementById('feedbackNota');
    if (inputNota) inputNota.value = valor;

    const estrelas = document.querySelectorAll('#starRatingInput .star-btn');
    estrelas.forEach((estrela, index) => {
        if (index < valor) {
            estrela.classList.add('active');
        } else {
            estrela.classList.remove('active');
        }
    });
}

function atualizarPosicaoCarrossel() {
    const track = document.getElementById('carouselTrack');
    if (!track) return;
    track.style.transform = `translateX(-${feedbackIndex * 100}%)`;
}

function iniciarAutoPlay() {
    pararAutoPlay();
    if (totalFeedbacks > 1) {
        autoPlayTimer = setInterval(() => proximoFeedback(false), 4000);
    }
}

function pararAutoPlay() {
    if (autoPlayTimer) {
        clearInterval(autoPlayTimer);
        autoPlayTimer = null;
    }
}

function proximoFeedback(manual = true) {
    if (totalFeedbacks === 0) return;
    feedbackIndex = (feedbackIndex + 1) % totalFeedbacks;
    atualizarPosicaoCarrossel();
    if (manual) iniciarAutoPlay();
}

function feedbackAnterior(manual = true) {
    if (totalFeedbacks === 0) return;
    feedbackIndex = (feedbackIndex - 1 + totalFeedbacks) % totalFeedbacks;
    atualizarPosicaoCarrossel();
    if (manual) iniciarAutoPlay();
}

async function carregarFeedbacks() {
    if (carregandoFeedbacks) return;
    carregandoFeedbacks = true;

    const container = document.querySelector('.testimonials-container');
    if (!container) {
        carregandoFeedbacks = false;
        return;
    }

    try {
        const response = await fetch(FIREBASE_DB_URL);
        const data = await response.json();

        if (!data) {
            container.innerHTML = '<p style="color: #64748b; text-align: center;">Nenhuma avaliação enviada ainda. Seja o primeiro a avaliar!</p>';
            totalFeedbacks = 0;
            pararAutoPlay();
            return;
        }

        // Filtra apenas depoimentos com texto válido
        const validKeys = Object.keys(data).reverse().filter(key => {
            const fb = data[key];
            if (!fb || !fb.comentario) return false;
            const comentarioLimpo = String(fb.comentario).trim();
            return comentarioLimpo !== '' && comentarioLimpo !== '""';
        });

        if (validKeys.length === 0) {
            container.innerHTML = '<p style="color: #64748b; text-align: center;">Nenhuma avaliação enviada ainda. Seja o primeiro a avaliar!</p>';
            totalFeedbacks = 0;
            pararAutoPlay();
            return;
        }

        totalFeedbacks = validKeys.length;

        let cardsHTML = '';
        validKeys.forEach(key => {
            const fb = data[key];
            const nota = Math.min(Math.max(parseInt(fb.nota, 10) || 5, 1), 5);
            const estrelasStr = '★'.repeat(nota) + '☆'.repeat(5 - nota);

            cardsHTML += `
                <div class="testimonial-card">
                    <div class="stars" style="color: #FFB800;">${estrelasStr}</div>
                    <p>"${escapeHTML(fb.comentario.trim())}"</p>
                    <h4>${escapeHTML(fb.nome || 'Cliente')}</h4>
                    <span>${escapeHTML(fb.plano || '')}</span>
                </div>
            `;
        });

        container.innerHTML = `
            <div class="carousel-wrapper" onmouseenter="pararAutoPlay()" onmouseleave="iniciarAutoPlay()">
                <button type="button" class="carousel-btn prev-btn" onclick="feedbackAnterior(true)" aria-label="Avaliação Anterior">‹</button>
                <div class="carousel-viewport">
                    <div class="carousel-track" id="carouselTrack">
                        ${cardsHTML}
                    </div>
                </div>
                <button type="button" class="carousel-btn next-btn" onclick="proximoFeedback(true)" aria-label="Próxima Avaliação">›</button>
            </div>
        `;

        if (feedbackIndex >= totalFeedbacks) feedbackIndex = 0;
        atualizarPosicaoCarrossel();
        iniciarAutoPlay();

    } catch (error) {
        console.error("Erro ao carregar avaliações:", error);
    } finally {
        carregandoFeedbacks = false;
    }
}

/* Uma única função de envio (sem duplicação) */
async function salvarFeedback(event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }

    if (enviandoFeedback) return;

    const btnSubmit = event?.target?.querySelector?.('button[type="submit"]')
        || document.querySelector('#feedbackForm button[type="submit"]');

    const nome = document.getElementById('feedbackNome')?.value.trim();
    const plano = document.getElementById('feedbackTipo')?.value;
    const comentario = document.getElementById('feedbackComentario')?.value.trim();
    const nota = parseInt(document.getElementById('feedbackNota')?.value, 10) || notaSelecionada;

    if (!nome || !plano || !comentario || comentario === '""') {
        showToast('Por favor, preencha todos os campos e digite seu comentário.', 'error');
        return;
    }

    enviandoFeedback = true;
    if (btnSubmit) {
        btnSubmit.disabled = true;
        btnSubmit.innerText = "Enviando...";
    }

    const novoFeedback = {
        nome: nome,
        plano: plano,
        comentario: comentario,
        nota: nota,
        data: new Date().toISOString()
    };

    try {
        const response = await fetch(FIREBASE_DB_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(novoFeedback)
        });

        if (response.ok) {
            showToast('Avaliação enviada com sucesso!', 'success');
            document.getElementById('feedbackForm')?.reset();
            definirNota(5);
            // Recarrega a lista uma única vez
            await carregarFeedbacks();
        } else {
            showToast('Ocorreu um erro ao gravar sua avaliação. Tente novamente.', 'error');
        }
    } catch (error) {
        console.error("Erro ao conectar ao banco de dados:", error);
        showToast('Erro ao conectar ao servidor.', 'error');
    } finally {
        enviandoFeedback = false;
        if (btnSubmit) {
            btnSubmit.disabled = false;
            btnSubmit.innerText = "Enviar Avaliação";
        }
    }
}

/* --- INICIALIZAÇÃO --- */
document.addEventListener("DOMContentLoaded", () => {
    const inputCPF = document.getElementById("cpf");
    if (inputCPF) inputCPF.addEventListener("input", (e) => aplicarMascaraCPF(e.target));

    const inputTelefone = document.getElementById("telefone");
    if (inputTelefone) inputTelefone.addEventListener("input", (e) => aplicarMascaraTelefone(e.target));

    const feedbackForm = document.getElementById("feedbackForm");
    if (feedbackForm) {
        // Garante apenas um listener
        feedbackForm.addEventListener("submit", salvarFeedback);
    }

    renderizarPlanos();
    initObserver();
    initLGPD();
    registerServiceWorker();

    // Carrega os depoimentos uma vez ao abrir a página
    carregarFeedbacks();
});