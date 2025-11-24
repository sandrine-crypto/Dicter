/**
 * Controller module for the Lecteur Vocal application
 * Handles TTS, Speech Recognition, and UI state management
 */

import {
  createInitialState,
  parseText,
  parseCSV,
  canPerformAction,
  getButtonStates,
  formatItemsBadge,
  getCurrentItem,
  buildSpeechSentence,
  detectTriggerInTranscript,
  validateTriggerWord,
  escapeHtml
} from './core.js';

/**
 * Creates a TTS (Text-to-Speech) controller
 * @param {object} options - Configuration options
 * @returns {object} - TTS controller API
 */
export function createTTSController(options = {}) {
  const synth = options.speechSynthesis || (typeof window !== 'undefined' ? window.speechSynthesis : null);
  const Utterance = options.SpeechSynthesisUtterance ||
    (typeof window !== 'undefined' ? window.SpeechSynthesisUtterance : null);

  let speaking = false;
  let currentUtterance = null;

  const defaultSettings = {
    lang: 'fr-FR',
    rate: 1,
    pitch: 1,
    volume: 1
  };

  let settings = { ...defaultSettings };

  function isAvailable() {
    return !!synth && !!Utterance;
  }

  function updateSettings(newSettings) {
    settings = { ...settings, ...newSettings };
  }

  function speak(text) {
    return new Promise((resolve, reject) => {
      if (!isAvailable()) {
        reject(new Error('TTS not available'));
        return;
      }

      // Cancel any ongoing speech
      if (speaking) {
        try {
          synth.cancel();
        } catch (e) {
          console.warn('Error canceling TTS:', e);
        }
      }

      if (!text) {
        resolve();
        return;
      }

      const utterance = new Utterance(text);
      utterance.lang = settings.lang;
      utterance.rate = settings.rate;
      utterance.pitch = settings.pitch;
      utterance.volume = settings.volume;

      currentUtterance = utterance;
      speaking = true;

      utterance.onend = () => {
        speaking = false;
        currentUtterance = null;
        resolve();
      };

      utterance.onerror = (e) => {
        speaking = false;
        currentUtterance = null;
        // Don't reject for interrupted errors (caused by cancel)
        if (e.error === 'interrupted') {
          resolve();
        } else {
          reject(new Error(`TTS error: ${e.error}`));
        }
      };

      try {
        synth.speak(utterance);
      } catch (e) {
        speaking = false;
        currentUtterance = null;
        reject(e);
      }
    });
  }

  function cancel() {
    if (synth && speaking) {
      try {
        synth.cancel();
      } catch (e) {
        console.warn('Error canceling TTS:', e);
      }
    }
    speaking = false;
    currentUtterance = null;
  }

  function isSpeaking() {
    return speaking;
  }

  return {
    isAvailable,
    updateSettings,
    speak,
    cancel,
    isSpeaking
  };
}

/**
 * Creates a Speech Recognition controller
 * @param {object} options - Configuration options
 * @returns {object} - Speech Recognition controller API
 */
export function createSpeechRecognitionController(options = {}) {
  const SpeechRecognition = options.SpeechRecognition ||
    (typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null);

  let recognizer = null;
  let listenDesired = false;
  let restartTimer = null;
  let lang = options.lang || 'fr-FR';
  let onTriggerDetected = options.onTriggerDetected || (() => {});
  let onStatusChange = options.onStatusChange || (() => {});
  let triggerWord = options.triggerWord || 'oui';

  function isAvailable() {
    return !!SpeechRecognition;
  }

  function init() {
    if (recognizer || !isAvailable()) return;

    recognizer = new SpeechRecognition();
    recognizer.lang = lang;
    recognizer.continuous = true;
    recognizer.interimResults = false;

    recognizer.onstart = () => {
      onStatusChange('active');
    };

    recognizer.onend = () => {
      onStatusChange('stopped');
      if (listenDesired) {
        scheduleRestart(500);
      }
    };

    recognizer.onerror = (e) => {
      onStatusChange('error', e.error);
    };

    recognizer.onresult = (evt) => {
      for (let i = evt.resultIndex; i < evt.results.length; i++) {
        if (!evt.results[i].isFinal) continue;
        const transcript = evt.results[i][0].transcript;
        if (detectTriggerInTranscript(transcript, triggerWord)) {
          onTriggerDetected(transcript);
        }
      }
    };
  }

  function start() {
    if (!recognizer) init();
    if (!recognizer) return false;

    clearRestart();
    listenDesired = true;

    try {
      recognizer.start();
      return true;
    } catch (e) {
      if (e.name !== 'InvalidStateError') {
        console.warn('Error starting recognition:', e);
      }
      return false;
    }
  }

  function stop(cleanup = false) {
    clearRestart();
    listenDesired = false;

    if (recognizer) {
      try {
        recognizer.stop();
      } catch (e) {
        console.warn('Error stopping recognition:', e);
      }

      if (cleanup) {
        recognizer = null;
      }
    }
  }

  function clearRestart() {
    if (restartTimer) {
      clearTimeout(restartTimer);
      restartTimer = null;
    }
  }

  function scheduleRestart(delayMs) {
    clearRestart();
    restartTimer = setTimeout(() => {
      restartTimer = null;
      if (listenDesired && recognizer) {
        start();
      }
    }, delayMs);
  }

  function setTriggerWord(word) {
    triggerWord = validateTriggerWord(word);
  }

  function setLang(newLang) {
    lang = newLang;
    if (recognizer) {
      recognizer.lang = newLang;
      if (listenDesired) {
        scheduleRestart(100);
      }
    }
  }

  function isListening() {
    return listenDesired;
  }

  return {
    isAvailable,
    init,
    start,
    stop,
    setTriggerWord,
    setLang,
    isListening
  };
}

