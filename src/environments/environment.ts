export const environment = {
  production: false,
  useEmulators: true,
  institutionalDomain: 'tecplayacar.edu.mx',
  firebase: {
    apiKey: 'demo-api-key',
    authDomain: 'demo-eventos-tup.firebaseapp.com',
    projectId: 'demo-eventos-tup',
    storageBucket: 'demo-eventos-tup.appspot.com',
    messagingSenderId: '000000000000',
    appId: '1:000000000000:web:demo-eventos-tup',
  },
  emulators: {
    auth: { host: '127.0.0.1', port: 9099 },
    functions: { host: '127.0.0.1', port: 5001 },
  },
} as const;
