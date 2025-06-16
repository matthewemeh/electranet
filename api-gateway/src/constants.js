module.exports = {
  ROUTES: [
    {
      regex: /^\/v1\/elections\/?$/,
      methods: ['GET', 'POST'],
    },
    {
      regex: /^\/v1\/get-user-elections\/?$/,
      methods: ['GET'],
    },
    {
      regex: /^\/v1\/elections\/[a-f0-9]{24}\/?$/,
      methods: ['PATCH', 'DELETE'],
    },
    {
      regex: /^\/v1\/(add-contestant|remove-contestant)\/[a-f0-9]{24}\/?$/,
      methods: ['PATCH'],
    },
    {
      regex: /^\/v1\/contestants\/?$/,
      methods: ['GET'],
    },
    {
      regex: /^\/v1\/contestants\/add\/?$/,
      methods: ['POST'],
    },
    {
      regex: /^\/v1\/contestants\/edit\/[a-f0-9]{24}\/?$/,
      methods: ['PATCH'],
    },
    {
      regex: /^\/v1\/contestants\/[a-f0-9]{24}\/?$/,
      methods: ['GET'],
    },
    {
      regex: /^\/v1\/parties\/?$/,
      methods: ['GET'],
    },
    {
      regex: /^\/v1\/parties\/add\/?$/,
      methods: ['POST'],
    },
    {
      regex: /^\/v1\/parties\/edit\/[a-f0-9]{24}\/?$/,
      methods: ['PATCH'],
    },
    {
      regex: /^\/v1\/face-id\/fetch\/?$/,
      methods: ['GET'],
    },
    {
      regex: /^\/v1\/face-id\/register\/?$/,
      methods: ['POST'],
    },
    {
      regex: /^\/v1\/(logs|notifications)\/?$/,
      methods: ['GET'],
    },
    {
      regex: /^\/v1\/results\/[a-f0-9]{24}\/?$/,
      methods: ['GET'],
    },
    {
      regex: /^\/v1\/votes\/(verify|cast)\/?$/,
      methods: ['POST'],
    },
    {
      regex: /^\/v1\/votes\/[a-f0-9]{24}\/?$/,
      methods: ['GET'],
    },
    {
      regex: /^\/v1\/otp\/send\/?$/,
      methods: ['POST'],
    },
    {
      regex: /^\/v1\/auth\/register\/(verify|user|admin)\/?$/,
      methods: ['POST'],
    },
    {
      regex: /^\/v1\/auth\/forgot-password\/(verify|reset|initiate)\/?$/,
      methods: ['POST'],
    },
    {
      regex: /^\/v1\/auth\/(login|logout|refresh-token)\/?$/,
      methods: ['POST'],
    },
    {
      regex: /^\/v1\/users\/?$/,
      methods: ['GET'],
    },
    {
      regex: /^\/v1\/users\/invite\/?$/,
      methods: ['POST'],
    },
    {
      regex: /^\/v1\/users\/tokens\/?$/,
      methods: ['GET'],
    },
    {
      regex: /^\/v1\/users\/tokens\/[a-f0-9]{24}\/?$/,
      methods: ['PATCH'],
    },
  ],
};
