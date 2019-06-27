def buildRoot = '/data/builds/reactory-client'
def nodeVersion = 'v10.15.3'


pipeline {
  // some block           
  agent any      
  stages {
    stage('Fetch') {
      steps {
        echo 'Fetching'
        dir("${buildRoot}") {
            // some block
        }
        git branch: "${branch}", credentialsId: 'jenkins-reactory-ssh-key', url: 'git@bitbucket.org:WernerWeber/assessor-client.git'
      }
    }
    stage('Build') {          
      // some block
      steps {          
        // sh 'npm install'          
        nvm("${nodeVersion}") {
          //some block
          sh 'node --version'
          sh 'npm --version'
          sh 'npm install'
          sh "npm run ci:build:${buildtype}:${clientkey}"
          sh "sudo cp -a ./build/${clientkey}/. /var/www/html/${clientkey}/"
          sh "curl https://${hostname}/index.html -s -I -H \'secret-header:true\'"                    
        }                    
      }
    }
  }  
}
