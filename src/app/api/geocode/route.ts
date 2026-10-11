
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get('address');

  if (!address) {
    return NextResponse.json({ success: false, message: '缺少地址参数' }, { status: 400 });
  }

  // 注意：这里用的是后台专用的 Web 服务 Key
  const amapKey = process.env.AMAP_WEB_SERVICE_KEY;

  if (!amapKey) {
    return NextResponse.json({ success: false, message: '服务器未配置高德Web服务Key' }, { status: 500 });
  }

  try {
    const url = `https://restapi.amap.com/v3/geocode/geo?address=${encodeURIComponent(address)}&key=${amapKey}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.status === '1' && data.geocodes && data.geocodes.length > 0) {
      const location = data.geocodes[0].location;
      const [longitude, latitude] = location.split(',');
      return NextResponse.json({
        success: true,
        data: {
          address: data.geocodes[0].formatted_address,
          longitude: parseFloat(longitude),
          latitude: parseFloat(latitude),
        }
      });
    } else {
      return NextResponse.json({ success: false, message: '未找到该地点' }, { status: 404 });
    }
  } catch (error) {
    return NextResponse.json({ success: false, message: '请求高德接口失败' }, { status: 500 });
  }
}