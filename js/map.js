let map;
let userMarker;
let fieldsMarkers = [];
let userLocation = null;
let allFields = [];

// تحديث حالة الموقع / الملاعب
function updateLocationStatus(msg, type = "info") {
    const el = document.getElementById("locationStatus");
    if (!el) return;

    const icons = {
        info: "fa-info-circle",
        success: "fa-check-circle",
        error: "fa-times-circle",
        warning: "fa-exclamation-triangle"
    };

    const colors = {
        info: "bg-info",
        success: "bg-success",
        error: "bg-danger",
        warning: "bg-warning"
    };

    el.className = `badge location-badge ${colors[type]}`;
    el.innerHTML = `<i class="fas ${icons[type]} me-1"></i>${msg}`;
}

// تحميل خرائط جوجل
function loadGoogleMaps() {
    const script = document.createElement('script');
    script.src = 'https://maps.googleapis.com/maps/api/js?key=AIzaSyCWTPdjOsI8mTFxEaG-qgp_ohrTB0lsNlE&libraries=places,geometry&callback=initMap';
    script.async = true;
    script.defer = true;
    script.onerror = function() {
        console.error('❌ فشل في تحميل خرائط جوجل');
        document.getElementById('map').innerHTML = '<div class="alert alert-danger text-center">فشل تحميل الخريطة</div>';
    };
    document.head.appendChild(script);
}

// التحقق من تسجيل الدخول وتحميل الخريطة
document.addEventListener('DOMContentLoaded', () => {
    const userData = localStorage.getItem('currentUser');
    if (!userData) { window.location.href = 'index.html'; return; }

    const user = JSON.parse(userData);
    
    // ✅ إصلاح الخطأ: استخدام العنصر الجديد
    const userNameDisplay = document.getElementById("userNameDisplay");
    if (userNameDisplay) {
        userNameDisplay.textContent = `مرحباً ${user.name}`;
    }
    
    loadGoogleMaps();
});

// تهيئة الخريطة
function initMap() {
    map = new google.maps.Map(document.getElementById("map"), {
        center: { lat: 31.7917, lng: -7.0926 },
        zoom: 6,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
        zoomControl: true,
    });

    getCurrentLocation()
        .then(loc => {
            userLocation = loc;
            map.setCenter(loc);
            map.setZoom(13);
            addUserMarker(loc);
            loadNearbyFields();
        })
        .catch(err => {
            console.warn("⚠️ لم يتم تحديد الموقع:", err);
            userLocation = { lat: 35.7595, lng: -5.834 }; // طنجة افتراضي
            map.setCenter(userLocation);
            addUserMarker(userLocation);
            loadNearbyFields();
        });
}

// تحديد موقع المستخدم
function getCurrentLocation() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) return reject("المتصفح لا يدعم GPS");
        navigator.geolocation.getCurrentPosition(
            pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
            err => reject(err),
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    });
}

// إضافة علامة المستخدم
function addUserMarker(location) {
    if (userMarker) userMarker.setMap(null);
    userMarker = new google.maps.Marker({
        position: location,
        map,
        title: "موقعك الحالي",
        icon: { path: google.maps.SymbolPath.CIRCLE, scale: 10, fillColor: "#198754", fillOpacity: 1, strokeColor: "#fff", strokeWeight: 2 },
        animation: google.maps.Animation.DROP,
    });
}

// حساب المسافة بين المستخدم والملعب بالكيلومتر
function calculateDistance(lat1, lng1, lat2, lng2) {
    const p = 0.017453292519943295; // PI/180
    const c = Math.cos;
    const a = 0.5 - c((lat2-lat1)*p)/2 + c(lat1*p)*c(lat2*p)*(1-c((lng2-lng1)*p))/2;
    return Math.round(12742 * Math.asin(Math.sqrt(a)) * 100) / 100; // 2*R*asin...
}

// تحميل الملاعب القريبة أو حسب المدينة
async function loadNearbyFields(searchCity = "") {
    if (!userLocation && !searchCity) return;
    updateLocationStatus("جاري تحميل الملاعب...", "info");

    try {
        let url = `php/get_nearby_fields.php?lat=${userLocation?.lat || 0}&lng=${userLocation?.lng || 0}&radius=${getSearchRadius()}`;
        if(searchCity) url += `&city=${encodeURIComponent(searchCity)}`;

        const res = await fetch(url);
        const data = await res.json();

        if (!data.success) throw new Error(data.message);

        allFields = data.data.map(f => {
            if(userLocation) f.distance = calculateDistance(userLocation.lat, userLocation.lng, parseFloat(f.latitude), parseFloat(f.longitude));
            else f.distance = null;
            return f;
        });

        // إذا بحث حسب المدينة، فلتر الملاعب حسب الاسم أو المدينة أو الرياضة
        if(searchCity){
            const q = searchCity.toLowerCase();
            allFields = allFields.filter(f => 
                (f.name && f.name.toLowerCase().includes(q)) ||
                (f.city && f.city.toLowerCase().includes(q)) ||
                (f.category_name && f.category_name.toLowerCase().includes(q))
            );
        }

        displayFieldsOnMap(allFields);
        displayFieldsList(allFields.slice(0,3)); // أقرب 3 ملاعب فقط للقائمة

        // توسيع الخريطة باش تشمل كل العلامات
        if(fieldsMarkers.length){
            const bounds = new google.maps.LatLngBounds();
            fieldsMarkers.forEach(m => bounds.extend(m.getPosition()));
            if(userLocation && !searchCity) bounds.extend(userLocation);
            map.fitBounds(bounds);
        }

        updateLocationStatus(`تم العثور على ${allFields.length} ملعب`, "success");
    } catch(err) {
        console.error("❌ خطأ في تحميل الملاعب:", err);
        updateLocationStatus("حدث خطأ أثناء تحميل الملاعب", "error");
    }
}

