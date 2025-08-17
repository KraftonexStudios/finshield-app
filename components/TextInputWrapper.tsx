import { useDataCollectionStore } from '@/stores/useDataCollectionStore';
import React, { forwardRef, useRef, useState } from 'react';
import { NativeSyntheticEvent, TextInput, TextInputKeyPressEventData, TextInputProps } from 'react-native';

interface TextInputWrapperProps extends TextInputProps {
  onChangeText?: (text: string) => void;
  inputType?: "password" | "email" | "amount" | "mobile" | "text";
}

export const TextInputWrapper = forwardRef<TextInput, TextInputWrapperProps>(({ onChangeText, inputType = "text", ...props }, ref) => {
  const { collectKeystroke, isCollecting } = useDataCollectionStore();
  const [lastKeyTime, setLastKeyTime] = useState(0);
  const [lastChar, setLastChar] = useState('');
  const keyDownTimes = useRef<Map<string, number>>(new Map());
  const [typingSpeed, setTypingSpeed] = useState(200); // Average typing speed in ms

  // Generate realistic dwell time based on character type and typing patterns
  const generateRealisticDwellTime = (character: string): number => {
    const baseTime = 80; // Base dwell time in ms
    const variation = Math.random() * 40 - 20; // ±20ms variation

    // Character-specific adjustments
    let adjustment = 0;
    if (character === ' ') adjustment = 10; // Space takes slightly longer
    else if (/[A-Z]/.test(character)) adjustment = 15; // Capitals take longer
    else if (/[0-9]/.test(character)) adjustment = 5; // Numbers are faster
    else if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(character)) adjustment = 25; // Special chars take longer

    return Math.max(30, Math.min(300, baseTime + adjustment + variation));
  };

  // Generate realistic flight time based on typing speed
  const generateFlightTime = (): number => {
    const baseFlightTime = typingSpeed;
    const variation = Math.random() * 100 - 50; // ±50ms variation
    return Math.max(50, Math.min(1000, baseFlightTime + variation));
  };

  // Update typing speed based on recent keystrokes
  const updateTypingSpeed = (currentTime: number) => {
    if (lastKeyTime > 0) {
      const interval = currentTime - lastKeyTime;
      // Exponential moving average to smooth typing speed
      setTypingSpeed(prev => prev * 0.8 + interval * 0.2);
    }
  };

  const handleTextChange = async (text: string) => {
    if (!isCollecting) {
      onChangeText?.(text);
      return;
    }

    const currentTime = Date.now();
    const newChar = text.length > 0 ? text[text.length - 1] : '';

    if (newChar && newChar !== lastChar) {
      // Calculate realistic dwell time for this character
      const dwellTime = generateRealisticDwellTime(newChar);

      // Send keydown event first
      const downTime = currentTime - dwellTime;
      keyDownTimes.current.set(newChar, downTime);

      await collectKeystroke({
        character: newChar === ' ' ? 'Space' : newChar,
        timestamp: downTime,
        coordinate_x: 0,
        coordinate_y: 0,
        dwellTime: 0, // Will be calculated by store
        flightTime: 0, // Will be calculated by store
        inputType
      });

      // Wait for the actual dwell time to pass, then send keyup event
      setTimeout(async () => {
        await collectKeystroke({
          character: newChar === ' ' ? 'Space' : newChar,
          timestamp: Date.now(),
          coordinate_x: 0,
          coordinate_y: 0,
          dwellTime: 0, // Will be calculated by store
          flightTime: 0, // Will be calculated by store
          inputType
        });

        // Clean up keydown time
        keyDownTimes.current.delete(newChar);
      }, dwellTime);
    }

    // Update typing speed based on interval between keystrokes
    updateTypingSpeed(currentTime);

    setLastKeyTime(currentTime);
    setLastChar(newChar);
    onChangeText?.(text);
  };

  const handleKeyPress = async (event: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
    if (!isCollecting) return;

    const { key } = event.nativeEvent;
    const currentTime = Date.now();

    if (key === 'Backspace' || key === 'Enter' || key === ' ' || key === 'Shift' || key.length > 1) {
      // Calculate realistic dwell time for special keys
      const dwellTime = generateRealisticDwellTime(key);
      const downTime = currentTime - dwellTime;

      // Store keydown time
      keyDownTimes.current.set(key, downTime);

      // Send keydown event
      await collectKeystroke({
        character: key === ' ' ? 'Space' : key,
        timestamp: downTime,
        coordinate_x: 0,
        coordinate_y: 0,
        dwellTime: 0,
        flightTime: 0,
        inputType
      });

      // Wait for the actual dwell time to pass, then send keyup event
      setTimeout(async () => {
        await collectKeystroke({
          character: key === ' ' ? 'Space' : key,
          timestamp: Date.now(),
          coordinate_x: 0,
          coordinate_y: 0,
          dwellTime: 0,
          flightTime: 0,
          inputType
        });

        // Clean up keydown time
        keyDownTimes.current.delete(key);
      }, dwellTime);
    }

    // Update typing speed
    updateTypingSpeed(currentTime);
    setLastKeyTime(currentTime);
  };

  return (
    <TextInput
      ref={ref}
      {...props}
      onChangeText={handleTextChange}
      onKeyPress={handleKeyPress}
    />
  );
});


TextInputWrapper.displayName = "TextInputWrapper";
