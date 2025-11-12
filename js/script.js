// script.js - الملف الرئيسي المعدل والمدمج
let currentUser = null;
let currentCategory = null;
let allFields = [];

// التحقق من تسجيل الدخول للصفحات المحمية
function checkAuth() {
    const userData = localStorage.getItem('currentUser');
    if (!userData) {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

// تهيئة التطبيق
document.addEventListener('DOMContentLoaded', function() {
    // الصفحات التي لا تحتاج تحقق (الصفحة الرئيسية، تسجيل الدخول، إنشاء حساب)
    const publicPages = ['index.html', 'login.html', 'register.html', ''];
    const currentPage = window.location.pathname.split('/').pop();
    
    if (!publicPages.includes(currentPage)) {
        if (!checkAuth()) {
            return;
        }
    }
    
    console.log('🚀 تهيئة سبورت لاين...');
    loadUserData();
    
    // تحميل المكونات حسب الصفحة
    if (document.getElementById('categoriesFilter')) {
        loadCategories();
    }
    if (document.getElementById('fieldsContainer')) {
        loadFields();
    }
    
    // إضافة event listener للبحث
    const searchInput = document.getElementById('searchFields');
    if (searchInput) {
        searchInput.addEventListener('input', function(e) {
            searchFields(e.target.value);
        });
    }
});

// تحميل بيانات المستخدم
function loadUserData() {
    const userData = localStorage.getItem('currentUser');
    if (userData) {
        try {
            currentUser = JSON.parse(userData);
            updateUserInterface();
            console.log('✅ تم تحميل بيانات المستخدم:', currentUser.name);
        } catch (e) {
            console.error('❌ خطأ في تحميل بيانات المستخدم:', e);
            localStorage.removeItem('currentUser');
        }
    } else {
        console.log('ℹ️ لا يوجد مستخدم مسجل الدخول');
    }
}

// تحديث واجهة المستخدم
function updateUserInterface() {
    const userSection = document.getElementById('userSection');
    const userWelcome = document.getElementById('userWelcome');
    const ownerWelcome = document.getElementById('ownerWelcome');
    
    if (currentUser) {
        if (userSection) {
            userSection.innerHTML = `
                <span class="navbar-text me-3">
                    <i class="fas fa-user me-1"></i>مرحباً ${currentUser.name}
                </span>
                <button class="btn btn-outline-light btn-sm me-2" onclick="goToDashboard()">
                    <i class="fas fa-tachometer-alt me-1"></i>لوحة التحكم
                </button>
                <button class="btn btn-outline-light btn-sm" onclick="logout()">
                    <i class="fas fa-sign-out-alt me-1"></i>تسجيل الخروج
                </button>
            `;
        }
        
        if (userWelcome) {
            userWelcome.textContent = `مرحباً ${currentUser.name}`;
        }
        if (ownerWelcome) {
            ownerWelcome.textContent = `مرحباً ${currentUser.name}`;
        }
    } else {
        if (userSection) {
            userSection.innerHTML = `
                <a href="login.html" class="btn btn-outline-light btn-sm me-2">
                    <i class="fas fa-sign-in-alt me-1"></i>تسجيل الدخول
                </a>
                <a href="register.html" class="btn btn-light btn-sm">
                    <i class="fas fa-user-plus me-1"></i>إنشاء حساب
                </a>
            `;
        }
    }
}

// تحميل التصنيفات
async function loadCategories() {
    try {
        showLoading('categoriesFilter', 'جاري تحميل التصنيفات...');
        
        const response = await fetch('php/get_categories.php');
        const data = await response.json();
        
        if (data.success) {
            displayCategories(data.data);
            console.log('✅ تم تحميل التصنيفات:', data.data.length);
        } else {
            console.error('❌ خطأ في تحميل التصنيفات:', data.message);
            showAlert('خطأ في تحميل التصنيفات: ' + data.message, 'error');
        }
    } catch (error) {
        console.error('❌ خطأ في تحميل التصنيفات:', error);
        showAlert('حدث خطأ في تحميل التصنيفات', 'error');
    }
}

// عرض التصنيفات
function displayCategories(categories) {
    const categoriesFilter = document.getElementById('categoriesFilter');
    if (!categoriesFilter) return;
    
    let html = `
        <button class="btn btn-outline-success category-btn active-category me-2 mb-2" onclick="filterByCategory(null)">
            🏆 جميع الملاعب
        </button>
    `;
    
    categories.forEach(category => {
        html += `
            <button class="btn btn-outline-success category-btn me-2 mb-2" onclick="filterByCategory(${category.id})">
                ${category.icon} ${category.name}
            </button>
        `;
    });
    
    categoriesFilter.innerHTML = html;
}

// تصفية حسب التصنيف
function filterByCategory(categoryId) {
    currentCategory = categoryId;
    
    // تحديث الأزرار النشطة
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.classList.remove('active-category');
    });
    
    event.target.classList.add('active-category');
    
    // إعادة تحميل الملاعب
    loadFields();
}

