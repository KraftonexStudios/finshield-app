import { useDataCollectionStore } from '@/stores/useDataCollectionStore';
import React, { useRef, useState } from 'react';
import { LayoutChangeEvent, NativeSyntheticEvent, TextInput, TextInputKeyPressEventData, TextInputProps } from 'react-native';

interface DataCollectionTextInputProps extends TextInputProps {
  inputType?: 'password' | 'email' | 'amount' | 'mobile' | 'text';
  onDataCollected?: (data: any) => void;
}

const DataCollectionTextInput: React.FC<DataCollectionTextInputProps> = ({
  inputType = 'text',
  onDataCollected,
  onChangeText,
  ...props
}) => {
  const { collectKeystroke, isCollecting, generateTypingPatternForInputType } = useDataCollectionStore();
  const [inputLayout, setInputLayout] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const lastKeystrokeTime = useRef<number>(0);
  const keyDownTime = useRef<number | null>(null);
  const inputRef = useRef<TextInput>(null);

  const handleLayout = (event: LayoutChangeEvent) => {
    const { x, y, width, height } = event.nativeEvent.layout;
    setInputLayout({ x, y, width, height });
  };

  const handleKeyPress = async (event: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
    if (!isCollecting) return;

    const { key } = event.nativeEvent;
    const currentTime = Date.now();

    try {
      // Calculate approximate touch coordinates within the input field
      const x = inputLayout.x + (inputLayout.width / 2); // Center of input
      const y = inputLayout.y + (inputLayout.height / 2); // Center of input

      // Record key down time for authentic dwell time calculation
      if (!keyDownTime.current) {
        keyDownTime.current = currentTime;
      }

      // Calculate authentic dwell time based on key press duration
      const dwellTime = keyDownTime.current ? currentTime - keyDownTime.current : 0;

      // Collect keystroke data using the store with authentic timing
      // Handle all keys including special ones (Enter, Backspace, Space, Shift)
      await collectKeystroke({
        character: key === ' ' ? 'Space' : key, // Normalize space character for better tracking
        timestamp: currentTime,
        dwellTime,
        flightTime: lastKeystrokeTime.current > 0 ? currentTime - lastKeystrokeTime.current : 0,
        x,
        y,
        inputType,
        action: 'up' // Key release event
      });

      lastKeystrokeTime.current = currentTime;
      keyDownTime.current = null; // Reset for next keystroke

      if (onDataCollected) {
        onDataCollected({ key, x, y, timestamp: currentTime });
      }
    } catch (error) {
      // Removed console.warn to clean up logs
    }
  };

  const handleTextChange = async (text: string) => {
    if (!isCollecting) {
      onChangeText?.(text);
      return;
    }

    const currentTime = Date.now();
    const newChar = text.length > 0 ? text[text.length - 1] : '';

    if (newChar && newChar !== '') {
      try {
        // Calculate approximate touch coordinates
        const x = inputLayout.x + (inputLayout.width / 2);
        const y = inputLayout.y + (inputLayout.height / 2);

        // Let the native module calculate authentic dwell time
        // The store will handle native module integration for timing
        await collectKeystroke({
          character: newChar === ' ' ? 'Space' : newChar, // Normalize space character for better tracking
          timestamp: currentTime,
          dwellTime: 0, // Will be calculated by native module
          flightTime: lastKeystrokeTime.current > 0 ? currentTime - lastKeystrokeTime.current : 0,
          x,
          y,
          inputType,
          action: 'up' // Text change represents key release
        });

        lastKeystrokeTime.current = currentTime;

        if (onDataCollected) {
          onDataCollected({ character: newChar, x, y, timestamp: currentTime });
        }
      } catch (error) {
        // Removed console.warn to clean up logs
      }
    }

    onChangeText?.(text);
  };

  const handleBlur = () => {
    if (isCollecting) {
      // Generate typing pattern for this input type when user finishes with this field
      generateTypingPatternForInputType(inputType);
    }
    props.onBlur?.();
  };



  return (
    <TextInput
      ref={inputRef}
      {...props}
      onLayout={handleLayout}
      onChangeText={handleTextChange}
      onKeyPress={handleKeyPress}
      onBlur={handleBlur}
      onSubmitEditing={(event) => {
        if (isCollecting) {
          const currentTime = Date.now();
          const x = inputLayout.x + (inputLayout.width / 2);
          const y = inputLayout.y + (inputLayout.height / 2);

          collectKeystroke({
            character: 'Enter',
            timestamp: currentTime,
            dwellTime: 0, // Will be calculated by native module
            flightTime: lastKeystrokeTime.current > 0 ? currentTime - lastKeystrokeTime.current : 0,
            x,
            y,
            inputType,
            action: 'up' // Submit represents key release
          }).catch(() => { });

          // Also generate typing pattern when submitting
          generateTypingPatternForInputType(inputType);
        }

        props.onSubmitEditing?.(event);
      }}
    />
  );
};

export default DataCollectionTextInput;