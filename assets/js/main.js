// =======================
// Carrossel infinito
// =======================
(function(){
  const root = document.querySelector('[data-carousel]');
  if(!root) return;
  const track = root.querySelector('.carousel-track');
  const speed = 0.6; // pixels por frame
  let x = 0, paused = false;

  const items = Array.from(track.children);
  items.forEach(el => track.appendChild(el.cloneNode(true)));
  items.forEach(el => track.appendChild(el.cloneNode(true)));

  function step(){
    if (!paused){
      x -= speed;
      const first = track.children[0];
      const cardW = first.getBoundingClientRect().width + 16;
      if (Math.abs(x) >= cardW){
        track.appendChild(track.children[0]);
        x += cardW;
      }
      track.style.transform = `translate3d(${x}px,0,0)`;
    }
    requestAnimationFrame(step);
  }
  root.addEventListener('mouseenter', () => paused = true);
  root.addEventListener('mouseleave', () => paused = false);
  step();
})();

// =======================
// Abas de Planos
// =======================
(function initPricingTabs(){
  const tabs = document.querySelectorAll('.pricing-tab');
  if(!tabs.length) return;

  tabs.forEach(btn=>{
    btn.addEventListener('click', ()=>{
      document.querySelectorAll('.pricing-tab').forEach(b=>b.classList.remove('active'));
      tabs.forEach(b=>b.setAttribute('aria-selected','false'));
      btn.classList.add('active');
      btn.setAttribute('aria-selected','true');

      const target = btn.getAttribute('data-target');
      document.querySelectorAll('#planos .pricing').forEach(p=>p.classList.add('hidden'));
      const panel = document.getElementById(target);
      if (panel) panel.classList.remove('hidden');
    });
  });
})();

// =======================
// Header: hamburger + drawer
// =======================
(function(){
  const header = document.querySelector('.nav');
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.getElementById('primary-nav');

  if(!header || !toggle || !nav) return;

  function closeMenu(){
    header.classList.remove('open');
    toggle.setAttribute('aria-expanded','false');
  }

  toggle.addEventListener('click', ()=>{
    const isOpen = header.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(isOpen));
  });

  // Fechar ao clicar nos links (melhor UX)
  nav.addEventListener('click', (e)=>{
    const el = e.target.closest('a');
    if(!el) return;
    closeMenu();
  });

  // Fecha ao pressionar ESC
  document.addEventListener('keydown', (e)=>{
    if(e.key === 'Escape') closeMenu();
  });
})();

// =======================
// Scrollspy (ativa link do nav conforme seção visível)
// =======================
(function(){
  const links = [...document.querySelectorAll('[data-spy]')];
  const sections = links
    .map(a => document.querySelector(`[id="${a.getAttribute('data-spy')}"]`))
    .filter(Boolean);

  if(!links.length || !sections.length) return;

  const linkById = new Map(
    links.map(a => [a.getAttribute('data-spy'), a])
  );

  const obs = new IntersectionObserver((entries)=>{
    entries.forEach(entry=>{
      const id = entry.target.getAttribute('id');
      const link = linkById.get(id);
      if(!link) return;

      if(entry.isIntersecting){
        links.forEach(l=>l.classList.remove('is-active'));
        link.classList.add('is-active');
      }
    });
  }, { rootMargin: '-30% 0px -50% 0px', threshold: 0.1 });

  sections.forEach(sec => obs.observe(sec));
})();

