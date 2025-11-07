/* =================== STATE & STORAGE =================== */
const state = {
  currentUser: null,
  selectedUserType: null,
  selectedTier: null,
  users: [],
  donations: [],
  volunteerDonations: [],
  volunteerInstitutions: [],
  notifications: []
};

function loadFromLocalStorage() {
  const saved = localStorage.getItem('ecolinkData');
  if (saved) {
    const data = JSON.parse(saved);
    state.users = data.users || [];
    state.donations = data.donations || [];
    state.volunteerDonations = data.volunteerDonations || [];
    state.volunteerInstitutions = data.volunteerInstitutions || [];
  }
}

function saveToLocalStorage() {
  const data = {
    users: state.users,
    donations: state.donations,
    volunteerDonations: state.volunteerDonations,
    volunteerInstitutions: state.volunteerInstitutions
  };
  localStorage.setItem('ecolinkData', JSON.stringify(data));
}

/* =================== UI HELPERS =================== */
function showScreen(screenId, evt) {
  document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach((t) => t.classList.remove('active'));
  document.getElementById(screenId).classList.add('active');
  if (evt && evt.currentTarget) evt.currentTarget.classList.add('active');
}

function selectUserType(type, evt) {
  state.selectedUserType = type;
  document.querySelectorAll('.tier-card').forEach((c) => c.classList.remove('selected'));
  if (evt && evt.currentTarget) evt.currentTarget.classList.add('selected');
  document.getElementById('tierSelection').style.display = 'block';
}

function selectTier(tier, evt) {
  state.selectedTier = tier;
  document.querySelectorAll('#tierSelection .tier-card').forEach((c) => c.classList.remove('selected'));
  if (evt && evt.currentTarget) evt.currentTarget.classList.add('selected');
  document.getElementById('registerForm').style.display = 'block';
}

function checkPasswordStrength(password) {
  const strengthEl = document.getElementById('passwordStrength');
  let strength = 0;
  if (password.length >= 8) strength++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
  if (/\d/.test(password)) strength++;
  if (/[^a-zA-Z0-9]/.test(password)) strength++;

  if (strength < 2) {
    strengthEl.textContent = 'Senha fraca';
    strengthEl.className = 'password-strength strength-weak';
  } else if (strength < 4) {
    strengthEl.textContent = 'Senha média';
    strengthEl.className = 'password-strength strength-medium';
  } else {
    strengthEl.textContent = 'Senha forte';
    strengthEl.className = 'password-strength strength-strong';
  }
}

/* =================== CEP =================== */
async function buscarCep(cep) {
  const cepLimpo = cep.replace(/\D/g, '');
  if (cepLimpo.length !== 8) return;

  document.getElementById('cepLoading').style.display = 'block';
  try {
    const r = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
    const data = await r.json();
    if (!data.erro) {
      document.getElementById('regLogradouro').value = data.logradouro || '';
      document.getElementById('regBairro').value = data.bairro || '';
      document.getElementById('regCidade').value = data.localidade || '';
      document.getElementById('regEstado').value = data.uf || '';
    }
  } catch (e) {
    console.error('Erro ao buscar CEP:', e);
  } finally {
    document.getElementById('cepLoading').style.display = 'none';
  }
}

async function buscarCepVolunteer(cep, type) {
  const cepLimpo = cep.replace(/\D/g, '');
  if (cepLimpo.length !== 8) return;

  try {
    const r = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
    const data = await r.json();
    if (!data.erro) {
      if (type === 'donor') {
        document.getElementById('volDonorLogradouro').value = data.logradouro || '';
        document.getElementById('volDonorBairro').value = data.bairro || '';
        document.getElementById('volDonorCidade').value = data.localidade || '';
      } else {
        document.getElementById('volInstLogradouro').value = data.logradouro || '';
        document.getElementById('volInstBairro').value = data.bairro || '';
        document.getElementById('volInstCidade').value = data.localidade || '';
      }
    }
  } catch (e) {
    console.error('Erro ao buscar CEP:', e);
  }
}

/* =================== AUTH & REGISTRO =================== */
function handleRegister(e) {
  e.preventDefault();

  const password = document.getElementById('regPassword').value;
  if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).{8,}$/.test(password)) {
    alert('A senha deve conter letras maiúsculas e minúsculas, números, caracteres especiais e no mínimo 8 dígitos.');
    return;
  }

  const address = {
    cep: document.getElementById('regCep').value,
    logradouro: document.getElementById('regLogradouro').value,
    numero: document.getElementById('regNumero').value,
    complemento: document.getElementById('regComplemento').value,
    bairro: document.getElementById('regBairro').value,
    cidade: document.getElementById('regCidade').value,
    estado: document.getElementById('regEstado').value
  };

  const fullAddress = `${address.logradouro}, ${address.numero}${address.complemento ? ', ' + address.complemento : ''}, ${address.bairro}, ${address.cidade}, ${address.estado}, ${address.cep}`;

  const user = {
    id: Date.now(),
    name: document.getElementById('regName').value,
    document: document.getElementById('regDoc').value,
    email: document.getElementById('regEmail').value,
    phone: document.getElementById('regPhone').value,
    address,
    fullAddress,
    username: document.getElementById('regUsername').value,
    password,
    type: state.selectedUserType,
    tier: state.selectedTier,
    createdAt: new Date().toISOString()
  };

  state.users.push(user);
  saveToLocalStorage();
  alert('Cadastro realizado com sucesso!');
  document.getElementById('registerForm').reset();
  showScreen('login');
}

