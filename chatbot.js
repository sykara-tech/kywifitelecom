/* ==========================================================================
   KY BOT - CHATBOT IA DA KY WIFI TELECOM (VERSÃO FINAL)
   ========================================================================== */

/* API segura via Cloudflare Worker (chave Groq não fica no frontend) */
const KY_BOT_API_URL = "https://ky-bot-api.guilherme-batista15.workers.dev";

let isWaitingForResponse = false;
let fluxoBoletoState = 'IDLE';
let dadosVerificacao = { cpf: '', anoNascimento: '' };

/* Histórico da conversa enviado para a IA (evita se apresentar toda hora) */
const SYSTEM_PROMPT = `Você é a Ky Bot, atendente virtual da Ky WIFI Telecom (internet fibra em Águas Lindas de Goiás - GO).

PERSONALIDADE:
- Simpática, humana e confiante, como uma boa vendedora de telecomunicações
- Fala de forma natural, curta e clara
- Sempre tenta ajudar e converter o cliente de forma leve, sem pressão

REGRA DE APRESENTAÇÃO:
- Se apresente SOMENTE na primeira mensagem
- Depois disso, NÃO se apresente de novo. Continue a conversa normalmente

DADOS DA EMPRESA:
- WhatsApp: (61) 98203-1828
- Link: https://wa.me/5561982031828
- Cobertura: Águas Lindas de Goiás - GO

BENEFÍCIOS DE TODOS OS PLANOS:
- Instalação grátis
- Roteador Wi-Fi 6
- Suporte 24h
- Streamings: Spotify, YouTube Premium, Netflix e Disney+

PLANOS OFICIAIS (nunca invente outros):
- Básico: 400 MEGA por R$ 79,90/mês
- Família (mais vendido): 700 MEGA por R$ 99,90/mês
- Gamer Ultra: 1000 MEGA por R$ 139,90/mês

COMO RESPONDER:
- Respostas curtas (3 a 6 linhas)
- NÃO use tabelas, markdown de tabela, listas enormes nem blocos de código
- Use texto simples, com quebras de linha
- Quando falar de planos, escreva assim:
  Básico: 400 MEGA por R$ 79,90
  Família: 700 MEGA por R$ 99,90 (mais vendido)
  Gamer Ultra: 1000 MEGA por R$ 139,90
- Destaque benefícios de forma natural
- Se o cliente tiver interesse, chame para o WhatsApp: https://wa.me/5561982031828
- Se pedir boleto/2ª via, oriente a clicar no botão "2ª Via Boleto"
- Se for problema técnico, oriente de forma simples
- Sempre termine com uma pergunta ou próximo passo

REGRAS:
- Nunca invente preço, plano ou promoção
- Nunca diga que consulta sistema interno de boleto
- Não seja robótica
- Use no máximo 1 ou 2 emojis por resposta

EXEMPLOS DE RESPOSTA BOA:
- "Temos 3 planos: Básico 400 MEGA por R$ 79,90, Família 700 MEGA por R$ 99,90 (o mais vendido) e Gamer Ultra 1000 MEGA por R$ 139,90. Todos com instalação grátis, Wi-Fi 6 e streamings. Qual combina mais com você?"
- "O Família de 700 MEGA é o favorito dos clientes. Dá pra navegar, assistir Netflix e jogar sem travar por R$ 99,90. Quer que eu te passe o WhatsApp pra contratar?"
- "Claro! Se preferir falar com um atendente, chama no WhatsApp: https://wa.me/5561982031828"`;

let historicoConversa = [
    { role: "system", content: SYSTEM_PROMPT }
];

