/**
 * Error handling tests for the Lecteur Vocal application
 * Tests edge cases, error conditions, and recovery scenarios
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  sanitizeString,
  escapeHtml,
  normalizeDecimal,
  detectDelimiter,
  parseCSVLine,
  parseText,
  parseCSV,
  createInitialState,
  canPerformAction,
  getButtonStates,
  validateTriggerWord
} from '../../src/core.js';
import {
  createTTSController,
  createSpeechRecognitionController,
  createAutoAdvanceController,
  createAppController
} from '../../src/controller.js';

describe('Input Validation Error Handling', () => {
  describe('sanitizeString error handling', () => {
    it('should handle all falsy values', () => {
      expect(sanitizeString(null)).toBe('');
      expect(sanitizeString(undefined)).toBe('');
      expect(sanitizeString('')).toBe('');
      expect(sanitizeString(0)).toBe('');
      expect(sanitizeString(false)).toBe('');
      expect(sanitizeString(NaN)).toBe('');
    });

    it('should handle non-primitive values', () => {
      expect(sanitizeString({})).toBe('');
      expect(sanitizeString([])).toBe('');
      expect(sanitizeString(() => {})).toBe('');
      expect(sanitizeString(Symbol('test'))).toBe('');
    });

    it('should handle objects with toString', () => {
      const obj = { toString: () => 'test' };
      expect(sanitizeString(obj)).toBe('');
    });
  });

  describe('normalizeDecimal error handling', () => {
    it('should handle malformed number strings', () => {
      expect(normalizeDecimal('..').value).toBe(null);
      expect(normalizeDecimal(',,').value).toBe(null);
      expect(normalizeDecimal('.,.,').value).toBe(null);
      expect(normalizeDecimal('1.2.3.4').value).toBe(null);
    });

    it('should handle special characters', () => {
      expect(normalizeDecimal('$100').value).toBe(null);
      expect(normalizeDecimal('100€').value).toBe(null);
      expect(normalizeDecimal('+100').value).toBe(100);
      expect(normalizeDecimal('-100').value).toBe(-100);
    });

    it('should handle very large numbers', () => {
      const bigNum = '9'.repeat(100);
      const result = normalizeDecimal(bigNum);
      expect(result.value).toBe(Infinity);
    });

    it('should handle scientific notation', () => {
      expect(normalizeDecimal('1e10').value).toBe(1e10);
      expect(normalizeDecimal('1E-5').value).toBe(1e-5);
    });

    it('should handle infinity strings', () => {
      expect(normalizeDecimal('Infinity').value).toBe(Infinity);
      expect(normalizeDecimal('-Infinity').value).toBe(-Infinity);
    });
  });

  describe('parseCSVLine error handling', () => {
    it('should handle unclosed quotes', () => {
      // Unclosed quote should not crash
      const result = parseCSVLine('"unclosed,value', ',');
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle mixed quote styles', () => {
      const result = parseCSVLine("'single',\"double\"", ',');
      expect(result).toHaveLength(2);
    });

    it('should handle binary data', () => {
      const binaryStr = String.fromCharCode(0, 1, 2, 3);
      const result = parseCSVLine(binaryStr, ',');
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle unicode edge cases', () => {
      // Zero-width characters
      const zwj = 'a\u200Bb\u200Cc';
      const result = parseCSVLine(zwj, ',');
      expect(result).toHaveLength(1);
    });
  });

  describe('detectDelimiter error handling', () => {
    it('should handle non-string input', () => {
      expect(detectDelimiter(null)).toBe(';');
      expect(detectDelimiter(undefined)).toBe(';');
      expect(detectDelimiter(123)).toBe(';');
      expect(detectDelimiter({})).toBe(';');
    });

    it('should handle strings with only whitespace', () => {
      expect(detectDelimiter('   \n\n\t\t')).toBe(';');
    });

    it('should handle very long input', () => {
      const longInput = ('a;b;c\n').repeat(10000);
      expect(detectDelimiter(longInput)).toBe(';');
    });
  });
});

describe('TTS Error Handling', () => {
  describe('unavailable TTS', () => {
    it('should reject when TTS not available', async () => {
      const tts = createTTSController({
        speechSynthesis: null,
        SpeechSynthesisUtterance: null
      });

      await expect(tts.speak('test')).rejects.toThrow('TTS not available');
      expect(tts.isAvailable()).toBe(false);
    });
  });

  describe('TTS errors during speech', () => {
    it('should handle synthesis errors', async () => {
      const mockSynth = {
        speak: vi.fn((utterance) => {
          setTimeout(() => {
            utterance.onerror({ error: 'synthesis-failed' });
          }, 10);
        }),
        cancel: vi.fn()
      };

      const mockUtterance = vi.fn().mockImplementation((text) => ({
        text,
        onend: null,
        onerror: null
      }));

      const tts = createTTSController({
        speechSynthesis: mockSynth,
        SpeechSynthesisUtterance: mockUtterance
      });

      await expect(tts.speak('test')).rejects.toThrow('TTS error');
    });

    it('should handle network errors', async () => {
      const mockSynth = {
        speak: vi.fn((utterance) => {
          setTimeout(() => {
            utterance.onerror({ error: 'network' });
          }, 10);
        }),
        cancel: vi.fn()
      };

      const mockUtterance = vi.fn().mockImplementation((text) => ({
        text,
        onend: null,
        onerror: null
      }));

      const tts = createTTSController({
        speechSynthesis: mockSynth,
        SpeechSynthesisUtterance: mockUtterance
      });

      await expect(tts.speak('test')).rejects.toThrow();
    });

    it('should handle speak exceptions', async () => {
      const mockSynth = {
        speak: vi.fn(() => {
          throw new Error('Browser error');
        }),
        cancel: vi.fn()
      };

      const mockUtterance = vi.fn().mockImplementation((text) => ({
        text,
        onend: null,
        onerror: null
      }));

      const tts = createTTSController({
        speechSynthesis: mockSynth,
        SpeechSynthesisUtterance: mockUtterance
      });

      await expect(tts.speak('test')).rejects.toThrow('Browser error');
    });
  });

  describe('cancel during speech', () => {
    it('should handle cancel errors gracefully', () => {
      const mockSynth = {
        speak: vi.fn(),
        cancel: vi.fn(() => {
          throw new Error('Cancel failed');
        })
      };

      const mockUtterance = vi.fn().mockImplementation((text) => ({
        text,
        onend: null,
        onerror: null
      }));

      const tts = createTTSController({
        speechSynthesis: mockSynth,
        SpeechSynthesisUtterance: mockUtterance
      });

      // Should not throw
      expect(() => tts.cancel()).not.toThrow();
    });
  });
});

describe('Speech Recognition Error Handling', () => {
  describe('unavailable recognition', () => {
    it('should handle missing API', () => {
      const recognition = createSpeechRecognitionController({
        SpeechRecognition: null
      });

      expect(recognition.isAvailable()).toBe(false);
      expect(recognition.start()).toBe(false);
    });
  });

  describe('recognition errors', () => {
    let MockSpeechRecognition;
    let mockInstance;

    beforeEach(() => {
      mockInstance = {
        lang: 'fr-FR',
        continuous: false,
        interimResults: false,
        start: vi.fn(),
        stop: vi.fn(),
        onstart: null,
        onend: null,
        onerror: null,
        onresult: null
      };

      MockSpeechRecognition = vi.fn().mockImplementation(() => mockInstance);
    });

    it('should handle no-speech error', () => {
      const onStatus = vi.fn();
      const recognition = createSpeechRecognitionController({
        SpeechRecognition: MockSpeechRecognition,
        onStatusChange: onStatus
      });

      recognition.start();
      mockInstance.onerror({ error: 'no-speech' });

      expect(onStatus).toHaveBeenCalledWith('error', 'no-speech');
    });

    it('should handle audio-capture error', () => {
      const onStatus = vi.fn();
      const recognition = createSpeechRecognitionController({
        SpeechRecognition: MockSpeechRecognition,
        onStatusChange: onStatus
      });

      recognition.start();
      mockInstance.onerror({ error: 'audio-capture' });

      expect(onStatus).toHaveBeenCalledWith('error', 'audio-capture');
    });

    it('should handle not-allowed error', () => {
      const onStatus = vi.fn();
      const recognition = createSpeechRecognitionController({
        SpeechRecognition: MockSpeechRecognition,
        onStatusChange: onStatus
      });

      recognition.start();
      mockInstance.onerror({ error: 'not-allowed' });

      expect(onStatus).toHaveBeenCalledWith('error', 'not-allowed');
    });

    it('should handle start when already running', () => {
      mockInstance.start.mockImplementation(() => {
        throw { name: 'InvalidStateError' };
      });

      const recognition = createSpeechRecognitionController({
        SpeechRecognition: MockSpeechRecognition
      });

      // Should not throw
      expect(() => recognition.start()).not.toThrow();
    });

    it('should handle stop errors', () => {
      mockInstance.stop.mockImplementation(() => {
        throw new Error('Stop failed');
      });

      const recognition = createSpeechRecognitionController({
        SpeechRecognition: MockSpeechRecognition
      });

      recognition.start();

      // Should not throw
      expect(() => recognition.stop()).not.toThrow();
    });
  });
});

describe('Auto Advance Error Handling', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should handle negative delay', () => {
    const controller = createAutoAdvanceController({ delay: -5 });
    expect(controller.getDelay()).toBe(-5);

    const onAdvance = vi.fn();
    controller.schedule();

    vi.advanceTimersByTime(10000);

    // Should not advance with negative delay
    expect(onAdvance).not.toHaveBeenCalled();
  });

  it('should handle NaN delay', () => {
    const controller = createAutoAdvanceController({ delay: 5 });
    controller.setDelay('invalid');

    expect(controller.getDelay()).toBe(0);
  });

  it('should handle callback errors', () => {
    const onAdvance = vi.fn(() => {
      throw new Error('Callback error');
    });

    const controller = createAutoAdvanceController({
      delay: 1,
      onAdvance
    });

    controller.schedule();

    // Should not propagate error
    expect(() => vi.advanceTimersByTime(2000)).toThrow('Callback error');
  });
});

describe('Application Controller Error Handling', () => {
  let mockTTS;
  let mockRecognition;
  let mockAutoAdvance;

  beforeEach(() => {
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

  it('should handle TTS errors during playback', async () => {
    mockTTS.speak.mockRejectedValue(new Error('TTS failed'));

    const app = createAppController({
      tts: mockTTS,
      recognition: mockRecognition,
      autoAdvance: mockAutoAdvance
    });

    app.loadData('test\t10');

    // Should not throw, should continue
    await expect(app.start()).resolves.toBe(true);
  });

  it('should handle malformed data', () => {
    const app = createAppController({
      tts: mockTTS,
      recognition: mockRecognition,
      autoAdvance: mockAutoAdvance
    });

    const count = app.loadData('invalid data without tabs');

    expect(count).toBe(0);
    expect(app.getState().items).toHaveLength(0);
  });

  it('should handle rapid state changes', async () => {
    const app = createAppController({
      tts: mockTTS,
      recognition: mockRecognition,
      autoAdvance: mockAutoAdvance
    });

    app.loadData('a\t1\nb\t2\nc\t3');

    // Rapid fire actions
    await app.start();
    app.pause();
    await app.resume();
    await app.next();
    await app.prev();
    app.stop();

    expect(app.getState().idx).toBe(-1);
  });

  it('should handle operations on stopped player', async () => {
    const app = createAppController({
      tts: mockTTS,
      recognition: mockRecognition,
      autoAdvance: mockAutoAdvance
    });

    app.loadData('test\t10');

    // Operations on stopped player
    expect(app.pause()).toBe(false);
    expect(await app.resume()).toBe(false);
    expect(await app.prev()).toBe(false);
    expect(await app.next()).toBe(false);
  });
});

describe('State Corruption Prevention', () => {
  it('should prevent negative index', () => {
    const state = createInitialState();
    state.items = [{ label: 'test', value: 1 }];
    state.idx = -5;

    expect(canPerformAction(state, 'prev')).toBe(false);
    expect(canPerformAction(state, 'next')).toBe(false);
    expect(canPerformAction(state, 'stop')).toBe(false);
  });

  it('should handle index beyond items', () => {
    const state = createInitialState();
    state.items = [{ label: 'test', value: 1 }];
    state.idx = 100;

    const buttons = getButtonStates(state);

    expect(buttons.prevDisabled).toBe(false);
    expect(buttons.nextDisabled).toBe(true);
  });

  it('should handle empty items array with positive index', () => {
    const state = createInitialState();
    state.items = [];
    state.idx = 0;

    const buttons = getButtonStates(state);

    expect(buttons.startDisabled).toBe(true);
  });
});

describe('Trigger Word Validation Errors', () => {
  it('should handle all types of invalid input', () => {
    expect(validateTriggerWord(null)).toBe('');
    expect(validateTriggerWord(undefined)).toBe('');
    expect(validateTriggerWord(123)).toBe('');
    expect(validateTriggerWord({})).toBe('');
    expect(validateTriggerWord([])).toBe('');
  });

  it('should handle strings with only numbers', () => {
    expect(validateTriggerWord('12345')).toBe('');
  });

  it('should handle strings with only special characters', () => {
    expect(validateTriggerWord('!@#$%')).toBe('');
  });

  it('should handle unicode characters', () => {
    expect(validateTriggerWord('日本語')).toBe('');
    expect(validateTriggerWord('émoji')).toBe('moji'); // accented e is removed
  });
});
