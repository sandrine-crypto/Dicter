/**
 * Core utility functions for the Lecteur Vocal application
 * Extracted for testability
 */

/**
 * Sanitizes a string by removing potentially dangerous characters
 * @param {string} str - The string to sanitize
 * @param {number} maxLength - Maximum allowed length (default: 100)
 * @returns {string} - Sanitized string
 */
export function sanitizeString(str, maxLength = 100) {
  if (typeof str !== 'string') return '';
  if (str === null || str === undefined) return '';
  return str.slice(0, maxLength).replace(/[<>'"]/g, '');
}

/**
 * Escapes HTML special characters to prevent XSS
 * @param {string} text - The text to escape
 * @returns {string} - Escaped HTML string
 */
export function escapeHtml(text) {
  if (typeof text !== 'string') return '';
  const escapeMap = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, char => escapeMap[char]);
}

/**
 * Normalizes decimal numbers from various formats
 * Handles both comma and dot as decimal separators
 * @param {string} str - The number string to normalize
 * @param {object} opts - Options object
 * @param {boolean} opts.preserveDisplay - Whether to preserve original display format
 * @returns {object} - Object with display, value (number), and raw properties
 */
export function normalizeDecimal(str, opts = {}) {
  const preserveDisplay = opts.preserveDisplay || false;
  const trimmed = String(str || '').trim();

  if (!trimmed) {
    return { display: '', value: null, raw: trimmed };
  }

  // Spaces in numbers are considered invalid (e.g., "1 234,5")
  if (/\s/.test(trimmed)) {
    return { display: trimmed, value: null, raw: trimmed };
  }

  const hasComma = trimmed.includes(',');
  const hasDot = trimmed.includes('.');

  let normalized = trimmed;
  let displayStr = trimmed;

  if (hasComma && hasDot) {
    const commaIdx = trimmed.indexOf(',');
    const dotIdx = trimmed.indexOf('.');

    if (commaIdx < dotIdx) {
      // Format: 1,234.56 (comma as thousands separator)
      normalized = trimmed.replace(/,/g, '');
      displayStr = preserveDisplay ? trimmed : normalized;
    } else {
      // Format: 1.234,56 (dot as thousands separator, comma as decimal)
      normalized = trimmed.replace(/\./g, '').replace(',', '.');
      displayStr = preserveDisplay ? trimmed : normalized.replace('.', ',');
    }
  } else if (hasComma) {
    // Format: 23,4 (comma as decimal separator)
    normalized = trimmed.replace(',', '.');
    displayStr = preserveDisplay ? trimmed : trimmed;
  } else {
    // Format: 23.4 (dot as decimal separator)
    normalized = trimmed;
    displayStr = preserveDisplay ? trimmed.replace('.', ',') : trimmed;
  }

  const num = parseFloat(normalized);

  if (isNaN(num)) {
    return { display: trimmed, value: null, raw: trimmed };
  }

  return { display: displayStr, value: num, raw: trimmed };
}

/**
 * Detects the most likely delimiter in CSV/TSV text
 * @param {string} sample - Sample text to analyze
 * @returns {string} - Detected delimiter character
 */
export function detectDelimiter(sample) {
  if (!sample || typeof sample !== 'string') {
    return ';';
  }

  const lines = sample.split(/\r?\n/).filter(l => l.trim().length > 0).slice(0, 5);

  if (lines.length === 0) {
    return ';';
  }

  const scores = { ',': 0, ';': 0, '\t': 0, '|': 0 };

  for (const line of lines) {
    scores[','] += (line.match(/,/g) || []).length;
    scores[';'] += (line.match(/;/g) || []).length;
    scores['\t'] += (line.match(/\t/g) || []).length;
    scores['|'] += (line.match(/\|/g) || []).length;
  }

  const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];

  if (!best || best[1] === 0) {
    return ';';
  }

  return best[0];
}

/**
 * Parses a single CSV line with proper quote handling
 * @param {string} line - The CSV line to parse
 * @param {string} delimiter - The field delimiter
 * @returns {string[]} - Array of field values
 */
export function parseCSVLine(line, delimiter) {
  if (!line || typeof line !== 'string') {
    return [];
  }

  if (!delimiter) {
    delimiter = ',';
  }

  const out = [];
  let current = '';
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const ch = line[i];

    if (ch === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        // Escaped quote (doubled)
        current += '"';
        i += 2;
        continue;
      }
      inQuotes = !inQuotes;
      i++;
      continue;
    }

    if (ch === delimiter && !inQuotes) {
      out.push(current);
      current = '';
      i++;
      continue;
    }

    current += ch;
    i++;
  }

  out.push(current);
  return out;
}

/**
 * Parses tab-separated text into structured items
 * @param {string} text - The text to parse (label TAB value per line)
 * @returns {object[]} - Array of item objects with label, display, value, raw
 */
