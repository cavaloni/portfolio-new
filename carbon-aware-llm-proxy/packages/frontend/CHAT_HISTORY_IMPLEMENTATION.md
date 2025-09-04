# Chat History Feature Implementation

## Overview

This document describes the implementation of the chat history feature for the carbon-aware LLM proxy frontend. The feature provides users with the ability to save, load, and manage their chat conversations locally using localStorage, with a design that facilitates easy migration to a database backend.

## Architecture

### Data Layer
- **localStorage-based persistence**: All chat history is stored locally in the browser
- **Abstraction layer**: Service interface designed for easy migration to API-based backend
- **Type-safe data structures**: Comprehensive TypeScript interfaces for all data operations

### Components
- **ChatHistorySidebar**: Main container component that replaces the "Preference Guide" section
- **ChatHistoryHeader**: Collapsible header with expand/maximize controls and action menu
- **ChatHistoryItem**: Individual chat session display with preview, metadata, and actions
- **Loading/Empty states**: Proper feedback for different application states

### State Management
- **React hooks**: Custom hooks for chat history operations (`useChatHistory`)
- **Error handling**: Comprehensive error states and user feedback
- **Loading states**: Proper loading indicators for all async operations

## File Structure

```
src/
├── types/
│   └── chat-history.ts              # TypeScript interfaces and constants
├── services/
│   └── chat-history-service.ts      # localStorage abstraction service
├── hooks/
│   └── use-chat-history.ts          # React hooks for state management
└── components/chat/
    ├── chat-history-sidebar.tsx     # Main sidebar component
    ├── chat-history-header.tsx      # Header with controls
    └── chat-history-item.tsx        # Individual session item
```

## Key Features

### 1. Session Management
- **Create sessions**: Automatically save current chat as new session
- **Load sessions**: Click to load any previous conversation
- **Delete sessions**: Remove individual sessions with confirmation
- **Session metadata**: Title, preview, timestamp, message count, carbon footprint

### 2. UI/UX Features
- **Collapsible sidebar**: Integrates seamlessly with existing sidebar sections
- **Maximize mode**: Dedicated expand button to focus on chat history
- **Session previews**: Shows first few words of conversation
- **Timestamps**: Human-readable relative timestamps
- **Carbon tracking**: Displays total carbon footprint per session

### 3. Data Operations
- **Export/Import**: JSON-based backup and restore functionality
- **Clear all**: Bulk delete with confirmation
- **Auto-save**: Current conversations are saved when starting new chats
- **Storage limits**: Configurable maximum number of sessions

## localStorage Schema

```typescript
interface ChatHistoryStorage {
  sessions: Record<string, ChatSession>;     // All sessions by ID
  sessionOrder: string[];                    // Ordered list (newest first)
  activeSessionId: string | null;            // Currently active session
  metadata: {
    version: string;                         // Schema version for migrations
    lastUpdated: string;                     // Last modification timestamp
    totalSessions: number;                   // Total session count
  };
}
```

**Storage Key**: `carbon-aware-chat-history`

## Database Migration Path

The implementation is designed for easy migration to a database backend:

### Current localStorage Implementation
```typescript
// localStorage service
class LocalStorageChatHistoryService implements ChatHistoryService {
  async getAllSessions(): Promise<ChatSessionSummary[]> {
    // Read from localStorage
  }
}
```

### Future API Implementation
```typescript
// API service (future)
class ApiChatHistoryService implements ChatHistoryService {
  async getAllSessions(): Promise<ChatSessionSummary[]> {
    // HTTP request to backend API
  }
}
```

### Components That Need API Integration
1. **chat-history-service.ts**: Replace localStorage operations with HTTP requests
2. **use-chat-history.ts**: Add proper error handling for network requests
3. **Authentication**: Add user context for multi-user support

## Integration Points

### Main Chat Page
- **Replaced section**: "Preference Guide" section replaced with "Chat History"
- **State integration**: Chat history connects to main chat state (`messages`)
- **Action handlers**: New chat, session loading, and session saving

### Existing Components
- **No modifications**: Existing chat components remain unchanged
- **Message compatibility**: Uses existing `Message` interface from `types/chat.ts`
- **Styling consistency**: Follows existing glassmorphism design system

## Configuration

### Constants (CHAT_HISTORY_CONSTANTS)
- `STORAGE_KEY`: 'carbon-aware-chat-history'
- `STORAGE_VERSION`: '1.0.0'
- `MAX_SESSIONS`: 100
- `MAX_TITLE_LENGTH`: 100
- `MAX_PREVIEW_LENGTH`: 150
- `DEFAULT_TITLE`: 'New Chat'

### Customization Points
- **Session limits**: Adjust `MAX_SESSIONS` for storage constraints
- **Preview length**: Modify preview text length
- **Auto-save behavior**: Configure when sessions are automatically saved
- **Export format**: Customize export data structure

## Error Handling

### User-Facing Errors
- **Storage full**: Graceful handling when localStorage quota exceeded
- **Corrupted data**: Recovery from invalid localStorage data
- **Import errors**: Validation of imported chat history files
- **Network errors**: Preparation for future API error handling

### Developer Errors
- **Type safety**: Comprehensive TypeScript interfaces prevent runtime errors
- **Validation**: Input validation for all user actions
- **Logging**: Console logging for debugging and monitoring

## Performance Considerations

### Optimization Strategies
- **Lazy loading**: Session summaries loaded separately from full session data
- **Pagination**: Ready for pagination when session count grows large
- **Memory management**: Efficient storage and retrieval patterns
- **Debounced operations**: Prevent excessive localStorage writes

### Storage Efficiency
- **Compression**: JSON serialization with minimal overhead
- **Cleanup**: Automatic removal of oldest sessions when limit exceeded
- **Indexing**: Efficient session ordering and lookup

## Testing Strategy

### Unit Tests (Recommended)
- **Service layer**: Test localStorage operations and data transformations
- **Hook logic**: Test React hook state management and side effects
- **Component behavior**: Test user interactions and state updates

### Integration Tests (Recommended)
- **End-to-end flows**: Test complete user workflows
- **Storage persistence**: Verify data survives page reloads
- **Error scenarios**: Test error handling and recovery

## Future Enhancements

### Phase 2 Features
- **Search functionality**: Search through chat history
- **Tagging system**: Organize sessions with custom tags
- **Favorites**: Mark important conversations
- **Session sharing**: Export/share individual sessions

### Backend Integration
- **User authentication**: Multi-user support with proper isolation
- **Cloud sync**: Synchronize chat history across devices
- **Backup/restore**: Server-side backup and recovery
- **Analytics**: Usage patterns and carbon footprint tracking

## Deployment Notes

### Pre-Alpha Phase
- **localStorage only**: No backend dependencies
- **Client-side storage**: All data remains on user's device
- **No user accounts**: Anonymous usage with local persistence

### Production Readiness
- **Database migration**: Implement API service layer
- **User management**: Add authentication and user isolation
- **Data migration**: Tool to migrate localStorage data to backend
- **Monitoring**: Add analytics and error tracking

## Troubleshooting

### Common Issues
1. **Glass styles not working**: Ensure `glass-theme` class is on body element
2. **Toast notifications not showing**: Verify toast component is properly imported
3. **Sessions not persisting**: Check localStorage availability and quota
4. **Import/export not working**: Verify file handling permissions

### Debug Information
- **Storage inspection**: Use browser dev tools to inspect localStorage
- **Console logging**: Enable debug logging in service layer
- **Component state**: Use React dev tools to inspect hook state
- **Network tab**: Monitor for future API integration issues
