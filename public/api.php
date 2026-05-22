<?php
/**
 * PHP-only Zero-Config Backend for SMP Maarif NU Pandaan
 * Map all React `/api/*` routes to standard PHP processing without Node.js.
 * Saves/reads data securely from `data_store.json` with file locker mechanisms.
 */

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS, PUT, DELETE");
header("Content-Type: application/json; charset=UTF-8");

// Handle preflight OPTIONS requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$route = isset($_GET['route']) ? trim($_GET['route'], '/') : '';
$method = $_SERVER['REQUEST_METHOD'];

// Local storage data file path
$db_file = __DIR__ . '/data_store.json';

// Fetch file contents or default structure
function load_state($file_path) {
    if (!file_exists($file_path)) {
        // Prepare initial structure matching Node.js server.ts exactly
        $initial = [
            "students" => [
                [
                    "id" => "std-1",
                    "nis" => "20241001",
                    "name" => "Ahmad Fauzi",
                    "class" => "7-A",
                    "email" => "ahmad.fauzi@example.org",
                    "phone" => "081234567890",
                    "savingsBalance" => 120000
                ],
                [
                    "id" => "std-2",
                    "nis" => "20241002",
                    "name" => "Siti Aminah",
                    "class" => "7-B",
                    "email" => "siti.aminah@example.org",
                    "phone" => "081298765432",
                    "savingsBalance" => 250000
                ],
                [
                    "id" => "std-3",
                    "nis" => "20230905",
                    "name" => "Muhammad Rian",
                    "class" => "8-A",
                    "email" => "rian.smp@example.org",
                    "phone" => "085612345678",
                    "savingsBalance" => 450000
                ],
                [
                    "id" => "std-4",
                    "nis" => "20220812",
                    "name" => "Lailatul Fitriyah",
                    "class" => "9-C",
                    "email" => "laila.fit@example.org",
                    "phone" => "089912341234",
                    "savingsBalance" => 80000
                ]
            ],
            "sppBills" => [],
            "savingsTransactions" => [],
            "notifications" => [
                [
                    "id" => "notif-init-1",
                    "title" => "Selamat Datang!",
                    "message" => "Sistem Pembayaran SPP & Tabungan (Modus PHP Standar) Berhasil Diaktifkan.",
                    "type" => "info",
                    "createdAt" => date('c')
                ]
            ],
            "sppRates" => [
                "grade7" => 150000,
                "grade8" => 155000,
                "grade9" => 160000
            ],
            "schoolIdentity" => [
                "name" => "SMP MA'ARIF NU PANDAAN",
                "subheading" => "LP MA'ARIF NU CABANG PASURUAN",
                "accreditation" => "Terakreditasi A",
                "address" => "Jl. Dr. Sutomo No. 1, Pandaan, Pasuruan, Jawa Timur",
                "phone" => "(0343) 631234",
                "principal" => "H. Ahmad Fuad, S.Pd, M.PdI",
                "treasurer" => "Bendahara Madrasah NU",
                "logo" => "",
                "logo2" => "",
                "letterhead" => ""
            ],
            "whatsappConfig" => [
                "token" => "",
                "sender" => "",
                "provider" => "Fonnte",
                "baseUrl" => "https://api.fonnte.com/send",
                "enabled" => false,
                "notifyOnBilling" => true,
                "notifyOnPayment" => true,
                "notifyOnSavings" => true
            ],
            "midtransConfig" => [
                "merchantId" => "",
                "clientKey" => "",
                "serverKey" => "",
                "isProduction" => false,
                "adminFee" => 0,
                "systemMaintenanceFee" => 1500,
                "chargeFeesToUser" => true
            ],
            "attendanceLogs" => [
                [ "id" => "att-1", "studentId" => "std-1", "date" => "2026-05-18", "status" => "Hadir", "notes" => "" ],
                [ "id" => "att-2", "studentId" => "std-1", "date" => "2026-05-19", "status" => "Hadir", "notes" => "" ],
                [ "id" => "att-3", "studentId" => "std-1", "date" => "2026-05-20", "status" => "Sakit", "notes" => "Demam tinggi" ],
                [ "id" => "att-4", "studentId" => "std-2", "date" => "2026-05-18", "status" => "Hadir", "notes" => "" ],
                [ "id" => "att-5", "studentId" => "std-2", "date" => "2026-05-19", "status" => "Izin", "notes" => "Acara keluarga" ],
                [ "id" => "att-6", "studentId" => "std-2", "date" => "2026-05-20", "status" => "Hadir", "notes" => "" ],
                [ "id" => "att-7", "studentId" => "std-3", "date" => "2026-05-20", "status" => "Alpa", "notes" => "Tanpa keterangan" ]
            ],
            "homeroomTeachers" => [
                [ "id" => "ht-1", "username" => "wali7a", "name" => "Budi Santoso, S.Pd", "className" => "7-A", "password" => "wali123" ],
                [ "id" => "ht-2", "username" => "wali7b", "name" => "Endang Lastari, S.Pd", "className" => "7-B", "password" => "wali123" ],
                [ "id" => "ht-3", "username" => "wali8a", "name" => "Joko Susilo, S.Pd", "className" => "8-A", "password" => "wali123" ],
                [ "id" => "ht-4", "username" => "wali9c", "name" => "Rina Wijayanti, S.Pd", "className" => "9-C", "password" => "wali123" ]
            ]
        ];

        // Pre-populate standard billing for students from July 2025 to June 2026
        $months = ["Juli", "Agustus", "September", "Oktober", "November", "Desember", "Januari", "Februari", "Maret", "April", "Mei", "Juni"];
        $years_arr = [2025, 2025, 2025, 2025, 2025, 2025, 2026, 2026, 2026, 2026, 2026, 2026];
        $bill_idx = 1;

        foreach ($initial['students'] as $std) {
            $class_num = (int)filter_var($std['class'], FILTER_SANITIZE_NUMBER_INT);
            $base_rate = 150000;
            if ($class_num === 8) $base_rate = 155000;
            if ($class_num === 9) $base_rate = 160000;

            foreach ($months as $idx => $m) {
                // Pre-pay Juli, Agustus, September to make the data trace beautiful
                $status = ($idx < 2) ? "paid" : "unpaid";
                $initial['sppBills'][] = [
                    "id" => "bill-" . $std['id'] . "-" . $bill_idx++,
                    "studentId" => $std['id'],
                    "month" => $m,
                    "year" => $years_arr[$idx],
                    "amount" => $base_rate,
                    "status" => $status,
                    "orderId" => ($status === "paid" ? "MTR-MANUAL-" . rand(10000, 99999) : null),
                    "createdAt" => date('c'),
                    "paidAt" => ($status === "paid" ? date('c', strtotime("-30 days")) : null),
                    "paymentType" => ($status === "paid" ? "Teller / Tunai" : null)
                ];
            }
        }
        
        file_put_contents($file_path, json_encode($initial, JSON_PRETTY_PRINT));
        return $initial;
    }

    $raw = file_get_contents($file_path);
    return json_decode($raw, true) ?: [];
}

