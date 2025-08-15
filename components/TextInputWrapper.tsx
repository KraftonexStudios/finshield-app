import { useDataCollectionStore } from '@/stores/useDataCollectionStore';
import { MobileKeystroke } from '@/types/data.collection';
import React, { forwardRef, useState, useRef } from 'react';
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

  const handleTextChange = async (text: string) => {
    if (!isCollecting) {
      onChangeText?.(text);
      return;
    }

    const currentTime = Date.now();
    const newChar = text.length > 0 ? text[text.length - 1] : '';

    if (newChar && newChar !== lastChar) {
      // Simulate key down event
      const downTime = currentTime - 50; // Approximate down time
      keyDownTimes.current.set(newChar, downTime);
      
      await collectKeystroke({
        character: newChar === ' ' ? 'Space' : newChar,
        timestamp: downTime,
        dwellTime: 0,
        flightTime: lastKeyTime > 0 ? downTime - lastKeyTime : 0,
        x: 0,
        y: 0,
        action: 'down',
        inputType
      });

      // Key up event with proper dwell time
      const keyDownTime = keyDownTimes.current.get(newChar) || downTime;
      const dwellTime = currentTime - keyDownTime;
      
      await collectKeystroke({
        character: newChar === ' ' ? 'Space' : newChar,
        timestamp: currentTime,
        dwellTime: parseFloat(dwellTime.toFixed(3)),
        flightTime: 0,
        x: 0,
        y: 0,
        action: 'up',
        inputType
      });
      
      keyDownTimes.current.delete(newChar);
    }

    setLastKeyTime(currentTime);
    setLastChar(newChar);
    onChangeText?.(text);
  };

  const handleKeyPress = async (event: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
    if (!isCollecting) return;

    const { key } = event.nativeEvent;
    const currentTime = Date.now();

    if (key === 'Backspace' || key === 'Enter' || key === ' ' || key === 'Shift' || key.length > 1) {
      const downTime = currentTime - 50;
      keyDownTimes.current.set(key, downTime);
      
      await collectKeystroke({
        character: key === ' ' ? 'Space' : key,
        timestamp: downTime,
        dwellTime: 0,
        flightTime: lastKeyTime > 0 ? downTime - lastKeyTime : 0,
        x: 0,
        y: 0,
        action: 'down',
        inputType
      });

      const keyDownTime = keyDownTimes.current.get(key) || downTime;
      const dwellTime = currentTime - keyDownTime;
      
      await collectKeystroke({
        character: key === ' ' ? 'Space' : key,
        timestamp: currentTime,
        dwellTime: parseFloat(dwellTime.toFixed(3)),
        flightTime: 0,
        x: 0,
        y: 0,
        action: 'up',
        inputType
      });
      
      keyDownTimes.current.delete(key);
    }

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
