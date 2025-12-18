# Dialog UX Behavior Specification

## Overview
This document defines the standard user experience behavior for all dialog components in the application. These behaviors must be implemented consistently across all dialogs without exception.

---

## Visual Elements

### Header Controls Location
- **Position**: Top-right corner of the dialog
- **Layout**: Horizontal arrangement from right to left
- **Order**: Minimize button first (left), Cross button second (rightmost)

### Cross Button (✕)
- **Visual**: Standard close/cross icon (✕)
- **Position**: Rightmost button in the top-right corner
- **Size**: Standard button size appropriate for the dialog header
- **Accessibility**: Must have appropriate hover states and focus indicators

### Minimize Button (—)
- **Visual**: Standard minimize icon (—)
- **Position**: Immediately to the left of the Cross button
- **Size**: Standard button size matching the Cross button
- **Accessibility**: Must have appropriate hover states and focus indicators

---

## Cross Button Behavior

### Primary Action
When the user clicks the Cross button:
1. **Immediate Closure**: The dialog must close instantly without any delay
2. **Visual Removal**: The dialog disappears from the screen completely
3. **State Reset**: All temporary user-entered data must be discarded immediately

### Data Handling
- **All Form Fields**: Reset to their initial/default values
- **All Input Values**: Cleared completely
- **All Selections**: Reverted to initial state
- **All Temporary State**: Completely discarded
- **No Persistence**: No data should be saved or preserved in any form

### User Experience
- **No Confirmation**: The action should execute immediately without asking for confirmation
- **No Warning**: No warning dialogs should appear
- **Clean Slate**: When the dialog is reopened later, it should appear as if it was never opened before

---

## Minimize Button Behavior

### Primary Action
When the user clicks the Minimize button:
1. **Visual Hide**: The dialog must hide from the screen immediately
2. **State Preservation**: All user-entered data must be preserved exactly as entered
3. **No Data Loss**: No field values should be reset or cleared

### Data Preservation Requirements
- **Form Fields**: All text inputs retain their exact values
- **Dropdowns/Selects**: All selections remain exactly as chosen
- **Checkboxes/Radio Buttons**: All checked states remain unchanged
- **Text Areas**: All multi-line text remains intact
- **File Uploads**: All selected files remain in state (if applicable)
- **Validation States**: Any validation errors or states should be preserved
- **Cursor Position**: Field focus and cursor positions should be preserved (optional enhancement)

### Visual State
- **Hidden from View**: Dialog is not visible on screen
- **Background Overlay**: Should be removed/hidden along with the dialog
- **No Visual Remnants**: No partial dialogs or overlays should remain visible

---

## Reopening Minimized Dialog

### Restoration Behavior
When a minimized dialog is reopened:
1. **Exact Restoration**: All previously entered data must appear exactly as it was
2. **Field-by-Field Match**: Every field must show the exact same value it had before minimization
3. **No Resets**: No field should be reset to default or empty state
4. **Complete State**: All selections, inputs, and temporary data must be fully restored

### Data Integrity
- **Text Inputs**: Show exact same text as before minimization
- **Selections**: Show exact same selected options
- **Checkboxes**: Show exact same checked/unchecked states
- **Multi-step Forms**: If applicable, restore to the exact same step/page
- **Validation States**: Restore any validation errors or messages that were present

### User Experience
- **Seamless Continuity**: User should feel as if they never left the dialog
- **No Surprises**: No unexpected changes or resets
- **Immediate Recognition**: User should immediately recognize their previous work

---

## Consistency Requirements

### Universal Application
- **All Dialogs**: Every dialog in the application must follow these behaviors
- **No Exceptions**: No dialog should have different behavior
- **Standard Pattern**: All dialogs must use the same interaction pattern

### Dialog Types Covered
- **Create Dialogs**: Dialogs for creating new entities
- **Edit Dialogs**: Dialogs for editing existing entities
- **View Dialogs**: Dialogs for viewing information (if applicable)
- **Form Dialogs**: Any dialog containing forms
- **Multi-step Dialogs**: Dialogs with multiple steps or pages
- **Confirmation Dialogs**: Standard confirmation dialogs (if they have user input)

### Interaction Consistency
- **Button Placement**: Cross and Minimize buttons must always be in the same position
- **Button Order**: Minimize always left of Cross, always in top-right
- **Behavior Predictability**: Users should be able to predict behavior based on previous dialog interactions

---

## Edge Cases and Special Scenarios

### Multiple Dialogs
- **Independent State**: Each dialog maintains its own independent state
- **Minimizing One**: Minimizing one dialog does not affect others
- **Crossing One**: Closing one dialog with Cross does not affect minimized dialogs

### Dialog with Unsaved Changes
- **Cross Button**: Still discards all changes immediately (no confirmation)
- **Minimize Button**: Still preserves all changes in state

### Dialog with Validation Errors
- **Cross Button**: Discards all data including validation error states
- **Minimize Button**: Preserves validation errors along with data
- **Reopen**: Validation errors should reappear exactly as they were

### Dialog with Loading States
- **Cross Button**: Should cancel any ongoing operations and close immediately
- **Minimize Button**: Should preserve state even if operations are in progress

### Dialog with File Uploads
- **Cross Button**: Discards all selected files
- **Minimize Button**: Preserves file selection state
- **Reopen**: Files should still be in selected state (if technically feasible)

---

## User Expectations

### Mental Model
Users should understand:
- **Cross = Discard**: "I want to cancel and lose everything I entered"
- **Minimize = Save for Later**: "I want to come back to this later with my work intact"

### Predictability
- Users should be able to confidently use these buttons knowing the exact outcome
- No surprises or unexpected behavior
- Consistent experience builds user trust

### Efficiency
- **Quick Exit**: Cross button provides instant way to abandon work
- **Work Preservation**: Minimize button allows users to pause and resume without losing progress
- **No Friction**: No unnecessary confirmations or warnings

---

## Summary

### Cross Button (✕)
- **Action**: Close dialog immediately
- **Data**: Discard all temporary values
- **Result**: Clean slate on next open

### Minimize Button (—)
- **Action**: Hide dialog from screen
- **Data**: Preserve all entered data in state
- **Result**: Exact restoration on reopen

### Consistency
- **Universal**: All dialogs follow these rules
- **Predictable**: Same behavior everywhere
- **No Exceptions**: Standard pattern for all dialog types