// =======================
// Modal de Doações Voluntárias (NOVO FLUXO)
// =======================
(function(){
  const openBtn = document.getElementById('btn-doacoes');
  const modal = document.getElementById('donation-modal');
  if(!openBtn || !modal) return;

  const closeBtnsSel = '[data-close-modal], .donation-backdrop';
  const stepProfile = document.getElementById('step-profile');
  const stepDonorType = document.getElementById('step-donor-type');
  const stepDonorForm = document.getElementById('step-donor-form');
  const stepInstForm = document.getElementById('step-institution-form');

  const donorFormTitle = document.getElementById('donor-form-title');
  const typeText = document.getElementById('vf-type-text');
  const moneyCard = document.getElementById('vf-money-card');
  const itemsCard = document.getElementById('vf-items-card');
  const bankCard = document.getElementById('vf-bank');
  const feedback = document.getElementById('donation-feedback');
  const instFeedback = document.getElementById('inst-feedback');

  let currentProfile = null;      // 'doador' | 'instituicao'
  let currentDonation = null;     // 'valor' | 'roupas' | 'alimentos' | 'itens'

  function show(el){ el.classList.remove('hidden'); }
  function hide(el){ el.classList.add('hidden'); }
  function resetFeedback(){ if(feedback){ feedback.textContent=''; feedback.style.color=''; } if(instFeedback){ instFeedback.textContent=''; } }
  function resetAmounts(){
    stepDonorForm.querySelectorAll('.amount').forEach(b=>b.classList.remove('active'));
    const custom = document.getElementById('vf-custom');
    if (custom) custom.value = '';
  }
  function getMoneyAmount(){
    const active = stepDonorForm.querySelector('.amount.active');
    const val = active ? Number(active.dataset.amount) : 0;
    const custom = Number((document.getElementById('vf-custom')||{}).value || 0);
    return custom > 0 ? custom : val;
  }

  function open(){
    modal.classList.add('open');
    modal.setAttribute('aria-hidden','false');  
    document.body.style.overflow = 'hidden';

    resetFeedback();
    currentProfile = null;
    currentDonation = null;
    // volta para o primeiro passo
    show(stepProfile);
    hide(stepDonorType);
    hide(stepDonorForm);
    hide(stepInstForm);
  }
  function close(){
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden','true');
    document.body.style.overflow = '';
  }

  // Abertura/fechamento
  openBtn.addEventListener('click', open);
  modal.addEventListener('click', (e)=>{ if(e.target.matches(closeBtnsSel)) close(); });
  document.addEventListener('keydown', (e)=>{ if(e.key === 'Escape') close(); });

  // ===== Passo 1: escolher perfil
  stepProfile.addEventListener('click', (e)=>{
    const card = e.target.closest('.selectable[data-profile]');
    if(!card) return;
    currentProfile = card.getAttribute('data-profile');

    if(currentProfile === 'doador'){
      hide(stepProfile); show(stepDonorType);
    } else {
      hide(stepProfile); show(stepInstForm);
    }
  });
  // acessibilidade via Enter
  stepProfile.addEventListener('keydown', (e)=>{
    if(e.key !== 'Enter') return;
    const card = e.target.closest('.selectable[data-profile]');
    if(!card) return;
    card.click();
  });

  // ===== Passo 2 (doador): tipo de doação
  stepDonorType.addEventListener('click', (e)=>{
    const card = e.target.closest('.selectable[data-donation]');
    if(!card) return;
    currentDonation = card.getAttribute('data-donation');
    donorFormTitle.textContent = 'Detalhes da doação — ' + currentDonation;
    typeText.textContent = currentDonation.charAt(0).toUpperCase()+currentDonation.slice(1);
    // mostra campos condizentes
    resetAmounts();
    moneyCard.hidden = currentDonation !== 'valor';
    bankCard.hidden  = currentDonation !== 'valor';
    itemsCard.hidden = currentDonation === 'valor';

    hide(stepDonorType); show(stepDonorForm);
  });
  stepDonorType.addEventListener('keydown', (e)=>{
    if(e.key!=='Enter') return;
    const card = e.target.closest('.selectable[data-donation]');
    if(card) card.click();
  });

  // Botões Voltar
  document.querySelectorAll('[data-back]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      resetFeedback();
      if(!currentProfile || currentProfile==='doador' && stepDonorForm.classList.contains('hidden')){
        show(stepProfile); hide(stepDonorType); hide(stepDonorForm); hide(stepInstForm);
      } else if(currentProfile==='doador' && !stepDonorForm.classList.contains('hidden')){
        show(stepDonorType); hide(stepDonorForm);
      } else {
        show(stepProfile); hide(stepInstForm);
      }
    });
  });

  // Seleção de valores rápidos (no passo de dinheiro)
  stepDonorForm.querySelectorAll('.amount').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      stepDonorForm.querySelectorAll('.amount').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      const custom = document.getElementById('vf-custom');
      if(custom) custom.value='';
      resetFeedback();
    });
  });

  // Submissões (mock)
  document.getElementById('vf-submit').addEventListener('click', ()=>{
    resetFeedback();
    if(currentDonation==='valor'){
      const amt = getMoneyAmount();
      if(!amt || amt < 5){
        feedback.textContent = 'Escolha um valor (mínimo R$ 5).';
        feedback.style.color = '#c62828';
        return;
      }
      feedback.textContent = `Obrigado! Doação registrada no valor de R$ ${amt.toFixed(2)}. Os dados bancários estão acima.`;
      feedback.style.color = '#2e7d32';
    } else {
      const desc = (document.getElementById('vf-items')||{}).value || '';
      if(currentDonation!=='valor' && desc.trim().length < 3){
        feedback.textContent = 'Descreva brevemente os itens a doar.';
        feedback.style.color = '#c62828';
        return;
      }
      feedback.textContent = 'Obrigado! Sua doação foi registrada. Entraremos em contato para combinar a coleta/entrega.';
      feedback.style.color = '#2e7d32';
    }
    setTimeout(close, 1500);
  });

  document.getElementById('inst-submit').addEventListener('click', ()=>{
    instFeedback.textContent = 'Solicitação enviada! Nossa equipe entrará em contato em breve.';
    setTimeout(close, 1500);
  });

})();
