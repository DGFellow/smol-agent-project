# React Migration Guide

## 🎯 Overview

This guide documents the complete migration from EJS-based frontend to a modern React + TypeScript stack.

## 📦 Tech Stack

### Core
- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool (faster than CRA)

### State Management
- **Zustand** - Lightweight state (auth, app state)
- **TanStack Query** - Server state management

### Styling
- **TailwindCSS** - Utility-first CSS
- **Custom CSS** - Animations and utilities

### Routing
- **React Router v6** - Client-side routing

### API Client
- **Axios** - HTTP client with interceptors

## 🚀 Getting Started

### Prerequisites
```bash
node >= 18.0.0
npm >= 9.0.0
```

### Installation

1. **Navigate to frontend directory**
```bash
cd frontend
```

2. **Install dependencies**
```bash
npm install
```

3. **Create environment file**
```bash
cp .env.example .env
```

4. **Update .env with your backend URL**
```env
VITE_BACKEND_URL=http://localhost:5001
```

### Development

**Start the development server:**
```bash
npm run dev
```

Frontend will be available at `http://localhost:3000`

**Backend must be running** at `http://localhost:5001` (or your configured URL)

### Building for Production

```bash
npm run build
```

Output will be in `dist/` directory.

**Preview production build:**
```bash
npm run preview
```

## 📁 Project Structure

```
frontend/
├── src/
│   ├── components/        # React components
│   │   ├── auth/         # Auth-related components
│   │   ├── chat/         # Chat interface components
│   │   ├── footer/       # Footer component
│   │   ├── header/       # Header component
│   │   ├── layout/       # Layout components
│   │   ├── sidebar/      # Sidebar components
│   │   └── ui/           # Reusable UI components
│   ├── hooks/            # Custom React hooks
│   │   ├── useAuth.ts
│   │   ├── useConversations.ts
│   │   ├── useMessages.ts
│   │   └── useToast.ts
│   ├── lib/              # Utilities and configuration
│   │   ├── api.ts        # Axios client
│   │   ├── queryClient.ts
│   │   └── utils.ts      # Helper functions
│   ├── pages/            # Page components
│   │   ├── ChatPage.tsx
│   │   ├── LoginPage.tsx
│   │   ├── RegisterPage.tsx
│   │   └── NotFoundPage.tsx
│   ├── routes/           # Route configuration
│   │   └── index.tsx
│   ├── store/            # Zustand stores
│   │   ├── appStore.ts
│   │   └── authStore.ts
│   ├── types/            # TypeScript definitions
│   │   └── index.ts
│   ├── App.tsx           # Root component
│   ├── main.tsx          # Entry point
│   └── index.css         # Global styles
├── public/               # Static assets
├── index.html            # HTML template
├── vite.config.ts        # Vite configuration
├── tailwind.config.js    # Tailwind configuration
├── tsconfig.json         # TypeScript configuration
└── package.json          # Dependencies
```

## 🔑 Key Features

### Authentication
- ✅ JWT-based auth with localStorage
- ✅ Protected routes
- ✅ Real-time username/email validation
- ✅ Automatic token refresh handling
- ✅ Session persistence

### Chat Interface
- ✅ Hero view for new sessions
- ✅ Full chat interface with message history
- ✅ Markdown rendering with syntax highlighting
- ✅ Code block copy functionality
- ✅ Auto-scrolling messages
- ✅ Thinking indicator
- ✅ Responsive design

### Sidebar
- ✅ Collapsible rail navigation
- ✅ Conversation list with search
- ✅ Delete/export conversations
- ✅ Account menu with dropdown
- ✅ Mobile-responsive overlay

### UI/UX
- ✅ Smooth animations
- ✅ Toast notifications
- ✅ Loading states
- ✅ Error handling
- ✅ Responsive design (mobile/tablet/desktop)
- ✅ Keyboard shortcuts

## 🔄 API Integration

All API calls use the centralized axios client in `src/lib/api.ts`.

### Authentication Flow

1. **Login/Register** → Receive JWT token
2. **Store token** → localStorage + Zustand store
3. **Axios interceptor** → Automatically adds `Authorization: Bearer {token}` to all requests
4. **401 Response** → Auto-logout and redirect to login

### Available API Methods

```typescript
// Auth
authApi.login(credentials)
authApi.register(userData)
authApi.checkUsername(username)
authApi.checkEmail(email)

// Conversations
conversationApi.list(params)
conversationApi.get(id)
conversationApi.delete(id)
conversationApi.updateTitle(id, title)

// Messages
messageApi.send(request)

// Health
healthApi.check()
```

## 🎨 Styling

### Tailwind Utilities
All components use Tailwind CSS classes. Custom utilities are defined in `src/index.css`:

- `.card` - Card container
- `.btn` - Button base
- `.btn-primary` - Primary button
- `.input` - Input field
- `.message-bubble` - Message container
- `.gradient-text` - Gradient text effect

### Custom Animations
- `fade-in` - Fade and slide up
- `slide-in` - Slide from left
- `pulse-slow` - Slow pulse effect
- `dot-pulse` - Thinking dots animation

## 🛠️ Development

### Adding a New Page

1. Create component in `src/pages/`
2. Add route in `src/routes/index.tsx`
3. Create any required hooks in `src/hooks/`
4. Update types in `src/types/index.ts`

### Adding a New API Endpoint

1. Add method to appropriate API object in `src/lib/api.ts`
2. Create custom hook in `src/hooks/`
3. Add query key in `src/lib/queryClient.ts`
4. Update types in `src/types/index.ts`

### State Management Guidelines

**Use Zustand for:**
- UI state (sidebar, view mode)
- Auth state (user, token)
- Global app state

**Use TanStack Query for:**
- Server data fetching
- Caching API responses
- Mutation handling
- Loading/error states

## 🐛 Troubleshooting

### Port already in use
```bash
# Kill process on port 3000
npx kill-port 3000
```

### Backend connection issues
1. Verify backend is running on correct port
2. Check `VITE_BACKEND_URL` in `.env`
3. Check browser console for CORS errors

### Build errors
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Type errors
```bash
# Regenerate TypeScript cache
npm run build
```

## 📚 Resources

- [React Documentation](https://react.dev)
- [Vite Documentation](https://vitejs.dev)
- [TailwindCSS](https://tailwindcss.com)
- [Zustand](https://github.com/pmndrs/zustand)
- [TanStack Query](https://tanstack.com/query)
- [React Router](https://reactrouter.com)

## 🚧 TODO / Future Improvements

- [ ] Add file upload functionality
- [ ] Implement voice input
- [ ] Add conversation export (PDF/Markdown)
- [ ] Add dark mode toggle
- [ ] Add conversation search
- [ ] Add keyboard shortcuts
- [ ] Add PWA support
- [ ] Add E2E tests
- [ ] Add Storybook for component documentation
- [ ] Implement OAuth (Google/GitHub)
- [ ] Add 2FA support
- [ ] Add rate limiting indicators
- [ ] Add conversation folders/tags

## 🤝 Contributing

When adding new features:
1. Create feature branch from `react-migration`
2. Follow existing patterns and conventions
3. Add TypeScript types for new data structures
4. Update this guide if adding major features
5. Test on mobile/tablet/desktop
6. Commit with conventional commit messages

---

Built with ❤️ for the Smolagent Framework