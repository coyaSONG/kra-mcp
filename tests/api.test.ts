import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { callKRAApi, validateAndFormatDate, getTrackCode } from '../src/index';

// Global fetch mock
const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
global.fetch = mockFetch;

// Helper function to create mock Response
function createMockResponse(options: {
  ok?: boolean;
  status?: number;
  statusText?: string;
  headers?: Record<string, string>;
  json?: () => Promise<any>;
  text?: () => Promise<string>;
}): Response {
  return {
    ok: options.ok ?? true,
    status: options.status ?? 200,
    statusText: options.statusText ?? 'OK',
    headers: new Headers(options.headers || {}),
    json: options.json || (async () => ({})),
    text: options.text || (async () => ''),
    redirected: false,
    type: 'basic',
    url: 'https://example.com',
    clone: () => ({}) as Response,
    body: null,
    bodyUsed: false,
    arrayBuffer: async () => new ArrayBuffer(0),
    blob: async () => new Blob(),
    formData: async () => new FormData(),
  } as Response;
}

// Mock XML response sample
const mockXmlResponse = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<response>
  <header>
    <resultCode>00</resultCode>
    <resultMsg>NORMAL SERVICE.</resultMsg>
  </header>
  <body>
    <items>
      <item>
        <hrName>테스트마</hrName>
        <jkName>테스트기수</jkName>
        <ord>1</ord>
        <rcTime>75.4</rcTime>
        <winOdds>3.0</winOdds>
      </item>
    </items>
    <numOfRows>1</numOfRows>
    <pageNo>1</pageNo>
    <totalCount>1</totalCount>
  </body>
</response>`;

const mockJsonResponse = {
  response: {
    header: {
      resultCode: "00",
      resultMsg: "NORMAL SERVICE."
    },
    body: {
      items: [{
        hrName: "테스트마",
        jkName: "테스트기수",
        ord: "1",
        rcTime: "75.4",
        winOdds: "3.0"
      }],
      numOfRows: 1,
      pageNo: 1,
      totalCount: 1
    }
  }
};

const mockErrorXmlResponse = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<OpenAPI_ServiceResponse>
  <cmmMsgHeader>
    <errMsg>SERVICE_KEY_IS_NOT_REGISTERED_ERROR</errMsg>
    <returnAuthMsg>SERVICE_KEY_IS_NOT_REGISTERED_ERROR</returnAuthMsg>
    <returnReasonCode>30</returnReasonCode>
  </cmmMsgHeader>
</OpenAPI_ServiceResponse>`;

describe('KRA API Utils', () => {
  describe('validateAndFormatDate', () => {
    test('should format valid date string', () => {
      expect(validateAndFormatDate('20240220')).toBe('20240220');
      expect(validateAndFormatDate('2024-02-20')).toBe('20240220');
      expect(validateAndFormatDate('2024/02/20')).toBe('20240220');
      expect(validateAndFormatDate('2024 02 20')).toBe('20240220');
    });

    test('should throw error for invalid date format', () => {
      expect(() => validateAndFormatDate('2024')).toThrow('날짜는 YYYYMMDD 형식이어야 합니다');
      expect(() => validateAndFormatDate('invalid')).toThrow('날짜는 YYYYMMDD 형식이어야 합니다');
      expect(() => validateAndFormatDate('202402200')).toThrow('날짜는 YYYYMMDD 형식이어야 합니다');
      expect(() => validateAndFormatDate('')).toThrow('날짜는 YYYYMMDD 형식이어야 합니다');
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
      expect(getTrackCode('UNKNOWN')).toBe('1');
    });

    test('should handle case insensitive input', () => {
      expect(getTrackCode('SEOUL')).toBe('1');
      expect(getTrackCode('Seoul')).toBe('1');
      expect(getTrackCode('JEJU')).toBe('2');
      expect(getTrackCode('Busan')).toBe('3');
    });
  });
});

