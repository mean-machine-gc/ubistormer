# Ubistorming

Interactive EventStorming graph visualization and modeling tool.

## Quick Start

Run the Ubistorming UI locally:

```bash
npx ubistorming
```

This will start the interactive EventStorming interface on your local machine (default port 3002).

## What is EventStorming?

EventStorming is a workshop-based method to quickly find out what is happening in the domain of a software program. It's a powerful technique for exploring complex business domains and designing event-driven architectures.

## Features

- 🎯 **Interactive Graph Visualization** - Drag and drop EventStorming elements
- 📝 **Live Editing** - Edit domain models, commands, and events with Monaco Editor
- 🔄 **Real-time Collaboration** - Share and sync your EventStorming sessions
- 📊 **Analysis Tools** - Validate methodology compliance and detect issues
- 💾 **Import/Export** - Load and save EventStorming graphs as JSON
- 🎨 **Customizable Views** - Multiple layout options and filtering

## EventStorming Elements

- **🟡 Actors** - People or systems that trigger commands
- **🔵 Commands** - Actions/intentions in the system  
- **🟨 Aggregates** - Business objects/entities that handle commands
- **🟠 Events** - Things that happened in the domain
- **🟢 View Models** - Read models and projections
- **🔴 Guards & Preconditions** - Validation rules and requirements
- **💎 Branching Logic** - Decision points in the flow

## Usage

1. Start the application with `npx ubistorming`
2. Open your browser to the displayed URL (typically http://localhost:3002)
3. Load an existing EventStorming JSON file or start creating your graph
4. Use the toolbar to add nodes, apply layouts, and configure views
5. Click on nodes to edit their properties and business logic
6. Export your completed EventStorming model

## Requirements

- Node.js 18.0.0 or higher

## License

MIT