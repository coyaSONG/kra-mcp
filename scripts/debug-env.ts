#!/usr/bin/env node

console.log("🔍 환경변수 디버깅");
console.log("================");

// 환경변수 상태 확인
console.log("📋 환경변수 정보:");
console.log("- NODE_ENV:", process.env.NODE_ENV);
console.log("- KRA_SERVICE_KEY 존재:", !!process.env.KRA_SERVICE_KEY);
console.log("- KRA_SERVICE_KEY 길이:", process.env.KRA_SERVICE_KEY?.length || 0);
console.log("- KRA_SERVICE_KEY 앞 10자:", process.env.KRA_SERVICE_KEY?.substring(0, 10));
console.log("- KRA_SERVICE_KEY 뒤 10자:", process.env.KRA_SERVICE_KEY?.slice(-10));

// 다른 환경변수들도 확인
console.log("\n🌍 기타 환경변수:");
console.log("- PWD:", process.env.PWD);
console.log("- HOME:", process.env.HOME);
console.log("- PATH 앞부분:", process.env.PATH?.substring(0, 100));

// API 키가 URL 인코딩되어 있는지 확인
const apiKey = process.env.KRA_SERVICE_KEY || "";
console.log("\n🔧 API 키 분석:");
console.log("- 원본 키:", apiKey.substring(0, 20) + "...");
console.log("- URL 디코딩된 키:", decodeURIComponent(apiKey).substring(0, 20) + "...");
console.log("- 인코딩 여부:", apiKey !== decodeURIComponent(apiKey) ? "인코딩됨" : "원본");

// 실제 API 테스트
async function testApiWithCurrentEnv() {
  const testKey = process.env.KRA_SERVICE_KEY;
  if (!testKey) {
    console.log("❌ API 키가 없습니다!");
    return;
  }

  console.log("\n🧪 현재 환경에서 API 테스트:");
  
  const params = new URLSearchParams({
    serviceKey: testKey,
    numOfRows: "5",
    pageNo: "1",
    meet: "2",
    rc_date: "20250523"
  });
  
  const url = `https://apis.data.go.kr/B551015/API214_1/RaceDetailResult_1?${params}`;
  
  try {
    const response = await fetch(url);
    const text = await response.text();
    
    console.log("- 응답 상태:", response.status);
    console.log("- 응답 타입:", response.headers.get('content-type'));
    console.log("- 응답 크기:", text.length);
    
    if (text.includes('SERVICE_KEY_IS_NOT_REGISTERED_ERROR')) {
      console.log("❌ API 키 등록 오류");
    } else if (text.includes('SERVICE_ACCESS_DENIED_ERROR')) {
      console.log("❌ API 접근 거부 오류");
    } else if (text.includes('<response>')) {
      console.log("✅ API 호출 성공");
    } else {
      console.log("❓ 알 수 없는 응답");
    }
    
    console.log("- 응답 미리보기:", text.substring(0, 200));
    
  } catch (error) {
    console.log("❌ API 호출 오류:", error);
  }
}

testApiWithCurrentEnv(); 