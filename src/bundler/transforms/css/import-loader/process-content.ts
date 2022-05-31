// @ts-nocheck
import { AcceptedPlugin } from 'postcss';
import { Options } from '.';

function runPostcss(postcss, content: string, filename: string, plugins: AcceptedPlugin[], parsers, index: number = 0) {
  return postcss(plugins)
    .process(content, {
      from: filename,
      parser: parsers[index],
    })
    .catch((err) => {
      // If there's an error, try the next parser
      index++;
      // If there are no parsers left, throw it
      if (index === parsers.length) throw err;
      return runPostcss(postcss, content, filename, plugins, parsers, index);
    });
}

export default function processContent(result, content: string, filename: string, options: Options, postcss) {
  const { plugins } = options;

  const parserList = [];

  // Syntax support:
  if (result.opts.syntax && result.opts.syntax.parse) {
    parserList.push(result.opts.syntax.parse);
  }

  // Parser support:
  if (result.opts.parser) parserList.push(result.opts.parser);
  // Try the default as a last resort:
  parserList.push(null);

  return runPostcss(postcss, content, filename, plugins, parserList);
}
