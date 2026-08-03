-- Fix stale bot_buttons data:
-- 1. "Daily Notes" with action_value "notes" -> "Accommodation Help" with "accommodation"
-- 2. "seniors-connect" -> "seniors" to match webhook handler

UPDATE bot_buttons SET label = 'Accommodation Help', icon = '🏠', action_value = 'accommodation'
WHERE action_value = 'notes';

UPDATE bot_buttons SET action_value = 'seniors'
WHERE action_value = 'seniors-connect';
