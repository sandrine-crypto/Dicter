/**
 * Cross-browser and responsive design E2E tests
 * Tests compatibility across browsers and device sizes
 */

import { test, expect, devices } from '@playwright/test';

// Test on different viewport sizes
const viewports = {
  mobile: { width: 375, height: 667 },    // iPhone SE
  mobileLarge: { width: 414, height: 896 }, // iPhone XR
  tablet: { width: 768, height: 1024 },    // iPad
  tabletLandscape: { width: 1024, height: 768 }, // iPad Landscape
  desktop: { width: 1280, height: 800 },
  desktopLarge: { width: 1920, height: 1080 }
};

test.describe('Core Functionality - All Browsers', () => {
  test('should load application correctly', async ({ page }) => {
    await page.goto('/lecteur_vocal_V6.html');

    // Check main elements exist
    await expect(page.locator('header h1')).toContainText('Lecteur vocal');
    await expect(page.locator('#paste')).toBeVisible();
    await expect(page.locator('#startBtn')).toBeVisible();
  });

  test('should parse and display data', async ({ page }) => {
    await page.goto('/lecteur_vocal_V6.html');

    // Input test data
    await page.locator('#paste').fill('Échantillon 1\t12,34\nÉchantillon 2\t56,78');
    await page.locator('#parseBtn').click();

    // Verify data parsed correctly
    await expect(page.locator('#itemsBadge')).toContainText('2 lignes');

    // Verify table populated
    const rows = page.locator('#dataTable tr');
    await expect(rows).toHaveCount(2);
  });

  test('should handle playback controls', async ({ page }) => {
    await page.goto('/lecteur_vocal_V6.html');

    await page.locator('#paste').fill('Test A\t10\nTest B\t20\nTest C\t30');
    await page.locator('#parseBtn').click();

    // Start
    await page.locator('#startBtn').click();
    await expect(page.locator('#currentLabel')).toHaveText('Test A');
    await expect(page.locator('#startBtn')).toBeDisabled();

    // Next
    await page.locator('#nextBtn').click();
    await expect(page.locator('#currentLabel')).toHaveText('Test B');

    // Previous
    await page.locator('#prevBtn').click();
    await expect(page.locator('#currentLabel')).toHaveText('Test A');

    // Pause
    await page.locator('#pauseBtn').click();
    await expect(page.locator('#resumeBtn')).toBeEnabled();

    // Resume
    await page.locator('#resumeBtn').click();
    await expect(page.locator('#pauseBtn')).toBeEnabled();

    // Stop
    await page.locator('#stopBtn').click();
    await expect(page.locator('#currentLabel')).toHaveText('—');
    await expect(page.locator('#startBtn')).toBeEnabled();
  });

  test('should handle number formats correctly', async ({ page }) => {
    await page.goto('/lecteur_vocal_V6.html');

    // Test European decimal format
    await page.locator('#paste').fill('Euro format\t1234,56');
    await page.locator('#parseBtn').click();

    const cell = page.locator('#dataTable tr:first-child td:nth-child(3)');
    await expect(cell).toContainText('1234.56');
  });
});

