/**
 * Unit tests for state management functions
 */

import { describe, it, expect } from 'vitest';
import {
  createInitialState,
  canPerformAction,
  getButtonStates,
  formatItemsBadge,
  getCurrentItem,
  buildSpeechSentence,
  validateTriggerWord,
  detectTriggerInTranscript
} from '../../src/core.js';

describe('createInitialState', () => {
  it('should create state with default values', () => {
    const state = createInitialState();
    expect(state).toEqual({
      items: [],
      idx: -1,
      paused: false,
      listenDesired: false,
      recognizer: null,
      recogRestartTimer: null,
      autoTimer: null,
      speaking: false
    });
  });

  it('should return new object each time', () => {
    const state1 = createInitialState();
    const state2 = createInitialState();
    expect(state1).not.toBe(state2);
    expect(state1.items).not.toBe(state2.items);
  });
});

describe('canPerformAction', () => {
  describe('start action', () => {
    it('should allow start when has items and not running', () => {
      const state = { items: [{ label: 'test', value: 1 }], idx: -1 };
      expect(canPerformAction(state, 'start')).toBe(true);
    });

    it('should not allow start when no items', () => {
      const state = { items: [], idx: -1 };
      expect(canPerformAction(state, 'start')).toBe(false);
    });

    it('should not allow start when already running', () => {
      const state = { items: [{ label: 'test', value: 1 }], idx: 0 };
      expect(canPerformAction(state, 'start')).toBe(false);
    });
  });

  describe('pause action', () => {
    it('should allow pause when running and not paused', () => {
      const state = { items: [{ label: 'test', value: 1 }], idx: 0, paused: false };
      expect(canPerformAction(state, 'pause')).toBe(true);
    });

    it('should not allow pause when already paused', () => {
      const state = { items: [{ label: 'test', value: 1 }], idx: 0, paused: true };
      expect(canPerformAction(state, 'pause')).toBe(false);
    });

    it('should not allow pause when not running', () => {
      const state = { items: [{ label: 'test', value: 1 }], idx: -1, paused: false };
      expect(canPerformAction(state, 'pause')).toBe(false);
    });
  });

  describe('resume action', () => {
    it('should allow resume when running and paused', () => {
      const state = { items: [{ label: 'test', value: 1 }], idx: 0, paused: true };
      expect(canPerformAction(state, 'resume')).toBe(true);
    });

    it('should not allow resume when not paused', () => {
      const state = { items: [{ label: 'test', value: 1 }], idx: 0, paused: false };
      expect(canPerformAction(state, 'resume')).toBe(false);
    });

    it('should not allow resume when not running', () => {
      const state = { items: [{ label: 'test', value: 1 }], idx: -1, paused: true };
      expect(canPerformAction(state, 'resume')).toBe(false);
    });
  });

  describe('prev action', () => {
    it('should allow prev when not at first item', () => {
      const state = { items: [{}, {}, {}], idx: 1 };
      expect(canPerformAction(state, 'prev')).toBe(true);
    });

    it('should not allow prev at first item', () => {
      const state = { items: [{}, {}, {}], idx: 0 };
      expect(canPerformAction(state, 'prev')).toBe(false);
    });

    it('should not allow prev when not running', () => {
      const state = { items: [{}, {}, {}], idx: -1 };
      expect(canPerformAction(state, 'prev')).toBe(false);
    });
  });

  describe('next action', () => {
    it('should allow next when not at last item', () => {
      const state = { items: [{}, {}, {}], idx: 1 };
      expect(canPerformAction(state, 'next')).toBe(true);
    });

    it('should not allow next at last item', () => {
      const state = { items: [{}, {}, {}], idx: 2 };
      expect(canPerformAction(state, 'next')).toBe(false);
    });

    it('should not allow next when not running', () => {
      const state = { items: [{}, {}, {}], idx: -1 };
      expect(canPerformAction(state, 'next')).toBe(false);
    });
  });

  describe('stop action', () => {
    it('should allow stop when running', () => {
      const state = { items: [{}], idx: 0 };
      expect(canPerformAction(state, 'stop')).toBe(true);
    });

    it('should not allow stop when not running', () => {
      const state = { items: [{}], idx: -1 };
      expect(canPerformAction(state, 'stop')).toBe(false);
    });
  });

  describe('unknown action', () => {
    it('should return false for unknown action', () => {
      const state = { items: [{}], idx: 0 };
      expect(canPerformAction(state, 'unknown')).toBe(false);
      expect(canPerformAction(state, '')).toBe(false);
      expect(canPerformAction(state, null)).toBe(false);
    });
  });
});

