#!/usr/bin/env node

import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { parseString } from "xml2js";
import { promisify } from "util";
import dotenv from "dotenv";

// .env 파일 로드
dotenv.config();

const parseXmlToJson = promisify(parseString);

// 환경변수 디버깅 (개발모드에서만)
if (process.env.NODE_ENV !== 'production') {
  console.error("🔍 MCP 서버 환경변수 디버깅:");
  console.error("- KRA_SERVICE_KEY 존재:", !!process.env.KRA_SERVICE_KEY);
  console.error("- KRA_SERVICE_KEY 길이:", process.env.KRA_SERVICE_KEY?.length || 0);
  console.error("- KRA_SERVICE_KEY 앞 10자:", process.env.KRA_SERVICE_KEY?.substring(0, 10));
}

// KRA API 설정 - 올바른 엔드포인트로 업데이트
const KRA_API_BASE_URL = "https://apis.data.go.kr/B551015/API214_1";
const KRA_SERVICE_KEY = process.env.KRA_SERVICE_KEY || ""; // 환경변수에서 서비스키 로드

// KRA API 응답 타입 정의
interface KRAApiResponse<T> {
  response: {
    header: {
      resultCode: string;
      resultMsg: string;
    };
    body: {
      items?: T[];
      numOfRows: number;
      pageNo: number;
      totalCount: number;
    };
  };
}

interface RaceResultItem {
  hrNo: string;           // 마번
  hrName: string;         // 마명
  hrNameEn: string;       // 영문마명
  age: string;            // 연령
  sex: string;            // 성별
  wgBudam: string;        // 부담중량
  jkName: string;         // 기수명
  jkNameEn: string;       // 영문기수이름
  jkNo: string;           // 기수번호
  trName: string;         // 조교사명
  trNameEn: string;       // 영문조교사이름
  trNo: string;           // 조교사번호
  owName: string;         // 마주명
  rcTime: string;         // 경주기록
  wgHr: string;           // 마체중
  diffUnit: string;       // 착차
  winOdds: string;        // 단승식 배당율
  plcOdds: string;        // 복승식 배당율
  ord: string;            // 순위
  meet: string;           // 시행경마장명
  rcDate: string;         // 경주일자
  rcNo: string;           // 경주번호
  rcDist: string;         // 경주거리
  rcName: string;         // 경주명
  weather: string;        // 날씨
  track: string;          // 주로
  budam: string;          // 부담구분
  prizeCond: string;      // 경주조건
  ageCond: string;        // 연령조건
  sexCond: string;        // 성별조건
  chaksun1: string;       // 1착상금
  chaksun2: string;       // 2착상금
  chaksun3: string;       // 3착상금
  chulNo: string;         // 출주번호
}