test.describe('Tablet Compatibility', () => {
  test('should work on iPad viewport', async ({ page }) => {
    await page.setViewportSize(viewports.tablet);
    await page.goto('/lecteur_vocal_V6.html');

    // Layout should be single column on tablet
    const layout = page.locator('.layout');
    const layoutStyle = await layout.evaluate(el => window.getComputedStyle(el).gridTemplateColumns);

    // All buttons should be accessible
    await expect(page.locator('#startBtn')).toBeVisible();
    await expect(page.locator('#parseBtn')).toBeVisible();
    await expect(page.locator('#loadCsvBtn')).toBeVisible();

    // Test full workflow
    await page.locator('#paste').fill('Tablet Test\t99');
    await page.locator('#parseBtn').click();
    await page.locator('#startBtn').click();

    await expect(page.locator('#currentLabel')).toHaveText('Tablet Test');
  });

  test('should work on iPad landscape', async ({ page }) => {
    await page.setViewportSize(viewports.tabletLandscape);
    await page.goto('/lecteur_vocal_V6.html');

    // Two-column layout might be active
    await expect(page.locator('.panel.reading')).toBeVisible();
    await expect(page.locator('.panel.data')).toBeVisible();

    // Buttons should be tappable
    await page.locator('#paste').fill('Landscape Test\t50');
    await page.locator('#parseBtn').click();

    await expect(page.locator('#startBtn')).toBeEnabled();
  });

  test('should handle touch interactions', async ({ page }) => {
    await page.setViewportSize(viewports.tablet);
    await page.goto('/lecteur_vocal_V6.html');

    // Simulate touch tap on textarea
    await page.locator('#paste').tap();
    await page.locator('#paste').fill('Touch Test\t100');

    // Tap parse button
    await page.locator('#parseBtn').tap();

    await expect(page.locator('#itemsBadge')).toContainText('1 ligne');

    // Tap start button
    await page.locator('#startBtn').tap();

    await expect(page.locator('#currentLabel')).toHaveText('Touch Test');
  });

  test('should support touch navigation controls', async ({ page }) => {
    await page.setViewportSize(viewports.tablet);
    await page.goto('/lecteur_vocal_V6.html');

    await page.locator('#paste').fill('Item 1\t10\nItem 2\t20');
    await page.locator('#parseBtn').tap();
    await page.locator('#startBtn').tap();

    // Tap next
    await page.locator('#nextBtn').tap();
    await expect(page.locator('#currentLabel')).toHaveText('Item 2');

    // Tap prev
    await page.locator('#prevBtn').tap();
    await expect(page.locator('#currentLabel')).toHaveText('Item 1');

    // Tap stop
    await page.locator('#stopBtn').tap();
    await expect(page.locator('#startBtn')).toBeEnabled();
  });
});

test.describe('Mobile Compatibility', () => {
  test('should work on mobile viewport', async ({ page }) => {
    await page.setViewportSize(viewports.mobile);
    await page.goto('/lecteur_vocal_V6.html');

    // Header should be visible
    await expect(page.locator('header')).toBeVisible();

    // Controls should be accessible (may need to scroll)
    await expect(page.locator('#paste')).toBeVisible();

    // Test input
    await page.locator('#paste').fill('Mobile Test\t25');
    await page.locator('#parseBtn').click();

    await expect(page.locator('#startBtn')).toBeEnabled();
  });

  test('should have readable text on mobile', async ({ page }) => {
    await page.setViewportSize(viewports.mobile);
    await page.goto('/lecteur_vocal_V6.html');

    // Check font sizes are reasonable
    const labelFontSize = await page.locator('.label').evaluate(el =>
      parseInt(window.getComputedStyle(el).fontSize)
    );

    // Label should be at least 48px on mobile (from clamp)
    expect(labelFontSize).toBeGreaterThanOrEqual(48);
  });

  test('should handle scroll on mobile', async ({ page }) => {
    await page.setViewportSize(viewports.mobile);
    await page.goto('/lecteur_vocal_V6.html');

    // Scroll to data panel
    await page.locator('.panel.data').scrollIntoViewIfNeeded();

    // File input should be visible after scroll
    await expect(page.locator('#csvFile')).toBeVisible();
  });
});

test.describe('Desktop Compatibility', () => {
  test('should show two-column layout on desktop', async ({ page }) => {
    await page.setViewportSize(viewports.desktopLarge);
    await page.goto('/lecteur_vocal_V6.html');

    // Both panels should be side by side
    const readingPanel = page.locator('.panel.reading');
    const dataPanel = page.locator('.panel.data');

    const readingBox = await readingPanel.boundingBox();
    const dataBox = await dataPanel.boundingBox();

    // Panels should be horizontally aligned (side by side)
    expect(Math.abs(readingBox.y - dataBox.y)).toBeLessThan(50);
  });

  test('should have larger display on desktop', async ({ page }) => {
    await page.setViewportSize(viewports.desktopLarge);
    await page.goto('/lecteur_vocal_V6.html');

    const valueFontSize = await page.locator('.value').evaluate(el =>
      parseInt(window.getComputedStyle(el).fontSize)
    );

    // Value should be larger on desktop
    expect(valueFontSize).toBeGreaterThan(100);
  });
});

