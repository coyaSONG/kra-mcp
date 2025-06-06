// KRA API JSON 응답 테스트 및 파일 저장
import { writeFileSync } from 'fs';
import dotenv from 'dotenv';

dotenv.config();

async function testJsonResponses() {
  const apiKey = process.env.KRA_SERVICE_KEY;
  
  if (!apiKey) {
    console.error('KRA_SERVICE_KEY 환경변수가 설정되지 않았습니다.');
    return;
  }

  console.log('=== KRA API JSON 응답 테스트 시작 ===\n');

  // API214_1 테스트
  await testAPI214_JSON(apiKey);
  
  // API299 테스트  
  await testAPI299_JSON(apiKey);
  
  // API12_1 테스트
  await testAPI12_JSON(apiKey);

  console.log('\n=== 모든 JSON 응답 테스트 완료 ===');
}

async function testAPI214_JSON(apiKey) {
  console.log('🔍 API214_1 JSON 응답 테스트...');
  
  try {
    const url = `https://apis.data.go.kr/B551015/API214_1/RaceDetailResult_1?serviceKey=${apiKey}&numOfRows=10&pageNo=1&meet=3&rc_date=20250523&rc_no=1&_type=json`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const contentType = response.headers.get('content-type');
    console.log(`  Content-Type: ${contentType}`);
    
    const jsonData = await response.json();
    
    // JSON 파일로 저장
    writeFileSync('./api214_response.json', JSON.stringify(jsonData, null, 2));
    console.log('  ✅ api214_response.json 파일 저장 완료');
    
    // 구조 분석
    console.log('  📊 JSON 구조 분석:');
    console.log(`    - response.header.resultCode: ${jsonData?.response?.header?.resultCode}`);
    console.log(`    - response.body.totalCount: ${jsonData?.response?.body?.totalCount}`);
    
    if (jsonData?.response?.body?.items) {
      const items = Array.isArray(jsonData.response.body.items) ? 
        jsonData.response.body.items : 
        [jsonData.response.body.items];
      console.log(`    - items 개수: ${items.length}`);
      
      if (items.length > 0) {
        const firstItem = items[0];
        console.log(`    - 첫 번째 아이템 필드 수: ${Object.keys(firstItem).length}`);
        console.log(`    - 말 이름: ${firstItem.hrName}`);
        console.log(`    - 기수명: ${firstItem.jkName}`);
      }
    }
    
  } catch (error) {
    console.log(`  ❌ API214_1 JSON 테스트 실패: ${error.message}`);
  }
  
  console.log('');
}

async function testAPI299_JSON(apiKey) {
  console.log('🔍 API299 JSON 응답 테스트...');
  
  try {
    const url = `https://apis.data.go.kr/B551015/API299/Race_Result_total?serviceKey=${apiKey}&pageNo=1&numOfRows=10&rc_date=20250503&_type=json`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const contentType = response.headers.get('content-type');
    console.log(`  Content-Type: ${contentType}`);
    
    const jsonData = await response.json();
    
    // JSON 파일로 저장
    writeFileSync('./api299_response.json', JSON.stringify(jsonData, null, 2));
    console.log('  ✅ api299_response.json 파일 저장 완료');
    
    // 구조 분석
    console.log('  📊 JSON 구조 분석:');
    console.log(`    - response.header.resultCode: ${jsonData?.response?.header?.resultCode}`);
    console.log(`    - response.body.totalCount: ${jsonData?.response?.body?.totalCount}`);
    
    if (jsonData?.response?.body?.items) {
      const items = Array.isArray(jsonData.response.body.items) ? 
        jsonData.response.body.items : 
        [jsonData.response.body.items];
      console.log(`    - items 개수: ${items.length}`);
      
      if (items.length > 0) {
        const firstItem = items[0];
        console.log(`    - 첫 번째 아이템 필드 수: ${Object.keys(firstItem).length}`);
        console.log(`    - 말 통산 1착: ${firstItem.hrOrd1CntT}`);
        console.log(`    - 기수 통산 출전: ${firstItem.jkRcCntT}`);
      }
    }
    
  } catch (error) {
    console.log(`  ❌ API299 JSON 테스트 실패: ${error.message}`);
  }
  
  console.log('');
}

async function testAPI12_JSON(apiKey) {
  console.log('🔍 API12_1 JSON 응답 테스트...');
  
  try {
    const url = `https://apis.data.go.kr/B551015/API12_1/jockeyInfo_1?serviceKey=${apiKey}&numOfRows=5&pageNo=1&jk_name=김용근&_type=json`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const contentType = response.headers.get('content-type');
    console.log(`  Content-Type: ${contentType}`);
    
    const jsonData = await response.json();
    
    // JSON 파일로 저장
    writeFileSync('./api12_response.json', JSON.stringify(jsonData, null, 2));
    console.log('  ✅ api12_response.json 파일 저장 완료');
    
    // 구조 분석
    console.log('  📊 JSON 구조 분석:');
    console.log(`    - response.header.resultCode: ${jsonData?.response?.header?.resultCode}`);
    console.log(`    - response.body.totalCount: ${jsonData?.response?.body?.totalCount}`);
    
    if (jsonData?.response?.body?.items) {
      const items = Array.isArray(jsonData.response.body.items) ? 
        jsonData.response.body.items : 
        [jsonData.response.body.items];
      console.log(`    - items 개수: ${items.length}`);
      
      if (items.length > 0) {
        const firstItem = items[0];
        console.log(`    - 첫 번째 아이템 필드 수: ${Object.keys(firstItem).length}`);
        console.log(`    - 기수명: ${firstItem.jkName}`);
        console.log(`    - 통산 1착: ${firstItem.ord1CntT}`);
        console.log(`    - 총 출전: ${firstItem.rcCntT}`);
      }
    }
    
  } catch (error) {
    console.log(`  ❌ API12_1 JSON 테스트 실패: ${error.message}`);
  }
  
  console.log('');
}

// XML vs JSON 구조 비교 함수
async function compareStructures() {
  console.log('\n=== XML vs JSON 구조 비교 ===');
  
  try {
    // 저장된 JSON 파일들 읽기
    const fs = await import('fs');
    
    if (fs.existsSync('./api214_response.json')) {
      const api214Json = JSON.parse(fs.readFileSync('./api214_response.json', 'utf8'));
      console.log('\n📋 API214_1 구조:');
      console.log(`  JSON items 구조: ${typeof api214Json?.response?.body?.items}`);
      
      if (api214Json?.response?.body?.items) {
        const items = Array.isArray(api214Json.response.body.items) ? 
          api214Json.response.body.items : 
          [api214Json.response.body.items];
        if (items.length > 0) {
          console.log(`  첫 번째 item 필드들: ${Object.keys(items[0]).slice(0, 10).join(', ')}...`);
        }
      }
    }
    
  } catch (error) {
    console.log(`구조 비교 중 오류: ${error.message}`);
  }
}

testJsonResponses().then(() => {
  compareStructures();
});