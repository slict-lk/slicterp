# Real Estate Module

This module handles all real estate property management functionality for the ERP system.

## Structure

```
src/apps/real-estate/
├── actions/           # Server actions for data mutations
├── app/               # Page routes
│   └── (dashboard)/   # Protected routes
├── components/        # Reusable UI components
│   └── property/      # Property-related components
└── lib/               # Shared utilities and types
```

## Features

- Property listing and search
- Property details and management
- Photo gallery and media management
- Viewing scheduling
- Lease management
- Maintenance requests
- Tenant portal

## Development

### Adding New Components

1. Create a new directory under `components/` for your component
2. Export the component in `components/index.ts`
3. Use the component in your pages or other components

### Adding New Server Actions

1. Create a new file in `actions/` for your action
2. Use the `'use server'` directive at the top of the file
3. Export the action functions
4. Import and use them in your components

## Dependencies

- Next.js 14 App Router
- React Server Components
- Prisma ORM
- Shadcn/ui components
- TypeScript
