import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import http from 'http';
import https from 'https';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://jowfyhlzwhalwaohlldm.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function fetchJson(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, raw: data });
        }
      });
    }).on('error', reject);
  });
}

async function fetchBuffer(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', chunk => chunks.push(Buffer.from(chunk)));
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          buffer: Buffer.concat(chunks),
        });
      });
    }).on('error', reject);
  });
}

async function main() {
  console.log('=== KIỂM THỬ NGHIỆM THU: FOOTER DÙNG CHUNG VÀ FAVICON TOÀN HỆ THỐNG ===\n');

  let passCount = 0;
  let totalTests = 0;

  function assert(condition: boolean, label: string, detail?: string) {
    totalTests++;
    if (condition) {
      passCount++;
      console.log(`[PASS] ${label}`);
      if (detail) console.log(`       -> ${detail}`);
    } else {
      console.error(`[FAIL] ${label}`);
      if (detail) console.error(`       -> ${detail}`);
    }
  }

  // 1. Kiểm tra API công khai /api/v1/public/homepage-config
  console.log('--- 1. Kiểm tra API Cấu hình Trang chủ đã xuất bản ---');
  const hpRes = await fetchJson('http://localhost:3000/api/v1/public/homepage-config');
  assert(
    hpRes.status === 200 && hpRes.body.success === true && hpRes.body.data !== undefined,
    'API GET /api/v1/public/homepage-config hoạt động bình thường',
    `Status: ${hpRes.status}, footer_text: "${hpRes.body.data?.footer_text || '(default)'}"`
  );

  // 2. Kiểm tra API công khai /api/v1/public/system-info
  console.log('\n--- 2. Kiểm tra API Cấu hình Nhận diện Toàn hệ thống ---');
  const sysRes = await fetchJson('http://localhost:3000/api/v1/public/system-info');
  assert(
    sysRes.status === 200 && sysRes.body.success === true && sysRes.body.data !== undefined,
    'API GET /api/v1/public/system-info hoạt động cho khách chưa đăng nhập',
    `Status: ${sysRes.status}, favicon_url: "${sysRes.body.data?.favicon_url || 'null'}"`
  );

  // 3. Kiểm tra Proxy tải Favicon
  console.log('\n--- 3. Kiểm tra Tải tệp Favicon qua Proxy an toàn ---');
  const faviconUrl = sysRes.body.data?.favicon_url;
  if (faviconUrl) {
    const fullFaviconUrl = faviconUrl.startsWith('http') ? faviconUrl : `http://localhost:3000${faviconUrl}`;
    const favRes = await fetchBuffer(fullFaviconUrl);
    const contentType = favRes.headers['content-type'] || '';
    const isImage = contentType.startsWith('image/');
    assert(
      favRes.status === 200 && isImage && favRes.buffer.length > 0,
      'Tệp favicon tải thành công (HTTP 200, Content-Type image/*)',
      `MIME: ${contentType}, Size: ${favRes.buffer.length} bytes, URL: ${faviconUrl}`
    );
  } else {
    console.log('[INFO] Hệ thống đang sử dụng favicon mặc định /favicon.ico');
    const defaultFavRes = await fetchBuffer('http://localhost:3000/favicon.ico');
    assert(
      defaultFavRes.status === 200 || defaultFavRes.status === 304,
      'Tệp favicon mặc định /favicon.ico phản hồi hợp lệ'
    );
  }

  // 4. Kiểm tra logic resolveFaviconUrl không sinh URL lồng nhau
  console.log('\n--- 4. Kiểm tra hàm resolveFaviconUrl (Độ tin cậy phía client) ---');
  const { resolveFaviconUrl } = await import('../src/contexts/SystemBrandingContext');
  
  // Test case A: null / empty -> /favicon.ico
  const url1 = resolveFaviconUrl(null);
  assert(url1 === '/favicon.ico', 'Xử lý null/rỗng trả về /favicon.ico trung tính');

  // Test case B: relative API proxy URL (từ backend system-info)
  const proxyUrl = '/api/v1/public/branding/asset?path=branding%2Ffavicon_123.png&v=1';
  const url2 = resolveFaviconUrl(proxyUrl);
  assert(url2 === proxyUrl, 'Không bị lồng thêm /api/v1/public/branding/asset khi URL đã là proxy', `Result: ${url2}`);

  // Test case C: raw storage path
  const rawPath = 'branding/favicon_123.png';
  const url3 = resolveFaviconUrl(rawPath, 5);
  assert(
    url3 === '/api/v1/public/branding/asset?path=branding%2Ffavicon_123.png&v=5',
    'Tạo đúng URL proxy khi truyền storage path thô',
    `Result: ${url3}`
  );

  // Test case D: full HTTPS URL
  const httpsUrl = 'https://cdn.example.com/fav.png';
  const url4 = resolveFaviconUrl(httpsUrl);
  assert(url4 === httpsUrl, 'Giữ nguyên URL HTTPS tuyệt đối');

  // 5. Kiểm tra tính toàn vẹn của các trang công khai
  console.log('\n--- 5. Kiểm tra các route công khai đối chiếu ---');
  const routes = [
    { name: 'Trang chủ Home', path: '/' },
    { name: 'Trang Đăng nhập', path: '/login' },
    { name: 'Trang Danh mục', path: '/catalog?ref=STHCCTV1088' },
    { name: 'Trang Chi tiết khóa học', path: '/?ref=STHCCTV1088&course=bep-a-au' },
  ];

  for (const r of routes) {
    const pageRes = await fetchJson(`http://localhost:3000${r.path}`);
    assert(
      pageRes.status === 200,
      `Route "${r.name}" (${r.path}) trả về HTTP 200 cho khách chưa đăng nhập`
    );
  }

  console.log(`\n======================================================`);
  console.log(`KẾT QUẢ KIỂM THỬ: ${passCount}/${totalTests} PASS (${Math.round(passCount/totalTests*100)}%)`);
  console.log(`======================================================\n`);

  if (passCount === totalTests) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
