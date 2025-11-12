// payment.js - إدارة عملية الدفع
let selectedPaymentMethod = '';
let bookingData = {};

// تحميل بيانات الحجز من localStorage
document.addEventListener('DOMContentLoaded', function() {
    loadUserData();
    
    const savedBooking = localStorage.getItem('pendingBooking');
    if (savedBooking) {
        bookingData = JSON.parse(savedBooking);
        displayBookingSummary();
    } else {
        showAlert('لا توجد بيانات حجز، سيتم التوجيه إلى الصفحة الرئيسية', 'error');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 3000);
    }
});

function displayBookingSummary() {
    if (!bookingData.field_name) {
        document.getElementById('bookingDetails').innerHTML = `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-triangle me-2"></i>
                بيانات الحجز غير مكتملة
            </div>
        `;
        return;
    }

    const details = `
        <div class="row">
            <div class="col-md-6">
                <strong>الملعب:</strong><br>
                ${bookingData.field_name}
            </div>
            <div class="col-md-6">
                <strong>التاريخ:</strong><br>
                ${bookingData.reservation_date || 'لم يتم تحديد التاريخ'}
            </div>
        </div>
        <div class="row mt-2">
            <div class="col-md-6">
                <strong>الوقت:</strong><br>
                ${bookingData.start_time || 'لم يتم تحديد الوقت'} - ${bookingData.end_time || 'لم يتم تحديد الوقت'}
            </div>
            <div class="col-md-6">
                <strong>المدة:</strong><br>
                ${bookingData.duration || 1} ساعة
            </div>
        </div>
        <div class="row mt-2">
            <div class="col-12">
                <strong>المبلغ الإجمالي:</strong>
                <span class="text-success fw-bold fs-5">${bookingData.total_price || bookingData.price_per_hour} درهم</span>
            </div>
        </div>
    `;
    document.getElementById('bookingDetails').innerHTML = details;
}

function selectPayment(method) {
    selectedPaymentMethod = method;
    
    // تحديث التصميم
    document.getElementById('onlineCard').classList.remove('selected');
    document.getElementById('cashCard').classList.remove('selected');
    document.getElementById(method + 'Card').classList.add('selected');
    
    // إظهار/إخفاء النماذج
    document.getElementById('onlinePaymentForm').style.display = method === 'online' ? 'block' : 'none';
    document.getElementById('cashPaymentInfo').style.display = method === 'cash' ? 'block' : 'none';
    
    // تفعيل زر التأكيد
    document.getElementById('confirmBtn').disabled = false;
    
    // تحديث نص الزر
    const btn = document.getElementById('confirmBtn');
    if (method === 'online') {
        btn.innerHTML = '<i class="fas fa-lock me-2"></i>تأكيد الحجز والدفع الإلكتروني';
    } else {
        btn.innerHTML = '<i class="fas fa-check me-2"></i>تأكيد الحجز (الدفع نقداً)';
    }
}

function processPayment() {
    if (!selectedPaymentMethod) {
        showAlert('يرجى اختيار طريقة الدفع', 'error');
        return;
    }

    // التحقق من بيانات البطاقة إذا كان الدفع إلكتروني
    if (selectedPaymentMethod === 'online') {
        if (!validateCardDetails()) {
            return;
        }
    }

    const formData = new FormData();
    formData.append('action', 'create_booking');
    formData.append('field_id', bookingData.field_id);
    formData.append('reservation_date', bookingData.reservation_date || getDefaultDate());
    formData.append('start_time', bookingData.start_time || '18:00:00');
    formData.append('end_time', bookingData.end_time || '19:00:00');
    formData.append('duration', bookingData.duration || 1);
    formData.append('payment_method', selectedPaymentMethod);
    formData.append('notes', '');

    // عرض حالة التحميل
    const confirmBtn = document.getElementById('confirmBtn');
    confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>جاري معالجة الحجز...';
    confirmBtn.disabled = true;

    fetch('php/booking_system.php', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            localStorage.removeItem('pendingBooking');
            
            if (selectedPaymentMethod === 'online') {
                // معالجة الدفع الإلكتروني
                processOnlinePayment(data.data.booking_id, data.data.total_price);
            } else {
                // الدفع نقداً - تأكيد فوري
                showConfirmation(data.data);
            }
        } else {
            showAlert('خطأ في الحجز: ' + data.message, 'error');
            resetConfirmButton();
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showAlert('حدث خطأ في معالجة الحجز', 'error');
        resetConfirmButton();
    });
}

function validateCardDetails() {
    const cardNumber = document.getElementById('cardNumber').value.replace(/\s/g, '');
    const cardExpiry = document.getElementById('cardExpiry').value;
    const cardCvv = document.getElementById('cardCvv').value;
    const cardName = document.getElementById('cardName').value.trim();

    if (!cardNumber || !cardExpiry || !cardCvv || !cardName) {
        showAlert('يرجى ملء جميع بيانات البطاقة', 'error');
        return false;
    }

    if (cardNumber.length !== 16 || !/^\d+$/.test(cardNumber)) {
        showAlert('رقم البطاقة يجب أن يكون 16 رقماً', 'error');
        return false;
    }

    if (!/^\d{2}\/\d{2}$/.test(cardExpiry)) {
        showAlert('صيغة تاريخ الانتهاء غير صحيحة (MM/YY)', 'error');
        return false;
    }

    if (cardCvv.length !== 3 || !/^\d+$/.test(cardCvv)) {
        showAlert('رقم CVV يجب أن يكون 3 أرقام', 'error');
        return false;
    }

    return true;
}

