// ============================================
// auth.js — ระบบ Login และการขอสิทธิ์จาก Admin
// ============================================
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbx10wFqFdxjoF0ytC8OpaeCI4cFx_viL0BGzwrUeP8F_9HOaOWtMC-AuIdb4geNxNS7Ww/exec';
const GOOGLE_CLIENT_ID = '842445966044-uqi522iqaqmfbc2jg4ks9k9gj9dhj3rp.apps.googleusercontent.com';
// ============================================

let currentUser = null;
let currentAccess = null;
let pollingInterval = null; // ตัวแปรเก็บ interval สำหรับการตรวจสอบสถานะ

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
    // ผู้ใช้ยังไม่เคยลงทะบียน — แสดงฟอร์มขอสิทธิ์
    showRequestAccessForm();
  } else if (res.status !== 'ອະນຸມັດ') {
    // ผู้ใช้ลงทะบียนแล้ว แต่ยังรอการอนุมัติ
    showPendingApprovalState();
    // เริ่ม polling เพื่อตรวจสอบสถานะการอนุมัติทุก 3 วินาที
    startPollingApprovalStatus();
  } else {
    // ผู้ใช้ได้รับการอนุมัติแล้ว — เข้าสู่ระบบสำเร็จ
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
  
  // ส่งคำขอสำเร็จ — แสดงสถานะรอการอนุมัติ
  showPendingApprovalState();
  
  // เริ่ม polling เพื่อตรวจสอบสถานะการอนุมัติ
  startPollingApprovalStatus();
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

// ============================================
// ฟังก์ชันสำหรับแสดง UI ต่างๆ
// ============================================

/**
 * แสดงฟอร์มขอสิทธิ์เข้าระบบ
 */
function showRequestAccessForm() {
  const loginStep = document.getElementById('loginStep');
  const requestStep = document.getElementById('requestStep');
  const pendingStep = document.getElementById('pendingStep');
  
  if (loginStep) loginStep.style.display = 'none';
  if (requestStep) requestStep.style.display = 'block';
  if (pendingStep) pendingStep.style.display = 'none';
}

/**
 * แสดงสถานะรอการอนุมัติจาก Admin
 */
function showPendingApprovalState() {
  const loginStep = document.getElementById('loginStep');
  const requestStep = document.getElementById('requestStep');
  const pendingStep = document.getElementById('pendingStep');
  
  if (loginStep) loginStep.style.display = 'none';
  if (requestStep) requestStep.style.display = 'none';
  if (pendingStep) pendingStep.style.display = 'block';
}

/**
 * เริ่ม polling เพื่อตรวจสอบสถานะการอนุมัติทุก 3 วินาที
 */
function startPollingApprovalStatus() {
  // หยุด polling เดิมก่อน (ถ้ามี)
  stopPollingApprovalStatus();
  
  // เริ่ม polling ใหม่
  pollingInterval = setInterval(async () => {
    const res = await callAPI('login', { email: currentUser.email });
    
    if (res.status === 'ອະນຸມັດ') {
      // ได้รับการอนุมัติแล้ว — หยุด polling และเข้าสู่ระบบ
      stopPollingApprovalStatus();
      currentAccess = res;
      onLoginSuccess(res);
    }
  }, 3000); // ตรวจสอบทุก 3 วินาที
}

/**
 * หยุด polling
 */
function stopPollingApprovalStatus() {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
  }
}

/**
 * เรียกเมื่อ Login สำเร็จและได้รับการอนุมัติแล้ว
 * ฟังก์ชันนี้จะถูกเรียกจากไฟล์ index.html
 */
function onLoginSuccess(access) {
  console.log('✅ Login success:', access);
  // ซ่อนหน้า login gate และแสดงหน้า main app
  const loginGate = document.getElementById('loginGate');
  const mainApp = document.getElementById('mainApp');
  
  if (loginGate) loginGate.style.display = 'none';
  if (mainApp) mainApp.style.display = 'block';
  
  // เรียกฟังก์ชัน onLoginSuccess จากไฟล์ index.html เพื่อตั้งค่า UI
  if (typeof window.onLoginSuccessFromAuth === 'function') {
    window.onLoginSuccessFromAuth(access);
  }
}

// ============================================
// โหลด Google Sign-In ทันทีที่พร้อม (บ่อลรอไฟล์หนัก)
// ============================================
(function waitForGoogleAndInit() {
  const btn = document.getElementById('google-login-btn');
  if (window.google && window.google.accounts && window.google.accounts.id && btn) {
    initGoogleLogin('google-login-btn');
  } else {
    setTimeout(waitForGoogleAndInit, 150);
  }
})();
