const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  // 유저 관련 API → 5001
  app.use(
    '/api/auth',
    createProxyMiddleware({
      target: 'http://localhost:5001',
      changeOrigin: true,
    })
  );

  // 목표 관련 API → 5003 (공통 접두어로 한 번에 처리)
  app.use(
    '/api/goals',
    createProxyMiddleware({
      target: 'http://localhost:5003',
      changeOrigin: true,
    })
  );

  // 가계부 관련 API → 5002 (공통 접두어로 한 번에 처리)
  app.use(
    ['/api/account', '/api/accounts'],
    createProxyMiddleware({
      target: 'http://localhost:5002',
      changeOrigin: true,
    })
  );
};
