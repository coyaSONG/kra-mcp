import dotenv from 'dotenv';
import { callKRAAPI299 } from './dist/index.js';

// .env 파일 로드
dotenv.config();

async function testAPI299Function() {
  try {
    console.log('API299 함수 테스트 시작...');
    
    const params = {
      pageNo: '1',
      numOfRows: '5'
    };
    
    const response = await callKRAAPI299('/Race_Result_total', params);
    console.log('API299 호출 성공!');
    console.log('응답 타입:', typeof response);
    console.log('응답 구조:', Object.keys(response));
    console.log('전체 응답:', JSON.stringify(response, null, 2).substring(0, 1000));
    
    if (response.response && response.response.body && response.response.body.items) {
      const items = response.response.body.items.item;
      console.log('아이템 개수:', Array.isArray(items) ? items.length : 1);
      const firstItem = Array.isArray(items) ? items[0] : items;
      console.log('첫 번째 아이템 필드들:', Object.keys(firstItem));
      console.log('말 이름:', firstItem.hrName);
      console.log('기수 이름:', firstItem.jkName);
      console.log('경주 기록:', firstItem.rcTime);
    }
    
  } catch (error) {
    console.error('API299 함수 테스트 실패:', error.message);
  }
}

testAPI299Function();