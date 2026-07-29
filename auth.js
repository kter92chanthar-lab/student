// ============================================
// auth.js — ระบบ Login (เวอร์ชันช่วย Debug บนมือถือ)
// ============================================
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbx10wFqFdxjoF0ytC8OpaeCI4cFx_viL0BGzwrUeP8F_9HOaOWtMC-AuIdb4geNxNS7Ww/exec';
const GOOGLE_CLIENT_ID = '842445966044-uqi522iqaqmfbc2jg4ks9k9gj9dhj3rp.apps.googleusercontent.com';
// ============================================

let currentUser = null;
let currentAccess = null;
let pollingInterval = null;

function logError(msg) {
  const errEl = document.getElementById('debug-error');
  if (errEl) {
    errEl.style.display = 'block';
    errEl.innerHTML += `<div>❌ ${msg}</div>`;
  }
  console.error(msg);
}

function initGoogleLogin(buttonElementId) {
  try {
    google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: handleGoogleLogin,
      auto_select: false,
      itp_support: true
    });
    google.accounts.id.renderButton(
      document.getElementById(buttonElementId),
      { theme: 'outline', size: 'large', text: 'signin_with' }
    );
    console.log('Google button rendered');
  } catch (err) {
    logError('Google Init Error: ' + err.message);
  }
}

function handleGoogleLogin(response) {
  try {
    const payload = JSON.parse(atob(response.credential.split('.')[1]));
    currentUser = { email: payload.email, name: payload.name };
    checkMyAccess();
  } catch (err) {
    logError('Login Process Error: ' + err.message);
  }
}

async function checkMyAccess() {
  const res = await callAPI('login', { email: currentUser.email });
  currentAccess = res;

  if (!res.found) {
    showRequestAccessForm();
  } else if (res.status !== 'ອະນຸມັດ') {
    showPendingApprovalState();
    startPollingApprovalStatus();
  } else {
    stopPollingApprovalStatus();
    onLoginSuccess(res);
  }
}

async function submitAccessRequest(room) {
  const res = await callAPI('requestAccess', {
    email: currentUser.email,
    name: currentUser.name,
    room: room
  });
  
  if (res.error) {
    alert('❌ เกิดข้อผิดพลาด: ' + res.error);
    return;
  }
  showPendingApprovalState();
  startPollingApprovalStatus();
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
    logError('API Connection Error: ' + err.message);
    return { error: 'ເຊື່ອມຕໍ່ບໍ່ໄດ້ ລອງໃໝ່ພายຫຼັງ' };
  }
}

function showRequestAccessForm() {
  document.getElementById('loginStep').style.display = 'none';
  document.getElementById('requestStep').style.display = 'block';
  document.getElementById('pendingStep').style.display = 'none';
}

function showPendingApprovalState() {
  document.getElementById('loginStep').style.display = 'none';
  document.getElementById('requestStep').style.display = 'none';
  document.getElementById('pendingStep').style.display = 'block';
}

function startPollingApprovalStatus() {
  stopPollingApprovalStatus();
  pollingInterval = setInterval(async () => {
    const res = await callAPI('login', { email: currentUser.email });
    if (res.status === 'ອະນຸມັດ') {
      stopPollingApprovalStatus();
      currentAccess = res;
      onLoginSuccess(res);
    }
  }, 3000);
}

function stopPollingApprovalStatus() {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
  }
}

function onLoginSuccess(access) {
  const loginGate = document.getElementById('loginGate');
  const mainApp = document.getElementById('mainApp');
  if (loginGate) loginGate.style.display = 'none';
  if (mainApp) mainApp.style.display = 'block';
  if (typeof window.onLoginSuccessFromAuth === 'function') {
    window.onLoginSuccessFromAuth(access);
  }
}

// เริ่มต้นการทำงาน
(function waitForGoogleAndInit() {
  const btn = document.getElementById('google-login-btn');
  if (!btn) {
    setTimeout(waitForGoogleAndInit, 150);
    return;
  }

  if (window.google && window.google.accounts) {
    initGoogleLogin('google-login-btn');
  } else {
    // ถ้าผ่านไป 5 วินาทีแล้วยังโหลดไม่ได้ ให้แจ้งเตือน
    let count = 0;
    const timer = setInterval(() => {
      count++;
      if (window.google && window.google.accounts) {
        clearInterval(timer);
        initGoogleLogin('google-login-btn');
      } else if (count > 30) { // ประมาณ 5 วินาที
        clearInterval(timer);
        logError('Google Script โหลดไม่สำเร็จ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต');
      }
    }, 150);
  }
})();
