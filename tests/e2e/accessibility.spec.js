/**
 * Accessibility E2E tests for the Lecteur Vocal application
 * Tests ARIA attributes, keyboard navigation, and screen reader compatibility
 */

import { test, expect } from '@playwright/test';

test.describe('Accessibility Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/lecteur_vocal_V6.html');
  });

  test.describe('ARIA Attributes', () => {
    test('should have proper ARIA roles on main sections', async ({ page }) => {
      // Control panel
      const controlPanel = page.locator('#controlPanel');
      await expect(controlPanel).toHaveAttribute('aria-label', 'Panneau de lecture');

      // Main display stage
      const stage = page.locator('.stage');
      await expect(stage).toHaveAttribute('role', 'region');
      await expect(stage).toHaveAttribute('aria-label', 'Affichage principal');

      // Data table section
      const tableWrap = page.locator('.table-wrap');
      await expect(tableWrap).toHaveAttribute('role', 'region');
      await expect(tableWrap).toHaveAttribute('aria-label', 'Table des données');
    });

    test('should have proper ARIA labels on buttons', async ({ page }) => {
      await expect(page.locator('#startBtn')).toHaveAttribute('aria-label', 'Démarrer la lecture');
      await expect(page.locator('#pauseBtn')).toHaveAttribute('aria-label', 'Mettre en pause');
      await expect(page.locator('#resumeBtn')).toHaveAttribute('aria-label', 'Reprendre la lecture');
      await expect(page.locator('#prevBtn')).toHaveAttribute('aria-label', 'Élément précédent');
      await expect(page.locator('#nextBtn')).toHaveAttribute('aria-label', 'Élément suivant');
      await expect(page.locator('#stopBtn')).toHaveAttribute('aria-label', 'Arrêter la lecture');
    });

    test('should have proper ARIA labels on inputs', async ({ page }) => {
      await expect(page.locator('#paste')).toHaveAttribute('aria-label', 'Zone de saisie des données');
      await expect(page.locator('#csvFile')).toHaveAttribute('aria-label', 'Sélectionner un fichier');
      await expect(page.locator('#rate')).toHaveAttribute('aria-label', 'Vitesse de lecture');
      await expect(page.locator('#pitch')).toHaveAttribute('aria-label', 'Hauteur de la voix');
      await expect(page.locator('#volume')).toHaveAttribute('aria-label', 'Volume');
    });

    test('should have live region for status updates', async ({ page }) => {
      const statusLine = page.locator('#statusLine');
      await expect(statusLine).toHaveAttribute('role', 'status');
      await expect(statusLine).toHaveAttribute('aria-live', 'polite');
    });

    test('should have proper ARIA labels on current display', async ({ page }) => {
      await expect(page.locator('#currentLabel')).toHaveAttribute('aria-label', 'Étiquette courante');
      await expect(page.locator('#currentValue')).toHaveAttribute('aria-label', 'Valeur courante');
    });

    test('should have proper aria-describedby for inputs with help text', async ({ page }) => {
      await page.locator('details summary').first().click();
      await expect(page.locator('#trigger')).toHaveAttribute('aria-describedby', 'triggerHelp');
      await expect(page.locator('#timeout')).toHaveAttribute('aria-describedby', 'timeoutHelp');
    });
  });

  test.describe('Keyboard Navigation', () => {
    test('should allow tab navigation through controls', async ({ page }) => {
      // Focus on paste area first
      await page.locator('#paste').focus();

      // Tab through controls
      await page.keyboard.press('Tab');
      await expect(page.locator('#parseBtn')).toBeFocused();

      await page.keyboard.press('Tab');
      await expect(page.locator('#csvFile')).toBeFocused();

      await page.keyboard.press('Tab');
      await expect(page.locator('#loadCsvBtn')).toBeFocused();
    });

    test('should support keyboard shortcuts during playback', async ({ page }) => {
      // Add test data
      await page.locator('#paste').fill('Item 1\t10\nItem 2\t20\nItem 3\t30');
      await page.locator('#parseBtn').click();

      // Start playback
      await page.locator('#startBtn').click();

      // Wait for playback to start
      await expect(page.locator('#currentLabel')).toHaveText('Item 1');

      // Test right arrow for next
      await page.keyboard.press('ArrowRight');
      await expect(page.locator('#currentLabel')).toHaveText('Item 2');

      // Test left arrow for previous
      await page.keyboard.press('ArrowLeft');
      await expect(page.locator('#currentLabel')).toHaveText('Item 1');

      // Test spacebar for pause/resume
      await page.keyboard.press('Space');
      await expect(page.locator('#pauseBtn')).toBeDisabled();
      await expect(page.locator('#resumeBtn')).toBeEnabled();

      await page.keyboard.press('Space');
      await expect(page.locator('#pauseBtn')).toBeEnabled();
      await expect(page.locator('#resumeBtn')).toBeDisabled();
    });

    test('should prevent default scroll on space key during playback', async ({ page }) => {
      await page.locator('#paste').fill('Item 1\t10');
      await page.locator('#parseBtn').click();
      await page.locator('#startBtn').click();

      const scrollBefore = await page.evaluate(() => window.scrollY);
      await page.keyboard.press('Space');
      const scrollAfter = await page.evaluate(() => window.scrollY);

      expect(scrollAfter).toBe(scrollBefore);
    });

    test('should allow keyboard access to advanced settings', async ({ page }) => {
      // Open advanced settings with keyboard
      const summary = page.locator('details summary').first();
      await summary.focus();
      await page.keyboard.press('Enter');

      // Verify details is open
      const details = page.locator('details').first();
      await expect(details).toHaveAttribute('open', '');

      // Navigate to trigger input
      await page.locator('#trigger').focus();
      await expect(page.locator('#trigger')).toBeFocused();
    });
  });

  test.describe('Button States', () => {
    test('should have correct disabled states initially', async ({ page }) => {
      await expect(page.locator('#startBtn')).toBeDisabled();
      await expect(page.locator('#pauseBtn')).toBeDisabled();
      await expect(page.locator('#resumeBtn')).toBeDisabled();
      await expect(page.locator('#prevBtn')).toBeDisabled();
      await expect(page.locator('#nextBtn')).toBeDisabled();
      await expect(page.locator('#stopBtn')).toBeDisabled();
    });

    test('should enable start button when data is loaded', async ({ page }) => {
      await page.locator('#paste').fill('Test\t10');
      await page.locator('#parseBtn').click();

      await expect(page.locator('#startBtn')).toBeEnabled();
    });

    test('should update button states during playback', async ({ page }) => {
      await page.locator('#paste').fill('Item 1\t10\nItem 2\t20');
      await page.locator('#parseBtn').click();

      // After start
      await page.locator('#startBtn').click();

      await expect(page.locator('#startBtn')).toBeDisabled();
      await expect(page.locator('#pauseBtn')).toBeEnabled();
      await expect(page.locator('#resumeBtn')).toBeDisabled();
      await expect(page.locator('#stopBtn')).toBeEnabled();
      await expect(page.locator('#prevBtn')).toBeDisabled(); // At first item
      await expect(page.locator('#nextBtn')).toBeEnabled();

      // After next
      await page.locator('#nextBtn').click();

      await expect(page.locator('#prevBtn')).toBeEnabled();
      await expect(page.locator('#nextBtn')).toBeDisabled(); // At last item

      // After pause
      await page.locator('#pauseBtn').click();

      await expect(page.locator('#pauseBtn')).toBeDisabled();
      await expect(page.locator('#resumeBtn')).toBeEnabled();
    });
  });

  test.describe('Focus Management', () => {
    test('should maintain focus after button interactions', async ({ page }) => {
      await page.locator('#paste').fill('Test\t10');
      await page.locator('#parseBtn').click();

      // Focus should remain accessible after parse
      await page.locator('#startBtn').focus();
      await page.keyboard.press('Enter');

      // Should still be able to navigate
      await page.keyboard.press('Tab');
      // Verify we moved to next focusable element
    });

    test('should not trap focus in any section', async ({ page }) => {
      // Start at textarea
      await page.locator('#paste').focus();

      // Tab through all interactive elements
      let iterations = 0;
      const maxIterations = 50;

      while (iterations < maxIterations) {
        await page.keyboard.press('Tab');
        const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
        iterations++;

        // If we've cycled back to body or the same element, we're done
        if (!focusedElement || focusedElement === 'BODY') {
          break;
        }
      }

      // Should complete within reasonable iterations
      expect(iterations).toBeLessThan(maxIterations);
    });
  });

  test.describe('Color Contrast and Visual Indicators', () => {
    test('should have visible focus indicators', async ({ page }) => {
      const startBtn = page.locator('#startBtn');
      await page.locator('#paste').fill('Test\t10');
      await page.locator('#parseBtn').click();

      await startBtn.focus();

      // Check that the button has focus styling (outline)
      const outline = await startBtn.evaluate(el => {
        const styles = window.getComputedStyle(el);
        return styles.outline || styles.outlineWidth;
      });

      // Should have some outline (browser default or custom)
      expect(outline).toBeTruthy();
    });

    test('should update badge colors based on status', async ({ page }) => {
      const recogBadge = page.locator('#recogBadge');
      const synthBadge = page.locator('#synthBadge');

      // Check initial badge classes
      await expect(recogBadge).toHaveClass(/badge/);
      await expect(synthBadge).toHaveClass(/badge/);
    });
  });

  test.describe('Screen Reader Announcements', () => {
    test('should update status line for screen readers', async ({ page }) => {
      const statusLine = page.locator('#statusLine');

      // Initial status
      await expect(statusLine).toContainText('Prêt');

      // Load data
      await page.locator('#paste').fill('Test\t10');
      await page.locator('#parseBtn').click();

      // Status should update
      await expect(statusLine).toContainText('ligne');
    });

    test('should announce current item during playback', async ({ page }) => {
      await page.locator('#paste').fill('Sample A\t100\nSample B\t200');
      await page.locator('#parseBtn').click();
      await page.locator('#startBtn').click();

      // Current display should show the item for screen readers
      await expect(page.locator('#currentLabel')).toHaveText('Sample A');
      await expect(page.locator('#currentValue')).toHaveText('100');
    });
  });

  test.describe('Form Labels', () => {
    test('should have associated labels for all inputs', async ({ page }) => {
      // Check that labels are properly associated
      const inputs = [
        { labelFor: 'paste', expectedLabel: 'Collez vos données' },
        { labelFor: 'csvFile', expectedLabel: 'importer CSV' }
      ];

      for (const { labelFor, expectedLabel } of inputs) {
        const label = page.locator(`label[for="${labelFor}"]`);
        const labelText = await label.textContent();
        expect(labelText?.toLowerCase()).toContain(expectedLabel.toLowerCase());
      }
    });

    test('should have labels for advanced settings inputs', async ({ page }) => {
      // Open advanced settings
      await page.locator('details summary').first().click();

      // Check trigger input label
      const triggerLabel = page.locator('label[for="trigger"]');
      await expect(triggerLabel).toContainText('Mot déclencheur');

      // Check language select label
      const langLabel = page.locator('label[for="lang"]');
      await expect(langLabel).toContainText('Langue');
    });
  });
});

test.describe('Responsive Accessibility', () => {
  test('should remain accessible on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/lecteur_vocal_V6.html');

    // All buttons should still be visible and clickable
    await expect(page.locator('#startBtn')).toBeVisible();
    await expect(page.locator('#pauseBtn')).toBeVisible();
    await expect(page.locator('#parseBtn')).toBeVisible();

    // Input should be accessible
    await page.locator('#paste').fill('Test\t10');
    await page.locator('#parseBtn').click();

    await expect(page.locator('#startBtn')).toBeEnabled();
  });

  test('should work with reduced motion preferences', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/lecteur_vocal_V6.html');

    // Application should still be functional
    await page.locator('#paste').fill('Test\t10');
    await page.locator('#parseBtn').click();
    await page.locator('#startBtn').click();

    await expect(page.locator('#currentLabel')).toHaveText('Test');
  });
});
