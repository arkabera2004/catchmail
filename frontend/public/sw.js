self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : { title: 'CatchMail', body: 'You have a new reminder.' };
  event.waitUntil(
    self.registration.showNotification(data.title || 'CatchMail', {
      body: data.body,
      icon: '/favicon.ico',
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow('/dashboard'));
});
