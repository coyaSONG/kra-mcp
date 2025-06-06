# KRA Racing Data Analysis MCP Server

**한국 마사회(Korea Racing Authority) 공공 API를 활용한 경마 데이터 분석 MCP 서버**

이 프로젝트는 Model Context Protocol (MCP)을 사용하여 한국 마사회의 경마 데이터를 분석하고 인사이트를 제공하는 서버입니다.

## 🏇 주요 기능

### 🔧 분석 도구 (Tools)
- **analyze-race**: 경주 분석 (날짜, 경주번호, 경마장별)
- **analyze-horse-performance**: 말 성적 분석 및 폼 평가
- **get-jockey-stats**: 기수 통계 및 성과 분석
- **get-jockey-info**: 기수 정보 조회
- **analyze-odds**: 배당률 분석 및 패턴 인식

### 📁 데이터 리소스 (Resources)
- **schedule://{date}**: 경주 일정 정보 (오늘/내일)
- **horses://{horseName}**: 말 상세 정보 및 기록
- **tracks://{trackCode}**: 경마장 정보 (서울/부산/제주)
- **config://kra-api**: KRA API 설정 및 구성

### 💬 분석 프롬프트 (Prompts)
- **predict-race**: 경주 예측 분석 (기본/상세/통계)
- **horse-performance-report**: 말 성적 상세 리포트
- **market-analysis**: 마권 시장 분석 (배당률/거래량/트렌드)

## 🎯 활용 분야

- **경주 예측**: 데이터 기반 경주 결과 예측
- **투자 분석**: 마권 투자 전략 수립
- **성과 평가**: 말, 기수, 조교사 성과 분석
- **시장 분석**: 배당률 및 거래량 패턴 분석
- **리스크 관리**: 투자 리스크 평가 및 관리

## 📦 설치 및 설정

### 필수 요구사항
- Node.js 18.0.0 이상
- npm 또는 yarn
- **한국 마사회 공공 API 접근 권한** ✅ **실제 연동 완료**

### KRA API 키 설정 (필수)

