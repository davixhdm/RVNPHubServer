import dns from 'node:dns';

dns.setDefaultResultOrder('ipv4first');
dns.setServers(['1.1.1.1', '8.8.8.8']);

console.log('DNS configured: IPv4 first, servers: 1.1.1.1, 8.8.8.8');