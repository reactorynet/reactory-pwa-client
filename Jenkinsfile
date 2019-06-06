def buildRoot = '/data/builds/reactory-client'
def nodeVersion = 'v9.8.0'
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
        git branch: 'develop', credentialsId: 'jenkins-reactory-ssh-key', url: 'git@bitbucket.org:WernerWeber/assessor-client.git'
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
          sh 'npm run build'    
        }                    
      }
    }
  }  
}
