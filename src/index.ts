#!/usr/bin/env node

import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import dotenv from "dotenv";

// .env 파일 로드
dotenv.config();

// 구조화된 로깅 헬퍼 함수
function logInfo(message: string, data?: any): void {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level: 'INFO',
    message,
    data
  };
  
  if (process.env.NODE_ENV !== 'production') {
    console.error(`ℹ️ [${timestamp}] ${message}`, data || '');
  }
}

function logError(message: string, error?: any): void {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level: 'ERROR',
    message,
    error: error?.toString()
  };
  
  console.error(`❌ [${timestamp}] ${message}`, error || '');
}

function logDebug(message: string, data?: any): void {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level: 'DEBUG',
    message,
    data
  };
  
  if (process.env.NODE_ENV !== 'production') {
    console.error(`🔧 [${timestamp}] ${message}`, data || '');
  }
}

// 환경변수 디버깅 (개발모드에서만)
if (process.env.NODE_ENV !== 'production') {
  logDebug("MCP 서버 환경변수 디버깅");
  logDebug("- KRA_SERVICE_KEY 존재", !!process.env.KRA_SERVICE_KEY);
}

// KRA API 설정 - 올바른 엔드포인트로 업데이트
const KRA_API_BASE_URL = "https://apis.data.go.kr/B551015/API214_1";
const KRA_API299_BASE_URL = "https://apis.data.go.kr/B551015/API299"; // 새로운 API299 엔드포인트
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

interface JockeyInfoItem {
  jkName: string;         // 기수명
  jkNameEn: string;       // 영문기수명
  jkNo: string;           // 기수번호
  meet: string;           // 소속경마장 (1:서울, 2:제주, 3:부산)
  jkGroup: string;        // 소속조
  firstCnt: string;       // 통산 1위횟수
  secondCnt: string;      // 통산 2위횟수
  thirdCnt: string;       // 통산 3위횟수
  totalCnt: string;       // 총 출전횟수
  winRate: string;        // 승률
  placeRate: string;      // 연대율
}

