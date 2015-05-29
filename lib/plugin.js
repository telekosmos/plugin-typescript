import path from 'path';
import ts from 'typescript';
import {IncrementalCompiler} from './incremental-compiler';
import formatErrors from './format-errors';
import {fixRequires} from './fix-requires';
import {isRelative, isAbsolute} from './utils';
import Logger from './logger';

let logger = new Logger({debug: false});
let compiler = new IncrementalCompiler(_fetch, _resolve, System.typescriptOptions);
const TSD_REFERENCE_FILENAME = 'tsd.d.ts';

/*
 * load.name: the canonical module name
 * load.address: the URL returned from locate
 * load.metadata: the same metadata object by reference, which
 *   can be modified
 */
export function fetch(load) {
   logger.debug('systemjs fetching ' + load.name + ' ' + load.address + ' ' + JSON.stringify(load.metadata));
   let tsname = load.name.split('!')[0];
   return compiler.load(tsname);
}

/*
 * load.name
 * load.address
 * load.metadata
 * load.source: the fetched source
 */
export function translate(load) {
   // when injecting from a bundle, translate is called for code which has already
   // been compiled. In this situation we can just ignore the file. 
   // see https://github.com/frankwallis/plugin-typescript/issues/19
   if (!load.metadata.pluginFetchCalled)
      return;

   logger.debug('systemjs translating ' + load.name);
   let tsname = load.name.split('!')[0];

   return compiler.compile(tsname)
      .then(function(output) {
         formatErrors(output.errors, logger);

         if (output.failure)
            throw new Error("TypeScript compilation failed.");
         else
            load.source = fixRequires(tsname, output.js);

         return;
      });
}


let systemNormalize = System.normalize;
// parentName is the name of the container of the import or ref
System.normalize = function (name, parentName, parentAddress) {
  // get the parentName chunks
  let chunks = parentName !== undefined ? parentName.split('/') : [];
  let lastChunk = chunks.length > 0 ? chunks[chunks.length - 1] : '';
  logger.debug('*** System.normalize: ' + chunks.join('/') + ' and ' + lastChunk);
  // if the last chunk is tsd.d.ts return the qualified name
  if (lastChunk == TSD_REFERENCE_FILENAME) {
    let parentPath = chunks.slice(0, chunks.length - 1).join('/');
    return new Promise(function (resolve, reject) {
      resolve(parentPath + '/' + name);
    });
  } 
  else // else call systemNormalize
    return systemNormalize.call(this, name, parentName, parentAddress);
};

/*
 * called by the compiler when it needs to resolve a file
 */
function _resolve(dep, parent) {
   if (!parent)
      parent = __moduleName;

   return System.normalize(dep, parent)
      .then(function(normalized) {
         if (path.basename(normalized).indexOf('.') < 0)
            normalized = normalized + '.ts';

         logger.debug('resolved ' + normalized + '(' + parent + ' -> ' + dep + ')');
         return normalized;
      });
}

/*
 * called by the compiler when it needs to fetch a file
 */
function _fetch(name) {
   let load = {
      name: name,
      metadata: {}
   }

   return System.locate(load)
      .then((address) => {
         // workaround for https://github.com/systemjs/systemjs/issues/319
         if (address.slice(-6) == '.ts.js')
           address = address.slice(0, -3);

         logger.debug("located " + address);
         load.address = address;
         return System.fetch(load)
            .then((txt) => {
               logger.debug("fetched " + name);
               return txt;
            });
      });
}
