// Node.js 18+ 내장 fetch 사용
import dotenv from 'dotenv';

// .env 파일 로드
dotenv.config();

async function testAPI299() {
  try {
    const apiKey = process.env.KRA_SERVICE_KEY;
    if (!apiKey) {
      console.error('환경변수 KRA_SERVICE_KEY가 설정되지 않았습니다');
      return;
    }
    
    const params = new URLSearchParams({
      pageNo: '1',
      numOfRows: '10'
    });
    
    // 새로운 API299 Base URL 사용
    const url = `https://apis.data.go.kr/B551015/API299/Race_Result_total?serviceKey=${apiKey}&${params}`;
    
    console.log('요청 URL 길이:', url.length);
    console.log('API 키 길이:', apiKey.length);
    
    const response = await fetch(url);
    console.log('응답 상태:', response.status);
    console.log('응답 헤더 content-type:', response.headers.get('content-type'));
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log('오류 응답 내용:', errorText.substring(0, 1000));
      return;
    }
    
    const responseText = await response.text();
    console.log('응답 길이:', responseText.length);
    console.log('응답 시작 부분:', responseText.substring(0, 1000));
    
    // 응답을 파일로 저장
    const fs = await import('fs');
    await fs.promises.writeFile('api299_response.xml', responseText);
    console.log('응답이 api299_response.xml 파일로 저장되었습니다.');
  } catch (error) {
    console.error('API 호출 오류:', error.message);
  }
}

testAPI299();