/* --- 1. PARSER E FORMATAÇÃO DE TEXTO --- */
function escapeHTML(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function formatKyBotText(text) {
    if (!text) return '';
    let formatted = escapeHTML(text);
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
    formatted = formatted.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer" class="ky-chat-link">$1</a>');
    formatted = formatted.replace(/\n/g, '<br>');
    return formatted;
}

/* --- 2. RENDERIZAÇÃO E HISTÓRICO LOCAL --- */
function renderKyChatWidget() {
    if (document.getElementById('ky-chat-widget')) return;

    const widgetHTML = `
        <div id="ky-chat-widget">
            <button id="ky-chat-toggle" class="ky-chat-btn" aria-label="Abrir Assistente Virtual" onclick="toggleKyChat()">
                <div class="ky-avatar-wrapper">
                    <img src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&auto=format&fit=crop&q=80" alt="Avatar Chatbot IA" class="ky-btn-avatar">
                    <span class="ky-pulse-ring"></span>
                </div>
            </button>

            <div id="ky-chat-box" class="ky-chat-box ky-chat-hidden" role="dialog" aria-label="Caixa de Chat">
                <div class="ky-chat-header">
                    <div class="ky-chat-title">
                        <div class="ky-header-avatar-container">
                            <img src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&auto=format&fit=crop&q=80" alt="Assistente IA" class="ky-header-avatar">
                            <span class="ky-status-dot"></span>
                        </div>
                        <div class="ky-chat-info">
                            <strong>Ky Bot</strong>
                            <span class="ky-status">Assistente Virtual 24h</span>
                        </div>
                    </div>
                    <div class="ky-chat-actions">
                        <button onclick="reiniciarChat()" class="ky-chat-header-btn" title="Reiniciar Conversa" aria-label="Reiniciar Chat">
                            <i class="fas fa-redo-alt"></i>
                        </button>
                        <button onclick="toggleKyChat()" class="ky-chat-close" aria-label="Fechar Chat">
                            <svg style="width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:2.5" viewBox="0 0 24 24">
                                <path d="M18 6L6 18M6 6l12 12" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                        </button>
                    </div>
                </div>

                <div class="ky-quick-chips">
                    <button class="ky-chip" onclick="iniciarFluxoBoleto()"><i class="fas fa-barcode"></i> 2ª Via Boleto</button>
                    <button class="ky-chip" onclick="iniciarDiagnostico()"><i class="fas fa-wrench"></i> Testar Conexão</button>
                    <button class="ky-chip" onclick="enviarPerguntaRapida('Como mudo a senha do Wi-Fi?')"><i class="fas fa-key"></i> Trocar Wi-Fi</button>
                    <button class="ky-chip" onclick="enviarPerguntaRapida('Quais são os planos de internet?')"><i class="fas fa-wifi"></i> Planos</button>
                    <button class="ky-chip" onclick="falarComAtendente(event)"><i class="fab fa-whatsapp"></i> Atendente</button>
                </div>

                <div id="ky-chat-messages" class="ky-chat-messages" aria-live="polite">
                    <div class="ky-msg ky-bot-msg">
                        Olá! Sou a **Ky Bot**, assistente virtual da **Ky WIFI Telecom**. Como posso te ajudar hoje? 📶
                    </div>
                </div>

                <div class="ky-chat-input-area">
                    <input type="text" id="ky-chat-input" placeholder="Digite sua dúvida..." onkeypress="handleKyKey(event)" maxlength="300" autocomplete="off">
                    <button id="ky-chat-send-btn" onclick="sendKyMessage()" aria-label="Enviar mensagem">
                        <svg style="width:16px;height:16px;fill:currentColor" viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', widgetHTML);
    carregarHistoricoLocal();
}

function salvarHistoricoLocal() {
    const container = document.getElementById('ky-chat-messages');
    if (container) {
        localStorage.setItem('ky_chat_history', container.innerHTML);
    }
    try {
        localStorage.setItem('ky_chat_ai_history', JSON.stringify(historicoConversa));
    } catch (e) {}
}

function carregarHistoricoLocal() {
    const historico = localStorage.getItem('ky_chat_history');
    if (historico) {
        const container = document.getElementById('ky-chat-messages');
        if (container) container.innerHTML = historico;
    } else {
        formatInitialMessages();
    }

    try {
        const aiHist = localStorage.getItem('ky_chat_ai_history');
        if (aiHist) {
            const parsed = JSON.parse(aiHist);
            if (Array.isArray(parsed) && parsed.length > 0) {
                historicoConversa = parsed;
                // Garante que o system prompt atualizado esteja sempre na posição 0
                historicoConversa[0] = { role: "system", content: SYSTEM_PROMPT };
            }
        }
    } catch (e) {}
}

function formatInitialMessages() {
    const botMsgs = document.querySelectorAll('.ky-bot-msg');
    botMsgs.forEach(msg => {
        if (!msg.dataset.formatted) {
            msg.innerHTML = formatKyBotText(msg.innerHTML);
            msg.dataset.formatted = "true";
        }
    });
}

function toggleKyChat() {
    const chatBox = document.getElementById('ky-chat-box');
    if (!chatBox) return;

    const isHidden = chatBox.classList.toggle('ky-chat-hidden');
    if (!isHidden) {
        setTimeout(() => {
            const input = document.getElementById('ky-chat-input');
            if (input) input.focus();
        }, 150);
    }
}

function reiniciarChat() {
    fluxoBoletoState = 'IDLE';
    isWaitingForResponse = false;
    dadosVerificacao = { cpf: '', anoNascimento: '' };

    // Reseta o histórico da IA (mantém só o system prompt)
    historicoConversa = [{ role: "system", content: SYSTEM_PROMPT }];

    localStorage.removeItem('ky_chat_history');
    localStorage.removeItem('ky_chat_ai_history');

    const messagesContainer = document.getElementById('ky-chat-messages');
    if (messagesContainer) {
        messagesContainer.innerHTML = `
            <div class="ky-msg ky-bot-msg">
                Conversa reiniciada! Sou a **Ky Bot**. Como posso te ajudar agora? 📶
            </div>
        `;
        formatInitialMessages();
    }
}

function handleKyKey(e) {
    if (e.key === 'Enter' && !isWaitingForResponse) {
        e.preventDefault();
        sendKyMessage();
    }
}

function enviarPerguntaRapida(texto) {
    const input = document.getElementById('ky-chat-input');
    if (input) {
        input.value = texto;
        sendKyMessage();
    }
}

function falarComAtendente(e) {
    if (e) e.preventDefault();
    window.open("https://wa.me/5561982031828", "_blank");
}

function copiarTexto(texto, mensagemToast) {
    navigator.clipboard.writeText(texto).then(() => {
        exibirToast(mensagemToast || "Copiado com sucesso!");
    }).catch(err => {
        console.error("Erro ao copiar: ", err);
    });
}

function exibirToast(msg) {
    const container = document.getElementById('ky-chat-messages');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'ky-chat-toast';
    toast.innerHTML = `<i class="fas fa-check-circle"></i> ${escapeHTML(msg)}`;
    container.appendChild(toast);
    scrollToBottom();

    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 300);
    }, 2500);
}

/* --- 3. DIAGNÓSTICO DE REDE --- */
function iniciarDiagnostico() {
    appendKyMessage("🔧 **Diagnóstico Automático de Conexão**\n\nSiga estes passos rápidos:\n1️⃣ Remova o roteador da tomada.\n2️⃣ Aguarde 20 segundos.\n3️⃣ Ligue novamente e espere as luzes estabilizarem.\n\nSua conexão voltou ao normal?", 'bot');
}

/* --- 4. FLUXO INTERATIVO DE BOLETO --- */
function iniciarFluxoBoleto() {
    fluxoBoletoState = 'AGUARDANDO_CPF';
    dadosVerificacao = { cpf: '', anoNascimento: '' };
    appendKyMessage("Para consultar sua **2ª Via de Boleto**, digite o seu **CPF** (somente números):", 'bot');
}

async function processarFluxoBoleto(userText) {
    if (fluxoBoletoState === 'AGUARDANDO_CPF') {
        const cpfLimpo = userText.replace(/\D/g, '');
        if (cpfLimpo.length !== 11) {
            appendKyMessage("O **CPF** informado é inválido. Digite exatamente 11 números:", 'bot');
            return;
        }
        dadosVerificacao.cpf = cpfLimpo;
        fluxoBoletoState = 'AGUARDANDO_ANO';
        appendKyMessage("Perfeito! Agora, por questão de segurança, informe seu **ano de nascimento** com 4 dígitos (ex: 1995):", 'bot');
        return;
    }

    if (fluxoBoletoState === 'AGUARDANDO_ANO') {
        const anoLimpo = userText.replace(/\D/g, '');
        if (anoLimpo.length !== 4) {
            appendKyMessage("Ano inválido. Digite o ano de nascimento com 4 dígitos (ex: 1995):", 'bot');
            return;
        }
        dadosVerificacao.anoNascimento = anoLimpo;
        fluxoBoletoState = 'IDLE';

        appendKyMessage("Consultando informações no sistema...", 'bot');
        await validarEBuscarBoleto();
    }
}

async function validarEBuscarBoleto() {
    if (typeof firebase === 'undefined' || !firebase.database) {
        appendKyMessage("Não foi possível conectar ao banco de dados no momento. Tente novamente mais tarde ou fale conosco no WhatsApp: https://wa.me/5561982031828", 'bot');
        return;
    }

    const db = firebase.database();
    const { cpf, anoNascimento } = dadosVerificacao;

    try {
        const snapCliente = await db.ref(`clientes/${cpf}`).once('value');
        const cliente = snapCliente.val();

        if (!cliente) {
            appendKyMessage("Não encontramos nenhum cadastro ativo para o **CPF** informado. Verifique os dados ou fale com o nosso atendimento no WhatsApp: https://wa.me/5561982031828", 'bot');
            return;
        }

        let anoCliente = '';
        if (cliente.data_nascimento) {
            const dataStr = String(cliente.data_nascimento);
            if (dataStr.includes('-')) {
                anoCliente = dataStr.split('-')[0];
            } else if (dataStr.includes('/')) {
                const partes = dataStr.split('/');
                anoCliente = partes[2] || partes[0];
            } else {
                anoCliente = dataStr.substring(0, 4);
            }
        } else if (cliente.ano_nascimento) {
            anoCliente = String(cliente.ano_nascimento);
        }

        if (anoCliente && anoCliente !== anoNascimento) {
            appendKyMessage("O ano de nascimento informado não confere com o cadastro do CPF. Acesso negado por segurança.", 'bot');
            return;
        }

        const snapBoletos = await db.ref('boletos').orderByChild('cliente_cpf').equalTo(cpf).once('value');
        const boletosData = snapBoletos.val();

        if (!boletosData) {
            appendKyMessage(`Olá **${cliente.nome || 'Cliente'}**! Não foram localizados boletos para o seu CPF.`, 'bot');
            return;
        }

        const listaBoletos = Object.keys(boletosData).map(key => ({
            id: key,
            ...boletosData[key]
        }));

        const boletoPendente = listaBoletos.find(b => b.status !== 'pago') || listaBoletos[listaBoletos.length - 1];

        if (boletoPendente) {
            const valorFormatado = parseFloat(boletoPendente.valor || 0).toFixed(2).replace('.', ',');
            const chavePix = boletoPendente.chave_pix || "kywifitelecom@gmail.com";
            const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=130x130&data=${encodeURIComponent(chavePix)}`;

            const cardBoletoHTML = `
                <div class="ky-boleto-card">
                    <div class="ky-boleto-header">
                        <i class="fas fa-file-invoice-dollar"></i>
                        <div>
                            <strong>Fatura Encontrada</strong>
                            <span>Vencimento: ${boletoPendente.vencimento || 'A vencer'}</span>
                        </div>
                    </div>
                    
                    <div class="ky-boleto-valor">
                        <span>Valor total:</span>
                        <strong>R$ ${valorFormatado}</strong>
                    </div>

                    <div style="text-align: center; margin: 12px 0; padding: 10px; background: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0;">
                        <img src="${qrCodeUrl}" alt="QR Code PIX" style="width: 130px; height: 130px; display: block; margin: 0 auto 6px auto; border-radius: 4px;">
                        <span style="font-size: 11px; color: #4a5568; font-weight: 600; display: block;">Escaneie para pagar via PIX</span>
                    </div>

                    <div class="ky-boleto-actions">
                        <button onclick="copiarTexto('${chavePix}', 'Chave PIX copiada!')" class="ky-boleto-btn-sec">
                            <i class="fas fa-qrcode"></i> Copiar Chave PIX
                        </button>

                        <button onclick="imprimirBoletoChat('${boletoPendente.id}')" class="ky-boleto-btn-main">
                            <i class="fas fa-print"></i> Abrir / Imprimir Boleto Completo
                        </button>
                    </div>
                </div>
            `;
            appendKyMessage(`Olá **${cliente.nome || 'Cliente'}**! Localizamos o seu boleto:`, 'bot');
            appendKyMessage(cardBoletoHTML, 'bot', true);
        } else {
            appendKyMessage(`Olá **${cliente.nome || 'Cliente'}**! Suas faturas já estão em dia e sem débitos pendentes. ✅`, 'bot');
        }

    } catch (err) {
        console.error("Erro ao buscar boleto:", err);
        appendKyMessage("Ocorreu um erro ao consultar seus dados. Por favor, tente novamente ou fale no WhatsApp: https://wa.me/5561982031828", 'bot');
    }
}

