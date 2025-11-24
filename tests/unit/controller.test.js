/**
 * Unit tests for controller module
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createTTSController,
  createSpeechRecognitionController,
  createAutoAdvanceController,
  createAppController,
  renderDataTable
} from '../../src/controller.js';

describe('createTTSController', () => {
  let mockSynth;
  let mockUtterance;
  let mockUtteranceInstance;

  beforeEach(() => {
    mockUtteranceInstance = {
      text: '',
      lang: 'fr-FR',
      rate: 1,
      pitch: 1,
      volume: 1,
      onend: null,
      onerror: null
    };

    mockUtterance = vi.fn().mockImplementation((text) => {
      mockUtteranceInstance.text = text;
      return mockUtteranceInstance;
    });

    mockSynth = {
      speak: vi.fn(),
      cancel: vi.fn()
    };
  });

  describe('isAvailable', () => {
    it('should return true when APIs are available', () => {
      const tts = createTTSController({
        speechSynthesis: mockSynth,
        SpeechSynthesisUtterance: mockUtterance
      });
      expect(tts.isAvailable()).toBe(true);
    });

    it('should return false when speechSynthesis is missing', () => {
      const tts = createTTSController({
        speechSynthesis: null,
        SpeechSynthesisUtterance: mockUtterance
      });
      expect(tts.isAvailable()).toBe(false);
    });

    it('should return false when Utterance is missing', () => {
      const tts = createTTSController({
        speechSynthesis: mockSynth,
        SpeechSynthesisUtterance: null
      });
      expect(tts.isAvailable()).toBe(false);
    });
  });

  describe('speak', () => {
    it('should speak text successfully', async () => {
      mockSynth.speak.mockImplementation((utterance) => {
        setTimeout(() => utterance.onend(), 10);
      });

      const tts = createTTSController({
        speechSynthesis: mockSynth,
        SpeechSynthesisUtterance: mockUtterance
      });

      await tts.speak('Hello');

      expect(mockUtterance).toHaveBeenCalledWith('Hello');
      expect(mockSynth.speak).toHaveBeenCalled();
    });

    it('should reject when TTS not available', async () => {
      const tts = createTTSController({
        speechSynthesis: null,
        SpeechSynthesisUtterance: null
      });

      await expect(tts.speak('Hello')).rejects.toThrow('TTS not available');
    });

    it('should resolve for empty text', async () => {
      const tts = createTTSController({
        speechSynthesis: mockSynth,
        SpeechSynthesisUtterance: mockUtterance
      });

      await tts.speak('');
      expect(mockSynth.speak).not.toHaveBeenCalled();
    });

    it('should use custom settings', async () => {
      mockSynth.speak.mockImplementation((utterance) => {
        setTimeout(() => utterance.onend(), 10);
      });

      const tts = createTTSController({
        speechSynthesis: mockSynth,
        SpeechSynthesisUtterance: mockUtterance
      });

      tts.updateSettings({ lang: 'en-US', rate: 1.5, pitch: 0.8, volume: 0.5 });
      await tts.speak('Hello');

      expect(mockUtteranceInstance.lang).toBe('en-US');
      expect(mockUtteranceInstance.rate).toBe(1.5);
      expect(mockUtteranceInstance.pitch).toBe(0.8);
      expect(mockUtteranceInstance.volume).toBe(0.5);
    });

    it('should handle TTS errors', async () => {
      mockSynth.speak.mockImplementation((utterance) => {
        setTimeout(() => utterance.onerror({ error: 'synthesis-failed' }), 10);
      });

      const tts = createTTSController({
        speechSynthesis: mockSynth,
        SpeechSynthesisUtterance: mockUtterance
      });

      await expect(tts.speak('Hello')).rejects.toThrow('TTS error');
    });

    it('should resolve for interrupted errors', async () => {
      mockSynth.speak.mockImplementation((utterance) => {
        setTimeout(() => utterance.onerror({ error: 'interrupted' }), 10);
      });

      const tts = createTTSController({
        speechSynthesis: mockSynth,
        SpeechSynthesisUtterance: mockUtterance
      });

      await tts.speak('Hello'); // Should not throw
    });
  });

  describe('cancel', () => {
    it('should cancel ongoing speech', async () => {
      mockSynth.speak.mockImplementation((utterance) => {
        setTimeout(() => utterance.onend(), 100);
      });

      const tts = createTTSController({
        speechSynthesis: mockSynth,
        SpeechSynthesisUtterance: mockUtterance
      });

      const speakPromise = tts.speak('Hello');
      tts.cancel();

      expect(mockSynth.cancel).toHaveBeenCalled();
    });
  });

  describe('isSpeaking', () => {
    it('should track speaking state', async () => {
      let resolveSpeak;
      mockSynth.speak.mockImplementation((utterance) => {
        new Promise(r => { resolveSpeak = r; }).then(() => utterance.onend());
      });

      const tts = createTTSController({
        speechSynthesis: mockSynth,
        SpeechSynthesisUtterance: mockUtterance
      });

      expect(tts.isSpeaking()).toBe(false);

      const speakPromise = tts.speak('Hello');
      expect(tts.isSpeaking()).toBe(true);

      resolveSpeak();
      await speakPromise;
      expect(tts.isSpeaking()).toBe(false);
    });
  });
});

describe('createSpeechRecognitionController', () => {
  let MockSpeechRecognition;
  let mockRecognizerInstance;

  beforeEach(() => {
    mockRecognizerInstance = {
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

    MockSpeechRecognition = vi.fn().mockImplementation(() => mockRecognizerInstance);
  });

  describe('isAvailable', () => {
    it('should return true when API is available', () => {
      const recognition = createSpeechRecognitionController({
        SpeechRecognition: MockSpeechRecognition
      });
      expect(recognition.isAvailable()).toBe(true);
    });

    it('should return false when API is not available', () => {
      const recognition = createSpeechRecognitionController({
        SpeechRecognition: null
      });
      expect(recognition.isAvailable()).toBe(false);
    });
  });

  describe('start', () => {
    it('should start recognition', () => {
      const recognition = createSpeechRecognitionController({
        SpeechRecognition: MockSpeechRecognition
      });

      recognition.start();

      expect(MockSpeechRecognition).toHaveBeenCalled();
      expect(mockRecognizerInstance.start).toHaveBeenCalled();
    });

    it('should return false when API not available', () => {
      const recognition = createSpeechRecognitionController({
        SpeechRecognition: null
      });

      expect(recognition.start()).toBe(false);
    });
  });

  describe('stop', () => {
    it('should stop recognition', () => {
      const recognition = createSpeechRecognitionController({
        SpeechRecognition: MockSpeechRecognition
      });

      recognition.start();
      recognition.stop();

      expect(mockRecognizerInstance.stop).toHaveBeenCalled();
    });

    it('should cleanup when requested', () => {
      const recognition = createSpeechRecognitionController({
        SpeechRecognition: MockSpeechRecognition
      });

      recognition.start();
      recognition.stop(true);

      expect(recognition.isListening()).toBe(false);
    });
  });

  describe('trigger detection', () => {
    it('should call callback when trigger detected', () => {
      const onTrigger = vi.fn();
      const recognition = createSpeechRecognitionController({
        SpeechRecognition: MockSpeechRecognition,
        onTriggerDetected: onTrigger,
        triggerWord: 'oui'
      });

      recognition.start();

      // Simulate speech result
      mockRecognizerInstance.onresult({
        resultIndex: 0,
        results: [{
          isFinal: true,
          0: { transcript: 'oui merci' }
        }]
      });

      expect(onTrigger).toHaveBeenCalledWith('oui merci');
    });

    it('should not call callback when trigger not found', () => {
      const onTrigger = vi.fn();
      const recognition = createSpeechRecognitionController({
        SpeechRecognition: MockSpeechRecognition,
        onTriggerDetected: onTrigger,
        triggerWord: 'oui'
      });

      recognition.start();

      mockRecognizerInstance.onresult({
        resultIndex: 0,
        results: [{
          isFinal: true,
          0: { transcript: 'non merci' }
        }]
      });

      expect(onTrigger).not.toHaveBeenCalled();
    });
  });

  describe('setTriggerWord', () => {
    it('should update trigger word', () => {
      const onTrigger = vi.fn();
      const recognition = createSpeechRecognitionController({
        SpeechRecognition: MockSpeechRecognition,
        onTriggerDetected: onTrigger,
        triggerWord: 'oui'
      });

      recognition.start();
      recognition.setTriggerWord('yes');

      mockRecognizerInstance.onresult({
        resultIndex: 0,
        results: [{
          isFinal: true,
          0: { transcript: 'yes please' }
        }]
      });

      expect(onTrigger).toHaveBeenCalled();
    });
  });

  describe('setLang', () => {
    it('should update language', () => {
      const recognition = createSpeechRecognitionController({
        SpeechRecognition: MockSpeechRecognition,
        lang: 'fr-FR'
      });

      recognition.start();
      recognition.setLang('en-US');

      expect(mockRecognizerInstance.lang).toBe('en-US');
    });
  });
});

describe('createAutoAdvanceController', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('schedule', () => {
    it('should call onAdvance after delay', () => {
      const onAdvance = vi.fn();
      const controller = createAutoAdvanceController({
        delay: 5,
        onAdvance
      });

      controller.schedule();

      expect(onAdvance).not.toHaveBeenCalled();

      vi.advanceTimersByTime(5000);

      expect(onAdvance).toHaveBeenCalledTimes(1);
    });

    it('should not schedule when delay is 0', () => {
      const onAdvance = vi.fn();
      const controller = createAutoAdvanceController({
        delay: 0,
        onAdvance
      });

      controller.schedule();

      vi.advanceTimersByTime(10000);

      expect(onAdvance).not.toHaveBeenCalled();
    });

    it('should clear previous timer when scheduling', () => {
      const onAdvance = vi.fn();
      const controller = createAutoAdvanceController({
        delay: 5,
        onAdvance
      });

      controller.schedule();
      vi.advanceTimersByTime(3000);

      controller.schedule(); // Reset timer
      vi.advanceTimersByTime(3000);

      expect(onAdvance).not.toHaveBeenCalled();

      vi.advanceTimersByTime(2000);

      expect(onAdvance).toHaveBeenCalledTimes(1);
    });
  });

  describe('clear', () => {
    it('should cancel scheduled timer', () => {
      const onAdvance = vi.fn();
      const controller = createAutoAdvanceController({
        delay: 5,
        onAdvance
      });

      controller.schedule();
      controller.clear();

      vi.advanceTimersByTime(10000);

      expect(onAdvance).not.toHaveBeenCalled();
    });
  });

  describe('setDelay', () => {
    it('should update delay', () => {
      const onAdvance = vi.fn();
      const controller = createAutoAdvanceController({
        delay: 5,
        onAdvance
      });

      controller.setDelay(10);

      expect(controller.getDelay()).toBe(10);
    });

    it('should handle string input', () => {
      const controller = createAutoAdvanceController({ delay: 5 });

      controller.setDelay('15');

      expect(controller.getDelay()).toBe(15);
    });
  });

  describe('isScheduled', () => {
    it('should return correct state', () => {
      const controller = createAutoAdvanceController({ delay: 5 });

      expect(controller.isScheduled()).toBe(false);

      controller.schedule();

      expect(controller.isScheduled()).toBe(true);

      controller.clear();

      expect(controller.isScheduled()).toBe(false);
    });
  });
});

describe('createAppController', () => {
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

  describe('loadData', () => {
    it('should load TSV data', () => {
      const app = createAppController({
        tts: mockTTS,
        recognition: mockRecognition,
        autoAdvance: mockAutoAdvance
      });

      const count = app.loadData('label1\t10\nlabel2\t20');

      expect(count).toBe(2);
      expect(app.getState().items).toHaveLength(2);
    });

    it('should load CSV data', () => {
      const app = createAppController({
        tts: mockTTS,
        recognition: mockRecognition,
        autoAdvance: mockAutoAdvance
      });

      const count = app.loadData('label1;10\nlabel2;20', 'csv');

      expect(count).toBe(2);
    });

    it('should reset index when loading', () => {
      const app = createAppController({
        tts: mockTTS,
        recognition: mockRecognition,
        autoAdvance: mockAutoAdvance
      });

      app.loadData('label1\t10');

      expect(app.getState().idx).toBe(-1);
    });
  });

  describe('start', () => {
    it('should start playback', async () => {
      const app = createAppController({
        tts: mockTTS,
        recognition: mockRecognition,
        autoAdvance: mockAutoAdvance
      });

      app.loadData('label1\t10\nlabel2\t20');

      const result = await app.start();

      expect(result).toBe(true);
      expect(app.getState().idx).toBe(0);
      expect(mockTTS.speak).toHaveBeenCalled();
      expect(mockRecognition.start).toHaveBeenCalled();
      expect(mockAutoAdvance.schedule).toHaveBeenCalled();
    });

    it('should not start without data', async () => {
      const app = createAppController({
        tts: mockTTS,
        recognition: mockRecognition,
        autoAdvance: mockAutoAdvance
      });

      const result = await app.start();

      expect(result).toBe(false);
    });

    it('should not start when already running', async () => {
      const app = createAppController({
        tts: mockTTS,
        recognition: mockRecognition,
        autoAdvance: mockAutoAdvance
      });

      app.loadData('label1\t10');
      await app.start();

      const result = await app.start();

      expect(result).toBe(false);
    });
  });

  describe('pause', () => {
    it('should pause playback', async () => {
      const app = createAppController({
        tts: mockTTS,
        recognition: mockRecognition,
        autoAdvance: mockAutoAdvance
      });

      app.loadData('label1\t10');
      await app.start();

      const result = app.pause();

      expect(result).toBe(true);
      expect(app.getState().paused).toBe(true);
      expect(mockTTS.cancel).toHaveBeenCalled();
      expect(mockRecognition.stop).toHaveBeenCalled();
      expect(mockAutoAdvance.clear).toHaveBeenCalled();
    });

    it('should not pause when not running', () => {
      const app = createAppController({
        tts: mockTTS,
        recognition: mockRecognition,
        autoAdvance: mockAutoAdvance
      });

      const result = app.pause();

      expect(result).toBe(false);
    });
  });

  describe('resume', () => {
    it('should resume playback', async () => {
      const app = createAppController({
        tts: mockTTS,
        recognition: mockRecognition,
        autoAdvance: mockAutoAdvance
      });

      app.loadData('label1\t10');
      await app.start();
      app.pause();

      const result = await app.resume();

      expect(result).toBe(true);
      expect(app.getState().paused).toBe(false);
    });

    it('should not resume when not paused', async () => {
      const app = createAppController({
        tts: mockTTS,
        recognition: mockRecognition,
        autoAdvance: mockAutoAdvance
      });

      app.loadData('label1\t10');
      await app.start();

      const result = await app.resume();

      expect(result).toBe(false);
    });
  });

  describe('prev', () => {
    it('should go to previous item', async () => {
      const app = createAppController({
        tts: mockTTS,
        recognition: mockRecognition,
        autoAdvance: mockAutoAdvance
      });

      app.loadData('label1\t10\nlabel2\t20\nlabel3\t30');
      await app.start();
      await app.next();

      const result = await app.prev();

      expect(result).toBe(true);
      expect(app.getState().idx).toBe(0);
    });

    it('should not go before first item', async () => {
      const app = createAppController({
        tts: mockTTS,
        recognition: mockRecognition,
        autoAdvance: mockAutoAdvance
      });

      app.loadData('label1\t10\nlabel2\t20');
      await app.start();

      const result = await app.prev();

      expect(result).toBe(false);
      expect(app.getState().idx).toBe(0);
    });
  });

  describe('next', () => {
    it('should go to next item', async () => {
      const app = createAppController({
        tts: mockTTS,
        recognition: mockRecognition,
        autoAdvance: mockAutoAdvance
      });

      app.loadData('label1\t10\nlabel2\t20');
      await app.start();

      const result = await app.next();

      expect(result).toBe(true);
      expect(app.getState().idx).toBe(1);
    });

    it('should stop at last item', async () => {
      const app = createAppController({
        tts: mockTTS,
        recognition: mockRecognition,
        autoAdvance: mockAutoAdvance
      });

      app.loadData('label1\t10');
      await app.start();

      const result = await app.next();

      expect(result).toBe(false);
      expect(app.getState().idx).toBe(-1); // Stopped
    });
  });

  describe('stop', () => {
    it('should stop playback', async () => {
      const app = createAppController({
        tts: mockTTS,
        recognition: mockRecognition,
        autoAdvance: mockAutoAdvance
      });

      app.loadData('label1\t10');
      await app.start();

      const result = app.stop();

      expect(result).toBe(true);
      expect(app.getState().idx).toBe(-1);
      expect(mockTTS.cancel).toHaveBeenCalled();
      expect(mockRecognition.stop).toHaveBeenCalledWith(true);
      expect(mockAutoAdvance.clear).toHaveBeenCalled();
    });
  });

  describe('onStateChange', () => {
    it('should notify on state changes', async () => {
      const onStateChange = vi.fn();
      const app = createAppController({
        tts: mockTTS,
        recognition: mockRecognition,
        autoAdvance: mockAutoAdvance,
        onStateChange
      });

      app.loadData('label1\t10');

      expect(onStateChange).toHaveBeenCalled();
      const lastCall = onStateChange.mock.calls[onStateChange.mock.calls.length - 1][0];
      expect(lastCall.items).toHaveLength(1);
      expect(lastCall.buttonStates).toBeDefined();
      expect(lastCall.badge).toBeDefined();
    });
  });
});

describe('renderDataTable', () => {
  it('should render empty string for empty array', () => {
    expect(renderDataTable([], -1)).toBe('');
    expect(renderDataTable(null, -1)).toBe('');
  });

  it('should render table rows', () => {
    const items = [
      { label: 'item1', display: '10', value: 10, raw: '10' },
      { label: 'item2', display: '20', value: 20, raw: '20' }
    ];

    const html = renderDataTable(items, -1);

    expect(html).toContain('<tr>');
    expect(html).toContain('item1');
    expect(html).toContain('item2');
    expect(html).toContain('10.00');
    expect(html).toContain('20.00');
  });

  it('should mark active row', () => {
    const items = [
      { label: 'item1', display: '10', value: 10, raw: '10' },
      { label: 'item2', display: '20', value: 20, raw: '20' }
    ];

    const html = renderDataTable(items, 1);

    expect(html).toContain('class="active"');
  });

  it('should show N/A for null values', () => {
    const items = [
      { label: 'item1', display: 'abc', value: null, raw: 'abc' }
    ];

    const html = renderDataTable(items, -1);

    expect(html).toContain('N/A');
  });

  it('should escape HTML in labels', () => {
    const items = [
      { label: '<script>alert(1)</script>', display: '10', value: 10, raw: '10' }
    ];

    const html = renderDataTable(items, -1);

    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain('<script>');
  });
});
