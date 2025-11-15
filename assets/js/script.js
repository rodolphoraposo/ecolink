// ===================
// Estado & utilidades
// ===================
const state = {
  currentUser: null,
  selectedUserType: null,
  selectedTransportType: null,
  selectedTier: null,
  selectedPlanMeta: null, // {id, name, monthly}
  users: [],
  donations: [],
  volunteerDonations: [],
  volunteerInstitutions: [],
};

const bell = { list: [], unread: 0 };

function loadFromLocalStorage() {
  const saved = localStorage.getItem("ecolinkData");
  if (saved) {
    const data = JSON.parse(saved);
    state.users = data.users || [];
    state.donations = data.donations || [];
    state.volunteerDonations = data.volunteerDonations || [];
    state.volunteerInstitutions = data.volunteerInstitutions || [];
  }
  const logged = localStorage.getItem("ecolinkLoggedUser");
  if (logged) state.currentUser = JSON.parse(logged);
}

function saveToLocalStorage() {
  const data = {
    users: state.users,
    donations: state.donations,
    volunteerDonations: state.volunteerDonations,
    volunteerInstitutions: state.volunteerInstitutions,
  };
  localStorage.setItem("ecolinkData", JSON.stringify(data));
  if (state.currentUser) localStorage.setItem("ecolinkLoggedUser", JSON.stringify(state.currentUser));
}

function showScreen(screenId, evt) {
  // remove visual de todas as telas e abas
  document.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
  document.querySelectorAll(".nav-tab").forEach((t) => t.classList.remove("active"));

  // ativa a tela solicitada
  const screenEl = document.getElementById(screenId);
  if (screenEl) screenEl.classList.add("active");

  // se tivermos o event do clique (ex.: clicar diretamente na aba), usamos o currentTarget
  if (evt && evt.currentTarget) {
    evt.currentTarget.classList.add("active");
    // atualiza aria-selected se necessário
    try {
      document.querySelectorAll(".nav-tab").forEach(t => t.setAttribute('aria-selected', t.classList.contains('active') ? 'true' : 'false'));
    } catch (e) {}
  } else {
    // quando showScreen for chamado programaticamente (ex.: showScreen('register'))
    // procuramos pela tab correspondente por id (convenção: login -> loginTab, register -> registerTab)
    const mapping = {
      login: "loginTab",
      register: "registerTab"
      // se existir outra aba com screenId diferente, expanda aqui
    };
    const tabId = mapping[screenId] || (screenId + "Tab");
    const tab = document.getElementById(tabId);
    if (tab) {
      tab.classList.add("active");
      tab.setAttribute('aria-selected', 'true');
    }
  }
}

// Mostrar/ocultar abas de autenticação (corrige o botão Sair e o pós-login)
function hideAuthTabs() {
  const tabs = document.getElementById("authTabs");
  if (tabs) tabs.style.display = "none";
}
function showAuthTabs() {
  const tabs = document.getElementById("authTabs");
  if (tabs) tabs.style.display = "flex";
}

// ==============
// CADASTRO/PLANOS
// ==============
const plansByUserType = {
  doador: [
    { id: "bronze", name: "Bronze", icon: "🧩", monthly: 49.9 },
    { id: "ouro", name: "Ouro", icon: "⭐", monthly: 99.9, className: "gold" },
    { id: "diamantium", name: "Diamantium", icon: "💎", monthly: 299.9, className: "diamond" },
  ],
  recebedor: [
    { id: "bronze", name: "Bronze", icon: "🧩", monthly: 39.9 },
    { id: "ouro", name: "Ouro", icon: "⭐", monthly: 89.9, className: "gold" },
    { id: "diamantium", name: "Diamantium", icon: "💎", monthly: 179.9, className: "diamond" },
  ],
  transportador: [
    { id: "bronze", name: "Cadastro - repasse de 20% do frete", icon: "🚚", monthly: 0 }
  ],
};

const periodicityMeta = {
  mensal: { label: "Mensal", months: 1, discount: 0 },
  trimestral: { label: "Trimestral", months: 3, discount: 0.05 },
  semestral: { label:  "Semestral", months: 6, discount: 0.10 },
  anual: { label: "Anual", months: 12, discount: 0.15 },
};

function currency(n) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// === Helpers de required dinâmicos ===
function setRegisterRequireds() {
  // Campos de Transportador só são required quando perfil for transportador
  const isTransport = state.selectedUserType === "transportador";
  const setReq = (id, on) => { const el = document.getElementById(id); if (el) el.required = !!on; };

  setReq("freightRate", isTransport);
  setReq("cnhNumero", isTransport);
  setReq("cnhCategoria", isTransport);
  setReq("cnhValidade", isTransport);

  // Método de pagamento só é required se plano for pago
  const paidPlan = !!(state.selectedPlanMeta && state.selectedPlanMeta.monthly > 0 && state.selectedUserType !== "transportador");
  document.querySelectorAll('input[name="paymentMethod"]').forEach(r => {
    r.required = paidPlan;
    if (!paidPlan) r.checked = false;
  });
}

function renderPlanCards() {
  const wrap = document.getElementById("planCards");
  if (!wrap) return;
  wrap.innerHTML = "";

  const plans = plansByUserType[state.selectedUserType] || [];
  plans.forEach((p) => {
    const card = document.createElement("div");
    card.className = `tier-card ${p.className || ""}`;
    card.setAttribute("role", "button");
    card.tabIndex = 0;
    card.innerHTML = `
      <div class="tier-icon">${p.icon}</div>
      <h3>${p.name}</h3>
      <p>${p.monthly > 0 ? "Plano pago" : "Plano gratuito"}</p>
      <span class="plan-price">${p.monthly > 0 ? currency(p.monthly) + "/mês" : "Gratuito"}</span>
    `;
    card.addEventListener("click", (e) => selectTier(p.id, e));
    wrap.appendChild(card);
  });
}

