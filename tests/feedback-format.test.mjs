import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

for (const page of ['index.html', 'writing.html']) {
    test(page + ': strips AI code wrappers and keeps HTML structure without extra breaks', async () => {
        const html = await readFile(new URL('../' + page, import.meta.url), 'utf8');
        const start = html.indexOf('        function formatMarkdownToHtml(');
        const end = html.indexOf('        function copyFinalResult(', start);
        const context = vm.createContext({});
        vm.runInContext(html.slice(start, end), context);
        const body = '<h2>檢核</h2>\n\n<p>加油。</p>\n<table>\n<tr><td>原句</td><td>修改後</td></tr>\n</table>';
        for (const fence of ['\x60\x60\x60html', '\x60\x60html']) {
            const actual = context.formatMarkdownToHtml(fence + '\n\n' + body + '\n\x60\x60\x60');
            assert.equal(actual, body);
            assert.ok(!actual.includes('<br>'));
        }
        assert.equal(context.formatMarkdownToHtml('## 檢核\n\n**再練習**\n補上細節。'), '<h3>檢核</h3><p><strong>再練習</strong> 補上細節。</p>');
        assert.ok(html.includes("'TABLE', 'THEAD', 'TBODY'"));
    });
}