// KRA API 호출 함수 - 테스트 가능하도록 분리
export async function callKRAApi(endpoint: string, params: Record<string, string>): Promise<any> {
  const apiKey = process.env.KRA_SERVICE_KEY || KRA_SERVICE_KEY;
  
  if (!apiKey) {
    throw new Error("KRA_SERVICE_KEY environment variable is required");
  }

  // 디버깅: API 키 상태 확인
  if (process.env.NODE_ENV !== 'production') {
    console.error(`🔧 API 호출 디버깅 - ${endpoint}:`);
    console.error("- API 키 길이:", apiKey.length);
    console.error("- API 키 앞부분:", apiKey.substring(0, 15) + "...");
  }

  const searchParams = new URLSearchParams(params);
  // serviceKey는 이미 인코딩되어 있으므로 수동으로 추가
  const url = `${KRA_API_BASE_URL}${endpoint}?serviceKey=${apiKey}&${searchParams}`;
  
  if (process.env.NODE_ENV !== 'production') {
    console.error("- 요청 URL 길이:", url.length);
    console.error("- 파라미터:", JSON.stringify(params));
  }
  
  try {
    const response = await fetch(url);
    
    if (process.env.NODE_ENV !== 'production') {
      console.error("- 응답 상태:", response.status);
      console.error("- 응답 타입:", response.headers.get('content-type'));
    }
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      return await response.json();
    } else {
      // XML 응답을 JSON으로 파싱
      const xmlText = await response.text();
      
      if (process.env.NODE_ENV !== 'production') {
        console.error("- XML 응답 길이:", xmlText.length);
        if (xmlText.includes('SERVICE_KEY_IS_NOT_REGISTERED_ERROR')) {
          console.error("❌ API 키 등록 오류 발견!");
        }
      }
      
      try {
        const jsonResult = await new Promise((resolve, reject) => {
          parseString(xmlText, {
            explicitArray: false,
            ignoreAttrs: true,
            trim: true
          }, (err: any, result: any) => {
            if (err) reject(err);
            else resolve(result);
          });
        });
        return jsonResult;
      } catch (xmlError) {
        return { 
          rawXml: xmlText, 
          error: "XML 파싱 실패",
          note: "원본 XML 데이터를 반환합니다"
        };
      }
    }
  } catch (error) {
    throw new Error(`KRA API 호출 실패: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// 날짜 형식 검증 및 변환 - 테스트 가능하도록 export
export function validateAndFormatDate(dateStr: string): string {
  const cleaned = dateStr.replace(/[-\/\s]/g, '');
  if (!/^\d{8}$/.test(cleaned)) {
    throw new Error("날짜는 YYYYMMDD 형식이어야 합니다 (예: 20240101)");
  }
  return cleaned;
}

// 경마장 코드 변환 - 테스트 가능하도록 export
export function getTrackCode(trackName?: string): string {
  if (!trackName) return "1"; // 기본값: 서울
  
  const trackMap: Record<string, string> = {
    "서울": "1",
    "seoul": "1",
    "제주": "2", 
    "jeju": "2",
    "부산": "3",
    "부산경남": "3",
    "busan": "3"
  };
  
  return trackMap[trackName.toLowerCase()] || "1";
}

// 데이터 포맷팅 헬퍼 함수들
function formatRaceData(data: any): string {
  if (!data || !data.response) {
    return "❌ 유효하지 않은 응답 데이터입니다.";
  }

  const { response } = data;
  
  if (response.header.resultCode !== "00") {
    return `❌ API 오류: ${response.header.resultMsg}`;
  }

  if (!response.body || !response.body.items) {
    return "📝 해당 조건에 맞는 경주 데이터가 없습니다.";
  }

  // API 응답 구조에 맞게 items 추출
  let items;
  if (response.body.items.item) {
    items = Array.isArray(response.body.items.item) ? response.body.items.item : [response.body.items.item];
  } else if (Array.isArray(response.body.items)) {
    items = response.body.items;
  } else {
    items = [response.body.items];
  }
  
  if (items.length === 0) {
    return "📝 해당 조건에 맞는 경주 데이터가 없습니다.";
  }

  let result = "";
  
  // 경주별로 그룹화
  const raceGroups = new Map<string, any[]>();
  items.forEach((item: any) => {
    const key = `${item.rcNo}R - ${item.rcName || '경주명 미상'}`;
    if (!raceGroups.has(key)) {
      raceGroups.set(key, []);
    }
    raceGroups.get(key)!.push(item);
  });

  raceGroups.forEach((horses, raceInfo) => {
    result += `\n🏁 **${raceInfo}**\n`;
    
    if (horses.length > 0) {
      const firstHorse = horses[0];
      result += `📍 경마장: ${getTrackNameByCode(firstHorse.meet)}\n`;
      result += `📏 거리: ${firstHorse.rcDist}m\n`;
      result += `🌤️ 날씨: ${firstHorse.weather}\n`;
      result += `🏁 주로: ${firstHorse.track}\n`;
      result += `🏆 1착 상금: ${Number(firstHorse.chaksun1).toLocaleString()}원\n`;
      result += `\n**🐎 출전마 정보 (${horses.length}마리):**\n`;
      
      // 순위별로 정렬
      const sortedHorses = horses.sort((a: any, b: any) => parseInt(a.ord || "999") - parseInt(b.ord || "999"));
      
      sortedHorses.forEach((horse: any, index: number) => {
        const position = horse.ord ? `${horse.ord}위` : "순위미정";
        const odds = horse.winOdds ? `${parseFloat(horse.winOdds).toFixed(1)}배` : "배당률미정";
        const time = horse.rcTime || "기록미정";
        
        result += `${index + 1}. **${horse.hrName}** (${horse.hrNo}번마)\n`;
        result += `   └ ${position} | 기록: ${time} | 단승배당: ${odds}\n`;
        result += `   └ 기수: ${horse.jkName} | 조교사: ${horse.trName}\n`;
        result += `   └ 연령: ${horse.age}세 | 성별: ${horse.sex} | 마체중: ${horse.wgHr}kg\n`;
        result += `   └ 마주: ${horse.owName}\n\n`;
      });
    }
  });

  return result;
}

function formatHorsePerformanceData(data: any, horseName: string): string {
  if (!data || !data.response) {
    return `❌ "${horseName}"의 성적 데이터를 찾을 수 없습니다.`;
  }

  const { response } = data;
  
  if (response.header.resultCode !== "00") {
    return `❌ API 오류: ${response.header.resultMsg}`;
  }

  if (!response.body || !response.body.items) {
    return `📝 "${horseName}"의 최근 경주 기록이 없습니다.`;
  }

  // API 응답 구조에 맞게 items 추출
  let items;
  if (response.body.items.item) {
    items = Array.isArray(response.body.items.item) ? response.body.items.item : [response.body.items.item];
  } else if (Array.isArray(response.body.items)) {
    items = response.body.items;
  } else {
    items = [response.body.items];
  }

  // 해당 말의 데이터만 필터링
  const horseData = items.filter((item: any) => 
    item.hrName && (
      item.hrName.includes(horseName) || 
      horseName.includes(item.hrName) ||
      item.hrNameEn?.toLowerCase().includes(horseName.toLowerCase())
    )
  );

  if (horseData.length === 0) {
    return `📝 "${horseName}"의 경주 기록을 찾을 수 없습니다. (검색된 전체 기록: ${items.length}건)`;
  }

  let result = `🐎 **"${horseName}" 성적 분석**\n\n`;
  
  // 기본 정보 (최신 기록 기준)
  const latestRecord = horseData[0];
  result += `📋 **기본 정보:**\n`;
  result += `• 마명: ${latestRecord.hrName} (${latestRecord.hrNameEn || '영문명 없음'})\n`;
  result += `• 연령: ${latestRecord.age}세\n`;
  result += `• 성별: ${latestRecord.sex}\n`;
  result += `• 최근 조교사: ${latestRecord.trName}\n`;
  result += `• 최근 마주: ${latestRecord.owName}\n\n`;

  // 성적 통계
  const wins = horseData.filter((record: any) => record.ord === "1").length;
  const places = horseData.filter((record: any) => ["1", "2", "3"].includes(record.ord)).length;
  const totalRaces = horseData.length;
  
  result += `📊 **성적 통계 (최근 ${totalRaces}경주):**\n`;
  result += `• 1착: ${wins}회 (승률: ${((wins/totalRaces)*100).toFixed(1)}%)\n`;
  result += `• 연대(1-3위): ${places}회 (연대율: ${((places/totalRaces)*100).toFixed(1)}%)\n\n`;

  // 최근 경주 기록
  result += `🏁 **최근 경주 기록:**\n`;
  horseData.slice(0, 5).forEach((record: any, index: number) => {
    const position = record.ord ? `${record.ord}위` : "순위미정";
    const odds = record.winOdds ? `${parseFloat(record.winOdds).toFixed(1)}배` : "배당률미정";
    
    result += `${index + 1}. ${record.rcDate} ${getTrackNameByCode(record.meet)} ${record.rcNo}R\n`;
    result += `   └ ${position} | ${record.rcDist}m | 기록: ${record.rcTime || "미기록"}\n`;
    result += `   └ 기수: ${record.jkName} | 단승배당: ${odds}\n\n`;
  });

  return result;
}

function formatJockeyStatsData(data: any, jockeyName: string): string {
  if (!data || !data.response) {
    return `❌ "${jockeyName}" 기수의 통계 데이터를 찾을 수 없습니다.`;
  }

  const { response } = data;
  
  if (response.header.resultCode !== "00") {
    return `❌ API 오류: ${response.header.resultMsg}`;
  }

  if (!response.body || !response.body.items) {
    return `📝 "${jockeyName}" 기수의 최근 경주 기록이 없습니다.`;
  }

  // API 응답 구조에 맞게 items 추출
  let items;
  if (response.body.items.item) {
    items = Array.isArray(response.body.items.item) ? response.body.items.item : [response.body.items.item];
  } else if (Array.isArray(response.body.items)) {
    items = response.body.items;
  } else {
    items = [response.body.items];
  }
  
  // 해당 기수의 데이터만 필터링
  const jockeyData = items.filter((item: any) => 
    item.jkName && (
      item.jkName.includes(jockeyName) || 
      jockeyName.includes(item.jkName) ||
      item.jkNameEn?.toLowerCase().includes(jockeyName.toLowerCase())
    )
  );

  if (jockeyData.length === 0) {
    return `📝 "${jockeyName}" 기수의 경주 기록을 찾을 수 없습니다. (검색된 전체 기록: ${items.length}건)`;
  }

  let result = `🏇 **"${jockeyName}" 기수 통계**\n\n`;
  
  // 기본 정보 (최신 기록 기준)
  const latestRecord = jockeyData[0];
  result += `📋 **기본 정보:**\n`;
  result += `• 기수명: ${latestRecord.jkName} (${latestRecord.jkNameEn || '영문명 없음'})\n`;
  result += `• 기수번호: ${latestRecord.jkNo}\n\n`;

  // 성적 통계
  const wins = jockeyData.filter((record: any) => record.ord === "1").length;
  const places = jockeyData.filter((record: any) => ["1", "2", "3"].includes(record.ord)).length;
  const totalRaces = jockeyData.length;
  
  result += `📊 **성적 통계 (최근 ${totalRaces}경주):**\n`;
  result += `• 1착: ${wins}회 (승률: ${((wins/totalRaces)*100).toFixed(1)}%)\n`;
  result += `• 연대(1-3위): ${places}회 (연대율: ${((places/totalRaces)*100).toFixed(1)}%)\n\n`;

  // 최근 경주 기록
  result += `🏁 **최근 경주 기록:**\n`;
  jockeyData.slice(0, 5).forEach((record: any, index: number) => {
    const position = record.ord ? `${record.ord}위` : "순위미정";
    const odds = record.winOdds ? `${parseFloat(record.winOdds).toFixed(1)}배` : "배당률미정";
    
    result += `${index + 1}. ${record.rcDate} ${getTrackNameByCode(record.meet)} ${record.rcNo}R\n`;
    result += `   └ ${position} | ${record.rcDist}m | 기록: ${record.rcTime || "미기록"}\n`;
    result += `   └ 마명: ${record.hrName} | 단승배당: ${odds}\n\n`;
  });

  return result;
}

function getTrackNameByCode(meetCode: string): string {
  const trackMap: Record<string, string> = {
    "1": "서울",
    "2": "제주", 
    "3": "부산경남"
  };
  return trackMap[meetCode] || `경마장코드${meetCode}`;
}

// Create an MCP server instance for Korea Racing Authority data analysis
const server = new McpServer({
  name: "KRA Racing Data Analysis Server",
  version: "1.0.0"
});

/**
 * Tools - Functions for racing data analysis and operations
 */

// Race information analysis tool - 실제 API 연동
server.tool("analyze-race",
  { 
    raceDate: z.string().describe("경주일자 (YYYYMMDD 형식, 예: 20240220)"),
    raceNumber: z.number().optional().describe("경주번호 (1-12, 생략시 모든 경주)"),
    trackCode: z.string().optional().describe("경마장 (서울/제주/부산 또는 seoul/jeju/busan)")
  },
  async ({ raceDate, raceNumber, trackCode }) => {
    try {
      const formattedDate = validateAndFormatDate(raceDate);
      const meet = getTrackCode(trackCode);
      
      const params: Record<string, string> = {
        numOfRows: "50",
        pageNo: "1",
        meet: meet,
        rc_date: formattedDate,
      };
      
      if (raceNumber) {
        params.rc_no = raceNumber.toString();
      }

      const response = await callKRAApi("/RaceDetailResult_1", params);
      
      // 새로운 포맷팅 함수 사용
      const formattedResult = formatRaceData(response);
      
      return {
        content: [{ 
          type: "text", 
          text: formattedResult
        }]
      };
    } catch (error) {
      return {
        content: [{ 
          type: "text", 
          text: `❌ 경주 분석 중 오류 발생: ${error instanceof Error ? error.message : String(error)}\n\n💡 확인사항:\n- KRA_SERVICE_KEY 환경변수 설정\n- 날짜 형식 (YYYYMMDD)\n- 인터넷 연결 상태` 
        }]
      };
    }
  }
);

// Horse performance analysis tool - 실제 API 연동으로 개선
server.tool("analyze-horse-performance",
  { 
    horseName: z.string().describe("말 이름 (한글 또는 영문)"),
    period: z.string().optional().default("6months").describe("분석 기간 (예: 6months, 1year)")
  },
  async ({ horseName, period }) => {
    try {
      // 최근 데이터를 가져오기 위한 날짜 계산
      const endDate = new Date();
      const startDate = new Date();
      
      if (period === "1year") {
        startDate.setFullYear(startDate.getFullYear() - 1);
      } else {
        startDate.setMonth(startDate.getMonth() - 6);
      }
      
      const startDateStr = startDate.toISOString().slice(0, 10).replace(/-/g, '');
      const endDateStr = endDate.toISOString().slice(0, 10).replace(/-/g, '');
      
      // 기간별로 데이터 조회 (월별로 나누어 조회)
      const params = {
        numOfRows: "100",
        pageNo: "1",
        rc_month: endDateStr.slice(0, 6) // 최근 월 데이터
      };

      const response = await callKRAApi("/RaceDetailResult_1", params);
      
      // 새로운 포맷팅 함수 사용
      const formattedResult = formatHorsePerformanceData(response, horseName);
      
      return {
        content: [{ 
          type: "text", 
          text: formattedResult
        }]
      };
    } catch (error) {
      return {
        content: [{ 
          type: "text", 
          text: `❌ 말 성적 분석 중 오류 발생: ${error instanceof Error ? error.message : String(error)}` 
        }]
      };
    }
  }
);

// Jockey statistics tool - 실제 API 연동으로 개선
server.tool("get-jockey-stats",
  { 
    jockeyName: z.string().describe("기수명 (한글 또는 영문)"),
    year: z.number().optional().describe("조회 년도 (예: 2024, 생략시 최근 데이터)")
  },
  async ({ jockeyName, year }) => {
    try {
      const targetYear = year || new Date().getFullYear();
      const params = {
        numOfRows: "100",
        pageNo: "1",
        rc_year: targetYear.toString()
      };

      const response = await callKRAApi("/RaceDetailResult_1", params);
      
      // 새로운 포맷팅 함수 사용
      const formattedResult = formatJockeyStatsData(response, jockeyName);
      
      return {
        content: [{ 
          type: "text", 
          text: formattedResult
        }]
      };
    } catch (error) {
      return {
        content: [{ 
          type: "text", 
          text: `❌ 기수 통계 조회 중 오류 발생: ${error instanceof Error ? error.message : String(error)}` 
        }]
      };
    }
  }
);

// Odds analysis tool - 실제 API 연동으로 개선
server.tool("analyze-odds",
  { 
    raceDate: z.string().describe("경주일자 (YYYYMMDD)"),
    raceNumber: z.number().describe("경주번호"),
    betType: z.enum(["win", "place", "quinella", "exacta", "trifecta"]).optional().default("win").describe("마권 종류")
  },
  async ({ raceDate, raceNumber, betType }) => {
    try {
      const formattedDate = validateAndFormatDate(raceDate);
      
      const params = {
        numOfRows: "20",
        pageNo: "1",
        rc_date: formattedDate,
        rc_no: raceNumber.toString()
      };

      const response = await callKRAApi("/RaceDetailResult_1", params);
      
      let oddsText = `💰 배당률 분석: ${formattedDate} ${raceNumber}R\n`;
      oddsText += `🎯 마권 종류: ${betType}\n\n`;
      oddsText += `📊 경주 결과 및 배당률:\n${JSON.stringify(response, null, 2)}\n\n`;
      oddsText += `💡 단승식/복승식 배당률과 경주 결과를 분석합니다.`;
      
      return {
        content: [{ 
          type: "text", 
          text: oddsText
        }]
      };
    } catch (error) {
      return {
        content: [{ 
          type: "text", 
          text: `❌ 배당률 분석 중 오류 발생: ${error instanceof Error ? error.message : String(error)}` 
        }]
      };
    }
  }
);

// Track condition impact analysis - 실제 API 연동으로 개선
server.tool("analyze-track-condition",
  { 
    trackCode: z.string().describe("경마장 코드 (서울/제주/부산)"),
    date: z.string().describe("조회 날짜 (YYYYMMDD)"),
    weather: z.string().optional().describe("날씨 조건 (맑음/흐림/비 등)")
  },
  async ({ trackCode, date, weather }) => {
    try {
      const formattedDate = validateAndFormatDate(date);
      const meet = getTrackCode(trackCode);
      
      const params = {
        numOfRows: "50",
        pageNo: "1",
        meet: meet,
        rc_date: formattedDate
      };

      const response = await callKRAApi("/RaceDetailResult_1", params);
      
      let conditionText = `🌤️ 주로 상태 분석: ${trackCode} (${formattedDate})\n`;
      if (weather) {
        conditionText += `☀️ 날씨: ${weather}\n`;
      }
      conditionText += `\n📊 해당일 경주 데이터:\n${JSON.stringify(response, null, 2)}\n\n`;
      conditionText += `💡 주로 상태와 날씨가 경주 기록에 미치는 영향을 분석합니다.`;
      
      return {
        content: [{ 
          type: "text", 
          text: conditionText
        }]
      };
    } catch (error) {
      return {
        content: [{ 
          type: "text", 
          text: `❌ 주로 상태 분석 중 오류 발생: ${error instanceof Error ? error.message : String(error)}` 
        }]
      };
    }
  }
);

/**
 * Resources - Racing data and information sources
 */

// Racing schedule resource
server.resource(
  "race-schedule",
  new ResourceTemplate("schedule://{date}", { 
    list: () => ({
      resources: [
        { uri: "schedule://today", name: "오늘 경주 일정", description: "Today's racing schedule" },
        { uri: "schedule://tomorrow", name: "내일 경주 일정", description: "Tomorrow's racing schedule" }
      ]
    })
  }),
  async (uri, { date }) => ({
    contents: [{
      uri: uri.href,
      text: JSON.stringify({
        date: date,
        races: [
          { raceNumber: 1, time: "10:30", track: "서울", distance: "1200m", grade: "3등급" },
          { raceNumber: 2, time: "11:00", track: "서울", distance: "1400m", grade: "2등급" }
        ],
        note: "실제 KRA API 데이터로 대체 예정"
      }, null, 2)
    }]
  })
);

// Horse database resource
server.resource(
  "horse-info",
  new ResourceTemplate("horses://{horseName}", { list: undefined }),
  async (uri, { horseName }) => ({
    contents: [{
      uri: uri.href,
      text: JSON.stringify({
        name: horseName,
        age: 4,
        gender: "수컷",
        trainer: "김○○",
        owner: "○○목장",
        records: {
          total: 15,
          wins: 3,
          places: 5,
          earnings: "45,000,000원"
        },
        recentRaces: [
          { date: "2024-01-15", track: "서울", position: 2, odds: "5.2" },
          { date: "2024-01-01", track: "부산", position: 1, odds: "3.8" }
        ],
        note: "실제 KRA API 데이터로 대체 예정"
      }, null, 2)
    }]
  })
);

// Track information resource
server.resource(
  "track-info",
  new ResourceTemplate("tracks://{trackCode}", {
    list: () => ({
      resources: [
        { uri: "tracks://seoul", name: "서울경마공원", description: "Seoul Race Park" },
        { uri: "tracks://busan", name: "부산경남경마공원", description: "Busan Gyeongnam Race Park" },
        { uri: "tracks://jeju", name: "제주경마공원", description: "Jeju Race Park" }
      ]
    })
  }),
  async (uri, { trackCode }) => ({
    contents: [{
      uri: uri.href,
      text: JSON.stringify({
        code: trackCode,
        name: trackCode === "seoul" ? "서울경마공원" : 
              trackCode === "busan" ? "부산경남경마공원" : 
              trackCode === "jeju" ? "제주경마공원" : "알 수 없음",
        location: trackCode === "seoul" ? "경기도 과천시" : 
                  trackCode === "busan" ? "경상남도 김해시" : 
                  trackCode === "jeju" ? "제주특별자치도 제주시" : "",
        trackLength: trackCode === "seoul" ? "1800m" : "1400m",
        surface: "잔디/모래",
        facilities: ["관중석", "베팅창구", "주차장", "식당"],
        note: "실제 KRA API 데이터로 대체 예정"
      }, null, 2)
    }]
  })
);

// KRA API configuration resource
server.resource(
  "api-config",
  "config://kra-api",
  async (uri) => ({
    contents: [{
      uri: uri.href,
      text: JSON.stringify({
        serverName: "KRA Racing Data Analysis Server",
        version: "1.0.0",
        description: "한국 마사회 경마 데이터 분석 서버",
        supportedFeatures: ["경주 분석", "말 성적 분석", "기수 통계", "배당률 분석", "주로 상태 분석"],
        apiEndpoints: {
          note: "실제 KRA 공공 API 엔드포인트가 여기에 설정됩니다"
        },
        configuration: {
          maxConcurrency: 10,
          timeout: 30000,
          retryAttempts: 3
        }
      }, null, 2)
    }]
  })
);

/**
 * Prompts - Racing data analysis conversation templates
 */

// Race prediction analysis prompt
server.prompt(
  "predict-race",
  { 
    raceDate: z.string(),
    raceNumber: z.string(),
    analysisType: z.string().optional()
  },
  (args) => ({
    messages: [{
      role: "user",
      content: {
        type: "text",
        text: `다음 경주에 대한 ${args.analysisType || "basic"} 분석을 수행해주세요:

경주 정보: ${args.raceDate} ${args.raceNumber}R

분석 항목:
- 출전마 성적 분석
- 기수 실력 평가
- 최근 컨디션 상태
- 주로 및 날씨 영향
- 배당률 동향

분석 유형에 따른 추가 정보를 포함해주세요.`
      }
    }]
  })
);

// Horse performance report prompt
server.prompt(
  "horse-performance-report",
  { 
    horseName: z.string(),
    period: z.string().optional()
  },
  (args) => ({
    messages: [{
      role: "user",
      content: {
        type: "text",
        text: `'${args.horseName}'의 성적 리포트를 작성해주세요:

분석 기간: ${args.period || "6months"}

포함할 내용:
- 기본 정보 (나이, 성별, 소속 등)
- 출전 기록 및 성적
- 거리별/주로별 성적
- 최근 폼 상태
- 강점과 약점 분석
- 향후 전망

데이터 기반의 객관적인 분석을 제공해주세요.`
      }
    }]
  })
);

// Market analysis prompt
server.prompt(
  "market-analysis",
  { 
    targetRace: z.string(),
    analysisScope: z.string().optional()
  },
  (args) => ({
    messages: [{
      role: "user",
      content: {
        type: "text",
        text: `${args.targetRace}에 대한 마권 시장 분석을 수행해주세요:

분석 범위: ${args.analysisScope || "comprehensive"}

분석 내용:
- 배당률 분석 (초기 vs 최종, 변화 패턴)
- 거래량 분석 (분포, 시간대별 패턴)
- 트렌드 분석 (인기마 변화, 시장 심리)

투자 관점에서의 시사점도 함께 제공해주세요.`
      }
    }]
  })
);

/**
 * Error handling
 */
process.on('uncaughtException', (error) => {
  console.error('KRA Server uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('KRA Server unhandled rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

/**
 * Start the KRA Racing Data Analysis Server
 */
async function main() {
  // 프로덕션 환경에서는 로그 출력 최소화
  const isDebug = process.env.NODE_ENV === 'development';
  
  if (isDebug) {
    console.error('🏇 Starting KRA Racing Data Analysis Server...');
    console.error('🇰🇷 한국 마사회 경마 데이터 분석 서버 시작...');
  }
  
  try {
    // Create stdio transport for communication
    const transport = new StdioServerTransport();
    
    // Connect the server to the transport
    await server.connect(transport);
    
    if (isDebug) {
      console.error('✅ KRA Server connected and ready!');
      console.error('🔧 Available tools: analyze-race, analyze-horse-performance, get-jockey-stats, analyze-odds, analyze-track-condition');
      console.error('📁 Available resources: schedule://{date}, horses://{horseName}, tracks://{trackCode}, config://kra-api');
      console.error('💬 Available prompts: predict-race, horse-performance-report, market-analysis');
      console.error('⚠️  Note: API integration with KRA public API is pending');
    }
    
  } catch (error) {
    console.error('❌ Failed to start KRA server:', error);
    process.exit(1);
  }
}

// Run the server immediately
main().catch((error) => {
  console.error('❌ KRA Server error:', error);
  process.exit(1);
});