function handleLogin(e) {
  e.preventDefault();
  const username = document.getElementById('loginUser').value;
  const password = document.getElementById('loginPassword').value;

  const user = state.users.find((u) => u.username === username && u.password === password);
  if (user) {
    state.currentUser = user;
    loadDashboard();
  } else {
    alert('Usuário ou senha incorretos!');
  }
}

/* =================== DASHBOARDS =================== */
function calculateEcoImpact(weight) {
  return {
    co2: (weight * 15.3).toFixed(2),
    water: (weight * 2700).toFixed(0),
    landfill: weight
  };
}

function loadDashboard() {
  document.getElementById('userName').textContent = state.currentUser.name;
  document.getElementById('userType').textContent =
    `${state.currentUser.type[0].toUpperCase()}${state.currentUser.type.slice(1)} - Plano ${state.currentUser.tier[0].toUpperCase()}${state.currentUser.tier.slice(1)}`;

  document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
  document.getElementById('dashboard').classList.add('active');

  document.getElementById('doadorDash').style.display = 'none';
  document.getElementById('recebedorDash').style.display = 'none';
  document.getElementById('transportadorDash').style.display = 'none';

  if (state.currentUser.type === 'doador') {
    document.getElementById('doadorDash').style.display = 'block';
    loadDoadorDashboard();
  } else if (state.currentUser.type === 'recebedor') {
    document.getElementById('recebedorDash').style.display = 'block';
    loadRecebedorDashboard();
  } else if (state.currentUser.type === 'transportador') {
    document.getElementById('transportadorDash').style.display = 'block';
    loadTransportadorDashboard();
  }
}

/* ===== DOADOR ===== */
function loadDoadorDashboard() {
  const userDonations = state.donations.filter((d) => d.donorId === state.currentUser.id);
  const totalWeight = userDonations.reduce((sum, d) => sum + parseFloat(d.weight), 0);
  const ecoImpact = calculateEcoImpact(totalWeight);

  document.getElementById('co2Saved').textContent = ecoImpact.co2;
  document.getElementById('waterSaved').textContent = ecoImpact.water;
  document.getElementById('landfillAvoided').textContent = ecoImpact.landfill.toFixed(3);

  document.getElementById('totalDonations').textContent = userDonations.length;
  document.getElementById('totalWeight').textContent = totalWeight.toFixed(3);
  document.getElementById('pendingDonations').textContent = userDonations.filter((d) => d.status !== 'completed').length;

  const tbody = document.querySelector('#donationsTable tbody');
  tbody.innerHTML = '';
  userDonations.forEach((donation) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td data-label="ID">#${donation.id}</td>
      <td data-label="Categoria">${donation.category}</td>
      <td data-label="Peso (kg)">${donation.weight}</td>
      <td data-label="Data">${new Date(donation.createdAt).toLocaleDateString()}</td>
      <td data-label="Status"><span class="badge badge-${donation.status}">${donation.status}</span></td>
      <td data-label="Ações">
        <button class="btn btn-info" onclick="viewTracking(${donation.id})">Rastrear</button>
      </td>`;
    tbody.appendChild(tr);
  });
}

/* ===== RECEBEDOR ===== */
function loadRecebedorDashboard() {
  const receivedDonations = state.donations.filter((d) => d.receiverId === state.currentUser.id);
  const totalWeight = receivedDonations.reduce((sum, d) => sum + parseFloat(d.weight), 0);
  const ecoImpact = calculateEcoImpact(totalWeight);

  document.getElementById('co2SavedRec').textContent = ecoImpact.co2;
  document.getElementById('waterSavedRec').textContent = ecoImpact.water;
  document.getElementById('recycledMaterial').textContent = ecoImpact.landfill.toFixed(3);

  document.getElementById('totalReceived').textContent = receivedDonations.length;
  document.getElementById('receivedWeight').textContent = totalWeight.toFixed(3);
  document.getElementById('pendingReceive').textContent = receivedDonations.filter((d) => !d.receiverConfirmed).length;

  // Notificações (doações ainda sem recebedor)
  const notificationsDiv = document.getElementById('receiverNotifications');
  notificationsDiv.innerHTML = '';
  const pendingDonations = state.donations.filter((d) => !d.receiverId);

  if (pendingDonations.length === 0) {
    notificationsDiv.innerHTML = '<p style="text-align:center;color:#6c757d;">Nenhuma notificação no momento</p>';
  }

  pendingDonations.forEach((donation) => {
    const donor = state.users.find((u) => u.id === donation.donorId);
    const notif = document.createElement('div');
    notif.className = 'notification warning';
    notif.innerHTML = `
      <div class="notification-header">
        <div class="notification-title">Nova Doação Disponível</div>
        <div class="notification-time">${new Date(donation.createdAt).toLocaleString()}</div>
      </div>
      <p><strong>Doador:</strong> ${donor.name}</p>
      <p><strong>Categoria:</strong> ${donation.category}</p>
      <p><strong>Peso:</strong> ${donation.weight} kg</p>
      <p><strong>Localização:</strong> ${donor.fullAddress}</p>
      <div class="notification-actions">
        <button class="btn btn-danger" onclick="refuseDonation(${donation.id})">Recusar</button>
        <button class="btn btn-info" onclick="acceptDonationSelf(${donation.id})">Recolher por Conta</button>
        <button class="btn btn-primary" onclick="acceptDonationEcolink(${donation.id})">Recolher pela Ecolink</button>
      </div>`;
    notificationsDiv.appendChild(notif);
  });

  // Tabela "Minhas Operações" com rastreio
  const tbody = document.querySelector('#receiverDonationsTable tbody');
  tbody.innerHTML = '';
  receivedDonations.forEach((donation) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td data-label="ID">#${donation.id}</td>
      <td data-label="Categoria">${donation.category}</td>
      <td data-label="Peso (kg)">${donation.weight}</td>
      <td data-label="Data">${new Date(donation.createdAt).toLocaleDateString()}</td>
      <td data-label="Status"><span class="badge badge-${donation.status}">${donation.status}</span></td>
      <td data-label="Ações">
        <button class="btn btn-info" onclick="viewTracking(${donation.id})">Rastrear</button>
      </td>`;
    tbody.appendChild(tr);
  });
}

