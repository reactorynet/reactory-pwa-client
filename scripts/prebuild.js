
const fs = require('fs');
const colors = require('colors');
const simpleGit = require('simple-git')

const git = simpleGit('./')
git.show(
    [
        '--pretty=format:%h'
    ], (err, result) => {

        // err is null unless this command failed
        // result is the raw output of this command
        if(err == null) {

            const license = {
                "text": "THE SOFTWARE IS PROVIDED \"AS IS\", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.",
                "copyright": "Copyright Reactory Client 2020",
                "version": result.split("\n")[0]
            };

            let fileData = "/* Auto Generated License File, DO NOT MODIFY */\n" +
                "const license = " + JSON.stringify(license, undefined, 4) + ";\n" +
                "\n" +
                "export default license;";

            fs.writeFile('./src/license.js', fileData, 'utf8', (fileErr) => {
                if (fileErr) {
                    return console.error('could not write file due to error ' + fileErr.message);
                }
            });

            console.log('license.js written to ./src/license.js'.green);

        }else {
            console.error('Could get the git tag version', err)
        }
    });