describe('getButtonStates', () => {
  it('should return all disabled when no items', () => {
    const state = { items: [], idx: -1, paused: false };
    const buttons = getButtonStates(state);
    expect(buttons).toEqual({
      startDisabled: true,
      pauseDisabled: true,
      resumeDisabled: true,
      prevDisabled: true,
      nextDisabled: true,
      stopDisabled: true
    });
  });

  it('should enable start when has items and not running', () => {
    const state = { items: [{}], idx: -1, paused: false };
    const buttons = getButtonStates(state);
    expect(buttons.startDisabled).toBe(false);
    expect(buttons.stopDisabled).toBe(true);
  });

  it('should enable pause and stop when running', () => {
    const state = { items: [{}, {}], idx: 0, paused: false };
    const buttons = getButtonStates(state);
    expect(buttons.startDisabled).toBe(true);
    expect(buttons.pauseDisabled).toBe(false);
    expect(buttons.resumeDisabled).toBe(true);
    expect(buttons.stopDisabled).toBe(false);
  });

  it('should enable resume when paused', () => {
    const state = { items: [{}, {}], idx: 0, paused: true };
    const buttons = getButtonStates(state);
    expect(buttons.pauseDisabled).toBe(true);
    expect(buttons.resumeDisabled).toBe(false);
  });

  it('should handle navigation at boundaries', () => {
    // At first item
    let state = { items: [{}, {}, {}], idx: 0, paused: false };
    let buttons = getButtonStates(state);
    expect(buttons.prevDisabled).toBe(true);
    expect(buttons.nextDisabled).toBe(false);

    // At last item
    state = { items: [{}, {}, {}], idx: 2, paused: false };
    buttons = getButtonStates(state);
    expect(buttons.prevDisabled).toBe(false);
    expect(buttons.nextDisabled).toBe(true);

    // In middle
    state = { items: [{}, {}, {}], idx: 1, paused: false };
    buttons = getButtonStates(state);
    expect(buttons.prevDisabled).toBe(false);
    expect(buttons.nextDisabled).toBe(false);
  });
});

describe('formatItemsBadge', () => {
  it('should show count when not running', () => {
    const state = { items: [{}, {}, {}], idx: -1 };
    const badge = formatItemsBadge(state);
    expect(badge.text).toBe('3 lignes');
    expect(badge.className).toBe('badge');
  });

  it('should show singular for one item', () => {
    const state = { items: [{}], idx: -1 };
    const badge = formatItemsBadge(state);
    expect(badge.text).toBe('1 ligne');
  });

  it('should show zero items', () => {
    const state = { items: [], idx: -1 };
    const badge = formatItemsBadge(state);
    expect(badge.text).toBe('0 ligne');
  });

  it('should show progress when running', () => {
    const state = { items: [{}, {}, {}, {}], idx: 1 };
    const badge = formatItemsBadge(state);
    expect(badge.text).toBe('2/4');
    expect(badge.className).toBe('badge ok');
  });

  it('should show first/last item progress', () => {
    let state = { items: [{}, {}, {}], idx: 0 };
    expect(formatItemsBadge(state).text).toBe('1/3');

    state = { items: [{}, {}, {}], idx: 2 };
    expect(formatItemsBadge(state).text).toBe('3/3');
  });
});