1. **공공데이터포털 신청**
   - [공공데이터포털](https://data.go.kr) 접속
   - "한국마사회 경주기록 정보" API 검색 및 신청
   - 승인 후 서비스키 발급받기

2. **환경변수 설정**
   ```bash
   # Windows (PowerShell)
   $env:KRA_SERVICE_KEY="YOUR_SERVICE_KEY_HERE"
   
   # macOS/Linux
   export KRA_SERVICE_KEY="YOUR_SERVICE_KEY_HERE"
   
   # 또는 .env 파일 생성
   echo "KRA_SERVICE_KEY=YOUR_SERVICE_KEY_HERE" > .env
   ```

3. **서비스키 확인**
   - URL 인코딩된 키를 사용해야 합니다
   - 특수문자가 포함된 경우 인코딩 필요

### 프로젝트 설치
```bash
# 저장소 클론
git clone <repository-url>
cd kra-racing-data-mcp-server

# 의존성 설치
npm install

# KRA API 키 설정 (위 참조)
export KRA_SERVICE_KEY="your_service_key"
```

## 🏃‍♂️ 실행 방법

### 개발 모드
```bash
npm run dev
```

### 감시 모드 (파일 변경 시 자동 재시작)
```bash
npm run watch
```

### 프로덕션 빌드 및 실행
```bash
npm run build
npm start
```

## 🔧 MCP 클라이언트 등록

### Cursor IDE에서 사용

`~/.cursor/mcp.json` 파일에 추가:

```json
{
  "mcpServers": {
    "kra-racing-analysis": {
      "command": "npx",
      "args": ["tsx", "C:/Users/SONG/kra-racing-data-mcp-server/src/index.ts"]
    }
  }
}
```

프로덕션 버전 사용 시:
```json
{
  "mcpServers": {
    "kra-racing-analysis": {
      "command": "node",
      "args": ["C:/Users/SONG/kra-racing-data-mcp-server/dist/index.js"]
    }
  }
}
```

Cursor 재시작 후 사용 가능합니다.

## 🧪 테스트 및 검증

### MCP Inspector 사용
```bash
npx @modelcontextprotocol/inspector npx tsx src/index.ts
```

### 도구 테스트 예시
```bash
# 경주 분석 테스트
analyze-race --raceDate="2024-01-15" --raceNumber="3" --trackCode="seoul"

# 말 성적 분석 테스트
analyze-horse-performance --horseName="우승마" --period="1year"
```

## 📂 프로젝트 구조

```
kra-racing-data-mcp-server/
├── src/
│   └── index.ts              # 메인 서버 파일
├── dist/                     # 빌드된 JavaScript 파일
├── package.json              # 프로젝트 설정
├── tsconfig.json             # TypeScript 설정
├── .gitignore               # Git 제외 파일
└── README.md                # 프로젝트 문서
```

## 🔍 사용 예시

### 1. 경주 분석 요청
```typescript
{
  "method": "tools/call",
  "params": {
    "name": "analyze-race",
    "arguments": {
      "raceDate": "2024-01-15",
      "raceNumber": 5,
      "trackCode": "seoul"
    }
  }
}
```

### 2. 말 정보 조회
```typescript
{
  "method": "resources/read",
  "params": {
    "uri": "horses://우승마"
  }
}
```

### 3. 경주 예측 프롬프트
```typescript
{
  "method": "prompts/get",
  "params": {
    "name": "predict-race",
    "arguments": {
      "raceDate": "2024-01-15",
      "raceNumber": "5",
      "analysisType": "detailed"
    }
  }
}
```

## 🛠️ 개발 가이드

### 새로운 분석 도구 추가
```typescript
server.tool("new-analysis-tool",
  { 
    param1: z.string(),
    param2: z.number().optional()
  },
  async ({ param1, param2 }) => ({
    content: [{ 
      type: "text", 
      text: `분석 결과: ${param1} ${param2 || ''}` 
    }]
  })
);
```

### 새로운 데이터 리소스 추가
```typescript
server.resource(
  "new-resource",
  new ResourceTemplate("resource://{id}", { list: undefined }),
  async (uri, { id }) => ({
    contents: [{
      uri: uri.href,
      text: JSON.stringify({ id, data: "..." }, null, 2)
    }]
  })
);
```

## 🌐 API 연동 현황

✅ **현재 연동된 API**:
- **한국 마사회 공공 API**: 경주 정보, 출전마 데이터, 기수 정보
- **API214_1**: 경주 상세 결과 및 분석 데이터
- **API12_1**: 기수 정보 조회
- **API299**: 경주 통계 및 예측 정보

⏳ **향후 연동 예정**:
- **실시간 배당률 API**: 배당률 변화 추적
- **기상 정보 API**: 주로 상태 영향 분석

## 📊 데이터 분석 기능

### 지원하는 분석 유형
- **기술적 분석**: 과거 성적 기반 패턴 분석
- **통계적 분석**: 확률 모델 및 회귀 분석
- **시장 분석**: 배당률 및 거래량 분석
- **비교 분석**: 말, 기수, 조교사 간 비교

### 예측 모델 (계획)
- **머신러닝 모델**: 과거 데이터 기반 예측
- **앙상블 모델**: 다중 모델 결합 예측
- **실시간 분석**: 경주 당일 실시간 데이터 분석

## 🔒 보안 및 준수사항

- 한국 마사회 API 이용약관 준수
- 개인정보보호법 준수
- 안전한 API 키 관리
- 데이터 사용량 제한 준수

## 📚 참고 자료

- [한국 마사회 공식 사이트](http://www.kra.co.kr/)
- [Model Context Protocol 문서](https://modelcontextprotocol.io/)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [Zod 스키마 검증](https://zod.dev/)

## 📄 라이선스

MIT License

---

⚠️ **중요**: 실제 KRA 공공 API와 연동하여 작동합니다. API 키 설정이 필요합니다.

💡 **팁**: Context7과 함께 사용하면 더욱 정확한 경마 데이터 분석을 받을 수 있습니다! 프롬프트에 `use context7`을 추가해보세요. 
