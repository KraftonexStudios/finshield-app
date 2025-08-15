# Data Collection Implementation Guide

This document describes the implementation of behavioral data collection across three main user scenarios in the banking application.

## Overview

The data collection system captures user behavioral patterns including touch events, typing patterns, motion data, device information, location data, and network behavior. The implementation handles three distinct scenarios:

1. **First-time Registration**: New users completing their initial setup
2. **Re-registration**: Existing users re-registering on the app
3. **Login**: Authenticated users using the app

## Architecture

### Data Collection Store (`useDataCollectionStore.ts`)

The main store manages:

- Session lifecycle
- Data collection state
- Sensor subscriptions
- API communication
- App state handling

### Key Components

- **BehavioralSession**: Core data structure containing all collected behavioral data
- **Collection Scenarios**: Enum defining the three collection contexts
- **App State Handling**: Background/foreground transition management
- **API Integration**: Data transmission to backend endpoints

## Implementation Details

### 1. First-time Registration Flow

**Trigger**: When user grants permissions in the onboarding flow

**Process**:

1. User reaches permissions screen
2. Grants required permissions (location, notifications)
3. Data collection starts with scenario `'first-time-registration'`
4. Collection continues through:
   - Mobile input
   - OTP verification
   - PIN setup
   - Security questions
   - Biometric setup
5. When onboarding completes, data is sent to `/api/data/regular`
6. User is redirected to dashboard

**Files Modified**:

- `app/(onboarding)/permissions.tsx`
- `app/(onboarding)/otp-verification.tsx`

### 2. Re-registration Flow

**Trigger**: When existing user completes OTP verification

**Process**:

1. User enters mobile number and receives OTP
2. After OTP verification, system detects existing user
3. Data collection starts with scenario `'re-registration'`
4. Collection continues until PIN verification
5. Upon successful PIN verification:
   - Data is sent to `/api/data/check`
   - System waits for successful response
   - User is redirected to dashboard
6. If response fails, user sees error message

**Files Modified**:

- `app/(onboarding)/otp-verification.tsx`
- `app/(auth)/pin-auth.tsx`

### 3. Login Flow

**Trigger**: When authenticated user reaches dashboard

**Process**:

1. User successfully authenticates (PIN/biometric)
2. Data collection starts with scenario `'login'`
3. Collection continues until:
   - App is closed by user
   - App goes to background
4. Data is periodically sent to `/api/data/regular`
5. Collection resumes when app returns from background

**Files Modified**:

- `app/(auth)/pin-auth.tsx`
- `app/(app)/dashboard.tsx`

## Data Collection Components

### Touch Events

- Touch coordinates
- Pressure data
- Touch duration
- Gesture patterns

### Typing Patterns

- Keystroke timing
- Typing rhythm
- Pause patterns
- Error corrections

### Motion Data

- Accelerometer readings
- Gyroscope data
- Magnetometer data
- Device orientation

### Device Information

- Device model and OS
- Battery level
- Screen orientation
- Root/jailbreak status
- Installed apps (if permitted)

### Location Data

- GPS coordinates
- Location accuracy
- Movement patterns

### Network Behavior

- Network type (WiFi/Cellular)
- Network name
- Operator information
- VPN detection
- SIM card details

## API Endpoints

### `/api/data/regular`

- Used for first-time registration and login scenarios
- Accepts behavioral data payload
- Returns success/failure status

### `/api/data/check`

- Used for re-registration scenario
- Accepts behavioral data payload
- Returns verification result
- Must return success for user to proceed

## App State Management

### Background Handling

When app goes to background:

1. Current data collection session is paused
2. Collected data is sent to appropriate endpoint
3. Collection state is preserved

### Foreground Resumption

When app returns to foreground:

1. Previous collection scenario is restored
2. Data collection resumes
3. New session continues from where it left off

## Error Handling

### Collection Errors

- Sensor permission failures
- Data collection interruptions
- Network connectivity issues

### API Errors

- Endpoint unavailability
- Network timeouts
- Invalid responses

### Fallback Behavior

- App continues functioning even if data collection fails
- User experience is not impacted by collection errors
- Errors are logged for debugging

## Security Considerations

### Data Privacy

- All sensitive data is encrypted before transmission
- No personally identifiable information is collected unnecessarily
- User consent is obtained before data collection

### Permission Management

- Required permissions are clearly explained to users
- Graceful degradation when permissions are denied
- Minimal permission requirements

## Testing

### Unit Tests

- Data collection store functionality
- Session management
- API communication

### Integration Tests

- End-to-end user flows
- App state transitions
- Error scenarios

### Performance Tests

- Memory usage during collection
- Battery impact
- Network usage

## Monitoring

### Metrics

- Collection success rates
- API response times
- Error frequencies
- User completion rates

### Logging

- Collection events
- API calls
- Error conditions
- Performance metrics

## Configuration

### Environment Variables

- `EXPO_PUBLIC_API_URL`: Backend API base URL
- Collection intervals and thresholds
- Feature flags for different collection types

### Build Configuration

- Platform-specific settings
- Permission requirements
- Native module integration

## Deployment

### Prerequisites

- Backend API endpoints must be available
- Required native modules must be installed
- Permissions must be configured in app manifests

### Rollout Strategy

- Gradual feature rollout
- A/B testing capabilities
- Rollback procedures

## Maintenance

### Regular Tasks

- Monitor collection success rates
- Update data schemas as needed
- Review and update permissions
- Performance optimization

### Troubleshooting

- Common collection issues
- API connectivity problems
- Permission-related errors
- Platform-specific issues