function selectUserType(type, evt) {
  state.selectedUserType = type;
  document.querySelectorAll(".tier-card").forEach((c) => c.classList.remove("selected"));
  if (evt && evt.currentTarget) evt.currentTarget.classList.add("selected");

  document.getElementById("transportTypeSelection").style.display = "none";
  document.getElementById("tierSelection").style.display = "none";
  document.getElementById("registerForm").style.display = "none";

  state.selectedTier = null;
  state.selectedTransportType = null;
  state.selectedPlanMeta = null;

  if (type === "transportador") {
    document.getElementById("transportTypeSelection").style.display = "block";
  } else {
    renderPlanCards();
    document.getElementById("tierSelection").style.display = "block";
  }

  setRegisterRequireds();
}

function selectTransportType(type, evt) {
  state.selectedTransportType = type;
  document.querySelectorAll(".transport-type").forEach((c) => c.classList.remove("selected"));
  if (evt && evt.currentTarget) evt.currentTarget.classList.add("selected");
  renderPlanCards();
  document.getElementById("tierSelection").style.display = "block";
}

function selectTier(tierId, evt) {
  state.selectedTier = tierId;
  document.querySelectorAll("#planCards .tier-card").forEach((c) => c.classList.remove("selected"));
  if (evt && evt.currentTarget) evt.currentTarget.classList.add("selected");

  const meta = (plansByUserType[state.selectedUserType] || []).find((p) => p.id === tierId);
  state.selectedPlanMeta = meta || null;

  document.getElementById("registerForm").style.display = "block";
  updatePlanPriceDisplay();

  if (state.selectedUserType === "transportador") {
    document.getElementById("vehicleFields").style.display = "block";
    document.getElementById("cnhFields").style.display = "block";
  } else {
    document.getElementById("vehicleFields").style.display = "none";
    document.getElementById("cnhFields").style.display = "none";
  }

  setRegisterRequireds();
  document.getElementById("registerForm").scrollIntoView({ behavior: "smooth", block: "start" });
}

// Exibe resumo de preço e controla required/visibilidade dos métodos de pagamento
function updatePlanPriceDisplay() {
  const summary = document.getElementById("planSummary");
  const text = document.getElementById("planSummaryText");
  const total = document.getElementById("planSummaryTotal");
  const paymentSection = document.getElementById("paymentSection");
  const submitBtn = document.getElementById("regSubmitBtn");

  if (!state.selectedPlanMeta) {
    if (summary) summary.style.display = "none";
    if (paymentSection) paymentSection.style.display = "none";
    setRegisterRequireds();
    return;
  }

  const per = document.getElementById("planPeriodicity").value;
  const perMeta = periodicityMeta[per];
  const monthly = state.selectedPlanMeta.monthly;
  const planName = state.selectedPlanMeta.name;

  if (monthly === 0 || state.selectedUserType === "transportador") {
    text.textContent = `${planName} – ${perMeta.label} (plano bronze)`;
    total.textContent = currency(0);
    paymentSection.style.display = "none";
    submitBtn.textContent = "Finalizar Cadastro";
  } else {
    const subtotal = monthly * perMeta.months;
    const discount = subtotal * perMeta.discount;
    const final = subtotal - discount;

    text.textContent = `${planName} – ${perMeta.label} (${perMeta.months}x ${currency(monthly)} − ${Math.round(
      perMeta.discount * 100
    )}% desc.)`;
    total.textContent = currency(final);

    paymentSection.style.display = "block";
    submitBtn.textContent = "Finalizar Cadastro e Pagar";
  }

  summary.style.display = "flex";
  setRegisterRequireds();
}

function checkPasswordStrength(password) {
  const strengthEl = document.getElementById("passwordStrength");
  let strength = 0;
  if (password.length >= 8) strength++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
  if (/\d/.test(password)) strength++;
  if (/[^a-zA-Z0-9]/.test(password)) strength++;
  if (strength < 2) { strengthEl.textContent = "Senha fraca"; strengthEl.className = "password-strength strength-weak"; }
  else if (strength < 4) { strengthEl.textContent = "Senha média"; strengthEl.className = "password-strength strength-medium"; }
  else { strengthEl.textContent = "Senha forte"; strengthEl.className = "password-strength strength-strong"; }
}

// ==============
// CEP (reg/volunteer)
// ==============
async function buscarCep(prefix, cep) {
  const cepLimpo = (cep || "").replace(/\D/g, "");
  if (cepLimpo.length !== 8) return;

  const loading = document.getElementById(`${prefix}CepLoading`);
  if (loading) loading.style.display = "inline";

  try {
    const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
    const data = await response.json();

    if (!data.erro) {
      const setIf = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.value = value || "";
      };
      setIf(`${prefix}Logradouro`, data.logradouro);
      setIf(`${prefix}Bairro`, data.bairro);
      setIf(`${prefix}Cidade`, data.localidade);
      setIf(`${prefix}Estado`, data.uf);
    }
  } catch (error) {
    console.error("Erro ao buscar CEP:", error);
  } finally {
    if (loading) loading.style.display = "none";
  }
}

// ==============
// Registro/Login
// ==============

// Utilitário: quebra de linha no canvas
function drawWrappedText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = (text || "").split(" ");
  let line = "";
  let currY = y;
  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + " ";
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && n > 0) {
      ctx.fillText(line.trimEnd(), x, currY);
      line = words[n] + " ";
      currY += lineHeight;
    } else {
      line = testLine;
    }
  }
  if (line) ctx.fillText(line.trimEnd(), x, currY);
  return currY; // retorna a última linha usada
}

