// API12_1 기수 정보 조회 테스트 스크립트
import { parseString } from 'xml2js';
import dotenv from 'dotenv';

dotenv.config();

async function testAPI12() {
  const apiKey = process.env.KRA_SERVICE_KEY;
  
  if (!apiKey) {
    console.error('KRA_SERVICE_KEY 환경변수가 설정되지 않았습니다.');
    return;
  }

  const baseUrl = 'https://apis.data.go.kr/B551015/API12_1/jockeyInfo_1';
  
  // 기수명으로 검색 (김용근 기수)
  const params = new URLSearchParams({
    numOfRows: '10',
    pageNo: '1',
    jk_name: '김용근'
  });

  const url = `${baseUrl}?serviceKey=${apiKey}&${params}`;
  
  console.log('API12_1 기수정보 조회 테스트 시작...');
  console.log('요청 URL:', url.replace(apiKey, '***SERVICE_KEY***'));
  
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const xmlText = await response.text();
    console.log('\n=== XML 응답 데이터 ===');
    console.log(xmlText);
    
    // XML을 JSON으로 변환해서 구조 확인
    parseString(xmlText, { explicitArray: false, ignoreAttrs: true, trim: true }, (err, result) => {
      if (err) {
        console.error('XML 파싱 오류:', err);
        return;
      }
      
      console.log('\n=== JSON 변환 결과 ===');
      console.log(JSON.stringify(result, null, 2));
      
      // 응답 구조 분석
      if (result?.response?.body?.items?.item) {
        const items = Array.isArray(result.response.body.items.item) 
          ? result.response.body.items.item 
          : [result.response.body.items.item];
        
        console.log('\n=== 필드 분석 ===');
        console.log('기수 정보 개수:', items.length);
        
        if (items.length > 0) {
          const firstJockey = items[0];
          console.log('첫 번째 기수 필드들:');
          Object.keys(firstJockey).forEach(key => {
            console.log(`- ${key}: ${firstJockey[key]}`);
          });
        }
      }
    });
    
  } catch (error) {
    console.error('API 호출 실패:', error.message);
  }
}

testAPI12();