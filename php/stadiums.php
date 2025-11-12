<?php
// stadiums.php - للبحث عن الملاعب في جميع المدن
include 'config.php';

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] == 'POST' && isset($_POST['action'])) {
    
    if ($_POST['action'] == 'search_stadiums') {
        $city = isset($_POST['city']) ? sanitize($_POST['city']) : '';
        $radius = isset($_POST['radius']) ? intval($_POST['radius']) : 50;
        
        if (empty($city)) {
            sendResponse([], false, "يرجى إدخال اسم المدينة");
        }
        
        try {
            // البحث في الملاعب في المدينة المطلوبة
            $sql = "SELECT * FROM stadiums WHERE 
                    (city LIKE ? OR address LIKE ? OR name LIKE ?) AND 
                    is_active = 1";
            
            $stmt = $conn->prepare($sql);
            $searchTerm = "%$city%";
            $stmt->bind_param("sss", $searchTerm, $searchTerm, $searchTerm);
            $stmt->execute();
            $result = $stmt->get_result();
            
            $stadiums = [];
            while($row = $result->fetch_assoc()) {
                $stadiums[] = [
                    'id' => $row['id'],
                    'name' => $row['name'],
                    'address' => $row['address'],
                    'city' => $row['city'],
                    'sport_type' => $row['sport_type'],
                    'price' => $row['price_per_hour'],
                    'latitude' => $row['latitude'],
                    'longitude' => $row['longitude'],
                    'description' => $row['description'],
                    'facilities' => $row['facilities'],
                    'image' => $row['image_url']
                ];
            }
            
            if (count($stadiums) > 0) {
                sendResponse($stadiums, true, "تم العثور على " . count($stadiums) . " ملعب في " . $city);
            } else {
                sendResponse([], false, "لم يتم العثور على ملاعب في " . $city);
            }
            
            $stmt->close();
            
        } catch (Exception $e) {
            sendResponse([], false, "خطأ في البحث: " . $e->getMessage());
        }
    }
    
} else if ($_SERVER['REQUEST_METHOD'] == 'GET' && isset($_GET['action'])) {
    
    if ($_GET['action'] == 'get_all_stadiums') {
        try {
            // جلب جميع الملاعب
            $sql = "SELECT * FROM stadiums WHERE is_active = 1";
            $result = $conn->query($sql);
            
            $stadiums = [];
            while($row = $result->fetch_assoc()) {
                $stadiums[] = [
                    'id' => $row['id'],
                    'name' => $row['name'],
                    'address' => $row['address'],
                    'city' => $row['city'],
                    'sport_type' => $row['sport_type'],
                    'price' => $row['price_per_hour'],
                    'latitude' => $row['latitude'],
                    'longitude' => $row['longitude'],
                    'description' => $row['description']
                ];
            }
            
            sendResponse($stadiums, true, "تم جلب " . count($stadiums) . " ملعب");
            
        } catch (Exception $e) {
            sendResponse([], false, "خطأ في جلب الملاعب");
        }
    }
    
} else {
    sendResponse([], false, "طلب غير صحيح");
}

function sendResponse($data, $success, $message) {
    echo json_encode([
        'success' => $success,
        'message' => $message,
        'data' => $data
    ], JSON_UNESCAPED_UNICODE);
    exit;
}
?>