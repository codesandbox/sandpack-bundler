// @ts-nocheck
import type { AcceptedPlugin } from 'postcss';

import * as path from '../../../../utils/path';
import joinLayer from './join-layer';
import joinMedia from './join-media';
import parseStatements from './parse-statements';
import processContent from './process-content';

interface InitialOptions {
  /**
   * An array of plugins to be applied on each imported files.
   */
  plugins: AcceptedPlugin[];

  /**
   * You can provide a custom path resolver with this option. This function gets `(id, basedir, importOptions)` arguments and should return a path, an array of paths or a promise resolving to
   * the path(s). If you do not return an absolute path, your path will be resolved to an absolute path using the default resolver. You can use
   * [resolve](https://github.com/substack/node-resolve) for this.
   */
  resolve: (
    id: string,
    basedir: string,
    importOptions: Options
  ) => string | string[] | PromiseLike<string | string[]>;

  /**
   * You can overwrite the default loading way by setting this option. This function gets `(filename, importOptions)` arguments and returns content or promised content.
   */
  load: (filename: string, importOptions: Options) => string | Promise<string>;
}

export interface Options extends InitialOptions {
  root: string;
  path: string[];
  skipDuplicates: boolean;
  addModulesDirectories: string[];
}

function AtImport(initialOpts: InitialOptions) {
  const options: Options = {
    root: '/',
    path: [] as string[],
    skipDuplicates: true,
    addModulesDirectories: [],
    ...initialOpts,
  };

  options.path = options.path.map((p) => path.resolve(options.root, p));

  return {
    postcssPlugin: 'postcss-import',
    Once(styles, { result, atRule, postcss }) {
      const state = {
        importedFiles: {},
        hashFiles: {},
      };

      if (styles.source && styles.source.input && styles.source.input.file) {
        state.importedFiles[styles.source.input.file] = {};
      }

      if (options.plugins && !Array.isArray(options.plugins)) {
        throw new Error('plugins option must be an array');
      }

      return parseStyles(result, styles, options, state, [], []).then((bundle) => {
        applyRaws(bundle);
        applyMedia(bundle);
        applyStyles(bundle, styles);
      });

      function applyRaws(bundle) {
        bundle.forEach((stmt, index) => {
          if (index === 0) return;

          if (stmt.parent) {
            const { before } = stmt.parent.node.raws;
            if (stmt.type === 'nodes') stmt.nodes[0].raws.before = before;
            else stmt.node.raws.before = before;
          } else if (stmt.type === 'nodes') {
            stmt.nodes[0].raws.before = stmt.nodes[0].raws.before || '\n';
          }
        });
      }

      function applyMedia(bundle: any[]) {
        bundle.forEach((stmt) => {
          if ((!stmt.media.length && !stmt.layer.length) || stmt.type === 'charset') {
            return;
          }

          if (stmt.type === 'import') {
            stmt.node.params = `${stmt.fullUri} ${stmt.media.join(', ')}`;
          } else if (stmt.type === 'media') {
            stmt.node.params = stmt.media.join(', ');
          } else {
            const { nodes } = stmt;
            const { parent } = nodes[0];

            let outerAtRule;
            let innerAtRule;
            if (stmt.media.length && stmt.layer.length) {
              const mediaNode = atRule({
                name: 'media',
                params: stmt.media.join(', '),
                source: parent.source,
              });

              const layerNode = atRule({
                name: 'layer',
                params: stmt.layer.filter((layer: string) => layer !== '').join('.'),
                source: parent.source,
              });

              mediaNode.append(layerNode);
              innerAtRule = layerNode;
              outerAtRule = mediaNode;
            } else if (stmt.media.length) {
              const mediaNode = atRule({
                name: 'media',
                params: stmt.media.join(', '),
                source: parent.source,
              });

              innerAtRule = mediaNode;
              outerAtRule = mediaNode;
            } else if (stmt.layer.length) {
              const layerNode = atRule({
                name: 'layer',
                params: stmt.layer.filter((layer: string) => layer !== '').join('.'),
                source: parent.source,
              });

              innerAtRule = layerNode;
              outerAtRule = layerNode;
            }

            parent.insertBefore(nodes[0], outerAtRule);

            // remove nodes
            nodes.forEach((node: { parent: undefined }) => {
              node.parent = undefined;
            });

            // better output
            nodes[0].raws.before = nodes[0].raws.before || '\n';

            // wrap new rules with media query and/or layer at rule
            innerAtRule.append(nodes);

            stmt.type = 'media';
            stmt.node = outerAtRule;
            delete stmt.nodes;
          }
        });
      }

      function applyStyles(bundle, styles) {
        styles.nodes = [];

        // Strip additional statements.
        bundle.forEach((stmt) => {
          if (['charset', 'import', 'media'].includes(stmt.type)) {
            stmt.node.parent = undefined;
            styles.append(stmt.node);
          } else if (stmt.type === 'nodes') {
            stmt.nodes.forEach((node) => {
              node.parent = undefined;
              styles.append(node);
            });
          }
        });
      }

      function parseStyles(result, styles, options, state, media, layer) {
        const statements = parseStatements(result, styles);

        return Promise.resolve(statements)
          .then((stmts) => {
            // process each statement in series
            return stmts.reduce((promise, stmt) => {
              return promise.then(() => {
                stmt.media = joinMedia(media, stmt.media || []);
                stmt.layer = joinLayer(layer, stmt.layer || []);

                // skip protocol base uri (protocol://url) or protocol-relative
                if (stmt.type !== 'import' || /^(?:[a-z]+:)?\/\//i.test(stmt.uri)) {
                  return;
                }

                if (options.filter && !options.filter(stmt.uri)) {
                  // rejected by filter
                  return;
                }

                return resolveImportId(result, stmt, options, state);
              });
            }, Promise.resolve());
          })
          .then(() => {
            let charset;
            const imports = [];
            const bundle = [];

            function handleCharset(stmt) {
              if (!charset) charset = stmt;
              // charsets aren't case-sensitive, so convert to lower case to compare
              else if (stmt.node.params.toLowerCase() !== charset.node.params.toLowerCase()) {
                throw new Error(
                  `Incompatable @charset statements:
  ${stmt.node.params} specified in ${stmt.node.source.input.file}
  ${charset.node.params} specified in ${charset.node.source.input.file}`
                );
              }
            }

            // squash statements and their children
            statements.forEach((stmt) => {
              if (stmt.type === 'charset') handleCharset(stmt);
              else if (stmt.type === 'import') {
                if (stmt.children) {
                  stmt.children.forEach((child, index) => {
                    if (child.type === 'import') imports.push(child);
                    else if (child.type === 'charset') handleCharset(child);
                    else bundle.push(child);
                    // For better output
                    if (index === 0) child.parent = stmt;
                  });
                } else imports.push(stmt);
              } else if (stmt.type === 'media' || stmt.type === 'nodes') {
                bundle.push(stmt);
              }
            });

            return charset ? [charset, ...imports.concat(bundle)] : imports.concat(bundle);
          });
      }

      function resolveImportId(result, stmt, options: Options, state) {
        const atRule = stmt.node;
        let sourceFile: string | undefined;
        if (atRule.source && atRule.source.input && atRule.source.input.file) {
          sourceFile = atRule.source.input.file;
        }
        const base = sourceFile ? path.dirname(atRule.source.input.file) : options.root;

        return Promise.resolve(options.resolve(stmt.uri, base, options))
          .then((paths) => {
            if (!Array.isArray(paths)) {
              return [paths];
            } else {
              return paths;
            }
          })
          .then((resolved) => {
            // Add dependency messages:
            resolved.forEach((file) => {
              result.messages.push({
                type: 'dependency',
                plugin: 'postcss-import',
                file,
                parent: sourceFile,
              });
            });

            return Promise.all(
              resolved.map((file) => {
                return loadImportContent(result, stmt, file, options, state);
              })
            );
          })
          .then((result) => {
            // Merge loaded statements
            stmt.children = result.reduce((result, statements) => {
              return statements ? result.concat(statements) : result;
            }, []);
          });
      }

      function loadImportContent(result, stmt, filename: string, options: Options, state) {
        const atRule = stmt.node;
        const { media, layer } = stmt;
        if (options.skipDuplicates) {
          // skip files already imported at the same scope
          if (state.importedFiles[filename] && state.importedFiles[filename][media]) {
            return;
          }

          // save imported files to skip them next time
          if (!state.importedFiles[filename]) state.importedFiles[filename] = {};
          state.importedFiles[filename][media] = true;
        }

        return Promise.resolve(options.load(filename, options)).then((content) => {
          if (content.trim() === '') {
            result.warn(`${filename} is empty`, { node: atRule });
            return;
          }

          // skip previous imported files not containing @import rules
          if (state.hashFiles[content] && state.hashFiles[content][media]) return;

          return processContent(result, content, filename, options, postcss).then((importedResult) => {
            const styles = importedResult.root;
            result.messages = result.messages.concat(importedResult.messages);

            if (options.skipDuplicates) {
              const hasImport = styles.some((child) => {
                return child.type === 'atrule' && child.name === 'import';
              });
              if (!hasImport) {
                // save hash files to skip them next time
                if (!state.hashFiles[content]) state.hashFiles[content] = {};
                state.hashFiles[content][media] = true;
              }
            }

            // recursion: import @import from imported file
            return parseStyles(result, styles, options, state, media, layer);
          });
        });
      }
    },
  };
}

AtImport.postcss = true;

export default AtImport;