function processOnlinePayment(bookingId, amount) {
    // محاكاة عملية الدفع الإلكتروني
    const confirmBtn = document.getElementById('confirmBtn');
    confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>جاري معالجة الدفع...';

    setTimeout(() => {
        // في التطبيق الحقيقي، هنا نتحقق من بوابة الدفع
        const paymentSuccess = Math.random() > 0.1; // 90% success rate for demo

        if (paymentSuccess) {
            showConfirmation({
                booking_id: bookingId,
                field_name: bookingData.field_name,
                reservation_date: bookingData.reservation_date || getDefaultDate(),
                start_time: bookingData.start_time || '18:00:00',
                end_time: bookingData.end_time || '19:00:00',
                total_price: bookingData.total_price || bookingData.price_per_hour,
                payment_method: 'online',
                payment_status: 'paid',
                booking_status: 'confirmed'
            });
        } else {
            showAlert('فشل في عملية الدفع. يرجى المحاولة مرة أخرى أو استخدام طريقة دفع أخرى.', 'error');
            resetConfirmButton();
        }
    }, 3000);
}

function showConfirmation(bookingData) {
    const confirmationHTML = `
        <div class="alert alert-success text-center">
            <i class="fas fa-check-circle fa-3x text-success mb-3"></i>
            <h4>تم تأكيد الحجز بنجاح!</h4>
            <div class="confirmation-details mt-4">
                <div class="row">
                    <div class="col-md-6">
                        <p><strong>رقم الحجز:</strong> #${bookingData.booking_id}</p>
                        <p><strong>الملعب:</strong> ${bookingData.field_name}</p>
                        <p><strong>التاريخ:</strong> ${bookingData.reservation_date}</p>
                    </div>
                    <div class="col-md-6">
                        <p><strong>الوقت:</strong> ${bookingData.start_time} - ${bookingData.end_time}</p>
                        <p><strong>المبلغ:</strong> ${bookingData.total_price} درهم</p>
                        <p><strong>طريقة الدفع:</strong> ${bookingData.payment_method === 'online' ? 'إلكتروني' : 'نقدي'}</p>
                    </div>
                </div>
                <p class="mt-3">
                    <strong>حالة الدفع:</strong> 
                    <span class="badge ${bookingData.payment_status === 'paid' ? 'bg-success' : 'bg-warning'}">
                        ${bookingData.payment_status === 'paid' ? 'مدفوع' : 'في انتظار الدفع'}
                    </span>
                </p>
                
                <div class="mt-4">
                    <button class="btn btn-success me-2" onclick="printConfirmation()">
                        <i class="fas fa-print me-1"></i>طباعة التأكيد
                    </button>
                    <button class="btn btn-outline-success" onclick="goToDashboard()">
                        <i class="fas fa-tachometer-alt me-1"></i>لوحة التحكم
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.querySelector('.card-body').innerHTML = confirmationHTML;
}

function resetConfirmButton() {
    const btn = document.getElementById('confirmBtn');
    if (selectedPaymentMethod === 'online') {
        btn.innerHTML = '<i class="fas fa-lock me-2"></i>تأكيد الحجز والدفع الإلكتروني';
    } else {
        btn.innerHTML = '<i class="fas fa-check me-2"></i>تأكيد الحجز (الدفع نقداً)';
    }
    btn.disabled = false;
}

function formatCardNumber(input) {
    let value = input.value.replace(/\s/g, '').replace(/\D/g, '');
    let formattedValue = '';
    
    for (let i = 0; i < value.length; i++) {
        if (i > 0 && i % 4 === 0) {
            formattedValue += ' ';
        }
        formattedValue += value[i];
    }
    
    input.value = formattedValue.substring(0, 19);
}

function formatExpiry(input) {
    let value = input.value.replace(/\D/g, '');
    if (value.length >= 2) {
        input.value = value.substring(0, 2) + '/' + value.substring(2, 4);
    } else {
        input.value = value;
    }
}

function printConfirmation() {
    window.print();
}

function goToDashboard() {
    window.location.href = 'user_dashboard.html';
}

function goBack() {
    window.history.back();
}

function loadUserData() {
    const userData = localStorage.getItem('currentUser');
    if (userData) {
        const user = JSON.parse(userData);
        document.getElementById('userWelcome').textContent = `مرحباً ${user.name}`;
    }
}

function getDefaultDate() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
}

// دوال مساعدة مشتركة
function showAlert(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.style.cssText = 'position: fixed; top: 20px; left: 20px; right: 20px; z-index: 9999; max-width: 400px; margin: 0 auto;';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    document.body.appendChild(alertDiv);
    setTimeout(() => {
        if (alertDiv.parentElement) {
            alertDiv.remove();
        }
    }, 5000);
}

function formatPrice(price) {
    return new Intl.NumberFormat('ar-MA', {
        minimumFractionDigits: 2
    }).format(price) + ' درهم';
}