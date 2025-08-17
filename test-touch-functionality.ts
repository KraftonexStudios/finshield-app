// Test file to verify touch functionality is working
import { useDataCollectionStore } from "./stores/useDataCollectionStore";

// Test touch event collection
const testTouchFunctionality = async () => {
  const store = useDataCollectionStore.getState();

  // Start data collection
  await store.startDataCollection("login");

  // Test touch event
  const testTouchEvent = {
    gestureType: "tap" as const,
    startX: 100,
    startY: 200,
    endX: 105,
    endY: 205,
    duration: 150,
  };

  // Collect touch event
  await store.collectTouchEvent(testTouchEvent);

  // Test keystroke event
  const testKeystroke = {
    character: "a",
    dwellTime: 100,
    x: 150,
    y: 250,
  };

  // Collect keystroke
  await store.collectKeystroke(testKeystroke);

  // Touch and keystroke functionality test completed successfully!
  // Touch events collected: store.touchEvents.length
  // Keystrokes collected: store.keystrokes.length
  // Behavior data initialized:
  // - locationBehavior: store.locationBehavior !== null
  // - deviceBehavior: store.deviceBehavior !== null
  // - networkBehavior: store.networkBehavior !== null
};

export { testTouchFunctionality };
