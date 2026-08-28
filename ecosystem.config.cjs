module.exports = {
  apps: [
    {
      name: "nexus",
      cwd: __dirname,
      script: "npm",
      args: "start",
      watch: false,
      max_restarts: 10,
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
