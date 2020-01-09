import * as childProcess from 'child_process';
import { table, getBorderCharacters } from 'table';

let watch = process.argv.indexOf('--watch') > -1 ? true : false,
    watchInterval = watch ? parseInt(process.argv[process.argv.indexOf('--watch') + 1]) || 60 : null,
    errors = 0;

if (watch) console.log('\u001b[2J\u001b[0;0H');

(function exec() {

    new Promise((resolve, reject) => {
        const t = Date.now();
        detectFiles((err) => {
            if (err) return reject(err);
            console.log('1')
            getDiffs((err, diffs, colored) => {
                if (err) return reject(err);
                console.log('2')
                if (!diffs) return resolve(), console.log(`\x1b[30m\x1b[1m [${getTime()}] \x1b[34mEverything is up to date\x1b[0m`);

                const n = diffs.length;

                let temp = table([['File', 'Ins', 'Del'], ...colored], {
                    border: getBorderCharacters(`void`),
                    columnDefault: {
                        paddingLeft: 1,
                        paddingRight: 1
                    }
                }).split('\n'), arr = [], msg = [];

                for (let i = 0, l = temp.length; i < l; i++)
                    if (!temp[i] && i + 1 < l && temp[i + 1] !== '') arr.push('\x1b[30m\x1b[1m' + '-'.repeat(temp[i + 1].length - 39) + '\x1b[0m');
                    else if (temp[i]) arr.push(temp[i]);

                for (let i = 0, l = diffs.length; i < l; i++)
                    msg.push(`[${diffs[i][0]}](${diffs[i][1]})(${diffs[i][2]})`);

                commit(`${n} file${n > 1 ? 's' : ''} Modified: ${msg.join(', ')}`, (err) => {
                    if (err) return reject(err);
                    console.log('\n' + arr.join('\n'));
                    console.log(`\n\x1b[30m\x1b[1m [${getTime()}] \x1b[34m${n} file${n > 1 ? 's' : ''} committed in ${((Date.now() - t) / 1000).toFixed(2)} secs\x1b[0m`);
                    resolve();
                });
            });
        });
    }).then(() => {
        errors = 0;
        if (watch) setTimeout(exec, watchInterval * 1000);
    }).catch((err) => {
        errors++;
        if (errors > 10) return console.error(err), console.log('\n\x1b[31m\x1b[1mMax attempts exceeded, exiting ...\x1b[0m');
        console.error(err);
        if (watch) setTimeout(exec, watchInterval * 1000);
    });

})();

function getTime() {
    const now = new Date(),
        time = [now.getHours().toString(), now.getMinutes().toString(), now.getSeconds().toString()];
    for (let i = time.length; i--;) if (time[i].length === 1) time[i] = '0' + time[i];
    return time.join(':');
}

function commit(msg: string, cb: (err?: childProcess.ExecException | string) => void) {
    childProcess.exec(`git commit -am "Auto commit @auto-committer" -m "${msg}"`, (err, stdout, stderr) => {
        if (err)
            if (err.code === 1) return cb();
            else return cb(err);
        else if (stderr) return cb(stderr);

        childProcess.exec('git push', (err, stdout, stderr) => {
            if (err) return cb(err);
            cb();
        });
    });
}

function detectFiles(cb: (err?: childProcess.ExecException | string) => void) {
    childProcess.exec('git add --all', (err, stdout, stderr) => {
        if (err) return cb(err);
        else if (stderr) return cb(stderr);
        cb();
    });
}

function getDiffs(cb: (err: childProcess.ExecException | string, diffs?: string[], colored?: string[]) => void) {
    childProcess.exec('git diff-index --numstat head', (err, stdout, stderr) => {
        if (err) return cb(err);
        else if (stderr) return cb(stderr);
        else if (!stdout) return cb(null);

        let diffs = [], colored = [];

        stdout.split('\n').forEach((line) => {
            if (!line) return;
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
            ])
        });

        cb(null, diffs.length ? diffs : null, colored);
    });
}
