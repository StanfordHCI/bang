module.exports = {
  apps: [{
    name: 'bang',
    script: './server.js'
  }],
  deploy: {
    production: {
      user: 'ubuntu',
      host: 'bang.dmorina.com',
      key: '~/.ssh/sh-server.pem',
      ref: 'origin/master',
      repo: 'git@github.com:StanfordHCI/bang.git',
      path: '/home/ubuntu/bang',
      'post-deploy': 'npm install && pm2 startOrRestart ecosystem.config.js'
    }
  }
}
