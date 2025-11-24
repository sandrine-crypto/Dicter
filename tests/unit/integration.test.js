/**
 * Integration tests for the Lecteur Vocal application
 * Tests end-to-end workflows
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  parseText,
  parseCSV,
  normalizeDecimal,
  sanitizeString,
  createInitialState,
  getButtonStates,
  canPerformAction,
  getCurrentItem,
  buildSpeechSentence
} from '../../src/core.js';
import {
  createAppController,
  createTTSController,
  createSpeechRecognitionController,
  createAutoAdvanceController
} from '../../src/controller.js';

describe('Data Import to Display Flow', () => {
  describe('TSV data flow', () => {
    it('should process pasted TSV data correctly', () => {
      const input = `Échantillon 1\t12,34
Échantillon 2\t56,78
Échantillon 3\t90.12`;

      const items = parseText(input);

      expect(items).toHaveLength(3);
      expect(items[0]).toEqual({
        label: 'Échantillon 1',
        display: '12,34',
        value: 12.34,
        raw: '12,34'
      });
      expect(items[1].value).toBe(56.78);
      expect(items[2].display).toBe('90,12'); // Dot converted to comma
    });

    it('should handle real-world Excel paste data', () => {
      // Simulating copy from Excel
      const excelPaste = `"Sample A"\t"1,234.56"
"Sample B"\t"7.890,12"
"Sample C"\t"100"`;

      const items = parseText(excelPaste);

      // Note: parseText expects TAB separator, Excel quotes won't be stripped
      expect(items).toHaveLength(3);
    });

    it('should skip malformed lines', () => {
      const input = `Valid\t10
Invalid without tab
Also Valid\t20
\t30
Empty\t`;

      const items = parseText(input);

      expect(items).toHaveLength(2);
      expect(items[0].label).toBe('Valid');
      expect(items[1].label).toBe('Also Valid');
    });
  });

  describe('CSV data flow', () => {
    it('should process CSV file content correctly', () => {
      const csvContent = `Échantillon 1;12,34
Échantillon 2;56,78
Échantillon 3;90,12`;

      const items = parseCSV(csvContent);

      expect(items).toHaveLength(3);
      expect(items[0].value).toBe(12.34);
      expect(items[1].value).toBe(56.78);
      expect(items[2].value).toBe(90.12);
    });

    it('should handle CSV with quoted fields containing delimiters', () => {
      const csvContent = `"Sample, with comma";10
"Normal sample";20`;

      const items = parseCSV(csvContent, ',');

      expect(items).toHaveLength(2);
      expect(items[0].label).toBe('Sample, with comma');
    });

    it('should auto-detect delimiter', () => {
      const semicolonCSV = 'a;1\nb;2\nc;3';
      const commaCSV = 'a,1\nb,2\nc,3';

      expect(parseCSV(semicolonCSV)).toHaveLength(3);
      expect(parseCSV(commaCSV)).toHaveLength(3);
    });
  });

  describe('Number format handling', () => {
    it('should handle European number formats', () => {
      const europeanNumbers = [
        '1.234,56',  // German/French with thousands separator
        '1234,56',   // Simple European decimal
        '0,5',       // European decimal less than 1
      ];

      europeanNumbers.forEach(num => {
        const result = normalizeDecimal(num);
        expect(result.value).not.toBe(null);
        expect(typeof result.value).toBe('number');
      });
    });

    it('should handle US number formats', () => {
      const usNumbers = [
        '1,234.56',  // US with thousands separator
        '1234.56',   // Simple US decimal
        '0.5',       // US decimal less than 1
      ];

      usNumbers.forEach(num => {
        const result = normalizeDecimal(num);
        expect(result.value).not.toBe(null);
        expect(typeof result.value).toBe('number');
      });
    });

    it('should reject invalid formats', () => {
      const invalidNumbers = [
        '1 234,56',  // Space as thousands separator
        'abc',       // Non-numeric
        '',          // Empty
      ];

      invalidNumbers.forEach(num => {
        const result = normalizeDecimal(num);
        expect(result.value).toBe(null);
      });
    });
  });
});

describe('Playback State Machine', () => {
  it('should follow correct state transitions', () => {
    const state = createInitialState();
    state.items = [
      { label: 'A', display: '1', value: 1, raw: '1' },
      { label: 'B', display: '2', value: 2, raw: '2' },
      { label: 'C', display: '3', value: 3, raw: '3' }
    ];

    // Initial state: can only start
    expect(canPerformAction(state, 'start')).toBe(true);
    expect(canPerformAction(state, 'pause')).toBe(false);
    expect(canPerformAction(state, 'stop')).toBe(false);

    // Start playback
    state.idx = 0;
    state.paused = false;

    // Running state: can pause, stop, next (not prev at first item)
    expect(canPerformAction(state, 'start')).toBe(false);
    expect(canPerformAction(state, 'pause')).toBe(true);
    expect(canPerformAction(state, 'prev')).toBe(false);
    expect(canPerformAction(state, 'next')).toBe(true);
    expect(canPerformAction(state, 'stop')).toBe(true);

    // Move to middle
    state.idx = 1;
    expect(canPerformAction(state, 'prev')).toBe(true);
    expect(canPerformAction(state, 'next')).toBe(true);

    // Move to last
    state.idx = 2;
    expect(canPerformAction(state, 'prev')).toBe(true);
    expect(canPerformAction(state, 'next')).toBe(false);

    // Pause
    state.paused = true;
    expect(canPerformAction(state, 'pause')).toBe(false);
    expect(canPerformAction(state, 'resume')).toBe(true);

    // Resume
    state.paused = false;
    expect(canPerformAction(state, 'pause')).toBe(true);
    expect(canPerformAction(state, 'resume')).toBe(false);

    // Stop
    state.idx = -1;
    expect(canPerformAction(state, 'start')).toBe(true);
    expect(canPerformAction(state, 'stop')).toBe(false);
  });

  it('should update button states correctly throughout playback', () => {
    const state = createInitialState();
    state.items = [{ label: 'A', value: 1 }, { label: 'B', value: 2 }];

    // Not started
    let buttons = getButtonStates(state);
    expect(buttons.startDisabled).toBe(false);
    expect(buttons.pauseDisabled).toBe(true);
    expect(buttons.stopDisabled).toBe(true);

    // Running
    state.idx = 0;
    buttons = getButtonStates(state);
    expect(buttons.startDisabled).toBe(true);
    expect(buttons.pauseDisabled).toBe(false);
    expect(buttons.stopDisabled).toBe(false);

    // Paused
    state.paused = true;
    buttons = getButtonStates(state);
    expect(buttons.pauseDisabled).toBe(true);
    expect(buttons.resumeDisabled).toBe(false);
  });
});

describe('Speech Synthesis Flow', () => {
  it('should build correct speech sentences', () => {
    const items = parseText('échantillon 1\t12,34\néchantillon 2\t56,78');

    const state = { items, idx: 0 };
    const item = getCurrentItem(state);
    const sentence = buildSpeechSentence(item);

    expect(sentence).toBe('échantillon 1. 12,34');
  });

  it('should handle special characters in labels', () => {
    const items = parseText('Test & Sample\t10\nÉchantillon #2\t20');

    expect(items[0].label).not.toContain('&'); // Sanitized
    expect(items[1].label).toBe('Échantillon #2');
  });
});

describe('Full Application Flow', () => {
  let mockTTS;
  let mockRecognition;
  let mockAutoAdvance;

  beforeEach(() => {
    vi.useFakeTimers();

    mockTTS = {
      isAvailable: vi.fn().mockReturnValue(true),
      speak: vi.fn().mockResolvedValue(),
      cancel: vi.fn(),
      isSpeaking: vi.fn().mockReturnValue(false),
      updateSettings: vi.fn()
    };

    mockRecognition = {
      isAvailable: vi.fn().mockReturnValue(true),
      start: vi.fn().mockReturnValue(true),
      stop: vi.fn(),
      setTriggerWord: vi.fn(),
      setLang: vi.fn(),
      isListening: vi.fn().mockReturnValue(false)
    };

    mockAutoAdvance = {
      schedule: vi.fn(),
      clear: vi.fn(),
      setDelay: vi.fn(),
      getDelay: vi.fn().mockReturnValue(10),
      isScheduled: vi.fn().mockReturnValue(false)
    };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should handle complete playback cycle', async () => {
    const stateChanges = [];
    const app = createAppController({
      tts: mockTTS,
      recognition: mockRecognition,
      autoAdvance: mockAutoAdvance,
      onStateChange: (state) => stateChanges.push({ ...state })
    });

    // Load data
    app.loadData('Item A\t10\nItem B\t20\nItem C\t30');

    expect(app.getState().items).toHaveLength(3);

    // Start playback
    await app.start();

    expect(app.getState().idx).toBe(0);
    expect(mockTTS.speak).toHaveBeenCalled();
    expect(mockRecognition.start).toHaveBeenCalled();

    // Navigate next
    await app.next();
    expect(app.getState().idx).toBe(1);

    // Navigate next again
    await app.next();
    expect(app.getState().idx).toBe(2);

    // Navigate previous
    await app.prev();
    expect(app.getState().idx).toBe(1);

    // Pause
    app.pause();
    expect(app.getState().paused).toBe(true);
    expect(mockTTS.cancel).toHaveBeenCalled();

    // Resume
    await app.resume();
    expect(app.getState().paused).toBe(false);

    // Stop
    app.stop();
    expect(app.getState().idx).toBe(-1);
  });

  it('should stop at end of items', async () => {
    const app = createAppController({
      tts: mockTTS,
      recognition: mockRecognition,
      autoAdvance: mockAutoAdvance
    });

    app.loadData('Item A\t10');
    await app.start();

    expect(app.getState().idx).toBe(0);

    // Try to go next on last item
    await app.next();

    expect(app.getState().idx).toBe(-1); // Stopped
  });

  it('should handle empty data gracefully', async () => {
    const app = createAppController({
      tts: mockTTS,
      recognition: mockRecognition,
      autoAdvance: mockAutoAdvance
    });

    app.loadData('');

    expect(app.getState().items).toHaveLength(0);

    const result = await app.start();

    expect(result).toBe(false);
  });
});

describe('Security Integration', () => {
  it('should sanitize XSS attempts throughout the flow', () => {
    const maliciousInput = `<script>alert('xss')</script>\t10
<img src=x onerror="alert(1)">\t20
normal\t30`;

    const items = parseText(maliciousInput);

    items.forEach(item => {
      expect(item.label).not.toContain('<script>');
      expect(item.label).not.toContain('onerror');
      expect(item.label).not.toContain('<img');
    });
  });

  it('should handle long input gracefully', () => {
    const longLabel = 'a'.repeat(500);
    const input = `${longLabel}\t10`;

    const items = parseText(input);

    expect(items[0].label.length).toBeLessThanOrEqual(200);
  });
});

describe('Decimal Conversion Consistency', () => {
  it('should maintain consistency through parse and display', () => {
    const testCases = [
      { input: '12,34', expectedValue: 12.34 },
      { input: '12.34', expectedValue: 12.34 },
      { input: '1.234,56', expectedValue: 1234.56 },
      { input: '1,234.56', expectedValue: 1234.56 },
    ];

    testCases.forEach(({ input, expectedValue }) => {
      const result = normalizeDecimal(input);
      expect(result.value).toBeCloseTo(expectedValue, 2);
    });
  });
});
