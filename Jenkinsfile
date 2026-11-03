pipeline {
  agent any

  options {
    disableConcurrentBuilds()
    timestamps()
  }

  triggers {
    githubPush()
  }

  environment {
    APP_DIR = '/opt/apps/deploy/apps/mindlamp'
    INFRA_DIR = '/opt/apps/deploy/infrastructure'
    COMPOSE_FILES = '-f shared.compose.yml -f apps.compose.yml'
    MINDLAMP_SERVICES = 'mindlamp-web'
  }

  stages {
    stage('Docker Info') {
      steps {
        sh 'docker version'
        sh 'docker compose version'
      }
    }

    stage('Sync Source To Deploy Repo') {
      steps {
        sh '''
          test -d "$INFRA_DIR"
          mkdir -p "$APP_DIR"
          rsync -a --delete \
            --exclude .git \
            --exclude node_modules \
            --exclude .env \
            ./ "$APP_DIR"/
        '''
      }
    }

    stage('Build Mind Lamp') {
      steps {
        dir("${env.INFRA_DIR}") {
          sh 'test -f .env'
          sh 'docker compose --env-file .env ${COMPOSE_FILES} build ${MINDLAMP_SERVICES}'
        }
      }
    }

    stage('Deploy Mind Lamp') {
      steps {
        dir("${env.INFRA_DIR}") {
          sh 'docker compose --env-file .env ${COMPOSE_FILES} up -d ${MINDLAMP_SERVICES}'
          sh 'docker compose -f caddy.compose.yml up -d'
        }
      }
    }

    stage('Smoke Check') {
      steps {
        sh 'docker ps --filter name=mindlamp --format "table {{.Names}}\\t{{.Status}}"'
      }
    }
  }
}