/* ===== TRANSPORTADOR ===== */
function loadTransportadorDashboard() {
  const deliveries = state.donations.filter((d) => d.transporterId === state.currentUser.id);
  const totalWeight = deliveries.reduce((sum, d) => sum + parseFloat(d.weight), 0);
  const distance = deliveries.length * 15;
  const ecoImpact = calculateEcoImpact(totalWeight);

  document.getElementById('totalDistanceTrans').textContent = distance.toFixed(1);
  document.getElementById('co2SavedTrans').textContent = ecoImpact.co2;
  document.getElementById('materialTransported').textContent = totalWeight.toFixed(3);

  document.getElementById('totalDeliveries').textContent = deliveries.filter((d) => d.transportDelivered).length;
  document.getElementById('ongoingDeliveries').textContent = deliveries.filter((d) => !d.transportDelivered).length;
  document.getElementById('totalDistance').textContent = distance.toFixed(1);

  // Solicitações em aberto
  const notificationsDiv = document.getElementById('transportNotifications');
  notificationsDiv.innerHTML = '';
  const pendingTransports = state.donations.filter((d) => d.needsTransport && !d.transporterId);

  if (pendingTransports.length === 0) {
    notificationsDiv.innerHTML = '<p style="text-align:center;color:#6c757d;">Nenhuma solicitação no momento</p>';
  }

  pendingTransports.forEach((donation) => {
    const donor = state.users.find((u) => u.id === donation.donorId);
    const receiver = state.users.find((u) => u.id === donation.receiverId);
    const notif = document.createElement('div');
    notif.className = 'notification';
    notif.innerHTML = `
      <div class="notification-header">
        <div class="notification-title">Solicitação de Transporte</div>
        <div class="notification-time">${new Date(donation.createdAt).toLocaleString()}</div>
      </div>
      <p><strong>Origem:</strong> ${donor.fullAddress}</p>
      <p><strong>Destino:</strong> ${receiver ? receiver.fullAddress : '-'}</p>
      <p><strong>Categoria:</strong> ${donation.category}</p>
      <p><strong>Peso:</strong> ${donation.weight} kg</p>
      <div class="notification-actions">
        <button class="btn btn-danger" onclick="refuseTransport(${donation.id})">Recusar</button>
        <button class="btn btn-primary" onclick="acceptTransport(${donation.id})">Aceitar</button>
      </div>`;
    notificationsDiv.appendChild(notif);
  });

  // Tabela "Minhas Entregas" com rastreio
  const tbody = document.querySelector('#transporterDonationsTable tbody');
  tbody.innerHTML = '';
  deliveries.forEach((donation) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td data-label="ID">#${donation.id}</td>
      <td data-label="Categoria">${donation.category}</td>
      <td data-label="Peso (kg)">${donation.weight}</td>
      <td data-label="Data">${new Date(donation.createdAt).toLocaleDateString()}</td>
      <td data-label="Status"><span class="badge badge-${donation.status}">${donation.status}</span></td>
      <td data-label="Ações">
        <button class="btn btn-info" onclick="viewTracking(${donation.id})">Rastrear</button>
      </td>`;
    tbody.appendChild(tr);
  });
}

/* =================== AÇÕES =================== */
function submitDonation(e) {
  e.preventDefault();

  const donation = {
    id: Date.now(),
    donorId: state.currentUser.id,
    category: document.getElementById('donationCategory').value,
    weight: document.getElementById('donationWeight').value,
    phone: document.getElementById('donationPhone').value,
    email: document.getElementById('donationEmail').value,
    notes: document.getElementById('donationNotes').value,
    address: state.currentUser.fullAddress,
    status: 'pending',
    createdAt: new Date().toISOString(),
    donorReleased: false,
    receiverConfirmed: false,
    transportPickedUp: false,
    transportDelivered: false,
    needsTransport: false
  };

  state.donations.push(donation);
  saveToLocalStorage();
  alert('Doação registrada com sucesso! Os recebedores foram notificados.');
  closeModal('newDonationModal');
  document.getElementById('newDonationModal').querySelector('form').reset();
  loadDoadorDashboard();
}

/* Voluntariado */
function showVolunteerForm(type) {
  document.getElementById('volunteerDonorForm').style.display = 'none';
  document.getElementById('volunteerInstitutionForm').style.display = 'none';
  document.getElementById(type === 'doador' ? 'volunteerDonorForm' : 'volunteerInstitutionForm').style.display = 'block';
}

function submitVolunteerDonation(e) {
  e.preventDefault();
  const address = {
    cep: document.getElementById('volDonorCep').value,
    logradouro: document.getElementById('volDonorLogradouro').value,
    numero: document.getElementById('volDonorNumero').value,
    bairro: document.getElementById('volDonorBairro').value,
    cidade: document.getElementById('volDonorCidade').value
  };
  const volunteerDonation = {
    id: Date.now(),
    name: document.getElementById('volDonorName').value,
    phone: document.getElementById('volDonorPhone').value,
    email: document.getElementById('volDonorEmail').value,
    address,
    fullAddress: `${address.logradouro}, ${address.numero}, ${address.bairro}, ${address.cidade}, ${address.cep}`,
    description: document.getElementById('volDonorDescription').value,
    status: 'pending',
    createdAt: new Date().toISOString()
  };
  state.volunteerDonations.push(volunteerDonation);
  saveToLocalStorage();
  alert('Solicitação de recolhimento enviada com sucesso! A Ecolink entrará em contato em breve.');
  closeModal('volunteerModal');
  document.getElementById('volunteerDonorForm').reset();
}

function submitVolunteerInstitution(e) {
  e.preventDefault();
  const address = {
    cep: document.getElementById('volInstCep').value,
    logradouro: document.getElementById('volInstLogradouro').value,
    numero: document.getElementById('volInstNumero').value,
    bairro: document.getElementById('volInstBairro').value,
    cidade: document.getElementById('volInstCidade').value
  };
  const institution = {
    id: Date.now(),
    name: document.getElementById('volInstName').value,
    cnpj: document.getElementById('volInstCnpj').value,
    email: document.getElementById('volInstEmail').value,
    phone: document.getElementById('volInstPhone').value,
    address,
    fullAddress: `${address.logradouro}, ${address.numero}, ${address.bairro}, ${address.cidade}, ${address.cep}`,
    description: document.getElementById('volInstDescription').value,
    createdAt: new Date().toISOString()
  };
  state.volunteerInstitutions.push(institution);
  saveToLocalStorage();
  alert('Instituição cadastrada com sucesso! Você receberá notificações sobre doações disponíveis.');
  closeModal('volunteerModal');
  document.getElementById('volunteerInstitutionForm').reset();
}

/* Ações de aceite/recusa */
function refuseDonation(donationId) {
  if (confirm('Deseja realmente recusar esta doação?')) {
    // Mantemos apenas UI refresh
    loadRecebedorDashboard();
  }
}

function acceptDonationSelf(donationId) {
  const donation = state.donations.find((d) => d.id === donationId);
  donation.receiverId = state.currentUser.id;
  donation.status = 'accepted';
  donation.needsTransport = false;
  saveToLocalStorage();
  alert('Doação aceita! Você é responsável pelo recolhimento.');
  loadRecebedorDashboard();
}

function acceptDonationEcolink(donationId) {
  const donation = state.donations.find((d) => d.id === donationId);
  donation.receiverId = state.currentUser.id;
  donation.status = 'accepted';
  donation.needsTransport = true;
  saveToLocalStorage();
  alert('Doação aceita! Transportadores foram notificados para realizar o recolhimento.');
  loadRecebedorDashboard();
}

function refuseTransport(donationId) {
  if (confirm('Deseja realmente recusar este transporte?')) {
    loadTransportadorDashboard();
  }
}

function acceptTransport(donationId) {
  const donation = state.donations.find((d) => d.id === donationId);
  donation.transporterId = state.currentUser.id;
  donation.status = 'in_transit';

  const donor = state.users.find((u) => u.id === donation.donorId);
  const receiver = state.users.find((u) => u.id === donation.receiverId);

  saveToLocalStorage();
  alert(`Transporte aceito!\n\nDoador: ${donor.name}\nRecebedor: ${receiver.name}\nTransportador: ${state.currentUser.name}`);
  loadTransportadorDashboard();
}

/* =================== RASTREAMENTO =================== */
function viewTracking(donationId) {
  const donation = state.donations.find((d) => d.id === donationId);
  const donor = state.users.find((u) => u.id === donation.donorId);
  const receiver = donation.receiverId ? state.users.find((u) => u.id === donation.receiverId) : null;
  const transporter = donation.transporterId ? state.users.find((u) => u.id === donation.transporterId) : null;

  const allConfirmed =
    donation.donorReleased &&
    (donation.needsTransport ? donation.transportPickedUp && donation.transportDelivered : true) &&
    donation.receiverConfirmed;

  const trackingDiv = document.getElementById('trackingContent');
  trackingDiv.innerHTML = `
    <div style="margin-bottom:20px;">
      <h3>Doação #${donation.id}</h3>
      <p><strong>Categoria:</strong> ${donation.category}</p>
      <p><strong>Peso:</strong> ${donation.weight} kg</p>
      <p><strong>Status:</strong> <span class="badge badge-${donation.status}">${allConfirmed ? 'Concluído' : donation.status}</span></p>
    </div>

    <div class="timeline">
      <div class="timeline-item ${donation.createdAt ? 'completed' : 'pending'}">
        <h4>Doação Registrada</h4>
        <p>${new Date(donation.createdAt).toLocaleString()}</p>
        <p>Doador: ${donor.name}</p>
      </div>

      <div class="timeline-item ${donation.receiverId ? 'completed' : 'pending'}">
        <h4>Aceita pelo Recebedor</h4>
        ${receiver ? `<p>Recebedor: ${receiver.name}</p>` : '<p>Aguardando aceitação...</p>'}
      </div>

      ${donation.needsTransport ? `
        <div class="timeline-item ${donation.transporterId ? 'completed' : 'pending'}">
          <h4>Transportador Designado</h4>
          ${transporter ? `<p>Transportador: ${transporter.name}</p>` : '<p>Aguardando transportador...</p>'}
        </div>
      ` : ''}

      <div class="timeline-item ${donation.donorReleased ? 'completed' : 'pending'}">
        <h4>Liberado pelo Doador</h4>
        ${donation.donorReleased ? '<p>✓ Confirmado</p>' : '<p>Aguardando liberação...</p>'}
        ${state.currentUser.type === 'doador' && donation.donorId === state.currentUser.id && !donation.donorReleased && donation.receiverId ?
          `<button class="btn btn-primary" onclick="confirmRelease(${donation.id})">Confirmar Liberação</button>` : ''}
      </div>

      ${donation.needsTransport ? `
        <div class="timeline-item ${donation.transportPickedUp ? 'completed' : 'pending'}">
          <h4>Retirado pelo Transportador</h4>
          ${donation.transportPickedUp ? '<p>✓ Confirmado</p>' : '<p>Aguardando retirada...</p>'}
          ${state.currentUser.type === 'transportador' && donation.transporterId === state.currentUser.id && !donation.transportPickedUp && donation.donorReleased ?
            `<button class="btn btn-primary" onclick="confirmPickup(${donation.id})">Confirmar Retirada</button>` : ''}
        </div>

        <div class="timeline-item ${donation.transportDelivered ? 'completed' : 'pending'}">
          <h4>Entregue pelo Transportador</h4>
          ${donation.transportDelivered ? '<p>✓ Confirmado</p>' : '<p>Aguardando entrega...</p>'}
          ${state.currentUser.type === 'transportador' && donation.transporterId === state.currentUser.id && !donation.transportDelivered && donation.transportPickedUp ?
            `<button class="btn btn-primary" onclick="confirmDelivery(${donation.id})">Confirmar Entrega</button>` : ''}
        </div>
      ` : ''}

      <div class="timeline-item ${donation.receiverConfirmed ? 'completed' : 'pending'}">
        <h4>Recebido e Confirmado</h4>
        ${donation.receiverConfirmed ? '<p>✓ Processo Concluído</p>' : '<p>Aguardando confirmação final...</p>'}
        ${state.currentUser.type === 'recebedor' && donation.receiverId === state.currentUser.id && !donation.receiverConfirmed && (donation.transportDelivered || (!donation.needsTransport && donation.donorReleased)) ?
          `<button class="btn btn-primary" onclick="confirmReceipt(${donation.id})">Confirmar Recebimento</button>` : ''}
      </div>
    </div>
  `;
  openModal('trackingModal');
}

function confirmRelease(donationId) {
  const donation = state.donations.find((d) => d.id === donationId);
  donation.donorReleased = true;
  saveToLocalStorage();
  alert('Liberação confirmada!');
  closeModal('trackingModal');
  loadDoadorDashboard();
}

function confirmPickup(donationId) {
  const donation = state.donations.find((d) => d.id === donationId);
  donation.transportPickedUp = true;
  saveToLocalStorage();
  alert('Retirada confirmada!');
  closeModal('trackingModal');
  loadTransportadorDashboard();
}

function confirmDelivery(donationId) {
  const donation = state.donations.find((d) => d.id === donationId);
  donation.transportDelivered = true;
  saveToLocalStorage();
  alert('Entrega confirmada!');
  closeModal('trackingModal');
  loadTransportadorDashboard();
}

function confirmReceipt(donationId) {
  const donation = state.donations.find((d) => d.id === donationId);
  donation.receiverConfirmed = true;
  donation.status = 'completed';
  saveToLocalStorage();
  alert('Recebimento confirmado! Processo concluído com sucesso.');
  closeModal('trackingModal');
  loadRecebedorDashboard();
}

/* =================== MODAL & LOGOUT =================== */
function openModal(modalId){document.getElementById(modalId).classList.add('active')}
function closeModal(modalId){document.getElementById(modalId).classList.remove('active')}
function logout(){
  if (confirm('Deseja realmente sair?')) {
    state.currentUser = null;
    document.getElementById('loginForm').reset();
    showScreen('login');
  }
}
window.onclick=function(e){if(e.target.classList.contains('modal')){e.target.classList.remove('active')}};

/* =================== INIT (DEMO) =================== */
loadFromLocalStorage();

const demoUsers = [
  {
    id: 1,
    name: 'Confecções TextilMax Ltda',
    document: '12.345.678/0001-90',
    email: 'contato@textilmax.com.br',
    phone: '(47) 3333-4444',
    address: { cep: '89030-000', logradouro: 'Rua das Indústrias', numero: '1500', complemento: 'Galpão 3', bairro: 'Itoupava Seca', cidade: 'Blumenau', estado: 'SC' },
    fullAddress: 'Rua das Indústrias, 1500, Galpão 3, Itoupava Seca, Blumenau, SC, 89030-000',
    username: 'doador1',
    password: 'Senha@123',
    type: 'doador',
    tier: 'ouro',
    createdAt: new Date().toISOString()
  },
  {
    id: 2,
    name: 'EcoRecicla Têxtil S.A.',
    document: '98.765.432/0001-10',
    email: 'comercial@ecorecicla.com.br',
    phone: '(47) 3555-6666',
    address: { cep: '89010-100', logradouro: 'Avenida Beira Rio', numero: '800', complemento: '', bairro: 'Centro', cidade: 'Blumenau', estado: 'SC' },
    fullAddress: 'Avenida Beira Rio, 800, Centro, Blumenau, SC, 89010-100',
    username: 'recebedor1',
    password: 'Senha@456',
    type: 'recebedor',
    tier: 'diamantium',
    createdAt: new Date().toISOString()
  },
  {
    id: 3,
    name: 'TransLog Cargas Especiais',
    document: '55.444.333/0001-22',
    email: 'operacoes@translog.com.br',
    phone: '(47) 3777-8888',
    address: { cep: '89035-500', logradouro: 'Rodovia BR-101', numero: 'Km 25', complemento: '', bairro: 'Distrito Industrial', cidade: 'Blumenau', estado: 'SC' },
    fullAddress: 'Rodovia BR-101, Km 25, Distrito Industrial, Blumenau, SC, 89035-500',
    username: 'transportador1',
    password: 'Senha@789',
    type: 'transportador',
    tier: 'simple',
    createdAt: new Date().toISOString()
  }
];

if (state.users.length === 0) {
  state.users = [...demoUsers];
  saveToLocalStorage();
}

console.log('Sistema Ecolink inicializado!');
console.log('Usuários demo: doador1/Senha@123 | recebedor1/Senha@456 | transportador1/Senha@789');

/* ====== STATE, STORAGE e helpers existentes permanecem ====== */
const NotifStore = {
  _key: 'ecolinkNotifs',
  _read()  { return JSON.parse(localStorage.getItem(this._key) || '{}'); },
  _write(v){ localStorage.setItem(this._key, JSON.stringify(v)); },

  allFor(userId) { const db = this._read(); return db[userId] || []; },
  setFor(userId, list){ const db = this._read(); db[userId] = list; this._write(db); },
  addFor(userId, notif){
    const list = this.allFor(userId);
    list.unshift(notif);
    this.setFor(userId, list);
  },
  markRead(userId, id){
    const list = this.allFor(userId).map(n => n.id === id ? { ...n, read: true } : n);
    this.setFor(userId, list);
  },
  clear(userId){
    this.setFor(userId, this.allFor(userId).map(n => ({...n, read:true})));
  }
};

// ---------------------- Sino na UI ----------------------
const bell = { list: [], unread: 0 };

function hydrateBellFromStore(){
  if (!state.currentUser) return;
  bell.list = NotifStore.allFor(state.currentUser.id);
  bell.unread = bell.list.filter(n => !n.read).length;
  renderNotifications();
}

function renderNotifications() {
  const countEl = document.getElementById('notifCount');
  const listEl  = document.getElementById('notifList');
  if (!countEl || !listEl) return;

  // badge
  if (bell.unread > 0) {
    countEl.textContent = bell.unread > 99 ? '99+' : String(bell.unread);
    countEl.hidden = false;
  } else {
    countEl.hidden = true;
  }

  // lista
  listEl.innerHTML = '';
  if (bell.list.length === 0) {
    listEl.innerHTML = '<li><span class="notif-time">Sem notificações</span></li>';
    return;
  }

  bell.list.forEach(n => {
    const li = document.createElement('li');
    li.innerHTML = `
      <div>
        <div class="notif-title">${n.title}</div>
        <div>${n.message}</div>
        <div class="notif-time">${new Date(n.createdAt).toLocaleString()}</div>
      </div>
      <div class="notif-actions">
        ${n.link ? `<button class="btn btn-info" onclick="openFromNotification('${n.link}', ${n.id})">Ver</button>` : ''}
        <button class="btn btn-warning" onclick="markAsRead(${n.id})">Lido</button>
      </div>`;
    listEl.appendChild(li);
  });
}

function markAsRead(id){
  if (!state.currentUser) return;
  NotifStore.markRead(state.currentUser.id, id);
  hydrateBellFromStore();
}

function clearAllNotifications(){
  if (!state.currentUser) return;
  NotifStore.clear(state.currentUser.id);
  hydrateBellFromStore();
}

function toggleNotifications(){
  const dd = document.getElementById('notifDropdown');
  if (dd) dd.hidden = !dd.hidden;
}

function openFromNotification(link, id){
  markAsRead(id);
  toggleNotifications();
  if (link && link.startsWith('tracking:')) {
    const donationId = Number(link.split(':')[1]);
    viewTracking(donationId);
  }
}

function showToast(text){
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = text;
  toast.hidden = false;
  setTimeout(() => toast.hidden = true, 3500);
}

function requestNotificationPermissionOnce(){
  if (window.Notification && Notification.permission === 'default') {
    Notification.requestPermission().catch(()=>{});
  }
}

// ---------------------- Emissão para destinatários ----------------------
function sendNotifTo(userId, {title, message, link=null}){
  if (!userId) return;
  const notif = { id: Date.now() + Math.random(), title, message, link, read:false, createdAt: new Date().toISOString() };
  NotifStore.addFor(userId, notif);

  // feedback imediato se o destinatário é o usuário logado
  if (state.currentUser && state.currentUser.id === userId) {
    hydrateBellFromStore();
    showToast(`${title}: ${message}`);
    if (window.Notification && Notification.permission === 'granted') {
      try { new Notification(title, { body: message }); } catch {}
    }
  }
}

function sendNotifToMany(userIds, payload){
  [...new Set(userIds.filter(Boolean))].forEach(uid => sendNotifTo(uid, payload));
}

// ---------------------- Regras por evento de status ----------------------
function notifyStatusChange(donation, prevStatus, nextStatus){
  const link = `tracking:${donation.id}`;
  const donorId  = donation.donorId;
  const recvId   = donation.receiverId;
  const transId  = donation.transporterId;

  // PENDING → ACCEPTED
  if (prevStatus === 'pending' && nextStatus === 'accepted') {
    sendNotifTo(donorId, { title:'Doação aceita', message:'Um recebedor aceitou sua doação. Acompanhe o fluxo.', link });
    sendNotifTo(recvId,  { title:'Você aceitou a doação', message:'Defina o recolhimento (próprio ou pela Ecolink).', link });
    if (donation.needsTransport) {
      // transportadores serão notificados quando assumirem; aqui nada a fazer além do recebedor.
    }
  }

  // ACCEPTED → IN_TRANSIT (transportador aceitou)
  if (prevStatus !== 'in_transit' && nextStatus === 'in_transit') {
    sendNotifToMany([donorId, recvId], { title:'Transporte em andamento', message:'Um transportador aceitou e está a caminho.', link });
    sendNotifTo(transId, { title:'Transporte aceito', message:'Você está designado para esta entrega.', link });
  }

  // checkpoints do fluxo
  if (!donation._prevFlags) donation._prevFlags = {};
  const f = donation._prevFlags;
  // Donor released
  if (donation.donorReleased && !f.donorReleased) {
    sendNotifToMany([recvId, transId], { title:'Material liberado', message:'Doador liberou a retirada.', link });
    f.donorReleased = true;
  }
  // Pickup
  if (donation.transportPickedUp && !f.transportPickedUp) {
    sendNotifToMany([donorId, recvId], { title:'Coleta realizada', message:'Transportador retirou o material.', link });
    f.transportPickedUp = true;
  }
  // Delivery
  if (donation.transportDelivered && !f.transportDelivered) {
    sendNotifToMany([donorId, recvId], { title:'Entrega realizada', message:'Material entregue ao recebedor. Aguarda confirmação.', link });
    f.transportDelivered = true;
  }

  // → COMPLETED
  if (nextStatus === 'completed' && prevStatus !== 'completed') {
    sendNotifToMany([donorId, transId], { title:'Doação concluída', message:'Recebedor confirmou o recebimento. Obrigado!', link });
    sendNotifTo(recvId, { title:'Recebimento confirmado', message:'Processo finalizado com sucesso.', link });
  }
}

// Helper para mudar status SEM esquecer notificações
function setStatus(donation, newStatus){
  const oldStatus = donation.status;
  donation.status = newStatus;
  notifyStatusChange(donation, oldStatus, newStatus);
}

// ---------------------- Hooks nos pontos de ação ----------------------
// 1) cadastro de doação
const _submitDonation = submitDonation;
submitDonation = function(e){
  _submitDonation(e); // cria a doação (status 'pending')
  const d = state.donations.at(-1);
  if (!d) return;
  // feedback imediato para o doador que está logado
  sendNotifTo(d.donorId, { title:'Doação registrada', message:'Recebedores serão notificados. Acompanhe pelo rastreio.', link:`tracking:${d.id}` });
};

// 2) recebedor aceita (recolhe por conta)
const _acceptDonationSelf = acceptDonationSelf;
acceptDonationSelf = function(donationId){
  _acceptDonationSelf(donationId);
  const d = state.donations.find(x => x.id === donationId);
  if (!d) return;
  setStatus(d, 'accepted');
  saveToLocalStorage();
  hydrateBellFromStore();
};

// 3) recebedor aceita (pela Ecolink → precisa de transporte)
const _acceptDonationEcolink = acceptDonationEcolink;
acceptDonationEcolink = function(donationId){
  _acceptDonationEcolink(donationId);
  const d = state.donations.find(x => x.id === donationId);
  if (!d) return;
  setStatus(d, 'accepted'); // needsTransport já está true no fluxo original
  sendNotifTo(d.receiverId, { title:'Coleta solicitada', message:'Aguardando transportador aceitar.', link:`tracking:${donationId}` });
  saveToLocalStorage();
  hydrateBellFromStore();
};

// 4) transportador aceita → IN_TRANSIT
const _acceptTransport = acceptTransport;
acceptTransport = function(donationId){
  _acceptTransport(donationId);
  const d = state.donations.find(x => x.id === donationId);
  if (!d) return;
  setStatus(d, 'in_transit');
  saveToLocalStorage();
  hydrateBellFromStore();
};

// 5) donor confirma liberação
const _confirmRelease = confirmRelease;
confirmRelease = function(donationId){
  _confirmRelease(donationId);
  const d = state.donations.find(x => x.id === donationId);
  if (!d) return;
  notifyStatusChange(d, d.status, d.status); // checkpoint (não muda status)
  saveToLocalStorage();
  hydrateBellFromStore();
};

// 6) transportador confirma retirada
const _confirmPickup = confirmPickup;
confirmPickup = function(donationId){
  _confirmPickup(donationId);
  const d = state.donations.find(x => x.id === donationId);
  if (!d) return;
  notifyStatusChange(d, d.status, d.status); // checkpoint
  saveToLocalStorage();
  hydrateBellFromStore();
};

// 7) transportador confirma entrega
const _confirmDelivery = confirmDelivery;
confirmDelivery = function(donationId){
  _confirmDelivery(donationId);
  const d = state.donations.find(x => x.id === donationId);
  if (!d) return;
  notifyStatusChange(d, d.status, d.status); // checkpoint
  saveToLocalStorage();
  hydrateBellFromStore();
};

// 8) recebedor confirma recebimento → COMPLETED
const _confirmReceipt = confirmReceipt;
confirmReceipt = function(donationId){
  const d = state.donations.find(x => x.id === donationId);
  _confirmReceipt(donationId); // altera status para 'completed' dentro da função original
  if (!d) return;
  setStatus(d, 'completed');
  saveToLocalStorage();
  hydrateBellFromStore();
};

// ---------------------- Integrações com login/dashboard ----------------------
const _handleLogin = handleLogin;
handleLogin = function(e){
  _handleLogin(e);
  if (state.currentUser) {
    hideAuthTabs();
    requestNotificationPermissionOnce();
    hydrateBellFromStore();
  }
};

const _logout = logout;
logout = function(){
  _logout();
  showAuthTabs();
  bell.list = []; bell.unread = 0;
  renderNotifications();
};

const _loadDashboard = loadDashboard;
loadDashboard = function(){
  _loadDashboard();
  hydrateBellFromStore();
};

// fecha dropdown clicando fora
document.addEventListener('click', (e) => {
  const dd = document.getElementById('notifDropdown');
  const btn = document.getElementById('notifBtn');
  if (!dd || !btn) return;
  if (!dd.hidden && !dd.contains(e.target) && !btn.contains(e.target)) dd.hidden = true;
});