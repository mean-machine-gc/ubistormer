# MCP HTTP Adapter Usage

The MCP tools have been adapted to use HTTP endpoints instead of direct EventStorming API calls.

## How it works

1. **MCP Tools** (`add-tools-http.ts`) - Make HTTP requests to localhost:3002
2. **Vite Bridge Plugin** (`eventstorming-bridge-plugin.ts`) - Receives HTTP requests and forwards them via WebSocket
3. **EventStorming Client** (`eventstorming-client.ts`) - Receives WebSocket messages and executes operations on the in-memory graph
4. **Response Flow** - Results flow back through WebSocket to HTTP response

## Key Changes

- All `api.methodName()` calls replaced with `httpRequest()` calls
- HTTP endpoints mirror the EventStorming API methods
- Request-response pattern implemented for data retrieval
- WebSocket bridge maintains connection to frontend

## Example Usage

```javascript
// Old (direct API)
const graph = api.getGraph();

// New (HTTP)
const result = await httpRequest('GET', '/graph');
```

## Status

The adapter is ready to use. Your MCP server can now manipulate the in-memory graph by making HTTP requests to the endpoints at `http://localhost:3002/api/eventstorming/*`.