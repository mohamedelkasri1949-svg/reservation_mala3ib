<?php
include 'config.php';

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') exit(0);

$user_lat = floatval($_GET['lat'] ?? 0);
$user_lng = floatval($_GET['lng'] ?? 0);
$radius = floatval($_GET['radius'] ?? 50);
$city = $_GET['city'] ?? '';

if ($user_lat == 0 || $user_lng == 0) {
    $user_lat = 35.7595; // طنجة افتراضي
    $user_lng = -5.8340;
}

try {
    if ($city !== '') {
        $sql = "SELECT 
                    m.*, 
                    c.name as category_name,
                    c.icon as category_icon,
                    (6371 * acos(cos(radians(?)) * cos(radians(m.latitude)) * cos(radians(m.longitude) - radians(?)) + sin(radians(?)) * sin(radians(m.latitude)))) AS distance
                FROM mala3ib m
                LEFT JOIN categories c ON m.category_id = c.id
                WHERE m.is_available = TRUE
                AND m.city LIKE ?
                AND m.latitude IS NOT NULL 
                AND m.longitude IS NOT NULL
                ORDER BY distance ASC, m.rating DESC";
        $stmt = $conn->prepare($sql);
        $city_param = "%$city%";
        $stmt->bind_param("ddds", $user_lat, $user_lng, $user_lat, $city_param);
    } else {
        $sql = "SELECT 
                    m.*, 
                    c.name as category_name,
                    c.icon as category_icon,
                    (6371 * acos(cos(radians(?)) * cos(radians(m.latitude)) * cos(radians(m.longitude) - radians(?)) + sin(radians(?)) * sin(radians(m.latitude)))) AS distance
                FROM mala3ib m
                LEFT JOIN categories c ON m.category_id = c.id
                WHERE m.is_available = TRUE
                AND m.latitude IS NOT NULL 
                AND m.longitude IS NOT NULL
                HAVING distance <= ?
                ORDER BY distance ASC, m.rating DESC";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("dddd", $user_lat, $user_lng, $user_lat, $radius);
    }

    $stmt->execute();
    $result = $stmt->get_result();
    $nearby_fields = [];
    while($field = $result->fetch_assoc()) {
        $field['distance'] = round(floatval($field['distance']), 2);
        $field['price_per_hour'] = floatval($field['price_per_hour']);
        $field['rating'] = floatval($field['rating']);
        $nearby_fields[] = $field;
    }
    $stmt->close();

    echo json_encode([
        'success' => true,
        'data' => $nearby_fields,
        'message' => 'تم جلب ' . count($nearby_fields) . ' ملعب'
    ]);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'data' => [], 'message' => "خطأ: " . $e->getMessage()]);
}

$conn->close();
?>
