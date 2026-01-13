module.exports = {
    apps: [
        {
            name: 'inovabank',
            script: 'npm',
            args: 'run preview -- --port 8083 --host 0.0.0.0',
            cwd: '/root/INOVAFINANCE/INOVABANK',
            env: {
                NODE_ENV: 'production',
                PORT: 8083
            }
        }
    ]
};
