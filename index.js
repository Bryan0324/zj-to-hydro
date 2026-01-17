import os from 'os';
import path from 'path';
import { Readable } from 'stream';
import {
    buildContent, extractZip, FileTooLargeError, fs, Handler, PERM,
    ProblemModel, randomstring, Schema, ValidationError, yaml, Zip,
} from 'hydrooj';

//initialize tmp directory
const tmpdir = path.join(os.tmpdir(), 'hydro', 'import-json');
fs.ensureDirSync(tmpdir);

//define ZJson Schema
const ZJsonSchema = Schema.object({
    title: Schema.string().required(),
    problemid: Schema.string().required(),
    author: Schema.string(),
    content: Schema.string(),
    theinput: Schema.string(),
    theoutput: Schema.string(),
    sampleinput: Schema.string(),
    sampleoutput: Schema.string(),
    hint: Schema.string(),
    keywords: Schema.any(),
    testfilelength: Schema.number().default(0),
    testinfiles: Schema.array(Schema.string()),
    testoutfiles: Schema.array(Schema.string()),
    timelimits: Schema.any(),
    memorylimit: Schema.number(),
});

class ImportJsonHandler extends Handler {
    async fromFile(domainId, zipfile) {
        //setting up temporary folder
        const zip = new Zip.ZipReader(Readable.toWeb(fs.createReadStream(zipfile)));
        const tmp = path.resolve(tmpdir, randomstring(32));
        await extractZip(zip, tmp, {
            strip: true,
            parseError: (e) => new ValidationError('zip', null, e.message),
        });
        await securityScan(tmp);

        let cnt = 0;
        try {
            //find JSON file
            const files = await fs.readdir(tmp);
            const targetFile = files.find(f => f.endsWith('.json') || f.endsWith('.zjson'));
            
            if (!targetFile) throw new ValidationError('zip', 'No JSON file found in zip');

            const buf = await fs.readFile(path.join(tmp, targetFile));
            const data = ZJsonSchema(JSON.parse(buf.toString()));

            //verify problemid format
            const pidRegex = /^[a-zA-Z]\d{3}$/;
            if (!pidRegex.test(data.problemid)) {
                throw new ValidationError('problemid', `Invalid PID: ${data.problemid}. Must be one letter + 3 digits.`);
            }

            if (await ProblemModel.get(domainId, data.problemid)) {
                throw new ValidationError('problemid', `PID ${data.problemid} already exists.`);
            }

            //make content in markdown format
            const convertHtmlToMarkdown = (html) => {
                if (!html) return '';
                let text = html;
                text = text.replace(/<a [^>]*href="([^"]+)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)');
                text = text.replace(/<img [^>]*src="([^"]+)"[^>]*>/gi, '![]($1)');
                text = text.replace(/<br\s*\/?>/gi, '\n');
                text = text.replace(/<\/p>/gi, '\n\n');
                text = text.replace(/<[^>]*>?/gm, '');
                text = text.replace(/&nbsp;/g, ' ').replace(/&hellip;/g, '...');
                return text.trim();
            };
            const contentMarkdown = buildContent({
                description: convertHtmlToMarkdown(data.content),
                input: convertHtmlToMarkdown(data.theinput),
                output: convertHtmlToMarkdown(data.theoutput),
                samples: [[data.sampleinput, data.sampleoutput]],
                hint: convertHtmlToMarkdown(data.hint),
            }, 'markdown');

            //setting up problems
            const tags = data.keywords ? (typeof data.keywords === 'string' ? JSON.parse(data.keywords) : data.keywords) : [];
            const pid = await ProblemModel.add(
                domainId, data.problemid, data.title, contentMarkdown,
                this.user._id, tags,
            );

            //init config.yaml
            const tasks = [];
            const config = {
                time: Array.isArray(data.timelimits) ? `${data.timelimits[0]}s` : `${data.timelimits}s`,
                memory: `${data.memorylimit}mb`,
                subtasks: [],
            };

            for (let i = 0; i < data.testfilelength; i++) {
                const inName = `${i + 1}.in`;
                const outName = `${i + 1}.out`;
                
                tasks.push(ProblemModel.addTestdata(domainId, pid, inName, Buffer.from(data.testinfiles[i])));
                tasks.push(ProblemModel.addTestdata(domainId, pid, outName, Buffer.from(data.testoutfiles[i])));

                config.subtasks.push({
                    cases: [{ input: inName, output: outName }]
                });
            }

            tasks.push(ProblemModel.addTestdata(domainId, pid, 'config.yaml', Buffer.from(yaml.dump(config))));
            
            await Promise.all(tasks);
            cnt++;

        } finally {
            await fs.remove(tmp);
        }
        if (!cnt) throw new ValidationError('zip', 'Import failed');
    }

    async get() {
        this.response.body = { type: 'JSON' };
        this.response.template = 'problem_import.html';
    }

    async post({ domainId }) {
        const file = this.request.files.file;
        if (!file) throw new ValidationError('file');
        if (file.size > 256 * 1024 * 1024) throw new FileTooLargeError('256m');
        await this.fromFile(domainId, file.filepath);
        this.response.redirect = this.url('problem_main');
    }
}

async function securityScan(tmpDir) {
    const files = await fs.readdir(tmpDir, { recursive: true, withFileTypes: true });
    for (const file of files) {
        if (file.isSymbolicLink()) {
            await fs.remove(tmpDir);
            throw new Error("Security Violation: Symbolic link detected.");
        }
    }
}

export async function apply(ctx) {
    ctx.Route('problem_import_json', '/problem/import/json', ImportJsonHandler, PERM.PERM_CREATE_PROBLEM);
    ctx.injectUI('ProblemAdd', 'problem_import_json', { icon: 'copy', text: 'From JSON Export' });
    ctx.i18n.load('zh', {
        'From JSON Export': '從 JSON 導入',
    });
}