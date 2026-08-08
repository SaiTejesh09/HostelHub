const { Client } = require('@prisma/client/runtime/library');
const net = require('net');

const passes = ['postgres123', 'postgres', 'admin', 'root', '123456', 'password', 'sai', 'tejesh', 'mahesh'];
const users = ['postgres', 'admin', 'root', 'MAHESH'];

console.log('Testing Postgres connections...');