describe('getCurrentItem', () => {
  const items = [
    { label: 'item1', value: 1 },
    { label: 'item2', value: 2 },
    { label: 'item3', value: 3 }
  ];

  it('should return null when not running', () => {
    const state = { items, idx: -1 };
    expect(getCurrentItem(state)).toBe(null);
  });

  it('should return current item', () => {
    const state = { items, idx: 1 };
    expect(getCurrentItem(state)).toEqual({ label: 'item2', value: 2 });
  });

  it('should return null for out-of-bounds index', () => {
    let state = { items, idx: 10 };
    expect(getCurrentItem(state)).toBe(null);

    state = { items, idx: -2 };
    expect(getCurrentItem(state)).toBe(null);
  });

  it('should return null for empty items', () => {
    const state = { items: [], idx: 0 };
    expect(getCurrentItem(state)).toBe(null);
  });
});

describe('buildSpeechSentence', () => {
  it('should build sentence from item', () => {
    const item = { label: 'échantillon 1', display: '12,34' };
    expect(buildSpeechSentence(item)).toBe('échantillon 1. 12,34');
  });

  it('should return empty string for null item', () => {
    expect(buildSpeechSentence(null)).toBe('');
    expect(buildSpeechSentence(undefined)).toBe('');
  });

  it('should handle empty label or display', () => {
    expect(buildSpeechSentence({ label: '', display: '10' })).toBe('. 10');
    expect(buildSpeechSentence({ label: 'test', display: '' })).toBe('test. ');
  });
});

describe('validateTriggerWord', () => {
  it('should return lowercase letters only', () => {
    expect(validateTriggerWord('OUI')).toBe('oui');
    expect(validateTriggerWord('Yes')).toBe('yes');
  });

  it('should remove non-letter characters', () => {
    expect(validateTriggerWord('oui123')).toBe('oui');
    expect(validateTriggerWord('oui!')).toBe('oui');
    expect(validateTriggerWord('oui oui')).toBe('ouioui');
  });

  it('should handle empty/null input', () => {
    expect(validateTriggerWord('')).toBe('');
    expect(validateTriggerWord(null)).toBe('');
    expect(validateTriggerWord(undefined)).toBe('');
  });

  it('should limit length', () => {
    const longTrigger = 'a'.repeat(100);
    expect(validateTriggerWord(longTrigger).length).toBeLessThanOrEqual(50);
  });

  it('should remove XSS attempts', () => {
    expect(validateTriggerWord('<script>oui</script>')).toBe('scriptouiscript');
  });
});

describe('detectTriggerInTranscript', () => {
  it('should detect trigger word', () => {
    expect(detectTriggerInTranscript('oui merci', 'oui')).toBe(true);
    expect(detectTriggerInTranscript('je dis oui', 'oui')).toBe(true);
    expect(detectTriggerInTranscript('OUI', 'oui')).toBe(true);
  });

  it('should be case insensitive', () => {
    expect(detectTriggerInTranscript('OUI', 'oui')).toBe(true);
    expect(detectTriggerInTranscript('oui', 'OUI')).toBe(true);
    expect(detectTriggerInTranscript('Oui', 'OUI')).toBe(true);
  });

  it('should return false when not found', () => {
    expect(detectTriggerInTranscript('non merci', 'oui')).toBe(false);
    expect(detectTriggerInTranscript('', 'oui')).toBe(false);
  });

  it('should handle empty/null inputs', () => {
    expect(detectTriggerInTranscript(null, 'oui')).toBe(false);
    expect(detectTriggerInTranscript('oui', null)).toBe(false);
    expect(detectTriggerInTranscript('', '')).toBe(false);
  });

  it('should handle trigger with special characters', () => {
    expect(detectTriggerInTranscript('oui', 'oui123')).toBe(true);
    expect(detectTriggerInTranscript('oui merci', 'oui!')).toBe(true);
  });

  it('should detect trigger as substring', () => {
    expect(detectTriggerInTranscript('je voudrais', 'oui')).toBe(false);
    expect(detectTriggerInTranscript('c\'est louis', 'oui')).toBe(true); // contains 'oui' in 'louis'
  });
});
