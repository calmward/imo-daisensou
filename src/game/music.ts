import type { Track } from '../core/audio';

const rep = (s: string, n: number) => Array(n).fill(s).join(' ');

function bassBar(root: string, hi: string) {
  return `${root} . ${hi} . ${root} . ${hi} . ${root} . ${hi} . ${root} . ${hi} .`;
}

export const MUSIC: Record<string, Track> = {
  map: {
    bpm: 112,
    leadWave: 'triangle',
    lead: [
      'C5 - E5 - G5 - E5 - A5 - G5 - E5 - D5 -',
      'C5 - D5 - E5 - G5 - E5 - - - . . . .',
      'F5 - A5 - G5 - E5 - D5 - E5 - F5 - D5 -',
      'E5 - C5 - D5 - B4 - C5 - - - . . . .',
      'A5 - G5 - E5 - G5 - A5 - C6 - A5 - G5 -',
      'E5 - G5 - D5 - E5 - C5 - - - . . . .',
      'F5 - E5 - D5 - F5 - E5 - D5 - C5 - E5 -',
      'D5 - - - G4 - B4 - C5 - - - . . . .',
    ].join(' '),
    bass: [
      'C3 - - - G2 - - - A2 - - - G2 - - -',
      'C3 - - - G2 - - - C3 - - - G2 - - -',
      'F2 - - - F2 - - - G2 - - - G2 - - -',
      'C3 - - - G2 - - - C3 - - - . - - -',
      'F2 - - - F2 - - - A2 - - - A2 - - -',
      'C3 - - - G2 - - - C3 - - - G2 - - -',
      'F2 - - - F2 - - - C3 - - - C3 - - -',
      'G2 - - - G2 - - - C3 - - - . - - -',
    ].join(' '),
    drums: rep('k . h . s . h . k . h . s . h h', 8),
  },
  battle: {
    bpm: 140,
    lead: [
      'G4 . G4 . B4 - D5 - G5 - - - F#5 - E5 -',
      'D5 - B4 - C5 - D5 - B4 - - - . . . .',
      'E5 . E5 . G5 - E5 - D5 - C5 - B4 - A4 -',
      'B4 - D5 - A4 - B4 - G4 - - - . . . .',
      'C5 . C5 . E5 - C5 - D5 . D5 . F#5 - D5 -',
      'E5 - G5 - F#5 - E5 - D5 - - - . . D5 E5',
      'F#5 - G5 - A5 - F#5 - G5 - E5 - D5 - B4 -',
      'C5 - A4 - F#4 - A4 - G4 - - - . . . .',
    ].join(' '),
    harmony: [
      'B3 - - - - - - - D4 - - - - - - -',
      'G3 - - - - - - - G3 - - - - - - -',
      'C4 - - - - - - - G3 - - - - - - -',
      'F#3 - - - - - - - G3 - - - - - - -',
      'E3 - - - - - - - F#3 - - - - - - -',
      'G3 - - - - - - - A3 - - - - - - -',
      'D4 - - - - - - - B3 - - - - - - -',
      'A3 - - - F#3 - - - G3 - - - - - - -',
    ].join(' '),
    bass: [bassBar('G2', 'G3'), bassBar('G2', 'G3'), bassBar('C3', 'C4'), bassBar('D3', 'D4'), bassBar('A2', 'A3'), bassBar('C3', 'C4'), bassBar('D3', 'D4'), bassBar('G2', 'G3')].join(' '),
    drums: rep('k . h . s . h . k . k . s . h h', 8),
  },
  boss: {
    bpm: 150,
    lead: [
      'A4 - A4 . C5 - A4 . E5 - D5 - C5 - B4 -',
      'A4 - - - G#4 - - - A4 - B4 - C5 - D5 -',
      'E5 - E5 . F5 - E5 . D5 - C5 - B4 - G#4 -',
      'A4 - - - E4 - - - A4 - - - . . . .',
      'C5 - C5 . D5 - C5 . B4 - A4 - G#4 - E4 -',
      'F4 - - - A4 - - - D5 - C5 - B4 - A4 -',
      'G#4 - B4 - E5 - - - F5 - E5 - D5 - B4 -',
      'A4 - - - - - - - . . . . E4 - G#4 -',
    ].join(' '),
    leadWave: 'sawtooth',
    bass: [bassBar('A2', 'A3'), bassBar('E2', 'E3'), bassBar('E2', 'E3'), bassBar('A2', 'A3'), bassBar('A2', 'A3'), bassBar('D2', 'D3'), bassBar('E2', 'E3'), bassBar('A2', 'A3')].join(' '),
    bassWave: 'square',
    drums: rep('k . h k s . h . k k h . s . s s', 8),
  },
  title: {
    bpm: 124,
    leadWave: 'square',
    lead: [
      'C5 . C5 . G4 - C5 - E5 - D5 - C5 - G4 -',
      'A4 - C5 - D5 - E5 - D5 - - - . . . .',
      'E5 . E5 . D5 - E5 - G5 - E5 - D5 - C5 -',
      'D5 - E5 - D5 - B4 - C5 - - - . . . .',
    ].join(' '),
    harmony: [
      'E4 - - - - - - - G4 - - - - - - -',
      'F4 - - - - - - - G4 - - - - - - -',
      'G4 - - - - - - - E4 - - - - - - -',
      'F4 - - - - - - - E4 - - - - - - -',
    ].join(' '),
    bass: [bassBar('C3', 'C4'), bassBar('F2', 'F3'), bassBar('C3', 'C4'), bassBar('G2', 'G3')].join(' '),
    drums: rep('k . h . s . h . k . h k s . h .', 4),
  },
};
