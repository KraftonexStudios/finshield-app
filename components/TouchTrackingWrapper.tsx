import React, { ReactNode, useRef } from 'react';
import { GestureResponderEvent, View } from 'react-native';
import { useDataCollectionStore } from '../stores/useDataCollectionStore';

interface TouchTrackingWrapperProps {
  children: ReactNode;
  className?: string;
  style?: any;
}

export function TouchTrackingWrapper({ children, className, style }: TouchTrackingWrapperProps) {
  const { collectTouchEvent } = useDataCollectionStore();

  const touchData = useRef({
    startTime: 0,
    startX: 0,
    startY: 0,
    lastMoveTime: 0,
    moveCount: 0,
    totalDistance: 0,
    isScrolling: false,
    isPinching: false
  });

  const handleTouchStart = async (event: GestureResponderEvent) => {
    const { pageX, pageY, touches, force } = event.nativeEvent;
    const currentTime = Date.now();

    touchData.current = {
      startTime: currentTime,
      startX: pageX,
      startY: pageY,
      lastMoveTime: currentTime,
      moveCount: 0,
      totalDistance: 0,
      isScrolling: false,
      isPinching: touches && touches.length > 1
    };

    // Store touch start data for later use
    console.log('Touch start collected:', 0);
  };

  const handleTouchMove = async (event: GestureResponderEvent) => {
    if (!touchData.current.startTime) return;

    const { pageX, pageY, touches, force } = event.nativeEvent;
    const currentTime = Date.now();
    const timeDiff = currentTime - touchData.current.lastMoveTime;

    // Calculate distance from start position
    const deltaX = pageX - touchData.current.startX;
    const deltaY = pageY - touchData.current.startY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    touchData.current.totalDistance = distance;
    touchData.current.moveCount++;
    touchData.current.lastMoveTime = currentTime;

    // Detect pinch gesture (multi-touch)
    if (touches && touches.length >= 2) {
      touchData.current.isPinching = true;
    }

    // Detect scrolling - improved logic
    // Scrolling: multiple moves with consistent direction and speed
    if (touchData.current.moveCount > 2 && distance > 20) {
      const velocity = distance / (currentTime - touchData.current.startTime);
      if (velocity > 0.5) { // pixels per millisecond
        touchData.current.isScrolling = true;
      }
    }

    // Optional: Log only significant movements to avoid spam
    const velocity = distance / (currentTime - touchData.current.startTime);
    if (velocity > 0.5) {
      console.log('Touch move collected, velocity:', velocity.toFixed(3));
    }
  };

  const handleTouchEnd = async (event: GestureResponderEvent) => {
    if (!touchData.current.startTime) return;

    const { pageX, pageY } = event.nativeEvent;
    const touchEndTime = Date.now();
    const duration = touchEndTime - touchData.current.startTime;

    // Calculate final distance and velocity
    const deltaX = pageX - touchData.current.startX;
    const deltaY = pageY - touchData.current.startY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const velocity = duration > 0 ? distance / duration : 0;

    // Log basic touch end information for debugging
    console.log('Touch end analysis:', {
      distance: distance.toFixed(3),
      duration,
      velocity: velocity.toFixed(3),
      moveCount: touchData.current.moveCount
    });

    try {
      // Determine gesture type based on touch behavior
      let gestureType: "tap" | "swipe" | "scroll" | "pinch" | "long_press" = "tap";
      
      if (touchData.current.isPinching) {
        gestureType = "pinch";
      } else if (duration > 500) {
        gestureType = "long_press";
      } else if (touchData.current.isScrolling) {
        gestureType = "scroll";
      } else if (distance > 20) {
        gestureType = "swipe";
      }

      // Call the store's collectTouchEvent to generate patterns
      await collectTouchEvent({
        gestureType,
        startX: touchData.current.startX,
        startY: touchData.current.startY,
        endX: pageX,
        endY: pageY,
        duration,
        distance,
        velocity
      });

      console.log('Touch end collected, duration:', duration + 'ms');
    } catch (error) {
      console.error('Failed to collect touch event:', error);
    }

    // Reset touch data
    touchData.current = {
      startTime: 0,
      startX: 0,
      startY: 0,
      lastMoveTime: 0,
      moveCount: 0,
      totalDistance: 0,
      isScrolling: false,
      isPinching: false
    };
  };

  return (
    <View
      className={className}
      style={style}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {children}
    </View>
  );
}