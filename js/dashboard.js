// dashboard.js - إدارة لوحة التحكم
let userBookings = [];
let bookingStats = {};
let userDataObj = null;
let currentCancelBookingId = null;

// تهيئة لوحة التحكم
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 تهيئة لوحة التحكم...');
    initializeDashboard();
});

function initializeDashboard() {
    console.log('🔧 بدء تهيئة لوحة التحكم...');
    
    // تحميل بيانات المستخدم
    loadUserData();
    
    // تهيئة أحداث النماذج
    initializeModals();
}

function initializeModals() {
    const confirmCancelBtn = document.getElementById('confirmCancelBtn');
    if (confirmCancelBtn) {
        confirmCancelBtn.addEventListener('click', confirmCancelBooking);
        console.log('✅ تم تهيئة زر تأكيد الإلغاء');
    }
}

function loadUserData() {
    const userData = localStorage.getItem('currentUser');
    if (!userData) {
        console.log('❌ لا يوجد مستخدم مسجل');
        window.location.href = 'login.html';
        return;
    }
    
    try {
        userDataObj = JSON.parse(userData);
        console.log('✅ بيانات المستخدم:', userDataObj);
        
        updateUserName();
        loadUserStats();
        loadUserBookings();
    } catch (error) {
        console.error('❌ خطأ في تحليل بيانات المستخدم:', error);
        window.location.href = 'login.html';
    }
}

function updateUserName() {
    const userNameDisplay = document.getElementById('userNameDisplay');
    if (userNameDisplay && userDataObj && userDataObj.name) {
        userNameDisplay.textContent = `مرحباً ${userDataObj.name}`;
        console.log('✅ تم تحديث اسم المستخدم:', userDataObj.name);
    }
}

// تحميل إحصائيات المستخدم
async function loadUserStats() {
    try {
        console.log('📊 جاري تحميل الإحصائيات...');
        
        // استخدام FormData بدلاً من JSON للتأكد من التوافق
        const formData = new FormData();
        formData.append('action', 'get_user_stats');

        const response = await fetch('php/booking_system.php', {
            method: 'POST',
            body: formData
        });

        console.log('📡 حالة الاستجابة:', response.status, response.statusText);

        if (!response.ok) {
            throw new Error(`خطأ في الخادم: ${response.status} ${response.statusText}`);
        }

        const text = await response.text();
        console.log('📄 النص الخام من الخادم:', text);

        let data;
        try {
            data = JSON.parse(text);
        } catch (parseError) {
            console.error('❌ خطأ في تحليل JSON:', parseError);
            console.error('📄 النص الكامل:', text);
            throw new Error('استجابة غير صالحة من الخادم - تأكد من أن الملف PHP يعمل بشكل صحيح');
        }

        if (data.success) {
            bookingStats = data.data;
            console.log('✅ الإحصائيات:', bookingStats);
            displayUserStats();
        } else {
            throw new Error(data.message || 'خطأ في البيانات من الخادم');
        }
    } catch (error) {
        console.error('❌ خطأ في تحميل الإحصائيات:', error);
        showAlert('خطأ في تحميل الإحصائيات: ' + error.message, 'error');
        displayEmptyStats();
    }
}

// تحميل حجوزات المستخدم
async function loadUserBookings() {
    try {
        showLoading('upcomingBookings', 'جاري تحميل الحجوزات القادمة...');
        showLoading('historyBookings', 'جاري تحميل الحجوزات السابقة...');
        showLoading('allBookings', 'جاري تحميل جميع الحجوزات...');

        // استخدام FormData بدلاً من JSON
        const formData = new FormData();
        formData.append('action', 'get_user_bookings');

        const response = await fetch('php/booking_system.php', {
            method: 'POST',
            body: formData
        });

        console.log('📡 حالة الاستجابة:', response.status, response.statusText);

        if (!response.ok) {
            throw new Error(`خطأ في الخادم: ${response.status} ${response.statusText}`);
        }

        const text = await response.text();
        console.log('📄 النص الخام من الخادم:', text);

        let data;
        try {
            data = JSON.parse(text);
        } catch (parseError) {
            console.error('❌ خطأ في تحليل JSON:', parseError);
            console.error('📄 النص الكامل:', text);
            throw new Error('استجابة غير صالحة من الخادم');
        }

        if (data.success) {
            userBookings = data.data;
            console.log('✅ الحجوزات المحملة:', userBookings.length);
            displayUserBookings();
        } else {
            throw new Error(data.message || 'خطأ في البيانات من الخادم');
        }
    } catch (error) {
        console.error('❌ خطأ في تحميل الحجوزات:', error);
        showAlert('خطأ في تحميل الحجوزات: ' + error.message, 'error');
        showEmptyBookings();
    }
}

