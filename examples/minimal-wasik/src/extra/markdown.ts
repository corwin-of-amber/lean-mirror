import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkRehype from 'remark-rehype';
import rehypeKatex from 'rehype-katex'
import { toDom } from 'hast-util-to-dom';
import type { Root } from 'hast';

import 'katex/dist/katex.css';

export async function typesetMarkdown(markdownContent: string) {

    const md = unified()
        .use(remarkParse)
        .use(remarkGfm)
        .use(remarkMath)
        .use(remarkRehype)
        .use(rehypeKatex);

    let hast = await md.run(md.parse(markdownContent));

    return toDom(hast as Root);
}