/* --- 5. IMPRESSÃO DO BOLETO BANCÁRIO --- */
function imprimirBoletoChat(id) {
    if (typeof firebase === 'undefined' || !firebase.database) return;
    const db = firebase.database();

    db.ref(`boletos/${id}`).once('value', snapshot => {
        const boleto = snapshot.val();
        if (!boleto) return alert('Boleto não encontrado no sistema.');

        const pixChave = boleto.chave_pix || "kywifitelecom@gmail.com";
        const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(pixChave)}`;
        const linhaDigitavel = boleto.linha_digitavel || "75691.40333 40333.000000 40333.000010 7 00000000009990";
        const linhaDigitavelLimpa = linhaDigitavel.replace(/\D/g, '');
        const codigoBarrasUrl = `https://bwipjs-api.metafloor.com/?bcid=i2of5&text=${linhaDigitavelLimpa}&scale=2&height=14`;
        const valorDoc = parseFloat(boleto.valor || 0).toFixed(2).replace('.', ',');

        const win = window.open('', '_blank', 'width=920,height=900');
        win.document.write(`
            <!DOCTYPE html>
            <html lang="pt-BR">
            <head>
                <meta charset="UTF-8">
                <title>Boleto Bancário - ${boleto.nosso_numero || id}</title>
                <style>
                    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Arial', sans-serif; }
                    body { background: #f5f5f5; color: #000; padding: 20px; font-size: 10px; }
                    .boleto-paper { max-width: 800px; margin: 0 auto; background: #fff; padding: 25px; border: 1px solid #ccc; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
                    .recibo-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #6A1B9A; padding-bottom: 10px; margin-bottom: 15px; }
                    .recibo-header img { height: 45px; }
                    .recibo-header .empresa-info { text-align: right; font-size: 11px; line-height: 1.4; color: #333; }
                    .linha-corte { border-top: 1px dashed #777; margin: 20px 0; position: relative; text-align: right; }
                    .linha-corte span { font-size: 9px; background: #fff; padding: 0 5px; position: relative; top: -7px; color: #555; }
                    .banco-header { display: flex; align-items: flex-end; border-bottom: 2px solid #000; padding-bottom: 4px; margin-bottom: 2px; }
                    .banco-logo { font-size: 22px; font-weight: 900; color: #003366; width: 130px; letter-spacing: -0.5px; }
                    .codigo-banco { font-size: 18px; font-weight: bold; padding: 0 12px; border-left: 2px solid #000; border-right: 2px solid #000; }
                    .linha-digitavel { font-size: 13px; font-weight: bold; margin-left: auto; letter-spacing: 0.8px; font-family: monospace; }
                    table.b-table { width: 100%; border-collapse: collapse; margin-bottom: -1px; }
                    table.b-table td { border: 1px solid #000; padding: 5px 7px; vertical-align: top; }
                    .lbl { font-size: 8px; font-weight: bold; text-transform: uppercase; color: #444; display: block; margin-bottom: 2px; }
                    .val { font-size: 11px; font-weight: bold; color: #000; }
                    .val-destaque { font-size: 13px; font-weight: 800; text-align: right; color: #000; }
                    .pix-section { display: flex; gap: 15px; align-items: center; margin-top: 8px; background: #f9f9f9; padding: 8px; border-radius: 6px; border: 1px solid #ddd; }
                    .pix-qr img { width: 100px; height: 100px; display: block; border: 1px solid #bbb; border-radius: 4px; }
                    .pix-txt { font-size: 10px; line-height: 1.5; color: #222; }
                    .pix-txt code { background: #eee; padding: 2px 6px; border-radius: 3px; font-family: monospace; font-size: 11px; font-weight: bold; }
                    .barcode-container { text-align: center; margin-top: 20px; padding-top: 10px; }
                    .barcode-container img { max-width: 100%; height: 55px; }
                    @media print { body { background: #fff; padding: 0; } .boleto-paper { border: none; box-shadow: none; padding: 0; } }
                </style>
            </head>
            <body>
                <div class="boleto-paper">
                    <div class="recibo-header">
                        <img src="https://i.ibb.co/Xrz7n7dX/image-9658f0-removebg-preview.png" alt="Ky WIFI Telecom">
                        <div class="empresa-info">
                            <strong>KY TELECOMUNICACOES LTDA</strong><br>
                            CNPJ: 22.131.209/0001-93<br>
                            Atendimento: (61) 98203-1828 | Águas Lindas de Goiás - GO
                        </div>
                    </div>
                    <table class="b-table">
                        <tr>
                            <td colspan="3"><span class="lbl">Beneficiário</span><span class="val">KY TELECOMUNICACOES LTDA - CNPJ: 22.131.209/0001-93</span></td>
                            <td><span class="lbl">Vencimento</span><span class="val">${boleto.vencimento || 'A vencer'}</span></td>
                        </tr>
                        <tr>
                            <td colspan="3"><span class="lbl">Pagador</span><span class="val">${boleto.cliente_nome || 'Cliente'} - CPF: ${boleto.cliente_cpf || ''}</span></td>
                            <td><span class="lbl">Valor do Documento</span><span class="val-destaque">R$ ${valorDoc}</span></td>
                        </tr>
                    </table>
                    <div class="linha-corte"><span>✂ Corte na linha pontilhada</span></div>
                    <div class="banco-header">
                        <div class="banco-logo">SICOOB</div>
                        <div class="codigo-banco">756-0</div>
                        <div class="linha-digitavel">${linhaDigitavel}</div>
                    </div>
                    <table class="b-table">
                        <tr>
                            <td colspan="3"><span class="lbl">Local de Pagamento</span><span class="val">Pagável em qualquer banco ou via PIX até o vencimento</span></td>
                            <td><span class="lbl">Vencimento</span><span class="val-destaque">${boleto.vencimento || ''}</span></td>
                        </tr>
                        <tr>
                            <td colspan="3"><span class="lbl">Beneficiário</span><span class="val">KY TELECOMUNICACOES LTDA - CNPJ: 22.131.209/0001-93</span></td>
                            <td><span class="lbl">Agência/Código Beneficiário</span><span class="val">4033 / 00010-7</span></td>
                        </tr>
                        <tr>
                            <td><span class="lbl">Data do Documento</span><span class="val">${new Date().toLocaleDateString('pt-BR')}</span></td>
                            <td><span class="lbl">Nº do Documento</span><span class="val">${boleto.nosso_numero || id}</span></td>
                            <td><span class="lbl">Especie Doc.</span><span class="val">DS</span></td>
                            <td><span class="lbl">(=) Valor do Documento</span><span class="val-destaque">R$ ${valorDoc}</span></td>
                        </tr>
                        <tr>
                            <td colspan="3" rowspan="2">
                                <span class="lbl">Instruções</span>
                                <div style="font-size: 10px; line-height: 1.4; color: #222; margin-bottom: 6px;">
                                    • Não receber após 30 dias do vencimento.<br>
                                    • Sujeito a suspensão dos serviços em caso de inadimplência.<br>
                                    • Dúvidas ou suporte: (61) 98203-1828.
                                </div>
                                <div class="pix-section">
                                    <div class="pix-qr"><img src="${qrCodeUrl}" alt="QR Code PIX"></div>
                                    <div class="pix-txt">
                                        <strong style="color: #6A1B9A; font-size: 11px;">PAGUE MAIS RÁPIDO COM PIX</strong><br>
                                        Escaneie o QR Code ao lado ou utilize a chave PIX:<br>
                                        <code>${pixChave}</code>
                                    </div>
                                </div>
                            </td>
                            <td><span class="lbl">(-) Descontos / Abatimento</span></td>
                        </tr>
                        <tr>
                            <td><span class="lbl">(=) Valor Cobrado</span></td>
                        </tr>
                    </table>
                    <div class="barcode-container">
                        <img src="${codigoBarrasUrl}" alt="Código de Barras Boleto">
                    </div>
                </div>
            </body>
            </html>
        `);
        win.document.close();
        setTimeout(() => { win.print(); }, 600);
    });
}

