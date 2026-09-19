// Universal adapter to allow Vercel-style (req, res) handlers to run on Netlify Serverless Functions (event, context).
export function netlifyAdapter(vercelHandler) {
  return async function netlifyHandler(event, context) {
    const query = event.queryStringParameters || {};
    let body = {};
    if (event.body) {
      try {
        body = event.isBase64Encoded
          ? JSON.parse(Buffer.from(event.body, 'base64').toString('utf-8'))
          : (typeof event.body === 'string' ? JSON.parse(event.body) : event.body);
      } catch {
        body = event.body;
      }
    }

    const req = {
      method: event.httpMethod || 'GET',
      headers: event.headers || {},
      query,
      body,
      url: event.path,
    };

    let statusCode = 200;
    const responseHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };
    let responseBody = '';

    const res = {
      status(code) {
        statusCode = code;
        return res;
      },
      setHeader(name, val) {
        responseHeaders[name] = val;
        return res;
      },
      getHeader(name) {
        return responseHeaders[name];
      },
      json(data) {
        responseHeaders['Content-Type'] = 'application/json';
        responseBody = JSON.stringify(data);
        return res;
      },
      send(data) {
        if (typeof data === 'object') return res.json(data);
        responseBody = String(data);
        return res;
      },
      end(data) {
        if (data !== undefined) responseBody = String(data);
        return res;
      },
    };

    if (req.method === 'OPTIONS') {
      return {
        statusCode: 204,
        headers: responseHeaders,
        body: '',
      };
    }

    try {
      await vercelHandler(req, res);
      return {
        statusCode,
        headers: responseHeaders,
        body: responseBody,
      };
    } catch (err) {
      console.error('Netlify function error:', err);
      return {
        statusCode: 500,
        headers: responseHeaders,
        body: JSON.stringify({ error: err.message || 'Internal Server Error' }),
      };
    }
  };
}
