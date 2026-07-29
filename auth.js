// ============================================
// auth.js — คืนค่าระบบเชื่อมต่อและจัดการสิทธิ์
// ============================================
const APPS_SCRIPT_URL = 'https://google.com';
const GOOGLE_CLIENT_ID = '://googleusercontent.com';
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
    // แสดงข้อความและอัปเดตหน้าจอให้ผู้ใช้ทราบว่ากำลังรออนุมัติ
    alert('ບັນຊີຂອງທ່ານກຳລັງລໍຖ້າ Admin ອະນຸມັດ');
    showPendingStatus();
  } else {
    onLoginSuccess(res);
  }
}

async function submitAccessRequest(room) {
  if (!room) {
    alert('ກະລຸນາປ້ອນຫ້ອງຮຽນກ່ອນ');
    return;
  }
  const res = await callAPI('requestAccess', {
    email: currentUser.email,
    name: currentUser.name,
    room: room
  });
  alert(res.status || 'ສົ່ງຄຳຂໍສຳເລັດແລ້ວ');
  showPendingStatus();
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

// 🟢 แก้ไข: จัดการเปลี่ยนหน้าเมื่อเข้าสู่ระบบสำเร็จตามสิทธิ์ (Role)
function onLoginSuccess(access) {
  console.log('Login success:', access);
  // เปิดใช้งานการ Redirect ไปยังหน้าที่ถูกต้อง
  if (access.role === 'Admin') window.location.href = 'admin.html';
  else if (access.role === 'Teacher') window.location.href = 'teacher.html';
  else window.location.href = 'viewer.html'; 
}

// 🟢 แก้ไข: แสดงฟอร์มให้กรอกห้องเรียนเพื่อขอสิทธิ์เข้าใช้งาน
function showRequestAccessForm() {
  const authContainer = document.getElementById('auth-container');
  if (authContainer) {
    authContainer.innerHTML = `
      <div style="margin-top: 20px; padding: 15px; border: 1px solid #ccc; border-radius: 5px;">
        <h3>ຍັງບໍ່ເຄີຍລົງທະບຽນ — ຂໍສິດເຂົ້າລະບົບ</h3>
        <p>ຊື່: ${currentUser.name}</p>
        <p>ອີເມລ: ${currentUser.email}</p>
        <div style="margin-bottom: 10px;">
          <label>ລະບຸຫ້ອງຮຽนຂອງທ່ານ:</label>
          <input type="text" id="request-room" placeholder="ຕົວຢ່າງ: ມ7" style="width: 100%; padding: 8px; margin-top: 5px;">
        </div>
        <button onclick="submitAccessRequest(document.getElementById('request-room').value)" style="padding: 10px 20px; background-color: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">
          ສົ່ງຄຳຂໍ
        </button>
      </div>
    `;
  }
}

// 🟢 เพิ่มเติม: แสดงสถานะหน้าจอกรณีรอแอดมินอนุมัติสิทธิ์
function showPendingStatus() {
  const authContainer = document.getElementById('auth-container');
  if (authContainer) {
    authContainer.innerHTML = `
      <div style="margin-top: 20px; padding: 15px; background-color: #fff3cd; color: #856404; border: 1px solid #ffeeba; border-radius: 5px; text-align: center;">
        <h2>⏳ ບັນຊີຂອງທ່ານກຳລັງລໍຖ້າ Admin ອະນຸມັດ</h2>
        <p>ເມື່ອ Admin ອະນຸມັດແລ້ວ ທ່ານຈະສາມາດເຂົ້າใช้งานລະບົບໄດ້ທັນທີ</p>
      </div>
    `;
  }
}

// ============================================
// โหลด Google Sign-In ทันทีเมื่อพร้อม
// ============================================
(function waitForGoogleAndInit() {
  const btn = document.getElementById('google-login-btn');
  if (window.google && window.google.accounts && window.google.accounts.id && btn) {
    initGoogleLogin('google-login-btn');
  } else {
    setTimeout(waitForGoogleAndInit, 150);
  }
})();