test.describe('Browser-Specific Features', () => {
  test('should handle clipboard paste', async ({ page, browserName }) => {
    await page.goto('/lecteur_vocal_V6.html');

    // Different browsers may handle paste differently
    await page.locator('#paste').focus();

    // Simulate paste by filling
    await page.locator('#paste').fill('Clipboard Test\t42');
    await page.locator('#parseBtn').click();

    await expect(page.locator('#itemsBadge')).toContainText('1 ligne');
  });

  test('should handle file input', async ({ page }) => {
    await page.goto('/lecteur_vocal_V6.html');

    // Check file input accepts correct types
    const fileInput = page.locator('#csvFile');
    const acceptAttr = await fileInput.getAttribute('accept');

    expect(acceptAttr).toContain('.csv');
    expect(acceptAttr).toContain('.txt');
    expect(acceptAttr).toContain('.tsv');
    expect(acceptAttr).toContain('.xlsx');
  });

  test('should handle range inputs', async ({ page }) => {
    await page.goto('/lecteur_vocal_V6.html');

    // Open advanced settings
    await page.locator('details summary').first().click();

    // Change rate slider
    const rateSlider = page.locator('#rate');
    await rateSlider.fill('1.5');

    const rateValue = page.locator('#rateVal');
    await expect(rateValue).toHaveText('1.5');

    // Change pitch slider
    const pitchSlider = page.locator('#pitch');
    await pitchSlider.fill('0.8');

    const pitchValue = page.locator('#pitchVal');
    await expect(pitchValue).toHaveText('0.8');
  });

  test('should handle select dropdown', async ({ page }) => {
    await page.goto('/lecteur_vocal_V6.html');

    // Open advanced settings
    await page.locator('details summary').first().click();

    // Change language
    await page.locator('#lang').selectOption('en-US');

    const selectedValue = await page.locator('#lang').inputValue();
    expect(selectedValue).toBe('en-US');
  });
});

test.describe('Advanced Settings Panel', () => {
  for (const [name, viewport] of Object.entries(viewports)) {
    test(`should toggle details panel on ${name}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto('/lecteur_vocal_V6.html');

      const details = page.locator('details').first();
      const summary = page.locator('details summary').first();

      // Initially closed
      await expect(details).not.toHaveAttribute('open');

      // Click to open
      await summary.click();
      await expect(details).toHaveAttribute('open', '');

      // Click to close
      await summary.click();
      await expect(details).not.toHaveAttribute('open');
    });
  }
});

test.describe('Data Table Responsiveness', () => {
  test('should scroll table on mobile', async ({ page }) => {
    await page.setViewportSize(viewports.mobile);
    await page.goto('/lecteur_vocal_V6.html');

    // Add many items
    const data = Array.from({ length: 20 }, (_, i) => `Item ${i + 1}\t${i * 10}`).join('\n');
    await page.locator('#paste').fill(data);
    await page.locator('#parseBtn').click();

    // Table container should be scrollable
    const tableScroll = page.locator('.table-scroll');
    const scrollHeight = await tableScroll.evaluate(el => el.scrollHeight);
    const clientHeight = await tableScroll.evaluate(el => el.clientHeight);

    expect(scrollHeight).toBeGreaterThan(clientHeight);
  });

  test('should highlight active row on all viewports', async ({ page }) => {
    for (const [name, viewport] of Object.entries(viewports)) {
      await page.setViewportSize(viewport);
      await page.goto('/lecteur_vocal_V6.html');

      await page.locator('#paste').fill('Row 1\t10\nRow 2\t20');
      await page.locator('#parseBtn').click();
      await page.locator('#startBtn').click();

      // First row should be active
      const activeRow = page.locator('#dataTable tr.active');
      await expect(activeRow).toHaveCount(1);
      await expect(activeRow).toContainText('Row 1');
    }
  });
});

test.describe('Performance', () => {
  test('should handle large datasets', async ({ page }) => {
    await page.goto('/lecteur_vocal_V6.html');

    // Create large dataset
    const data = Array.from({ length: 100 }, (_, i) =>
      `Sample ${i + 1}\t${(Math.random() * 1000).toFixed(2)}`
    ).join('\n');

    await page.locator('#paste').fill(data);

    const startTime = Date.now();
    await page.locator('#parseBtn').click();
    const endTime = Date.now();

    // Should parse within 1 second
    expect(endTime - startTime).toBeLessThan(1000);

    await expect(page.locator('#itemsBadge')).toContainText('100 lignes');
  });
});
