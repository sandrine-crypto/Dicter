/**
 * Test setup file for Vitest
 * Configures global mocks and test utilities
 */

import { vi } from 'vitest';

// Mock SpeechSynthesis API
global.speechSynthesis = {
  speak: vi.fn(),
  cancel: vi.fn(),
  pause: vi.fn(),
  resume: vi.fn(),
  getVoices: vi.fn(() => []),
  speaking: false,
  paused: false,
  pending: false,
  onvoiceschanged: null
};

// Mock SpeechSynthesisUtterance
global.SpeechSynthesisUtterance = vi.fn().mockImplementation((text) => ({
  text,
  lang: 'fr-FR',
  rate: 1,
  pitch: 1,
  volume: 1,
  onstart: null,
  onend: null,
  onerror: null,
  onpause: null,
  onresume: null,
  onboundary: null,
  onmark: null
}));

// Mock SpeechRecognition API
const mockSpeechRecognition = vi.fn().mockImplementation(() => ({
  lang: 'fr-FR',
  continuous: false,
  interimResults: false,
  maxAlternatives: 1,
  start: vi.fn(),
  stop: vi.fn(),
  abort: vi.fn(),
  onstart: null,
  onend: null,
  onerror: null,
  onresult: null,
  onspeechstart: null,
  onspeechend: null,
  onaudiostart: null,
  onaudioend: null,
  onsoundstart: null,
  onsoundend: null,
  onnomatch: null
}));

global.SpeechRecognition = mockSpeechRecognition;
global.webkitSpeechRecognition = mockSpeechRecognition;

// Mock navigator.mediaDevices
global.navigator.mediaDevices = {
  getUserMedia: vi.fn().mockResolvedValue({
    getTracks: () => []
  })
};

// Mock FileReader
global.FileReader = vi.fn().mockImplementation(() => ({
  readAsText: vi.fn(function(file) {
    setTimeout(() => {
      this.result = file._content || '';
      if (this.onload) this.onload();
    }, 0);
  }),
  readAsArrayBuffer: vi.fn(function(file) {
    setTimeout(() => {
      this.result = file._buffer || new ArrayBuffer(0);
      if (this.onload) this.onload();
    }, 0);
  }),
  onload: null,
  onerror: null,
  result: null
}));

// Helper to create mock files
global.createMockFile = (name, content, type = 'text/plain') => {
  const file = new Blob([content], { type });
  file.name = name;
  file._content = content;
  return file;
};

// Helper to create mock File object
global.createMockFileObject = (name, content, type = 'text/plain') => {
  return {
    name,
    type,
    size: content.length,
    _content: content,
    arrayBuffer: () => Promise.resolve(new TextEncoder().encode(content).buffer)
  };
};

// Reset all mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
});
