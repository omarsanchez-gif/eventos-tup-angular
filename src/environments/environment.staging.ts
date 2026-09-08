export const environment = {
  production: false,
  useEmulators: false,
  institutionalDomain: 'tecplayacar.edu.mx',
  firebase: {
    apiKey: 'AIzaSyB-YYRG3Bz4zOXxQmFW7fJfDjV9uVdJSWc',
    authDomain: 'eventos-tup-angular-stg.firebaseapp.com',
    projectId: 'eventos-tup-angular-stg',
    storageBucket: 'eventos-tup-angular-stg.firebasestorage.app',
    messagingSenderId: '920929768704',
    appId: '1:920929768704:web:1807665253a2bcb9838fe5',
  },
  emulators: {
    auth: { host: '127.0.0.1', port: 9099 },
    functions: { host: '127.0.0.1', port: 5001 },
  },
} as const;
