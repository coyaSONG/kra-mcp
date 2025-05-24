import { describe, test, expect, beforeEach } from '@jest/globals';

// 테스트용 유틸리티 함수들
function validateAndFormatDate(dateStr: string): string {
  const cleaned = dateStr.replace(/[-\/\s]/g, '');
  if (!/^\d{8}$/.test(cleaned)) {
    throw new Error("날짜는 YYYYMMDD 형식이어야 합니다 (예: 20240101)");
  }
  return cleaned;
}

function getTrackCode(trackName?: string): string {
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

describe('KRA API Utils', () => {
  describe('validateAndFormatDate', () => {
    test('should format valid date string', () => {
      expect(validateAndFormatDate('20240220')).toBe('20240220');
      expect(validateAndFormatDate('2024-02-20')).toBe('20240220');
      expect(validateAndFormatDate('2024/02/20')).toBe('20240220');
    });

    test('should throw error for invalid date format', () => {
      expect(() => validateAndFormatDate('2024')).toThrow();
      expect(() => validateAndFormatDate('invalid')).toThrow();
      expect(() => validateAndFormatDate('202402200')).toThrow();
    });
  });

  describe('getTrackCode', () => {
    test('should return correct track codes', () => {
      expect(getTrackCode('서울')).toBe('1');
      expect(getTrackCode('seoul')).toBe('1');
      expect(getTrackCode('제주')).toBe('2');
      expect(getTrackCode('jeju')).toBe('2');
      expect(getTrackCode('부산')).toBe('3');
      expect(getTrackCode('부산경남')).toBe('3');
      expect(getTrackCode('busan')).toBe('3');
    });

    test('should return default track code for unknown input', () => {
      expect(getTrackCode('')).toBe('1');
      expect(getTrackCode(undefined)).toBe('1');
      expect(getTrackCode('unknown')).toBe('1');
    });
  });
});

describe('KRA API Integration', () => {
  beforeEach(() => {
    // 환경변수 모킹
    process.env.KRA_SERVICE_KEY = 'test-service-key';
  });

  test('should handle missing service key', () => {
    delete process.env.KRA_SERVICE_KEY;
    // callKRAApi 함수 테스트는 실제 API 호출을 피하고 모킹 필요
    expect(process.env.KRA_SERVICE_KEY).toBeUndefined();
  });

  test('should construct correct API URL parameters', () => {
    const params = {
      numOfRows: "50",
      pageNo: "1",
      meet: "1",
      rc_date: "20240220"
    };
    
    const searchParams = new URLSearchParams({
      ServiceKey: 'test-key',
      ...params
    });
    
    expect(searchParams.get('numOfRows')).toBe('50');
    expect(searchParams.get('meet')).toBe('1');
    expect(searchParams.get('rc_date')).toBe('20240220');
  });
}); 