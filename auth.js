// ============================================
// auth.js
// ระบบ Login Google + ตรวจสอบสิทธิ์
// ============================================

const APPS_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbx10wFqFdxjoF0ytC8OpaeCI4cFx_viL0BGzwrUeP8F_9HOaOWtMC-AuIdb4geNxNS7Ww/exec';

const GOOGLE_CLIENT_ID =
  '842445966044-uqi522iqaqmfbc2jg4ks9k9gj9dhj3rp.apps.googleusercontent.com';

let currentUser = null;
let currentAccess = null;


// ============================================
// เริ่มต้น Google Login
// ============================================

function initGoogleLogin(buttonElementId) {

  const btn = document.getElementById(buttonElementId);

  if (!btn) {
    console.error('ไม่พบปุ่ม Google Login:', buttonElementId);
    return;
  }

  if (
    !window.google ||
    !window.google.accounts ||
    !window.google.accounts.id
  ) {
    console.error('Google Identity Services ยังไม่พร้อม');
    return;
  }

  google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: handleGoogleLogin
  });

  btn.innerHTML = '';

  google.accounts.id.renderButton(
    btn,
    {
      theme: 'outline',
      size: 'large',
      text: 'signin_with',
      shape: 'rectangular',
      width: 250
    }
  );

  console.log('Google Login พร้อมใช้งานแล้ว');
}


// ============================================
// เมื่อ Google Login สำเร็จ
// ============================================

function handleGoogleLogin(response) {

  try {

    const payload =
      JSON.parse(
        atob(
          response.credential
            .split('.')[1]
            .replace(/-/g, '+')
            .replace(/_/g, '/')
        )
      );

    currentUser = {
      email: payload.email,
      name: payload.name || ''
    };

    console.log('Google Login สำเร็จ:', currentUser.email);

    checkMyAccess();

  } catch (err) {

    console.error('อ่านข้อมูล Google Login ไม่สำเร็จ:', err);

    alert('ไม่สามารถอ่านข้อมูล Google Login ได้ กรุณาลองใหม่');

  }
}


// ============================================
// ตรวจสอบสิทธิ์ผู้ใช้กับ Google Apps Script
// ============================================

async function checkMyAccess() {

  if (!currentUser || !currentUser.email) {
    console.error('ไม่มีข้อมูล Email ของผู้ใช้');
    return;
  }

  try {

    const res = await callAPI('login', {
      email: currentUser.email
    });

    console.log('ผลตรวจสอบสิทธิ์:', res);

    currentAccess = res;

    if (!res || res.error) {

      alert(
        res && res.error
          ? res.error
          : 'ไม่สามารถตรวจสอบสิทธิ์ได้'
      );

      return;
    }


    // ========================================
    // ยังไม่เคยลงทะเบียน
    // ========================================

    if (!res.found) {

      showRequestAccessForm();

      return;
    }


    // ========================================
    // ลงทะเบียนแล้ว แต่ยังไม่ได้รับอนุมัติ
    // ========================================

    if (res.status !== 'ອະນຸມັດ') {

      alert(
        'ບັນຊີຂອງທ່ານກຳລັງລໍຖ້າ Admin ອະນຸມັດ'
      );

      return;
    }


    // ========================================
    // อนุมัติแล้ว
    //
    // ตรงนี้จะเรียก onLoginSuccess()
    // จาก index.html
    // ========================================

    if (typeof onLoginSuccess === 'function') {

      onLoginSuccess(res);

    } else {

      console.error(
        'ไม่พบ onLoginSuccess() ใน index.html'
      );

    }

  } catch (err) {

    console.error('ตรวจสอบสิทธิ์ไม่สำเร็จ:', err);

    alert(
      'ไม่สามารถเชื่อมต่อระบบตรวจสอบสิทธิ์ได้'
    );

  }
}


// ============================================
// แสดงแบบฟอร์มขอสิทธิ์
// ============================================