// Gera imagem (PNG) do comprovante e dispara o download (com logo e layout sem sobreposição)
function generateReceiptImage({ user, plan, perMeta, totals }) {
  return new Promise((resolve) => {
    const w = 1000, h = 680, pad = 28;
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d");

    // Desenho completo (com ou sem logo, dependendo do carregamento)
    const draw = (logoImg) => {
      // Fundo
      ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, w, h);

      // Header gradiente
      const grad = ctx.createLinearGradient(0, 0, w, 0);
      grad.addColorStop(0, "#2e7d32"); grad.addColorStop(1, "#0288d1");
      ctx.fillStyle = grad; ctx.fillRect(0, 0, w, 110);

      // Logo (se disponível)
      let titleX = pad;
      if (logoImg) {
        const logoH = 64;
        const ratio = logoImg.width / logoImg.height || 1;
        const logoW = Math.min(logoH * ratio, 180);
        const logoX = pad, logoY = (110 - logoH) / 2;
        ctx.drawImage(logoImg, logoX, logoY, logoW, logoH);
        titleX = logoX + logoW + 16;
      }

      // Título
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 28px Segoe UI, Arial";
      ctx.fillText("Ecolink — Comprovante de Cadastro/Assinatura", titleX, 68);

      // Corpo
      ctx.fillStyle = "#333";
      ctx.font = "bold 18px Segoe UI, Arial";
      ctx.fillText("Dados do Cliente", pad, 150);

      ctx.font = "16px Segoe UI, Arial";
      let currentY = 178;

      ctx.fillText(`Data/Hora: ${new Date().toLocaleString()}`, pad, currentY); currentY += 26;
      ctx.fillText(`Nome/Razão: ${user.name}`, pad, currentY); currentY += 26;
      ctx.fillText(`Documento: ${user.document}`, pad, currentY); currentY += 26;
      ctx.fillText(`Usuário: ${user.username}`, pad, currentY); currentY += 26;

      // Endereço com quebra automática
      const addrLabel = "Endereço: ";
      const addrText = `${user.fullAddress}`;
      const labelWidth = ctx.measureText(addrLabel).width;
      ctx.fillText(addrLabel, pad, currentY);
      const lastY = drawWrappedText(ctx, addrText, pad + labelWidth, currentY, w - (pad * 2) - labelWidth, 22);
      currentY = lastY + 28; // espaço após o endereço

      // Resumo do Plano - sem sobreposição (usa currentY)
      const boxTop = currentY;
      const boxLeft = pad, boxW = w - pad * 2, boxH = 210;
      ctx.strokeStyle = "#c8e6c9"; ctx.lineWidth = 3;
      ctx.strokeRect(boxLeft, boxTop, boxW, boxH);

      ctx.font = "bold 18px Segoe UI, Arial"; ctx.fillStyle = "#2e7d32";
      ctx.fillText("Resumo da Assinatura", boxLeft + 12, boxTop + 28);

      ctx.fillStyle = "#333"; ctx.font = "16px Segoe UI, Arial";
      const typeStr = (user.type || "").toLowerCase();
      ctx.fillText(`Tipo/Perfil: ${typeStr}  •  Plano: ${plan.name}`, boxLeft + 12, boxTop + 60);
      ctx.fillText(`Periodicidade: ${perMeta.label}`, boxLeft + 12, boxTop + 88);
      const methodLabel = user.payment.method === "free" ? "Gratuito" : user.payment.method;
      ctx.fillText(`Método de Pagamento: ${methodLabel}`, boxLeft + 12, boxTop + 116);

      if (plan.monthly > 0 && totals) {
        const discountPercent = Math.round((perMeta.discount || 0) * 100);
        ctx.fillText(`Subtotal: ${currency(totals.subtotal)}  •  Desconto: ${discountPercent}%`, boxLeft + 12, boxTop + 144);
        ctx.font = "bold 20px Segoe UI, Arial"; ctx.fillStyle = "#0288d1";
        ctx.fillText(`Total: ${currency(totals.final)}`, boxLeft + 12, boxTop + 176);
      } else {
        ctx.font = "bold 20px Segoe UI, Arial"; ctx.fillStyle = "#0288d1";
        ctx.fillText(`Total: ${currency(0)}`, boxLeft + 12, boxTop + 176);
      }

      // Rodapé
      ctx.fillStyle = "#555"; ctx.font = "16px Segoe UI, Arial";
      ctx.fillText("Obrigado por fazer parte desta conexão sustentável! 💚", pad, h - 30);

      const dataUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `comprovante-ecolink-${user.id}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      resolve();
    };

    const logo = new Image();
    logo.crossOrigin = "anonymous";
    logo.onload = () => draw(logo);
    logo.onerror = () => draw(null);
    // Ajuste o caminho da logo se estiver em outra pasta
    logo.src = "./imgs/logo.png";
  });
}

// Validação “amigável” de campos visíveis
function validateVisibleFields() {
  const form = document.getElementById("registerForm");
  // Força o browser a reportar os invalids dos campos VISÍVEIS
  const visibles = Array.from(form.querySelectorAll("input, select, textarea")).filter(el => {
    const style = window.getComputedStyle(el);
    const parentHidden = el.closest("[style*='display: none']") || el.closest(".hidden");
    return style.display !== "none" && style.visibility !== "hidden" && !parentHidden;
  });

  for (const el of visibles) {
    if (el.required && !el.value) {
      el.reportValidity && el.reportValidity();
      el.focus();
      return false;
    }
  }
  return true;
}

// Torna o handleRegister assíncrono para aguardar a geração do comprovante com a logo
async function handleRegister(e) {
  e.preventDefault();

  try {
    if (!state.selectedUserType) {
      alert("Selecione o tipo de usuário (Doador/Recebedor/Transportador) antes de prosseguir.");
      return;
    }
    if (!state.selectedTier) {
      alert("Selecione um plano para continuar.");
      return;
    }

    setRegisterRequireds(); // garante que os required ocultos não bloqueiem
    if (!validateVisibleFields()) return;

    const password = document.getElementById("regPassword").value;
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).{8,}$/.test(password)) {
      alert("A senha deve conter letras maiúsculas e minúsculas, números, caracteres especiais e no mínimo 8 dígitos.");
      return;
    }

    const address = {
      cep: document.getElementById("regCep").value,
      logradouro: document.getElementById("regLogradouro").value,
      numero: document.getElementById("regNumero").value,
      complemento: document.getElementById("regComplemento").value,
      bairro: document.getElementById("regBairro").value,
      cidade: document.getElementById("regCidade").value,
      estado: document.getElementById("regEstado").value,
    };

    const fullAddress = `${address.logradouro}, ${address.numero}${address.complemento ? ", " + address.complemento : ""}, ${address.bairro}, ${address.cidade}, ${address.estado}, ${address.cep}`;

    const user = {
      id: Date.now(),
      name: document.getElementById("regName").value,
      document: document.getElementById("regDoc").value,
      email: document.getElementById("regEmail").value,
      phone: document.getElementById("regPhone").value,
      address,
      fullAddress,
      username: document.getElementById("regUsername").value,
      password,
      type: state.selectedUserType,
      tier: state.selectedTier,
      createdAt: new Date().toISOString(),
    };

    if (state.selectedUserType === "transportador") {
      user.transportType = state.selectedTransportType;
      user.vehicle = {
        renavam: document.getElementById("vehicleRenavam").value,
        placa: document.getElementById("vehiclePlaca").value,
        modelo: document.getElementById("vehicleModelo").value,
        ano: document.getElementById("vehicleAno").value,
        cor: document.getElementById("vehicleCor").value,
      };
      user.cnh = {
        numero: document.getElementById("cnhNumero").value,
        categoria: document.getElementById("cnhCategoria").value,
        validade: document.getElementById("cnhValidade").value,
      };
    }

    // Pagamento do plano (se plano for pago)
    const plan = state.selectedPlanMeta || { name: "Simple", monthly: 0 };
    const perKey = document.getElementById("planPeriodicity").value || "mensal";
    const perMeta = periodicityMeta[perKey] || periodicityMeta.mensal;

    let totals = { subtotal: 0, discount: 0, final: 0 };
    if (plan.monthly > 0 && state.selectedUserType !== "transportador") {
      const method = (document.querySelector('input[name="paymentMethod"]:checked') || {}).value;
      if (!method) {
        alert("Selecione um método de pagamento.");
        return;
      }
      if (method === "credit" || method === "debit") {
        const num = (document.getElementById("planCardNumber").value || "").replace(/\s/g, "");
        const name = document.getElementById("planCardName").value;
        const exp = document.getElementById("planCardExpiry").value;
        const cvv = document.getElementById("planCardCvv").value;
        if (!(num && name && exp && cvv)) {
          alert("Preencha os dados do cartão.");
          return;
        }
        user.payment = { method, last4: num.slice(-4), holder: name, expiry: exp, status: "active", date: new Date().toISOString() };
      } else {
        user.payment = { method, status: "pending", date: new Date().toISOString() };
      }

      totals.subtotal = plan.monthly * perMeta.months;
      totals.discount = totals.subtotal * (perMeta.discount || 0);
      totals.final = totals.subtotal - totals.discount;
    } else {
      user.payment = { method: "free", status: "ok", date: new Date().toISOString() };
    }

    // Persistência
    state.users.push(user);
    saveToLocalStorage();

    // Comprovante como imagem (PNG) - aguardando logo
    try {
      await generateReceiptImage({ user, plan, perMeta, totals: plan.monthly > 0 ? totals : null });
    } catch (imgErr) {
      console.warn("Falha ao gerar imagem do comprovante:", imgErr);
    }

    alert("Cadastro realizado com sucesso!");

    // Reset visual
    document.getElementById("registerForm").reset();
    document.getElementById("tierSelection").style.display = "none";
    document.getElementById("transportTypeSelection").style.display = "none";
    document.getElementById("registerForm").style.display = "none";
    const ps = document.getElementById("planSummary"); if (ps) ps.style.display = "none";
    const pay = document.getElementById("paymentSection"); if (pay) pay.style.display = "none";
    document.querySelectorAll(".tier-card").forEach((c) => c.classList.remove("selected"));
    state.selectedTier = null; state.selectedPlanMeta = null;
    showScreen("login");
  } catch (err) {
    console.error("Erro ao finalizar cadastro:", err);
    alert("Não foi possível finalizar o cadastro. Detalhes: " + (err.message || err));
  }
}

function handleLogin(e) {
  e.preventDefault();
  const username = document.getElementById("loginUser").value;
  const password = document.getElementById("loginPassword").value;

  const user = state.users.find((u) => u.username === username && u.password === password);
  if (user) {
    state.currentUser = user;
    saveToLocalStorage();
    loadDashboard();
    hideAuthTabs();
    requestNotificationPermissionOnce();
  } else {
    alert("Usuário ou senha incorretos!");
  }
}

function logout() {
  state.currentUser = null;
  localStorage.removeItem("ecolinkLoggedUser");
  showAuthTabs();
  showScreen("login");
  const logoutBtn = document.getElementById("logoutBtn");
  const notifWrap = document.getElementById("notifWrap");
  if (logoutBtn) logoutBtn.style.display = "none";
  if (notifWrap) notifWrap.style.display = "none";
  const dd = document.getElementById("notifDropdown");
  if (dd) dd.hidden = true;
}

// ====================
// Dashboard (resumo)
// ====================
function calculateEcoImpact(weight) {
  return {
    co2: (weight * 15.3).toFixed(2),
    water: (weight * 2700).toFixed(0),
    landfill: weight,
  };
}

function loadDashboard() {
  document.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
  document.getElementById("dashboard").classList.add("active");

  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) logoutBtn.style.display = "inline-block";
  const notifWrap = document.getElementById("notifWrap");
  if (notifWrap) notifWrap.style.display = "inline-block";

  const nameEl = document.getElementById("userName");
  const typeEl = document.getElementById("userType");
  nameEl.textContent = state.currentUser.name;
  let typeText = `${state.currentUser.type.charAt(0).toUpperCase() + state.currentUser.type.slice(1)} • Plano ${state.currentUser.tier}`;
  if (state.currentUser.transportType) typeText += ` • ${state.currentUser.transportType}`;
  typeEl.textContent = typeText;

  document.getElementById("doadorDash").style.display = "none";
  document.getElementById("recebedorDash").style.display = "none";
  document.getElementById("transportadorDash").style.display = "none";

  if (state.currentUser.type === "doador") {
    document.getElementById("doadorDash").style.display = "block";
  } else if (state.currentUser.type === "recebedor") {
    document.getElementById("recebedorDash").style.display = "block";
  } else if (state.currentUser.type === "transportador") {
    document.getElementById("transportadorDash").style.display = "block";
  }

  renderNotifications();
  renderDonationsTables();
}

// ======================
// Notificações & modais
// ======================
function pushNotification({ title, message, link = null }) {
  bell.list.unshift({
    id: Date.now(),
    title,
    message,
    createdAt: new Date().toISOString(),
    read: false,
    link,
  });
  bell.unread++;
  renderNotifications();
  showToast(`${title}: ${message}`);

  if (window.Notification && Notification.permission === "granted") {
    try { new Notification(title, { body: message }); } catch (e) {}
  }
}
function requestNotificationPermissionOnce() {
  if (window.Notification && Notification.permission === "default") {
    Notification.requestPermission().catch(() => {});
  }
}
function renderNotifications() {
  const countEl = document.getElementById("notifCount");
  const listEl = document.getElementById("notifList");
  if (!countEl || !listEl) return;

  if (bell.unread > 0) {
    countEl.textContent = bell.unread > 99 ? "99+" : String(bell.unread);
    countEl.hidden = false;
  } else {
    countEl.hidden = true;
  }

  listEl.innerHTML = "";
  if (bell.list.length === 0) {
    listEl.innerHTML = '<li><span class="notif-time">Sem notificações</span></li>';
    return;
  }

  bell.list.forEach((n) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <div>
        <div class="notif-title">${n.title}</div>
        <div>${n.message}</div>
        <div class="notif-time">${new Date(n.createdAt).toLocaleString()}</div>
      </div>
      <div class="notif-actions">
        ${n.link ? `<button class="btn btn-info" onclick="openFromNotification('${n.link}', ${n.id})">Ver</button>` : ""}
        <button class="btn btn-warning" onclick="markAsRead(${n.id})">Lido</button>
      </div>
    `;
    listEl.appendChild(li);
  });
}
function markAsRead(id) {
  const item = bell.list.find((n) => n.id === id);
  if (item && !item.read) {
    item.read = true;
    bell.unread = Math.max(0, bell.unread - 1);
    renderNotifications();
  }
}
function clearAllNotifications() {
  bell.list.forEach((n) => (n.read = true));
  bell.unread = 0;
  renderNotifications();
}
function toggleNotifications() {
  const dd = document.getElementById("notifDropdown");
  if (!dd) return;
  dd.hidden = !dd.hidden;
}
function openFromNotification(link, id) {
  markAsRead(id);
  toggleNotifications();
  if (link && link.startsWith("tracking:")) {
    const donationId = Number(link.split(":")[1]);
    viewTracking(donationId);
  }
}
function showToast(text) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = text;
  toast.classList.remove("hidden");
  setTimeout(() => { toast.classList.add("hidden"); }, 3500);
}
document.addEventListener("click", (e) => {
  const dd = document.getElementById("notifDropdown");
  const btn = document.getElementById("notifBtn");
  if (!dd || !btn) return;
  if (!dd.hidden && !dd.contains(e.target) && !btn.contains(e.target)) {
    dd.hidden = true;
  }
});