// عرض الملاعب على الخريطة
function displayFieldsOnMap(fields) {
    fieldsMarkers.forEach(m => m.setMap(null));
    fieldsMarkers = [];

    fields.forEach(f => {
        if(!f.latitude || !f.longitude) return;

        const marker = new google.maps.Marker({
            position: { lat: parseFloat(f.latitude), lng: parseFloat(f.longitude) },
            map,
            title: f.name,
            label: { text: f.category_icon || "⚽", color:"white", fontSize:"14px", fontWeight:"bold" },
            icon: { path: google.maps.SymbolPath.CIRCLE, scale: 20, fillColor: "#198754", fillOpacity: 1, strokeColor: "#fff", strokeWeight: 2 }
        });

        const infoContent = `
            <div style="padding:10px;max-width:250px;">
                <h6 class="text-success mb-1">${f.name}</h6>
                <p class="text-muted small mb-1"><i class="fas fa-map-marker-alt"></i> ${f.address || ""} - ${f.city || ""}</p>
                <p class="small mb-1"><strong>الرياضة:</strong> ${f.category_name || ""} ${f.category_icon || ""}</p>
                <p class="small mb-1"><strong>السعر:</strong> ${f.price_per_hour} درهم/ساعة</p>
                <p class="small mb-1"><strong>المسافة:</strong> ${f.distance !== null ? f.distance+" كم" : "غير محددة"}</p>
                <div class="d-grid mt-2">
                    <button class="btn btn-success btn-sm" onclick="bookField(${f.id})">حجز</button>
                </div>
            </div>
        `;
        const infoWindow = new google.maps.InfoWindow({ content: infoContent });
        marker.addListener("click", () => infoWindow.open(map, marker));

        fieldsMarkers.push(marker);
    });
}

// عرض القائمة أسفل الخريطة (أقرب 3 ملاعب)
function displayFieldsList(fields) {
    const listContainer = document.getElementById("mapFieldsList");
    const countElement = document.getElementById("fieldsCount");
    if(!listContainer) return;
    if(countElement) countElement.textContent = `${fields.length} ملعب`;

    if(!fields.length){
        listContainer.innerHTML = `<div class="col-12 text-center py-5">🚫 لا توجد ملاعب ضمن النطاق</div>`;
        return;
    }

    listContainer.innerHTML = fields.map(f => `
        <div class="col-md-6 col-lg-4 mb-4">
            <div class="card field-card h-100">
                <div class="card-body">
                    <h6 class="text-success">${f.name}</h6>
                    <p class="text-muted small mb-2">${f.address || ""} - ${f.city || ""}</p>
                    <p class="small mb-1"><strong>الرياضة:</strong> ${f.category_name || ""} ${f.category_icon || ""}</p>
                    <p class="small mb-2"><strong>السعر:</strong> ${f.price_per_hour} درهم/ساعة</p>
                    <p class="small mb-2"><strong>المسافة:</strong> ${f.distance !== null ? f.distance+" كم" : "غير محددة"}</p>
                    <button class="btn btn-success btn-sm w-100" onclick="bookField(${f.id})"><i class="fas fa-calendar-plus me-1"></i>حجز الآن</button>
                </div>
            </div>
        </div>
    `).join("");
}

// نطاق البحث
function getSearchRadius() {
    const r = document.getElementById("radiusRange");
    const v = document.getElementById("radiusValue");
    if(r && v) v.textContent = `${r.value} كم`;
    return r ? parseInt(r.value) : 10;
}

// تحديث الموقع / البحث / حجز
function searchOnMap() { 
    const q = document.getElementById("mapSearch").value.trim(); 
    loadNearbyFields(q); 
}
function refreshLocation() { 
    getCurrentLocation().then(loc => { 
        userLocation = loc; 
        addUserMarker(loc); 
        loadNearbyFields(); 
    }); 
}
function centerOnUser(){ if(userLocation){ map.setCenter(userLocation); map.setZoom(14); } }
function showAllFields(){ 
    if(!fieldsMarkers.length) return;
    const bounds = new google.maps.LatLngBounds();
    fieldsMarkers.forEach(m=>bounds.extend(m.getPosition()));
    if(userLocation) bounds.extend(userLocation);
    map.fitBounds(bounds);
}
function bookField(id) { window.location.href=`booking_payment.htm?field_id=${id}`; }
function logout() { localStorage.removeItem('currentUser'); window.location.href='index.html'; }