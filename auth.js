// ============================================
// auth.js — ຄ່າຕັ້ງໄວ້ຄົບແລ້ວ ບໍ່ຕ້ອງແກ້ຫຍັງອີກ
// ============================================
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbx10wFqFdxjoF0ytC8OpaeCI4cFx_viL0BGzwrUeP8F_9HOaOWtMC-AuIdb4geNxNS7Ww/exec';
const GOOGLE_CLIENT_ID = '842445966044-uqi522iqaqmfbc2jg4ks9k9gj9dhj3rp.apps.googleusercontent.com';
// ============================================

let currentUser = null;
let currentAccess = null;

function initGoogleLogin(buttonElementId) {
  google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: handleGoogleLogin
  });
  google.accounts.id.renderButton(
    document.getElementById(buttonElementId),
    { theme: 'outline', size: 'large', text: 'signin_with' }
  );
}

function handleGoogleLogin(response) {
  const payload = JSON.parse(atob(response.credential.split('.')[1]));
  currentUser = { email: payload.email, name: payload.name };
  checkMyAccess();
}

async function checkMyAccess() {
  const res = await callAPI('login', { email: currentUser.email });
  currentAccess = res;

  if (!res.found) {
    showRequestAccessForm();
  } else if (res.status !== 'ອະນຸມັດ') {
    alert('ບັນຊີຂອງທ່ານກຳລັງລໍຖ້າ Admin ອະນຸມັດ');
  } else {
    onLoginSuccess(res);
  }
}

async function submitAccessRequest(room) {
  const res = await callAPI('requestAccess', {
    email: currentUser.email,
    name: currentUser.name,
    room: room
  });
  alert(res.status);
}

async function fetchMonths(room) {
  return await callAPI('getMonths', { email: currentUser.email, room: room });
}

async function fetchScores(room, sheet) {
  return await callAPI('getScores', { email: currentUser.email, room: room, sheet: sheet });
}

async function callAPI(action, data) {
  try {
    const res = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action, ...data })
    });
    return await res.json();
  } catch (err) {
    console.error('API error:', err);
    return { error: 'ເຊື່ອມຕໍ່ບໍ່ໄດ້ ລອງໃໝ່ພາຍຫຼັງ' };
  }
}

// 🔴 ຂຽນຕໍ່ໃນໜ້າ dashboard: login ສຳເລັດແລ້ວ ໄປໜ້າໃດ
function onLoginSuccess(access) {
  console.log('Login success:', access);
  // if (access.role === 'Admin') window.location.href = 'admin.html';
  // else if (access.role === 'Teacher') window.location.href = 'teacher.html';
  // else window.location.href = 'viewer.html';
}

// 🔴 ຂຽນຕໍ່: ສະແດງຟອມຂໍສິດ (ຊ່ອງພິມຫ້ອງ + ປຸ່ມສົ່ງ → submitAccessRequest(room))
function showRequestAccessForm() {
  console.log('ຕ້ອງສະແດງຟອມຂໍສິດ ໃນໜ້າ login.html');
}
