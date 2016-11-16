/**
 * @since 2016-11-16 10:20
 * @author vivaxy
 */

import path from 'path';
import sh from 'shelljs';
import inquirer from 'inquirer';

import ensureConfig from '../lib/ensureConfig';
import { GTHome } from '../config';

import getCopyFiles from '../presets/copyFiles';
import getWriteFile from '../presets/writeFile';
import getUpdateFile from '../presets/updateFile';
import getWriteJson from '../presets/writeJson';
import getUpdateJson from '../presets/updateJson';

const projectGTFile = `scripts/gt.js`;

const cwd = process.cwd();

export default async() => {

    ensureConfig();

    const userConfig = require(path.join(GTHome, `config.json`));
    const scaffoldList = userConfig.scaffold;
    const scaffoldNameList = scaffoldList.map((scaffold, index) => {
        return scaffold.name;
    });

    const answer = await inquirer.prompt([
        {
            type: 'list',
            name: 'type',
            message: 'choose what you need',
            choices: scaffoldNameList,
            filter: function(val) {
                return val.toLowerCase();
            }
        }
    ]);

    const answerName = answer.type;

    console.log(`[you choose] ${answerName}`);

    const selectedScaffold = scaffoldList.find((item, index) => {
        return item.name === answerName;
    });

    const selectedScaffoldName = selectedScaffold.name;
    const selectedScaffoldFolder = path.join(GTHome, selectedScaffoldName);

    if (!sh.test(`-d`, selectedScaffoldFolder)) {
        const clone = sh.exec(`git clone ${selectedScaffold.repoUrl} ${selectedScaffoldFolder}`);
        if (clone.code !== 0) {
            console.log(`[clone error] ${selectedScaffold.repoUrl}`);
            sh.exit(1);
        }
        console.log('[clone done]');
    }

    sh.cd(selectedScaffoldFolder);
    sh.exec(`git pull`);
    console.log(`[pull done]`);
    sh.exec(`npm install`);
    console.log(`[install done]`);
    sh.cd(cwd);

    const projectGTFilePath = path.join(GTHome, selectedScaffoldName, projectGTFile);
    try {
        const projectGT = require(projectGTFilePath);
        let projectGit = null;
        try {
            const result = sh.exec(`git remote get-url origin`);
            if (result.code === 0) {
                const repositoryURL = result.stdout.split(`\n`)[0];
                projectGit = {
                    repositoryURL,
                };
            }
        } catch (ex) {
        }

        const GTInfo = {
            project: {
                folder: cwd,
                name: cwd.split(path.sep).pop(),
                git: projectGit,
            },
            scaffold: {
                folder: selectedScaffoldFolder,
                name: selectedScaffoldName,
            },
        };

        GTInfo.presets = {
            copyFiles: getCopyFiles(GTInfo),
            writeFile: getWriteFile(GTInfo),
            updateFile: getUpdateFile(GTInfo),
            writeJson: getWriteJson(GTInfo),
            updateJson: getUpdateJson(GTInfo),
        };

        projectGT.init(GTInfo);
    } catch (ex) {
        console.log(ex);
        console.log(`[warning] no scripts found.`);
    }

}
