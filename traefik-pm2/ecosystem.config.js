module.exports = {
  apps: [{
    name: 'traefik',
    script: '/root/INOVAFINANCE/traefik-pm2/start-traefik.sh',
    cwd: '/root/INOVAFINANCE/traefik-pm2',
    instances: 1,
    exec_mode: 'fork',
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production'
    },
    error_file: '/root/INOVAFINANCE/traefik-pm2/logs/pm2-error.log',
    out_file: '/root/INOVAFINANCE/traefik-pm2/logs/pm2-out.log',
    log_file: '/root/INOVAFINANCE/traefik-pm2/logs/pm2-combined.log',
    time: true
  }]
};
