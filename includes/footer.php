</div><!-- .app-container -->

  <!-- Toast Notification Container -->
  <div id="appToast" class="toast"></div>

  <!-- Global Application Scripts -->
  <script src="assets/js/app.js"></script>
  
  <?php if (isset($extraJs)): ?>
    <script src="<?= htmlspecialchars($extraJs) ?>"></script>
  <?php endif; ?>

  <script>
    // Initialize Lucide Icons across all loaded elements
    if (window.lucide) {
      lucide.createIcons();
    }
  </script>
</body>
</html>
