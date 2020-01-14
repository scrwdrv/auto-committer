#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const childProcess = require("child_process");
const table_1 = require("table");
const cli_params_1 = require("cli-params");
const cliParams = new cli_params_1.default();
cliParams.add({
    params: {
        param: 'watch',
        type: 'int',
        optional: true,
        default: 60,
        alias: 'w'
    }
}, () => cliParams.exec((err, param) => exec(param.watch)));
function exec(watch) {
    let errors = 0;
    if (watch)
        console.log('\u001b[2J\u001b[0;0H');
    else
        console.log('');
    new Promise((resolve, reject) => {
        const t = Date.now();
        detectFiles((err) => {
            if (err)
                return reject(err);
            getDiffs((err, diffs, colored) => {
                if (err)
                    return reject(err);
                if (!diffs)
                    return resolve(), console.log(`\x1b[30m\x1b[1m [${getTime()}] \x1b[34mEverything is up to date\x1b[0m`);
                const n = diffs.length;
                let temp = table_1.table([['File', 'Ins', 'Del'], ...colored], {
                    border: table_1.getBorderCharacters(`void`),
                    columnDefault: {
                        paddingLeft: 1,
                        paddingRight: 1
                    }
                }).split('\n'), arr = [], msg = [];
                for (let i = 0, l = temp.length; i < l; i++)
                    if (!temp[i] && i + 1 < l && temp[i + 1] !== '')
                        arr.push('\x1b[30m\x1b[1m' + '-'.repeat(temp[i + 1].length - 39) + '\x1b[0m');
                    else if (temp[i])
                        arr.push(temp[i]);
                for (let i = 0, l = diffs.length; i < l; i++)
                    msg.push(`[${diffs[i][0]}](${diffs[i][1]})(${diffs[i][2]})`);
                commit(`${n} file${n > 1 ? 's' : ''} Modified: ${msg.join(', ')}`, (err) => {
                    if (err)
                        return reject(err);
                    console.log('\n' + arr.join('\n'));
                    console.log(`\n\x1b[30m\x1b[1m [${getTime()}] \x1b[34m${n} file${n > 1 ? 's' : ''} committed in ${((Date.now() - t) / 1000).toFixed(2)} secs\x1b[0m`);
                    resolve();
                });
            });
        });
    }).then(() => {
        errors = 0;
        if (watch)
            setTimeout(exec, watch * 1000);
    }).catch((err) => {
        errors++;
        if (errors > 10)
            return console.error(err), console.log('\n\x1b[31m\x1b[1mMax attempts exceeded, exiting ...\x1b[0m');
        console.error(err);
        if (watch)
            setTimeout(exec, watch * 1000);
    });
}
function getTime() {
    const now = new Date(), time = [now.getHours().toString(), now.getMinutes().toString(), now.getSeconds().toString()];
    for (let i = time.length; i--;)
        if (time[i].length === 1)
            time[i] = '0' + time[i];
    return time.join(':');
}
function commit(msg, cb) {
    childProcess.exec(`git commit -am "Auto commit @auto-committer" -m "${msg}"`, (err, stdout, stderr) => {
        if (err)
            if (err.code === 1)
                return cb();
            else
                return cb(err);
        childProcess.exec('git push', (err, stdout, stderr) => {
            if (err)
                return cb(err);
            cb();
        });
    });
}
function detectFiles(cb) {
    childProcess.exec('git add --all', (err, stdout, stderr) => {
        if (err)
            return cb(err);
        cb();
    });
}
function getDiffs(cb) {
    childProcess.exec('git diff-index --numstat head', (err, stdout, stderr) => {
        if (err)
            return cb(err);
        else if (!stdout)
            return cb(null);
        let diffs = [], colored = [];
        stdout.split('\n').forEach((line) => {
            if (!line)
                return;
            const arr = line.split('\t');
            diffs.push([
                arr[2].trim(),
                '+' + arr[0].trim(),
                '-' + arr[1].trim()
            ]);
            colored.push([
                '\x1b[33m\x1b[1m' + arr[2].trim() + '\x1b[0m',
                '\x1b[32m\x1b[1m+ ' + arr[0].trim() + '\x1b[0m',
                '\x1b[31m\x1b[1m- ' + arr[1].trim() + '\x1b[0m'
            ]);
        });
        cb(null, diffs.length ? diffs : null, colored);
    });
}
