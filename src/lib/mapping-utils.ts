import { Mapping } from '@/hooks/use-settings-store';

export const LEFT_STICK_MOTION_ID = 100;
export const RIGHT_STICK_MOTION_ID = 101;

export type StickMappingMode = 'off' | 'keyboard' | 'mouse';

export interface AnalogKeyboardConfig {
  up: string;
  left: string;
  down: string;
  right: string;
}

export interface MouseMoveConfig {
  sensitivity: number;
}

export const DEFAULT_ANALOG_KEYBOARD_CONFIG: AnalogKeyboardConfig = {
  up: 'W',
  left: 'A',
  down: 'S',
  right: 'D'
};

export const DEFAULT_MOUSE_MOVE_CONFIG: MouseMoveConfig = {
  sensitivity: 18
};

export function getStickMotionLabel(buttonId: number) {
  if (buttonId === LEFT_STICK_MOTION_ID) return 'Left Stick Motion';
  if (buttonId === RIGHT_STICK_MOTION_ID) return 'Right Stick Motion';
  return null;
}

export function isStickMotionMapping(buttonId: number) {
  return buttonId === LEFT_STICK_MOTION_ID || buttonId === RIGHT_STICK_MOTION_ID;
}

export function encodeAnalogKeyboardConfig(config: AnalogKeyboardConfig) {
  return [config.up, config.left, config.down, config.right]
    .map((value) => value.trim().toUpperCase() || '')
    .join('|');
}

export function decodeAnalogKeyboardConfig(
  value: string
): AnalogKeyboardConfig {
  const [up, left, down, right] = value.split('|');
  return {
    up: (up || DEFAULT_ANALOG_KEYBOARD_CONFIG.up).toUpperCase(),
    left: (left || DEFAULT_ANALOG_KEYBOARD_CONFIG.left).toUpperCase(),
    down: (down || DEFAULT_ANALOG_KEYBOARD_CONFIG.down).toUpperCase(),
    right: (right || DEFAULT_ANALOG_KEYBOARD_CONFIG.right).toUpperCase()
  };
}

export function encodeMouseMoveConfig(config: MouseMoveConfig) {
  return String(Math.max(1, Math.round(config.sensitivity)));
}

export function decodeMouseMoveConfig(value: string): MouseMoveConfig {
  const parsed = Number(value);
  return {
    sensitivity:
      Number.isFinite(parsed) && parsed > 0
        ? Math.round(parsed)
        : DEFAULT_MOUSE_MOVE_CONFIG.sensitivity
  };
}

export function getStickMappingMode(mapping?: Mapping): StickMappingMode {
  if (!mapping) return 'off';
  if (mapping.mapping_type === 'AnalogKeyboard') return 'keyboard';
  if (mapping.mapping_type === 'MouseMove') return 'mouse';
  return 'off';
}

export function formatMappingValue(mapping: Mapping) {
  if (mapping.mapping_type === 'AnalogKeyboard') {
    const { up, left, down, right } = decodeAnalogKeyboardConfig(mapping.key_str);
    return `U:${up} L:${left} D:${down} R:${right}`;
  }

  if (mapping.mapping_type === 'MouseMove') {
    const { sensitivity } = decodeMouseMoveConfig(mapping.key_str);
    return `Sensitivity ${sensitivity}`;
  }

  if (mapping.mapping_type === 'Mouse') {
    const labels: Record<string, string> = {
      MOUSE_LEFT: 'Left Click',
      MOUSE_RIGHT: 'Right Click',
      MOUSE_MIDDLE: 'Middle Click',
      MOUSE_BUTTON4: 'Mouse Button 4',
      MOUSE_BUTTON5: 'Mouse Button 5',
      MOUSE_SCROLLUP: 'Scroll Up',
      MOUSE_SCROLLDOWN: 'Scroll Down'
    };
    return labels[mapping.key_str] || mapping.key_str;
  }

  return mapping.key_str;
}
