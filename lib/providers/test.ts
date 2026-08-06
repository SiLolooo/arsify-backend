import axios from 'axios';

export async function testProvider() {
  const url =
    'https://www.youtube.com/results?search_query=' +
    encodeURIComponent(
      'Tulus Hati-Hati di Jalan official audio'
    );

  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122 Safari/537.36',
      },
      timeout: 10000,
    });

    console.log(
      '[TestProvider] Status:',
      response.status
    );

    console.log(
      '[TestProvider] Content-Type:',
      response.headers['content-type']
    );

    console.log(
      '[TestProvider] Response length:',
      response.data?.length
    );

    return true;
  } catch (error: any) {
    console.error(
      '[TestProvider] Failed:',
      {
        status: error?.response?.status,
        message: error?.message,
      }
    );

    return false;
  }
}