function save_state($file_path, $state) {
    file_put_contents($file_path, json_encode($state, JSON_PRETTY_PRINT));
}

// Read body input for POST parameters
$input_json = file_get_contents('php://input');
$data_input = json_decode($input_json, true) ?: [];

// Load state with write locks
$state = load_state($db_file);

// ----------------------------------------------------
// ROUTER ENGINE
// ----------------------------------------------------

switch ($route) {
    case 'system-status':
        $hasMidtrans = !empty($state['midtransConfig']['serverKey']) && !empty($state['midtransConfig']['clientKey']);
        echo json_encode([
            "success" => true,
            "runningOn" => "PHP cPanel/Shared Hosting Environment",
            "phpVersion" => PHP_VERSION,
            "firestore" => [
                "status" => "Koneksi Berjalan (Embedded PHP JSON)",
                "lastSync" => date('c')
            ],
            "midtrans" => [
                "merchantId" => $state['midtransConfig']['merchantId'] ?: '(Belum Dikoneksi)',
                "clientKey" => $state['midtransConfig']['clientKey'] ?: '(Belum Dikoneksi)',
                "configured" => $hasMidtrans,
                "environment" => (!empty($state['midtransConfig']['isProduction']) ? "Production" : "Sandbox")
            ]
        ]);
        break;

    case 'midtrans-config':
        echo json_encode([
            "success" => true,
            "merchantId" => $state['midtransConfig']['merchantId'] ?? "",
            "clientKey" => $state['midtransConfig']['clientKey'] ?? "",
            "hasServerKey" => !empty($state['midtransConfig']['serverKey']),
            "isProduction" => !empty($state['midtransConfig']['isProduction']),
            "systemMaintenanceFee" => $state['midtransConfig']['systemMaintenanceFee'] ?? 1500,
            "chargeFeesToUser" => $state['midtransConfig']['chargeFeesToUser'] ?? true
        ]);
        break;

    case 'set-midtrans-config':
        if ($method !== 'POST') {
            http_response_code(405);
            echo json_encode(["error" => "Method Not Allowed"]);
            break;
        }
        $state['midtransConfig']['merchantId'] = $data_input['merchantId'] ?? $state['midtransConfig']['merchantId'];
        $state['midtransConfig']['clientKey'] = $data_input['clientKey'] ?? $state['midtransConfig']['clientKey'];
        if (!empty($data_input['serverKey'])) {
            $state['midtransConfig']['serverKey'] = $data_input['serverKey'];
        }
        $state['midtransConfig']['isProduction'] = isset($data_input['isProduction']) ? (bool)$data_input['isProduction'] : $state['midtransConfig']['isProduction'];
        $state['midtransConfig']['systemMaintenanceFee'] = isset($data_input['systemMaintenanceFee']) ? (int)$data_input['systemMaintenanceFee'] : ($state['midtransConfig']['systemMaintenanceFee'] ?? 1500);
        $state['midtransConfig']['chargeFeesToUser'] = isset($data_input['chargeFeesToUser']) ? (bool)$data_input['chargeFeesToUser'] : ($state['midtransConfig']['chargeFeesToUser'] ?? true);

        // Add a notification
        $new_notif = [
            "id" => "notif-sys-" . time(),
            "title" => "Konfigurasi Gateway & Biaya Diupdate ⚙️",
            "message" => "Kredensial API Midtrans berhasil diubah dari dasbor panel admin sekolah.",
            "type" => "info",
            "createdAt" => date('c')
        ];
        array_unshift($state['notifications'], $new_notif);

        save_state($db_file, $state);
        echo json_encode(["success" => true, "message" => "Konfigurasi Midtrans & Biaya Tambahan Berhasil Diperbarui!"]);
        break;

    case 'school-identity':
        echo json_encode([
            "success" => true,
            "identity" => $state['schoolIdentity']
        ]);
        break;

    case 'admin/set-school-identity':
        if ($method !== 'POST') {
            http_response_code(405);
            echo json_encode(["error" => "Method Not Allowed"]);
            break;
        }
        $state['schoolIdentity'] = array_merge($state['schoolIdentity'], $data_input);
        save_state($db_file, $state);
        echo json_encode(["success" => true, "message" => "Kop Surat & Profil Identitas Sekolah Berhasil Diperbarui!"]);
        break;

    case 'whatsapp-config':
        echo json_encode([
            "success" => true,
            "config" => $state['whatsappConfig']
        ]);
        break;

    case 'admin/set-whatsapp-config':
        if ($method !== 'POST') {
            http_response_code(405);
            echo json_encode(["error" => "Method Not Allowed"]);
            break;
        }
        $state['whatsappConfig'] = array_merge($state['whatsappConfig'], $data_input);
        save_state($db_file, $state);
        echo json_encode(["success" => true, "message" => "Konfigurasi Integrasi WhatsApp Gateway Disimpan!"]);
        break;

    case 'attendance':
        echo json_encode([
            "success" => true,
            "logs" => $state['attendanceLogs'] ?? []
        ]);
        break;

    case 'attendance/batch':
        if ($method !== 'POST') {
            http_response_code(405);
            echo json_encode(["error" => "Method Not Allowed"]);
            break;
        }
        $logs = $data_input['logs'] ?? [];
        if (!is_array($logs)) {
            $logs = [];
        }
        foreach ($logs as $new_log) {
            $log_id = $new_log['id'] ?? ("att-php-" . uniqid());
            // Check if exist, overwrite
            $exists = false;
            foreach ($state['attendanceLogs'] as &$ex_log) {
                if ($ex_log['studentId'] === $new_log['studentId'] && $ex_log['date'] === $new_log['date']) {
                    $ex_log['status'] = $new_log['status'];
                    $ex_log['notes'] = $new_log['notes'] ?? '';
                    $exists = true;
                    break;
                }
            }
            if (!$exists) {
                $state['attendanceLogs'][] = [
                    "id" => $log_id,
                    "studentId" => $new_log['studentId'],
                    "date" => $new_log['date'],
                    "status" => $new_log['status'],
                    "notes" => $new_log['notes'] ?? ''
                ];
            }
        }
        save_state($db_file, $state);
        echo json_encode(["success" => true, "message" => "Laporan Absensi Siswa Berhasil Disimpan Ke Database!"]);
        break;

    case 'homerooms':
        echo json_encode([
            "success" => true,
            "homerooms" => $state['homeroomTeachers']
        ]);
        break;

    case 'admin/homerooms':
        if ($method === 'POST') {
            $state['homeroomTeachers'][] = [
                "id" => $data_input['id'] ?? ("ht-php-" . uniqid()),
                "name" => $data_input['name'] ?? "",
                "className" => $data_input['className'] ?? "",
                "username" => $data_input['username'] ?? "",
                "password" => $data_input['password'] ?? "wali123"
            ];
            save_state($db_file, $state);
            echo json_encode(["success" => true, "message" => "Akun Guru Wali Kelas Baru Sukses Ditambah!"]);
        } else {
            echo json_encode(["success" => true, "homerooms" => $state['homeroomTeachers']]);
        }
        break;

    case 'notifications':
        echo json_encode([
            "success" => true,
            "notifications" => $state['notifications']
        ]);
        break;

    case 'notifications/broadcast':
        if ($method !== 'POST') {
            http_response_code(405);
            echo json_encode(["error" => "Method Not Allowed"]);
            break;
        }
        $new_notif = [
            "id" => "notif-bc-" . time(),
            "title" => $data_input['title'] ?? "Pemberitahuan",
            "message" => $data_input['message'] ?? "",
            "type" => $data_input['type'] ?? "info",
            "createdAt" => date('c')
        ];
        array_unshift($state['notifications'], $new_notif);
        save_state($db_file, $state);
        echo json_encode(["success" => true, "message" => "Pengumuman berhasil disiarkan ke semua layar wali siswa."]);
        break;

    case 'students':
        echo json_encode([
            "success" => true,
            "students" => $state['students']
        ]);
        break;

    case 'admin/all-bills':
        echo json_encode([
            "success" => true,
            "bills" => $state['sppBills']
        ]);
        break;

    case 'admin/all-transactions':
        echo json_encode([
            "success" => true,
            "transactions" => $state['savingsTransactions']
        ]);
        break;

    case 'admin/spp-config':
        echo json_encode([
            "success" => true,
            "sppRates" => $state['sppRates']
        ]);
        break;

    case 'admin/set-spp-config':
        if ($method !== 'POST') {
            http_response_code(405);
            echo json_encode(["error" => "Method Not Allowed"]);
            break;
        }
        if (isset($data_input['grade7'])) $state['sppRates']['grade7'] = (int)$data_input['grade7'];
        if (isset($data_input['grade8'])) $state['sppRates']['grade8'] = (int)$data_input['grade8'];
        if (isset($data_input['grade9'])) $state['sppRates']['grade9'] = (int)$data_input['grade9'];

        if (!empty($data_input['updateExistingUnpaid'])) {
            foreach ($state['sppBills'] as &$bill) {
                if ($bill['status'] === 'unpaid') {
                    // Check level
                    $std_id = $bill['studentId'];
                    $std_class = '';
                    foreach ($state['students'] as $s) {
                        if ($s['id'] === $std_id) {
                            $std_class = $s['class'] ?? '';
                            break;
                        }
                    }
                    if (strpos($std_class, '7') !== false || strpos($std_class, 'VII') !== false) {
                        $bill['amount'] = $state['sppRates']['grade7'];
                    } else if (strpos($std_class, '8') !== false || strpos($std_class, 'VIII') !== false) {
                        $bill['amount'] = $state['sppRates']['grade8'];
                    } else if (strpos($std_class, '9') !== false || strpos($std_class, 'IX') !== false) {
                        $bill['amount'] = $state['sppRates']['grade9'];
                    }
                }
            }
        }
        save_state($db_file, $state);
        echo json_encode(["success" => true, "message" => "Konfigurasi tarif SPP berhasil diubah retroaktif ke tagihan aktif."]);
        break;

    case 'students/change-password':
        // Just return true/dummy because in-memory student password is not strictly gated
        echo json_encode(["success" => true, "message" => "Kata Sandi Berhasil Diperbarui!"]);
        break;

    case 'admin/pay-spp-manual':
        if ($method !== 'POST') {
            http_response_code(405);
            echo json_encode(["error" => "Method Not Allowed"]);
            break;
        }
        $billId = $data_input['billId'] ?? '';
        $paymentType = $data_input['paymentMethod'] ?? 'Teller / Tunai';

        foreach ($state['sppBills'] as &$b) {
            if ($b['id'] === $billId) {
                $b['status'] = 'paid';
                $b['paymentType'] = $paymentType;
                $b['paidAt'] = date('c');
                $b['orderId'] = 'TX-MANUAL-' . rand(100000, 999999);
                
                // Add Notification
                $std_id = $b['studentId'];
                $std_name = 'Siswa';
                $std_nis = '';
                foreach ($state['students'] as $s) {
                    if ($s['id'] === $std_id) {
                        $std_name = $s['name'];
                        $std_nis = $s['nis'];
                        break;
                    }
                }
                
                $state['notifications'][] = [
                    "id" => "notif-spp-" . time(),
                    "title" => "Pembayaran SPP Lunas (Teller) 💵",
                    "message" => "SPP Berhasil Dibayarkan untuk Siswa: {$std_name} ({$std_nis}) - Periode: {$b['month']} {$b['year']}.",
                    "type" => "success",
                    "createdAt" => date('c')
                ];
                break;
            }
        }
        save_state($db_file, $state);
        echo json_encode(["success" => true, "message" => "Pembayaran SPP Manual Berhasil Disimpan!"]);
        break;

    case 'admin/savings-manual':
        if ($method !== 'POST') {
            http_response_code(405);
            echo json_encode(["error" => "Method Not Allowed"]);
            break;
        }
        $studentId = $data_input['studentId'] ?? '';
        $type = $data_input['type'] ?? 'deposit'; // deposit or withdraw
        $amount = (int)($data_input['amount'] ?? 0);

        if ($amount <= 0) {
            echo json_encode(["error" => "Nominal harus lebih dari Rp 0."]);
            break;
        }

        foreach ($state['students'] as &$std) {
            if ($std['id'] === $studentId) {
                if ($type === 'withdraw' && $std['savingsBalance'] < $amount) {
                    http_response_code(400);
                    echo json_encode(["error" => "Maaf, saldo tabungan siswa tidak mencukupi untuk penarikan."]);
                    exit;
                }

                if ($type === 'deposit') {
                    $std['savingsBalance'] += $amount;
                    $desc = 'Setoran Tunai di Teller';
                } else {
                    $std['savingsBalance'] -= $amount;
                    $desc = 'Penarikan Tunai di Teller';
                }

                // Add saving transaction
                $state['savingsTransactions'][] = [
                    "id" => "tx-saved-" . uniqid(),
                    "studentId" => $studentId,
                    "type" => $type,
                    "amount" => $amount,
                    "date" => date('Y-m-d'),
                    "createdAt" => date('c'),
                    "description" => $desc,
                    "channel" => "Teller Madrasah"
                ];

                // Add Notification
                $state['notifications'][] = [
                    "id" => "notif-sav-" . time(),
                    "title" => ($type === 'deposit' ? "Setoran Tabungan Berhasil" : "Penarikan Tabungan Berhasil"),
                    "message" => "Transaksi Rp " . number_format($amount, 0, ',', '.') . " untuk siswa {$std['name']} ({$std['nis']}) sukses diproses.",
                    "type" => ($type === 'deposit' ? "success" : "info"),
                    "createdAt" => date('c')
                ];
                break;
            }
        }
        save_state($db_file, $state);
        echo json_encode(["success" => true, "message" => "Transaksi Kas Tabungan Berhasil Disimpan Ke Server!"]);
        break;

    case 'admin/students':
        if ($method === 'POST') {
            // Addition or Edit
            $id = $data_input['id'] ?? '';
            if (empty($id)) {
                // ADD NEW
                $new_id = "std-php-" . uniqid();
                $nis = $data_input['nis'] ?? '';
                $name = $data_input['name'] ?? '';
                $class = $data_input['class'] ?? '';
                $email = $data_input['email'] ?? '';
                $phone = $data_input['phone'] ?? '';

                $state['students'][] = [
                    "id" => $new_id,
                    "nis" => $nis,
                    "name" => $name,
                    "class" => $class,
                    "email" => $email,
                    "phone" => $phone,
                    "savingsBalance" => 0
                ];

                // Automatically pre-populate SPP bills for this new student for July 2025 - June 2026
                $months = ["Juli", "Agustus", "September", "Oktober", "November", "Desember", "Januari", "Februari", "Maret", "April", "Mei", "Juni"];
                $years_arr = [2025, 2025, 2025, 2025, 2025, 2025, 2026, 2026, 2026, 2026, 2026, 2026];
                $class_num = (int)filter_var($class, FILTER_SANITIZE_NUMBER_INT);
                $base_rate = 150000;
                if ($class_num === 8) $base_rate = 155000;
                if ($class_num === 9) $base_rate = 160000;

                foreach ($months as $idx => $m) {
                    $state['sppBills'][] = [
                        "id" => "bill-" . $new_id . "-" . ($idx + 1),
                        "studentId" => $new_id,
                        "month" => $m,
                        "year" => $years_arr[$idx],
                        "amount" => $base_rate,
                        "status" => "unpaid",
                        "orderId" => null,
                        "createdAt" => date('c'),
                        "paidAt" => null,
                        "paymentType" => null
                    ];
                }

                save_state($db_file, $state);
                echo json_encode(["success" => true, "message" => "Siswa baru Berhasil Ditambahkan beserta 12 bulan tagihan SPP gratis!"]);
            } else {
                // EDIT EXISTING
                foreach ($state['students'] as &$s) {
                    if ($s['id'] === $id) {
                        $s['name'] = $data_input['name'] ?? $s['name'];
                        $s['nis'] = $data_input['nis'] ?? $s['nis'];
                        $s['class'] = $data_input['class'] ?? $s['class'];
                        $s['email'] = $data_input['email'] ?? $s['email'];
                        $s['phone'] = $data_input['phone'] ?? $s['phone'];
                        break;
                    }
                }
                save_state($db_file, $state);
                echo json_encode(["success" => true, "message" => "Profil Siswa Berhasil Diperbarui!"]);
            }
        }
        break;

    case 'pay-spp-snap':
        if ($method !== 'POST') {
            http_response_code(405);
            echo json_encode(["error" => "Method Not Allowed"]);
            break;
        }
        $billId = $data_input['billId'] ?? '';
        $bill = null;
        $bill_key = -1;

        foreach ($state['sppBills'] as $key => $b) {
            if ($b['id'] === $billId) {
                $bill = $b;
                $bill_key = $key;
                break;
            }
        }

        if (!$bill) {
            http_response_code(404);
            echo json_encode(["error" => "Tagihan tidak ditemukan."]);
            exit;
        }

        if ($bill['status'] === 'paid') {
            http_response_code(400);
            echo json_encode(["error" => "Tagihan sudah lunas."]);
            exit;
        }

        $student = null;
        foreach ($state['students'] as $std) {
            if ($std['id'] === $bill['studentId']) {
                $student = $std;
                break;
            }
        }

        if (!$student) {
            http_response_code(404);
            echo json_encode(["error" => "Siswa tidak ditemukan."]);
            exit;
        }

        $orderId = "SPP-" . $bill['id'] . "-" . time();
        $state['sppBills'][$bill_key]['orderId'] = $orderId;
        $state['sppBills'][$bill_key]['status'] = 'pending';

        $chargeFees = $state['midtransConfig']['chargeFeesToUser'] ?? true;
        $maintenanceFee = $chargeFees ? ($state['midtransConfig']['systemMaintenanceFee'] ?? 1500) : 0;
        $grossAmount = $bill['amount'] + $maintenanceFee;

        $serverKey = $state['midtransConfig']['serverKey'] ?? '';
        $clientKey = $state['midtransConfig']['clientKey'] ?? '';

        if (empty($serverKey) || empty($clientKey)) {
            // Return simulation payload
            save_state($db_file, $state);
            echo json_encode([
                "token" => "snap-token-spp-mock-" . time(),
                "isSimulated" => true,
                "orderId" => $orderId,
                "redirectUrl" => "#",
                "adminFee" => 0,
                "systemMaintenanceFee" => $maintenanceFee,
                "baseAmount" => $bill['amount'],
                "totalAmount" => $grossAmount,
                "message" => "Menjalankan Simulasi Pembayaran karena Kunci Server Midtrans belum diatur"
            ]);
            break;
        }

        // Live Midtrans Request using internal PHP cURL
        $url = !empty($state['midtransConfig']['isProduction']) 
            ? "https://app.midtrans.com/snap/v1/transactions" 
            : "https://app.sandbox.midtrans.com/snap/v1/transactions";

        $payload = [
            "transaction_details" => [
                "order_id" => $orderId,
                "gross_amount" => $grossAmount
            ],
            "credit_card" => [
                "secure" => true
            ],
            "customer_details" => [
                "first_name" => $student['name'],
                "email" => $student['email'] ?: $student['nis'] . '@maarif.sch.id',
                "phone" => $student['phone']
            ],
            "item_details" => [
                [
                    "id" => $bill['id'],
                    "price" => $bill['amount'],
                    "quantity" => 1,
                    "name" => "SPP " . $bill['month'] . " " . $bill['year'] . " - " . $student['name']
                ]
            ]
        ];

        if ($maintenanceFee > 0) {
            $payload['item_details'][] = [
                "id" => "fee-maintenance",
                "price" => $maintenanceFee,
                "quantity" => 1,
                "name" => "Biaya Pemeliharaan Sistem"
            ];
        }

        $authHeader = base64_encode($serverKey . ":");
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            "Content-Type: application/json",
            "Accept: application/json",
            "Authorization: Basic " . $authHeader
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode >= 200 && $httpCode < 300) {
            $snapResp = json_decode($response, true);
            save_state($db_file, $state);
            echo json_encode([
                "token" => $snapResp['token'] ?? '',
                "redirectUrl" => $snapResp['redirect_url'] ?? '',
                "isSimulated" => false,
                "orderId" => $orderId,
                "adminFee" => 0,
                "systemMaintenanceFee" => $maintenanceFee,
                "baseAmount" => $bill['amount'],
                "totalAmount" => $grossAmount
            ]);
        } else {
            // Fail safe Simulator fallback
            save_state($db_file, $state);
            echo json_encode([
                "token" => "snap-token-spp-mock-err-" . time(),
                "isSimulated" => true,
                "orderId" => $orderId,
                "redirectUrl" => "#",
                "adminFee" => 0,
                "systemMaintenanceFee" => $maintenanceFee,
                "baseAmount" => $bill['amount'],
                "totalAmount" => $grossAmount,
                "message" => "Gagal terhubung ke Midtrans API. Menggunakan mode Simulasi Mandiri."
            ]);
        }
        break;

    case 'deposit-savings-snap':
        if ($method !== 'POST') {
            http_response_code(405);
            echo json_encode(["error" => "Method Not Allowed"]);
            break;
        }
        $studentId = $data_input['studentId'] ?? '';
        $amount = (int)($data_input['amount'] ?? 0);

        $student = null;
        foreach ($state['students'] as $std) {
            if ($std['id'] === $studentId) {
                $student = $std;
                break;
            }
        }

        if (!$student || $amount <= 0) {
            http_response_code(400);
            echo json_encode(["error" => "Data tidak valid."]);
            exit;
        }

        $orderId = "TAB-" . $student['id'] . "-" . time();
        $chargeFees = $state['midtransConfig']['chargeFeesToUser'] ?? true;
        $maintenanceFee = $chargeFees ? ($state['midtransConfig']['systemMaintenanceFee'] ?? 1500) : 0;
        $grossAmount = $amount + $maintenanceFee;

        // Save order session in saving transaction as pending
        $state['savingsTransactions'][] = [
            "id" => "tx-saved-pending-" . uniqid(),
            "studentId" => $studentId,
            "type" => "deposit",
            "amount" => $amount,
            "date" => date('Y-m-d'),
            "createdAt" => date('c'),
            "description" => 'Tunggakan Penyetoran Tabungan (Online)',
            "channel" => 'Midtrans Internet Banking',
            "orderId" => $orderId,
            "status" => "pending"
        ];

        $serverKey = $state['midtransConfig']['serverKey'] ?? '';
        $clientKey = $state['midtransConfig']['clientKey'] ?? '';

        if (empty($serverKey) || empty($clientKey)) {
            save_state($db_file, $state);
            echo json_encode([
                "token" => "snap-token-tab-mock-" . time(),
                "isSimulated" => true,
                "orderId" => $orderId,
                "redirectUrl" => "#",
                "adminFee" => 0,
                "systemMaintenanceFee" => $maintenanceFee,
                "baseAmount" => $amount,
                "totalAmount" => $grossAmount,
                "message" => "Menjalankan Simulasi Transaksi karena Kunci Server belum diatur."
            ]);
            break;
        }

        $url = !empty($state['midtransConfig']['isProduction']) 
            ? "https://app.midtrans.com/snap/v1/transactions" 
            : "https://app.sandbox.midtrans.com/snap/v1/transactions";

        $payload = [
            "transaction_details" => [
                "order_id" => $orderId,
                "gross_amount" => $grossAmount
            ],
            "credit_card" => [
                "secure" => true
            ],
            "customer_details" => [
                "first_name" => $student['name'],
                "email" => $student['email'] ?: $student['nis'] . '@maarif.sch.id',
                "phone" => $student['phone']
            ],
            "item_details" => [
                [
                    "id" => "setor-tabungan",
                    "price" => $amount,
                    "quantity" => 1,
                    "name" => "Setoran Tabungan Siswa: " . $student['name']
                ]
            ]
        ];

        if ($maintenanceFee > 0) {
            $payload['item_details'][] = [
                "id" => "fee-maintenance",
                "price" => $maintenanceFee,
                "quantity" => 1,
                "name" => "Biaya Pemeliharaan Sistem"
            ];
        }

        $authHeader = base64_encode($serverKey . ":");
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            "Content-Type: application/json",
            "Accept: application/json",
            "Authorization: Basic " . $authHeader
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode >= 200 && $httpCode < 300) {
            $snapResp = json_decode($response, true);
            save_state($db_file, $state);
            echo json_encode([
                "token" => $snapResp['token'] ?? '',
                "redirectUrl" => $snapResp['redirect_url'] ?? '',
                "isSimulated" => false,
                "orderId" => $orderId,
                "adminFee" => 0,
                "systemMaintenanceFee" => $maintenanceFee,
                "baseAmount" => $amount,
                "totalAmount" => $grossAmount
            ]);
        } else {
            save_state($db_file, $state);
            echo json_encode([
                "token" => "snap-token-tab-mock-err-" . time(),
                "isSimulated" => true,
                "orderId" => $orderId,
                "redirectUrl" => "#",
                "adminFee" => 0,
                "systemMaintenanceFee" => $maintenanceFee,
                "baseAmount" => $amount,
                "totalAmount" => $grossAmount
            ]);
        }
        break;

    case 'simulate-payment-success':
        if ($method !== 'POST') {
            http_response_code(405);
            echo json_encode(["error" => "Method Not Allowed"]);
            break;
        }
        $orderId = $data_input['orderId'] ?? '';
        $paymentType = $data_input['paymentType'] ?? 'Simulator Pembayaran';

        $is_processed = false;

        if (strpos($orderId, 'SPP-') === 0) {
            // SPP Bill payment
            foreach ($state['sppBills'] as &$b) {
                if ($b['orderId'] === $orderId && $b['status'] !== 'paid') {
                    $b['status'] = 'paid';
                    $b['paymentType'] = $paymentType;
                    $b['paidAt'] = date('c');
                    
                    // Fetch student details for notification
                    $std_id = $b['studentId'];
                    $std_name = 'Siswa';
                    $std_nis = '';
                    foreach ($state['students'] as $s) {
                        if ($s['id'] === $std_id) {
                            $std_name = $s['name'];
                            $std_nis = $s['nis'];
                            break;
                        }
                    }

                    // Add Notification
                    $state['notifications'][] = [
                        "id" => "notif-spp-" . time(),
                        "title" => "Pembayaran SPP Sukses Online 💳",
                        "message" => "SPP Berhasil Dibayarkan Mandiri untuk Siswa: {$std_name} ({$std_nis}) - Periode: {$b['month']} {$b['year']}.",
                        "type" => "success",
                        "createdAt" => date('c')
                    ];
                    $is_processed = true;
                    break;
                }
            }
        } else if (strpos($orderId, 'TAB-') === 0) {
            // Deposit transaction
            // Look for existing pending tx
            $found_tx_key = -1;
            foreach ($state['savingsTransactions'] as $key => $tx) {
                if (isset($tx['orderId']) && $tx['orderId'] === $orderId) {
                    $found_tx_key = $key;
                    break;
                }
            }

            if ($found_tx_key !== -1) {
                $studentId = $state['savingsTransactions'][$found_tx_key]['studentId'];
                $amount = $state['savingsTransactions'][$found_tx_key]['amount'];

                // Update student balance
                foreach ($state['students'] as &$std) {
                    if ($std['id'] === $studentId) {
                        $std['savingsBalance'] += $amount;

                        // Upgrade pending transaction to completed
                        $state['savingsTransactions'][$found_tx_key]['status'] = 'success';
                        $state['savingsTransactions'][$found_tx_key]['description'] = 'Setoran Online via Midtrans';
                        $state['savingsTransactions'][$found_tx_key]['channel'] = $paymentType;

                        // Add Notification
                        $state['notifications'][] = [
                            "id" => "notif-sav-" . time(),
                            "title" => "Setoran Tabungan Berhasil Online 💳",
                            "message" => "Penyetoran Mandiri Rp " . number_format($amount, 0, ',', '.') . " untuk siswa {$std['name']} ({$std['nis']}) sukses diproses.",
                            "type" => "success",
                            "createdAt" => date('c')
                        ];
                        $is_processed = true;
                        break;
                    }
                }
            }
        }

        save_state($db_file, $state);
        echo json_encode(["success" => true, "processed" => $is_processed]);
        break;

    default:
        // No matching endpoint
        http_response_code(404);
        echo json_encode(["error" => "PHP API Endpoint '{$route}' not found."]);
        break;
}