// ==========================
// Doações voluntárias (modal)
// ==========================
function setVolunteerRequireds({ userType, donationType }) {
  const idsToToggle = [
    "volunteerName","volunteerCpfCnpj","volunteerEmail","volunteerPhone",
    "volunteerCep","volunteerLogradouro","volunteerNumero","volunteerBairro","volunteerCidade",
    "volunteerValue","volunteerValueNeeded","volunteerBank","volunteerAgency","volunteerAccount","volunteerAccountType",
    "volunteerItemDescription",
  ];
  idsToToggle.forEach(id => { const el = document.getElementById(id); if (el) el.required = false; });

  if (!userType) return;

  ["volunteerName","volunteerCpfCnpj","volunteerEmail","volunteerPhone","volunteerCep","volunteerLogradouro","volunteerNumero","volunteerBairro","volunteerCidade"]
    .forEach(id => { const el = document.getElementById(id); if (el) el.required = true; });

  if (userType === "doador") {
    if (donationType === "valor") {
      const val = document.getElementById("volunteerValue");
      if (val) val.required = true;
    } else if (donationType === "roupas" || donationType === "alimentos") {
      const desc = document.getElementById("volunteerItemDescription");
      if (desc) desc.required = true;
    }
  } else if (userType === "instituicao") {
    ["volunteerValueNeeded","volunteerBank","volunteerAgency","volunteerAccount","volunteerAccountType"]
      .forEach(id => { const el = document.getElementById(id); if (el) el.required = true; });
  }
}