/* --- 6. ENVIO DE MENSAGENS E INTEGRAÇÃO GROQ IA --- */
async function sendKyMessage() {
    if (isWaitingForResponse) return;

    const input = document.getElementById('ky-chat-input');
    const sendBtn = document.getElementById('ky-chat-send-btn');
    const userText = input.value.trim();

    if (!userText) return;

    appendKyMessage(userText, 'user');
    input.value = '';

    if (fluxoBoletoState !== 'IDLE') {
        await processarFluxoBoleto(userText);
        return;
    }

    const textLower = userText.toLowerCase();
    if (textLower.includes('boleto') || textLower.includes('2 via') || textLower.includes('fatura') || textLower.includes('segunda via') || textLower.includes('pagamento')) {
        iniciarFluxoBoleto();
        return;
    }

    if (textLower.includes('lento') || textLower.includes('lentidão') || textLower.includes('caiu') || textLower.includes('sem sinal') || textLower.includes('reiniciar')) {
        iniciarDiagnostico();
        return;
    }

    isWaitingForResponse = true;
    input.disabled = true;
    if (sendBtn) sendBtn.disabled = true;

    const loadingId = appendKyMessage(`
        <div class="ky-typing-indicator">
            <span></span><span></span><span></span>
        </div>
    `, 'bot');

    try {
        // Adiciona a mensagem do usuário no histórico da IA
        historicoConversa.push({ role: "user", content: userText });

        // Limita o histórico para não estourar tokens (system + últimas 10 mensagens)
        if (historicoConversa.length > 12) {
            historicoConversa = [
                historicoConversa[0],
                ...historicoConversa.slice(-10)
            ];
        }

        const response = await fetch(KY_BOT_API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                messages: historicoConversa
            })
        });

        const data = await response.json();

        let rawReply = data.choices?.[0]?.message?.content || "";

        // Alguns modelos de reasoning colocam texto em reasoning; prioriza content
        if (!rawReply && data.choices?.[0]?.message?.reasoning) {
            rawReply = data.choices[0].message.reasoning;
        }

        if (!rawReply) {
            rawReply = "Desculpe, tive um problema ao processar sua solicitação. Fale conosco pelo WhatsApp: https://wa.me/5561982031828";
        }

        // Salva a resposta da bot no histórico
        historicoConversa.push({ role: "assistant", content: rawReply });

        const loadingElement = document.getElementById(loadingId);
        if (loadingElement) {
            loadingElement.innerHTML = formatKyBotText(rawReply);
        }

    } catch (error) {
        console.error("Erro na IA:", error);
        const loadingElement = document.getElementById(loadingId);
        if (loadingElement) {
            loadingElement.innerHTML = formatKyBotText("Oscilação temporária no chat. Fale conosco no WhatsApp: https://wa.me/5561982031828");
        }
    } finally {
        isWaitingForResponse = false;
        input.disabled = false;
        if (sendBtn) sendBtn.disabled = false;
        input.focus();
        scrollToBottom();
        salvarHistoricoLocal();
    }
}

function appendKyMessage(content, sender, isHTML = false) {
    const container = document.getElementById('ky-chat-messages');
    if (!container) return;

    const msgDiv = document.createElement('div');
    const id = 'msg-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
    msgDiv.id = id;
    msgDiv.className = `ky-msg ${sender === 'user' ? 'ky-user-msg' : 'ky-bot-msg'}`;

    if (sender === 'user') {
        msgDiv.textContent = content;
    } else if (isHTML || content.trim().startsWith('<')) {
        msgDiv.innerHTML = content;
    } else {
        msgDiv.innerHTML = formatKyBotText(content);
    }

    container.appendChild(msgDiv);
    scrollToBottom();
    salvarHistoricoLocal();
    return id;
}

function scrollToBottom() {
    const container = document.getElementById('ky-chat-messages');
    if (container) {
        container.scrollTo({
            top: container.scrollHeight,
            behavior: 'smooth'
        });
    }
}

document.addEventListener('DOMContentLoaded', renderKyChatWidget);