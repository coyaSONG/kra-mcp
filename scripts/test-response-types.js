// KRA API 응답 타입 테스트 (XML vs JSON)
import { parseString } from 'xml2js';
import dotenv from 'dotenv';

dotenv.config();

async function testResponseTypes() {
  const apiKey = process.env.KRA_SERVICE_KEY;
  
  if (!apiKey) {
    console.error('KRA_SERVICE_KEY 환경변수가 설정되지 않았습니다.');
    return;
  }

  // 테스트할 API들
  const apis = [
    {
      name: 'API214_1',
      url: 'https://apis.data.go.kr/B551015/API214_1/RaceDetailResult_1',
      params: 'numOfRows=1&pageNo=1&meet=1&rc_date=20250523'
    },
    {
      name: 'API299',
      url: 'https://apis.data.go.kr/B551015/API299/Race_Result_total',
      params: 'numOfRows=1&pageNo=1'
    },
    {
      name: 'API12_1',
      url: 'https://apis.data.go.kr/B551015/API12_1/jockeyInfo_1',
      params: 'numOfRows=1&pageNo=1'
    }
  ];

  console.log('=== KRA API 응답 타입 테스트 ===\n');

  for (const api of apis) {
    console.log(`\n🔍 ${api.name} 테스트 중...`);
    
    // 1. 기본 요청 (응답 타입 미지정)
    await testApiResponse(api, apiKey, '기본');
    
    // 2. XML 명시적 요청
    await testApiResponse(api, apiKey, 'XML', 'xml');
    
    // 3. JSON 명시적 요청
    await testApiResponse(api, apiKey, 'JSON', 'json');
    
    // 4. Accept 헤더로 JSON 요청
    await testApiResponseWithHeaders(api, apiKey, 'JSON (Accept 헤더)');
    
    console.log('-'.repeat(50));
  }
}

async function testApiResponse(api, apiKey, testType, responseType = null) {
  try {
    let url = `${api.url}?serviceKey=${apiKey}&${api.params}`;
    
    if (responseType) {
      url += `&_type=${responseType}`;
    }
    
    const response = await fetch(url);
    const contentType = response.headers.get('content-type');
    const text = await response.text();
    
    console.log(`  ${testType}:`);
    console.log(`    Content-Type: ${contentType}`);
    console.log(`    응답 길이: ${text.length}자`);
    console.log(`    응답 시작: ${text.substring(0, 100)}...`);
    
    // JSON인지 XML인지 판단
    if (text.trim().startsWith('<?xml') || text.trim().startsWith('<response>')) {
      console.log(`    ✅ XML 응답 확인`);
    } else if (text.trim().startsWith('{')) {
      console.log(`    ✅ JSON 응답 확인`);
    } else {
      console.log(`    ❓ 알 수 없는 형식: ${text.substring(0, 50)}`);
    }
    
  } catch (error) {
    console.log(`    ❌ 오류: ${error.message}`);
  }
}

async function testApiResponseWithHeaders(api, apiKey, testType) {
  try {
    const url = `${api.url}?serviceKey=${apiKey}&${api.params}`;
    
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json'
      }
    });
    
    const contentType = response.headers.get('content-type');
    const text = await response.text();
    
    console.log(`  ${testType}:`);
    console.log(`    Content-Type: ${contentType}`);
    console.log(`    응답 길이: ${text.length}자`);
    console.log(`    응답 시작: ${text.substring(0, 100)}...`);
    
    // JSON인지 XML인지 판단
    if (text.trim().startsWith('<?xml') || text.trim().startsWith('<response>')) {
      console.log(`    ✅ XML 응답 (JSON 요청했으나 XML 반환)`);
    } else if (text.trim().startsWith('{')) {
      console.log(`    ✅ JSON 응답 확인`);
    } else {
      console.log(`    ❓ 알 수 없는 형식`);
    }
    
  } catch (error) {
    console.log(`    ❌ 오류: ${error.message}`);
  }
}

testResponseTypes();