function showRequestAccessForm() {

  console.log(
    'บัญชียังไม่เคยลงทะเบียน กำลังแสดงแบบฟอร์มขอสิทธิ์'
  );

  const requestStep =
    document.getElementById('requestStep');

  if (requestStep) {

    requestStep.style.display = 'block';

  } else {

    console.error(
      'ไม่พบ requestStep ใน index.html'
    );

  }
}


// ============================================
// ส่งคำขอสิทธิ์เข้าใช้งาน
// ============================================

async function submitAccessRequest(room) {

  if (!currentUser || !currentUser.email) {

    alert('กรุณา Login ด้วย Google ก่อน');

    return;
  }

  if (!room || !room.trim()) {

    alert('กรุณากรอกห้องเรียน');

    return;
  }

  try {

    const res = await callAPI('requestAccess', {

      email: currentUser.email,

      name: currentUser.name,

      room: room.trim()

    });

    console.log('ผลการส่งคำขอ:', res);

    if (res && res.status) {

      alert(res.status);

    } else if (res && res.error) {

      alert(res.error);

    } else {

      alert('ส่งคำขอเรียบร้อยแล้ว');

    }

  } catch (err) {

    console.error(
      'ส่งคำขอสิทธิ์ไม่สำเร็จ:',
      err
    );

    alert(
      'ไม่สามารถส่งคำขอได้ กรุณาลองใหม่'
    );

  }
}


// ============================================
// โหลดรายชื่อเดือน
// ============================================

async function fetchMonths(room) {

  return await callAPI('getMonths', {

    email: currentUser.email,

    room: room

  });

}


// ============================================
// โหลดคะแนน
// ============================================

async function fetchScores(room, sheet) {

  return await callAPI('getScores', {

    email: currentUser.email,

    room: room,

    sheet: sheet

  });

}


// ============================================
// เรียก Google Apps Script API
// ============================================

async function callAPI(action, data) {

  try {

    const response = await fetch(

      APPS_SCRIPT_URL,

      {

        method: 'POST',

        headers: {

          'Content-Type': 'text/plain;charset=utf-8'

        },

        body: JSON.stringify({

          action: action,

          ...data

        })

      }

    );


    if (!response.ok) {

      throw new Error(
        'HTTP Error ' + response.status
      );

    }


    const result =
      await response.json();

    return result;


  } catch (err) {

    console.error(
      'API Error:',
      err
    );

    return {

      error:
        'ເຊື່ອມຕໍ່ API ບໍ່ໄດ້ ລອງໃໝ່ພາຍຫຼັງ'

    };

  }

}


// ============================================
// รอ Google Identity Services
// ============================================

(function waitForGoogleAndInit() {

  let attempts = 0;

  const maxAttempts = 100;


  function tryInit() {

    const btn =
      document.getElementById(
        'google-login-btn'
      );


    // ถ้าไม่มี element ให้รอ
    if (!btn) {

      attempts++;

      if (attempts < maxAttempts) {

        setTimeout(
          tryInit,
          200
        );

      } else {

        console.error(
          'ไม่พบ google-login-btn ใน index.html'
        );

      }

      return;
    }


    // Google พร้อมแล้ว
    if (

      window.google &&

      window.google.accounts &&

      window.google.accounts.id

    ) {

      console.log(
        'Google Identity Services โหลดสำเร็จ'
      );

      initGoogleLogin(
        'google-login-btn'
      );

      return;

    }


    // Google ยังไม่พร้อม ให้รอต่อ
    attempts++;

    if (attempts < maxAttempts) {

      setTimeout(
        tryInit,
        200
      );

    } else {

      console.error(
        'Google Identity Services โหลดไม่สำเร็จ'
      );

      btn.innerHTML =
        '<div style="color:#b00020;padding:10px;">' +
        'ไม่สามารถโหลด Google Login ได้ กรุณารีเฟรชหน้าเว็บ' +
        '</div>';

    }

  }


  tryInit();

})();