describe('KRA API Integration', () => {
  let originalEnv: string | undefined;

  beforeEach(() => {
    // 환경변수 백업
    originalEnv = process.env.KRA_SERVICE_KEY;
    // Mock 초기화
    mockFetch.mockReset();
    // 테스트용 환경변수 설정
    process.env.KRA_SERVICE_KEY = 'test-service-key-12345';
  });

  afterEach(() => {
    // 환경변수 복원
    if (originalEnv !== undefined) {
      process.env.KRA_SERVICE_KEY = originalEnv;
    } else {
      delete process.env.KRA_SERVICE_KEY;
    }
  });

  describe('Environment Variable Tests', () => {
    test('should throw error when KRA_SERVICE_KEY is missing', async () => {
      delete process.env.KRA_SERVICE_KEY;
      
      await expect(callKRAApi('/test', { param: 'value' }))
        .rejects
        .toThrow('KRA_SERVICE_KEY environment variable is required');
    });

    test('should use environment variable when available', async () => {
      const testKey = 'env-test-key-67890';
      process.env.KRA_SERVICE_KEY = testKey;

      mockFetch.mockResolvedValueOnce(createMockResponse({
        headers: { 'content-type': 'application/json' },
        json: async () => mockJsonResponse,
      }));

      await callKRAApi('/test', { param: 'value' });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining(`serviceKey=${testKey}`)
      );
    });
  });

  describe('URL and Parameter Construction', () => {
    test('should construct correct API URL with parameters', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({
        headers: { 'content-type': 'application/json' },
        json: async () => mockJsonResponse,
      }));

      const endpoint = '/RaceDetailResult_1';
      const params = {
        numOfRows: '50',
        pageNo: '1',
        meet: '1',
        rc_date: '20240220'
      };

      await callKRAApi(endpoint, params);

      const expectedUrl = 'https://apis.data.go.kr/B551015/API214_1/RaceDetailResult_1?serviceKey=test-service-key-12345&numOfRows=50&pageNo=1&meet=1&rc_date=20240220';
      expect(mockFetch).toHaveBeenCalledWith(expectedUrl);
    });

    test('should handle special characters in parameters', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({
        headers: { 'content-type': 'application/json' },
        json: async () => mockJsonResponse,
      }));

      const params = {
        horseName: '우승마&테스트',
        jockeyName: '김기수/테스트'
      };

      await callKRAApi('/test', params);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('horseName=%EC%9A%B0%EC%8A%B9%EB%A7%88%26%ED%85%8C%EC%8A%A4%ED%8A%B8')
      );
    });
  });

  describe('Response Processing Tests', () => {
    test('should handle JSON response correctly', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({
        headers: { 'content-type': 'application/json' },
        json: async () => mockJsonResponse,
      }));

      const result = await callKRAApi('/test', { param: 'value' });

      expect(result).toEqual(mockJsonResponse);
      expect(result.response.header.resultCode).toBe('00');
      expect(result.response.body.items[0].hrName).toBe('테스트마');
    });

    test('should handle XML response correctly', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({
        headers: { 'content-type': 'application/xml' },
        text: async () => mockXmlResponse,
      }));

      const result = await callKRAApi('/test', { param: 'value' });
      
      expect(result).toBeDefined();
      expect(result.response).toBeDefined();
      // XML 파싱 결과가 배열 형태로 나오므로 수정
      expect(result.response.header[0].resultCode[0]).toBe('00');
      expect(result.response.body[0].items[0].item[0].hrName[0]).toBe('테스트마');
    });

    test('should handle malformed XML response', async () => {
      const malformedXml = '<invalid>xml<response>';
      
      mockFetch.mockResolvedValueOnce(createMockResponse({
        headers: { 'content-type': 'application/xml' },
        text: async () => malformedXml,
      }));

      const result = await callKRAApi('/test', { param: 'value' });

      expect(result).toEqual({
        rawXml: malformedXml,
        error: 'XML 파싱 실패',
        note: '원본 XML 데이터를 반환합니다'
      });
    });

    test('should handle text/xml content type', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({
        headers: { 'content-type': 'text/xml; charset=utf-8' },
        text: async () => mockXmlResponse,
      }));

      const result = await callKRAApi('/test', { param: 'value' });

      expect(result).toBeDefined();
      expect(result.response.header[0].resultCode[0]).toBe('00');
    });

    test('should detect API key registration errors', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({
        headers: { 'content-type': 'application/xml' },
        text: async () => mockErrorXmlResponse,
      }));

      const result = await callKRAApi('/test', { param: 'value' });

      expect(result).toBeDefined();
      expect(result.OpenAPI_ServiceResponse).toBeDefined();
      // XML 파싱 결과가 배열 형태로 나오므로 수정
      expect(result.OpenAPI_ServiceResponse.cmmMsgHeader[0].errMsg[0]).toBe('SERVICE_KEY_IS_NOT_REGISTERED_ERROR');
    });
  });

  describe('Error Handling Tests', () => {
    test('should handle HTTP error responses', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      }));

      await expect(callKRAApi('/test', { param: 'value' }))
        .rejects
        .toThrow('KRA API 호출 실패: HTTP 404: Not Found');
    });

    test('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(callKRAApi('/test', { param: 'value' }))
        .rejects
        .toThrow('KRA API 호출 실패: Network error');
    });

    test('should handle fetch timeout', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Request timeout'));

      await expect(callKRAApi('/test', { param: 'value' }))
        .rejects
        .toThrow('KRA API 호출 실패: Request timeout');
    });

    test('should handle JSON parsing errors', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({
        headers: { 'content-type': 'application/json' },
        json: async () => { throw new Error('Invalid JSON'); },
      }));

      await expect(callKRAApi('/test', { param: 'value' }))
        .rejects
        .toThrow('KRA API 호출 실패: Invalid JSON');
    });

    test('should handle HTTP 500 server errors', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      }));

      await expect(callKRAApi('/test', { param: 'value' }))
        .rejects
        .toThrow('KRA API 호출 실패: HTTP 500: Internal Server Error');
    });
  });

  describe('Integration Test Scenarios', () => {
    test('should handle real race data API call scenario', async () => {
      const raceDataResponse = {
        response: {
          header: { resultCode: "00", resultMsg: "NORMAL SERVICE." },
          body: {
            items: [{
              hrName: "우승마",
              jkName: "김기수",
              ord: "1",
              rcTime: "75.4",
              winOdds: "3.0",
              meet: "1",
              rcDate: "20240220",
              rcNo: "5"
            }],
            numOfRows: 1,
            pageNo: 1,
            totalCount: 1
          }
        }
      };

      mockFetch.mockResolvedValueOnce(createMockResponse({
        headers: { 'content-type': 'application/json' },
        json: async () => raceDataResponse,
      }));

      const result = await callKRAApi('/RaceDetailResult_1', {
        numOfRows: '50',
        pageNo: '1',
        meet: '1',
        rc_date: '20240220',
        rc_no: '5'
      });

      expect(result.response.header.resultCode).toBe('00');
      expect(result.response.body.items[0].hrName).toBe('우승마');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/RaceDetailResult_1')
      );
    });

    test('should handle empty response correctly', async () => {
      const emptyResponse = {
        response: {
          header: { resultCode: "00", resultMsg: "NORMAL SERVICE." },
          body: {
            items: [],
            numOfRows: 0,
            pageNo: 1,
            totalCount: 0
          }
        }
      };

      mockFetch.mockResolvedValueOnce(createMockResponse({
        headers: { 'content-type': 'application/json' },
        json: async () => emptyResponse,
      }));

      const result = await callKRAApi('/test', { param: 'value' });

      expect(result.response.body.items).toEqual([]);
      expect(result.response.body.totalCount).toBe(0);
    });
  });
});