function updateVolunteerFormVisibility() {
  const userType = (document.querySelector('input[name="volunteerUserType"]:checked') || {}).value;
  const donationType = (document.querySelector('input[name="volunteerDonationType"]:checked') || {}).value;

  const contact = document.getElementById("volunteerContactFields");
  const typeSel = document.getElementById("donationTypeSelection");
  const valueFields = document.getElementById("volunteerValueFields");
  const receiving = document.getElementById("volunteerReceivingFields");
  const itemFields = document.getElementById("volunteerItemFields");
  const notesGroup = document.getElementById("volunteerNotesGroup");
  const addr = document.getElementById("volunteerAddressFields");
  const submit = document.getElementById("volunteerSubmitBtn");

  [contact, typeSel, valueFields, receiving, itemFields, notesGroup, addr].forEach((el) => el && (el.style.display = "none"));

  if (!userType) { setVolunteerRequireds({ userType: null, donationType: null }); return; }

  contact.style.display = "block";
  addr.style.display = "block";
  notesGroup.style.display = "block";
  typeSel.style.display = userType === "doador" ? "block" : "none";

  if (userType === "doador") {
    if (!donationType) { submit.style.display = "none"; setVolunteerRequireds({ userType, donationType: null }); return; }
    if (donationType === "valor") {
      valueFields.style.display = "block";
      document.getElementById("donationDetails").style.display = "block";
      itemFields.style.display = "none";
    } else {
      itemFields.style.display = "block";
      valueFields.style.display = "none";
    }
    receiving.style.display = "none";
  } else {
    valueFields.style.display = "block";
    document.getElementById("donationDetails").style.display = "none";
    receiving.style.display = "block";
    itemFields.style.display = "none";
  }

  setVolunteerRequireds({ userType, donationType });
  submit.style.display = "inline-block";
}