/**
 * Creates an auto-advance timer controller
 * @param {object} options - Configuration options
 * @returns {object} - Timer controller API
 */
export function createAutoAdvanceController(options = {}) {
  let timer = null;
  let delaySeconds = options.delay || 10;
  let onAdvance = options.onAdvance || (() => {});

  function schedule() {
    clear();
    if (delaySeconds <= 0) return;

    timer = setTimeout(() => {
      timer = null;
      onAdvance();
    }, delaySeconds * 1000);
  }

  function clear() {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  }

  function setDelay(seconds) {
    delaySeconds = parseInt(seconds, 10) || 0;
  }

  function getDelay() {
    return delaySeconds;
  }

  function isScheduled() {
    return timer !== null;
  }

  return {
    schedule,
    clear,
    setDelay,
    getDelay,
    isScheduled
  };
}

/**
 * Creates the main application controller
 * @param {object} options - Configuration options
 * @returns {object} - Application controller API
 */
export function createAppController(options = {}) {
  const state = createInitialState();

  const tts = options.tts || createTTSController(options.ttsOptions);
  const recognition = options.recognition || createSpeechRecognitionController({
    ...options.recognitionOptions,
    onTriggerDetected: () => next()
  });
  const autoAdvance = options.autoAdvance || createAutoAdvanceController({
    ...options.autoAdvanceOptions,
    onAdvance: () => next()
  });

  let onStateChange = options.onStateChange || (() => {});

  function notifyStateChange() {
    onStateChange({
      ...state,
      buttonStates: getButtonStates(state),
      badge: formatItemsBadge(state),
      currentItem: getCurrentItem(state)
    });
  }

  function loadData(text, format = 'tsv') {
    if (format === 'csv') {
      state.items = parseCSV(text);
    } else {
      state.items = parseText(text);
    }
    state.idx = -1;
    notifyStateChange();
    return state.items.length;
  }

  function setItems(items) {
    state.items = items;
    state.idx = -1;
    notifyStateChange();
  }

  async function start() {
    if (!canPerformAction(state, 'start')) return false;

    state.idx = 0;
    state.paused = false;
    state.listenDesired = true;
    notifyStateChange();

    await speakCurrent();
    recognition.start();
    autoAdvance.schedule();

    return true;
  }

  function pause() {
    if (!canPerformAction(state, 'pause')) return false;

    state.paused = true;
    autoAdvance.clear();
    tts.cancel();
    recognition.stop(false);
    notifyStateChange();

    return true;
  }

  async function resume() {
    if (!canPerformAction(state, 'resume')) return false;

    state.paused = false;
    state.listenDesired = true;
    notifyStateChange();

    await speakCurrent();
    recognition.start();
    autoAdvance.schedule();

    return true;
  }

  async function prev() {
    if (!canPerformAction(state, 'prev')) return false;

    state.idx--;
    await navigateAndSpeak();

    return true;
  }

  async function next() {
    if (state.idx >= state.items.length - 1) {
      stop();
      return false;
    }
    if (!canPerformAction(state, 'next')) return false;

    state.idx++;
    await navigateAndSpeak();

    return true;
  }

  function stop() {
    autoAdvance.clear();
    tts.cancel();
    recognition.stop(true);

    state.idx = -1;
    state.paused = false;
    state.speaking = false;
    notifyStateChange();

    return true;
  }

  async function navigateAndSpeak() {
    notifyStateChange();
    autoAdvance.clear();
    state.listenDesired = true;
    await speakCurrent();
    recognition.start();
    autoAdvance.schedule();
  }

  async function speakCurrent() {
    const item = getCurrentItem(state);
    if (!item) return;

    const sentence = buildSpeechSentence(item);
    state.speaking = true;
    notifyStateChange();

    try {
      await tts.speak(sentence);
    } catch (e) {
      console.warn('TTS error:', e);
    }

    state.speaking = false;
    notifyStateChange();
  }

  function getState() {
    return { ...state };
  }

  function setOnStateChange(callback) {
    onStateChange = callback;
  }

  return {
    loadData,
    setItems,
    start,
    pause,
    resume,
    prev,
    next,
    stop,
    getState,
    setOnStateChange,
    tts,
    recognition,
    autoAdvance
  };
}

/**
 * Renders data table HTML
 * @param {array} items - Array of items
 * @param {number} activeIdx - Currently active index
 * @returns {string} - HTML string for table body
 */
export function renderDataTable(items, activeIdx) {
  if (!items || !items.length) {
    return '';
  }

  return items.map((item, i) => {
    const activeClass = i === activeIdx ? ' class="active"' : '';
    const valueStr = item.value !== null ? item.value.toFixed(2) : 'N/A';
    return `<tr${activeClass}>
      <td>${escapeHtml(item.label)}</td>
      <td>${escapeHtml(item.display)}</td>
      <td>${valueStr}</td>
      <td>${escapeHtml(item.raw)}</td>
    </tr>`;
  }).join('');
}
