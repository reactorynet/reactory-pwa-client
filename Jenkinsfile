pipeline {
    agent any
    stages {
        stage('Build') { 
          dir('/mnt/d/data/builds') {
            // some block
            steps {
              sh 'npm install' 
            }
          }          
        }
    }
}