function showPaymentFields(kind, method) {
  if (kind === "plan") {
    document.getElementById("planPixDetails").style.display = method === "pix" ? "block" : "none";
    document.getElementById("planTransferDetails").style.display = method === "transfer" ? "block" : "none";
    const showCard = method === "credit" || method === "debit";
    document.getElementById("planCardDetails").style.display = showCard ? "block" : "none";
  } else {
    document.getElementById("volunteerPixDetails").style.display = method === "pix" ? "block" : "none";
    document.getElementById("volunteerTransferDetails").style.display = method === "transfer" ? "block" : "none";
    document.getElementById("volunteerCardDetails").style.display = method === "credit" ? "block" : "none";
  }
}

function formatCardNumber(input) {
  let value = input.value.replace(/\D/g, "");
  value = value.replace(/(\d{4})(?=\d)/g, "$1 ");
  input.value = value;
}
function formatExpiry(input) {
  let value = input.value.replace(/\D/g, "");
  if (value.length >= 2) value = value.substring(0, 2) + "/" + value.substring(2, 4);
  input.value = value;
}

// Submissão da doação voluntária
function handleVolunteerDonation(e) {
  e.preventDefault();

  const userType = (document.querySelector('input[name="volunteerUserType"]:checked') || {}).value;
  const donationType = (document.querySelector('input[name="volunteerDonationType"]:checked') || {}).value;

  if (userType === "doador" && donationType === "valor") {
    const method = (document.querySelector('input[name="volunteerPaymentMethod"]:checked') || {}).value;
    if (!method) { alert("Selecione o método de pagamento."); return; }
  }

  const payload = {
    id: Date.now(),
    profile: userType,
    kind: donationType || (userType === "instituicao" ? "carencia" : "itens"),
    createdAt: new Date().toISOString(),
  };
  if (userType === "doador") state.volunteerDonations.push(payload);
  else state.volunteerInstitutions.push(payload);
  saveToLocalStorage();

  if (userType === "doador" && donationType === "valor") {
    alert("Doação em dinheiro registrada! Exibimos os dados bancários para transferência. Obrigado pela doação! 💚");
  } else if (userType === "doador") {
    alert("Doação registrada! Entraremos em contato para coleta/entrega. 💚");
  } else {
    alert("Solicitação de carência registrada! Nossa equipe entrará em contato. 💚");
  }

  closeModal("volunteerModal");
  e.target.reset();
  setVolunteerRequireds({ userType: null, donationType: null });
}

// ===================
// Doação via dashboard
// ===================
function handleNewDonation(e) {
  e.preventDefault();

  const donation = {
    id: Date.now(),
    donorId: state.currentUser ? state.currentUser.id : null,
    category: document.getElementById("donationCategory").value,
    weight: parseFloat(document.getElementById("donationWeight").value),
    phone: document.getElementById("donationPhone").value,
    email: document.getElementById("donationEmail").value,
    notes: document.getElementById("donationNotes").value,
    status: "pending",
    createdAt: new Date().toISOString(),
    donorReleased: true,
    receiverConfirmed: false,
    transporterId: null,
    transportPickedUp: false,
    transportDelivered: false,
    needsTransport: true
  };

  state.donations.push(donation);
  saveToLocalStorage();

  pushNotification({
    title: "Doação registrada",
    message: `Doação #${donation.id} criada. Recebedores e transportadores foram notificados.`,
    link: `tracking:${donation.id}`,
  });
  pushNotification({
    title: "Aviso aos Recebedores",
    message: `Nova doação #${donation.id} disponível para aceite.`,
    link: `tracking:${donation.id}`,
  });
  pushNotification({
    title: "Aviso aos Transportadores",
    message: `Coleta pendente para a doação #${donation.id} (aguardando aceite do recebedor).`,
    link: `tracking:${donation.id}`,
  });

  alert("Doação registrada com sucesso!");
  closeModal("newDonationModal");
  document.getElementById("newDonationForm").reset();
  renderDonationsTables();
}

