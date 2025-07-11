# Frontend Restructuring Plan

## New Folder Structure

```
frontend/
├── public/                     # Static files
│   └── index.html              # HTML template
├── src/                        # Source code
│   ├── assets/                 # Static assets 
│   │   ├── images/             # Image files
│   │   └── fonts/              # Font files
│   ├── components/             # Reusable UI components
│   │   ├── common/             # Common UI elements
│   │   │   ├── Button/         # Button component
│   │   │   ├── Loader/         # Loader component
│   │   │   └── Target/         # Target component
│   │   └── layout/             # Layout components
│   │       └── Header/         # Header component
│   ├── contexts/               # React contexts for state management
│   │   └── GameContext.js      # Game state context
│   ├── hooks/                  # Custom React hooks
│   │   └── useGameState.js     # Hook to manage game state
│   ├── pages/                  # Application pages/routes
│   │   ├── Home/               # HomePage
│   │   ├── GameModes/          # GameModesPage
│   │   ├── Register/           # RegisterPage
│   │   └── FinalPage/          # FinalPage
│   ├── services/               # Services for API calls
│   │   └── api.js              # API service
│   ├── styles/                 # Global styles
│   │   ├── global.css          # Global CSS
│   │   ├── variables.css       # CSS variables
│   │   └── animations.css      # Animation styles
│   ├── utils/                  # Utility functions
│   │   ├── validation.js       # Form validation functions
│   │   └── formatters.js       # Data formatting utilities
│   ├── App.js                  # Main App component
│   ├── routes.js               # Application routes
│   └── index.js                # Application entry point
├── .eslintrc                   # ESLint configuration
├── package.json                # Dependencies and scripts
└── README.md                   # Project documentation
```

## Changes Overview

1. **Component Organization**:
   - Move UI components to `components/common`
   - Create component folders with index.js files
   - Separate component-specific styles into the component folders

2. **State Management**:
   - Create context providers for global state
   - Add custom hooks for reusable logic

3. **Page Structure**:
   - Organize each page in its own folder
   - Include page-specific components within page folders

4. **Styles**:
   - Reorganize global styles into variables, animations, and global rules
   - Component-specific styles live with their components

5. **Code Quality**:
   - Add proper ESLint configuration
   - Implement consistent naming conventions

## Implementation Steps

1. Create the new folder structure
2. Move and refactor components to their new locations
3. Setup context providers for state management
4. Update imports throughout the codebase
5. Implement consistent styling approach
6. Add code quality tools