// إلغاء الحجز
async function confirmCancelBooking() {
    if (!currentCancelBookingId) return;

    try {
        const formData = new FormData();
        formData.append('action', 'cancel_booking');
        formData.append('booking_id', currentCancelBookingId);

        const response = await fetch('php/booking_system.php', {
            method: 'POST',
            body: formData
        });

        const text = await response.text();
        const data = JSON.parse(text);

        if (data.success) {
            showAlert('تم إلغاء الحجز بنجاح', 'success');
            
            // إغلاق النموذج
            const modal = bootstrap.Modal.getInstance(document.getElementById('cancelBookingModal'));
            modal.hide();
            
            // إعادة تحميل البيانات
            loadUserStats();
            loadUserBookings();
        } else {
            throw new Error(data.message || 'فشل في إلغاء الحجز');
        }
    } catch (error) {
        console.error('❌ خطأ في إلغاء الحجز:', error);
        showAlert('فشل في إلغاء الحجز: ' + error.message, 'error');
    }
}

// باقي الدوال تبقى كما هي...
function displayEmptyStats() {
    const statsContainer = document.getElementById('statsContainer');
    if (!statsContainer) {
        console.error('❌ عنصر statsContainer غير موجود');
        return;
    }

    statsContainer.innerHTML = `
        <div class="col-md-3 col-6 mb-3">
            <div class="stat-card">
                <div class="stat-number">0</div>
                <div class="stat-label">إجمالي الحجوزات</div>
            </div>
        </div>
        <div class="col-md-3 col-6 mb-3">
            <div class="stat-card">
                <div class="stat-number">0</div>
                <div class="stat-label">حجوزات قادمة</div>
            </div>
        </div>
        <div class="col-md-3 col-6 mb-3">
            <div class="stat-card">
                <div class="stat-number">0</div>
                <div class="stat-label">حجوزات مكتملة</div>
            </div>
        </div>
        <div class="col-md-3 col-6 mb-3">
            <div class="stat-card">
                <div class="stat-number">0 درهم</div>
                <div class="stat-label">إجمالي المصروف</div>
            </div>
        </div>
    `;
}

function displayUserStats() {
    const stats = bookingStats;
    const statsContainer = document.getElementById('statsContainer');
    
    if (!statsContainer) {
        console.error('❌ عنصر statsContainer غير موجود');
        return;
    }

    statsContainer.innerHTML = `
        <div class="col-md-3 col-6 mb-3">
            <div class="stat-card">
                <div class="stat-number">${stats.total_bookings || 0}</div>
                <div class="stat-label">إجمالي الحجوزات</div>
            </div>
        </div>
        <div class="col-md-3 col-6 mb-3">
            <div class="stat-card">
                <div class="stat-number">${stats.upcoming_bookings || 0}</div>
                <div class="stat-label">حجوزات قادمة</div>
            </div>
        </div>
        <div class="col-md-3 col-6 mb-3">
            <div class="stat-card">
                <div class="stat-number">${stats.completed_bookings || 0}</div>
                <div class="stat-label">حجوزات مكتملة</div>
            </div>
        </div>
        <div class="col-md-3 col-6 mb-3">
            <div class="stat-card">
                <div class="stat-number">${formatPrice(stats.total_spent || 0)}</div>
                <div class="stat-label">إجمالي المصروف</div>
            </div>
        </div>
    `;
}

function showEmptyBookings() {
    const emptyMessage = `
        <div class="text-center py-5">
            <i class="fas fa-calendar-times fa-3x text-muted mb-3"></i>
            <h5 class="text-muted">لا توجد حجوزات</h5>
            <p class="text-muted">لم تقم بأي حجوزات بعد</p>
            <button class="btn btn-success btn-sm" onclick="window.location.href='booking_payment.html'">
                <i class="fas fa-plus me-1"></i>احجز الآن
            </button>
        </div>`;
    
    ['upcomingBookings', 'historyBookings', 'allBookings'].forEach(tabId => {
        const container = document.getElementById(tabId);
        if (container) container.innerHTML = emptyMessage;
    });
}

