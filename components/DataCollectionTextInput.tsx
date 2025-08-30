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

      const keystrokeData = {
        character: key === ' ' ? 'Space' : key,
        timestamp: currentTime,
        coordinate_x: x,
        coordinate_y: y,
        dwellTime: 0, // Will be calculated by store
        flightTime: 0, // Will be calculated by store
        inputType,
        actionValue: 0 as const // Keydown event
      };

      console.log('🔴 [KEYSTROKE TRACE] Key press event:', {
        key: key === ' ' ? 'Space' : key,
        inputType,
        timestamp: currentTime,
        isCollecting,
        coordinates: { x, y },
        eventData: keystrokeData,
      });

      // Send keydown event with actionValue=0
      await collectKeystroke(keystrokeData);

      console.log(`🔵 DataCollectionTextInput - Keydown sent: ${key === ' ' ? 'Space' : key}`);

      if (onDataCollected) {
        onDataCollected({ key, x, y, timestamp: currentTime });
      }
    } catch (error) {
      console.warn('DataCollectionTextInput keydown error:', error);
    }
  };

  const [previousText, setPreviousText] = useState('');

  const handleTextChange = async (text: string) => {
    if (!isCollecting) {
      onChangeText?.(text);
      return;
    }

    const currentTime = Date.now();

    // Improved character detection algorithm
    const detectChanges = (oldText: string, newText: string) => {
      const changes: Array<{ type: 'insert' | 'delete'; character: string; position: number }> = [];

      if (newText.length > oldText.length) {
        // Character(s) were added - find all insertions
        let oldIndex = 0;
        let newIndex = 0;

        while (newIndex < newText.length && oldIndex < oldText.length) {
          if (newText[newIndex] === oldText[oldIndex]) {
            oldIndex++;
            newIndex++;
          } else {
            // Found an insertion
            changes.push({
              type: 'insert',
              character: newText[newIndex],
              position: newIndex
            });
            newIndex++;
          }
        }

        // Handle remaining characters at the end
        while (newIndex < newText.length) {
          changes.push({
            type: 'insert',
            character: newText[newIndex],
            position: newIndex
          });
          newIndex++;
        }
      } else if (newText.length < oldText.length) {
        // Character(s) were deleted
        const deletedCount = oldText.length - newText.length;
        for (let i = 0; i < deletedCount; i++) {
          changes.push({
            type: 'delete',
            character: 'Backspace',
            position: -1 // Position not relevant for deletions
          });
        }
      }

      return changes;
    };

    const changes = detectChanges(previousText, text);

    // Process each change
    for (const change of changes) {
      try {
        // Calculate approximate touch coordinates
        const x = inputLayout.x + (inputLayout.width / 2);
        const y = inputLayout.y + (inputLayout.height / 2);

        // Send keyup event with actionValue=1 to complete the keystroke cycle
        await collectKeystroke({
          character: change.character === ' ' ? 'Space' : change.character,
          timestamp: currentTime,
          coordinate_x: x,
          coordinate_y: y,
          dwellTime: 0, // Will be calculated by store
          flightTime: 0, // Will be calculated by store
          inputType,
          actionValue: 1 // Keyup event
        });

        console.log(`🔵 DataCollectionTextInput - Keyup sent: ${change.character === ' ' ? 'Space' : change.character}`);

        lastKeystrokeTime.current = currentTime;

        if (onDataCollected) {
          onDataCollected({ character: change.character, x, y, timestamp: currentTime });
        }
      } catch (error) {
        console.warn('DataCollectionTextInput keyup error:', error);
      }
    }

    setPreviousText(text);
    onChangeText?.(text);
  };

  const handleBlur = (e: any) => {
    if (isCollecting) {
      // Generate typing pattern for this input type when user finishes with this field
      generateTypingPatternForInputType(inputType);
    }
    props.onBlur?.(e);
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
            dwellTime: 0, // Will be calculated by store
            flightTime: 0, // Will be calculated by store
            coordinate_x: x,
            coordinate_y: y,
            inputType,
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