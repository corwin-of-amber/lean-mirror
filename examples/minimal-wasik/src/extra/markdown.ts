import { unified } from 'unified';
import { default as remarkParse } from 'remark-parse';
import { default as remarkRehype } from 'remark-rehype';
import { toDom } from 'hast-util-to-dom';
import type { Root } from 'hast';

export async function typesetMarkdown(markdownContent: string) {

    const md = unified()
        .use(remarkParse)
        .use(remarkRehype);

    let hast = await md.run(md.parse(markdownContent));

    return toDom(hast as Root);
}

