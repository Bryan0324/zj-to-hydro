import os from 'os';
import path from 'path';
import AdmZip from 'adm-zip';
import { promises as fsNative } from 'fs';
import {
    buildContent, Handler, PERM,
    ProblemModel, Schema, ValidationError, yaml,
} from 'hydrooj';

// define ZJson Schema
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
    async processZJson(domainId, rawData) {
        let data;
        try {
            data = ZJsonSchema(rawData);
        } catch (e) {
            throw new ValidationError('file', null, `Invalid ZJSON content: ${e.message}`);
        }
        const pidRegex = /^[a-zA-Z]\d{3}$/;
        if (!pidRegex.test(data.problemid)) {
            throw new ValidationError('problemid', `Invalid PID: ${data.problemid}. Must be one letter + 3 digits.`);
        }

        if (await ProblemModel.get(domainId, data.problemid)) {
            throw new ValidationError('problemid', `PID ${data.problemid} already exists.`);
        }

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
        const tags = data.keywords ? (typeof data.keywords === 'string' ? JSON.parse(data.keywords) : data.keywords) : [];
        const pid = await ProblemModel.add(
            domainId, data.problemid, data.title, contentMarkdown,
            this.user._id, tags,
        );
        const tasks = [];
        const config = {
            type: 'default',
            time: Array.isArray(data.timelimits) ? `${data.timelimits[0]}s` : `${data.timelimits}s`,
            memory: `${data.memorylimit}mb`,
            subtasks: [],
        };
        if (!data.timelimits) config.time = '3s';
        if (!data.memorylimit) config.memory = '100mb';
        for (let i = 0; i < data.testfilelength; i++) {
            const inName = `${i + 1}.in`;
            const outName = `${i + 1}.out`;
            tasks.push(ProblemModel.addTestdata(domainId, pid, inName, Buffer.from(data.testinfiles[i] || '')));
            tasks.push(ProblemModel.addTestdata(domainId, pid, outName, Buffer.from(data.testoutfiles[i] || '')));
            config.subtasks.push({
                cases: [{ input: inName, output: outName }]
            });
        }
        tasks.push(ProblemModel.addTestdata(domainId, pid, 'config.yaml', Buffer.from(yaml.dump(config))));
        await Promise.all(tasks);
    }

    async fromFile(domainId, filePath) {
        const buf = await fsNative.readFile(filePath);
        console.log('DEBUG: File head bytes:', buf[0], buf[1], buf[2], buf[3]);
        console.log('DEBUG: Is Buffer?', Buffer.isBuffer(buf));
        const isZip = buf[0] === 0x50 && buf[1] === 0x4b;

        if (isZip) {
            console.log('DEBUG: ZIP logic triggered');
            try {
                const zip = new AdmZip(buf);
                const zipEntries = zip.getEntries();
                const jsonEntry = zipEntries.find(entry =>
                    entry.entryName.toLowerCase().endsWith('.json') ||
                    entry.entryName.toLowerCase().endsWith('.zjson')
                );

                if (!jsonEntry) throw new Error('Cannnot find any .json or .zjson in the ZIP');
                const rawData = JSON.parse(jsonEntry.getData().toString('utf8'));
                await this.processZJson(domainId, rawData);
            } catch (e) {
                throw new ValidationError('file', null, `ZIP File Error: ${e.message}`);
            }
        } else {
            console.log('DEBUG: Plain JSON logic triggered');
            try {
                const rawData = JSON.parse(buf.toString('utf8'));
                await this.processZJson(domainId, rawData);
            } catch (e) {
                throw new ValidationError('file', null, `Json file error: ${e.message}`);
            }
        }
    }
    async get() {
        this.response.body = { type: 'JSON' };
        this.response.template = 'problem_import.html';
    }

    async post({ domainId }) {
        console.log('Post started');
        const file = this.request.files.file;
        if (!file) throw new ValidationError('file');

        try {
            console.log('File path:', file.filepath);
            await this.fromFile(domainId, file.filepath);
            console.log('fromFile finished');
            this.response.redirect = this.url('problem_main', { domainId });
        } catch (e) {
            console.error('Import Error Trace:', e);
            throw new ValidationError('file', null, `Import failed: ${e.message}`);
        }
    }
}

export async function apply(ctx) {
    ctx.Route('problem_import_json', '/problem/import/json', ImportJsonHandler, PERM.PERM_CREATE_PROBLEM);
    ctx.injectUI('ProblemAdd', 'problem_import_json', { icon: 'copy', text: 'From JSON/ZIP Export' });
    ctx.i18n.load('zh', {
        'From JSON/ZIP Export': '從 JSON/ZIP 導入(DDJ-v1匯入)',
    });
}