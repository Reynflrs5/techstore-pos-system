<?php
// index.php - Login Page
session_start();
require_once 'config/db.php';

// Redirect if already logged in
if (isset($_SESSION['user'])) {
    if ($_SESSION['user']['role'] === 'admin') {
        header("Location: dashboard.php");
    } else {
        header("Location: pos.php");
    }
    exit();
}

$error = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = trim($_POST['username'] ?? '');
    $password = trim($_POST['password'] ?? '');

    if (empty($username) || empty($password)) {
        $error = 'Please enter both username and password.';
    } else {
        try {
            $stmt = $pdo->prepare("SELECT id, username, password_hash, full_name, role FROM users WHERE username = ?");
            $stmt->execute([$username]);
            $user = $stmt->fetch();

            // Match either plaintext (demo setup) or password_hash
            if ($user && ($user['password_hash'] === $password || password_verify($password, $user['password_hash']))) {
                $_SESSION['user'] = [
                    'id' => $user['id'],
                    'username' => $user['username'],
                    'full_name' => $user['full_name'],
                    'role' => $user['role']
                ];

                if ($user['role'] === 'admin') {
                    header("Location: dashboard.php");
                } else {
                    header("Location: pos.php");
                }
                exit();
            } else {
                $error = 'Invalid username or password.';
            }
        } catch (PDOException $e) {
            $error = 'Database error: ' . $e->getMessage();
        }
    }
}
?>
<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Login - TechStore POS</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="assets/css/style.css">
  <script src="https://unpkg.com/lucide@latest"></script>
  <style>
    body {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: radial-gradient(circle at center, #131724 0%, #05070c 100%);
      padding: 1.5rem;
    }
    .login-box {
      width: 100%;
      max-width: 420px;
      background: var(--surface-color);
      border: 1px solid var(--border);
      border-radius: 18px;
      padding: 2.5rem 2rem;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    }
    .login-brand {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      margin-bottom: 2rem;
    }
    .login-logo {
      width: 52px;
      height: 52px;
      border-radius: 14px;
      background: linear-gradient(135deg, var(--primary), #22d3ee);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #05070c;
      margin-bottom: 1rem;
      box-shadow: 0 8px 20px rgba(124, 92, 252, 0.4);
    }
    .demo-creds {
      margin-top: 1.5rem;
      padding: 0.9rem;
      background: var(--surface-color-light);
      border-radius: 10px;
      font-size: 0.8rem;
      color: var(--text-secondary);
      border: 1px dashed var(--border);
    }
    .demo-pill {
      display: inline-block;
      background: rgba(255, 255, 255, 0.08);
      padding: 2px 6px;
      border-radius: 4px;
      color: var(--text-primary);
      cursor: pointer;
    }
  </style>
</head>
<body>

<div class="login-box">
  <div class="login-brand">
    <div class="login-logo">
      <i data-lucide="cpu" style="width: 28px; height: 28px;"></i>
    </div>
    <h2>TechStore POS</h2>
    <p>Sign in to access terminal</p>
  </div>

  <?php if (!empty($error)): ?>
    <div style="background: var(--danger-bg); color: var(--danger); border: 1px solid rgba(248,113,113,0.3); padding: 0.75rem 1rem; border-radius: 8px; margin-bottom: 1.25rem; font-size: 0.875rem;">
      <?= htmlspecialchars($error) ?>
    </div>
  <?php endif; ?>

  <form method="POST" action="index.php">
    <div class="form-group">
      <label class="form-label">Username</label>
      <input type="text" name="username" id="loginUsername" required placeholder="Enter username" autofocus autocomplete="username">
    </div>

    <div class="form-group">
      <label class="form-label">Password</label>
      <input type="password" name="password" id="loginPassword" required placeholder="Enter password" autocomplete="current-password">
    </div>

    <button type="submit" class="btn btn-primary" style="width: 100%; height: 46px; margin-top: 0.5rem; font-size: 0.95rem;">
      <i data-lucide="log-in" style="width: 18px; height: 18px;"></i>
      Sign In
    </button>
  </form>

  <div class="demo-creds">
    <div style="font-weight: 600; margin-bottom: 4px; color: var(--text-primary);">Demo Accounts:</div>
    <div>Admin: <span class="demo-pill" onclick="fillCreds('admin','admin')">admin / admin</span></div>
    <div style="margin-top: 3px;">Cashier: <span class="demo-pill" onclick="fillCreds('cashier','cashier')">cashier / cashier</span></div>
  </div>
</div>

<script>
  lucide.createIcons();
  function fillCreds(u, p) {
    document.getElementById('loginUsername').value = u;
    document.getElementById('loginPassword').value = p;
  }
</script>
</body>
</html>
