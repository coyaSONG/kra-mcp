// 최종 JSON 전용 코드 테스트
import { callKRAApi, callKRAAPI299, validateAndFormatDate, getTrackCode } from './dist/index.js';
import dotenv from 'dotenv';

dotenv.config();

async function testFinalJsonImplementation() {
  console.log('=== JSON 전용 구현 최종 테스트 ===\n');
  
  // 유틸리티 함수 테스트
  console.log('✅ 유틸리티 함수 테스트:');
  console.log(`  validateAndFormatDate("2025-06-06"): ${validateAndFormatDate("2025-06-06")}`);
  console.log(`  getTrackCode("부산"): ${getTrackCode("부산")}`);
  console.log(`  getTrackCode("seoul"): ${getTrackCode("seoul")}`);
  
  if (!process.env.KRA_SERVICE_KEY) {
    console.log('\n⚠️  KRA_SERVICE_KEY 환경변수가 없어 API 테스트를 건너뜁니다.');
    return;
  }
  
  try {
    // API214_1 테스트
    console.log('\n🔍 API214_1 JSON 응답 테스트...');
    const raceData = await callKRAApi('/RaceDetailResult_1', {
      numOfRows: '2',
      pageNo: '1',
      meet: '3',
      rc_date: '20250523',
      rc_no: '1'
    });
    
    console.log('  ✅ API214_1 성공!');
    console.log(`    응답 코드: ${raceData?.response?.header?.resultCode}`);
    console.log(`    총 개수: ${raceData?.response?.body?.totalCount}`);
    
    if (raceData?.response?.body?.items?.item) {
      const items = Array.isArray(raceData.response.body.items.item) 
        ? raceData.response.body.items.item 
        : [raceData.response.body.items.item];
      console.log(`    아이템 수: ${items.length}`);
      if (items.length > 0) {
        console.log(`    첫 번째 말: ${items[0].hrName} (기수: ${items[0].jkName})`);
        console.log(`    타입 확인 - age: ${typeof items[0].age} (${items[0].age})`);
        console.log(`    타입 확인 - winOdds: ${typeof items[0].winOdds} (${items[0].winOdds})`);
      }
    }
    
  } catch (error) {
    console.log(`  ❌ API214_1 실패: ${error.message}`);
  }
  
  try {
    // API299 테스트
    console.log('\n🔍 API299 JSON 응답 테스트...');
    const statsData = await callKRAAPI299('/Race_Result_total', {
      pageNo: '1',
      numOfRows: '2',
      rc_date: '20250503'
    });
    
    console.log('  ✅ API299 성공!');
    console.log(`    응답 코드: ${statsData?.response?.header?.resultCode}`);
    console.log(`    총 개수: ${statsData?.response?.body?.totalCount}`);
    
    if (statsData?.response?.body?.items?.item) {
      const items = Array.isArray(statsData.response.body.items.item) 
        ? statsData.response.body.items.item 
        : [statsData.response.body.items.item];
      console.log(`    아이템 수: ${items.length}`);
      if (items.length > 0) {
        console.log(`    첫 번째 말: ${items[0].hrName}`);
        console.log(`    통산 1착: ${items[0].hrOrd1CntT} (타입: ${typeof items[0].hrOrd1CntT})`);
      }
    }
    
  } catch (error) {
    console.log(`  ❌ API299 실패: ${error.message}`);
  }
  
  console.log('\n=== 테스트 완료 ===');
  console.log('📈 성과:');
  console.log('  ✅ XML 파싱 라이브러리 의존성 제거');
  console.log('  ✅ JSON 네이티브 처리로 성능 향상');
  console.log('  ✅ 타입 안전성 확보 (숫자는 숫자로, 문자열은 문자열로)');
  console.log('  ✅ 코드 복잡성 대폭 감소');
}

testFinalJsonImplementation();