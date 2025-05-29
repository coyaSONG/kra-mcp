# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
- `npm run dev` - Start development server with tsx
- `npm run watch` - Start development server with file watching
- `npm run build` - Compile TypeScript to JavaScript
- `npm start` - Run the compiled server

### Testing
- `npm test` - Run Jest tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report

## Project Architecture

This is a Model Context Protocol (MCP) server that provides racing data analysis for the Korea Racing Authority (KRA). The server acts as a bridge between AI assistants and Korean horse racing data through public APIs.

### Core Components

**Server Setup (src/index.ts:405-409)**
- McpServer instance configured for KRA racing data analysis
- Uses stdio transport for communication with MCP clients

**API Integration (src/index.ts:80-153)**
- `callKRAApi()` - Main function for KRA public API calls
- Handles both JSON and XML responses with automatic parsing
- Supports URL parameter encoding and error handling
- Base URL: `https://apis.data.go.kr/B551015/API214_1`

**Data Validation (src/index.ts:155-179)**
- `validateAndFormatDate()` - Converts various date formats to YYYYMMDD
- `getTrackCode()` - Maps track names to API codes (서울=1, 제주=2, 부산=3)

### MCP Components

**Tools (src/index.ts:414-632)**
- `analyze-race` - Race analysis by date, number, and track
- `analyze-horse-performance` - Horse performance over specified periods
- `get-jockey-stats` - Jockey statistics and performance data
- `analyze-odds` - Betting odds analysis for specific races
- `analyze-track-condition` - Track condition and weather impact analysis

**Resources (src/index.ts:638-748)**
- `schedule://{date}` - Racing schedules (today/tomorrow)
- `horses://{horseName}` - Horse information and records
- `tracks://{trackCode}` - Track information (seoul/busan/jeju)
- `config://kra-api` - Server configuration and API settings

**Prompts (src/index.ts:754-839)**
- `predict-race` - Race prediction analysis templates
- `horse-performance-report` - Horse performance report generation
- `market-analysis` - Betting market analysis and insights

### Environment Configuration

**Required Environment Variable:**
- `KRA_SERVICE_KEY` - Service key from Korean Public Data Portal (data.go.kr)

The server validates this key exists and provides debugging information in development mode.

### Data Processing

**Response Formatting (src/index.ts:182-403)**
- `formatRaceData()` - Formats race results into readable text
- `formatHorsePerformanceData()` - Processes horse performance statistics
- `formatJockeyStatsData()` - Formats jockey statistics and records
- Handles various API response structures including nested arrays

**Error Handling (src/index.ts:843-852)**
- Global exception and rejection handlers
- Graceful error messages with troubleshooting hints
- API-specific error detection (e.g., service key registration errors)

### Testing Strategy

The project uses Jest with TypeScript support for comprehensive testing:
- API utility function testing (validation, formatting)
- Mock-based API integration testing  
- Error scenario testing (network errors, malformed responses)
- Environment variable handling validation

### MCP Client Integration

Configure in MCP clients (e.g., Cursor IDE) by adding to `mcp.json`:
```json
{
  "mcpServers": {
    "kra-racing-analysis": {
      "command": "npx",
      "args": ["tsx", "/path/to/kra-mcp/src/index.ts"]
    }
  }
}
```

## Development Notes

- The project uses ES modules (`"type": "module"` in package.json)
- TypeScript configured for ES2022 target with ESNext modules
- XML responses are automatically converted to JSON using xml2js
- API responses are cached and processed to extract relevant racing data
- All user-facing text is in Korean to match the target audience