export function parseText(text) {
  if (!text || typeof text !== 'string') {
    return [];
  }

  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  const items = [];

  for (const line of lines) {
    const parts = line.split(/\t+/);

    if (parts.length < 2) {
      continue;
    }

    const label = parts[0].trim();
    const nstr = parts[1].trim();

    if (!label || !nstr) {
      continue;
    }

    const { display, value, raw } = normalizeDecimal(nstr, { preserveDisplay: true });
    items.push({
      label: sanitizeString(label, 200),
      display,
      value,
      raw
    });
  }

  return items;
}

/**
 * Parses CSV text into structured items
 * @param {string} text - The CSV text to parse
 * @param {string} delimiter - The field delimiter (auto-detected if not provided)
 * @returns {object[]} - Array of item objects with label, display, value, raw
 */
export function parseCSV(text, delimiter = null) {
  if (!text || typeof text !== 'string') {
    return [];
  }

  const detectedDelimiter = delimiter || detectDelimiter(text);
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
  const items = [];

  for (const line of lines) {
    const parts = parseCSVLine(line, detectedDelimiter);

    if (parts.length < 2) {
      continue;
    }

    const label = String(parts[0]).trim().replace(/^"|"$/g, '');
    const nstr = String(parts[1]).trim().replace(/^"|"$/g, '');

    if (!label || !nstr) {
      continue;
    }

    const { display, value, raw } = normalizeDecimal(nstr, { preserveDisplay: true });
    items.push({
      label: sanitizeString(label, 200),
      display,
      value,
      raw
    });
  }

  return items;
}

/**
 * Validates trigger word (letters only)
 * @param {string} trigger - The trigger word to validate
 * @returns {string} - Cleaned trigger word (lowercase, letters only)
 */
export function validateTriggerWord(trigger) {
  if (!trigger || typeof trigger !== 'string') {
    return '';
  }
  return sanitizeString(trigger, 50).toLowerCase().replace(/[^a-z]/g, '');
}

/**
 * Checks if a transcript contains the trigger word
 * @param {string} transcript - The speech transcript
 * @param {string} triggerWord - The trigger word to detect
 * @returns {boolean} - Whether the trigger was detected
 */
export function detectTriggerInTranscript(transcript, triggerWord) {
  if (!transcript || !triggerWord) {
    return false;
  }

  const normalizedTranscript = transcript.trim().toLowerCase();
  const normalizedTrigger = validateTriggerWord(triggerWord);

  if (!normalizedTrigger) {
    return false;
  }

  return normalizedTranscript.includes(normalizedTrigger);
}

/**
 * Creates the initial application state
 * @returns {object} - Initial state object
 */
export function createInitialState() {
  return {
    items: [],
    idx: -1,
    paused: false,
    listenDesired: false,
    recognizer: null,
    recogRestartTimer: null,
    autoTimer: null,
    speaking: false
  };
}

/**
 * Validates state transitions
 * @param {object} state - Current state
 * @param {string} action - Action to validate
 * @returns {boolean} - Whether the action is valid
 */
export function canPerformAction(state, action) {
  const hasItems = state.items.length > 0;
  const running = state.idx >= 0;

  switch (action) {
    case 'start':
      return hasItems && !running;
    case 'pause':
      return running && !state.paused;
    case 'resume':
      return running && state.paused;
    case 'prev':
      return running && state.idx > 0;
    case 'next':
      return running && state.idx < state.items.length - 1;
    case 'stop':
      return running;
    default:
      return false;
  }
}

/**
 * Gets button states based on current state
 * @param {object} state - Current state
 * @returns {object} - Object with button disabled states
 */
export function getButtonStates(state) {
  const hasItems = state.items.length > 0;
  const running = state.idx >= 0;

  return {
    startDisabled: !hasItems || running,
    pauseDisabled: !running || state.paused,
    resumeDisabled: !running || !state.paused,
    prevDisabled: !running || state.idx <= 0,
    nextDisabled: !running || state.idx >= state.items.length - 1,
    stopDisabled: !running
  };
}

/**
 * Formats the items badge text
 * @param {object} state - Current state
 * @returns {object} - Object with text and className for the badge
 */
export function formatItemsBadge(state) {
  const hasItems = state.items.length > 0;
  const running = state.idx >= 0;

  if (!hasItems || !running) {
    return {
      text: state.items.length + ' ligne' + (state.items.length > 1 ? 's' : ''),
      className: 'badge'
    };
  }

  return {
    text: `${state.idx + 1}/${state.items.length}`,
    className: 'badge ok'
  };
}

/**
 * Gets the current item from state
 * @param {object} state - Current state
 * @returns {object|null} - Current item or null
 */
export function getCurrentItem(state) {
  if (state.idx < 0 || state.idx >= state.items.length) {
    return null;
  }
  return state.items[state.idx];
}

/**
 * Builds a speech sentence from an item
 * @param {object} item - The item to speak
 * @returns {string} - The sentence to speak
 */
export function buildSpeechSentence(item) {
  if (!item) {
    return '';
  }
  return `${item.label}. ${item.display}`;
}
