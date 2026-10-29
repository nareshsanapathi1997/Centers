module.exports = {
  apps: [
    {
      name: "TIME-CENTER-MANAGER",
      script: "./node_modules/next/dist/bin/next",
      args: "start",
      cwd: "C:/code/centermanager",
      exec_mode: "cluster",
      instances: 1,
      max_memory_restart: "700M",
      env: {
        NODE_ENV: "production",
        PORT: 3600
      }
    }
  ]
};