// KRA API299 호출 함수 - 통계 및 예측 데이터용
export async function callKRAAPI299(endpoint: string, params: Record<string, string>): Promise<any> {
  const apiKey = process.env.KRA_SERVICE_KEY || KRA_SERVICE_KEY;
  
  if (!apiKey) {
    throw new Error("KRA API 호출 실패: KRA_SERVICE_KEY environment variable is required");
  }

  // 디버깅: API 키 상태 확인
  logDebug(`API299 호출 디버깅 - ${endpoint}`);

  // JSON 응답 타입 추가 및 serviceKey를 수동으로 추가하여 이중 인코딩 방지
  const searchParams = new URLSearchParams({...params, _type: 'json'});
  const url = `${KRA_API299_BASE_URL}${endpoint}?serviceKey=${apiKey}&${searchParams}`;
  
  logDebug("파라미터", JSON.stringify(params));
  
  try {
    if (typeof fetch === 'undefined') {
      throw new Error('글로벌 fetch 가 정의되지 않음');
    }
    const response = await fetch(url);
    
    logDebug("응답 상태", response.status);
    logDebug("응답 타입", response.headers.get('content-type'));
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // JSON 응답 처리 (기본적으로 _type=json 파라미터 사용)
    const jsonData = await response.json();
    
    // API 에러 상태 검사
    if (jsonData?.response?.header?.resultCode !== "00") {
      const errorMsg = jsonData?.response?.header?.resultMsg || "Unknown API Error";
      
      if (errorMsg.includes('SERVICE_KEY_IS_NOT_REGISTERED_ERROR')) {
        logError("API 키 등록 오류 발견!");
        throw new Error("서비스키가 등록되지 않았습니다. 공공데이터포털에서 API 신청 및 키 등록을 확인해주세요.");
      }
      
      if (errorMsg.includes('APPLICATION_ERROR')) {
        logError("애플리케이션 오류 발견!");
        throw new Error("API 호출 중 서버 오류가 발생했습니다.");
      }
      
      throw new Error(`KRA API299 에러: ${errorMsg}`);
    }
    
    return jsonData;
  } catch (error) {
    throw new Error(`KRA API299 호출 실패: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// KRA API 호출 함수 - 테스트 가능하도록 분리
export async function callKRAApi(endpoint: string, params: Record<string, string>): Promise<any> {
  const apiKey = process.env.KRA_SERVICE_KEY || KRA_SERVICE_KEY;
  
  if (!apiKey) {
    throw new Error("KRA API 호출 실패: KRA_SERVICE_KEY environment variable is required");
  }

  // 디버깅: API 키 상태 확인
  logDebug(`API 호출 디버깅 - ${endpoint}`);

  // JSON 응답 타입 추가 및 serviceKey를 수동으로 추가하여 이중 인코딩 방지
  const searchParams = new URLSearchParams({...params, _type: 'json'});
  const url = `${KRA_API_BASE_URL}${endpoint}?serviceKey=${apiKey}&${searchParams}`;
  
  logDebug("파라미터", JSON.stringify(params));
  
  try {
    if (typeof fetch === 'undefined') {
      throw new Error('글로벌 fetch 가 정의되지 않음');
    }
    const response = await fetch(url);
    
    logDebug("응답 상태", response.status);
    logDebug("응답 타입", response.headers.get('content-type'));
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // JSON 응답 처리 (기본적으로 _type=json 파라미터 사용)
    const jsonData = await response.json();
    
    // API 에러 상태 검사
    if (jsonData?.response?.header?.resultCode !== "00") {
      const errorMsg = jsonData?.response?.header?.resultMsg || "Unknown API Error";
      
      if (errorMsg.includes('SERVICE_KEY_IS_NOT_REGISTERED_ERROR')) {
        logError("API 키 등록 오류 발견!");
        throw new Error("등록되지 않은 서비스키입니다. 공공데이터포털에서 API 신청 및 승인을 확인해주세요.");
      }
      if (errorMsg.includes('DEADLINE_HAS_EXPIRED_ERROR')) {
        throw new Error("기한만료된 서비스키입니다. 공공데이터포털에서 갱신해주세요.");
      }
      if (errorMsg.includes('LIMITED_NUMBER_OF_SERVICE_REQUESTS_EXCEEDS_ERROR')) {
        throw new Error("서비스 요청제한횟수를 초과했습니다. 잠시 후 다시 시도해주세요.");
      }
      if (errorMsg.includes('UNREGISTERED_IP_ERROR')) {
        throw new Error("등록되지 않은 IP입니다. 공공데이터포털에서 IP를 등록해주세요.");
      }
      
      throw new Error(`KRA API 에러: ${errorMsg}`);
    }
    
    return jsonData;
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
  
  // 날짜 유효성 검증
  const year = parseInt(cleaned.slice(0, 4));
  const month = parseInt(cleaned.slice(4, 6));
  const day = parseInt(cleaned.slice(6, 8));
  
  if (year < 2020 || year > new Date().getFullYear() + 1) {
    throw new Error("유효하지 않은 년도입니다 (2020년 이후만 지원)");
  }
  if (month < 1 || month > 12) {
    throw new Error("유효하지 않은 월입니다 (01-12)");
  }
  if (day < 1 || day > 31) {
    throw new Error("유효하지 않은 일입니다 (01-31)");
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
    "부경": "3",
    "부산경남": "3",
    "busan": "3"
  };
  
  return trackMap[trackName.toLowerCase()] || "1";
}

// API299 데이터 포맷팅 함수 - 예측 정보용
function formatPredictionData(data: any): string {
  if (!data || !data.response) {
    return "❌ 예측 데이터를 가져올 수 없습니다.";
  }

  const { response } = data;
  
  if (response.header.resultCode !== "00") {
    return `❌ API299 오류: ${response.header.resultMsg}`;
  }

  if (!response.body || !response.body.items) {
    return "📝 예측 데이터가 없습니다.";
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
    return "📝 예측 데이터가 없습니다.";
  }

  let result = "\n🔮 **예측 분석 정보**\n\n";
  
  // 말/기수/조교사 통계 요약
  const stats = {
    totalRaces: 0,
    totalWins: 0,
    topPerformers: []
  };

  items.forEach((item: any, index: number) => {
    // 통계 집계
    stats.totalRaces += parseInt(item.rcCntT || "0");
    stats.totalWins += parseInt(item.ord1CntT || "0");
    
    // 승률 계산
    const horseWinRate = item.hrOrd1CntT && item.hrRcCntT ? 
      (parseInt(item.hrOrd1CntT) / parseInt(item.hrRcCntT) * 100).toFixed(1) : "0.0";
    const jockeyWinRate = item.jkOrd1CntT && item.jkRcCntT ? 
      (parseInt(item.jkOrd1CntT) / parseInt(item.jkRcCntT) * 100).toFixed(1) : "0.0";
    const trainerWinRate = item.trOrd1CntT && item.trRcCntT ? 
      (parseInt(item.trOrd1CntT) / parseInt(item.trRcCntT) * 100).toFixed(1) : "0.0";

    result += `**${index + 1}번 ${item.hrName}**\n`;
    result += `🐎 **말 통계**: 통산 ${item.hrOrd1CntT || 0}승/${item.hrRcCntT || 0}전 (승률: ${horseWinRate}%)\n`;
    result += `🏇 **기수 ${item.jkName}**: 통산 ${item.jkOrd1CntT || 0}승/${item.jkRcCntT || 0}전 (승률: ${jockeyWinRate}%)\n`;
    result += `👨‍🏫 **조교사 ${item.trName}**: 통산 ${item.trOrd1CntT || 0}승/${item.trRcCntT || 0}전 (승률: ${trainerWinRate}%)\n`;
    
    // 최근 폼 (올해 vs 통산)
    const recentForm = item.jkOrd1CntY && item.jkOrd1CntT ? 
      `최근폼: 올해 ${item.jkOrd1CntY}승 (${((parseInt(item.jkOrd1CntY) / parseInt(item.jkRcCntY || "1")) * 100).toFixed(1)}%)` : "최근폼: 데이터 없음";
    result += `📈 **${recentForm}**\n\n`;
  });

  // 전체 통계 요약
  const overallWinRate = stats.totalRaces > 0 ? (stats.totalWins / stats.totalRaces * 100).toFixed(1) : "0.0";
  result += `📊 **전체 예측 요약**\n`;
  result += `• 총 출전: ${stats.totalRaces}회\n`;
  result += `• 총 승수: ${stats.totalWins}회\n`;
  result += `• 평균 승률: ${overallWinRate}%\n`;

  return result;
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
        const odds = horse.winOdds ? `${Number(horse.winOdds).toFixed(1)}배` : "배당률미정";
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

// 기수 정보 포맷팅 함수
function formatJockeyInfoData(data: any, jockeyName?: string): string {
  if (!data || !data.response) {
    return `❌ 기수 정보 데이터를 찾을 수 없습니다.`;
  }

  const { response } = data;
  
  if (response.header.resultCode !== "00") {
    return `❌ API 오류: ${response.header.resultMsg}`;
  }

  if (!response.body || !response.body.items) {
    return `📝 기수 정보가 없습니다.`;
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

  // 특정 기수 검색시 필터링
  if (jockeyName) {
    items = items.filter((item: any) => 
      item.jkName && (
        item.jkName.includes(jockeyName) || 
        jockeyName.includes(item.jkName) ||
        item.jkNameEn?.toLowerCase().includes(jockeyName.toLowerCase())
      )
    );
    
    if (items.length === 0) {
      return `📝 "${jockeyName}" 기수를 찾을 수 없습니다.`;
    }
  }

  let result = `🏇 **기수 정보** ${jockeyName ? `- "${jockeyName}"` : ''}\n\n`;
  
  items.forEach((jockey: any, index: number) => {
    const trackName = getTrackNameByCode(jockey.meet);
    const winRate = parseFloat(jockey.winRate || "0");
    const placeRate = parseFloat(jockey.placeRate || "0");
    
    result += `**${index + 1}. ${jockey.jkName}** (${jockey.jkNameEn || '영문명 없음'})\n`;
    result += `• 기수번호: ${jockey.jkNo}\n`;
    result += `• 소속: ${trackName} ${jockey.jkGroup || ''}조\n`;
    result += `• 통산성적: ${jockey.firstCnt || 0}승 ${jockey.secondCnt || 0}준 ${jockey.thirdCnt || 0}삼\n`;
    result += `• 총 출전: ${jockey.totalCnt || 0}회\n`;
    result += `• 승률: ${winRate.toFixed(1)}% | 연대율: ${placeRate.toFixed(1)}%\n\n`;
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
}, {
  capabilities: {
    resources: {},
    tools: {},
    prompts: {},
    logging: {}
  }
});

/**
 * Tools - Functions for racing data analysis and operations
 */

// Race information analysis tool - 실제 API 연동
server.tool("analyze-race",
  { 
    raceDate: z.string()
      .regex(/^\d{8}$/, "날짜는 YYYYMMDD 형식이어야 합니다")
      .describe("경주일자 (YYYYMMDD 형식, 예: 20240220)"),
    raceNumber: z.number()
      .int("경주번호는 정수여야 합니다")
      .min(1, "경주번호는 1 이상이어야 합니다")
      .max(12, "경주번호는 12 이하여야 합니다")
      .optional()
      .describe("경주번호 (1-12, 생략시 모든 경주)"),
    trackCode: z.enum(["서울", "제주", "부산", "부경", "seoul", "jeju", "busan"])
      .optional()
      .describe("경마장 (서울/제주/부산/부경 또는 seoul/jeju/busan)")
  },
  async ({ raceDate, raceNumber, trackCode }) => {
    try {
      const formattedDate = validateAndFormatDate(raceDate);
      const meet = getTrackCode(trackCode);
      
      const params: Record<string, string> = {
        numOfRows: "100",  // 100개로 설정하면 모든 라운드 데이터 가져옴
        pageNo: "1",
        meet: meet,
        rc_date: formattedDate,
      };
      
      if (raceNumber) {
        params.rc_no = raceNumber.toString();
      }

      // API214: 경주 결과 데이터 - 첫 페이지
      const firstResponse = await callKRAApi("/RaceDetailResult_1", params);
      
      // 전체 데이터를 담을 배열
      let allItems: any[] = [];
      
      // 첫 페이지 데이터 추가
      if (firstResponse?.response?.body?.items) {
        const firstItems = firstResponse.response.body.items.item || firstResponse.response.body.items;
        allItems = Array.isArray(firstItems) ? firstItems : [firstItems];
      }
      
      // totalCount 확인하여 추가 페이지 필요한지 확인
      const totalCount = parseInt(firstResponse?.response?.body?.totalCount || "0");
      const numOfRows = parseInt(params.numOfRows);
      const totalPages = Math.ceil(totalCount / numOfRows);
      
      // 디버깅 정보 추가
      logDebug(`총 데이터 수: ${totalCount}, 페이지당 개수: ${numOfRows}, 총 페이지: ${totalPages}`);
      
      // 추가 페이지가 있으면 가져오기
      if (totalPages > 1) {
        for (let page = 2; page <= totalPages; page++) {
          params.pageNo = page.toString();
          const pageResponse = await callKRAApi("/RaceDetailResult_1", params);
          
          if (pageResponse?.response?.body?.items) {
            const pageItems = pageResponse.response.body.items.item || pageResponse.response.body.items;
            const itemsArray = Array.isArray(pageItems) ? pageItems : [pageItems];
            allItems = allItems.concat(itemsArray);
          }
        }
      }
      
      // 모든 페이지의 데이터를 합친 응답 객체 생성
      const combinedResponse = {
        response: {
          ...firstResponse.response,
          body: {
            ...firstResponse.response.body,
            items: allItems
          }
        }
      };
      
      const formattedResult = formatRaceData(combinedResponse);
      
      // API299: 예측 정보 추가 시도
      let predictionText = "";
      try {
        const predictionParams: Record<string, string> = {
          pageNo: "1",
          numOfRows: "20",
          rc_date: formattedDate
        };
        
        if (raceNumber) {
          predictionParams.rc_no = raceNumber.toString();
        }
        
        const predictionResponse = await callKRAAPI299("/Race_Result_total", predictionParams);
        predictionText = formatPredictionData(predictionResponse);
      } catch (predictionError) {
        predictionText = "\n🔮 **예측 분석 정보**\n⚠️ 예측 데이터를 가져올 수 없습니다.";
      }
      
      return {
        content: [{ 
          type: "text", 
          text: formattedResult + predictionText
        }]
      };
    } catch (error) {
      return {
        content: [{ 
          type: "text", 
          text: `❌ 경주 분석 중 오류 발생: ${error instanceof Error ? error.message : String(error)}\n\n💡 확인사항:\n- KRA_SERVICE_KEY 환경변수 설정\n- 날짜 형식 (YYYYMMDD)\n- 인터넷 연결 상태` 
        }],
        isError: true
      };
    }
  }
);

// Horse performance analysis tool - 실제 API 연동으로 개선
server.tool("analyze-horse-performance",
  { 
    horseName: z.string()
      .min(1, "말 이름은 비어있을 수 없습니다")
      .max(50, "말 이름이 너무 깁니다")
      .describe("말 이름 (한글 또는 영문)"),
    period: z.enum(["3months", "6months", "1year", "2years"])
      .optional()
      .default("6months")
      .describe("분석 기간 (3months/6months/1year/2years)")
  },
  async ({ horseName, period }) => {
    try {
      // 최근 데이터를 가져오기 위한 날짜 계산
      const endDate = new Date();
      const startDate = new Date();
      
      // 기간별 설정
      switch (period) {
        case "3months":
          startDate.setMonth(startDate.getMonth() - 3);
          break;
        case "1year":
          startDate.setFullYear(startDate.getFullYear() - 1);
          break;
        case "2years":
          startDate.setFullYear(startDate.getFullYear() - 2);
          break;
        default: // 6months
          startDate.setMonth(startDate.getMonth() - 6);
      }
      
      const endDateStr = endDate.toISOString().slice(0, 10).replace(/-/g, '');
      
      // 최근 월 데이터로 조회 (numOfRows 증가)
      const params = {
        numOfRows: "200", // 더 많은 데이터 조회
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
        }],
        isError: true
      };
    }
  }
);

// Jockey statistics tool - 실제 API 연동으로 개선
server.tool("get-jockey-stats",
  { 
    jockeyName: z.string()
      .min(1, "기수명은 비어있을 수 없습니다")
      .max(30, "기수명이 너무 깁니다")
      .describe("기수명 (한글 또는 영문)"),
    year: z.number()
      .int("년도는 정수여야 합니다")
      .min(2020, "너무 오래된 데이터입니다")
      .max(new Date().getFullYear(), "미래 년도는 조회할 수 없습니다")
      .optional()
      .describe("조회 년도 (예: 2024, 생략시 최근 데이터)")
  },
  async ({ jockeyName, year }) => {
    try {
      const targetYear = year || new Date().getFullYear();
      
      // rc_year와 rc_month를 함께 활용
      const currentMonth = new Date().getMonth() + 1;
      const params = {
        numOfRows: "200", // 더 많은 데이터 조회
        pageNo: "1",
        rc_year: targetYear.toString(),
        rc_month: targetYear === new Date().getFullYear() ? 
          `${targetYear}${currentMonth.toString().padStart(2, '0')}` : 
          `${targetYear}12` // 과거 년도는 12월까지
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
        }],
        isError: true
      };
    }
  }
);

// Jockey information tool - 기수 정보 API 연동
server.tool("get-jockey-info",
  { 
    jockeyName: z.string()
      .min(1, "기수명은 비어있을 수 없습니다")
      .max(30, "기수명이 너무 깁니다")
      .optional()
      .describe("기수명 (한글 또는 영문, 생략시 전체 조회)"),
    jockeyNumber: z.string()
      .optional()
      .describe("기수번호"),
    trackCode: z.enum(["서울", "제주", "부산", "부경", "seoul", "jeju", "busan"])
      .optional()
      .describe("경마장 (서울/제주/부산/부경)")
  },
  async ({ jockeyName, jockeyNumber, trackCode }) => {
    try {
      const params: Record<string, string> = {
        numOfRows: "100",
        pageNo: "1"
      };
      
      if (jockeyName) {
        params.jk_name = jockeyName;
      }
      
      if (jockeyNumber) {
        params.jk_no = jockeyNumber;
      }
      
      if (trackCode) {
        params.meet = getTrackCode(trackCode);
      }

      // 기수 정보는 API12_1 사용
      const jockeyApiUrl = "https://apis.data.go.kr/B551015/API12_1/jockeyInfo_1";
      const apiKey = process.env.KRA_SERVICE_KEY || KRA_SERVICE_KEY;
      
      if (!apiKey) {
        throw new Error("KRA API 호출 실패: KRA_SERVICE_KEY environment variable is required");
      }

      const searchParams = new URLSearchParams({...params, _type: 'json'});
      const url = `${jockeyApiUrl}?serviceKey=${apiKey}&${searchParams}`;
      
      const fetchResponse = await fetch(url);
      if (!fetchResponse.ok) {
        throw new Error(`HTTP ${fetchResponse.status}: ${fetchResponse.statusText}`);
      }
      
      // JSON 응답 처리 (기본적으로 _type=json 파라미터 사용)
      const response = await fetchResponse.json();
      
      const formattedResult = formatJockeyInfoData(response, jockeyName);
      
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
          text: `❌ 기수 정보 조회 중 오류 발생: ${error instanceof Error ? error.message : String(error)}` 
        }],
        isError: true
      };
    }
  }
);

// Odds analysis tool - 실제 API 연동으로 개선
server.tool("analyze-odds",
  { 
    raceDate: z.string()
      .regex(/^\d{8}$/, "날짜는 YYYYMMDD 형식이어야 합니다")
      .describe("경주일자 (YYYYMMDD)"),
    raceNumber: z.number()
      .int("경주번호는 정수여야 합니다")
      .min(1, "경주번호는 1 이상이어야 합니다")
      .max(12, "경주번호는 12 이하여야 합니다")
      .describe("경주번호"),
    betType: z.enum(["win", "place", "quinella", "exacta", "trifecta"])
      .optional()
      .default("win")
      .describe("마권 종류")
  },
  async ({ raceDate, raceNumber, betType }) => {
    try {
      const formattedDate = validateAndFormatDate(raceDate);
      
      const params = {
        numOfRows: "50", // 배당률 분석용 충분한 데이터
        pageNo: "1",
        rc_date: formattedDate,
        rc_no: raceNumber.toString(),
        meet: "3" // 기본값: 부산경남으로 변경 (오늘 경기가 있는 곳)
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
        }],
        isError: true
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
  new ResourceTemplate("horses://{horseName}", {
    list: () => ({
      resources: [
        { uri: "horses://우승마", name: "우승마", description: "Horse performance data for 우승마" },
        { uri: "horses://번개", name: "번개", description: "Horse performance data for 번개" },
        { uri: "horses://전설", name: "전설", description: "Horse performance data for 전설" },
        { uri: "horses://청룡", name: "청룡", description: "Horse performance data for 청룡" }
      ]
    })
  }),
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
        { uri: "tracks://seoul", name: "서울경마공원", description: "Seoul Race Park", mimeType: "application/json" },
        { uri: "tracks://busan", name: "부산경남경마공원", description: "Busan Gyeongnam Race Park", mimeType: "application/json" },
        { uri: "tracks://jeju", name: "제주경마공원", description: "Jeju Race Park", mimeType: "application/json" }
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
  try {
    logInfo('🏇 Starting KRA Racing Data Analysis Server...');
    logInfo('🇰🇷 한국 마사회 경마 데이터 분석 서버 시작...');
  
    // Create stdio transport for communication
    const transport = new StdioServerTransport();
    
    // Connect the server to the transport
    await server.connect(transport);
    
    logInfo('✅ KRA Server connected and ready!');
    logInfo('🔧 Available tools: analyze-race, analyze-horse-performance, get-jockey-stats, get-jockey-info, analyze-odds');
    logInfo('📁 Available resources: schedule://{date}, horses://{horseName}, tracks://{trackCode}, config://kra-api');
    logInfo('💬 Available prompts: predict-race, horse-performance-report, market-analysis');
    logInfo('🔗 Integrated with KRA public API');
    
  } catch (error) {
    logError('Failed to start KRA server', error);
    process.exit(1);
  }
}

// Run the server immediately
main().catch((error) => {
  console.error('❌ KRA Server error:', error);
  process.exit(1);
});