function displayUserBookings() {
    const currentDate = new Date().toISOString().split('T')[0];
    
    const upcomingBookings = userBookings.filter(b => 
        b.reservation_date >= currentDate && b.status !== 'cancelled'
    );

    const historyBookings = userBookings.filter(b => 
        b.reservation_date < currentDate || b.status === 'cancelled'
    );

    displayBookingsInTab('upcomingBookings', upcomingBookings, 'لا توجد حجوزات قادمة');
    displayBookingsInTab('historyBookings', historyBookings, 'لا توجد حجوزات سابقة');
    displayBookingsInTab('allBookings', userBookings, 'لا توجد حجوزات');
}

function displayBookingsInTab(tabId, bookings, emptyMessage) {
    const container = document.getElementById(tabId);
    if (!container) {
        console.error('❌ العنصر غير موجود:', tabId);
        return;
    }

    if (bookings.length === 0) {
        container.innerHTML = `
            <div class="text-center py-5">
                <i class="fas fa-calendar-times fa-3x text-muted mb-3"></i>
                <h5 class="text-muted">${emptyMessage}</h5>
                <p class="text-muted">لم يتم العثور على أي حجوزات في هذا القسم</p>
            </div>`;
        return;
    }

    let html = '';
    bookings.forEach(booking => {
        const statusBadge = getStatusBadge(booking.status);
        const paymentBadge = getPaymentBadge(booking.payment_status);
        const canCancel = canCancelBooking(booking);

        html += `
            <div class="card booking-card mb-3">
                <div class="card-body">
                    <div class="row align-items-center">
                        <div class="col-md-3">
                            <h6 class="text-success mb-1">${booking.field_name}</h6>
                            <small class="text-muted">${booking.city} • ${booking.field_type}</small>
                        </div>
                        <div class="col-md-2">
                            <strong>${formatDate(booking.reservation_date)}</strong>
                        </div>
                        <div class="col-md-2">
                            <span class="text-primary">${booking.start_time} - ${booking.end_time}</span>
                        </div>
                        <div class="col-md-2">
                            <strong>${booking.total_price} درهم</strong>
                        </div>
                        <div class="col-md-3">
                            <div class="d-flex flex-wrap gap-2 mb-2">
                                ${statusBadge}
                                ${paymentBadge}
                            </div>
                            <div class="btn-group btn-group-sm">
                                <button class="btn btn-outline-primary" onclick="viewBookingDetails(${booking.id})">
                                    <i class="fas fa-eye me-1"></i>تفاصيل
                                </button>
                                ${canCancel ? `
                                <button class="btn btn-outline-danger" onclick="openCancelModal(${booking.id})">
                                    <i class="fas fa-times me-1"></i>إلغاء
                                </button>` : ''}
                            </div>
                        </div>
                    </div>
                    ${booking.notes ? `
                    <div class="row mt-2">
                        <div class="col-12">
                            <small class="text-muted"><strong>ملاحظات:</strong> ${booking.notes}</small>
                        </div>
                    </div>` : ''}
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

function getStatusBadge(status) {
    const config = {
        'pending': { class: 'status-pending', text: 'في الانتظار' },
        'confirmed': { class: 'status-confirmed', text: 'مؤكد' },
        'completed': { class: 'status-completed', text: 'مكتمل' },
        'cancelled': { class: 'status-cancelled', text: 'ملغى' }
    };
    const configItem = config[status] || { class: 'status-pending', text: status };
    return `<span class="booking-status ${configItem.class}">${configItem.text}</span>`;
}

function getPaymentBadge(paymentStatus) {
    const config = {
        'pending': { class: 'status-pending', text: 'بانتظار الدفع' },
        'paid': { class: 'status-confirmed', text: 'مدفوع' },
        'failed': { class: 'status-cancelled', text: 'فاشل' }
    };
    const configItem = config[paymentStatus] || { class: 'status-pending', text: paymentStatus };
    return `<span class="booking-status ${configItem.class}">${configItem.text}</span>`;
}

function canCancelBooking(booking) {
    const today = new Date().toISOString().split('T')[0];
    return booking.reservation_date >= today && 
           (booking.status === 'confirmed' || booking.status === 'pending');
}

function viewBookingDetails(bookingId) {
    const booking = userBookings.find(b => b.id === bookingId);
    if (!booking) {
        showAlert('لم يتم العثور على الحجز', 'error');
        return;
    }

    const statusBadge = getStatusBadge(booking.status);
    const paymentBadge = getPaymentBadge(booking.payment_status);

    const modalContent = `
        <div class="row">
            <div class="col-md-6">
                <h6 class="text-success">${booking.field_name}</h6>
                <p class="text-muted mb-2">${booking.city} • ${booking.field_type}</p>
                <p><strong>التاريخ:</strong> ${formatDate(booking.reservation_date)}</p>
                <p><strong>الوقت:</strong> ${booking.start_time} - ${booking.end_time}</p>
                <p><strong>المدة:</strong> ${calculateDuration(booking.start_time, booking.end_time)} ساعة</p>
            </div>
            <div class="col-md-6">
                <p><strong>الحالة:</strong> ${statusBadge}</p>
                <p><strong>حالة الدفع:</strong> ${paymentBadge}</p>
                <p><strong>المبلغ:</strong> ${booking.total_price} درهم</p>
                <p><strong>رقم الحجز:</strong> #${booking.id}</p>
                <p><strong>طريقة الدفع:</strong> ${getPaymentMethodText(booking.payment_method)}</p>
            </div>
        </div>
        ${booking.notes ? `
        <div class="row mt-3">
            <div class="col-12">
                <h6>ملاحظات:</h6>
                <p class="text-muted">${booking.notes}</p>
            </div>
        </div>` : ''}
    `;

    document.getElementById('bookingDetailsContent').innerHTML = modalContent;
    const modal = new bootstrap.Modal(document.getElementById('bookingDetailsModal'));
    modal.show();
}

function openCancelModal(bookingId) {
    const booking = userBookings.find(b => b.id === bookingId);
    if (!booking) {
        showAlert('لم يتم العثور على الحجز', 'error');
        return;
    }

    currentCancelBookingId = bookingId;
    document.getElementById('cancelBookingInfo').innerHTML = `
        <strong>${booking.field_name}</strong><br>
        ${formatDate(booking.reservation_date)} - ${booking.start_time} إلى ${booking.end_time}
    `;

    const modal = new bootstrap.Modal(document.getElementById('cancelBookingModal'));
    modal.show();
}

function showLoading(tabId, message) {
    const container = document.getElementById(tabId);
    if (container) {
        container.innerHTML = `
            <div class="text-center py-4">
                <div class="loading-spinner mb-3"></div>
                <p class="text-muted">${message}</p>
            </div>`;
    }
}

function formatDate(dateString) {
    try {
        const date = new Date(dateString);
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        return date.toLocaleDateString('ar-EG', options);
    } catch (error) {
        return dateString;
    }
}

function formatPrice(amount) {
    return `${parseFloat(amount).toFixed(2)} درهم`;
}

function calculateDuration(startTime, endTime) {
    const start = new Date(`2000-01-01 ${startTime}`);
    const end = new Date(`2000-01-01 ${endTime}`);
    const diff = (end - start) / (1000 * 60 * 60);
    return diff.toFixed(1);
}

function getPaymentMethodText(method) {
    const methods = {
        'cash': 'نقدي عند الوصول',
        'online': 'دفع إلكتروني',
        'card': 'بطاقة ائتمان'
    };
    return methods[method] || method;
}

function showAlert(message, type = 'info') {
    const existingAlerts = document.querySelectorAll('.custom-alert');
    existingAlerts.forEach(alert => alert.remove());

    const alertDiv = document.createElement('div');
    alertDiv.className = `custom-alert alert alert-${type} alert-dismissible fade show`;
    alertDiv.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 9999;
        min-width: 300px;
        max-width: 90%;
        text-align: center;
    `;
    
    const icon = {
        'success': 'fa-check-circle',
        'error': 'fa-exclamation-triangle',
        'warning': 'fa-exclamation-circle',
        'info': 'fa-info-circle'
    }[type];
    
    alertDiv.innerHTML = `
        <i class="fas ${icon} me-2"></i>
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

function logout() {
    if (confirm('هل أنت متأكد من تسجيل الخروج؟')) {
        localStorage.removeItem('currentUser');
        window.location.href = 'login.html';
    }
}

console.log('✅ dashboard.js محمل بنجاح وجاهز للاستخدام');