// تحميل الملاعب
async function loadFields() {
    try {
        showLoading('fieldsContainer', 'جاري تحميل الملاعب...');
        
        let url = 'php/get_fields.php';
        if (currentCategory) {
            url += `?category_id=${currentCategory}`;
        }
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.success) {
            allFields = data.data;
            displayFields(allFields);
            console.log('✅ تم تحميل الملاعب:', allFields.length);
        } else {
            console.error('❌ خطأ في تحميل الملاعب:', data.message);
            showAlert('خطأ في تحميل الملاعب: ' + data.message, 'error');
        }
    } catch (error) {
        console.error('❌ خطأ في تحميل الملاعب:', error);
        showAlert('حدث خطأ في تحميل الملاعب', 'error');
    }
}

// عرض الملاعب
function displayFields(fields) {
    const container = document.getElementById('fieldsContainer');
    if (!container) return;
    
    if (fields.length === 0) {
        container.innerHTML = `
            <div class="col-12">
                <div class="alert alert-warning text-center">
                    <i class="fas fa-exclamation-triangle fa-2x mb-3"></i>
                    <h4>لا توجد ملاعب</h4>
                    <p>لم يتم العثور على ملاعب تطابق معايير البحث</p>
                </div>
            </div>
        `;
        return;
    }
    
    let html = '';
    
    fields.forEach(field => {
        const ratingStars = getRatingStars(field.rating);
        
        html += `
            <div class="col-md-6 col-lg-4 mb-4">
                <div class="card field-card h-100">
                    <div class="field-image">
                        ${field.category_icon || '🏟️'}
                    </div>
                    <div class="field-info">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <h5 class="card-title">${field.name}</h5>
                            <span class="field-price">${formatPrice(field.price_per_hour)}</span>
                        </div>
                        
                        <p class="text-muted mb-2">
                            <i class="fas fa-map-marker-alt me-1"></i>
                            ${field.address} - ${field.city}
                        </p>
                        
                        <div class="field-rating mb-2">
                            ${ratingStars}
                            <small class="text-muted">(${field.rating})</small>
                        </div>
                        
                        <div class="field-features mb-3">
                            <span class="feature-badge">
                                <i class="fas fa-futbol me-1"></i>${field.category_name}
                            </span>
                            <span class="feature-badge">
                                <i class="fas fa-building me-1"></i>${field.field_type || 'مكشوف'}
                            </span>
                            ${field.capacity ? `
                            <span class="feature-badge">
                                <i class="fas fa-users me-1"></i>${field.capacity} لاعب
                            </span>
                            ` : ''}
                        </div>
                        
                        <div class="d-flex justify-content-between align-items-center">
                            <button class="btn btn-outline-primary btn-sm" onclick="viewFieldDetails(${field.id})">
                                <i class="fas fa-info-circle me-1"></i>تفاصيل
                            </button>
                            <button class="btn btn-success btn-sm" onclick="openBookingModal(${field.id})" ${!currentUser ? 'disabled' : ''}>
                                <i class="fas fa-calendar-plus me-1"></i>حجز
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// البحث في الملاعب
function searchFields(searchTerm) {
    if (!searchTerm) {
        displayFields(allFields);
        return;
    }
    
    const filteredFields = allFields.filter(field => 
        field.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        field.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
        field.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (field.description && field.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    
    displayFields(filteredFields);
}

// عرض تفاصيل الملعب
function viewFieldDetails(fieldId) {
    const field = allFields.find(f => f.id == fieldId);
    if (field) {
        const details = `
            <strong>الاسم:</strong> ${field.name}<br>
            <strong>المدينة:</strong> ${field.city}<br>
            <strong>العنوان:</strong> ${field.address}<br>
            <strong>السعر:</strong> ${formatPrice(field.price_per_hour)}<br>
            <strong>التقييم:</strong> ${getRatingStars(field.rating)} (${field.rating})<br>
            <strong>النوع:</strong> ${field.field_type || 'مكشوف'}<br>
            ${field.capacity ? `<strong>السعة:</strong> ${field.capacity} لاعب<br>` : ''}
            ${field.description ? `<strong>الوصف:</strong> ${field.description}<br>` : ''}
            ${field.phone ? `<strong>الهاتف:</strong> ${field.phone}<br>` : ''}
        `;
        
        showAlert(details, 'info');
    }
}

// فتح modal الحجز
function openBookingModal(fieldId) {
    if (!requireAuth()) return;
    
    const field = allFields.find(f => f.id == fieldId);
    if (field) {
        // حفظ بيانات الحجز المؤقت
        const bookingData = {
            field_id: field.id,
            field_name: field.name,
            price_per_hour: field.price_per_hour,
            reservation_date: '', // سيتم تعبئته لاحقاً
            start_time: '',
            end_time: '',
            duration: 1,
            total_price: field.price_per_hour
        };
        
        localStorage.setItem('pendingBooking', JSON.stringify(bookingData));
        window.location.href = 'payment.html';
    }
}

// دوال التنقل
function goToDashboard() {
    if (!requireAuth()) return;
    
    if (currentUser.role === 'owner') {
        window.location.href = 'owner_dashboard.html';
    } else if (currentUser.role === 'admin') {
        window.location.href = 'admin_dashboard.html';
    } else {
        window.location.href = 'user_dashboard.html';
    }
}

function logout() {
    localStorage.removeItem('currentUser');
    currentUser = null;
    updateUserInterface();
    showAlert('تم تسجيل الخروج بنجاح', 'success');
    setTimeout(() => {
        window.location.reload();
    }, 1000);
}

// دوال مساعدة
function showAlert(message, type = 'info') {
    // إزالة التنبيهات القديمة
    const oldAlerts = document.querySelectorAll('.custom-alert');
    oldAlerts.forEach(alert => alert.remove());
    
    const alertClass = {
        'success': 'alert-success',
        'error': 'alert-danger',
        'warning': 'alert-warning',
        'info': 'alert-info'
    }[type];
    
    const icon = {
        'success': 'fa-check-circle',
        'error': 'fa-exclamation-triangle',
        'warning': 'fa-exclamation-circle',
        'info': 'fa-info-circle'
    }[type];
    
    const alertDiv = document.createElement('div');
    alertDiv.className = `custom-alert alert ${alertClass} alert-dismissible fade show`;
    alertDiv.style.cssText = `
        position: fixed;
        top: 20px;
        left: 20px;
        right: 20px;
        z-index: 9999;
        max-width: 400px;
        margin: 0 auto;
        box-shadow: 0 4px 15px rgba(0,0,0,0.1);
    `;
    
    alertDiv.innerHTML = `
        <i class="fas ${icon} me-2"></i>
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(alertDiv);
    
    // إزالة التنبيه تلقائياً بعد 5 ثواني
    setTimeout(() => {
        if (alertDiv.parentElement) {
            alertDiv.remove();
        }
    }, 5000);
}

function showLoading(containerId, message = 'جاري التحميل...') {
    const container = document.getElementById(containerId);
    if (container) {
        container.innerHTML = `
            <div class="col-12 text-center py-5">
                <div class="loading-spinner mb-3"></div>
                <p class="text-muted">${message}</p>
            </div>
        `;
    }
}

function formatPrice(price) {
    return new Intl.NumberFormat('ar-MA', {
        minimumFractionDigits: 2
    }).format(price) + ' درهم';
}

function getRatingStars(rating) {
    const fullStars = Math.floor(rating);
    const halfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);
    
    let stars = '';
    
    // نجوم كاملة
    for (let i = 0; i < fullStars; i++) {
        stars += '<i class="fas fa-star text-warning"></i>';
    }
    
    // نصف نجمة
    if (halfStar) {
        stars += '<i class="fas fa-star-half-alt text-warning"></i>';
    }
    
    // نجوم فارغة
    for (let i = 0; i < emptyStars; i++) {
        stars += '<i class="far fa-star text-warning"></i>';
    }
    
    return stars;
}

// دالة للتحقق من تسجيل الدخول
function requireAuth() {
    if (!currentUser) {
        showAlert('يجب تسجيل الدخول أولاً', 'error');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1500);
        return false;
    }
    return true;
}

// دالة للوصول إلى الموقع
function getCurrentLocation() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject('المتصفح لا يدعم خدمة الموقع');
            return;
        }
        
        navigator.geolocation.getCurrentPosition(
            (position) => {
                resolve({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                });
            },
            (error) => {
                let errorMessage = 'تعذر الحصول على الموقع';
                switch(error.code) {
                    case error.PERMISSION_DENIED:
                        errorMessage = 'تم رفض الإذن بالوصول إلى الموقع';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMessage = 'معلومات الموقع غير متاحة';
                        break;
                    case error.TIMEOUT:
                        errorMessage = 'انتهت مهلة طلب الموقع';
                        break;
                }
                reject(errorMessage);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 60000
            }
        );
    });
}