// =====================
// Tabelas & Rastreamento
// =====================
function renderDonationsTables() {
  // DOADOR
  const donorTable = document.querySelector("#donorDonationsTable tbody");
  if (donorTable) {
    donorTable.innerHTML = "";
    const myDonations = state.donations.filter((d) => d.donorId === (state.currentUser && state.currentUser.id));
    let totalKg = 0;
    myDonations.forEach((d) => {
      totalKg += d.weight || 0;
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td data-label="ID">#${d.id}</td>
        <td data-label="Tipo">${d.category}</td>
        <td data-label="Peso">${(d.weight || 0).toFixed(2)}</td>
        <td data-label="Data">${new Date(d.createdAt).toLocaleDateString()}</td>
        <td data-label="Status"><span class="badge badge-${statusToBadge(d.status)}">${d.status}</span></td>
        <td data-label="Ações">
          <button class="btn btn-info" onclick="viewTracking(${d.id})">Rastrear</button>
        </td>
      `;
      donorTable.appendChild(tr);
    });

    const eco = calculateEcoImpact(totalKg);
    const co2El = document.getElementById("co2Saved");
    const waterEl = document.getElementById("waterSaved");
    const landfillEl = document.getElementById("landfillSaved");
    if (co2El) co2El.textContent = eco.co2;
    if (waterEl) waterEl.textContent = eco.water;
    if (landfillEl) landfillEl.textContent = totalKg.toFixed(2);
  }

  // RECEBEDOR
  const receiverTable = document.querySelector("#availableDonationsTable tbody");
  if (receiverTable) {
    receiverTable.innerHTML = "";
    const pendingDonations = state.donations.filter((d) => !d.receiverId);
    if (pendingDonations.length === 0) {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td colspan="6" style="text-align:center;">Nenhuma doação disponível no momento</td>`;
      receiverTable.appendChild(tr);
    } else {
      pendingDonations.forEach((d) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td data-label="ID">#${d.id}</td>
          <td data-label="Categoria">${d.category}</td>
          <td data-label="Peso (kg)">${(d.weight || 0).toFixed(2)}</td>
          <td data-label="Data">${new Date(d.createdAt).toLocaleDateString()}</td>
          <td data-label="Status"><span class="badge badge-${statusToBadge(d.status)}">${d.status}</span></td>
          <td data-label="Ações">
            <button class="btn btn-primary" onclick="acceptDonationSelf(${d.id})">Receber</button>
            <button class="btn btn-info" onclick="viewTracking(${d.id})">Rastrear</button>
          </td>
        `;
        receiverTable.appendChild(tr);
      });
    }
  }

  // TRANSPORTADOR
  const pickupTable = document.querySelector("#availablePickupsTable tbody");
  if (pickupTable) {
    pickupTable.innerHTML = "";
    const toTransport = state.donations.filter((d) => d.needsTransport && d.receiverId && !d.transporterId);
    if (toTransport.length === 0) {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td colspan="6" style="text-align:center;">Nenhuma coleta disponível no momento</td>`;
      pickupTable.appendChild(tr);
    } else {
      toTransport.forEach((d) => {
        const donor = state.users.find((u) => u.id === d.donorId);
        const receiver = state.users.find((u) => u.id === d.receiverId);
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td data-label="ID">#${d.id}</td>
          <td data-label="Doador">${donor ? donor.name : "-"}</td>
          <td data-label="Recebedor">${receiver ? receiver.name : "-"}</td>
          <td data-label="Peso (kg)">${(d.weight || 0).toFixed(2)}</td>
          <td data-label="Status"><span class="badge badge-${statusToBadge(d.status)}">${d.status}</span></td>
          <td data-label="Ações">
            <button class="btn btn-primary" onclick="acceptTransport(${d.id})">Aceitar</button>
            <button class="btn btn-info" onclick="viewTracking(${d.id})">Rastrear</button>
          </td>
        `;
        pickupTable.appendChild(tr);
      });
    }
  }
}

function statusToBadge(s) {
  if (s === "pending") return "pending";
  if (s === "receiverAccepted" || s === "in-transport") return "inprogress";
  return "complete";
}

function acceptDonationSelf(id) {
  const d = state.donations.find((x) => x.id === id);
  if (!d) return;
  d.receiverId = state.currentUser.id;
  d.status = "receiverAccepted";
  saveToLocalStorage();

  pushNotification({
    title: "Doação aceita",
    message: `Sua doação #${id} foi aceita por um recebedor.`,
    link: `tracking:${id}`,
  });

  renderDonationsTables();
}

function acceptTransport(id) {
  const d = state.donations.find((x) => x.id === id);
  if (!d) return;
  d.transporterId = state.currentUser.id;
  d.status = "in-transport";
  saveToLocalStorage();

  pushNotification({
    title: "Transporte aceito",
    message: `Um transportador assumiu a doação #${id}.`,
    link: `tracking:${id}`,
  });

  renderDonationsTables();
}

function viewTracking(id) {
  const d = state.donations.find((x) => x.id === id);
  if (!d) return alert("Doação não encontrada.");

  const donor = state.users.find((u) => u.id === d.donorId);
  const receiver = state.users.find((u) => u.id === d.receiverId);
  const transporter = state.users.find((u) => u.id === d.transporterId);

  const steps = [
    { ok: !!d.donorId, label: "Doador registrou a doação" },
    { ok: !!d.receiverId, label: "Recebedor aceitou a doação" },
    { ok: !!d.transporterId, label: "Transportador assumiu a coleta" },
    { ok: !!d.transportPickedUp, label: "Coleta realizada" },
    { ok: d.status === "delivered" || !!d.transportDelivered, label: "Entrega concluída" },
  ];

  const body = document.getElementById("trackingBody");
  body.innerHTML = `
    <p><strong>ID:</strong> #${d.id}</p>
    <p><strong>Categoria:</strong> ${d.category}</p>
    <p><strong>Peso:</strong> ${(d.weight || 0).toFixed(2)} kg</p>
    <p><strong>Status:</strong> ${d.status}</p>
    <hr/>
    <p><strong>Doador:</strong> ${donor ? donor.name : "-"}</p>
    <p><strong>Recebedor:</strong> ${receiver ? receiver.name : "-"}</p>
    <p><strong>Transportador:</strong> ${transporter ? transporter.name : "-"}</p>
    <hr/>
    <ul>
      ${steps.map(s => `<li>${s.ok ? "✅" : "⏳"} ${s.label}</li>`).join("")}
    </ul>
    <div style="margin-top:10px; display:flex; gap:8px; flex-wrap:wrap;">
      ${!d.transportPickedUp && d.transporterId ? `<button class="btn btn-info" onclick="markPicked(${d.id})">Confirmar Coleta</button>` : ""}
      ${!d.transportDelivered && d.transporterId ? `<button class="btn btn-primary" onclick="markDelivered(${d.id})">Confirmar Entrega</button>` : ""}
      ${d.receiverId && !d.transportDelivered ? `<button class="btn btn-warning" onclick="toggleTransport(${d.id})">${d.needsTransport ? "Dispensar Transporte" : "Solicitar Transporte"}</button>` : ""}
      ${d.status !== "delivered" ? `<button class="btn" onclick="closeModal('trackingModal')">Fechar</button>` : ""}
    </div>
  `;

  openModal("trackingModal");
}

function markPicked(id) {
  const d = state.donations.find((x) => x.id === id);
  if (!d) return;
  d.transportPickedUp = true;
  d.status = "in-transport";
  saveToLocalStorage();
  pushNotification({ title: "Coleta confirmada", message: `Coleta da doação #${id} confirmada.`, link: `tracking:${id}` });
  viewTracking(id);
  renderDonationsTables();
}

function markDelivered(id) {
  const d = state.donations.find((x) => x.id === id);
  if (!d) return;
  d.transportDelivered = true;
  d.status = "delivered";
  saveToLocalStorage();
  pushNotification({ title: "Entrega concluída", message: `Doação #${id} entregue com sucesso.`, link: `tracking:${id}` });
  viewTracking(id);
  renderDonationsTables();
}

function toggleTransport(id) {
  const d = state.donations.find((x) => x.id === id);
  if (!d) return;
  d.needsTransport = !d.needsTransport;
  saveToLocalStorage();
  pushNotification({
    title: d.needsTransport ? "Transporte solicitado" : "Transporte dispensado",
    message: `Atualização na doação #${id}.`,
    link: `tracking:${id}`,
  });
  viewTracking(id);
  renderDonationsTables();
}

// ====== Modais util ======
function openModal(id) { document.getElementById(id).classList.add("active"); }
function closeModal(id) { document.getElementById(id).classList.remove("active"); }
window.onclick = function (event) {
  if (event.target.classList && event.target.classList.contains("modal")) {
    event.target.classList.remove("active");
  }
};

// ====== Dados demo (se necessário) ======
loadFromLocalStorage();

if (state.users.length === 0) {
  const demoUsers = [
    {
      id: 1,
      name: "Confecções TextilMax Ltda",
      document: "12.345.678/0001-90",
      email: "contato@textilmax.com.br",
      phone: "(47) 3333-4444",
      address: {
        cep: "89030-000",
        logradouro: "Rua das Indústrias",
        numero: "1500",
        complemento: "Galpão 3",
        bairro: "Itoupava Seca",
        cidade: "Blumenau",
        estado: "SC",
      },
      fullAddress: "Rua das Indústrias, 1500, Galpão 3, Itoupava Seca, Blumenau, SC, 89030-000",
      username: "doador1",
      password: "Senha@123",
      type: "doador",
      tier: "ouro",
      createdAt: new Date().toISOString(),
    },
    {
      id: 2,
      name: "EcoRecicla Têxtil S.A.",
      document: "98.765.432/0001-10",
      email: "comercial@ecorecicla.com.br",
      phone: "(47) 3555-6666",
      address: {
        cep: "89010-100",
        logradouro: "Avenida Beira Rio",
        numero: "800",
        complemento: "",
        bairro: "Centro",
        cidade: "Blumenau",
        estado: "SC",
      },
      fullAddress: "Avenida Beira Rio, 800, Centro, Blumenau, SC, 89010-100",
      username: "recebedor1",
      password: "Senha@456",
      type: "recebedor",
      tier: "diamantium",
      createdAt: new Date().toISOString(),
    },
    {
      id: 3,
      name: "TransLog Cargas Especiais",
      document: "55.444.333/0001-22",
      email: "operacoes@translog.com.br",
      phone: "(47) 3777-8888",
      address: {
        cep: "89035-500",
        logradouro: "Rodovia BR-101",
        numero: "Km 25",
        complemento: "",
        bairro: "Distrito Industrial",
        cidade: "Blumenau",
        estado: "SC",
      },
      fullAddress: "Rodovia BR-101, Km 25, Distrito Industrial, Blumenau, SC, 89035-500",
      username: "transportador1",
      password: "Senha@789",
      type: "transportador",
      tier: "bronze",
      transportType: "caminhao",
      createdAt: new Date().toISOString(),
    },
  ];
  state.users = [...demoUsers];
  saveToLocalStorage();
}

console.log("Sistema Ecolink inicializado!");
