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

### Project File Structure

```
/
├── src/                          # Source code
│   └── index.ts                  # Main MCP server implementation
├── tests/                        # Jest unit tests
│   └── api.test.ts              # API functionality tests
├── scripts/                      # Development and testing scripts
│   ├── debug-env.ts             # Environment variable debugging utility
│   ├── test-api12.js            # API12_1 (jockey info) endpoint test
│   ├── test-api299.js           # API299 (race statistics) endpoint test
│   ├── test-api299-function.js  # API299 function integration test
│   ├── test-final-json.js       # Final JSON-only implementation test
│   ├── test-json-responses.js   # JSON response format validation
│   └── test-response-types.js   # XML vs JSON response type comparison
├── examples/                     # API response samples
│   ├── api12_response.json      # Sample API12_1 JSON response
│   ├── api12_response.xml       # Sample API12_1 XML response
│   ├── api214_response.json     # Sample API214_1 JSON response
│   ├── api214_response.xml      # Sample API214_1 XML response
│   ├── api299_response.json     # Sample API299 JSON response
│   └── api299_response.xml      # Sample API299 XML response
├── dist/                         # Compiled JavaScript output
├── coverage/                     # Test coverage reports
├── docs/
│   └── KRA_PUBLIC_API_GUIDE.md  # Comprehensive KRA API documentation
└── [config files]               # package.json, tsconfig.json, etc.
```

### Testing Strategy

The project uses Jest with TypeScript support for comprehensive testing:
- **Unit Tests (tests/)**: API utility function testing, validation, formatting
- **Integration Scripts (scripts/)**: Real API endpoint testing and debugging
- **Mock Testing**: Network errors, malformed responses, environment validation
- **Response Samples (examples/)**: Both JSON and XML format preservation

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

### API Response Format Evolution

**Current Implementation (JSON-only):**
- All APIs use `_type=json` parameter for native JSON responses
- Eliminates XML parsing overhead and complexity
- Provides proper type safety (numbers as numbers, not strings)
- Significantly improved performance and maintainability

**Deprecated (XML parsing):**
- Previous XML-based implementation removed for simplicity
- xml2js dependency eliminated
- XML sample responses preserved in examples/ for reference

## Development Notes

- The project uses ES modules (`"type": "module"` in package.json)
- TypeScript configured for ES2022 target with ESNext modules
- **JSON-first approach**: All KRA APIs called with `_type=json` parameter
- Native JSON parsing eliminates xml2js dependency and improves performance
- API responses are processed to extract relevant racing data
- All user-facing text is in Korean to match the target audience

## Development Scripts Usage

**Environment Debugging:**
```bash
node scripts/debug-env.ts  # Check API key and environment setup
```

**API Testing:**
```bash
node scripts/test-final-json.js     # Test current JSON implementation
node scripts/test-api12.js          # Test jockey info API
node scripts/test-api299.js         # Test race statistics API
```

**Response Analysis:**
```bash
node scripts/test-json-responses.js    # Generate JSON response samples
node scripts/test-response-types.js    # Compare XML vs JSON formats
```